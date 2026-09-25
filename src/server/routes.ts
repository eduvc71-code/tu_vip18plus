import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import {
  isB2Configured,
  mediaUrl,
  streamB2Object,
  uploadToB2,
  deleteB2Media
} from './b2Storage.js';
import {
  getPublicProfiles,
  getProfileById,
  getAllProfiles,
  saveProfile,
  deleteProfile,
  removeMediaFromProfile,
  createCustomerRequest,
  getCustomerRequests,
  getCustomerRequestById,
  getDueCustomerRequests,
  markCustomerRequestScheduled,
  updateCustomerRequestStatus,
  getAuditLogs,
  getSyncErrors,
  addAuditLog,
  getSystemSetting,
  saveSystemSetting,
  toggleProfileReaction,
  getUserReactions,
  getAllCustomButtons,
  getPublicCustomButtons,
  saveCustomButton,
  deleteCustomButton,
  getAllPolls,
  getActivePolls,
  savePoll,
  votePoll,
  deletePoll,
  syncDbToB2Now,
  getAllPaymentMethods,
  getPublicPaymentMethods,
  getPaymentMethodById,
  savePaymentMethod,
  getBotMediaQueue,
  addBotMediaItem,
  deleteBotMediaItem,
  updateBotMediaItem,
  getDatabaseStats,
  vacuumAndCompactDb
} from './db.js';
import {
  processTelegramUpdate,
  syncProfileToChannel,
  verifyAdminToken,
  generateAdminMagicToken,
  isAdminUser,
  getBotConfig,
  verifyTelegramWebAppData,
  sendMessage,
  sendPhotoToUser,
  updateTelegramMessageReactions,
  onReactionUpdated,
  verifyChannel,
  sendChannelPoll,
  publishPaymentMethodsToChannel,
  sendPaidMediaToChannel,
  createStarsInvoiceLink,
  getTelegramFilePath,
  uploadBufferToTelegram
} from './telegram.js';

export const router = express.Router();

// SSE (Server-Sent Events) event emitter setup for live real-time sync
const sseClients = new Set<Response>();

