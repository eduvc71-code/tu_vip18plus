const fs = require('fs');
const path = require('path');

const telegramPath = path.join(__dirname, 'src/server/telegram.ts');
let tgCode = fs.readFileSync(telegramPath, 'utf8');

// Fix 1: Eliminar TWA Bypass por completo
const twaBypass = `    if (parsedUser && parsedUser.id) {
      return { valid: true, user: parsedUser };
    }`;
tgCode = tgCode.replace(twaBypass, `    // [Seguridad V3] Fallback eliminado. Si la firma HMAC no coincide, se rechaza.`);

// Fix 2: Generar un Webhook Secret fuerte automáticamente
tgCode = tgCode.replace(
  `const secret = process.env.TELEGRAM_WEBHOOK_SECRET || '';`,
  `const secret = process.env.TELEGRAM_WEBHOOK_SECRET || require('crypto').createHash('sha256').update(token).digest('hex').substring(0, 32);`
);

// Fix 3: No permitir PIN vacío o por defecto (admin_secret)
tgCode = tgCode.replace(
  `const validPin = process.env.ADMIN_PIN || 'admin_secret';`,
  `const validPin = process.env.ADMIN_PIN;`
);

fs.writeFileSync(telegramPath, tgCode);


const routesPath = path.join(__dirname, 'src/server/routes.ts');
let routesCode = fs.readFileSync(routesPath, 'utf8');

// Fix 3 (routes): No permitir PIN por defecto
routesCode = routesCode.replace(
  `const validPin = process.env.ADMIN_PIN || 'admin_secret';`,
  `const validPin = process.env.ADMIN_PIN;`
);

// Asegurar que el webhook en routes falle si el secreto no coincide
routesCode = routesCode.replace(
  `if (secret && incomingSecret !== secret) {`,
  `if (!incomingSecret || incomingSecret !== secret) {`
);

fs.writeFileSync(routesPath, routesCode);
console.log('Parche V3 Aplicado');
