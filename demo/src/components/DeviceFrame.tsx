import React, { useState, useEffect } from 'react';
import { DemoView } from '../types';
import {
  Sliders,
  Smartphone,
  Send,
  MessageSquare,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

interface DeviceFrameProps {
  currentView: DemoView;
  onViewChange: (view: DemoView) => void;
  isPhoneFrame: boolean;
  onTogglePhoneFrame: () => void;
  children: React.ReactNode;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({
  currentView,
  onViewChange,
  isPhoneFrame,
  onTogglePhoneFrame,
  children
}) => {
  const [showIntro, setShowIntro] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [splashInfo, setSplashInfo] = useState<{ title: string; subtitle: string; icon: string } | null>(null);

  // Contador de permanencia: 9.5 segundos de lectura + 700ms de desvanecimiento suave (10.2s total)
  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 9500);

    const removeTimer = setTimeout(() => {
      setShowIntro(false);
    }, 10200);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // Pequeño splash descriptivo al cambiar a Mini App, Canal o Bot
  useEffect(() => {
    if (currentView === 'admin') {
      setSplashInfo(null);
      return;
    }

    let info = null;
    if (currentView === 'miniapp') {
      info = {
        icon: '📱',
        title: 'Así se verá la Mini App para los suscriptores',
        subtitle: 'Catálogo interactivo con fotos, videos y cobro en Estrellas'
      };
    } else if (currentView === 'channel') {
      info = {
        icon: '📢',
        title: 'Así se verá el Canal Telegram para los suscriptores',
        subtitle: 'Comunidad VIP con publicaciones, reacciones y vista previa'
      };
    } else if (currentView === 'bot') {
      info = {
        icon: '🤖',
        title: 'Así se verá el Bot Telegram para los suscriptores',
        subtitle: 'Atención 24/7, bienvenida automatizada y acceso rápido'
      };
    }

    setSplashInfo(info);

    const timer = setTimeout(() => {
      setSplashInfo(null);
    }, 3800);

    return () => clearTimeout(timer);
  }, [currentView]);

  const handleDismissIntro = () => {
    setIsExiting(true);
    setTimeout(() => setShowIntro(false), 300);
  };

  const handleTriggerIntro = () => {
    setIsExiting(false);
    setShowIntro(true);
  };

  // Mini App, Canal y Bot siempre se presentan en contenedor de dispositivo independiente
  const isSubscriberView = currentView !== 'admin';
  const shouldRenderPhoneFrame = isSubscriberView || isPhoneFrame;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center select-none overflow-x-hidden">
      
      {/* ── Barra Superior Global de Demostración ── */}
      <header className="w-full bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 px-2.5 py-2 sm:px-6 sm:py-2.5 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        
        {/* Logotipo y Botón para Reabrir el Anuncio Informativo */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-zinc-950 font-black text-xs flex items-center justify-center shadow-md">
            VIP
          </div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xs sm:text-sm font-bold text-white leading-tight">
              Tú VIP
            </h1>
            <button
              type="button"
              onClick={handleTriggerIntro}
              className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all cursor-pointer flex items-center gap-0.5 active:scale-95"
              title="Clic para volver a ver la información de la plataforma"
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>DEMO</span>
            </button>
          </div>
        </div>

        {/* Selector de Vistas Independientes */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-zinc-950 p-1 rounded-2xl border border-zinc-800 text-[11px] sm:text-xs">
          <button
            type="button"
            onClick={() => onViewChange('admin')}
            className={`px-2 sm:px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-all cursor-pointer ${
              currentView === 'admin'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">1. Admin</span>
            <span className="sm:hidden text-[10px]">Admin</span>
          </button>

          <button
            type="button"
            onClick={() => onViewChange('miniapp')}
            className={`px-2 sm:px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-all cursor-pointer ${
              currentView === 'miniapp'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">2. Mini App</span>
            <span className="sm:hidden text-[10px]">App</span>
          </button>

          <button
            type="button"
            onClick={() => onViewChange('channel')}
            className={`px-2 sm:px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-all cursor-pointer ${
              currentView === 'channel'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">3. Canal</span>
            <span className="sm:hidden text-[10px]">Canal</span>
          </button>

          <button
            type="button"
            onClick={() => onViewChange('bot')}
            className={`px-2 sm:px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-all cursor-pointer ${
              currentView === 'bot'
                ? 'bg-emerald-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">4. Bot</span>
            <span className="sm:hidden text-[10px]">Bot</span>
          </button>
        </div>

        {/* Toggle de Tamaño Marco Móvil / Completo (Para Vista Admin) */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onTogglePhoneFrame}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-zinc-700/60"
            title={isPhoneFrame ? 'Ver en formato expandido' : 'Ver simulador en marco de móvil'}
          >
            {isPhoneFrame ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isPhoneFrame ? 'Expandir' : 'Marco Móvil'}</span>
          </button>
        </div>
      </header>

      {/* ── Anuncio Descriptivo: Efecto Zoom al Centro, Más Grande y con el Tenor del Texto Original ── */}
      {showIntro && (
        <div
          onClick={handleDismissIntro}
          className={`fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-6 bg-black/80 backdrop-blur-md transition-all duration-700 ease-out cursor-pointer ${
            isExiting
              ? 'opacity-0 scale-95 pointer-events-none'
              : 'opacity-100 scale-100 pointer-events-auto animate-zoom-center-in'
          }`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-3xl bg-zinc-900/98 border-2 border-amber-500/60 p-5 sm:p-7 shadow-2xl shadow-amber-500/20 text-zinc-100 flex flex-col gap-4 cursor-default"
          >
            {/* Cabecera del Anuncio */}
            <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-zinc-950 flex items-center justify-center font-black text-xs shadow-md">
                  VIP
                </div>
                <div>
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Demostración Interactiva</span>
                  </span>
                  <p className="text-[11px] text-zinc-400">Solución integral para Creadoras</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDismissIntro}
                className="p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer"
                title="Cerrar ventana informativa"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Título Principal */}
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white leading-snug">
                Plataforma 100% Personalizable y Adaptable a tu Medida
              </h2>
            </div>

            {/* Tenor del Texto Original Completo */}
            <p className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed">
              Esta aplicación, junto con su Canal y Bot de Telegram, se adapta y modifica a la medida de <strong className="text-white font-semibold">cualquier Creadora de Contenido, Modelo o Agencia</strong>: tu nombre, tu foto de portada, tus enlaces (OnlyFans, Fanvue, Instagram, etc.), tus métodos de pago (QR Bolivia, USDT, Zelle) y tus publicaciones con venta directa en Estrellas de Telegram.
            </p>

            {/* Puntos Destacados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-300 pt-1">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Mini App con fotos y videos</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Canal Telegram VIP Free</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Bot Telegram 24/7 interactivo</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Panel Admin con carga en vivo</span>
              </div>
            </div>

            {/* Temporizador Visual de 9.5 Segundos */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium">
                <span>Permanencia en pantalla (~10s)</span>
                <span className="text-amber-400/90 font-mono">Auto-cierre</span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 h-full rounded-full animate-shrink-width" />
              </div>
            </div>

            {/* Botón de Acción Directo */}
            <button
              type="button"
              onClick={handleDismissIntro}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer mt-1"
            >
              <span>Entendido, Explorar Demostración</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Contenedor Principal: Independiente para Mini App, Canal y Bot ── */}
      <main className="w-full flex-1 flex items-center justify-center p-2 sm:p-4 lg:p-6 relative overflow-hidden">
        {shouldRenderPhoneFrame ? (
          /* Contenedor Independiente simulando Dispositivo Móvil */
          <div className="relative w-full max-w-[365px] xs:max-w-[385px] sm:max-w-[412px] h-[calc(100dvh-64px)] sm:h-[780px] lg:h-[860px] bg-black rounded-[34px] sm:rounded-[44px] lg:rounded-[48px] border-[5px] sm:border-[8px] lg:border-[10px] border-zinc-800 shadow-2xl shadow-black/80 overflow-hidden flex flex-col">
            
            {/* Notch / Dynamic Island decorativo superior */}
            <div className="flex absolute top-2 inset-x-0 justify-center z-40 pointer-events-none">
              <div className="w-20 sm:w-24 h-3.5 sm:h-4 bg-zinc-900 rounded-full border border-zinc-700/50 shadow-inner" />
            </div>

            {/* Pequeño Splash Descriptivo para Mini App, Canal o Bot */}
            {splashInfo && (
              <div className="absolute top-8 inset-x-3 z-40 animate-splash-in pointer-events-auto">
                <div className="mx-auto max-w-[340px] px-3.5 py-2.5 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-amber-500/50 shadow-2xl shadow-amber-500/10 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg shrink-0">{splashInfo.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-amber-300 leading-tight truncate">
                        {splashInfo.title}
                      </p>
                      <p className="text-[10px] text-zinc-300 leading-tight truncate">
                        {splashInfo.subtitle}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSplashInfo(null)}
                    className="p-1 rounded-full text-zinc-400 hover:text-white bg-zinc-800/80 cursor-pointer shrink-0"
                    title="Cerrar aviso"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Pantalla Interna del Móvil */}
            <div className="flex-1 w-full h-full overflow-hidden flex flex-col relative rounded-[26px] sm:rounded-[36px] lg:rounded-[38px]">
              {children}
            </div>

            {/* Barra Home Indicator inferior decorativa */}
            <div className="flex absolute bottom-1.5 inset-x-0 justify-center z-40 pointer-events-none">
              <div className="w-28 sm:w-32 h-1 bg-zinc-700/80 rounded-full" />
            </div>
          </div>
        ) : (
          /* Modo Expandido Completo (Disponible para Panel Admin) */
          <div className="w-full h-full flex-1 flex flex-col relative overflow-hidden">
            {children}
          </div>
        )}
      </main>

    </div>
  );
};

