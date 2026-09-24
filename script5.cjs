
const fs = require("fs");
let c = fs.readFileSync("src/components/SplashScreen.tsx", "utf8");

c = c.replace(/const duration = 2800;/, "const duration = 12800;");
c = c.replace(/Entrar al Cat[·√][a-zA-Z]*logo/, "INGRESAR AL CANAL VIP FREE");

fs.writeFileSync("src/components/SplashScreen.tsx", c, "utf8");

