const fs = require('fs');
const content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
const words = content.match(/[A-ZÁÉÍÓÚÑa-záéíóúñ]{6,}/g) || [];
const unaccented = words.filter(w => !/[ÁÉÍÓÚÑáéíóúñ]/.test(w));
const counts = {};
for(let w of unaccented) {
  counts[w] = (counts[w]||0) + 1;
}
const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
fs.writeFileSync('unaccented.txt', sorted.map(x => `${x[0]}: ${x[1]}`).join('\n'), 'utf8');