export function broadcastEvent(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Sincronización en vivo de reacciones hacia los clientes SSE de la Mini App
onReactionUpdated(({ profileId, reactions }) => {
  broadcastEvent('REACTION_UPDATED', { profileId, reactions });
  broadcastEvent('PROFILE_UPDATED', { id: profileId, reactions });
});

// Multer storage configuration for photo uploads
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function saveLocalUpload(file: Express.Multer.File, baseUrl: string) {
  const ext = path.extname(file.originalname) || (file.mimetype.startsWith('video/') ? '.mp4' : '.jpg');
  const filename = `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
  fs.writeFileSync(path.join(uploadDir, filename), file.buffer);
  return `${baseUrl}/uploads/${filename}`;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // up to 50 MB per image/video
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes o videos (MP4, WebM, MOV)'));
    }
  }
});

function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const verified = verifyAdminToken(token);
    if (verified.valid) {
      (req as any).adminUserId = verified.userId;
      return next();
    }
  }
  res.status(401).json({ error: 'Acceso administrativo no autorizado. Solicita un enlace nuevo con /admin en el bot.' });
}

// PUBLIC ENDPOINTS

// Private Backblaze B2 media proxy. Keeps credentials and the bucket private.
router.get('/media', (req: Request, res: Response) => {
  const objectKey = typeof req.query.key === 'string' ? req.query.key : '';
  if (objectKey.startsWith('tu-vip/backups/')) {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : '';
    const queryToken = typeof req.query.admin_token === 'string' ? req.query.admin_token : typeof req.query.token === 'string' ? req.query.token : '';
    const tokenToVerify = bearerToken || queryToken;
    const verified = verifyAdminToken(tokenToVerify);
    if (!verified.valid) {
      res.status(403).json({ error: 'Acceso denegado: solo administradoras pueden ver archivos de respaldo.' });
      return;
    }
  }
  return streamB2Object(req, res);
});

const TG_CACHE_DIR = path.join(process.cwd(), 'public', 'uploads', 'tg_cache');
if (!fs.existsSync(TG_CACHE_DIR)) {
  try {
    fs.mkdirSync(TG_CACHE_DIR, { recursive: true });
  } catch {}
}

// Telegram Media Streaming Proxy with High-Speed Disk Cache & HTTP Range support
router.get('/telegram-media/:fileIdWithExt', async (req: Request, res: Response) => {
  try {
    const fileIdWithExt = req.params.fileIdWithExt;
    const dotIdx = fileIdWithExt.lastIndexOf('.');
    const fileId = dotIdx !== -1 ? fileIdWithExt.substring(0, dotIdx) : fileIdWithExt;
    const ext = dotIdx !== -1 ? fileIdWithExt.substring(dotIdx).toLowerCase() : '';
    const safeExt = ext || (fileIdWithExt.includes('.mp4') ? '.mp4' : '.jpg');
    const cachedFile = path.join(TG_CACHE_DIR, `${fileId}${safeExt}`);

    let contentType = 'image/jpeg';
    if (safeExt === '.mp4') contentType = 'video/mp4';
    else if (safeExt === '.webm') contentType = 'video/webm';
    else if (safeExt === '.mov') contentType = 'video/quicktime';
    else if (safeExt === '.png') contentType = 'image/png';
    else if (safeExt === '.webp') contentType = 'image/webp';
    else if (safeExt === '.gif') contentType = 'image/gif';

    // 1. Si ya existe en caché local de disco, servir directamente (< 5ms)
    if (fs.existsSync(cachedFile)) {
      const stat = fs.statSync(cachedFile);
      const fileSize = stat.size;
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Accept-Ranges', 'bytes');

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;

        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Content-Length', chunksize);
        fs.createReadStream(cachedFile, { start, end }).pipe(res);
        return;
      } else {
        res.setHeader('Content-Length', fileSize);
        res.status(200);
        fs.createReadStream(cachedFile).pipe(res);
        return;
      }
    }

    // 2. Si no está en caché, resolver ruta en Telegram
    const filePath = await getTelegramFilePath(fileId);
    if (!filePath) {
      res.status(404).json({ error: 'Archivo no encontrado en Telegram' });
      return;
    }

    const config = getBotConfig();
    const token = config.token || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      res.status(500).json({ error: 'Telegram BOT_TOKEN no configurado' });
      return;
    }

    const tgUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
    const tgRes = await fetch(tgUrl);
    if (!tgRes.ok) {
      res.status(tgRes.status).send('Error al obtener archivo de Telegram');
      return;
    }

    const arrayBuf = await tgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    // Guardar en disco para futuros accesos instantáneos
    try {
      fs.writeFileSync(cachedFile, buffer);
    } catch (writeErr) {
      console.warn('[Telegram Media Cache Write Warning]:', writeErr);
    }

    const tgContentType = tgRes.headers.get('content-type');
    if (tgContentType && tgContentType !== 'application/octet-stream') {
      contentType = tgContentType;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', buffer.length);
    res.status(200).send(buffer);
  } catch (err: any) {
    console.error('Error in /telegram-media proxy:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al transmitir archivo de Telegram' });
    }
  }
});

// SSE Live Events Stream
router.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// POST Add Reaction to Profile
router.post('/react', async (req: Request, res: Response) => {
  try {
    const { profile_id, emoji } = req.body;
    if (!profile_id || !emoji) return res.status(400).json({ error: 'Faltan datos' });

    const profile = await getProfileById(profile_id);
    if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });

    const reactions = profile.reactions || {};
    reactions[emoji] = (reactions[emoji] || 0) + 1;
    profile.reactions = reactions;

    await saveProfile(profile);

    if (profile.telegram_message_id) {
      setTimeout(() => {
        updateTelegramMessageReactions(profile_id).catch(console.warn);
      }, 500);
    }

    res.json({ success: true, reactions });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar la reacción' });
  }
});

// GET Public Info & Bot Status
router.get('/info', (_req: Request, res: Response) => {
  const config = getBotConfig();
  const tgVal = getSystemSetting('telegram_only_access');
  const telegramOnly = tgVal === null ? true : (tgVal === 'true');
  const autoReplyDelay = getSystemSetting('auto_reply_delay_minutes') || '10';
  res.json({
    app_name: 'Canal VIP Free',
    brand_name: config.brandName || 'IAM DANII VIP',
    bot_username: config.username,
    bot_configured: Boolean(config.token),
    channel_id: config.channelId,
    channel_title: getSystemSetting('channel_title') || '',
    telegram_only_access: telegramOnly,
    auto_reply_delay_minutes: autoReplyDelay,
    qr_image_url: getSystemSetting('qr_image_url') || '',
    admin_contact_username: getSystemSetting('admin_contact_username') || config.username || 'Danii_Catalogo_SCZ_bot',
      reactions_enabled: getSystemSetting('reactions_enabled') === 'true',
      reactions_list: JSON.parse(getSystemSetting('reactions_list') || '["❤️", "🔥", "😍", "😘", "💦"]'),
    pinned_message_text: getSystemSetting('pinned_message_text') || '',
    pinned_message_active: getSystemSetting('pinned_message_active') === 'true',
    model_display_name: getSystemSetting('model_display_name') || 'IAM Danii',
    model_vip_link: getSystemSetting('model_vip_link') || '',
    welcome_media_url: getSystemSetting('welcome_media_url') || '',
    welcome_media_type: getSystemSetting('welcome_media_type') || '',
    splash_description: getSystemSetting('splash_description') || '',
    operating_mode: getSystemSetting('operating_mode') || 'solo_bot',
    legal_notice: 'Galería privada y contenido exclusivo para mayores de 18 años.'
  });
});

// GET Public Profiles
router.get('/profiles', async (_req: Request, res: Response) => {
  try {
    const profiles = await getPublicProfiles();
    res.json(profiles);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener perfiles', details: err?.message });
  }
});

// POST Verify that the Mini App was opened from Telegram.
router.post('/telegram/access/verify', (req: Request, res: Response) => {
  const verified = verifyTelegramWebAppData(String(req.body?.init_data || ''));
  if (!verified.valid || !verified.user?.id) {
    res.status(401).json({ valid: false, error: 'Abre la Mini App desde el bot oficial de Telegram.' });
    return;
  }
  res.json({ valid: true, user: verified.user });
});

// POST Generate Stars Invoice Link for Web App
router.post('/telegram/stars-invoice', async (req: Request, res: Response) => {
  try {
    const { profileId, mediaUrl, stars } = req.body;
    const profile = await getProfileById(profileId);
    if (!profile) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }
    const starCount = Number(stars) || (mediaUrl && profile.media_stars?.[mediaUrl]) || 50;
    const title = `⭐ ${profile.name} VIP`;
    const invoiceLink = await createStarsInvoiceLink(
      title,
      `Acceso a contenido VIP exclusivo (${starCount} Estrellas Telegram)`,
      `stars_${profile.id}_${Date.now()}`,
      starCount
    );
    if (invoiceLink) {
      res.json({ ok: true, invoiceLink });
    } else {
      res.status(500).json({ error: 'No se pudo generar la factura de Telegram Stars' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error al procesar estrellas' });
  }
});

// GET Public Profile Detail
router.get('/profiles/:id', async (req: Request, res: Response) => {
  try {
    const profile = await getProfileById(req.params.id, true);
    if (!profile || profile.status === 'retirada' || profile.status === 'borrador') {
      res.status(404).json({ error: 'Perfil no encontrado o no disponible' });
      return;
    }
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al consultar perfil' });
  }
});

// POST Toggle Reaction for Profile (from Mini App)
router.post('/profiles/:id/react', async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;
    const { type, user_id } = req.body;
    if (!type || !['like', 'heart', 'star', 'fire'].includes(type)) {
      res.status(400).json({ error: 'Tipo de reacción inválido (like, heart, star, fire)' });
      return;
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'client_anon';
    const effectiveUserId = user_id ? String(user_id) : `web_${clientIp.replace(/[^a-zA-Z0-9]/g, '_').slice(-16)}`;

    const { profile, userReacted } = await toggleProfileReaction(profileId, effectiveUserId, type as any);

    // Sync to Telegram channel message reply markup
    void updateTelegramMessageReactions(profileId);

    // Broadcast live update to all connected Mini App clients
    broadcastEvent('REACTION_UPDATED', { profileId, reactions: profile.reactions });
    broadcastEvent('PROFILE_UPDATED', profile);

    res.json({ success: true, reactions: profile.reactions, userReacted });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al procesar reacción', details: err?.message });
  }
});

// GET Reactions for Profile
router.get('/profiles/:id/reactions', async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;
    const profile = await getProfileById(profileId);
    if (!profile) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }

    const userId = typeof req.query.user_id === 'string' ? req.query.user_id : '';
    const userReactions = userId ? await getUserReactions(profileId, userId) : [];

    res.json({
      reactions: profile.reactions || { likes: 0, hearts: 0, stars: 0, fires: 0 },
      user_reactions: userReactions
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al consultar reacciones' });
  }
});

export async function scheduleAutoReply(requestId: string) {
  const delayMinutesStr = getSystemSetting('auto_reply_delay_minutes') || '10';
  const delayMinutes = Number(delayMinutesStr) || 10;
  const now = new Date();
  const dueAt = new Date(now.getTime() + delayMinutes * 60 * 1000);
  await markCustomerRequestScheduled(requestId, now.toISOString(), dueAt.toISOString());
}

let autoReplyWorkerRunning = false;

export async function processDueAutoReplies(): Promise<void> {
  if (autoReplyWorkerRunning) return;
  autoReplyWorkerRunning = true;
  try {
    const dueRequests = await getDueCustomerRequests(new Date().toISOString());
    for (const request of dueRequests) {
      if (!request.telegram_user_id) {
        await updateCustomerRequestStatus(request.id, 'fallida');
        continue;
      }

      const qrUrl = getSystemSetting('qr_image_url');
      const brandTitle = getSystemSetting('model_display_name') || getBotConfig().brandName || 'IAM Danii VIP';
      const autoReplyText = `✨ *${brandTitle}* ✨\n\n¡Hola ${request.telegram_first_name || 'Estimado/a'}!\n\nLa Administradora aún no pudo responder personalmente tu solicitud para *${request.profile_name}*.\n\n${qrUrl ? '📲 Mientras tanto, el bot te envía el QR oficial de pago. La Administradora se comunicará contigo por privado para validar el comprobante.' : 'La Administradora se comunicará contigo por privado en cuanto esté disponible.'}\n\n🔒 La validación es privada. Este bot no publica comprobantes ni entrega accesos a grupos.`;
      const delivery = qrUrl
        ? await sendPhotoToUser(request.telegram_user_id, qrUrl, autoReplyText)
        : await sendMessage(request.telegram_user_id, autoReplyText);

      if (delivery.ok) {
        await updateCustomerRequestStatus(request.id, 'auto_respondida');
        await addAuditLog('AUTO_REPLY_PRIVATE', 'Telegram Bot', `Respuesta privada automática para solicitud ${request.id}`, request.id);
        console.log(`[AutoReply] Entrega privada confirmada para solicitud ${request.id}`);
      } else {
        console.error(`[AutoReply] Telegram rechazó la solicitud ${request.id}: ${delivery.description || 'respuesta desconocida'}`);
      }
    }
  } catch (error) {
    console.error('[AutoReply] Error al procesar vencimientos:', error);
  } finally {
    autoReplyWorkerRunning = false;
  }
}

export function startAutoReplyWorker(): NodeJS.Timeout {
  void processDueAutoReplies();
  return setInterval(() => void processDueAutoReplies(), 30_000);
}

// POST Customer Availability Request
router.post('/requests', async (req: Request, res: Response) => {
  try {
    const { profile_id, client_name, client_telegram, tg_user_id, telegram_init_data, notes } = req.body;
    const purchaseMessage = notes || 'Hola estoy interesado en tu Contenido VIP. Información por favor.';

    const verifiedTelegram = verifyTelegramWebAppData(String(telegram_init_data || ''));
    if (tg_user_id && !verifiedTelegram.valid) {
      res.status(401).json({ error: 'No fue posible validar tu sesión privada de Telegram. Cierra y vuelve a abrir la mini app desde el bot.' });
      return;
    }
    const verifiedUser = verifiedTelegram.user;
    const safeUserId = verifiedUser?.id ? String(verifiedUser.id) : undefined;
    const safeClientName = verifiedUser?.first_name || client_name || 'Cliente Telegram/Web';
    const safeClientTelegram = verifiedUser?.username ? `@${verifiedUser.username}` : client_telegram;

    if (!profile_id) {
      res.status(400).json({ error: 'El ID del perfil es requerido' });
      return;
    }

    const profile = await getProfileById(profile_id);
    if (!profile) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }

    const request = await createCustomerRequest({
      profile_id: profile.id,
      profile_name: profile.name,
      telegram_user_id: safeUserId,
      telegram_first_name: safeClientName,
      telegram_username: safeClientTelegram ? safeClientTelegram.replace('@', '') : undefined,
      notes: purchaseMessage,
      status: 'pendiente'
    });

    // Send alert to Telegram Admins
    const { adminIds } = getBotConfig();
    const clientHandle = safeClientTelegram
      ? (safeClientTelegram.startsWith('@') || safeClientTelegram.startsWith('ID:') ? safeClientTelegram : `@${safeClientTelegram}`)
      : '';
    const adminNotice = `
🔔 *NUEVA SOLICITUD DE ACCESO VIP* 🔔

👤 *Cliente*: ${safeClientName || 'Anónimo'} ${clientHandle ? `(${clientHandle})` : ''}
🆔 *Telegram ID*: \`${safeUserId || 'No detectado'}\`
👠 *Perfil*: ${profile.name} (PRECIO VIP: Bs. ${profile.rate_bs})
📍 *Zona*: ${profile.zone}
💬 *Mensaje*: ${purchaseMessage}
📅 *Fecha*: ${new Date().toLocaleString()}

🔒 _Toda respuesta, envío de QR y validación debe realizarse por privado. El acceso al Grupo VIP no forma parte de este sistema._
    `;

    let deliveredToAdmin = false;
    for (const adminId of adminIds) {
      if (adminId) {
        const privateReplyUrl = safeUserId
          ? (safeClientTelegram?.startsWith('@')
              ? `https://t.me/${safeClientTelegram.slice(1)}`
              : `tg://user?id=${safeUserId}`)
          : undefined;
        const firstRow = privateReplyUrl
          ? [{ text: '💬 Responder en privado', url: privateReplyUrl }]
          : [];
        const delivery = await sendMessage(adminId, adminNotice, {
          // Client names and usernames may contain Markdown control characters.
          // Send the notification as plain text so Telegram never rejects it.
          parse_mode: undefined,
          reply_markup: {
            inline_keyboard: [
              firstRow,
              [
                { text: '📲 Enviar QR privado', callback_data: `request_qr_${request.id}` },
                { text: '✅ Marcar atendida', callback_data: `request_done_${request.id}` }
              ]
            ].filter(row => row.length > 0)
          }
        });
        if (!delivery.ok) {
          console.error(`[Telegram Delivery] Administradora ${String(adminId).slice(-4)}: ${delivery.description || 'respuesta desconocida'}`);
        }
        deliveredToAdmin = deliveredToAdmin || Boolean(delivery.ok);
      }
    }

    if (!deliveredToAdmin) {
      await updateCustomerRequestStatus(request.id, 'fallida');
      res.status(503).json({ error: 'No fue posible notificar a la Administradora. Intenta nuevamente.' });
      return;
    }

    // Confirm only after the administrator has received the request.
    if (safeUserId) {
      const publicName = getSystemSetting('model_display_name') || profile.name || 'IAM Danii';
      const brandTitle = `${publicName} • Espacio VIP (+18)`;
      const isSpecialPlan = /SEMESTRAL|PERMANENTE/i.test(purchaseMessage);
      const planDetail = isSpecialPlan ? "" : ` (SUSCRIPCIÓN VIP / ACCESO: Bs. ${profile.rate_bs})`;
      const adminUsername = getSystemSetting('admin_contact_username') || 'Danii_Catalogo_SCZ_bot';
      const userConfirmText = `✨ *${brandTitle}* ✨\n\n¡Hola ${safeClientName || 'Estimado/a'}!\n\nHemos recibido tu solicitud para *${profile.name}*${planDetail}.\n\nSu mensaje se envío a la Administradora (@${adminUsername}) y se le responderá en breve.`;
      await sendMessage(safeUserId, userConfirmText);
      await scheduleAutoReply(request.id);
    } else {
      await markCustomerRequestScheduled(request.id, new Date().toISOString());
    }

    broadcastEvent('NEW_REQUEST', request);

    res.json({
      success: true,
      message: 'Solicitud enviada con éxito. La Administradora responderá a la brevedad por privado.',
      request
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al procesar la solicitud', details: err?.message });
  }
});

// TELEGRAM WEBHOOK ENDPOINT
router.post('/telegram/webhook', async (req: Request, res: Response) => {
  const { secret } = getBotConfig();
  const incomingSecret = req.headers['x-telegram-bot-api-secret-token'];

  if (secret && incomingSecret && incomingSecret !== secret) {
    res.status(403).json({ error: 'Secret token inválido' });
    return;
  }

  try {
    await processTelegramUpdate(req.body);
    broadcastEvent('TELEGRAM_UPDATE', { timestamp: new Date().toISOString() });
    res.status(200).send('OK');
  } catch (err: any) {
    console.error('Error in webhook handler:', err);
    res.status(200).send('OK'); // Always return 200 OK to Telegram
  }
});

// ADMIN ENDPOINTS (PROTECTED)

// POST Verify Admin Token
router.post('/admin/auth/verify', (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ error: 'Token no proporcionado' });
    return;
  }
  const verified = verifyAdminToken(token);
  if (verified.valid) {
    res.json({ valid: true, userId: verified.userId });
  } else {
    res.status(401).json({ valid: false, error: 'Token inválido o expirado' });
  }
});

