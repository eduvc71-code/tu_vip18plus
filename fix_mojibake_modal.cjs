const fs = require('fs');
const file = 'src/components/RequestModal.tsx';
let text = fs.readFileSync(file, 'utf8');

const dict = {
  'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã\xAD': 'í', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã±': 'ñ',
  'Ã ': 'Á', 'Ã‰': 'É', 'Ã\x8D': 'Í', 'Ã“': 'Ó', 'Ãš': 'Ú', 'Ã‘': 'Ñ'
};

for (const [bad, good] of Object.entries(dict)) {
  text = text.split(bad).join(good);
}

fs.writeFileSync(file, text, 'utf8');
