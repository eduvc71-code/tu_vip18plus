
const fs = require("fs");
let c = fs.readFileSync("src/types.ts", "utf8");

c = c.replace(/export interface ProfileReactions \{[\s\S]*?\}/, "export interface ProfileReactions {\n  [emoji: string]: number | undefined;\n}");

fs.writeFileSync("src/types.ts", c, "utf8");

