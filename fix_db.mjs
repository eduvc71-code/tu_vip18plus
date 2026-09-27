import fs from 'fs';
let content = fs.readFileSync('src/server/db.ts', 'utf8');

const mapping = {
  'Ã¡': 'á',
  'Ã©': 'é',
  'Ã³': 'ó',
  'Ã­': 'í',
  'Ãº': 'ú',
  'Ã±': 'ñ',
  'Ã\x81': 'Á',
  'Ã\x8D': 'Í',
  'Â¿': '¿',
  'Â¡': '¡',
  'â­\x90': '⭐',
  'â\x9D¤': '❤',
  'â\x8F³': '⏳',
  'ðŸš€': '🚀',
  'ðŸŒ\x90': '🌐',
  'ðŸŸ¢': '🟢',
  'ðŸ”´': '🔴',
  'ðŸ¥µ': '🥵',
  'ðŸŽ¥': '🎥',
  'ðŸ§¸': '🧾',
  'ðŸ©·': '🩸',
  'ðŸŒŽ': '🌎',
  'ðŸŽ\x81': '🎁',
  'ðŸ“¢': '📢',
  'ðŸ–¼ï¸': '🖼️',
  'ðŸ“±': '📱',
  'ðŸ’¡': '💡',
  'Ã“': 'Ó',
  'Ã‘': 'Ñ',
  'Ãš': 'Ú',
  'â”€': '─',
  'BOTÃ“N': 'BOTÓN',
  'PESTAÃ‘A': 'PESTAÑA'
};

for (const [bad, good] of Object.entries(mapping)) {
  content = content.split(bad).join(good);
}

// Add BOM just in case, like we did for AdminPanel
if (content.charCodeAt(0) !== 0xFEFF) {
  content = '\uFEFF' + content;
}

fs.writeFileSync('src/server/db.ts', content, 'utf8');
console.log("Fixed db.ts");
