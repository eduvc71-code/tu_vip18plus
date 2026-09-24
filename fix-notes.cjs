
const fs = require("fs");
let c = fs.readFileSync("src/server/routes.ts", "utf8");

c = c.replace(
  /const \{ profile_id, client_name, client_telegram, tg_user_id, telegram_init_data \} = req\.body;\s*const purchaseMessage = .*?;/,
  "const { profile_id, client_name, client_telegram, tg_user_id, telegram_init_data, notes } = req.body;\n    const purchaseMessage = notes || \"Hola estoy interesado en tu Contenido VIP. Información por favor.\";"
);

fs.writeFileSync("src/server/routes.ts", c);

