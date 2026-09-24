const fs = require('fs');
let c = fs.readFileSync('src/server/routes.ts', 'utf8');

c = c.replace(
  "const { profile_id, client_name, client_telegram, tg_user_id, telegram_init_data } = req.body;\\n    const purchaseMessage = 'Hola estoy interesado en tu Contenido VIP. InformaciÃ³n por favor.';",
  "const { profile_id, client_name, client_telegram, tg_user_id, telegram_init_data, notes } = req.body;\\n    const purchaseMessage = notes || 'Hola estoy interesado en tu Contenido VIP. Información por favor.';"
);

c = c.replace(
  /const userConfirmText = ? \*\$\{brandTitle\}\* ?\\n\\n¡Hola \$\{safeClientName \|\| 'Estimado\/a'\}!\\n\\nHemos recibido tu solicitud para \*\$\{profile.name\}\* \(SUSCRIPCIÓN VIP \/ ACCESO: Bs. \$\{profile.rate_bs\}\).\\n\\nLa Administradora procesará tu consulta de forma confidencial y te responderá directamente a este chat en breve.;/,
  \const isSpecialPlan = /SEMESTRAL|PERMANENTE/i.test(purchaseMessage);
      const planDetail = isSpecialPlan ? '' : \\\ (SUSCRIPCIÓN VIP / ACCESO: Bs. \)\\\;
      const userConfirmText = \\\? *\* ?\\n\\n¡Hola \!\\n\\nHemos recibido tu solicitud.\\n\\nLa Administradora procesará tu consulta de forma confidencial y te responderá directamente a este chat en breve.\\\;\
);

fs.writeFileSync('src/server/routes.ts', c);
