const fs = require('fs');
const path = require('path');
const routesPath = path.join(__dirname, 'src/server/routes.ts');
let routesCode = fs.readFileSync(routesPath, 'utf8');

routesCode = routesCode.replace(
  /const starCount = Number\(stars\) \|\| \(mediaUrl && profile\.media_stars\?\.\[mediaUrl\]\) \|\| 50;/,
  `// [Seguridad V6] Validar precio desde BD para evitar falsificación de Stars
      const dbPrice = mediaUrl ? profile.media_stars?.[mediaUrl] : null;
      const starCount = dbPrice ? dbPrice : (Number(stars) || 50);`
);

fs.writeFileSync(routesPath, routesCode);
console.log('Parche V6 Estrellas');
