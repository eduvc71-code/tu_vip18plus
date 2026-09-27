import fs from 'fs';

let content = fs.readFileSync('src/server/db.ts', 'utf8');

// 1. Remove sql.js import
content = content.replace(/import initSqlJs, \{ Database \} from 'sql\.js';/, `import Database from 'better-sqlite3';`);

// 2. Add the SqlJsCompatibleDatabase wrapper
const wrapper = `
class SqlJsCompatibleDatabase {
  db: any;

  constructor(bufferOrFile?: any) {
    if (typeof bufferOrFile === 'string') {
      this.db = new Database(bufferOrFile);
    } else if (bufferOrFile && typeof bufferOrFile === 'object') {
      fs.writeFileSync(DB_FILE, bufferOrFile);
      this.db = new Database(DB_FILE);
    } else {
      this.db = new Database(DB_FILE);
    }
    this.db.pragma('journal_mode = WAL');
  }

  exec(sql: string, params?: any[]) {
    try {
      if (sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('PRAGMA')) {
        const stmt = this.db.prepare(sql);
        const rows = params ? stmt.all(...params) : stmt.all();
        if (rows.length === 0) return [];
        const columns = Object.keys(rows[0] as object);
        const values = rows.map((r: any) => columns.map(c => r[c]));
        return [{ columns, values }];
      } else {
        if (params) {
          this.db.prepare(sql).run(...params);
        } else {
          this.db.exec(sql);
        }
        return [];
      }
    } catch(e) {
      if (sql.includes('sqlite_master')) {
         const rows = this.db.prepare(sql).all();
         if (rows.length === 0) return [];
         const columns = Object.keys(rows[0] as object);
         const values = rows.map((r: any) => columns.map(c => r[c]));
         return [{ columns, values }];
      }
      return [];
    }
  }

  run(sql: string, params?: any[]) {
    if (params && params.length > 0) {
      this.db.prepare(sql).run(...params);
    } else {
      if (sql.includes(';') && sql.trim().split(';').length > 2) {
         this.db.exec(sql);
      } else {
         try {
           this.db.prepare(sql).run();
         } catch(e) {
           this.db.exec(sql);
         }
      }
    }
  }

  prepare(sql: string) {
    const stmt = this.db.prepare(sql);
    let boundParams: any[] = [];
    let iterator: any = null;
    let currentRow: any = null;
    return {
      bind: (params: any[]) => { boundParams = params; },
      step: () => {
        if (!iterator) {
           try {
             iterator = stmt.iterate(...boundParams);
           } catch(e) {
             const rows = stmt.all(...boundParams);
             iterator = rows[Symbol.iterator]();
           }
        }
        const res = iterator.next();
        if (res.done) return false;
        currentRow = res.value;
        return true;
      },
      getAsObject: () => currentRow,
      free: () => {
        if (iterator && iterator.return) iterator.return();
      }
    };
  }

  export() {
    return fs.readFileSync(DB_FILE);
  }
}
`;

content = content.replace(/const DB_FILE = path\.join\(DATA_DIR, 'catalogo\.sqlite'\);/, "const DB_FILE = path.join(DATA_DIR, 'catalogo.sqlite');" + wrapper);

// 3. Fix typescript errors by replacing Database with any
content = content.replace(/: Database/g, ': any');
content = content.replace(/<Database>/g, '<any>');

const getDbRegex = /export async function getDb\(\): Promise<any> \{[\s\S]*?return db;\n\}/;
const getDbNew = `export async function getDb(): Promise<any> {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let loadedFromB2 = false;
  if (isB2Configured()) {
    try {
      console.log('[Database] Verificando y sincronizando con Backblaze B2...');
      const b2Buf = await downloadDatabaseFromB2();
      if (b2Buf && b2Buf.length > 0) {
        fs.writeFileSync(DB_FILE, b2Buf);
        db = new SqlJsCompatibleDatabase(DB_FILE);
        loadedFromB2 = true;
        console.log('[Database] BD restaurada desde B2 exitosamente.');
      }
    } catch (err: any) {
      console.warn('[Database] No se pudo restaurar desde B2, usando copia local o inicial:', err?.message || err);
    }
  }

  if (!db) {
    db = new SqlJsCompatibleDatabase(DB_FILE);
    if (fs.existsSync(DB_FILE) && fs.statSync(DB_FILE).size > 0) {
      console.log('[Database] Cargada base local existente.');
    } else {
      console.log('[Database] Inicializando base vacía.');
    }
  }

  initTables(db as any);
  
  // Create Indexes for performance
  db.exec("CREATE INDEX IF NOT EXISTS idx_customer_requests_status ON customer_requests(status);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_customer_requests_created_at ON customer_requests(created_at);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_bot_media_queue_created_at ON bot_media_queue(created_at);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_profiles_priority ON profiles(priority_order, updated_at);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);");

  if (!loadedFromB2) {
    seedInitialData(db as any);
  }
  ensureDefaultSettings(db as any);

  return db;
}`;
content = content.replace(getDbRegex, getDbNew);

// 4. Fix saveDb
const saveDbRegex = /export function saveDb\(\): void \{[\s\S]*?\}, 30000\);\n\}/;
const saveDbNew = `export function saveDb(): void {
  if (!db) return;
  if (b2SyncTimer) clearTimeout(b2SyncTimer);
  b2SyncTimer = setTimeout(async () => {
    try {
      if (fs.existsSync(DB_FILE)) {
        const buffer = fs.readFileSync(DB_FILE);
        console.log(\`[Database] Iniciando respaldo a B2 (\${buffer.length} bytes)...\`);
        await backupDatabaseToB2(buffer);
        console.log('[Database] Snapshot sincronizado exitosamente con Backblaze B2');
      }
    } catch (err: any) {
      console.warn('[Database] Advertencia al sincronizar snapshot con B2:', err?.message);
    }
  }, 30000);
}`;
content = content.replace(saveDbRegex, saveDbNew);

content = content.replace(/const SQL = await initSqlJs\(\);\n/, '');

fs.writeFileSync('src/server/db.ts', content, 'utf8');
