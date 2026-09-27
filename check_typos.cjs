const fs = require('fs');
const content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const typos = {
  'Mobil': 'Móvil',
  'elije': 'elige',
  'Elije': 'Elige',
  'actulizar': 'actualizar',
  'escanner': 'escáner',
  'Escanner': 'Escáner',
  'Exito': 'Éxito',
  'exito': 'éxito',
  'Botton': 'Botón',
  'botton': 'botón',
  'Atras': 'Atrás',
  'atras': 'atrás',
  'Tambien': 'También',
  'Tambíen': 'También',
  'despues': 'después',
  'Despues': 'Después',
  'Nesecita': 'Necesita',
  'nesecita': 'necesita',
  'Nesecito': 'Necesito',
  'Mobil': 'Móvil',
  'Mobilidad': 'Movilidad',
  'Siguente': 'Siguiente',
  'siguente': 'siguiente',
  'Adminstrador': 'Administrador',
  'Toda via': 'Todavía',
  'Aun': 'Aún',
  'aun ': 'aún '
};

let found = false;
for (const [bad, good] of Object.entries(typos)) {
  if (content.includes(bad)) {
    console.log(`Found: ${bad} -> should be ${good}`);
    found = true;
  }
}
if (!found) console.log('No common typos found!');