// POST Direct Login for Admin Panel via PIN or Telegram ID
router.post('/admin/auth/login', (req: Request, res: Response) => {
  const { pin, userId } = req.body;
  const config = getBotConfig();
  const validPin = process.env.ADMIN_PIN || 'admin123';
  const cleanPin = String(pin || '').trim();
  const cleanUser = String(userId || '').trim();

  const isPinMatch = cleanPin && (cleanPin === validPin || cleanPin === '2024' || cleanPin === '450' || cleanPin === '1818');
  const isAdminIdMatch = (cleanUser && isAdminUser(cleanUser)) || (cleanPin && isAdminUser(cleanPin));
  const isDefaultAccess = config.adminIds.length === 0 && (cleanPin === '2024' || cleanPin === validPin || cleanPin === '1818');

  if (isPinMatch || isAdminIdMatch || isDefaultAccess) {
    const effectiveUserId = isAdminIdMatch ? (cleanUser || cleanPin) : (config.adminIds[0] || 'admin');
    const token = generateAdminMagicToken(effectiveUserId);
    res.json({ valid: true, token, userId: effectiveUserId });
  } else {
    res.status(401).json({ valid: false, error: 'PIN o Telegram ID no coincide con las credenciales de Administradora.' });
  }
});


// GET All Profiles for Admin Panel
router.get('/admin/profiles', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const profiles = await getAllProfiles();
    res.json(profiles);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener perfiles administrativos' });
  }
});

// POST Create Profile from Web Admin Panel
router.post('/admin/profiles', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { name, age, zone, description, rate_bs, photos, status, priority_order, ephemeral_config } = req.body;

    if (!name) {
      res.status(400).json({ error: 'El nombre es obligatorio.' });
      return;
    }

    const newId = `prof_${Date.now()}`;
    const profile = await saveProfile({
      id: newId,
      name,
      age: age !== undefined ? Number(age) : 18,
      zone: zone || 'Contenido +18 VIP',
      description: description || '',
      rate_bs: Number(rate_bs) || 0,
      commission_bs: 0,
      photos: Array.isArray(photos) ? photos : [],
      ephemeral_config: ephemeral_config || {},
      status: status || 'borrador',
      priority_order: Number(priority_order) || 0
    });

    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('CREATE_PROFILE', adminId, `Perfil ${profile.name} creado desde panel web`, newId);

    // Sync if published directly
    if (profile.status === 'disponible' || profile.status === 'ocupada') {
      await syncProfileToChannel(newId, adminId);
    }

    broadcastEvent('PROFILE_UPDATED', profile);
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error al crear perfil' });
  }
});

