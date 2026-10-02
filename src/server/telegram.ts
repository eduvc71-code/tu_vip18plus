import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import dns from 'dns';
import https from 'https';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}
import {
  getProfileById,
  saveProfile,
  deleteProfile,
  getAllProfiles,
  getConversationState,
  setConversationState,
  clearConversationState,
  createCustomerRequest,
  getCustomerRequests,
  getCustomerRequestById,
  updateCustomerRequestStatus,
  addAuditLog,
  addSyncError,
  getSystemSetting,
  saveSystemSetting,
  addAdminTelegramId,
  getPublicCustomButtons,
  getAllCustomButtons,
  getAllTelegramBotoneras,
  getAllPolls,
  registerSubscriber,
  getAllPaymentMethods,
  getPublicPaymentMethods,
  getPaymentMethodById,
  getPublicProfiles,
  findRecentDuplicateCustomerRequest,
  markCustomerRequestScheduled
} from './db.js';
import { Profile, ProfileStatus, PaymentMethod } from '../types.js';
import { uploadBufferToB2, isB2Configured, mediaUrl } from './b2Storage.js';

// ============================ FASE 1: NAVEGACIÓN EDITABLE (BOTONERA NATIVA) ============================
// Utilidades de escape para MarkdownV2: permite inyectar texto dinámico (nombres, descripciones,
// precios configurables) sin romper el parseo ni generar mensajes vacíos por caracteres especiales.
export function escapeMarkdownV2(text: string): string {
  return String(text ?? '').replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

// Convierte Markdown clásico (*negrita*, `código`) a MarkdownV2 escapando el resto del texto.
// Útil para reutilizar plantillas existentes en flujos editables sin perder formato.
export function formatTelegramCaptionForMarkdown(text: string): string {
  const value = String(text ?? '');
  if (!value.trim()) return '';
  return markdownToMarkdownV2(value);
}

export function markdownToMarkdownV2(text: string): string {
  const segments = String(text ?? '').split(/(\*[^*\n]+\*|`[^`\n]+`)/g).filter(Boolean);
  return segments
    .map((seg) => {
      if (/^\*[^*\n]+\*$/.test(seg)) return `*${escapeMarkdownV2(seg.slice(1, -1))}*`;
      if (/^`[^`\n]+`$/.test(seg)) return `\`${escapeMarkdownV2(seg.slice(1, -1))}\``;
      return escapeMarkdownV2(seg);
    })
    .join('');
}

// Edición en el sitio: los menús de la botonera nativa se actualizan sobre el mismo mensaje
// (como la Mini App) en lugar de acumular mensajes nuevos en el chat del cliente.
async function editMessageContent(chatId: string | number, messageId: number, text: string, inlineKeyboard?: any[][], mediaType?: 'photo' | 'video', mediaUrlValue?: string): Promise<boolean> {
  const markup = inlineKeyboard ? { inline_keyboard: inlineKeyboard } : undefined;
  const hasMediaTarget = Boolean(mediaType && mediaUrlValue);
  // Orden de intentos: primero el método que corresponde al contenido nuevo; si el mensaje
  // anterior tenía media, editMessageText falla y hay que editar el caption. Si lo que falla
  // es el parseo de MarkdownV2, se reintenta en texto plano para que un detalle de formato
  // nunca rompa la navegación del cliente.
  const methods = hasMediaTarget
    ? ['editMessageCaption']
    : (mediaType || mediaUrlValue)
      ? ['editMessageMedia']
      : ['editMessageText', 'editMessageCaption'];

  const buildPayload = (method: string, parseMode?: string) => {
    const payload: any = { chat_id: chatId, message_id: messageId };
    if (parseMode) payload.parse_mode = parseMode;
    if (markup) payload.reply_markup = markup;
    if (method === 'editMessageCaption') {
      payload.caption = text;
    } else if (method === 'editMessageMedia') {
      payload.media = {
        type: mediaType === 'video' ? 'video' : 'photo',
        media: mediaUrlValue,
        caption: text,
        ...(parseMode ? { parse_mode: parseMode } : {})
      };
    } else {
      payload.text = text;
    }
    return payload;
  };

  let lastError = '';
  for (const method of methods) {
    for (const parseMode of ['MarkdownV2', undefined] as const) {
      const res = await callTelegramApi(method, buildPayload(method, parseMode));
      if (res?.ok) return true;
      lastError = res?.description || 'sin respuesta de Telegram';
      if (!/parse|entities/i.test(lastError)) break;
    }
  }
  console.warn(`[EditNav] No se pudo editar mensaje ${messageId}: ${lastError}`);
  return false;
}

// Vista del post tal como se publicó en el canal: mismo multimedia y la descripción
// real que la admin escribió al subir el contenido (nada generado por código).
async function sendNavPostView(chatId: string | number, profileId: string): Promise<boolean> {
  const profile = await getProfileById(profileId, true);
  if (!profile) return false;
  const freePhotos = (profile.photos || []).filter((u: string) => !(profile.media_stars?.[u] && profile.media_stars[u] > 0) && profile.media_status?.[u] !== 2);
  const primaryPhoto = freePhotos[0] || null;
  const caption = ((primaryPhoto && profile.media_descriptions?.[primaryPhoto]) || profile.description || `💎 ${profile.name}`).trim();
  const keyboard = {
    inline_keyboard: [
      [{ text: '💎 Suscripción VIP', callback_data: `nav_pay_${profile.id}` }]
    ]
  };
  const escapedCaption = formatTelegramCaptionForMarkdown(caption);

  if (primaryPhoto) {
    const isVideo = /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(primaryPhoto) || primaryPhoto.includes('/video');
    const tgMatch = primaryPhoto.match(/\/telegram-media\/([a-zA-Z0-9_-]+)/);
    const mediaTarget = profile.telegram_media_file_ids?.[primaryPhoto] || (tgMatch ? tgMatch[1] : primaryPhoto);
    const res = await callTelegramApi(isVideo ? 'sendVideo' : 'sendPhoto', {
      chat_id: chatId,
      [isVideo ? 'video' : 'photo']: mediaTarget,
      caption: escapedCaption,
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard
    });
    if (res?.ok) return true;
    console.warn('[NavPost] No se pudo enviar el multimedia, se envía solo texto:', res?.description);
  }
  const textRes = await callTelegramApi('sendMessage', {
    chat_id: chatId,
    text: escapedCaption,
    parse_mode: 'MarkdownV2',
    reply_markup: keyboard
  });
  return Boolean(textRes?.ok);
}

// Resuelve el ID de perfil desde callback_data (nav_prof_<id>, nav_gal_<id>_<page>, nav_pay_<id>).
function resolveProfileIdFromNavData(data: string): string | null {
  const m = data.match(/^nav_(?:prof|gal|pay)_([^_]+(?:_(?!p\d{1,3}$)[^_]+)*)(?:_p\d{1,3})?$/);
  return m ? m[1] : null;
}

// Página de galería + botones ◀ ▶ cuando hay más de un elemento multimedia activo.
function buildGalleryPageRows(profile: Profile, page: number): { rows: any[][]; safePage: number; total: number } {
  const activePhotos = (profile.photos || []).filter((u: string) => !(profile.media_status?.[u] === 2));
  const total = Math.max(activePhotos.length, 1);
  const safePage = ((page - 1) % total + total) % total + 1;
  const rows: any[][] = [];
  if (total > 1) {
    const prev = safePage <= 1 ? total : safePage - 1;
    const next = safePage >= total ? 1 : safePage + 1;
    rows.push([
      { text: '◀️ Anterior', callback_data: `nav_gal_${profile.id}_p${prev}` },
      { text: `${safePage}/${total}`, callback_data: 'nav_noop' },
      { text: 'Siguiente ▶️', callback_data: `nav_gal_${profile.id}_p${next}` }
    ]);
  }
  return { rows, safePage, total };
}

// Ficha completa de un perfil, con paginación de galería y CTA de suscripción (sin registrar nada).
async function renderNavProfileView(chatId: string | number, messageId: number, profileId: string, page: number, listCallback: string): Promise<boolean> {
  const profile = await getProfileById(profileId, true);
  if (!profile) {
    return await editMessageContent(chatId, messageId,
      '⚠️ Este contenido ya no está disponible\\.\nPulsa el botón para volver al catálogo\\.',
      [[{ text: '🔙 Volver al Catálogo', callback_data: listCallback }]]);
  }
  const { rows, safePage } = buildGalleryPageRows(profile, page);
  const photos = (profile.photos || []).filter((u: string) => !(profile.media_status?.[u] === 2));
  const currentPhoto = photos[safePage - 1];
  const isVideo = !!currentPhoto && (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(currentPhoto) || currentPhoto.includes('/video'));
  const tgFileId = currentPhoto ? profile.telegram_media_file_ids?.[currentPhoto] : undefined;
  const mediaTarget = tgFileId || currentPhoto;

  const starsPrice = currentPhoto ? profile.media_stars?.[currentPhoto] : undefined;
  const desc = (profile.media_descriptions?.[currentPhoto!] || profile.description || '').trim();
  const lines = [
    `💎 *${escapeMarkdownV2(profile.name)}*`,
    '',
    ...(desc ? [escapeMarkdownV2(desc), ''] : []),
    `📍 ${escapeMarkdownV2(profile.zone || 'Contenido VIP')}`,
    `💵 Suscripción: *Bs\\. ${escapeMarkdownV2(String(profile.rate_bs || 0))}* / mes`,
    ...(starsPrice ? [`⭐ Foto exclusiva: *${starsPrice} Stars*`] : [])
  ];
  const text = lines.join('\n');

  const navRows: any[][] = [];
  if (rows.length > 0) navRows.push(...rows);
  navRows.push([{ text: '🛒 Adquirir Contenido', callback_data: `nav_acq_${profile.id}` }]);
  navRows.push([{ text: '💳 Métodos de Pago', callback_data: `nav_pay_${profile.id}` }]);
  navRows.push([
    { text: '🔙 Catálogo', callback_data: listCallback },
    { text: '🏠 Menú', callback_data: 'client_cmd_menu' }
  ]);

  if (mediaTarget) {
    const ok = await editMessageContent(chatId, messageId, text, navRows, isVideo ? 'video' : 'photo', mediaTarget);
    if (ok) return true;
  }
  return await editMessageContent(chatId, messageId, text, navRows);
}

// Paginación del listado de perfiles (2 por fila, como grilla de la Mini App).
function buildNavProfileListKeyboard(profiles: Profile[], page: number, pageSize: number, prefix: string): any[][] {
  const totalPages = Math.max(1, Math.ceil(profiles.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const slice = profiles.slice((safePage - 1) * pageSize, safePage * pageSize);
  const rows: any[][] = [];
  for (let i = 0; i < slice.length; i += 2) {
    rows.push(slice.slice(i, i + 2).map(p => ({
      text: `💎 ${p.name.length > 18 ? p.name.slice(0, 17) + '…' : p.name}`,
      callback_data: `nav_prof_${p.id}`
    })));
  }
  if (totalPages > 1) {
    const navRow: any[] = [];
    if (safePage > 1) navRow.push({ text: '◀️ Anterior', callback_data: `${prefix}_p${safePage - 1}` });
    navRow.push({ text: `📄 ${safePage}/${totalPages}`, callback_data: 'nav_noop' });
    if (safePage < totalPages) navRow.push({ text: 'Siguiente ▶️', callback_data: `${prefix}_p${safePage + 1}` });
    rows.push(navRow);
  }
  rows.push([{ text: '🏠 Menú principal', callback_data: 'client_cmd_menu' }]);
  return rows;
}

async function renderNavProfileList(chatId: string | number, messageId: number, page: number, title: string, intro: string): Promise<boolean> {
  const pageSize = 6;
  const profiles = await getPublicProfiles();
  const totalPages = Math.max(1, Math.ceil(profiles.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const first = profiles[(safePage - 1) * pageSize];
  const last = profiles[Math.min(safePage * pageSize, profiles.length) - 1];
  const baseLines = [
    `${title}`,
    '',
    intro,
    `🗂 Modelos disponibles: *${profiles.length}*${first && last ? ` · Mostrando ${escapeMarkdownV2(first.name)} → ${escapeMarkdownV2(last.name)}` : ''}`
  ].join('\n');
  const keyboard = buildNavProfileListKeyboard(profiles, safePage, pageSize, 'nav_list');
  if (profiles.length === 0) {
    return await editMessageContent(chatId, messageId,
      `${title}\n\nAún no hay contenido publicado. Vuelve pronto ✨`,
      [[{ text: '🏠 Menú principal', callback_data: 'client_cmd_menu' }]]);
  }
  return await editMessageContent(chatId, messageId, baseLines, keyboard);
}

// ===== FASE 2: Filtros avanzados del catálogo nativo (solo lectura, cero escrituras) =====
interface NavFilterState {
  zone?: string;
  q?: string;
  sort?: 'default' | 'new' | 'price_asc' | 'price_desc' | 'name';
  page?: number;
  __ts?: number; // TTL: última actividad; los estados inactivos se purgan
}
const NAV_FILTERS: Record<string, any> = {};
const NAV_FILTERS_TTL_MS = 30 * 60 * 1000; // 30 minutos de inactividad

function getNavFilters(key: string): NavFilterState {
  if (!NAV_FILTERS[key]) NAV_FILTERS[key] = { sort: 'default' };
  NAV_FILTERS[key].__ts = Date.now();
  return NAV_FILTERS[key];
}

// Purga periódica (con límite duro) para que la caché en memoria no crezca sin tope.
let navPurgeCounter = 0;
function purgeNavFilters(): void {
  if (++navPurgeCounter % 50 !== 0) return;
  const now = Date.now();
  const keys = Object.keys(NAV_FILTERS);
  for (const k of keys) {
    const state = NAV_FILTERS[k];
    if (!state || now - Number(state.__ts || 0) > NAV_FILTERS_TTL_MS) delete NAV_FILTERS[k];
  }
  const remaining = Object.keys(NAV_FILTERS);
  if (remaining.length > 5000) {
    remaining
      .sort((a, b) => Number(NAV_FILTERS[a]?.__ts || 0) - Number(NAV_FILTERS[b]?.__ts || 0))
      .slice(0, remaining.length - 5000)
      .forEach(k => delete NAV_FILTERS[k]);
  }
}

function navSortLabel(sort?: NavFilterState['sort']): string {
  switch (sort) {
    case 'new': return '🆕 Más nuevas';
    case 'price_asc': return '💵 Precio ↑';
    case 'price_desc': return '💵 Precio ↓';
    case 'name': return '🔤 Nombre A-Z';
    default: return '⭐ Prioridad';
  }
}

function navFilterSummary(f: NavFilterState): string {
  const parts: string[] = [`Orden: ${navSortLabel(f.sort)}`];
  if (f.zone) parts.push(`Zona: ${f.zone}`);
  if (f.q) parts.push(`Búsqueda: "${f.q}"`);
  return parts.join(' · ');
}

function applyNavFilters(profiles: Profile[], f: NavFilterState): Profile[] {
  let list = [...profiles];
  if (f.zone) list = list.filter(p => (p.zone || '').toLowerCase() === (f.zone || '').toLowerCase());
  if (f.q) {
    const q = f.q.toLowerCase();
    list = list.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.zone || '').toLowerCase().includes(q)
    );
  }
  switch (f.sort) {
    case 'new': list.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || ''))); break;
    case 'price_asc': list.sort((a, b) => Number(a.rate_bs || 0) - Number(b.rate_bs || 0)); break;
    case 'price_desc': list.sort((a, b) => Number(b.rate_bs || 0) - Number(a.rate_bs || 0)); break;
    case 'name': list.sort((a, b) => String(a.name).localeCompare(String(b.name))); break;
    default: list.sort((a, b) => Number(a.priority_order || 0) - Number(b.priority_order || 0)); break;
  }
  return list;
}

// Renderiza el listado filtrado/paginado. Clave de estado: "list" (catálogo) o "new" (novedades).
async function renderNavFilteredPage(chatId: string | number, messageId: number, key: 'list' | 'new'): Promise<boolean> {
  const filters = getNavFilters(key);
  const all = await getPublicProfiles();
  let profiles = applyNavFilters(all, filters);
  if (key === 'new') {
    profiles = [...all]
      .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
      .slice(0, Math.max(6, Math.min(profiles.length || all.length, 12)));
  }
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(profiles.length / pageSize));
  const safePage = Math.min(Math.max(filters.page || 1, 1), totalPages);
  filters.page = safePage;
  const title = key === 'new' ? '🆕 *NOVEDADES*' : '🗂 *CATÁLOGO VIP*';
  const intro = key === 'new'
    ? 'Lo último que subimos, directo desde el canal'
    : 'Toca un nombre para ver su ficha completa';

  if (profiles.length === 0) {
    const kb = [
      [{ text: '🧹 Limpiar filtros', callback_data: `nav_${key}_clear` }],
      [{ text: '🔙 Volver', callback_data: 'nav_catalog' }, { text: '🏠 Menú', callback_data: 'client_cmd_menu' }]
    ];
    return await editMessageContent(chatId, messageId, `${title}\n\nSin resultados con estos filtros.`, kb);
  }

  const keyboard = buildNavProfileListKeyboard(profiles, safePage, pageSize, `nav_${key}`);
  // Barra de filtros debajo de la paginación (rota orden; zona/búsqueda vía prompt en memoria)
  keyboard.splice(keyboard.length - 1, 0,
    [
      { text: '🌐 Zona', callback_data: `nav_${key}_prompt_zone` },
      { text: '🔎 Buscar', callback_data: `nav_${key}_prompt_q` }
    ],
    [
      { text: `↕️ ${navSortLabel(filters.sort)}`, callback_data: `nav_${key}_sort_cycle` },
      { text: '🧹 Limpiar', callback_data: `nav_${key}_clear` }
    ]
  );
  const footer = `\n\n🎛 ${escapeMarkdownV2(navFilterSummary(filters))}`;
  return await editMessageContent(chatId, messageId, `${title}\n\n${intro}${footer}`, keyboard);
}

// ===== FLUJO "ADQUIRIR CONTENIDO" (espejo exacto del RequestModal de la Mini App) =====
// Pasos: nav_acq_<perfil> (menú de planes) -> nav_acqp_<plan>__<perfil> (país, en memoria)
//        -> nav_acqc_<plan>__<perfil> (confirmación) -> nav_acqok_<plan>__<perfil> (ÚNICO paso que registra).
const NAV_COUNTRY_FALLBACK = ['Bolivia', 'Argentina', 'Chile', 'Colombia', 'Ecuador', 'España', 'Estados Unidos', 'México', 'Paraguay', 'Perú', 'Uruguay', 'Venezuela'];
const NAV_PLAN_EMOJI: Record<string, string> = { mensual: '🧸', semestral: '💎', permanente: '💙' };

function navPlanName(plan: string): string {
  return plan === 'semestral' ? '6 MESES' : plan === 'permanente' ? 'PERMANENTE' : 'MENSUAL';
}

// nav_acqs/acqc/acqok_<plan>__<perfil>__<país>: el perfil admite guiones bajos, por lo que
// el país es el último tramo y el perfil todo lo intermedio.
export function parseNavAcqFlowData(data: string): { step: 'acqs' | 'acqc' | 'acqok'; plan: string; profileId: string; country: string } | null {
  const m = data.match(/^nav_(acqs|acqc|acqok)_(mensual|semestral|permanente)__(.+)__([^_]+)$/);
  if (!m) return null;
  return { step: m[1] as 'acqs' | 'acqc' | 'acqok', plan: m[2], profileId: m[3], country: decodeURIComponent(m[4]) };
}

