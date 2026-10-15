import React, { useState, useEffect } from 'react';
import { PaymentMethod } from '../../types';
import { adminFetch } from '../../client/adminFetch';
import {
  CreditCard,
  RefreshCw,
  Send,
  QrCode,
  Upload,
  Save,
  RotateCcw
} from 'lucide-react';

export function getPaymentMethodFlag(method: PaymentMethod | string): string {
  const title = typeof method === 'string' ? method : (method.title || '');
  const id = typeof method === 'string' ? method : (method.id || '');
  const lower = `${title} ${id}`.toLowerCase();

  const flagMatch = title.match(/^(\p{Regional_Indicator}{2}|\p{Emoji})/u);
  if (flagMatch && !/^[A-Z0-9]/i.test(flagMatch[0])) {
    return flagMatch[0];
  }

  if (lower.includes('bolivia') || /\bbo\b/i.test(lower)) return '🇧🇴';
  if (lower.includes('peru') || lower.includes('perú') || /\bpe\b/i.test(lower)) return '🇵🇪';
  if (lower.includes('chile') || /\bcl\b/i.test(lower)) return '🇨🇱';
  if (lower.includes('argentina') || /\bar\b/i.test(lower)) return '🇦🇷';
  if (lower.includes('espana') || lower.includes('españa') || lower.includes('spain') || /\bes\b/i.test(lower)) return '🇪🇸';
  if (lower.includes('mexico') || lower.includes('méxico') || /\bmx\b/i.test(lower)) return '🇲🇽';
  if (lower.includes('paraguay') || /\bpy\b/i.test(lower)) return '🇵🇾';
  if (lower.includes('brasil') || lower.includes('brazil') || /\bbr\b/i.test(lower)) return '🇧🇷';
  if (lower.includes('uruguay') || /\buy\b/i.test(lower)) return '🇺🇾';
  if (lower.includes('colombia') || /\bco\b/i.test(lower)) return '🇨🇴';
  if (lower.includes('rusia') || lower.includes('russia') || /\bru\b/i.test(lower)) return '🇷🇺';
  if (lower.includes('ecuador') || /\bec\b/i.test(lower)) return '🇪🇨';
  if (lower.includes('venezuela') || /\bve\b/i.test(lower)) return '🇻🇪';
  if (lower.includes('zelle') || lower.includes('estados unidos') || lower.includes('usa') || /\bus\b/i.test(lower)) return '🇺🇸';
  if (lower.includes('cripto') || lower.includes('usdt') || lower.includes('bitcoin') || lower.includes('binance')) return '🪙';
  if (lower.includes('paypal')) return '💸';
  if (lower.includes('estrella') || lower.includes('stars')) return '⭐';
  if (lower.includes('tigo')) return '☎️';
  if (lower.includes('western') || lower.includes('remitly') || lower.includes('moneygram')) return '🌐';

  return '💳';
}

export function getCleanPaymentTitle(method: PaymentMethod): string {
  const rawTitle = method.title || '';
  return rawTitle
    .replace(/^([A-Z]{2}\s*[-–:]\s*)/i, '')
    .replace(/^(\p{Regional_Indicator}{2}|\p{Emoji})\s*/u, '')
    .trim();
}

interface AdminPaymentsTabProps {
  paymentMethods: PaymentMethod[];
  token: string | null;
  initialLoading: boolean;
  loading: boolean;
  fetchData: () => Promise<void> | void;
  setMessage: (msg: { type: 'success' | 'error'; text: string }) => void;
}

