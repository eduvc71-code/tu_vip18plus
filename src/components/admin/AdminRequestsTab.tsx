import React, { useState } from 'react';
import { CustomerRequest } from '../../types';
import { adminFetch } from '../../client/adminFetch';
import { RequestSkeleton } from './AdminSkeletons';
import {
  Inbox,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Banknote,
  Send,
  MessageSquare
} from 'lucide-react';

interface AdminRequestsTabProps {
  requests: CustomerRequest[];
  token: string | null;
  initialLoading: boolean;
  loading: boolean;
  fetchData: () => Promise<void> | void;
  setMessage: (msg: { type: 'success' | 'error'; text: string }) => void;
}

export const AdminRequestsTab: React.FC<AdminRequestsTabProps> = ({
  requests,
  token,
  initialLoading,
  loading,
  fetchData,
  setMessage
}) => {
  const [requestsFilter, setRequestsFilter] = useState<'all' | 'pendiente' | 'comision_pagada'>('all');
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());
  const [deletingRequests, setDeletingRequests] = useState(false);
  const [replyingRequestId, setReplyingRequestId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState('confirmado');
  const [sendingReply, setSendingReply] = useState(false);
  const [payingRequestId, setPayingRequestId] = useState<string | null>(null);

  const toggleRequestSelection = (id: string) => {
    setSelectedRequestIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = (visibleIds: string[]) => {
    setSelectedRequestIds(prev => {
      const allSelected = visibleIds.every(id => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach(id => next.delete(id));
      } else {
        visibleIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const getFilteredRequests = () => {
    if (requestsFilter === 'all') return requests;
    return requests.filter(r => r.status === requestsFilter);
  };

  const handleDeleteRequests = async (mode: 'selected' | 'filter', filterValue?: string) => {
    let payload: any = {};

    if (mode === 'selected') {
      if (selectedRequestIds.size === 0) {
        setMessage({ type: 'error', text: 'No has seleccionado ninguna solicitud.' });
        return;
      }
      const count = selectedRequestIds.size;
      if (!window.confirm(`⚠️ ¿Eliminar ${count} solicitud(es) seleccionada(s)?\n\nEsta acción NO se puede deshacer.`)) return;
      payload = { ids: Array.from(selectedRequestIds) };
    } else {
      const labels: Record<string, string> = {
        pendiente: 'Pendientes',
        atendida: 'Atendidas',
        fallida: 'Fallidas',
        auto_respondida: 'Auto-respondidas',
        qr_enviado: 'con QR enviado',
        completado: 'Completadas',
        responded: 'Todas las no-pendientes',
        all: '⚠️ TODAS las solicitudes'
      };
      const label = labels[filterValue || ''] || filterValue;

      if (!window.confirm(`⚠️ ¿Eliminar TODAS las solicitudes: ${label}?\n\nEsta acción NO se puede deshacer.`)) return;

      if (filterValue === 'all') {
        if (!window.confirm(`🚨 CONFIRMACIÓN FINAL 🚨\n\n¿Estás 100% segura de eliminar TODAS las solicitudes del sistema?\n\nSe borrarán leads, historial y todo.`)) return;
      }

      payload = { filter: filterValue };
    }

    setDeletingRequests(true);
    try {
      const res = await adminFetch('/api/admin/requests/bulk', token, {
        method: 'DELETE',
        json: payload
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: `🗑️ ${data.message}` });
        setSelectedRequestIds(new Set());
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al eliminar solicitudes' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al eliminar solicitudes' });
    } finally {
      setDeletingRequests(false);
    }
  };

  const handleSendReply = async (requestId: string) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      const res = await adminFetch(`/api/admin/requests/${requestId}/reply`, token, {
        method: 'POST',
        json: { reply_message: replyText, status: replyStatus }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: data.message });
        setReplyingRequestId(null);
        setReplyText('');
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al enviar respuesta' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al responder solicitud' });
    } finally {
      setSendingReply(false);
    }
  };

  const handleMarkPayment = async (reqItem: CustomerRequest) => {
    try {
      setPayingRequestId(reqItem.id);
      const res = await adminFetch(`/api/admin/requests/${reqItem.id}/pay`, token, {
        method: 'POST'
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `Venta pagada registrada para ${reqItem.telegram_first_name}` });
        fetchData();
      } else {
        setMessage({ type: 'error', text: 'Error al marcar venta pagada' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error en red' });
    } finally {
      setPayingRequestId(null);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Inbox className="w-4 h-4 text-amber-400" /> Solicitudes de Disponibilidad
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {requests.length} total · {requests.filter(r => r.status === 'pendiente').length} pendientes
          </p>
        </div>
        <button
          onClick={() => fetchData()}
          disabled={loading}
          className="self-start sm:self-auto shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {/* Panel de filtros y limpieza masiva */}
      {!initialLoading && requests.length > 0 && (
        <div className="p-3.5 bg-zinc-950/90 border border-zinc-800 rounded-2xl space-y-3">
          {/* Filtros por estado */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mr-1">Filtrar:</span>
            {([
              { id: 'all', label: 'Todas', count: requests.length },
              { id: 'pendiente', label: 'Pendientes', count: requests.filter(r => r.status === 'pendiente').length },
              { id: 'comision_pagada', label: 'Pago completado', count: requests.filter(r => r.status === 'comision_pagada').length }
            ] as const).map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setRequestsFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  requestsFilter === f.id
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                <span>{f.label}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
                  requestsFilter === f.id ? 'bg-zinc-950/30 text-zinc-950' : 'bg-zinc-900 text-zinc-500'
                }`}>{f.count}</span>
              </button>
            ))}
          </div>

          {/* Acciones masivas */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/60">
            <button
              type="button"
              onClick={() => {
                const visibleIds = getFilteredRequests().map(r => r.id);
                toggleSelectAllVisible(visibleIds);
              }}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>☑️</span>
              <span>
                {getFilteredRequests().every(r => selectedRequestIds.has(r.id)) && getFilteredRequests().length > 0
                  ? 'Deseleccionar todo'
                  : 'Seleccionar visible'}
              </span>
            </button>

            {selectedRequestIds.size > 0 && (
              <button
                type="button"
                disabled={deletingRequests}
                onClick={() => handleDeleteRequests('selected')}
                className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-rose-500/20 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar seleccionadas ({selectedRequestIds.size})</span>
              </button>
            )}

            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Limpieza rápida:</span>
              {(['fallida', 'completado', 'auto_respondida'] as const).map(f => {
                const count = requests.filter(r => r.status === f).length;
                if (count === 0) return null;
                const labels: Record<string, string> = {
                  fallida: 'Fallidas',
                  completado: 'Completadas',
                  auto_respondida: 'Auto-respondidas'
                };
                return (
                  <button
                    key={f}
                    type="button"
                    disabled={deletingRequests}
                    onClick={() => handleDeleteRequests('filter', f)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-300 text-zinc-400 font-bold text-[10px] transition-colors cursor-pointer border border-zinc-700 hover:border-rose-500/40 disabled:opacity-50"
                    title={`Eliminar todas las solicitudes: ${labels[f]}`}
                  >
                    🧹 {labels[f]} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {initialLoading ? (
        <div className="space-y-3" aria-hidden="true">
          <RequestSkeleton /><RequestSkeleton /><RequestSkeleton />
        </div>
      ) : requests.length === 0 ? (
        <div className="p-8 text-center bg-zinc-950/60 border border-zinc-800/80 rounded-2xl space-y-2">
          <Inbox className="w-10 h-10 text-zinc-700 mx-auto" />
          <p className="text-zinc-400">No hay solicitudes registradas aún.</p>
        </div>
      ) : getFilteredRequests().length === 0 ? (
        <div className="p-8 text-center bg-zinc-950/60 border border-zinc-800/80 rounded-2xl space-y-2">
          <Inbox className="w-10 h-10 text-zinc-700 mx-auto" />
          <p className="text-zinc-400">No hay solicitudes con el filtro &quot;{requestsFilter}&quot;.</p>
          <button
            type="button"
            onClick={() => setRequestsFilter('all')}
            className="text-amber-400 hover:text-amber-300 underline text-xs"
          >
            Ver todas
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {getFilteredRequests().map(reqItem => {
            const isSelected = selectedRequestIds.has(reqItem.id);
            return (
              <div
                key={reqItem.id}
                className={`p-4 bg-zinc-950 border rounded-2xl space-y-3 transition-all ${
                  isSelected ? 'border-amber-500/60 ring-1 ring-amber-500/30' : 'border-zinc-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Checkbox de selección */}
                    <button
                      type="button"
                      onClick={() => toggleRequestSelection(reqItem.id)}
                      className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-amber-500 border-amber-400 shadow-md shadow-amber-500/20'
                          : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500'
                      }`}
                      title={isSelected ? 'Deseleccionar' : 'Seleccionar'}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950" />}
                    </button>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">
                          {reqItem.telegram_first_name || 'Cliente'}
                        </span>
                        {reqItem.telegram_username && (
                          <span className="text-amber-400 font-mono">@{reqItem.telegram_username}</span>
                        )}
                        <span className="text-zinc-500 font-mono text-[11px]">
                          (ID: {reqItem.telegram_user_id || 'N/A'})
                        </span>
                      </div>
                      <p className="text-zinc-300">
                        Consulta por: <strong className="text-amber-300">{reqItem.profile_name}</strong>
                      </p>
                      {reqItem.notes && (
                        <p className="text-zinc-500 text-[11px] bg-zinc-900 px-2 py-1 rounded-lg wrap-break-word">
                          "{reqItem.notes}"
                        </p>
                      )}
                      <p className="text-zinc-500 text-[11px]">
                        {new Date(reqItem.created_at).toLocaleString('es-BO')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      reqItem.status === 'pendiente'
                        ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                        : reqItem.status === 'comision_pagada' || reqItem.status === 'completado'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : reqItem.status === 'fallida'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}>
                      {reqItem.status === 'comision_pagada' ? 'PAGO COMPLETADO' : reqItem.status.toUpperCase()}
                    </span>

                    {reqItem.status !== 'comision_pagada' && (
                      <button
                        disabled={payingRequestId === reqItem.id}
                        onClick={() => handleMarkPayment(reqItem)}
                        className="px-3.5 py-2 rounded-xl bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-zinc-950 font-extrabold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5 text-xs disabled:opacity-50"
                      >
                        {payingRequestId === reqItem.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Banknote className="w-3.5 h-3.5" />
                        )}
                        <span>{payingRequestId === reqItem.id ? 'Marcando...' : 'Marcar Pago'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Reply Section */}
                {replyingRequestId === reqItem.id ? (
                  <div className="pt-2 border-t border-zinc-800 space-y-2">
                    <select
                      value={replyStatus}
                      onChange={(e) => setReplyStatus(e.target.value)}
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="confirmado">Confirmado</option>
                      <option value="rechazado">Rechazado</option>
                      <option value="completado">Completado</option>
                    </select>
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Escribe tu respuesta al cliente..."
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSendReply(reqItem.id)}
                        disabled={sendingReply}
                        className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {sendingReply ? 'Enviando...' : 'Enviar Respuesta'}
                      </button>
                      <button
                        onClick={() => { setReplyingRequestId(null); setReplyText(''); }}
                        className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setReplyingRequestId(reqItem.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium cursor-pointer transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Responder
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRequestIds(new Set([reqItem.id]));
                        setTimeout(() => handleDeleteRequests('selected'), 50);
                      }}
                      disabled={deletingRequests}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-400 border border-rose-800/40 text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
                      title="Eliminar esta solicitud"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