// Los países NO son código duro: salen de los métodos de pago activos (BD/B2), exactamente
// como el selector de país del RequestModal de la Mini App; el fallback solo aplica si la
// admin aún no ha configurado métodos.
async function getNavCountryList(): Promise<string[]> {
  try {
    const methods = await getPublicPaymentMethods();
    const fromMethods = methods
      .filter(m => m.is_active && (m.category === 'international' || m.category === 'national'))
      .map(m => String(m.title || '').replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').trim())
      .filter(t => t.length > 0);
    const unique = Array.from(new Set(fromMethods));
    return unique.length > 0 ? unique : NAV_COUNTRY_FALLBACK;
  } catch {
    return NAV_COUNTRY_FALLBACK;
  }
}

async function buildAcqCountryKeyboard(plan: string, profileId: string): Promise<any[][]> {
  const countries = await getNavCountryList();
  const rows: any[][] = [];
  for (let i = 0; i < countries.length; i += 2) {
    rows.push(countries.slice(i, i + 2).map(c => ({
      text: c.length > 16 ? c.slice(0, 15) + '…' : c,
      callback_data: `nav_acqs_${plan}__${profileId}__${encodeURIComponent(c)}`
    })));
  }
  rows.push([{ text: '✍️ Otro país', callback_data: `nav_acqo_${plan}__${profileId}` }]);
  rows.push([{ text: '🔙 Volver a Planes', callback_data: `nav_pay_${profileId}` }]);
  return rows;
}

// Payments Board nativo: mismos métodos activos y tarifas que muestra la Mini App,
// tomados en vivo de la base de datos (restaurada desde B2).
async function renderNavPaymentList(chatId: string | number, profileId: string): Promise<boolean> {
  const profile = profileId ? await getProfileById(profileId, true) : null;
  const methods = (await getPublicPaymentMethods()).filter(m => m.is_active)
    .sort((a, b) => (a.priority_order ?? 0) - (b.priority_order ?? 0));
  if (methods.length === 0) {
    return Boolean(await sendMessage(chatId, '⚠️ Por ahora no hay métodos de pago configurados\\. Escríbele a la Administradora\\.', {
      reply_markup: { inline_keyboard: [[{ text: '📲 Hablar con administradora', url: `https://t.me/${getAdminContactUsername()}` }]] }
    }));
  }
  const keyboard: any[][] = methods.map(m => [{
    text: `${m.title} · ${getOfficialFeeText(m, profile?.rate_bs)}`,
    callback_data: `nav_pmd_${m.id}__${profileId}`
  }]);
  keyboard.push([{ text: '🔙 Volver a Planes', callback_data: `nav_pay_${profileId}` }]);
  const text = [
    `💳 *PAYMENTS BOARD*`,
    '',
    profile ? `Suscripción de *${escapeMarkdownV2(profile.name)}* — métodos y tarifas en vivo desde el servidor\\.` : 'Métodos y tarifas en vivo desde el servidor\\.',
    '',
    '_Toca un método para ver el QR, las coordenadas y el contacto de comprobante_'
  ].join('\n');
  return Boolean(await sendMessage(chatId, text, { reply_markup: { inline_keyboard: keyboard }, parse_mode: 'MarkdownV2' }));
}

// Detalle de método nativo: foto/QR + TODOS los datos (coordenadas, tarifa, contacto),
// espejo del "Detalle de Pago" de la Mini App.
async function renderNavPaymentMethodDetail(chatId: string | number, methodId: string, profileId: string): Promise<boolean> {
  const method = await getPaymentMethodById(methodId);
  if (!method) {
    return Boolean(await sendMessage(chatId, '⚠️ Método de pago no disponible\\.', {
      reply_markup: { inline_keyboard: [[{ text: '💳 Ver otros métodos', callback_data: `nav_paylist_${profileId}` }]] }
    }));
  }
  const profile = profileId ? await getProfileById(profileId, true) : null;
  const adminUsername = getAdminContactUsername();
  const caption = [
    `✨ *${escapeMarkdownV2(method.title)}* ✨`,
    '',
    escapeMarkdownV2(method.description || 'Consulta los datos y coordenadas de pago con la Administradora.'),
    '',
    `💵 *Tarifa Oficial:* ${escapeMarkdownV2(getOfficialFeeText(method, profile?.rate_bs))}`,
    '',
    `📲 *Envía tu comprobante a:* [@${escapeMarkdownV2(adminUsername)}](https://t.me/${escapeMarkdownV2(adminUsername)})`,
    '',
    '_Una vez verificado tu comprobante, la Administradora te enviará el acceso privado VIP_'
  ].join('\n');
  const keyboard = {
    inline_keyboard: [
      [{ text: '📲 Enviar Comprobante', url: `https://t.me/${adminUsername}` }],
      [{ text: '💳 Ver otros métodos', callback_data: `nav_paylist_${profileId}` }]
    ]
  };
  if (method.image_url) {
    const isVideo = /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(method.image_url);
    const res = await callTelegramApi(isVideo ? 'sendVideo' : 'sendPhoto', {
      chat_id: chatId,
      [isVideo ? 'video' : 'photo']: method.image_url,
      caption,
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard
    });
    if (res?.ok) return true;
    console.warn('[NavPay] No se pudo enviar el QR con datos, se envía solo texto:', res?.description);
  }
  const textRes = await callTelegramApi('sendMessage', { chat_id: chatId, text: caption, parse_mode: 'MarkdownV2', reply_markup: keyboard });
  return Boolean(textRes?.ok);
}

// Texto del menú de planes (MarkdownV2 estricto: Telegram rechaza el mensaje entero si
// queda un carácter reservado sin escapar, y el cliente ve "contenido no disponible").
export function buildNavPlansMenuText(profileName: string, rateBs: number | string, hasStars: boolean): string {
  return [
    `💳 *MÉTODOS DE PAGO*`,
    '',
    `Elige tu *Plan VIP* para *${escapeMarkdownV2(profileName)}*:`,
    '',
    `💵 Tarifa de referencia: *Bs\\. ${escapeMarkdownV2(String(rateBs || 0))}* / mes`,
    ...(hasStars ? ['', `⭐ También puedes desbloquear fotos sueltas pagando con Telegram Stars desde su ficha\\.`] : []),
    '',
    '_La atención y los pagos continúan 100\\% privados por Telegram_',
    '',
    '⚡ _¿Prefieres la experiencia visual completa? Toca_ *Ver lo Exclusivo* _abajo\\._'
  ].join('\n');
}

async function renderNavAcquireMenu(chatId: string | number, messageId: number, profileId: string): Promise<boolean> {
  const profile = await getProfileById(profileId, true);
  if (!profile) {
    return await editMessageContent(chatId, messageId,
      '⚠️ Este contenido ya no está disponible\\.\nPulsa el botón para volver al catálogo\\.',
      [[{ text: '🔙 Volver al Catálogo', callback_data: 'nav_catalog' }]]);
  }
  const methods = await getPublicPaymentMethods();
  const hasStars = methods.some(m => m.is_active && /star/i.test(`${m.title} ${m.description || ''}`));

  const text = buildNavPlansMenuText(profile.name, profile.rate_bs, hasStars);
  const keyboard = [
    [{ text: '🧸 SUSCRIPCIÓN MENSUAL', callback_data: `nav_acqp_mensual__${profileId}` }],
    [{ text: '💎 SUSCRIPCIÓN 6 MESES', callback_data: `nav_acqp_semestral__${profileId}` }],
    [{ text: '💙 SUSCRIPCIÓN PERMANENTE', callback_data: `nav_acqp_permanente__${profileId}` }]
  ];
  return await editMessageContent(chatId, messageId, text, keyboard);
}

async function renderNavAcquireCountry(chatId: string | number, messageId: number, plan: string, profileId: string): Promise<boolean> {
  const profile = await getProfileById(profileId, true);
  const text = [
    `🌍 *¡Bienvenido a la zona exclusiva!*`,
    '',
    `${NAV_PLAN_EMOJI[plan] || '💎'} Plan *SUSCRIPCIÓN ${navPlanName(plan)}*${profile ? ` — *${escapeMarkdownV2(profile.name)}*` : ''}`,
    '',
    `Por favor indícanos *de qué país nos contactas* para darte información detallada\\.`
  ].join('\n');
  return await editMessageContent(chatId, messageId, text, await buildAcqCountryKeyboard(plan, profileId));
}

async function renderNavAcquireConfirm(chatId: string | number, messageId: number, plan: string, profileId: string, country: string): Promise<boolean> {
  const profile = await getProfileById(profileId, true);
  const { brandName } = getBotConfig();
  const text = [
    `📤 *ENVÍO DIRECTO*`,
    '',
    `¿Aceptas enviar un mensaje directo y privado a *${escapeMarkdownV2(brandName || 'IAM DANII VIP')}*?`,
    '',
    `Toda la información de los planes y formas de pago para *${escapeMarkdownV2(country)}* te será enviada de manera 100\\% privada y confidencial a tu chat de Telegram\\.`
  ].join('\n');
  const keyboard = [
    [{ text: '✅ Sí, Enviar Mensaje Privado', callback_data: `nav_acqok_${plan}__${profileId}__${encodeURIComponent(country)}` }],
    [{ text: '✖️ Cancelar y volver atrás', callback_data: `nav_acqp_${plan}__${profileId}` }]
  ];
  return await editMessageContent(chatId, messageId, text, keyboard);
}

// Único punto del flujo nativo que escribe en BD: igual que la Mini App, SOLO al confirmar.
async function completeNavAcquireRequest(cb: any, plan: string, profileId: string, country: string): Promise<void> {
  const chatId = cb.message.chat.id;
  const messageId = cb.message.message_id;
  const user = cb.from || {};
  const userId = String(user.id || chatId);
  const firstName = user.first_name || 'Cliente Telegram';
  const username = user.username ? `@${user.username}` : `ID:${userId}`;
  const profile = await getProfileById(profileId, true);
  if (!profile) {
    await editMessageContent(chatId, messageId, '⚠️ Este contenido ya no está disponible. Pulsa 🏠 Menú para volver.', [[{ text: '🏠 Menú', callback_data: 'client_cmd_menu' }]]);
    return;
  }

  // Anti-duplicado (misma lógica que POST /api/requests de la Mini App)
  const msg = `Hola, estoy interesado en la SUSCRIPCIÓN ${navPlanName(plan)}. Soy de ${country}. Solicito Información VIP por favor.`;
  const duplicate = await findRecentDuplicateCustomerRequest(userId, profile.id, msg, 10);
  if (duplicate) {
    await editMessageContent(chatId, messageId,
      `✅ *Ya recibimos tu solicitud reciente*\n\nLa Administradora responderá pronto en privado\\. Si necesitas cambiar algo, escríbele directamente\\.`,
      [[{ text: '📲 Hablar con administradora', url: `https://t.me/${getAdminContactUsername()}` }], [{ text: '🏠 Menú', callback_data: 'client_cmd_menu' }]]);
    return;
  }

  const request = await createCustomerRequest({
    profile_id: profile.id,
    profile_name: profile.name,
    telegram_user_id: userId,
    telegram_first_name: firstName,
    telegram_username: user.username || undefined,
    notes: msg,
    status: 'pendiente'
  });

  // Notificación a admins (mismos botones que la alerta de la Mini App)
  const { adminIds } = getBotConfig();
  let delivered = false;
  const adminNotice = [
    `🔔 NUEVA SOLICITUD DE ACCESO VIP (Botonera Nativa) 🔔`,
    ``,
    `👤 Cliente: ${firstName} ${username}`,
    `🆔 Telegram ID: ${userId}`,
    `👠 Perfil: ${profile.name} (PRECIO VIP: Bs. ${profile.rate_bs})`,
    `📋 Plan: SUSCRIPCIÓN ${navPlanName(plan)}`,
    `🌍 País: ${country}`,
    `💬 Mensaje: ${msg}`
  ].join('\n');
  for (const adminId of adminIds) {
    try {
      const delivery = await sendMessage(adminId, adminNotice, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📩 Responder al cliente', url: `https://t.me/${String(username).replace('@', '')}` }],
            [
              { text: '📲 Enviar QR privado', callback_data: `request_qr_${request.id}` },
              { text: '✅ Marcar atendida', callback_data: `request_done_${request.id}` }
            ]
          ]
        }
      });
      if (delivery.ok) delivered = true;
    } catch (err) {
      console.error('[NavAcquire] No se pudo notificar al admin:', err);
    }
  }

  if (!delivered) {
    await updateCustomerRequestStatus(request.id, 'fallida');
    await editMessageContent(chatId, messageId,
      '⚠️ No fue posible notificar a la Administradora\\. Intenta nuevamente en unos minutos\\.',
      [[{ text: '🔙 Reintentar', callback_data: `nav_acqc_${plan}__${profileId}__${encodeURIComponent(country)}` }], [{ text: '🏠 Menú', callback_data: 'client_cmd_menu' }]]);
    return;
  }

  await markCustomerRequestScheduled(request.id, new Date().toISOString());
  try { await addAuditLog('CREATE_REQUEST_TG_NAV', userId, `Solicitud nativa ${navPlanName(plan)} para ${profile.name} (${country})`, request.id); } catch {}

  await editMessageContent(chatId, messageId,
    [
      `✅ *¡SOLICITUD NOTIFICADA!*`,
      ``,
      `La Administradora ha sido notificada\\.`,
      `La atención continuará de forma *privada* en tu chat de Telegram\\.`,
      ``,
      `📋 Plan: *SUSCRIPCIÓN ${navPlanName(plan)}* · 🌍 ${escapeMarkdownV2(country)}`
    ].join('\n'),
    [
      [{ text: '📲 Hablar con administradora', url: `https://t.me/${getAdminContactUsername()}` }],
      [{ text: '🔙 Volver a la Ficha', callback_data: `nav_prof_${profileId}` }, { text: '🏠 Menú', callback_data: 'client_cmd_menu' }]
    ]);
}

// Router central de la botonera nativa navegable: TODO se resuelve editando el mensaje actual
// y NINGÚN clic escribe en la base de datos (los registros solo ocurren al comprar en la Mini App
// o cuando la admin procesa una solicitud real).
async function handleNavCallback(cb: any): Promise<void> {
  const chatId = cb.message.chat.id;
  const messageId = cb.message.message_id;
  const data = String(cb.data || '');

  purgeNavFilters();

  if (data === 'nav_noop') {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    return;
  }

  // Prompt de texto libre para filtros (zona / búsqueda): solo vive en memoria, cero BD.
  const promptMatch = data.match(/^nav_(list|new)_prompt_(zone|q)$/);
  if (promptMatch) {
    const [, pKey, pField] = promptMatch;
    NAV_FILTERS[`pending_${chatId}`] = { __field: pField, __key: pKey, __ts: Date.now() };
    await callTelegramApi('answerCallbackQuery', {
      callback_query_id: cb.id,
      text: pField === 'zone'
        ? 'Escribe la zona a filtrar (ej: Santa Cruz). Envía "-" para quitarlo.'
        : 'Escribe el texto a buscar (nombre o descripción). Envía "-" para quitarlo.'
    });
    return;
  }

  // Ciclo de ordenamiento
  const sortCycleMatch = data.match(/^nav_(list|new)_sort_cycle$/);
  if (sortCycleMatch) {
    const sKey = sortCycleMatch[1] as 'list' | 'new';
    const f = getNavFilters(sKey);
    const order: NonNullable<NavFilterState['sort']>[] = ['default', 'new', 'price_asc', 'price_desc', 'name'];
    f.sort = order[(order.indexOf(f.sort || 'default') + 1) % order.length];
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id, text: `Orden: ${navSortLabel(f.sort)}` });
    await renderNavFilteredPage(chatId, messageId, sKey);
    return;
  }

  // Limpiar filtros
  const clearMatch = data.match(/^nav_(list|new)_clear$/);
  if (clearMatch) {
    const cKey = clearMatch[1] as 'list' | 'new';
    NAV_FILTERS[cKey] = { sort: 'default' };
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id, text: 'Filtros restablecidos' });
    await renderNavFilteredPage(chatId, messageId, cKey);
    return;
  }

  // Listados navegables (catálogo completo / novedades) con filtros y paginación
  if (data.startsWith('nav_list') || data === 'nav_catalog' || data.startsWith('nav_new')) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    const key: 'list' | 'new' = (data === 'nav_catalog' || data.startsWith('nav_list')) ? 'list' : 'new';
    const pm = data.match(/_p(\d+)$/);
    if (pm) getNavFilters(key).page = parseInt(pm[1], 10) || 1;
    const ok = await renderNavFilteredPage(chatId, messageId, key);
    if (!ok) await sendMessage(chatId, key === 'new' ? '🆕 NOVEDADES' : '🗂 CATÁLOGO VIP');
    return;
  }

  // Ficha de perfil con galería paginada
  if (data.startsWith('nav_prof_') || /^nav_gal_[^_]+(_p\d+)?$/.test(data)) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    const profileId = resolveProfileIdFromNavData(data);
    if (!profileId) return;
    const pm = data.match(/_p(\d+)$/);
    const page = pm ? parseInt(pm[1], 10) || 1 : 1;
    const listCallback = data.startsWith('nav_gal') ? `nav_prof_${profileId}` : 'nav_catalog';
    const ok = await renderNavProfileView(chatId, messageId, profileId, page, listCallback);
    if (!ok) {
      const fallback = await getProfileById(profileId, true);
      if (fallback) await sendClientWelcome(chatId);
    }
    return;
  }

  // 💳 Métodos de Pago (botón del canal y del post): abre directamente los planes VIP,
  // igual que el RequestModal de la Mini App (planes -> país -> confirmación -> solicitud).
  if (data.startsWith('nav_pay_')) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    const profileId = resolveProfileIdFromNavData(data) || data.replace('nav_pay_', '');
    const ok = await renderNavAcquireMenu(chatId, messageId, profileId);
    if (!ok) await sendMessage(chatId, '⚠️ Contenido no disponible.', { reply_markup: { inline_keyboard: [[{ text: '🏠 Menú', callback_data: 'client_cmd_menu' }]] } });
    return;
  }

  // Listado de métodos de pago (datos vivos de la BD/B2), igual que el Payments Board de la Mini App
  if (data.startsWith('nav_paylist_')) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    const profileId = data.replace('nav_paylist_', '');
    await renderNavPaymentList(chatId, profileId);
    return;
  }

  // ===== FLUJO "ADQUIRIR CONTENIDO" (espejo del RequestModal de la Mini App) =====
  // Menú de planes VIP
  if (data.startsWith('nav_acq_') && !data.startsWith('nav_acqp_') && !data.startsWith('nav_acqc_') && !data.startsWith('nav_acqo_') && !data.startsWith('nav_acqs_') && !data.startsWith('nav_acqok_')) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    const profileId = data.replace('nav_acq_', '');
    const ok = await renderNavAcquireMenu(chatId, messageId, profileId);
    if (!ok) await sendMessage(chatId, '⚠️ Contenido no disponible.', { reply_markup: { inline_keyboard: [[{ text: '🏠 Menú', callback_data: 'client_cmd_menu' }]] } });
    return;
  }

  // Selección de plan: MENSUAL abre los métodos de pago (como la Mini App);
  // 6 MESES y PERMANENTE pasan por país -> confirmación -> solicitud.
  const acqPlanMatch = data.match(/^nav_acqp_(mensual|semestral|permanente)__(.+)$/);
  if (acqPlanMatch) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    if (acqPlanMatch[1] === 'mensual') {
      await renderNavPaymentList(chatId, acqPlanMatch[2]);
    } else {
      await renderNavAcquireCountry(chatId, messageId, acqPlanMatch[1], acqPlanMatch[2]);
    }
    return;
  }

  // País preseleccionado / reconfirmación / confirmación final.
  // El ID de perfil puede contener guiones bajos, así que el país es SIEMPRE el último
  // tramo tras "__" y el perfil es todo lo que queda en medio.
  const acqFlow = parseNavAcqFlowData(data);
  if (acqFlow) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id, ...(acqFlow.step === 'acqok' ? { text: 'Enviando solicitud...' } : {}) });
    if (acqFlow.step === 'acqs' || acqFlow.step === 'acqc') {
      await renderNavAcquireConfirm(chatId, messageId, acqFlow.plan, acqFlow.profileId, acqFlow.country);
    } else {
      await completeNavAcquireRequest(cb, acqFlow.plan, acqFlow.profileId, acqFlow.country);
    }
    return;
  }

  // "Otro país": captura por texto libre en memoria (cero BD hasta confirmar)
  const acqOtherMatch = data.match(/^nav_acqo_(mensual|semestral|permanente)__(.+)$/);
  if (acqOtherMatch) {
    NAV_FILTERS[`pending_acq_${chatId}`] = { __plan: acqOtherMatch[1], __profile: acqOtherMatch[2], __field: 'country', __ts: Date.now() };
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id, text: 'Escribe tu país y lo llevamos a la confirmación.' });
    return;
  }

  // Detalle de método: foto/QR + datos completos en un mensaje nuevo (como la Mini App)
  if (data.startsWith('nav_pmd_')) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    const payload = data.replace('nav_pmd_', '');
    const sep = payload.lastIndexOf('__');
    const methodId = sep >= 0 ? payload.slice(0, sep) : payload;
    const profileId = sep >= 0 ? payload.slice(sep + 2) : '';
    await renderNavPaymentMethodDetail(chatId, methodId, profileId);
    return;
  }
}

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Environment variables
export function getBotConfig() {
  const token = (process.env.BOT_TOKEN || '').trim();
  const storedUsername = getSystemSetting('bot_username');
  let rawUsername = process.env.BOT_USERNAME || storedUsername || 'Danii_Catalogo_SCZ_bot';
  if (!rawUsername || /ruti|flavia|iam_danii_vip_bot/i.test(rawUsername)) {
    rawUsername = 'Danii_Catalogo_SCZ_bot';
  }
  let username = rawUsername.replace(/^@/, '').trim() || 'Danii_Catalogo_SCZ_bot';
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || crypto.createHash('sha256').update(token).digest('hex').substring(0, 32);
  const storedChannel = getSystemSetting('channel_id');
  let channelId = (storedChannel || process.env.CHANNEL_ID || '-1004356066811').trim();
  if (!channelId.startsWith('@') && !channelId.startsWith('-') && /^\d+$/.test(channelId)) {
    channelId = `-100${channelId}`;
  }
  const envAdminIds = (process.env.ADMIN_TELEGRAM_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);
  const dbAdminIds = (getSystemSetting('admin_telegram_ids') || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);
  const adminIds = Array.from(new Set([...envAdminIds, ...dbAdminIds]));
  const signingSecret = process.env.ADMIN_SIGNING_SECRET || crypto.createHash('sha256').update(token + 'jwt').digest('hex').substring(0, 32);
  const brandName = process.env.VIP_BRAND_NAME || 'IAM DANII VIP';
  const baseUrl = (
    process.env.RENDER_EXTERNAL_URL ||
    process.env.APP_BASE_URL ||
    process.env.APP_URL ||
    'https://catalogo-vip-scz.onrender.com'
  ).replace(/\/+$/, '');
  const storedAppShortName = getSystemSetting('telegram_app_short_name');
  const appShortName = (process.env.TELEGRAM_APP_SHORT_NAME || storedAppShortName || 'canalVipFreeIamDanii').trim();

  return { token, username, secret, channelId, adminIds, signingSecret, brandName, baseUrl, appShortName };
}

