import React, { useState, useEffect } from 'react';
import { DemoView } from '../types';
import { Sliders, Smartphone, Send, MessageSquare, Maximize2, Minimize2, X, Sparkles } from 'lucide-react';

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

  useEffect(() => {
    // Permite al usuario leer por unos segundos y luego desvanece suavemente
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 4500);

    const removeTimer = setTimeout(() => {
      setShowIntro(false);
    }, 5200);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  const handleDismissIntro = () => {
    setIsExiting(true);
    setTimeout(() => setShowIntro(false), 300);
  };

  const handleTriggerIntro = () => {
    setIsExiting(false);
    setShowIntro(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center select-none overflow-x-hidden">
      
      {/* ── Barra Superior Global ── */}
      <header className="w-full bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 px-2.5 py-2 sm:px-6 sm:py-2.5 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        
        {/* Logotipo y Badge Demo */}
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
              title="Clic para ver información de la plataforma"
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>DEMO</span>
            </button>
          </div>
        </div>

        {/* Selector Rápido de Vistas */}
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
            <span className="hidden sm:inline">2. App</span>
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

        {/* Toggle de Marco de Smartphone */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onTogglePhoneFrame}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-zinc-700/60"
            title={isPhoneFrame ? 'Ver en pantalla completa' : 'Ver simulador en marco de móvil'}
          >
            {isPhoneFrame ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isPhoneFrame ? 'Pantalla Completa' : 'Marco Móvil'}</span>
          </button>
        </div>
      </header>

      {/* ── Efecto Zoom Inicial: Mensaje Comercial que desaparece tras unos segundos ── */}
      {showIntro && (
        <div
          onClick={handleDismissIntro}
          className={`fixed top-14 sm:top-16 inset-x-3 sm:inset-x-0 mx-auto max-w-sm sm:max-w-md z-50 flex justify-center pointer-events-auto cursor-pointer transition-all duration-700 ease-out ${
            isExiting
              ? 'opacity-0 scale-90 -translate-y-2 pointer-events-none'
              : 'animate-zoom-bounce-in opacity-100 scale-100 translate-y-0'
          }`}
        >
          <div className="w-full rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-amber-500/50 p-3.5 sm:p-4 shadow-2xl shadow-amber-500/20 text-zinc-100 flex items-start gap-3 relative">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-zinc-950 flex items-center justify-center shrink-0 mt-0.5 shadow-md font-black text-xs">
              VIP
            </div>
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Plataforma 100% Adaptable</span>
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-snug">
                Esta solución se personaliza a la medida de <strong className="text-white">cualquier Creadora o Modelo</strong>: estética, redes y cobro directo con Estrellas o QR.
              </p>
              {/* Línea temporizadora de progreso */}
              <div className="w-full bg-zinc-800 h-1 rounded-full mt-2.5 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full animate-shrink-width" />
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDismissIntro();
              }}
              className="absolute top-2.5 right-2.5 p-1 rounded-full text-zinc-400 hover:text-white bg-zinc-800/80 cursor-pointer"
              title="Cerrar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Contenedor del Simulador Móvil ── */}
      <main className="w-full flex-1 flex items-center justify-center p-2 sm:p-4 lg:p-6 relative overflow-hidden">
        {isPhoneFrame ? (
          /* Marco de Dispositivo Móvil (Visible tanto en celular como en computadora) */
          <div className="relative w-full max-w-[365px] xs:max-w-[385px] sm:max-w-[412px] h-[calc(100dvh-64px)] sm:h-[780px] lg:h-[860px] bg-black rounded-[32px] sm:rounded-[44px] lg:rounded-[48px] border-[5px] sm:border-[8px] lg:border-[10px] border-zinc-800 shadow-2xl shadow-black/80 overflow-hidden flex flex-col">
            
            {/* Notch / Dynamic Island decorativo superior */}
            <div className="flex absolute top-2 inset-x-0 justify-center z-40 pointer-events-none">
              <div className="w-20 sm:w-24 h-3.5 sm:h-4 bg-zinc-900 rounded-full border border-zinc-700/50 shadow-inner" />
            </div>

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
          /* Modo Pantalla Completa sin marco */
          <div className="w-full h-full flex-1 flex flex-col relative overflow-hidden">
            {children}
          </div>
        )}
      </main>

    </div>
  );
};
