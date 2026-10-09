import React, { useState, useEffect } from 'react';
import { Cloud, HardDrive, RefreshCcw, Download, Trash2, CheckCircle2, AlertCircle, FileArchive, Search, SearchCode, ShieldAlert, Users, RefreshCw } from 'lucide-react';
import { B2File } from '../types';

interface B2ManagerProps {
  token: string;
}

interface SubscriberRow {
  telegram_user_id: string;
  telegram_username?: string | null;
  telegram_first_name?: string | null;
  created_at?: string;
  last_seen?: string;
}

// Gestor de base de datos de SUSCRIPTORES (solo visible para el admin maestro).
// Permite listar, eliminar suscriptores individuales o VACIAR toda la tabla
// para que el bot vuelva a dar la bienvenida a todos al interactuar de nuevo.
export const SubscribersManager: React.FC<B2ManagerProps> = ({ token }) => {
  const [subscribers, setSubscribers] = useState<SubscriberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filter, setFilter] = useState('');

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/subscribers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) {
        setSubscribers(data.subscribers || []);
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al cargar suscriptores' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de red al cargar suscriptores' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchSubscribers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteOne = async (userId: string) => {
    if (!confirm(`¿Eliminar al suscriptor ${userId} de la base de datos? El bot le dará la bienvenida completa cuando vuelva a interactuar.`)) return;
    try {
      const res = await fetch(`/api/admin/subscribers/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'success', text: data.message || 'Suscriptor eliminado.' });
        setSubscribers((prev) => prev.filter((s) => String(s.telegram_user_id) !== String(userId)));
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al eliminar suscriptor' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de red al eliminar suscriptor' });
    }
  };

  const handleClearAll = async () => {
    if (!confirm('⚠️ ¿VACIAR por completo la base de datos de suscriptores? Se eliminarán TODOS los registros. Todos volverán a recibir la bienvenida del bot al interactuar de nuevo. Esta acción no se puede deshacer.')) return;
    if (!confirm('Confirmación final: escribe OK mentalmente y pulsa "Aceptar" para VACIAR la tabla de suscriptores.')) return;
    setClearing(true);
    try {
      const res = await fetch('/api/admin/subscribers/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ confirm: 'VACIAR' })
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'success', text: data.message || 'Base de datos de suscriptores vaciada.' });
        setSubscribers([]);
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al vaciar suscriptores' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de red al vaciar suscriptores' });
    } finally {
      setClearing(false);
    }
  };

  const q = filter.trim().toLowerCase();
  const filtered = q
    ? subscribers.filter((s) =>
        String(s.telegram_user_id).includes(q) ||
        String(s.telegram_username || '').toLowerCase().includes(q) ||
        String(s.telegram_first_name || '').toLowerCase().includes(q))
    : subscribers;

  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" /> Base de Datos de Suscriptores
        </h3>
        <button
          onClick={() => { void fetchSubscribers(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      <div className="rounded-2xl border border-red-500/30 bg-zinc-950 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-red-300">VACIAR base de datos de suscriptores</h4>
          <p className="text-[10px] text-zinc-400 mt-1">
            Elimina TODOS los registros de la tabla <code>subscribers</code>. No afecta a los miembros del canal de Telegram;
            el bot volverá a registrar y dar la bienvenida a cada usuario cuando vuelva a interactuar (o pulse /start).
          </p>
        </div>
        <button
          onClick={() => { void handleClearAll(); }}
          disabled={clearing || loading || subscribers.length === 0}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition-all cursor-pointer"
        >
          <Trash2 className="w-4 h-4" /> {clearing ? 'Vaciando...' : `VACIAR (${subscribers.length})`}
        </button>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-3 font-semibold ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/10 text-red-300 border border-red-500/30'}`}>
          {message.text}
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-zinc-200">Listado ({filtered.length} de {subscribers.length})</span>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar por ID, @usuario o nombre..."
            className="flex-1 max-w-xs px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        {loading ? (
          <div className="py-8 text-center text-zinc-500">Cargando suscriptores...</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-zinc-500">{subscribers.length === 0 ? 'No hay suscriptores registrados. 🎉 La base está vacía.' : 'Sin resultados para la búsqueda.'}</div>
        ) : (
          <div className="overflow-x-auto max-h-[50vh] overflow-y-auto rounded-xl border border-zinc-800/60">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-zinc-900 text-zinc-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-3 py-2">ID Telegram</th>
                  <th className="px-3 py-2">Usuario</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Última actividad</th>
                  <th className="px-3 py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filtered.map((s) => (
                  <tr key={s.telegram_user_id} className="hover:bg-zinc-900/60">
                    <td className="px-3 py-2 font-mono text-zinc-300">{s.telegram_user_id}</td>
                    <td className="px-3 py-2 text-sky-300">{s.telegram_username ? `@${s.telegram_username}` : '—'}</td>
                    <td className="px-3 py-2 text-zinc-300">{s.telegram_first_name || '—'}</td>
                    <td className="px-3 py-2 text-zinc-500 whitespace-nowrap">{s.last_seen ? new Date(s.last_seen).toLocaleString() : '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => { void handleDeleteOne(String(s.telegram_user_id)); }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-300 font-bold border border-red-500/30 transition-all cursor-pointer"
                        title="Eliminar de la BD (recibirá bienvenida al volver)"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export const B2Manager: React.FC<B2ManagerProps> = ({ token }) => {
  const [files, setFiles] = useState<B2File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [filter, setFilter] = useState('');

  
  const [scanResults, setScanResults] = useState<{ orphans: B2File[], size: number } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const handleScanOrphans = async () => {
    setScanning(true);
    setScanResults(null);
    try {
      const res = await fetch('/api/admin/b2/scan-orphans', {
        headers: { Authorization: `Bearer ${token}` }
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
    if (!window.confirm(`¿Seguro que deseas eliminar definitivamente ${scanResults.orphans.length} archivos fantasmas para ahorrar ${formatSize(scanResults.size)}?`)) return;
    
    setCleaning(true);
    try {
      const keys = scanResults.orphans.map(o => o.key);
      const res = await fetch('/api/admin/b2/clean-orphans', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ keys })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Limpieza completada: ${data.deletedCount} archivos eliminados de B2.` });
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
          Authorization: `Bearer ${token}`
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

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/b2/files?prefix=tu-vip/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al conectar con B2');
      const data = await res.json();
      if (data.success) {
        setFiles(data.files || []);
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleCreateBackup = async () => {
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/sync-db', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Backup creado exitosamente' });
        fetchFiles();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (key: string) => {
    if (!window.confirm(`⚠️ ADVERTENCIA CRÍTICA:\n\nVas a restaurar la base de datos a este backup:\n${key}\n\nTodos los cambios recientes se perderán. El bot y la página se reiniciarán automáticamente en 1 segundo.\n\n¿Estás absolutamente seguro?`)) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/admin/b2/restore', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ key })
      });
      const data = await res.json();
      if (data.success) {
        alert("Base de datos restaurada. Recargando el sistema...");
        window.location.reload();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert("Error crítico: " + err.message);
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-4 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-400" />
            B2 Storage Manager
          </h3>
          <p className="text-zinc-400 mt-1">Gestión de base de datos en la nube (Backblaze B2)</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={fetchFiles}
            disabled={loading}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
            title="Refrescar Lista"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={handleCreateBackup}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg font-medium transition-colors"
          >
            <HardDrive className="w-4 h-4" />
            <span className="hidden sm:inline">Forzar Backup Ahora</span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-xl flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <p>{message.text}</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-400">Error de conexión a B2</p>
            <p className="text-red-300/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Lista de Archivos */}
      <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col max-h-[500px]">
        <div className="p-3 border-b border-zinc-800 flex items-center gap-2 bg-zinc-900/80">
          <Search className="w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Buscar archivo por nombre..." 
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-zinc-200 placeholder:text-zinc-600 flex-1 min-w-0"
          />
        </div>

        <div className="overflow-y-auto p-2 space-y-1">
          {loading && files.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 animate-pulse">Cargando conexión con la nube...</div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 flex flex-col items-center">
              <FileArchive className="w-10 h-10 mb-3 opacity-20" />
              <p>No se encontraron archivos en la nube B2</p>
            </div>
          ) : (
            filteredFiles.map((file) => (
              <div key={file.key} className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800/50 transition-colors group">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg shrink-0">
                    <FileArchive className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-zinc-200 font-medium truncate" title={file.name}>{file.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-500 font-mono">
                      <span>{new Date(file.lastModified).toLocaleString()}</span>
                      <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
                      <span>{formatSize(file.size)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                  <button
                    onClick={() => handleRestore(file.key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-lg transition-colors font-medium"
                    title="Restaurar a esta versión"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Restaurar</span>
                  </button>
                  <a
                    href={`/api/media?key=${encodeURIComponent(file.key)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                    title="Descargar"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDeleteBackup(file.key)}
                    className="p-1.5 text-rose-500/70 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Eliminar archivo de B2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                </div>
              </div>
            ))
          )}
        </div>
      </div>

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
    </div>
  );
};
