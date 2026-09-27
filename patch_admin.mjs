import fs from 'fs';

let content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

// CHANGE 1 (Phase 1): Rename broadcast button, hide for paid, update endpoint.
content = content.replace(
  /onClick=\{\(e\) => handleBroadcastMedia\(e, photoUrl\)\}/g,
  "onClick={(e) => handleShareToChannel(e, photoUrl)}"
);
content = content.replace(
  /title="Difundir a todos los usuarios"\s*onClick=\{\(e\) => handleShareToChannel\(e, photoUrl\)\}\s*className="py-2 px-3 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-blue-400 border border-blue-500\/30 font-bold text-xs transition-all cursor-pointer flex items-center gap-1\.5"\s*>\s*<Send className="w-3\.5 h-3\.5" \/>\s*Difundir Masivo/g,
  `title="Compartir en Canal Telegram 📢"
                                    onClick={(e) => handleShareToChannel(e, photoUrl)}
                                    className="py-2 px-3 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-blue-400 border border-blue-500/30 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                                  >
                                    <Send className="w-3.5 h-3.5" /> Compartir en Canal`
);

// We also need to rename handleBroadcastMedia to handleShareToChannel definition
content = content.replace(
  /const handleBroadcastMedia = async \(e: React\.MouseEvent, mediaUrl: string\) => \{/g,
  "const handleShareToChannel = async (e: React.MouseEvent, mediaUrl: string) => {"
);
content = content.replace(
  /fetch\(`\/api\/admin\/profiles\/\$\{editingProfile\?\.id\}\/broadcast`/g,
  "fetch(`/api/admin/profiles/${editingProfile?.id}/share-to-channel`"
);

// We need to hide the button for paid content
const targetHide = `{isAvailable && !isEphemeral && (\n                                  <button\n                                    type="button"\n                                    title="Compartir en Canal Telegram 📢"`;
const replaceHide = `{isAvailable && !isEphemeral && !editingProfile?.media_stars?.[photoUrl] && (\n                                  <button\n                                    type="button"\n                                    title="Compartir en Canal Telegram 📢"`;
content = content.replace(targetHide, replaceHide);

// PASO 1: Remove false positive from "Guardar como Borrador"
const paso1_target = `onClick={async (e) => {
                              await handleSaveProfile(e);
                              setMessage({ type: 'success', text: 'Borrador guardado exitosamente.' });
                            }}`;
const paso1_replace = `onClick={async (e) => {
                              await handleSaveProfile(e);
                            }}`;
content = content.replace(paso1_target, paso1_replace);

// PASO 2: Add if(res.ok) for "Poner como Portada"
const paso2_target = `                                      try {
                                        await fetch(\`/api/admin/profiles/\${editingProfile.id}\`, {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
                                          body: JSON.stringify({ photos: reordered })
                                        });
                                        setMessage({ type: 'success', text: '⭐ Foto seleccionada como Portada Principal' });
                                        fetchData();
                                      } catch {
                                        setMessage({ type: 'error', text: 'Error al cambiar foto de portada' });
                                      }`;
const paso2_replace = `                                      try {
                                        const res = await fetch(\`/api/admin/profiles/\${editingProfile.id}\`, {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
                                          body: JSON.stringify({ photos: reordered })
                                        });
                                        if (res.ok) {
                                          setMessage({ type: 'success', text: '⭐ Foto seleccionada como Portada Principal' });
                                          fetchData();
                                        } else {
                                          const data = await res.json();
                                          setMessage({ type: 'error', text: data.error || 'Error al cambiar portada' });
                                          fetchData();
                                        }
                                      } catch {
                                        setMessage({ type: 'error', text: 'Error de red al cambiar foto de portada' });
                                        fetchData();
                                      }`;
content = content.replace(paso2_target, paso2_replace);

// PASO 3: Remove silent upload from handleSaveProfile
const paso3_regex = /if \(selectedPhotoFiles && selectedPhotoFiles\.length > 0\) \{[^]*?catch \{ \/\* Ignore photo error \*\/ \}\s*\}/;
content = content.replace(paso3_regex, '');

// PASO 4: Add if(!saveRes.ok) to "Publicar Todo"
const paso4_regex = /\/\/ Ensure profile data is saved with status 'disponible'\s*await fetch\(`\/api\/admin\/profiles\/\$\{targetId\}`,\s*\{\s*method: 'PUT',\s*headers: \{ 'Content-Type': 'application\/json', Authorization: `Bearer \$\{token\}` \},\s*body: JSON\.stringify\(\{\s*name: formData\.name,\s*rate_bs: formData\.rate_bs,\s*description: formData\.description,\s*status: 'disponible'\s*\}\)\s*\}\);\s*const res = await fetch\(`\/api\/admin\/profiles\/\$\{targetId\}\/publish`, \{/m;

const paso4_replace = `// Ensure profile data is saved with status 'disponible'
      const saveRes = await fetch(\`/api/admin/profiles/\${targetId}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
        body: JSON.stringify({
          name: formData.name,
          rate_bs: formData.rate_bs,
          description: formData.description,
          status: 'disponible'
        })
      });

      if (!saveRes.ok) {
        const errData = await saveRes.json();
        setMessage({ type: 'error', text: errData.error || 'Error al guardar los datos antes de publicar' });
        setPublishing(false);
        return;
      }

      const res = await fetch(\`/api/admin/profiles/\${targetId}/publish\`, {`;

content = content.replace(paso4_regex, paso4_replace);

fs.writeFileSync('src/components/AdminPanel.tsx', content, 'utf8');
console.log("Patched completely without utf8 corruption.");
