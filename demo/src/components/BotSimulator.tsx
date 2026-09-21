import React, { useState } from 'react';
import { CreatorProfile, DemoView } from '../types';
import {
  ArrowLeft,
  MoreVertical,
  Send,
  Smartphone,
  CreditCard,
  Star,
  Info,
  ExternalLink
} from 'lucide-react';

interface BotSimulatorProps {
  profile: CreatorProfile;
  onNavigateToView: (view: DemoView) => void;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  time: string;
  mediaUrl?: string;
  buttons?: { label: string; action: () => void; isPrimary?: boolean }[];
}

export const BotSimulator: React.FC<BotSimulatorProps> = ({
  profile,
  onNavigateToView
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm_start',
      sender: 'user',
      text: '/start',
      time: '12:00'
    },
    {
      id: 'm_welcome',
      sender: 'bot',
      text: `👑 ¡Bienvenido/a al Bot Oficial de ${profile.name}! (+18)\n\nAquí puedes explorar el Catálogo VIP Free, enterarte de los estrenos de la semana y adquirir contenido exclusivo sin intermediarios.\n\n✨ Nota: Toda esta plataforma (Mini App + Bot + Canal) se adapta y personaliza al 100% para cualquier Creadora de Contenido, Modelo o Agencia.`,
      mediaUrl: profile.coverUrl,
      time: '12:00',
      buttons: [
        {
          label: '👑 Abrir Catálogo VIP (Mini App)',
          action: () => onNavigateToView('miniapp'),
          isPrimary: true
        },
        {
          label: '📢 Ir al Canal Telegram VIP Free',
          action: () => onNavigateToView('channel')
        },
        {
          label: '💳 Ver Métodos de Pago',
          action: () => handleSendUserCommand('💳 Métodos de Pago')
        }
      ]
    }
  ]);

  const [inputVal, setInputVal] = useState('');

  const handleSendUserCommand = (cmdText: string) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: cmdText,
      time: timeNow
    };

    setMessages(prev => [...prev, userMsg]);

    // Bot automated response simulation
    setTimeout(() => {
      let botResponse: ChatMessage;

      if (cmdText.includes('Catálogo') || cmdText.includes('/catalogo') || cmdText.includes('/app')) {
        botResponse = {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          text: `📱 Toca el botón de abajo para abrir la Mini App interactiva de ${profile.name} con fotos y videos:`,
          time: timeNow,
          buttons: [
            {
              label: '👑 Abrir Mini App Cliente',
              action: () => onNavigateToView('miniapp'),
              isPrimary: true
            }
          ]
        };
      } else if (cmdText.includes('Canal') || cmdText.includes('/canal')) {
        botResponse = {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          text: `📢 Toca el botón de abajo para ingresar a nuestro Canal Oficial de Telegram:`,
          time: timeNow,
          buttons: [
            {
              label: '📢 Ver Canal Telegram',
              action: () => onNavigateToView('channel'),
              isPrimary: true
            }
          ]
        };
      } else if (cmdText.includes('Pago') || cmdText.includes('/pagos') || cmdText.includes('/metodos')) {
        const methodsList = profile.paymentMethods
          .filter(m => m.is_active)
          .map(m => `• ${m.title}: ${m.description}`)
          .join('\n\n');

        botResponse = {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          text: `💳 *Métodos de Pago Disponibles:*\n\n${methodsList}\n\nEnvía tu comprobante de pago por aquí para activar tu acceso.`,
          time: timeNow,
          buttons: [
            {
              label: '📲 Ver QR en Mini App',
              action: () => onNavigateToView('miniapp'),
              isPrimary: true
            }
          ]
        };
      } else {
        botResponse = {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          text: `✨ Gracias por tu mensaje. Como este es un bot inteligente, puedes usar los botones del menú inferior para navegar rápidamente:`,
          time: timeNow,
          buttons: [
            {
              label: '👑 Abrir Catálogo VIP',
              action: () => onNavigateToView('miniapp'),
              isPrimary: true
            }
          ]
        };
      }

      setMessages(prev => [...prev, botResponse]);
    }, 400);
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    const text = inputVal.trim();
    setInputVal('');
    handleSendUserCommand(text);
  };

  return (
    <div className="relative w-full h-full bg-[#0e1621] text-zinc-100 flex flex-col overflow-hidden select-none font-sans">
      
      {/* ── Cabecera de Chat de Telegram ── */}
      <div className="bg-[#17212b] px-3 py-2.5 flex items-center justify-between border-b border-[#0f1821] shadow-md shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => onNavigateToView('admin')}
            className="p-1 rounded-full text-zinc-300 hover:text-white cursor-pointer"
            title="Volver al Panel Admin"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 border border-emerald-400/40 shrink-0">
            <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
              <span>{profile.name} • Bot Oficial</span>
              <span className="text-emerald-400 text-xs">🤖</span>
            </h2>
            <p className="text-[10px] text-[#70a5d6] truncate">
              bot
            </p>
          </div>
        </div>

        <button type="button" className="p-1.5 rounded-full text-zinc-400 hover:bg-zinc-800 transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* ── Zona de Mensajes con Fondo Telegram ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar bg-[#0e1621]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-md rounded-2xl overflow-hidden shadow-md text-xs ${
                msg.sender === 'user'
                  ? 'bg-[#2b5278] text-white rounded-br-none p-2.5'
                  : 'bg-[#182533] text-zinc-100 rounded-bl-none border border-[#242f3d]'
              }`}
            >
              {msg.mediaUrl && (
                <div className="aspect-[16/9] w-full bg-black overflow-hidden">
                  <img src={msg.mediaUrl} alt="Bot Media" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-2.5 space-y-1">
                <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                <div className="flex justify-end">
                  <span className="text-[9px] font-mono text-zinc-400">{msg.time}</span>
                </div>
              </div>

              {/* Botones Inline de Telegram */}
              {msg.buttons && msg.buttons.length > 0 && (
                <div className="p-2 pt-0 space-y-1 border-t border-[#202d3b]/80">
                  {msg.buttons.map((btn, bIdx) => (
                    <button
                      key={bIdx}
                      type="button"
                      onClick={btn.action}
                      className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 ${
                        btn.isPrimary
                          ? 'bg-[#2b5278] hover:bg-[#346392] text-white shadow-sm'
                          : 'bg-[#202b36] hover:bg-[#2b3846] text-[#70a5d6]'
                      }`}
                    >
                      <span>{btn.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Teclado Persistente de Botones (ReplyKeyboardMarkup) ── */}
      <div className="bg-[#17212b] p-2 border-t border-[#0e1621] space-y-1.5 shrink-0">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => handleSendUserCommand('👑 Catálogo VIP Free')}
            className="py-2 px-3 rounded-xl bg-[#202b36] hover:bg-[#283745] text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all border border-[#263544]"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-400" />
            <span>👑 Catálogo VIP</span>
          </button>

          <button
            type="button"
            onClick={() => handleSendUserCommand('📢 Canal Telegram')}
            className="py-2 px-3 rounded-xl bg-[#202b36] hover:bg-[#283745] text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all border border-[#263544]"
          >
            <Send className="w-3.5 h-3.5 text-sky-400" />
            <span>📢 Canal VIP</span>
          </button>

          <button
            type="button"
            onClick={() => handleSendUserCommand('💳 Métodos de Pago')}
            className="py-2 px-3 rounded-xl bg-[#202b36] hover:bg-[#283745] text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all border border-[#263544]"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            <span>💳 Métodos de Pago</span>
          </button>

          <button
            type="button"
            onClick={() => handleSendUserCommand('ℹ️ Tarifas & Enlaces')}
            className="py-2 px-3 rounded-xl bg-[#202b36] hover:bg-[#283745] text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all border border-[#263544]"
          >
            <Info className="w-3.5 h-3.5 text-purple-400" />
            <span>ℹ️ Tarifas & Links</span>
          </button>
        </div>

        {/* Input de texto inferior */}
        <form onSubmit={handleInputSubmit} className="flex items-center gap-1.5 pt-0.5">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Escribe un mensaje o comando (/canal, /app, /pagos)..."
            className="flex-1 bg-[#202b36] border border-[#283848] rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#70a5d6]"
          />
          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="p-2 rounded-xl bg-[#2b5278] hover:bg-[#346392] text-white disabled:opacity-40 cursor-pointer active:scale-95 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

    </div>
  );
};

