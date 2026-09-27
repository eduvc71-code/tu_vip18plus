const fs = require('fs');
let code = fs.readFileSync('src/server/telegram.ts', 'utf8');
const hookStr = "if (text === '/admin') {";
const bodegaCode = `
  if (text.startsWith('/bodega')) {
    if (isAdminUser(fromId)) {
      const bodegaId = String(chatId);
      saveSystemSetting('bodega_channel_id', bodegaId);
      await sendMessage(chatId, '📦 *BODEGA SECRETA ENLAZADA EXITOSAMENTE* 📦\\n\\nEste grupo o canal ahora está configurado como tu servidor de almacenamiento ilimitado.\\nID Interno: ' + bodegaId);
    }
    return;
  }
`;
if (!code.includes('/bodega')) {
  code = code.replace(hookStr, bodegaCode + hookStr);
  fs.writeFileSync('src/server/telegram.ts', code);
  console.log('Success');
}
