const fs = require('fs');
let c = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const regexes = [
  {
    find: /className="py-2 px-3 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-amber-400 border border-amber-500\/30 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"/g,
    repl: 'className="w-full sm:w-auto justify-center py-3 sm:py-2 px-3 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"'
  },
  {
    find: /className="py-2 px-3 rounded-xl bg-sky-500\/20 hover:bg-sky-500\/30 text-sky-300 border border-sky-500\/40 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"/g,
    repl: 'className="w-full sm:w-auto justify-center py-3 sm:py-2 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"'
  },
  {
    find: /className="py-2 px-3 rounded-xl bg-rose-500\/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500\/40 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"/g,
    repl: 'className="w-full sm:w-auto justify-center py-3 sm:py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"'
  },
  {
    find: /className="py-2 px-3 rounded-xl bg-amber-500\/20 hover:bg-amber-500\/30 text-amber-300 border border-amber-500\/40 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"/g,
    repl: 'className="w-full sm:w-auto justify-center py-3 sm:py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"'
  }
];

for (let r of regexes) {
  c = c.replace(r.find, r.repl);
}

fs.writeFileSync('src/components/AdminPanel.tsx', c, 'utf8');
console.log('Fixed button sizes');
