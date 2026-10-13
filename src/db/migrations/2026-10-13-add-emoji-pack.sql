CREATE TABLE IF NOT EXISTS emoji_pack_stickers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    short_name TEXT NOT NULL,
    custom_emoji_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    added_at DATETIME DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_emoji_pack_short_name ON emoji_pack_stickers(short_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_emoji_unique ON emoji_pack_stickers(custom_emoji_id);

