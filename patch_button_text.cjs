const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/RequestModal.tsx');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /\{submitting \? 'Notificando\.\.\.' : 'InformaciÃ³n SuscripciÃ³n VIP'\}/g,
  `'Siguiente'`
);

fs.writeFileSync(file, code);
console.log('Button text patched');
