import React, { useState, useMemo, useEffect } from 'react';
import { Profile } from '../types';
import { X, Send, ShieldCheck, ChevronLeft, ChevronRight, Lock, Link, Flame, Sparkles, Heart } from 'lucide-react';
import { isVideoUrl } from './ProtectedMedia';
import { EphemeralViewer } from './EphemeralViewer';

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

  const [reactions, setReactions] = useState(
    profile?.reactions || { likes: 0, hearts: 0, stars: 0, fires: 0 }
  );

  const [userReactions, setUserReactions] = useState<Set<string>>(() => {
    const set = new Set<string>();
    if (typeof window !== 'undefined' && profile?.id) {
      try {
        const stored = localStorage.getItem(`danii_reactions_${profile.id}`);
        if (stored) {
          JSON.parse(stored).forEach((t: string) => set.add(t));
        }
      } catch {}
    }
    return set;
  });

  useEffect(() => {
    if (profile?.reactions) {
      setReactions(profile.reactions);
    }
  }, [profile?.reactions]);

  const handleToggleReaction = async (type: 'heart' | 'star' | 'fire' | 'like') => {
    if (!profile) return;
    const key = type === 'like' ? 'likes' : type === 'heart' ? 'hearts' : type === 'star' ? 'stars' : 'fires';
    const isCurrentlyActive = userReactions.has(type);

    // Optimistic UI update
    setReactions(prev => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) + (isCurrentlyActive ? -1 : 1))
    }));

    const nextUserReactions = new Set(userReactions);
    if (isCurrentlyActive) {
      nextUserReactions.delete(type);
    } else {
      nextUserReactions.add(type);
    }
    setUserReactions(nextUserReactions);
    try {
      localStorage.setItem(`danii_reactions_${profile.id}`, JSON.stringify(Array.from(nextUserReactions)));
    } catch {}

    // API call
    try {
      const clientId = localStorage.getItem('danii_client_id') || `client_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem('danii_client_id', clientId);

      const res = await fetch(`/api/profiles/${profile.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, user_id: clientId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reactions) {
          setReactions(data.reactions);
        }
      }
    } catch (err) {
      console.warn('Could not sync reaction:', err);
    }
  };

  const [seenEphemeralUrls, setSeenEphemeralUrls] = useState<Set<string>>(() => {
    const seen = new Set<string>();
    if (typeof window !== 'undefined' && profile?.ephemeral_config) {
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
    setActivePhotoIdx(0);
  };

  const media = useMemo(() => {
    if (!profile?.photos?.length) return [];
    return profile.photos.filter(url => !seenEphemeralUrls.has(url));
  }, [profile?.photos, seenEphemeralUrls]);

  if (!profile) return null;

  const currentMediaUrl = media[activePhotoIdx] || media[0] || '';
  const currentItemDescription = (currentMediaUrl && profile.media_descriptions?.[currentMediaUrl]) || profile.description;
  const isCurrentEphemeral = Boolean(profile.ephemeral_config?.[currentMediaUrl]?.enabled);
  const currentDuration = profile.ephemeral_config?.[currentMediaUrl]?.duration_seconds || 5;

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
            {media.length === 0 ? (
              <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-zinc-950">
                <ShieldCheck className="w-12 h-12 text-amber-400/60 mb-3" />
                <p className="text-sm font-bold text-zinc-300">Contenido Próximamente</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs">El material exclusivo de esta sesión se publicará en breve.</p>
              </div>
            ) : (
              <EphemeralViewer
                src={currentMediaUrl}
                alt={`Contenido de ${modelName}`}
                modelName={modelName}
                className="w-full h-full object-cover max-h-[500px]"
                isEphemeral={isCurrentEphemeral}
                durationSeconds={currentDuration}
                isSeen={seenEphemeralUrls.has(currentMediaUrl)}
                onExpired={() => handleMediaExpired(currentMediaUrl)}
                onRequestVip={() => {
                  onClose();
                  onRequestAvailability(profile);
                }}
              />
            )}



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

              {/* Sincronización de Reacciones en Tiempo Real (Mini App + Bot Telegram) */}
              <div className="mb-5 p-3.5 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 rounded-2xl border border-zinc-800/90 shadow-md">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-bold text-amber-300/90 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Interacciones VIP en Vivo
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    Sincronizado con Telegram
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleReaction('heart')}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all duration-200 active:scale-95 cursor-pointer ${
                      userReactions.has('heart')
                        ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 shadow-sm shadow-rose-500/20'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-zinc-700 hover:bg-zinc-800/40'
                    }`}
                    title="Enviar Corazón"
                  >
                    <span className="text-xl mb-0.5">❤️</span>
                    <span className="text-xs font-bold font-mono">
                      {reactions.hearts || 0}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleReaction('star')}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all duration-200 active:scale-95 cursor-pointer ${
                      userReactions.has('star')
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-sm shadow-amber-500/20'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-amber-400 hover:border-zinc-700 hover:bg-zinc-800/40'
                    }`}
                    title="Enviar Estrella"
                  >
                    <span className="text-xl mb-0.5">⭐</span>
                    <span className="text-xs font-bold font-mono">
                      {reactions.stars || 0}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleReaction('fire')}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all duration-200 active:scale-95 cursor-pointer ${
                      userReactions.has('fire')
                        ? 'bg-orange-500/20 border-orange-500/60 text-orange-300 shadow-sm shadow-orange-500/20'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-orange-400 hover:border-zinc-700 hover:bg-zinc-800/40'
                    }`}
                    title="Enviar Fuego"
                  >
                    <span className="text-xl mb-0.5">🔥</span>
                    <span className="text-xs font-bold font-mono">
                      {reactions.fires || 0}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleReaction('like')}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all duration-200 active:scale-95 cursor-pointer ${
                      userReactions.has('like')
                        ? 'bg-blue-500/20 border-blue-500/60 text-blue-300 shadow-sm shadow-blue-500/20'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-blue-400 hover:border-zinc-700 hover:bg-zinc-800/40'
                    }`}
                    title="Enviar Me Gusta"
                  >
                    <span className="text-xl mb-0.5">👍</span>
                    <span className="text-xs font-bold font-mono">
                      {reactions.likes || 0}
                    </span>
                  </button>
                </div>
              </div>

              {/* Descripción VIP Organizada (Solo visible al hacer click para ver y reaccionar) */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Detalles del Contenido Exclusivo
                  </h3>
                  <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                    {media.length > 0 ? `Archivo ${activePhotoIdx + 1} de ${media.length}` : '💎 VIP Pack'}
                  </span>
                </div>

                <div className="bg-gradient-to-b from-zinc-950/90 to-zinc-900/60 p-4 rounded-2xl border border-zinc-800/90 shadow-inner">
                  {currentItemDescription ? (
                    <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-line font-normal">
                      {currentItemDescription}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">
                      Sesión fotográfica y videoclips exclusivos para miembros VIP. Desbloquea la experiencia privada completa.
                    </p>
                  )}

                  <div className="mt-3 pt-3 border-t border-zinc-800/60 flex flex-wrap items-center gap-2 text-[10px] text-zinc-400">
                    <span className="bg-zinc-800/80 px-2 py-0.5 rounded-md text-zinc-300">
                      🔒 Contenido 100% Protegido
                    </span>
                    <span className="bg-zinc-800/80 px-2 py-0.5 rounded-md text-zinc-300">
                      ⚡ Acceso Inmediato
                    </span>
                  </div>
                </div>
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
                Adquirir Contenido de {modelName}
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
