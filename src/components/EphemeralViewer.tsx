import React, { useState, useEffect, useRef } from 'react';
import { ProtectedMedia, isVideoUrl } from './ProtectedMedia';
import { Flame, Clock, Lock, Send, Eye, Sparkles } from 'lucide-react';

interface EphemeralViewerProps {
  src: string;
  alt: string;
  modelName: string;
  className?: string;
  isEphemeral: boolean;
  durationSeconds?: number;
  isSeen?: boolean;
  onExpired?: () => void;
  onRequestVip?: () => void;
  autoPlay?: boolean;
  showControls?: boolean;
}

export const EphemeralViewer: React.FC<EphemeralViewerProps> = ({
  src,
  alt,
  modelName,
  className = '',
  isEphemeral,
  durationSeconds = 5,
  isSeen = false,
  onExpired,
  onRequestVip,
  autoPlay = false,
  showControls = true,
}) => {
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isExpiring, setIsExpiring] = useState(false);
  const [hasExpired, setHasExpired] = useState(isSeen);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state if src or duration changes
  useEffect(() => {
    setTimeLeft(durationSeconds);
    setRevealed(false);
    setIsExpiring(false);
    setHasExpired(Boolean(isSeen));
  }, [src, durationSeconds, isSeen]);

  // Handle countdown when revealed
  useEffect(() => {
    if (!revealed || hasExpired || !isEphemeral) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setIsExpiring(true);
          // Allow burn/fade-out animation before marking expired
          setTimeout(() => {
            setHasExpired(true);
            setIsExpiring(false);
            if (onExpired) onExpired();
          }, 600);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [revealed, hasExpired, isEphemeral, onExpired]);

  // Standard media if not marked ephemeral
  if (!isEphemeral) {
    return (
      <ProtectedMedia
        src={src}
        alt={alt}
        modelName={modelName}
        className={className}
        autoPlay={autoPlay}
        showControls={showControls}
      />
    );
  }

  // If already expired/seen, show discreet expired banner
  if (hasExpired) {
    return (
      <div className="relative w-full h-full min-h-[280px] sm:min-h-[380px] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3 shadow-lg shadow-rose-500/10">
          <Flame className="w-7 h-7 text-rose-500" />
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/10 border border-rose-500/30 text-rose-300 mb-2">
          Contenido Sugestivo Caducado
        </span>
        <h4 className="text-base font-bold text-white mb-1">
          Esta imagen efímera ya expiró
        </h4>
        <p className="text-xs text-zinc-400 max-w-xs mb-5 leading-relaxed">
          El tiempo de visualización exclusiva concluyó y la imagen ha sido retirada de tu galería.
        </p>
        {onRequestVip && (
          <button
            type="button"
            onClick={onRequestVip}
            className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold text-xs tracking-wide shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            Adquirir Acceso VIP Ilimitado
          </button>
        )}
      </div>
    );
  }

  // If ephemeral and NOT yet revealed by client
  if (!revealed) {
    return (
      <div className="relative w-full h-full min-h-[280px] sm:min-h-[380px] bg-zinc-950 flex flex-col items-center justify-center overflow-hidden select-none">
        {/* Blurred backdrop image */}
        <div className="absolute inset-0 filter blur-xl scale-110 opacity-30 pointer-events-none">
          <ProtectedMedia
            src={src}
            alt={alt}
            modelName={modelName}
            className="w-full h-full object-cover"
            autoPlay={false}
            showControls={false}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center p-6 text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 via-rose-500/20 to-zinc-900 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 shadow-xl animate-pulse">
            <Flame className="w-8 h-8 text-amber-400" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/40 text-amber-300 mb-2">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Foto Sugestiva VIP
          </span>

          <h3 className="text-lg font-extrabold text-white mb-1.5 font-serif">
            Visualización Única
          </h3>

          <p className="text-xs text-zinc-300 mb-5 leading-relaxed">
            Esta imagen solo estará visible durante <strong className="text-amber-400 font-bold">{durationSeconds} segundos</strong>. Luego desaparecerá para siempre.
          </p>

          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/25 transition-all transform active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            Toca para Ver ({durationSeconds}s)
          </button>
        </div>
      </div>
    );
  }

  // Active Viewing with Live Countdown and Disappear Animation
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / durationSeconds) * 100));

  return (
    <div
      className={`relative h-full w-full overflow-hidden select-none transition-all duration-700 ${
        isExpiring ? 'opacity-0 scale-95 blur-md brightness-150' : 'opacity-100 scale-100'
      }`}
    >
      <ProtectedMedia
        src={src}
        alt={alt}
        modelName={modelName}
        className={className}
        autoPlay={autoPlay}
        showControls={showControls}
      />

      {/* Floating Countdown Badge */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-950/85 backdrop-blur-md border border-rose-500/50 shadow-2xl text-white">
          <Flame className="w-4 h-4 text-rose-400 animate-bounce" />
          <span className="text-xs font-black tracking-wide text-rose-300">
            {timeLeft}s restantes
          </span>
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-32 h-1.5 bg-zinc-800/80 rounded-full overflow-hidden mt-1 border border-zinc-700/50">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};

