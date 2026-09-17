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
} from './db.js';
import { Profile, ProfileStatus } from '../types.js';
import { uploadBufferToB2, isB2Configured } from './b2Storage.js';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Environment variables
export function getBotConfig() {
  const token = process.env.BOT_TOKEN || '';
  const storedUsername = getSystemSetting('bot_username');
  let rawUsername = process.env.BOT_USERNAME || storedUsername || 'IAM_Danii_VIP_bot';
  if (/ruti|flavia|catalogovip/i.test(rawUsername)) {
    rawUsername = 'IAM_Danii_VIP_bot';
  }
  let username = rawUsername.replace(/^@/, '').trim();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || '';
  const channelId = process.env.CHANNEL_ID || '-1004356066811';
  const adminIds = (process.env.ADMIN_TELEGRAM_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);
  const signingSecret = process.env.ADMIN_SIGNING_SECRET || 'secret_jwt_key_danii_vip';
  const brandName = process.env.VIP_BRAND_NAME || 'IAM DANII VIP';
  const baseUrl = (
    process.env.RENDER_EXTERNAL_URL ||
    process.env.APP_BASE_URL ||
    process.env.APP_URL ||
    'http://localhost:3000'
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
  if (!token || !initData) return { valid: false };

  try {
    const params = new URLSearchParams(initData);
    const receivedHash = params.get('hash');
    if (!receivedHash) return { valid: false };

    params.delete('hash');
    const authDate = Number(params.get('auth_date') || 0);
    if (!authDate || Math.abs(Date.now() / 1000 - authDate) > 24 * 60 * 60) {
      return { valid: false };
    }

    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    const valid = crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(receivedHash, 'hex'));
    const userJson = params.get('user');
    return { valid, user: valid && userJson ? JSON.parse(userJson) : undefined };
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

export async function updateBotMenuButton() {
  const { baseUrl } = getBotConfig();
  return await callTelegramApi('setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: 'Ver Canal VIP Free',
      web_app: {
        url: baseUrl
      }
    }
  });
}

