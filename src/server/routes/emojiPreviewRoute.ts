import { Router, Request, Response } from 'express';
import { getBotConfig, getTelegramFilePath } from '../telegram.js';
import { getStickerByCustomId } from '../emojiPackRepo.js';

export const emojiPreviewRouter = Router();

/**
 * GET /emoji/preview/:customId
 * Transmite la imagen o video del emoji custom directamente desde la API/CDN de Telegram
 * sin guardar ningún archivo multimedia en nuestro servidor local.
 */
emojiPreviewRouter.get('/preview/:customId', async (req: Request, res: Response) => {
  try {
    const { customId } = req.params;
    if (!customId) {
      res.status(400).json({ error: 'customId requerido' });
      return;
    }

    const sticker = await getStickerByCustomId(customId);
    // Intentar resolver la ruta del archivo vía getTelegramFilePath
    const filePath = await getTelegramFilePath(customId);
    const config = getBotConfig();
    const token = config.token || process.env.TELEGRAM_BOT_TOKEN;

    if (filePath && token) {
      const tgUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
      const tgRes = await fetch(tgUrl);
      if (tgRes.ok) {
        const contentType = tgRes.headers.get('content-type') || (filePath.endsWith('.webm') ? 'video/webm' : 'image/webp');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        
        const arrayBuf = await tgRes.arrayBuffer();
        res.send(Buffer.from(arrayBuf));
        return;
      }
    }

    // Fallback: Redirigir o responder con SVG / fallback emoji para que el navegador no falle
    const fallbackChar = sticker?.emoji || '✨';
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="12" fill="#2d132c"/>
        <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="34">${fallbackChar}</text>
      </svg>
    `.trim();

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(svg);
  } catch (err: any) {
    console.error('Error in /emoji/preview/:customId:', err);
    res.status(500).json({ error: 'Error al generar la previsualización del emoji' });
  }
});

