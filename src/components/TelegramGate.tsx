import React from 'react';
import { Lock, Send, ShieldAlert } from 'lucide-react';

interface TelegramGateProps {
  botUsername: string;
}

export const TelegramGate: React.FC<TelegramGateProps> = ({ botUsername }) => {
  const cleanUsername = (botUsername || 'vip_ruti_bot').replace(/^@/, '').trim();
  const botUrl = `https://t.me/${cleanUsername}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/98 p-4 backdrop-blur-2xl">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-amber-500/30 bg-zinc-900 p-6 text-center shadow-2xl shadow-amber-500/10 sm:p-8">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
          <Lock className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <span className="inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-400">Contenido Exclusivo +18</span>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-white">Tú • Acceso VIP</h2>
          <p className="mx-auto max-w-xs text-xs leading-relaxed text-zinc-400">Esta Mini App se abre exclusivamente desde el bot oficial de Telegram.</p>
        </div>

        <div className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 text-left text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
            <span>ACCESO MEDIANTE TELEGRAM</span>
          </div>
          <p className="text-[11px] leading-normal text-zinc-400">Abre el bot y utiliza el botón “Ver Catálogo VIP”. Los enlaces de invitación también dirigen primero al bot.</p>
        </div>

        <a
          href={botUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-4 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg shadow-sky-600/20 transition-colors hover:from-sky-500 hover:to-blue-500"
        >
          <Send className="h-4 w-4" />
          Abrir bot oficial (@{cleanUsername})
        </a>
      </div>
    </div>
  );
};
