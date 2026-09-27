const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/ProfileCard.tsx');
let code = fs.readFileSync(file, 'utf8');

// 1. Remove the completely misplaced first zoom icon
code = code.replace(
  /<span className="text-\[10px\] text-zinc-500 font-mono">\(\{videos\.length\}\)[\s\S]*?<\/span>/,
  '<span className="text-[10px] text-zinc-500 font-mono">({videos.length})</span>'
);

// 2. Insert ZoomIn for Images just after <EphemeralViewer ... /> )}
code = code.replace(
  /<EphemeralViewer[\s\S]*?\/>\s*\)\}/,
  (match) => match + `\n
              {showEnlargeIcon && images.length > 0 && (
                <div className="absolute top-2.5 right-2.5 z-30 pointer-events-none animate-bounce">
                  <div className="bg-black/50 backdrop-blur-sm p-1.5 rounded-full border border-white/20 shadow-xl">
                    <ZoomIn className="w-4 h-4 text-white drop-shadow-md" />
                  </div>
                </div>
              )}
`
);

// We already have the second zoom for Videos right after <video />
// Let's verify if the second zoom is properly placed inside the relative container.
// Yes, the video zoom is after `<video ... />`.

fs.writeFileSync(file, code);
console.log('Fixed Zoom placement');
