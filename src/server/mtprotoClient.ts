import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram';
import { callTelegramApi } from './telegram.js';

const apiId = Number(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH || '';
const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';

let client: TelegramClient | null = null;
let isReady = false;

async function ensureClient() {
  if (isReady && client) return client;
  if (!apiId || !apiHash || !botToken) {
    throw new Error('Missing TG_API_ID, TG_API_HASH, or TELEGRAM_BOT_TOKEN in environment');
  }
  if (!client) {
    client = new TelegramClient(new StringSession(''), apiId, apiHash, {
      connectionRetries: 5,
      deviceModel: 'NodeJS',
      systemVersion: process.version,
      appVersion: '1.0.0',
    });
  }
  await client.start({
    botAuthToken: botToken,
  });
  isReady = true;
  return client;
}

/**
 * Obtiene los stickers de emoji de un pack a partir de su shortName.
 * Devuelve un arreglo de objetos con customEmojiId (como string) y emoji fallback.
 * 
 * Estrategia ultra-robusta:
 * 1) Usa primero la Bot API oficial (getStickerSet). No requiere TG_API_ID ni TG_API_HASH y responde al instante.
 * 2) Si falla o no devuelve datos, recurre a MTProto GramJS (si las credenciales existen).
 */
export async function getEmojiStickers(shortName: string): Promise<Array<{ customEmojiId: string; emoji: string }>> {
  // 1. Intentar primero por la API oficial de Telegram Bots (getStickerSet)
  try {
    const botRes = await callTelegramApi('getStickerSet', { name: shortName });
    if (botRes && botRes.ok && Array.isArray(botRes.result?.stickers) && botRes.result.stickers.length > 0) {
      const stickers: Array<{ customEmojiId: string; emoji: string }> = [];
      for (const stk of botRes.result.stickers) {
        const customId = stk.custom_emoji_id ? String(stk.custom_emoji_id) : (stk.type === 'custom_emoji' ? String(stk.file_unique_id) : null);
        if (customId) {
          stickers.push({
            customEmojiId: customId,
            emoji: stk.emoji || '✨'
          });
        }
      }
      if (stickers.length > 0) {
        return stickers;
      }
    }
  } catch (botErr) {
    console.warn(`[getEmojiStickers] Bot API falló para el pack ${shortName}:`, botErr);
  }

  // 2. Si no funcionó o no trajo custom emojis, intentar con MTProto GramJS (si están configurados apiId y apiHash)
  if (apiId && apiHash) {
    try {
      const c = await ensureClient();
      const result: any = await c.invoke(
        new Api.messages.GetStickerSet({
          stickerset: new Api.InputStickerSetShortName({
            shortName: shortName,
          }),
          hash: 0 as any,
        })
      );
      const stickers: Array<{ customEmojiId: string; emoji: string }> = [];
      if (result && result.documents) {
        for (const doc of result.documents) {
          const attr = doc.attributes?.find((a: any) => a instanceof Api.DocumentAttributeCustomEmoji || (a && a.className === 'DocumentAttributeCustomEmoji'));
          const customId = doc.id ? doc.id.toString() : null;
          let fallback = '✨';
          if (attr && (attr as any).alt) {
            fallback = (attr as any).alt;
          } else if (doc.mimeType?.includes('video')) {
            fallback = '📹';
          } else if (doc.mimeType?.includes('image')) {
            fallback = '🖼️';
          }
          if (customId) {
            stickers.push({ customEmojiId: customId, emoji: fallback });
          }
        }
      }
      return stickers;
    } catch (err) {
      console.error('Error fetching emoji stickers via MTProto for', shortName, err);
    }
  }

  return [];
}

