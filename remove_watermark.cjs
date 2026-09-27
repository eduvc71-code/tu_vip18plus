const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/AdminPanel.tsx');
let code = fs.readFileSync(file, 'utf8');

const target = `          // Dibujar texto en el centro (podrÃ­a ser repetido en diagonal)
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(-Math.PI / 4); // Rotar -45 grados
          ctx.fillText(text, 0, 0);
          ctx.restore();`;

const alternativeTarget = `          // Dibujar texto en el centro (podría ser repetido en diagonal)
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(-Math.PI / 4); // Rotar -45 grados
          ctx.fillText(text, 0, 0);
          ctx.restore();`;

if (code.includes('ctx.translate(canvas.width / 2, canvas.height / 2);')) {
  // Regex to remove the block
  code = code.replace(
    /\/\/ Dibujar texto en el centro[\s\S]*?ctx\.restore\(\);\s*/,
    ''
  );
  fs.writeFileSync(file, code);
  console.log('Removed center watermark');
} else {
  console.log('Could not find watermark code');
}
