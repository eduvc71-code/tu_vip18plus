import React, { useEffect, useMemo, useState } from 'react';
import { Profile } from '../types';
import { Send, ShieldCheck, Link, Images, Video, ChevronLeft, ChevronRight } from 'lucide-react';
import { isVideoUrl } from './ProtectedMedia';
import { EphemeralViewer } from './EphemeralViewer';

interface ProfileCardProps {
  profile: Profile;
  botUsername: string;
  modelName: string;
  modelVipLink: string;
  onSelectProfile: (profile: Profile) => void;
  onSelectMedia?: (profile: Profile, mediaUrl?: string) => void;
  onRequestAvailability: (profile: Profile) => void;
  onOpenPaymentMethods?: () => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  modelName,
  modelVipLink,
  onSelectProfile,
  onSelectMedia,
  onRequestAvailability,
  onOpenPaymentMethods
}) => {
  const [seenEphemeralUrls, setSeenEphemeralUrls] = useState<Set<string>>(() => {
    const seen = new Set<string>();
    if (typeof window !== 'undefined' && profile.ephemeral_config) {
      Object.keys(profile.ephemeral_config).forEach(url => {
        try {
          if (localStorage.getItem(`danii_seen_ephemeral_${btoa(url).replace(/=/g, '')}`)) {
            seen.add(url);
          }
        } catch { /* Ignore storage error */ }
      });
    }
    return seen;
  });

  const handleMediaExpired = (expiredUrl: string) => {
    try {
      localStorage.setItem(`danii_seen_ephemeral_${btoa(expiredUrl).replace(/=/g, '')}`, 'true');
    } catch { /* Ignore storage error */ }
    setSeenEphemeralUrls(prev => {
      const next = new Set(prev);
      next.add(expiredUrl);
      return next;
    });
  };

  const allMedia = useMemo(() => {
    const raw = profile.photos || [];
    return raw.filter(url => !seenEphemeralUrls.has(url));
  }, [profile.photos, seenEphemeralUrls]);

  const images = useMemo(() => allMedia.filter(item => !isVideoUrl(item)), [allMedia]);
  const videos = useMemo(() => allMedia.filter(isVideoUrl), [allMedia]);

  const [imageIndex, setImageIndex] = useState(0);
  const [videoIndex, setVideoIndex] = useState(0);

  const isAvailable = profile.status === 'disponible' || profile.status === 'activa';

  const selectedImage = images[imageIndex] || images[0] || '';
  const selectedVideo = videos[videoIndex] || videos[0] || '';

  const isCurrentImageEphemeral = Boolean(selectedImage && profile.ephemeral_config?.[selectedImage]?.enabled);
  const currentImageDuration = (selectedImage && profile.ephemeral_config?.[selectedImage]?.duration_seconds) || 5;

  // Auto-deslizante de Imágenes cada 4 segundos
  useEffect(() => {
    if (images.length > 1 && !isCurrentImageEphemeral) {
      const interval = setInterval(() => {
        setImageIndex(prev => (prev + 1) % images.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [images.length, isCurrentImageEphemeral]);

  // Auto-deslizante de Videos cada 4 segundos
  useEffect(() => {
    if (videos.length > 1) {
      const interval = setInterval(() => {
        setVideoIndex(prev => (prev + 1) % videos.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [videos.length]);

  const moveImage = (direction: -1 | 1) => {
    if (images.length < 2) return;
    setImageIndex(prev => (prev + direction + images.length) % images.length);
  };

  const moveVideo = (direction: -1 | 1) => {
    if (videos.length < 2) return;
    setVideoIndex(prev => (prev + direction + videos.length) % videos.length);
  };

  return (
    <article
      id={`profile-${profile.id}`}
      className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/90 shadow-2xl shadow-black/30"
    >
      <div className="grid lg:grid-cols-[1.35fr_0.85fr]">
        
        {/* Columna Multimedia: Imágenes ARRIBA y Videos DEBAJO */}
        <div className="bg-zinc-950 p-3 sm:p-4 space-y-4">
          
          {/* 1. SECCIÓN IMÁGENES */}
          <div>
            <div
              onClick={() => onSelectMedia ? onSelectMedia(profile, selectedImage) : onSelectProfile(profile)}
              className="relative block aspect-[16/10] sm:aspect-[16/9] max-h-[250px] w-full overflow-hidden rounded-2xl bg-black text-left cursor-pointer group"
              title="Toca para ampliar"
            >
              {images.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center bg-zinc-950/80 border border-dashed border-zinc-800 rounded-2xl">
                  <ShieldCheck className="w-8 h-8 text-amber-400/60 mb-2" />
                  <p className="text-xs font-bold text-zinc-300">Sin fotos disponibles</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">El material exclusivo se publicará en breve.</p>
                </div>
              ) : (
                <EphemeralViewer
                  src={selectedImage}
                  alt={`Foto de ${modelName}`}
                  modelName={modelName}
                  autoPlay={false}
                  showControls={false}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  isEphemeral={isCurrentImageEphemeral}
                  durationSeconds={currentImageDuration}
                  isSeen={seenEphemeralUrls.has(selectedImage)}
                  onExpired={() => handleMediaExpired(selectedImage)}
                  onRequestVip={() => onRequestAvailability(profile)}
                />
              )}

              {selectedImage && profile.media_stars?.[selectedImage] && (
                <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-500 text-zinc-950 shadow-lg uppercase tracking-wide">
                    ⭐ {profile.media_stars[selectedImage]} Estrellas
                  </span>
                </div>
              )}
            </div>

            {/* Controles e Indicadores al pie de las Fotos */}
            <div className="mt-2.5 flex items-center justify-between px-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Images className="h-3.5 w-3.5 text-amber-400" />
                <span>Fotos</span>
                <span className="text-[10px] text-zinc-500 font-mono">({images.length})</span>
              </span>

              {images.length > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); moveImage(-1); }}
                    aria-label="Foto anterior"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-300 transition-colors hover:border-amber-500/50 hover:text-amber-300 cursor-pointer active:scale-95"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex gap-1">
                    {images.map((_, idx) => (
                      <span
                        key={idx}
                        className={`h-1.5 rounded-full transition-all ${idx === imageIndex ? 'w-3.5 bg-amber-400' : 'w-1.5 bg-zinc-700'}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); moveImage(1); }}
                    aria-label="Foto siguiente"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-300 transition-colors hover:border-amber-500/50 hover:text-amber-300 cursor-pointer active:scale-95"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {images.length > 1 ? (
                <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800">
                  {imageIndex + 1} / {images.length}
                </span>
              ) : (
                <span className="w-8" />
              )}
            </div>
          </div>

          {/* 2. SECCIÓN VIDEOS (DEBAJO DE IMÁGENES CON CONTROLES INFERIORES) */}
          {videos.length > 0 && (
            <div className="pt-3 border-t border-zinc-800/80">
              <div
                onClick={() => onSelectMedia ? onSelectMedia(profile, selectedVideo) : onSelectProfile(profile)}
                className="relative block aspect-[16/9] max-h-[220px] w-full overflow-hidden rounded-2xl bg-black text-left cursor-pointer group"
                title="Toca para ampliar video"
              >
                <video
                  key={selectedVideo}
                  src={selectedVideo}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {selectedVideo && profile.media_stars?.[selectedVideo] && (
                  <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-500 text-zinc-950 shadow-lg uppercase tracking-wide">
                      ⭐ {profile.media_stars[selectedVideo]} Estrellas
                    </span>
                  </div>
                )}
              </div>

              {/* Controles e Indicadores al pie de los Videos */}
              <div className="mt-2.5 flex items-center justify-between px-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <Video className="h-3.5 w-3.5 text-amber-400" />
                  <span>Videos</span>
                  <span className="text-[10px] text-zinc-500 font-mono">({videos.length})</span>
                </span>

                {videos.length > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); moveVideo(-1); }}
                      aria-label="Video anterior"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-300 transition-colors hover:border-amber-500/50 hover:text-amber-300 cursor-pointer active:scale-95"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex gap-1">
                      {videos.map((_, idx) => (
                        <span
                          key={idx}
                          className={`h-1.5 rounded-full transition-all ${idx === videoIndex ? 'w-3.5 bg-amber-400' : 'w-1.5 bg-zinc-700'}`}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); moveVideo(1); }}
                      aria-label="Video siguiente"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-300 transition-colors hover:border-amber-500/50 hover:text-amber-300 cursor-pointer active:scale-95"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {videos.length > 1 ? (
                  <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800">
                    {videoIndex + 1} / {videos.length}
                  </span>
                ) : (
                  <span className="w-8" />
                )}
              </div>
            </div>
          )}

        </div>

        {/* Columna de Información y Botones de Acción */}
        <div className="flex flex-col justify-between p-4 sm:p-5">
          <div className="space-y-3">
            
            {/* Descripción del Perfil (excluye textos de bienvenida heredados) */}
            {profile.description &&
             !/holis|bienvenida|opciones que te salen abajo/i.test(profile.description) && (
              <p className="text-xs text-zinc-300 leading-relaxed font-normal whitespace-pre-line">
                {profile.description}
              </p>
            )}

            {modelVipLink && (
              <a
                href={modelVipLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs font-semibold text-zinc-300 hover:border-amber-500/40 hover:text-amber-300 transition-colors"
              >
                <Link className="h-3.5 w-3.5" /> Red social oficial
              </a>
            )}

            {/* Botones de Acción Ajustados y Reducidos (Grid de 2 Columnas) */}
            <div className="pt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onRequestAvailability(profile)}
                id={`btn-request-${profile.id}`}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 active:scale-95 transition-all cursor-pointer truncate"
              >
                <Send className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Adquirir Contenido</span>
              </button>

              {onOpenPaymentMethods && (
                <button
                  type="button"
                  onClick={onOpenPaymentMethods}
                  className="py-2.5 px-3 rounded-xl border border-amber-500/35 bg-gradient-to-r from-amber-500/15 via-zinc-900 to-amber-600/20 hover:from-amber-500/25 hover:to-amber-600/30 text-amber-300 hover:text-amber-200 text-xs font-extrabold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer truncate"
                >
                  <span className="shrink-0">💳</span>
                  <span className="truncate">Métodos de Pago</span>
                </button>
              )}
            </div>
          </div>

          {/* Etiqueta SUSCRIPCIÓN DISPONIBLE movida al final de la pantalla/tarjeta */}
          <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${isAvailable ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-300'}`}>
              <span className={`h-2 w-2 rounded-full ${isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
              {isAvailable ? 'Suscripción disponible' : 'Atención privada'}
            </span>
            <ShieldCheck className="h-4 w-4 text-amber-400/80" aria-label="Contenido protegido" />
          </div>

        </div>
      </div>
    </article>
  );
};
