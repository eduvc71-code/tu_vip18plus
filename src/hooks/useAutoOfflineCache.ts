import { useEffect, useRef } from 'react';
import type { Profile } from '../types';
import { useOfflineMedia } from './useOfflineMedia';

// Utilidad: detectar si una URL es video (para excluirlos del prefetch masivo)
function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v|mkv)(\?.*)?$/i.test(url) || /\/video/i.test(url);
}

/**
 * Cacheo silencioso y automático de la media de los perfiles.
 *
 * - Se dispara UNA sola vez por sesión, cuando:
 *    1. El Service Worker está listo (controla la página)
 *    2. Hay perfiles cargados con fotos
 * - Solo precarga FOTOS (los videos se cachean on-demand al verlos).
 * - Máximo 60 fotos por sesión para no saturar el dispositivo.
 * - El SW internamente ignora las que ya están cacheadas.
 */
export function useAutoOfflineCache(profiles: Profile[] | null | undefined) {
  const { ready, prefetchUrls } = useOfflineMedia();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (!ready) return;
    if (!profiles || profiles.length === 0) return;

    // Recolectar URLs de FOTOS (excluyendo videos)
    const allPhotos: string[] = [];
    for (const profile of profiles) {
      const photos = profile.photos || [];
      for (const url of photos) {
        if (!isVideoUrl(url)) {
          allPhotos.push(url);
        }
      }
    }

    if (allPhotos.length === 0) return;

    // Deduplicar y limitar
    const unique = Array.from(new Set(allPhotos)).slice(0, 60);

    // Pequeño delay para no competir con la carga inicial de la UI
    const timer = setTimeout(() => {
      const fired = prefetchUrls(unique);
      if (fired) {
        firedRef.current = true;
        console.log(`[AutoOfflineCache] Prefetch disparado: ${unique.length} fotos`);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [ready, profiles, prefetchUrls]);
}