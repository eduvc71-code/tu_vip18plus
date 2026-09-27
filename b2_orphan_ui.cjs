const fs = require('fs');
let c = fs.readFileSync('src/components/B2Manager.tsx', 'utf8');

const scanOrphansLogic = `
  const [scanResults, setScanResults] = useState<{ orphans: B2File[], size: number } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const handleScanOrphans = async () => {
    setScanning(true);
    setScanResults(null);
    try {
      const res = await fetch('/api/admin/b2/scan-orphans', {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      const data = await res.json();
      if (data.success) {
        setScanResults({ orphans: data.orphans, size: data.orphanSize });
      } else {
        throw new Error(data.error);
      }
    } catch(err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setScanning(false);
    }
  };

  const handleCleanOrphans = async () => {
    if (!scanResults || scanResults.orphans.length === 0) return;
    if (!window.confirm(\`¿Seguro que deseas eliminar definitivamente \${scanResults.orphans.length} archivos fantasmas para ahorrar \${formatSize(scanResults.size)}?\`)) return;
    
    setCleaning(true);
    try {
      const keys = scanResults.orphans.map(o => o.key);
      const res = await fetch('/api/admin/b2/clean-orphans', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${token}\`
        },
        body: JSON.stringify({ keys })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: \`Limpieza completada: \${data.deletedCount} archivos eliminados de B2.\` });
        setScanResults(null);
      } else {
        throw new Error(data.error);
      }
    } catch(err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setCleaning(false);
    }
  };

  const handleDeleteBackup = async (key: string) => {
    if (!window.confirm('¿Seguro que deseas ELIMINAR PERMANENTEMENTE este archivo de copia de seguridad?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/b2/files', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${token}\`
        },
        body: JSON.stringify({ key })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Backup eliminado correctamente.' });
        fetchFiles();
      } else {
        throw new Error(data.error);
      }
    } catch(err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };
`;

c = c.replace(/const fetchFiles = async \(\) => \{/, scanOrphansLogic + '\n  const fetchFiles = async () => {');

// Add Trash2 icon import
c = c.replace(/Cloud, HardDrive, RefreshCcw, Download, Trash2, CheckCircle2, AlertCircle, FileArchive, Search/, 'Cloud, HardDrive, RefreshCcw, Download, Trash2, CheckCircle2, AlertCircle, FileArchive, Search, SearchCode, ShieldAlert');

// Add delete button in table row
const deleteBtn = `
                  <button
                    onClick={() => handleDeleteBackup(file.key)}
                    className="p-1.5 text-rose-500/70 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Eliminar este backup"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
`;
c = c.replace(/<Download className="w-4 h-4" \/>\n\s*<\/a>\n\s*<\/div>/, `<Download className="w-4 h-4" />\n                  </a>` + deleteBtn + `\n                </div>`);

// Add scan UI at the bottom
const scanUI = `
      {/* Módulo de Auditoría y Limpieza Anti-Basura */}
      <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-4 space-y-3">
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
c = c.replace(/<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*\);\n\};/, `</div>\n\n${scanUI}\n    </div>\n  );\n};`);

fs.writeFileSync('src/components/B2Manager.tsx', c, 'utf8');
