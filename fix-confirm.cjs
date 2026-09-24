
const fs = require("fs");
let c = fs.readFileSync("src/server/routes.ts", "utf8");

c = c.replace(
  /const userConfirmText = `? \*\$\{brandTitle\}\* ?\\n\\n¡Hola \$\{safeClientName \|\| \x27Estimado\/a\x27\}!\\n\\nHemos recibido tu solicitud para \*\$\{profile\.name\}\* \(SUSCRIPCIÓN VIP \/ ACCESO: Bs\. \$\{profile\.rate_bs\}\)\.\\n\\nLa Administradora procesará tu consulta de forma confidencial y te responderá directamente a este chat en breve\.`;/,
  "const isSpecialPlan = /SEMESTRAL|PERMANENTE/i.test(purchaseMessage);\n      const planDetail = isSpecialPlan ? \"\" : ` (SUSCRIPCIÓN VIP / ACCESO: Bs. ${profile.rate_bs})`;\n      const userConfirmText = `? *${brandTitle}* ?\\n\\n¡Hola ${safeClientName || \"Estimado/a\"}!\\n\\nHemos recibido tu solicitud para *${profile.name}*${planDetail}.\\n\\nLa Administradora procesará tu consulta de forma confidencial y te responderá directamente a este chat en breve.`;"
);

fs.writeFileSync("src/server/routes.ts", c);

