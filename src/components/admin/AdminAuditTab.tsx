import React, { useState } from 'react';
import { AuditLog, SyncErrorLog, AuditedB2Media, AuditedGalleryMedia } from '../../types';
import { adminFetch } from '../../client/adminFetch';
import { ListRowSkeleton } from './AdminSkeletons';
import {
  Activity,
  RefreshCw,
  X,
  AlertTriangle
} from 'lucide-react';

interface AdminAuditTabProps {
  auditLogs: AuditLog[];
  syncErrors: SyncErrorLog[];
  token: string | null;
  adminId: string | null | undefined;
  initialLoading: boolean;
  fetchData: () => Promise<void> | void;
  setMessage: (msg: { type: 'success' | 'error'; text: string }) => void;
}

export const AdminAuditTab: React.FC<AdminAuditTabProps> = ({
  auditLogs,
  syncErrors,
  token,
  adminId,
  initialLoading,
  fetchData,
  setMessage
}) => {
  const [auditedB2Media, setAuditedB2Media] = useState<AuditedB2Media[]>([]);
  const [auditedGalleryMedia, setAuditedGalleryMedia] = useState<AuditedGalleryMedia[]>([]);
  const [auditB2Loading, setAuditB2Loading] = useState(false);
  const [auditB2Error, setAuditB2Error] = useState<string | null>(null);
  const [selectedAuditedMedia, setSelectedAuditedMedia] = useState<AuditedGalleryMedia | null>(null);
  const [auditB2Deleting, setAuditB2Deleting] = useState(false);

  const fetchAuditedB2Media = async () => {
    setAuditB2Loading(true);
    setAuditB2Error(null);
    try {
      const res = await adminFetch('/api/admin/audit/b2-profile-media', token);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo consultar B2.');
      setAuditedB2Media(data.files || []);
      setAuditedGalleryMedia(data.gallery || []);
    } catch (err: any) {
      setAuditB2Error(err.message || 'No se pudo consultar B2.');
    } finally {
      setAuditB2Loading(false);
    }
  };

  const deleteAuditedB2Media = async () => {
    if (!selectedAuditedMedia?.b2Key || !selectedAuditedMedia.b2ObjectDeletable || adminId !== '6461788392') return;
    const key = selectedAuditedMedia.b2Key;
    if (!window.confirm(`Eliminar permanentemente este objeto y sus versiones de B2?\n\n${key}\n\nTambién se quitarán sus referencias del perfil y se guardará una copia actualizada de la base en B2.`)) return;
    setAuditB2Deleting(true);
    setAuditB2Error(null);
    try {
      const res = await adminFetch('/api/admin/audit/b2-profile-media', token, {
        method: 'DELETE',
        json: { key }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || data.details || 'No se pudo completar el borrado.');
      setSelectedAuditedMedia(null);
      setMessage({ type: 'success', text: `Objeto borrado de B2 y base sincronizada. Referencias quitadas: ${data.removedReferences}.` });
      await Promise.all([fetchAuditedB2Media(), fetchData()]);
    } catch (err: any) {
      setAuditB2Error(err.message || 'Falló el borrado.');
    } finally {
      setAuditB2Deleting(false);
    }
  };

  const removeTelegramMediaReference = async () => {
    if (!selectedAuditedMedia || selectedAuditedMedia.source !== 'telegram' || adminId !== '6461788392') return;
    const mediaUrl = selectedAuditedMedia.url;
    if (!window.confirm(`Quitar este medio de la galería y guardar la base actualizada en B2?\n\n${mediaUrl}\n\nEl archivo original en Telegram y las copias ya publicadas en el canal no se borran con esta acción.`)) return;
    setAuditB2Deleting(true);
    setAuditB2Error(null);
    try {
      const res = await adminFetch('/api/admin/audit/b2-profile-media', token, {
        method: 'DELETE',
        json: { url: mediaUrl }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || data.details || 'No se pudo actualizar la galería.');
      setSelectedAuditedMedia(null);
      setMessage({ type: 'success', text: `Referencia retirada de la galería y snapshot guardado en ${data.snapshotKey}.` });
      await Promise.all([fetchAuditedB2Media(), fetchData()]);
    } catch (err: any) {
      setAuditB2Error(err.message || 'Falló la actualización de la galería.');
    } finally {
      setAuditB2Deleting(false);
    }
  };

  const copyAuditedMediaInfo = async () => {
    if (!selectedAuditedMedia) return;
    const info = [
      `Perfil: ${selectedAuditedMedia.profileName} (${selectedAuditedMedia.profileId})`,
      `Origen: ${selectedAuditedMedia.source}`,
      `Archivo: ${selectedAuditedMedia.b2Key?.split('/').pop() || selectedAuditedMedia.url.split('/').pop() || selectedAuditedMedia.url}`,
      `Clave B2: ${selectedAuditedMedia.b2Key || 'No aplica'}`,
      `Objeto presente en B2: ${selectedAuditedMedia.b2ObjectExists ? 'Sí' : 'No'}`,
      `URL: ${selectedAuditedMedia.url}`,
      `Estado: ${selectedAuditedMedia.status === 1 ? 'Publicado' : selectedAuditedMedia.status === 2 ? 'Borrador' : 'Sin estado'}`,
      `Descripción: ${selectedAuditedMedia.description || 'Sin descripción'}`
    ].join('\n');
    try {
      await navigator.clipboard.writeText(info);
      setMessage({ type: 'success', text: 'Información del medio copiada.' });
    } catch {
      setAuditB2Error('No se pudo copiar automáticamente. Selecciona y copia los datos de la ficha.');
    }
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" /> Registro de Auditoría
        </h3>
        <button
          onClick={() => { void fetchData(); void fetchAuditedB2Media(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      <section className="rounded-2xl border border-sky-500/25 bg-zinc-950 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-bold text-sky-300">Auditoría de medios y objetos B2</h4>
            <p className="text-[10px] text-zinc-400 mt-1">Doble clic en un medio para ver su origen, URL y clave. Solo los objetos que realmente están en B2 se pueden borrar aquí.</p>
          </div>
          <button type="button" onClick={() => void fetchAuditedB2Media()} disabled={auditB2Loading} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 font-bold disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${auditB2Loading ? 'animate-spin' : ''}`} />
            {auditB2Loading ? 'Consultando B2…' : 'Consultar medios'}
          </button>
        </div>
        {auditB2Error && <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-rose-300">{auditB2Error}</p>}
        {auditedB2Media.length > 0 && (
          <div className="rounded-lg bg-zinc-900/70 p-2">
            <p className="text-[10px] font-bold text-zinc-300 mb-1">Objetos reales bajo `tu-vip/` en B2 ({auditedB2Media.length})</p>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {auditedB2Media.slice(0, 20).map(file => <p key={file.key} className="truncate text-[9px] text-zinc-500 font-mono">{file.key}</p>)}
              {auditedB2Media.length > 20 && <p className="text-[9px] text-zinc-500">…y {auditedB2Media.length - 20} objetos más</p>}
            </div>
          </div>
        )}
        {!auditB2Loading && auditedGalleryMedia.length === 0 ? (
          <p className="text-zinc-500 text-center py-4">Pulsa “Consultar medios” para cruzar la galería del perfil con los objetos de B2.</p>
        ) : (
          <div className="max-h-72 overflow-y-auto divide-y divide-zinc-800">
            {auditedGalleryMedia.map((item, index) => (
              <button key={`${item.profileId}:${item.url}`} type="button" onDoubleClick={() => setSelectedAuditedMedia(item)} className="w-full text-left p-2.5 hover:bg-zinc-900/70 rounded-lg grid grid-cols-[1fr_auto] gap-2 items-center" title="Doble clic para abrir ficha de auditoría">
                <span className="min-w-0">
                  <span className="block text-zinc-200 truncate font-semibold">{item.b2Key?.split('/').pop() || item.url.split('/').pop() || `Medio ${index + 1}`}</span>
                  <span className="block text-[10px] text-zinc-500 truncate">{item.profileName} · {item.url}</span>
                </span>
                <span className={`text-[9px] font-bold px-2 py-1 rounded-md ${item.source === 'b2' ? (item.b2ObjectExists ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300') : 'bg-violet-500/15 text-violet-300'}`}>
                  {item.source === 'b2' ? (item.b2ObjectExists ? 'B2 PRESENTE' : 'CLAVE B2 NO LISTADA') : item.source.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        )}
        {selectedAuditedMedia && (
          <div className="fixed inset-0 z-145 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedAuditedMedia(null)}>
            <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 p-4 space-y-3 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-bold text-white">Ficha de auditoría del medio</h4>
                <button type="button" onClick={() => setSelectedAuditedMedia(null)} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300" aria-label="Cerrar"><X className="w-4 h-4" /></button>
              </div>
              <dl className="space-y-2 text-[11px]">
                <div><dt className="text-zinc-500">Perfil</dt><dd className="text-zinc-200">{selectedAuditedMedia.profileName} · {selectedAuditedMedia.profileId}</dd></div>
                <div><dt className="text-zinc-500">Almacenamiento detectado</dt><dd className="text-sky-300 font-bold">{selectedAuditedMedia.source.toUpperCase()} · {selectedAuditedMedia.b2ObjectExists ? 'objeto localizado en B2' : 'sin objeto B2 coincidente'}</dd></div>
                <div><dt className="text-zinc-500">Nombre / archivo</dt><dd className="text-zinc-200 break-all">{selectedAuditedMedia.b2Key?.split('/').pop() || selectedAuditedMedia.url.split('/').pop() || 'No disponible'}</dd></div>
                <div><dt className="text-zinc-500">Clave B2</dt><dd className="text-zinc-200 break-all font-mono">{selectedAuditedMedia.b2Key || 'No corresponde a un objeto B2'}</dd></div>
                <div><dt className="text-zinc-500">URL</dt><dd className="text-zinc-200 break-all font-mono">{selectedAuditedMedia.url}</dd></div>
                <div><dt className="text-zinc-500">Estado de publicación / base</dt><dd className="text-zinc-200">{selectedAuditedMedia.status === 1 ? 'Publicado' : selectedAuditedMedia.status === 2 ? 'Borrador' : 'Sin estado guardado'}</dd></div>
                <div><dt className="text-zinc-500">Descripción</dt><dd className="text-zinc-200">{selectedAuditedMedia.description || 'Sin descripción'}</dd></div>
              </dl>
              <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-zinc-800">
                <button type="button" onClick={() => void copyAuditedMediaInfo()} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold">Copiar información</button>
                {selectedAuditedMedia.b2ObjectDeletable && <button type="button" onClick={() => void deleteAuditedB2Media()} disabled={auditB2Deleting} className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:opacity-50">{auditB2Deleting ? 'Eliminando…' : 'Eliminar objeto B2 y sincronizar'}</button>}
                {selectedAuditedMedia.source === 'telegram' && <button type="button" onClick={() => void removeTelegramMediaReference()} disabled={auditB2Deleting} className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold disabled:opacity-50">{auditB2Deleting ? 'Actualizando…' : 'Quitar de galería y sincronizar B2'}</button>}
              </div>
            </div>
          </div>
        )}
      </section>

      {initialLoading ? (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl divide-y divide-zinc-900" aria-hidden="true">
          <ListRowSkeleton /><ListRowSkeleton /><ListRowSkeleton /><ListRowSkeleton />
        </div>
      ) : auditLogs.length === 0 ? (
        <div className="p-8 text-center bg-zinc-950/60 border border-zinc-800/80 rounded-2xl space-y-2">
          <Activity className="w-10 h-10 text-zinc-700 mx-auto" />
          <p className="text-zinc-400">No hay registros de auditoría aún.</p>
        </div>
      ) : (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="max-h-96 overflow-y-auto divide-y divide-zinc-900">
            {auditLogs.map(log => (
              <div key={log.id} className="p-3 flex items-start justify-between gap-4 hover:bg-zinc-900/30 transition-colors">
                <div className="flex items-start gap-2 min-w-0">
                  <span className="shrink-0 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-mono font-bold mt-0.5">
                    {log.action}
                  </span>
                  <span className="text-zinc-300 text-xs wrap-break-word">{log.details}</span>
                </div>
                <span className="shrink-0 text-zinc-500 text-[10px] font-mono">
                  {new Date(log.timestamp).toLocaleTimeString('es-BO')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {syncErrors.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Errores de Sincronización ({syncErrors.length})
          </h4>
          <div className="bg-zinc-950 border border-rose-500/20 rounded-2xl overflow-hidden">
            <div className="max-h-48 overflow-y-auto divide-y divide-zinc-900">
              {syncErrors.map(err => (
                <div key={err.id} className="p-3 flex items-start justify-between gap-4">
                  <span className="text-rose-300 text-xs wrap-break-word">{err.error_message}</span>
                  <span className="shrink-0 text-zinc-500 text-[10px] font-mono">
                    {new Date(err.timestamp).toLocaleTimeString('es-BO')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

