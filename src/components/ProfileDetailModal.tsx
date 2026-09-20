import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Profile } from '../types';
import { ArrowLeft, X, ChevronLeft, ChevronRight, Sparkles, CreditCard, MessageSquareText } from 'lucide-react';
import { isVideoUrl, ProtectedMedia } from './ProtectedMedia';

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
  modelName: _modelName,
  modelVipLink: _modelVipLink,
  onClose,
  onOpenPaymentMethods,
  onRequestAvailability: _onRequestAvailability
}) => {
  const media = useMemo(() => {
    if (!profile?.photos?.length) return [];
    return profile.photos;
  }, [profile?.photos]);

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [showCaption, setShowCaption] = useState(true);
  const [payingStars, setPayingStars] = useState(false);
  const captionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sincronizar índice inicial según el archivo que tocó el usuario
  useEffect(() => {
    if (initialMediaUrl && media.length > 0) {
      const idx = media.indexOf(initialMediaUrl);
      if (idx !== -1) {
        setActivePhotoIdx(idx);
      }
    }
  }, [initialMediaUrl, media]);

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
  const rawItemDescription = (currentMediaUrl && profile.media_descriptions?.[currentMediaUrl]) || profile.description || '';
  const currentItemDescription = /holis|bienvenida|opciones que te salen abajo/i.test(rawItemDescription) ? '' : rawItemDescription.trim();
  const currentStars = profile.media_stars?.[currentMediaUrl];
  const isVideo = isVideoUrl(currentMediaUrl);

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
              alert('🎉 ¡Pago de estrellas procesado con éxito!');
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-xl overflow-y-auto pt-8 sm:pt-6">
      
      {/* Contenedor Principal del Visor */}
      <div className="relative w-full max-w-2xl bg-zinc-950/90 border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl text-zinc-100 flex flex-col my-auto">
        
        {/* Barra Superior con Margen Seguro respecto a Telegram */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900/90 bg-zinc-950/80 z-20">
          
          {/* Botón Atrás (Volver) */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white transition-all shadow-md text-xs font-bold cursor-pointer active:scale-95"
            title="Volver a la galería"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Volver</span>
          </button>

          {/* Contador Discreto de Multimedia */}
          <div className="flex items-center gap-2">
            {currentStars && currentStars > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-sm">
                ⭐ {currentStars} Stars
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400 font-semibold">
              {activePhotoIdx + 1} / {media.length}
            </span>
          </div>

          {/* Botón Cerrar (X) de Emergencia */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar visor"
            className="p-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Zona Multimedia (Con escala controlada para no salirse de pantalla) */}
        <div
          onClick={toggleCaption}
          className="relative w-full max-h-[58vh] sm:max-h-[62vh] min-h-[260px] bg-black flex items-center justify-center overflow-hidden cursor-pointer select-none group"
        >
          {isVideo ? (
            <video
              key={currentMediaUrl}
              src={currentMediaUrl}
              autoPlay
              controls
              playsInline
              loop
              className="max-h-[58vh] sm:max-h-[62vh] w-auto h-auto max-w-full object-contain mx-auto"
            />
          ) : (
            <ProtectedMedia
              src={currentMediaUrl}
              alt="Contenido Danii"
              modelName="Danii"
              className="max-h-[58vh] sm:max-h-[62vh] w-auto h-auto max-w-full object-contain mx-auto"
              autoPlay={false}
              showControls={false}
            />
          )}

          {/* Flechas Laterales Flotantes Discretas (No tapan el centro de la imagen) */}
          {media.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Anterior"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-950/60 hover:bg-zinc-900/90 text-zinc-300 hover:text-white border border-zinc-800/80 transition-all opacity-70 hover:opacity-100 active:scale-95 cursor-pointer shadow-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Siguiente"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-950/60 hover:bg-zinc-900/90 text-zinc-300 hover:text-white border border-zinc-800/80 transition-all opacity-70 hover:opacity-100 active:scale-95 cursor-pointer shadow-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Botón Flotante para Alternar Descripción Manualmente */}
          {currentItemDescription && (
            <button
              type="button"
              onClick={toggleCaption}
              title={showCaption ? 'Ocultar descripción' : 'Mostrar descripción'}
              className="absolute bottom-3 right-3 z-20 p-2 rounded-full bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800/80 text-zinc-400 hover:text-amber-400 transition-all shadow-md cursor-pointer"
            >
              <MessageSquareText className="w-4 h-4" />
            </button>
          )}

          {/* EFECTO MÁGICO: Descripción flotante que aparece por 5s y se desvanece suavemente */}
          {currentItemDescription && (
            <div
              className={`absolute bottom-3 left-3 right-12 z-10 transition-all duration-700 ease-in-out pointer-events-none ${
                showCaption
                  ? 'opacity-100 translate-y-0 filter-none'
                  : 'opacity-0 translate-y-3 filter blur-md'
              }`}
            >
              <div className="bg-zinc-950/85 backdrop-blur-md border border-zinc-800/80 text-zinc-200 text-xs px-3.5 py-2.5 rounded-2xl shadow-xl leading-relaxed whitespace-pre-line max-h-24 overflow-y-auto">
                <p className="font-medium text-zinc-100">{currentItemDescription}</p>
              </div>
            </div>
          )}
        </div>

        {/* Indicadores Paginados (Debajo de la foto para no perjudicar la visión) */}
        {media.length > 1 && (
          <div className="py-2.5 flex items-center justify-center gap-1.5 bg-zinc-950/90 border-t border-zinc-900/60">
            {media.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActivePhotoIdx(idx)}
                aria-label={`Ver archivo ${idx + 1}`}
                className={`rounded-full transition-all duration-300 cursor-pointer ${
                  activePhotoIdx === idx
                    ? 'bg-amber-400 w-5 h-1.5 shadow-sm shadow-amber-400/50'
                    : 'bg-zinc-700 hover:bg-zinc-500 w-1.5 h-1.5'
                }`}
              />
            ))}
          </div>
        )}

        {/* Zona Inferior: Botón de Acción Dinámico (Estrellas vs Métodos de Pago) */}
        <div className="p-3.5 sm:p-4 bg-zinc-950 border-t border-zinc-900">
          {currentStars && currentStars > 0 ? (
            /* Botón de Compra con Telegram Stars */
            <button
              type="button"
              onClick={handlePayWithStars}
              disabled={payingStars}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-zinc-950 font-black text-sm tracking-wide transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
            >
              <Sparkles className="w-4 h-4 text-zinc-950" />
              <span>{payingStars ? 'Generando Factura...' : `⭐ Desbloquear por ${currentStars} Estrellas`}</span>
            </button>
          ) : (
            /* Botón de Adquirir Contenido (Lleva directo a Métodos de Pago) */
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenPaymentMethods) {
                  onOpenPaymentMethods();
                }
              }}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-extrabold text-sm tracking-wide transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <CreditCard className="w-4 h-4" />
              <span>Adquirir Contenido (Métodos de Pago)</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
