import React, { useState, useEffect } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';

interface AgeModalProps {
  isOpen?: boolean;
  onConfirm: () => void;
  modelName: string;
}

export const AgeModal: React.FC<AgeModalProps> = ({ isOpen: controlledIsOpen, onConfirm, modelName }) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [accepted, setAccepted] = useState(true);

  useEffect(() => {
    // Si no es controlado externamente, verificar localStorage
    if (controlledIsOpen === undefined) {
      try {
        const isSubscribed = localStorage.getItem('danii_vip_subscriber_active') || localStorage.getItem('danii_vip_age_verified');
        if (!isSubscribed) {
          setInternalIsOpen(true);
        }
      } catch {}
    }
  }, [controlledIsOpen]);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleAccept = () => {
    try {
      localStorage.setItem('danii_vip_subscriber_active', 'true');
      localStorage.setItem('danii_vip_age_verified', 'true');
    } catch {}
    setInternalIsOpen(false);
    onConfirm();
  };

  const handleReject = () => {
    window.location.href = 'https://www.google.com';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-zinc-950/95 backdrop-blur-xl overflow-y-auto">
      <div className="w-full max-w-sm bg-zinc-900/95 border border-amber-500/40 rounded-2xl p-5 shadow-2xl shadow-amber-500/10 text-zinc-100 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>

        <h2 className="text-lg font-extrabold text-center tracking-tight text-white mb-1 truncate px-2">
          {modelName ? modelName.toUpperCase() : 'CANAL VIP FREE'}
        </h2>
        <p className="text-[11px] uppercase tracking-wider text-amber-400 font-bold text-center mb-4">
          Galería Privada y Confidencial
        </p>

        <label className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl cursor-pointer mb-4 hover:bg-amber-500/15 transition-colors">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="w-5 h-5 rounded border-amber-500/50 bg-zinc-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer shrink-0"
          />
          <span className="text-xs text-amber-200 font-medium select-none">
            Confirmo que soy mayor de 18 años.
          </span>
        </label>

        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            id="btn-accept-age"
            className="flex-1 py-3 px-4 rounded-xl font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 shadow-md shadow-amber-500/20 active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            ENTRAR AL CANAL VIP FREE
          </button>
          <button
            onClick={handleReject}
            id="btn-reject-age"
            className="py-3 px-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-medium text-xs transition-all cursor-pointer"
          >
            Salir
          </button>
        </div>

      </div>
    </div>
  );
};
