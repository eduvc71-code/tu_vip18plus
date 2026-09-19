import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { Profile, CustomerRequest, AuditLog, SyncErrorLog, ConversationState, CustomButton, DynamicPoll, PaymentMethod } from '../types.js';
import { backupDatabaseToB2, downloadDatabaseFromB2, isB2Configured } from './b2Storage.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'catalogo.sqlite');

let db: Database | null = null;
let b2SyncTimer: NodeJS.Timeout | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  let loadedFromB2 = false;
  // If B2 is configured, ALWAYS check B2 first on startup so fresh deploys on Render retain production data!
  if (isB2Configured()) {
    try {
      console.log('[Database] Verificando y sincronizando con Backblaze B2...');
      const b2Buf = await downloadDatabaseFromB2();
      if (b2Buf && b2Buf.length > 0) {
        fs.writeFileSync(DB_FILE, b2Buf);
        db = new SQL.Database(b2Buf);
        loadedFromB2 = true;
        console.log('[Database] ✅ Base de datos de producción restaurada exitosamente desde Backblaze B2');
      } else {
        console.log('[Database] No se encontró base previa en B2.');
      }
    } catch (err: any) {
      console.warn('[Database] No se pudo restaurar desde B2, usando copia local o inicial:', err?.message || err);
    }
  }

  if (!db) {
    if (fs.existsSync(DB_FILE) && fs.statSync(DB_FILE).size > 0) {
      const filebuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(filebuffer);
      console.log('[Database] Cargada base local existente.');
    } else {
      db = new SQL.Database();
      console.log('[Database] Inicializando base vacía.');
    }
  }

  initTables(db);
  if (!loadedFromB2) {
    seedInitialData(db);
  }
  ensureDefaultSettings(db);
  saveDb();

  return db;
}

function ensureDefaultSettings(database: Database): void {
  database.run(`INSERT OR IGNORE INTO system_settings (key, value) VALUES ('telegram_only_access', 'true')`);
  database.run(`INSERT OR IGNORE INTO system_settings (key, value) VALUES ('auto_reply_delay_minutes', '10')`);
  const defaultModelName = process.env.VIP_MODEL_NAME || process.env.VIP_BRAND_NAME || 'IAM Danii';
  database.run(`INSERT OR IGNORE INTO system_settings (key, value) VALUES ('model_display_name', ?)`, [defaultModelName]);
  let defaultBotUsername = (process.env.BOT_USERNAME || 'IAM_Danii_VIP_bot').replace(/^@/, '').trim();
  if (!defaultBotUsername || /ruti|flavia/i.test(defaultBotUsername)) {
    defaultBotUsername = 'IAM_Danii_VIP_bot';
  }
  database.run(`UPDATE system_settings SET value = ? WHERE key = 'bot_username'`, [defaultBotUsername]);
  const defaultAdminUsername = (process.env.ADMIN_TELEGRAM_USERNAME || 'IAM_Danii_VIP_bot').replace(/^@/, '').trim();
  database.run(`INSERT OR IGNORE INTO system_settings (key, value) VALUES ('admin_contact_username', ?)`, [defaultAdminUsername]);
  seedPaymentMethods(database);
}

function consolidateToSingleVipProfile(database: Database): void {
  const res = database.exec("SELECT * FROM profiles ORDER BY priority_order ASC, updated_at DESC");
  if (!res || res.length === 0 || !res[0].values || res[0].values.length <= 1) return;

  const cols = res[0].columns;
  const rows = res[0].values.map(v => Object.fromEntries(cols.map((c, i) => [c, v[i]])));
  const target = rows.find(r => String(r.name).includes('🧸') || String(r.name).toLowerCase().includes('dani')) || rows[0];

  const allPhotosSet = new Set<string>();
  const mergedStatus: Record<string, number> = {};
  const mergedDescriptions: Record<string, string> = {};
  const mergedEphemeral: Record<string, any> = {};

  for (const r of rows) {
    let pPhotos: string[] = [];
    try { pPhotos = JSON.parse(String(r.photos || '[]')); } catch {}
    for (const url of pPhotos) {
      allPhotosSet.add(url);
      if (mergedStatus[url] === undefined) mergedStatus[url] = 2;
    }
    try { Object.assign(mergedDescriptions, JSON.parse(String(r.media_descriptions || '{}'))); } catch {}
    try { Object.assign(mergedStatus, JSON.parse(String(r.media_status || '{}'))); } catch {}
    try { Object.assign(mergedEphemeral, JSON.parse(String(r.ephemeral_config || '{}'))); } catch {}
  }

  const finalPhotos = Array.from(allPhotosSet);
  for (const url of finalPhotos) {
    if (mergedStatus[url] === undefined) mergedStatus[url] = 2;
  }

  const now = new Date().toISOString();
  database.run(
    "UPDATE profiles SET photos = ?, media_status = ?, media_descriptions = ?, ephemeral_config = ?, updated_at = ? WHERE id = ?",
    [
      JSON.stringify(finalPhotos),
      JSON.stringify(mergedStatus),
      JSON.stringify(mergedDescriptions),
      JSON.stringify(mergedEphemeral),
      now,
      target.id
    ]
  );
  database.run("DELETE FROM profiles WHERE id != ?", [target.id]);
}

export function saveDb(): void {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);

    // Debounced automatic background sync to B2 (persists data across Render restarts)
    if (b2SyncTimer) clearTimeout(b2SyncTimer);
    b2SyncTimer = setTimeout(async () => {
      try {
        await backupDatabaseToB2(buffer);
        console.log('[Database] Snapshot sincronizado exitosamente con Backblaze B2');
      } catch (err: any) {
        console.warn('[Database] Advertencia al sincronizar snapshot con B2:', err?.message);
      }
    }, 2000);
  } catch (err) {
    console.error('Error saving database file:', err);
  }
}

