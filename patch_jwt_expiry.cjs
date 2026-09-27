const fs = require('fs');
const path = require('path');
const telegramPath = path.join(__dirname, 'src/server/telegram.ts');
let tgCode = fs.readFileSync(telegramPath, 'utf8');

tgCode = tgCode.replace(
  /\{ expiresIn:\s*'30d'\s*\}/g,
  "{ expiresIn: '24h' } // [Seguridad V6] Expiración acortada"
);

fs.writeFileSync(telegramPath, tgCode);
console.log('JWT Expires Patched');
