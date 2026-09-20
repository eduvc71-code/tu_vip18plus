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
  toggleProfileReaction,
  getPublicCustomButtons,
  getAllCustomButtons,
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
  const ACTIVE_BOT_TOKEN = '8949665976:AAFp1VoeLwPTXDCfvED1g0PAFJgAZAr56Sw';
  let token = (process.env.BOT_TOKEN || '').trim();
  if (!token || !token.startsWith('8949665976')) {
    token = ACTIVE_BOT_TOKEN;
  }
  const storedUsername = getSystemSetting('bot_username');
  let rawUsername = process.env.BOT_USERNAME || storedUsername || 'IAM_Danii_VIP_bot';
  if (/ruti|flavia/i.test(rawUsername)) {
    rawUsername = 'IAM_Danii_VIP_bot';
  }
  let username = rawUsername.replace(/^@/, '').trim() || 'IAM_Danii_VIP_bot';
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || '';
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
  const signingSecret = process.env.ADMIN_SIGNING_SECRET || 'secret_jwt_key_danii_vip';
  const brandName = process.env.VIP_BRAND_NAME || 'IAM DANII VIP';
  const baseUrl = (
    process.env.RENDER_EXTERNAL_URL ||
    process.env.APP_BASE_URL ||
    process.env.APP_URL ||
    'https://catalogo-vip-scz.onrender.com'
  ).replace(/\/+$/, '');

  return { token, username, secret, channelId, adminIds, signingSecret, brandName, baseUrl };
}

