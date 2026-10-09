import React, { useState, useEffect } from 'react';
import { Profile } from '../types';
import { X, Send, ShieldCheck, CheckCircle2, ChevronRight, Globe2 } from 'lucide-react';

export interface TelegramUserContext {
  id: string;
  first_name: string;
  username?: string;
}

import { PaymentMethod } from "../types";

interface RequestModalProps {
  paymentMethods?: PaymentMethod[];
  profile: Profile | null;
  modelName?: string;
  tgUserContext?: TelegramUserContext | null;
  onOpenPaymentMethods?: () => void;
  onClose: () => void;
}

type Step = 'menu' | 'country' | 'confirm';
type PlanType = 'mensual' | 'semestral' | 'permanente' | null;



export const RequestModal: React.FC<RequestModalProps> = ({ profile, modelName, tgUserContext, onOpenPaymentMethods, onClose, paymentMethods = [] }) => {
  const dynamicCountries = React.useMemo(() => {
    const list = paymentMethods.filter(p => p.category === "international" || p.category === "national").map(p => p.title.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "").trim()).filter(t => t.length > 0);
    return list.length > 0 ? Array.from(new Set(list)) : ['Bolivia', 'Argentina', 'Chile', 'Colombia', 'Ecuador', 'España', 'Estados Unidos', 'México', 'Paraguay', 'Perú', 'Uruguay', 'Venezuela'];
  }, [paymentMethods]);
  const [step, setStep] = useState<Step>('menu');
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(null);
  const [country, setCountry] = useState('');
  const [customCountry, setCustomCountry] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) {
      setStep('menu');
      setSelectedPlan(null);
      setSubmitted(false);
      return;
    }
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.BackButton) {
      try {
        if (step !== 'menu') {
          tg.BackButton.show();
          tg.BackButton.onClick(() => setStep('menu'));
        } else {
          tg.BackButton.show();
          tg.BackButton.onClick(onClose);
        }
        return () => {
          try {
            tg.BackButton.offClick(() => setStep('menu'));
            tg.BackButton.offClick(onClose);
            tg.BackButton.hide();
          } catch {}
        };
      } catch {}
    }
  }, [profile, onClose, step]);

  if (!profile) return null;

  const handlePlanSelect = (plan: PlanType) => {
    setSelectedPlan(plan);
    if (plan === 'mensual') {
      if (onOpenPaymentMethods) {
        onClose();
        onOpenPaymentMethods();
        return;
      }
      setStep('country');
    } else {
      setStep('country');
    }
  };

  const handleCountryNext = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCountry = country === 'Otro' ? customCountry : country;
    if (!finalCountry) {
      setError('Por favor selecciona o ingresa tu país.');
      return;
    }
    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (submitting || submitted) return;
    const finalCountry = country === 'Otro' ? customCountry : country;
    if (!finalCountry) {
      setError('Por favor selecciona o ingresa tu país.');
      return;
    }

    setSubmitting(true);
    setError('');

    const planName = selectedPlan === 'semestral' ? 'SEMESTRAL' : 'PERMANENTE';
    const msg = `Hola, estoy interesado en la SUSCRIPCIÓN ${planName}. Soy de ${finalCountry}. Solicito Información VIP por favor.`;

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_init_data: (window as any).Telegram?.WebApp?.initData || '',
          profile_id: profile.id,
          client_name: tgUserContext?.first_name || 'Cliente Telegram',
          client_telegram: tgUserContext?.username ? `@${tgUserContext.username}` : (tgUserContext?.id ? `ID:${tgUserContext.id}` : '@cliente_telegram'),
          tg_user_id: tgUserContext?.id,
          notes: msg
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);

        // No cerramos la Mini App de Telegram aquí. La llamada a WebApp.close() provoca
        // que la vista quede en negro al terminar la confirmación. Para este flujo, basta
        // con ocultar el modal de solicitud y devolver al usuario a la pantalla anterior.
        window.setTimeout(() => {
          try {
            onClose();
          } catch {}
        }, 1800);
      } else {
        setError(data.error || 'Error al enviar la solicitud');
      }
    } catch {
      setError('Error de conexión al servidor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-zinc-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-zinc-100 my-auto min-h-75 flex flex-col">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-950/80 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-4 m-auto">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold text-white">¡Solicitud Notificada!</h4>
            <p className="text-sm text-zinc-300 leading-relaxed">
              La Administradora ha sido notificada. La atención continuará de forma privada en tu chat de Telegram.
            </p>
            <p className="text-xs text-zinc-500 mt-2">Cerrando ventana...</p>
          </div>
        
        ) : step === 'confirm' ? (
          <div className="flex flex-col h-full justify-center space-y-6 pt-4 text-center">
            <div>
              <div className="w-16 h-16 mx-auto rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center mb-4">
                <Send className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight uppercase">Envío Directo</h3>
              <p className="text-sm text-zinc-300 mt-4 leading-relaxed px-2">
                ¿Aceptas enviar un mensaje directo y privado a <strong>IAM DANII VIP</strong>?
                <br /><br />
                Toda la información de los planes y formas de pago para <strong>{country === 'Otro' ? customCountry : country}</strong> te será enviada de manera 100% privada y confidencial a tu chat de Telegram.
              </p>
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 text-center">
                {error}
              </p>
            )}

            <div className="space-y-3 mt-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-4 px-4 rounded-xl bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-sm tracking-wider uppercase transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Enviando Mensaje...' : 'Sí, Enviar Mensaje Privado'}
              </button>
              <button
                type="button"
                onClick={() => setStep('country')}
                disabled={submitting}
                className="w-full py-3 text-xs text-zinc-500 hover:text-white uppercase font-bold cursor-pointer"
              >
                Cancelar y volver atrás
              </button>
            </div>
          </div>

        ) : step === 'menu' ? (
          <div className="space-y-4 flex flex-col justify-center h-full">
            <h3 className="text-xl font-black text-white text-center mb-4 tracking-tight uppercase">
              Elige tu Plan VIP
            </h3>
            
            <button
              onClick={() => handlePlanSelect('mensual')}
              className="w-full py-4 px-5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-800 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🧸</span>
                <span className="font-bold text-sm tracking-widest text-zinc-200 group-hover:text-amber-400">SUSCRIPCIÓN MENSUAL</span>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-amber-400" />
            </button>

            <button
              onClick={() => handlePlanSelect('semestral')}
              className="w-full py-4 px-5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-sky-500/50 hover:bg-zinc-800 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">💎</span>
                <span className="font-bold text-sm tracking-widest text-zinc-200 group-hover:text-sky-400">SUSCRIPCIÓN SEMESTRAL</span>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-sky-400" />
            </button>

            <button
              onClick={() => handlePlanSelect('permanente')}
              className="w-full py-4 px-5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-purple-500/50 hover:bg-zinc-800 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">💙</span>
                <span className="font-bold text-sm tracking-widest text-zinc-200 group-hover:text-purple-400">SUSCRIPCIÓN PERMANENTE</span>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-purple-400" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleCountryNext} className="flex flex-col h-full space-y-5 pt-2 text-left">
            <div className="text-center mb-2">
              <span className="text-4xl block mb-2">{selectedPlan === 'semestral' ? '💎' : '💙'}</span>
              <h3 className="text-lg font-black text-white tracking-tight uppercase">¡Bienvenido a la zona exclusiva!</h3>
              <p className="text-xs text-zinc-400 mt-2">Por favor indícanos de qué país nos contactas para darte información detallada.</p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-bold text-zinc-300">País de Residencia</label>
              <div className="relative">
                <Globe2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <select
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    if (e.target.value !== 'Otro') setCustomCountry('');
                  }}
                  className="w-full pl-11 pr-4 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-medium text-white focus:outline-none focus:border-amber-500 transition-colors appearance-none"
                  required
                >
                  <option value="" disabled>Selecciona un país...</option>
                  {dynamicCountries.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="Otro">Otro (Especificar)</option>
                </select>
              </div>

              {country === 'Otro' && (
                <input
                  type="text"
                  value={customCountry}
                  onChange={(e) => setCustomCountry(e.target.value)}
                  placeholder="Escribe tu país"
                  className="w-full px-4 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-medium text-white focus:outline-none focus:border-amber-500 transition-colors"
                  required
                />
              )}
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 text-center">
                {error}
              </p>
            )}

            <div className="mt-auto pt-4">
              <button
                type="submit"
                disabled={submitting || !country || (country === 'Otro' && !customCountry)}
                className="w-full py-4 px-4 rounded-xl bg-linear-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-black text-sm tracking-wider uppercase transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
              >
                <Send className="w-5 h-5" />
                {submitting ? 'Notificando...' : 'Información Suscripción VIP'}
              </button>
              <div className="text-center mt-3">
                <button type="button" onClick={() => setStep('menu')} className="text-xs text-zinc-500 hover:text-white uppercase font-bold cursor-pointer">Volver al menú</button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
