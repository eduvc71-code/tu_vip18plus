import React from 'react';
import { Shield, Send, RefreshCw } from 'lucide-react';

interface HeaderProps {
  botUsername: string;
  modelName: string;
  onRefresh: () => void;
  loading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ botUsername, modelName, onRefresh, loading }) => {
  const safeBot = (botUsername || 'Danii_Catalogo_SCZ_bot').replace(/^@/, '').trim();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/95 text-zinc-100 shadow-xl backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-3.5 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
            <div className="min-w-0">
              <h1 className="font-serif text-base sm:text-lg font-bold tracking-tight text-white truncate max-w-[200px] sm:max-w-md">
                {modelName}
              </h1>
              <p className="flex items-center gap-1 text-[10px] text-zinc-400 leading-none mt-0.5">
                <Shield className="h-3 w-3 shrink-0 text-amber-400" />
                <span>Contenido Exclusivo</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
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
              className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-3 text-xs font-bold text-white shadow-md shadow-blue-500/10 transition-colors hover:from-sky-500 hover:to-blue-500 cursor-pointer"
            >
              <Send className="h-3 w-3 shrink-0" />
              <span className="hidden sm:inline">Telegram VIP</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