export function getAdminContactUsername(): string {
  const envValue = (process.env.ADMIN_CONTACT_USERNAME || '').trim();
  const dbValue = (getSystemSetting('admin_contact_username') || '').trim();
  const rawValue = envValue || dbValue || 'Danii_Catalogo_SCZ_bot';
  const username = rawValue.replace(/^@/, '').trim();
  if (!username) return 'Danii_Catalogo_SCZ_bot';
  return username;
}

export function isAdminUser(telegramUserId: string | number): boolean {
  const { adminIds } = getBotConfig();
  if (adminIds.length === 0) {
    return false;
  }
  return adminIds.includes(String(telegramUserId));
}

export function isPublicTelegramCallbackData(data: string): boolean {
  if (!data) return false;
  return /^(client_|vip_|pay_method_|nav_)/.test(data);
}

export function parseTelegramBotoneraCallbackData(data: string): {
  kind: 'country' | 'country_menu' | 'plan_menu' | 'plan';
  botoneraId?: string;
  countryId?: string;
  planId?: string;
} | null {
  if (!data) return null;

  if (data.startsWith('vip_country_menu_')) {
    const payload = data.slice('vip_country_menu_'.length);
    if (!payload) return null;
    return { kind: 'country_menu', botoneraId: payload };
  }

  if (data.startsWith('vip_country_')) {
    const payload = data.slice('vip_country_'.length);
    if (!payload) return null;

    const parts = payload.split('__');
    if (parts.length >= 2) {
      return { kind: 'country', botoneraId: parts[0], countryId: parts.slice(1).join('__') };
    }

    const legacy = payload.split('_');
    if (legacy.length >= 2) {
      return {
        kind: 'country',
        botoneraId: legacy.slice(0, -1).join('_') || undefined,
        countryId: legacy[legacy.length - 1]
      };
    }

    return { kind: 'country', countryId: payload };
  }

  if (data.startsWith('vip_plan_menu_')) {
    const payload = data.slice('vip_plan_menu_'.length);
    if (!payload) return null;

    const parts = payload.split('__');
    if (parts.length >= 2) {
      return { kind: 'plan_menu', botoneraId: parts[0], countryId: parts.slice(1).join('__') };
    }

    const legacy = payload.split('_');
    if (legacy.length >= 2) {
      return {
        kind: 'plan_menu',
        botoneraId: legacy.slice(0, -1).join('_') || undefined,
        countryId: legacy[legacy.length - 1]
      };
    }

    return { kind: 'plan_menu', countryId: payload };
  }

  if (data.startsWith('vip_plan_')) {
    const payload = data.slice('vip_plan_'.length);
    if (!payload) return null;

    const parts = payload.split('__');
    if (parts.length >= 3) {
      return { kind: 'plan', botoneraId: parts[0], countryId: parts[1], planId: parts.slice(2).join('__') };
    }

    const legacy = payload.split('_');
    if (legacy.length >= 3) {
      return {
        kind: 'plan',
        botoneraId: legacy.slice(0, -2).join('_') || undefined,
        countryId: legacy[legacy.length - 2],
        planId: legacy[legacy.length - 1]
      };
    }

    if (legacy.length === 2) {
      return { kind: 'plan', countryId: legacy[0], planId: legacy[1] };
    }

    return { kind: 'plan', countryId: payload };
  }

  return null;
}

