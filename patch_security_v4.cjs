const fs = require('fs');
const path = require('path');

const telegramPath = path.join(__dirname, 'src/server/telegram.ts');
let tgCode = fs.readFileSync(telegramPath, 'utf8');

// Regex to remove the bypass
tgCode = tgCode.replace(
  /\s*if\s*\(\s*parsedUser\s*&&\s*parsedUser\.id\s*\)\s*\{\s*return\s*\{\s*valid:\s*true,\s*user:\s*parsedUser\s*\};\s*\}/,
  "\n    // [Seguridad V3] Fallback eliminado. Si la firma HMAC no coincide, falla."
);

fs.writeFileSync(telegramPath, tgCode);
console.log('Regex Parche V3 Aplicado');
