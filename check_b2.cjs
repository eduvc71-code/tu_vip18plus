const fs = require('fs');
const content = fs.readFileSync('src/components/B2Manager.tsx', 'utf8');

const regex = /\b(huerfanos|huerfano|escaner|Escaner|Escanner|escanner|purga|Purga|purgar|Purgar|Basura|basura|exito|Exito|tambien|Tambien|estan|Estan|informacion|Informacion)\b/ig;
const matches = new Set(content.match(regex));
console.log(Array.from(matches).join(', '));
