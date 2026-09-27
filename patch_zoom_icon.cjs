const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/ProfileCard.tsx');
let code = fs.readFileSync(file, 'utf8');

// 1. Add ZoomIn to imports
if (!code.includes('ZoomIn')) {
  code = code.replace(
    /import \{([^}]+)\} from 'lucide-react';/,
    (match, p1) => {
      return `import {${p1}, ZoomIn } from 'lucide-react';`;
    }
  );
}

// 2. Add State inside ProfileCard
if (!code.includes('showEnlargeIcon')) {
  const stateCode = `
  const [showEnlargeIcon, setShowEnlargeIcon] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShowEnlargeIcon(false), 5000);
    return () => clearTimeout(timer);
  }, []);
`;
  code = code.replace(
    /export const ProfileCard: React.FC<ProfileCardProps> = \(\{[\s\S]*?\}\) => \{/,
    (match) => match + stateCode
  );
}

// 3. Add icon to Image container
const imgIconCode = `
              {showEnlargeIcon && !isImageStarsLocked && images.length > 0 && (
                <div className="absolute top-2.5 right-2.5 z-30 pointer-events-none animate-bounce">
                  <div className="bg-black/50 backdrop-blur-sm p-1.5 rounded-full border border-white/20 shadow-xl">
                    <ZoomIn className="w-4 h-4 text-white drop-shadow-md" />
                  </div>
                </div>
              )}
`;

if (!code.includes('showEnlargeIcon && !isImageStarsLocked')) {
  code = code.replace(
    /(\{selectedImage && profile\.media_stars\?\.\[selectedImage\] && !isImageStarsLocked && \([\s\S]*?\}\))/g,
    (match) => match + imgIconCode
  );
}

// 4. Add icon to Video container
const vidIconCode = `
                {showEnlargeIcon && !isVideoStarsLocked && videos.length > 0 && (
                  <div className="absolute top-2.5 right-2.5 z-30 pointer-events-none animate-bounce">
                    <div className="bg-black/50 backdrop-blur-sm p-1.5 rounded-full border border-white/20 shadow-xl">
                      <ZoomIn className="w-4 h-4 text-white drop-shadow-md" />
                    </div>
                  </div>
                )}
`;

if (!code.includes('showEnlargeIcon && !isVideoStarsLocked')) {
  code = code.replace(
    /(\{selectedVideo && profile\.media_stars\?\.\[selectedVideo\] && !isVideoStarsLocked && \([\s\S]*?\}\))/g,
    (match) => match + vidIconCode
  );
}

fs.writeFileSync(file, code);
console.log('Icon applied');
