const fs = require('fs');

const dict = {
  'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã\xAD': 'í', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã±': 'ñ',
  'Ã ': 'Á', 'Ã‰': 'É', 'Ã\x8D': 'Í', 'Ã“': 'Ó', 'Ãš': 'Ú', 'Ã‘': 'Ñ'
};

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = require('path').join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      processDir(p);
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      let content = fs.readFileSync(p, 'utf8');
      let modified = content;
      for (const [bad, good] of Object.entries(dict)) {
        modified = modified.split(bad).join(good);
      }
      if (content !== modified) {
        fs.writeFileSync(p, modified, 'utf8');
        console.log(`Mojibake fixed in ${p}`);
      }
    }
  }
}

processDir('src');
