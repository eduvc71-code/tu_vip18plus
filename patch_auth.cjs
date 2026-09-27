const fs = require('fs');
let c = fs.readFileSync('src/hooks/useAdminAuth.ts', 'utf8');

if (!c.includes('adminId: string')) {
  c = c.replace(/token: string;/, "token: string;\n  adminId: string;");
  c = c.replace(/const \[token, setToken\] = useState\(''\);/, "const [token, setToken] = useState('');\n  const [adminId, setAdminId] = useState('');");
  
  // Inside verifyAndAuthenticate
  c = c.replace(/setIsAuthenticated\(true\);/, `
        setIsAuthenticated(true);
        if (data.userId) setAdminId(data.userId);
        else {
          try {
            const payload = JSON.parse(atob(tok.split('.')[1]));
            if (payload.id) setAdminId(String(payload.id));
          } catch(e){}
        }
  `);

  c = c.replace(/setToken\(tok\);/, "setToken(tok);\n      try { const payload = JSON.parse(atob(tok.split('.')[1])); if (payload.id) setAdminId(String(payload.id)); } catch(e){}");

  // Return adminId
  c = c.replace(/return \{[\s\S]*?token,/, "return {\n    token,\n    adminId,");
  
  fs.writeFileSync('src/hooks/useAdminAuth.ts', c, 'utf8');
}