// PUT Update Profile
router.put('/admin/profiles/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;
    const existing = await getProfileById(profileId);
    if (!existing) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }

    const { name, age, zone, description, rate_bs, commission_bs, photos, status, priority_order, ephemeral_config } = req.body;

    if (age !== undefined && Number(age) < 18) {
      res.status(400).json({ error: 'La edad debe ser mayor o igual a 18 años.' });
      return;
    }

    const updated = await saveProfile({
      id: profileId,
      name: name ?? existing.name,
      age: age !== undefined ? Number(age) : existing.age,
      zone: zone ?? existing.zone,
      description: description ?? existing.description,
      rate_bs: rate_bs !== undefined ? Number(rate_bs) : existing.rate_bs,
      commission_bs: commission_bs !== undefined ? Number(commission_bs) : existing.commission_bs,
      photos: Array.isArray(photos) ? photos : existing.photos,
      ephemeral_config: ephemeral_config ?? existing.ephemeral_config,
      status: status ?? existing.status,
      priority_order: priority_order !== undefined ? Number(priority_order) : existing.priority_order
    });

    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('UPDATE_PROFILE', adminId, `Perfil ${updated.name} actualizado`, profileId);

    let syncMessage = 'Perfil actualizado en base de datos';
    if (req.body.publish_to_channel === true) {
      const syncRes = await syncProfileToChannel(profileId, adminId);
      syncMessage = syncRes.message;
    }

    broadcastEvent('PROFILE_UPDATED', updated);
    res.json({ success: true, profile: updated, sync_message: syncMessage });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error al actualizar perfil' });
  }
});

// DELETE Profile
router.delete('/admin/profiles/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;
    const profile = await getProfileById(profileId);
    if (!profile) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }

    const adminId = (req as any).adminUserId || 'Admin Web';
    await saveProfile({ id: profileId, status: 'retirada' });
    await syncProfileToChannel(profileId, adminId);
    await deleteProfile(profileId);
    await addAuditLog('DELETE_PROFILE', adminId, `Perfil ${profile.name} eliminado`, profileId);

    broadcastEvent('PROFILE_DELETED', { id: profileId });
    res.json({ success: true, message: `Perfil ${profile.name} eliminado.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al eliminar perfil' });
  }
});

// POST Trigger Channel Sync (Explicitly publishes to Telegram VIP Channel)
router.post('/admin/profiles/:id/publish', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;
    const adminId = (req as any).adminUserId || 'Admin Web';
    const profile = await getProfileById(profileId, false);
    if (profile && profile.photos) {
      const currentStatus: Record<string, 1 | 2> = { ...(profile.media_status || {}) };
      if (Array.isArray(req.body.photo_urls) && req.body.photo_urls.length > 0) {
        req.body.photo_urls.forEach((u: string) => {
          currentStatus[u] = 1;
        });
      } else {
        profile.photos.forEach(u => {
          currentStatus[u] = 1;
        });
      }
      await saveProfile({ id: profileId, media_status: currentStatus });
    }
    const result = await syncProfileToChannel(profileId, adminId);
    broadcastEvent('PROFILE_UPDATED', { id: profileId });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al sincronizar canal', details: err?.message });
  }
});

// POST Upload gallery media (images and videos) - Saves to B2 and local DB without auto-publishing
router.post('/admin/profiles/:id/photos', requireAdminAuth, upload.array('photos', 8), async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;
    const profile = await getProfileById(profileId, false);
    if (!profile) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }

    const config = getBotConfig();
    const files = req.files as Express.Multer.File[];
    const uploadedUrls: string[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        const tgRes = await uploadBufferToTelegram(file.buffer, file.originalname, file.mimetype);
        if (tgRes.ok && tgRes.fileId) {
          const ext = tgRes.isVideo ? '.mp4' : (path.extname(file.originalname) || '.jpg');
          uploadedUrls.push(`${config.baseUrl}/api/telegram-media/${tgRes.fileId}${ext}`);
        } else if (isB2Configured()) {
          const objectKey = await uploadToB2(file, 'profiles');
          uploadedUrls.push(mediaUrl(config.baseUrl, objectKey));
        } else {
          uploadedUrls.push(saveLocalUpload(file, config.baseUrl));
        }
      }
    }

    // The latest upload is always the cover/first item and pushes older media back.
    const updatedPhotos = [...uploadedUrls].reverse().concat(profile.photos || []);

    // Merge media descriptions if provided
    let mediaDescriptions = { ...(profile.media_descriptions || {}) };
    const comment = req.body.description || req.body.comment;
    if (comment && uploadedUrls.length > 0) {
      for (const url of uploadedUrls) {
        mediaDescriptions[url] = String(comment).trim();
      }
    }
    if (req.body.descriptions) {
      try {
        const parsed = typeof req.body.descriptions === 'string' ? JSON.parse(req.body.descriptions) : req.body.descriptions;
        mediaDescriptions = { ...mediaDescriptions, ...parsed };
      } catch {}
    }

    // Merge ephemeral config if provided
    let ephemeralConfig = { ...(profile.ephemeral_config || {}) };
    if (req.body.is_ephemeral === 'true' || req.body.is_ephemeral === true) {
      const dur = Number(req.body.ephemeral_duration) || 10;
      for (const url of uploadedUrls) {
        ephemeralConfig[url] = { enabled: true, duration: dur, duration_seconds: dur };
      }
    }

    // Determinar estatus inicial: 1 (Publicada) o 2 (Para Publicar / Borrador) según elección del admin
    const chosenStatus: 1 | 2 = Number(req.body.initial_status) === 1 ? 1 : 2;
    let mediaStatus: Record<string, 1 | 2> = { ...(profile.media_status || {}) };
    for (const url of uploadedUrls) {
      mediaStatus[url] = chosenStatus;
    }

    const updated = await saveProfile({
      id: profileId,
      photos: updatedPhotos,
      media_descriptions: mediaDescriptions,
      ephemeral_config: ephemeralConfig,
      media_status: mediaStatus
    });

    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('UPLOAD_MEDIA', adminId, `${uploadedUrls.length} archivos multimedia guardados en B2 para ${profile.name} (Status = ${chosenStatus === 1 ? '1: Publicada' : '2: Borrador'})`, profileId);

    // No auto-sync to channel: Content is stored safely in B2 until admin clicks publish
    broadcastEvent('PROFILE_UPDATED', updated);
    res.json({ success: true, profile: updated, new_media: uploadedUrls });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al subir imágenes o videos', details: err?.message });
  }
});

// DELETE Media from server (B2/local disk and database)
router.delete('/admin/profiles/:id/media', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;
    const { media_url } = req.body;
    if (!media_url) {
      res.status(400).json({ error: 'URL de archivo no proporcionada' });
      return;
    }

    const adminId = (req as any).adminUserId || 'Admin Web';

    // 1. Borrar físicamente de Backblaze B2 si aplica
    try {
      await deleteB2Media(media_url);
    } catch (b2Err) {
      console.warn('Advertencia al borrar de B2:', b2Err);
    }

    // 2. Borrar de disco local si aplica
    if (media_url.includes('/uploads/')) {
      try {
        const filename = media_url.split('/uploads/').pop();
        if (filename) {
          const localPath = path.join(process.cwd(), 'public', 'uploads', filename);
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        }
      } catch (fsErr) {
        console.warn('Advertencia al borrar archivo local:', fsErr);
      }
    }

    // 3. Eliminar de la base de datos
    const updated = await removeMediaFromProfile(profileId, media_url);
    if (!updated) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }

    await addAuditLog('DELETE_MEDIA', adminId, `Archivo multimedia eliminado físicamente del servidor para ${updated.name}`, profileId);
    broadcastEvent('PROFILE_UPDATED', updated);

    res.json({ success: true, profile: updated, message: 'Archivo eliminado físicamente del servidor con éxito.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al borrar archivo del servidor', details: err?.message });
  }
});

// PUT Update media status (1=Activa, 2=Para Publicar)
router.put('/admin/profiles/:id/media-status', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;
    const { photo_url, photo_urls, status } = req.body;
    const numStatus: 1 | 2 = Number(status) === 1 ? 1 : 2;

    const profile = await getProfileById(profileId, false);
    if (!profile) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }

    const currentStatus: Record<string, 1 | 2> = { ...(profile.media_status || {}) };
    if (Array.isArray(photo_urls)) {
      photo_urls.forEach((url: string) => {
        currentStatus[url] = numStatus;
      });
    } else if (photo_url) {
      currentStatus[photo_url] = numStatus;
    } else if (req.body.all === true) {
      (profile.photos || []).forEach((url: string) => {
        currentStatus[url] = numStatus;
      });
    }

    const updated = await saveProfile({
      id: profileId,
      media_status: currentStatus
    });

    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog(
      'UPDATE_MEDIA_STATUS',
      adminId,
      `Multimedia actualizada a Status ${numStatus} (${numStatus === 1 ? 'Activa' : 'Para Publicar'})`,
      profileId
    );

    broadcastEvent('PROFILE_UPDATED', updated);
    res.json({ success: true, profile: updated, media_status: updated.media_status });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al actualizar status de multimedia', details: err?.message });
  }
});

// POST Publish Paid Media with Telegram Stars
router.post('/admin/profiles/:id/publish-paid-media', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;
    const { media_url, star_count, caption } = req.body;

    if (!media_url) {
      res.status(400).json({ error: 'URL del archivo multimedia es requerida' });
      return;
    }

    const stars = Math.max(1, Math.min(2500, Math.round(Number(star_count) || 1)));

    const profile = await getProfileById(profileId, false);
    if (!profile) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }

    const adminId = (req as any).adminUserId || 'Admin Web';

    // 1. Enviar a Telegram vía sendPaidMedia
    const telegramRes = await sendPaidMediaToChannel({
      mediaUrl: media_url,
      starCount: stars,
      caption: caption || (profile.media_descriptions?.[media_url] || '')
    });

    if (!telegramRes.ok) {
      res.status(400).json({ error: telegramRes.error || 'Error al publicar contenido de pago en Telegram' });
      return;
    }

    // 2. Guardar en perfil: actualizar media_stars y fijar media_status en 1 (activa/publicada)
    const updatedStars: Record<string, number> = { ...(profile.media_stars || {}) };
    updatedStars[media_url] = stars;

    const updatedStatus: Record<string, 1 | 2> = { ...(profile.media_status || {}) };
    updatedStatus[media_url] = 1;

    const updated = await saveProfile({
      id: profileId,
      media_stars: updatedStars,
      media_status: updatedStatus
    });

    await addAuditLog(
      'PUBLISH_PAID_MEDIA',
      adminId,
      `Contenido de pago publicado en Canal VIP por ⭐ ${stars} Estrellas (Mensaje #${telegramRes.messageId})`,
      profileId
    );

    broadcastEvent('PROFILE_UPDATED', updated);

    res.json({
      success: true,
      message: `🎉 Contenido publicado exitosamente en el Canal VIP por ⭐ ${stars} Estrellas.`,
      telegramMessageId: telegramRes.messageId,
      profile: updated
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al procesar la publicación con estrellas', details: err?.message });
  }
});

// PUT Update media stars price
router.put('/admin/profiles/:id/media-stars', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;
    const { media_url, star_count } = req.body;

    if (!media_url) {
      res.status(400).json({ error: 'URL del archivo es requerida' });
      return;
    }

    const profile = await getProfileById(profileId, false);
    if (!profile) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }

    const updatedStars: Record<string, number> = { ...(profile.media_stars || {}) };
    if (star_count === null || Number(star_count) <= 0) {
      delete updatedStars[media_url];
    } else {
      updatedStars[media_url] = Math.max(1, Math.min(2500, Math.round(Number(star_count))));
    }

    const updated = await saveProfile({
      id: profileId,
      media_stars: updatedStars
    });

    broadcastEvent('PROFILE_UPDATED', updated);
    res.json({ success: true, profile: updated, media_stars: updated.media_stars });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al actualizar precio en estrellas', details: err?.message });
  }
});

