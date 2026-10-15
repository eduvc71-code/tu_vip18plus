import React, { useState } from 'react';
import { adminFetch } from '../../client/adminFetch';
import { isVideoUrl } from '../ProtectedMedia';
import {
  Sliders,
  CheckCircle2,
  Sparkles,
  Eye,
  Trash2,
  AlertTriangle,
  QrCode,
  Pin,
  Lock,
  Send,
  User,
  Clock,
  Webhook
} from 'lucide-react';

interface AdminTelegramTabProps {
  token: string | null;
  botUsername: string;
  channelId: string;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  fetchData: () => Promise<void> | void;
  setMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void;

  operatingMode: 'solo_bot' | 'bot_and_channel';
  setOperatingMode: (mode: 'solo_bot' | 'bot_and_channel') => void;
  botoneraMode: 'legacy' | 'direct';
  setBotoneraMode: (mode: 'legacy' | 'direct') => void;

  welcomeMediaUrl: string;
  setWelcomeMediaUrl: (url: string) => void;
  welcomeMediaType: 'photo' | 'video' | null;
  setWelcomeMediaType: (type: 'photo' | 'video' | null) => void;
  splashDescription: string;
  setSplashDescription: (desc: string) => void;
  setShowSplashPreview: (show: boolean) => void;

  modelDisplayName: string;
  setModelDisplayName: (name: string) => void;
  modelVipLink: string;
  setModelVipLink: (link: string) => void;
  newBotUsername: string;
  setNewBotUsername: (username: string) => void;
  adminContactUsername: string;
  setAdminContactUsername: (username: string) => void;
  autoReplyDelay: string;
  setAutoReplyDelay: (delay: string) => void;

  qrImageUrl: string;
  setQrImageUrl: (url: string) => void;

  pinnedMessageText: string;
  setPinnedMessageText: (text: string) => void;
  pinnedMessageActive: boolean;
  setPinnedMessageActive: (active: boolean) => void;

  channelIdInput: string;
  setChannelIdInput: (id: string) => void;
  channelVerified: boolean | null;
  setChannelVerified: (verified: boolean | null) => void;
  channelTitle: string;
  setChannelTitle: (title: string) => void;
  envChannelId: string;
}

