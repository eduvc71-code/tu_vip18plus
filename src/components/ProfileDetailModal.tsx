import React, { useState } from 'react';
import { Profile } from '../types';
import { X, Send, ShieldCheck, ChevronLeft, ChevronRight, Lock, Link } from 'lucide-react';
import { ProtectedMedia, isVideoUrl } from './ProtectedMedia';

interface ProfileDetailModalProps {
  profile: Profile | null;
  botUsername: string;
  modelName: string;
  modelVipLink: string;
  onClose: () => void;
  onRequestAvailability: (profile: Profile) => void;
}

export const ProfileDetailModal: React.FC<ProfileDetailModalProps> = ({
  profile,
  botUsername,
  modelName,
  modelVipLink,
  onClose,
  onRequestAvailability
}) => {
  // ✅ Todos los hooks ANTES de cualquier return condicional (regla de hooks de React)
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  if (!profile) return null;

  const media = profile.photos && profile.photos.length > 0
    ? profile.photos
    : ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80'];

  const isAvailable = profile.status === 'disponible';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl text-zinc-100 my-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-zinc-950/80 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          
          {/* Photo Lightbox Section */}
          <div className="relative bg-zinc-950 min-h-[320px] md:min-h-[480px] flex items-center justify-center">
            <ProtectedMedia
              src={media[activePhotoIdx]}
              alt={`Contenido de ${modelName}`}
              modelName={modelName}
              className="w-full h-full object-cover max-h-[500px]"
            />

            {media.length > 1 && (
              <>
                <button
                  onClick={() => setActivePhotoIdx((prev) => (prev - 1 + media.length) % media.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-950/70 text-white hover:bg-zinc-950 transition-colors border border-zinc-700/50"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setActivePhotoIdx((prev) => (prev + 1) % media.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-950/70 text-white hover:bg-zinc-950 transition-colors border border-zinc-700/50"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                {/* Dots indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 py-1.5 px-2.5 rounded-full bg-zinc-950/80 border border-zinc-800">
                  {media.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePhotoIdx(idx)}
                      className={`rounded-full transition-all duration-300 ${
                        activePhotoIdx === idx
                          ? 'bg-amber-400 w-5 h-2'
                          : 'bg-zinc-600 hover:bg-zinc-400 w-2 h-2'
                      }`}
                      aria-label={`${isVideoUrl(item) ? 'Video' : 'Imagen'} ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Profile Data & Description Section */}
          <div className="p-6 flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-500/10 border border-rose-500/30 text-rose-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                  Privado
                </span>

                <span className="text-xs text-amber-300/90 font-semibold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  +18 Contenido
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white tracking-tight font-serif mb-1">
                {modelName}
              </h2>

              {/* Location/Tag */}
              <p className="text-xs text-amber-400/90 flex items-center gap-1.5 mb-4 font-medium">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                Contenido Digital Exclusivo
              </p>

              {/* Attributes Cards */}
              <div className="grid grid-cols-1 gap-3 p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 mb-5 text-xs text-center">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider block">PRECIO SUSCRIPCIÓN VIP</span>
                  <span className="text-base font-bold text-amber-400">Bs. {profile.rate_bs} / mes</span>
                </div>
              </div>

              {modelVipLink && (
                <a
                  href={modelVipLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-5 inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20"
                >
                  <Link className="w-3.5 h-3.5" />
                  Abrir {(() => { try { return new URL(modelVipLink).hostname.replace(/^www\./, ''); } catch { return 'red social'; } })()}
                </a>
              )}

              {/* Bio Description */}
              <div className="mb-6">
                <h3 className="text-xs uppercase font-semibold text-zinc-400 tracking-wider mb-2">
                  Descripción Pública:
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50 whitespace-pre-line">
                  {profile.description}
                </p>
              </div>

              {/* Discretion Note */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-200/90 mb-6 flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Acceso Premium:</strong> El material es 100% digital y privado. La suscripción se gestiona directamente a través de nuestro Bot Oficial.
                </p>
              </div>
            </div>

            {/* Bottom Primary Button */}
            <div className="pt-2">
              <button
                onClick={() => {
                  onClose();
                  onRequestAvailability(profile);
                }}
                id={`btn-detail-request-${profile.id}`}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold text-sm tracking-wide transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Desbloquear Contenido de {modelName}
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
