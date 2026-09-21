import React from 'react';
import { DemoView } from '../types';
import { Sliders, Smartphone, Send, MessageSquare, Maximize2, Minimize2 } from 'lucide-react';

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
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center">
      {/* Barra Superior Global de Demostración Comercial */}
      <header className="w-full bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 px-3 py-2 sm:px-6 sm:py-2.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-zinc-950 font-black text-xs flex items-center justify-center shadow-md">
            VIP
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-white leading-tight flex items-center gap-1.5">
              <span>Tú VIP FREE</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                DEMO
              </span>
            </h1>
            <p className="text-[10px] text-amber-300/80 font-medium hidden xs:block">
              Adaptable a cualquier Creadora de Contenido o Modelo
            </p>
          </div>
        </div>

        {/* Selector Rápido de Vistas */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-2xl border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => onViewChange('admin')}
            className={`px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentView === 'admin'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">1. Panel Admin</span>
            <span className="sm:hidden">Admin</span>
          </button>

          <button
            type="button"
            onClick={() => onViewChange('miniapp')}
            className={`px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentView === 'miniapp'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">2. Mini App</span>
            <span className="sm:hidden">App</span>
          </button>

          <button
            type="button"
            onClick={() => onViewChange('channel')}
            className={`px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentView === 'channel'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">3. Canal Telegram</span>
            <span className="sm:hidden">Canal</span>
          </button>

          <button
            type="button"
            onClick={() => onViewChange('bot')}
            className={`px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentView === 'bot'
                ? 'bg-emerald-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">4. Bot Telegram</span>
            <span className="sm:hidden">Bot</span>
          </button>
        </div>

        {/* Toggle de Marco de Teléfono (Laptop / Desktop) */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePhoneFrame}
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-zinc-700/60"
            title={isPhoneFrame ? 'Ver en pantalla completa' : 'Ver en marco de smartphone'}
          >
            {isPhoneFrame ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            <span>{isPhoneFrame ? 'Pantalla Completa' : 'Marco Móvil'}</span>
          </button>
        </div>
      </header>

      {/* Franja Comercial de Adaptabilidad */}
      <div className="w-full bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/15 border-b border-amber-500/20 px-3 py-1.5 text-center">
        <p className="text-[11px] text-amber-200 font-medium flex items-center justify-center gap-1.5">
          <span>✨</span>
          <span><strong>Plataforma 100% Personalizable:</strong> Se adapta y modifica a la medida de cualquier Creadora de Contenido, Modelo o Agencia.</span>
        </p>
      </div>

      {/* Contenedor del Simulador */}
      <main className="w-full flex-1 flex items-center justify-center p-0 lg:p-4 relative">
        {isPhoneFrame ? (
          <div className="relative w-full max-w-[412px] h-[100dvh] lg:h-[860px] bg-black lg:rounded-[48px] lg:border-[10px] lg:border-zinc-800 lg:shadow-2xl overflow-hidden flex flex-col">
            {/* Notch / Dynamic Island decorativo en modo marco */}
            <div className="hidden lg:flex absolute top-2 inset-x-0 justify-center z-40 pointer-events-none">
              <div className="w-24 h-4 bg-zinc-900 rounded-full border border-zinc-700/50" />
            </div>
            <div className="flex-1 w-full h-full overflow-hidden flex flex-col relative">
              {children}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex-1 flex flex-col relative overflow-hidden">
            {children}
          </div>
        )}
      </main>
    </div>
  );
};

