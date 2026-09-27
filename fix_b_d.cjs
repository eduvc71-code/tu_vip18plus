const fs = require('fs');
let c = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
c = c.replace(/BÃ SICOS/g, 'BÁSICOS');
c = c.replace(/DINÃ MICAS/g, 'DINÁMICAS');
fs.writeFileSync('src/components/AdminPanel.tsx', c, 'utf8');
