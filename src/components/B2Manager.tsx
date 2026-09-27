import React, { useState, useEffect } from 'react';
import { Cloud, HardDrive, RefreshCcw, Download, Trash2, CheckCircle2, AlertCircle, FileArchive, Search, SearchCode, ShieldAlert } from 'lucide-react';
import { B2File } from '../types';

interface B2ManagerProps {
  token: string;
}

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
      const res = await fetch('/api/admin/b2/files?prefix=tu-vip/backups/', {
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
            placeholder="Buscar backup por fecha o nombre..." 
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
              <p>No se encontraron respaldos en la ruta <span className="font-mono text-[10px] text-zinc-600">tu-vip/backups/</span></p>
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
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
