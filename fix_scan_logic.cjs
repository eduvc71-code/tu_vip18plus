const fs = require('fs');
let c = fs.readFileSync('src/server/routes.ts', 'utf8');

c = c.replace(/if \(u.includes\('tu-vip\/media\/'\)\) \{\s*const key = u.split\('\/'\).slice\(-3\).join\('\/'\);\s*dbUrls.add\(key\);\s*\}/g, `if (u.includes('key=')) {
              const key = decodeURIComponent(u.split('key=')[1].split('&')[0]);
              if (key.startsWith('tu-vip/media/')) dbUrls.add(key);
            }`);

c = c.replace(/if \(p.image_url && p.image_url.includes\('tu-vip\/media\/'\)\) \{\s*const key = p.image_url.split\('\/'\).slice\(-3\).join\('\/'\);\s*dbUrls.add\(key\);\s*\}/g, `if (p.image_url && p.image_url.includes('key=')) {
          const key = decodeURIComponent(p.image_url.split('key=')[1].split('&')[0]);
          if (key.startsWith('tu-vip/media/')) dbUrls.add(key);
        }`);

c = c.replace(/if \(q.media_url && q.media_url.includes\('tu-vip\/media\/'\)\) \{\s*const key = q.media_url.split\('\/'\).slice\(-3\).join\('\/'\);\s*dbUrls.add\(key\);\s*\}/g, `if (q.media_url && q.media_url.includes('key=')) {
          const key = decodeURIComponent(q.media_url.split('key=')[1].split('&')[0]);
          if (key.startsWith('tu-vip/media/')) dbUrls.add(key);
        }`);

fs.writeFileSync('src/server/routes.ts', c, 'utf8');
