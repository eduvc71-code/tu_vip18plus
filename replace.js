const fs = require('fs');
let content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

// PASO 1
content = content.replace(
  /await handleSaveProfile\(e\);\s*setMessage\(\{ type: 'success', text: 'Borrador guardado exitosamente.' \}\);/,
  "await handleSaveProfile(e);"
);

// PASO 2
const oldTry = "try {\n                                        await fetch(/api/admin/profiles/, {\n                                          method: 'PUT',\n                                          headers: { 'Content-Type': 'application/json', Authorization: Bearer  },\n                                          body: JSON.stringify({ photos: reordered })\n                                        });\n                                        setMessage({ type: 'success', text: '? Foto seleccionada como Portada Principal' });\n                                        fetchData();\n                                      } catch {\n                                        setMessage({ type: 'error', text: 'Error al cambiar foto de portada' });\n                                      }";

const newTry = "try {\n                                        const res = await fetch(/api/admin/profiles/, {\n                                          method: 'PUT',\n                                          headers: { 'Content-Type': 'application/json', Authorization: Bearer  },\n                                          body: JSON.stringify({ photos: reordered })\n                                        });\n                                        if (res.ok) {\n                                          setMessage({ type: 'success', text: '? Foto seleccionada como Portada Principal' });\n                                          fetchData();\n                                        } else {\n                                          const data = await res.json();\n                                          setMessage({ type: 'error', text: data.error || 'Error al cambiar portada' });\n                                          fetchData();\n                                        }\n                                      } catch {\n                                        setMessage({ type: 'error', text: 'Error de red al cambiar foto de portada' });\n                                        fetchData();\n                                      }";

content = content.replace(oldTry, newTry);

fs.writeFileSync('src/components/AdminPanel.tsx', content, 'utf8');