export async function syncDbToB2Now(): Promise<string> {
  const database = await getDb();
  const data = database.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
  return await backupDatabaseToB2(buffer);
}

function initTables(database: Database): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      zone TEXT NOT NULL,
      description TEXT NOT NULL,
      rate_bs REAL NOT NULL,
      commission_bs REAL NOT NULL,
      photos TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      telegram_message_id INTEGER,
      priority_order INTEGER DEFAULT 0,
      ephemeral_config TEXT
    );
  `);

  const profileCols = database.exec("PRAGMA table_info(profiles)");
  const existingProfileCols = new Set(
    profileCols[0]?.values.map(row => String(row[1])) || []
  );
  if (!existingProfileCols.has('ephemeral_config')) {
    database.run(`ALTER TABLE profiles ADD COLUMN ephemeral_config TEXT`);
  }
  if (!existingProfileCols.has('reactions')) {
    database.run(`ALTER TABLE profiles ADD COLUMN reactions TEXT`);
  }
  if (!existingProfileCols.has('media_descriptions')) {
    database.run(`ALTER TABLE profiles ADD COLUMN media_descriptions TEXT`);
  }
  if (!existingProfileCols.has('media_status')) {
    database.run(`ALTER TABLE profiles ADD COLUMN media_status TEXT`);
  }

  database.run(`
    CREATE TABLE IF NOT EXISTS profile_reactions (
      profile_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reaction_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (profile_id, user_id, reaction_type)
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS customer_requests (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      profile_name TEXT NOT NULL,
      telegram_user_id TEXT,
      telegram_username TEXT,
      telegram_first_name TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      admin_notified_at TEXT,
      auto_reply_at TEXT,
      responded_at TEXT,
      notes TEXT
    );
  `);

  const requestColumns = database.exec("PRAGMA table_info(customer_requests)");
  const existingRequestColumns = new Set(
    requestColumns[0]?.values.map(row => String(row[1])) || []
  );
  for (const column of ['admin_notified_at', 'auto_reply_at', 'responded_at']) {
    if (!existingRequestColumns.has(column)) {
      database.run(`ALTER TABLE customer_requests ADD COLUMN ${column} TEXT`);
    }
  }

  database.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      telegram_user_id TEXT PRIMARY KEY,
      step TEXT NOT NULL,
      draft_data TEXT NOT NULL,
      active_profile_id TEXT,
      last_updated TEXT NOT NULL
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      performed_by TEXT NOT NULL,
      profile_id TEXT,
      details TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS sync_errors (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      action TEXT NOT NULL,
      error_message TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      status TEXT NOT NULL
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS subscribers (
      telegram_user_id TEXT PRIMARY KEY,
      telegram_username TEXT,
      telegram_first_name TEXT,
      created_at TEXT NOT NULL,
      last_seen TEXT NOT NULL
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS invitation_codes (
      code TEXT PRIMARY KEY,
      telegram_user_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      used_at TEXT
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS custom_buttons (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      url TEXT NOT NULL,
      visible_channel INTEGER DEFAULT 1,
      visible_miniapp INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      priority_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS dynamic_polls (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      options TEXT NOT NULL,
      votes TEXT NOT NULL,
      telegram_poll_id TEXT,
      telegram_message_id INTEGER,
      visible_channel INTEGER DEFAULT 1,
      visible_miniapp INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS poll_user_votes (
      poll_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      option_index INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (poll_id, user_id)
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      priority_order INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);
}

function seedInitialData(database: Database): void {
  const check = database.exec("SELECT COUNT(*) as count FROM profiles");
  const count = check[0]?.values[0]?.[0] as number;

  if (count === 0) {
    const now = new Date().toISOString();
    const modelName = process.env.VIP_MODEL_NAME || process.env.VIP_BRAND_NAME || 'IAM DANI 🧸🩷';

    const sampleProfiles: Partial<Profile>[] = [
      {
        id: 'prof_vip_main',
        name: modelName,
        zone: 'CANAL FREE VIP',
        description: 'Holis, te doy la bienvenida a mi espacio privado y oficial.\n\nAcá podrás explorar información exclusiva y detalles de lo que desees saber de mí o si quieres ver más de mí 🙈\n\nPresiona cualquiera de las opciones que te salen abajo ‼️',
        rate_bs: 100,
        commission_bs: 0,
        photos: [],
        ephemeral_config: {},
        media_descriptions: {},
        status: 'disponible',
        priority_order: 1
      }
    ];

    const stmt = database.prepare(`
      INSERT INTO profiles (id, name, age, zone, description, rate_bs, commission_bs, photos, ephemeral_config, status, created_at, updated_at, telegram_message_id, priority_order, media_descriptions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
    `);

    for (const p of sampleProfiles) {
      stmt.run([
        p.id!,
        p.name!,
        p.age || null,
        p.zone!,
        p.description!,
        p.rate_bs!,
        p.commission_bs!,
        JSON.stringify(p.photos!),
        JSON.stringify(p.ephemeral_config || {}),
        p.status!,
        now,
        now,
        p.priority_order || 0,
        JSON.stringify(p.media_descriptions || {})
      ]);
    }
    stmt.free();

    // Initial audit log
    database.run(`
      INSERT INTO audit_logs (id, action, performed_by, profile_id, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      'log_init_01',
      'SYSTEM_INIT',
      'System',
      null,
      'Base de datos inicializada para ' + modelName + ' Canal VIP Free (+18)',
      now
    ]);
  }
}

