
const fs = require("fs");
let c = fs.readFileSync("src/components/AdminPanel.tsx", "utf8");

c = c.replace(
  "<span className=\"text-[10px] text-amber-400/80\">Opcional</span>",
  "<span className=\"text-[10px] text-rose-400 font-bold\">* Obligatorio</span>"
);

const handleSaveTarget = "const handleSaveProfile = async (e: React.FormEvent) => {\n    e.preventDefault();\n    setLoading(true);";
const handleSaveReplacement = "const handleSaveProfile = async (e: React.FormEvent) => {\n    e.preventDefault();\n    if (!formData.description || formData.description.trim() === \"\") {\n      setMessage({ type: \"error\", text: \"La descripción del contenido es obligatoria.\" });\n      return;\n    }\n    setLoading(true);";
c = c.replace(handleSaveTarget, handleSaveReplacement);

fs.writeFileSync("src/components/AdminPanel.tsx", c, "utf8");

