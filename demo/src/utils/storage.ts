import { CreatorProfile } from '../types';
import { initialDemoProfile } from '../data/defaultDemoData';

const STORAGE_KEY = 'tu_vip_demo_profile_v3';
const UNLOCKED_KEY = 'tu_vip_demo_unlocked_media_v3';

export function getStoredDemoProfile(): CreatorProfile {
  if (typeof window === 'undefined') return initialDemoProfile;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialDemoProfile;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.media) || parsed.media.length === 0) {
      return initialDemoProfile;
    }
    return parsed;
  } catch {
    return initialDemoProfile;
  }
}

export function saveStoredDemoProfile(profile: CreatorProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent('tu_vip_demo_updated', { detail: profile }));
  } catch (e) {
    console.warn('[Demo Storage Save Warning]:', e);
  }
}

export function resetDemoProfile(): CreatorProfile {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(UNLOCKED_KEY);
      window.dispatchEvent(new CustomEvent('tu_vip_demo_updated', { detail: initialDemoProfile }));
    } catch {}
  }
  return initialDemoProfile;
}

export function getUnlockedMediaIds(): Set<string> {
  const set = new Set<string>();
  if (typeof window === 'undefined') return set;
  try {
    const raw = localStorage.getItem(UNLOCKED_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach(id => set.add(id));
      }
    }
  } catch {}
  return set;
}

export function unlockMediaId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getUnlockedMediaIds();
    current.add(id);
    localStorage.setItem(UNLOCKED_KEY, JSON.stringify(Array.from(current)));
    window.dispatchEvent(new CustomEvent('tu_vip_demo_media_unlocked', { detail: id }));
  } catch {}
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