export const AdminPaymentsTab: React.FC<AdminPaymentsTabProps> = ({
  paymentMethods,
  token,
  initialLoading,
  loading,
  fetchData,
  setMessage
}) => {
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentImageFile, setPaymentImageFile] = useState<File | null>(null);
  const [paymentImagePreview, setPaymentImagePreview] = useState<string | null>(null);
  const [uploadingPaymentImage, setUploadingPaymentImage] = useState(false);
  const [publishingPaymentsToChannel, setPublishingPaymentsToChannel] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => {
    if (paymentMethods.length > 0) {
      if (!selectedPaymentMethodId) {
        const defaultMethod = paymentMethods.find(m => m.is_active) || paymentMethods[0];
        setSelectedPaymentMethodId(defaultMethod.id);
        setEditingPaymentMethod({ ...defaultMethod });
      } else {
        const current = paymentMethods.find(m => m.id === selectedPaymentMethodId);
        if (current && (!editingPaymentMethod || editingPaymentMethod.id !== current.id)) {
          setEditingPaymentMethod({ ...current });
        }
      }
    }
  }, [paymentMethods, selectedPaymentMethodId]);

  const handlePublishPaymentsToChannel = async () => {
    if (!confirm('¿Deseas publicar el menú interactivo de métodos de pago en el canal oficial de Telegram?')) return;
    setPublishingPaymentsToChannel(true);
    try {
      const res = await adminFetch('/api/admin/payment-methods/publish-channel', token, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Métodos de pago publicados en el canal con éxito.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al publicar en el canal' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión con el servidor' });
    } finally {
      setPublishingPaymentsToChannel(false);
    }
  };

  const handleSavePaymentMethod = async (e?: React.SyntheticEvent, publishAfter = false) => {
    if (e) e.preventDefault();
    if (!editingPaymentMethod) return;
    setSavingPayment(true);
    try {
      const res = await adminFetch(`/api/admin/payment-methods/${editingPaymentMethod.id}`, token, {
        method: 'PUT',
        json: editingPaymentMethod
      });
      if (res.ok) {
        const data = await res.json();
        setMessage({ type: 'success', text: `✅ Método "${data.payment_method.title}" guardado con éxito.` });
        setEditingPaymentMethod(data.payment_method);
        setSelectedPaymentMethodId(data.payment_method.id);
        setPaymentImageFile(null);
        setPaymentImagePreview(null);
        fetchData();

        if (publishAfter) {
          await handlePublishPaymentsToChannel();
        }
      } else {
        setMessage({ type: 'error', text: 'Error al actualizar método de pago' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al guardar método de pago' });
    } finally {
      setSavingPayment(false);
    }
  };

  const handleUploadPaymentMethodImage = async (methodId: string) => {
    if (!paymentImageFile) return;
    setUploadingPaymentImage(true);
    try {
      const fd = new FormData();
      fd.append('image', paymentImageFile);
      const res = await adminFetch(`/api/admin/payment-methods/${methodId}/image`, token, {
        method: 'POST',
        body: fd
      });
      if (res.ok) {
        const data = await res.json();
        setMessage({ type: 'success', text: '🎉 Imagen/QR subido y guardado exitosamente.' });
        setPaymentImageFile(null);
        setPaymentImagePreview(null);
        if (editingPaymentMethod && editingPaymentMethod.id === methodId) {
          setEditingPaymentMethod(data.payment_method);
        }
        fetchData();
      } else {
        setMessage({ type: 'error', text: 'Error al subir imagen/QR' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al subir imagen' });
    } finally {
      setUploadingPaymentImage(false);
    }
  };

  const activeMethods = paymentMethods.filter(m => m.is_active);
  const inactiveMethods = paymentMethods.filter(m => !m.is_active);

  return (
    <div className="space-y-4 text-xs">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-400" /> Métodos de Pago
          </h3>
          <p className="text-[11px] text-zinc-400">
            Gestiona el catálogo con los selectores. Sincronizado en Mini App, Bot de Telegram (/pagos) y Canal VIP.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePublishPaymentsToChannel}
            disabled={publishingPaymentsToChannel}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-linear-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold transition-all shadow-md shadow-pink-500/20 cursor-pointer disabled:opacity-60"
            title="Publicar menú interactivo de métodos de pago en el canal de Telegram"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{publishingPaymentsToChannel ? 'Publicando...' : '📢 Publicar Menú en Canal'}</span>
          </button>
          <button
            type="button"
            onClick={() => fetchData()}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </button>
        </div>
      </div>

      {/* 2 SELECTORES TIPO COMBOLIST: ACTIVOS E INACTIVOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-zinc-950/90 border border-zinc-800 rounded-2xl shadow-inner">
        {/* Combo 1: Métodos Activos */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-extrabold text-[11px] text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>🟢 Métodos Activos ({activeMethods.length})</span>
            </label>
            <span className="text-[10px] text-zinc-500">Visibles al cliente</span>
          </div>
          <select
            value={activeMethods.some(m => m.id === selectedPaymentMethodId) ? selectedPaymentMethodId : ''}
            onChange={(e) => {
              const found = paymentMethods.find(m => m.id === e.target.value);
              if (found) {
                setSelectedPaymentMethodId(found.id);
                setEditingPaymentMethod({ ...found });
                setPaymentImageFile(null);
                setPaymentImagePreview(null);
              }
            }}
            className="w-full px-3 py-2.5 bg-zinc-900 border border-emerald-500/40 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-emerald-400 transition-colors cursor-pointer"
          >
            <option value="" disabled>-- Selecciona un método activo --</option>
            {activeMethods.map((m) => {
              const flag = getPaymentMethodFlag(m);
              const clean = getCleanPaymentTitle(m);
              const priceTag = m.price ? ` [${m.price}]` : '';
              return (
                <option key={m.id} value={m.id}>
                  {flag} {clean}{priceTag}
                </option>
              );
            })}
          </select>
        </div>

        {/* Combo 2: Métodos Inactivos */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-extrabold text-[11px] text-rose-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>🔴 Métodos Inactivos ({inactiveMethods.length})</span>
            </label>
            <span className="text-[10px] text-zinc-500">Ocultos</span>
          </div>
          <select
            value={inactiveMethods.some(m => m.id === selectedPaymentMethodId) ? selectedPaymentMethodId : ''}
            onChange={(e) => {
              const found = paymentMethods.find(m => m.id === e.target.value);
              if (found) {
                setSelectedPaymentMethodId(found.id);
                setEditingPaymentMethod({ ...found });
                setPaymentImageFile(null);
                setPaymentImagePreview(null);
              }
            }}
            className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
          >
            <option value="" disabled>-- Selecciona un método inactivo --</option>
            {inactiveMethods.length === 0 ? (
              <option value="" disabled>Todos los métodos están activos</option>
            ) : (
              inactiveMethods.map((m) => {
                const flag = getPaymentMethodFlag(m);
                const clean = getCleanPaymentTitle(m);
                const priceTag = m.price ? ` [${m.price}]` : '';
                return (
                  <option key={m.id} value={m.id}>
                    {flag} {clean}{priceTag}
                  </option>
                );
              })
            )}
          </select>
        </div>
      </div>

      {/* CONTENEDOR ÚNICO DE GESTIÓN (CARGA IMAGEN + DATOS + BOTONES) */}
      {editingPaymentMethod ? (
        <div className="p-4 sm:p-5 bg-zinc-950 border border-amber-500/30 rounded-2xl space-y-4 shadow-xl shadow-amber-500/5 animate-in fade-in duration-200">
          {/* Header del contenedor */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl sm:text-4xl p-2 rounded-2xl bg-zinc-900 border border-zinc-800 shrink-0 shadow-inner">
                {getPaymentMethodFlag(editingPaymentMethod)}
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                    {editingPaymentMethod.title}
                  </h4>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    editingPaymentMethod.is_active
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {editingPaymentMethod.is_active ? '🟢 Activo' : '🔴 Inactivo'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Categoría:{' '}
                  <strong className="text-zinc-300">
                    {editingPaymentMethod.category === 'national' ? '🇧🇴 Pago Nacional' : editingPaymentMethod.category === 'international' ? '🌍 Transferencia Internacional' : '⚡ Cripto / Servicio Digital'}
                  </strong>
                </p>
              </div>
            </div>

            {/* Botón rápido para alternar visibilidad */}
            <button
              type="button"
              onClick={() => {
                const updated = { ...editingPaymentMethod, is_active: !editingPaymentMethod.is_active };
                setEditingPaymentMethod(updated);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto border ${
                editingPaymentMethod.is_active
                  ? 'bg-rose-950/40 border-rose-500/30 text-rose-300 hover:bg-rose-900/60'
                  : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60'
              }`}
              title="Cambiar visibilidad entre Activo e Inactivo"
            >
              {editingPaymentMethod.is_active ? '🔴 Desactivar (Ocultar)' : '🟢 Activar Método'}
            </button>
          </div>

          <form onSubmit={(e) => handleSavePaymentMethod(e, false)} className="space-y-4">
            {/* Grid de 2 Columnas: Carga Imagen a la izquierda (5 cols), Datos a la derecha (7 cols) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Columna Izquierda: Carga Imagen / QR */}
              <div className="md:col-span-5 p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between space-y-3">
                <div>
                  <label className="flex items-center justify-between">
                    <span>🖼️  Imagen o Código QR</span>
                    {paymentImagePreview && (
                      <span className="text-[10px] text-amber-400 font-normal">Nueva imagen lista</span>
                    )}
                  </label>

                  {paymentImagePreview || editingPaymentMethod.image_url ? (
                    <div className="relative group w-full h-44 sm:h-52 bg-zinc-950 rounded-xl overflow-hidden border border-zinc-700/80 flex items-center justify-center p-2 shadow-inner">
                      <img
                        src={paymentImagePreview || editingPaymentMethod.image_url!}
                        alt={editingPaymentMethod.title}
                        className="w-full h-full object-contain rounded-lg"
                      />
                      {paymentImagePreview && (
                        <div className="absolute top-2 right-2 bg-amber-500 text-zinc-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                          Previsualización
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-44 sm:h-52 bg-zinc-950/60 rounded-xl border border-dashed border-zinc-700/80 flex flex-col items-center justify-center text-zinc-500 gap-2 p-3 text-center">
                      <QrCode className="w-10 h-10 text-zinc-600" />
                      <span className="text-xs font-medium text-zinc-400">Sin imagen o QR subido</span>
                      <span className="text-[10px] text-zinc-600">Sube una imagen para que el cliente pueda escanearla</span>
                    </div>
                  )}
                </div>

                {/* Selector de archivo de imagen */}
                <div className="space-y-2 pt-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setPaymentImageFile(file);
                      if (file) {
                        setPaymentImagePreview(URL.createObjectURL(file));
                      } else {
                        setPaymentImagePreview(null);
                      }
                    }}
                    className="w-full text-xs text-zinc-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-zinc-800 file:text-amber-400 hover:file:bg-zinc-700 cursor-pointer"
                  />
                  {paymentImageFile && (
                    <button
                      type="button"
                      disabled={uploadingPaymentImage}
                      onClick={() => handleUploadPaymentMethodImage(editingPaymentMethod.id)}
                      className="w-full py-2 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-black rounded-xl text-xs cursor-pointer transition-all shadow-md shadow-amber-500/20 disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingPaymentImage ? 'Subiendo imagen...' : '⬆️ Subir y Guardar Imagen / QR'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Columna Derecha: Datos del Método */}
              <div className="md:col-span-7 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1 font-semibold text-[11px]">Título / Nombre del Método *</label>
                    <input
                      type="text"
                      required
                      value={editingPaymentMethod.title || ''}
                      onChange={(e) => setEditingPaymentMethod({ ...editingPaymentMethod, title: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1 font-semibold text-[11px]">Estado de Visibilidad</label>
                    <select
                      value={editingPaymentMethod.is_active ? '1' : '0'}
                      onChange={(e) => setEditingPaymentMethod({ ...editingPaymentMethod, is_active: e.target.value === '1' })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 cursor-pointer font-semibold"
                    >
                      <option value="1">🟢 Activo (Visible para clientes)</option>
                      <option value="0">🔴 Inactivo (Oculto)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold text-[11px]">Categoría del Método</label>
                  <select
                    value={editingPaymentMethod.category || 'international'}
                    onChange={(e) => setEditingPaymentMethod({ ...editingPaymentMethod, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="national">🇧🇴 Pago Nacional (Bolivia)</option>
                    <option value="international">🌍 Transferencia Internacional (Por País)</option>
                    <option value="service">⚡ Criptomonedas & Servicios Digitales</option>
                  </select>
                </div>

                {/* Campo editable Precio Suscripción Mensual (solo para métodos diferentes a Bolivia) */}
                {editingPaymentMethod.id !== 'qr_bolivia' && editingPaymentMethod.category !== 'national' ? (
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/30 space-y-1.5 shadow-sm">
                    <label className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>💎</span>
                        <span>Precio Suscripción Mensual</span>
                      </span>
                      <span className="text-[10px] text-zinc-400 font-normal">Clientes de este país / método</span>
                    </label>
                    <input
                      type="text"
                      value={editingPaymentMethod.price || ''}
                      onChange={(e) => setEditingPaymentMethod({ ...editingPaymentMethod, price: e.target.value })}
                      placeholder="Ej: 15 USD, 20 USDT, 60 Soles, 15 €, etc."
                      className="w-full px-3 py-2 bg-zinc-900 border border-amber-500/40 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400 font-bold placeholder-zinc-600 transition-colors"
                    />
                    <p className="text-[10px] text-zinc-400 leading-normal">
                      Este monto se muestra al cliente en la Mini App al consultar este método, y es el valor que el bot enviará automáticamente si la Administradora no responde a tiempo.
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2">
                    <span className="text-base shrink-0">ℹ️</span>
                    <p className="text-[10px] text-amber-200/90 leading-relaxed">
                      <strong>Precio para Bolivia:</strong> Se administra en la pestaña <strong>"Mi Perfil &gt; Datos"</strong> (Precio Suscripción VIP Bs). Solo los clientes que seleccionen Bolivia verán dicho precio.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold text-[11px]">
                    Instrucciones, Coordenadas y Cuentas Bancarias
                  </label>
                  <textarea
                    rows={5}
                    value={editingPaymentMethod.description || ''}
                    onChange={(e) => setEditingPaymentMethod({ ...editingPaymentMethod, description: e.target.value })}
                    placeholder="Escribe el número de cuenta, CI, titular, banco, alias, correo electrónico o dirección de billetera que verá el cliente..."
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 resize-none font-sans leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Barra de Acciones del Contenedor: Cancelar, Guardar, Guardar/Publicar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  const original = paymentMethods.find(m => m.id === selectedPaymentMethodId);
                  if (original) {
                    setEditingPaymentMethod({ ...original });
                    setPaymentImageFile(null);
                    setPaymentImagePreview(null);
                    setMessage({ type: 'success', text: 'Cambios descartados, datos restaurados.' });
                  }
                }}
                className="w-full sm:w-auto px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl text-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Cancelar Cambios</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={savingPayment || loading}
                  className="flex-1 sm:flex-initial px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black rounded-xl text-xs cursor-pointer transition-all shadow-md shadow-amber-500/20 disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingPayment ? 'Guardando...' : '💾 Guardar'}</span>
                </button>

                <button
                  type="button"
                  disabled={savingPayment || loading || publishingPaymentsToChannel}
                  onClick={() => handleSavePaymentMethod(undefined, true)}
                  className="flex-1 sm:flex-initial px-5 py-2.5 bg-linear-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-black rounded-xl text-xs cursor-pointer transition-all shadow-md shadow-pink-500/20 disabled:opacity-60 flex items-center justify-center gap-1.5"
                  title="Guarda los cambios y publica el menú interactivo en el canal oficial"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{publishingPaymentsToChannel ? 'Publicando...' : '🚀 Guardar y Publicar'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div className="p-8 text-center bg-zinc-950 border border-zinc-800 rounded-2xl text-zinc-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
          <span>Cargando métodos de pago...</span>
        </div>
      )}
    </div>
  );
};

