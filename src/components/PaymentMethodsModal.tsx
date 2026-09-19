import React, { useState } from 'react';
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
  adminContactUsername = 'IAM_Danii_VIP_bot',
  paymentMethods
}) => {
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-3.5 bg-zinc-950/70">
          <div className="flex items-center gap-2">
            {selectedMethod && (
              <button
                type="button"
                onClick={() => setSelectedMethodId(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Volver al menú"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="flex items-center gap-1.5 text-amber-400 font-black text-sm uppercase tracking-wider">
              <span>💳</span>
              <span>{selectedMethod ? 'Detalle de Pago' : 'Métodos de Pago'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
          {selectedMethod ? (
            /* ========================================================================= */
            /* SINGLE PAYMENT METHOD DETAIL VIEW                                        */
            /* ========================================================================= */
            <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-full rounded-2xl bg-gradient-to-b from-amber-500/10 to-transparent p-4 border border-amber-500/20">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-wide">
                  {selectedMethod.title}
                </h3>
                <span className="inline-block mt-1 text-[11px] font-bold text-amber-400/90 uppercase tracking-widest bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  {selectedMethod.category === 'national' ? '🇧🇴 Pago Nacional' : selectedMethod.category === 'international' ? '🌎 Transferencia Internacional' : '⚡ Servicio Digital'}
                </span>
              </div>

              {/* QR or Instructions Image */}
              {selectedMethod.image_url ? (
                <div className="relative group max-w-[280px] sm:max-w-[320px] rounded-2xl overflow-hidden border border-zinc-700 bg-zinc-950 p-2 shadow-lg shadow-black/50">
                  <img
                    src={selectedMethod.image_url}
                    alt={selectedMethod.title}
                    className="w-full h-auto max-h-[320px] object-contain rounded-xl"
                  />
                  <div className="absolute inset-x-0 bottom-2 text-center pointer-events-none">
                    <span className="bg-black/80 backdrop-blur-sm text-[10px] font-medium text-zinc-300 px-2.5 py-1 rounded-full border border-zinc-700">
                      Escanea o guarda esta imagen
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full py-5 px-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 text-zinc-400 text-xs flex flex-col items-center gap-1.5">
                  <span className="text-2xl">📋</span>
                  <span>Datos e instrucciones detalladas abajo:</span>
                </div>
              )}

              {/* Instructions / Account Description */}
              {selectedMethod.description && (
                <div className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-3.5 text-left relative group">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 mb-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Instrucciones & Coordenadas:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(selectedMethod.description || '')}
                      className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                    {selectedMethod.description}
                  </p>
                </div>
              )}

              {/* Telegram Admin Contact Callout */}
              <div className="w-full rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-left">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-zinc-300 space-y-1">
                    <p className="font-bold text-amber-200">
                      Envío confidencial de comprobante:
                    </p>
                    <p className="text-[11px] text-zinc-400 leading-normal">
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
              <div className="w-full space-y-2 pt-2">
                <a
                  href={adminTelegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  <span>📲 Enviar Comprobante a @{cleanAdminUsername}</span>
                  <ExternalLink className="h-3.5 w-3.5 ml-1 opacity-70" />
                </a>

                <button
                  type="button"
                  onClick={() => setSelectedMethodId(null)}
                  className="w-full min-h-11 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>🔙 Ver Otros Métodos de Pago</span>
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* FULL PAYMENT METHODS LIST (REPLICATING SCREENSHOT)                        */
            /* ========================================================================= */
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Header Box from Screenshot */}
              <div className="rounded-2xl border border-pink-500/25 bg-gradient-to-b from-pink-500/15 via-zinc-950/60 to-zinc-950/90 p-4 text-center space-y-1.5 shadow-inner">
                <div className="text-base sm:text-lg font-black tracking-wide text-pink-300">
                  HOLI 💖🔥
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-white tracking-wide">
                  TODOS MIS METODOS DE PAGO 🥰💖
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-bold text-zinc-300">
                  <span className="flex items-center gap-1">📌 BOLIVIA: <span className="text-base">🇧🇴</span></span>
                  <span className="flex items-center gap-1">📌 PERU: <span className="text-base">🇵🇪</span></span>
                  <span className="flex items-center gap-1">📌 EXTRANJERO: <span className="text-base">🇲🇽 🇦🇷 🇺🇸 🌍</span></span>
                </div>
              </div>

              {/* Notification Banner for Admin Contact */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-center text-[11px] text-zinc-400">
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
                    onClick={() => setSelectedMethodId(qrBolivia.id)}
                    className="w-full min-h-12 rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/50 via-zinc-900 to-zinc-900 hover:border-emerald-400 hover:from-emerald-950/80 px-4 py-2.5 text-left flex items-center justify-between transition-all group shadow-md shadow-emerald-950/20 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">🇧🇴</span>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-sm text-white group-hover:text-emerald-300 transition-colors">
                          {qrBolivia.title.replace(/^🇧🇴\s*/, '') || 'PAGO QR BOLIVIA'}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-400">
                          Transferencia bancaria inmediata en Bs.
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all">
                      Ver QR ➔
                    </span>
                  </button>
                </div>
              )}

              {/* 2. 2-COLUMN GRID PAIRS FOR COUNTRIES */}
              <div className="space-y-2">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 px-1">
                  Transferencias Locales por País
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {countryPairs.map(([id1, id2]) => {
                    const m1 = paymentMethods.find(m => m.id === id1 && m.is_active);
                    const m2 = paymentMethods.find(m => m.id === id2 && m.is_active);
                    return (
                      <React.Fragment key={`${id1}_${id2}`}>
                        {m1 && (
                          <button
                            type="button"
                            onClick={() => setSelectedMethodId(m1.id)}
                            className="min-h-11 rounded-xl border border-zinc-700/80 bg-zinc-950/80 hover:bg-zinc-800/90 hover:border-amber-500/40 p-2.5 text-center flex items-center justify-center gap-1.5 transition-all group cursor-pointer"
                          >
                            <span className="font-bold text-xs text-zinc-200 group-hover:text-amber-300">
                              {m1.title}
                            </span>
                          </button>
                        )}
                        {m2 && (
                          <button
                            type="button"
                            onClick={() => setSelectedMethodId(m2.id)}
                            className="min-h-11 rounded-xl border border-zinc-700/80 bg-zinc-950/80 hover:bg-zinc-800/90 hover:border-amber-500/40 p-2.5 text-center flex items-center justify-center gap-1.5 transition-all group cursor-pointer"
                          >
                            <span className="font-bold text-xs text-zinc-200 group-hover:text-amber-300">
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
              <div className="space-y-2 pt-1">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 px-1">
                  Cripto & Servicios Digitales
                </div>
                <div className="space-y-2">
                  {serviceMethods.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => setSelectedMethodId(service.id)}
                      className="w-full min-h-11 rounded-xl border border-zinc-700/80 bg-zinc-950/80 hover:bg-zinc-800/90 hover:border-amber-500/40 px-3.5 py-2 text-left flex items-center justify-between transition-all group cursor-pointer"
                    >
                      <span className="font-bold text-xs text-zinc-200 group-hover:text-amber-300">
                        {service.title}
                      </span>
                      <span className="text-[11px] text-zinc-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all">
                        Detalles ➔
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full min-h-11 rounded-xl border border-zinc-700 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
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

