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
  LogOut,
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
  const [exitNotice, setExitNotice] = useState(false);

  // 1. Contador de permanencia del anuncio inicial: 40 segundos de lectura + 700ms de desvanecimiento
  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 40000);

    const removeTimer = setTimeout(() => {
      setShowIntro(false);
    }, 40700);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // Al salir del panel admin para ver los simuladores, cerramos el intro modal si estaba abierto
  useEffect(() => {
    if (currentView !== 'admin') {
      setShowIntro(false);
    }
  }, [currentView]);

  // 2. Anuncios descriptivos grandes de cómo se verá en dispositivos clientes (9 segundos de permanencia)
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
        subtitle: 'Catálogo interactivo exclusivo con fotos, videos, preview VIP difuminado y pasarela directa de cobro en Estrellas de Telegram o QR.'
      };
    } else if (currentView === 'channel') {
      info = {
        icon: '📢',
        title: 'Así se verá tu Canal de Telegram para tus suscriptores',
        subtitle: 'Comunidad VIP con publicaciones automáticas, contador de vistas, reacciones emoji y venta directa de contenido exclusivo.'
      };
    } else if (currentView === 'bot') {
      info = {
        icon: '🤖',
        title: 'Así se verá tu Bot de Telegram para tus suscriptores',
        subtitle: 'Atención automatizada 24/7, mensaje de bienvenida personalizado, entrega inmediata y enlace directo a tu Mini App.'
      };
    }

    setSplashInfo(info);

    const timer = setTimeout(() => {
      setSplashInfo(null);
    }, 9000);

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

  // Intenta cerrar la ventana/pestaña por todos los medios posibles.
  // Si el navegador bloquea el cierre, redirige a Telegram como respaldo.
  const handleExit = () => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.close) tg.close();
    } catch {}
    try { window.close(); } catch {}
    try { window.open('', '_self', ''); window.close(); } catch {}

    // Respaldo: si nada cerró la ventana, avisamos y ofrecemos volver a Telegram
    setExitNotice(true);
    setTimeout(() => {
      try { window.location.href = 'https://t.me/'; } catch {}
    }, 1400);
  };

  // Mini App, Canal y Bot siempre se presentan en contenedor de dispositivo móvil independiente
  const isSubscriberView = currentView !== 'admin';
  const shouldRenderPhoneFrame = isSubscriberView || isPhoneFrame;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center select-none overflow-x-hidden">

      {/* ── Barra Superior Global de Demostración (Visible solo en el Panel Admin para no alterar la vista de Mini App) ── */}
      {currentView === 'admin' ? (
        <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-900/95 px-2 py-2 shadow-sm backdrop-blur-md sm:px-4 sm:py-2.5">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2">
            <div className="flex flex-1 items-center justify-center min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-[10px] font-black text-zinc-950 shadow-md">
                  VIP
                </div>
                <div className="flex items-center gap-1 min-w-0">
                  <h1 className="truncate text-[11px] font-bold leading-tight text-white sm:text-sm">
                    Tú VIP
                  </h1>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleTriggerIntro}
                    className="flex items-center gap-0.5 rounded-full border border-amber-500/40 bg-amber-500/20 px-1.5 py-0.5 text-[8px] font-extrabold text-amber-300 transition-all hover:bg-amber-500/30 active:scale-95"
                    title="Clic para volver a ver la información de la plataforma (~40s)"
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    <span>DEMO</span>
                  </button>

                  <button
                    type="button"
                    onClick={onTogglePhoneFrame}
                    className="flex items-center gap-1 rounded-xl border border-zinc-700/60 bg-zinc-800 px-1.5 py-1.5 text-[10px] font-semibold text-zinc-300 transition-all hover:bg-zinc-700 sm:px-2.5 sm:py-1.5 sm:text-xs"
                    title={isPhoneFrame ? 'Ver en formato expandido' : 'Ver simulador en marco de móvil'}
                  >
                    {isPhoneFrame ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                    <span className="hidden md:inline">{isPhoneFrame ? 'Expandir' : 'Marco Móvil'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExit}
                    className="flex items-center gap-1 rounded-xl bg-rose-600/90 px-1.5 py-1.5 text-[10px] font-bold text-white shadow-md transition-all hover:bg-rose-500 active:scale-95 sm:px-2.5 sm:py-1.5 sm:text-xs"
                    title="Salir de la demostración"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">Salir</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>
      ) : (
        /* Acceso Flotante Rápido para Computadoras en Simuladores */
        <div className="hidden lg:flex fixed top-4 left-6 z-50 items-center gap-2">
          <button
            type="button"
            onClick={() => onViewChange('admin')}
            className="px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 text-xs font-bold flex items-center gap-1.5 shadow-xl transition-all cursor-pointer backdrop-blur-md active:scale-95"
            title="Volver al Panel Administrativo"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Volver al Panel Admin</span>
          </button>
        </div>
      )}


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

            {/* Temporizador Visual de 40 Segundos */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium">
                <span>Permanencia en pantalla (~40s)</span>
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

      {/* ── Aviso de Fallback al Salir (si el navegador no permite cerrar la pestaña) ── */}
      {exitNotice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border-2 border-rose-500/50 p-6 shadow-2xl text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-extrabold text-white">Saliendo de la demostración...</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Si tu navegador no cierra la pestaña automáticamente, serás redirigido a Telegram. También puedes cerrar esta pestaña manualmente (Ctrl+W / Cmd+W).
            </p>
            <a
              href="https://t.me/"
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Ir a Telegram</span>
            </a>
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

            {/* Anuncio Descriptivo Prominente de Vista Cliente (~9s) */}
            {splashInfo && (
              <div className="absolute top-12 inset-x-2.5 sm:inset-x-3.5 z-40 animate-splash-in pointer-events-auto">
                <div className="w-full rounded-2xl bg-zinc-900/98 backdrop-blur-2xl border-2 border-amber-500/70 p-3.5 sm:p-4 shadow-2xl shadow-black/90 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-400/10 border border-amber-500/40 flex items-center justify-center text-xl shrink-0 shadow-md">
                        {splashInfo.icon}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-0.5">
                          Vista de Suscriptor
                        </span>
                        <h3 className="text-xs sm:text-sm font-extrabold text-white leading-snug">
                          {splashInfo.title}
                        </h3>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSplashInfo(null)}
                      className="p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-800/90 hover:bg-zinc-700 cursor-pointer shrink-0 transition-colors"
                      title="Cerrar aviso"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] sm:text-xs text-zinc-300 leading-relaxed pl-0.5">
                    {splashInfo.subtitle}
                  </p>

                  {/* Barra de progreso de lectura (9 segundos) */}
                  <div className="w-full bg-zinc-800/80 h-1 rounded-full overflow-hidden mt-1">
                    <div className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full animate-shrink-splash" />
                  </div>
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

