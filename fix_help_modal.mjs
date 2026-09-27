import { readFileSync, writeFileSync } from 'fs';

let src = readFileSync('src/components/AdminPanel.tsx', 'utf8');

const startMark = 'interface AdminHelpModalProps {';
const endMark = '\nexport const AdminPanel: React.FC<AdminPanelProps>';

const si = src.indexOf(startMark);
const ei = src.indexOf(endMark);

console.log(`Found block: ${si} → ${ei} (${ei - si} chars)`);

const newModal = `interface AdminHelpModalProps {
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
      { color: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/30', icon: '5️⃣', title: 'Reacciones Interactivas ❤️',
        steps: [
          { icon: '💬', label: 'Barra flotante de 5 segundos', text: 'Al abrir un archivo en la Mini App, aparece una barra de emojis de reacción.' },
          { icon: '🔄', label: 'Sincronización en tiempo real', text: 'Al tocar una reacción, el contador se actualiza automáticamente en el Canal VIP.' },
          { icon: '⚙️', label: 'Configurar emojis', text: 'Ve a Telegram → Reacciones Interactivas para elegir qué emojis mostrar.' },
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
    headline: 'Configuración de Telegram', sub: 'Bot, canal, anuncios fijados y reacciones',
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
      { color: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/30', icon: '❤️', title: 'Reacciones Interactivas',
        steps: [
          { icon: '😍', label: 'Habilitar reacciones', text: 'Activa la barra de emojis flotante que aparece al abrir contenido en la Mini App.' },
          { icon: '🎨', label: 'Lista de emojis', text: 'Escribe los emojis separados por espacio. Ej: ❤️ 🔥 😍 💎 👑' },
          { icon: '🔄', label: 'Sincronización automática', text: 'Cada reacción de la Mini App actualiza el contador en el Canal VIP en tiempo real.' },
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

const AdminHelpModal: React.FC<AdminHelpModalProps> = ({ isOpen, onClose, activeTab }) => {
  if (!isOpen) return null;
  const guide = TAB_HELP[activeTab] || TAB_HELP['profiles'];
  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-lg bg-zinc-950 border-t sm:border border-zinc-800 sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh]">
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>
        <div className="px-4 pb-3 pt-1 sm:pt-4 sm:pb-4 border-b border-zinc-800/80 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/30 to-amber-600/10 border border-amber-500/40 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className={\`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border mb-1 \${guide.badgeColor}\`}>
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
            <div key={si} className={\`rounded-2xl border p-4 space-y-3 \${section.bg} \${section.border}\`}>
              <h4 className={\`font-black text-xs flex items-center gap-2 \${section.color}\`}>
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
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs cursor-pointer transition-all shadow-lg shadow-amber-500/20">
            ¡Entendido!
          </button>
        </div>
      </div>
    </div>
  );
};

`;

const newSrc = src.substring(0, si) + newModal + src.substring(ei);
writeFileSync('src/components/AdminPanel.tsx', newSrc, 'utf8');
console.log('Done! New file size:', newSrc.length);
