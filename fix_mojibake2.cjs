const fs = require('fs');
const file = 'src/components/AdminPanel.tsx';
let text = fs.readFileSync(file, 'utf8');

text = text.replace(/BÃ\s*SICOS/g, 'BÁSICOS');
text = text.replace(/DINÃ\s*MICAS/g, 'DINÁMICAS');
text = text.replace(/â”€/g, '─'); // box drawing light horizontal

fs.writeFileSync(file, text, 'utf8');
