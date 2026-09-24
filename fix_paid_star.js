const fs = require('fs');
let c = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
c = c.replace(/disabled={publishingPaidMedia || paidModalStarCount <= 0}/g, 'disabled={publishingPaidMedia || paidModalStarCount === \\'\\' || paidModalStarCount <= 0}');
fs.writeFileSync('src/components/AdminPanel.tsx', c, 'utf8');
