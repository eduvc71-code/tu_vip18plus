const Database = require('better-sqlite3');
const db = new Database('data/catalogo.sqlite');
const sys = db.prepare("SELECT key, value FROM system_settings WHERE key = 'qr_image_url'").all();
const qr = db.prepare("SELECT id, title, image_url, description FROM payment_methods WHERE id = 'qr_bolivia'").all();
console.log(JSON.stringify({ system: sys, qrBolivia: qr }, null, 2));
db.close();
