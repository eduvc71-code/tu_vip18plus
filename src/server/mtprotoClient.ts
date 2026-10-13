import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram';
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
 */
export async function getEmojiStickers(shortName: string): Promise<Array<{ customEmojiId: string; emoji: string }>> {
  const c = await ensureClient();
  try {
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
        let customId = (attr && (attr as any).alt) ? (doc as any).id?.toString() : (doc as any).id?.toString();
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
    console.error('Error fetching emoji stickers for', shortName, err);
    return [];
  }
}

