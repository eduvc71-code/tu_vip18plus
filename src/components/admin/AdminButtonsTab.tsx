import React, { useState } from 'react';
import { CustomButton } from '../../types';
import { adminFetch } from '../../client/adminFetch';
import {
  Sparkles,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { ListRowSkeleton } from './AdminSkeletons';

interface AdminButtonsTabProps {
  customButtons: CustomButton[];
  token: string;
  initialLoading: boolean;
  fetchData: () => Promise<void>;
  setMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void;
}

export const AdminButtonsTab: React.FC<AdminButtonsTabProps> = ({
  customButtons,
  token,
  initialLoading,
  fetchData,
  setMessage
}) => {
  const [editingButton, setEditingButton] = useState<Partial<CustomButton> | null>(null);
  const [savingButton, setSavingButton] = useState(false);
  const [buttonFormData, setButtonFormData] = useState({
    label: '',
    url: '',
    type: 'url' as 'url' | 'telegram' | 'subscription',
    visible_channel: true,
    visible_miniapp: true,
    is_active: true
  });

  const handleSaveButton = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!buttonFormData.label.trim()) {
      setMessage({ type: 'error', text: 'La etiqueta del botón es requerida.' });
      return;
    }
    if (buttonFormData.type !== 'subscription' && !buttonFormData.url.trim()) {
      setMessage({ type: 'error', text: 'La URL o deep-link es requerida para este tipo de botón.' });
      return;
    }
    setSavingButton(true);
    try {
      const res = await adminFetch('/api/admin/buttons', token, {
        method: 'POST',
        json: {
          id: editingButton?.id,
          ...buttonFormData
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: `Botón "${data.button.label}" guardado correctamente.` });
        setEditingButton(null);
        setButtonFormData({ label: '', url: '', type: 'url', visible_channel: true, visible_miniapp: true, is_active: true });
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar botón' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al guardar botón' });
    } finally {
      setSavingButton(false);
    }
  };

  const handleDeleteButton = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este botón?')) return;
    try {
      const res = await adminFetch(`/api/admin/buttons/${id}`, token, {
        method: 'DELETE'
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Botón eliminado correctamente' });
        fetchData();
      } else {
        setMessage({ type: 'error', text: 'Error al eliminar botón' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de red al eliminar botón' });
    }
  };

  return (
    <div className="space-y-5 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" /> Botones Interactivos
          </h3>
          <p className="text-[11px] text-zinc-400">
            Crea botones con enlaces personalizados (Canal Free, OnlyFans, Promociones VIP).
          </p>
        </div>
        <button
          onClick={() => fetchData()}
          className="self-start sm:self-auto shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {/* Formulario Crear / Editar Botón */}
      <form onSubmit={handleSaveButton} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
        <h4 className="font-bold text-white text-xs flex items-center gap-2">
          {editingButton ? <Edit className="w-3.5 h-3.5 text-amber-400" /> : <Plus className="w-3.5 h-3.5 text-amber-400" />}
          {editingButton ? 'Editar Botón Personalizado' : 'Crear Nuevo Botón'}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-zinc-400 mb-1 font-semibold">Texto / Etiqueta del Botón *</label>
            <input
              type="text"
              required
              value={buttonFormData.label}
              onChange={e => setButtonFormData({ ...buttonFormData, label: e.target.value })}
              placeholder="Ej: 🎁 Promoción 50% VIP o 💋 Canal Free"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-zinc-400 mb-1 font-semibold">Tipo de botón</label>
            <select
              value={buttonFormData.type}
              onChange={e => setButtonFormData({ ...buttonFormData, type: e.target.value as 'url' | 'telegram' | 'subscription' })}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
            >
              <option value="url">URL</option>
              <option value="telegram">Telegram</option>
              <option value="subscription">Suscripción / flujo interno</option>
            </select>
          </div>
          <div>
            <label className="block text-zinc-400 mb-1 font-semibold">
              {buttonFormData.type === 'subscription' ? 'Destino interno (opcional)' : 'Enlace Destino (URL o Telegram) *'}
            </label>
            <input
              type="text"
              value={buttonFormData.url}
              onChange={e => setButtonFormData({ ...buttonFormData, url: e.target.value })}
              placeholder={buttonFormData.type === 'subscription' ? 'Opcional: usa el flujo interno de suscripción' : 'https://... o t.me/... o tg://...'}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
              required={buttonFormData.type !== 'subscription'}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={buttonFormData.visible_channel}
              onChange={e => setButtonFormData({ ...buttonFormData, visible_channel: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
            />
            <span className="text-zinc-300 font-medium">📢 Mostrar en Canal Telegram</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={buttonFormData.visible_miniapp}
              onChange={e => setButtonFormData({ ...buttonFormData, visible_miniapp: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
            />
            <span className="text-zinc-300 font-medium">📱 Mostrar en Mini App</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={buttonFormData.is_active}
              onChange={e => setButtonFormData({ ...buttonFormData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
            />
            <span className="text-zinc-300 font-medium">🟢 Activo</span>
          </label>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={savingButton}
            className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            {savingButton ? 'Guardando...' : editingButton ? 'Guardar Cambios' : 'Crear Botón'}
          </button>
          {editingButton && (
            <button
              type="button"
              onClick={() => {
                setEditingButton(null);
                setButtonFormData({ label: '', url: '', type: 'url', visible_channel: true, visible_miniapp: true, is_active: true });
              }}
              className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Lista de Botones */}
      <div className="space-y-2">
        <h4 className="font-bold text-zinc-300">Botones Registrados ({customButtons.length})</h4>
        {initialLoading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 divide-y divide-zinc-900" aria-hidden="true">
            <ListRowSkeleton /><ListRowSkeleton /><ListRowSkeleton />
          </div>
        ) : customButtons.length === 0 ? (
          <div className="p-6 text-center bg-zinc-950/60 border border-zinc-800 rounded-2xl text-zinc-400">
            No hay botones configurados todavía. Agrega el primero arriba.
          </div>
        ) : (
          <div className="space-y-2">
            {customButtons.map(btn => (
              <div key={btn.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-xs">{btn.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${btn.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                      {btn.is_active ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[9px] font-semibold uppercase">
                      {btn.type || 'url'}
                    </span>
                    {btn.visible_channel && (
                      <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 text-[9px] font-semibold">
                        📢 Canal
                      </span>
                    )}
                    {btn.visible_miniapp && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[9px] font-semibold">
                        📱 Mini App
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono truncate">{btn.url}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={btn.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                    title="Probar enlace"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingButton(btn);
                      setButtonFormData({
                        label: btn.label,
                        url: btn.url,
                        type: (btn.type || 'url') as 'url' | 'telegram' | 'subscription',
                        visible_channel: Boolean(btn.visible_channel),
                        visible_miniapp: Boolean(btn.visible_miniapp),
                        is_active: Boolean(btn.is_active)
                      });
                    }}
                    className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteButton(btn.id)}
                    className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

