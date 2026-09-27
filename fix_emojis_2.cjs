const fs = require('fs');

const files = ['src/components/AdminPanel.tsx', 'src/server/db.ts'];

const dict = {
  'ðŸš€': '🚀',
  'â ¤ï¸ ': '❤️',
  'â  ': '⭐',
  'ðŸ‘ ': '👍',
  'ðŸ’Ž': '💎',
  'ðŸ’«': '💫',
  'ðŸ“¦': '📦',
  'ðŸ’¾': '💾',
  'ðŸ—‘ï¸ ': '🗑️',
  'ðŸ“²': '📲',
  'âš¡': '⚡',
  'ðŸŽ‰': '🎉',
  'ðŸ’¬': '💬',
  'ðŸ”’': '🔒',
  'â ³': '⏳',
  'ðŸ“ ': '📌',
  'ðŸŽ¥': '🎥',
  'ðŸ“¸': '📸',
  'âœ¨': '✨',
  'â¬†ï¸ ': '⬆️',
  'âšï¸ ': '⚠️',
  'âœ ï¸ ': '✍️',
  'âœ…': '✅',
  'â€¢': '•',
  'â‹®': '⋮',
  'ðŸ˜ ': '😍',
  'ðŸ˜˜': '😘',
  'ðŸ’¦': '💦',
  'ðŸ˜ˆ': '😈',
  'ðŸ ‘': '🍑',
  'ðŸ¥µ': '🥵',
  'â­ ': '⭐',
  'ðŸ‡§ðŸ‡´': '🇧🇴',
  'ðŸ§¸ðŸ©·': '🧚‍♀️', // roughly
  'â† ': '←',
  'ðŸ¤–': '🤖',
  'ðŸ“¥': '📥',
  'âœ“': '✓'
};

for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [bad, good] of Object.entries(dict)) {
    text = text.split(bad).join(good);
  }
  fs.writeFileSync(file, text, 'utf8');
}
