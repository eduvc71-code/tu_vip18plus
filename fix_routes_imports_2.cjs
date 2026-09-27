const fs = require('fs');
let c = fs.readFileSync('src/server/routes.ts', 'utf8');

c = c.replace(/getAllPaymentMethods,\s*getBotMediaQueue,\s*getAllSubscribers,/, 'getAllSubscribers,');

fs.writeFileSync('src/server/routes.ts', c, 'utf8');
