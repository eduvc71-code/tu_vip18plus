
const fs = require("fs");
let c = fs.readFileSync("src/components/ProfileDetailModal.tsx", "utf8");

c = c.replace(
  "    if (isCurrentVideo) {\n      setShowSlideIndicators(true);\n      return; // Los videos se controlan por interacción de sonido y tiempo\n    }",
  ""
);
// fallback
c = c.replace(/\s*if\s*\(isCurrentVideo\)\s*\{\s*setShowSlideIndicators\(true\);\s*return;\s*\/\/[^\n]*\n\s*\}/, "");

fs.writeFileSync("src/components/ProfileDetailModal.tsx", c, "utf8");

