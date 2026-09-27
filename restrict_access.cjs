const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/App.tsx');
let code = fs.readFileSync(file, 'utf8');

// Update dev/preview bypass to use their specific ID
code = code.replace(
  /setTgUser\(\{\s*id: '123456789',\s*first_name: 'Usuario Demo',\s*username: 'demo_user'\s*\}\);/,
  `setTgUser({
          id: '6461788392',
          first_name: 'IAM DANII VIP (External)',
          username: 'danii_vip'
        });`
);

// Update isAccessAllowed to STRICTLY require 6461788392
code = code.replace(
  /const isAccessAllowed = telegramAuthorized \|\| Boolean\(tgUser\) \|\| isInsideTelegram;/,
  "const isAccessAllowed = String(tgUser?.id) === '6461788392';"
);

fs.writeFileSync(file, code);
console.log('Applied strict access restriction in App.tsx');
