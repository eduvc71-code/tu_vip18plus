
const fs = require("fs");
let c = fs.readFileSync("src/App.tsx", "utf8");

c = c.replace(
  "const [adminContactUsername, setAdminContactUsername] = useState(\u0027Danii_Catalogo_SCZ_bot\u0027);",
  "const [adminContactUsername, setAdminContactUsername] = useState(\u0027Danii_Catalogo_SCZ_bot\u0027);\n  const [reactionsEnabled, setReactionsEnabled] = useState(false);\n  const [reactionsList, setReactionsList] = useState<string[]>([]);"
);

c = c.replace(
  "if (info.pinned_message_active !== undefined) setPinnedActive(Boolean(info.pinned_message_active));",
  "if (info.pinned_message_active !== undefined) setPinnedActive(Boolean(info.pinned_message_active));\n          if (info.reactions_enabled !== undefined) setReactionsEnabled(Boolean(info.reactions_enabled));\n          if (info.reactions_list !== undefined) setReactionsList(info.reactions_list);"
);

c = c.replace(
  "<ProfileDetailModal\n          profile={selectedProfile}\n          initialMediaUrl={selectedMediaUrl}",
  "<ProfileDetailModal\n          reactionsEnabled={reactionsEnabled}\n          reactionsList={reactionsList}\n          profile={selectedProfile}\n          initialMediaUrl={selectedMediaUrl}"
);

fs.writeFileSync("src/App.tsx", c, "utf8");

