const fs = require('fs');
let c = fs.readFileSync('src/server/db.ts', 'utf8');
c = c.replace(/transferÃªncia/g, 'transferência');
fs.writeFileSync('src/server/db.ts', c, 'utf8');
