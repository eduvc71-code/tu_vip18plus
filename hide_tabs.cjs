const fs = require('fs');
let c = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

// 1. Destructure adminId
c = c.replace(/const \{\s*token,\s*isAuthenticated,/, 'const {\n      token,\n      adminId,\n      isAuthenticated,');

// 2. Filter tabs
if (!c.includes('const visibleTabs = tabs.filter')) {
  c = c.replace(/return \(\s*<div className="fixed inset-0/g, `
    const MASTER_ADMIN = '6461788392';
    const isMasterAdmin = adminId === MASTER_ADMIN;
    const visibleTabs = tabs.filter(t => {
      if (t.id === 'audit' || t.id === 'b2') {
        return isMasterAdmin;
      }
      return true;
    });

    return (
      <div className="fixed inset-0`);
}

// 3. Render visibleTabs instead of tabs
c = c.replace(/\{tabs\.map\(tab =>/g, '{visibleTabs.map(tab =>');

// 4. Hide contents as well (just in case they hack activeTab)
c = c.replace(/\{activeTab === 'audit' && \(/g, "{(activeTab === 'audit' && isMasterAdmin) && (");
c = c.replace(/\{activeTab === 'b2' && \(/g, "{(activeTab === 'b2' && isMasterAdmin) && (");

// 5. Fix spelling "Auditoría"
c = c.replace(/'AuditorÃ­a'/g, "'Auditoría'");
c = c.replace(/'MÃ©todos de Pago'/g, "'Métodos de Pago'");

fs.writeFileSync('src/components/AdminPanel.tsx', c, 'utf8');
