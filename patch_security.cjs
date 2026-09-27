const fs = require('fs');
const path = require('path');

const telegramPath = path.join(__dirname, 'src/server/telegram.ts');
let tgCode = fs.readFileSync(telegramPath, 'utf8');

// 1. Fix hardcoded PINs in telegram.ts
tgCode = tgCode.replace(
  /const validPin = process\.env\.ADMIN_PIN \|\| 'admin123';/,
  "const validPin = process.env.ADMIN_PIN || 'admin_secret';"
);

tgCode = tgCode.replace(
  /if \(potentialPin === validPin \|\| potentialPin === '2024' \|\| potentialPin === '450'\) \{/g,
  "if (potentialPin === validPin) {"
);

// 2. Fix TWA Verification Bypass in telegram.ts
tgCode = tgCode.replace(
  /      if \(parsedUser && parsedUser\.id\) \{\s*return \{ valid: true, user: parsedUser \};\s*\}/,
  "      // Fallback retirado por seguridad (Auditoría V2)"
);

fs.writeFileSync(telegramPath, tgCode);

const routesPath = path.join(__dirname, 'src/server/routes.ts');
let routesCode = fs.readFileSync(routesPath, 'utf8');

// 3. Fix hardcoded PINs in routes.ts
routesCode = routesCode.replace(
  /const validPin = process\.env\.ADMIN_PIN \|\| 'admin123';/,
  "const validPin = process.env.ADMIN_PIN || 'admin_secret';"
);

routesCode = routesCode.replace(
  /const isPinMatch = cleanPin && \(cleanPin === validPin \|\| cleanPin === '2024' \|\| cleanPin === '450' \|\| cleanPin === '1818'\);/,
  "const isPinMatch = cleanPin && (cleanPin === validPin);"
);

routesCode = routesCode.replace(
  /const isDefaultAccess = config\.adminIds\.length === 0 && \(cleanPin === '2024' \|\| cleanPin === validPin \|\| cleanPin === '1818'\);/,
  "const isDefaultAccess = config.adminIds.length === 0 && (cleanPin === validPin);"
);


// 4. Fix Webhook Bypass in routes.ts
routesCode = routesCode.replace(
  /if \(secret && incomingSecret && incomingSecret !== secret\) \{/,
  "if (secret && incomingSecret !== secret) {"
);

fs.writeFileSync(routesPath, routesCode);
console.log('Patch aplicado con exito');
