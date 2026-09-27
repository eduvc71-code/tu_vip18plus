const fs = require('fs');
let content = fs.readFileSync('src/server/db.ts', 'utf8');
content = content.replace(/const SQL = await initSqlJs\(\);\n/, '');
fs.writeFileSync('src/server/db.ts', content, 'utf8');
