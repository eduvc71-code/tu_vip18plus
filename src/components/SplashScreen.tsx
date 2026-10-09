import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Volume2, VolumeX } from 'lucide-react';
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
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showPrivacyButton, setShowPrivacyButton] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true); // Nuevo estado para el mensaje

  const isVideo = Boolean(
    mediaType === 'video' ||
    (mediaUrl && isVideoUrl(mediaUrl))
  );

  const cleanDescription = (splashDescription || '').trim() || 'Bienvenido!!! Disfruta de mi Canal VIP FREE.';

  // Efecto para ocultar el mensaje de bienvenida después de 5 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Barra de progreso automática (solo si no es preview de admin permanente)
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

  // Mostrar botón de Políticas sólo a usuarios nuevos (localStorage flag)
  useEffect(() => {
    try {
      const seen = localStorage.getItem('danii_vip_privacy_seen');
      setShowPrivacyButton(!seen && !isPreview);
    } catch {}
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
    <>
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
          <div className="absolute inset-0 z-0 bg-linear-to-br from-amber-950/40 via-zinc-950 to-black">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl" />
          </div>
        )}

        {/* Viñeta Oscura y Dorada para máxima legibilidad de textos */}
        <div className="absolute inset-0 z-0 bg-linear-to-t from-zinc-950 via-zinc-950/60 to-zinc-950/40 pointer-events-none" />

        {/* Cabecera Superior del Splash */}
        <header className="relative z-10 flex items-center justify-between w-full pt-safe">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950/80 border border-amber-500/30 text-amber-300 text-[11px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-lg">
            <span>Canal VIP FREE Oficial (+18)</span>
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
          
          {/* Descripción Editable (Se desvanece después de 5 segundos) */}
          <div 
            className={`p-4 rounded-2xl bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 text-center shadow-xl transition-all duration-1000 ease-in-out ${
              showWelcome ? 'opacity-100 max-h-40 mb-4' : 'opacity-0 max-h-0 py-0 border-transparent mb-0 overflow-hidden'
            }`}
          >
            <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-line font-medium">
              {cleanDescription}
            </p>
          </div>

          {/* Barra de Progreso y Botón de Entrada */}
          <div className="space-y-2 pt-1">
            {!isPreview && (
              <div className="w-full bg-zinc-900/80 rounded-full h-1.5 overflow-hidden border border-zinc-800">
                <div
                  className="bg-linear-to-r from-amber-500 via-amber-400 to-amber-600 h-full transition-all duration-75 ease-linear rounded-full shadow-sm shadow-amber-400/50"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Botón Políticas de Privacidad visible sólo a nuevos clientes */}
            {showPrivacyButton && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowPrivacyModal(true); }}
                  className="text-[11px] underline text-zinc-200 hover:text-amber-300"
                >
                  Políticas de Privacidad
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerFinish();
              }}
              className="w-full py-3.5 px-6 rounded-2xl bg-linear-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-zinc-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
            >
              <span>{isPreview ? 'Entendido (Cerrar)' : 'Entrar al Espacio Exclusivo'}</span>
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

      {/* Modal simple de Políticas (abre contenido oficial de Telegram o muestra texto breve) */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70" onClick={() => setShowPrivacyModal(false)}>
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-zinc-100 text-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">Políticas de Privacidad</h3>
            <p className="text-xs text-zinc-300 mb-3 leading-relaxed">
              Esta Mini App respeta la política de privacidad de Telegram aplicada a canales y bots. Puedes revisar la política oficial en el enlace siguiente.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <a
                href="https://telegram.org/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold px-3 py-2 rounded-xl bg-amber-500 text-zinc-950"
              >Abrir Política Oficial</a>
              <button
                type="button"
                onClick={() => {
                  try { localStorage.setItem('danii_vip_privacy_seen', '1'); } catch {}
                  setShowPrivacyModal(false);
                  setShowPrivacyButton(false);
                }}
                className="text-xs px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200"
              >He leído</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};