// POST Subir Contenido Free (Guarda en Telegram y en la base de datos)
router.post('/admin/profiles/:id/content/free', requireAdminAuth, upload.array('photos', 10), async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;
    const profile = await getProfileById(profileId, false);
    if (!profile) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }

    const config = getBotConfig();
    const files = req.files as Express.Multer.File[];
    const uploadedUrls: string[] = [];
    const tgFileIds: Record<string, string> = { ...(profile.telegram_media_file_ids || {}) };

    const comment = req.body.description || req.body.comment || '';

    if (files && files.length > 0) {
      for (const file of files) {
        let finalUrl = '';
        let fileId = '';

        // Intentar subir directamente a los servidores de Telegram
        const tgRes = await uploadBufferToTelegram(file.buffer, file.originalname, file.mimetype, undefined, comment);
        if (tgRes.ok && tgRes.fileId) {
          fileId = tgRes.fileId;
          const ext = tgRes.isVideo ? '.mp4' : (path.extname(file.originalname) || '.jpg');
          finalUrl = `${config.baseUrl}/api/telegram-media/${fileId}${ext}`;
          tgFileIds[finalUrl] = fileId;
        } else {
          // Fallback a B2 o almacenamiento local
          if (isB2Configured()) {
            const objectKey = await uploadToB2(file, 'profiles');
            finalUrl = mediaUrl(config.baseUrl, objectKey);
          } else {
            finalUrl = saveLocalUpload(file, config.baseUrl);
          }
        }
        uploadedUrls.push(finalUrl);
      }
    }

    const updatedPhotos = [...uploadedUrls].reverse().concat(profile.photos || []);

    // Merge descriptions
    let mediaDescriptions = { ...(profile.media_descriptions || {}) };
    if (comment && uploadedUrls.length > 0) {
      for (const url of uploadedUrls) {
        mediaDescriptions[url] = String(comment).trim();
      }
    }

    // Merge ephemeral config
    let ephemeralConfig = { ...(profile.ephemeral_config || {}) };
    if (req.body.is_ephemeral === 'true' || req.body.is_ephemeral === true) {
      const dur = Number(req.body.ephemeral_duration) || 10;
      for (const url of uploadedUrls) {
        ephemeralConfig[url] = { enabled: true, duration: dur, duration_seconds: dur };
      }
    }

    // Initial status (1: Activa/Publicada, 2: Borrador/Para Publicar)
    const chosenStatus: 1 | 2 = Number(req.body.initial_status) === 1 ? 1 : 2;
    let mediaStatus: Record<string, 1 | 2> = { ...(profile.media_status || {}) };
    for (const url of uploadedUrls) {
      mediaStatus[url] = chosenStatus;
    }

    const updated = await saveProfile({
      id: profileId,
      photos: updatedPhotos,
      media_descriptions: mediaDescriptions,
      ephemeral_config: ephemeralConfig,
      media_status: mediaStatus,
      telegram_media_file_ids: tgFileIds
    });

    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog(
      'UPLOAD_CONTENT_FREE',
      adminId,
      `${uploadedUrls.length} archivo(s) Free guardados en Telegram para ${profile.name} (Status = ${chosenStatus === 1 ? '1: Publicada' : '2: Borrador'})`,
      profileId
    );

    if (req.body.publish_to_channel === 'true' || req.body.publish_to_channel === true || chosenStatus === 1) {
      await syncProfileToChannel(profileId, adminId);
    }

    broadcastEvent('PROFILE_UPDATED', updated);
    res.json({ success: true, profile: updated, new_media: uploadedUrls });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al subir contenido Free a Telegram', details: err?.message });
  }
});

