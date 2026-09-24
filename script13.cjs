
const fs = require("fs");
let c = fs.readFileSync("src/components/AdminPanel.tsx", "utf8");

const reactionUI = `
                {/* REACCIONES INTERACTIVAS */}
                <form onSubmit={handleSaveSettings} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Heart className="w-4 h-4 text-amber-400" /> Reacciones Interactivas (Mini App & Canal)
                  </h4>
                  <p className="text-zinc-400">
                    Habilita la barra flotante de 5 segundos con iconos de reacción al abrir fotos o videos. Al reaccionar en la Mini App, el contador se actualizará en el Canal VIP automáticamente.
                  </p>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-2 cursor-pointer w-fit">
                      <input 
                        type="checkbox" 
                        checked={reactionsEnabled} 
                        onChange={(e) => setReactionsEnabled(e.target.checked)} 
                        className="w-4 h-4 rounded accent-amber-500 cursor-pointer" 
                      />
                      <span className="text-sm font-bold text-white">Habilitar visualización de Reacciones</span>
                    </label>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-zinc-400">Lista de iconos (Sepáralos por un espacio):</label>
                      <input 
                         type="text"
                         value={reactionsList.join(\u0027 \u0027)}
                         onChange={(e) => setReactionsList(e.target.value.split(/\s+/).filter(Boolean))}
                         className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-base focus:outline-none focus:border-amber-500"
                         placeholder="?? ?? ?? ?? ??"
                      />
                    </div>
                    <div className="flex justify-end mt-1">
                      <button
                        type="submit"
                        disabled={loading}
                        className="py-2 px-4 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0 disabled:opacity-60"
                      >
                        Guardar Reacciones
                      </button>
                    </div>
                  </div>
                </form>
`;

c = c.replace("{/* AUTO REPLY DELAY */}", reactionUI + "\n                {/* AUTO REPLY DELAY */} \n");

fs.writeFileSync("src/components/AdminPanel.tsx", c, "utf8");

