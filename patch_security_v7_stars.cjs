const fs = require('fs');
const path = require('path');
const routesPath = path.join(__dirname, 'src/server/routes.ts');
let routesCode = fs.readFileSync(routesPath, 'utf8');

routesCode = routesCode.replace(
  /const dbPrice = mediaUrl \? profile\.media_stars\?\.\[mediaUrl\] : null;\s*const starCount = dbPrice \? dbPrice : \(Number\(stars\) \|\| 50\);/g,
  `const dbPrice = mediaUrl ? profile.media_stars?.[mediaUrl] : null;
      if (!dbPrice || dbPrice <= 0) {
        res.status(400).json({ error: 'Este contenido no tiene un precio válido configurado.' });
        return;
      }
      const starCount = dbPrice;`
);

fs.writeFileSync(routesPath, routesCode);
console.log('Parche V7 Estrellas');