export function verifyTelegramWebAppData(initData: string): { valid: boolean; user?: any } {
  const { token } = getBotConfig();
  if (!initData) return { valid: false };

  try {
    const params = new URLSearchParams(initData);
    const userJson = params.get('user');
    const parsedUser = userJson ? JSON.parse(userJson) : undefined;

    if (token) {
      const receivedHash = params.get('hash');
      if (receivedHash) {
        params.delete('hash');
        const dataCheckString = Array.from(params.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
        const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
        if (computedHash === receivedHash) {
          return { valid: true, user: parsedUser };
        }
      }
    }
    // [Seguridad V3] Fallback eliminado. Si la firma HMAC no coincide, falla.
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

// Helper para POST HTTPS nativo en Node.js (evita errores de undici/fetch con DNS IPv6 en Windows)
function httpsPostJson(url: string, body: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(url, {
      method: 'POST',
      family: 4,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(responseBody)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Telegram API Helper
export async function callTelegramApi(method: string, body: any): Promise<any> {
  const { token } = getBotConfig();
  if (!token) {
    console.warn(`[Telegram API] Warning: BOT_TOKEN is not configured. Method called: ${method}`);
    return { ok: false, description: 'BOT_TOKEN is not configured in environment variables' };
  }

  const url = `https://api.telegram.org/bot${token}/${method}`;
  try {
    const data = await httpsPostJson(url, body);
    return data;
  } catch (err: any) {
    console.error(`[Telegram API Error - ${method}]:`, err?.message || err);
    return { ok: false, description: err?.message || 'Network error calling Telegram' };
  }
}

export async function sendMessage(chatId: string | number, text: string, options: any = {}) {
  return await callTelegramApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    ...options
  });
}

function isPrivateChat(chat: any): boolean {
  return chat?.type === 'private';
}

async function requirePrivateAdminChat(chat: any, fromId: string | number): Promise<boolean> {
  if (!isAdminUser(fromId)) return false;
  if (isPrivateChat(chat)) return true;
  await sendMessage(chat.id, '🔒 Por seguridad, la gestión de clientes, QR y validaciones solo funciona en el chat privado con este bot.');
  return false;
}

async function sendPrivateQrForRequest(requestId: string, adminChatId: string | number): Promise<void> {
  const request = await getCustomerRequestById(requestId);
  if (!request) {
    await sendMessage(adminChatId, '❌ La solicitud ya no existe.');
    return;
  }
  if (!request.telegram_user_id) {
    await sendMessage(adminChatId, '⚠️ La solicitud no contiene un chat privado válido del cliente.');
    return;
  }
  if (request.status !== 'pendiente') {
    await sendMessage(adminChatId, `ℹ️ Esta solicitud ya fue procesada. Estado actual: *${request.status}*.`);
    return;
  }

  const qrUrl = getSystemSetting('qr_image_url');
  if (!qrUrl) {
    await sendMessage(adminChatId, '⚠️ No hay una imagen QR configurada en el panel administrativo.');
    return;
  }

  const { brandName } = getBotConfig();
  const replyText = `✨ *${brandName || 'IAM Danii VIP'} • Espacio VIP (+18)* ✨\n\nNuestra Administradora autorizó el envío del *QR oficial de pago* para tu solicitud.\n\n📲 Realiza el pago y conserva tu comprobante. La validación y cualquier coordinación posterior se realizarán únicamente mediante conversación privada con la Administradora.\n\n🔒 Este bot no publica comprobantes ni entrega accesos a grupos.`;
  const result = await sendPhotoToUser(request.telegram_user_id, qrUrl, replyText);
  if (!result.ok) {
    console.error(`[Telegram Delivery] QR privado rechazado para solicitud ${requestId}: ${result.description || 'respuesta desconocida'}`);
    await sendMessage(adminChatId, `❌ Telegram no pudo entregar el QR al cliente: ${result.description || 'error desconocido'}`);
    return;
  }

  await updateCustomerRequestStatus(requestId, 'qr_enviado');
  await addAuditLog('SEND_PRIVATE_QR', String(adminChatId), `QR privado enviado para solicitud ${requestId}`, requestId);
  await sendMessage(adminChatId, '✅ QR enviado al chat privado del cliente. La solicitud quedó marcada como *QR ENVIADO*.');
}

export async function pinChatMessage(chatId: string | number, messageId: number) {
  return await callTelegramApi('pinChatMessage', {
    chat_id: chatId,
    message_id: messageId,
    disable_notification: false
  });
}

let cachedCommandsMap: Record<string, string> | null = null;
let lastCommandsFetch = 0;

export async function getBotCommandDescription(commandName: string): Promise<string | null> {
  const now = Date.now();
  if (!cachedCommandsMap || (now - lastCommandsFetch > 60000)) {
    try {
      const res = await callTelegramApi('getMyCommands', {});
      if (res && res.ok && Array.isArray(res.result)) {
        const newMap: Record<string, string> = {};
        for (const item of res.result) {
          if (item.command && item.description) {
            newMap[item.command.toLowerCase().trim()] = item.description.trim();
          }
        }
        cachedCommandsMap = newMap;
        lastCommandsFetch = now;
      }
    } catch (e) {
      console.warn('[Telegram] No se pudieron consultar comandos via getMyCommands:', e);
    }
  }

  const cleanCmd = commandName.replace(/^\//, '').toLowerCase().trim();
  if (cachedCommandsMap && cachedCommandsMap[cleanCmd]) {
    return cachedCommandsMap[cleanCmd];
  }
  return null;
}

export async function getBotCommandText(commandName: string, fallback: string, emojiPrefix?: string): Promise<string> {
  const desc = await getBotCommandDescription(commandName);
  if (desc) {
    if (emojiPrefix && !desc.startsWith(emojiPrefix.trim())) {
      return `${emojiPrefix} ${desc}`;
    }
    return desc;
  }
  return fallback;
}

export async function getAdminReplyKeyboard(adminLink: string, baseUrl: string) {
  const btnCanal = await getBotCommandText('canal', '📢 Canal VIP', '📢');
  const btnListar = await getBotCommandText('listar', '📋 Listar Contenido', '📋');
  const btnNuevo = await getBotCommandText('nuevo', '➕ Nuevo Perfil', '➕');
  const btnAyuda = await getBotCommandText('ayuda', '❓ Ayuda Admin', '❓');

  return {
    keyboard: [
      [
        { text: '👑 Abrir Panel Web' },
        { text: 'Ver lo Exclusivo 🔥🔥🔥', web_app: { url: baseUrl } }
      ],
      [
        { text: btnCanal },
        { text: btnListar }
      ],
      [
        { text: btnNuevo },
          { text: '📌 Anclar Anuncio' }
        ],
        [
          { text: '🔘 Botones' }
      ],
      [
        { text: '📊 Dinámicas / Encuestas' },
        { text: btnAyuda }
      ],
      [
        { text: '❌ Cancelar' }
      ]
    ],
    resize_keyboard: true,
    is_persistent: true
  };
}

export async function sendChannelPoll(
  question: string,
  options: string[],
  isAnonymous: boolean = true
): Promise<{ ok: boolean; result?: any; error?: string }> {
  const { channelId } = getBotConfig();
  if (!channelId) {
    return { ok: false, error: 'Canal no configurado en el sistema.' };
  }

  const trimmedQuestion = question.trim().slice(0, 300);
  const trimmedOptions = options.map(o => o.trim().slice(0, 100)).filter(Boolean);

  if (trimmedOptions.length < 2) {
    return { ok: false, error: 'La encuesta debe tener al menos 2 opciones.' };
  }

  const payload = {
    chat_id: channelId,
    question: trimmedQuestion,
    options: JSON.stringify(trimmedOptions),
    is_anonymous: isAnonymous
  };

  const res = await callTelegramApi('sendPoll', payload);
  if (!res.ok) {
    return { ok: false, error: res.description || 'Error enviando encuesta a Telegram' };
  }
  return { ok: true, result: res.result };
}

export async function updateBotMenuButton() {
  return await callTelegramApi('setChatMenuButton', {
    menu_button: {
      type: 'default'
    }
  });
}

export async function registerBotWebhook() {
  const { baseUrl, secret } = getBotConfig();
  if (!baseUrl || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    console.log('[Telegram Bot] Omitiendo registro de webhook en entorno local/localhost:', baseUrl);
    return { ok: true, description: 'Localhost detected, skipped webhook registration' };
  }

  const webhookUrl = `${baseUrl}/api/telegram/webhook`;
  const payload: any = {
    url: webhookUrl,
    allowed_updates: ['message', 'callback_query', 'my_chat_member', 'channel_post']
  };
  if (secret) {
    payload.secret_token = secret;
  }

  const res = await callTelegramApi('setWebhook', payload);
  await updateBotMenuButton().catch(err => console.error('Error actualizando menu button:', err));
  return res;
}

// Channel Verification & Diagnostic Helper
export async function verifyChannel(targetChannelId: string): Promise<{
  ok: boolean;
  title?: string;
  username?: string;
  id?: string | number;
  error?: string;
}> {
  if (!targetChannelId || !targetChannelId.trim()) {
    return { ok: false, error: 'No se especificó un ID o @usuario de canal.' };
  }

  const { token, username: botUsername } = getBotConfig();
  if (!token) {
    return { ok: false, error: 'BOT_TOKEN no configurado en el servidor.' };
  }

  let formattedChatId = targetChannelId.trim();
  if (!formattedChatId.startsWith('@') && !formattedChatId.startsWith('-') && /^\d+$/.test(formattedChatId)) {
    formattedChatId = `-100${formattedChatId}`;
  }

  const chatRes = await callTelegramApi('getChat', { chat_id: formattedChatId });
  if (!chatRes.ok) {
    const desc = chatRes.description || '';
    if (desc.includes('chat not found')) {
      return {
        ok: false,
        error: `Canal (${formattedChatId}) no encontrado por Telegram. Verifica que el ID o nombre sea exacto y que @${botUsername} haya sido agregado al canal como Administrador.`
      };
    }
    return { ok: false, error: desc || 'Canal no encontrado en Telegram.' };
  }

  const chat = chatRes.result;

  // Verify bot's admin status and posting permissions
  const meRes = await callTelegramApi('getMe', {});
  if (meRes.ok && meRes.result?.id) {
    const botId = meRes.result.id;
    const memberRes = await callTelegramApi('getChatMember', {
      chat_id: formattedChatId,
      user_id: botId
    });

    if (memberRes.ok) {
      const member = memberRes.result;
      const status = member.status;
      if (status !== 'administrator' && status !== 'creator') {
        return {
          ok: false,
          title: chat.title,
          username: chat.username,
          id: chat.id,
          error: `El bot está en el canal pero su rol actual es "${status}". Debe ser Administrador con permisos de publicación.`
        };
      }
      if (status === 'administrator' && member.can_post_messages === false) {
        return {
          ok: false,
          title: chat.title,
          username: chat.username,
          id: chat.id,
          error: 'El bot es Administrador pero tiene desactivado el permiso para "Publicar mensajes" (Post messages).'
        };
      }
    }
  }

  return {
    ok: true,
    title: chat.title,
    username: chat.username,
    id: chat.id
  };
}

// Telegram Channel Sync Function
export async function syncProfileToChannel(profileId: string, performer: string = 'Bot Admin'): Promise<{ success: boolean; message: string; telegramMessageId?: number }> {
  const { channelId, username, baseUrl } = getBotConfig();
  const profile = await getProfileById(profileId);

  if (!profile) {
    return { success: false, message: 'Perfil no encontrado en la base de datos' };
  }

  // Check Operating Mode (Modo A: Solo Bot / Modo B: Híbrido Bot + Canal)
  const operatingMode = getSystemSetting('operating_mode') || 'solo_bot';
  if (operatingMode === 'solo_bot') {
    await addAuditLog('SYNC_PROFILE', performer, `Perfil ${profile.name} publicado en Mini App (Modo Solo Bot)`, profileId);
    return { success: true, message: 'Publicado exitosamente en el Canal VIP Free (Modo Solo Bot: guardado sin publicar en canal público).' };
  }

  // Safety constraint: strictly >= 18 if specified
  if (profile.age && profile.age < 18) {
    const errMsg = 'REGLA PROHIBITIVA: No se permite publicar perfiles menores de 18 años.';
    await addSyncError(profileId, 'PUBLISH_CHANNEL', errMsg);
    return { success: false, message: errMsg };
  }

  if (profile.status === 'retirada' || profile.status === 'borrador') {
    // If profile is retired or draft and has an existing message in channel, delete or mark as retired
    if (profile.telegram_message_id) {
      try {
        await callTelegramApi('deleteMessage', {
          chat_id: channelId,
          message_id: profile.telegram_message_id
        });
      } catch (e) {
        console.warn('Could not delete channel message:', e);
      }
      await saveProfile({ id: profile.id, telegram_message_id: null });
    }
    await addAuditLog('SYNC_CHANNEL', performer, `Perfil ${profile.name} (${profile.status}) removido del canal público`, profileId);
    return { success: true, message: `Perfil ${profile.status}: removido del canal público.` };
  }

  // Excluir contenido de pago con estrellas del preview gratuito del canal
  const freePhotos = (profile.photos || []).filter(u => !(profile.media_stars?.[u] && profile.media_stars[u] > 0));
  const primaryPhoto = freePhotos.length > 0 ? freePhotos[0] : null;
  const activeDesc = (primaryPhoto && profile.media_descriptions?.[primaryPhoto]) || profile.description || '';
  const descText = activeDesc.trim() ? `${activeDesc.trim()}\n\n` : '';
  const caption = `${descText}✨ *¿Quieres ver más?* Toca el botón abajo para abrir la galería completa 👇`;

  const replyMarkup = await buildChannelPostMarkup(profile, baseUrl, username);

  // If already published, attempt edit first
  if (profile.telegram_message_id) {
    const editMethod = primaryPhoto ? 'editMessageCaption' : 'editMessageText';
    const editPayload: any = {
      chat_id: channelId,
      message_id: profile.telegram_message_id,
      parse_mode: 'Markdown',
      reply_markup: replyMarkup
    };
    if (primaryPhoto) {
      editPayload.caption = caption;
    } else {
      editPayload.text = caption;
    }

    const editRes = await callTelegramApi(editMethod, editPayload);

    if (editRes.ok) {
      await addAuditLog('SYNC_CHANNEL', performer, `Publicación de ${profile.name} actualizada en el canal`, profileId);
      return { success: true, message: 'Publicación editada y actualizada con éxito en el canal', telegramMessageId: profile.telegram_message_id };
    } else {
      // Failed to edit (message deleted or old). Record error and fallback to new message.
      const warnMsg = `No se pudo editar el mensaje previo (${profile.telegram_message_id}): ${editRes.description}. Se publicará una nueva entrada en el canal.`;
      await addSyncError(profileId, 'EDIT_CAPTION_FALLBACK', warnMsg);
      console.warn(`[Sync Channel Fallback] ${warnMsg}`);
    }
  }

  // Publish new message (photo, video or text)
  let sendRes;
  if (primaryPhoto) {
    const isVideo = /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(primaryPhoto) || primaryPhoto.includes('/video');
    const tgMatch = primaryPhoto.match(/\/telegram-media\/([a-zA-Z0-9_-]+)/);
    const mediaTarget = profile.telegram_media_file_ids?.[primaryPhoto] || (tgMatch ? tgMatch[1] : primaryPhoto);
    const method = isVideo ? 'sendVideo' : 'sendPhoto';
    const field = isVideo ? 'video' : 'photo';

    sendRes = await callTelegramApi(method, {
      chat_id: channelId,
      [field]: mediaTarget,
      caption,
      has_spoiler: true,
      parse_mode: 'Markdown',
      reply_markup: replyMarkup
    });
  } else {
    sendRes = await callTelegramApi('sendMessage', {
      chat_id: channelId,
      text: caption,
      parse_mode: 'Markdown',
      reply_markup: replyMarkup
    });
  }

  if (sendRes.ok && sendRes.result?.message_id) {
    const newMsgId = sendRes.result.message_id;
    await saveProfile({ id: profile.id, telegram_message_id: newMsgId });
    await addAuditLog('SYNC_CHANNEL', performer, `Publicado mensaje #${newMsgId} para ${profile.name} en el canal`, profileId);
    return { success: true, message: 'Publicado exitosamente en el canal', telegramMessageId: newMsgId };
  } else {
    let errorMsg = sendRes.description || 'Error al publicar en canal Telegram';
    if (errorMsg.toLowerCase().includes('chat not found')) {
      errorMsg = `Canal (${channelId}) no encontrado por Telegram. Abre tu canal, añade a @${username} como Administrador con permisos de publicación, o vincula tu canal en la pestaña 'Telegram' del Panel Web.`;
    }
    await addSyncError(profileId, 'SEND_PHOTO_CHANNEL', errorMsg);
    return { success: false, message: `Error en Telegram: ${errorMsg}` };
  }
}

// Fase 3 (deep links en posts del canal): los canales NO permiten callback_data en sus posts,
// pero sí botones URL con deep links t.me/<bot>?start=... que abren el chat privado del bot.
// El handler /start nav_* ya reenvía esos datos al router nav_* (edición en el mismo mensaje,
// cero registros por clic). Modo configurable via setting post_button_mode:
//   miniapp (default) | nativo | ambos.
export function isNavDeepLinkStartParam(payload: string): boolean {
  return /^nav_/.test(String(payload || '')) && isPublicTelegramCallbackData(String(payload || ''));
}

export async function buildChannelPostMarkup(profile: Profile, _baseUrl: string, username: string) {
  const { appShortName } = getBotConfig();
  const botAppUrl = `https://t.me/${username}/${appShortName || 'canalVipFreeIamDanii'}?startapp=ver_${profile.id}`;
  const cleanBotUser = String(username || '').replace(/^@/, '').trim();

  let customButtonRows: any[] = [];
  try {
    const customButtons = await getPublicCustomButtons('channel');
    // Telegram rechaza botones sin URL válida ("Text buttons are not allowed") y hace
    // caer el post completo: solo se renderizan custom buttons con enlace real. Los de
    // tipo subscription sin URL siguen funcionando únicamente en la Mini App.
    customButtonRows = customButtons
      .filter(btn => /^(https?:\/\/|tg:\/\/)/i.test(String(btn.url || '').trim()))
      .map(btn => [{ text: btn.label, url: String(btn.url).trim() }]);
  } catch (err) {
    console.warn('[Telegram] Could not load custom buttons for channel:', err);
  }

  let mode = String(getSystemSetting('post_button_mode') || 'ambos').toLowerCase();
  if (!['miniapp', 'nativo', 'ambos'].includes(mode)) mode = 'ambos';

  // Telegram-native reactions are configured in the channel settings.
  const keyboard: any[][] = [];
  if (mode === 'miniapp' || mode === 'ambos') {
    keyboard.push([{ text: 'Ver lo Exclusivo 🔥🔥🔥', url: botAppUrl }]);
  }
  if ((mode === 'nativo' || mode === 'ambos') && cleanBotUser) {
    // Botonera nativa del canal: SOLO Métodos de Pago. El deep link abre el bot en
    // privado (nav_pay_<perfil>) donde el cliente ve métodos, envía comprobante y la
    // coordinación continúa manual entre admin y cliente.
    keyboard.push([
      { text: '💳 Métodos de Pago', url: `https://t.me/${cleanBotUser}?start=${encodeURIComponent(`nav_pay_${profile.id}`)}` }
    ]);
  }
  if (keyboard.length === 0) {
    keyboard.push([{ text: 'Ver lo Exclusivo 🔥🔥🔥', url: botAppUrl }]);
  }
  return {
    inline_keyboard: [
      ...keyboard,
      ...customButtonRows
    ]
  };
}

export async function sendPhotoToUser(chatId: string | number, photoUrl: string, caption?: string) {
  const safeCaption = formatTelegramCaptionForMarkdown(caption || '');
  return await callTelegramApi('sendPhoto', {
    chat_id: chatId,
    photo: photoUrl,
    caption: safeCaption,
    parse_mode: safeCaption ? 'MarkdownV2' : undefined
  });
}


// Generate Admin Web Magic Link
export function generateAdminMagicToken(telegramUserId: string | number): string {
  const { signingSecret } = getBotConfig();
  return jwt.sign(
    { sub: String(telegramUserId), role: 'admin', isPinAuth: true, iat: Math.floor(Date.now() / 1000) },
    signingSecret,
    { expiresIn: '24h' } // [Seguridad V6] Expiración acortada
  );
}

export function buildAdminWebLink(baseUrl: string, adminToken: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  return `${cleanBase}/?admin=true&admin_token=${encodeURIComponent(adminToken)}`;
}

export function verifyAdminToken(token: string): { valid: boolean; userId?: string } {
  const { signingSecret, adminIds } = getBotConfig();
  try {
    const decoded = jwt.verify(token, signingSecret) as any;
    if (decoded && decoded.role === 'admin') {
      if (adminIds.length === 0 || isAdminUser(decoded.sub) || decoded.isPinAuth || decoded.sub === 'admin') {
        return { valid: true, userId: decoded.sub };
      }
    }
  } catch {
    // invalid token
  }
  return { valid: false };
}

const telegramFilePathCache = new Map<string, { path: string; expiresAt: number }>();

export async function getTelegramFilePath(fileId: string): Promise<string | null> {
  const cached = telegramFilePathCache.get(fileId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.path;
  }

  const res = await callTelegramApi('getFile', { file_id: fileId });
  if (res && res.ok && res.result?.file_path) {
    const filePath = res.result.file_path;
    telegramFilePathCache.set(fileId, {
      path: filePath,
      expiresAt: Date.now() + 6 * 3600 * 1000 // 6 hours
    });
    return filePath;
  }
  return null;
}

export async function uploadBufferToTelegram(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  chatId?: string | number,
  caption?: string
): Promise<{ ok: boolean; fileId?: string; messageId?: number; isVideo: boolean; error?: string }> {
  const { token, adminIds, channelId } = getBotConfig();
  if (!token) {
    return { ok: false, isVideo: false, error: 'Telegram BOT_TOKEN no configurado' };
  }

  const targetChatId = chatId || getSystemSetting('bodega_channel_id') || adminIds[0] || channelId;
  if (!targetChatId) {
    return { ok: false, isVideo: false, error: 'No se encontró chat o canal de Telegram para almacenar el archivo' };
  }

  const isVideo = mimeType.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(fileName);
  const endpoint = isVideo ? 'sendVideo' : 'sendPhoto';
  const fieldName = isVideo ? 'video' : 'photo';

  const formData = new FormData();
  formData.append('chat_id', String(targetChatId));
  formData.append('disable_notification', 'true');
  const safeCaption = caption ? formatTelegramCaptionForMarkdown(caption) : '';
  if (safeCaption) {
      formData.append('caption', safeCaption);
      formData.append('parse_mode', 'MarkdownV2');
    }
    
    // Si el destino es el canal público (fallback) y no es el chat privado del admin, SIEMPRE blindar con spoiler
    if (String(targetChatId) === channelId) {
      formData.append('has_spoiler', 'true');
    }

  // Copia a un ArrayBuffer nuevo: evita el error de tipos TS2322 (Buffer<ArrayBufferLike>
  // no asignable a BlobPart) en entornos con @types/node >= 20 / lib ES2024.
  const ab = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(ab).set(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
  const blob = new Blob([ab], { type: mimeType });
  formData.append(fieldName, blob, fileName);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${endpoint}`, {
      method: 'POST',
      body: formData
    });
    const data: any = await res.json();
    if (!res.ok || !data.ok) {
      console.error(`[Telegram Upload Error] ${endpoint}:`, data);
      return { ok: false, isVideo, error: data.description || 'Error al subir a Telegram' };
    }

    let fileId = '';
    if (data.result.photo && data.result.photo.length > 0) {
      fileId = data.result.photo[data.result.photo.length - 1].file_id;
    } else if (data.result.video) {
      fileId = data.result.video.file_id;
    } else if (data.result.document) {
      fileId = data.result.document.file_id;
    }

    return {
      ok: true,
      fileId,
      messageId: data.result.message_id,
      isVideo
    };
  } catch (err: any) {
    console.error('[Telegram Upload Exception]:', err);
    return { ok: false, isVideo, error: err?.message || 'Error de conexión con Telegram API' };
  }
}


// ==========================================
// 🛡️ ESCUDO DE SEGURIDAD ANTI-SPAM Y ANTI-BOT (FIREWALL TELEGRAM)
// ==========================================
const blockedSpamUserIds = new Set<string>();
const userRateLimitMap = new Map<string, { count: number; firstTimestamp: number }>();

// Expresión regular para palabras y patrones comunes de spam bots (SMS-BOOM, SMS Bomber, spam ruso, cryptos, etc.)
const SPAM_KEYWORDS_REGEX = /(sms[-_ ]?boom|sms[-_ ]?bomber|bomber|бомбер|спам|смс[-_ ]?атак|sms[-_ ]?spam|spambot|crypto[-_ ]?pump|airdrop|binance[-_ ]?giveaway|1xbet|betwinner|fast[-_ ]?money|invest[-_ ]?now|whatsapp\.com\/channel|t\.me\/\+|t\.me\/joinchat)/i;

// Detección de alfabetos no hispanos: Cirílico (Ruso/Ucraniano), Árabe, Chino/Japonés/Coreano, Devanagari
const NON_SPANISH_SCRIPTS_REGEX = /[\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0900-\u097F]/;

export function isSpamMessage(fromUser?: any, text?: string): { isSpam: boolean; reason?: string } {
  if (!fromUser) return { isSpam: false };
  const userId = String(fromUser.id || '');

  // Las administradoras autorizadas NUNCA son bloqueadas
  if (isAdminUser(userId)) return { isSpam: false };

  // Usuario previamente bloqueado en lista negra en memoria
  if (blockedSpamUserIds.has(userId)) {
    return { isSpam: true, reason: 'Usuario bloqueado previamente en lista negra' };
  }

  // Si es un bot automatizado de Telegram
  if (fromUser.is_bot) {
    blockedSpamUserIds.add(userId);
    return { isSpam: true, reason: 'Bot automatizado (is_bot: true)' };
  }

  const userText = `${fromUser.first_name || ''} ${fromUser.last_name || ''} ${fromUser.username || ''}`.trim();
  const fullContent = `${userText} ${text || ''}`;

  // 1. Detección de palabras clave de spam (SMS-BOOM, bomber, etc.)
  if (SPAM_KEYWORDS_REGEX.test(fullContent)) {
    blockedSpamUserIds.add(userId);
    return { isSpam: true, reason: `Palabras de spam detectadas ("${fullContent.slice(0, 60)}")` };
  }

  // 2. Detección de caracteres cirílicos / rusos / árabes / asiáticos
  if (NON_SPANISH_SCRIPTS_REGEX.test(fullContent)) {
    blockedSpamUserIds.add(userId);
    return { isSpam: true, reason: `Alfabeto no hispano detectado (Cirílico/Ruso/Extranjero): "${fullContent.slice(0, 60)}"` };
  }

  // 3. Rate Limit / Anti-Flood (Más de 5 mensajes en 5 segundos)
  const now = Date.now();
  const rate = userRateLimitMap.get(userId);
  if (!rate || (now - rate.firstTimestamp) > 5000) {
    userRateLimitMap.set(userId, { count: 1, firstTimestamp: now });
  } else {
    rate.count++;
    if (rate.count > 5) {
      blockedSpamUserIds.add(userId);
      return { isSpam: true, reason: 'Exceso de mensajes en pocos segundos (Anti-Flood / Anti-Bombardeo)' };
    }
  }

  // 4. Enlaces externos sospechosos enviados por usuarios desconocidos
  if (text && /(https?:\/\/|t\.me\/|wa\.me\/)/i.test(text) && !text.startsWith('/start')) {
    blockedSpamUserIds.add(userId);
    return { isSpam: true, reason: 'Enlaces sospechosos no permitidos' };
  }

  return { isSpam: false };
}

// Webhook Handler for Telegram Updates
export async function processTelegramUpdate(update: any) {
  if (!update) return;

  // 0.1. Handle bot being added as admin to channel or group
  if (update.my_chat_member) {
    const mcm = update.my_chat_member;
    const chat = mcm.chat;
    const newStatus = mcm.new_chat_member?.status;
    if (chat && (chat.type === 'channel' || chat.type === 'supergroup')) {
      if (newStatus === 'administrator') {
        const channelIdStr = String(chat.id);
        saveSystemSetting('channel_id', channelIdStr);
        if (chat.title) saveSystemSetting('channel_title', chat.title);
        if (chat.username) saveSystemSetting('channel_username', chat.username);
        await addAuditLog('AUTO_LINK_CHANNEL', 'Telegram Webhook', `Canal vinculado automáticamente: "${chat.title || channelIdStr}" (${channelIdStr})`);
        console.log(`[Telegram Auto-Link] Bot añadido como admin al canal: ${chat.title} (${channelIdStr})`);

        const adminFromId = mcm.from?.id;
        if (adminFromId) {
          await sendMessage(adminFromId, `🎉 *¡Canal VIP Vinculado con Éxito!*\n\n📢 *Canal*: ${chat.title || 'Canal VIP'}\n🆔 *ID*: \`${channelIdStr}\`\n🤖 *Estado del Bot*: Administrador con permisos activo.\n\n✅ ¡Ya puedes presionar *"Guardar y Publicar"* en el Canal VIP Free!`);
        }
      }
    }
    return;
  }

  // 0.2. Handle channel posts (detect channel ID from channel activity)
  if (update.channel_post) {
    const chat = update.channel_post.chat;
    if (chat && chat.id) {
      const channelIdStr = String(chat.id);
      saveSystemSetting('channel_id', channelIdStr);
      if (chat.title) saveSystemSetting('channel_title', chat.title);
      if (chat.username) saveSystemSetting('channel_username', chat.username);
      console.log(`[Telegram Auto-Link] Post de canal detectado: ${chat.title} (${channelIdStr})`);
    }
    return;
  }

  // Handle Pre-Checkout Query for Telegram Stars payments
  if (update.pre_checkout_query) {
    const pcq = update.pre_checkout_query;
    try {
      await callTelegramApi('answerPreCheckoutQuery', {
        pre_checkout_query_id: pcq.id,
        ok: true
      });
    } catch (e) {
      console.error('[PreCheckoutQuery Error]:', e);
    }
    return;
  }

  // Handle Callback Queries (Buttons)
  if (update.callback_query) {
    const cb = update.callback_query;
    const spamCheck = isSpamMessage(cb.from, cb.data);
    if (spamCheck.isSpam) {
      console.warn(`[ANTI-SPAM SHIELD] Callback bloqueado de ${cb.from?.id}: ${spamCheck.reason}`);
      await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
      return;
    }
    await handleCallbackQuery(update.callback_query);
    return;
  }

  const message = update.message;
  if (!message) return;

  const chatId = message.chat.id;
  const fromId = message.from?.id;
  const userIdStr = String(fromId || '');
  const text = message.text ? message.text.trim() : '';

  // 🛡️ ESCUDO ANTI-SPAM ACTIVO: Descarte silencioso inmediato si es spam o bot malicioso
  const spamCheck = isSpamMessage(message.from, text);
  if (spamCheck.isSpam) {
    console.warn(`[ANTI-SPAM SHIELD] Mensaje bloqueado de ${fromId} (${message.from?.username || message.from?.first_name}): ${spamCheck.reason}`);
    return; // Descarte silencioso total
  }

  // Bloqueo de grupos no autorizados (el bot no responde ni interactúa en grupos spam ajenos)
  if (message.chat.type === 'group' || message.chat.type === 'supergroup') {
    const { channelId } = getBotConfig();
    if (String(message.chat.id) !== String(channelId)) {
      console.warn(`[ANTI-SPAM SHIELD] Mensaje en grupo no autorizado ignorado: ${message.chat.id} (${message.chat.title || 'Grupo'})`);
      return;
    }
  }

  // Handle Successful Telegram Stars Payment
  if (message.successful_payment) {
    const sp = message.successful_payment;
    console.log('[Telegram Stars Payment Success]:', sp);
    try {
      await sendMessage(chatId, `🎉 *¡Pago con Telegram Stars Exitoso!*\n\n⭐ *Monto*: ${sp.total_amount} Estrellas\n🔑 *Comprobante*: \`${sp.telegram_payment_charge_id}\`\n\nTu contenido exclusivo ha sido desbloqueado. ¡Disfrútalo!`);
    } catch {}
    return;
  }

  // 0.3. Detect forwarded post from a channel
  const fChat = (message.forward_origin && message.forward_origin.type === 'channel' && message.forward_origin.chat)
    ? message.forward_origin.chat
    : (message.forward_from_chat && (message.forward_from_chat.type === 'channel' || String(message.forward_from_chat.id).startsWith('-100')) ? message.forward_from_chat : null);

  if (fChat && fChat.id) {
    if (isAdminUser(fromId)) {
      const channelIdStr = String(fChat.id);
      const channelTitle = fChat.title || fChat.username || 'Canal VIP';
      saveSystemSetting('channel_id', channelIdStr);
      if (fChat.title) saveSystemSetting('channel_title', fChat.title);
      if (fChat.username) saveSystemSetting('channel_username', fChat.username);
      await addAuditLog('AUTO_LINK_CHANNEL', `Admin (${fromId})`, `Canal vinculado por reenvío: "${channelTitle}" (${channelIdStr})`);

      const verify = await verifyChannel(channelIdStr);
      if (verify.ok) {
        await sendMessage(chatId, `🎉 *¡Canal Detectado y Vinculado con Éxito!*\n\n📢 *Nombre*: ${channelTitle}\n🆔 *ID*: \`${channelIdStr}\`\n🤖 *Estado del Bot*: Administrador activo con permisos.\n\n✅ *¡Listo!* Ya puedes usar el botón *"Guardar y Publicar"* en el Canal VIP Free.`);
      } else {
        await sendMessage(chatId, `⚠️ *Canal Detectado e ID Guardado:*\n\n📢 *Nombre*: ${channelTitle}\n🆔 *ID Guardado*: \`${channelIdStr}\`\n\n⚠️ *Aviso de Telegram*: ${verify.error}\n\n👉 *Paso necesario*: Abre tu canal en Telegram ➡️ Ajustes ➡️ Administradores ➡️ Añade a *@${getBotConfig().username}* como Administrador con permiso de publicar mensajes.`);
      }
      return;
    } else {
      await sendMessage(chatId, `ℹ️ Mensaje reenviado de: *${fChat.title || 'Canal'}* (\`${fChat.id}\`).\nPara configurar el bot, primero actívate como Administradora con \`/admin TU_PIN_SECRETO\`.`);
      return;
    }
  }

  if (text === '/mi_id' || text === '/registrar_admin') {
    if (!isPrivateChat(message.chat)) {
      await sendMessage(chatId, '🔒 Abre el chat privado con este bot y vuelve a enviar el comando.');
      return;
    }
    if (isAdminUser(fromId)) {
      await sendMessage(chatId, `✅ *Administradora verificada*\n\nTu chat privado está registrado correctamente para recibir solicitudes.\nID: \`${fromId}\``);
    } else {
      await sendMessage(chatId, `ℹ️ Tu ID privado es \`${fromId}\`.\n\nEste ID todavía no coincide con la administradora configurada en el sistema.`);
    }
    return;
  }

  // 1. Deep Link Client Request handling (e.g., /start req_prof_scz_01)
  if (text.startsWith('/start req_')) {
    if (!isPrivateChat(message.chat)) {
      await sendMessage(chatId, '🔒 Las solicitudes de contenido solo pueden realizarse desde un chat privado.');
      return;
    }
    const profileId = text.replace('/start req_', '').trim();
    await handleClientAvailabilityRequest(message, profileId);
    return;
  }

  // 1.1. Deep Link Client Profile View (from Channel post directly into Mini App)
  if (text.startsWith('/start ver_')) {
    if (!isPrivateChat(message.chat)) {
      await sendMessage(chatId, '🔒 Abre el chat privado para ver el contenido.');
      return;
    }
    if (fromId) {
      await registerSubscriber(String(fromId), message.from?.username, message.from?.first_name).catch(() => {});
    }
    const profileId = text.replace('/start ver_', '').trim();
    const profile = await getProfileById(profileId);
    const { baseUrl } = getBotConfig();
    const profileUrl = `${baseUrl}/#profile-${profileId}`;
    if (profile) {
      await sendMessage(chatId, `💎 *${profile.name}* — Contenido Exclusivo\n\nTarifa VIP: *Bs. ${profile.rate_bs}*\n\nPulsa el botón abajo para abrir la Mini App directamente en Telegram:`, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Ver lo Exclusivo 🔥🔥🔥', web_app: { url: profileUrl } }
            ]
          ]
        }
      });
      return;
    }
    await sendClientWelcome(chatId, message.from?.first_name || 'Invitado/a');
    return;
  }

  // Deep Link de navegación nativa: /start nav_<callback> (llega desde botones del canal)
  if (text.startsWith('/start nav_')) {
    if (!isPrivateChat(message.chat)) {
      await sendMessage(chatId, '🔒 Abre el chat privado para navegar el catálogo.');
      return;
    }
    if (fromId) {
      await registerSubscriber(String(fromId), message.from?.username, message.from?.first_name).catch(() => {});
    }
    const rawNav = text.replace('/start nav_', '').trim();
    const inner = rawNav.startsWith('nav_') ? rawNav : `nav_${rawNav}`;
    // 💳 Métodos de Pago desde el post del canal: el cliente recibe el MISMO post
    // (multimedia + descripción real de la subida) y desde ahí entra a los planes.
    const payMatch = inner.match(/^nav_pay_([^_]+(?:_[^_]+)*)$/);
    if (payMatch) {
      const sent = await sendNavPostView(chatId, payMatch[1]);
      if (sent) return;
    }
    const welcomeRes = await sendClientWelcome(chatId, message.from?.first_name || 'Invitado/a');
    const navMessageId = welcomeRes?.result?.message_id;
    if (navMessageId && isPublicTelegramCallbackData(inner)) {
      await handleNavCallback({ id: '', data: inner, message: { chat: { id: chatId }, message_id: navMessageId } });
    }
    return;
  }

  // Deep Link desde la botonera publicada en el CANAL: /start vipc_<idPais>
  if (text.startsWith('/start vipc_')) {
    if (!isPrivateChat(message.chat)) {
      await sendMessage(chatId, '🔒 Abre el chat privado para ver los métodos de pago.');
      return;
    }
    if (fromId) {
      await registerSubscriber(String(fromId), message.from?.username, message.from?.first_name).catch(() => {});
    }
    const vipCountryId = text.replace('/start vipc_', '').trim();
    // Fase 5: el flujo país→plan (vip_country_*/vip_plan_*) quedó deprecado.
    // Si está desactivado por flag, los deep links legados del canal se derivan
    // a la navegación nativa `nav_*` (equivalente al flujo de la Mini App).
    if (!isLegacyVipCountryFlowEnabled()) {
      await sendMessage(chatId, '🗂 Explora el catálogo y sus tarifas directamente desde el menú:', {
        reply_markup: { inline_keyboard: [[{ text: '🏠 Menú principal', callback_data: 'client_cmd_menu' }]] }
      });
      return;
    }
    const vipBotonera = await getActiveTelegramBotoneraFlow();
    if (!vipBotonera || !vipCountryId) {
      await sendClientPagos(chatId);
      return;
    }
    await sendTelegramPlanOptions(chatId, vipBotonera.id, vipCountryId);
    return;
  }

  // Deep Link Pagos / Métodos de Pago
  if (text.startsWith('/start pagos') || text.startsWith('/start métodos')) {
    if (!isPrivateChat(message.chat)) {
      await sendMessage(chatId, '🔒 Abre el chat privado para ver los métodos de pago.');
      return;
    }
    if (fromId) {
      await registerSubscriber(String(fromId), message.from?.username, message.from?.first_name).catch(() => {});
    }
    await sendClientPagos(chatId);
    return;
  }

  // FASE 2: Texto libre pendiente para filtros de la botonera nativa (zona / búsqueda).
  // Solo vive en memoria por chat; nunca escribe en la base de datos.
  {
    const pendingAcqKey = `pending_acq_${chatId}`;
    const pendingAcq = NAV_FILTERS[pendingAcqKey];
    if (pendingAcq && pendingAcq.__field === 'country' && isPrivateChat(message.chat) && text) {
      delete NAV_FILTERS[pendingAcqKey];
      const country = text.replace(/^\/+/, '').trim().slice(0, 40);
      if (country && country !== '-') {
        await renderNavAcquireConfirm(chatId, message.message_id, String(pendingAcq.__plan), String(pendingAcq.__profile), country);
      } else {
        await renderNavAcquireCountry(chatId, message.message_id, String(pendingAcq.__plan), String(pendingAcq.__profile));
      }
      return;
    }
  }
  {
    const pendingKey = `pending_${chatId}`;
    const pending = NAV_FILTERS[pendingKey];
    if (pending && pending.__field && isPrivateChat(message.chat) && text) {
      delete NAV_FILTERS[pendingKey];
      const fKey: 'list' | 'new' = pending.__key === 'new' ? 'new' : 'list';
      const f = getNavFilters(fKey);
      const value = text.replace(/^\/+/, '').trim();
      if (!value || value === '-') {
        if (pending.__field === 'zone') delete f.zone; else delete f.q;
      } else if (pending.__field === 'zone') {
        f.zone = value.slice(0, 40);
      } else {
        f.q = value.slice(0, 40);
      }
      f.page = 1;
      await renderNavFilteredPage(chatId, message.message_id, fKey);
      return;
    }
  }

  const normText = text.toLowerCase().trim();

  if (text.trim().toLowerCase().startsWith('/bodega')) {
    if (isAdminUser(message.from?.id)) {
      saveSystemSetting('bodega_channel_id', String(message.chat.id));
      await sendMessage(message.chat.id, '📦 *BODEGA ENLAZADA EXITOSAMENTE* 📦\n\nEl bot ha guardado este grupo como tu servidor de almacenamiento ilimitado.\nID Interno: ' + message.chat.id);
    }
    return;
  }


  // 1.1.b. Acceso Rápido y Reconocimiento ID para la Admin
  if (normText.startsWith('/start admin_login') || normText === '/login') {
    if (!isPrivateChat(message.chat)) {
      await sendMessage(chatId, '🔒 Por seguridad, abre el chat privado para acceder al Panel Administrativo.');
      return;
    }
    if (isAdminUser(fromId)) {
      const { baseUrl } = getBotConfig();
      const adminToken = generateAdminMagicToken(String(fromId));
      const adminLink = buildAdminWebLink(baseUrl, adminToken);
      await sendMessage(chatId, `👑 *¡Identidad Confirmada, ${message.from?.first_name || 'Administradora'}!* 👑\n\nTu Telegram ID (\`${fromId}\`) está autorizado.\n\n👇 *Toca el botón para ingresar directo a tu Panel sin contraseñas:*`, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🚀 Entrar a mi Panel Admin', web_app: { url: adminLink } }
            ]
          ]
        }
      });
      return;
    } else {
      await sendMessage(chatId, `⚠️ *Acceso Restringido*\n\nTu Telegram ID (\`${fromId}\`) no figura actualmente como Administradora autorizada.`);
      return;
    }
  }

  // 1.2. Client Commands & Menus (Interactive for all users)
  if (
    normText.startsWith('/start inv_') ||
    normText.startsWith('/start free') ||
    normText.startsWith('/start canal') ||
    normText === '/start' ||
    normText === '/invitar' ||
    normText === '/codigo' ||
    normText === '/vip' ||
    normText === '/menu'
  ) {
    if (!isPrivateChat(message.chat)) {
      await sendMessage(chatId, '🔒 Abre el chat privado para ver el Canal VIP Free y menú.');
      return;
    }
    if (isAdminUser(fromId)) {
      await sendAdminWelcome(chatId, message.from?.first_name || 'Administradora');
      return;
    }
    if (fromId) {
      await registerSubscriber(String(fromId), message.from?.username, message.from?.first_name).catch(() => {});
    }
    await sendClientWelcome(chatId, message.from?.first_name || 'Invitado/a');
    return;
  }

  if (normText === '/canal' || normText === '/ver_canal' || normText === '/vercanal') {
    await sendClientCanal(chatId);
    return;
  }

  if (normText === '/precios' || normText === '/precio' || normText === '/tarifas' || normText === '/tarifa') {
    await sendClientPrecios(chatId);
    return;
  }

  if (
    normText === '/pagos' ||
    normText === '/pago' ||
    normText === '/métodos' ||
    normText === '/metodosdepago' ||
    normText === '/metodos_pago' ||
    normText === '💳 métodos de pago' ||
    normText === '💳 métodos de pago' ||
    normText === 'métodos de pago'
  ) {
    await sendClientPagos(chatId);
    return;
  }

  if (normText === '/info' || normText === '/información' || normText === '/información') {
    await sendClientInfo(chatId);
    return;
  }

  if (normText === '/ayuda' || normText === '/help' || normText === '/soporte') {
    if (isAdminUser(fromId)) {
      await sendAdminHelp(chatId);
    } else {
      await sendClientAyuda(chatId);
    }
    return;
  }

  if (normText === '/id' || normText === '/myid') {
    const { channelId, username } = getBotConfig();
    const isAdm = isAdminUser(fromId);
    let msg = `🆔 *Tu Telegram ID:* \`${fromId}\`\n🤖 *Bot:* @${username}\n📢 *Canal Configurado:* \`${channelId}\`\n`;
    if (isAdm) {
      msg += `👑 *Rol:* Administradora Autorizada ✅\n\n*Vincular Canal VIP:*\n👉 Reenvía cualquier post de tu canal a este chat.\n👉 O escribe: \`/setcanal @NombreDeTuCanal\``;
    } else {
      msg += `\n_Para activarte como Administradora escribe en este chat:_\n👉 \`/admin TU_PIN_SECRETO\``;
    }
    await sendMessage(chatId, msg);
    return;
  }

  if (normText.startsWith('/setcanal') || normText.startsWith('/canal_id')) {
    if (!isAdminUser(fromId)) {
      await sendMessage(chatId, '🔒 Solo administradoras autorizadas pueden vincular el canal. Primero envía `/admin TU_PIN_SECRETO`.');
      return;
    }
    const parts = text.trim().split(/\s+/);
    if (parts.length < 2) {
      const current = getBotConfig().channelId;
      await sendMessage(chatId, `📢 *Canal Configurado Actualmente:* \`${current}\`\n\n*Para cambiarlo:*\n👉 Escribe: \`/setcanal @NombreCanal\` o \`/setcanal -1001234567890\`\n👉 O simplemente *reenvía un post de tu canal* a este chat privado.`);
      return;
    }
    const target = parts[1].trim();
    const verify = await verifyChannel(target);
    if (verify.ok) {
      const savedId = String(verify.id || target);
      saveSystemSetting('channel_id', savedId);
      if (verify.title) saveSystemSetting('channel_title', verify.title);
      if (verify.username) saveSystemSetting('channel_username', verify.username);
      await sendMessage(chatId, `🎉 *¡Canal Vinculado Exitosamente!*\n\n📢 *Canal*: ${verify.title || target}\n🆔 *ID*: \`${savedId}\`\n🤖 *Estado del Bot*: Administrador con permisos activo.\n\n✅ ¡Ya puedes pulsar *"Guardar y Publicar"* en tu Canal VIP Free!`);
    } else {
      saveSystemSetting('channel_id', target);
      await sendMessage(chatId, `⚠️ *ID de Canal Guardado:* \`${target}\`\n\n⚠️ *Aviso de Telegram*: ${verify.error}\n\n👉 *Paso importante*: Abre tu canal en Telegram ➡️ Ajustes ➡️ Administradores ➡️ Añade a *@${getBotConfig().username}* como Administrador con permiso de publicar mensajes.`);
    }
    return;
  }

  // Auto-activación de Administradora por PIN
  const adminParts = text.trim().split(/\s+/);
  const potentialCommand = adminParts[0]?.toLowerCase() || '';
  const potentialPin = adminParts[1]?.trim() || '';
  const validPin = process.env.ADMIN_PIN;

  if ((potentialCommand === '/admin' || potentialCommand === '/pin' || potentialCommand === '/login') && potentialPin) {
    if (potentialPin === validPin) {
      addAdminTelegramId(fromId);
      const { baseUrl, brandName } = getBotConfig();
      const adminToken = generateAdminMagicToken(String(fromId));
      const adminLink = buildAdminWebLink(baseUrl, adminToken);
      await sendMessage(chatId, `👑 *¡Identidad Confirmada!* 👑\n\nTu Telegram ID (\`${fromId}\`) ha sido registrado exitosamente como *Administradora Autorizada* de ${brandName || 'IAM DANII VIP'}.\n\nA partir de ahora tienes acceso permanente a las funciones de administración y Canal VIP Free.\n\n👇 *Toca para abrir tu Panel de Control en el Navegador Web:*`, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🌐 Abrir Panel Web', web_app: { url: adminLink } }
            ]
          ]
        }
      });
      return;
    } else {
      await sendMessage(chatId, '❌ PIN incorrecto. Intenta nuevamente con `/admin TU_PIN_SECRETO`');
      return;
    }
  }

  // 2. Guard for Administrative Commands
  if (!isAdminUser(fromId)) {
    if (normText === '/admin' || normText === '/panel' || normText === 'admin') {
      await sendMessage(chatId, `🔒 *Acceso Administrativo*\n\nTu Telegram ID es: \`${fromId}\`\n\nEste ID aún no está activado como Administradora.\n\n👉 *Para activarte de inmediato, envía en este chat:*\n\`/admin TU_PIN_SECRETO\`  o  \`/admin TU_PIN_SECRETO\``);
      return;
    }
    if (fromId) {
      await registerSubscriber(String(fromId), message.from?.username, message.from?.first_name).catch(() => {});
    }
    await sendClientWelcome(chatId, message.from?.first_name || 'Invitado/a');
    return;
  }

  // Admin User Flow Processing
  if (!(await requirePrivateAdminChat(message.chat, fromId))) {
    return;
  }

  // Administrative tools never run in a group or channel.
  const tLower = text.toLowerCase().trim();
  const isPanelCommand =
    tLower === '/panel' ||
    tLower === '/admin' ||
    tLower === 'admin' ||
    tLower === 'panel' ||
    tLower.includes('abrir panel') ||
    tLower.includes('panel web') ||
    tLower.includes('panel admin');

  if (isPanelCommand) {
    const { baseUrl } = getBotConfig();
    const adminToken = generateAdminMagicToken(String(fromId));
    const adminLink = buildAdminWebLink(baseUrl, adminToken);
    await sendMessage(chatId, `🔐 *Panel Web Administrativo*\n\nPulsa el botón de abajo para abrir el panel directamente de forma nativa e integrada en Telegram:\n\n👉 [Enlace Web Alternativo](${adminLink})\n\n*(Nota: La nueva tecnología Web App Mini te permite gestionar todo el catálogo sin salir de Telegram, y sin mostrar encabezados).*`, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🌐 Abrir Panel Web', web_app: { url: adminLink } }
          ],
          [
            { text: '➕ Nuevo Perfil', callback_data: 'admin_btn_new' },
            { text: '📋 Listar Perfiles', callback_data: 'admin_btn_list' }
          ]
        ]
      }
    });
    return;
  }

  const adminText = text.trim();
  const { baseUrl } = getBotConfig();
  const adminToken = generateAdminMagicToken(String(fromId));
  const adminLink = buildAdminWebLink(baseUrl, adminToken);

  if (adminText === '📢 Canal VIP' || adminText.includes('Canal') || (cachedCommandsMap?.['canal'] && adminText.includes(cachedCommandsMap['canal']))) {
    const { channelId, username } = getBotConfig();
    const storedTitle = getSystemSetting('channel_title');
    await sendMessage(chatId, `📢 *Canal VIP Configurado:*\n\n• Canal: *${storedTitle || channelId}*\n• ID: \`${channelId}\`\n• Bot Administrador: @${username}\n\n_Para cambiar de canal reenvía cualquier post de tu canal o usa \`/setcanal @TuCanal\`._`);
    return;
  }


  if (adminText === '🔘 Botones' || adminText === '🔘 Botones Personalizados') {
    const buttons = await getAllCustomButtons();
    let msg = '🔘 *Botones Personalizados Registrados:*\n\n';
    if (buttons.length === 0) {
      msg += 'No tienes botones personalizados creados aún.\nPuedes crearlos desde el Panel Web en la pestaña *"Botones"*.';
    } else {
      buttons.forEach((b, idx) => {
        msg += `${idx + 1}. *${b.label}*\n   🔗 ${b.url}\n   Canal: ${b.visible_channel ? '✅' : '❌'} | Mini App: ${b.visible_miniapp ? '✅' : '❌'} | Estado: ${b.is_active ? '🟢 Activo' : '⚪ Inactivo'}\n\n`;
      });
    }
    await sendMessage(chatId, msg, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🌐 Gestionar Botones en Panel Web', web_app: { url: adminLink } }]
        ]
      }
    });
    return;
  }

  if (adminText === '📊 Dinámicas / Encuestas') {
    const polls = await getAllPolls();
    let msg = '📊 *Dinámicas / Encuestas Registradas:*\n\n';
    if (polls.length === 0) {
      msg += 'No tienes encuestas creadas aún.\nPuedes redactar encuestas para tu Canal o Mini App desde el Panel Web en la pestaña *"Dinámicas"*.';
    } else {
      polls.forEach((p, idx) => {
        msg += `${idx + 1}. *${p.question}*\n   Opciones: ${p.options.join(', ')}\n   Estado: ${p.is_active ? '🟢 Activa' : '⚪ Finalizada'}\n\n`;
      });
    }
    await sendMessage(chatId, msg, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🌐 Crear Dinámica en Panel Web', web_app: { url: adminLink } }]
        ]
      }
    });
    return;
  }

  if (adminText === '📋 Listar Contenido' || adminText.includes('Listar') || adminText.includes('Perfiles') || (cachedCommandsMap?.['listar'] && adminText.includes(cachedCommandsMap['listar']))) {
    await handleListProfiles(chatId);
    return;
  }

  if (adminText === '➕ Nuevo Perfil' || adminText.includes('Nuevo') || (cachedCommandsMap?.['nuevo'] && adminText.includes(cachedCommandsMap['nuevo']))) {
    await setConversationState(userIdStr, 'NEW_NAME', {});
    await sendMessage(chatId, '➕ *Crear Nuevo Perfil (Paso 1/5)*\n\nPor favor, escribe el *Nombre Público*:');
    return;
  }

  if (adminText === '❓ Ayuda Admin' || adminText.includes('Ayuda') || (cachedCommandsMap?.['ayuda'] && adminText.includes(cachedCommandsMap['ayuda']))) {
    await sendAdminHelp(chatId);
    return;
  }

  if (adminText === '❌ Cancelar' || adminText.includes('Cancelar')) {
    await clearConversationState(userIdStr);
    const replyKbd = await getAdminReplyKeyboard(adminLink, baseUrl);
    await sendMessage(chatId, '❌ *Operación cancelada*. Has regresado al menú principal.', {
      reply_markup: replyKbd
    });
    return;
  }

  // Command switch
  if (text === '/start') {
    await sendAdminWelcome(chatId, message.from?.first_name || 'Administradora');
    return;
  }

  if (text === '/ayuda') {
    await sendAdminHelp(chatId);
    return;
  }

  if (text === '/anclar' || text === '/pin' || text.includes('Anclar Anuncio')) {
    const { username } = getBotConfig();
    let cleanUsername = username || process.env.BOT_USERNAME || 'Danii_Catalogo_SCZ_bot';
    if (!cleanUsername || /ruti|flavia|iam_danii_vip_bot/i.test(cleanUsername)) {
      cleanUsername = 'Danii_Catalogo_SCZ_bot';
    }
    cleanUsername = cleanUsername.replace(/^@/, '').trim();
    const inviteLink = `https://t.me/${cleanUsername}?start=inv_vip`;
    const msg = `💎 *IAM DANII VIP — CONTENIDO EXCLUSIVO (+18)* 💎\n\n` +
      `Bienvenido al canal oficial de acceso a galería confidencial, packs VIP y atención directa sin intermediarios.\n\n` +
      `📲 *ENLACE DE INVITACIÓN DIRECTA AL BOT:*\n` +
      `👉 \`${inviteLink}\`\n\n` +
      `_Trato directo, discreto y 100% confidencial (+18). Pulsa el botón "Ver Canal VIP Free" en el menú inferior para abrir la galería._`;

    const res = await sendMessage(chatId, msg);
    if (res && res.result && res.result.message_id) {
      await pinChatMessage(chatId, res.result.message_id);
    }
    await updateBotMenuButton();
    await sendMessage(chatId, `✅ *Mensaje anclado en Telegram y botón "Ver Canal VIP Free" sincronizado con la web actual.*`);
    return;
  }

  if (text === '/cancelar' || text === '/fin') {
    await clearConversationState(userIdStr);
    await sendMessage(chatId, '❌ *Operación cancelada / finalizada*. Has regresado al menú principal.');
    return;
  }

  if (text === '/nuevo') {
    await setConversationState(userIdStr, 'NEW_NAME', {});
    await sendMessage(chatId, '➕ *Crear Nuevo Perfil (Paso 1/8)*\n\nPor favor, escribe el *Nombre Público* de la chica:');
    return;
  }

  if (text === '/listar') {
    await handleListProfiles(chatId);
    return;
  }

  if (text.startsWith('/qr ')) {
    const targetUserId = text.replace('/qr ', '').trim();
    const pendingRequest = (await getCustomerRequests()).find(
      request => request.telegram_user_id === targetUserId && request.status === 'pendiente'
    );
    if (!pendingRequest) {
      await sendMessage(chatId, '⚠️ No encontré una solicitud pendiente para ese cliente.');
      return;
    }
    await sendPrivateQrForRequest(pendingRequest.id, chatId);
    return;
  }

  if (text.startsWith('/ver ')) {
    const id = text.replace('/ver ', '').trim();
    await handleShowProfileDetail(chatId, id);
    return;
  }

  if (text.startsWith('/editar ')) {
    const id = text.replace('/editar ', '').trim();
    await handleStartEditProfile(chatId, userIdStr, id);
    return;
  }

  if (text.startsWith('/foto ') || text.startsWith('/fotos ')) {
    const id = text.replace(/\/fotos?\s+/, '').trim();
    await handleManagePhotosCommand(chatId, userIdStr, id);
    return;
  }

  if (text.startsWith('/estado ')) {
    const id = text.replace('/estado ', '').trim();
    await handlePromptStatusChange(chatId, id);
    return;
  }

  if (text.startsWith('/publicar ')) {
    const id = text.replace('/publicar ', '').trim();
    await handlePublishCommand(chatId, id);
    return;
  }

  if (text.startsWith('/pausar ')) {
    const id = text.replace('/pausar ', '').trim();
    await handlePauseCommand(chatId, id);
    return;
  }

  if (text.startsWith('/retirar ')) {
    const id = text.replace('/retirar ', '').trim();
    await handleRetireCommand(chatId, id);
    return;
  }

  if (text.startsWith('/eliminar ')) {
    const id = text.replace('/eliminar ', '').trim();
    await handleConfirmDeleteCommand(chatId, id);
    return;
  }

  // Step-by-step Conversation State Machine Handling
  const state = await getConversationState(userIdStr);
  if (state) {
    await handleConversationStep(chatId, userIdStr, message, state);
    return;
  }

  // Si una administradora envía fotos, videos o archivos directamente, guardar en la galería del perfil
  if (message.photo || message.video || message.document) {
    await handleProfileMediaUploadFromTelegram(chatId, userIdStr, message);
    return;
  }

  // Fallback for unexpected messages
  if (text.startsWith('/')) {
    await sendMessage(chatId, '❓ *Comando no reconocido*. Escribe /ayuda para ver los comandos disponibles.');
  }
}

