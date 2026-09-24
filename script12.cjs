
const fs = require("fs");
let c = fs.readFileSync("src/components/AdminPanel.tsx", "utf8");

const targetState = "const [adminContactUsername, setAdminContactUsername] = useState(\u0027\u0027);";
const replacementState = "const [adminContactUsername, setAdminContactUsername] = useState(\u0027\u0027);\n  const [reactionsEnabled, setReactionsEnabled] = useState(false);\n  const [reactionsList, setReactionsList] = useState<string[]>([\u0027\u2764\ufe0f\u0027, \u0027\ud83d\udd25\u0027, \u0027\ud83d\ude0d\u0027, \u0027\ud83d\ude18\u0027, \u0027\ud83d\udca6\u0027]);";
c = c.replace(targetState, replacementState);

const targetFetch = "if (infoData.admin_contact_username !== undefined) setAdminContactUsername(infoData.admin_contact_username || \u0027\u0027);";
const replacementFetch = "if (infoData.admin_contact_username !== undefined) setAdminContactUsername(infoData.admin_contact_username || \u0027\u0027);\n        if (infoData.reactions_enabled !== undefined) setReactionsEnabled(Boolean(infoData.reactions_enabled));\n        if (infoData.reactions_list !== undefined && Array.isArray(infoData.reactions_list)) setReactionsList(infoData.reactions_list);";
c = c.replace(targetFetch, replacementFetch);

const targetSave = "admin_contact_username: adminContactUsername,";
const replacementSave = "admin_contact_username: adminContactUsername,\n            reactions_enabled: reactionsEnabled,\n            reactions_list: reactionsList,";
c = c.replace(targetSave, replacementSave);

fs.writeFileSync("src/components/AdminPanel.tsx", c, "utf8");

