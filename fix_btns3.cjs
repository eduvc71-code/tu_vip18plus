const fs = require('fs');
let c = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

c = c.replace(
  'className="ml-auto py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-all cursor-pointer"\n                                >\n                                  Cerrar Vista',
  'className="w-full sm:w-auto sm:ml-auto py-3 sm:py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-all cursor-pointer"\n                                >\n                                  Cerrar Vista'
);

fs.writeFileSync('src/components/AdminPanel.tsx', c, 'utf8');
console.log('Fixed Cerrar Vista button');