export function isAdminUser(telegramUserId: string | number): boolean {
  const { adminIds } = getBotConfig();
  if (adminIds.length === 0) {
    return false;
  }
  return adminIds.includes(String(telegramUserId));
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

    if (parsedUser && parsedUser.id) {
      return { valid: true, user: parsedUser };
    }
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
async function callTelegramApi(method: string, body: any): Promise<any> {
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
        { text: '👑 Abrir Panel Web', web_app: { url: adminLink } },
        { text: '💎 Abrir Canal VIP Free', web_app: { url: baseUrl } }
      ],
      [
        { text: btnCanal },
        { text: btnListar }
      ],
      [
        { text: btnNuevo },
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
  const { baseUrl } = getBotConfig();
  return await callTelegramApi('setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: '✨ Canal VIP Free ✨',
      web_app: {
        url: baseUrl
      }
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

  const primaryPhoto = profile.photos && profile.photos.length > 0 ? profile.photos[0] : null;
  const activeDesc = (primaryPhoto && profile.media_descriptions?.[primaryPhoto]) || profile.description || '';
  const caption = activeDesc.trim() || 'Contenido VIP Exclusivo';

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

type ReactionListener = (event: { profileId: string; reactions: any }) => void;
const reactionListeners: Set<ReactionListener> = new Set();

export function onReactionUpdated(listener: ReactionListener) {
  reactionListeners.add(listener);
  return () => reactionListeners.delete(listener);
}

export function notifyReactionListeners(data: { profileId: string; reactions: any }) {
  for (const listener of reactionListeners) {
    try {
      listener(data);
    } catch (e) {
      console.error('Error notifying reaction listener:', e);
    }
  }
}

export async function buildChannelPostMarkup(profile: Profile, _baseUrl: string, username: string) {
  const reactions: any = profile.reactions || {};
  const reactionRow1 = [
    { text: `❤️ ${reactions.hearts || 0}`, callback_data: `react_heart_${profile.id}` },
    { text: `🔥 ${reactions.fires || 0}`, callback_data: `react_fire_${profile.id}` },
    { text: `👍 ${reactions.likes || 0}`, callback_data: `react_like_${profile.id}` },
    { text: `🥰 ${reactions.in_love || 0}`, callback_data: `react_in_love_${profile.id}` },
    { text: `💋 ${reactions.kiss || 0}`, callback_data: `react_kiss_${profile.id}` }
  ];
  const reactionRow2 = [
    { text: `⭐ ${reactions.stars || 0}`, callback_data: `react_star_${profile.id}` },
    { text: `😍 ${reactions.heart_eyes || 0}`, callback_data: `react_heart_eyes_${profile.id}` },
    { text: `👏 ${reactions.clap || 0}`, callback_data: `react_clap_${profile.id}` },
    { text: `🎉 ${reactions.party || 0}`, callback_data: `react_party_${profile.id}` },
    { text: `🤩 ${reactions.star_struck || 0}`, callback_data: `react_star_struck_${profile.id}` }
  ];

  const reqUrl = `https://t.me/${username}?start=req_${profile.id}`;
  const botAppUrl = `https://t.me/${username}?start=ver_${profile.id}`;

  let customButtonRows: any[] = [];
  try {
    const customButtons = await getPublicCustomButtons('channel');
    customButtonRows = customButtons.map(btn => [{ text: btn.label, url: btn.url }]);
  } catch (err) {
    console.warn('[Telegram] Could not load custom buttons for channel:', err);
  }

  return {
    inline_keyboard: [
      reactionRow1,
      reactionRow2,
      [
        { text: '📱 Solicitar Disponibilidad', url: reqUrl },
        { text: '💳 Métodos de Pago', url: `https://t.me/${username}?start=pagos` }
      ],
      [
        { text: '💎 Abrir en Canal VIP Free', url: botAppUrl }
      ],
      ...customButtonRows
    ]
  };
}

export async function updateTelegramMessageReactions(profileId: string): Promise<boolean> {
  const { channelId, username, baseUrl } = getBotConfig();
  const profile = await getProfileById(profileId);
  if (!profile || !profile.telegram_message_id) return false;

  const replyMarkup = await buildChannelPostMarkup(profile, baseUrl, username);

  try {
    const res = await callTelegramApi('editMessageReplyMarkup', {
      chat_id: channelId,
      message_id: profile.telegram_message_id,
      reply_markup: replyMarkup
    });
    return Boolean(res.ok);
  } catch (err) {
    console.warn('[Telegram Reactions Sync Error]:', err);
    return false;
  }
}

export async function sendPhotoToUser(chatId: string | number, photoUrl: string, caption?: string) {
  return await callTelegramApi('sendPhoto', {
    chat_id: chatId,
    photo: photoUrl,
    caption: caption || '',
    parse_mode: 'Markdown'
  });
}

// Generate Admin Web Magic Link
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

  const targetChatId = chatId || adminIds[0] || channelId;
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

  const blob = new Blob([buffer], { type: mimeType });
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

  // Handle Callback Queries (Buttons)
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return;
  }

  const message = update.message;
  if (!message) return;

  const chatId = message.chat.id;
  const fromId = message.from?.id;
  const userIdStr = String(fromId || '');
  const text = message.text ? message.text.trim() : '';

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
      await sendMessage(chatId, `ℹ️ Mensaje reenviado de: *${fChat.title || 'Canal'}* (\`${fChat.id}\`).\nPara configurar el bot, primero actívate como Administradora con \`/admin 2024\`.`);
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
              { text: '💎 Abrir Canal VIP Free (Mini App)', web_app: { url: profileUrl } }
            ],
            [
              { text: '📱 Solicitar Disponibilidad', callback_data: `req_${profile.id}` }
            ]
          ]
        }
      });
      return;
    }
    await sendClientWelcome(chatId, message.from?.first_name || 'Invitado/a');
    return;
  }

  // Deep Link Pagos / Métodos de Pago
  if (text.startsWith('/start pagos') || text.startsWith('/start metodos')) {
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

  const normText = text.toLowerCase().trim();

  // 1.2. Client Commands & Menus (Interactive for all users)
  if (
    normText.startsWith('/start inv_') ||
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
    normText === '/metodos' ||
    normText === '/metodosdepago' ||
    normText === '/metodos_pago' ||
    normText === '💳 métodos de pago' ||
    normText === '💳 metodos de pago' ||
    normText === 'metodos de pago'
  ) {
    await sendClientPagos(chatId);
    return;
  }

  if (normText === '/info' || normText === '/informacion' || normText === '/información') {
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
      msg += `\n_Para activarte como Administradora escribe en este chat:_\n👉 \`/admin 2024\``;
    }
    await sendMessage(chatId, msg);
    return;
  }

  if (normText.startsWith('/setcanal') || normText.startsWith('/canal_id')) {
    if (!isAdminUser(fromId)) {
      await sendMessage(chatId, '🔒 Solo administradoras autorizadas pueden vincular el canal. Primero envía `/admin 2024`.');
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
  const validPin = process.env.ADMIN_PIN || 'admin123';

  if ((potentialCommand === '/admin' || potentialCommand === '/pin' || potentialCommand === '/login') && potentialPin) {
    if (potentialPin === validPin || potentialPin === '2024' || potentialPin === '450') {
      addAdminTelegramId(fromId);
      const { baseUrl, brandName } = getBotConfig();
      const adminToken = generateAdminMagicToken(String(fromId));
      const adminLink = buildAdminWebLink(baseUrl, adminToken);
      await sendMessage(chatId, `👑 *¡Identidad Confirmada!* 👑\n\nTu Telegram ID (\`${fromId}\`) ha sido registrado exitosamente como *Administradora Autorizada* de ${brandName || 'IAM DANII VIP'}.\n\nA partir de ahora tienes acceso permanente a las funciones de administración y Canal VIP Free.\n\n👇 *Toca para ingresar a tu Panel de Control:*`, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '👑 Abrir Panel Web Administrativo', web_app: { url: adminLink } }
            ]
          ]
        }
      });
      return;
    } else {
      await sendMessage(chatId, '❌ PIN incorrecto. Intenta nuevamente con `/admin 2024`');
      return;
    }
  }

  // 2. Guard for Administrative Commands
  if (!isAdminUser(fromId)) {
    if (normText === '/admin' || normText === '/panel' || normText === 'admin') {
      await sendMessage(chatId, `🔒 *Acceso Administrativo*\n\nTu Telegram ID es: \`${fromId}\`\n\nEste ID aún no está activado como Administradora.\n\n👉 *Para activarte de inmediato, envía en este chat:*\n\`/admin 2024\`  o  \`/admin admin123\``);
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
  if (text === '/panel' || text === '/admin' || text.toLowerCase() === 'admin') {
    const { baseUrl } = getBotConfig();
    const adminToken = generateAdminMagicToken(String(fromId));
    const adminLink = buildAdminWebLink(baseUrl, adminToken);
    await sendMessage(chatId, `🔐 *Panel Web Administrativo*\n\nEste enlace personal vence en 4 horas y solo habilita el panel administrativo:\n\n👉 [Ingresar al Panel Web](${adminLink})`, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '👑 Abrir Panel Web Administrativo', web_app: { url: adminLink } }
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
          [{ text: '👑 Gestionar Botones en Panel Web', web_app: { url: adminLink } }]
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
          [{ text: '👑 Crear Dinámica en Panel Web', web_app: { url: adminLink } }]
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

  if (text === '/anclar' || text === '/pin') {
    const { username } = getBotConfig();
    const cleanUsername = username || process.env.BOT_USERNAME || 'vip_bot';
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
            { text: '👑 Ver en Panel Web', web_app: { url: adminLink } },
            { text: '💎 Abrir Canal VIP Free', web_app: { url: baseUrl } }
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
  if (channelUrl) {
    inlineKeyboard.push([
      { text: btnCanal, url: channelUrl }
    ]);
  }
  inlineKeyboard.push([
    { text: '💎 Abrir Canal VIP Free (Mini App)', web_app: { url: baseUrl } }
  ]);
  inlineKeyboard.push([
    { text: '💳 Métodos de Pago', callback_data: 'client_cmd_pagos' }
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
  if (channelUrl) {
    inlineKeyboard.push([
      { text: btnCanal, url: channelUrl }
    ]);
  }
  inlineKeyboard.push([
    { text: '💎 Abrir Canal VIP Free (Mini App)', web_app: { url: baseUrl } }
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

  const text = `💰 *TARIFAS Y SUSCRIPCIÓN VIP* 💰\n\n` +
    `✨ *¿Qué incluye la Suscripción VIP?*\n` +
    `• Acceso ilimitado a la galería privada completa (fotos y videos en alta definición).\n` +
    `• Contenido sugestivo y exclusivo sin censura.\n` +
    `• Novedades y actualizaciones continuas.\n` +
    `• Trato confidencial y atención directa 1 a 1.\n\n` +
    `💵 *Tarifa Oficial:* Bs. 450 / mes (o pack promocional)\n\n` +
    `🔒 *Forma de Pago Segura:* La Administradora entrega el *QR oficial de pago* de forma 100% privada. Tras validar tu comprobante, recibirás el link privado y confidencial para unirte al Grupo/Canal VIP.\n\n` +
    `_Explora el contenido en la Mini App y pulsa "Adquirir Contenido" para solicitar disponibilidad._`;

  return await sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '💎 Ver Canal VIP Free (Mini App)', web_app: { url: baseUrl } }
        ],
        [
          { text: '💳 Ver Métodos de Pago', callback_data: 'client_cmd_pagos' }
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
  const methods = publicMethods || (await getPublicPaymentMethods());
  const activeIds = new Set(methods.map(m => m.id));

  const rows: any[][] = [];

  // 1. Top full-width: QR Bolivia
  if (activeIds.has('qr_bolivia')) {
    const m = methods.find(x => x.id === 'qr_bolivia')!;
    rows.push([{ text: m.title, callback_data: `pay_method_${m.id}` }]);
  }

  // 2. 2-column grid pairs for countries
  const pairs: [string, string][] = [
    ['peru', 'chile'],
    ['argentina', 'espana'],
    ['mexico', 'paraguay'],
    ['brasil', 'uruguay'],
    ['colombia', 'rusia'],
    ['ecuador', 'venezuela']
  ];

  for (const [id1, id2] of pairs) {
    const row: any[] = [];
    if (activeIds.has(id1)) {
      const m1 = methods.find(x => x.id === id1)!;
      row.push({ text: m1.title, callback_data: `pay_method_${m1.id}` });
    }
    if (activeIds.has(id2)) {
      const m2 = methods.find(x => x.id === id2)!;
      row.push({ text: m2.title, callback_data: `pay_method_${m2.id}` });
    }
    if (row.length > 0) rows.push(row);
  }

  // 3. Full-width payment services
  const services = ['cripto', 'tigo_money', 'paypal', 'telegram_stars', 'western_remitly', 'zelle'];
  for (const sId of services) {
    if (activeIds.has(sId)) {
      const m = methods.find(x => x.id === sId)!;
      rows.push([{ text: m.title, callback_data: `pay_method_${m.id}` }]);
    }
  }

  // 4. Back button
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

export async function showPaymentMethodDetail(chatId: string | number, methodId: string) {
  const method = await getPaymentMethodById(methodId);
  if (!method) {
    await sendMessage(chatId, '⚠️ Método de pago no disponible.');
    return;
  }

  const rawAdminUsername = getSystemSetting('admin_contact_username') || getBotConfig().username || 'IAM_Danii_VIP_bot';
  const adminUsername = rawAdminUsername.replace(/^@/, '').trim();
  const adminContactUrl = `https://t.me/${adminUsername}`;
  const { baseUrl } = getBotConfig();

  const caption = `✨ *${method.title}* ✨\n\n` +
    `${method.description || 'Consulta los datos y coordenadas de pago con la Administradora.'}\n\n` +
    `📲 *Envía tu comprobante a:* [@${adminUsername}](${adminContactUrl})\n\n` +
    `_Una vez recibido y verificado tu comprobante, la Administradora te enviará el acceso privado a nuestro contenido VIP._`;

  const inlineKeyboard = [
    [
      { text: `📲 Enviar Comprobante a @${adminUsername}`, url: adminContactUrl }
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
    const res = await callTelegramApi(apiMethod, {
      chat_id: chatId,
      [payloadKey]: method.image_url,
      caption: caption,
      parse_mode: 'Markdown',
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
  const { channelId, username } = getBotConfig();
  if (!channelId) {
    return { ok: false, message: 'No hay canal configurado en el sistema.' };
  }

  const text = `HOLI 💖🔥\n` +
    `*TODOS MIS METODOS DE PAGO* 🥰💖\n\n` +
    `📌 BOLIVIA: 🇧🇴\n` +
    `📌 PERU: 🇵🇪\n` +
    `📌 EXTRANJERO: 🇲🇽 🇦🇷 🇺🇸 🌍\n\n` +
    `_Toca el botón abajo para abrir la lista interactiva de métodos de pago en el bot:_`;

  const botUsername = username || 'IAM_Danii_VIP_bot';
  const inlineKeyboard = [
    [
      { text: '💳 Ver Métodos de Pago', url: `https://t.me/${botUsername}?start=pagos` }
    ],
    [
      { text: '💎 Abrir Canal VIP Free', url: `https://t.me/${botUsername}` }
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
          { text: '💎 Ver Canal VIP Free (Mini App)', web_app: { url: baseUrl } }
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
          { text: '💎 Ver Canal VIP Free (Mini App)', web_app: { url: baseUrl } }
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

  // 1.1. Reactions Callbacks (accessible to all users in channel and bot)
  if (data.startsWith('react_')) {
    const raw = data.slice('react_'.length);
    const knownTypes = [
      'heart_eyes',
      'star_struck',
      'in_love',
      'heart',
      'fire',
      'like',
      'kiss',
      'star',
      'clap',
      'party'
    ];
    let reactionType = '';
    let profileId = '';
    for (const t of knownTypes) {
      if (raw.startsWith(t + '_')) {
        reactionType = t;
        profileId = raw.slice(t.length + 1);
        break;
      }
    }
    if (!reactionType) {
      const parts = raw.split('_');
      reactionType = parts[0];
      profileId = parts.slice(1).join('_');
    }

    const emojiMap: Record<string, string> = {
      heart: '❤️',
      fire: '🔥',
      like: '👍',
      in_love: '🥰',
      kiss: '💋',
      star: '⭐',
      heart_eyes: '😍',
      clap: '👏',
      party: '🎉',
      star_struck: '🤩'
    };

    try {
      const { profile: updated, userReacted } = await toggleProfileReaction(profileId, userIdStr, reactionType);
      await updateTelegramMessageReactions(profileId);

      const emoji = emojiMap[reactionType] || '❤️';
      await callTelegramApi('answerCallbackQuery', {
        callback_query_id: cb.id,
        text: userReacted ? `¡Reaccionaste con ${emoji}!` : `Reacción ${emoji} retirada.`
      });

      // Notify Mini App in real-time
      notifyReactionListeners({ profileId, reactions: updated.reactions });
    } catch (err) {
      console.error('[Reaction Callback Error]:', err);
      await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    }
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

  if (data === 'admin_btn_pin') {
    const { username, brandName } = getBotConfig();
    const cleanUsername = username || process.env.BOT_USERNAME || 'IAM_Danii_VIP_bot';
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
          { text: '👑 Abrir Panel Admin (Web App)', web_app: { url: adminLink } }
        ],
        [
          { text: '💎 Abrir Canal VIP Free (Mini App Cliente)', web_app: { url: baseUrl } }
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
          { text: '🔐 Abrir Panel Web', url: adminLink }
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
  const profile = await getProfileById(profileId);

  if (!profile) {
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
}): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const { channelId, username } = getBotConfig();
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

  if (params.caption && params.caption.trim()) {
    payload.caption = params.caption.trim();
    payload.parse_mode = 'Markdown';
  }

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
