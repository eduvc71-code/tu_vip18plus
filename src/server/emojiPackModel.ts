// src/server/emojiPackModel.ts
export interface StickerInfo {
  shortName: string; // e.g., "KirillUsenkoPack"
  customEmojiId: string; // stored as TEXT to preserve 64‑bit precision
  emoji: string; // fallback Unicode character or placeholder (e.g., "😀" or ".png")
  addedAt?: string; // ISO timestamp, optional
}