export async function registerBotCommands() {
  return await callTelegramApi('setMyCommands', {
    commands: [
      { command: 'start', description: 'Abrir Catálogo VIP Free' },
      { command: 'canal', description: 'Enlace al Canal Free oficial' },
      { command: 'precios', description: 'Tarifas y suscripciones VIP' },
      { command: 'info', description: 'Información y discreción' },
      { command: 'ayuda', description: 'Soporte y dudas frecuentes' },
      { command: 'admin', description: 'Panel Web (Solo Administradora)' },
      { command: 'respaldo', description: 'Backup Server Mini APP (Servidor Seguro)' }
    ]
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
    allowed_updates: ['message', 'callback_query']
  };
  if (secret) {
    payload.secret_token = secret;
  }

  const res = await callTelegramApi('setWebhook', payload);
  await registerBotCommands().catch(err => console.error('Error registrando comandos:', err));
  await updateBotMenuButton().catch(err => console.error('Error actualizando menu button:', err));
  return res;
}

// Telegram Channel Sync Function
export async function syncProfileToChannel(profileId: string, performer: string = 'Bot Admin'): Promise<{ success: boolean; message: string; telegramMessageId?: number }> {
  const { channelId, username, baseUrl } = getBotConfig();
  const profile = await getProfileById(profileId);

  if (!profile) {
    return { success: false, message: 'Perfil no encontrado en la base de datos' };
  }

  // Safety constraint: strictly >= 18
  if (profile.age < 18) {
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

  const statusBadge = profile.status === 'disponible' ? '🟢 DISPONIBLE' : profile.status === 'ocupada' ? '🔴 OCUPADA' : '⏸️ PAUSADA';

  const { brandName } = getBotConfig();
  const caption = `
✨ *${brandName || 'IAM DANII VIP'}* ✨

👤 *Nombre*: ${profile.name}
🔞 *Edad*: ${profile.age} años (Verificada +18)
💰 *PRECIO SUSCRIPCIÓN VIP*: Bs. ${profile.rate_bs}
📌 *Estado*: ${statusBadge}

📝 *Descripción*:
${profile.description}

─────────────────────────
⚠️ *AVISO DE DISCRECIÓN Y SEGURIDAD*:
• Galería y contenido privado exclusivo para mayores de 18 años.
• Coordinación y acceso confidencial directamente por privado.
`;

  const webUrl = `${baseUrl}/#profile-${profile.id}`;
  const reqUrl = `https://t.me/${username}?start=req_${profile.id}`;

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '📱 Solicitar Disponibilidad', url: reqUrl }
      ],
      [
        { text: '🌐 Ver en Catálogo Web', url: webUrl }
      ]
    ]
  };

  const primaryPhoto = profile.photos && profile.photos.length > 0 ? profile.photos[0] : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80';

  // If already published, attempt edit first
  if (profile.telegram_message_id) {
    const editRes = await callTelegramApi('editMessageCaption', {
      chat_id: channelId,
      message_id: profile.telegram_message_id,
      caption,
      parse_mode: 'Markdown',
      reply_markup: replyMarkup
    });

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

  // Publish new photo message
  const sendRes = await callTelegramApi('sendPhoto', {
    chat_id: channelId,
    photo: primaryPhoto,
    caption,
    parse_mode: 'Markdown',
    reply_markup: replyMarkup
  });

  if (sendRes.ok && sendRes.result?.message_id) {
    const newMsgId = sendRes.result.message_id;
    await saveProfile({ id: profile.id, telegram_message_id: newMsgId });
    await addAuditLog('SYNC_CHANNEL', performer, `Publicado mensaje #${newMsgId} para ${profile.name} en el canal`, profileId);
    return { success: true, message: 'Publicado exitosamente en el canal', telegramMessageId: newMsgId };
  } else {
    const errorMsg = sendRes.description || 'Error al publicar foto en canal Telegram';
    await addSyncError(profileId, 'SEND_PHOTO_CHANNEL', errorMsg);
    return { success: false, message: `Error en Telegram: ${errorMsg}` };
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
export function generateAdminMagicToken(telegramUserId: string): string {
  const { signingSecret } = getBotConfig();
  return jwt.sign(
    { sub: telegramUserId, role: 'admin', iat: Math.floor(Date.now() / 1000) },
    signingSecret,
    { expiresIn: '4h' }
  );
}

export function verifyAdminToken(token: string): { valid: boolean; userId?: string } {
  const { signingSecret } = getBotConfig();
  try {
    const decoded = jwt.verify(token, signingSecret) as any;
    if (decoded && decoded.role === 'admin' && isAdminUser(decoded.sub)) {
      return { valid: true, userId: decoded.sub };
    }
  } catch {
    // invalid token
  }
  return { valid: false };
}

// Webhook Handler for Telegram Updates
export async function processTelegramUpdate(update: any) {
  if (!update) return;

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
      await sendMessage(chatId, '🔒 Abre el chat privado con el bot para ver el catálogo y menú.');
      return;
    }
    if (isAdminUser(fromId)) {
      await clearConversationState(userIdStr);
      await sendAdminWelcome(chatId, message.from?.first_name || 'Administradora');
      return;
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

  // 2. Guard for Administrative Commands
  if (!isAdminUser(fromId)) {
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
    const adminLink = `${baseUrl}/?admin_token=${encodeURIComponent(adminToken)}`;
    await sendMessage(chatId, `🔐 *Panel Web Administrativo*\n\nEste enlace personal vence en 4 horas y solo habilita el panel administrativo:\n\n👉 [Ingresar al Panel Web](${adminLink})`, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔐 Ingresar al Panel Web', url: adminLink }
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

  // Command switch
  if (text === '/start') {
    await clearConversationState(userIdStr);
    await sendAdminWelcome(chatId, message.from?.first_name || 'Administradora');
    return;
  }

  if (text === '/ayuda') {
    await sendAdminHelp(chatId);
    return;
  }

  if (text === '/anclar' || text === '/pin') {
    const { baseUrl, username } = getBotConfig();
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

  const caption = (message.caption || '').toLowerCase();
  const isBackupCaption = caption.includes('#respaldo') || caption.includes('#backup') || caption.includes('/respaldo') || caption.includes('/backup');
  if (isBackupCaption && (message.photo || message.video || message.document)) {
    await handleBackupUploadFromTelegram(chatId, userIdStr, message);
    return;
  }

  if (text === '/respaldo' || text === '/backup' || text === '/respaldar') {
    await setConversationState(userIdStr, 'BACKUP_MODE', {});
    await sendBackupModeInstructions(chatId, userIdStr);
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

  // Fallback for unexpected messages
  if (text.startsWith('/')) {
    await sendMessage(chatId, '❓ *Comando no reconocido*. Escribe /ayuda para ver los comandos disponibles.');
  }
}

// Conversation Steps Processor
async function handleConversationStep(chatId: string | number, userId: string, message: any, state: any) {
  const text = message.text ? message.text.trim() : '';

  switch (state.step) {
    case 'BACKUP_MODE': {
      if (text === '/fin' || text === '/salir' || text === '/cancelar') {
        await clearConversationState(userId);
        await sendMessage(chatId, '✅ *Modo Respaldo Finalizado*. Has regresado al menú principal.');
        return;
      }
      await handleBackupUploadFromTelegram(chatId, userId, message);
      break;
    }

    case 'NEW_NAME': {
      if (!text) {
        await sendMessage(chatId, '⚠️ Por favor envía un nombre válido.');
        return;
      }
      state.draft_data.name = text;
      state.step = 'NEW_AGE';
      await setConversationState(userId, 'NEW_AGE', state.draft_data);
      await sendMessage(chatId, `✅ Nombre: *${text}*\n\n🔞 *(Paso 2/8)* Ingrese la *Edad* (debe ser mayor o igual a 18 años):`);
      break;
    }

    case 'NEW_AGE': {
      const age = parseInt(text, 10);
      if (isNaN(age) || age < 18) {
        await sendMessage(chatId, '❌ *ERROR DE VALIDACIÓN Y REGLA LEGAL*: La edad debe ser un número mayor o igual a 18 años. Inténtelo de nuevo:');
        return;
      }
      state.draft_data.age = age;
      state.draft_data.zone = 'Contenido +18 VIP';
      state.step = 'NEW_RATE';
      await setConversationState(userId, 'NEW_RATE', state.draft_data);
      await sendMessage(chatId, `✅ Edad: *${age} años*\n\n💰 *(Paso 3/5)* Ingrese el *PRECIO SUSCRIPCIÓN / PACK en Bolivianos (Bs.)* (ej. 150):`);
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
📋 *VISTA PREVIA DE NUEVO PERFIL (Paso 8/8)*

👤 *Nombre*: ${state.draft_data.name}
🔞 *Edad*: ${state.draft_data.age} años
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
  return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80';
}

async function sendBackupModeInstructions(chatId: string | number, userId: string) {
  const backupIntro = `💾 *BACKUP SERVER MINI APP — SERVIDOR SEGURO B2* 💾\n\n` +
    `🔒 *Modo Servidor Seguro Activado (Backblaze B2)*\n\n` +
    `Puedes enviarme directamente en este chat:\n` +
    `📸 *Fotografías* (JPG, PNG, WEBP)\n` +
    `🎥 *Videos* (MP4, MOV, WEBM)\n` +
    `📁 *Documentos o Archivos Multimedia*\n\n` +
    `⚠️ *Condiciones del Servidor Seguro*:\n` +
    `• Tamaño: *Igual o menor a 20 MB* por archivo (Límite oficial Telegram Bot API).\n` +
    `• Destino: Carpeta privada segura \`tu-vip/backups/admin_${userId}/\`.\n` +
    `• 🚫 *Aislamiento Total*: NINGÚN archivo de respaldo se publicará en el canal ni se agregará al catálogo público de la Mini App.\n\n` +
    `👉 *Envía tus fotos o videos ahora*, o pulsa el botón abajo para salir:`;

  await sendMessage(chatId, backupIntro, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '❌ Finalizar Backup', callback_data: 'admin_btn_exit_backup' }
        ]
      ]
    }
  });
}

async function handleBackupUploadFromTelegram(chatId: string | number, userId: string, message: any) {
  const { token } = getBotConfig();

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
    await sendMessage(chatId, '⚠️ Por favor envía una foto o video válido para respaldar, o pulsa abajo para salir.', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '❌ Finalizar Backup', callback_data: 'admin_btn_exit_backup' }]
        ]
      }
    });
    return;
  }

  const maxBytes = 20 * 1024 * 1024; // 20 MB Telegram Bot API limit
  if (fileSize > maxBytes) {
    const sizeMb = (fileSize / (1024 * 1024)).toFixed(1);
    await sendMessage(chatId, `⚠️ *Archivo demasiado grande para Telegram Bot API*\n\nPeso: *${sizeMb} MB* (Límite: 20 MB).\n\n💡 Telegram no permite que bots descarguen archivos mayores a 20 MB.\n👉 Para videos pesados de más de 20 MB, por favor súbelos directamente desde la pestaña *"Backup Server"* en el Panel Web Administrativo.`);
    return;
  }

  await sendMessage(chatId, `⏳ *Descargando y respaldando en Servidor Seguro B2...*\nArchivo: \`${fileName}\``);

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

    // Upload to Backblaze B2 under tu-vip/backups/admin_{userId}/
    const subfolder = `backups/admin_${userId}`;
    const objectKey = await uploadBufferToB2(buffer, fileName, mimeType, subfolder);

    const sizeFormatted = fileSize < 1024 * 1024
      ? `${(fileSize / 1024).toFixed(1)} KB`
      : `${(fileSize / (1024 * 1024)).toFixed(2)} MB`;

    await addAuditLog('BACKUP_MEDIA_TELEGRAM', userId, `Archivo respaldado en B2: ${fileName} (${sizeFormatted})`);

    const reply = `✅ *¡Archivo Respaldado con Éxito en Servidor Seguro B2!* 💾\n\n` +
      `📁 *Archivo*: \`${fileName}\`\n` +
      `📦 *Tamaño*: \`${sizeFormatted}\`\n` +
      `🔒 *Ubicación Privada*: \`${objectKey}\`\n` +
      `🚫 *Aislamiento*: Privado (No publicado en catálogo)\n\n` +
      `_Envía otro archivo para seguir respaldando o pulsa abajo para finalizar._`;

    await sendMessage(chatId, reply, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '❌ Finalizar Backup', callback_data: 'admin_btn_exit_backup' }]
        ]
      }
    });
  } catch (error: any) {
    console.error('[Telegram Backup Error]:', error);
    await sendMessage(chatId, `❌ *Error al respaldar archivo*: ${error.message || 'Error desconocido'}`);
  }
}

