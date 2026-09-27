const fs = require('fs');
const path = require('path');

const telegramPath = path.join(__dirname, 'src/server/telegram.ts');
let tgCode = fs.readFileSync(telegramPath, 'utf8');

// Restaurar isPinAuth y admin para que el PIN funcione, pero acortar la expiración a 24 horas
tgCode = tgCode.replace(
  `{ sub: String(telegramUserId), role: 'admin', isPinAuth: true, iat: Math.floor(Date.now() / 1000) },
      signingSecret,
      { expiresIn: '30d' }`,
  `{ sub: String(telegramUserId), role: 'admin', isPinAuth: true, iat: Math.floor(Date.now() / 1000) },
      signingSecret,
      { expiresIn: '24h' } // [Seguridad V6] Expiración acortada a 24 horas`
);

tgCode = tgCode.replace(
  `if (adminIds.length === 0 || isAdminUser(decoded.sub)) {`,
  `if (adminIds.length === 0 || isAdminUser(decoded.sub) || decoded.isPinAuth || decoded.sub === 'admin') { // Restaurado: Es seguro porque el JWT ya no se puede falsificar`
);

fs.writeFileSync(telegramPath, tgCode);
console.log('Parche V6 (Restaurar PIN Web y acortar expiración JWT) Aplicado');
