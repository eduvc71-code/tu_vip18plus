const fs = require('fs');
const content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

// A very rough regex to find text inside >...< tags
const matches = content.match(/>[^<{}]+</g);
if (matches) {
  const texts = matches
    .map(m => m.slice(1, -1).trim())
    .filter(m => m.length > 2 && /[a-zA-Z]/.test(m));
  
  // Deduplicate
  const unique = Array.from(new Set(texts));
  console.log(unique.join('\n'));
}
