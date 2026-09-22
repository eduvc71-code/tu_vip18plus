import React, { useState } from 'react';
import { CreatorProfile, MediaItem, DemoView, SocialPlatform } from '../types';
import { fileToDataUrl } from '../utils/storage';
import {
  Sliders,
  User,
  Upload,
  Plus,
  Trash2,
  Star,
  CheckCircle2,
  RefreshCw,
  Smartphone,
  Send,
  MessageSquare,
  Globe,
  CreditCard,
  Video,
  Image as ImageIcon,
  Lock,
  ExternalLink,
  Sparkles,
  X,
  LogOut
} from 'lucide-react';

interface AdminDemoPanelProps {
  profile: CreatorProfile;
  onUpdateProfile: (updated: CreatorProfile) => void;
  onResetDefault: () => void;
  onNavigateToView: (view: DemoView) => void;
}

export const AdminDemoPanel: React.FC<AdminDemoPanelProps> = ({
  profile,
  onUpdateProfile,
  onResetDefault,
  onNavigateToView
}) => {
  const [activeTab, setActiveTab] = useState<'perfil' | 'contenido' | 'pagos'>('contenido');
  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);

  // Estados de subida de contenido
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string>('');
  const [uploadType, setUploadType] = useState<'photo' | 'video'>('photo');
  const [isVipLocked, setIsVipLocked] = useState<boolean>(false);
  const [starsPrice, setStarsPrice] = useState<number>(50);
  const [caption, setCaption] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [alertMsg, setAlertMsg] = useState<string>('');
  const [showAppInfo, setShowAppInfo] = useState(false);

  const showAlert = (msg: string) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(''), 4000);
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CreatorProfile = {
      ...profile,
      name: name.trim() || 'Modelo VIP',
      username: username.trim() || 'modelo_vip',
      bio: bio.trim()
      // Nota: las redes sociales (links) se conservan tal cual, no se editan en la versión demo
    };
    onUpdateProfile(updated);
    showAlert('Version Demo Grabado');
  };

  const handleLinkChange = (id: string, url: string, active: boolean) => {
    const updatedLinks = profile.links.map(l =>
      l.id === id ? { ...l, url, is_active: active } : l
    );
    onUpdateProfile({ ...profile, links: updatedLinks });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    const isVid = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
    setUploadType(isVid ? 'video' : 'photo');
    try {
      const dataUrl = await fileToDataUrl(file);
      setUploadPreview(dataUrl);
    } catch {
      setUploadPreview(URL.createObjectURL(file));
    }
  };

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadPreview) {
      showAlert('⚠️ Selecciona una foto o video para agregar.');
      return;
    }
    setIsProcessing(true);
    try {
      const newMedia: MediaItem = {
        id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        url: uploadPreview,
        type: uploadType,
        isStarsLocked: isVipLocked,
        starsPrice: isVipLocked ? Number(starsPrice) : 0,
        caption: caption.trim(),
        createdAt: 'Recién subido'
      };

      const updatedProfile: CreatorProfile = {
        ...profile,
        media: [newMedia, ...profile.media]
      };
      onUpdateProfile(updatedProfile);
      setUploadFile(null);
      setUploadPreview('');
      setCaption('');
      setIsVipLocked(false);
      showAlert(`🎉 ¡${newMedia.type === 'video' ? 'Video' : 'Foto'} guardado con éxito! Se refleja en los simuladores.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteMedia = (id: string) => {
    const updatedProfile: CreatorProfile = {
      ...profile,
      media: profile.media.filter(m => m.id !== id)
    };
    onUpdateProfile(updatedProfile);
    showAlert('🗑️ Archivo eliminado de la demostración.');
  };

  const handleToggleMediaLock = (id: string) => {
    const updatedProfile: CreatorProfile = {
      ...profile,
      media: profile.media.map(m => {
        if (m.id === id) {
          const willBeLocked = !m.isStarsLocked;
          return {
            ...m,
            isStarsLocked: willBeLocked,
            starsPrice: willBeLocked ? (m.starsPrice || 50) : 0
          };
        }
        return m;
      })
    };
    onUpdateProfile(updatedProfile);
  };

  const freeCount = profile.media.filter(m => !m.isStarsLocked).length;
  const starsCount = profile.media.filter(m => m.isStarsLocked).length;
  const starsPercent = profile.media.length ? Math.round((starsCount / profile.media.length) * 100) : 0;

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col bg-zinc-900 border border-zinc-800 rounded-none sm:rounded-3xl shadow-2xl overflow-hidden my-0 sm:my-3">
      <div className="px-3.5 py-2.5 border-b border-zinc-800 bg-zinc-950/90 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <Sliders className="w-4 h-4" />
          </div>

          <div className="flex items-center gap-2 text-sm font-black text-white">
            <span>VIP</span>
            <span className="text-zinc-300 font-bold">Tú VIP</span>
            <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-zinc-950">
              DEMO
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateToView('miniapp')}
          className="flex items-center gap-1.5 rounded-xl bg-rose-600/90 px-3 py-1.5 text-xs font-bold text-white shadow-md transition-all hover:bg-rose-500"
          title="Salir de la demostración"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Salir</span>
        </button>
      </div>

      <div className="p-4 sm:p-5">
        <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-4 sm:p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white">Panel Administrativo</h2>
                <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-300">
                  DEMO
                </span>
              </div>
              <p className="mt-1 text-[11px] sm:text-xs text-zinc-400 leading-snug">
                Modifica datos o sube contenido y prueba en vivo los 3 simuladores.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowAppInfo(true)}
              className="w-full rounded-xl bg-amber-400 px-3 py-2 text-[10px] sm:text-xs font-black text-black shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-300"
              title="Más información de la app"
            >
              <span className="flex items-center justify-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-black" />
                <span className="truncate">Te gusto la App? Contactanos...</span>
              </span>
            </button>

            <button
              type="button"
              onClick={onResetDefault}
              className="w-full rounded-xl bg-zinc-800 px-3 py-2 text-[10px] sm:text-xs font-semibold text-zinc-300 transition-all hover:bg-zinc-700"
              title="Restablecer los 16 contenidos iniciales predeterminados"
            >
              <span className="flex items-center justify-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate">Restablecer Demo</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {showAppInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-amber-500/40 bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.7)]">
            <div className="absolute inset-x-8 top-0 h-24 bg-gradient-to-b from-amber-500/15 to-transparent blur-2xl" />

            <button
              type="button"
              onClick={() => setShowAppInfo(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
              aria-label="Cerrar información de la app"
              title="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative z-10 space-y-5 pt-3 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/25 via-amber-400/10 to-zinc-900 text-amber-300 ring-1 ring-amber-500/30 shadow-lg shadow-amber-500/10">
                <Sparkles className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-400">Atención 24/7</p>
                <h3 className="text-2xl font-black leading-tight text-white">Nos adecuamos a tu presupuesto</h3>
              </div>

              <div className="flex items-center justify-center gap-4 pt-2">
                <a
                  href="https://t.me/edu_vc01"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/40 transition duration-200 hover:-translate-y-0.5 hover:bg-sky-500/25"
                  aria-label="Abrir Telegram"
                  title="Telegram"
                >
                  <Send className="h-7 w-7 text-sky-400" />
                </a>

                <a
                  href="https://wa.me/59163127007"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40 transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-500/25"
                  aria-label="Abrir WhatsApp"
                  title="WhatsApp"
                >
                  <MessageSquare className="h-7 w-7 text-emerald-400" />
                </a>
              </div>

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                IMPORTANTE: ESTA APP NO GESTIONA TU GRUPO PRIVADO VIP.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

