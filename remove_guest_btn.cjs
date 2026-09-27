const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/TelegramGate.tsx');
let code = fs.readFileSync(file, 'utf8');

// Hide the "Continuar al Canal VIP Free" button entirely to prevent confusion for non-authorized users
code = code.replace(
  /\{onContinue && \([\s\S]*?<\/button>\s*\)\}/,
  ""
);

fs.writeFileSync(file, code);
console.log('Removed guest continue button');
