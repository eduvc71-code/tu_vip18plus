import React from 'react';
import { Lock, Send, ShieldAlert } from 'lucide-react';

interface TelegramGateProps {
  botUsername: string;
  onContinue?: () => void;
}

export const TelegramGate: React.FC<TelegramGateProps> = ({ botUsername, onContinue }) => {
  const cleanUsername = (botUsername || 'Danii_Catalogo_SCZ_bot').replace(/^@/, '').trim();
  const botUrl = `https://t.me/${cleanUsername}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/98 p-4 backdrop-blur-2xl">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-amber-500/30 bg-zinc-900 p-6 text-center shadow-2xl shadow-amber-500/10 sm:p-8">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
          <Lock className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <span className="inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-400">Contenido Exclusivo</span>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-white">Canal VIP Free</h2>
          <p className="mx-auto max-w-xs text-xs leading-relaxed text-zinc-400">Esta Mini App se abre desde Telegram o enlace autorizado.</p>
        </div>

        <div className="space-y-3 pt-2">
          {onContinue && (
            <button
              onClick={onContinue}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 px-4 text-xs font-extrabold uppercase tracking-wider text-zinc-950 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <span>Continuar al Canal VIP Free</span>
            </button>
          )}

          <a
            href={botUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800 px-4 text-xs font-bold text-zinc-300 transition-colors"
          >
            <Send className="h-4 w-4 text-sky-400" />
            Abrir en Telegram VIP (@{cleanUsername})
          </a>
        </div>
      </div>
    </div>
  );
};
