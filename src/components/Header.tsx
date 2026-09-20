import React from 'react';
import { Shield, Send, RefreshCw, Sparkles } from 'lucide-react';

interface HeaderProps {
  botUsername: string;
  modelName: string;
  onRefresh: () => void;
  loading: boolean;
  onOpenAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ botUsername, modelName, onRefresh, loading }) => {
  const safeBot = (botUsername || 'Danii_Catalogo_SCZ_bot').replace(/^@/, '').trim();

  const cleanModelName = (modelName || 'Danii').trim();
  const headerTitle = `Canal Free • ${cleanModelName}`;

  return (
    <header 
      className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/95 text-zinc-100 shadow-xl backdrop-blur-xl transition-all"
      style={{
        paddingTop: 'max(var(--tg-content-safe-area-inset-top, 0px), var(--tg-safe-area-inset-top, 0px), env(safe-area-inset-top, 0px), 44px)'
      }}
    >
      <div className="mx-auto max-w-7xl px-3.5 sm:px-6 lg:px-8">
        <div className="flex h-13 sm:h-14 items-center justify-between gap-2">
          
          {/* Left: Balanced Brand Badge */}
          <div className="flex items-center gap-1.5 shrink-0 min-w-[70px]">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-wide shadow-sm">
              <Sparkles className="h-3 w-3" />
              <span>VIP</span>
            </span>
          </div>

          {/* Center: Titulo Canal Free + Nombre Publico */}
          <div className="flex-1 min-w-0 text-center px-1">
            <h1 className="font-serif text-sm sm:text-base font-extrabold tracking-tight text-white truncate">
              {headerTitle}
            </h1>
            <p className="flex items-center justify-center gap-1 text-[10px] text-zinc-400 leading-none mt-0.5">
              <Shield className="h-2.5 w-2.5 text-amber-400 shrink-0" />
              <span className="truncate">Contenido Exclusivo</span>
            </p>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-1.5 shrink-0 min-w-[70px]">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              title="Actualizar Canal VIP Free"
              aria-label="Actualizar Canal VIP Free"
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <a
              href={`https://t.me/${safeBot}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`Telegram VIP @${safeBot}`}
              className="flex h-8 sm:h-9 items-center gap-1 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/10 transition-colors hover:from-sky-500 hover:to-blue-500 cursor-pointer"
            >
              <Send className="h-3 w-3 shrink-0" />
              <span className="hidden sm:inline">Bot</span>
            </a>
          </div>

        </div>
      </div>
    </header>
  );
};
