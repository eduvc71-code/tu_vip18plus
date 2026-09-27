const fs = require('fs');
let c = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
c = c.replace(/Publicar con Estrellas â­ /g, 'Publicar con Estrellas ⭐️');
c = c.replace(/â­  Poner como Portada/g, '⭐️ Poner como Portada');
c = c.replace(/â  Foto seleccionada como Portada Principal/g, '⭐️ Foto seleccionada como Portada Principal');
c = c.replace(/ðŸ—‘ï¸  Archivo eliminado físicamente/g, '🗑️ Archivo eliminado físicamente');
c = c.replace(/âšï¸  ¿Estás seguro/g, '⚠️ ¿Estás seguro');
fs.writeFileSync('src/components/AdminPanel.tsx', c, 'utf8');

let b = fs.readFileSync('src/components/B2Manager.tsx', 'utf8');
b = b.replace('/api/admin/b2/files?prefix=tu-vip/backups/', '/api/admin/b2/files?prefix=tu-vip/');
b = b.replace('No se encontraron respaldos en la ruta <span className="font-mono text-[10px] text-zinc-600">tu-vip/backups/</span>', 'No se encontraron archivos en la nube B2');
b = b.replace('Buscar backup por fecha o nombre...', 'Buscar archivo por nombre...');
b = b.replace('title="Eliminar este backup"', 'title="Eliminar archivo de B2"');
fs.writeFileSync('src/components/B2Manager.tsx', b, 'utf8');
console.log('Fixed texts and B2 prefix');