// Conversation Steps Processor
async function handleConversationStep(chatId: string | number, userId: string, message: any, state: any) {
  const text = message.text ? message.text.trim() : '';

  switch (state.step) {

    case 'NEW_NAME': {
      if (!text) {
        await sendMessage(chatId, '⚠️ Por favor envía un nombre válido.');
        return;
      }
      state.draft_data.name = text;
      state.draft_data.zone = 'Contenido +18 VIP';
      state.draft_data.age = 18;
      state.step = 'NEW_RATE';
      await setConversationState(userId, 'NEW_RATE', state.draft_data);
      await sendMessage(chatId, `✅ Nombre: *${text}*\n\n💰 *(Paso 2/4)* Ingrese el *PRECIO SUSCRIPCIÓN / PACK en Bolivianos (Bs.)* (ej. 100):`);
      break;
    }

    case 'NEW_RATE': {
      const rate = parseFloat(text.replace(/[^0-9.]/g, ''));
      if (isNaN(rate) || rate <= 0) {
        await sendMessage(chatId, '⚠️ Ingrese un precio numérico válido.');
        return;
      }
      state.draft_data.rate_bs = rate;
      state.draft_data.commission_bs = 0;
      state.step = 'NEW_DESC';
      await setConversationState(userId, 'NEW_DESC', state.draft_data);
      await sendMessage(chatId, `✅ Precio: *Bs. ${rate}*\n\n📝 *(Paso 4/5)* Ingrese la *Descripción Pública* del perfil / suscripción:`);
      break;
    }

    case 'NEW_COMMISSION': {
      state.draft_data.commission_bs = 0;
      state.step = 'NEW_DESC';
      await setConversationState(userId, 'NEW_DESC', state.draft_data);
      await sendMessage(chatId, `📝 *(Paso 4/5)* Ingrese la *Descripción Pública* del perfil:`);
      break;
    }

    case 'NEW_DESC': {
      if (!text) {
        await sendMessage(chatId, '⚠️ Ingrese una descripción válida.');
        return;
      }
      state.draft_data.description = text;
      state.step = 'NEW_PHOTOS';
      await setConversationState(userId, 'NEW_PHOTOS', state.draft_data);
      await sendMessage(chatId, `✅ Descripción guardada.\n\n📷 *(Paso 6/6)* Por favor envía la *Fotografía del perfil* (adjúntala como foto en este chat o envía su URL).`);
      break;
    }

    case 'NEW_PHOTOS': {
      let photoUrl = '';

      if (message.photo && message.photo.length > 0) {
        // High-res photo from Telegram
        const largestPhoto = message.photo[message.photo.length - 1];
        photoUrl = await getTelegramFileUrl(largestPhoto.file_id);
      } else if (text.startsWith('http://') || text.startsWith('https://')) {
        photoUrl = text;
      }

      if (!photoUrl) {
        await sendMessage(chatId, '⚠️ No se detectó una imagen válida. Por favor adjunta una foto o escribe la URL de una imagen.');
        return;
      }

      const existingPhotos = state.draft_data.photos || [];
      existingPhotos.push(photoUrl);
      state.draft_data.photos = existingPhotos;

      // Show preview
      const previewCard = `
📋 *VISTA PREVIA DE NUEVO PERFIL*

👤 *Nombre*: ${state.draft_data.name}
📍 *Zona*: ${state.draft_data.zone}
💰 *Precio VIP*: Bs. ${state.draft_data.rate_bs}
📷 *Fotos*: ${existingPhotos.length} adjunta(s)

📝 *Descripción*:
${state.draft_data.description}
      `;

      await setConversationState(userId, 'NEW_CONFIRM', state.draft_data);

      await sendMessage(chatId, previewCard, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Guardar como Borrador', callback_data: 'confirm_draft' },
              { text: '📢 Publicar Ahora', callback_data: 'confirm_publish' }
            ],
            [
              { text: '➕ Añadir otra foto', callback_data: 'add_more_photos' },
              { text: '❌ Cancelar', callback_data: 'cancel_wizard' }
            ]
          ]
        }
      });
      break;
    }

    case 'EDIT_FIELD_VALUE': {
      const field = state.draft_data.editing_field;
      const profileId = state.active_profile_id;
      if (!profileId || !field) {
        await clearConversationState(userId);
        await sendMessage(chatId, '⚠️ Error en la sesión de edición. Reiniciando.');
        return;
      }

      const updateData: any = { id: profileId };

      if (field === 'name') updateData.name = text;
      else if (field === 'age') {
        const age = parseInt(text, 10);
        if (isNaN(age) || age < 18) {
          await sendMessage(chatId, '❌ La edad debe ser mayor o igual a 18 años.');
          return;
        }
        updateData.age = age;
      } else if (field === 'zone') updateData.zone = text;
      else if (field === 'rate_bs') updateData.rate_bs = parseFloat(text);
      else if (field === 'commission_bs') updateData.commission_bs = parseFloat(text);
      else if (field === 'description') updateData.description = text;

      const updated = await saveProfile(updateData);
      await clearConversationState(userId);
      await addAuditLog('EDIT_PROFILE', userId, `Campo ${field} actualizado para ${updated.name}`, profileId);

      // Auto-sync
      await syncProfileToChannel(profileId, `Admin Telegram (${userId})`);

      await sendMessage(chatId, `✅ *Campo "${field}" actualizado con éxito para ${updated.name}*.\n\nSincronización ejecutada en la web y canal.`);
      break;
    }

    default:
      await clearConversationState(userId);
      await sendMessage(chatId, 'Comando finalizado.');
      break;
  }
}