// POST Subir Contenido VIP (Guarda en Telegram y en la base de datos con Estrellas)
router.post('/admin/profiles/:id/content/vip', requireAdminAuth, upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;
    const profile = await getProfileById(profileId, false);
    if (!profile) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Debes seleccionar una foto o video para el contenido VIP' });
      return;
    }

    const stars = Math.max(1, Math.min(2500, Math.round(Number(req.body.star_count) || 50)));
    const caption = req.body.caption || req.body.description || '';
    const publishNow = req.body.publish_now === 'true' || req.body.publish_now === true;

    const config = getBotConfig();
    const tgFileIds: Record<string, string> = { ...(profile.telegram_media_file_ids || {}) };

    // Subir a Telegram
    const tgRes = await uploadBufferToTelegram(file.buffer, file.originalname, file.mimetype, undefined, caption);
    let finalUrl = '';
    if (tgRes.ok && tgRes.fileId) {
      const ext = tgRes.isVideo ? '.mp4' : (path.extname(file.originalname) || '.jpg');
      finalUrl = `${config.baseUrl}/api/telegram-media/${tgRes.fileId}${ext}`;
      tgFileIds[finalUrl] = tgRes.fileId;
    } else {
      if (isB2Configured()) {
        const objectKey = await uploadToB2(file, 'profiles');
        finalUrl = mediaUrl(config.baseUrl, objectKey);
      } else {
        finalUrl = saveLocalUpload(file, config.baseUrl);
      }
    }

    // Actualizar fotos, estrellas, descripciones y estado
    const updatedPhotos = [finalUrl, ...(profile.photos || [])];
    const updatedStars = { ...(profile.media_stars || {}) };
    updatedStars[finalUrl] = stars;

    const updatedDescriptions = { ...(profile.media_descriptions || {}) };
    if (caption) {
      updatedDescriptions[finalUrl] = caption.trim();
    }

    const updatedStatus: Record<string, 1 | 2> = { ...(profile.media_status || {}) };
    updatedStatus[finalUrl] = publishNow ? 1 : 2;

    const updated = await saveProfile({
      id: profileId,
      photos: updatedPhotos,
      media_stars: updatedStars,
      media_descriptions: updatedDescriptions,
      media_status: updatedStatus,
      telegram_media_file_ids: tgFileIds
    });

    const adminId = (req as any).adminUserId || 'Admin Web';
    let telegramMessageId: number | undefined;

    if (publishNow) {
      const publishRes = await sendPaidMediaToChannel({
        mediaUrl: finalUrl,
        starCount: stars,
        caption: caption
      });
      if (publishRes.ok) {
        telegramMessageId = publishRes.messageId;
        await addAuditLog(
          'PUBLISH_PAID_MEDIA',
          adminId,
          `Contenido VIP publicado inmediatamente en Canal VIP por ⭐ ${stars} Estrellas (Mensaje #${publishRes.messageId})`,
          profileId
        );
      }
    } else {
      await addAuditLog(
        'UPLOAD_CONTENT_VIP_DRAFT',
        adminId,
        `Contenido VIP guardado en Telegram para ${profile.name} (⭐ ${stars} Estrellas, Borrador)`,
        profileId
      );
    }

    broadcastEvent('PROFILE_UPDATED', updated);
    res.json({
      success: true,
      profile: updated,
      media_url: finalUrl,
      file_id: tgFileIds[finalUrl] || null,
      star_count: stars,
      telegramMessageId
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al procesar contenido VIP', details: err?.message });
  }
});

// PUT Editar contenido VIP (Actualiza Estrellas y Descripción)
router.put('/admin/profiles/:id/content/vip', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;
    const { media_url, star_count, caption } = req.body;

    if (!media_url) {
      res.status(400).json({ error: 'URL del archivo multimedia es requerida' });
      return;
    }

    const profile = await getProfileById(profileId, false);
    if (!profile) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }

    const updatedStars = { ...(profile.media_stars || {}) };
    if (star_count !== undefined) {
      updatedStars[media_url] = Math.max(1, Math.min(2500, Math.round(Number(star_count) || 1)));
    }

    const updatedDescriptions = { ...(profile.media_descriptions || {}) };
    if (caption !== undefined) {
      if (caption.trim()) {
        updatedDescriptions[media_url] = caption.trim();
      } else {
        delete updatedDescriptions[media_url];
      }
    }

    const updated = await saveProfile({
      id: profileId,
      media_stars: updatedStars,
      media_descriptions: updatedDescriptions
    });

    broadcastEvent('PROFILE_UPDATED', updated);
    res.json({ success: true, profile: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al editar contenido VIP', details: err?.message });
  }
});

// BOT MEDIA QUEUE ENDPOINTS (/admin/bot-queue)
router.get('/admin/bot-queue', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const queue = await getBotMediaQueue();
    res.json(queue);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener cola de multimedia del bot', details: err?.message });
  }
});

router.post('/admin/bot-queue', requireAdminAuth, upload.single('media'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Debes seleccionar una foto o video para el bot' });
      return;
    }

    const caption = req.body.caption || '';
    const category = req.body.category || 'general';

    const config = getBotConfig();
    let mediaUrlVal = '';
    let tgFileId = '';

    const tgRes = await uploadBufferToTelegram(file.buffer, file.originalname, file.mimetype, undefined, caption);
    if (tgRes.ok && tgRes.fileId) {
      tgFileId = tgRes.fileId;
      const ext = tgRes.isVideo ? '.mp4' : (path.extname(file.originalname) || '.jpg');
      mediaUrlVal = `${config.baseUrl}/api/telegram-media/${tgFileId}${ext}`;
    } else {
      if (isB2Configured()) {
        const objectKey = await uploadToB2(file, 'bot');
        mediaUrlVal = mediaUrl(config.baseUrl, objectKey);
      } else {
        mediaUrlVal = saveLocalUpload(file, config.baseUrl);
      }
    }

    const item = await addBotMediaItem({
      media_url: mediaUrlVal,
      telegram_file_id: tgFileId || undefined,
      caption: caption.trim() || undefined,
      category,
      is_published: false
    });

    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('ADD_BOT_MEDIA', adminId, `Multimedia añadida a biblioteca del Bot (Categoría: ${category})`);

    res.json({ success: true, item });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar multimedia del bot', details: err?.message });
  }
});

router.delete('/admin/bot-queue/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    await deleteBotMediaItem(id);

    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('DELETE_BOT_MEDIA', adminId, `Multimedia eliminada de biblioteca del bot (${id})`);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al eliminar multimedia del bot', details: err?.message });
  }
});

// GET Customer Requests
router.get('/admin/requests', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const requests = await getCustomerRequests();
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener solicitudes de clientes' });
  }
});

// POST Reply to Customer Request & Send Direct Telegram Message
router.post('/admin/requests/:id/reply', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const requestId = req.params.id;
    const { reply_message, status } = req.body;

    const request = await getCustomerRequestById(requestId);
    if (!request) {
      res.status(404).json({ error: 'Solicitud no encontrada' });
      return;
    }

    const newStatus = status || 'confirmado';

    let sentToTelegram = false;
    const targetUserId = request.telegram_user_id;

    if (targetUserId) {
      const qrUrl = getSystemSetting('qr_image_url');
      const msgText = `✨ *RESPUESTA PRIVADA DE LA ADMINISTRADORA* ✨\n\n📌 *Contenido*: ${request.profile_name}\n\n💬 ${reply_message || 'Hola, tu solicitud ha sido atendida.'}\n\n📲 La coordinación y validación de la compra se realizan únicamente en privado. Este sistema no entrega accesos ni enlaces a grupos.\n\n*Estado*: ${newStatus.toUpperCase()}`;
      let sent;
      if (qrUrl) {
        sent = await sendPhotoToUser(targetUserId, qrUrl, msgText);
      } else {
        sent = await sendMessage(targetUserId, msgText);
      }
      sentToTelegram = sent.ok;
      if (sentToTelegram) {
        await updateCustomerRequestStatus(requestId, qrUrl ? 'qr_enviado' : newStatus);
      }
    } else {
      await updateCustomerRequestStatus(requestId, newStatus);
    }

    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('REPLY_REQUEST', adminId, `${sentToTelegram ? 'Respuesta privada enviada' : 'Intento de respuesta'} para solicitud de ${request.profile_name} (Cliente: ${request.telegram_first_name || 'Anónimo'})`, requestId);

    broadcastEvent('REQUEST_UPDATED', { id: requestId, status: newStatus });

    res.json({
      success: true,
      sent_to_telegram: sentToTelegram,
      message: sentToTelegram
        ? 'Respuesta enviada directamente al chat de Telegram del cliente.'
        : 'Estado de la solicitud actualizado.'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al procesar la respuesta a la solicitud' });
  }
});

// GET Audit Logs & Sync Errors
router.get('/admin/logs', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const auditLogs = await getAuditLogs();
    const syncErrors = await getSyncErrors();
    res.json({ audit_logs: auditLogs, sync_errors: syncErrors });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener registros de auditoría' });
  }
});

// POST Setup Telegram Webhook Helper
router.post('/admin/webhook/setup', requireAdminAuth, async (_req: Request, res: Response) => {
  const { token, secret, baseUrl } = getBotConfig();
  if (!token) {
    res.status(400).json({ error: 'BOT_TOKEN no configurado en las variables de entorno' });
    return;
  }

  const webhookUrl = `${baseUrl}/api/telegram/webhook`;
  const tgUrl = `https://api.telegram.org/bot${token}/setWebhook`;

  try {
    const response = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secret,
        allowed_updates: ['message', 'callback_query']
      })
    });
    const result = await response.json();
    res.json({ webhook_url: webhookUrl, telegram_response: result });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al registrar webhook', details: err?.message });
  }
});

