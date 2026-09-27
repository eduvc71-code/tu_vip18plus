const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'src/server/db.ts');
let dbCode = fs.readFileSync(dbPath, 'utf8');

const oldFilter = `
  // Para clientes públicos (Mini App), filtrar para mostrar solo fotos con Status = 1 ("Activa")
  if (filterPublic && Array.isArray(obj.photos)) {
    obj.photos = obj.photos.filter((url: string) => obj.media_status[url] === 1);
  }
`;

const newFilter = `
  // Para clientes públicos (Mini App), filtrar para mostrar solo fotos con Status = 1 ("Activa")
  // EXCLUYENDO contenido VIP/Pago y Efímero (Solo visibles en Admin Panel)
  if (filterPublic && Array.isArray(obj.photos)) {
    obj.photos = obj.photos.filter((url: string) => {
      const isActive = obj.media_status[url] === 1;
      const isPaid = (obj.media_stars && obj.media_stars[url] > 0);
      const isEphemeral = (obj.ephemeral_config && obj.ephemeral_config[url] && obj.ephemeral_config[url].enabled === true);
      return isActive && !isPaid && !isEphemeral;
    });
  }
`;

// Intentamos hacer el replace genérico basado en la lógica existente
const regexFilter = /\/\/\s*Para clientes p[^\n]*\n\s*if\s*\(filterPublic\s*&&\s*Array\.isArray\(obj\.photos\)\)\s*\{\s*obj\.photos\s*=\s*obj\.photos\.filter\(\(url:\s*string\)\s*=>\s*obj\.media_status\[url\]\s*===\s*1\);\s*\}/s;

if (regexFilter.test(dbCode)) {
  dbCode = dbCode.replace(regexFilter, newFilter.trim());
  fs.writeFileSync(dbPath, dbCode);
  console.log('Filtro aplicado con éxito');
} else {
  console.log('No se pudo encontrar el bloque a reemplazar');
}
