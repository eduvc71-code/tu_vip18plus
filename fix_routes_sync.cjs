const fs = require('fs');
let c = fs.readFileSync('src/server/routes.ts', 'utf8');

c = c.replace(
  'const updated = await removeMediaFromProfile(profileId, media_url);\n      if (!updated) {\n        res.status(404).json({ error: \'Perfil no encontrado\' });\n        return;\n      }\n\n      await addAuditLog(\'DELETE_MEDIA\', adminId, `Eliminado archivo de perfil ${profileId}`);\n      \n      res.json({ success: true, profile: updated });',
  'const updated = await removeMediaFromProfile(profileId, media_url);\n      if (!updated) {\n        res.status(404).json({ error: \'Perfil no encontrado\' });\n        return;\n      }\n\n      // FORZAR SYNC INMEDIATO DE LA DB A B2 PARA EVITAR PERDIDA POR REINICIOS DE RENDER\n      await syncDbToB2Now();\n\n      await addAuditLog(\'DELETE_MEDIA\', adminId, `Eliminado archivo de perfil ${profileId}`);\n      \n      res.json({ success: true, profile: updated });'
);

fs.writeFileSync('src/server/routes.ts', c, 'utf8');
console.log('Fixed delete media route sync');
