const fs = require('fs');
let c = fs.readFileSync('src/server/routes.ts', 'utf8');

c = c.replace(/const b2MediaFiles = await listAllB2Files\('tu-vip\/media\/'\);/, `
      const profilesFiles = await listAllB2Files('tu-vip/profiles/');
      const qrFiles = await listAllB2Files('tu-vip/qr/');
      const botFiles = await listAllB2Files('tu-vip/bot/');
      const b2MediaFiles = [...profilesFiles, ...qrFiles, ...botFiles];
`);

c = c.replace(/if \(key\.startsWith\('tu-vip\/media\/'\)\) dbUrls\.add\(key\);/g, `if (key.startsWith('tu-vip/profiles/') || key.startsWith('tu-vip/qr/') || key.startsWith('tu-vip/bot/')) dbUrls.add(key);`);

fs.writeFileSync('src/server/routes.ts', c, 'utf8');
