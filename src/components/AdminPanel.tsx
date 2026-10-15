import React, { useState, useEffect } from 'react';
import { B2Manager, SubscribersManager } from './B2Manager';
import { AdminButtonsTab } from './admin/AdminButtonsTab';
import { AdminPollsTab } from './admin/AdminPollsTab';
import { AdminRequestsTab } from './admin/AdminRequestsTab';
import { AdminPaymentsTab } from './admin/AdminPaymentsTab';
import { AdminAuditTab } from './admin/AdminAuditTab';
import { AdminTelegramTab } from './admin/AdminTelegramTab';
import { AdminProfilesTab } from './admin/AdminProfilesTab';
import { EmojiPackManager } from './EmojiPackManager';
import { Cloud, Smile } from 'lucide-react';
import { Profile, CustomerRequest, AuditLog, SyncErrorLog, CustomButton, DynamicPoll, PaymentMethod, BotMediaItem, BotMediaCategory, AuditedB2Media, AuditedGalleryMedia } from '../types';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { isVideoUrl } from './ProtectedMedia';
import { SplashScreen } from './SplashScreen';
import {
  X,
  Lock,
  Plus,
  Edit,
  Trash2,
  Upload,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  User,
  Users,
  Clock,
  Eye,
  EyeOff,
  Activity,
  LogOut,
  QrCode,
  Inbox,
  Banknote,
  Pin,
  Webhook,
  MessageSquare,
  Flame,
  Sparkles,
  HardDrive,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  BarChart2,
  ExternalLink,
  Sliders,
  CreditCard,
  Star,
  Bot,
  RotateCcw,
  Save,
  HelpCircle,
  Heart,
  Download,
  Smartphone
} from 'lucide-react';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  botUsername: string;
  channelId: string;
}

type AdminTab = 'profiles' | 'requests' | 'payments' | 'buttons' | 'polls' | 'emojis' | 'telegram' | 'subscribers' | 'audit' | 'b2';

export function getPaymentMethodFlag(method: PaymentMethod | string): string {
  const title = typeof method === 'string' ? method : (method.title || '');
  const id = typeof method === 'string' ? method : (method.id || '');
  const lower = `${title} ${id}`.toLowerCase();

  const flagMatch = title.match(/^(\p{Regional_Indicator}{2}|\p{Emoji})/u);
  if (flagMatch && !/^[A-Z0-9]/i.test(flagMatch[0])) {
    return flagMatch[0];
  }

  if (lower.includes('bolivia') || /\bbo\b/i.test(lower)) return '🇧🇴';
  if (lower.includes('peru') || lower.includes('perú') || /\bpe\b/i.test(lower)) return '🇵🇪';
  if (lower.includes('chile') || /\bcl\b/i.test(lower)) return '🇨🇱';
  if (lower.includes('argentina') || /\bar\b/i.test(lower)) return '🇦🇷';
  if (lower.includes('espana') || lower.includes('españa') || lower.includes('spain') || /\bes\b/i.test(lower)) return '🇪🇸';
  if (lower.includes('mexico') || lower.includes('méxico') || /\bmx\b/i.test(lower)) return '🇲🇽';
  if (lower.includes('paraguay') || /\bpy\b/i.test(lower)) return '🇵🇾';
  if (lower.includes('brasil') || lower.includes('brazil') || /\bbr\b/i.test(lower)) return '🇧🇷';
  if (lower.includes('uruguay') || /\buy\b/i.test(lower)) return '🇺🇾';
  if (lower.includes('colombia') || /\bco\b/i.test(lower)) return '🇨🇴';
  if (lower.includes('rusia') || lower.includes('russia') || /\bru\b/i.test(lower)) return '🇷🇺';
  if (lower.includes('ecuador') || /\bec\b/i.test(lower)) return '🇪🇨';
  if (lower.includes('venezuela') || /\bve\b/i.test(lower)) return '🇻🇪';
  if (lower.includes('zelle') || lower.includes('estados unidos') || lower.includes('usa') || /\bus\b/i.test(lower)) return '🇺🇸';
  if (lower.includes('cripto') || lower.includes('usdt') || lower.includes('bitcoin') || lower.includes('binance')) return '🪙';
  if (lower.includes('paypal')) return '💸';
  if (lower.includes('estrella') || lower.includes('stars')) return '⭐';
  if (lower.includes('tigo')) return '☎️';
  if (lower.includes('western') || lower.includes('remitly') || lower.includes('moneygram')) return '🌐';

  return '💳';
}

export function getCleanPaymentTitle(method: PaymentMethod): string {
  const rawTitle = method.title || '';
  return rawTitle
    .replace(/^([A-Z]{2}\s*[-–:]\s*)/i, '')
    .replace(/^(\p{Regional_Indicator}{2}|\p{Emoji})\s*/u, '')
    .trim();
}

interface AdminHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
}

type HelpSection = {
  color: string; bg: string; border: string; icon: string; title: string;
  steps: { icon: string; label: string; text: string }[];
};

