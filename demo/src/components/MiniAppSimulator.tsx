import React, { useState, useEffect, useRef } from 'react';
import { CreatorProfile, MediaItem, PaymentMethod, DemoView } from '../types';
import { unlockMediaId, getUnlockedMediaIds } from '../utils/storage';
import {
  ArrowLeft,
  Sliders,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CreditCard,
  Lock,
  Volume2,
  VolumeX,
  Video,
  Globe,
  CheckCircle2,
  Share2
} from 'lucide-react';

interface MiniAppSimulatorProps {
  profile: CreatorProfile;
  onNavigateToView: (view: DemoView) => void;
}

export const MiniAppSimulator: React.FC<MiniAppSimulatorProps> = ({ profile, onNavigateToView }) => {

  const [photoIndex, setPhotoIndex] = useState(0);
  const [videoIndex, setVideoIndex] = useState(0);
  const [modalMedia, setModalMedia] = useState<MediaItem | null>(null);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(() => getUnlockedMediaIds());

  const photos = profile.media.filter(m => m.type === 'photo');
  const videos = profile.media.filter(m => m.type === 'video');

  // Auto-deslizamiento de Fotos cada 4 segundos (Foto 1 -> Foto N -> Foto 1)
  useEffect(() => {
    if (photos.length <= 1) return;
    const interval = setInterval(() => {
      setPhotoIndex(prev => (prev + 1) % photos.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [photos.length]);

  // Auto-deslizamiento de Videos cada 4 segundos (Video 1 -> Video M -> Video 1)
  useEffect(() => {
    if (videos.length <= 1) return;
    const interval = setInterval(() => {
      setVideoIndex(prev => (prev + 1) % videos.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [videos.length]);

  const currentPhoto = photos[photoIndex] || photos[0];
  const currentVideo = videos[videoIndex] || videos[0];

  const isPhotoLocked = currentPhoto && currentPhoto.isStarsLocked && !unlockedIds.has(currentPhoto.id);
  const isVideoLocked = currentVideo && currentVideo.isStarsLocked && !unlockedIds.has(currentVideo.id);

  const handleUnlockStars = (mediaId: string) => {
    unlockMediaId(mediaId);
    setUnlockedIds(prev => new Set(prev).add(mediaId));
    alert('🎉 ¡Pago de Telegram Stars simulado con éxito! El contenido ha sido desbloqueado.');
  };

  return (
    <div className="relative w-full h-full bg-black text-zinc-100 flex flex-col overflow-y-auto no-scrollbar select-none">
      
      {/* ── Cabecera Nativa de Telegram Mini App (Idéntica a Bot y Canal con retorno a Admin) ── */}
      <div className="bg-[#17212b] px-3 py-2.5 flex items-center justify-between border-b border-[#0f1821] shadow-md shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => onNavigateToView('admin')}
            className="p-1 -ml-1 rounded-full text-zinc-300 hover:text-white cursor-pointer active:scale-95 transition-all flex items-center gap-1"
            title="Volver al Panel Admin"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-300" />
          </button>

          <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 border border-amber-400/40 shrink-0">
            <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
              <span>{profile.name}</span>
              <span className="text-amber-400 text-xs">👑 VIP</span>
            </h2>
            <p className="text-[10px] text-[#70a5d6] truncate">
              Mini App de Telegram
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-zinc-400">
          <button
            type="button"
            onClick={() => onNavigateToView('admin')}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border border-amber-500/40 active:scale-95 shadow-sm"
            title="Volver al Panel Admin"
          >
            <Sliders className="w-3 h-3 text-amber-400" />
            <span>Admin</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateToView('admin')}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Cerrar y volver al Admin"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Perfil de la Creadora ── */}
      <div className="relative w-full border-b border-zinc-800 bg-zinc-950 px-3.5 py-3 sm:px-5 sm:py-4">

        <div className="flex items-start gap-3">
          {/* Avatar con borde dorado */}
          <div className="relative shrink-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-lg shadow-amber-500/10">
              <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-zinc-950 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            </span>
          </div>

          {/* Información Principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight truncate">
                {profile.name}
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                VIP +18
              </span>
            </div>
            <p className="text-xs text-amber-400/90 font-medium">@{profile.username}</p>
            <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed line-clamp-2">
              {profile.bio}
            </p>
          </div>
        </div>

        {/* Enlaces a Plataformas (OnlyFans, Fanvue, Instagram) */}
        {profile.links.some(l => l.is_active && l.url) && (
          <div className="mt-3 flex flex-wrap gap-1.5 pt-2.5 border-t border-zinc-800/80">
            {profile.links.filter(l => l.is_active && l.url).map(link => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition-all active:scale-95"
              >
                <Globe className="w-3 h-3 text-amber-400" />
                <span>{link.title}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ── Cuerpo del Catálogo ── */}
      <div className="flex-1 p-3 space-y-4 pb-12">
        
        {/* 1. SECCIÓN DE FOTOS (Carrusel con Auto-deslizamiento) */}
        {photos.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400">
                <span>📸 Fotografías</span>
                <span className="text-[10px] text-zinc-500 font-mono">({photos.length})</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900/90 px-2 py-0.5 rounded-md border border-zinc-800">
                {photoIndex + 1} / {photos.length}
              </span>
            </div>

            {/* Contenedor de la Foto Principal */}
            <div
              onClick={() => setModalMedia(currentPhoto)}
              className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800/80 cursor-pointer shadow-xl group"
            >
              {isPhotoLocked ? (
                /* Contenido Bloqueado con Estrellas (Preview difuminado nativo) */
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                  <img
                    src={currentPhoto.url}
                    alt="VIP Preview"
                    className="absolute inset-0 w-full h-full object-cover filter blur-[12px] scale-105 opacity-95 brightness-95 contrast-105 select-none"
                  />
                  <div className="absolute inset-0 bg-black/25 pointer-events-none" />
                  
                  {/* Candado Central Compacto Nativo Telegram */}
                  <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-11 h-11 rounded-full bg-black/75 backdrop-blur-xl border border-amber-400/50 flex items-center justify-center shadow-xl mb-1.5">
                      <Lock className="w-4 h-4 text-amber-400 animate-pulse" />
                    </div>
                    <div className="px-3 py-0.5 rounded-full bg-black/85 backdrop-blur-md border border-amber-500/40 text-amber-300 font-extrabold text-[11px] shadow-lg flex items-center gap-1">
                      <span>⭐</span>
                      <span>{currentPhoto.starsPrice} Estrellas</span>
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={currentPhoto.url}
                  alt="VIP Content"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}

              {/* Insignia Free o Desbloqueado */}
              <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
                {unlockedIds.has(currentPhoto.id) ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-zinc-950 text-[10px] font-black shadow-lg">
                    ✅ DESBLOQUEADO
                  </span>
                ) : !currentPhoto.isStarsLocked ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/90 text-white text-[10px] font-bold shadow-lg">
                    FREE
                  </span>
                ) : null}
              </div>
            </div>

            {/* Controles de Foto: { < ..... > } */}
            {photos.length > 1 && (
              <div className="flex items-center justify-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotoIndex(prev => (prev - 1 + photos.length) % photos.length);
                  }}
                  className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-1">
                  {photos.map((_, idx) => (
                    <span
                      key={idx}
                      className={`rounded-full transition-all duration-300 ${
                        photoIndex === idx ? 'bg-amber-400 w-3.5 h-1' : 'bg-zinc-700 w-1 h-1'
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotoIndex(prev => (prev + 1) % photos.length);
                  }}
                  className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. SECCIÓN DE VIDEOS (Carrusel Independiente con Auto-deslizamiento) */}
        {videos.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
            <div className="flex items-center justify-between px-0.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400">
                <Video className="w-3 h-3" />
                <span>Videos Exclusivos</span>
                <span className="text-[10px] text-zinc-500 font-mono">({videos.length})</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900/90 px-2 py-0.5 rounded-md border border-zinc-800">
                {videoIndex + 1} / {videos.length}
              </span>
            </div>

            {/* Contenedor del Video Principal */}
            <div
              onClick={() => setModalMedia(currentVideo)}
              className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black border border-zinc-800/80 cursor-pointer shadow-xl group"
            >
              {isVideoLocked ? (
                /* Video Bloqueado con Estrellas (Preview difuminado nativo) */
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                  <video
                    src={currentVideo.url}
                    poster={currentVideo.posterUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover filter blur-[12px] scale-105 opacity-95 brightness-95 contrast-105 select-none"
                  />
                  <div className="absolute inset-0 bg-black/25 pointer-events-none" />

                  {/* Candado Central Compacto */}
                  <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-11 h-11 rounded-full bg-black/75 backdrop-blur-xl border border-amber-400/50 flex items-center justify-center shadow-xl mb-1.5">
                      <Lock className="w-4 h-4 text-amber-400 animate-pulse" />
                    </div>
                    <div className="px-3 py-0.5 rounded-full bg-black/85 backdrop-blur-md border border-amber-500/40 text-amber-300 font-extrabold text-[11px] shadow-lg flex items-center gap-1">
                      <span>⭐</span>
                      <span>{currentVideo.starsPrice} Estrellas</span>
                    </div>
                  </div>
                </div>
              ) : (
                <video
                  src={currentVideo.url}
                  poster={currentVideo.posterUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}

              {/* Insignia Free o Desbloqueado */}
              <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
                {unlockedIds.has(currentVideo.id) ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-zinc-950 text-[10px] font-black shadow-lg">
                    ✅ DESBLOQUEADO
                  </span>
                ) : !currentVideo.isStarsLocked ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/90 text-white text-[10px] font-bold shadow-lg">
                    FREE
                  </span>
                ) : null}
              </div>
            </div>

            {/* Controles de Video: { < ..... > } */}
            {videos.length > 1 && (
              <div className="flex items-center justify-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setVideoIndex(prev => (prev - 1 + videos.length) % videos.length);
                  }}
                  className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-1">
                  {videos.map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-1 rounded-full transition-all ${
                        videoIndex === idx ? 'w-3.5 bg-amber-400' : 'w-1 bg-zinc-700'
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setVideoIndex(prev => (prev + 1) % videos.length);
                  }}
                  className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Barra Inferior Fija: Métodos de Pago ── */}
      <div className="sticky bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-center pointer-events-auto">
        <button
          type="button"
          onClick={() => setShowPaymentsModal(true)}
          className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-black text-xs shadow-lg shadow-amber-500/25 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
        >
          <CreditCard className="w-4 h-4 text-zinc-950" />
          <span>Ver Métodos de Pago</span>
        </button>
      </div>

      {/* ── VISOR MODAL INMERSIVO DENTRO DEL DISPOSITIVO ── */}
      {modalMedia && (
        <FullDetailModal
          mediaItem={modalMedia}
          allMedia={modalMedia.type === 'video' ? videos : photos}
          unlockedIds={unlockedIds}
          onUnlockMedia={handleUnlockStars}
          onClose={() => setModalMedia(null)}
          onOpenPayments={() => {
            setModalMedia(null);
            setShowPaymentsModal(true);
          }}
        />
      )}

      {/* ── MODAL DE MÉTODOS DE PAGO ── */}
      {showPaymentsModal && (
        <PaymentsModal
          methods={profile.paymentMethods}
          onClose={() => setShowPaymentsModal(false)}
        />
      )}

    </div>
  );
};

// ── Visor Modal Inmersivo Estilo Oficial ─────────────────────────────────────
interface FullDetailModalProps {
  mediaItem: MediaItem;
  allMedia: MediaItem[];
  unlockedIds: Set<string>;
  onUnlockMedia: (id: string) => void;
  onClose: () => void;
  onOpenPayments: () => void;
}

const FullDetailModal: React.FC<FullDetailModalProps> = ({
  mediaItem,
  allMedia,
  unlockedIds,
  onUnlockMedia,
  onClose,
  onOpenPayments
}) => {
  const [activeIdx, setActiveIdx] = useState(() => {
    const idx = allMedia.findIndex(m => m.id === mediaItem.id);
    return idx !== -1 ? idx : 0;
  });
  const [isMuted, setIsMuted] = useState(true);
  const [showIndicators, setShowIndicators] = useState(true);
  const userInteractedRef = useRef(false);
  const soundToggledRef = useRef(false);

  const current = allMedia[activeIdx] || mediaItem;
  const isLocked = current.isStarsLocked && !unlockedIds.has(current.id);
  const isVid = current.type === 'video';

  // Ciclo de 10s en fotos
  useEffect(() => {
    if (isVid) return;
    setShowIndicators(true);
    const interval = setInterval(() => {
      setShowIndicators(prev => !prev);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeIdx, isVid]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    userInteractedRef.current = true;
    setShowIndicators(true);
    soundToggledRef.current = false;
    setActiveIdx(prev => (prev - 1 + allMedia.length) % allMedia.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    userInteractedRef.current = true;
    setShowIndicators(true);
    soundToggledRef.current = false;
    setActiveIdx(prev => (prev + 1) % allMedia.length);
  };

  const handleSoundToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(prev => !prev);
    setShowIndicators(false);
    userInteractedRef.current = false;
    soundToggledRef.current = true;
  };

  const handleVideoTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const vid = e.currentTarget;
    if (!vid.duration) return;
    const timeLeft = vid.duration - vid.currentTime;
    if (soundToggledRef.current) {
      if (timeLeft <= 0.5 && timeLeft > 0) {
        if (!showIndicators) setShowIndicators(true);
      } else if (timeLeft > 0.6 && !userInteractedRef.current && showIndicators) {
        setShowIndicators(false);
      }
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-black text-zinc-100 select-none overflow-hidden">
      
      {/* Barra Superior Flotante */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-3 py-3 bg-gradient-to-b from-black/90 to-transparent">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-200 cursor-pointer active:scale-95 transition-all"
          title="Cerrar visor"
        >
          <X className="w-3.5 h-3.5 text-amber-400" />
          <span>Cerrar</span>
        </button>

        <div className="flex items-center gap-1.5">
          {current.isStarsLocked && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 border border-amber-500/40 text-amber-300">
              ⭐ {current.starsPrice}
            </span>
          )}
          <span className="px-2.5 py-0.5 rounded-full bg-black/60 border border-zinc-800 text-[11px] font-mono text-zinc-300">
            {activeIdx + 1} / {allMedia.length}
          </span>
        </div>
      </div>

      {/* Zona Multimedia Inmersiva */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-black">
        {isLocked ? (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {isVid ? (
              <video
                src={current.url}
                poster={current.posterUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full max-h-[85vh] object-contain mx-auto filter blur-[12px] scale-105 opacity-95 brightness-95 contrast-105 select-none"
              />
            ) : (
              <img
                src={current.url}
                alt="Locked Preview"
                className="w-full h-full max-h-[85vh] object-contain mx-auto filter blur-[12px] scale-105 opacity-95 brightness-95 contrast-105 select-none"
              />
            )}
            <div className="absolute inset-0 bg-black/25 pointer-events-none" />

            {/* Candado Central Compacto */}
            <div className="absolute z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none">
              <div className="w-13 h-13 rounded-full bg-black/75 backdrop-blur-xl border border-amber-400/50 flex items-center justify-center shadow-2xl mb-1.5">
                <Lock className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
              <div className="px-3 py-1 rounded-full bg-black/85 backdrop-blur-md border border-amber-500/40 text-amber-300 font-extrabold text-[11px] shadow-lg flex items-center gap-1">
                <span>⭐</span>
                <span>{current.starsPrice} Estrellas</span>
              </div>
            </div>
          </div>
        ) : isVid ? (
          <video
            src={current.url}
            poster={current.posterUrl}
            autoPlay
            muted={isMuted}
            controls
            playsInline
            loop
            onTimeUpdate={handleVideoTimeUpdate}
            className="w-full h-full max-h-[85vh] object-contain mx-auto"
          />
        ) : (
          <img
            src={current.url}
            alt="VIP Content"
            className="w-full h-full max-h-[85vh] object-contain mx-auto"
          />
        )}

        {/* Flechas Laterales */}
        {allMedia.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className={`absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-zinc-300 border border-zinc-800 transition-all duration-500 cursor-pointer shadow-lg z-20 ${
                showIndicators ? 'opacity-70 hover:opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-zinc-300 border border-zinc-800 transition-all duration-500 cursor-pointer shadow-lg z-20 ${
                showIndicators ? 'opacity-70 hover:opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Barra Inferior Flotante */}
      <div className="absolute bottom-0 inset-x-0 z-30 p-3 pb-6 flex flex-col items-center justify-center bg-gradient-to-t from-black/95 via-black/60 to-transparent">
        <div className="flex items-center gap-2">
          {isLocked ? (
            <button
              type="button"
              onClick={() => onUnlockMedia(current.id)}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-zinc-950 font-black text-xs sm:text-sm tracking-wide shadow-xl shadow-amber-500/25 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4 text-zinc-950" />
              <span>Desbloquear ({current.starsPrice} ⭐)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenPayments}
              className="px-4 py-2 rounded-full bg-zinc-900 border border-amber-500/40 text-amber-300 font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <CreditCard className="w-3.5 h-3.5 text-amber-400" />
              <span>Métodos de Pago</span>
            </button>
          )}

          {/* Botón Solo Icono de Sonido */}
          {isVid && !isLocked && (
            <button
              type="button"
              onClick={handleSoundToggle}
              className="p-2 sm:p-2.5 rounded-full bg-zinc-900 border border-amber-500/40 text-amber-300 shadow-lg cursor-pointer active:scale-95 flex items-center justify-center"
              title={isMuted ? 'Activar sonido' : 'Silenciar'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          )}
        </div>

        {/* Puntos Indicadores */}
        {allMedia.length > 1 && (
          <div className={`flex items-center justify-center gap-1.5 mt-2 transition-opacity duration-500 ${
            showIndicators ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}>
            {allMedia.map((_, idx) => (
              <span
                key={idx}
                className={`rounded-full transition-all duration-300 ${
                  activeIdx === idx ? 'bg-amber-400 w-4 h-1' : 'bg-zinc-600 w-1 h-1'
                }`}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

// ── Modal de Métodos de Pago ────────────────────────────────────────────────
interface PaymentsModalProps {
  methods: PaymentMethod[];
  onClose: () => void;
}

const PaymentsModal: React.FC<PaymentsModalProps> = ({ methods, onClose }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 p-4 sm:p-5 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Métodos de Pago VIP</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-3 overflow-y-auto space-y-3">
          {methods.filter(m => m.is_active).map(m => (
            <div key={m.id} className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
              <h4 className="font-bold text-xs text-amber-300">{m.title}</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">{m.description}</p>
              {m.image_url && (
                <div className="flex justify-center pt-1">
                  <img src={m.image_url} alt="QR Code" className="w-28 h-28 rounded-xl bg-white p-1 shadow-md" />
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-2 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-colors cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

