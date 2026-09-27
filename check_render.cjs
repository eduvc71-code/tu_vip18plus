
fetch('https://catalogo-vip-scz.onrender.com/')
  .then(r => r.text())
  .then(html => {
    const match = html.match(/src=\"(\/assets\/index-[^\"']+\.js)\"/);
    if (match) {
      console.log('JS file:', match[1]);
      return fetch('https://catalogo-vip-scz.onrender.com' + match[1]).then(r => r.text());
    } else {
      console.log('No JS match', html.substring(0, 500));
    }
  })
  .then(js => {
    if (js) {
      if (js.includes('Espacio Exclusivo')) {
        console.log('OK: Espacio Exclusivo FOUND -> NEW CODE IS ON RENDER');
      } else {
        console.log('FAIL: Espacio Exclusivo NOT FOUND -> OLD CODE IS ON RENDER');
      }
    }
  }).catch(console.error);

