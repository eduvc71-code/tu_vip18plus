const fs = require('fs');
let c = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

c = c.replace(
  '{/* Acciones inferiores */}\n                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">\n                              <div className="flex items-center gap-2">',
  '{/* Acciones inferiores */}\n                            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-2 pt-1 w-full">\n                              <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 w-full">'
);

fs.writeFileSync('src/components/AdminPanel.tsx', c, 'utf8');
console.log('Fixed buttons');
