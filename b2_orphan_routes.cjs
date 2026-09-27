const fs = require('fs');
let c = fs.readFileSync('src/server/routes.ts', 'utf8');

if (!c.includes('/b2/scan-orphans')) {
  // Add imports
  c = c.replace(/listAllB2Files,/, 'listAllB2Files,\n  deleteB2Backup,\n  deleteB2Media,');
  c = c.replace(/getAllProfiles,/, 'getAllProfiles,\n  getAllPaymentMethods,\n  getBotMediaQueue,');
  
  const newRoutes = `
router.delete('/admin/b2/files', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: 'Falta key' });
    await deleteB2Backup(key);
    
    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('DELETE_B2_BACKUP', adminId, \`Eliminado backup B2: \${key}\`);
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al eliminar', details: err?.message });
  }
});

router.get('/admin/b2/scan-orphans', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const b2MediaFiles = await listAllB2Files('tu-vip/media/');
    
    // Recopilar urls de BD
    const allProfiles = await getAllProfiles();
    const allPayments = await getAllPaymentMethods();
    const allQueue = await getBotMediaQueue();
    
    const dbUrls = new Set<string>();
    for (const p of allProfiles) {
      if (Array.isArray(p.photos)) {
        p.photos.forEach(u => {
          if (u.includes('tu-vip/media/')) {
            const key = u.split('/').slice(-3).join('/');
            dbUrls.add(key);
          }
        });
      }
    }
    for (const p of allPayments) {
      if (p.image_url && p.image_url.includes('tu-vip/media/')) {
        const key = p.image_url.split('/').slice(-3).join('/');
        dbUrls.add(key);
      }
    }
    for (const q of allQueue) {
      if (q.media_url && q.media_url.includes('tu-vip/media/')) {
         const key = q.media_url.split('/').slice(-3).join('/');
         dbUrls.add(key);
      }
    }
    
    const orphans = [];
    let orphanSize = 0;
    
    for (const f of b2MediaFiles) {
      // f.key es 'tu-vip/media/xxxxx.jpg'
      if (!dbUrls.has(f.key)) {
        orphans.push(f);
        orphanSize += f.size;
      }
    }
    
    res.json({ success: true, orphans, orphanSize });
  } catch (err: any) {
    res.status(500).json({ error: 'Error escaneando huérfanos', details: err?.message });
  }
});

router.post('/admin/b2/clean-orphans', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { keys } = req.body; // array of strings (b2 object keys)
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'No se enviaron archivos para eliminar' });
    }
    
    let deletedCount = 0;
    for (const k of keys) {
      // deleteB2Media takes URL or key. But wait, deleteB2Media deletes if key starts with tu-vip/media/
      await deleteB2Media(k);
      deletedCount++;
    }
    
    const adminId = (req as any).adminUserId || 'Admin Web';
    await addAuditLog('CLEAN_B2_ORPHANS', adminId, \`Purgados \${deletedCount} archivos huérfanos de B2\`);
    
    res.json({ success: true, deletedCount });
  } catch(err: any) {
    res.status(500).json({ error: 'Error purgando huérfanos', details: err?.message });
  }
});
`;
  c = c + '\n' + newRoutes;
  fs.writeFileSync('src/server/routes.ts', c, 'utf8');
}
