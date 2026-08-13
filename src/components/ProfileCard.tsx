import React, { useState } from 'react';
import { Profile } from '../types';
import { Send, Eye, ShieldCheck, ChevronLeft, ChevronRight, Link } from 'lucide-react';
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
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  const media = profile.photos && profile.photos.length > 0
    ? profile.photos
    : ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80'];

  const currentMedia = media[activePhotoIdx];

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePhotoIdx((prev) => (prev + 1) % media.length);
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePhotoIdx((prev) => (prev - 1 + media.length) % media.length);
  };

  const isAvailable = profile.status === 'disponible' || profile.status === 'activa';

  return (
    <div
      id={`profile-${profile.id}`}
      className="group bg-zinc-900/90 border border-zinc-800/90 hover:border-amber-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col"
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] w-full bg-zinc-950 overflow-hidden cursor-pointer" onClick={() => onSelectProfile(profile)}>
        <ProtectedMedia
          src={currentMedia}
          alt={`Contenido de ${modelName}`}
          modelName={modelName}
          autoPlay={isVideoUrl(currentMedia)}
          showControls={false}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {/* Gradient Overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-2">
          {/* Status Pill */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-md ${isAvailable
                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                : 'bg-rose-500/20 border border-rose-500/50 text-rose-300'
              }`}
          >
            <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-400 animate-pulse-status' : 'bg-rose-400'}`} />
            {isAvailable ? 'VIP ACTIVA (+18)' : 'EN PRIVADO'}
          </span>

          {/* Privacy badge */}
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-950/80 border border-zinc-700/80 text-amber-300 backdrop-blur-md flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Contenido VIP</span>
          </span>
        </div>

        {/* Multiple Photo Navigation */}
        {media.length > 1 && (
          <>
            {/* ✅ Botones SIEMPRE visibles en mobile, solo en hover en desktop */}
            <button
              onClick={handlePrevPhoto}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-zinc-950/80 text-white hover:bg-zinc-900 flex items-center justify-center transition-all border border-zinc-800/80 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="Contenido anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextPhoto}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-zinc-950/80 text-white hover:bg-zinc-900 flex items-center justify-center transition-all border border-zinc-800/80 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="Siguiente contenido"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* ✅ Dots indicador en lugar de contador numérico */}
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 py-1 px-2 rounded-full bg-zinc-950/80 border border-zinc-800/60">
              {media.map((item, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setActivePhotoIdx(idx); }}
                  className={`rounded-full transition-all duration-300 ${activePhotoIdx === idx
                      ? 'bg-amber-400 w-4 h-1.5'
                      : 'bg-zinc-600 w-1.5 h-1.5'
                    }`}
                  aria-label={`${isVideoUrl(item) ? 'Video' : 'Imagen'} ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Bottom Profile Title */}
        <div className="absolute bottom-3 left-3 right-3 z-10 text-white">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center justify-between font-serif">
            <span>{modelName}</span>
            <span className="text-xs font-sans text-amber-300/80 font-normal">Contenido +18 VIP</span>
          </h2>
        </div>
      </div>

      {/* Card Content & Details */}
      <div className="p-4 flex-1 flex flex-col justify-between bg-zinc-900/90">

        {/* Description Excerpt */}
        <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed mb-3 font-normal">
          {profile.description}
        </p>

        {/* Financial Info (Tariff & Commission) */}
        <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 mb-4 text-xs text-center">
          <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">PRECIO SUSCRIPCIÓN VIP</span>
          <span className="text-sm font-extrabold text-amber-400">Bs. {profile.rate_bs} / mes</span>
        </div>

        {modelVipLink && (
          <a
            href={modelVipLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20"
          >
            <Link className="w-3.5 h-3.5" />
            Abrir {(() => { try { return new URL(modelVipLink).hostname.replace(/^www\./, ''); } catch { return 'red social'; } })()}
          </a>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectProfile(profile)}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer border border-zinc-700/50"
            title="Ver ficha completa"
            aria-label="Ver ficha completa"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={() => onRequestAvailability(profile)}
            id={`btn-request-${profile.id}`}
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-extrabold text-xs tracking-wide transition-all shadow-md shadow-amber-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Desbloquear Contenido
          </button>
        </div>

      </div>
    </div>
  );
};
