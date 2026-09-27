const fs = require('fs');
const content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const matches = content.match(/>[^<{}]+</g);
if (matches) {
  const texts = matches
    .map(m => m.slice(1, -1).trim())
    .filter(m => m.length > 2 && /[a-zA-Z]/.test(m));
  
  const unique = Array.from(new Set(texts));
  fs.writeFileSync('texts.txt', unique.join('\n'), 'utf8');
}
