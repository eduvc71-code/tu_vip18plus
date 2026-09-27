const fs = require('fs');
const path = require('path');

const telegramPath = path.join(__dirname, 'src/server/telegram.ts');
let tgCode = fs.readFileSync(telegramPath, 'utf8');

tgCode = tgCode.replace(/\/admin 2024/g, '/admin TU_PIN_SECRETO');
tgCode = tgCode.replace(/\/admin admin123/g, '/admin TU_PIN_SECRETO');

fs.writeFileSync(telegramPath, tgCode);
console.log('Mensajes parcheados');