export async function sendClientWelcome(chatId: string | number, firstName: string = 'Invitado/a') {
  const { baseUrl, username, brandName } = getBotConfig();
  const cleanUsername = username || process.env.BOT_USERNAME || 'IAM_Danii_VIP_bot';
  const inviteLink = `https://t.me/${cleanUsername}?start=inv_vip`;

  const text = `💎 *${brandName || 'IAM DANII'} • CANAL VIP FREE (+18)* 💎\n\n` +
    `¡Hola, *${firstName}*! Te damos la bienvenida a nuestro espacio oficial.\n\n` +
    `Aquí podrás explorar avances exclusivos, teasers promocionales y acceder a la galería privada de contenido (+18).\n\n` +
    `📲 *Enlace de Invitación Oficial:*\n` +
    `👉 \`${inviteLink}\`\n\n` +
    `👇 *Selecciona una opción:*`;

  return await sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '💎 Ver Canal VIP Free (Mini App)', web_app: { url: baseUrl } }
        ],
        [
          { text: '📢 Ver Canal Free', callback_data: 'client_cmd_canal' }
        ],
        [
          { text: '💰 Tarifas y Precios', callback_data: 'client_cmd_precios' },
          { text: 'ℹ️ Información VIP', callback_data: 'client_cmd_info' }
        ],
        [
          { text: '❓ Ayuda y Soporte', callback_data: 'client_cmd_ayuda' }
        ]
      ]
    }
  });
}

