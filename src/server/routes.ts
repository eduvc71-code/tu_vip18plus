import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { isB2Configured, mediaUrl, streamB2Object, uploadToB2 } from './b2Storage.js';
import {
  getPublicProfiles,
  getProfileById,
  getAllProfiles,
  saveProfile,
  deleteProfile,
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
  saveSystemSetting
} from './db.js';
import {
  processTelegramUpdate,
  syncProfileToChannel,
  verifyAdminToken,
  getBotConfig,
  verifyTelegramWebAppData,
  sendMessage,
  sendPhotoToUser
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
  fileFilter: (req, file, cb) => {
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
router.get('/media', streamB2Object);

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

// GET Public Info & Bot Status
router.get('/info', (req: Request, res: Response) => {
  const config = getBotConfig();
  const tgVal = getSystemSetting('telegram_only_access');
  const telegramOnly = tgVal === null ? true : (tgVal === 'true');
  const autoReplyDelay = getSystemSetting('auto_reply_delay_minutes') || '10';
  res.json({
    app_name: 'Catálogo VIP',
    bot_username: config.username,
    bot_configured: Boolean(config.token),
    channel_id: config.channelId,
    telegram_only_access: telegramOnly,
    auto_reply_delay_minutes: autoReplyDelay,
    qr_image_url: getSystemSetting('qr_image_url') || '',
    pinned_message_text: getSystemSetting('pinned_message_text') || '',
    pinned_message_active: getSystemSetting('pinned_message_active') === 'true',
    model_display_name: getSystemSetting('model_display_name') || 'Tú',
    model_vip_link: getSystemSetting('model_vip_link') || '',
    legal_notice: 'Galería privada y contenido exclusivo para mayores de 18 años.'
  });
});

// GET Public Profiles
router.get('/profiles', async (req: Request, res: Response) => {
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

// GET Public Profile Detail
router.get('/profiles/:id', async (req: Request, res: Response) => {
  try {
    const profile = await getProfileById(req.params.id);
    if (!profile || profile.status === 'retirada' || profile.status === 'borrador') {
      res.status(404).json({ error: 'Perfil no encontrado o no disponible' });
      return;
    }
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al consultar perfil' });
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
      const autoReplyText = `✨ *Tú • Espacio VIP (+18)* ✨\n\n¡Hola ${request.telegram_first_name || 'Estimado/a'}!\n\nLa Administradora aún no pudo responder personalmente tu solicitud para *${request.profile_name}*.\n\n${qrUrl ? '📲 Mientras tanto, el bot te envía el QR oficial de pago. La Administradora se comunicará contigo por privado para validar el comprobante.' : 'La Administradora se comunicará contigo por privado en cuanto esté disponible.'}\n\n🔒 La validación es privada. Este bot no publica comprobantes ni entrega accesos a grupos.`;
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
    const { profile_id, client_name, client_telegram, tg_user_id, telegram_init_data } = req.body;
    const purchaseMessage = 'Hola estoy interesado en tu Contenido VIP. Información por favor.';

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
      const userConfirmText = `✨ *Tú • Espacio VIP (+18)* ✨\n\n¡Hola ${safeClientName || 'Estimado/a'}!\n\nHemos recibido tu solicitud para *${profile.name}* (SUSCRIPCIÓN VIP / ACCESO: Bs. ${profile.rate_bs}).\n\nLa Administradora procesará tu consulta de forma confidencial y te responderá directamente a este chat en breve.`;
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

// GET All Profiles for Admin Panel
router.get('/admin/profiles', requireAdminAuth, async (req: Request, res: Response) => {
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
    const { name, age, zone, description, rate_bs, commission_bs, photos, status, priority_order } = req.body;

    if (!name || !age || age < 18) {
      res.status(400).json({ error: 'El nombre es obligatorio y la edad debe ser igual o mayor a 18 años.' });
      return;
    }

    const newId = `prof_${Date.now()}`;
    const profile = await saveProfile({
      id: newId,
      name,
      age: Number(age),
      zone: zone || 'Contenido +18 VIP',
      description: description || '',
      rate_bs: Number(rate_bs) || 0,
      commission_bs: 0,
      photos: Array.isArray(photos) ? photos : [],
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

    const { name, age, zone, description, rate_bs, commission_bs, photos, status, priority_order } = req.body;

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
      status: status ?? existing.status,
      priority_order: priority_order !== undefined ? Number(priority_order) : existing.priority_order
    });

    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('UPDATE_PROFILE', adminId, `Perfil ${updated.name} actualizado`, profileId);

    // Auto-sync channel and web
    const syncRes = await syncProfileToChannel(profileId, adminId);

    broadcastEvent('PROFILE_UPDATED', updated);
    res.json({ success: true, profile: updated, sync_message: syncRes.message });
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

// POST Trigger Channel Sync
router.post('/admin/profiles/:id/publish', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;
    const adminId = (req as any).adminUserId || 'Admin Web';
    const result = await syncProfileToChannel(profileId, adminId);
    broadcastEvent('PROFILE_UPDATED', { id: profileId });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al sincronizar canal', details: err?.message });
  }
});

// POST Upload gallery media (images and videos)
router.post('/admin/profiles/:id/photos', requireAdminAuth, upload.array('photos', 8), async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;
    const profile = await getProfileById(profileId);
    if (!profile) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }

    const config = getBotConfig();
    const files = req.files as Express.Multer.File[];
    const uploadedUrls: string[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        if (isB2Configured()) {
          const objectKey = await uploadToB2(file, 'profiles');
          uploadedUrls.push(mediaUrl(config.baseUrl, objectKey));
        } else {
          uploadedUrls.push(saveLocalUpload(file, config.baseUrl));
        }
      }
    }

    // The latest upload is always the cover/first item and pushes older media back.
    const updatedPhotos = [...uploadedUrls].reverse().concat(profile.photos || []);
    const updated = await saveProfile({ id: profileId, photos: updatedPhotos });

    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('UPLOAD_MEDIA', adminId, `${uploadedUrls.length} archivos multimedia agregados a ${profile.name}`, profileId);

    // Auto sync
    await syncProfileToChannel(profileId, adminId);

    broadcastEvent('PROFILE_UPDATED', updated);
    res.json({ success: true, profile: updated, new_media: uploadedUrls });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al subir imágenes o videos', details: err?.message });
  }
});

// GET Customer Requests
router.get('/admin/requests', requireAdminAuth, async (req: Request, res: Response) => {
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
router.get('/admin/logs', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const auditLogs = await getAuditLogs();
    const syncErrors = await getSyncErrors();
    res.json({ audit_logs: auditLogs, sync_errors: syncErrors });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener registros de auditoría' });
  }
});

// POST Setup Telegram Webhook Helper
router.post('/admin/webhook/setup', requireAdminAuth, async (req: Request, res: Response) => {
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
    const { bot_username, telegram_only_access, auto_reply_delay_minutes, model_display_name, model_vip_link } = req.body;
    if (bot_username !== undefined) {
      const cleanUsername = String(bot_username).replace(/^@/, '').trim();
      saveSystemSetting('bot_username', cleanUsername);
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
    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('UPDATE_SETTINGS', adminId, 'Configuración del bot de Telegram actualizada');
    const updatedConfig = getBotConfig();
    const isTelegramOnly = getSystemSetting('telegram_only_access') === 'true';
    const autoReplyDelay = getSystemSetting('auto_reply_delay_minutes') || '10';
    res.json({
      success: true,
      bot_username: updatedConfig.username,
      telegram_only_access: isTelegramOnly,
      auto_reply_delay_minutes: autoReplyDelay,
      qr_image_url: getSystemSetting('qr_image_url') || '',
      model_display_name: getSystemSetting('model_display_name') || 'Tú',
      model_vip_link: getSystemSetting('model_vip_link') || ''
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar configuración' });
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
