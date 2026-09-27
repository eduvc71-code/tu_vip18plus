const fs = require('fs');
let c = fs.readFileSync('src/server/routes.ts', 'utf8');

c = c.replace(
  /const updated = await removeMediaFromProfile\(profileId, media_url\);\s*if \(\!updated\) \{\s*res\.status\(404\)\.json\(\{ error: 'Perfil no encontrado' \}\);\s*return;\s*\}/g,
  'const updated = await removeMediaFromProfile(profileId, media_url);\n      if (!updated) {\n        res.status(404).json({ error: \'Perfil no encontrado\' });\n        return;\n      }\n\n      try { await syncDbToB2Now(); } catch (e) { console.error(e); }'
);

fs.writeFileSync('src/server/routes.ts', c, 'utf8');
console.log('Replaced');
