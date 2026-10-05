import { useCallback, useEffect, useState } from 'react';

export interface CacheStats {
  items: number;
  bytes: number;
}

export function useOfflineMedia() {
  const [stats, setStats] = useState<CacheStats>({ items: 0, bytes: 0 });
  const [ready, setReady] = useState(false);

  const refreshStats = useCallback(async () => {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'GET_CACHE_STATS' });
    }
    try {
      if (navigator.storage?.estimate) {
        const est = await navigator.storage.estimate();
        setStats(prev => ({ ...prev, bytes: est.usage || 0 }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onReady = () => setReady(true);

    if (navigator.serviceWorker.controller) {
      onReady();
    } else {
      navigator.serviceWorker.ready.then(() => {
        if (navigator.serviceWorker.controller) onReady();
      }).catch(() => {});
      navigator.serviceWorker.addEventListener('controllerchange', onReady);
    }

    if (navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onReady);
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'CACHE_STATS') {
        setStats(prev => ({ ...prev, items: data.count || 0 }));
      }

      if (data.type === 'PREFETCH_COMPLETE') {
        refreshStats();
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [refreshStats]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const prefetchUrls = useCallback((urls: string[]) => {
    if (!navigator.serviceWorker?.controller) return false;
    const clean = (urls || []).filter(u => typeof u === 'string' && u.length > 0);
    if (clean.length === 0) return false;

    const requestId = 'prefetch_' + Date.now();
    navigator.serviceWorker.controller.postMessage({
      type: 'PREFETCH_URLS',
      urls: clean,
      requestId
    });
    return true;
  }, []);

  return { ready, stats, prefetchUrls, refreshStats };
}