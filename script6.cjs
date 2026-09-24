
const fs = require("fs");
let c = fs.readFileSync("src/components/Header.tsx", "utf8");

c = c.replace(
  "<div className=\"mx-auto max-w-7xl px-2.5 sm:px-6 lg:px-8\">",
  "<div className={`mx-auto max-w-7xl px-2.5 sm:px-6 lg:px-8 ${isTgMiniApp ? \"pt-12 pb-2\" : \"\"}`}>"
);

fs.writeFileSync("src/components/Header.tsx", c, "utf8");

