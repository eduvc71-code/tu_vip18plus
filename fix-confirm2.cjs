
const fs = require("fs");
let c = fs.readFileSync("src/server/routes.ts", "utf8");

const startStr = "const userConfirmText = `";
const endStr = "te responder· directamente a este chat en breve.`;";
const endStrAlt = "te responder√° directamente a este chat en breve.`;";

let startIdx = c.indexOf("const userConfirmText = `");
if(startIdx !== -1) {
  let endIdx = c.indexOf(endStr, startIdx);
  if(endIdx === -1) endIdx = c.indexOf(endStrAlt, startIdx);
  if(endIdx !== -1) {
    const replacement = "const isSpecialPlan = /SEMESTRAL|PERMANENTE/i.test(purchaseMessage);\n      const planDetail = isSpecialPlan ? \"\" : ` (SUSCRIPCI”N VIP / ACCESO: Bs. ${profile.rate_bs})`;\n      const userConfirmText = `? *${brandTitle}* ?\\n\\n°Hola ${safeClientName || \"Estimado/a\"}!\\n\\nHemos recibido tu solicitud para *${profile.name}*${planDetail}.\\n\\nLa Administradora procesar· tu consulta de forma confidencial y te responder· directamente a este chat en breve.`;";
    c = c.substring(0, startIdx) + replacement + c.substring(endIdx + endStrAlt.length);
    fs.writeFileSync("src/server/routes.ts", c);
    console.log("Success");
  } else {
    console.log("End not found");
  }
} else {
  console.log("Start not found");
}

