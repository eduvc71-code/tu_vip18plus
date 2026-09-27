const fs = require('fs');
let c = fs.readFileSync('src/components/B2Manager.tsx', 'utf8');

const scanUI = `
      {/* Módulo de Auditoría y Limpieza Anti-Basura */}
      <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-4 space-y-3 mt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-zinc-200 font-bold flex items-center gap-2">
              <SearchCode className="w-4 h-4 text-emerald-400" />
              Escáner Anti-Basura B2
            </h4>
            <p className="text-zinc-500 mt-1">Busca fotos o videos huérfanos en la nube que ya borraste de la base de datos para liberar espacio.</p>
          </div>
          <button
            onClick={handleScanOrphans}
            disabled={scanning || cleaning}
            className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg font-medium transition-colors shrink-0 flex items-center gap-2"
          >
            {scanning ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <SearchCode className="w-4 h-4" />}
            Escanear
          </button>
        </div>

        {scanResults && (
          <div className="pt-3 border-t border-zinc-800/50 mt-3">
            {scanResults.orphans.length === 0 ? (
              <p className="text-emerald-400 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                ¡Tu nube está totalmente limpia! No hay archivos huérfanos.
              </p>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <p className="text-amber-400 font-bold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    {scanResults.orphans.length} archivos huérfanos detectados
                  </p>
                  <p className="text-amber-500/70 text-[11px] mt-0.5">Ocupando un total de {formatSize(scanResults.size)} innecesariamente.</p>
                </div>
                <button
                  onClick={handleCleanOrphans}
                  disabled={cleaning}
                  className="px-3 py-1.5 bg-rose-500 text-white hover:bg-rose-600 rounded-lg font-bold transition-colors shadow-lg shadow-rose-500/20 shrink-0 w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  {cleaning ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Purgar Basura
                </button>
              </div>
            )}
          </div>
        )}
      </div>
`;

c = c.replace(/<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*\);\n\};/, `</div>\n      </div>\n${scanUI}\n    </div>\n  );\n};`);

fs.writeFileSync('src/components/B2Manager.tsx', c, 'utf8');
