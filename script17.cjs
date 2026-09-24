
const fs = require("fs");
let c = fs.readFileSync("src/components/ProfileDetailModal.tsx", "utf8");

const oldReactions = `          {/* Reactions */}
          <div className="flex items-center justify-between gap-4 bg-zinc-950/60 border border-zinc-800/80 backdrop-blur-md rounded-full px-5 py-1.5 shadow-lg w-auto">
            <button type="button" onClick={(e)=>e.stopPropagation()} className="hover:scale-125 transition-transform cursor-pointer active:scale-90 text-sm sm:text-base">??</button>
            <button type="button" onClick={(e)=>e.stopPropagation()} className="hover:scale-125 transition-transform cursor-pointer active:scale-90 text-sm sm:text-base">??</button>
            <button type="button" onClick={(e)=>e.stopPropagation()} className="hover:scale-125 transition-transform cursor-pointer active:scale-90 text-sm sm:text-base">??</button>
            <button type="button" onClick={(e)=>e.stopPropagation()} className="hover:scale-125 transition-transform cursor-pointer active:scale-90 text-sm sm:text-base">??</button>
            <button type="button" onClick={(e)=>e.stopPropagation()} className="hover:scale-125 transition-transform cursor-pointer active:scale-90 text-sm sm:text-base">??</button>
          </div>`;

const newReactions = `          {/* Reactions */}
          {reactionsEnabled && reactionsList.length > 0 && (
            <div className={\`flex items-center justify-center gap-3.5 sm:gap-4 bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md rounded-full px-5 py-2 shadow-lg transition-all duration-500 ease-out transform \${showReactions ? \u0027translate-y-0 opacity-100\u0027 : \u0027translate-y-4 opacity-0 pointer-events-none\u0027} \${isBlinking ? \u0027animate-pulse border-amber-500/50 shadow-amber-500/20\u0027 : \u0027\u0027}\`}>
              {reactionsList.map(emoji => (
                <button 
                  key={emoji}
                  type="button" 
                  onClick={(e) => handleReact(emoji, e)} 
                  className={\`relative transition-transform cursor-pointer active:scale-90 text-base sm:text-lg \${reactedEmojis[emoji] ? \u0027scale-125\u0027 : \u0027hover:scale-125\u0027}\`}
                >
                  {emoji}
                  {reactedEmojis[emoji] && (
                    <span className="absolute -top-2 -right-2 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}`;

c = c.replace(oldReactions, newReactions);
fs.writeFileSync("src/components/ProfileDetailModal.tsx", c, "utf8");