function seedPaymentMethods(database: Database): void {
  const check = database.exec("SELECT COUNT(*) as count FROM payment_methods");
  const count = (check[0]?.values[0]?.[0] as number) || 0;

  let existingQr: string | null = null;
  const qrRes = database.exec("SELECT value FROM system_settings WHERE key = 'qr_image_url'");
  if (qrRes && qrRes.length > 0 && qrRes[0].values.length > 0) {
    existingQr = String(qrRes[0].values[0][0]);
  }

  if (count === 0) {
    const now = new Date().toISOString();
    const initialMethods: Array<{
      id: string;
      title: string;
      category: 'national' | 'international' | 'service';
      image_url: string | null;
      description: string;
      priority_order: number;
    }> = [
      {
        id: 'qr_bolivia',
        title: '🇧🇴 PAGO QR BOLIVIA',
        category: 'national',
        image_url: existingQr,
        description: 'Escanea el código QR desde cualquier banco boliviano o app de pagos para realizar tu transferencia inmediata en Bs. Envía el comprobante para habilitar tu acceso.',
        priority_order: 1
      },
      {
        id: 'peru',
        title: '🇵🇪 PERU',
        category: 'international',
        image_url: null,
        description: 'Pagos en Perú disponibles mediante Yape, Plin o transferencia bancaria local (BCP, BBVA, Interbank). Envía tu comprobante a la administradora.',
        priority_order: 2
      },
      {
        id: 'chile',
        title: '🇨🇱 CHILE',
        category: 'international',
        image_url: null,
        description: 'Pagos en Chile disponibles mediante CuentaRUT (BancoEstado) o transferencia electrónica bancaria en pesos chilenos.',
        priority_order: 3
      },
      {
        id: 'argentina',
        title: '🇦🇷 ARGENTINA',
        category: 'international',
        image_url: null,
        description: 'Transferencias disponibles en Argentina mediante Mercado Pago (alias/CVU), Ualá o transferencia bancaria en pesos argentinos.',
        priority_order: 4
      },
      {
        id: 'espana',
        title: '🇪🇸 ESPAÑA',
        category: 'international',
        image_url: null,
        description: 'Pagos en España y toda la Unión Europea mediante Bizum, transferencia SEPA o PayPal en Euros (€).',
        priority_order: 5
      },
      {
        id: 'mexico',
        title: '🇲🇽 MEXICO',
        category: 'international',
        image_url: null,
        description: 'Pagos en México mediante transferencia interbancaria SPEI (CLABE), OXXO Pay o Spin by OXXO.',
        priority_order: 6
      },
      {
        id: 'paraguay',
        title: '🇵🇾 PARAGUAY',
        category: 'international',
        image_url: null,
        description: 'Transferencias locales en Paraguay mediante SIPAP, Tigo Money o bancos en Guaraníes (PYG).',
        priority_order: 7
      },
      {
        id: 'brasil',
        title: '🇧🇷 BRASIL',
        category: 'international',
        image_url: null,
        description: 'Pagamentos no Brasil disponíveis instantaneamente via chave PIX ou transferência bancária local.',
        priority_order: 8
      },
      {
        id: 'uruguay',
        title: '🇺🇾 URUGUAY',
        category: 'international',
        image_url: null,
        description: 'Pagos en Uruguay mediante Prex, Brou o transferencia local en pesos uruguayos o dólares.',
        priority_order: 9
      },
      {
        id: 'colombia',
        title: '🇨🇴 COLOMBIA',
        category: 'international',
        image_url: null,
        description: 'Pagos en Colombia disponibles mediante Nequi, Daviplata, Bancolombia o PSE.',
        priority_order: 10
      },
      {
        id: 'rusia',
        title: '🇷🇺 RUSIA',
        category: 'international',
        image_url: null,
        description: 'Pagos y transferencias internacionales / criptomonedas (USDT) para Rusia.',
        priority_order: 11
      },
      {
        id: 'ecuador',
        title: '🇪🇨 ECUADOR',
        category: 'international',
        image_url: null,
        description: 'Transferencias directas en Ecuador (USD) mediante Banco Pichincha, Banco Guayaquil o app DeUna.',
        priority_order: 12
      },
      {
        id: 'venezuela',
        title: '🇻🇪 VENEZUELA',
        category: 'international',
        image_url: null,
        description: 'Pagos en Venezuela mediante Pago Móvil (Bs), Zinli o Binance Pay USDT.',
        priority_order: 13
      },
      {
        id: 'cripto',
        title: '🪙 CRIPTOMONEDA',
        category: 'service',
        image_url: null,
        description: 'Aceptamos USDT (TRC-20, BEP-20, TON, Polygon), Bitcoin (BTC), Ethereum (ETH) o Binance Pay ID sin comisiones.',
        priority_order: 14
      },
      {
        id: 'tigo_money',
        title: '☎️ TIGO MONEY',
        category: 'service',
        image_url: null,
        description: 'Envío directo por Tigo Money Bolivia al número de la administradora.',
        priority_order: 15
      },
      {
        id: 'paypal',
        title: '💸 PAYPAL',
        category: 'service',
        image_url: null,
        description: 'Pagos internacionales seguros mediante PayPal (saldo o tarjeta de débito/crédito internacional).',
        priority_order: 16
      },
      {
        id: 'telegram_stars',
        title: '⭐ ESTRELLAS TELEGRAM',
        category: 'service',
        image_url: null,
        description: 'Paga directamente con Telegram Stars dentro de Telegram de manera 100% anónima, instantánea y segura.',
        priority_order: 17
      },
      {
        id: 'western_remitly',
        title: '🌐 WESTER Y REMITLY',
        category: 'service',
        image_url: null,
        description: 'Giros internacionales directos mediante Western Union, Remitly, MoneyGram o WorldRemit.',
        priority_order: 18
      },
      {
        id: 'zelle',
        title: '💳 ZELLE',
        category: 'service',
        image_url: null,
        description: 'Transferencia instantánea en USD mediante Zelle desde cualquier cuenta bancaria de Estados Unidos.',
        priority_order: 19
      }
    ];

    const stmt = database.prepare(`
      INSERT INTO payment_methods (id, title, category, image_url, description, is_active, priority_order, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `);

    for (const m of initialMethods) {
      stmt.run([
        m.id,
        m.title,
        m.category,
        m.image_url,
        m.description,
        m.priority_order,
        now
      ]);
    }
    stmt.free();
  } else if (existingQr) {
    database.run(
      "UPDATE payment_methods SET image_url = ? WHERE id = 'qr_bolivia' AND (image_url IS NULL OR image_url = '')",
      [existingQr]
    );
  }
}

