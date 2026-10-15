import React, { useState } from 'react';
import { DynamicPoll } from '../../types';
import { adminFetch } from '../../client/adminFetch';
import {
  BarChart2,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { RequestSkeleton } from './AdminSkeletons';

interface AdminPollsTabProps {
  dynamicPolls: DynamicPoll[];
  token: string;
  initialLoading: boolean;
  fetchData: () => Promise<void>;
  setMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void;
}

export const AdminPollsTab: React.FC<AdminPollsTabProps> = ({
  dynamicPolls,
  token,
  initialLoading,
  fetchData,
  setMessage
}) => {
  const [editingPoll] = useState<Partial<DynamicPoll> | null>(null);
  const [savingPoll, setSavingPoll] = useState(false);
  const [pollFormData, setPollFormData] = useState({
    question: '',
    options: ['', ''],
    visible_channel: true,
    visible_miniapp: true,
    publish_telegram: true
  });

  const handleSavePoll = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const validOptions = pollFormData.options.map(o => o.trim()).filter(Boolean);
    if (!pollFormData.question.trim() || validOptions.length < 2) {
      setMessage({ type: 'error', text: 'Debes ingresar una pregunta y al menos 2 opciones' });
      return;
    }
    setSavingPoll(true);
    try {
      const res = await adminFetch('/api/admin/polls', token, {
        method: 'POST',
        json: {
          id: editingPoll?.id,
          question: pollFormData.question.trim(),
          options: validOptions,
          visible_channel: pollFormData.visible_channel,
          visible_miniapp: pollFormData.visible_miniapp,
          publish_telegram: pollFormData.publish_telegram,
          is_active: true
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: 'success',
          text: data.telegram_published
            ? '🎉 ¡Encuesta creada y enviada al Canal VIP de Telegram y a la Mini App!'
            : '✅ Encuesta guardada para la Mini App exitosamente.'
        });
        setPollFormData({ question: '', options: ['', ''], visible_channel: true, visible_miniapp: true, publish_telegram: true });
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al crear encuesta' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al crear encuesta' });
    } finally {
      setSavingPoll(false);
    }
  };

  const handleDeletePoll = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta encuesta?')) return;
    try {
      const res = await adminFetch(`/api/admin/polls/${id}`, token, {
        method: 'DELETE'
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Encuesta eliminada correctamente' });
        fetchData();
      } else {
        setMessage({ type: 'error', text: 'Error al eliminar encuesta' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de red al eliminar encuesta' });
    }
  };

  return (
    <div className="space-y-5 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-amber-400" /> Dinámicas y Encuestas
          </h3>
          <p className="text-[11px] text-zinc-400">
            Lanza votaciones en el Canal de Telegram y en la Mini App para interactuar con tus seguidores.
          </p>
        </div>
        <button
          onClick={() => fetchData()}
          className="self-start sm:self-auto shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {/* Formulario Crear Encuesta */}
      <form onSubmit={handleSavePoll} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
        <h4 className="font-bold text-white text-xs flex items-center gap-2">
          <Plus className="w-3.5 h-3.5 text-amber-400" /> Nueva Encuesta / Dinámica
        </h4>

        <div>
          <label className="block text-zinc-400 mb-1 font-semibold">Pregunta de la Encuesta *</label>
          <input
            type="text"
            required
            value={pollFormData.question}
            onChange={e => setPollFormData({ ...pollFormData, question: e.target.value })}
            placeholder="Ej: ¿Qué color de lencería prefieren para este viernes?"
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-zinc-400 font-semibold">Opciones de Votación (Mínimo 2) *</label>
          {pollFormData.options.map((opt, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <span className="w-5 text-zinc-500 text-right font-mono text-[11px]">{idx + 1}.</span>
              <input
                type="text"
                required
                value={opt}
                onChange={e => {
                  const updated = [...pollFormData.options];
                  updated[idx] = e.target.value;
                  setPollFormData({ ...pollFormData, options: updated });
                }}
                placeholder={`Opción ${idx + 1}`}
                className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
              />
              {pollFormData.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    const updated = pollFormData.options.filter((_, i) => i !== idx);
                    setPollFormData({ ...pollFormData, options: updated });
                  }}
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          {pollFormData.options.length < 10 && (
            <button
              type="button"
              onClick={() => setPollFormData({ ...pollFormData, options: [...pollFormData.options, ''] })}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 mt-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Añadir otra opción
            </button>
          )}
        </div>

        <div className="p-3 bg-zinc-900/60 rounded-xl space-y-2 border border-zinc-800">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={pollFormData.publish_telegram}
              onChange={e => setPollFormData({ ...pollFormData, publish_telegram: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
            />
            <span className="text-zinc-200 font-bold">📢 Enviar directamente al Canal de Telegram como Encuesta Nativa</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={pollFormData.visible_miniapp}
              onChange={e => setPollFormData({ ...pollFormData, visible_miniapp: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
            />
            <span className="text-zinc-300 font-medium">📱 Habilitar votación en la Mini App</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={savingPoll}
          className="py-2.5 px-5 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          {savingPoll ? 'Creando Encuesta...' : '🚀 Lanzar Encuesta'}
        </button>
      </form>

      {/* Lista de Encuestas */}
      <div className="space-y-3">
        <h4 className="font-bold text-zinc-300">Encuestas Activas ({dynamicPolls.length})</h4>
        {initialLoading ? (
          <div className="space-y-3" aria-hidden="true">
            <RequestSkeleton /><RequestSkeleton />
          </div>
        ) : dynamicPolls.length === 0 ? (
          <div className="p-6 text-center bg-zinc-950/60 border border-zinc-800 rounded-2xl text-zinc-400">
            No hay encuestas creadas aún.
          </div>
        ) : (
          <div className="space-y-3">
            {dynamicPolls.map(poll => {
              const totalVotes = Object.values(poll.votes || {}).reduce((a, b) => a + b, 0);
              return (
                <div key={poll.id} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h5 className="font-bold text-white text-xs sm:text-sm">{poll.question}</h5>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1">
                        <span>{totalVotes} votos registrados</span>
                        <span>•</span>
                        <span>{new Date(poll.created_at).toLocaleDateString('es-BO')}</span>
                        {poll.telegram_poll_id && (
                          <>
                            <span>•</span>
                            <span className="text-sky-400 font-semibold">En Telegram Poll</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePoll(poll.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                      title="Eliminar encuesta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {poll.options.map((opt, optIdx) => {
                      const votes = (poll.votes?.[optIdx] ?? (poll.votes as any)?.[opt]) || 0;
                      const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                      return (
                        <div key={opt} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-zinc-300 font-medium">{opt}</span>
                            <span className="text-zinc-400 font-mono">{votes} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

