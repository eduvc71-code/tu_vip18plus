const fs = require('fs');
let c = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

// 1. Add import
if (!c.includes('B2Manager')) {
  c = c.replace(/import \{ ProfilesTab \} from '\.\/ProfilesTab';/, "import { ProfilesTab } from './ProfilesTab';\nimport { B2Manager } from './B2Manager';");
}

// 2. Add 'b2' to AdminTab
if (!c.includes("'b2' | 'audit'")) {
  c = c.replace(/type AdminTab = 'profiles' \| 'requests' \| 'payments' \| 'buttons' \| 'polls' \| 'telegram' \| 'audit';/, "type AdminTab = 'profiles' | 'requests' | 'payments' | 'buttons' | 'polls' | 'telegram' | 'audit' | 'b2';");
}

// 3. Add to tabs array
if (!c.includes("{ id: 'b2', icon:")) {
  c = c.replace(/\{ id: 'audit', icon: <Activity className="w-4 h-4" \/>, label: 'Auditoría' \},/, "{ id: 'audit', icon: <Activity className=\"w-4 h-4\" />, label: 'Auditoría' },\n      { id: 'b2', icon: <Cloud className=\"w-4 h-4\" />, label: 'Bodega B2' },");
}

// 4. Add the tab content
if (!c.includes("activeTab === 'b2'")) {
  const b2TabContent = `
            {/* TAB: BODEGA B2 */}
            {activeTab === 'b2' && (
              <B2Manager token={token} />
            )}
  `;
  c = c.replace(/\{\/\* TAB: AUDIT LOGS \*\/\}/, b2TabContent + '\n            {/* TAB: AUDIT LOGS */}');
}

fs.writeFileSync('src/components/AdminPanel.tsx', c, 'utf8');
