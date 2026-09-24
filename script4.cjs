
const fs = require("fs");
let c = fs.readFileSync("src/components/RequestModal.tsx", "utf8");

const oldCode = "const list = paymentMethods.map(p => p.title.trim()).filter(t => t.length > 0);";
const newCode = "const list = paymentMethods.filter(p => p.category === \"international\" || p.category === \"national\").map(p => p.title.replace(/[\\u2700-\\u27BF]|[\\uE000-\\uF8FF]|\\uD83C[\\uDC00-\\uDFFF]|\\uD83D[\\uDC00-\\uDFFF]|[\\u2011-\\u26FF]|\\uD83E[\\uDD10-\\uDDFF]/g, \"\").trim()).filter(t => t.length > 0);";

c = c.replace(oldCode, newCode);
fs.writeFileSync("src/components/RequestModal.tsx", c, "utf8");

