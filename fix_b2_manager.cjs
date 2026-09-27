const fs = require('fs');

// 1. types.ts
let t = fs.readFileSync('src/types.ts', 'utf8');
if (!t.includes('B2File')) {
  t += `\nexport interface B2File {\n  key: string;\n  size: number;\n  lastModified: string;\n  name: string;\n}\n`;
  fs.writeFileSync('src/types.ts', t, 'utf8');
}

// 2. AdminPanel.tsx (Cloud import)
let a = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
a = a.replace(/import \{ B2Manager \} from '\.\/B2Manager';/, "import { B2Manager } from './B2Manager';\nimport { Cloud } from 'lucide-react';");
fs.writeFileSync('src/components/AdminPanel.tsx', a, 'utf8');

