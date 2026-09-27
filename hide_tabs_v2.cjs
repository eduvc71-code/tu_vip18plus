const fs = require('fs');
let c = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

// 1. Destructure adminId
c = c.replace(/const \{\s*token,\s*isAuthenticated,/, 'const {\n      token,\n      adminId,\n      isAuthenticated,');

// 2. Filter tabs right after it's defined
const tabsDef = `const tabs: { id: AdminTab; icon: React.ReactNode; label: string; badge?: number }[] = [`;
const tabsDefNew = `
  const MASTER_ADMIN = '6461788392';
  const isMasterAdmin = adminId === MASTER_ADMIN;
  
  const allTabs: { id: AdminTab; icon: React.ReactNode; label: string; badge?: number }[] = [`;

c = c.replace(tabsDef, tabsDefNew);
c = c.replace(/\{ id: 'b2', icon: <Cloud className="w-4 h-4" \/>, label: 'Bodega B2' \},/, "{ id: 'b2', icon: <Cloud className=\"w-4 h-4\" />, label: 'Bodega B2' }\n  ];\n\n  const tabs = allTabs.filter(t => {\n    if (t.id === 'audit' || t.id === 'b2') return isMasterAdmin;\n    return true;\n  });\n");

// 3. Hide contents as well (just in case they hack activeTab)
c = c.replace(/\{activeTab === 'audit' && \(/g, "{(activeTab === 'audit' && isMasterAdmin) && (");
c = c.replace(/\{activeTab === 'b2' && \(/g, "{(activeTab === 'b2' && isMasterAdmin) && (");

// 4. Fix spelling "Auditoría"
c = c.replace(/'AuditorÃ­a'/g, "'Auditoría'");
c = c.replace(/'MÃ©todos de Pago'/g, "'Métodos de Pago'");

fs.writeFileSync('src/components/AdminPanel.tsx', c, 'utf8');
