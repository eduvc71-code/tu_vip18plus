const fs = require('fs');
let c = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

c = c.replace(/className="w-full sm:w-auto justify-center /g, 'className="');

fs.writeFileSync('src/components/AdminPanel.tsx', c, 'utf8');
console.log('Fixed button widths');
