import fs from 'fs';
let content = fs.readFileSync('src/server/routes.ts', 'utf8');
if (content.charCodeAt(0) !== 0xFEFF) {
  content = '\uFEFF' + content;
  fs.writeFileSync('src/server/routes.ts', content, 'utf8');
}
console.log("Added BOM to routes.ts");