// Helper para normalizar URLs de fotos a rutas relativas para compatibilidad móvil exterior
function normalizePhotoUrls(photos: any): string[] {
  if (!Array.isArray(photos)) return [];
  return photos.map(url => {
    if (typeof url === 'string' && url.includes('/uploads/')) {
      const filename = url.split('/uploads/').pop();
      return `/uploads/${filename}`;
    }
    return url;
  });
}

// Data Access Methods
function parseReactions(raw: any) {
  const defaults = {
    likes: 0,
    hearts: 0,
    stars: 0,
    fires: 0,
    in_love: 0,
    kiss: 0,
    heart_eyes: 0,
    clap: 0,
    party: 0,
    star_struck: 0
  };
  if (!raw) return defaults;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return {
      likes: Number(parsed.likes) || 0,
      hearts: Number(parsed.hearts) || 0,
      stars: Number(parsed.stars) || 0,
      fires: Number(parsed.fires) || 0,
      in_love: Number(parsed.in_love) || 0,
      kiss: Number(parsed.kiss) || 0,
      heart_eyes: Number(parsed.heart_eyes) || 0,
      clap: Number(parsed.clap) || 0,
      party: Number(parsed.party) || 0,
      star_struck: Number(parsed.star_struck) || 0,
    };
  } catch {
    return defaults;
  }
}

// Data Access Methods & Hydration Helper
function hydrateProfile(raw: any, filterPublic: boolean = false): Profile {
  const obj = { ...raw };
  try {
    obj.photos = normalizePhotoUrls(JSON.parse(obj.photos || '[]'));
  } catch {
    obj.photos = [];
  }
  try {
    obj.ephemeral_config = obj.ephemeral_config ? JSON.parse(obj.ephemeral_config) : {};
  } catch {
    obj.ephemeral_config = {};
  }
  try {
    obj.media_descriptions = obj.media_descriptions ? JSON.parse(obj.media_descriptions) : {};
  } catch {
    obj.media_descriptions = {};
  }
  try {
    obj.media_status = obj.media_status ? JSON.parse(obj.media_status) : {};
  } catch {
    obj.media_status = {};
  }

  // ASIGNACIÓN POR DEFECTO: Todo archivo multimedia sin estatus explícito queda con Status = 2 ("Para Publicar")
  if (Array.isArray(obj.photos)) {
    obj.photos.forEach((url: string) => {
      if (obj.media_status[url] === undefined) {
        obj.media_status[url] = 2; // 2 = Para Publicar
      }
    });
  }

  // Para clientes públicos (Mini App), filtrar para mostrar solo fotos con Status = 1 ("Activa")
  if (filterPublic && Array.isArray(obj.photos)) {
    obj.photos = obj.photos.filter((url: string) => obj.media_status[url] === 1);
  }

  obj.reactions = parseReactions(obj.reactions);
  return obj as Profile;
}

export async function getAllProfiles(): Promise<Profile[]> {
  const database = await getDb();
  const res = database.exec("SELECT * FROM profiles ORDER BY priority_order ASC, updated_at DESC");
  if (!res || res.length === 0) return [];
  
  const columns = res[0].columns;
  return res[0].values.map(row => {
    const raw: any = {};
    columns.forEach((col, idx) => {
      raw[col] = row[idx];
    });
    return hydrateProfile(raw, false);
  });
}

export async function getPublicProfiles(): Promise<Profile[]> {
  const database = await getDb();
  const res = database.exec("SELECT * FROM profiles WHERE status IN ('disponible', 'ocupada') AND age >= 18 ORDER BY priority_order ASC, updated_at DESC");
  if (!res || res.length === 0) return [];
  
  const columns = res[0].columns;
  return res[0].values.map(row => {
    const raw: any = {};
    columns.forEach((col, idx) => {
      raw[col] = row[idx];
    });
    return hydrateProfile(raw, true);
  });
}

export async function getProfileById(id: string, filterPublic: boolean = false): Promise<Profile | null> {
  const database = await getDb();
  const stmt = database.prepare("SELECT * FROM profiles WHERE id = ?");
  stmt.bind([id]);
  
  if (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, any>;
    stmt.free();
    return hydrateProfile(row, filterPublic);
  }
  stmt.free();
  return null;
}