// Helper to resolve Telegram file path to accessible URL
async function getTelegramFileUrl(fileId: string): Promise<string> {
  const { token, baseUrl } = getBotConfig();
  const fileData = await callTelegramApi('getFile', { file_id: fileId });
  if (fileData.ok && fileData.result?.file_path) {
    const remotePath = fileData.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${token}/${remotePath}`;
    
    // Download and cache locally to avoid expiring Telegram file URLs
    try {
      const res = await fetch(downloadUrl);
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const fileName = `tg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.jpg`;
        const localPath = path.join(UPLOADS_DIR, fileName);
        fs.writeFileSync(localPath, buffer);
        return `${baseUrl}/uploads/${fileName}`;
      }
    } catch (e) {
      console.warn('Could not cache telegram photo locally, returning direct link:', e);
    }
    return downloadUrl;
  }
  return '';
}

async function handleProfileMediaUploadFromTelegram(chatId: string | number, userId: string, message: any) {
  const { token, baseUrl } = getBotConfig();

  let fileId = '';
  let fileName = '';
  let fileSize = 0;
  let mimeType = '';

  if (message.photo && message.photo.length > 0) {
    const largestPhoto = message.photo[message.photo.length - 1];
    fileId = largestPhoto.file_id;
    fileSize = largestPhoto.file_size || 0;
    fileName = `foto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
    mimeType = 'image/jpeg';
  } else if (message.video) {
    fileId = message.video.file_id;
    fileSize = message.video.file_size || 0;
    fileName = message.video.file_name || `video_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp4`;
    mimeType = message.video.mime_type || 'video/mp4';
  } else if (message.document) {
    fileId = message.document.file_id;
    fileSize = message.document.file_size || 0;
    fileName = message.document.file_name || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    mimeType = message.document.mime_type || 'application/octet-stream';
  }

  if (!fileId) {
    await sendMessage(chatId, '⚠️ Por favor envía una foto o video válido para agregar a la galería.');
    return;
  }

  const maxBytes = 20 * 1024 * 1024; // 20 MB Telegram Bot API limit
  if (fileSize > maxBytes) {
    const sizeMb = (fileSize / (1024 * 1024)).toFixed(1);
    await sendMessage(chatId, `⚠️ *Archivo demasiado grande para Telegram Bot API*\n\nPeso: *${sizeMb} MB* (Límite: 20 MB).\n\n💡 Telegram no permite que bots descarguen archivos mayores a 20 MB.\n👉 Para videos de más de 20 MB, por favor súbelos directamente desde el Panel Web Administrativo.`);
    return;
  }

  const profiles = await getAllProfiles();
  if (profiles.length === 0) {
    await sendMessage(chatId, '⚠️ *No hay perfiles registrados en el Canal VIP Free*.\n\nCrea primero un perfil con `/nuevo` o desde el Panel Web para poder vincularle fotografías y videos.');
    return;
  }

  // Check if admin has a selected profile in conversation state, otherwise default to first profile
  const convState = await getConversationState(userId);
  const activeProfileId = convState?.active_profile_id;
  const targetProfile = (activeProfileId ? profiles.find(p => p.id === activeProfileId) : null) || profiles[0];

  await sendMessage(chatId, `⏳ *Subiendo contenido al perfil de ${targetProfile.name}...*\nArchivo: \`${fileName}\``);

  try {
    const fileData = await callTelegramApi('getFile', { file_id: fileId });
    if (!fileData.ok || !fileData.result?.file_path) {
      throw new Error(fileData.description || 'No se pudo obtener el archivo desde Telegram');
    }

    const downloadUrl = `https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`;
    const res = await fetch(downloadUrl);
    if (!res.ok) {
      throw new Error(`Error al descargar de Telegram (status ${res.status})`);
    }

    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    let finalMediaUrl = '';
    if (isB2Configured()) {
      const objectKey = await uploadBufferToB2(buffer, fileName, mimeType, 'profiles');
      finalMediaUrl = mediaUrl(baseUrl, objectKey);
    } else {
      const localFileName = `tg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${fileName}`;
      const localPath = path.join(UPLOADS_DIR, localFileName);
      fs.writeFileSync(localPath, buffer);
      finalMediaUrl = `${baseUrl}/uploads/${localFileName}`;
    }

    // Add media to profile's photos (as cover / first item)
    const updatedPhotos = [finalMediaUrl, ...(targetProfile.photos || []).filter(p => p !== finalMediaUrl)];
    await saveProfile({
      id: targetProfile.id,
      photos: updatedPhotos
    });

    const sizeFormatted = fileSize < 1024 * 1024
      ? `${(fileSize / 1024).toFixed(1)} KB`
      : `${(fileSize / (1024 * 1024)).toFixed(2)} MB`;

    await addAuditLog('UPLOAD_MEDIA_TELEGRAM', userId, `Foto/video agregada al perfil ${targetProfile.name}: ${fileName} (${sizeFormatted})`, targetProfile.id);

    const adminToken = generateAdminMagicToken(String(userId));
    const adminLink = buildAdminWebLink(baseUrl, adminToken);

    const reply = `✅ *¡Contenido Agregado con Éxito al Canal VIP Free!* 📸\n\n` +
      `👤 *Perfil*: *${targetProfile.name}*\n` +
      `📁 *Archivo*: \`${fileName}\` (${sizeFormatted})\n` +
      `🖼️ *Total Fotos / Videos*: *${updatedPhotos.length}*\n\n` +
      `_El contenido ya está guardado en tu galería. Para gestionarlo abre el Panel Web o usa /publicar ${targetProfile.id}._`;

    await sendMessage(chatId, reply, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🌐 Ver en Panel Web', web_app: { url: adminLink } },
            { text: 'Ver lo Exclusivo 🔥🔥🔥', web_app: { url: baseUrl } }
          ]
        ]
      }
    });
  } catch (error: any) {
    console.error('[Telegram Profile Media Upload Error]:', error);
    await sendMessage(chatId, `❌ *Error al agregar contenido*: ${error.message || 'Error desconocido'}`);
  }
}

export async function sendClientWelcome(chatId: string | number, firstName: string = 'Invitado/a') {
  const { baseUrl, brandName, channelId } = getBotConfig();
  const cleanChannelId = channelId ? channelId.replace(/^-100/, '') : '';
  const storedChannelUsername = getSystemSetting('channel_username');
  const channelUrl = storedChannelUsername 
    ? `https://t.me/${storedChannelUsername.replace(/^@/, '')}`
    : cleanChannelId ? `https://t.me/c/${cleanChannelId}/1` : '';

  const btnCanal = await getBotCommandText('canal', '📢 Entrar al Canal Free Oficial', '📢');
  const btnPrecios = await getBotCommandText('precios', '💰 Tarifas y Precios VIP', '💰');
  const btnInfo = await getBotCommandText('info', 'ℹ️ Información', 'ℹ️');
  const btnAyuda = await getBotCommandText('ayuda', '❓ Ayuda y Soporte', '❓');

  const text = `💎 *${brandName || 'IAM DANII'} • CANAL VIP FREE* 💎\n\n` +
    `¡Hola, *${firstName}*! Te damos la bienvenida a nuestro espacio oficial.\n\n` +
    `Aquí podrás explorar avances exclusivos, contenido fotográfico y acceder al contenido oficial sin censura.\n\n` +
    `👉 *Para no perderte ninguna actualización, únete a nuestro Canal Free y pulsa abajo para abrir la Mini App:*`;

  const inlineKeyboard: any[][] = [];
  inlineKeyboard.push([
    { text: 'Ver lo Exclusivo 🔥🔥🔥', web_app: { url: baseUrl } }
  ]);
  inlineKeyboard.push([
    { text: '🗂 Ver Catálogo', callback_data: 'nav_catalog' },
    { text: '🆕 Novedades', callback_data: 'nav_new' }
  ]);
  inlineKeyboard.push([
    { text: btnPrecios, callback_data: 'client_cmd_precios' },
    { text: btnInfo, callback_data: 'client_cmd_info' }
  ]);
  inlineKeyboard.push([
    { text: btnAyuda, callback_data: 'client_cmd_ayuda' }
  ]);

  const welcomeMediaUrl = getSystemSetting('welcome_media_url');
  const welcomeMediaType = getSystemSetting('welcome_media_type');

  if (welcomeMediaUrl) {
    const isVideo = welcomeMediaType === 'video' || /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(welcomeMediaUrl);
    const method = isVideo ? 'sendVideo' : 'sendPhoto';
    const payloadKey = isVideo ? 'video' : 'photo';
    const res = await callTelegramApi(method, {
      chat_id: chatId,
      [payloadKey]: welcomeMediaUrl,
      caption: text,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: inlineKeyboard }
    });
    if (res && res.ok) return res;
  }

  return await sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: inlineKeyboard
    }
  });
}

export async function sendClientCanal(chatId: string | number) {
  const { baseUrl, channelId } = getBotConfig();
  const cleanChannelId = channelId ? channelId.replace(/^-100/, '') : '';
  const storedChannelUsername = getSystemSetting('channel_username');
  const channelUrl = storedChannelUsername 
    ? `https://t.me/${storedChannelUsername.replace(/^@/, '')}`
    : cleanChannelId ? `https://t.me/c/${cleanChannelId}/1` : '';

  const btnCanal = await getBotCommandText('canal', '📢 Ir al Canal Telegram', '📢');

  const text = `📢 *CANAL OFICIAL FREE* 📢\n\n` +
    `En nuestro canal compartimos previews, novedades y promociones especiales.\n\n` +
    `👉 *Abre la Mini App para ver la galería completa:*`;

  const inlineKeyboard: any[][] = [];
  inlineKeyboard.push([
    { text: 'Ver lo Exclusivo 🔥🔥🔥', web_app: { url: baseUrl } }
  ]);
  inlineKeyboard.push([
    { text: '🔙 Volver al Menú', callback_data: 'client_cmd_menu' }
  ]);

  return await sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: inlineKeyboard
    }
  });
}

export async function sendClientPrecios(chatId: string | number) {
  const { baseUrl } = getBotConfig();
  const btnInfo = await getBotCommandText('info', 'ℹ️ Información y Seguridad', 'ℹ️');
  const boliviaRate = await getBoliviaOfficialRateFromServer();
  const boliviaRateText = boliviaRate !== null ? `Bs. ${boliviaRate} / mes` : 'Consultar con Administradora';

  const text = `💰 *TARIFAS Y SUSCRIPCIÓN VIP* 💰\n\n` +
    `✨ *¿Qué incluye la Suscripción VIP?*\n` +
    `• Acceso ilimitado a la galería privada completa (fotos y videos en alta definición).\n` +
    `• Contenido sugestivo y exclusivo sin censura.\n` +
    `• Novedades y actualizaciones continuas.\n` +
    `• Trato confidencial y atención directa 1 a 1.\n\n` +
    `💵 *Tarifa Oficial:* ${boliviaRateText}\n\n` +
    `🔒 *Forma de Pago Segura:* La Administradora entrega el *QR oficial de pago* de forma 100% privada. Tras validar tu comprobante, recibirás el link privado y confidencial para unirte al Grupo/Canal VIP.\n\n` +
    `_Explora el contenido en la Mini App y pulsa en Ver lo Exclusivo._`;

  return await sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Ver lo Exclusivo 🔥🔥🔥', web_app: { url: baseUrl } }
        ],
        
        [
          { text: btnInfo, callback_data: 'client_cmd_info' },
          { text: '🔙 Volver al Menú', callback_data: 'client_cmd_menu' }
        ]
      ]
    }
  });
}

export async function buildPaymentMethodsKeyboard(publicMethods?: PaymentMethod[]): Promise<any[][]> {
  const methods = (publicMethods || (await getPublicPaymentMethods()))
    .filter((method) => method.is_active)
    .sort((a, b) => (a.priority_order ?? 0) - (b.priority_order ?? 0));

  const rows: any[][] = [];
  const featured = methods.filter(method => method.id === 'qr_bolivia' || method.category === 'national' || method.category === 'international');
  const services = methods.filter(method => method.category === 'service');

  for (const method of featured) {
    rows.push([{ text: method.title, callback_data: `pay_method_${method.id}` }]);
  }

  const chunked = [] as PaymentMethod[][];
  for (let i = 0; i < services.length; i += 2) {
    chunked.push(services.slice(i, i + 2));
  }

  for (const chunk of chunked) {
    rows.push(chunk.map(method => ({ text: method.title, callback_data: `pay_method_${method.id}` })));
  }

  rows.push([{ text: '🔙 Volver al Menú', callback_data: 'client_cmd_menu' }]);
  return rows;
}

export async function sendClientPagos(chatId: string | number) {
  const kbd = await buildPaymentMethodsKeyboard();
  const text = `HOLI 💖🔥\n` +
    `*TODOS MIS METODOS DE PAGO* 🥰💖\n\n` +
    `📌 BOLIVIA: 🇧🇴\n` +
    `📌 PERU: 🇵🇪\n` +
    `📌 EXTRANJERO: 🇲🇽 🇦🇷 🇺🇸 🌍\n\n` +
    `_Toca en cualquiera de los botones abajo para ver los datos de transferencia y enviar tu comprobante:_`;

  return await sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: kbd
    }
  });
}

export async function getActiveTelegramBotoneraFlow(): Promise<any | null> {
  const items = await getAllTelegramBotoneras();
  return items.filter(item => item.is_active && item.status !== 'draft').sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))[0] || null;
}

export function buildTelegramBotoneraKeyboard(botonera: any): any[][] {
  const countries = (botonera?.countries || []).filter((item: any) => item.active);
  const rows: any[][] = [];
  for (let i = 0; i < countries.length; i += 2) {
    const row: any[] = [];
    for (const country of countries.slice(i, i + 2)) {
      row.push({ text: `${country.flag || '🌍'} ${country.name || country.label || 'País'}`, callback_data: `vip_country_${botonera.id}__${country.id}` });
    }
    rows.push(row);
  }
  rows.push([{ text: '🔙 Volver al Menú', callback_data: 'client_cmd_menu' }]);
  return rows;
}

// ── Fase 5: Botonera VIP por países (modo deprecado) ─────────────────────────
// Este flujo antiguo (país → plan → confirmación con vip_country_*/vip_plan_*)
// fue reemplazado por la navegación nativa `nav_*` (Fases 1 y 2), que replica el
// flujo de la Mini App sin escribir en la base de datos. Se conserva SOLO como
// respaldo para publicaciones antiguas del canal; ya no se ofrece en el menú.
// Para desactivarlo por completo: ADMIN_FEATURES_JSON {"legacyVipCountryFlow": false}
export function isLegacyVipCountryFlowEnabled(): boolean {
  try {
    const raw = process.env.ADMIN_FEATURES_JSON;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && 'legacyVipCountryFlow' in parsed) {
        return Boolean(parsed.legacyVipCountryFlow);
      }
    }
  } catch { /* configuración inválida: mantener respaldo activo */ }
  return true;
}

export async function sendTelegramBotoneraFlow(chatId: string | number) {
  if (!isLegacyVipCountryFlowEnabled()) {
    return await sendClientWelcome(chatId);
  }
  const botonera = await getActiveTelegramBotoneraFlow();
  if (!botonera) {
    return await sendMessage(chatId, '⚠️ Aún no hay una botonera VIP publicada para este flujo.');
  }

  const text = `*${botonera.title || 'SUSCRIPCIÓN VIP'}*\n\n${botonera.intro || 'Selecciona tu país para continuar.'}`;
  const keyboard = buildTelegramBotoneraKeyboard(botonera);
  return await sendMessage(chatId, text, {
    reply_markup: { inline_keyboard: keyboard }
  });
}

