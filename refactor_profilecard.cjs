const fs = require('fs');
const path = require('path');

const originalFile = path.join(__dirname, 'src/components/ProfileCard.tsx');
const archiveDir = path.join(__dirname, 'src/archive');
const backupFile = path.join(archiveDir, 'ProfileCard_Stars_Backup.txt');

// Create archive directory if it doesn't exist
if (!fs.existsSync(archiveDir)) {
  fs.mkdirSync(archiveDir, { recursive: true });
}

const code = fs.readFileSync(originalFile, 'utf8');

// Backup original file
fs.writeFileSync(backupFile, code);

// Refactor Code
let cleanCode = code;

// Remove unnecessary imports
cleanCode = cleanCode.replace(/Lock,\s*/g, '');

// 1. Remove unlockedStarsUrls state
cleanCode = cleanCode.replace(/const \[unlockedStarsUrls, setUnlockedStarsUrls\] = useState<Set<string>>\(\(\) => \{[\s\S]*?return unlocked;\s*\}\);\s*/, '');

// 2. Remove useEffect for stars_media_unlocked
cleanCode = cleanCode.replace(/\/\/ Escuchar desbloqueos en tiempo real desde el modal\s*useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);\s*/, '');

// 3. Remove getStarsForUrl
cleanCode = cleanCode.replace(/const getStarsForUrl = \(url: string\): number \| undefined => \{[\s\S]*?return undefined;\s*\};\s*/, '');

// 4. Remove isMediaUnlocked
cleanCode = cleanCode.replace(/const isMediaUnlocked = \(url: string\): boolean => \{[\s\S]*?return false;\s*\};\s*/, '');

// 5. Remove imageStars and isImageStarsLocked
cleanCode = cleanCode.replace(/const imageStars = [^\n]+\n/g, '');
cleanCode = cleanCode.replace(/const isImageStarsLocked = [^\n]+\n/g, '');

// 6. Remove videoStars and isVideoStarsLocked
cleanCode = cleanCode.replace(/const videoStars = [^\n]+\n/g, '');
cleanCode = cleanCode.replace(/const isVideoStarsLocked = [^\n]+\n/g, '');

// 7. Simplify Image Container
cleanCode = cleanCode.replace(/title=\{isImageStarsLocked \? "Contenido de pago con Estrellas - Toca para desbloquear" : "Toca para ampliar"\}/, 'title="Toca para ampliar"');
cleanCode = cleanCode.replace(/\{isImageStarsLocked \? \([\s\S]*?\) : images\.length === 0 \? \(/, '{images.length === 0 ? (');

// 8. Remove Image Star Price bubbles
cleanCode = cleanCode.replace(/\{selectedImage && profile\.media_stars\?\.\[selectedImage\] && !isImageStarsLocked && \([\s\S]*?\}\s*\}\)/, '');

// 9. Simplify ZoomIn for Image
cleanCode = cleanCode.replace(/!isImageStarsLocked && /g, '');

// 10. Simplify Video Container
cleanCode = cleanCode.replace(/title=\{isVideoStarsLocked \? "Video de pago con Estrellas - Toca para desbloquear" : "Toca para ampliar video"\}/, 'title="Toca para ampliar video"');
cleanCode = cleanCode.replace(/\{isVideoStarsLocked \? \([\s\S]*?\) : \(/, '(');
cleanCode = cleanCode.replace(/<video[\s\S]*?className="absolute inset-0 w-full h-full object-cover filter blur-\[11px\] scale-105 opacity-95 brightness-95 contrast-105 select-none"[\s\S]*?\/>/, '');

// Clean up the remainder of the Video unlocked part
cleanCode = cleanCode.replace(/<div className="absolute inset-0 bg-black\/25 pointer-events-none" \/>[\s\S]*?Estrellas<\/span>\s*<\/div>\s*<\/div>\s*<\/div>\s*\) : \(/, '');


// The above naive replace might fail for the complex video block, let's just do a specific manual replace.
// Actually, let's rewrite the video block replacement perfectly.
const videoMatch = code.match(/\{isVideoStarsLocked \? \([\s\S]*?\) : \([\s\S]*?<video[\s\S]*?className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"[\s\S]*?\/>\s*\)\}/);

if (videoMatch) {
  const replacement = `{
                  <video
                    key={selectedVideo}
                    src={selectedVideo}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                }`;
  cleanCode = cleanCode.replace(videoMatch[0], replacement);
}

// Remove video price bubble
cleanCode = cleanCode.replace(/\{selectedVideo && profile\.media_stars\?\.\[selectedVideo\] && !isVideoStarsLocked && \([\s\S]*?\}\s*\}\)/, '');

// Remove zoomIn condition for video
cleanCode = cleanCode.replace(/!isVideoStarsLocked && /g, '');

fs.writeFileSync(originalFile, cleanCode);
console.log('Refactor complete and backup created');
