const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/ProfileCard.tsx');
let code = fs.readFileSync(file, 'utf8');

// Replace the buggy `(` and `)}` around video
code = code.replace(
  /\(\s*<video\s*key=\{selectedVideo\}\s*src=\{selectedVideo\}[\s\S]*?\/>\s*\)\}/,
  `<video
                    key={selectedVideo}
                    src={selectedVideo}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {showEnlargeIcon && videos.length > 0 && (
                    <div className="absolute top-2.5 right-2.5 z-30 pointer-events-none animate-bounce">
                      <div className="bg-black/50 backdrop-blur-sm p-1.5 rounded-full border border-white/20 shadow-xl">
                        <ZoomIn className="w-4 h-4 text-white drop-shadow-md" />
                      </div>
                    </div>
                  )}`
);

// We also need to fix the stray zoomIn icon inside the Videos label:
// `({videos.length}) {showEnlargeIcon && images.length > 0 && ( ... )} </span>`
code = code.replace(
  /<span className="text-\[10px\] text-zinc-500 font-mono">\(\{videos\.length\}\)\s*\{showEnlargeIcon && images\.length > 0 && \([\s\S]*?\}\)\s*<\/span>/,
  '<span className="text-[10px] text-zinc-500 font-mono">({videos.length})</span>'
);

fs.writeFileSync(file, code);
console.log('Fixed syntax errors');