const TAB_HELP: Record<string, { headline: string; sub: string; badge: string; badgeColor: string; sections: HelpSection[] }> = {
  profiles: {
    headline: 'Perfil & Galería', sub: 'Configura, publica y monetiza tu contenido',
    badge: '📁 PERFILES', badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    sections: [
      { color: 'text-sky-300', bg: 'bg-sky-500/10', border: 'border-sky-500/30', icon: '1️⃣', title: 'Datos del Perfil',
        steps: [
          { icon: '✍️', label: 'Nombre artístico, edad y zona', text: 'Completa todos los campos básicos de identidad.' },
          { icon: '⚠️', label: 'Descripción (obligatoria)', text: 'Aparecerá como mensaje en el Canal VIP y en la Mini App. Sin descripción, el post no se publicará correctamente.' },
          { icon: '➡️', label: 'Continuar', text: 'Toca el botón para pasar a la galería de medios.' },
        ] },
      { color: 'text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-500/30', icon: '2️⃣', title: 'Galería de Fotos y Videos',
        steps: [
          { icon: '📤', label: 'Subir archivos', text: 'Selecciona fotos o videos desde tu galería. Se guardan al instante en el servidor.' },
          { icon: '⭐️', label: 'Poner como Portada', text: 'La foto marcada como portada es la imagen principal que verán tus clientes en el catálogo.' },
          { icon: '🗑️', label: 'Borrar del Servidor', text: 'Elimina definitivamente de la nube (B2) y de la base de datos. Esta acción no se puede deshacer.' },
        ] },
      { color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: '3️⃣', title: 'Publicar Gratis en el Canal',
        steps: [
          { icon: '📢', label: 'Publicar Ahora', text: 'Toca "🚀 Todo Listo: Publicar Ahora". El contenido se publica visible y gratuito en el Canal VIP Free de Telegram.' },
          { icon: '🔥', label: 'Botón interactivo automático', text: 'El post incluye el botón "Ver lo Exclusivo 🔥" para atraer nuevos suscriptores a la Mini App.' },
        ] },
      { color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: '4️⃣', title: 'Publicar de Pago (Telegram Stars ⭐️)',
        steps: [
          { icon: '⭐️', label: 'Tocar "Publicar con Estrellas"', text: 'Disponible en la vista ampliada de cada foto o video.' },
          { icon: '💰', label: 'Elegir precio', text: 'Selecciona: 10 / 25 / 50 / 100 / 250 Estrellas, o escribe cualquier valor entre 1 y 2500.' },
          { icon: '✍️', label: 'Descripción de venta', text: 'Escribe un texto visible aunque la foto esté bloqueada. Ej: "🔥 Desbloquea este exclusivo..."' },
          { icon: '🔒', label: 'Publicar', text: 'El contenido aparece desenfocado en el Canal. El cliente paga y el bot entrega el acceso al instante.' },
        ] },
    ],
  },
  requests: {
    headline: 'Solicitudes de Clientes', sub: 'Gestiona y responde a quienes piden disponibilidad',
    badge: '📩 SOLICITUDES', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    sections: [
      { color: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: '📋', title: 'Ver Solicitudes Pendientes',
        steps: [
          { icon: '👤', label: 'Datos del cliente', text: 'Cada tarjeta muestra nombre, ID de Telegram y el mensaje que el cliente te envió.' },
          { icon: '🔴', label: 'No atendidas', text: 'Las solicitudes sin responder aparecen resaltadas. Atiéndelas a la brevedad.' },
        ] },
      { color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: '💬', title: 'Responder al Cliente',
        steps: [
          { icon: '↗️', label: 'Botón Responder', text: 'Abre directamente el chat privado con ese cliente en Telegram.' },
          { icon: '✅', label: 'Marcar como Atendida', text: 'Cambia el estado a "atendida" para mantener tu lista limpia y organizada.' },
        ] },
    ],
  },
  payments: {
    headline: 'Métodos de Pago', sub: 'Configura cómo tus clientes te pagan',
    badge: '💳 PAGOS', badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    sections: [
      { color: 'text-pink-300', bg: 'bg-pink-500/10', border: 'border-pink-500/30', icon: '➕', title: 'Agregar Método de Pago',
        steps: [
          { icon: '📝', label: 'Nombre del método', text: 'Ej: "Transferencia Bancaria", "QR Tigo Money", "Efectivo", etc.' },
          { icon: '🖼️', label: 'Imagen del QR (opcional)', text: 'Sube la imagen de tu código QR para que el cliente la vea al elegir ese método.' },
          { icon: '✅', label: 'Activar / Desactivar', text: 'Usa el interruptor para mostrar u ocultar cada método sin eliminarlo.' },
        ] },
      { color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: '📢', title: 'Publicar en el Canal',
        steps: [
          { icon: '🚀', label: 'Publicar Menú en Canal', text: 'Envía al Canal VIP un mensaje interactivo con todos tus métodos de pago activos.' },
          { icon: '💬', label: 'Comando /pagos', text: 'Los clientes escriben /pagos al bot y reciben la lista de métodos activos en privado.' },
        ] },
    ],
  },
  buttons: {
    headline: 'Botones Personalizados', sub: 'Crea accesos directos visibles en la Mini App para tus clientes',
    badge: '🔘 BOTONES', badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    sections: [
      { color: 'text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-500/30', icon: '✏️', title: 'Crear un Botón',
        steps: [
          { icon: '🏷️', label: 'Nombre visible', text: 'Escribe el texto que verá el cliente. Ej: "📺 Ver Canal VIP", "💎 Contenido Exclusivo".' },
          { icon: '🔗', label: 'Enlace de destino', text: 'Pega la URL: Telegram, WhatsApp, Instagram, tu canal privado, etc.' },
          { icon: '🟢', label: 'Activar', text: 'Activa el botón y aparecerá de inmediato en la pantalla principal de la Mini App.' },
        ] },
      { color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: '💡', title: 'Ideas de Uso',
        steps: [
          { icon: '🎁', label: 'Promociones especiales', text: 'Crea un botón temporal con enlace a un descuento o evento de fecha límite.' },
          { icon: '🔒', label: 'Canal privado VIP', text: 'Dirige a los clientes que ya pagaron directamente a tu canal privado.' },
          { icon: '📞', label: 'Contacto directo', text: 'Pon un botón de WhatsApp o Telegram para que te contacten sin buscar tu usuario.' },
        ] },
    ],
  },
  polls: {
    headline: 'Encuestas y Dinámicas', sub: 'Interactúa con tus clientes y conoce sus preferencias',
    badge: '📊 ENCUESTAS', badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    sections: [
      { color: 'text-teal-300', bg: 'bg-teal-500/10', border: 'border-teal-500/30', icon: '✏️', title: 'Crear una Encuesta',
        steps: [
          { icon: '❓', label: 'Pregunta principal', text: 'Ej: "¿Qué tipo de contenido quieres ver esta semana?"' },
          { icon: '🔢', label: 'Opciones de respuesta', text: 'Agrega entre 2 y 5 opciones. Los clientes solo pueden elegir una.' },
          { icon: '🟢', label: 'Activar la encuesta', text: 'Al activarla, aparece en la Mini App para todos los clientes de inmediato.' },
        ] },
      { color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: '📈', title: 'Ver Resultados',
        steps: [
          { icon: '🔄', label: 'Tiempo real', text: 'Los votos se actualizan automáticamente. No necesitas recargar.' },
          { icon: '🏆', label: 'Opción ganadora', text: 'La opción con más votos se resalta para identificar rápido la preferencia.' },
          { icon: '🗑️', label: 'Eliminar encuesta', text: 'Cuando ya no la necesites, bórrala y desaparecerá de la Mini App.' },
        ] },
    ],
  },
  telegram: {
    headline: 'Configuración de Telegram', sub: 'Bot, canal y anuncios fijados',
    badge: '⚙️ TELEGRAM', badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    sections: [
      { color: 'text-sky-300', bg: 'bg-sky-500/10', border: 'border-sky-500/30', icon: '🤖', title: 'Modo de Operación',
        steps: [
          { icon: '🤖', label: 'Modo A — Solo Bot', text: 'El bot responde en chat privado. No publica en canal. Ideal para máxima privacidad.' },
          { icon: '📢', label: 'Modo B — Híbrido (Bot + Canal)', text: 'El bot publica en tu Canal VIP Free Y responde en privado. Máximo alcance y visibilidad.' },
        ] },
      { color: 'text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-500/30', icon: '📌', title: 'Anuncio Fijado en el Canal',
        steps: [
          { icon: '✍️', label: 'Texto del anuncio', text: 'Escribe el mensaje que permanecerá fijo en la parte superior del Canal VIP Free.' },
          { icon: '🟢', label: 'Activar / Desactivar', text: 'Usa el interruptor para mostrar u ocultar el anuncio sin perder el texto guardado.' },
        ] },
    ],
  },
  audit: {
    headline: 'Registro de Auditoría', sub: 'Historial completo de todas las acciones en el sistema',
    badge: '🔒 AUDITORÍA', badgeColor: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
    sections: [
      { color: 'text-zinc-200', bg: 'bg-zinc-800/50', border: 'border-zinc-700', icon: '📋', title: 'Leer el Registro',
        steps: [
          { icon: '📅', label: 'Fecha y hora exacta', text: 'Cada fila muestra cuándo ocurrió la acción con precisión de segundos.' },
          { icon: '👤', label: 'Quién lo hizo', text: 'Muestra el ID de Telegram o nombre del administrador que ejecutó la acción.' },
          { icon: '🎯', label: 'Qué se hizo', text: 'Tipo de evento: UPLOAD_MEDIA, DELETE_MEDIA, SYNC_DB_B2, PUBLISH_CHANNEL, etc.' },
        ] },
      { color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: '🛡️', title: 'Para qué sirve',
        steps: [
          { icon: '🔐', label: 'Seguridad', text: 'Detecta si alguien accedió o modificó algo sin tu autorización.' },
          { icon: '🐛', label: 'Diagnóstico', text: 'Si algo falla o desaparece, el registro muestra exactamente cuándo y qué cambió.' },
          { icon: '✅', label: 'Tranquilidad total', text: 'Tienes trazabilidad completa de cada operación en tu catálogo y bóveda.' },
        ] },
    ],
  },
  b2: {
    headline: 'Bodega B2 — Tu Bóveda en la Nube', sub: 'Gestión directa de todos tus archivos en Backblaze B2',
    badge: '🗄️ BODEGA B2', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    sections: [
      { color: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: '📂', title: 'Ver tus Archivos',
        steps: [
          { icon: '🔍', label: 'Lista completa', text: 'Muestra todos los archivos en tu bóveda: fotos, videos y base de datos.' },
          { icon: '🔎', label: 'Buscador', text: 'Filtra por nombre o fecha para encontrar un archivo específico rápidamente.' },
          { icon: '⬇️', label: 'Descargar', text: 'Toca el ícono de descarga en cualquier archivo para guardarlo localmente.' },
        ] },
      { color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: '🛡️', title: 'Backup y Restauración de BD',
        steps: [
          { icon: '💾', label: 'Forzar Backup Ahora', text: 'Sube inmediatamente la base de datos a B2. Úsalo antes de hacer cambios importantes.' },
          { icon: '♻️', label: 'Restaurar', text: 'Vuelve a una versión anterior de la DB si algo salió mal. El sistema se reinicia automáticamente.' },
        ] },
      { color: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/30', icon: '🧹', title: 'Escáner Anti-Basura',
        steps: [
          { icon: '🔬', label: 'Escanear Huérfanos', text: 'Detecta archivos en B2 que ya borraste del catálogo pero siguen ocupando espacio en la nube.' },
          { icon: '🗑️', label: 'Purgar Basura', text: 'Elimina todos los huérfanos de un solo toque. Libera espacio y reduce costos de almacenamiento.' },
        ] },
    ],
  },
};

