const fs = require('fs');
let c = fs.readFileSync('src/server/routes.ts', 'utf8');

c = c.replace(/import \{\s*listAllB2Files,\s*deleteB2Backup,\s*deleteB2Media,/g, 'import { listAllB2Files, deleteB2Backup,');
c = c.replace(/import \{\s*getAllProfiles,\s*getAllPaymentMethods,\s*getBotMediaQueue,/g, 'import { getAllProfiles,');

fs.writeFileSync('src/server/routes.ts', c, 'utf8');
