const fs = require('fs');
const content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const typos = {
  ' Aqui ': ' Aquí ',
  ' alli ': ' allí ',
  ' mas ': ' más ',
  ' Si ': ' Sí ',
  ' ahi ': ' ahí ',
  ' todavia ': ' todavía ',
  ' Todavia ': ' Todavía ',
  ' dia ': ' día ',
  ' Dia ': ' Día ',
  ' guia ': ' guía ',
  ' Guia ': ' Guía ',
  ' a traves ': ' a través ',
  ' traves ': ' través ',
  ' exito ': ' éxito ', // careful with exitosamente
  ' Exito ': ' Éxito ',
  ' por que ': ' por qué ', // as question
  ' Por que ': ' Por qué ',
  ' Como ': ' Cómo ', // usually
  ' como ': ' cómo ',
  ' Que ': ' Qué ',
  ' Cual ': ' Cuál ',
  ' Quien ': ' Quién '
};

let found = false;
for (const [bad, good] of Object.entries(typos)) {
  if (content.includes(bad)) {
    console.log(`Found: "${bad}" -> should be "${good}"`);
    found = true;
  }
}
if (!found) console.log('No common typos found!');
