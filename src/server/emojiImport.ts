// Emoji import and listing handlers
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import { getDb } from './db.js';
import { getBotConfig, callTelegramApi, getTelegramFilePath } from './telegram.js';
import { verifyAdminToken } from './telegram.js';

// Directory for local emoji storage
const EMOJI_DIR = path.join(process.cwd(), 'public', 'uploads', 'emoji');
if (!fs.existsSync(EMOJI_DIR)) {
  fs.mkdirSync(EMOJI_DIR, { recursive: true });
}

/** Middleware to ensure admin authentication */
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
  res.status(401).json({ error: 'Acceso administrativo no autorizado.' });
}

/** POST /api/admin/emoji-import
 *  Body can contain either:
 *    { "url": "https://example.com/emoji.png" }
 *    or { "custom_emoji_id": "5432101234567890123" }
 *  The image is downloaded, saved under /public/uploads/emoji, and a DB record is created.
 */
export async function importEmojiHandler(req: Request, res: Response) {
  const { url, custom_emoji_id } = req.body as { url?: string; custom_emoji_id?: string };
  if (!url && !custom_emoji_id) {
    return res.status(400).json({ error: 'Debe proporcionar url o custom_emoji_id.' });
  }

  let imageBuffer: Buffer | null = null;
  let sourceLabel: string = '';

  try {
    if (custom_emoji_id) {
      // Obtain the file_id for the custom emoji via Telegram API
      const stickersResp = await callTelegramApi('getCustomEmojiStickers', {
        custom_emoji_ids: [custom_emoji_id],
      });
      const sticker = stickersResp?.result?.[0];
      if (!sticker?.file_id) {
        return res.status(404).json({ error: 'Custom emoji no encontrado en Telegram.' });
      }
      const filePath = await getTelegramFilePath(sticker.file_id);
      if (!filePath) {
        return res.status(404).json({ error: 'Ruta del archivo no encontrada en Telegram.' });
      }
      const { token } = getBotConfig();
      const tgUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
      const tgRes = await fetch(tgUrl);
      if (!tgRes.ok) {
        return res.status(tgRes.status).json({ error: 'Error al descargar emoji desde Telegram.' });
      }
      const arrayBuf = await tgRes.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuf);
      sourceLabel = `telegram:${custom_emoji_id}`;
    } else if (url) {
      const fetched = await fetch(url);
      if (!fetched.ok) {
        return res.status(fetched.status).json({ error: 'No se pudo descargar la URL proporcionada.' });
      }
      const arrayBuf = await fetched.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuf);
      sourceLabel = `url:${url}`;
    }

    if (!imageBuffer) {
      return res.status(500).json({ error: 'Error inesperado al obtener el buffer de la imagen.' });
    }

    // Determine extension (fallback to .png)
    const contentType = (custom_emoji_id ? 'image/png' : (url ? (await fetch(url)).headers.get('content-type') : null)) || 'image/png';
    const extMap: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };
    const ext = extMap[contentType] || '.png';

    const filename = `emoji_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(EMOJI_DIR, filename);
    fs.writeFileSync(filePath, imageBuffer);
    const publicUrl = `/uploads/emoji/${filename}`;

    const db = await getDb();
    db.run(`INSERT INTO custom_emojis (file_url, original_source) VALUES (?, ?)`, [publicUrl, sourceLabel]);
    const inserted = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
    return res.json({ id: inserted, file_url: publicUrl });
  } catch (err: any) {
    console.error('[Emoji Import] Error:', err);
    return res.status(500).json({ error: 'Error interno al importar emoji.', details: err?.message });
  }
}

/** GET /api/admin/emojis – list all imported emojis */
export async function listEmojisHandler(req: Request, res: Response) {
  try {
    const db = await getDb();
    const rows = db.exec(`SELECT id, file_url, original_source, created_at FROM custom_emojis ORDER BY created_at DESC`);
    const result = rows.length ? rows[0].values.map(v => ({ id: v[0], file_url: v[1], original_source: v[2], created_at: v[3] })) : [];
    return res.json(result);
  } catch (err: any) {
    console.error('[Emoji List] Error:', err);
    return res.status(500).json({ error: 'Error interno al listar emojis.' });
  }
}

// Export router additions for easy import in routes.ts
export const emojiRouter = {
  import: importEmojiHandler,
  list: listEmojisHandler,
  middleware: requireAdminAuth,
};