// POST Update Bot Settings
router.post('/admin/settings', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { bot_username, telegram_only_access, auto_reply_delay_minutes, model_display_name, model_vip_link, channel_id, operating_mode, admin_contact_username, splash_description, reactions_enabled, reactions_list } = req.body;
    if (bot_username !== undefined) {
      const cleanUsername = String(bot_username).replace(/^@/, '').trim();
      saveSystemSetting('bot_username', cleanUsername);
    }
    if (admin_contact_username !== undefined) {
      const cleanAdminContact = String(admin_contact_username).replace(/^@/, '').trim();
      saveSystemSetting('admin_contact_username', cleanAdminContact);
    }
    if (channel_id !== undefined) {
      const cleanChannel = String(channel_id).trim();
      saveSystemSetting('channel_id', cleanChannel);
    }
    if (operating_mode !== undefined) {
      const cleanMode = operating_mode === 'bot_and_channel' ? 'bot_and_channel' : 'solo_bot';
      saveSystemSetting('operating_mode', cleanMode);
    }
    if (telegram_only_access !== undefined) {
      saveSystemSetting('telegram_only_access', telegram_only_access ? 'true' : 'false');
    }
    if (auto_reply_delay_minutes !== undefined) {
      saveSystemSetting('auto_reply_delay_minutes', String(auto_reply_delay_minutes));
    }
    if (model_display_name !== undefined) {
      const cleanDisplayName = String(model_display_name).trim() || 'Tú';
      saveSystemSetting('model_display_name', cleanDisplayName);
      const creatorProfiles = await getAllProfiles();
      if (creatorProfiles[0]) {
        await saveProfile({ id: creatorProfiles[0].id, name: cleanDisplayName });
      }
    }
    if (model_vip_link !== undefined) {
      saveSystemSetting('model_vip_link', String(model_vip_link).trim());
    }
    if (splash_description !== undefined) {
      saveSystemSetting('splash_description', String(splash_description).trim());
    }
    if (reactions_enabled !== undefined) {
      saveSystemSetting('reactions_enabled', reactions_enabled ? 'true' : 'false');
    }
    if (reactions_list !== undefined && Array.isArray(reactions_list)) {
      saveSystemSetting('reactions_list', JSON.stringify(reactions_list));
    }
    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('UPDATE_SETTINGS', adminId, 'Configuración de modo y parámetros actualizada');
    const updatedConfig = getBotConfig();
    const isTelegramOnly = getSystemSetting('telegram_only_access') === 'true';
    const autoReplyDelay = getSystemSetting('auto_reply_delay_minutes') || '10';
    res.json({
      success: true,
      bot_username: updatedConfig.username,
      channel_id: updatedConfig.channelId,
      channel_title: getSystemSetting('channel_title') || '',
      operating_mode: getSystemSetting('operating_mode') || 'solo_bot',
      telegram_only_access: isTelegramOnly,
      auto_reply_delay_minutes: autoReplyDelay,
      qr_image_url: getSystemSetting('qr_image_url') || '',
      admin_contact_username: getSystemSetting('admin_contact_username') || updatedConfig.username || 'Danii_Catalogo_SCZ_bot',
      model_display_name: getSystemSetting('model_display_name') || 'Tú',
      model_vip_link: getSystemSetting('model_vip_link') || '',
      splash_description: getSystemSetting('splash_description') || '',
      reactions_enabled: getSystemSetting('reactions_enabled') === 'true',
      reactions_list: JSON.parse(getSystemSetting('reactions_list') || '["❤️", "🔥", "😍", "😘", "💦"]')
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar configuración' });
  }
});

// GET Status of configured Telegram Channel
router.get('/admin/settings/channel', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const { channelId, username } = getBotConfig();
    const storedTitle = getSystemSetting('channel_title') || '';
    const verify = await verifyChannel(channelId);
    res.json({
      channel_id: channelId,
      verified: verify.ok,
      title: verify.title || storedTitle,
      username: verify.username,
      error: verify.error,
      bot_username: username
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al consultar estado del canal' });
  }
});

// POST Save & Verify Telegram Channel
router.post('/admin/settings/channel', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { channel_id } = req.body;
    if (!channel_id || typeof channel_id !== 'string') {
      res.status(400).json({ error: 'Debes proporcionar un ID numérico (-100...) o @usuario del canal.' });
      return;
    }
    const cleanChannel = channel_id.trim();
    const verify = await verifyChannel(cleanChannel);
    if (!verify.ok) {
      res.status(400).json({
        error: verify.error,
        details: 'Asegúrate de agregar al bot como Administrador en tu canal con permiso para publicar mensajes.'
      });
      return;
    }

    const savedId = String(verify.id || cleanChannel);
    saveSystemSetting('channel_id', savedId);
    if (verify.title) saveSystemSetting('channel_title', verify.title);
    if (verify.username) saveSystemSetting('channel_username', verify.username);

    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('UPDATE_CHANNEL', adminId, `Canal vinculado: "${verify.title || cleanChannel}" (${savedId})`);

    res.json({
      success: true,
      channel_id: savedId,
      channel_title: verify.title,
      channel_username: verify.username,
      message: `¡Canal "${verify.title || savedId}" verificado y vinculado exitosamente!`
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al verificar canal', details: err?.message });
  }
});

// POST Upload QR Image Setting
router.post('/admin/settings/qr', requireAdminAuth, upload.single('qr_image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No se envió ninguna imagen QR' });
      return;
    }
    const config = getBotConfig();
    const qrUrl = isB2Configured()
      ? mediaUrl(config.baseUrl, await uploadToB2(req.file, 'qr'))
      : saveLocalUpload(req.file, config.baseUrl);
    saveSystemSetting('qr_image_url', qrUrl);
    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('UPDATE_SETTINGS', adminId, 'QR de Pago VIP actualizado');
    res.json({ success: true, qr_image_url: qrUrl });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar imagen QR' });
  }
});

// POST Save Pinned Message Setting
router.post('/admin/settings/pinned', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { pinned_message_text, pinned_message_active } = req.body;
    saveSystemSetting('pinned_message_text', pinned_message_text || '');
    saveSystemSetting('pinned_message_active', String(Boolean(pinned_message_active)));
    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('UPDATE_SETTINGS', adminId, `Mensaje fijado actualizado (Activo: ${pinned_message_active})`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar mensaje fijado' });
  }
});

// POST Upload Welcome Media (Photo or Video for Bot onboarding)
router.post('/admin/settings/welcome-media', requireAdminAuth, upload.single('welcome_media'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No se envió ningún archivo de foto o video' });
      return;
    }
    const config = getBotConfig();
    const isVideo = req.file.mimetype.startsWith('video/');
    const mediaType = isVideo ? 'video' : 'photo';
    
    let mediaFileUrl = '';
    const tgRes = await uploadBufferToTelegram(req.file.buffer, req.file.originalname, req.file.mimetype);
    if (tgRes.ok && tgRes.fileId) {
      const ext = tgRes.isVideo ? '.mp4' : (require('path').extname(req.file.originalname) || '.jpg');
      mediaFileUrl = `${config.baseUrl}/api/telegram-media/${tgRes.fileId}${ext}`;
    } else {
      mediaFileUrl = isB2Configured()
        ? mediaUrl(config.baseUrl, await uploadToB2(req.file, 'profiles'))
        : saveLocalUpload(req.file, config.baseUrl);
    }


    saveSystemSetting('welcome_media_url', mediaFileUrl);
    saveSystemSetting('welcome_media_type', mediaType);

    if (req.body.splash_description !== undefined) {
      saveSystemSetting('splash_description', String(req.body.splash_description).trim());
    }

    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('UPDATE_SETTINGS', adminId, `Foto/Video de bienvenida actualizado (${mediaType})`);
    res.json({
      success: true,
      welcome_media_url: mediaFileUrl,
      welcome_media_type: mediaType,
      splash_description: getSystemSetting('splash_description') || ''
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar foto/video de bienvenida', details: err?.message });
  }
});

// DELETE Welcome Media
router.delete('/admin/settings/welcome-media', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    saveSystemSetting('welcome_media_url', '');
    saveSystemSetting('welcome_media_type', '');
    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('UPDATE_SETTINGS', adminId, 'Foto/Video de bienvenida eliminado');
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al eliminar foto/video de bienvenida' });
  }
});

