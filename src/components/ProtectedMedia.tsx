import React from 'react';
import { Play, ShieldCheck } from 'lucide-react';

interface ProtectedMediaProps {
  src: string;
  alt: string;
  modelName: string;
  className?: string;
  autoPlay?: boolean;
  showControls?: boolean;
}

export const isVideoUrl = (url: string) =>
  /\.(mp4|webm|mov|m4v|ogv)(?:$|[?#])/i.test(url);

export const ProtectedMedia: React.FC<ProtectedMediaProps> = ({
  src,
  alt,
  modelName,
  className = '',
  autoPlay = false,
  showControls = true
}) => {
  const stopContextMenu = (event: React.MouseEvent) => event.preventDefault();

  return (
    <div
      className="relative h-full w-full overflow-hidden select-none"
      onContextMenu={stopContextMenu}
      data-protected-media="true"
    >
      {isVideoUrl(src) ? (
        <video
          src={src}
          aria-label={alt}
          className={className}
          controls={showControls}
          controlsList="nodownload noplaybackrate noremoteplayback"
          disablePictureInPicture
          disableRemotePlayback
          playsInline
          preload="metadata"
          autoPlay={autoPlay}
          muted={autoPlay}
          loop={autoPlay}
          onContextMenu={stopContextMenu}
          onDragStart={(event) => event.preventDefault()}
        />
      ) : (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          draggable={false}
          className={className}
          onContextMenu={stopContextMenu}
          onDragStart={(event) => event.preventDefault()}
        />
      )}

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.16]">
        <span className="-rotate-12 text-lg font-black uppercase tracking-[0.25em] text-white drop-shadow-lg">
          {modelName || 'Tú'} · VIP
        </span>
      </div>

      <div className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/45 px-2 py-1 text-[9px] font-semibold text-white/80 backdrop-blur-sm">
        {isVideoUrl(src) ? <Play className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
        Vista protegida
      </div>
    </div>
  );
};
