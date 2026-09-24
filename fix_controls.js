const fs = require('fs');
let c = fs.readFileSync('src/components/ProfileCard.tsx', 'utf8');

const imageControlsRegex = /\{\/\* Controles al pie: \{< \.\.\.\.\.\.\.\.\.\. >\} centrados \*\/\}\s*\{images\.length > 1 && \(\s*<div className="mt-1\.5 flex items-center justify-center gap-2\.5">([\s\S]*?)<\/div>\s*\)\}/;
const imageControlsMatch = c.match(imageControlsRegex);
if(imageControlsMatch) {
  let inner = imageControlsMatch[1];
  inner = inner.replace(/pointer-events-none/g, ''); 
  // Add absolute positioning to buttons
  inner = inner.replace(/<button/g, '<button className="pointer-events-auto "');
  
  const replacement = '{images.length > 1 && (<div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2.5 z-10 pointer-events-none" onClick={(e) => e.stopPropagation()}>' + inner + '</div>)}';
  
  c = c.replace(imageControlsRegex, '');
  // Insert inside the closing tag of the relative div
  c = c.replace(/(\{\/\* 1\. SECCIÓN IMÁGENES \*\/\}(?:[\s\S]*?)<\/div>\s*)\<\/div>/, '' + replacement + '\n            </div>');
}
fs.writeFileSync('src/components/ProfileCard.tsx', c);
