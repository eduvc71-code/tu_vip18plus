import React, { useState, useRef, useEffect } from 'react';
import { X, ArrowLeft, Send, ExternalLink, ShieldCheck, CheckCircle2, Copy } from 'lucide-react';
import { PaymentMethod } from '../types';

interface PaymentMethodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminContactUsername?: string;
  paymentMethods: PaymentMethod[];
}

export const PaymentMethodsModal: React.FC<PaymentMethodsModalProps> = ({
  isOpen,
  onClose,
  adminContactUsername = 'Danii_Catalogo_SCZ_bot',
  paymentMethods
}) => {
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Estado para la vista previa efímera de 10 segundos al tocar un país
  const [ephemeralMethod, setEphemeralMethod] = useState<PaymentMethod | null>(null);
  const [ephemeralTimeLeft, setEphemeralTimeLeft] = useState(10);
  const ephemeralTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (ephemeralTimerRef.current) clearInterval(ephemeralTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const cleanAdminUsername = adminContactUsername.replace(/^@/, '').trim();
  const adminTelegramUrl = `https://t.me/${cleanAdminUsername}`;

  const selectedMethod = paymentMethods.find(m => m.id === selectedMethodId) || null;

  const handleCopyText = (text: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Ir directo al Detalle de Pago (termina el modo efímero)
  const goToDetail = (method: PaymentMethod) => {
    if (ephemeralTimerRef.current) clearInterval(ephemeralTimerRef.current);
    setEphemeralMethod(null);
    setSelectedMethodId(method.id);
  };

  // Al presionar un país: activar vista efímera por 10 segundos
  const handleCountryClick = (method: PaymentMethod) => {
    // Si no tiene descripción o instrucciones, pasar directo
    if (!method.description || !method.description.trim()) {
      setSelectedMethodId(method.id);
      return;
    }
    setEphemeralMethod(method);
    setEphemeralTimeLeft(10);
    if (ephemeralTimerRef.current) clearInterval(ephemeralTimerRef.current);

    ephemeralTimerRef.current = setInterval(() => {
      setEphemeralTimeLeft(prev => {
        if (prev <= 1) {
          if (ephemeralTimerRef.current) clearInterval(ephemeralTimerRef.current);
          goToDetail(method);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCloseAll = () => {
    if (ephemeralTimerRef.current) clearInterval(ephemeralTimerRef.current);
    setEphemeralMethod(null);
    setSelectedMethodId(null);
    onClose();
  };

  // Grouping methods matching screenshot
  const qrBolivia = paymentMethods.find(m => m.id === 'qr_bolivia');

  const countryPairs: [string, string][] = [
    ['peru', 'chile'],
    ['argentina', 'espana'],
    ['mexico', 'paraguay'],
    ['brasil', 'uruguay'],
    ['colombia', 'rusia'],
    ['ecuador', 'venezuela']
  ];

  const serviceIds = ['cripto', 'tigo_money', 'paypal', 'telegram_stars', 'western_remitly', 'zelle'];
  const serviceMethods = serviceIds
    .map(id => paymentMethods.find(m => m.id === id))
    .filter((m): m is PaymentMethod => Boolean(m && m.is_active));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative flex flex-col w-full max-w-lg max-h-[92vh] rounded-3xl border border-zinc-700/80 bg-zinc-900 shadow-2xl shadow-black/80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 sm:px-5 py-3 bg-zinc-950/80">
          <div className="flex items-center gap-2">
            {selectedMethod && (
              <button
                type="button"
                onClick={() => setSelectedMethodId(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Volver al menú"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex items-center gap-1.5 text-amber-400 font-black text-xs sm:text-sm uppercase tracking-wider">
              <span>💳</span>
              <span>{selectedMethod ? 'Detalle de Pago' : 'Métodos de Pago'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseAll}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 custom-scrollbar relative">
          
          {/* ========================================================================= */}
          {/* POPUP EFÍMERO DE 10 SEGUNDOS AL PRESIONAR UN PAÍS                          */}
          {/* ========================================================================= */}
          {ephemeralMethod && (
            <div 
              className="absolute inset-0 z-40 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full max-w-sm rounded-2xl bg-zinc-950 border border-amber-500/40 p-4 shadow-2xl space-y-3">
                
                {/* Cabecera: Etiqueta Bandera + Nombre del País y Botón X */}
                <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black tracking-wide truncate">
                    <span>{ephemeralMethod.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToDetail(ephemeralMethod)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Ir a Detalle de Pago"
                    aria-label="Cerrar y abrir detalle"
                  >
                    <X className="h-4 w-4 text-amber-400" />
                  </button>
                </div>

                {/* Subtítulo & Coordenadas */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                      <span>📋</span> Instrucciones & Coordenadas:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(ephemeralMethod.description || '')}
                      className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold cursor-pointer"
                    >
                      {copied ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copied ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/90 max-h-36 overflow-y-auto">
                    <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                      {ephemeralMethod.description}
                    </p>
                  </div>
                </div>

                {/* Temporizador Efímero de 10s y Botón que lleva a Detalle de Pago */}
                <div className="pt-1 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                    <span>⏱️ Coordenadas efímeras</span>
                    <span className="text-amber-400 font-bold">{ephemeralTimeLeft}s</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
                    <div 
                      className="bg-amber-400 h-full transition-all duration-1000 ease-linear"
                      style={{ width: `${(ephemeralTimeLeft / 10) * 100}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => goToDetail(ephemeralMethod)}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer active:scale-98"
                  >
                    <span>Continuar a Detalle de Pago ➔</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedMethod ? (
            /* ========================================================================= */
            /* SINGLE PAYMENT METHOD DETAIL VIEW (REDUCIDO Y COMPACTO)                   */
            /* ========================================================================= */
            <div className="flex flex-col items-center text-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
              
              {/* Contenedor Compacto de País y Transferencia Internacional */}
              <div className="w-full rounded-xl bg-gradient-to-r from-amber-500/10 via-zinc-950 to-amber-500/10 px-3 py-2 border border-amber-500/20 flex items-center justify-between gap-2 text-left">
                <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-wide truncate">
                  {selectedMethod.title}
                </h3>
                <span className="inline-block text-[9px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/25 shrink-0">
                  {selectedMethod.category === 'national' ? '🇧🇴 Pago Nacional' : selectedMethod.category === 'international' ? '🌎 Transf. Internacional' : '⚡ Servicio Digital'}
                </span>
              </div>

              {/* QR or Instructions Image */}
              {selectedMethod.image_url ? (
                <div className="relative group max-w-[260px] sm:max-w-[290px] rounded-2xl overflow-hidden border border-zinc-700 bg-zinc-950 p-2 shadow-lg shadow-black/50">
                  <img
                    src={selectedMethod.image_url}
                    alt={selectedMethod.title}
                    className="w-full h-auto max-h-[290px] object-contain rounded-xl"
                  />
                  <div className="absolute inset-x-0 bottom-2 text-center pointer-events-none">
                    <span className="bg-black/80 backdrop-blur-sm text-[9px] font-medium text-zinc-300 px-2.5 py-0.5 rounded-full border border-zinc-700">
                      Escanea o guarda esta imagen
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full py-3.5 px-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 text-zinc-400 text-xs flex flex-col items-center gap-1">
                  <span className="text-xl">📋</span>
                  <span className="text-[11px]">Datos e instrucciones detalladas abajo:</span>
                </div>
              )}

              {/* Instructions / Account Description */}
              {selectedMethod.description && (
                <div className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-left relative group">
                  <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/80 mb-2">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                      Instrucciones & Coordenadas:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(selectedMethod.description || '')}
                      className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed font-normal">
                    {selectedMethod.description}
                  </p>
                </div>
              )}

              {/* Telegram Admin Contact Callout */}
              <div className="w-full rounded-xl bg-amber-500/10 border border-amber-500/25 p-2.5 text-left">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-zinc-300 space-y-0.5">
                    <p className="font-bold text-amber-200">
                      Envío confidencial de comprobante:
                    </p>
                    <p className="text-[10px] text-zinc-400 leading-normal">
                      Una vez realizado tu depósito o transferencia, envía la captura directamente a la Administradora:{' '}
                      <a
                        href={adminTelegramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-amber-400 underline underline-offset-2 hover:text-amber-300"
                      >
                        @{cleanAdminUsername}
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full space-y-2 pt-1">
                <a
                  href={adminTelegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-98"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>📲 Enviar Comprobante a @{cleanAdminUsername}</span>
                  <ExternalLink className="h-3 w-3 ml-1 opacity-70" />
                </a>

                <button
                  type="button"
                  onClick={() => setSelectedMethodId(null)}
                  className="w-full min-h-9 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>🔙 Ver Otros Métodos de Pago</span>
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* FULL PAYMENT METHODS LIST (REPLICATING SCREENSHOT)                        */
            /* ========================================================================= */
            <div className="space-y-3.5 animate-in fade-in duration-200">
              
              {/* Header Box from Screenshot */}
              <div className="rounded-2xl border border-pink-500/25 bg-gradient-to-b from-pink-500/15 via-zinc-950/60 to-zinc-950/90 p-3.5 text-center space-y-1 shadow-inner">
                <div className="text-sm sm:text-base font-black tracking-wide text-pink-300">
                  HOLI 💖🔥
                </div>
                <div className="text-xs font-extrabold text-white tracking-wide">
                  TODOS MIS METODOS DE PAGO 🥰💖
                </div>
                <div className="pt-1.5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[10px] font-bold text-zinc-300">
                  <span className="flex items-center gap-1">📌 BOLIVIA: <span className="text-sm">🇧🇴</span></span>
                  <span className="flex items-center gap-1">📌 PERU: <span className="text-sm">🇵🇪</span></span>
                  <span className="flex items-center gap-1">📌 EXTRANJERO: <span className="text-sm">🇲🇽 🇦🇷 🇺🇸 🌍</span></span>
                </div>
              </div>

              {/* Notification Banner for Admin Contact */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-center text-[10px] text-zinc-400">
                <span>Comprobantes y atención privada con la Admin:{' '}</span>
                <a
                  href={adminTelegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-amber-400 hover:underline"
                >
                  @{cleanAdminUsername}
                </a>
              </div>

              {/* 1. TOP FULL-WIDTH BUTTON: PAGO QR BOLIVIA */}
              {qrBolivia && qrBolivia.is_active && (
                <div>
                  <button
                    type="button"
                    onClick={() => handleCountryClick(qrBolivia)}
                    className="w-full min-h-11 rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/50 via-zinc-900 to-zinc-900 hover:border-emerald-400 hover:from-emerald-950/80 px-3.5 py-2 text-left flex items-center justify-between transition-all group shadow-md shadow-emerald-950/20 cursor-pointer active:scale-98"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🇧🇴</span>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-xs text-white group-hover:text-emerald-300 transition-colors">
                          {qrBolivia.title.replace(/^🇧🇴\s*/, '') || 'PAGO QR BOLIVIA'}
                        </span>
                        <span className="text-[9px] font-semibold text-emerald-400">
                          Transferencia bancaria inmediata en Bs.
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all">
                      Ver QR ➔
                    </span>
                  </button>
                </div>
              )}

              {/* 2. 2-COLUMN GRID PAIRS FOR COUNTRIES (REDUCIDO Y COMPACTO) */}
              <div className="space-y-1.5">
                <div className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-500 px-1">
                  Transferencias Locales por País
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {countryPairs.map(([id1, id2]) => {
                    const m1 = paymentMethods.find(m => m.id === id1 && m.is_active);
                    const m2 = paymentMethods.find(m => m.id === id2 && m.is_active);
                    return (
                      <React.Fragment key={`${id1}_${id2}`}>
                        {m1 && (
                          <button
                            type="button"
                            onClick={() => handleCountryClick(m1)}
                            className="min-h-[38px] rounded-xl border border-zinc-700/80 bg-zinc-950/80 hover:bg-zinc-800/90 hover:border-amber-500/40 py-1.5 px-2.5 text-center flex items-center justify-center gap-1.5 transition-all group cursor-pointer active:scale-98"
                          >
                            <span className="font-bold text-[11px] sm:text-xs text-zinc-200 group-hover:text-amber-300 truncate">
                              {m1.title}
                            </span>
                          </button>
                        )}
                        {m2 && (
                          <button
                            type="button"
                            onClick={() => handleCountryClick(m2)}
                            className="min-h-[38px] rounded-xl border border-zinc-700/80 bg-zinc-950/80 hover:bg-zinc-800/90 hover:border-amber-500/40 py-1.5 px-2.5 text-center flex items-center justify-center gap-1.5 transition-all group cursor-pointer active:scale-98"
                          >
                            <span className="font-bold text-[11px] sm:text-xs text-zinc-200 group-hover:text-amber-300 truncate">
                              {m2.title}
                            </span>
                          </button>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* 3. FULL-WIDTH SERVICES */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-500 px-1">
                  Cripto & Servicios Digitales
                </div>
                <div className="space-y-1.5">
                  {serviceMethods.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => handleCountryClick(service)}
                      className="w-full min-h-10 rounded-xl border border-zinc-700/80 bg-zinc-950/80 hover:bg-zinc-800/90 hover:border-amber-500/40 px-3 py-1.5 text-left flex items-center justify-between transition-all group cursor-pointer active:scale-98"
                    >
                      <span className="font-bold text-xs text-zinc-200 group-hover:text-amber-300">
                        {service.title}
                      </span>
                      <span className="text-[10px] text-zinc-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all">
                        Detalles ➔
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCloseAll}
                  className="w-full min-h-9 rounded-xl border border-zinc-700 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 font-bold text-[11px] flex items-center justify-center transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
