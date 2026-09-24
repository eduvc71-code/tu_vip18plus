
const fs = require("fs");
let c = fs.readFileSync("src/types.ts", "utf8");

c = c.replace(
  "export interface ProfileReactions {\n  likes?: number;       // \ud83d\udc4d Likes\n  hearts?: number;      // \u2764\ufe0f Corazones\n  stars?: number;       // \u2b50 Estrellas\n}",
  "export interface ProfileReactions {\n  [emoji: string]: number | undefined;\n}"
);

fs.writeFileSync("src/types.ts", c, "utf8");

