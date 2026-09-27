const fs = require('fs');

const file = 'src/components/AdminPanel.tsx';
let text = fs.readFileSync(file, 'utf8');

const dict = {
  'Ã¡': 'á',
  'Ã©': 'é',
  'Ã­': 'í', // This is Ã + soft hyphen (sometimes hidden)
  'Ã³': 'ó',
  'Ãº': 'ú',
  'Ã±': 'ñ',
  'Ã ': 'Á',
  'Ã‰': 'É',
  'Ã\x8D': 'Í',
  'Ã“': 'Ó',
  'Ãš': 'Ú',
  'Ã‘': 'Ñ',
  'Â¿': '¿',
  'Â¡': '¡',
  'ðŸ”´': '🔴',
  'ðŸŸ¢': '🟢',
  'ðŸ’¡': '💡',
  'âž¡ï¸': '➡️',
  'â ¤ï¸': '❤️',
  'â  ': '⭐',
  'ðŸ”¥': '🔥',
  'ðŸ‘ ': '👍',
  'ðŸ“¢': '📢',
  'ðŸŒŽ': '🌍',
  'ðŸŽ ': '🎁',
  'ðŸ’‹': '💋',
  'ðŸ“±': '📱',
  'ðŸ–¼ï¸': '🖼️',
  'âŽ‹': '⎋'
};

// Also replace the literal soft-hyphen version of Ã­ which is 'Ã\xAD'
dict['Ã\xAD'] = 'í';

for (const [bad, good] of Object.entries(dict)) {
  text = text.split(bad).join(good);
}

// Just to be absolutely sure we get any leftover 'Ã\xAD' invisible chars
text = text.replace(/Ã\xAD/g, 'í');

fs.writeFileSync(file, text, 'utf8');
