import React from 'react';

interface ProtectedMediaProps {
  src: string;
  alt: string;
  modelName: string;
  className?: string;
  autoPlay?: boolean;
  showControls?: boolean;
}

export const isVideoUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  const clean = url.toLowerCase().split('?')[0].split('#')[0];
  if (/\.(mp4|webm|mov|m4v|ogv|mkv|avi|3gp)$/i.test(clean)) return true;
  if (/\.(mp4|webm|mov|m4v|ogv|mkv|avi|3gp)(?:$|[?#])/i.test(url)) return true;
  if (url.toLowerCase().includes('/video') || url.toLowerCase().includes('type=video')) return true;
  return false;
};

export const ProtectedMedia: React.FC<ProtectedMediaProps> = ({
  src,
  alt,
  modelName: _modelName,
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
    </div>
  );
};
