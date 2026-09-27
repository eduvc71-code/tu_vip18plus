const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/server/telegram.ts');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /const signingSecret = process\.env\.ADMIN_SIGNING_SECRET \|\| 'secret_jwt_key_danii_vip';/,
  "const signingSecret = process.env.ADMIN_SIGNING_SECRET || require('crypto').createHash('sha256').update(token + 'jwt').digest('hex').substring(0, 32);"
);

fs.writeFileSync(file, code);
console.log('Fixed JWT Secret');