export async function sendClientCanal(chatId: string | number) {
  const { baseUrl, channelId } = getBotConfig();
  const cleanChannelId = channelId.replace(/^-100/, '');
  const channelUrl = `https://t.me/c/${cleanChannelId}/1`;

  const text = `📢 *CANAL OFICIAL FREE (+18)* 📢\n\n` +
    `En nuestro canal compartimos previews, novedades y promociones especiales.\n\n` +
    `👉 *Abre la Mini App para ver la galería completa sin censura:*`;

  return await sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '💎 Ver Canal VIP Free (Mini App)', web_app: { url: baseUrl } }
        ],
        [
          { text: '🔙 Volver al Menú', callback_data: 'client_cmd_menu' }
        ]
      ]
    }
  });
}

export async function sendClientPrecios(chatId: string | number) {
  const { baseUrl } = getBotConfig();
  const text = `💰 *TARIFAS Y SUSCRIPCIÓN VIP (+18)* 💰\n\n` +
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
          { text: 'ℹ️ Información y Seguridad', callback_data: 'client_cmd_info' },
          { text: '🔙 Volver al Menú', callback_data: 'client_cmd_menu' }
        ]
      ]
    }
  });
}

export async function sendClientInfo(chatId: string | number) {
  const { baseUrl } = getBotConfig();
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
          { text: '💰 Ver Tarifas y Precios', callback_data: 'client_cmd_precios' },
          { text: '🔙 Volver al Menú', callback_data: 'client_cmd_menu' }
        ]
      ]
    }
  });
}

