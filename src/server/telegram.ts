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
  getPaymentMethodById
} from './db.js';
import { Profile, ProfileStatus, PaymentMethod } from '../types.js';
import { uploadBufferToB2, isB2Configured, mediaUrl } from './b2Storage.js';

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
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || require('crypto').createHash('sha256').update(token).digest('hex').substring(0, 32);
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
  const signingSecret = process.env.ADMIN_SIGNING_SECRET || require('crypto').createHash('sha256').update(token + 'jwt').digest('hex').substring(0, 32);
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
  let username = rawValue
    .replace(/(?:https?:\/\/)?(?:www\.)?t\.me\//gi, '')
    .replace(/^@+/, '')
    .replace(/[^A-Za-z0-9_]/g, '')
    .trim();
  if (!username || username.length < 5) return 'Danii_Catalogo_SCZ_bot';
  return username;
}

async function editOrSend(chatId: string | number, messageId: number | string | undefined | null, text: string, options: any = {}) {
  const mid = Number(messageId);
  if (Number.isFinite(mid) && mid > 0) {
    try {
      const edited = await callTelegramApi('editMessageText', {
        chat_id: chatId,
        message_id: mid,
        text,
        parse_mode: 'Markdown',
        ...options
      });
      if (edited?.ok) return edited;
    } catch {}
  }
  return await sendMessage(chatId, text, options);
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
  return /^(client_|vip_|pay_method_)/.test(data);
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
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

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
        { text: 'Ver lo Exclusivo 🔥', web_app: { url: baseUrl } }
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

export async function syncProfileToChannel(profileId: string, performer: string = 'Bot Admin'): Promise<{ success: boolean; message: string; telegramMessageId?: number }> {
  const { channelId, username, baseUrl } = getBotConfig();
  const profile = await getProfileById(profileId);

  if (!profile) {
    return { success: false, message: 'Perfil no encontrado en la base de datos' };
  }

  const operatingMode = getSystemSetting('operating_mode') || 'solo_bot';
  if (operatingMode === 'solo_bot') {
    await addAuditLog('SYNC_PROFILE', performer, `Perfil ${profile.name} publicado en Mini App (Modo Solo Bot)`, profileId);
    return { success: true, message: 'Publicado exitosamente en el Canal VIP Free (Modo Solo Bot: guardado sin publicar en canal público).' };
  }

  if (profile.age && profile.age < 18) {
    const errMsg = 'REGLA PROHIBITIVA: No se permite publicar perfiles menores de 18 años.';
    await addSyncError(profileId, 'PUBLISH_CHANNEL', errMsg);
    return { success: false, message: errMsg };
  }

  if (profile.status === 'retirada' || profile.status === 'borrador') {
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

  const freePhotos = (profile.photos || []).filter(u => !(profile.media_stars?.[u] && profile.media_stars[u] > 0));
  const primaryPhoto = freePhotos.length > 0 ? freePhotos[0] : null;
  const activeDesc = (primaryPhoto && profile.media_descriptions?.[primaryPhoto]) || profile.description || '';
  const descText = activeDesc.trim() ? `${activeDesc.trim()}\n\n` : '';
  const caption = `${descText}✨ *¿Quieres ver más?* Toca el botón abajo para abrir la galería completa 👇`;

  const replyMarkup = await buildChannelPostMarkup(profile, baseUrl, username);

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
      const warnMsg = `No se pudo editar el mensaje previo (${profile.telegram_message_id}): ${editRes.description}. Se publicará una nueva entrada en el canal.`;
      await addSyncError(profileId, 'EDIT_CAPTION_FALLBACK', warnMsg);
      console.warn(`[Sync Channel Fallback] ${warnMsg}`);
    }
  }

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

export async function buildChannelPostMarkup(profile: Profile, _baseUrl: string, username: string) {
  const { appShortName } = getBotConfig();
  const botAppUrl = `https://t.me/${username}/${appShortName || 'canalVipFreeIamDanii'}?startapp=ver_${profile.id}`;

  let customButtonRows: any[] = [];
  try {
    const customButtons = await getPublicCustomButtons('channel');
    customButtonRows = customButtons
      .map(btn => {
        let url = String(btn.url || '').trim();
        if (!url && (btn.type === 'subscription' || btn.type === 'telegram')) {
          url = `https://t.me/${username}?start=vipc_${btn.id}`;
        } else if (url && !/^https?:\/\//i.test(url) && /^t\.me\//i.test(url)) {
          url = `https://${url}`;
        }
        if (!/^https?:\/\//i.test(url)) return null;
        return [{ text: btn.label, url }];
      })
      .filter((row): row is any[] => row !== null);
  } catch (err) {
    console.warn('[Telegram] Could not load custom buttons for channel:', err);
  }

    const keyboard = [
    [
      { text: 'Ver lo Exclusivo 🔥', url: botAppUrl }
    ],
    [
      { text: '💳 Métodos de Pago', url: `https://t.me/${username}?start=pagos` }
    ]
  ];

  return {
    inline_keyboard: [
      ...keyboard,
      ...customButtonRows
    ]
  };
}

export async function sendPhotoToUser(chatId: string | number, photoUrl: string, caption?: string) {
  return await callTelegramApi('sendPhoto', {
    chat_id: chatId,
    photo: photoUrl,
    caption: caption || '',
    parse_mode: 'Markdown'
  });
}

export function generateAdminMagicToken(telegramUserId: string | number): string {
  const { signingSecret } = getBotConfig();
  return jwt.sign(
    { sub: String(telegramUserId), role: 'admin', isPinAuth: true, iat: Math.floor(Date.now() / 1000) },
    signingSecret,
    { expiresIn: '24h' }
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
      expiresAt: Date.now() + 6 * 3600 * 1000
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
  if (caption) {
      formData.append('caption', caption);
      formData.append('parse_mode', 'Markdown');
    }
    
    // has_spoiler removido: el filtro de desenfoque era solo cosmético

  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
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

const SPAM_KEYWORDS_REGEX = /(sms[-_ ]?boom|sms[-_ ]?bomber|bomber|бомбер|спам|смс[-_ ]?атак|sms[-_ ]?spam|spambot|crypto[-_ ]?pump|airdrop|binance[-_ ]?giveaway|1xbet|betwinner|fast[-_ ]?money|invest[-_ ]?now|whatsapp\.com\/channel|t\.me\/\+|t\.me\/joinchat)/i;

const NON_SPANISH_SCRIPTS_REGEX = /[\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0900-\u097F]/;

export function isSpamMessage(fromUser?: any, text?: string): { isSpam: boolean; reason?: string } {
  if (!fromUser) return { isSpam: false };
  const userId = String(fromUser.id || '');

  if (isAdminUser(userId)) return { isSpam: false };

  if (blockedSpamUserIds.has(userId)) {
    return { isSpam: true, reason: 'Usuario bloqueado previamente en lista negra' };
  }

  if (fromUser.is_bot) {
    blockedSpamUserIds.add(userId);
    return { isSpam: true, reason: 'Bot automatizado (is_bot: true)' };
  }

  const userText = `${fromUser.first_name || ''} ${fromUser.last_name || ''} ${fromUser.username || ''}`.trim();
  const fullContent = `${userText} ${text || ''}`;

  if (SPAM_KEYWORDS_REGEX.test(fullContent)) {
    blockedSpamUserIds.add(userId);
    return { isSpam: true, reason: `Palabras de spam detectadas ("${fullContent.slice(0, 60)}")` };
  }

  if (NON_SPANISH_SCRIPTS_REGEX.test(fullContent)) {
    blockedSpamUserIds.add(userId);
    return { isSpam: true, reason: `Alfabeto no hispano detectado (Cirílico/Ruso/Extranjero): "${fullContent.slice(0, 60)}"` };
  }

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

  if (text && /(https?:\/\/|t\.me\/|wa\.me\/)/i.test(text) && !text.startsWith('/start')) {
    blockedSpamUserIds.add(userId);
    return { isSpam: true, reason: 'Enlaces sospechosos no permitidos' };
  }

  return { isSpam: false };
}

// ==========================================
// [NUEVO] HELPERS PARA FLUJO 6 MESES / PERMANENTE
// ==========================================

/**
 * Detecta el tipo de plan a partir de campos de la botonera (plan_type, id, name).
 * Robusto ante botoneras fallback que no tienen plan_type explícito.
 */
function detectPlanType(plan: any): 'monthly' | 'semester' | 'permanent' | 'unknown' {
  if (!plan) return 'unknown';
  const raw = `${plan.plan_type || ''} ${plan.id || ''} ${plan.name || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (/perman|vital|\blife\b/.test(raw)) return 'permanent';
  if (/semest|\bsix\b|6\s*mes|\b6m\b/.test(raw)) return 'semester';
  if (/mensual|monthly|\b1\s*mes|\b1m\b/.test(raw)) return 'monthly';
  return 'unknown';
}

/**
 * Procesa un lead VIP (6 Meses / Permanente): crea la solicitud en BD,
 * notifica a la administradora con formato destacado y confirma al cliente.
 *
 * Usa el mismo formato de `notes` que la Mini App (`RequestModal.tsx`) para que
 * el backend (`routes.ts`) procese ambos flujos de forma idéntica.
 */
async function processVipLead(params: {
  chatId: string;
  user: { id: number | string; username?: string; first_name?: string };
  country: string;
  planType: string;
  planLabel: string;
  planEmoji: string;
  sourceMessageId?: number | string | null;
}) {
  const { chatId, user, country, planLabel, planEmoji, sourceMessageId } = params;
  const userId = String(user.id);

  // Mismo formato que RequestModal: reutiliza isSpecialPlanRequest/extractCountryFromRequestText
  const notes = `Hola, estoy interesado en la ${planLabel}. Soy de ${country}. Solicito Información VIP por favor.`;

  // 1. Crear lead en BD
  let leadCreated = false;
  try {
    const profiles = await getAllProfiles().catch(() => [] as any[]);
    const fallbackProfile = profiles[0];
    const fallbackProfileId = fallbackProfile?.id || 'vip_lead_info';

    const created = await createCustomerRequest({
      profile_id: fallbackProfileId,
      profile_name: `${planLabel} — ${country}`,
      telegram_user_id: userId,
      telegram_username: user.username,
      telegram_first_name: user.first_name || 'Cliente',
      notes,
      status: 'pendiente'
    });

    leadCreated = Boolean(created?.id);

    if (leadCreated) {
      console.log(`[VIP Lead] ✅ Lead creado: ${created.id} | Plan: ${planLabel} | País: ${country} | User: ${userId}`);
    } else {
      console.error(`[VIP Lead] ❌ createCustomerRequest no devolvió un ID válido para User ${userId}`);
    }
  } catch (err: any) {
    console.error('[VIP Lead] ❌ Error crítico al crear customer request:', err?.message || err);
    console.error('[VIP Lead] Stack:', err?.stack);
    // Intentar notificar al admin del fallo (aunque no haya lead en BD)
    try {
      const { adminIds } = getBotConfig();
      for (const adminId of adminIds) {
        if (adminId) {
          await sendMessage(adminId,
            `⚠️ *FALLO AL CREAR LEAD*\n\n` +
            `👤 Cliente: ${user.first_name || 'Cliente'} (${userId})\n` +
            `📦 Plan: ${planLabel}\n` +
            `🌍 País: ${country}\n\n` +
            `⚠️ Error: ${err?.message || 'desconocido'}\n\n` +
            `_Coordina manualmente por privado con este cliente._`
          ).catch(() => {});
        }
      }
    } catch {
      // no hacer nada si falla el aviso de fallo
    }
  }

  // 2. Notificar a todas las administradoras
  const { adminIds } = getBotConfig();
  const who = `${user.first_name || ''}${user.username ? ' (@' + user.username + ')' : ''}`.trim() || 'Cliente';
  const clientUrl = user.username
    ? `https://t.me/${user.username}`
    : `tg://user?id=${userId}`;

  const adminNotice =
    `🔔 *NUEVO LEAD — ${planLabel}* ${planEmoji}\n\n` +
    `👤 *Cliente*: ${who}\n` +
    `🆔 *Telegram ID*: \`${userId}\`\n` +
    `🌍 *País*: *${country}*\n` +
    `📦 *Plan*: ${planLabel}\n` +
    `📅 *Fecha*: ${new Date().toLocaleString()}\n\n` +
    `_Responde directamente en privado con el precio y las coordenadas de pago._`;

  for (const adminId of adminIds) {
    if (adminId) {
      await sendMessage(adminId, adminNotice, {
        reply_markup: {
          inline_keyboard: [[
            { text: `💬 Responder a ${user.first_name || 'cliente'}`, url: clientUrl }
          ]]
        }
      }).catch(() => {});
    }
  }

  // 3. Limpiar estado de conversación
  await clearConversationState(userId).catch(() => {});

  // 4. Confirmar al cliente editando el mensaje del bot si es posible
  const confirmationText =
    `✅ *Anotado: ${country}*\n\n` +
    `La *Administradora* recibió tu solicitud de *${planLabel}* y te contactará por este mismo chat con el precio y las coordenadas de pago. ${planEmoji}`;

  return await editOrSend(chatId, sourceMessageId, confirmationText, { parse_mode: 'Markdown' });
}

/**
 * Pide al usuario que escriba el nombre de su país para un plan 6M/Permanente.
 * Setea el estado VIP_LEAD_COUNTRY con el contexto del plan elegido.
 */
async function askPlanCountry(
  chatId: string | number,
  botoneraId: string,
  countryId: string,
  planId: string,
  sourceMessageId?: number | string | null
) {
  const items = await getAllTelegramBotoneras();
  const botonera = items.find(i => i.id === botoneraId);
  const plan = botonera?.plans?.find((p: any) => String(p.id) === String(planId));
  const planType = detectPlanType(plan);

  const meta = planType === 'semester'
    ? { emoji: '💎', label: 'SUSCRIPCIÓN SEMESTRAL (6 MESES)' }
    : planType === 'permanent'
      ? { emoji: '💙', label: 'SUSCRIPCIÓN PERMANENTE' }
      : { emoji: '💠', label: (plan?.name || 'SUSCRIPCIÓN VIP').toString().toUpperCase() };

  await setConversationState(String(chatId), 'VIP_LEAD_COUNTRY', {
    botonera_id: botoneraId,
    country_id: countryId,
    plan_id: planId,
    plan_type: planType,
    plan_label: meta.label,
    plan_emoji: meta.emoji
  } as any);

  const text =
    `${meta.emoji} *${meta.label}* ${meta.emoji}\n\n` +
    `Para darte el *precio exacto y las coordenadas de pago*, la Administradora necesita saber tu país.\n\n` +
    `✍️ *Escribe el nombre de tu país* (ej: Japón, Italia, Portugal...):`;

  return await editOrSend(chatId, sourceMessageId, text, { parse_mode: 'Markdown' });
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

  // 0.2. Handle channel posts
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

  // 🛡️ ESCUDO ANTI-SPAM
  const spamCheck = isSpamMessage(message.from, text);
  if (spamCheck.isSpam) {
    console.warn(`[ANTI-SPAM SHIELD] Mensaje bloqueado de ${fromId} (${message.from?.username || message.from?.first_name}): ${spamCheck.reason}`);
    return;
  }

  if (message.chat.type === 'group' || message.chat.type === 'supergroup') {
    const { channelId } = getBotConfig();
    if (String(message.chat.id) !== String(channelId)) {
      console.warn(`[ANTI-SPAM SHIELD] Mensaje en grupo no autorizado ignorado: ${message.chat.id} (${message.chat.title || 'Grupo'})`);
      return;
    }
  }

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

  // 1.1. Deep Link Client Profile View
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
              { text: 'Ver lo Exclusivo 🔥', web_app: { url: profileUrl } }
            ]
          ]
        }
      });
      return;
    }
    await sendClientWelcome(chatId, message.from?.first_name || 'Invitado/a');
    return;
  }

  // [Flujo VIP] Deep links de suscripción
  if (text.startsWith('/start nav_') || text.startsWith('/start vipc_') || /^\/start vipauto/i.test(text)) {
    if (!isPrivateChat(message.chat)) {
      await sendMessage(chatId, '🔒 Abre el chat privado para ver los planes VIP.');
      return;
    }
    if (fromId) {
      await registerSubscriber(String(fromId), message.from?.username, message.from?.first_name).catch(() => {});
    }
        // 👇 NUEVO: Verificar el modo de botonera
    const botoneraMode = getSystemSetting('telegram_botonera_mode') || 'legacy';
    if (botoneraMode === 'direct') {
      await sendDirectMenu(chatId, message.from?.first_name || 'Cliente');
      return;
    }
    // 👆 Fin de la verificación

    const rawParam = text.replace(/^\/start\s+/, '').trim();
    const payload = rawParam.startsWith('vipc_') ? rawParam.slice('vipc_'.length) : (rawParam.startsWith('nav_') ? rawParam.slice('nav_'.length) : rawParam.replace(/^vipauto/i, ''));
    {
      const veTail = payload.includes('_') ? payload.split('_').pop()!.toLowerCase() : payload.toLowerCase();
      if (veTail === 've' || veTail === 'venezuela') {
        const veBotonera = await getActiveTelegramBotoneraFlow();
        if (veBotonera) await askOtherCountry(chatId, veBotonera.id);
        else await sendMessage(chatId, '🌍 Escribe el nombre de tu país para coordinar tu suscripción con la Administradora 💎');
        return;
      }
    }
    // [NUEVO] Si el cliente pidió "vipauto" PURO (sin país codificado),
    // mostramos directo el menú con los 3 planes (Mes / 6 Meses / Permanente).
    // El país se pedirá después según el plan elegido.
    const isPureVipAuto = /^\/start\s+vipauto\s*$/i.test(text);
    if (isPureVipAuto) {
      await sendAutoSubscriptionMenu(chatId);
      return;
    }

    const knownCountries = ['bo', 'pe', 'cl', 'ar', 'py', 'uy', 'ec', 'co', 'mx', 'es', 'us', 'br', 'ru'];
    const tail = payload.includes('_') ? payload.split('_').pop()!.toLowerCase() : '';
    const vipCountryId = knownCountries.includes(tail) ? tail : '';
    const vipBotonera = await getActiveTelegramBotoneraFlow();
    if (!vipBotonera) {
      await sendClientPagos(chatId);
      return;
    }
    if (vipCountryId) {
      await sendTelegramPlanOptions(chatId, vipBotonera.id, vipCountryId);
    } else {
      await sendTelegramBotoneraFlow(chatId);
    }
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
        const botoneraMode = getSystemSetting('telegram_botonera_mode') || 'legacy';
    if (botoneraMode === 'direct') {
      await sendDirectPaymentMethods(chatId);
    } else {
      await sendClientPagos(chatId);
    }
    return;
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

  // 1.2. Client Commands & Menus
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
    await sendClientWelcome(chatId, message.from?.first_name || 'Invitado/a');
    return;
  }

  if (normText === '/precios' || normText === '/precio' || normText === '/tarifas' || normText === '/tarifa') {
    await sendClientWelcome(chatId, message.from?.first_name || 'Invitado/a');
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
    await sendClientWelcome(chatId, message.from?.first_name || 'Invitado/a');
    return;
  }

  if (normText === '/ayuda' || normText === '/help' || normText === '/soporte') {
    if (isAdminUser(fromId)) {
      await sendAdminHelp(chatId);
    } else {
      await sendClientWelcome(chatId, message.from?.first_name || 'Invitado/a');
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

  // [FIX] Blindaje anti-comandos: si el usuario está en un flujo que espera texto
  // libre (país) y escribe un comando (algo que empieza con "/"), limpiamos el
  // estado y dejamos que el comando se procese normalmente más abajo.
  // Esto evita crear leads basura con país="/help", país="/pagos", etc.
  {
    const anyPendingState = await getConversationState(userIdStr);
    const isWaitingForCountryText =
      anyPendingState?.step === 'VIP_OTHER_COUNTRY' ||
      anyPendingState?.step === 'VIP_LEAD_COUNTRY' ||
      anyPendingState?.step === 'VIP_AUTO_PLAN' ||
      anyPendingState?.step === 'VIP_AUTO_PLAN_OTHER' ||
      anyPendingState?.step === 'DIRECT_OTHER_COUNTRY';
    if (isWaitingForCountryText && text.startsWith('/')) {
      await clearConversationState(userIdStr).catch(() => {});
      
      // No hacemos return: dejamos que el flujo normal procese el comando
    }
  }

  // [Flujo "Otros Países"] Captura texto libre de país
  {
    const vipOtherState = await getConversationState(userIdStr);
    if (vipOtherState?.step === 'VIP_OTHER_COUNTRY' && typeof message.text === 'string') {
      const handled = await handleVipOtherCountryText(chatId, userIdStr, message, vipOtherState);
      if (handled) return;
    }
  }

  // [FIX] Captura texto libre de país para leads 6 Meses / Permanente
  // Antes se procesaba DESPUÉS del guard de admin, así que los clientes
  // no-admin nunca llegaban a crear el lead. Ahora se procesa antes.
  {
    const vipLeadState = await getConversationState(userIdStr);
    if (vipLeadState?.step === 'VIP_LEAD_COUNTRY' && typeof message.text === 'string') {
      await handleConversationStep(chatId, userIdStr, message, vipLeadState);
      return;
    }
  }

  // [NUEVO] Captura texto libre de país para el flujo DIRECTO (Otros Países)
  {
    const directOtherState = await getConversationState(userIdStr);
    console.log(`[DirectFlow] Estado actual del usuario ${userIdStr}: ${directOtherState?.step || 'ninguno'}`);
    if (directOtherState?.step === 'DIRECT_OTHER_COUNTRY' && typeof message.text === 'string') {
      console.log(`[DirectFlow] 🎯 Detectado DIRECT_OTHER_COUNTRY para "${message.text}"`);
      await handleConversationStep(chatId, userIdStr, message, directOtherState);
      return;
    }
  }

  // [NUEVO] Captura texto libre de país para el flujo SUSCRIPCIÓN AUTOMÁTICA (Otros Países)
  {
    const autoPlanOtherState = await getConversationState(userIdStr);
    if (autoPlanOtherState?.step === 'VIP_AUTO_PLAN_OTHER' && typeof message.text === 'string') {
      const handled = await handleAutoPlanCountryText(chatId, userIdStr, message, autoPlanOtherState);
      if (handled) return;
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

  // Si una administradora envía fotos, videos o archivos directamente
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
  console.log(`[handleConversationStep] Step=${state.step} | text="${text}"`);

  switch (state.step) {

    case 'DIRECT_OTHER_COUNTRY': {
  const rawCountry = String(text || '').trim().replace(/[\r\n]+/g, ' ').slice(0, 80);
  if (!rawCountry) {
    await sendMessage(chatId, '✍️ Por favor escribe el nombre de tu país o método de pago.');
    return;
  }

  // Borrar el mensaje del usuario (el país escrito) para mantener el chat limpio
  if (message.message_id) {
    await callTelegramApi('deleteMessage', { chat_id: chatId, message_id: message.message_id }).catch(() => {});
  }

  // Enviar confirmación INMEDIATA al cliente ANTES de procesar el lead
  const { brandName } = getBotConfig();
  const firstName = message.from?.first_name || 'Cliente';
  await sendMessage(
    chatId,
    `✅ *¡Anotado: ${rawCountry}!*\n\n` +
    `Gracias, *${firstName}*. La *Administradora* de *${brandName || 'IAM Danii VIP'}* recibió tu solicitud y te contactará por este mismo chat con el precio exacto y las coordenadas de pago para tu suscripción mensual. 🌍💎\n\n` +
    `_Te recomendamos no compartir datos de pago con nadie más. Toda la coordinación es 100% privada con la Administradora._`
  ).catch(() => {});

  // Procesar el lead (crea la solicitud en BD + notifica a la admin)
  await processVipLead({
    chatId: String(chatId),
    user: message.from || { id: userId },
    country: rawCountry,
    planType: 'monthly',
    planLabel: 'SUSCRIPCIÓN MENSUAL (OTRO PAÍS)',
    planEmoji: '🌍',
    sourceMessageId: null
  });

  await clearConversationState(userId).catch(() => {});
  return;
}

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

      await syncProfileToChannel(profileId, `Admin Telegram (${userId})`);

      await sendMessage(chatId, `✅ *Campo "${field}" actualizado con éxito para ${updated.name}*.\n\nSincronización ejecutada en la web y canal.`);
      break;
    }

    // [NUEVO] Captura del país para leads 6 Meses / Permanente
    case 'VIP_LEAD_COUNTRY': {
      const rawCountry = String(text || '').trim().replace(/[\r\n]+/g, ' ').slice(0, 80);
      if (!rawCountry) {
        await sendMessage(chatId, '✍️ Por favor escribe el nombre de tu país (ej: Japón, Italia, Portugal...).');
        return;
      }

      const draft = state.draft_data || {};

      // Borrar el mensaje del usuario (el "Japón" que escribió) para mantener el chat limpio
      if (message.message_id) {
        await callTelegramApi('deleteMessage', {
          chat_id: chatId,
          message_id: message.message_id
        }).catch(() => {});
      }

      return await processVipLead({
        chatId: String(chatId),
        user: message.from || { id: userId },
        country: rawCountry,
        planType: draft.plan_type || 'unknown',
        planLabel: draft.plan_label || 'SUSCRIPCIÓN VIP',
        planEmoji: draft.plan_emoji || '💠',
        sourceMessageId: null
      });
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

  const maxBytes = 20 * 1024 * 1024;
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
      [{ text: 'Ver lo Exclusivo 🔥', web_app: { url: baseUrl } }]
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

  const text = `💎 *${brandName || 'IAM DANII'} • CANAL VIP FREE* 💎\n\n` +
    `¡Hola, *${firstName}*! Te damos la bienvenida a nuestro espacio oficial.\n\n` +
    `🩷 Veo que te ganó la curiosidad y quieres descubrir más de mí. 😋\n\n` +
    `¿Te gustaría descubrir mi lado más exclusivo? 🙈 Estoy en el mundo +18 hace 3 años y déjame decirte que lo que tengo para ti es totalmente rico y único.\n\n` +
    `Te ofrezco una gran variedad de videos y fotos que solo puedes ver en mi canal privado VIP. Solo allí podrás ver lo que no muestro en ningún otro lado. 🍬\n\n` +
    `👉 *Para no perderte de nada, pulsa "Ver lo Exclusivo", para más info de mi Contenido VIP, pulsa "Suscripción Automática" :*`;

  const botUser = String(getBotConfig().username || '').replace(/^@/, '').trim();
  const inlineKeyboard: any[][] = [];
  
  inlineKeyboard.push([
    { text: 'Ver lo Exclusivo 🔥', web_app: { url: baseUrl } }
  ]);
  inlineKeyboard.push([
    { text: '💳 Métodos de Pago', callback_data: 'direct_show_payments' }
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

/**
 * [NUEVO] Menú directo de planes para "SUSCRIPCIÓN AUTOMÁTICA".
 * Muestra los 3 planes (Mes / 6 Meses / Permanente) SIN pedir país primero.
 * El país se pide después, según el plan elegido:
 *   - Mes         → pide país → muestra métodos de pago del país
 *   - 6 Meses     → pide país → crea lead (precio negociado con admin)
 *   - Permanente  → pide país → crea lead (precio negociado con admin)
 */
async function sendAutoSubscriptionMenu(chatId: string | number, sourceMessageId?: number | string | null) {
  const text =
    `💎 *SUSCRIPCIÓN VIP* 💎\n\n` +
    `Elige el plan que deseas adquirir:\n\n` +
    `🧸  *1 Mes*  ·  Acceso por 30 días\n` +
    `💎  *6 Meses*  ·  Acceso por 180 días\n` +
    `💙  *Permanente*  ·  Acceso de por vida\n\n` +
    `_Toca un plan para continuar._`;

  const keyboard: any[][] = [
    [{ text: '🧸  Suscripción 1 Mes', callback_data: 'vip_autoplan_mes' }],
    [{ text: '💎  Suscripción 6 Meses', callback_data: 'vip_autoplan_seis' }],
    [{ text: '💙  Acceso Permanente', callback_data: 'vip_autoplan_permanente' }],
    [{ text: '❌ Cancelar', callback_data: 'vip_autoplan_cancel' }]
  ];

  return await editOrSend(chatId, sourceMessageId, text, {
    reply_markup: { inline_keyboard: keyboard }
  });
}

/**
 * [NUEVO] Pide al cliente el nombre de su país para el flujo SUSCRIPCIÓN AUTOMÁTICA.
 * Setea estado VIP_AUTO_PLAN con el plan elegido (mes / seis / permanente).
 */
const MONTHLY_DEFAULT_COUNTRIES = [
  'Bolivia', 'Perú', 'Chile', 'Argentina', 'Colombia',
  'Ecuador', 'México', 'Paraguay', 'Uruguay', 'España', 'Rusia'
];

async function getMonthlyCountriesList(): Promise<string[]> {
  const set = new Set<string>();

  try {
    const methods = await getPublicPaymentMethods();
    for (const method of methods) {
      if (!method.is_active) continue;
      const country = resolveCountryNameFromPaymentMethodTitle(method.title || '');
      if (country) set.add(country);
    }
  } catch {
    // fallback silencioso
  }

  for (const c of MONTHLY_DEFAULT_COUNTRIES) {
    set.add(c);
  }

  return Array.from(set).filter(c => normalizeTelegramKey(c) !== 'venezuela');
}

function getCountryFlag(countryName: string): string {
  const key = normalizeTelegramKey(countryName);
  const flagMap: Record<string, string> = {
    'bolivia': '🇧🇴',
    'peru': '🇵🇪',
    'chile': '🇨🇱',
    'argentina': '🇦🇷',
    'colombia': '🇨🇴',
    'ecuador': '🇪🇨',
    'espana': '🇪🇸',
    'mexico': '🇲🇽',
    'paraguay': '🇵🇾',
    'brasil': '🇧🇷',
    'uruguay': '🇺🇾',
    'rusia': '🇷🇺',
    'venezuela': '🇻🇪'
  };
  return flagMap[key] || '🌍';
}

async function buildMonthlyCountriesKeyboard(): Promise<any[][]> {
  const countries = await getMonthlyCountriesList();

  const rows: any[][] = [];
  for (let i = 0; i < countries.length; i += 2) {
    const row: any[] = [];
    for (const country of countries.slice(i, i + 2)) {
      const key = normalizeTelegramKey(country);
      const flag = getCountryFlag(country);
      row.push({
        text: `${flag} ${country}`,
        callback_data: `vip_autoplan_country_${key}`
      });
    }
    rows.push(row);
  }
  rows.push([{ text: '🌍 Otros Países', callback_data: 'vip_autoplan_other' }]);
  rows.push([{ text: '❌ Cancelar', callback_data: 'vip_autoplan_cancel' }]);
  return rows;
}

async function askAutoPlanCountry(
  chatId: string | number,
  planId: string,
  sourceMessageId?: number | string | null
) {
  const planType = planId === 'mes' ? 'monthly' : planId === 'seis' ? 'semester' : 'permanent';
  const meta = planType === 'monthly'
    ? { emoji: '🧸', label: 'SUSCRIPCIÓN MENSUAL' }
    : planType === 'semester'
    ? { emoji: '💎', label: 'SUSCRIPCIÓN SEMESTRAL (6 MESES)' }
    : { emoji: '💙', label: 'SUSCRIPCIÓN PERMANENTE' };

  await setConversationState(String(chatId), 'VIP_AUTO_PLAN', {
    plan_id: planId,
    plan_type: planType,
    plan_label: meta.label,
    plan_emoji: meta.emoji
  } as any);

  const text =
    `${meta.emoji} *${meta.label}* ${meta.emoji}\n\n` +
    `🌍 *Selecciona tu país* para continuar:`;

  const keyboard = await buildMonthlyCountriesKeyboard();
  return await editOrSend(chatId, sourceMessageId, text, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
}

/**
 * [NUEVO] Procesa el país que el cliente escribió para el flujo SUSCRIPCIÓN AUTOMÁTICA.
 * Según el plan elegido:
 *   - Mes         → muestra métodos de pago del país (o "Solicitar Información")
 *   - 6 Meses / Permanente → crea lead directo (proceso idéntico al de "Otros Países")
 */
async function handleAutoPlanCountrySelected(
  chatId: string | number,
  fromUser: any,
  userIdStr: string,
  countryId: string,
  sourceMessageId?: number | string | null
) {
  const autoPlanState = await getConversationState(userIdStr);
  if (!autoPlanState || autoPlanState.step !== 'VIP_AUTO_PLAN') {
    console.warn(`[AutoPlan] ⚠️ Estado no encontrado para User ${userIdStr}. Step actual: ${autoPlanState?.step || 'null'}`);
    await sendMessage(chatId, '⚠️ La sesión expiró. Escribe /start vipauto para volver a empezar.');
    return;
  }
  console.log(`[AutoPlan] ✅ Estado encontrado para User ${userIdStr}. Plan: ${(autoPlanState.draft_data as any)?.plan_type || '?'}`);

  const draft = (autoPlanState.draft_data || {}) as any;
  const planType = String(draft.plan_type || 'monthly');
  const planLabel = String(draft.plan_label || 'SUSCRIPCIÓN VIP');
  const planEmoji = String(draft.plan_emoji || '💠');

  const countries = await getMonthlyCountriesList();
  const matchedCountryName = countries.find(
    c => normalizeTelegramKey(c) === normalizeTelegramKey(countryId)
  ) || countryId;
  const countryName = matchedCountryName;

  if (planType === 'monthly') {
    const methods = await getRelevantPaymentMethodsForCountry(countryName);

    // Caso A: hay métodos → mostrar detalle si es 1, o botones si son varios
    if (methods.length > 0) {
      await clearConversationState(userIdStr).catch(() => {});

      // Sub-caso A1: 1 solo método → ir directo al detalle (QR + instrucciones)
      if (methods.length === 1) {
        const preferredMethod = methods[0];
        const boliviaRate = preferredMethod.id === 'qr_bolivia' ? await getBoliviaOfficialRateFromServer() : null;

        // Borrar el mensaje previo (botonera de países) para no acumular
        if (Number.isFinite(Number(sourceMessageId)) && Number(sourceMessageId) > 0) {
          try { await callTelegramApi('deleteMessage', { chat_id: chatId, message_id: Number(sourceMessageId) }); } catch {}
        }

        return await showPaymentMethodDetail(chatId, preferredMethod.id, { profileRateBs: boliviaRate ?? undefined });
      }

      // Sub-caso A2: varios métodos → mostrar botones para elegir
      const rows: any[][] = methods.map((m: PaymentMethod) => [
        { text: m.title, callback_data: `pay_method_${m.id}` }
      ]);
      rows.push([{ text: '❌ Cancelar', callback_data: 'vip_autoplan_cancel' }]);

      const text =
        `${planEmoji} *${planLabel}* ${planEmoji}\n\n` +
        `${getCountryFlag(countryName)} *País:* ${countryName}\n\n` +
        `💳 *Selecciona el método de pago que prefieras:*\n\n` +
        `💳 *Otros Métodos de Pago disponibles:*\n` +
        `🌐 Western Union · 💸 PayPal · 💰 Remitly · 🪙 CriptoMoneda\n\n` +
        `📲 _Envía tu comprobante a:_ [@${getAdminContactUsername()}](https://t.me/${getAdminContactUsername()})`;

      return await editOrSend(chatId, sourceMessageId, text, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: rows }
      });
    }

    // Caso B: sin métodos → crear lead
    await clearConversationState(userIdStr).catch(() => {});
    return await processVipLead({
      chatId: String(chatId),
      user: fromUser,
      country: countryName,
      planType: 'monthly',
      planLabel,
      planEmoji,
      sourceMessageId
    });
  }

  await clearConversationState(userIdStr).catch(() => {});
  return await processVipLead({
    chatId: String(chatId),
    user: fromUser,
    country: countryName,
    planType,
    planLabel,
    planEmoji,
    sourceMessageId
  });
}

async function askAutoPlanCountryOther(
  chatId: string | number,
  sourceMessageId?: number | string | null
) {
  const autoPlanState = await getConversationState(String(chatId));
  if (!autoPlanState || autoPlanState.step !== 'VIP_AUTO_PLAN') {
    await sendMessage(chatId, '⚠️ La sesión expiró. Escribe /start vipauto para volver a empezar.');
    return;
  }

  const draft = (autoPlanState.draft_data || {}) as any;

  await setConversationState(String(chatId), 'VIP_AUTO_PLAN_OTHER', {
    plan_id: draft.plan_id,
    plan_type: draft.plan_type,
    plan_label: draft.plan_label,
    plan_emoji: draft.plan_emoji
  } as any);

  const text =
    `🌍 *OTROS PAÍSES*\n\n` +
    `Escribe aquí el *nombre de tu país* (por ejemplo: Japón, Italia, Portugal...).\n\n` +
    `No lo escribas con @ ni abreviaturas, solo el nombre.`;

  const keyboard = [
    [{ text: '❌ Cancelar', callback_data: 'vip_autoplan_cancel' }]
  ];

  return await editOrSend(chatId, sourceMessageId, text, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
}

async function handleAutoPlanCountryText(
  chatId: string | number,
  userIdStr: string,
  message: any,
  state: any
): Promise<boolean> {
  const rawCountry = String(message.text || '').trim().replace(/[\r\n]+/g, ' ').slice(0, 80);
  if (!rawCountry) {
    await sendMessage(chatId, '✍️ Por favor escribe el nombre de tu país (ej: Bolivia, Japón, Italia...).');
    return true;
  }

  const draft = state.draft_data || {};
  const planType = String(draft.plan_type || 'monthly');
  const planLabel = String(draft.plan_label || 'SUSCRIPCIÓN VIP');
  const planEmoji = String(draft.plan_emoji || '💠');

  // Borrar el mensaje del usuario (el país escrito) para mantener el chat limpio
  if (message.message_id) {
    await callTelegramApi('deleteMessage', {
      chat_id: chatId,
      message_id: message.message_id
    }).catch(() => {});
  }

  // Caso 1: 6 Meses o Permanente → lead directo (mismo mecanismo que processVipLead)
  if (planType === 'semester' || planType === 'permanent') {
    return await processVipLead({
      chatId: String(chatId),
      user: message.from || { id: userIdStr },
      country: rawCountry,
      planType,
      planLabel,
      planEmoji,
      sourceMessageId: null
    });
  }

  // Caso 2: Mensual → buscar métodos de pago del país
  const methods = await getRelevantPaymentMethodsForCountry(rawCountry);

  if (methods.length > 0) {
    // Mostrar el primer método de pago (o lista si hay varios)
    if (methods.length === 1) {
      const preferredMethod = methods[0];
      const boliviaRate = preferredMethod.id === 'qr_bolivia' ? await getBoliviaOfficialRateFromServer() : null;
      await showPaymentMethodDetail(chatId, preferredMethod.id, { profileRateBs: boliviaRate ?? undefined });
    } else {
      const rows: any[][] = methods.map((m: PaymentMethod) => [
        { text: m.title, callback_data: `pay_method_${m.id}` }
      ]);
      rows.push([{ text: '❌ Cancelar', callback_data: 'vip_autoplan_cancel' }]);
      await sendMessage(
        chatId,
        `💳 *Métodos de pago disponibles para ${rawCountry}:*\n\nToca el que prefieras:`,
        { reply_markup: { inline_keyboard: rows } }
      );
    }

    await clearConversationState(userIdStr).catch(() => {});
    return true;
  }

  // Sin métodos de pago para ese país → crear lead (igual que "Solicitar Información")
  await clearConversationState(userIdStr).catch(() => {});
  return await processVipLead({
    chatId: String(chatId),
    user: message.from || { id: userIdStr },
    country: rawCountry,
    planType: 'monthly',
    planLabel: 'SUSCRIPCIÓN MENSUAL',
    planEmoji: '🧸',
    sourceMessageId: null
  });
}

export async function getActiveTelegramBotoneraFlow(): Promise<any | null> {
  const items = await getAllTelegramBotoneras();
  return items.filter(item => item.is_active && item.status !== 'draft').sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))[0] || null;
}

export function buildTelegramBotoneraKeyboard(botonera: any): any[][] {
  const isVenezuelaItem = (item: any): boolean => {
    const key = normalizeTelegramKey(String(item?.id || ''));
    const name = normalizeTelegramKey(String(item?.name || item?.label || ''));
    return key === 've' || key === 'venezuela' || name === 'venezuela';
  };
  const countries = (botonera?.countries || []).filter((item: any) => item.active && !isVenezuelaItem(item));
  const rows: any[][] = [];
  for (let i = 0; i < countries.length; i += 2) {
    const row: any[] = []
    ;
    for (const country of countries.slice(i, i + 2)) {
      row.push({ text: `${country.flag || '🌍'} ${country.name || country.label || 'País'}`, callback_data: `vip_country_${botonera.id}__${country.id}` });
    }
    rows.push(row);
  }
  rows.push([{ text: '🌍 Otros Países', callback_data: `vip_other_${botonera.id}` }]);
  // [NUEVO] Botón Cancelar al pie para salir del flujo
  rows.push([{ text: '❌ Cancelar', callback_data: 'vip_autoplan_cancel' }]);
  return rows;
}

async function askOtherCountry(chatId: string | number, botoneraId: string, sourceMessageId?: number | string | null) {
  await setConversationState(String(chatId), 'VIP_OTHER_COUNTRY', { botonera_id: botoneraId } as any);
  const text = `🌍 *OTROS PAÍSES*\n\n` +
    `Escribe aquí el *nombre de tu país* (por ejemplo: Japón, Italia, Portugal...).\n\n` +
    `No lo escribas con @ ni abreviaturas, solo el nombre. Lo enviaremos directo a la Administradora para coordinar tu suscripción 💎`;
  const keyboard = [
    [{ text: '❌ Cancelar', callback_data: `vip_other_cancel_${botoneraId}` }]
  ];
  return await editOrSend(chatId, sourceMessageId, text, {
    reply_markup: { inline_keyboard: keyboard }
  });
}

async function handleVipOtherCountryText(chatId: string | number, userIdStr: string, message: any, state: any): Promise<boolean> {
  const rawCountry = String(message.text || '').trim().replace(/[\r\n]+/g, ' ').slice(0, 80);
  if (!rawCountry) {
    await sendMessage(chatId, '✍️ Por favor escribe el nombre de tu país (ejemplo: Japón).');
    return true;
  }

  await setConversationState(userIdStr, 'VIP_OTHER_COUNTRY', { ...(state.draft_data || {}), free_country: rawCountry });

  try {
    await registerSubscriber(userIdStr, message.from?.username, message.from?.first_name);
  } catch { /* no romper el flujo si el registro falla */ }

  await addAuditLog('VIP_OTHER_COUNTRY', `${userIdStr}${message.from?.username ? ' (@' + message.from.username + ')' : ''}`, `País escrito por el cliente (sin validar): "${rawCountry}"`).catch(() => {});

  try {
    const { adminIds } = getBotConfig();
    const adminChat = String(adminIds[0] || '');
    if (adminChat) {
      const who = `${message.from?.first_name || ''}${message.from?.username ? ' (@' + message.from.username + ')' : ''}`.trim() || 'Cliente';
      await sendMessage(adminChat, `🌍 *OTROS PAÍSES — nueva solicitud*\n\n` +
        `👤 ${who}\n` +
        `🆔 \`${userIdStr}\`\n` +
        `🗺 País escrito por el cliente: *${rawCountry}*\n\n` +
        `_El cliente continuó el flujo VIP (planes Mes / 6 Meses / Permanente). Al pulsar "Solicitar Información" te llegará el lead._`).catch(() => {});
    }
  } catch { /* nunca romper el flujo del cliente por la notificación */ }

  const botonera = (await getAllTelegramBotoneras()).find(item => item.id === (state.draft_data?.botonera_id || ''))
    || await getActiveTelegramBotoneraFlow();
  if (!botonera) {
    await sendMessage(chatId, `✅ Anotado: *${rawCountry}*.\n\nAhora mismo no tengo la botonera VIP disponible; escríbele a la Administradora 💎`);
    return true;
  }

  await sendTelegramPlanOptions(chatId, botonera.id, rawCountry);
  return true;
}

export async function sendTelegramBotoneraFlow(chatId: string | number, sourceMessageId?: number | string | null) {
  const botonera = await getActiveTelegramBotoneraFlow();
  if (!botonera) {
    return await sendMessage(chatId, '⚠️ Aún no hay una botonera VIP publicada para este flujo.');
  }

  const text = `*${botonera.title || 'SUSCRIPCIÓN VIP'}*\n\n${botonera.intro || 'Selecciona tu país para continuar.'}`;
  const keyboard = buildTelegramBotoneraKeyboard(botonera);
  // [MODIFICADO] Acepta sourceMessageId para editar en lugar de acumular menús
  return await editOrSend(chatId, sourceMessageId, text, {
    reply_markup: { inline_keyboard: keyboard }
  });
}

// ==========================================
// ⚡ NUEVO FLUJO DIRECTO (SOLO MENSUAL)
// ==========================================

function getDirectMethodFlag(method: PaymentMethod | string): string {
  const title = typeof method === 'string' ? method : (method.title || '');
  const id = typeof method === 'string' ? method : (method.id || '');
  const lower = `${title} ${id}`.toLowerCase();
  
  const flagMatch = title.match(/^(\p{Regional_Indicator}{2}|\p{Emoji})/u);
  if (flagMatch && !/^[A-Z0-9]/i.test(flagMatch[0])) return flagMatch[0];

  if (lower.includes('bolivia') || /\bbo\b/i.test(lower)) return '🇧🇴';
  if (lower.includes('peru') || lower.includes('perú') || /\bpe\b/i.test(lower)) return '🇵🇪';
  if (lower.includes('chile') || /\bcl\b/i.test(lower)) return '🇨🇱';
  if (lower.includes('argentina') || /\bar\b/i.test(lower)) return '🇦🇷';
  if (lower.includes('espana') || lower.includes('españa') || /\bes\b/i.test(lower)) return '🇪🇸';
  if (lower.includes('mexico') || lower.includes('méxico') || /\bmx\b/i.test(lower)) return '🇲🇽';
  if (lower.includes('paraguay') || /\bpy\b/i.test(lower)) return '🇵🇾';
  if (lower.includes('brasil') || lower.includes('brazil') || /\bbr\b/i.test(lower)) return '🇧🇷';
  if (lower.includes('uruguay') || /\buy\b/i.test(lower)) return '🇺🇾';
  if (lower.includes('colombia') || /\bco\b/i.test(lower)) return '🇨🇴';
  if (lower.includes('rusia') || lower.includes('russia') || /\bru\b/i.test(lower)) return '🇷🇺';
  if (lower.includes('ecuador') || /\bec\b/i.test(lower)) return '🇪🇨';
  if (lower.includes('venezuela') || /\bve\b/i.test(lower)) return '🇻🇪';
  if (lower.includes('zelle') || lower.includes('estados unidos') || /\bus\b/i.test(lower)) return '🇺🇸';
  if (lower.includes('cripto') || lower.includes('usdt') || lower.includes('bitcoin') || lower.includes('binance')) return '🪙';
  if (lower.includes('paypal')) return '💸';
  if (lower.includes('estrella') || lower.includes('stars')) return '⭐';
  if (lower.includes('tigo')) return '☎️';
  if (lower.includes('western') || lower.includes('remitly') || lower.includes('moneygram')) return '🌐';
  return '💳';
}

function getDirectCleanTitle(method: PaymentMethod): string {
  const raw = method.title || '';
  return raw.replace(/^([A-Z]{2}\s*[-–:]\s*)/i, '').replace(/^(\p{Regional_Indicator}{2}|\p{Emoji})\s*/u, '').trim();
}

async function sendDirectMenu(chatId: string | number, firstName: string) {
  const { baseUrl } = getBotConfig();
  const text = `✨ *¡Hola ${firstName}!* ✨\n\n` +
    `Bienvenido a mi espacio exclusivo VIP (+18).\n\n` +
    `Selecciona una opción para continuar:`;

  const inlineKeyboard = [
    [{ text: 'Ver lo Exclusivo 🔥', web_app: { url: baseUrl } }],
    [{ text: '💳 Métodos de Pago', callback_data: 'direct_show_payments' }]
  ];

  await sendMessage(chatId, text, { reply_markup: { inline_keyboard: inlineKeyboard } });
}

async function sendDirectPaymentMethods(chatId: string | number, sourceMessageId?: number) {
  const methods = await getPublicPaymentMethods();
  const activeMethods = methods.filter(m => m.is_active);

  if (activeMethods.length === 0) {
    await editOrSend(chatId, sourceMessageId,
      `⚠️ *No hay métodos de pago configurados aún.*\n\nPuedes escribir tu país o método directamente para que la administradora te contacte.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🌍 Otros Países / No encuentro mi método', callback_data: 'direct_other_countries' }],
            [{ text: '🔙 Volver al Menú', callback_data: 'direct_back_menu' }]
          ]
        }
      });
    return;
  }

  const boliviaRate = await getBoliviaOfficialRateFromServer();

  const sorted = activeMethods.sort((a, b) => {
    if (a.id === 'qr_bolivia') return -1;
    if (b.id === 'qr_bolivia') return 1;
    return (a.priority_order || 0) - (b.priority_order || 0);
  });

  const rows: any[][] = [];
  for (const method of sorted) {
    const flag = getDirectMethodFlag(method);
    const cleanTitle = getDirectCleanTitle(method);
    
    let priceText = '';
    if (method.id === 'qr_bolivia' || /bolivia/i.test(method.title || '')) {
      priceText = boliviaRate ? ` - Bs. ${boliviaRate} / mes` : '';
    } else if (method.price) {
      priceText = ` - ${method.price}`;
    }
    
    const label = `${flag} ${cleanTitle}${priceText}`;
    rows.push([{ text: label, callback_data: `direct_pay_${method.id}` }]);
  }

  rows.push([{ text: '🌍 Otros Países / No encuentro mi método', callback_data: 'direct_other_countries' }]);
  rows.push([{ text: '🔙 Volver al Menú', callback_data: 'direct_back_menu' }]);

  const text = `💳 *MÉTODOS DE PAGO DISPONIBLES*\n\n` +
    `Selecciona el método de tu preferencia para ver los datos y realizar tu suscripción mensual.\n\n` +
    `_¿No encuentras tu país o método? Toca la última opción._`;

  await editOrSend(chatId, sourceMessageId, text, { reply_markup: { inline_keyboard: rows }, parse_mode: 'Markdown' });
}

async function sendDirectOtherCountriesPrompt(chatId: string | number, sourceMessageId?: number) {
  await setConversationState(String(chatId), 'DIRECT_OTHER_COUNTRY', {} as any);
  console.log(`[DirectFlow] 🎯 Estado DIRECT_OTHER_COUNTRY guardado para chatId=${chatId}`);
  
  const text = `🌍 *OTROS PAÍSES / MÉTODOS*\n\n` +
    `Escribe el nombre de tu país o el método de pago que usas (Ej: Japón, Italia, PayPal, Cripto...).\n\n` +
    `El bot lo registrará y la administradora te contactará para coordinar tu suscripción mensual.`;

  await editOrSend(chatId, sourceMessageId, text, {
    reply_markup: { inline_keyboard: [[{ text: '❌ Cancelar', callback_data: 'direct_back_menu' }]] },
    parse_mode: 'Markdown'
  });
}

// ==========================================
// FIN NUEVO FLUJO DIRECTO
// ==========================================

export async function sendTelegramPlanOptions(chatId: string | number, botoneraId: string, countryId: string, sourceMessageId?: number | string | null) {
  const items = await getAllTelegramBotoneras();
  const botonera = items.find(item => item.id === botoneraId) || (await getActiveTelegramBotoneraFlow());
  if (!botonera) {
    await sendMessage(chatId, '⚠️ No pude abrir la botonera VIP en este momento. Inténtalo otra vez más tarde.');
    return;
  }

  const isVenezuelaSelected = normalizeTelegramKey(String(countryId || '')) === 'venezuela'
    || normalizeTelegramKey(String(countryId || '')) === 've';
  if (isVenezuelaSelected) {
    await editOrSend(chatId, sourceMessageId,
      `🌍 *OTROS PAÍSES*\n\n` +
      `Escribe aquí el *nombre de tu país* (por ejemplo: Japón, Italia, Portugal...).\n\n` +
      `Lo enviaremos directo a la Administradora para coordinar tu suscripción 💎`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Cancelar', callback_data: `vip_other_cancel_${botoneraId}` }]
          ]
        }
      });
    await setConversationState(String(chatId), 'VIP_OTHER_COUNTRY', { botonera_id: String(botoneraId), free_country_hint: 'Venezuela' } as any);
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

  const allPlans = botonera.plans || [];
  const plans = allPlans
    .filter((plan: any) => plan.active !== false)
    .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

  if (plans.length === 0) {
    const base = allPlans[allPlans.length - 1];
    // [MODIFICADO] Emojis alineados con RequestModal y precios null para 6M/Perm
    const fallbackPlans = [
      { id: 'mes', name: '🧸 Suscripción 1 Mes', price: base?.price || null },
      { id: 'seis', name: '💎 Suscripción 6 Meses', price: null },
      { id: 'permanente', name: '💙 Acceso Permanente', price: null }
    ];
    const fbRows: any[][] = fallbackPlans.map((plan) => {
      const cbData = `vip_plan_${botonera.id}__${countryId}__${plan.id}`;
      const safeCb = Buffer.byteLength(cbData, 'utf8') <= 64 ? cbData : `vip_plan_menu_${botonera.id}__${countryId}`;
      return [{ text: `${plan.name}${plan.price ? ` — ${plan.price}` : ''}`, callback_data: safeCb }];
    });
    fbRows.push([{ text: '🔙 Cambiar país', callback_data: `vip_country_menu_${botonera.id}` }]);

    const fbText = `💎 *SUSCRIPCIÓN VIP* 💎\n\n` +
      `${botonera.plan_label || 'Selecciona tu plan:'}\n\n` +
      `${country?.flag || '🌍'} País seleccionado: *${country?.name || countryId || 'Internacional'}*`;

    return await editOrSend(chatId, sourceMessageId, fbText, { reply_markup: { inline_keyboard: fbRows }, parse_mode: 'Markdown' });
  }

  if (plans.length > 0) {
    const rows: any[][] = [];
    for (const plan of plans) {
      const planKey = String(plan.id ?? plan.name ?? '').trim();
      const cbData = `vip_plan_${botonera.id}__${countryId}__${planKey}`;
      const safeCb = Buffer.byteLength(cbData, 'utf8') <= 64
        ? cbData
        : `vip_plan_menu_${botonera.id}__${countryId}`;
      rows.push([{
        text: `${plan.name || 'Plan'}${plan.price ? ` — ${plan.price}` : ''}`,
        callback_data: safeCb
      }]);
    }
    rows.push([{ text: '🔙 Cambiar país', callback_data: `vip_country_menu_${botonera.id}` }]);

    const text = `💎 *SUSCRIPCIÓN VIP* 💎\n\n` +
      `${botonera.plan_label || 'Selecciona tu plan:'}\n\n` +
      `${country?.flag || '🌍'} País seleccionado: *${country?.name || countryId || 'Internacional'}*`;

    return await editOrSend(chatId, sourceMessageId, text, { reply_markup: { inline_keyboard: rows }, parse_mode: 'Markdown' });
  }

  const methods = await getRelevantPaymentMethodsForCountry(country?.name || countryId || '');

  if (methods.length > 0) {
    const preferredMethod = methods[0];
    const boliviaRate = preferredMethod.id === 'qr_bolivia' ? await getBoliviaOfficialRateFromServer() : null;
    await showPaymentMethodDetail(chatId, preferredMethod.id, { profileRateBs: boliviaRate ?? undefined, sourceMessageId });
    return;
  }

  const adminUsername = getAdminContactUsername();
  const rows: any[][] = [[{ text: '📲 Hablar con administradora', url: `https://t.me/${adminUsername}` }], [{ text: '🔙 Cambiar país', callback_data: `vip_country_menu_${botonera.id}` }]];

  const text = `*${botonera.country_label || 'País / Bandera'}: ${country?.flag || '🌍'} ${country?.name || countryId || 'Selección'}*\n\n` +
    `*No hay un método de pago activo guardado para este país.*\n\n` +
    `_Contacta a la administradora para coordinar la suscripción._`;
  return await editOrSend(chatId, sourceMessageId, text, { reply_markup: { inline_keyboard: rows } });
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

// [MODIFICADO] Bifurcación: mensual con país conocido → métodos de pago; 6M/Perm o país libre → captura de país
export async function sendTelegramPlanConfirmation(
  chatId: string | number,
  botoneraId: string,
  countryId: string,
  planId: string,
  sourceMessageId?: number | string | null,
  fromUser?: { id: number | string; username?: string; first_name?: string }
) {
  const items = await getAllTelegramBotoneras();
  const botonera = items.find(item => item.id === botoneraId) || null;
  if (!botonera) return;

  const country = (botonera.countries || []).find((item: any) => String(item.id) === String(countryId));
  const plan = (botonera.plans || []).find((item: any) => String(item.id) === String(planId));
  const planType = detectPlanType(plan);
  const adminUsername = getAdminContactUsername();
  const adminUrl = `https://t.me/${adminUsername}`;

  // [NUEVO] Guardar contexto para el handler del botón "Solicitar Información"
  // (permite que el callback vip_lead_send sepa qué país, plan y botonera mostrar)
  try {
    await setConversationState(String(chatId), 'VIP_LEAD_PENDING', {
      botonera_id: botoneraId,
      country_id: countryId,
      plan_id: planId
    } as any);
  } catch {
    // Si falla guardar el estado, el botón "Solicitar Información" mostrará el mensaje de expiración
  }

  // [FIX] 6 Meses o Permanente → resolver país y enviar lead directo SIN volver a pedirlo
  if (planType === 'semester' || planType === 'permanent') {
    const meta = planType === 'semester'
      ? { emoji: '💎', label: 'SUSCRIPCIÓN SEMESTRAL (6 MESES)' }
      : { emoji: '💙', label: 'SUSCRIPCIÓN PERMANENTE' };

    // Resolver el país a enviar al lead en este orden:
    //   1) País REAL de la botonera (el cliente ya lo eligió) → country.name
    //   2) País escrito en "Otros Países" (flujo free_country)
    //   3) Si no hay ninguno → pedirlo con askPlanCountry()
    let resolvedCountry: string | undefined;

    if (country) {
      const countryName = String(country.name || country.label || '').trim();
      if (countryName) {
        resolvedCountry = countryName;
      }
    }

    if (!resolvedCountry) {
      try {
        const convState = await getConversationState(String(chatId));
        const draftData = (convState?.draft_data || {}) as any;
        const rawCountry = draftData?.free_country;
        if (typeof rawCountry === 'string' && rawCountry.trim().length > 0) {
          resolvedCountry = rawCountry.trim();
        }
      } catch {
        // ignore
      }
    }

    // Si tenemos país resuelto y usuario válido → procesar lead directo
    if (resolvedCountry && fromUser) {
      return await processVipLead({
        chatId: String(chatId),
        user: fromUser,
        country: resolvedCountry,
        planType,
        planLabel: meta.label,
        planEmoji: meta.emoji,
        sourceMessageId
      });
    }

    // Solo pedir país si no hay país en ninguna fuente
    return await askPlanCountry(chatId, botoneraId, countryId, planId, sourceMessageId);
  }

  // [MANTENIDO] Mensual con país libre → "Otros Métodos de Pago" (flujo existente)
  if (!country) {
    const rows: any[][] = [
      [{ text: '💎 Solicitar Información', callback_data: 'vip_lead_send' }],
      [{ text: '💳 Otros Métodos de Pago', callback_data: `vip_othermethods_${botonera.id}__${countryId}` }],
      [{ text: '🔙 Cambiar plan', callback_data: `vip_country_${botonera.id}__${countryId}` }]
    ];
    const freeText = `*Información Suscripción VIP*\n\n` +
      `¡Bienvenido a la zona exclusiva!\n\n` +
      `🌍 País: *${String(countryId).slice(0, 80)}*\n` +
      `🧸 ${plan?.name || 'SUSCRIPCIÓN MENSUAL'}${plan?.price ? ` — ${plan.price}` : ''}\n\n` +
      `💳 *OTROS MÉTODOS DE PAGO:* Western Union, PayPal, Remitly, CriptoMoneda\n\n` +
      `📲 _Escríbeme al privado y coordinamos tu suscripción:_ [@${adminUsername}](${adminUrl})`;
    return await editOrSend(chatId, sourceMessageId, freeText, { reply_markup: { inline_keyboard: rows }, parse_mode: 'Markdown' });
  }

  // [MANTENIDO] Mensual con país conocido → métodos de pago del país
  const relevantMethods = await getRelevantPaymentMethodsForCountry(country?.name || '');
  const rows: any[][] = relevantMethods.length > 0
    ? relevantMethods.map((method: PaymentMethod) => [{ text: method.title, callback_data: `pay_method_${method.id}` }])
    : [[{ text: '💎 Solicitar Información', callback_data: 'vip_lead_send' }]];

  rows.push([{ text: '💳 Otros Métodos de Pago', callback_data: `vip_othermethods_${botonera.id}__${countryId}` }]);
  rows.push([{ text: '🔙 Cambiar plan', callback_data: `vip_country_${botonera.id}__${countryId}` }]);

  const text = `*Información Suscripción VIP*\n\n` +
    `¡Bienvenido a la zona exclusiva!\n\n` +
    `${country?.flag || '🌍'} ${country?.name || 'País'}\n` +
    `🧸 ${plan?.name || 'SUSCRIPCIÓN MENSUAL'}\n\n` +
    `_Selecciona tu método de pago y te enviamos los datos y coordenadas para coordinar tu suscripción._\n\n` +
    `💳 *Otros Métodos de Pago:* Western Union, PayPal, Remitly, CriptoMoneda, PIX — escríbeme al privado.`;

  return await editOrSend(chatId, sourceMessageId, text, { reply_markup: { inline_keyboard: rows }, parse_mode: 'Markdown' });
}

export async function sendOtherPaymentMethods(chatId: string | number, sourceMessageId?: number | string | null) {
  const adminUsername = getAdminContactUsername();
  const adminUrl = `https://t.me/${adminUsername}`;
  const text = `💳 *OTROS MÉTODOS DE PAGO*\n\n` +
    `• Western Union\n` +
    `• PayPal\n` +
    `• Remitly\n` +
    `• CriptoMoneda\n` +
    `• PIX\n\n` +
    `📲 _Escríbeme al privado y coordinamos tu suscripción:_ [@${adminUsername}](${adminUrl})`;
  const keyboard = [
    [{ text: '💎 Solicitar Información', callback_data: 'vip_lead_send' }],
    [{ text: '🔙 Volver', url: `https://t.me/${String(getBotConfig().username || '').replace(/^@/, '')}?start=vipauto` }]
  ];
  return await editOrSend(chatId, sourceMessageId, text, { reply_markup: { inline_keyboard: keyboard }, parse_mode: 'Markdown' });
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
  options?: { profileRateBs?: number | string; sourceMessageId?: number | string | null }
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
      { text: '💎 Abrir Mini App', web_app: { url: baseUrl } }
    ]
  ];

  const prevMid = Number(options?.sourceMessageId);
  const deletePrev = async () => {
    if (Number.isFinite(prevMid) && prevMid > 0) {
      try { await callTelegramApi('deleteMessage', { chat_id: chatId, message_id: prevMid }); } catch {}
    }
  };

  if (method.image_url) {
    const isVideo = /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(method.image_url);
    const apiMethod = isVideo ? 'sendVideo' : 'sendPhoto';
    const payloadKey = isVideo ? 'video' : 'photo';
    const res = await callTelegramApi(apiMethod, {
      chat_id: chatId,
      [payloadKey]: method.image_url,
      caption: caption,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: inlineKeyboard }
    });
    if (res && res.ok) {
      await deletePrev();
      return res;
    }
  }

  const fallbackRes = await sendMessage(chatId, caption, {
    reply_markup: {
      inline_keyboard: inlineKeyboard
    }
  });
  await deletePrev();
  return fallbackRes;
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
      { text: 'Ver lo Exclusivo 🔥', url: directMiniAppUrl }
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

  const callbackChatType = cb.message?.chat?.type;
  if (callbackChatType && callbackChatType !== 'private' && isPublicTelegramCallbackData(data)) {
    const botUser = String(getBotConfig().username || '').replace(/^@/, '').trim();
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

  // 1. Client Callbacks
  if (data.startsWith('client_')) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    if (data === 'client_cmd_pagos') {
      await sendClientPagos(chatId);
    } else if (data === 'client_cmd_canal' || data === 'client_cmd_precios' || data === 'client_cmd_info' || data === 'client_cmd_ayuda') {
      await sendClientWelcome(chatId, cb.from?.first_name || 'Invitado/a');
    } else if (data === 'client_cmd_menu') {
      await sendClientWelcome(chatId, cb.from?.first_name || 'Invitado/a');
    }
    return;
  }

  if (data.startsWith('pay_method_')) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    const methodId = data.replace('pay_method_', '');
    await showPaymentMethodDetail(chatId, methodId, { sourceMessageId: cb.message?.message_id });
    return;
  }

  if (data.startsWith('vip_country_menu_')) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    const botoneraId = data.slice('vip_country_menu_'.length);
    const items = await getAllTelegramBotoneras();
    const botonera = items.find(item => item.id === botoneraId) || (await getActiveTelegramBotoneraFlow());
    if (botonera) {
      await editOrSend(chatId, cb.message?.message_id, `*${botonera.title || 'SUSCRIPCIÓN VIP'}*\n\n${botonera.intro || 'Selecciona tu país para continuar.'}`, {
        reply_markup: { inline_keyboard: buildTelegramBotoneraKeyboard(botonera) }
      });
    }
    return;
  }

  if (data.startsWith('vip_country_')) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    const parsed = parseTelegramBotoneraCallbackData(data);
    const veKey = normalizeTelegramKey(String(parsed?.countryId || ''));
    if (parsed && parsed.kind === 'country' && (veKey === 've' || veKey === 'venezuela')) {
      await askOtherCountry(chatId, parsed.botoneraId || (await getActiveTelegramBotoneraFlow())?.id || '', cb.message?.message_id);
      return;
    }
    if (parsed && parsed.kind === 'country' && parsed.countryId) {
      const fallbackBotoneraId = parsed.botoneraId || (await getActiveTelegramBotoneraFlow())?.id;
      if (fallbackBotoneraId) {
        await sendTelegramPlanOptions(chatId, fallbackBotoneraId, parsed.countryId, cb.message?.message_id);
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
        await sendTelegramPlanOptions(chatId, fallbackBotoneraId, parsed.countryId, cb.message?.message_id);
      }
    }
    return;
  }

  // [NUEVO] SUSCRIPCIÓN AUTOMÁTICA — Menú directo de planes
  if (data === 'vip_autoplan_cancel') {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    await clearConversationState(userIdStr);
    await sendClientWelcome(chatId, cb.from?.first_name || 'Invitado/a');
    return;
  }

  if (data === 'vip_autoplan_mes' || data === 'vip_autoplan_seis' || data === 'vip_autoplan_permanente') {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    const planId = data.replace('vip_autoplan_', ''); // 'mes' | 'seis' | 'permanente'
    await askAutoPlanCountry(chatId, planId, cb.message?.message_id);
    return;
  }

  // [NUEVO] SUSCRIPCIÓN AUTOMÁTICA — Cliente tocó un país de la botonera
  if (data.startsWith('vip_autoplan_country_')) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    const countryKey = data.slice('vip_autoplan_country_'.length);
    console.log(`[AutoPlan] 🌍 País seleccionado: "${countryKey}" | User: ${userIdStr}`);
    await handleAutoPlanCountrySelected(chatId, cb.from, userIdStr, countryKey, cb.message?.message_id);
    return;
  }

  // [NUEVO] SUSCRIPCIÓN AUTOMÁTICA — Cliente toca "Otros Países"
  if (data === 'vip_autoplan_other') {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    await askAutoPlanCountryOther(chatId, cb.message?.message_id);
    return;
  }

  // [NUEVO] SUSCRIPCIÓN AUTOMÁTICA — "Otros Métodos de Pago" (informativo)
  if (data === 'vip_autoplan_othermethods') {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    const infoText =
      `💳 *OTROS MÉTODOS DE PAGO*\n\n` +
      `🌐 Western Union\n` +
      `💸 PayPal\n` +
      `💰 Remitly\n` +
      `🪙 CriptoMoneda\n\n` +
      `📲 _Escríbeme al privado y coordinamos tu suscripción:_ [@${getAdminContactUsername()}](https://t.me/${getAdminContactUsername()})`;
    await editOrSend(chatId, cb.message?.message_id, infoText, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '❌ Cancelar', callback_data: 'vip_autoplan_cancel' }]] }
    });
    return;
  }

  // [NUEVO] Cancelar el flujo "Otros Países" → volver a la selección de países
  if (data.startsWith('vip_other_cancel_')) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    const botoneraId = data.slice('vip_other_cancel_'.length);
    await clearConversationState(userIdStr);

    const items = await getAllTelegramBotoneras();
    const botonera = items.find(i => i.id === botoneraId) || (await getActiveTelegramBotoneraFlow());

    if (botonera) {
      const text = `*${botonera.title || 'SUSCRIPCIÓN VIP'}*\n\n${botonera.intro || 'Selecciona tu país para continuar.'}`;
      const keyboard = buildTelegramBotoneraKeyboard(botonera);
      await editOrSend(chatId, cb.message?.message_id, text, {
        reply_markup: { inline_keyboard: keyboard }
      });
    } else {
      await sendClientWelcome(chatId, cb.from?.first_name || 'Invitado/a');
    }
    return;
  }

  if (data.startsWith('vip_other_')) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    const botoneraId = data.slice('vip_other_'.length);
    await askOtherCountry(chatId, botoneraId, cb.message?.message_id);
    return;
  }

  if (data.startsWith('vip_othermethods_')) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    await sendOtherPaymentMethods(chatId, cb.message?.message_id);
    return;
  }

  // [NUEVO] Botón "Solicitar Información" → crea lead real y notifica a la admin
  if (data === 'vip_lead_send') {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });

    // Leer el contexto guardado al mostrar la confirmación
    const pendingState = await getConversationState(String(chatId));
    if (!pendingState || pendingState.step !== 'VIP_LEAD_PENDING') {
      await sendMessage(
        chatId,
        '⚠️ La solicitud expiró o no es válida.\n\nEscribe /start vipauto para volver a elegir tu plan VIP.'
      );
      return;
    }

    const draft = (pendingState.draft_data || {}) as any;
    const botoneraId = String(draft.botonera_id || '');
    const countryId = String(draft.country_id || '');
    const planId = String(draft.plan_id || '');

    // Resolver nombre real del país desde la botonera
    const items = await getAllTelegramBotoneras();
    const botonera = items.find(i => i.id === botoneraId);
    const country = botonera?.countries?.find((c: any) => String(c.id) === String(countryId));
    const countryName = country
      ? String(country.name || country.label || countryId).trim()
      : String(countryId || 'No especificado').trim();

    // Detectar tipo de plan para la etiqueta
    const plan = botonera?.plans?.find((p: any) => String(p.id) === String(planId));
    const planType = detectPlanType(plan);
    const planLabel = planType === 'semester'
      ? 'SUSCRIPCIÓN SEMESTRAL (6 MESES)'
      : planType === 'permanent'
      ? 'SUSCRIPCIÓN PERMANENTE'
      : planType === 'monthly'
      ? 'SUSCRIPCIÓN MENSUAL'
      : String(plan?.name || 'SOLICITUD DE INFORMACIÓN VIP').toUpperCase();
    const planEmoji = planType === 'semester'
      ? '💎'
      : planType === 'permanent'
      ? '💙'
      : planType === 'monthly'
      ? '🧸'
      : '💠';

    return await processVipLead({
      chatId: String(chatId),
      user: cb.from,
      country: countryName,
      planType: planType === 'unknown' ? 'info' : planType,
      planLabel,
      planEmoji,
      sourceMessageId: cb.message?.message_id
    });
  }

  if (data.startsWith('vip_plan_')) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    const parsed = parseTelegramBotoneraCallbackData(data);
    if (parsed && parsed.kind === 'plan' && parsed.countryId) {
      const fallbackBotoneraId = parsed.botoneraId || (await getActiveTelegramBotoneraFlow())?.id;
      if (!fallbackBotoneraId) return;
      if (parsed.planId) {
        // [MODIFICADO] Se pasa cb.from para que el flujo 6M/Perm pueda notificar correctamente
        await sendTelegramPlanConfirmation(
          chatId,
          fallbackBotoneraId,
          parsed.countryId,
          parsed.planId,
          cb.message?.message_id,
          cb.from
        );
      } else {
        await sendTelegramPlanOptions(chatId, fallbackBotoneraId, parsed.countryId, cb.message?.message_id);
      }
    }
    return;
  }

  if (isPublicTelegramCallbackData(data)) {
    console.info('[TelegramCallbackPublicAllowed]', { data, fromId, chatId });
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    return;
  }

  if (data === 'direct_show_payments') {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    await sendDirectPaymentMethods(chatId, cb.message?.message_id);
    return;
  }

  if (data === 'direct_other_countries') {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    await sendDirectOtherCountriesPrompt(chatId, cb.message?.message_id);
    return;
  }

  if (data === 'direct_back_menu') {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    await clearConversationState(userIdStr);
    await sendDirectMenu(chatId, cb.from?.first_name || 'Cliente');
    return;
  }

  if (data.startsWith('direct_pay_')) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    const methodId = data.replace('direct_pay_', '');
    await showPaymentMethodDetail(chatId, methodId, { sourceMessageId: cb.message?.message_id });
    return;
  }

  if (!isAdminUser(fromId)) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id, text: 'Acceso solo para administradoras.', show_alert: true });
    return;
  }

  if (!isPrivateChat(cb.message?.chat)) {
    await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id, text: 'Esta acción solo funciona en el chat privado.', show_alert: true });
    return;
  }

  await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });

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
          { text: 'Ver lo Exclusivo 🔥', web_app: { url: baseUrl } }
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

  await createCustomerRequest({
    profile_id: profile.id,
    profile_name: profile.name,
    telegram_user_id: String(clientUser.id),
    telegram_username: clientUser.username || undefined,
    telegram_first_name: clientUser.first_name || 'Cliente',
    status: 'pendiente'
  });

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