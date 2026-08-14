import React, { useEffect, useMemo, useState } from 'react';
import { Profile } from '../types';
import { Send, Eye, ShieldCheck, Link, Images, Video, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProtectedMedia, isVideoUrl } from './ProtectedMedia';

interface ProfileCardProps {
  profile: Profile;
  botUsername: string;
  modelName: string;
  modelVipLink: string;
  onSelectProfile: (profile: Profile) => void;
  onRequestAvailability: (profile: Profile) => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  modelName,
  modelVipLink,
  onSelectProfile,
  onRequestAvailability
}) => {
  const allMedia = useMemo(() => profile.photos?.length
    ? profile.photos
    : ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80'], [profile.photos]);
  const images = useMemo(() => allMedia.filter(item => !isVideoUrl(item)), [allMedia]);
  const videos = useMemo(() => allMedia.filter(isVideoUrl), [allMedia]);
  const [mediaType, setMediaType] = useState<'images' | 'videos'>(isVideoUrl(allMedia[0]) ? 'videos' : 'images');
  const [selectedMedia, setSelectedMedia] = useState(allMedia[0]);

  const visibleMedia = mediaType === 'images' ? images : videos;
  const isAvailable = profile.status === 'disponible' || profile.status === 'activa';

  useEffect(() => {
    const nextType = isVideoUrl(allMedia[0]) ? 'videos' : 'images';
    setMediaType(nextType);
    setSelectedMedia((nextType === 'images' ? images : videos)[0] || allMedia[0]);
  }, [allMedia, images, videos]);

  const selectType = (type: 'images' | 'videos') => {
    const collection = type === 'images' ? images : videos;
    if (!collection.length) return;
    setMediaType(type);
    setSelectedMedia(collection[0]);
  };

  const moveMedia = (direction: -1 | 1) => {
    if (visibleMedia.length < 2) return;
    const currentIndex = Math.max(0, visibleMedia.indexOf(selectedMedia));
    const nextIndex = (currentIndex + direction + visibleMedia.length) % visibleMedia.length;
    setSelectedMedia(visibleMedia[nextIndex]);
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

          <button
            type="button"
            onClick={() => onSelectProfile(profile)}
            className="relative block aspect-[4/5] w-full overflow-hidden rounded-2xl bg-black text-left sm:aspect-[16/11]"
            aria-label="Abrir contenido en vista completa"
          >
            <ProtectedMedia
              src={selectedMedia}
              alt={`Contenido de ${modelName}`}
              modelName={modelName}
              autoPlay={isVideoUrl(selectedMedia)}
              showControls={false}
              className="h-full w-full object-cover"
            />
          </button>

          {visibleMedia.length > 1 && (
            <div className="mt-3 flex items-center justify-center gap-3">
              <button type="button" onClick={() => moveMedia(-1)} aria-label="Medio anterior" className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-200 transition-colors hover:border-amber-500/50 hover:text-amber-300">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="min-w-14 text-center text-xs font-semibold text-zinc-400">
                {visibleMedia.indexOf(selectedMedia) + 1} / {visibleMedia.length}
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

            <p className="text-sm leading-6 text-zinc-300">{profile.description}</p>

            <div className="my-6 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200/70">Precio suscripción VIP</span>
              <div className="mt-1 flex items-end gap-2">
                <strong className="text-3xl font-black text-amber-400">Bs. {profile.rate_bs}</strong>
                <span className="pb-1 text-xs text-zinc-400">/ mes</span>
              </div>
            </div>

            {modelVipLink && (
              <a
                href={modelVipLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-xs font-semibold text-zinc-200 hover:border-amber-500/40 hover:text-amber-300"
              >
                <Link className="h-4 w-4" /> Abrir red social
              </a>
            )}
          </div>

          <div className="mt-6 grid grid-cols-[auto_1fr] gap-2">
            <button
              type="button"
              onClick={() => onSelectProfile(profile)}
              className="min-h-12 rounded-xl border border-zinc-700 bg-zinc-800 px-4 text-zinc-200 hover:bg-zinc-700"
              aria-label="Ver contenido completo"
            >
              <Eye className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => onRequestAvailability(profile)}
              id={`btn-request-${profile.id}`}
              className="min-h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 text-sm font-extrabold text-zinc-950 shadow-lg shadow-amber-500/10 hover:from-amber-400 hover:to-amber-500 flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" /> Adquirir Contenido
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
