const fs = require('fs');
let c = fs.readFileSync('src/server/routes.ts', 'utf8');

c = c.replace(
  /const \{ profile_id, client_name, client_telegram, tg_user_id, telegram_init_data \} = req\.body;\s*const purchaseMessage = .*?;/,
  'const { profile_id, client_name, client_telegram, tg_user_id, telegram_init_data, notes } = req.body;\n    const purchaseMessage = notes || "Hola estoy interesado en tu Contenido VIP. Información por favor.";'
);

const startStr = "const userConfirmText = \";
const endStr = "te responderá directamente a este chat en breve.\;";
const endStrAlt = "te responderÃ¡ directamente a este chat en breve.\;"; // just in case

let startIdx = c.indexOf(startStr);
if (startIdx !== -1) {
  let endIdx = c.indexOf(endStr, startIdx);
  if (endIdx === -1) endIdx = c.indexOf(endStrAlt, startIdx);
  if (endIdx !== -1) {
    const replacement = "const isSpecialPlan = /SEMESTRAL|PERMANENTE/i.test(purchaseMessage);\n      const planDetail = isSpecialPlan ? \"\" : \ (SUSCRIPCIÓN VIP / ACCESO: Bs. \)\;\n      const adminUsername = getSystemSetting('admin_contact_username') || 'Danii_Catalogo_SCZ_bot';\n      const userConfirmText = \? *\* ?\\n\\n¡Hola \!\\n\\nHemos recibido tu solicitud para *\*\.\\n\\nSu mensaje se envio a la Administradora (@\) y se le responderá en breve.\;";
    c = c.substring(0, startIdx) + replacement + c.substring(endIdx + endStr.length);
  }
}

fs.writeFileSync('src/server/routes.ts', c, 'utf8');