export async function saveProfile(profile: Partial<Profile> & { id: string }): Promise<Profile> {
  const database = await getDb();
  const existing = await getProfileById(profile.id, false);
  const now = new Date().toISOString();

  // Strict safety check: Age >= 18
  if (profile.age !== undefined && profile.age < 18) {
    throw new Error('PROHIBICION LEGAL Y DE SEGURIDAD: Todos los perfiles deben ser de personas mayores de 18 años.');
  }

  if (existing) {
    const updatedName = profile.name ?? existing.name;
    const updatedZone = profile.zone ?? existing.zone;
    const updatedDesc = profile.description ?? existing.description;
    const updatedRate = profile.rate_bs ?? existing.rate_bs;
    const updatedCommission = profile.commission_bs ?? existing.commission_bs;
    const updatedPhotos = profile.photos ? JSON.stringify(profile.photos) : JSON.stringify(existing.photos);
    const updatedEphemeral = profile.ephemeral_config !== undefined
      ? JSON.stringify(profile.ephemeral_config)
      : (existing.ephemeral_config ? JSON.stringify(existing.ephemeral_config) : '{}');
    const updatedStatus = profile.status ?? existing.status;
    const updatedTgMsgId = profile.telegram_message_id !== undefined ? profile.telegram_message_id : existing.telegram_message_id;
    const updatedPriority = profile.priority_order ?? existing.priority_order;
    const updatedReactions = profile.reactions !== undefined
      ? JSON.stringify(profile.reactions)
      : (existing.reactions ? JSON.stringify(existing.reactions) : JSON.stringify({ likes: 0, hearts: 0, stars: 0, fires: 0 }));
    const updatedMediaDesc = profile.media_descriptions !== undefined
      ? JSON.stringify(profile.media_descriptions)
      : (existing.media_descriptions ? JSON.stringify(existing.media_descriptions) : '{}');
    const updatedMediaStatus = profile.media_status !== undefined
      ? JSON.stringify(profile.media_status)
      : (existing.media_status ? JSON.stringify(existing.media_status) : '{}');

    database.run(`
      UPDATE profiles
      SET name = ?, zone = ?, description = ?, rate_bs = ?, commission_bs = ?, photos = ?, ephemeral_config = ?, status = ?, updated_at = ?, telegram_message_id = ?, priority_order = ?, reactions = ?, media_descriptions = ?, media_status = ?
      WHERE id = ?
    `, [
      updatedName,
      updatedZone,
      updatedDesc,
      updatedRate,
      updatedCommission,
      updatedPhotos,
      updatedEphemeral,
      updatedStatus,
      now,
      updatedTgMsgId,
      updatedPriority,
      updatedReactions,
      updatedMediaDesc,
      updatedMediaStatus,
      profile.id
    ]);
  } else {
    const initialReactions = JSON.stringify(profile.reactions || { likes: 0, hearts: 0, stars: 0, fires: 0 });
    const initialMediaDesc = JSON.stringify(profile.media_descriptions || {});
    const initialMediaStatus = JSON.stringify(profile.media_status || {});
    database.run(`
      INSERT INTO profiles (id, name, age, zone, description, rate_bs, commission_bs, photos, ephemeral_config, status, created_at, updated_at, telegram_message_id, priority_order, reactions, media_descriptions, media_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      profile.id,
      profile.name || 'Sin nombre',
      profile.age || 18,
      profile.zone || 'Contenido +18 VIP',
      profile.description || '',
      profile.rate_bs || 0,
      0,
      JSON.stringify(profile.photos || []),
      JSON.stringify(profile.ephemeral_config || {}),
      profile.status || 'borrador',
      now,
      now,
      profile.telegram_message_id || null,
      profile.priority_order || 0,
      initialReactions,
      initialMediaDesc,
      initialMediaStatus
    ]);
  }

  saveDb();
  return (await getProfileById(profile.id, false))!;
}

export async function removeMediaFromProfile(profileId: string, mediaUrl: string): Promise<Profile | null> {
  const profile = await getProfileById(profileId, false);
  if (!profile) return null;

  const updatedPhotos = (profile.photos || []).filter(u => u !== mediaUrl);
  const updatedMediaStatus = { ...(profile.media_status || {}) };
  delete updatedMediaStatus[mediaUrl];
  const updatedDescriptions = { ...(profile.media_descriptions || {}) };
  delete updatedDescriptions[mediaUrl];
  const updatedEphemeral = { ...(profile.ephemeral_config || {}) };
  delete updatedEphemeral[mediaUrl];

  return await saveProfile({
    id: profileId,
    photos: updatedPhotos,
    media_status: updatedMediaStatus,
    media_descriptions: updatedDescriptions,
    ephemeral_config: updatedEphemeral
  });
}

export async function toggleProfileReaction(
  profileId: string,
  userId: string,
  reactionType: string
): Promise<{ profile: Profile; userReacted: boolean }> {
  const database = await getDb();
  const profile = await getProfileById(profileId);
  if (!profile) {
    throw new Error('Perfil no encontrado');
  }

  const reactionKeyMap: Record<string, string> = {
    like: 'likes',
    heart: 'hearts',
    star: 'stars',
    fire: 'fires',
    in_love: 'in_love',
    kiss: 'kiss',
    heart_eyes: 'heart_eyes',
    clap: 'clap',
    party: 'party',
    star_struck: 'star_struck'
  };
  const key = reactionKeyMap[reactionType] || reactionType;
  const reactions: Record<string, number> = { ...(profile.reactions || {}) };

  // Check if user already reacted with this type
  const stmt = database.prepare("SELECT reaction_type FROM profile_reactions WHERE profile_id = ? AND user_id = ? AND reaction_type = ?");
  stmt.bind([profileId, userId, reactionType]);
  const hasReacted = stmt.step();
  stmt.free();

  let userReacted = false;
  if (hasReacted) {
    database.run("DELETE FROM profile_reactions WHERE profile_id = ? AND user_id = ? AND reaction_type = ?", [profileId, userId, reactionType]);
    reactions[key] = Math.max(0, (reactions[key] || 1) - 1);
    userReacted = false;
  } else {
    database.run("INSERT OR REPLACE INTO profile_reactions (profile_id, user_id, reaction_type, created_at) VALUES (?, ?, ?, ?)", [
      profileId,
      userId,
      reactionType,
      new Date().toISOString()
    ]);
    reactions[key] = (reactions[key] || 0) + 1;
    userReacted = true;
  }

  const updated = await saveProfile({
    id: profileId,
    reactions
  });

  return { profile: updated, userReacted };
}

export async function getUserReactions(profileId: string, userId: string): Promise<string[]> {
  const database = await getDb();
  const stmt = database.prepare("SELECT reaction_type FROM profile_reactions WHERE profile_id = ? AND user_id = ?");
  stmt.bind([profileId, userId]);
  const list: string[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as { reaction_type: string };
    if (row.reaction_type) list.push(row.reaction_type);
  }
  stmt.free();
  return list;
}

export async function deleteProfile(id: string): Promise<boolean> {
  const database = await getDb();
  database.run("DELETE FROM profiles WHERE id = ?", [id]);
  saveDb();
  return true;
}

// Customer Requests
export async function createCustomerRequest(req: Partial<CustomerRequest>): Promise<CustomerRequest> {
  const database = await getDb();
  const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  database.run(`
    INSERT INTO customer_requests (id, profile_id, profile_name, telegram_user_id, telegram_username, telegram_first_name, status, created_at, admin_notified_at, auto_reply_at, responded_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    req.profile_id || '',
    req.profile_name || '',
    req.telegram_user_id || null,
    req.telegram_username || null,
    req.telegram_first_name || null,
    req.status || 'pendiente',
    now,
    req.admin_notified_at || null,
    req.auto_reply_at || null,
    req.responded_at || null,
    req.notes || ''
  ]);

  saveDb();
  return {
    id,
    profile_id: req.profile_id || '',
    profile_name: req.profile_name || '',
    telegram_user_id: req.telegram_user_id,
    telegram_username: req.telegram_username,
    telegram_first_name: req.telegram_first_name,
    status: req.status as any || 'pendiente',
    created_at: now,
    admin_notified_at: req.admin_notified_at,
    auto_reply_at: req.auto_reply_at,
    responded_at: req.responded_at,
    notes: req.notes
  };
}

export async function getCustomerRequests(): Promise<CustomerRequest[]> {
  const database = await getDb();
  const res = database.exec("SELECT * FROM customer_requests ORDER BY created_at DESC");
  if (!res || res.length === 0) return [];
  const columns = res[0].columns;
  return res[0].values.map(row => {
    const obj: any = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj as CustomerRequest;
  });
}

export async function getCustomerRequestById(id: string): Promise<CustomerRequest | null> {
  const database = await getDb();
  const stmt = database.prepare("SELECT * FROM customer_requests WHERE id = ?");
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row as unknown as CustomerRequest;
  }
  stmt.free();
  return null;
}

