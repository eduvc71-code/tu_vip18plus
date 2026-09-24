
const fs = require("fs");
let c = fs.readFileSync("src/server/routes.ts", "utf8");

c = c.replace(
  "admin_contact_username: getSystemSetting(\u0027admin_contact_username\u0027) || config.username || \u0027Danii_Catalogo_SCZ_bot\u0027,",
  "admin_contact_username: getSystemSetting(\u0027admin_contact_username\u0027) || config.username || \u0027Danii_Catalogo_SCZ_bot\u0027,\n      reactions_enabled: getSystemSetting(\u0027reactions_enabled\u0027) === \u0027true\u0027,\n      reactions_list: JSON.parse(getSystemSetting(\u0027reactions_list\u0027) || \u0027[\"\u2764\ufe0f\", \"\ud83d\udd25\", \"\ud83d\ude0d\", \"\ud83d\ude18\", \"\ud83d\udca6\"]\u0027),"
);

// Also update /admin/settings POST
const adminSettingsTarget = "const { bot_username, telegram_only_access, auto_reply_delay_minutes, model_display_name, model_vip_link, channel_id, operating_mode, admin_contact_username, splash_description } = req.body;";
const adminSettingsReplacement = "const { bot_username, telegram_only_access, auto_reply_delay_minutes, model_display_name, model_vip_link, channel_id, operating_mode, admin_contact_username, splash_description, reactions_enabled, reactions_list } = req.body;";
c = c.replace(adminSettingsTarget, adminSettingsReplacement);

const saveSplashTarget = "if (splash_description !== undefined) {\n        saveSystemSetting(\u0027splash_description\u0027, String(splash_description).trim());\n      }";
const saveSplashReplacement = "if (splash_description !== undefined) {\n        saveSystemSetting(\u0027splash_description\u0027, String(splash_description).trim());\n      }\n      if (reactions_enabled !== undefined) {\n        saveSystemSetting(\u0027reactions_enabled\u0027, String(reactions_enabled));\n      }\n      if (reactions_list !== undefined && Array.isArray(reactions_list)) {\n        saveSystemSetting(\u0027reactions_list\u0027, JSON.stringify(reactions_list));\n      }";
c = c.replace(saveSplashTarget, saveSplashReplacement);

fs.writeFileSync("src/server/routes.ts", c, "utf8");

