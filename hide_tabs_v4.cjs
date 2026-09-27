const fs = require('fs');
let c = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const regex = /\{ id: 'b2', icon: <Cloud className="w-4 h-4" \/>, label: 'Bodega B2' \},\s*\];/g;
c = c.replace(regex, "{ id: 'b2', icon: <Cloud className=\"w-4 h-4\" />, label: 'Bodega B2' }\n  ];\n\n  const tabs = allTabs.filter(t => (t.id === 'audit' || t.id === 'b2') ? isMasterAdmin : true);");

fs.writeFileSync('src/components/AdminPanel.tsx', c, 'utf8');