/* ── UI/UX (solo visual): Skeleton de carga reutilizable ─────────────── */
const SkeletonBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div aria-hidden="true" className={`animate-pulse bg-zinc-800/70 rounded-lg ${className}`} />
);

const RequestSkeleton: React.FC = () => (
  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3" aria-hidden="true">
    <div className="flex items-center gap-2"><SkeletonBlock className="w-6 h-6 rounded-full bg-zinc-800/70!" /><SkeletonBlock className="h-3.5 w-32" /><SkeletonBlock className="h-3 w-20" /></div>
    <SkeletonBlock className="h-3 w-2/3" />
    <SkeletonBlock className="h-3 w-1/3" />
    <div className="flex justify-end"><SkeletonBlock className="h-8 w-40 rounded-xl" /></div>
  </div>
);

const ListRowSkeleton: React.FC = () => (
  <div className="p-3 flex items-center justify-between gap-4" aria-hidden="true">
    <div className="flex items-center gap-2 min-w-0"><SkeletonBlock className="h-4 w-16" /><SkeletonBlock className="h-3 w-48 max-w-[50vw]" /></div>
    <SkeletonBlock className="h-3 w-14 shrink-0" />
  </div>
);

const TileSkeleton: React.FC<{ aspectClass?: string }> = ({ aspectClass = 'aspect-square' }) => (
  <div className={`relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 ${aspectClass}`} aria-hidden="true">
    <SkeletonBlock className="absolute inset-0 h-full w-full rounded-none! bg-zinc-800/60!" />
  </div>
);

