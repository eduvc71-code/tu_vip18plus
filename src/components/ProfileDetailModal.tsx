import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Profile } from '../types';
import { ArrowLeft, X, ChevronLeft, ChevronRight, Sparkles, CreditCard, MessageSquareText, Lock, Volume2, VolumeX, AlertTriangle, RefreshCw } from 'lucide-react';
import { isVideoUrl } from './ProtectedMedia';

interface ProfileDetailModalProps {
  profile: Profile | null;
  initialMediaUrl?: string;
  botUsername: string;
  modelName: string;
  modelVipLink: string;
  onClose: () => void;
  onOpenPaymentMethods?: () => void;
  onRequestAvailability?: (profile: Profile) => void;
}

export const ProfileDetailModal: React.FC<ProfileDetailModalProps> = ({
  profile,
  initialMediaUrl,
  botUsername: _botUsername,
  modelName,
  modelVipLink: _modelVipLink,
  onClose,
  onOpenPaymentMethods,
  onRequestAvailability: _onRequestAvailability
}) => {
  const media = useMemo(() => {
    if (!profile?.photos?.length) return [];
    if (initialMediaUrl) {
      const isInitialVideo = isVideoUrl(initialMediaUrl);
      const filtered = profile.photos.filter(url => isInitialVideo ? isVideoUrl(url) : !isVideoUrl(url));
      return filtered.length > 0 ? filtered : profile.photos;
    }
    return profile.photos;
  }, [profile?.photos, initialMediaUrl]);

  const computeInitialIdx = () => {
    if (!initialMediaUrl || !media.length) return 0;
    const directIdx = media.indexOf(initialMediaUrl);
    if (directIdx !== -1) return directIdx;
    const relativeInitial = initialMediaUrl.replace(/^https?:\/\/[^/]+/, '');
    const foundIdx = media.findIndex(m => m.endsWith(relativeInitial) || relativeInitial.endsWith(m.replace(/^https?:\/\/[^/]+/, '')));
    return foundIdx !== -1 ? foundIdx : 0;
  };

  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(computeInitialIdx);
  const [showCaption, setShowCaption] = useState(true);
  const [payingStars, setPayingStars] = useState(false);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [hasMediaError, setHasMediaError] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const captionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Rastrear contenidos desbloqueados con Stars (Siempre al tope para no violar reglas de hooks)
  const [unlockedStarsUrls, setUnlockedStarsUrls] = useState<Set<string>>(() => {
    const unlocked = new Set<string>();
    if (typeof window !== 'undefined' && profile?.media_stars) {
      Object.keys(profile.media_stars).forEach(url => {
        try {
          if (localStorage.getItem(`danii_stars_unlocked_${btoa(url).replace(/=/g, '')}`)) {
            unlocked.add(url);
          }
        } catch {}
      });
    }
    return unlocked;
  });

  // Sincronizar índice inicial si initialMediaUrl cambia
  useEffect(() => {
    setActivePhotoIdx(computeInitialIdx());
  }, [initialMediaUrl, media]);

  // Restablecer estados de carga y error al cambiar de archivo
  useEffect(() => {
    setHasMediaError(false);
    const currentUrl = media[activePhotoIdx] || '';
    if (!currentUrl) {
      setIsLoadingMedia(false);
      return;
    }
    const cleanUrl = currentUrl.replace(/^https?:\/\/[^/]+/, '');
    const isUnlocked = unlockedStarsUrls.has(currentUrl) || Array.from(unlockedStarsUrls).some(u => u.replace(/^https?:\/\/[^/]+/,'') === cleanUrl);
    let stars: number | undefined;
    if (profile?.media_stars) {
      stars = profile.media_stars[currentUrl];
      if (stars === undefined) {
        for (const [k, v] of Object.entries(profile.media_stars)) {
          if (k.replace(/^https?:\/\/[^/]+/,'') === cleanUrl) {
            stars = v;
            break;
          }
        }
      }
    }
    const isLocked = Boolean(stars && stars > 0 && !isUnlocked);
    // Si está bloqueado con Stars, NO activamos spinner de descarga
    setIsLoadingMedia(!isLocked);
  }, [activePhotoIdx, media, profile?.media_stars, unlockedStarsUrls]);

  // Integración con BackButton nativo de Telegram Mini App
  useEffect(() => {
    if (!profile) return;
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.BackButton) {
      try {
        tg.BackButton.show();
        tg.BackButton.onClick(onClose);
      } catch {}
    }
    return () => {
      if (tg?.BackButton) {
        try {
          tg.BackButton.offClick(onClose);
          tg.BackButton.hide();
        } catch {}
      }
    };
  }, [profile, onClose]);

  // Temporizador mágico de 5 segundos para la descripción
  const resetCaptionTimer = () => {
    setShowCaption(true);
    if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
    captionTimerRef.current = setTimeout(() => {
      setShowCaption(false);
    }, 5000);
  };

  useEffect(() => {
    resetCaptionTimer();
    return () => {
      if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
    };
  }, [activePhotoIdx, profile]);

  if (!profile || media.length === 0) return null;

  const currentMediaUrl = media[activePhotoIdx] || media[0] || '';

  // Helper para buscar estrellas coincidiendo rutas relativas y absolutas
  const getStarsForUrl = (url: string): number | undefined => {
    if (!profile?.media_stars || !url) return undefined;
    if (profile.media_stars[url] !== undefined) return profile.media_stars[url];
    const cleanUrl = url.replace(/^https?:\/\/[^/]+/, '');
    for (const [key, val] of Object.entries(profile.media_stars)) {
      const cleanKey = key.replace(/^https?:\/\/[^/]+/, '');
      if (cleanKey === cleanUrl || url.endsWith(cleanKey) || key.endsWith(cleanUrl)) {
        return val;
      }
    }
    return undefined;
  };

  const currentStars = getStarsForUrl(currentMediaUrl);

  const isMediaUnlocked = (url: string): boolean => {
    if (!url) return false;
    if (unlockedStarsUrls.has(url)) return true;
    const cleanUrl = url.replace(/^https?:\/\/[^/]+/, '');
    for (const unlocked of unlockedStarsUrls) {
      const cleanUnlocked = unlocked.replace(/^https?:\/\/[^/]+/, '');
      if (cleanUnlocked === cleanUrl || url.endsWith(cleanUnlocked) || unlocked.endsWith(cleanUrl)) {
        return true;
      }
    }
    return false;
  };

  const getDescriptionForUrl = (url: string): string => {
    if (!profile?.media_descriptions || !url) return profile?.description || '';
    if (profile.media_descriptions[url]) return profile.media_descriptions[url];
    const cleanUrl = url.replace(/^https?:\/\/[^/]+/, '');
    for (const [key, val] of Object.entries(profile.media_descriptions)) {
      const cleanKey = key.replace(/^https?:\/\/[^/]+/, '');
      if (cleanKey === cleanUrl || url.endsWith(cleanKey) || key.endsWith(cleanUrl)) {
        return val;
      }
    }
    return profile?.description || '';
  };

  const rawItemDescription = getDescriptionForUrl(currentMediaUrl);
  const currentItemDescription = /holis|bienvenida|opciones que te salen abajo/i.test(rawItemDescription) ? '' : rawItemDescription.trim();
  const isVideo = isVideoUrl(currentMediaUrl);

  const isCurrentMediaLocked = Boolean(
    currentMediaUrl &&
    currentStars &&
    currentStars > 0 &&
    !isMediaUnlocked(currentMediaUrl)
  );

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActivePhotoIdx((prev) => (prev - 1 + media.length) % media.length);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActivePhotoIdx((prev) => (prev + 1) % media.length);
  };

  const toggleCaption = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showCaption) {
      setShowCaption(false);
      if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
    } else {
      resetCaptionTimer();
    }
  };

  // Pago de contenido con Telegram Stars
  const handlePayWithStars = async () => {
    if (!currentStars || payingStars) return;
    setPayingStars(true);
    try {
      const res = await fetch('/api/telegram/stars-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: profile.id,
          mediaUrl: currentMediaUrl,
          stars: currentStars
        })
      });
      const data = await res.json();
      if (data.ok && data.invoiceLink) {
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.openInvoice) {
          tg.openInvoice(data.invoiceLink, (status: string) => {
            if (status === 'paid') {
              try {
                localStorage.setItem(`danii_stars_unlocked_${btoa(currentMediaUrl).replace(/=/g, '')}`, 'true');
              } catch {}
              setUnlockedStarsUrls(prev => {
                const next = new Set(prev);
                next.add(currentMediaUrl);
                return next;
              });
              window.dispatchEvent(new CustomEvent('stars_media_unlocked', { detail: { url: currentMediaUrl } }));
              alert('🎉 ¡Contenido desbloqueado con éxito con Telegram Stars!');
            }
          });
        } else {
          window.open(data.invoiceLink, '_blank');
        }
      } else {
        alert(data.error || 'No se pudo procesar la factura de estrellas.');
      }
    } catch {
      alert('Error de conexión al procesar Estrellas.');
    } finally {
      setPayingStars(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-zinc-100 select-none overflow-hidden">
      
      {/* Barra Superior Flotante Estilo Telegram (Overlaid, no quita espacio a la foto) */}
      <div 
        className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-3 py-2.5 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-auto"
        style={{
          paddingTop: 'max(var(--tg-content-safe-area-inset-top, 0px), var(--tg-safe-area-inset-top, 0px), env(safe-area-inset-top, 0px), 8px)'
        }}
      >
        {/* Botón Volver */}
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-200 hover:text-white transition-all backdrop-blur-md shadow-md text-xs font-bold cursor-pointer active:scale-95"
          title="Volver a la galería"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
          <span>Volver</span>
        </button>

        {/* Contador Discreto y Stars */}
        <div className="flex items-center gap-1.5">
          {currentStars && currentStars > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 border border-amber-500/40 text-amber-300 backdrop-blur-md shadow-sm">
              ⭐ {currentStars}
            </span>
          )}
          <span className="px-2.5 py-0.5 rounded-full bg-black/60 border border-zinc-800/80 text-[11px] font-mono text-zinc-300 font-semibold backdrop-blur-md">
            {activePhotoIdx + 1} / {media.length}
          </span>
        </div>

        {/* Botón Cerrar (X) */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar visor"
          className="p-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-white transition-colors cursor-pointer active:scale-95 backdrop-blur-md"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Zona Multimedia Inmersiva de Pantalla Completa */}
      <div
        onClick={!isCurrentMediaLocked ? toggleCaption : undefined}
        className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-black cursor-pointer"
      >
        {/* Spinner sutil de carga (sin textos invasivos) */}
        {isLoadingMedia && !hasMediaError && !isCurrentMediaLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 pointer-events-none">
            <div className="w-9 h-9 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
          </div>
        )}

        {/* Fallback de error sutil */}
        {hasMediaError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center z-20">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2 shadow-lg">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <p className="text-xs text-zinc-300 mb-3">No se pudo cargar este archivo</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setHasMediaError(false);
                setIsLoadingMedia(true);
              }}
              className="px-4 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reintentar
            </button>
          </div>
        )}

        {/* CONTENIDO BLOQUEADO CON ESTRELLAS ESTILO TELEGRAM (Preview difuminado + Candado discreto) */}
        {isCurrentMediaLocked ? (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden select-none">
            {/* Foto o Video difuminado como Telegram Paid Media */}
            {isVideo ? (
              <video
                key={currentMediaUrl}
                src={currentMediaUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover filter blur-2xl scale-110 opacity-85 select-none"
              />
            ) : (
              <img
                src={currentMediaUrl}
                alt="Vista previa exclusiva"
                draggable={false}
                className="w-full h-full object-cover filter blur-2xl scale-110 opacity-90 select-none"
              />
            )}
            <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" />

            {/* Insignia Central Estilo Nativo Telegram */}
            <div className="relative z-10 flex flex-col items-center justify-center p-4 text-center">
              <div className="px-4 py-2 rounded-2xl bg-black/65 backdrop-blur-md border border-amber-500/40 text-white shadow-2xl flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="font-bold text-xs sm:text-sm">Desbloquear por</span>
                <span className="inline-flex items-center gap-0.5 font-black text-amber-400 text-xs sm:text-sm">
                  ⭐ {currentStars}
                </span>
              </div>
            </div>
          </div>
        ) : isVideo ? (
          <>
            <video
              key={currentMediaUrl}
              src={currentMediaUrl}
              autoPlay
              muted={isMuted}
              controls
              playsInline
              loop
              onLoadStart={() => { setIsLoadingMedia(true); setHasMediaError(false); }}
              onLoadedData={() => setIsLoadingMedia(false)}
              onCanPlay={() => setIsLoadingMedia(false)}
              onError={() => { setIsLoadingMedia(false); setHasMediaError(true); }}
              className={`w-full h-full max-h-[84vh] sm:max-h-[88vh] object-contain mx-auto transition-opacity duration-300 ${isLoadingMedia ? 'opacity-0' : 'opacity-100'}`}
            />
            {!hasMediaError && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(prev => !prev);
                }}
                className="absolute top-14 left-3 z-30 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 border border-zinc-800 text-xs font-bold text-amber-300 flex items-center gap-1.5 shadow-lg backdrop-blur-md cursor-pointer active:scale-95 transition-all"
                title={isMuted ? 'Activar sonido' : 'Silenciar'}
              >
                {isMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                    <span>Activar Sonido</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sonido Activo</span>
                  </>
                )}
              </button>
            )}
          </>
        ) : (
          <img
            key={currentMediaUrl}
            src={currentMediaUrl}
            alt="Contenido VIP"
            referrerPolicy="no-referrer"
            draggable={false}
            onLoad={() => setIsLoadingMedia(false)}
            onError={() => { setIsLoadingMedia(false); setHasMediaError(true); }}
            className={`w-full h-full max-h-[84vh] sm:max-h-[88vh] object-contain mx-auto transition-opacity duration-300 select-none ${isLoadingMedia ? 'opacity-0' : 'opacity-100'}`}
          />
        )}

        {/* Flechas Laterales */}
        {media.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-zinc-300 hover:text-white border border-zinc-800/80 transition-all opacity-70 hover:opacity-100 active:scale-95 cursor-pointer shadow-lg z-20 backdrop-blur-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Siguiente"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-zinc-300 hover:text-white border border-zinc-800/80 transition-all opacity-70 hover:opacity-100 active:scale-95 cursor-pointer shadow-lg z-20 backdrop-blur-sm"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Descripción Flotante Mágica */}
        {!isCurrentMediaLocked && currentItemDescription && (
          <div
            className={`absolute bottom-20 left-3 right-3 z-20 transition-all duration-700 ease-in-out pointer-events-none ${
              showCaption
                ? 'opacity-100 translate-y-0 filter-none'
                : 'opacity-0 translate-y-3 filter blur-md'
            }`}
          >
            <div className="bg-black/80 backdrop-blur-md border border-zinc-800/80 text-zinc-200 text-xs px-3.5 py-2 rounded-2xl shadow-xl leading-relaxed whitespace-pre-line max-h-20 overflow-y-auto mx-auto max-w-lg">
              <p className="font-medium text-zinc-100">{currentItemDescription}</p>
            </div>
          </div>
        )}
      </div>

      {/* Barra Inferior Flotante: Un Solo Botón Mínimo y Compacto */}
      <div className="absolute bottom-0 inset-x-0 z-30 p-3 pb-5 flex flex-col items-center justify-center bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none">
        <div className="pointer-events-auto flex flex-col items-center gap-2">
          {currentStars && currentStars > 0 ? (
            isCurrentMediaLocked ? (
              /* Botón Único de Desbloqueo con Estrellas */
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePayWithStars();
                }}
                disabled={payingStars}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-zinc-950 font-black text-xs sm:text-sm tracking-wide shadow-xl shadow-amber-500/25 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 transition-all"
              >
                <Sparkles className="w-4 h-4 text-zinc-950" />
                <span>{payingStars ? 'Procesando...' : `Desbloquear (${currentStars} ⭐)`}</span>
              </button>
            ) : (
              <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-[11px] backdrop-blur-md">
                <span>✅ Desbloqueado</span>
              </div>
            )
          ) : (
            /* Botón Único Mínimo de Métodos de Pago */
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                if (onOpenPaymentMethods) {
                  onOpenPaymentMethods();
                }
              }}
              className="px-4 py-2 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-amber-500/40 text-amber-300 font-bold text-xs shadow-lg backdrop-blur-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <CreditCard className="w-3.5 h-3.5 text-amber-400" />
              <span>Métodos de Pago</span>
            </button>
          )}

          {/* Puntos Indicadores Compactos */}
          {media.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              {media.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIdx(idx);
                  }}
                  aria-label={`Archivo ${idx + 1}`}
                  className={`rounded-full transition-all duration-300 cursor-pointer ${
                    activePhotoIdx === idx
                      ? 'bg-amber-400 w-4 h-1 shadow-sm shadow-amber-400/50'
                      : 'bg-zinc-600 hover:bg-zinc-400 w-1 h-1'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
