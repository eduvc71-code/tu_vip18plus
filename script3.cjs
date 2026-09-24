
const fs = require("fs");
let c = fs.readFileSync("src/components/ProfileDetailModal.tsx", "utf8");

const target = "<div className=\"pointer-events-auto flex flex-col items-center gap-2\">\n          <div className=\"flex items-center gap-2\">";
const reactionsContainer = `          {/* Reactions */}
          <div className="flex items-center justify-between gap-4 bg-zinc-950/60 border border-zinc-800/80 backdrop-blur-md rounded-full px-5 py-1.5 shadow-lg w-auto">
            <button type="button" onClick={(e)=>e.stopPropagation()} className="hover:scale-125 transition-transform cursor-pointer active:scale-90 text-sm sm:text-base">??</button>
            <button type="button" onClick={(e)=>e.stopPropagation()} className="hover:scale-125 transition-transform cursor-pointer active:scale-90 text-sm sm:text-base">??</button>
            <button type="button" onClick={(e)=>e.stopPropagation()} className="hover:scale-125 transition-transform cursor-pointer active:scale-90 text-sm sm:text-base">??</button>
            <button type="button" onClick={(e)=>e.stopPropagation()} className="hover:scale-125 transition-transform cursor-pointer active:scale-90 text-sm sm:text-base">??</button>
            <button type="button" onClick={(e)=>e.stopPropagation()} className="hover:scale-125 transition-transform cursor-pointer active:scale-90 text-sm sm:text-base">??</button>
          </div>\n`;

c = c.replace(target, "<div className=\"pointer-events-auto flex flex-col items-center gap-2\">\n" + reactionsContainer + "          <div className=\"flex items-center gap-2\">");

fs.writeFileSync("src/components/ProfileDetailModal.tsx", c, "utf8");

