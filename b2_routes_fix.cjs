const fs = require('fs');
let c = fs.readFileSync('src/server/routes.ts', 'utf8');

const newRoutes = `
// ==========================================
// B2 Storage Manager Endpoints
// ==========================================

router.get('/admin/b2/files', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const prefix = typeof req.query.prefix === 'string' ? req.query.prefix : 'tu-vip/';
    const files = await listAllB2Files(prefix);
    res.json({ success: true, files });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al listar archivos B2', details: err?.message });
  }
});

router.post('/admin/b2/restore', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { key } = req.body;
    if (!key || !key.startsWith('tu-vip/backups/')) {
      return res.status(400).json({ error: 'Clave de backup inválida' });
    }
    const buffer = await restoreDatabaseFromB2(key);
    if (!buffer) {
      return res.status(404).json({ error: 'No se encontró el backup en B2' });
    }
    
    // Save to disk and restart server magically
    fs.writeFileSync(require('path').join(process.cwd(), 'data', 'catalogo.sqlite'), buffer);
    
    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('RESTORE_DB', adminId, \`Base de datos restaurada desde B2: \${key}\`);
    
    setTimeout(() => process.exit(0), 1000); 
    
    res.json({ success: true, message: 'Base de datos restaurada. El servidor se está reiniciando...' });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al restaurar backup', details: err?.message });
  }
});
`;
c = c + '\n' + newRoutes;
fs.writeFileSync('src/server/routes.ts', c, 'utf8');