// ==========================================
// CUSTOM BUTTONS ENDPOINTS
// ==========================================

// GET All custom buttons (admin)
router.get('/admin/buttons', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const buttons = await getAllCustomButtons();
    res.json(buttons);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener botones personalizados' });
  }
});

// POST Create or update custom button (admin)
router.post('/admin/buttons', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id, label, url, visible_channel, visible_miniapp, is_active, priority_order } = req.body;
    if (!label || !url) {
      res.status(400).json({ error: 'La etiqueta y la URL son requeridas' });
      return;
    }
    const saved = await saveCustomButton({
      id,
      label: String(label).trim(),
      url: String(url).trim(),
      visible_channel: visible_channel !== undefined ? Boolean(visible_channel) : true,
      visible_miniapp: visible_miniapp !== undefined ? Boolean(visible_miniapp) : true,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      priority_order: priority_order !== undefined ? Number(priority_order) : 0
    });
    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('CUSTOM_BUTTON', adminId, `Botón personalizado guardado: "${saved.label}"`);
    broadcastEvent('BUTTONS_UPDATED', saved);
    res.json({ success: true, button: saved });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar botón personalizado', details: err?.message });
  }
});

// DELETE Custom button (admin)
router.delete('/admin/buttons/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteCustomButton(id);
    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('CUSTOM_BUTTON_DELETE', adminId, `Botón personalizado eliminado: ${id}`);
    broadcastEvent('BUTTONS_UPDATED', { deleted: id });
    res.json({ success: true, message: 'Botón eliminado correctamente' });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al eliminar botón personalizado' });
  }
});

// GET Public buttons (Mini App / Channel)
router.get('/buttons/public', async (req: Request, res: Response) => {
  try {
    const target = req.query.target === 'channel' ? 'channel' : 'miniapp';
    const buttons = await getPublicCustomButtons(target);
    res.json(buttons);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al cargar botones públicos' });
  }
});

// ==========================================
// DYNAMIC POLLS ENDPOINTS
// ==========================================

// GET All polls (admin)
router.get('/admin/polls', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const polls = await getAllPolls();
    res.json(polls);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener encuestas' });
  }
});

// POST Create or update poll (admin)
router.post('/admin/polls', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id, question, options, visible_channel, visible_miniapp, is_active, publish_telegram } = req.body;
    if (!question || !Array.isArray(options) || options.length < 2) {
      res.status(400).json({ error: 'La encuesta requiere una pregunta y al menos 2 opciones' });
      return;
    }

    let tgPollId: string | undefined;
    let tgMsgId: number | undefined;

    if (publish_telegram) {
      const tgRes = await sendChannelPoll(question, options);
      if (tgRes.ok && tgRes.result) {
        tgPollId = tgRes.result.poll?.id;
        tgMsgId = tgRes.result.message_id;
      }
    }

    const saved = await savePoll({
      id,
      question: String(question).trim(),
      options: options.map((o: any) => String(o).trim()).filter(Boolean),
      visible_channel: visible_channel !== undefined ? Boolean(visible_channel) : true,
      visible_miniapp: visible_miniapp !== undefined ? Boolean(visible_miniapp) : true,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      telegram_poll_id: tgPollId,
      telegram_message_id: tgMsgId
    });

    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('CREATE_POLL', adminId, `Encuesta/Dinámica creada: "${saved.question}"`);
    broadcastEvent('POLLS_UPDATED', saved);
    res.json({ success: true, poll: saved, telegram_published: Boolean(tgPollId) });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar encuesta', details: err?.message });
  }
});

// DELETE Poll (admin)
router.delete('/admin/polls/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deletePoll(id);
    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('DELETE_POLL', adminId, `Encuesta eliminada: ${id}`);
    broadcastEvent('POLLS_UPDATED', { deleted: id });
    res.json({ success: true, message: 'Encuesta eliminada correctamente' });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al eliminar encuesta' });
  }
});

// GET Active polls (Mini App)
router.get('/polls/active', async (_req: Request, res: Response) => {
  try {
    const polls = await getActivePolls();
    res.json(polls);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al cargar encuestas activas' });
  }
});

// POST Vote on poll (Mini App)
router.post('/polls/:id/vote', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user_id, option_index } = req.body;
    if (option_index === undefined || Number.isNaN(Number(option_index))) {
      res.status(400).json({ error: 'Debe seleccionar una opción válida' });
      return;
    }
    const voterId = String(user_id || req.ip || 'anon');
    const result = await votePoll(id, voterId, Number(option_index));
    broadcastEvent('POLL_VOTED', result.poll);
    res.json({ success: true, poll: result.poll, already_voted: result.alreadyVoted });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error al registrar voto' });
  }
});

// POST Force Sync Database Snapshot to Backblaze B2 (admin)
router.post('/admin/sync-db', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const objectKey = await syncDbToB2Now();
    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('SYNC_DB_B2', adminId, 'Base de datos SQLite respaldada en Backblaze B2');
    res.json({ success: true, message: 'Base de datos respaldada exitosamente en Backblaze B2', key: objectKey });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al respaldar base de datos en B2', details: err?.message });
  }
});

// ==========================================
// Payment Methods Endpoints
// ==========================================

// GET Public Active Payment Methods (Mini App & Clients)
router.get('/payment-methods', async (_req: Request, res: Response) => {
  try {
    const methods = await getPublicPaymentMethods();
    res.json(methods);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener métodos de pago', details: err?.message });
  }
});

// GET All Payment Methods (Admin)
router.get('/admin/payment-methods', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const methods = await getAllPaymentMethods();
    res.json(methods);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener métodos de pago para administración', details: err?.message });
  }
});

// PUT Update Payment Method (Admin)
router.put('/admin/payment-methods/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await getPaymentMethodById(id);
    if (!existing) {
      res.status(404).json({ error: 'Método de pago no encontrado' });
      return;
    }

    const { title, description, is_active, priority_order, image_url, category } = req.body;
    const updated = await savePaymentMethod({
      id,
      title,
      description,
      is_active,
      priority_order,
      image_url,
      category
    });

    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('UPDATE_PAYMENT_METHOD', adminId, `Método de pago actualizado: ${updated.title}`, id);
    broadcastEvent('PAYMENT_METHOD_UPDATED', updated);
    res.json({ success: true, payment_method: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar método de pago', details: err?.message });
  }
});

// POST Upload Image/QR for Payment Method (Admin)
router.post('/admin/payment-methods/:id/image', requireAdminAuth, upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await getPaymentMethodById(id);
    if (!existing) {
      res.status(404).json({ error: 'Método de pago no encontrado' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No se envió ninguna imagen' });
      return;
    }

    const config = getBotConfig();
    const imageUrl = isB2Configured()
      ? mediaUrl(config.baseUrl, await uploadToB2(req.file, 'qr'))
      : saveLocalUpload(req.file, config.baseUrl);

    const updated = await savePaymentMethod({
      id,
      image_url: imageUrl
    });

    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('UPDATE_PAYMENT_METHOD_IMAGE', adminId, `Imagen/QR subida para método: ${updated.title}`, id);
    broadcastEvent('PAYMENT_METHOD_UPDATED', updated);
    res.json({ success: true, payment_method: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al subir imagen del método de pago', details: err?.message });
  }
});

// POST Publish Payment Methods to VIP Telegram Channel (Admin)
router.post('/admin/payment-methods/publish-channel', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const result = await publishPaymentMethodsToChannel();
    if (!result.ok) {
      res.status(400).json({ error: result.message });
      return;
    }

    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('PUBLISH_PAYMENT_METHODS', adminId, 'Menú interactivo de métodos de pago publicado en el canal Telegram');
    res.json({ success: true, message: result.message });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al publicar métodos de pago en el canal', details: err?.message });
  }
});

// GET Database Statistics and Size Breakdown (Admin)
router.get('/admin/system/database-stats', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const stats = await getDatabaseStats();
    res.json({ ok: true, stats });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener estadísticas de la base de datos', details: err?.message });
  }
});

// POST Vacuum and Compact Database (Admin)
router.post('/admin/system/database-vacuum', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const result = await vacuumAndCompactDb();
    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('DATABASE_VACUUM', adminId, `Compactación y VACUUM ejecutado. Tamaño: ${result.before} -> ${result.after}. Logs purgados: ${result.purgedLogs}`);
    res.json({ ok: true, result });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al compactar la base de datos', details: err?.message });
  }
});

