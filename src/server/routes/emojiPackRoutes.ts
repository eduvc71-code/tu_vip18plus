import { Router, Request, Response } from 'express';
import { getEmojiStickers } from '../mtprotoClient.js';
import { insertBatchStickers, getStickersByPack, getAllPacks, deletePack } from '../emojiPackRepo.js';

export const emojiPackRouter = Router();

// Extrae el short_name de URLs como:
// https://t.me/addemoji/KirillUsenkoPack o tg://addemoji?set=KirillUsenkoPack o directo KirillUsenkoPack
function extractShortName(rawUrlOrName: string): string {
  const trimmed = rawUrlOrName.trim();
  const match = trimmed.match(/(?:addemoji\/|addemoji\?set=)([a-zA-Z0-9_-]+)/i);
  if (match) return match[1];
  return trimmed.replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, '');
}

/**
 * POST /admin/emoji-pack/import
 * Body: { urls: string[] }
 */
emojiPackRouter.post('/import', async (req: Request, res: Response) => {
  try {
    const { urls } = req.body;
    if (!Array.isArray(urls) || urls.length === 0) {
      res.status(400).json({ error: 'Debes proporcionar una lista de URLs de packs de emojis' });
      return;
    }

    const results: Array<{ shortName: string; count: number; error?: string }> = [];

    for (const urlItem of urls) {
      const shortName = extractShortName(String(urlItem || ''));
      if (!shortName) continue;

      try {
        const stickers = await getEmojiStickers(shortName);
        if (stickers && stickers.length > 0) {
          const inserted = await insertBatchStickers(
            shortName,
            stickers.map(s => ({
              shortName,
              customEmojiId: s.customEmojiId,
              emoji: s.emoji
            }))
          );
          results.push({ shortName, count: inserted });
        } else {
          results.push({ shortName, count: 0, error: 'No se encontraron emojis válidos en Telegram para este pack' });
        }
      } catch (err: any) {
        console.error(`Error importing pack ${shortName}:`, err);
        results.push({ shortName, count: 0, error: err?.message || 'Error al conectar con Telegram' });
      }
    }

    const totalImported = results.reduce((acc, cur) => acc + (cur.count || 0), 0);
    if (totalImported === 0) {
      const firstError = results.find(r => r.error)?.error || 'No se pudo importar ningún emoji. Verifica que el nombre o enlace sea válido.';
      res.status(400).json({
        success: false,
        error: firstError,
        results,
        totalImported: 0
      });
      return;
    }

    res.json({
      success: true,
      message: 'Proceso de importación finalizado',
      results,
      totalImported
    });
  } catch (err: any) {
    console.error('Error general en /admin/emoji-pack/import:', err);
    res.status(500).json({ error: 'Error en el servidor al importar los packs de emojis' });
  }
});

/**
 * GET /admin/emoji-pack/packs
 * Lista todos los packs importados y su conteo de stickers
 */
emojiPackRouter.get('/packs', async (_req: Request, res: Response) => {
  try {
    const packs = await getAllPacks();
    res.json(packs);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al listar los packs de emojis' });
  }
});

/**
 * GET /admin/emoji-pack/:shortName
 * Obtiene los stickers de un pack específico
 */
emojiPackRouter.get('/:shortName', async (req: Request, res: Response) => {
  try {
    const { shortName } = req.params;
    const stickers = await getStickersByPack(shortName);
    res.json(stickers);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener stickers del pack' });
  }
});

/**
 * DELETE /admin/emoji-pack/:shortName
 * Elimina un pack completo de la base de datos
 */
emojiPackRouter.delete('/:shortName', async (req: Request, res: Response) => {
  try {
    const { shortName } = req.params;
    await deletePack(shortName);
    res.json({ success: true, message: `Pack ${shortName} eliminado correctamente` });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al eliminar pack de emojis' });
  }
});

