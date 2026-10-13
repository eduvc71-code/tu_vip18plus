import { getDb, saveDb } from './db.js';
import { StickerInfo } from './emojiPackModel.js';

export async function insertSticker(pack: string, sticker: StickerInfo): Promise<void> {
  const database = await getDb();
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO emoji_pack_stickers (short_name, custom_emoji_id, emoji, added_at)
    VALUES (?, ?, ?, datetime('now'))
  `);
  stmt.run([pack, String(sticker.customEmojiId), sticker.emoji]);
  stmt.free();
  saveDb();
}

export async function insertBatchStickers(pack: string, stickers: StickerInfo[]): Promise<number> {
  const database = await getDb();
  let count = 0;
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO emoji_pack_stickers (short_name, custom_emoji_id, emoji, added_at)
    VALUES (?, ?, ?, datetime('now'))
  `);
  for (const s of stickers) {
    if (s.customEmojiId) {
      stmt.run([pack, String(s.customEmojiId), s.emoji || '✨']);
      count++;
    }
  }
  stmt.free();
  saveDb();
  return count;
}

export async function getStickersByPack(pack: string): Promise<StickerInfo[]> {
  const database = await getDb();
  const res = database.exec('SELECT short_name, custom_emoji_id, emoji, added_at FROM emoji_pack_stickers WHERE short_name = ? ORDER BY id ASC', [pack]);
  if (!res || res.length === 0) return [];
  const rows = res[0].values;
  return rows.map((r: any[]) => ({
    shortName: String(r[0]),
    customEmojiId: String(r[1]),
    emoji: String(r[2]),
    addedAt: r[3] ? String(r[3]) : undefined,
  }));
}

export async function getAllPacks(): Promise<Array<{ shortName: string; count: number }>> {
  const database = await getDb();
  const res = database.exec('SELECT short_name, COUNT(*) as count FROM emoji_pack_stickers GROUP BY short_name ORDER BY short_name ASC');
  if (!res || res.length === 0) return [];
  return res[0].values.map((r: any[]) => ({
    shortName: String(r[0]),
    count: Number(r[1]) || 0,
  }));
}

export async function getStickerByCustomId(customId: string): Promise<StickerInfo | null> {
  const database = await getDb();
  const res = database.exec('SELECT short_name, custom_emoji_id, emoji, added_at FROM emoji_pack_stickers WHERE custom_emoji_id = ? LIMIT 1', [String(customId)]);
  if (!res || res.length === 0 || !res[0].values.length) return null;
  const r = res[0].values[0];
  return {
    shortName: String(r[0]),
    customEmojiId: String(r[1]),
    emoji: String(r[2]),
    addedAt: r[3] ? String(r[3]) : undefined,
  };
}

export async function deletePack(pack: string): Promise<void> {
  const database = await getDb();
  database.run('DELETE FROM emoji_pack_stickers WHERE short_name = ?', [pack]);
  saveDb();
}

