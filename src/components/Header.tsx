import React from 'react';
import { Shield, Send, RefreshCw } from 'lucide-react';

interface HeaderProps {
  botUsername: string;
  modelName: string;
  onRefresh: () => void;
  loading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ botUsername, modelName, onRefresh, loading }) => (
  <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/95 text-zinc-100 shadow-2xl backdrop-blur-xl">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex h-20 items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 font-serif text-xl font-black tracking-wider text-zinc-950 shadow-lg shadow-amber-500/20">
            Tú
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-xl font-bold tracking-tight text-white">{modelName}</h1>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-400">VIP</span>
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-400">
              <Shield className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span>Contenido Exclusivo +18</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onRefresh}
            disabled={loading}
            title="Actualizar catálogo"
            aria-label="Actualizar catálogo"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
          <a
            href={`https://t.me/${botUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            title={`Bot Telegram @${botUsername}`}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-3 text-xs font-bold text-white shadow-md shadow-blue-500/10 transition-colors hover:from-sky-500 hover:to-blue-500 sm:px-4"
          >
            <Send className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Bot de Telegram</span>
          </a>
        </div>
      </div>
    </div>
  </header>
);