export async function sendTelegramPlanOptions(chatId: string | number, botoneraId: string, countryId: string) {
  const items = await getAllTelegramBotoneras();
  const botonera = items.find(item => item.id === botoneraId) || (await getActiveTelegramBotoneraFlow());
  if (!botonera) {
    await sendMessage(chatId, '⚠️ No pude abrir la botonera VIP en este momento. Vuelve al menú principal e inténtalo otra vez.', {
      reply_markup: { inline_keyboard: [[{ text: '🏠 Menú principal', callback_data: 'client_cmd_menu' }]] }
    });
    return;
  }

  const country = (botonera.countries || []).find((item: any) => {
    const itemId = String(item.id || '');
    const itemName = String(item.name || item.label || '');
    return (
      normalizeTelegramKey(itemId) === normalizeTelegramKey(countryId) ||
      normalizeTelegramKey(itemName) === normalizeTelegramKey(countryId) ||
      normalizeTelegramKey(String(item.label || '')) === normalizeTelegramKey(countryId)
    );
  }) || (botonera.countries || []).find((item: any) => String(item.id) === String(countryId));

  const methods = await getRelevantPaymentMethodsForCountry(country?.name || countryId || '');

  if (methods.length > 0) {
    const preferredMethod = methods[0];
    const boliviaRate = preferredMethod.id === 'qr_bolivia' ? await getBoliviaOfficialRateFromServer() : null;
    await showPaymentMethodDetail(chatId, preferredMethod.id, { profileRateBs: boliviaRate ?? undefined });
    return;
  }

  const adminUsername = getAdminContactUsername();
  const rows: any[][] = [[{ text: '📲 Hablar con administradora', url: `https://t.me/${adminUsername}` }], [{ text: '🔙 Cambiar país', callback_data: `vip_country_menu_${botonera.id}` }], [{ text: '🏠 Menú principal', callback_data: 'client_cmd_menu' }]];

  const text = `*${botonera.country_label || 'País / Bandera'}: ${country?.flag || '🌍'} ${country?.name || countryId || 'Selección'}*\n\n` +
    `*No hay un método de pago activo guardado para este país.*\n\n` +
    `_Contacta a la administradora para coordinar la suscripción._`;
  return await sendMessage(chatId, text, { reply_markup: { inline_keyboard: rows } });
}

function normalizeTelegramKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function resolveCountryNameFromPaymentMethodTitle(title: string): string | null {
  const aliases: Record<string, string[]> = {
    Bolivia: ['bolivia', 'bo'],
    Perú: ['peru', 'perú', 'pe'],
    Chile: ['chile', 'cl'],
    Argentina: ['argentina', 'ar'],
    España: ['espana', 'españa', 'es', 'spain'],
    México: ['mexico', 'méxico', 'mx'],
    Paraguay: ['paraguay', 'py'],
    Brasil: ['brasil', 'brazil', 'br'],
    Uruguay: ['uruguay', 'uy'],
    Colombia: ['colombia', 'co'],
    Ecuador: ['ecuador', 'ec'],
    Venezuela: ['venezuela', 've'],
    Rusia: ['rusia', 'russia', 'ru']
  };

  const normalized = normalizeTelegramKey(title);
  for (const [countryName, items] of Object.entries(aliases)) {
    if (items.some(item => normalized.includes(normalizeTelegramKey(item)))) {
      return countryName;
    }
  }

  return null;
}

async function getRelevantPaymentMethodsForCountry(countryName: string): Promise<PaymentMethod[]> {
  const methods = await getPublicPaymentMethods();
  const target = normalizeTelegramKey(countryName);

  return methods.filter(method => {
    if (!method.is_active) return false;
    const title = method.title || '';
    const methodCountry = resolveCountryNameFromPaymentMethodTitle(title);
    if (methodCountry && normalizeTelegramKey(methodCountry) === target) return true;
    if (target === 'bolivia' && (method.id === 'qr_bolivia' || /bolivia/i.test(title))) return true;
    return false;
  });
}

export async function sendTelegramPlanConfirmation(chatId: string | number, botoneraId: string, countryId: string, planId: string) {
  const items = await getAllTelegramBotoneras();
  const botonera = items.find(item => item.id === botoneraId) || null;
  if (!botonera) return;

  const country = (botonera.countries || []).find((item: any) => String(item.id) === String(countryId));
  const plan = (botonera.plans || []).find((item: any) => String(item.id) === String(planId));
  const normalizedPlanType = String(plan?.plan_type || '').toLowerCase();
  const adminUsername = getAdminContactUsername();
  const adminUrl = `https://t.me/${adminUsername}`;

  if (normalizedPlanType === 'monthly') {
    const relevantMethods = await getRelevantPaymentMethodsForCountry(country?.name || '');
    const rows: any[][] = relevantMethods.length > 0
      ? relevantMethods.map((method: PaymentMethod) => [{ text: method.title, callback_data: `pay_method_${method.id}` }])
      : [[{ text: '📲 Hablar con administradora', url: adminUrl }]];

    rows.push([{ text: '🔙 Cambiar plan', callback_data: `vip_country_${botonera.id}__${countryId}` }]);

    const text = `*${botonera.confirmation_title || 'Confirmar suscripción'}*\n\n` +
      `${country?.flag || '🌍'} ${country?.name || 'País'}\n` +
      `${plan?.name || 'Plan'}\n\n` +
      `Selecciona el método de pago disponible para este país y luego confirma con la administradora en privado.`;

    return await sendMessage(chatId, text, { reply_markup: { inline_keyboard: rows }, parse_mode: 'Markdown' });
  }

  const text = `*${botonera.confirmation_title || 'Confirmar suscripción'}*\n\n` +
    `${country?.flag || '🌍'} ${country?.name || 'País'}\n` +
    `${plan?.name || 'Plan'}\n\n` +
    `${botonera.confirmation_text || 'Tu solicitud quedará en revisión privada.'}\n\n` +
    `${botonera.contact_text || 'Contacta a la administradora en privado.'}\n\n` +
    `📲 [@${adminUsername}](${adminUrl})`;

  const keyboard = [
    [{ text: '✅ Confirmar solicitud', url: adminUrl }],
    [{ text: '🔙 Cambiar plan', callback_data: `vip_country_${botonera.id}__${countryId}` }, { text: '🏠 Menú principal', callback_data: 'client_cmd_menu' }]
  ];
  return await sendMessage(chatId, text, { reply_markup: { inline_keyboard: keyboard }, parse_mode: 'Markdown' });
}

function parsePositiveCurrencyNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numericValue = typeof value === 'string' ? Number(value.replace(/[^0-9.]/g, '')) : Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
}

export async function getBoliviaOfficialRateFromServer(): Promise<number | null> {
  const profiles = await getAllProfiles();
  for (const profile of profiles) {
    const rate = parsePositiveCurrencyNumber(profile?.rate_bs);
    if (rate !== null) return rate;
  }
  return null;
}

export function getOfficialFeeText(method: { id: string; title: string; price?: string | null; category?: string }, profileRateBs?: number | string): string {
  const isBoliviaMethod = method.id === 'qr_bolivia' || /bolivia/i.test(method.title) || method.category === 'national';

  if (isBoliviaMethod) {
    const rate = parsePositiveCurrencyNumber(profileRateBs) ?? parsePositiveCurrencyNumber(method.price);
    return rate !== null ? `Bs. ${rate} / mes` : 'Consultar con Administradora';
  }

  return method.price ? `${method.price} / mes` : 'Consultar con Administradora';
}

export async function showPaymentMethodDetail(
  chatId: string | number,
  methodId: string,
  options?: { profileRateBs?: number | string }
) {
  const method = await getPaymentMethodById(methodId);
  if (!method) {
    await sendMessage(chatId, '⚠️ Método de pago no disponible.');
    return;
  }

  const adminUsername = getAdminContactUsername();
  const adminContactUrl = `https://t.me/${adminUsername}`;
  const { baseUrl } = getBotConfig();
  const officialFeeText = getOfficialFeeText(method, options?.profileRateBs);

  const caption = `✨ *${method.title}* ✨\n\n` +
    `${method.description || 'Consulta los datos y coordenadas de pago con la Administradora.'}\n\n` +
    `💵 *Tarifa Oficial:* ${officialFeeText}\n\n` +
    `📲 *Envía tu comprobante a:* [@${adminUsername}](${adminContactUrl})\n\n` +
    `_Una vez recibido y verificado tu comprobante, la Administradora te enviará el acceso privado a nuestro contenido VIP._`;

  const inlineKeyboard = [
    [
      { text: '📲 Enviar Comprobante', url: adminContactUrl }
    ],
    [
      { text: '💳 Ver Todos los Métodos', callback_data: 'client_cmd_pagos' },
      { text: '💎 Abrir Mini App', web_app: { url: baseUrl } }
    ],
    [
      { text: '🔙 Volver al Menú', callback_data: 'client_cmd_menu' }
    ]
  ];

  if (method.image_url) {
    const isVideo = /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(method.image_url);
    const apiMethod = isVideo ? 'sendVideo' : 'sendPhoto';
    const payloadKey = isVideo ? 'video' : 'photo';
    const safeCaption = formatTelegramCaptionForMarkdown(caption);
    const res = await callTelegramApi(apiMethod, {
      chat_id: chatId,
      [payloadKey]: method.image_url,
      caption: safeCaption,
      parse_mode: 'MarkdownV2',
      reply_markup: { inline_keyboard: inlineKeyboard }
    });
    if (res && res.ok) return res;
  }

  return await sendMessage(chatId, caption, {
    reply_markup: {
      inline_keyboard: inlineKeyboard
    }
  });
}

export async function publishPaymentMethodsToChannel(): Promise<{ ok: boolean; message: string }> {
  const { channelId, username, appShortName } = getBotConfig();
  if (!channelId) {
    return { ok: false, message: 'No hay canal configurado en el sistema.' };
  }

  const text = `HOLI 💖🔥\n` +
    `*TODOS MIS METODOS DE PAGO* 🥰💖\n\n` +
    `📌 BOLIVIA: 🇧🇴\n` +
    `📌 PERU: 🇵🇪\n` +
    `📌 EXTRANJERO: 🇲🇽 🇦🇷 🇺🇸 🌍\n\n` +
    `_Toca el botón abajo para abrir la lista interactiva de métodos de pago en el bot:_`;

  const botUsername = (username || 'Danii_Catalogo_SCZ_bot').replace(/^@/, '').trim();
  const directMiniAppUrl = `https://t.me/${botUsername}/${appShortName || 'canalVipFreeIamDanii'}`;
  const inlineKeyboard = [
    
    [
      { text: 'Ver lo Exclusivo 🔥🔥🔥', url: directMiniAppUrl }
    ]
  ];

  const res = await sendMessage(channelId, text, {
    reply_markup: {
      inline_keyboard: inlineKeyboard
    }
  });

  if (res && res.ok) {
    return { ok: true, message: 'Menú de métodos de pago publicado en el canal exitosamente.' };
  } else {
    return { ok: false, message: res?.description || 'Error al publicar en el canal.' };
  }
}

export async function sendClientInfo(chatId: string | number) {
  const { baseUrl } = getBotConfig();
  const btnPrecios = await getBotCommandText('precios', '💰 Ver Tarifas y Precios', '💰');

  const text = `ℹ️ *INFORMACIÓN, SEGURIDAD Y DISCRECIÓN* ℹ️\n\n` +
    `🔒 *Garantía de Confidencialidad:*\n` +
    `• Contenido 100% digital exclusivo para mayores de 18 años (+18).\n` +
    `• Material protegido con marca de agua digital.\n` +
    `• Todas las conversaciones, pagos y accesos son estrictamente privados.\n\n` +
    `⚠️ *Aviso Importante:* Este bot no publica comprobantes ni enlaces en grupos públicos. Toda coordinación se realiza por mensaje privado directo con la Administradora.`;

  return await sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Ver lo Exclusivo 🔥🔥🔥', web_app: { url: baseUrl } }
        ],
        [
          { text: btnPrecios, callback_data: 'client_cmd_precios' },
          { text: '🔙 Volver al Menú', callback_data: 'client_cmd_menu' }
        ]
      ]
    }
  });
}

export async function sendClientAyuda(chatId: string | number) {
  const { baseUrl } = getBotConfig();
  const btnPrecios = await getBotCommandText('precios', '💰 Ver Precios', '💰');

  const text = `❓ *PREGUNTAS FRECUENTES Y AYUDA* ❓\n\n` +
    `1️⃣ *¿Cómo abro la galería?*\n` +
    `Pulsa el botón *"Ver Canal VIP Free"* en el menú inferior del bot o en cualquier mensaje.\n\n` +
    `2️⃣ *¿Qué son las imágenes sugestivas/efímeras?*\n` +
    `Son imágenes teaser que solo se pueden ver durante unos segundos antes de desaparecer permanentemente de tu galería.\n\n` +
    `3️⃣ *¿Cómo me suscribo?*\n` +
    `Pulsa *"Adquirir Contenido"* en la Mini App o escribe /precios para recibir el QR privado de la Administradora.\n\n` +
    `4️⃣ *¿Problemas o dudas?*\n` +
    `Escribe tu mensaje en este chat privado para recibir asistencia directa.`;

  return await sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Ver lo Exclusivo 🔥🔥🔥', web_app: { url: baseUrl } }
        ],
        [
          { text: btnPrecios, callback_data: 'client_cmd_precios' },
          { text: '🔙 Volver al Menú', callback_data: 'client_cmd_menu' }
        ]
      ]
    }
  });
}

// Callback Query Handler (Inline Keyboard clicks)
async function handleCallbackQuery(cb: any) {
  const chatId = cb.message.chat.id;
  const fromId = cb.from.id;
  const data = cb.data || '';
  const userIdStr = String(fromId);

  console.info('[TelegramCallback]', {
    fromId,
    chatId,
    data,
    messageChatType: cb.message?.chat?.type,
    isAdmin: isAdminUser(fromId)
  });

  // 0. Botones públicos pulsados FUERA del chat privado (p. ej. posts viejos del canal con callback_data).
  // Telegram no permite mostrar datos de pago ni botones web_app dentro de un canal, así que se abre
  // el bot en privado con un deep link (answerCallbackQuery + url acepta enlaces t.me/<bot>?start=...).
  const callbackChatType = cb.message?.chat?.type;
  if (callbackChatType && callbackChatType !== 'private' && isPublicTelegramCallbackData(data)) {
    const botUser = String(getBotConfig().username || '').replace(/^@/, '').trim();
    // Navegación nativa (nav_*): se redirige al chat privado conservando el paso exacto del flujo.
    if (data.startsWith('nav_')) {
      const safeNav = data.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
      const navLink = `https://t.me/${botUser}?start=nav_${safeNav}`;
      const navRes = botUser
        ? await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id, url: navLink })
        : { ok: false };
      if (!navRes?.ok) {
        await callTelegramApi('answerCallbackQuery', {
          callback_query_id: cb.id,
          text: `Abre @${botUser || 'el bot'} y pulsa Start para navegar el catálogo.`,
          show_alert: true
        });
      }
      return;
    }
    const parsedPublic = parseTelegramBotoneraCallbackData(data);
    const safeCountry = String(parsedPublic?.countryId || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 50);
    const startParam = safeCountry ? `vipc_${safeCountry}` : 'pagos';
    const deepLink = `https://t.me/${botUser}?start=${startParam}`;
    const redirectRes = botUser
      ? await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id, url: deepLink })
      : { ok: false, description: 'bot username vacío' };
    if (!redirectRes?.ok) {
      console.error('[TelegramCallback] No se pudo redirigir al chat privado:', redirectRes?.description);
      await callTelegramApi('answerCallbackQuery', {
        callback_query_id: cb.id,
        text: `Abre @${botUser || 'el bot'} y pulsa Start para ver los métodos de pago.`,
        show_alert: true
      });
    }
    return;
  }

  // 0.5. Navegación editable de la botonera nativa (equivalente en Telegram al flujo de la Mini App).
  // Se resuelve SIEMPRE editando el mensaje actual; ningún clic escribe en la base de datos.
  if (data.startsWith('nav_')) {
    await handleNavCallback(cb);
    return;
  }

  // 1. Client Callbacks (accessible to everyone)
  if (data.startsWith('client_')) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    if (data === 'client_cmd_canal') {
      await sendClientCanal(chatId);
    } else if (data === 'client_cmd_precios') {
      await sendClientPrecios(chatId);
    } else if (data === 'client_cmd_pagos') {
      await sendClientPagos(chatId);
    } else if (data === 'client_cmd_info') {
      await sendClientInfo(chatId);
    } else if (data === 'client_cmd_ayuda') {
      await sendClientAyuda(chatId);
    } else if (data === 'client_cmd_menu') {
      await sendClientWelcome(chatId, cb.from?.first_name || 'Invitado/a');
    }
    return;
  }

  // 1.05 Payment Method Selection Callback
  if (data.startsWith('pay_method_')) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    const methodId = data.replace('pay_method_', '');
    await showPaymentMethodDetail(chatId, methodId);
    return;
  }

  if (data.startsWith('vip_country_menu_')) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    const botoneraId = data.slice('vip_country_menu_'.length);
    const items = await getAllTelegramBotoneras();
    const botonera = items.find(item => item.id === botoneraId) || (await getActiveTelegramBotoneraFlow());
    if (botonera) {
      await sendMessage(chatId, `*${botonera.title || 'SUSCRIPCIÓN VIP'}*\n\n${botonera.intro || 'Selecciona tu país para continuar.'}`, {
        reply_markup: { inline_keyboard: buildTelegramBotoneraKeyboard(botonera) }
      });
    }
    return;
  }

  if (data.startsWith('vip_country_')) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    const parsed = parseTelegramBotoneraCallbackData(data);
    if (parsed && parsed.kind === 'country' && parsed.countryId) {
      const fallbackBotoneraId = parsed.botoneraId || (await getActiveTelegramBotoneraFlow())?.id;
      if (fallbackBotoneraId) {
        await sendTelegramPlanOptions(chatId, fallbackBotoneraId, parsed.countryId);
      }
    }
    return;
  }

  if (data.startsWith('vip_plan_menu_')) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    const parsed = parseTelegramBotoneraCallbackData(data);
    if (parsed && parsed.kind === 'plan_menu' && parsed.countryId) {
      const fallbackBotoneraId = parsed.botoneraId || (await getActiveTelegramBotoneraFlow())?.id;
      if (fallbackBotoneraId) {
        await sendTelegramPlanOptions(chatId, fallbackBotoneraId, parsed.countryId);
      }
    }
    return;
  }

  if (data.startsWith('vip_plan_')) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    const parsed = parseTelegramBotoneraCallbackData(data);
    if (parsed && parsed.kind === 'plan' && parsed.countryId) {
      const fallbackBotoneraId = parsed.botoneraId || (await getActiveTelegramBotoneraFlow())?.id;
      if (fallbackBotoneraId) {
        await sendTelegramPlanOptions(chatId, fallbackBotoneraId, parsed.countryId);
      }
    }
    return;
  }

  // Protección explícita para estos flujos públicos: la botonera VIP y los métodos de pago no deben bloquearse por chat privado ni por acceso admin.
  if (isPublicTelegramCallbackData(data)) {
    console.info('[TelegramCallbackPublicAllowed]', { data, fromId, chatId });
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    return;
  }

  // 2. Admin verification for all other callbacks
  if (!isAdminUser(fromId)) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id, text: 'Acceso solo para administradoras.', show_alert: true });
    return;
  }

  if (!isPrivateChat(cb.message?.chat)) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id, text: 'Esta acción solo funciona en el chat privado.', show_alert: true });
    return;
  }

  await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });

  // Admin action button callbacks
  if (data === 'admin_btn_new') {
    await setConversationState(userIdStr, 'NEW_NAME', {});
    await sendMessage(chatId, '➕ *Crear Nuevo Perfil (Paso 1/5)*\n\nPor favor, escribe el *Nombre Público*:');
    return;
  }

  if (data === 'admin_btn_list') {
    await handleListProfiles(chatId);
    return;
  }

  if (data === 'admin_btn_help') {
    await sendAdminHelp(chatId);
    return;
  }

  // Fase 3: modo de botones en los posts del canal (Mini App / Nativo deep links / Ambos).
  if (data === 'admin_btn_postmode' || data.startsWith('admin_postmode_')) {
    const modes = ['miniapp', 'nativo', 'ambos'] as const;
    const labels: Record<string, string> = { miniapp: '🌐 Solo Mini App', nativo: '📱 Solo Botonera Nativa', ambos: '✨ Ambos' };
    if (data !== 'admin_btn_postmode') {
      const chosen = data.replace('admin_postmode_', '');
      if ((modes as readonly string[]).includes(chosen)) {
        saveSystemSetting('post_button_mode', chosen);
        await addAuditLog('CONFIG', userIdStr, `Modo de botones en posts del canal → ${labels[chosen]}`);
      }
    }
    const current = String(getSystemSetting('post_button_mode') || 'ambos');
    const keyboard = modes.map(m => [{ text: `${current === m ? '✅ ' : ''}${labels[m]}`, callback_data: `admin_postmode_${m}` }]);
    keyboard.push([{ text: '🔙 Volver al Menú', callback_data: 'admin_btn_help' }]);
    await sendMessage(chatId,
      '🎛 *MODO DE BOTONES EN POSTS DEL CANAL*\\n\\n' +
      'Define qué botones se generan al publicar contenido:\\n' +
      '• *Solo Mini App:* botón "Ver lo Exclusivo" (comportamiento clásico).\\n' +
      '• *Solo Nativa:* deep link que abre el bot en privado con los Métodos de Pago (nav_pay), sin escribir en BD.\\n' +
      '• *Ambos:* Mini App + botonera nativa en cada post.\\n\\n' +
      `_Afecta a nuevas publicaciones y ediciones._`,
      { reply_markup: { inline_keyboard: keyboard } });
    return;
  }

  if (data === 'admin_btn_pin') {
    const { username, brandName } = getBotConfig();
    let cleanUsername = username || process.env.BOT_USERNAME || 'Danii_Catalogo_SCZ_bot';
    if (!cleanUsername || /ruti|flavia|iam_danii_vip_bot/i.test(cleanUsername)) {
      cleanUsername = 'Danii_Catalogo_SCZ_bot';
    }
    cleanUsername = cleanUsername.replace(/^@/, '').trim();
    const inviteLink = `https://t.me/${cleanUsername}?start=inv_vip`;
    const msg = `💎 *${brandName || 'IAM DANII'} VIP — CONTENIDO EXCLUSIVO (+18)* 💎\n\n` +
      `Canal oficial de acceso a galería confidencial, packs VIP y atención directa sin intermediarios.\n\n` +
      `📲 *ENLACE DE INVITACIÓN DIRECTA AL BOT:*\n` +
      `👉 \`${inviteLink}\`\n\n` +
      `_Trato directo, discreto y 100% confidencial (+18). Pulsa el botón "Ver Canal VIP Free" en el menú inferior para abrir la galería._`;

    const res = await sendMessage(chatId, msg);
    if (res && res.result && res.result.message_id) {
      await pinChatMessage(chatId, res.result.message_id);
    }
    await updateBotMenuButton();
    await sendMessage(chatId, `✅ *Mensaje anclado en Telegram y botón "Ver Canal VIP Free" sincronizado.*`);
    return;
  }

  if (data.startsWith('request_qr_')) {
    await sendPrivateQrForRequest(data.replace('request_qr_', ''), chatId);
    return;
  }

  if (data.startsWith('request_done_')) {
    const requestId = data.replace('request_done_', '');
    const request = await getCustomerRequestById(requestId);
    if (!request) {
      await sendMessage(chatId, '❌ La solicitud ya no existe.');
      return;
    }
    await updateCustomerRequestStatus(requestId, 'completado');
    await addAuditLog('COMPLETE_PRIVATE_REQUEST', userIdStr, `Solicitud ${requestId} atendida privadamente`, requestId);
    await sendMessage(chatId, '✅ Solicitud marcada como *ATENDIDA*. El bot ya no enviará una respuesta automática.');
    return;
  }

  if (data === 'cancel_wizard') {
    await clearConversationState(userIdStr);
    await sendMessage(chatId, '❌ Proceso cancelado.');
    return;
  }

  if (data === 'add_more_photos') {
    const state = await getConversationState(userIdStr);
    if (state) {
      state.step = 'NEW_PHOTOS';
      await setConversationState(userIdStr, 'NEW_PHOTOS', state.draft_data);
      await sendMessage(chatId, '📷 Envía otra foto o escribe su URL:');
    }
    return;
  }

  if (data === 'confirm_draft' || data === 'confirm_publish') {
    const state = await getConversationState(userIdStr);
    if (!state || !state.draft_data.name) {
      await sendMessage(chatId, '⚠️ Datos incompletos para guardar el perfil.');
      return;
    }

    const newId = `prof_${Date.now()}`;
    const initialStatus: ProfileStatus = data === 'confirm_publish' ? 'disponible' : 'borrador';

    const newProfile = await saveProfile({
      id: newId,
      name: state.draft_data.name,
      age: state.draft_data.age || 18,
      zone: state.draft_data.zone || 'Contenido +18 VIP',
      description: state.draft_data.description || '',
      rate_bs: state.draft_data.rate_bs || 0,
      commission_bs: 0,
      photos: state.draft_data.photos || [],
      status: initialStatus
    });

    await clearConversationState(userIdStr);
    await addAuditLog('CREATE_PROFILE', userIdStr, `Creado perfil ${newProfile.name} (ID: ${newId}) con estado ${initialStatus}`, newId);

    if (data === 'confirm_publish') {
      const syncResult = await syncProfileToChannel(newId, `Admin (${userIdStr})`);
      await sendMessage(chatId, `🎉 *¡Perfil Creado y Publicado Exitosamente!*\n\nPerfil: *${newProfile.name}*\nID: \`${newId}\`\n\n${syncResult.message}`);
    } else {
      await sendMessage(chatId, `📁 *Perfil Guardado como Borrador*\n\nPerfil: *${newProfile.name}*\nID: \`${newId}\`\n\nPuedes publicarlo cuando gustes escribiendo: \`/publicar ${newId}\``);
    }
    return;
  }

  if (data.startsWith('edit_field_')) {
    const parts = data.replace('edit_field_', '').split('_');
    const field = parts[0];
    const profileId = parts.slice(1).join('_');

    await setConversationState(userIdStr, 'EDIT_FIELD_VALUE', { editing_field: field } as any, profileId);
    await sendMessage(chatId, `✏️ Escribe el nuevo valor para *${field}*:`);
    return;
  }

  if (data.startsWith('set_status_')) {
    const parts = data.replace('set_status_', '').split('_');
    const newStatus = parts[0] as ProfileStatus;
    const profileId = parts.slice(1).join('_');

    const updated = await saveProfile({ id: profileId, status: newStatus });
    await addAuditLog('UPDATE_STATUS', userIdStr, `Estado cambiado a ${newStatus} para ${updated.name}`, profileId);

    // Auto sync
    const syncRes = await syncProfileToChannel(profileId, `Admin Telegram (${userIdStr})`);
    await sendMessage(chatId, `📌 *Estado actualizado*: Perfil *${updated.name}* ahora está en estado *${newStatus.toUpperCase()}*.\n\nSincronización: ${syncRes.message}`);
    return;
  }
}

