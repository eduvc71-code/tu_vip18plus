-- Migration: add custom_emojis table
-- Ejecutado una sola vez para crear la tabla que almacena emojis importados localmente
CREATE TABLE IF NOT EXISTS custom_emojis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_url TEXT NOT NULL,               -- URL público accesible del emoji guardado en /public/uploads/emoji
  original_source TEXT NOT NULL,        -- URL original o custom_emoji_id de Telegram
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

