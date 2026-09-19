import React, { useEffect, useMemo, useState } from 'react';
import { Profile } from '../types';
import { Send, Eye, ShieldCheck, Link, Images, Video, ChevronLeft, ChevronRight } from 'lucide-react';
import { isVideoUrl } from './ProtectedMedia';
import { EphemeralViewer } from './EphemeralViewer';

interface ProfileCardProps {
  profile: Profile;
  botUsername: string;
  modelName: string;
  modelVipLink: string;
  onSelectProfile: (profile: Profile) => void;
  onRequestAvailability: (profile: Profile) => void;
  onOpenPaymentMethods?: () => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  modelName,
  modelVipLink,
  onSelectProfile,
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
  const [mediaType, setMediaType] = useState<'images' | 'videos'>(images.length > 0 ? 'images' : (videos.length > 0 ? 'videos' : 'images'));
  const [selectedMedia, setSelectedMedia] = useState(allMedia[0]);
  const [imageIndex, setImageIndex] = useState(0);

  const visibleMedia = mediaType === 'images' ? images : videos;
  const isAvailable = profile.status === 'disponible' || profile.status === 'activa';
  const isCurrentEphemeral = Boolean(profile.ephemeral_config?.[selectedMedia]?.enabled);
  const currentDuration = profile.ephemeral_config?.[selectedMedia]?.duration_seconds || 5;

  // Reset to first media when collections change
  useEffect(() => {
    if (images.length > 0) {
      setMediaType('images');
      setSelectedMedia(images[0]);
      setImageIndex(0);
    } else if (videos.length > 0) {
      setMediaType('videos');
      setSelectedMedia(videos[0]);
      setImageIndex(0);
    } else {
      setSelectedMedia(allMedia[0]);
    }
  }, [allMedia, images, videos]);

