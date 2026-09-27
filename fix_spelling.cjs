const fs = require('fs');
let c = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

c = c.replace(/reacciï¿½n/g, 'reacción');
c = c.replace(/actualizarï¿½/g, 'actualizará');
c = c.replace(/automï¿½ticamente/g, 'automáticamente');
c = c.replace(/visualizaciï¿½n/g, 'visualización');
c = c.replace(/Sepï¿½ralos/g, 'Sepáralos');
c = c.replace(/ï¿½/g, 'ñ'); // Just in case, usually replacement character

fs.writeFileSync('src/components/AdminPanel.tsx', c, 'utf8');