// Handlers for Command Specific Functions
async function sendAdminWelcome(chatId: string | number, name: string) {
  const { baseUrl, brandName } = getBotConfig();
  const adminToken = generateAdminMagicToken(String(chatId));
  const adminLink = buildAdminWebLink(baseUrl, adminToken);

  const btnNuevo = await getBotCommandText('nuevo', '➕ Nuevo Perfil', '➕');
  const btnListar = await getBotCommandText('listar', '📋 Listar Perfiles', '📋');
  const btnAyuda = await getBotCommandText('ayuda', '📖 Manual / Ayuda Admin', '📖');

  const msg = `👑 *¡Bienvenida, Administradora ${name}!* 👑\n\n` +
    `Sistema de Gestión — *${brandName || 'IAM DANII VIP'} (+18)*.\n\n` +
    `📸 *Carga Directa de Contenido:*\n` +
    `Como Administradora, puedes enviar o reenviar fotografías y videos directamente a este chat y se agregarán de inmediato a la galería de tu Canal VIP Free.\n\n` +
    `👇 *Botones:*`;

  await sendMessage(chatId, msg, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🌐 Abrir Panel Admin', web_app: { url: adminLink } }
        ],
        [
          { text: 'Ver lo Exclusivo 🔥🔥🔥', web_app: { url: baseUrl } }
        ],
        [
          { text: btnNuevo, callback_data: 'admin_btn_new' },
          { text: btnListar, callback_data: 'admin_btn_list' }
        ],
        [
          { text: '📌 Fijar Anuncio en Canal', callback_data: 'admin_btn_pin' },
          { text: btnAyuda, callback_data: 'admin_btn_help' }
        ]
      ]
    }
  });

  // Activate the persistent keyboard menu so the admin always has buttons on their phone
  const replyKbd = await getAdminReplyKeyboard(adminLink, baseUrl);
  await sendMessage(chatId, '👇 *Menú de Teclado Activado:* Puedes pulsar los botones inferiores en cualquier momento sin comandos.', {
    reply_markup: replyKbd
  });
}

async function sendAdminHelp(chatId: string | number) {
  const { baseUrl, brandName } = getBotConfig();
  const adminToken = generateAdminMagicToken(String(chatId));
  const adminLink = buildAdminWebLink(baseUrl, adminToken);

  const btnNuevo = await getBotCommandText('nuevo', '➕ Nuevo Perfil', '➕');
  const btnListar = await getBotCommandText('listar', '📋 Listar Perfiles', '📋');

  const msg = `📖 *Manual de Administración — ${brandName || 'IAM DANII VIP'}* 📖\n\n` +
    `1️⃣ *Para gestionar perfiles*: Pulsa los botones abajo o usa \`/nuevo\` y \`/listar\`.\n` +
    `2️⃣ *Para publicar*: Escribe \`/publicar <ID>\`.\n` +
    `3️⃣ *Para cambiar estado*: Escribe \`/estado <ID>\`.\n` +
    `4️⃣ *Para acceder a la web*: Pulsa "Abrir Panel Web".\n\n` +
    `⚠️ *Reglas Obligatorias de Seguridad:*\n` +
    `• Todos los perfiles deben ser mayores de 18 años.\n` +
    `• Toda validación y entrega de accesos VIP es 1-a-1 por chat privado.`;

  await sendMessage(chatId, msg, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🔐 Abrir Panel Web', web_app: { url: adminLink } }
        ],
        [
          { text: btnNuevo, callback_data: 'admin_btn_new' },
          { text: btnListar, callback_data: 'admin_btn_list' }
        ]
      ]
    }
  });
}

async function handleListProfiles(chatId: string | number) {
  const profiles = await getAllProfiles();
  if (profiles.length === 0) {
    await sendMessage(chatId, '📭 No hay perfiles registrados en el Canal VIP Free. Usa /nuevo para crear uno.');
    return;
  }

  let text = '📋 *LISTADO DE PERFILES DEL CANAL VIP FREE*:\n\n';
  profiles.forEach(p => {
    const badge = p.status === 'disponible' ? '🟢 Disponible' : p.status === 'ocupada' ? '🔴 Ocupada' : p.status === 'pausada' ? '⏸️ Pausada' : p.status === 'retirada' ? '🗑️ Retirada' : '📁 Borrador';
    text += `• *${p.name}* - ${badge}\n  ID: \`${p.id}\` | Zona: ${p.zone} | Tarifa: Bs. ${p.rate_bs}\n\n`;
  });

  text += '_Usa /ver ID o /editar ID para administrar cada uno._';
  await sendMessage(chatId, text);
}

async function handleShowProfileDetail(chatId: string | number, id: string) {
  const profile = await getProfileById(id);
  if (!profile) {
    await sendMessage(chatId, `❌ Perfil con ID \`${id}\` no encontrado.`);
    return;
  }

  const detail = `
👤 *FICHA DEL PERFIL*: ${profile.name}

🆔 *ID*: \`${profile.id}\`
📍 *Zona*: ${profile.zone}
💰 *Precio VIP*: Bs. ${profile.rate_bs}
📌 *Estado*: ${profile.status.toUpperCase()}
📷 *Fotos*: ${profile.photos.length} adjunta(s)
📲 *Telegram Msg ID*: ${profile.telegram_message_id ? `#${profile.telegram_message_id}` : 'No publicado'}
📅 *Última Actualización*: ${new Date(profile.updated_at).toLocaleString()}

📝 *Descripción*:
${profile.description}
  `;

  await sendMessage(chatId, detail, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📢 Publicar / Sincronizar', callback_data: `confirm_publish_${profile.id}` },
          { text: '✏️ Editar', callback_data: `edit_field_select_${profile.id}` }
        ],
        [
          { text: '🟢 Disponible', callback_data: `set_status_disponible_${profile.id}` },
          { text: '🔴 Ocupada', callback_data: `set_status_ocupada_${profile.id}` },
          { text: '⏸️ Pausar', callback_data: `set_status_pausada_${profile.id}` }
        ]
      ]
    }
  });
}

async function handleStartEditProfile(chatId: string | number, _userId: string, id: string) {
  const profile = await getProfileById(id);
  if (!profile) {
    await sendMessage(chatId, `❌ Perfil con ID \`${id}\` no encontrado.`);
    return;
  }

  await sendMessage(chatId, `✏️ *Selecciona el campo que deseas editar para ${profile.name}*:`, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Nombre', callback_data: `edit_field_name_${id}` },
          { text: 'Zona', callback_data: `edit_field_zone_${id}` }
        ],
        [
          { text: 'Precio VIP (Bs.)', callback_data: `edit_field_rate_bs_${id}` }
        ],
        [
          { text: 'Descripción', callback_data: `edit_field_description_${id}` }
        ]
      ]
    }
  });
}

async function handleManagePhotosCommand(chatId: string | number, userId: string, id: string) {
  const profile = await getProfileById(id);
  if (!profile) {
    await sendMessage(chatId, `❌ Perfil \`${id}\` no encontrado.`);
    return;
  }
  await setConversationState(userId, 'NEW_PHOTOS', { photos: profile.photos }, id);
  await sendMessage(chatId, `📷 *Gestión de Fotografías para ${profile.name}*\n\nActualmente tiene ${profile.photos.length} fotos.\n\nEnvía una nueva foto a este chat o la URL para agregarla.`);
}

async function handlePromptStatusChange(chatId: string | number, id: string) {
  const profile = await getProfileById(id);
  if (!profile) {
    await sendMessage(chatId, `❌ Perfil \`${id}\` no encontrado.`);
    return;
  }

  await sendMessage(chatId, `📌 *Cambiar Estado para ${profile.name}* (Actual: ${profile.status}):`, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🟢 Disponible', callback_data: `set_status_disponible_${id}` },
          { text: '🔴 Ocupada', callback_data: `set_status_ocupada_${id}` }
        ],
        [
          { text: '⏸️ Pausada', callback_data: `set_status_pausada_${id}` },
          { text: '🗑️ Retirada', callback_data: `set_status_retirada_${id}` }
        ]
      ]
    }
  });
}

async function handlePublishCommand(chatId: string | number, id: string) {
  const profile = await getProfileById(id);
  if (!profile) {
    await sendMessage(chatId, `❌ Perfil \`${id}\` no encontrado.`);
    return;
  }
  await saveProfile({ id, status: 'disponible' });
  const result = await syncProfileToChannel(id, 'Admin Telegram');
  await sendMessage(chatId, `📢 *Publicación en Canal y Web para ${profile.name}*:\n\n${result.message}`);
}

async function handlePauseCommand(chatId: string | number, id: string) {
  const profile = await getProfileById(id);
  if (!profile) {
    await sendMessage(chatId, `❌ Perfil \`${id}\` no encontrado.`);
    return;
  }
  await saveProfile({ id, status: 'pausada' });
  const result = await syncProfileToChannel(id, 'Admin Telegram');
  await sendMessage(chatId, `⏸️ *Perfil ${profile.name} Pausado*.\nOculto del Canal VIP Free público.\n\nSincronización: ${result.message}`);
}

async function handleRetireCommand(chatId: string | number, id: string) {
  const profile = await getProfileById(id);
  if (!profile) {
    await sendMessage(chatId, `❌ Perfil \`${id}\` no encontrado.`);
    return;
  }
  await saveProfile({ id, status: 'retirada' });
  const result = await syncProfileToChannel(id, 'Admin Telegram');
  await sendMessage(chatId, `🗑️ *Perfil ${profile.name} Retirado* del Canal VIP Free y canal.\n\n${result.message}`);
}

async function handleConfirmDeleteCommand(chatId: string | number, id: string) {
  const profile = await getProfileById(id);
  if (!profile) {
    await sendMessage(chatId, `❌ Perfil \`${id}\` no encontrado.`);
    return;
  }
  await saveProfile({ id, status: 'retirada' });
  await syncProfileToChannel(id, 'Admin Telegram');
  await deleteProfile(id);
  await addAuditLog('DELETE_PROFILE', 'Admin Telegram', `Perfil ${profile.name} (${id}) eliminado`, id);
  await sendMessage(chatId, `🚨 *Perfil ${profile.name} eliminado permanentemente*.`);
}

// Customer Availability Request Notification
async function handleClientAvailabilityRequest(message: any, profileId: string) {
  const chatId = message.chat.id;
  const clientUser = message.from;

  // Filtro anti-spam estricto antes de procesar o notificar a la administradora
  const spamCheck = isSpamMessage(clientUser, message?.text);
  if (spamCheck.isSpam) {
    console.warn(`[ANTI-SPAM SHIELD] Solicitud de disponibilidad falsa descartada de ${clientUser?.id}: ${spamCheck.reason}`);
    return;
  }

  const profile = await getProfileById(profileId);

  if (!profile || profile.status === 'retirada' || profile.status === 'borrador') {
    await sendMessage(chatId, '⚠️ El perfil solicitado ya no se encuentra disponible.');
    return;
  }

  // Register request in database
  await createCustomerRequest({
    profile_id: profile.id,
    profile_name: profile.name,
    telegram_user_id: String(clientUser.id),
    telegram_username: clientUser.username || undefined,
    telegram_first_name: clientUser.first_name || 'Cliente',
    status: 'pendiente'
  });

  // Reply to Client
  const { brandName } = getBotConfig();
  const clientReply = `
✨ *SOLICITUD DE DISPONIBILIDAD REGISTRADA* ✨

Perfil consultado: *${profile.name}*
Precio VIP: *Bs. ${profile.rate_bs}*

📌 Tu solicitud ha sido notificada directamente a la Administradora oficial de *${brandName || 'IAM DANII VIP'}*. Te responderemos por este mismo medio a la brevedad.

⚠️ *ADVERTENCIA DE SEGURIDAD*:
No realice ningún tipo de pago o transferencia sin antes recibir confirmación oficial y directa por parte de la Administradora.
  `;

  await sendMessage(chatId, clientReply);

  // Notify Administrator
  const { adminIds } = getBotConfig();
  const clientHandle = clientUser.username ? `@${clientUser.username}` : clientUser.first_name || `ID: ${clientUser.id}`;

  const adminNotice = `
🔔 *NUEVA SOLICITUD DE DISPONIBILIDAD* 🔔

👤 *Cliente*: ${clientUser.first_name} (${clientHandle})
🆔 *Telegram ID*: \`${clientUser.id}\`
👠 *Perfil Solicitado*: ${profile.name} (ID: \`${profile.id}\`)
📍 *Zona*: ${profile.zone}
💰 *Tarifa*: Bs. ${profile.rate_bs}
📅 *Fecha*: ${new Date().toLocaleString()}

_Favor responder directamente al cliente por mensaje privado._
  `;

  for (const adminId of adminIds) {
    if (adminId) {
      await sendMessage(adminId, adminNotice, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: `💬 Responder a ${clientUser.first_name}`, url: clientUser.username ? `https://t.me/${clientUser.username}` : `tg://user?id=${clientUser.id}` }
            ]
          ]
        }
      });
    }
  }
}

export async function sendPaidMediaToChannel(params: {
  mediaUrl: string;
  starCount: number;
  caption?: string;
  channelId?: string;
  profileId?: string;
}): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const { channelId, username, baseUrl } = getBotConfig();
  const targetChannel = params.channelId || channelId;
  if (!targetChannel) {
    return { ok: false, error: 'No se ha configurado un ID o @canal en el sistema.' };
  }

  const starCount = Math.max(1, Math.min(2500, Math.round(Number(params.starCount) || 1)));
  const isVideo = /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(params.mediaUrl) || params.mediaUrl.includes('/video');
  const tgMatch = params.mediaUrl.match(/\/telegram-media\/([a-zA-Z0-9_-]+)/);
  const mediaTarget = tgMatch ? tgMatch[1] : params.mediaUrl;

  const mediaItem: any = {
    type: isVideo ? 'video' : 'photo',
    media: mediaTarget
  };

  const payload: any = {
    chat_id: targetChannel,
    star_count: starCount,
    media: [mediaItem]
  };

  let finalCaption = '';
  if (params.caption && params.caption.trim()) {
    finalCaption += params.caption.trim() + '\n\n';
  }
  finalCaption += `(⭐ ${starCount})`;
  
  payload.caption = finalCaption;
  payload.parse_mode = 'Markdown';

  // Telegram rejects inline keyboards on sendPaidMedia (BUTTON_TYPE_INVALID).
  // The price is already included in the paid media request.

  const res = await callTelegramApi('sendPaidMedia', payload);
  if (res && res.ok && res.result) {
    const messageId = res.result.message_id;
    return { ok: true, messageId };
  }

  let errorMsg = res?.description || 'Error al enviar contenido de pago a Telegram';
  if (errorMsg.toLowerCase().includes('chat not found')) {
    errorMsg = `Canal (${targetChannel}) no encontrado por Telegram. Verifica que @${username} sea Administrador en el canal con permiso para publicar mensajes.`;
  } else if (errorMsg.toLowerCase().includes('not enough rights')) {
    errorMsg = `El bot no tiene permisos suficientes para publicar contenido de pago en el canal. Asegúrate de que el bot sea Administrador con permiso para "Publicar mensajes".`;
  }

  return {
    ok: false,
    error: errorMsg
  };
}

export async function createStarsInvoiceLink(title: string, description: string, payload: string, stars: number): Promise<string | null> {
  const res = await callTelegramApi('createInvoiceLink', {
    title: title.slice(0, 32),
    description: description.slice(0, 255) || 'Contenido Exclusivo VIP',
    payload,
    currency: 'XTR',
    prices: [{ label: title.slice(0, 32), amount: Math.max(1, Math.round(stars)) }]
  });
  if (res && res.ok && res.result) {
    return res.result;
  }
  return null;
}