  // Auto-rotate media (both images and videos) every 4 seconds when not viewing an ephemeral image
  useEffect(() => {
    if (visibleMedia.length > 1 && !isCurrentEphemeral) {
      const interval = setInterval(() => {
        moveMedia(1);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [visibleMedia.length, isCurrentEphemeral, selectedMedia, mediaType]);

  const selectType = (type: 'images' | 'videos') => {
    const collection = type === 'images' ? images : videos;
    if (!collection.length) return;
    setMediaType(type);
    setSelectedMedia(collection[0]);
    if (type === 'images') {
      setImageIndex(0);
    }
  };

  const moveMedia = (direction: -1 | 1) => {
    if (visibleMedia.length < 2) return;
    if (mediaType === 'images') {
      setImageIndex(prev => {
        const next = (prev + direction + images.length) % images.length;
        setSelectedMedia(images[next]);
        return next;
      });
    } else {
      const currentIndex = Math.max(0, visibleMedia.indexOf(selectedMedia));
      const nextIndex = (currentIndex + direction + visibleMedia.length) % visibleMedia.length;
      setSelectedMedia(visibleMedia[nextIndex]);
    }
  };

  return (
    <article
      id={`profile-${profile.id}`}
      className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/90 shadow-2xl shadow-black/30"
    >
      <div className="grid lg:grid-cols-[1.35fr_0.85fr]">
        <div className="bg-zinc-950 p-3 sm:p-4">
          <div className="mb-3 flex items-center gap-2" role="tablist" aria-label="Tipo de contenido">
            <button
              type="button"
              role="tab"
              aria-selected={mediaType === 'images'}
              onClick={() => selectType('images')}
              disabled={!images.length}
              className={`min-h-11 flex-1 rounded-xl px-3 text-xs font-bold transition-colors flex items-center justify-center gap-2 ${mediaType === 'images' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'} disabled:cursor-not-allowed disabled:opacity-35`}
            >
              <Images className="h-4 w-4" /> Imágenes <span className="opacity-70">{images.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mediaType === 'videos'}
              onClick={() => selectType('videos')}
              disabled={!videos.length}
              className={`min-h-11 flex-1 rounded-xl px-3 text-xs font-bold transition-colors flex items-center justify-center gap-2 ${mediaType === 'videos' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'} disabled:cursor-not-allowed disabled:opacity-35`}
            >
              <Video className="h-4 w-4" /> Videos <span className="opacity-70">{videos.length}</span>
            </button>
          </div>

          {/* Compact media preview container (divided vertically in 2, tap to see full designed size) */}
          <div
            onClick={() => onSelectProfile(profile)}
            className="relative block aspect-[16/10] sm:aspect-[16/9] max-h-[260px] sm:max-h-[300px] w-full overflow-hidden rounded-2xl bg-black text-left cursor-pointer group"
            title="Toca para ver en tamaño completo"
          >
            {allMedia.length === 0 ? (
              <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center bg-zinc-950/80 border border-dashed border-zinc-800 rounded-2xl">
                <ShieldCheck className="w-10 h-10 text-amber-400/60 mb-2" />
                <p className="text-xs font-bold text-zinc-300">Contenido Próximamente</p>
                <p className="text-[11px] text-zinc-500 mt-1">El material exclusivo se publicará en breve.</p>
              </div>
            ) : (
              <EphemeralViewer
                src={selectedMedia}
                alt={`Contenido de ${modelName}`}
                modelName={modelName}
                autoPlay={isVideoUrl(selectedMedia)}
                showControls={false}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                isEphemeral={isCurrentEphemeral}
                durationSeconds={currentDuration}
                isSeen={seenEphemeralUrls.has(selectedMedia)}
                onExpired={() => handleMediaExpired(selectedMedia)}
                onRequestVip={() => onRequestAvailability(profile)}
              />
            )}

            {profile.media_stars?.[selectedMedia] && (
              <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/30 uppercase tracking-wide">
                  ⭐ {profile.media_stars[selectedMedia]} Estrellas
                </span>
              </div>
            )}

            <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-zinc-950/80 text-amber-300 border border-amber-500/30 backdrop-blur-md shadow-md">
                <Eye className="w-3.5 h-3.5 text-amber-400" /> Toca para ampliar
              </span>
            </div>
          </div>

          {visibleMedia.length > 1 && (
            <div className="mt-3 flex items-center justify-center gap-3">
              <button type="button" onClick={() => moveMedia(-1)} aria-label="Medio anterior" className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-200 transition-colors hover:border-amber-500/50 hover:text-amber-300">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="min-w-14 text-center text-xs font-semibold text-zinc-400">
                {mediaType === 'images' ? (imageIndex + 1) : (visibleMedia.indexOf(selectedMedia) + 1)} / {visibleMedia.length}
              </span>
              <button type="button" onClick={() => moveMedia(1)} aria-label="Medio siguiente" className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-200 transition-colors hover:border-amber-500/50 hover:text-amber-300">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between p-5 sm:p-6">
          <div>
            <div className="mb-5 flex items-center justify-between gap-3">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${isAvailable ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-800 text-zinc-300'}`}>
                <span className={`h-2 w-2 rounded-full ${isAvailable ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                {isAvailable ? 'Suscripción disponible' : 'Atención privada'}
              </span>
              <ShieldCheck className="h-5 w-5 text-amber-400" aria-label="Contenido protegido" />
            </div>

            {/* Descripción del Perfil configurada en Datos */}
            {profile.description && (
              <p className="my-2 text-xs text-zinc-300 line-clamp-3 leading-relaxed font-normal">
                {profile.description}
              </p>
            )}

            {/* Contenedor de precio ultra-compacto */}
            <div className="my-2.5 flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200/80">Suscripción VIP</span>
              <div className="flex items-baseline gap-1">
                <strong className="text-sm font-black text-amber-400">Bs. {profile.rate_bs}</strong>
                <span className="text-[10px] text-zinc-400">/ mes</span>
              </div>
            </div>

            {modelVipLink && (
              <a
                href={modelVipLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-xs font-semibold text-zinc-200 hover:border-amber-500/40 hover:text-amber-300">
                <Link className="h-3.5 w-3.5" /> Abrir red social
              </a>
            )}
          </div>

          <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
            <button
              type="button"
              onClick={() => onSelectProfile(profile)}
              className="min-h-11 rounded-xl border border-zinc-700 bg-zinc-800/90 hover:bg-zinc-800 px-3.5 text-zinc-200 hover:text-amber-300 hover:border-amber-500/40 flex items-center justify-center gap-1.5 font-bold text-xs transition-colors cursor-pointer"
              aria-label="Ver contenido en tamaño completo"
              title="Ver contenido en tamaño completo"
            >
              <Eye className="h-4 w-4 text-amber-400" />
              <span>Ver</span>
            </button>
            <button
              type="button"
              onClick={() => onRequestAvailability(profile)}
              id={`btn-request-${profile.id}`}
              className="min-h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 text-xs sm:text-sm font-extrabold text-zinc-950 shadow-lg shadow-amber-500/10 hover:from-amber-400 hover:to-amber-500 flex items-center justify-center gap-2 cursor-pointer">
              <Send className="h-4 w-4" /> Adquirir Contenido
            </button>
          </div>

          {onOpenPaymentMethods && (
            <button
              type="button"
              onClick={onOpenPaymentMethods}
              className="mt-2 w-full min-h-11 rounded-xl border border-amber-500/35 bg-gradient-to-r from-amber-500/15 via-zinc-900 to-amber-600/20 hover:from-amber-500/25 hover:to-amber-600/30 px-3 text-xs font-extrabold text-amber-300 hover:text-amber-200 flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <span>💳</span>
              <span>Métodos de Pago</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
