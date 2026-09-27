
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');

const dbPath = path.join(__dirname, 'data', 'vip18plus_local.db');
if (!fs.existsSync(dbPath)) {
  console.log('No DB found at ' + dbPath);
  process.exit(1);
}

const db = new sqlite3.Database(dbPath);

async function check() {
  console.log('--- DB INTEGRITY CHECK ---');
  
  // 1. Check duplicate profiles
  db.all('SELECT name, COUNT(*) as count FROM profiles GROUP BY name HAVING count > 1', (err, rows) => {
    if (err) console.error(err);
    else {
      console.log('\n[Duplicados en Perfiles (por nombre)]:');
      if (rows.length === 0) console.log(' Ninguno.');
      else rows.forEach(r => console.log( - Nombre: '' (Repetido  veces)));
    }
  });

  // 2. Check duplicate payments
  db.all('SELECT title, COUNT(*) as count FROM payment_methods GROUP BY title HAVING count > 1', (err, rows) => {
    if (err) console.error(err);
    else {
      console.log('\n[Duplicados en Metodos de Pago (por titulo)]:');
      if (rows.length === 0) console.log(' Ninguno.');
      else rows.forEach(r => console.log( - Título: '' (Repetido  veces)));
    }
  });

  // 3. Check orphaned media files
  // Collect all files referenced in DB
  const referencedFiles = new Set();
  
  db.all('SELECT photos, videos FROM profiles', (err, rows) => {
    if (err) return;
    rows.forEach(r => {
      try {
        const p = JSON.parse(r.photos || '[]');
        const v = JSON.parse(r.videos || '[]');
        p.forEach(x => referencedFiles.add(x.split('/').pop()));
        v.forEach(x => referencedFiles.add(x.split('/').pop()));
      } catch(e){}
    });
    
    db.all('SELECT image_url FROM payment_methods', (err, rows2) => {
      rows2.forEach(r => {
        if (r.image_url) referencedFiles.add(r.image_url.split('/').pop());
      });
      
      db.all('SELECT value FROM system_settings WHERE key IN (''qr_image_url'', ''welcome_media_url'')', (err, rows3) => {
        rows3.forEach(r => {
          if (r.value) referencedFiles.add(r.value.split('/').pop());
        });

        // Now check actual files in public/uploads and public/uploads/tg_cache
        const uploadsDir = path.join(__dirname, 'public', 'uploads');
        let actualFiles = [];
        if (fs.existsSync(uploadsDir)) {
          actualFiles = fs.readdirSync(uploadsDir).filter(f => fs.statSync(path.join(uploadsDir, f)).isFile());
        }
        const cacheDir = path.join(__dirname, 'public', 'uploads', 'tg_cache');
        if (fs.existsSync(cacheDir)) {
          actualFiles = actualFiles.concat(fs.readdirSync(cacheDir).filter(f => fs.statSync(path.join(cacheDir, f)).isFile()));
        }

        console.log('\n[Residuos: Archivos huérfanos (Físicos pero no en la Base de Datos)]:');
        let orphans = 0;
        actualFiles.forEach(f => {
          if (f === '.gitkeep' || f === '.keep') return;
          if (!referencedFiles.has(f)) {
            console.log( - Archivo residual: );
            orphans++;
          }
        });
        if (orphans === 0) console.log(' Ninguno.');
      });
    });
  });

  // 4. Check empty profiles
  db.all('SELECT id, name FROM profiles WHERE name IS NULL OR name = ''''', (err, rows) => {
    if (err) console.error(err);
    else {
      console.log('\n[Residuos: Perfiles Vacíos o Sin Nombre]:');
      if (rows.length === 0) console.log(' Ninguno.');
      else rows.forEach(r => console.log( - ID: ));
    }
  });
}
check();