export async function sendClientAyuda(chatId: string | number) {
  const { baseUrl } = getBotConfig();
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
          { text: '💰 Ver Precios', callback_data: 'client_cmd_precios' },
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
    } else if (data === 'client_cmd_info') {
      await sendClientInfo(chatId);
    } else if (data === 'client_cmd_ayuda') {
      await sendClientAyuda(chatId);
    } else if (data === 'client_cmd_menu') {
      await sendClientWelcome(chatId, cb.from?.first_name || 'Invitado/a');
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
  if (data === 'admin_btn_backup') {
    await setConversationState(userIdStr, 'BACKUP_MODE', {});
    await sendBackupModeInstructions(chatId, userIdStr);
    return;
  }

  if (data === 'admin_btn_exit_backup') {
    await clearConversationState(userIdStr);
    await sendMessage(chatId, '✅ *Modo Respaldo Finalizado*. Has regresado al menú administrativo.');
    return;
  }

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
    const { baseUrl, username, brandName } = getBotConfig();
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
  const adminLink = `${baseUrl}/?admin_token=${encodeURIComponent(adminToken)}`;

  const msg = `👑 *¡Bienvenida, Administradora ${name}!* 👑\n\n` +
    `Sistema de Gestión — *${brandName || 'IAM DANII VIP'} (+18)*.\n\n` +
    `👇 *Acciones Rápidas con Botones:*\n` +
    `Pulsa un botón para gestionar o escribe los comandos manuales:\n\n` +
    `💾 *[ 💾 Backup Server Mini APP ]* ⬅️ _(Click para Activar Servidor seguro B2)_`;

  await sendMessage(chatId, msg, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🔐 Abrir Panel Web Administrativo', url: adminLink }
        ],
        [
          { text: '💾 Backup Server Mini APP', callback_data: 'admin_btn_backup' }
        ],
        [
          { text: '➕ Nuevo Perfil', callback_data: 'admin_btn_new' },
          { text: '📋 Listar Perfiles', callback_data: 'admin_btn_list' }
        ],
        [
          { text: '📌 Fijar Anuncio en Canal', callback_data: 'admin_btn_pin' },
          { text: '📖 Manual / Ayuda Admin', callback_data: 'admin_btn_help' }
        ]
      ]
    }
  });
}

async function sendAdminHelp(chatId: string | number) {
  const { baseUrl, brandName } = getBotConfig();
  const adminToken = generateAdminMagicToken(String(chatId));
  const adminLink = `${baseUrl}/?admin_token=${encodeURIComponent(adminToken)}`;

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
          { text: '➕ Nuevo Perfil', callback_data: 'admin_btn_new' },
          { text: '📋 Listar Perfiles', callback_data: 'admin_btn_list' }
        ]
      ]
    }
  });
}

async function handleListProfiles(chatId: string | number) {
  const profiles = await getAllProfiles();
  if (profiles.length === 0) {
    await sendMessage(chatId, '📭 No hay perfiles registrados en el catálogo. Usa /nuevo para crear uno.');
    return;
  }

  let text = '📋 *LISTADO DE PERFILES DEL CATÁLOGO*:\n\n';
  profiles.forEach(p => {
    const badge = p.status === 'disponible' ? '🟢 Disponible' : p.status === 'ocupada' ? '🔴 Ocupada' : p.status === 'pausada' ? '⏸️ Pausada' : p.status === 'retirada' ? '🗑️ Retirada' : '📁 Borrador';
    text += `• *${p.name}* (${p.age}a) - ${badge}\n  ID: \`${p.id}\` | Zona: ${p.zone} | Tarifa: Bs. ${p.rate_bs}\n\n`;
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
🔞 *Edad*: ${profile.age} años
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

async function handleStartEditProfile(chatId: string | number, userId: string, id: string) {
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
          { text: 'Edad (+18)', callback_data: `edit_field_age_${id}` },
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
  await sendMessage(chatId, `⏸️ *Perfil ${profile.name} Pausado*.\nOculto del catálogo público.\n\nSincronización: ${result.message}`);
}

async function handleRetireCommand(chatId: string | number, id: string) {
  const profile = await getProfileById(id);
  if (!profile) {
    await sendMessage(chatId, `❌ Perfil \`${id}\` no encontrado.`);
    return;
  }
  await saveProfile({ id, status: 'retirada' });
  const result = await syncProfileToChannel(id, 'Admin Telegram');
  await sendMessage(chatId, `🗑️ *Perfil ${profile.name} Retirado* del catálogo y canal.\n\n${result.message}`);
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
  const request = await createCustomerRequest({
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
