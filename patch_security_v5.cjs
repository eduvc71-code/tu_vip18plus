const fs = require('fs');
const path = require('path');

// --- TELEGRAM.TS PATCH ---
const telegramPath = path.join(__dirname, 'src/server/telegram.ts');
let tgCode = fs.readFileSync(telegramPath, 'utf8');

// Fix 1: Eliminar el JWT_SECRET hardcodeado
tgCode = tgCode.replace(
  `const signingSecret = process.env.ADMIN_SIGNING_SECRET || 'secret_jwt_key_danii_vip';`,
  `const signingSecret = process.env.ADMIN_SIGNING_SECRET || require('crypto').createHash('sha256').update(token || 'safe_fallback').digest('hex').substring(0, 32);`
);

// Fix 2: Eliminar el bypass de isPinAuth y hacer que dependa de isAdminUser, 
// a menos que literalmente no haya adminIds configurados.
tgCode = tgCode.replace(
  `if (adminIds.length === 0 || isAdminUser(decoded.sub) || decoded.isPinAuth || decoded.sub === 'admin') {`,
  `if (adminIds.length === 0 || isAdminUser(decoded.sub)) {`
);

fs.writeFileSync(telegramPath, tgCode);


// --- ROUTES.TS PATCH ---
const routesPath = path.join(__dirname, 'src/server/routes.ts');
let routesCode = fs.readFileSync(routesPath, 'utf8');

// Fix 3: Forzar el precio real de las Estrellas (evitar falsificación del cliente)
const oldStarsLogic = `const starCount = Number(stars) || (mediaUrl && profile.media_stars?.[mediaUrl]) || 50;`;
const newStarsLogic = `const dbPrice = mediaUrl ? profile.media_stars?.[mediaUrl] : null;
      const starCount = dbPrice ? dbPrice : (Number(stars) || 50);`;

routesCode = routesCode.replace(oldStarsLogic, newStarsLogic);

fs.writeFileSync(routesPath, routesCode);
console.log('Parche V5 (JWT y Estrellas) Aplicado con Éxito');
