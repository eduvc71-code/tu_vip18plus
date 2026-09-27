import fs from 'fs';
let content = fs.readFileSync('src/server/db.ts', 'utf8');
const regex = /[ÃÂ][\x80-\xFF]|â[\x80-\xFF]{2}|ð[\x80-\u017F]{3}/g;
let matches = [...new Set(content.match(regex))];
console.log(matches);
