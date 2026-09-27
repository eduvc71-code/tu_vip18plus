const fs = require('fs');
let c = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

c = c.replace(/â ¤ï¸ /g, '❤️');
c = c.replace(/â  /g, '⭐');
c = c.replace(/ðŸ‘ /g, '👍');
c = c.replace(/â­ /g, '⭐');
c = c.replace(/âœ“/g, '✓');
c = c.replace(/âž”/g, '➔');
c = c.replace(/ðŸ¤–/g, '🤖');

fs.writeFileSync('src/components/AdminPanel.tsx', c, 'utf8');
