import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, ArrowRight, Volume2, VolumeX } from 'lucide-react';
import { isVideoUrl } from './ProtectedMedia';

interface SplashScreenProps {
  mediaUrl?: string;
  mediaType?: string;
  modelName: string;
  splashDescription?: string;
  onFinish: () => void;
  isPreview?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  mediaUrl,
  mediaType,
  modelName,
  splashDescription,
  onFinish,
  isPreview = false
}) => {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const isVideo = Boolean(
    mediaType === 'video' ||
    (mediaUrl && isVideoUrl(mediaUrl))
  );

  const cleanDescription = (splashDescription || '').trim() ||
    'Bienvenido a mi espacio exclusivo y confidencial. Disfruta de material único y de alta calidad (+18).';

  const cleanTitle = (modelName || '').trim() || 'TÚ • ESPACIO VIP';

  // Barra de progreso automática de 2.8 segundos (solo si no es preview de admin permanente)
  useEffect(() => {
    if (isPreview) return;

    const duration = 12800;
    const intervalTime = 40;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          triggerFinish();
          return 100;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPreview]);

  const triggerFinish = () => {
    if (isPreview) {
      onFinish();
      return;
    }
    setIsFadingOut(true);
    setTimeout(() => {
      onFinish();
    }, 400);
  };

  return (
    <div
      onClick={triggerFinish}
      className={`fixed inset-0 z-50 flex flex-col justify-between p-4 sm:p-6 bg-zinc-950 text-zinc-100 overflow-hidden select-none cursor-pointer transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0 scale-98 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Fondo Multimedia (Video o Foto) con escala elegante */}
      {mediaUrl ? (
        <div className="absolute inset-0 z-0 overflow-hidden">
          {isVideo ? (
            <video
              key={mediaUrl}
              src={mediaUrl}
              autoPlay
              muted={isMuted}
              loop
              playsInline
              className="h-full w-full object-cover scale-105 filter brightness-75"
            />
          ) : (
            <img
              src={mediaUrl}
              alt="Splash Preview"
              className="h-full w-full object-cover scale-105 filter brightness-75"
            />
          )}
        </div>
      ) : (
        /* Fondo de Respaldo Sofisticado si aún no se ha subido archivo */
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-amber-950/40 via-zinc-950 to-black">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl" />
        </div>
      )}

      {/* Viñeta Oscura y Dorada para máxima legibilidad de textos */}
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-zinc-950/40 pointer-events-none" />

      {/* Cabecera Superior del Splash */}
      <header className="relative z-10 flex items-center justify-between w-full pt-safe">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950/80 border border-amber-500/30 text-amber-300 text-[11px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Contenido Exclusivo</span>
        </div>

        <div className="flex items-center gap-2">
          {isVideo && mediaUrl && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted(prev => !prev);
              }}
              className="p-2 rounded-full bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 text-amber-300 backdrop-blur-md cursor-pointer active:scale-95"
              title={isMuted ? 'Activar sonido' : 'Silenciar'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerFinish();
            }}
            className="px-3 py-1 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 text-xs font-bold border border-zinc-700/60 backdrop-blur-md cursor-pointer active:scale-95 transition-all"
          >
            {isPreview ? 'Cerrar Vista Previa' : 'Saltar ➔'}
          </button>
        </div>
      </header>

      {/* Cuerpo Central / Inferior del Splash */}
      <div className="relative z-10 max-w-md mx-auto w-full space-y-4 pb-4">
        
        {/* Distintivo de Marca */}
        <div className="space-y-2 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-2xl shadow-amber-500/20 backdrop-blur-md">
            <Sparkles className="w-7 h-7 animate-pulse text-amber-400" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-xl font-serif">
            {cleanTitle}
          </h1>

          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-3 py-0.5 rounded-full border border-amber-500/20">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Canal VIP Oficial (+18)</span>
          </div>
        </div>

        {/* Descripción Editable configurada desde el Panel */}
        <div className="p-4 rounded-2xl bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 text-center shadow-xl">
          <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-line font-medium">
            {cleanDescription}
          </p>
        </div>

        {/* Barra de Progreso y Botón de Entrada */}
        <div className="space-y-2 pt-1">
          {!isPreview && (
            <div className="w-full bg-zinc-900/80 rounded-full h-1.5 overflow-hidden border border-zinc-800">
              <div
                className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 h-full transition-all duration-75 ease-linear rounded-full shadow-sm shadow-amber-400/50"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerFinish();
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-zinc-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
          >
            <span>{isPreview ? 'Entendido (Cerrar)' : 'Entrar al Catálogo'}</span>
            <ArrowRight className="w-4 h-4 text-zinc-950" />
          </button>

          {!isPreview && (
            <p className="text-[10px] text-zinc-500 text-center">
              Toca la pantalla o el botón para ingresar de inmediato
            </p>
          )}
        </div>

      </div>

    </div>
  );
};