const AdminHelpModal: React.FC<AdminHelpModalProps> = ({ isOpen, onClose, activeTab }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  const guide = TAB_HELP[activeTab] || TAB_HELP['profiles'];
  return (
    <div role="dialog" aria-modal="true" aria-label="Guía práctica del administrador" className="fixed inset-0 z-120 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-lg bg-zinc-950 border-t sm:border border-zinc-800 sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh]">
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>
        <div className="px-4 pb-3 pt-1 sm:pt-4 sm:pb-4 border-b border-zinc-800/80 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-amber-500/30 to-amber-600/10 border border-amber-500/40 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border mb-1 ${guide.badgeColor}`}>
                {guide.badge}
              </span>
              <h3 className="text-sm font-black text-white leading-tight">{guide.headline}</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">{guide.sub}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-3">
          {guide.sections.map((section, si) => (
            <div key={si} className={`rounded-2xl border p-4 space-y-3 ${section.bg} ${section.border}`}>
              <h4 className={`font-black text-xs flex items-center gap-2 ${section.color}`}>
                <span className="text-base">{section.icon}</span>
                {section.title}
              </h4>
              <div className="space-y-2.5">
                {section.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <span className="text-base leading-none mt-0.5 shrink-0">{step.icon}</span>
                    <div>
                      <span className="font-bold text-zinc-100 text-[11px]">{step.label}: </span>
                      <span className="text-zinc-400 text-[11px] leading-relaxed">{step.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-zinc-800/80 bg-zinc-950 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[10px] text-zinc-500">Guía contextual · Pestaña activa</p>
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs cursor-pointer transition-all shadow-lg shadow-amber-500/20">
            ¡Entendido!
          </button>
        </div>
      </div>
    </div>
  );
};


export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  botUsername,
  channelId
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('profiles');

  const {
      token,
      adminId,
      isAuthenticated,
    authChecked,
    pinInput,
    loginError,
    loading: authLoading,
    setPinInput,
    handleLoginWithPin,
    handleLogout
  } = useAdminAuth({
    isOpen,
    onLoginSuccess: (tok) => {
      void fetchData(tok);
    }
  });

  const [showPinText, setShowPinText] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  // PWA installation state
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [showIosInstallGuide, setShowIosInstallGuide] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const isStandalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
    if (isStandalone) {
      setIsAppInstalled(true);
    }

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredInstallPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      try {
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsAppInstalled(true);
        }
      } catch {}
      setDeferredInstallPrompt(null);
    } else {
      setShowIosInstallGuide(true);
    }
  };

  // Detección y autoajuste del dispositivo en tiempo real
  const [deviceLayout, setDeviceLayout] = useState<{
    width: number;
    height: number;
    safeAreaTop: number;
    isMobile: boolean;
    platform: string;
  }>(() => {
    const tg = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;
    const safeTop = Math.max(
      tg?.contentSafeAreaInset?.top || 0,
      tg?.safeAreaInset?.top || 0,
      0
    );
    return {
      width: typeof window !== 'undefined' ? window.innerWidth : 390,
      height: typeof window !== 'undefined' ? window.innerHeight : 844,
      safeAreaTop: safeTop,
      isMobile: typeof window !== 'undefined' ? (window.innerWidth < 640 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) : true,
      platform: tg?.platform || (typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent) ? 'android' : 'other')
    };
  });

  useEffect(() => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        tg.ready();
        if (!tg.isExpanded) tg.expand();
        if (typeof tg.setHeaderColor === 'function') {
          tg.setHeaderColor('#09090b');
        }
        if (typeof tg.setBackgroundColor === 'function') {
          tg.setBackgroundColor('#09090b');
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    const updateMetrics = () => {
      const tg = (window as any).Telegram?.WebApp;
      const safeTop = Math.max(
        tg?.contentSafeAreaInset?.top || 0,
        tg?.safeAreaInset?.top || 0,
        0
      );
      setDeviceLayout({
        width: window.innerWidth,
        height: window.innerHeight,
        safeAreaTop: safeTop,
        isMobile: window.innerWidth < 640 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
        platform: tg?.platform || (/Android/i.test(navigator.userAgent) ? 'android' : 'other')
      });
      document.documentElement.style.setProperty('--app-safe-top', `${safeTop}px`);
    };

    updateMetrics();
    window.addEventListener('resize', updateMetrics);
    window.addEventListener('orientationchange', updateMetrics);

    const tg = (window as any).Telegram?.WebApp;
    if (tg?.onEvent) {
      try {
        tg.onEvent('viewportChanged', updateMetrics);
        tg.onEvent('safeAreaChanged', updateMetrics);
        tg.onEvent('contentSafeAreaChanged', updateMetrics);
      } catch {}
    }

    return () => {
      window.removeEventListener('resize', updateMetrics);
      window.removeEventListener('orientationchange', updateMetrics);
      if (tg?.offEvent) {
        try {
          tg.offEvent('viewportChanged', updateMetrics);
          tg.offEvent('safeAreaChanged', updateMetrics);
          tg.offEvent('contentSafeAreaChanged', updateMetrics);
        } catch {}
      }
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullScreen = async () => {
    try {
      const isIos = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
      if (isIos && !document.documentElement.requestFullscreen) {
        setMessage({
          type: 'success',
          text: '📱 En iPhone: Toca Compartir [↑] en Safari y selecciona "Añadir a pantalla de inicio" para usar en pantalla completa sin barra de direcciones.'
        });
        setIsFullScreen(prev => !prev);
        return;
      }

      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
        setIsFullScreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullScreen(false);
      }
    } catch {
      setIsFullScreen(prev => !prev);
    }

    try {
      const tg = (window as unknown as { Telegram?: { WebApp?: { requestFullscreen?: () => void } } })?.Telegram?.WebApp;
      if (typeof tg?.requestFullscreen === 'function') {
        tg.requestFullscreen();
      }
    } catch {}
  };

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [syncErrors, setSyncErrors] = useState<SyncErrorLog[]>([]);
  const [auditedB2Media, setAuditedB2Media] = useState<AuditedB2Media[]>([]);
  const [auditedGalleryMedia, setAuditedGalleryMedia] = useState<AuditedGalleryMedia[]>([]);
  const [auditB2Loading, setAuditB2Loading] = useState(false);
  const [auditB2Error, setAuditB2Error] = useState<string | null>(null);
  const [selectedAuditedMedia, setSelectedAuditedMedia] = useState<AuditedGalleryMedia | null>(null);
  const [auditB2Deleting, setAuditB2Deleting] = useState(false);
  const [loading, setLoading] = useState(false);
  // UI/UX (solo visual): distingue la carga inicial de las recargas por acciones
  const [initialLoading, setInitialLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit / New Form State
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState<any>({
    name: '',
    age: 18,
    zone: 'Contenido +18 VIP',
    description: '',
    rate_bs: '' as number | '',
    commission_bs: 0,
    status: 'disponible' as Profile['status'],
    priority_order: 0,
    
  });

  const [publishing, setPublishing] = useState(false);
  const [sendingDraftToBot, setSendingDraftToBot] = useState(false);
  const [tempDescText, setTempDescText] = useState<string>('');

  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [selectedPhotoFiles, setSelectedPhotoFiles] = useState<FileList | null>(null);
  const [newBotUsername, setNewBotUsername] = useState(botUsername || '');
  const [adminContactUsername, setAdminContactUsername] = useState('');
  const [freePreviewUrl, setFreePreviewUrl] = useState<string | null>(null);
  const [publishedPostUrls, setPublishedPostUrls] = useState<string[]>([]);
  const [vipPreviewUrl, setVipPreviewUrl] = useState<string | null>(null);
  const [vipPreviewType, setVipPreviewType] = useState<'image' | 'video' | null>(null);
  const [freePreviewType, setFreePreviewType] = useState<'image' | 'video' | null>(null);
  const [watermarkEnabled, setWatermarkEnabled] = useState(() => {
    return localStorage.getItem('watermarkEnabled') !== 'false';
  });
  const [watermarkText, setWatermarkText] = useState(() => {
    return localStorage.getItem('watermarkText')?.trim() || 'Iam Danii VIP';
  });

  // Efecto para guardar en memoria
  useEffect(() => {
    localStorage.setItem('watermarkEnabled', String(watermarkEnabled));
    localStorage.setItem('watermarkText', watermarkText);
  }, [watermarkEnabled, watermarkText]);

  const [autoReplyDelay, setAutoReplyDelay] = useState('10');
  const [modelDisplayName, setModelDisplayName] = useState('');
  const [modelVipLink, setModelVipLink] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [pinnedMessageText, setPinnedMessageText] = useState('');
  const [pinnedMessageActive, setPinnedMessageActive] = useState(false);

  // Payment Methods state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentImageFile, setPaymentImageFile] = useState<File | null>(null);
  const [paymentImagePreview, setPaymentImagePreview] = useState<string | null>(null);
  const [uploadingPaymentImage, setUploadingPaymentImage] = useState(false);
  const [publishingPaymentsToChannel, setPublishingPaymentsToChannel] = useState(false);

  // Pre-cargar por defecto el primer método de pago para que el contenedor nunca se vea vacío
  useEffect(() => {
    if (paymentMethods.length > 0) {
      if (!selectedPaymentMethodId) {
        const defaultMethod = paymentMethods.find(m => m.is_active) || paymentMethods[0];
        setSelectedPaymentMethodId(defaultMethod.id);
        setEditingPaymentMethod({ ...defaultMethod });
      } else {
        const current = paymentMethods.find(m => m.id === selectedPaymentMethodId);
        if (current && (!editingPaymentMethod || editingPaymentMethod.id !== current.id)) {
          setEditingPaymentMethod({ ...current });
        }
      }
    }
  }, [paymentMethods, selectedPaymentMethodId]);
  
  // Reply state for customer requests
  const [replyingRequestId, setReplyingRequestId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState<string>('confirmado');
  // ── Filtro y selección masiva de solicitudes ──
  // ── Filtro y selección masiva de solicitudes ──
  const [requestsFilter, setRequestsFilter] = useState<'all' | 'pendiente' | 'comision_pagada'>('all');
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());
  const [deletingRequests, setDeletingRequests] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const [channelIdInput, setChannelIdInput] = useState(channelId || '');
  const [channelVerified, setChannelVerified] = useState<boolean | null>(null);
  const [channelTitle, setChannelTitle] = useState<string>('');
  const [verifyingChannel, setVerifyingChannel] = useState(false);
  const [envChannelId, setEnvChannelId] = useState<string>('');
  const [enlargedMediaUrl, setEnlargedMediaUrl] = useState<string | null>(null);
  const [showProfileGallery, setShowProfileGallery] = useState(false);

  useEffect(() => {
    setShowProfileGallery(false);
    setPublishedPostUrls([]);
  }, [editingProfile?.id]);

  // Upload workflow state (comment and ephemeral before upload)
  const [uploadComment, setUploadComment] = useState('');
  const [uploadSugestiva, setUploadSugestiva] = useState(false);
  const [uploadDuration, setUploadDuration] = useState(10);
  // Step 2 Sub-Tabs ('free': Subir Contenido Free, 'vip': Subir Contenido VIP, 'bot': Contenido / Bot)
  const [step2Tab, setStep2Tab] = useState<'free' | 'vip' | 'bot'>('free');

  // VIP Upload State (4-step linear flow: Guardar -> Previsualizar -> Editar -> Publicar)
  const [vipFile, setVipFile] = useState<File | null>(null);
  const [vipStarCount, setVipStarCount] = useState<number | ''>(50);
  const [vipCaption, setVipCaption] = useState<string>('');
  const [vipDraftMediaUrl, setVipDraftMediaUrl] = useState<string | null>(null);
  const [vipPhase, setVipPhase] = useState<'upload' | 'preview' | 'edit'>('upload');
  const [uploadingVip, setUploadingVip] = useState(false);
  const [publishingVip, setPublishingVip] = useState(false);

  // Bot Library / Queue State (upload without publishing)
  const [botQueue, setBotQueue] = useState<BotMediaItem[]>([]);
  const [botFile, setBotFile] = useState<File | null>(null);
  const [botCategory, setBotCategory] = useState<BotMediaCategory>('general');
  const [botCaption, setBotCaption] = useState<string>('');
  const [uploadingBotMedia, setUploadingBotMedia] = useState(false);

  // Paid media with Telegram Stars state
  const [paidModalMediaUrl, setPaidModalMediaUrl] = useState<string | null>(null);
  const [paidModalStarCount, setPaidModalStarCount] = useState<number | ''>(50);
  const [paidModalCaption, setPaidModalCaption] = useState<string>('');
  const [publishingPaidMedia, setPublishingPaidMedia] = useState(false);


  // Custom buttons state
  const [customButtons, setCustomButtons] = useState<CustomButton[]>([]);
  const [editingButton, setEditingButton] = useState<Partial<CustomButton> | null>(null);

  // Wizard step for profile configuration (Mobile-friendly)
  const [profileStep, setProfileStep] = useState<1 | 2 | 3>(1);
  // Bot Welcome & Splash Media state
  const [welcomeMediaUrl, setWelcomeMediaUrl] = useState('');
  const [welcomeMediaType, setWelcomeMediaType] = useState<'photo' | 'video' | null>('photo');
  const [splashDescription, setSplashDescription] = useState('');
  const [uploadingWelcomeMedia, setUploadingWelcomeMedia] = useState(false);
  const [savingSplashDescription, setSavingSplashDescription] = useState(false);
  const [showSplashPreview, setShowSplashPreview] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [savingDescriptionOnly, setSavingDescriptionOnly] = useState(false);

  // Operating Mode state (Modo A: solo_bot / Modo B: bot_and_channel)
  const [operatingMode, setOperatingMode] = useState<'solo_bot' | 'bot_and_channel'>('solo_bot');
  const [botoneraMode, setBotoneraMode] = useState<'legacy' | 'direct'>('legacy');
  const [updatingMode, setUpdatingMode] = useState(false);

  // Previsualizador de Pantallas state (Mini App y Telegram)
  const [previewModeModal, setPreviewModeModal] = useState<null | 'miniapp' | 'telegram'>(null);
  const [previewIncludeDrafts, setPreviewIncludeDrafts] = useState(true);

  // Auto-dismiss floating toast notification after 3.5s
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      setMessage(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [message]);
  const [buttonFormData, setButtonFormData] = useState({
    label: '',
    url: '',
    type: 'url' as 'url' | 'telegram' | 'subscription',
    visible_channel: true,
    visible_miniapp: true,
    is_active: true
  });
  const [savingButton, setSavingButton] = useState(false);

  // Dynamic polls state
  const [dynamicPolls, setDynamicPolls] = useState<DynamicPoll[]>([]);
  const [editingPoll, setEditingPoll] = useState<Partial<DynamicPoll> | null>(null);
  const [pollFormData, setPollFormData] = useState({
    question: '',
    options: ['', ''],
    visible_channel: true,
    visible_miniapp: true,
    publish_telegram: true
  });
  const [savingPoll, setSavingPoll] = useState(false);
  const [syncingDb, setSyncingDb] = useState(false);

  useEffect(() => {
    setNewBotUsername(botUsername || '');
  }, [botUsername]);

  useEffect(() => {
    if (channelId) setChannelIdInput(channelId);
  }, [channelId]);


  // Sincronizar automáticamente el perfil activo para que nunca aparezca en blanco
  useEffect(() => {
    if (profiles.length > 0 && !editingProfile) {
      const p = profiles[0];
      setEditingProfile(p);
      setFormData({
        name: p.name,
        age: p.age ?? 18,
        zone: p.zone,
        description: p.description,
        rate_bs: p.rate_bs ?? '',
        commission_bs: 0,
        status: p.status,
        priority_order: p.priority_order || 0
      });
    }
  }, [profiles, editingProfile]);

  const fetchData = async (tok: string = token) => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${tok}` };
      const [resP, resR, resL, resI, resB, resPolls, resPay, resBot] = await Promise.all([
        fetch('/api/admin/profiles?t=' + Date.now(), { headers }),
        fetch('/api/admin/requests', { headers }),
        fetch('/api/admin/logs', { headers }),
        fetch('/api/info'),
        fetch('/api/admin/buttons', { headers }),
        fetch('/api/admin/polls', { headers }),
        fetch('/api/admin/payment-methods', { headers }),
        fetch('/api/admin/bot-queue', { headers })
      ]);

      // UI/UX (solo visual): ya hay datos reales en pantalla, se desactivan los esqueletos
      setInitialLoading(false);

      if (resP.ok) {
        const fetchedProfiles = await resP.json();
        setProfiles(fetchedProfiles);
        if (fetchedProfiles.length > 0) {
          setEditingProfile(prev => {
            const chosen = prev
              ? (fetchedProfiles.find((x: Profile) => x.id === prev.id) || fetchedProfiles[0])
              : fetchedProfiles[0];
            setFormData({
              name: chosen.name, age: chosen.age, zone: chosen.zone,
              description: chosen.description, rate_bs: chosen.rate_bs,
              commission_bs: 0, status: chosen.status,
              priority_order: chosen.priority_order || 0
            });
            return chosen;
          });
        }
      }
      if (resR.ok) setRequests(await resR.json());
      if (resL.ok) {
        const logsData = await resL.json();
        setAuditLogs(logsData.audit_logs || []);
        setSyncErrors(logsData.sync_errors || []);
      }
      if (resB.ok) setCustomButtons(await resB.json());
      if (resPolls.ok) setDynamicPolls(await resPolls.json());
      if (resPay && resPay.ok) {
        const payData = await resPay.json();
        setPaymentMethods(payData);
      }
      if (resBot && resBot.ok) {
        setBotQueue(await resBot.json());
      }
      if (resI.ok) {
        const infoData = await resI.json();
        if (infoData.auto_reply_delay_minutes !== undefined) setAutoReplyDelay(String(infoData.auto_reply_delay_minutes));
        if (infoData.qr_image_url !== undefined) setQrImageUrl(infoData.qr_image_url);
        if (infoData.admin_contact_username !== undefined) setAdminContactUsername(infoData.admin_contact_username || '');
        if (infoData.pinned_message_text !== undefined) setPinnedMessageText(infoData.pinned_message_text);
        if (infoData.pinned_message_active !== undefined) setPinnedMessageActive(Boolean(infoData.pinned_message_active));
        if (infoData.channel_id) setChannelIdInput(infoData.channel_id);
        if (infoData.channel_title) setChannelTitle(infoData.channel_title);
        if (infoData.model_display_name !== undefined) setModelDisplayName(infoData.model_display_name || '');
        if (infoData.model_vip_link !== undefined) setModelVipLink(infoData.model_vip_link || '');
        if (infoData.welcome_media_url !== undefined) setWelcomeMediaUrl(infoData.welcome_media_url || '');
        if (infoData.welcome_media_type !== undefined) setWelcomeMediaType(infoData.welcome_media_type || 'photo');
        if (infoData.splash_description !== undefined) setSplashDescription(infoData.splash_description || '');
        if (infoData.operating_mode) setOperatingMode(infoData.operating_mode);
        if (infoData.telegram_botonera_mode) setBotoneraMode(infoData.telegram_botonera_mode);
      }
      
    } catch {
      setMessage({ type: 'error', text: 'Error al cargar datos administrativos' });
    } finally {
      setLoading(false);
      void fetchChannelStatus(tok);
    }
  };

  const fetchChannelStatus = async (authToken = token) => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/admin/settings/channel', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.channel_id) setChannelIdInput(data.channel_id);
        setChannelVerified(data.verified);
        setChannelTitle(data.title || '');
        if (data.env_channel_id) setEnvChannelId(data.env_channel_id);
      }
    } catch {
      // ignore
    }
  };

  const fetchAuditedB2Media = async () => {
    setAuditB2Loading(true);
    setAuditB2Error(null);
    try {
      const res = await fetch('/api/admin/audit/b2-profile-media', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo consultar B2.');
      setAuditedB2Media(data.files || []);
      setAuditedGalleryMedia(data.gallery || []);
    } catch (err: any) {
      setAuditB2Error(err.message || 'No se pudo consultar B2.');
    } finally {
      setAuditB2Loading(false);
    }
  };

  const deleteAuditedB2Media = async () => {
    if (!selectedAuditedMedia?.b2Key || !selectedAuditedMedia.b2ObjectDeletable || adminId !== '6461788392') return;
    const key = selectedAuditedMedia.b2Key;
    if (!window.confirm(`Eliminar permanentemente este objeto y sus versiones de B2?\n\n${key}\n\nTambién se quitarán sus referencias del perfil y se guardará una copia actualizada de la base en B2.`)) return;
    setAuditB2Deleting(true);
    setAuditB2Error(null);
    try {
      const res = await fetch('/api/admin/audit/b2-profile-media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || data.details || 'No se pudo completar el borrado.');
      setSelectedAuditedMedia(null);
      setMessage({ type: 'success', text: `Objeto borrado de B2 y base sincronizada. Referencias quitadas: ${data.removedReferences}.` });
      await Promise.all([fetchAuditedB2Media(), fetchData()]);
    } catch (err: any) {
      setAuditB2Error(err.message || 'Falló el borrado.');
    } finally {
      setAuditB2Deleting(false);
    }
  };

  const removeTelegramMediaReference = async () => {
    if (!selectedAuditedMedia || selectedAuditedMedia.source !== 'telegram' || adminId !== '6461788392') return;
    const mediaUrl = selectedAuditedMedia.url;
    if (!window.confirm(`Quitar este medio de la galería y guardar la base actualizada en B2?\n\n${mediaUrl}\n\nEl archivo original en Telegram y las copias ya publicadas en el canal no se borran con esta acción.`)) return;
    setAuditB2Deleting(true);
    setAuditB2Error(null);
    try {
      const res = await fetch('/api/admin/audit/b2-profile-media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: mediaUrl })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || data.details || 'No se pudo actualizar la galería.');
      setSelectedAuditedMedia(null);
      setMessage({ type: 'success', text: `Referencia retirada de la galería y snapshot guardado en ${data.snapshotKey}.` });
      await Promise.all([fetchAuditedB2Media(), fetchData()]);
    } catch (err: any) {
      setAuditB2Error(err.message || 'Falló la actualización de la galería.');
    } finally {
      setAuditB2Deleting(false);
    }
  };

  const copyAuditedMediaInfo = async () => {
    if (!selectedAuditedMedia) return;
    const info = [
      `Perfil: ${selectedAuditedMedia.profileName} (${selectedAuditedMedia.profileId})`,
      `Origen: ${selectedAuditedMedia.source}`,
      `Archivo: ${selectedAuditedMedia.b2Key?.split('/').pop() || selectedAuditedMedia.url.split('/').pop() || selectedAuditedMedia.url}`,
      `Clave B2: ${selectedAuditedMedia.b2Key || 'No aplica'}`,
      `Objeto presente en B2: ${selectedAuditedMedia.b2ObjectExists ? 'Sí' : 'No'}`,
      `URL: ${selectedAuditedMedia.url}`,
      `Estado: ${selectedAuditedMedia.status === 1 ? 'Publicado' : selectedAuditedMedia.status === 2 ? 'Borrador' : 'Sin estado'}`,
      `Descripción: ${selectedAuditedMedia.description || 'Sin descripción'}`
    ].join('\n');
    try {
      await navigator.clipboard.writeText(info);
      setMessage({ type: 'success', text: 'Información del medio copiada.' });
    } catch {
      setAuditB2Error('No se pudo copiar automáticamente. Selecciona y copia los datos de la ficha.');
    }
  };

  // Sync Database SQLite to DB Server
  const handleSyncDbToB2 = async () => {
    setSyncingDb(true);
    try {
      const res = await fetch('/api/admin/sync-db', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: '💾 Base de datos respaldada en Servidor DB exitosamente.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al respaldar en Servidor DB' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al respaldar base de datos' });
    } finally {
      setSyncingDb(false);
    }
  };



  if (!isOpen) return null;

  if (!authChecked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
        <div className="w-full max-w-sm rounded-3xl border border-amber-500/30 bg-zinc-900 p-8 text-center shadow-2xl space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <RefreshCw className="h-7 w-7 animate-spin" />
          </div>
          <h2 className="font-serif text-lg font-bold text-white">
            Verificando Credenciales...
          </h2>
          <p className="text-xs text-zinc-400">
            Comprobando acceso seguro al Panel VIP
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md overflow-y-auto">
        <div className="w-full max-w-sm rounded-3xl border border-amber-500/30 bg-zinc-900 p-6 text-center shadow-2xl space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-lg shadow-amber-500/10">
            <Lock className="h-7 w-7" />
          </div>
          
          <div>
            <h2 className="font-serif text-xl font-bold text-white">
              Panel Administrativo VIP
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Aplicación Web Progresiva (PWA) e Instalable
            </p>
          </div>

          {/* 1. Botón Principal: Acceso Directo con Telegram Bot (Sin contraseña) */}
          <div className="pt-1 space-y-1.5">
            <a
              href={`https://t.me/${botUsername}?start=admin_login`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-12 rounded-2xl bg-linear-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-sky-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer px-3 text-center"
            >
              <Send className="w-4 h-4 text-white shrink-0" />
              <span>Ingresar con Telegram (Sin Contraseña)</span>
            </a>
            <p className="text-[10.5px] text-zinc-400 leading-tight">
              Reconoce tu Telegram ID y te abre la PWA al instante sin contraseñas.
            </p>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="grow border-t border-zinc-800"></div>
            <span className="shrink mx-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">o ingresa con tu PIN</span>
            <div className="grow border-t border-zinc-800"></div>
          </div>

          {/* 2. Formulario alternativo de PIN / ID */}
          <form onSubmit={handleLoginWithPin} className="space-y-3 text-left">
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-300 mb-1">
                PIN de Acceso o ID Administrador
              </label>
              <div className="relative">
                <input
                  type={showPinText ? 'text' : 'password'}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Ingresa tu PIN o ID Telegram"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 pr-10 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPinText(prev => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors p-1 cursor-pointer"
                  title={showPinText ? "Ocultar PIN" : "Mostrar PIN"}
                >
                  {showPinText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <p className="text-xs text-rose-400 font-medium">{loginError}</p>
            )}

            <button
              type="submit"
              disabled={authLoading || !pinInput.trim()}
              className="w-full min-h-11 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>{authLoading ? 'Verificando...' : 'Entrar con PIN'}</span>
            </button>
          </form>

          {/* 3. Botón de Instalación PWA en Pantalla de Inicio */}
          {!isAppInstalled && (
            <div className="pt-2 border-t border-zinc-800/80 space-y-1">
              <button
                type="button"
                onClick={handleInstallPwa}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>📲 Instalar Panel Admin en mi Teléfono</span>
              </button>
              <p className="text-[10px] text-zinc-500">
                Se guardará con su propio icono en tu pantalla de inicio.
              </p>
            </div>
          )}

          <div className="pt-1">
            <button
              onClick={onClose}
              type="button"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              Cerrar página
            </button>
          </div>

          <p className="text-[9px] text-zinc-600/60 tracking-wide pt-2 select-none">
            Gestor de Contenido / Mini App Telegram — Ver. 1.0
          </p>
        </div>

        {/* Modal de Instrucciones de Instalación iOS Safari */}
        {showIosInstallGuide && (
          <div className="fixed inset-0 z-130 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="w-full max-w-sm rounded-3xl border border-zinc-700 bg-zinc-900 p-5 text-center shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 mx-auto flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Instalar en Pantalla de Inicio</h3>
                <p className="text-xs text-zinc-400 mt-1">Sigue estos sencillos pasos para tener el Panel Admin en tu teléfono:</p>
              </div>
              <div className="space-y-2.5 text-left text-xs bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">1</span>
                  <p className="text-zinc-300">En tu navegador (Safari en iPhone o Chrome en Android), pulsa el botón <strong>Compartir</strong> (⎋) o el menú (<strong>⋮</strong>).</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">2</span>
                  <p className="text-zinc-300">Selecciona <strong>"Agregar a pantalla de inicio"</strong> (o "Instalar aplicación").</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIosInstallGuide(false)}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all cursor-pointer"
              >
                ¡Entendido!
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Tab config ──────────────────────────────────────────────────────────────
  const MASTER_ADMIN = '6461788392';
  const isMasterAdmin = adminId === MASTER_ADMIN;
  const allTabs: { id: AdminTab; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: 'profiles', icon: <Users className="w-4 h-4" />, label: 'Mi Perfil' },
    { id: 'requests', icon: <Inbox className="w-4 h-4" />, label: 'Solicitudes', badge: requests.filter(r => r.status !== 'comision_pagada').length },
    { id: 'payments', icon: <CreditCard className="w-4 h-4" />, label: 'Métodos de Pago', badge: paymentMethods.length },
    { id: 'buttons', icon: <Sparkles className="w-4 h-4" />, label: 'Botones', badge: customButtons.length },
    { id: 'polls', icon: <BarChart2 className="w-4 h-4" />, label: 'Encuestas', badge: dynamicPolls.length },
    { id: 'emojis', icon: <Smile className="w-4 h-4" />, label: 'Emojis VIP' },
    { id: 'telegram', icon: <QrCode className="w-4 h-4" />, label: 'Telegram' },
    { id: 'subscribers', icon: <Users className="w-4 h-4" />, label: 'Suscriptores' },
    { id: 'audit', icon: <Activity className="w-4 h-4" />, label: 'Auditoría' },
      { id: 'b2', icon: <Cloud className="w-4 h-4" />, label: 'Bodega B2' }
  ];

  const tabs = allTabs.filter(t => (t.id === 'audit' || t.id === 'b2' || t.id === 'subscribers') ? isMasterAdmin : true);

  return (
    <div className="admin-panel-viewport fixed inset-0 z-50 flex flex-col bg-zinc-950 text-zinc-100 w-full h-dvh max-h-dvh overflow-hidden sm:items-stretch">
      <div className={`relative w-full h-full max-h-full min-h-0 bg-zinc-900 text-zinc-100 flex flex-col overflow-hidden transition-all duration-200 ${
        isFullScreen
          ? 'h-screen w-screen max-h-screen max-w-none rounded-none border-none'
          : 'sm:mx-auto sm:max-w-6xl xl:max-w-400 sm:rounded-2xl sm:border sm:border-zinc-800 sm:shadow-2xl sm:max-h-[calc(100dvh-1rem)] lg:rounded-3xl rounded-none border-none'
      }`}>

        {/* ── Header ── */}
        <div 
          style={{ paddingTop: deviceLayout.safeAreaTop > 0 ? `${deviceLayout.safeAreaTop + 6}px` : undefined }}
          className="p-2 sm:p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/90 shrink-0 gap-2"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1" aria-busy={(loading || authLoading)} title={(loading || authLoading) ? 'Sincronizando datos…' : undefined}>
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate flex items-center gap-1.5">
                <span>Panel Admin</span>
                <span className="text-zinc-600 font-normal hidden sm:inline">•</span>
                <span className="text-amber-400/90 font-medium text-xs truncate hidden sm:inline">{modelDisplayName || formData.name || 'Danii'}</span>
              </h2>
              <p className="text-[10px] text-zinc-400 truncate">Gestión de contenido</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {(loading || authLoading) && (
              <div className="flex items-center gap-1.5 mr-1" role="status" aria-live="polite">
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span className="hidden md:inline text-[10px] font-bold text-amber-400/90 uppercase tracking-wider">Sincronizando…</span>
              </div>
            )}
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleSyncDbToB2}
                disabled={syncingDb}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1 border border-zinc-700/60 disabled:opacity-50"
                title="Sincronizar y respaldar en Servidor DB"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{syncingDb ? 'Guardando...' : 'Servidor DB'}</span>
              </button>
            )}
            {isAuthenticated && !isAppInstalled && (
              <button
                type="button"
                onClick={handleInstallPwa}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/40 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                title="Instalar Panel Admin en mi Teléfono / PC (PWA)"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Instalar App</span>
              </button>
            )}
            {/* Abrir en Navegador Web (Chrome / Safari) */}
            <button
              type="button"
              onClick={() => {
                const currentUrl = window.location.href;
                const tg = (window as any).Telegram?.WebApp;
                if (tg?.openLink) {
                  tg.openLink(currentUrl);
                } else {
                  window.open(currentUrl, '_blank');
                }
              }}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sky-400 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1 border border-zinc-700/60"
              title="Abrir como Página Web en tu Navegador (Chrome / Safari)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Navegador</span>
            </button>
            {isAuthenticated && (
              <button
                type="button"
                onClick={toggleFullScreen}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1 border border-zinc-700/60"
                title={isFullScreen ? 'Salir de pantalla completa' : 'Pantalla completa (ocultar barra del navegador)'}
              >
                {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline text-xs font-bold">{isFullScreen ? 'Ventana' : 'Pantalla'}</span>
              </button>
            )}
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Cerrar panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Botón Flotante '?' para Guía Práctica */}
        <button
          type="button"
          onClick={() => setShowHelpGuide(true)}
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-40 w-11 h-11 rounded-full bg-linear-to-tr from-amber-500 to-amber-400 text-zinc-950 font-black text-xl shadow-2xl shadow-amber-500/40 border-2 border-amber-300 flex items-center justify-center cursor-pointer active:scale-90 hover:scale-105 transition-all"
          title="Guía Práctica del Administrador"
        >
          <span>?</span>
        </button>

        {/* Modal de Guía Práctica '?' */}
        <AdminHelpModal isOpen={showHelpGuide} onClose={() => setShowHelpGuide(false)} activeTab={activeTab} />

        {/* ── Global Floating Toast Notification ── */}
        {message && (
          <div role="status" aria-live="polite" className="fixed top-5 left-1/2 -translate-x-1/2 z-100 max-w-md w-[92%] pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
            <div className={`px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 text-xs font-semibold ${
              message.type === 'success'
                ? 'bg-zinc-950/95 border-emerald-500/50 text-emerald-300 shadow-emerald-500/20'
                : 'bg-zinc-950/95 border-rose-500/50 text-rose-300 shadow-rose-500/20'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span className="leading-snug">{message.text}</span>
            </div>
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

          {/* ── Tab Bar ── */}
          <div className="flex items-center gap-0.5 px-3 sm:px-4 pt-2 bg-zinc-950/40 border-b border-zinc-800/80 overflow-x-auto scrollbar-none shrink-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
                className={`flex items-center gap-1.5 py-2.5 px-3 rounded-t-lg border-b-2 transition-all cursor-pointer text-xs font-semibold whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-amber-400 text-amber-400 bg-zinc-900/40'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-amber-400/20 text-amber-400'
                      : 'bg-zinc-700 text-zinc-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Tab Views ── */}
          <div 
            className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y px-2 sm:px-5 lg:px-7 py-2 sm:py-3 space-y-2.5 sm:space-y-3.5 pb-[calc(7rem+env(safe-area-inset-bottom))]"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >

            {/* TAB: MY PROFILE FORM */}
            {activeTab === 'profiles' && (
              <AdminProfilesTab
                token={token}
                profiles={profiles}
                setProfiles={setProfiles}
                editingProfile={editingProfile}
                setEditingProfile={setEditingProfile}
                formData={formData}
                setFormData={setFormData}
                botQueue={botQueue}
                setBotQueue={setBotQueue}
                initialLoading={initialLoading}
                loading={loading}
                setLoading={setLoading}
                fetchData={fetchData}
                setMessage={setMessage}
                botUsername={botUsername}
                channelId={channelId}
                channelIdInput={channelIdInput}
                operatingMode={operatingMode}
                setShowHelpGuide={setShowHelpGuide}
                setActiveTab={setActiveTab}
              />
            )}

            {/* TAB: TELEGRAM & SETTINGS */}

            {activeTab === 'telegram' && (
              <AdminTelegramTab
                token={token}
                botUsername={botUsername}
                channelId={channelId}
                loading={loading}
                setLoading={setLoading}
                fetchData={fetchData}
                setMessage={setMessage}
                operatingMode={operatingMode}
                setOperatingMode={setOperatingMode}
                botoneraMode={botoneraMode}
                setBotoneraMode={setBotoneraMode}
                welcomeMediaUrl={welcomeMediaUrl}
                setWelcomeMediaUrl={setWelcomeMediaUrl}
                welcomeMediaType={welcomeMediaType}
                setWelcomeMediaType={setWelcomeMediaType}
                splashDescription={splashDescription}
                setSplashDescription={setSplashDescription}
                setShowSplashPreview={setShowSplashPreview}
                modelDisplayName={modelDisplayName}
                setModelDisplayName={setModelDisplayName}
                modelVipLink={modelVipLink}
                setModelVipLink={setModelVipLink}
                newBotUsername={newBotUsername}
                setNewBotUsername={setNewBotUsername}
                adminContactUsername={adminContactUsername}
                setAdminContactUsername={setAdminContactUsername}
                autoReplyDelay={autoReplyDelay}
                setAutoReplyDelay={setAutoReplyDelay}
                qrImageUrl={qrImageUrl}
                setQrImageUrl={setQrImageUrl}
                pinnedMessageText={pinnedMessageText}
                setPinnedMessageText={setPinnedMessageText}
                pinnedMessageActive={pinnedMessageActive}
                setPinnedMessageActive={setPinnedMessageActive}
                channelIdInput={channelIdInput}
                setChannelIdInput={setChannelIdInput}
                channelVerified={channelVerified}
                setChannelVerified={setChannelVerified}
                channelTitle={channelTitle}
                setChannelTitle={setChannelTitle}
                envChannelId={envChannelId}
              />
            )}

            {/* TAB: SOLICITUDES DE CLIENTES */}
            {activeTab === 'requests' && (
              <AdminRequestsTab
                requests={requests}
                token={token}
                initialLoading={initialLoading}
                loading={loading}
                fetchData={fetchData}
                setMessage={setMessage}
              />
            )}

            {/* TAB: MÉTODOS DE PAGO */}
            {activeTab === 'payments' && (
              <AdminPaymentsTab
                paymentMethods={paymentMethods}
                token={token}
                initialLoading={initialLoading}
                loading={loading}
                fetchData={fetchData}
                setMessage={setMessage}
              />
            )}

            {/* TAB: BOTONES PERSONALIZADOS */}
            {activeTab === 'buttons' && (
              <AdminButtonsTab
                customButtons={customButtons}
                token={token}
                initialLoading={initialLoading}
                fetchData={fetchData}
                setMessage={setMessage}
              />
            )}

            {/* TAB: DINÁMICAS Y ENCUESTAS */}
            {activeTab === 'polls' && (
              <AdminPollsTab
                dynamicPolls={dynamicPolls}
                token={token}
                initialLoading={initialLoading}
                fetchData={fetchData}
                setMessage={setMessage}
              />
            )}

            {/* TAB: EMOJIS VIP TELEGRAM */}
            {activeTab === 'emojis' && (
              <EmojiPackManager
                token={token}
                onSelectEmojiTag={(tag) => {
                  setMessage({ type: 'success', text: `¡Etiqueta ${tag} copiada al portapapeles!` });
                }}
              />
            )}

            {/* TAB: BODEGA B2 */}
            {(activeTab === 'b2' && isMasterAdmin) && (
              <B2Manager token={token} />
            )}

            {/* TAB: GESTOR DE BD DE SUSCRIPTORES (solo admin maestro) */}
            {(activeTab === 'subscribers' && isMasterAdmin) && (
              <SubscribersManager token={token} />
            )}
  
            {/* TAB: AUDIT LOGS */}
            {(activeTab === 'audit' && isMasterAdmin) && (
              <AdminAuditTab
                auditLogs={auditLogs}
                syncErrors={syncErrors}
                token={token}
                adminId={adminId}
                initialLoading={initialLoading}
                fetchData={fetchData}
                setMessage={setMessage}
              />
            )}

          </div>
        </div>
      </div>

      {/* Vista Previa Interactiva de Pantalla de Inicio / Splash para Admin */}
      {showSplashPreview && (
        <SplashScreen
          mediaUrl={welcomeMediaUrl}
          mediaType={welcomeMediaType || 'photo'}
          modelName={modelDisplayName || 'IAM Danii'}
          splashDescription={splashDescription}
          onFinish={() => setShowSplashPreview(false)}
          isPreview={true}
        />
      )}

      {/* Modal de Instrucciones de Instalación iOS Safari */}
      {showIosInstallGuide && (
        <div className="fixed inset-0 z-130 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-700 bg-zinc-900 p-5 text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 mx-auto flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Instalar en Pantalla de Inicio</h3>
              <p className="text-xs text-zinc-400 mt-1">Sigue estos sencillos pasos para tener el Panel Admin en tu teléfono:</p>
            </div>
            <div className="space-y-2.5 text-left text-xs bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">1</span>
                <p className="text-zinc-300">En tu navegador (Safari en iPhone o Chrome en Android), pulsa el botón <strong>Compartir</strong> (⎋) o el menú (<strong>⋮</strong>).</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">2</span>
                <p className="text-zinc-300">Selecciona <strong>"Agregar a pantalla de inicio"</strong> (o "Instalar aplicación").</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowIosInstallGuide(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all cursor-pointer"
            >
              ¡Entendido!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