export async function updateCustomerRequestStatus(id: string, status: string): Promise<void> {
  const database = await getDb();
  database.run("UPDATE customer_requests SET status = ?, responded_at = CASE WHEN ? = 'pendiente' THEN responded_at ELSE ? END WHERE id = ?", [status, status, new Date().toISOString(), id]);
  saveDb();
}

export async function markCustomerRequestScheduled(id: string, adminNotifiedAt: string, autoReplyAt?: string): Promise<void> {
  const database = await getDb();
  database.run(
    "UPDATE customer_requests SET admin_notified_at = ?, auto_reply_at = ? WHERE id = ?",
    [adminNotifiedAt, autoReplyAt || null, id]
  );
  saveDb();
}

export async function getDueCustomerRequests(nowIso: string): Promise<CustomerRequest[]> {
  const database = await getDb();
  const stmt = database.prepare(`
    SELECT * FROM customer_requests
    WHERE status = 'pendiente'
      AND auto_reply_at IS NOT NULL
      AND auto_reply_at <= ?
    ORDER BY auto_reply_at ASC
  `);
  stmt.bind([nowIso]);
  const requests: CustomerRequest[] = [];
  while (stmt.step()) {
    requests.push(stmt.getAsObject() as unknown as CustomerRequest);
  }
  stmt.free();
  saveDb();
  return requests;
}

// Conversation State Machine for Telegram Bot
export async function getConversationState(userId: string): Promise<ConversationState | null> {
  const database = await getDb();
  const stmt = database.prepare("SELECT * FROM conversations WHERE telegram_user_id = ?");
  stmt.bind([userId]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return {
      telegram_user_id: row.telegram_user_id as string,
      step: row.step as string,
      draft_data: JSON.parse((row.draft_data as string) || '{}'),
      active_profile_id: row.active_profile_id as string || undefined,
      last_updated: row.last_updated as string
    };
  }
  stmt.free();
  return null;
}

export async function setConversationState(userId: string, step: string, draftData: Partial<Profile>, activeProfileId?: string): Promise<void> {
  const database = await getDb();
  const now = new Date().toISOString();
  database.run(`
    INSERT INTO conversations (telegram_user_id, step, draft_data, active_profile_id, last_updated)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(telegram_user_id) DO UPDATE SET
      step = excluded.step,
      draft_data = excluded.draft_data,
      active_profile_id = excluded.active_profile_id,
      last_updated = excluded.last_updated
  `, [
    userId,
    step,
    JSON.stringify(draftData),
    activeProfileId || null,
    now
  ]);
  saveDb();
}

export async function clearConversationState(userId: string): Promise<void> {
  const database = await getDb();
  database.run("DELETE FROM conversations WHERE telegram_user_id = ?", [userId]);
  saveDb();
}

