import fs from 'fs';
let content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const regex = /\/\/ Ensure profile data is saved with status 'disponible'\s*await fetch\(`\/api\/admin\/profiles\/\$\{targetId\}`,\s*\{\s*method: 'PUT',\s*headers: \{ 'Content-Type': 'application\/json', Authorization: `Bearer \$\{token\}` \},\s*body: JSON\.stringify\(\{\s*name: formData\.name,\s*rate_bs: formData\.rate_bs,\s*description: formData\.description,\s*status: 'disponible'\s*\}\)\s*\}\);\s*const res = await fetch\(`\/api\/admin\/profiles\/\$\{targetId\}\/publish`, \{/m;

const replace = `// Ensure profile data is saved with status 'disponible'
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

content = content.replace(regex, replace);
fs.writeFileSync('src/components/AdminPanel.tsx', content, 'utf8');