export const AdminTelegramTab: React.FC<AdminTelegramTabProps> = ({
  token,
  botUsername,
  channelId,
  loading,
  setLoading,
  fetchData,
  setMessage,
  operatingMode,
  setOperatingMode,
  botoneraMode,
  setBotoneraMode,
  welcomeMediaUrl,
  setWelcomeMediaUrl,
  welcomeMediaType,
  setWelcomeMediaType,
  splashDescription,
  setSplashDescription,
  setShowSplashPreview,
  modelDisplayName,
  setModelDisplayName,
  modelVipLink,
  setModelVipLink,
  newBotUsername,
  setNewBotUsername,
  adminContactUsername,
  setAdminContactUsername,
  autoReplyDelay,
  setAutoReplyDelay,
  qrImageUrl,
  setQrImageUrl,
  pinnedMessageText,
  setPinnedMessageText,
  pinnedMessageActive,
  setPinnedMessageActive,
  channelIdInput,
  setChannelIdInput,
  channelVerified,
  setChannelVerified,
  channelTitle,
  setChannelTitle,
  envChannelId
}) => {
  const [updatingMode, setUpdatingMode] = useState(false);
  const [uploadingWelcomeMedia, setUploadingWelcomeMedia] = useState(false);
  const [savingSplashDescription, setSavingSplashDescription] = useState(false);
  const [verifyingChannel, setVerifyingChannel] = useState(false);

  const handleUpdateOperatingMode = async (newMode: 'solo_bot' | 'bot_and_channel') => {
    try {
      setUpdatingMode(true);
      setOperatingMode(newMode);
      const res = await adminFetch('/api/admin/settings', token, {
        method: 'POST',
        json: { operating_mode: newMode }
      });
      if (res.ok) {
        setMessage({
          type: 'success',
          text: newMode === 'solo_bot'
            ? 'Modo A: "Solo Bot (100% Privado)" activado con éxito'
            : 'Modo B: "Híbrido (Bot + Canal Free)" activado con éxito'
        });
      } else {
        setMessage({ type: 'error', text: 'Error al cambiar modo de operación' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión con el servidor' });
    } finally {
      setUpdatingMode(false);
    }
  };

  const handleToggleBotoneraMode = async (newMode: 'legacy' | 'direct') => {
    try {
      setBotoneraMode(newMode);
      await adminFetch('/api/admin/settings/botonera-mode', token, {
        method: 'POST',
        json: { mode: newMode }
      });
      setMessage({ type: 'success', text: `Modo de botonera: ${newMode === 'direct' ? '⚡ Directo (Solo Mensual)' : '📋 Tradicional (Completo)'}` });
    } catch {
      setMessage({ type: 'error', text: 'Error al cambiar el modo de la botonera' });
    }
  };

  const handleUploadWelcomeMedia = async (file: File) => {
    setUploadingWelcomeMedia(true);
    try {
      const fd = new FormData();
      fd.append('welcome_media', file);
      const res = await adminFetch('/api/admin/settings/welcome-media', token, {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWelcomeMediaUrl(data.welcome_media_url);
        setWelcomeMediaType(data.welcome_media_type);
        setMessage({ type: 'success', text: `Foto o Video de Bienvenida actualizado con éxito (${data.welcome_media_type})` });
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al subir multimedia de bienvenida' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al subir multimedia' });
    } finally {
      setUploadingWelcomeMedia(false);
    }
  };

  const handleDeleteWelcomeMedia = async () => {
    if (!window.confirm('¿Seguro que deseas eliminar la foto/video de bienvenida?')) return;
    try {
      const res = await adminFetch('/api/admin/settings/welcome-media', token, {
        method: 'DELETE'
      });
      if (res.ok) {
        setWelcomeMediaUrl('');
        setWelcomeMediaType(null);
        setMessage({ type: 'success', text: 'Foto/video de bienvenida eliminado' });
        fetchData();
      } else {
        setMessage({ type: 'error', text: 'Error al eliminar multimedia' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de red' });
    }
  };

  const handleSaveSplashDescription = async () => {
    setSavingSplashDescription(true);
    try {
      const res = await adminFetch('/api/admin/settings', token, {
        method: 'POST',
        json: { splash_description: splashDescription }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: '✅ Descripción de la Pantalla de Inicio / Splash guardada con éxito' });
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar descripción del Splash' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de red al guardar descripción' });
    } finally {
      setSavingSplashDescription(false);
    }
  };

  const handleSaveSettings = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/settings', token, {
        method: 'POST',
        json: {
          bot_username: newBotUsername,
          admin_contact_username: adminContactUsername,
          channel_id: channelIdInput,
          telegram_only_access: true,
          auto_reply_delay_minutes: autoReplyDelay,
          model_display_name: modelDisplayName,
          model_vip_link: modelVipLink
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'Configuración de Telegram y privacidad guardada.' });
        if (data.bot_username) setNewBotUsername(data.bot_username);
        if (data.admin_contact_username) setAdminContactUsername(data.admin_contact_username);
        if (data.auto_reply_delay_minutes !== undefined) setAutoReplyDelay(String(data.auto_reply_delay_minutes));
        if (data.model_display_name !== undefined) setModelDisplayName(data.model_display_name || '');
        if (data.model_vip_link !== undefined) setModelVipLink(data.model_vip_link || '');
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar configuración' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al guardar configuración' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndTestChannel = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (!channelIdInput.trim()) {
      setMessage({ type: 'error', text: 'Por favor ingresa un ID numérico (-100...) o @usuario del canal.' });
      return;
    }
    setVerifyingChannel(true);
    setMessage(null);
    try {
      const res = await adminFetch('/api/admin/settings/channel', token, {
        method: 'POST',
        json: { channel_id: channelIdInput.trim() }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChannelVerified(true);
        setChannelTitle(data.channel_title || '');
        setChannelIdInput(data.channel_id);
        setMessage({
          type: 'success',
          text: `🎉 ¡Canal "${data.channel_title || data.channel_id}" verificado y vinculado exitosamente! Ahora el bot puede publicar fotos y novedades en él.`
        });
        fetchData();
      } else {
        setChannelVerified(false);
        setMessage({
          type: 'error',
          text: data.error || 'No se pudo conectar con el canal. Asegúrate de que el bot sea Administrador con permiso de publicar mensajes.'
        });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error al conectar con el servidor.' });
    } finally {
      setVerifyingChannel(false);
    }
  };

  const handleRegisterWebhook = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/webhook/setup', token, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Webhook registrado correctamente en Telegram: ${data.webhook_url}` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al registrar webhook' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error al registrar webhook' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-xs">
      {/* SELECTOR MODO DE OPERACIÓN: MODO A (SOLO BOT) / MODO B (HÍBRIDO BOT + CANAL) */}
      <div className="p-5 bg-linear-to-br from-zinc-900 to-zinc-950 border-2 border-amber-500/30 rounded-2xl space-y-4 shadow-xl shadow-black/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-800">
          <div>
            <h4 className="text-base font-extrabold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" /> Modo de Operación del Sistema
            </h4>
            <p className="text-zinc-400 text-xs mt-0.5">
              Elige cómo deseas que opere el sistema al publicar y recibir clientes
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 w-fit">
            {operatingMode === 'solo_bot' ? '🤖 Modo A Activo' : '📢 Modo B Activo'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {/* BOTÓN MODO A: SOLO BOT */}
          <button
            type="button"
            disabled={updatingMode}
            onClick={() => handleUpdateOperatingMode('solo_bot')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
              operatingMode === 'solo_bot'
                ? 'bg-amber-500/15 border-amber-500 shadow-lg shadow-amber-500/10'
                : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-white flex items-center gap-2">
                🤖 Modo A: "Solo Bot"
              </span>
              {operatingMode === 'solo_bot' && (
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
              )}
            </div>
            <p className="text-amber-300/90 text-[11px] font-bold mt-1">100% Privado y Confidencial</p>
            <ul className="mt-2.5 space-y-1.5 text-[11px] text-zinc-400">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> Publica directamente a la Mini App.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> Todo visitante se registra automáticamente como suscriptor.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> Cero publicaciones ni reportes en canales públicos.
              </li>
            </ul>
          </button>

          {/* BOTÓN MODO B: HÍBRIDO BOT + CANAL */}
          <button
            type="button"
            disabled={updatingMode}
            onClick={() => handleUpdateOperatingMode('bot_and_channel')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
              operatingMode === 'bot_and_channel'
                ? 'bg-amber-500/15 border-amber-500 shadow-lg shadow-amber-500/10'
                : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-white flex items-center gap-2">
                📢 Modo B: "Híbrido"
              </span>
              {operatingMode === 'bot_and_channel' && (
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
              )}
            </div>
            <p className="text-amber-300/90 text-[11px] font-bold mt-1">Bot + Canal Free (Vitrina)</p>
            <ul className="mt-2.5 space-y-1.5 text-[11px] text-zinc-400">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> Publica en la Mini App y envía preview al Canal Free.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> Los botones del Canal abren la Mini App directamente en Telegram.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> Permite difusión masiva y viralidad en Telegram.
              </li>
            </ul>
          </button>
        </div>
      </div>

      {/* SELECTOR DE MODO DE BOTONERA */}
      <div className="p-5 bg-linear-to-br from-zinc-900 to-zinc-950 border-2 border-amber-500/30 rounded-2xl space-y-4 shadow-xl shadow-black/40">
        <div>
          <h4 className="text-base font-extrabold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" /> Modo de Botonera en Telegram
          </h4>
          <p className="text-zinc-400 text-xs mt-0.5">
            Elige cómo verán los clientes el menú de planes al tocar "Suscripción Automática".
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          <button
            type="button"
            onClick={() => handleToggleBotoneraMode('legacy')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
              botoneraMode === 'legacy'
                ? 'bg-amber-500/15 border-amber-500 shadow-lg shadow-amber-500/10'
                : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-white">📋 Tradicional (Completo)</span>
              {botoneraMode === 'legacy' && <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />}
            </div>
            <p className="text-amber-300/90 text-[11px] font-bold mt-1">Planes: Mensual, 6 Meses, Permanente</p>
            <p className="text-[11px] text-zinc-400 mt-2">Mantiene la botonera compleja con múltiples pasos y países.</p>
          </button>

          <button
            type="button"
            onClick={() => handleToggleBotoneraMode('direct')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
              botoneraMode === 'direct'
                ? 'bg-emerald-500/15 border-emerald-500 shadow-lg shadow-emerald-500/10'
                : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-white">⚡ Directo (Solo Mensual)</span>
              {botoneraMode === 'direct' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            </div>
            <p className="text-emerald-300/90 text-[11px] font-bold mt-1">Planes: Solo Mensual</p>
            <p className="text-[11px] text-zinc-400 mt-2">Menú rápido de 3 botones: Ver Exclusivo, Pagos, Otros Países.</p>
          </button>
        </div>
      </div>

      {/* PANTALLA DE INICIO / SPLASH PREVIEW & BIENVENIDA */}
      <div className="p-5 bg-linear-to-br from-amber-500/10 via-zinc-950 to-zinc-950 border-2 border-amber-500/40 rounded-2xl space-y-4 shadow-lg shadow-amber-500/5">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-extrabold text-amber-400 flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> Pantalla de Inicio / Splash Preview & Bienvenida
          </h4>
          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
            Mini App y Bot
          </span>
        </div>
        <p className="text-zinc-300 text-xs leading-relaxed">
          Sube una foto o video y edita la descripción. Esta pantalla se mostrará como <strong>vista previa obligatoria de inicio</strong> a todos los usuarios (nuevos y suscriptores) al ingresar a la Mini App.
        </p>

        {/* Vista Previa del Archivo Multimedia Actual */}
        {welcomeMediaUrl ? (
          <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl">
            {welcomeMediaType === 'video' || isVideoUrl(welcomeMediaUrl) ? (
              <video src={welcomeMediaUrl} controls className="w-32 h-32 object-cover rounded-xl bg-black shadow-md" />
            ) : (
              <img src={welcomeMediaUrl} alt="Splash Screen" className="w-32 h-32 object-cover rounded-xl shadow-md" />
            )}
            <div className="space-y-2 text-xs flex-1">
              <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Multimedia del Splash activo ({welcomeMediaType || 'foto'})
              </p>
              <p className="text-zinc-400">Este archivo se muestra en la pantalla de inicio y se envía en el bot.</p>
              <p className="text-zinc-500 text-[10px] font-mono break-all">{welcomeMediaUrl}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSplashPreview(true)}
                  className="py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5" /> Ver Vista Previa
                </button>
                <button
                  type="button"
                  onClick={handleDeleteWelcomeMedia}
                  className="py-1.5 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar Archivo
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs font-semibold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Aún no has subido una foto o video para el Splash de Inicio.</span>
            </div>
            <button
              type="button"
              onClick={() => setShowSplashPreview(true)}
              className="py-1 px-2.5 rounded-lg bg-zinc-900 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-[11px] font-bold cursor-pointer active:scale-95"
            >
              Ver Diseño Base
            </button>
          </div>
        )}

        {/* Carga de Nuevo Archivo para Splash */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
            <span>Subir Foto o Video para el Splash:</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*,video/*"
              disabled={uploadingWelcomeMedia}
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleUploadWelcomeMedia(e.target.files[0]);
                }
              }}
              className="text-xs text-zinc-400 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-zinc-950 hover:file:bg-amber-400 cursor-pointer w-full sm:w-auto"
            />
            {uploadingWelcomeMedia && (
              <span className="text-xs text-amber-400 font-bold animate-pulse">Subiendo al Servidor...</span>
            )}
          </div>
        </div>

        {/* Edición de la Descripción del Splash */}
        <div className="space-y-2 pt-2 border-t border-zinc-800/80">
          <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
            <span>Descripción / Mensaje de Bienvenida del Splash:</span>
            <span className="text-[10px] text-zinc-500 font-normal">Editable</span>
          </label>
          <textarea
            value={splashDescription}
            onChange={(e) => setSplashDescription(e.target.value)}
            placeholder="Ej: Bienvenido a mi espacio exclusivo y confidencial. Disfruta de material único y de alta calidad (+18)."
            rows={3}
            className="w-full rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleSaveSplashDescription}
              disabled={savingSplashDescription}
              className="py-2 px-4 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold text-xs tracking-wide shadow-md cursor-pointer disabled:opacity-50 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{savingSplashDescription ? 'Guardando...' : 'Guardar Descripción del Splash'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* QR COMISIÓN */}
      <div className="p-5 bg-linear-to-br from-amber-500/10 via-zinc-950 to-zinc-950 border-2 border-amber-500/40 rounded-2xl space-y-4 shadow-lg shadow-amber-500/5">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-extrabold text-amber-400 flex items-center gap-2">
            <QrCode className="w-5 h-5" /> Imagen QR de Suscripción VIP
          </h4>
          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
            Para Bot y Admin
          </span>
        </div>
        <p className="text-zinc-300 text-xs leading-relaxed">
          Sube aquí la fotografía de tu código QR. El bot la enviará automáticamente o tú puedes usarla con el comando <code className="text-amber-400 font-mono font-bold bg-zinc-900 px-1.5 py-0.5 rounded">/qr ID_CLIENTE</code>.
        </p>

        {qrImageUrl ? (
          <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl">
            <img src={qrImageUrl} alt="QR Pago VIP Oficial" className="w-28 h-28 object-contain bg-white rounded-lg p-1.5 shadow-md" />
            <div className="space-y-1 text-xs">
              <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Imagen QR cargada en el servidor
              </p>
              <p className="text-zinc-400">Esta es la imagen que el sistema enviará a los clientes.</p>
              <p className="text-zinc-500 text-[11px] font-mono break-all">{qrImageUrl}</p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Aún no has subido una imagen QR.
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            if (!e.target.files?.[0]) return;
            const file = e.target.files[0];
            const fd = new FormData();
            fd.append('qr_image', file);
            try {
              setLoading(true);
              const res = await adminFetch('/api/admin/settings/qr', token, { method: 'POST', body: fd });
              if (res.ok) {
                const data = await res.json();
                if (data.qr_image_url) setQrImageUrl(data.qr_image_url);
                setMessage({ type: 'success', text: 'Imagen QR de Pago VIP subida correctamente' });
              } else {
                setMessage({ type: 'error', text: 'Error al guardar imagen QR' });
              }
            } catch {
              setMessage({ type: 'error', text: 'Error en red al subir QR' });
            } finally {
              setLoading(false);
            }
          }}
          className="text-xs text-zinc-400 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-zinc-950 hover:file:bg-amber-400 cursor-pointer w-full sm:w-auto"
        />
      </div>

      {/* MENSAJE FIJADO */}
      <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Pin className="w-4 h-4 text-amber-400" /> Mensaje Fijado en el Canal VIP Free
          </h4>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-zinc-400 font-medium">Estado:</span>
            <input
              type="checkbox"
              checked={pinnedMessageActive}
              onChange={(e) => setPinnedMessageActive(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
            />
            <span className={`text-xs font-bold ${pinnedMessageActive ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {pinnedMessageActive ? 'ACTIVADO' : 'DESACTIVADO'}
            </span>
          </label>
        </div>
        <p className="text-zinc-400 text-xs">
          Fija un anuncio que permanecerá visible en la parte superior del Canal VIP Free.
        </p>
        <textarea
          rows={2}
          value={pinnedMessageText}
          onChange={(e) => setPinnedMessageText(e.target.value)}
          placeholder="Ej: 🔥 Nuevo contenido disponible - Consultas directas al bot..."
          className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
        />
        <div className="flex justify-end">
          <button
            onClick={async () => {
              try {
                setLoading(true);
                const res = await adminFetch('/api/admin/settings/pinned', token, {
                  method: 'POST',
                  json: { pinned_message_text: pinnedMessageText, pinned_message_active: pinnedMessageActive }
                });
                if (res.ok) {
                  setMessage({ type: 'success', text: 'Mensaje fijado actualizado correctamente en el Canal VIP Free' });
                } else {
                  setMessage({ type: 'error', text: 'Error al guardar mensaje fijado' });
                }
              } catch {
                setMessage({ type: 'error', text: 'Error al conectar con el servidor' });
              } finally {
                setLoading(false);
              }
            }}
            className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold transition-all cursor-pointer"
          >
            Guardar Mensaje Fijado
          </button>
        </div>
      </div>

      {/* MODO PRIVADO */}
      <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              Modo Privado: Acceso Exclusivo desde Telegram
            </h4>
            <p className="text-zinc-400 text-xs mt-1">
              Al activar, la web estará bloqueada para visitantes generales. Solo usuarios de Telegram (@{newBotUsername || 'bot'}) podrán acceder.
            </p>
          </div>
          <span className="shrink-0 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-zinc-950 shadow-md shadow-emerald-500/20">
            SOLO TELEGRAM
          </span>
        </div>
      </div>

      {/* PERSONALIZACIÓN DE LA MINI APP */}
      <form onSubmit={handleSaveSettings} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Send className="w-4 h-4 text-amber-400" /> Personalización de la Mini App
        </h4>
        <p className="text-zinc-400">
          Ajusta el nombre que verán tus clientes y el enlace a tu red social o plataforma de contenido.
        </p>

        <div className="space-y-2">
          <label className="block text-zinc-400 font-semibold">Nombre / Alias para la Mini App</label>
          <input
            type="text"
            value={modelDisplayName}
            onChange={(e) => setModelDisplayName(e.target.value)}
            placeholder="Ej: IAM Danii 🧚‍♀️"
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-zinc-400 font-semibold">Red social / plataforma (OnlyFans, Instagram u otra)</label>
          <input
            type="url"
            value={modelVipLink}
            onChange={(e) => setModelVipLink(e.target.value)}
            placeholder="https://"
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="py-2 px-4 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl transition-all cursor-pointer shrink-0 disabled:opacity-60"
        >
          Guardar Personalización
        </button>
      </form>

      {/* BOT USERNAME */}
      <form onSubmit={handleSaveSettings} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Send className="w-4 h-4 text-amber-400" /> Nombre de Usuario del Bot en Telegram
        </h4>
        <p className="text-zinc-400">
          Username oficial del Bot sin @. Los enlaces de la Mini App y el canal redirigirán a este bot.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-zinc-500 font-bold text-xs">@</span>
            <input
              type="text"
              value={newBotUsername.replace(/^@/, '')}
              onChange={(e) => setNewBotUsername(e.target.value)}
              placeholder="Ej. Danii_Catalogo_SCZ_bot"
              className="w-full pl-7 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="py-2 px-4 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl transition-all cursor-pointer shrink-0 disabled:opacity-60"
          >
            Guardar
          </button>
        </div>
      </form>

      {/* ADMIN TELEGRAM USERNAME */}
      <form onSubmit={handleSaveSettings} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-amber-400" /> Usuario de Telegram de la Administradora (@usuario)
        </h4>
        <p className="text-zinc-400">
          Usuario de Telegram (@usuario) que los clientes verán en todos los métodos de pago para enviar comprobantes de transferencia de forma directa y privada.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-zinc-500 font-bold text-xs">@</span>
            <input
              type="text"
              value={adminContactUsername.replace(/^@/, '')}
              onChange={(e) => setAdminContactUsername(e.target.value)}
              placeholder="Ej. mi_usuario_telegram"
              className="w-full pl-7 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="py-2 px-4 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl transition-all cursor-pointer shrink-0 disabled:opacity-60"
          >
            Guardar
          </button>
        </div>
      </form>

      {/* AUTO REPLY DELAY */}
      <form onSubmit={handleSaveSettings} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" /> Tiempo de Respuesta Automática del Bot
        </h4>
        <p className="text-zinc-400">
          Si la Administradora tarda más de estos minutos en responder, el bot enviará un mensaje de seguimiento amable al cliente.
        </p>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min="1"
            max="1440"
            value={autoReplyDelay}
            onChange={(e) => setAutoReplyDelay(e.target.value)}
            placeholder="10"
            className="w-28 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-500 transition-colors"
          />
          <span className="text-zinc-400 font-bold">minutos</span>
          <button
            type="submit"
            disabled={loading}
            className="ml-auto py-2 px-4 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl transition-all cursor-pointer shrink-0 disabled:opacity-60"
          >
            Guardar
          </button>
        </div>
      </form>

      {/* VINCULACIÓN DE CANAL TELEGRAM */}
      <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-amber-400" />
              Canal VIP Oficial de Telegram (Publicación y Novedades)
            </h4>
            <p className="text-zinc-400 text-xs mt-0.5">
              El bot publicará aquí tus publicaciones y fotos. Las reacciones nativas se configuran desde Telegram.
            </p>
          </div>
          {channelVerified === true && (
            <span className="shrink-0 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
              <CheckCircle2 className="w-3.5 h-3.5" /> Conectado {channelTitle ? `(${channelTitle})` : ''}
            </span>
          )}
          {channelVerified === false && (
            <span className="shrink-0 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
              <AlertTriangle className="w-3.5 h-3.5" /> No Conectado
            </span>
          )}
        </div>

        <form onSubmit={handleSaveAndTestChannel} className="space-y-3">
          <label className="block text-zinc-300 font-semibold text-xs">
            ID Numérico (-100...) o @Usuario de tu Canal
          </label>
          <input
            type="text"
            value={channelIdInput}
            onChange={(e) => setChannelIdInput(e.target.value)}
            placeholder="Ej: @vip_iam_danii o -1004356066811"
            className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-500 transition-colors"
          />
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={verifyingChannel || loading || !channelIdInput.trim()}
              className="py-2.5 px-5 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-extrabold text-xs transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {verifyingChannel ? 'Verificando y Vinculando Canal...' : 'Vincular y Probar Canal'}
            </button>

            {envChannelId && envChannelId !== channelIdInput && (
              <button
                type="button"
                onClick={() => setChannelIdInput(envChannelId)}
                className="py-2 px-3 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="Cargar valor configurado en el archivo .env"
              >
                Usar .env ({envChannelId})
              </button>
            )}
          </div>
        </form>

        {/* Guía rápida para el administrador */}
        <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800/80 space-y-2 text-[11px] text-zinc-400">
          <p className="font-bold text-zinc-300 text-xs">💡 ¿Cómo vincular tu canal fácilmente?</p>
          <ol className="list-decimal list-inside space-y-1.5 text-zinc-400">
            <li>
              Abre tu canal en Telegram ➡️  Ajustes del canal ➡️  <strong className="text-zinc-200">Administradores</strong> ➡️  <strong className="text-zinc-200">Añadir Administrador</strong>.
            </li>
            <li>
              Busca a <code className="text-amber-400 font-bold bg-zinc-950 px-1.5 py-0.5 rounded">@{newBotUsername || 'Danii_Catalogo_SCZ_bot'}</code> y dale permiso para <strong className="text-zinc-200">Publicar mensajes</strong>.
            </li>
            <li>
              <strong className="text-amber-400">Detección Automática:</strong> Al añadir el bot como admin en el canal, ¡se vinculará automáticamente! También puedes escribir arriba el nombre (@MiCanal) o reenviar cualquier post del canal al bot por privado.
            </li>
          </ol>
        </div>
      </div>

      {/* WEBHOOK */}
      <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Webhook className="w-4 h-4 text-blue-400" /> Configuración de Webhook
        </h4>
        <p className="text-zinc-400">
          El bot sincroniza automáticamente con el canal <code className="text-amber-400">{channelIdInput || channelId}</code>.
        </p>
        <button
          type="button"
          onClick={handleRegisterWebhook}
          disabled={loading}
          className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 disabled:opacity-60"
        >
          <Webhook className="w-4 h-4" />
          Registrar / Refrescar Webhook en Telegram API
        </button>
      </div>
    </div>
  );
};

