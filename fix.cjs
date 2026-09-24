const fs = require('fs');
let c = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
c = c.replace('HelpCircle,\\n  Heart,', 'HelpCircle,\n  Heart,');
fs.writeFileSync('src/components/AdminPanel.tsx', c, 'utf8');