// Audit Logs & Sync Errors
export async function addAuditLog(action: string, performedBy: string, details: string, profileId?: string): Promise<void> {
  const database = await getDb();
  const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  database.run(`
    INSERT INTO audit_logs (id, action, performed_by, profile_id, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [id, action, performedBy, profileId || null, details, now]);
  saveDb();
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  const database = await getDb();
  const res = database.exec("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100");
  if (!res || res.length === 0) return [];
  const columns = res[0].columns;
  return res[0].values.map(row => {
    const obj: any = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj as AuditLog;
  });
}

export async function addSyncError(profileId: string, action: string, errorMessage: string): Promise<void> {
  const database = await getDb();
  const id = `err_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  database.run(`
    INSERT INTO sync_errors (id, profile_id, action, error_message, timestamp, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `, [id, profileId, action, errorMessage, now]);
  saveDb();
}

export async function getSyncErrors(): Promise<SyncErrorLog[]> {
  const database = await getDb();
  const res = database.exec("SELECT * FROM sync_errors ORDER BY timestamp DESC LIMIT 50");
  if (!res || res.length === 0) return [];
  const columns = res[0].columns;
  return res[0].values.map(row => {
    const obj: any = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj as SyncErrorLog;
  });
}

export function getSystemSetting(key: string): string | null {
  if (!db) return null;
  const stmt = db.prepare('SELECT value FROM system_settings WHERE key = ?');
  stmt.bind([key]);
  if (stmt.step()) {
    const val = stmt.getAsObject().value as string;
    stmt.free();
    return val;
  }
  stmt.free();
  return null;
}

export function saveSystemSetting(key: string, value: string): void {
  if (!db) return;
  db.run('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', [key, value]);
  saveDb();
}

export function addAdminTelegramId(telegramUserId: string | number): void {
  const current = (getSystemSetting('admin_telegram_ids') || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);
  const strId = String(telegramUserId).trim();
  if (!current.includes(strId)) {
    current.push(strId);
    saveSystemSetting('admin_telegram_ids', current.join(','));
  }
}

// Invitation Codes Management
export interface InvitationCode {
  code: string;
  telegram_user_id: string;
  status: string;
  created_at: string;
  used_at?: string;
}

export async function createInvitationCode(telegram_user_id: string): Promise<string> {
  const database = await getDb();
  // Invalidar códigos anteriores del usuario
  database.run("UPDATE invitation_codes SET status = 'expired' WHERE telegram_user_id = ? AND status = 'active'", [telegram_user_id]);
  
  const code = `VIP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const now = new Date().toISOString();
  
  database.run(`
    INSERT INTO invitation_codes (code, telegram_user_id, status, created_at)
    VALUES (?, ?, 'active', ?)
  `, [code, telegram_user_id, now]);
  
  saveDb();
  return code;
}

export async function verifyInvitationCode(code: string): Promise<boolean> {
  const database = await getDb();
  const stmt = database.prepare("SELECT * FROM invitation_codes WHERE code = ? AND status = 'active'");
  stmt.bind([code]);
  
  const isValid = stmt.step();
  stmt.free();
  
  if (isValid) {
    const now = new Date().toISOString();
    database.run("UPDATE invitation_codes SET status = 'used', used_at = ? WHERE code = ?", [now, code]);
    saveDb();
  }
  
  return isValid;
}

// ==========================================
// Custom Buttons Management
// ==========================================
export async function getAllCustomButtons(): Promise<CustomButton[]> {
  const database = await getDb();
  const res = database.exec("SELECT * FROM custom_buttons ORDER BY priority_order ASC, created_at DESC");
  if (!res || res.length === 0) return [];
  const columns = res[0].columns;
  return res[0].values.map(row => {
    const obj: any = {};
    columns.forEach((col, idx) => { obj[col] = row[idx]; });
    return {
      id: String(obj.id),
      label: String(obj.label || ''),
      url: String(obj.url || ''),
      visible_channel: Boolean(obj.visible_channel),
      visible_miniapp: Boolean(obj.visible_miniapp),
      is_active: Boolean(obj.is_active),
      priority_order: Number(obj.priority_order || 0),
      created_at: String(obj.created_at || '')
    };
  });
}

export async function getPublicCustomButtons(target: 'channel' | 'miniapp'): Promise<CustomButton[]> {
  const all = await getAllCustomButtons();
  return all.filter(btn => btn.is_active && (target === 'channel' ? btn.visible_channel : btn.visible_miniapp));
}

export async function saveCustomButton(btn: Partial<CustomButton> & { label: string; url: string }): Promise<CustomButton> {
  const database = await getDb();
  const id = btn.id || `btn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();
  const visibleChannel = btn.visible_channel !== undefined ? (btn.visible_channel ? 1 : 0) : 1;
  const visibleMiniapp = btn.visible_miniapp !== undefined ? (btn.visible_miniapp ? 1 : 0) : 1;
  const isActive = btn.is_active !== undefined ? (btn.is_active ? 1 : 0) : 1;
  const priorityOrder = btn.priority_order ?? 0;

  database.run(`
    INSERT OR REPLACE INTO custom_buttons (id, label, url, visible_channel, visible_miniapp, is_active, priority_order, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, btn.label, btn.url, visibleChannel, visibleMiniapp, isActive, priorityOrder, btn.created_at || now]);

  saveDb();
  const buttons = await getAllCustomButtons();
  return buttons.find(b => b.id === id)!;
}

export async function deleteCustomButton(id: string): Promise<boolean> {
  const database = await getDb();
  database.run("DELETE FROM custom_buttons WHERE id = ?", [id]);
  saveDb();
  return true;
}

// ==========================================
// Dynamic Polls Management
// ==========================================
export async function getAllPolls(): Promise<DynamicPoll[]> {
  const database = await getDb();
  const res = database.exec("SELECT * FROM dynamic_polls ORDER BY created_at DESC");
  if (!res || res.length === 0) return [];
  const columns = res[0].columns;
  return res[0].values.map(row => {
    const obj: any = {};
    columns.forEach((col, idx) => { obj[col] = row[idx]; });
    let options: string[] = [];
    let votes: Record<number, number> = {};
    try { options = JSON.parse(obj.options || '[]'); } catch { options = []; }
    try { votes = JSON.parse(obj.votes || '{}'); } catch { votes = {}; }
    return {
      id: String(obj.id),
      question: String(obj.question || ''),
      options,
      votes,
      telegram_poll_id: obj.telegram_poll_id ? String(obj.telegram_poll_id) : undefined,
      telegram_message_id: obj.telegram_message_id ? Number(obj.telegram_message_id) : undefined,
      visible_channel: Boolean(obj.visible_channel),
      visible_miniapp: Boolean(obj.visible_miniapp),
      is_active: Boolean(obj.is_active),
      created_at: String(obj.created_at || '')
    };
  });
}

export async function getActivePolls(): Promise<DynamicPoll[]> {
  const all = await getAllPolls();
  return all.filter(p => p.is_active && p.visible_miniapp);
}

export async function getPollById(id: string): Promise<DynamicPoll | null> {
  const all = await getAllPolls();
  return all.find(p => p.id === id) || null;
}

export async function savePoll(poll: Partial<DynamicPoll> & { question: string; options: string[] }): Promise<DynamicPoll> {
  const database = await getDb();
  const id = poll.id || `poll_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();
  const existing = await getPollById(id);

  const optionsJson = JSON.stringify(poll.options);
  const votesJson = JSON.stringify(poll.votes || (existing ? existing.votes : {}));
  const visibleChannel = poll.visible_channel !== undefined ? (poll.visible_channel ? 1 : 0) : 1;
  const visibleMiniapp = poll.visible_miniapp !== undefined ? (poll.visible_miniapp ? 1 : 0) : 1;
  const isActive = poll.is_active !== undefined ? (poll.is_active ? 1 : 0) : 1;
  const tgPollId = poll.telegram_poll_id ?? existing?.telegram_poll_id ?? null;
  const tgMsgId = poll.telegram_message_id ?? existing?.telegram_message_id ?? null;

  database.run(`
    INSERT OR REPLACE INTO dynamic_polls (id, question, options, votes, telegram_poll_id, telegram_message_id, visible_channel, visible_miniapp, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, poll.question, optionsJson, votesJson, tgPollId, tgMsgId, visibleChannel, visibleMiniapp, isActive, existing?.created_at || now]);

  saveDb();
  return (await getPollById(id))!;
}

export async function votePoll(pollId: string, userId: string, optionIndex: number): Promise<{ poll: DynamicPoll; alreadyVoted: boolean }> {
  const database = await getDb();
  const poll = await getPollById(pollId);
  if (!poll) throw new Error('Encuesta no encontrada');

  const stmt = database.prepare("SELECT option_index FROM poll_user_votes WHERE poll_id = ? AND user_id = ?");
  stmt.bind([pollId, userId]);
  const hasVoted = stmt.step();
  stmt.free();

  if (hasVoted) {
    return { poll, alreadyVoted: true };
  }

  database.run("INSERT INTO poll_user_votes (poll_id, user_id, option_index, created_at) VALUES (?, ?, ?, ?)", [
    pollId,
    userId,
    optionIndex,
    new Date().toISOString()
  ]);

  const votes: Record<number, number> = { ...(poll.votes || {}) };
  votes[optionIndex] = (votes[optionIndex] || 0) + 1;

  const updated = await savePoll({
    ...poll,
    votes
  });

  return { poll: updated, alreadyVoted: false };
}

export async function deletePoll(id: string): Promise<boolean> {
  const database = await getDb();
  database.run("DELETE FROM dynamic_polls WHERE id = ?", [id]);
  database.run("DELETE FROM poll_user_votes WHERE poll_id = ?", [id]);
  saveDb();
  return true;
}

export async function registerSubscriber(userId: string, username?: string, firstName?: string): Promise<void> {
  const database = await getDb();
  const now = new Date().toISOString();
  database.run(`
    INSERT INTO subscribers (telegram_user_id, telegram_username, telegram_first_name, created_at, last_seen)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(telegram_user_id) DO UPDATE SET
      telegram_username = excluded.telegram_username,
      telegram_first_name = excluded.telegram_first_name,
      last_seen = excluded.last_seen
  `, [String(userId), username || null, firstName || null, now, now]);
  saveDb();
}

export async function getSubscribersCount(): Promise<number> {
  const database = await getDb();
  const res = database.exec("SELECT COUNT(*) as count FROM subscribers");
  if (res.length > 0 && res[0].values.length > 0) {
    return Number(res[0].values[0][0]) || 0;
  }
  return 0;
}

// ==========================================
// Payment Methods Management
// ==========================================
export async function getAllPaymentMethods(): Promise<PaymentMethod[]> {
  const database = await getDb();
  const res = database.exec("SELECT * FROM payment_methods ORDER BY priority_order ASC");
  if (!res || res.length === 0) return [];
  const columns = res[0].columns;
  return res[0].values.map(row => {
    const obj: any = {};
    columns.forEach((col, idx) => { obj[col] = row[idx]; });
    return {
      id: String(obj.id),
      title: String(obj.title || ''),
      category: obj.category as 'national' | 'international' | 'service',
      image_url: obj.image_url ? String(obj.image_url) : null,
      description: String(obj.description || ''),
      is_active: Boolean(obj.is_active),
      priority_order: Number(obj.priority_order || 0),
      updated_at: String(obj.updated_at || '')
    };
  });
}

export async function getPublicPaymentMethods(): Promise<PaymentMethod[]> {
  const all = await getAllPaymentMethods();
  return all.filter(m => m.is_active);
}

export async function getPaymentMethodById(id: string): Promise<PaymentMethod | null> {
  const all = await getAllPaymentMethods();
  return all.find(m => m.id === id) || null;
}

export async function savePaymentMethod(method: Partial<PaymentMethod> & { id: string }): Promise<PaymentMethod> {
  const database = await getDb();
  const existing = await getPaymentMethodById(method.id);
  const now = new Date().toISOString();

  const title = method.title !== undefined ? method.title : (existing?.title ?? '');
  const category = method.category !== undefined ? method.category : (existing?.category ?? 'service');
  const imageUrl = method.image_url !== undefined ? method.image_url : (existing?.image_url ?? null);
  const description = method.description !== undefined ? method.description : (existing?.description ?? '');
  const isActive = method.is_active !== undefined ? (method.is_active ? 1 : 0) : (existing?.is_active ? 1 : 0);
  const priorityOrder = method.priority_order !== undefined ? method.priority_order : (existing?.priority_order ?? 0);

  database.run(`
    INSERT OR REPLACE INTO payment_methods (id, title, category, image_url, description, is_active, priority_order, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [method.id, title, category, imageUrl, description, isActive, priorityOrder, now]);

  // If this is qr_bolivia and an image_url is provided, also sync it to system_settings qr_image_url
  if (method.id === 'qr_bolivia' && imageUrl) {
    saveSystemSetting('qr_image_url', imageUrl);
  }

  saveDb();
  return (await getPaymentMethodById(method.id))!;
}
