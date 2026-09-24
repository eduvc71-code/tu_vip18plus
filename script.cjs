
const fs = require("fs");
let c = fs.readFileSync("src/components/RequestModal.tsx", "utf8");

c = c.replace(
  "interface RequestModalProps {",
  "import { PaymentMethod } from \"../types\";\n\ninterface RequestModalProps {\n  paymentMethods?: PaymentMethod[];"
);

c = c.replace(
  "const COUNTRIES = [\n  \u0027Argentina\u0027, \u0027Bolivia\u0027, \u0027Chile\u0027, \u0027Colombia\u0027, \u0027Ecuador\u0027, \n  \u0027Espa\u00c3\u00b1a\u0027, \u0027Estados Unidos\u0027, \u0027M\u00c3\u00a9xico\u0027, \u0027Paraguay\u0027, \u0027Per\u00c3\u00ba\u0027, \u0027Uruguay\u0027, \u0027Venezuela\u0027\n];",
  ""
);
// fallback in case of utf8 issues
c = c.replace(/const COUNTRIES = \[[\s\S]*?\];/, "");

c = c.replace(
  "export const RequestModal: React.FC<RequestModalProps> = ({ profile, modelName, tgUserContext, onOpenPaymentMethods, onClose }) => {",
  "export const RequestModal: React.FC<RequestModalProps> = ({ profile, modelName, tgUserContext, onOpenPaymentMethods, onClose, paymentMethods = [] }) => {\n  const dynamicCountries = React.useMemo(() => {\n    const list = paymentMethods.map(p => p.title.trim()).filter(t => t.length > 0);\n    return list.length > 0 ? Array.from(new Set(list)) : [\u0027Bolivia\u0027, \u0027Argentina\u0027, \u0027Chile\u0027, \u0027Colombia\u0027, \u0027Ecuador\u0027, \u0027Espa\u00f1a\u0027, \u0027Estados Unidos\u0027, \u0027M\u00e9xico\u0027, \u0027Paraguay\u0027, \u0027Per\u00fa\u0027, \u0027Uruguay\u0027, \u0027Venezuela\u0027];\n  }, [paymentMethods]);"
);

c = c.replace(
  "{COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}",
  "{dynamicCountries.map(c => <option key={c} value={c}>{c}</option>)}"
);

fs.writeFileSync("src/components/RequestModal.tsx", c, "utf8");

