const fs = require('fs');
let c = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

c = c.replace(
  /\{\/\* Acciones inferiores \*\/\}\s*<div className="flex flex-wrap items-center justify-between gap-2 pt-1">\s*<div className="flex items-center gap-2">/g,
  '{/* Acciones inferiores */}\n                              <div className="flex flex-col sm:flex-row flex-wrap items-stretch justify-between gap-2 pt-2 w-full">\n                                <div className="flex flex-col sm:flex-row flex-wrap items-stretch gap-2 w-full sm:w-auto">'
);

fs.writeFileSync('src/components/AdminPanel.tsx', c, 'utf8');
console.log('Fixed buttons regex');
