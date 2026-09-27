const fs = require('fs');
let c = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

c = c.replace(/const \{\s*token,\s*isAuthenticated,/, 'const {\n      token,\n      adminId,\n      isAuthenticated,');

c = c.replace(/const tabs: \{ id: AdminTab;/g, "const MASTER_ADMIN = '6461788392';\n  const isMasterAdmin = adminId === MASTER_ADMIN;\n  const allTabs: { id: AdminTab;");

c = c.replace(/\{ id: 'b2', icon: <Cloud className="w-4 h-4" \/>, label: 'Bodega B2' \}\n\s*\];/g, 
  "{ id: 'b2', icon: <Cloud className=\"w-4 h-4\" />, label: 'Bodega B2' }\n  ];\n\n  const tabs = allTabs.filter(t => (t.id === 'audit' || t.id === 'b2') ? isMasterAdmin : true);"
);

c = c.replace(/\{activeTab === 'audit' && \(/g, "{(activeTab === 'audit' && isMasterAdmin) && (");
c = c.replace(/\{activeTab === 'b2' && \(/g, "{(activeTab === 'b2' && isMasterAdmin) && (");

c = c.replace(/'AuditorÃ­a'/g, "'Auditoría'");
c = c.replace(/'MÃ©todos de Pago'/g, "'Métodos de Pago'");

fs.writeFileSync('src/components/AdminPanel.tsx', c, 'utf8');
