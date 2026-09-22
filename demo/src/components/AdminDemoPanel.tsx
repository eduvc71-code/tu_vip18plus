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
  Sparkles
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
      {/* Encabezado del Panel Demo */}
      <div className="p-3.5 sm:p-5 border-b border-zinc-800 bg-zinc-950/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>Panel Administrativo</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                DEMO
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Modifica datos o sube contenido y prueba en vivo los 3 simuladores.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://t.me/edu_vc01"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-sky-500/40"
            title="Te interesa? Escríbeme por Telegram @edu_vc01"
          >
            <Send className="w-3.5 h-3.5 text-sky-400" />
            <span>Te interesa? Telegram</span>
          </a>

          <a
            href="https://wa.me/59163127007"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-500/40"
            title="Te interesa? Escríbeme por WhatsApp +59163127007"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Te interesa? WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={onResetDefault}
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-zinc-700/60"
            title="Restablecer los 16 contenidos iniciales predeterminados"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Restablecer Demo</span>
          </button>
        </div>
      </div>

      {/* Pestañas de Navegación del Panel */}
      <div className="flex border-b border-zinc-800 bg-zinc-950/40 px-3 pt-2 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('contenido')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'contenido'
              ? 'bg-zinc-900 text-amber-400 border-t-2 border-amber-400 border-x border-zinc-800'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Subir & Gestionar Contenido ({profile.media.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('perfil')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'perfil'
              ? 'bg-zinc-900 text-amber-400 border-t-2 border-amber-400 border-x border-zinc-800'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Datos & Redes Sociales</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pagos')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'pagos'
              ? 'bg-zinc-900 text-amber-400 border-t-2 border-amber-400 border-x border-zinc-800'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Métodos de Pago</span>
        </button>
      </div>

      {/* Mensaje de feedback temporal */}
      {alertMsg && (
        <div className="bg-emerald-500/20 border-b border-emerald-500/40 px-4 py-2 text-xs text-emerald-300 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{alertMsg}</span>
        </div>
      )}

      {/* Contenido Principal */}
      <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-6">
        
        {/* PESTAÑA 1: CONTENIDO */}
        {activeTab === 'contenido' && (
          <div className="space-y-6">
            
            {/* Formulario de Carga Interactiva */}
            <div className="bg-zinc-950 p-4 sm:p-5 rounded-2xl border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>Subir Foto o Video a la Demostración</span>
                </h3>
                <span className="text-[11px] font-mono text-zinc-400">
                  Total: {profile.media.length} medios | {freeCount} Free · {starsCount} Stars ({starsPercent}%)
                </span>
              </div>

              <form onSubmit={handleAddMedia} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Selector de Archivo */}
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1 uppercase">
                      Seleccionar Archivo (Foto o Video)
                    </label>
                    <input
                      type="file"
                      accept="image/*,video/mp4,video/webm,video/quicktime"
                      onChange={handleFileSelect}
                      className="w-full text-xs text-zinc-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-zinc-800 file:text-amber-400 hover:file:bg-zinc-700 cursor-pointer bg-zinc-900 border border-zinc-800 rounded-xl p-1"
                    />
                  </div>

                  {/* Modalidad: Free o Pago con Estrellas */}
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1 uppercase">
                      Tipo de Contenido
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsVipLocked(false)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                          !isVipLocked
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                        }`}
                      >
                        <span>🟢 Contenido Free</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsVipLocked(true)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                          isVipLocked
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                        }`}
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>VIP Stars</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Si es VIP Stars: Selector de Precio en Estrellas */}
                {isVipLocked && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-amber-300">Precio en Telegram Stars:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {[25, 50, 75, 100, 150].map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setStarsPrice(amount)}
                          className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            starsPrice === amount
                              ? 'bg-amber-400 text-zinc-950 shadow-md scale-105'
                              : 'bg-zinc-900 text-zinc-300 border border-zinc-700 hover:border-amber-400'
                          }`}
                        >
                          ⭐ {amount}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Descripción / Pie de foto */}
                <div>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Descripción o pie de foto (opcional)..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Botón de Enviar */}
                <button
                  type="submit"
                  disabled={!uploadPreview || isProcessing}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isProcessing ? 'Procesando...' : 'Publicar en la Demostración'}</span>
                </button>
              </form>
            </div>

            {/* Galería de Contenido Existente */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Contenidos Activos ({profile.media.length})</span>
                </h3>
                <span className="text-[10px] text-zinc-400">
                  Toca la estrella para alternar entre Free y VIP Stars
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {profile.media.map((item, idx) => (
                  <div
                    key={item.id}
                    className="relative group aspect-square rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-md flex flex-col"
                  >
                    {item.type === 'video' ? (
                      <video
                        src={item.url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        loop
                      />
                    ) : (
                      <img
                        src={item.url}
                        alt={`Demo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Insignia Superior */}
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                      {item.isStarsLocked ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500 text-zinc-950 text-[10px] font-black shadow-md flex items-center gap-0.5">
                          ⭐ {item.starsPrice}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/90 text-white text-[10px] font-bold shadow-md">
                          FREE
                        </span>
                      )}
                      {item.type === 'video' && (
                        <span className="p-1 rounded-md bg-black/70 text-amber-300">
                          <Video className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    {/* Acciones flotantes */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                      <button
                        type="button"
                        onClick={() => handleToggleMediaLock(item.id)}
                        className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          item.isStarsLocked
                            ? 'bg-emerald-500 text-white'
                            : 'bg-amber-500 text-zinc-950'
                        }`}
                        title={item.isStarsLocked ? 'Convertir a Free' : 'Convertir a VIP Stars'}
                      >
                        <Star className="w-4 h-4 fill-current" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteMedia(item.id)}
                        className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs transition-all cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* PESTAÑA 2: PERFIL & ENLACES EXTERNOS */}
        {activeTab === 'perfil' && (
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="bg-zinc-950 p-4 sm:p-5 rounded-2xl border border-zinc-800 space-y-4">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" />
                <span>Datos Públicos de la Creadora / Modelo</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 mb-1 uppercase">
                    Nombre Artístico
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Valeria VIP"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 mb-1 uppercase">
                    Usuario Telegram
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ej. valeria_vip"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1 uppercase">
                  Biografía / Descripción del Perfil
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Fotos de Perfil y Portada Personalizables */}
              <div className="pt-2 border-t border-zinc-800 space-y-3">
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Personalizar Fotos del Perfil (Opcional - Reemplaza Siluetas Predeterminadas)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Avatar */}
                  <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-2">
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase">
                      Foto de Perfil (Avatar)
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 border border-amber-400/50 shrink-0">
                        <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            const dataUrl = await fileToDataUrl(f);
                            onUpdateProfile({ ...profile, avatarUrl: dataUrl });
                            showAlert('✅ Foto de perfil personalizada.');
                          }
                        }}
                        className="w-full text-xs text-zinc-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-zinc-800 file:text-amber-400 hover:file:bg-zinc-700 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Portada */}
                  <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-2">
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase">
                      Foto de Portada (Cover)
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-12 rounded-lg overflow-hidden bg-zinc-800 border border-amber-400/50 shrink-0">
                        <img src={profile.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            const dataUrl = await fileToDataUrl(f);
                            onUpdateProfile({ ...profile, coverUrl: dataUrl });
                            showAlert('✅ Foto de portada personalizada.');
                          }
                        }}
                        className="w-full text-xs text-zinc-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-zinc-800 file:text-amber-400 hover:file:bg-zinc-700 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Enlaces a OnlyFans, Fanvue, Fansly, etc. */}
              <div className="pt-2 border-t border-zinc-800 space-y-3">
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Enlaces Directos a Plataformas (OnlyFans, Fanvue, Instagram)</span>
                </h4>

                <div className="space-y-2">
                  {profile.links.map((link) => (
                    <div key={link.id} className="flex items-center gap-2 bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                      <span className="w-24 text-[11px] font-bold text-zinc-300 capitalize shrink-0">
                        {link.title}:
                      </span>
                      <input
                        type="text"
                        value="Tu link"
                        readOnly
                        disabled
                        title="Disponible solo en la versión completa"
                        className="flex-1 bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-1 text-xs text-zinc-500 italic cursor-not-allowed select-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleLinkChange(link.id, link.url, !link.is_active)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer shrink-0 ${
                          link.is_active
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        {link.is_active ? 'Activo' : 'Oculto'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-amber-500/20"
              >
                Guardar Cambios de Perfil
              </button>
            </div>
          </form>
        )}

        {/* PESTAÑA 3: MÉTODOS DE PAGO */}
        {activeTab === 'pagos' && (
          <div className="bg-zinc-950 p-4 sm:p-5 rounded-2xl border border-zinc-800 flex flex-col max-h-[70vh]">
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 shrink-0 pb-3 border-b border-zinc-800">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>Métodos de Pago Activos</span>
            </h3>

            <div className="space-y-3 overflow-y-auto pt-3 pr-1">
              {profile.paymentMethods.map((pm) => (
                <div key={pm.id} className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-white">{pm.title}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold">
                      Activo en Demo
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">{pm.description}</p>
                  {pm.image_url && (
                    <div className="pt-1">
                      <img src={pm.image_url} alt="QR" className="w-16 h-16 rounded-lg bg-white p-1" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Barra Inferior de Lanzamiento de Simuladores */}
      <div className="p-3.5 sm:p-5 border-t border-zinc-800 bg-zinc-950/90 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-zinc-400 hidden md:inline">
          🚀 Probar cómo se verá en vivo:
        </span>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onNavigateToView('miniapp')}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Ver Mini App</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToView('channel')}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ver Canal Telegram</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToView('bot')}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Ver Bot Telegram</span>
          </button>
        </div>
      </div>
    </div>
  );
};

