import React, { useState } from 'react';
import { CreatorProfile, DemoView } from '../types';
import {
  ArrowLeft,
  Search,
  MoreVertical,
  Bell,
  Eye,
  Pin,
  ExternalLink,
  CreditCard,
  MessageSquare,
  Lock,
  Volume2
} from 'lucide-react';

interface ChannelSimulatorProps {
  profile: CreatorProfile;
  onNavigateToView: (view: DemoView) => void;
}

export const ChannelSimulator: React.FC<ChannelSimulatorProps> = ({
  profile,
  onNavigateToView
}) => {
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({
    post_welcome: { '🔥': 284, '❤️': 192, '💎': 75 },
    post_0: { '🔥': 142, '😍': 98, '👏': 34 },
    post_1: { '⭐': 88, '🔥': 65, '🔒': 19 }
  });

  const handleReaction = (postId: string, emoji: string) => {
    setReactions(prev => {
      const currentPost = prev[postId] || {};
      const currentCount = currentPost[emoji] || 0;
      return {
        ...prev,
        [postId]: {
          ...currentPost,
          [emoji]: currentCount + 1
        }
      };
    });
  };

  return (
    <div className="relative w-full h-full bg-[#0e1621] text-zinc-100 flex flex-col overflow-hidden select-none font-sans">
      
      {/* ── Cabecera Nativa de Canal de Telegram ── */}
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
          
          <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 border border-amber-400/40 shrink-0">
            <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
              <span>{profile.telegramChannelName}</span>
              <span className="text-amber-400 text-xs">👑</span>
            </h2>
            <p className="text-[10px] text-[#6c7883] truncate">
              {profile.telegramChannelSubscribers.toLocaleString()} suscriptores
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-zinc-400">
          <button type="button" className="p-1.5 rounded-full hover:bg-zinc-800 transition-colors">
            <Search className="w-4 h-4" />
          </button>
          <button type="button" className="p-1.5 rounded-full hover:bg-zinc-800 transition-colors">
            <Bell className="w-4 h-4" />
          </button>
          <button type="button" className="p-1.5 rounded-full hover:bg-zinc-800 transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Mensaje Fijado Superior ── */}
      <div className="bg-[#17212b]/90 border-b border-[#0e1621] px-3 py-1.5 flex items-center justify-between text-xs text-zinc-300">
        <div className="flex items-center gap-2 min-w-0">
          <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0 rotate-45" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-amber-400">Mensaje fijado</p>
            <p className="text-[10.5px] text-zinc-300 truncate">
              👑 ¡Catálogo VIP Free activo! Toca aquí para ver fotos y videos...
            </p>
          </div>
        </div>
      </div>

      {/* ── Feed del Canal con Fondo Temático Telegram ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 no-scrollbar bg-[#0e1621]">
        
        {/* POST 1: Bienvenida al Canal y Botón Mini App */}
        <div className="w-full max-w-lg mx-auto bg-[#182533] rounded-2xl overflow-hidden shadow-lg border border-[#242f3d]">
          <div className="relative aspect-[16/9] w-full bg-black overflow-hidden">
            <img src={profile.coverUrl} alt="Cover" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-2.5 left-3 right-3 text-white">
              <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-500 text-zinc-950 uppercase">
                Canal VIP Free Oficial
              </span>
              <h3 className="text-sm font-bold mt-1 text-white">{profile.name} • Sesiones Inéditas</h3>
            </div>
          </div>

          <div className="p-3 text-xs text-zinc-200 leading-relaxed space-y-2">
            <p>
              ✨ <strong>¡Bienvenidos a mi Canal VIP Free!</strong> Aquí comparto adelantos diarios, sesiones fotográficas de estudio y sets especiales (+18).
            </p>
            <p className="text-[11px] text-zinc-400">
              👇 <em>Toca los botones interactivos de abajo para abrir la Mini App y navegar el contenido exclusivo:</em>
            </p>
          </div>

          {/* Botones Inline de Telegram */}
          <div className="p-2 pt-0 space-y-1">
            <button
              type="button"
              onClick={() => onNavigateToView('miniapp')}
              className="w-full py-2 px-3 rounded-xl bg-[#2b5278] hover:bg-[#32608c] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 shadow-sm"
            >
              <span>👑 Abrir Catálogo VIP Free (Mini App)</span>
            </button>

            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => onNavigateToView('miniapp')}
                className="py-1.5 px-2 rounded-xl bg-[#202b36] hover:bg-[#2b3846] text-[#70a5d6] text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <CreditCard className="w-3 h-3" />
                <span>Métodos de Pago</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateToView('bot')}
                className="py-1.5 px-2 rounded-xl bg-[#202b36] hover:bg-[#2b3846] text-[#70a5d6] text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <MessageSquare className="w-3 h-3" />
                <span>Hablar con Bot</span>
              </button>
            </div>
          </div>

          {/* Pie de Post: Reacciones y Vistas */}
          <div className="px-3 pb-2.5 pt-1 flex items-center justify-between text-[10px] text-zinc-400 border-t border-[#202d3b]/80">
            <div className="flex items-center gap-1.5">
              {['🔥', '❤️', '💎'].map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleReaction('post_welcome', emoji)}
                  className="px-2 py-0.5 rounded-full bg-[#1e2c3a] hover:bg-[#2b3e52] text-zinc-200 font-medium flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                >
                  <span>{emoji}</span>
                  <span className="text-[9px] font-mono text-zinc-300">
                    {reactions.post_welcome?.[emoji] || 0}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 text-[10px] text-[#6c7883]">
              <Eye className="w-3 h-3" />
              <span>3.4k</span>
              <span className="ml-1">11:42</span>
            </div>
          </div>
        </div>

        {/* POSTS DINÁMICOS DE LA GALERÍA */}
        {profile.media.slice(0, 3).map((item, idx) => {
          const postId = `post_${idx}`;
          return (
            <div key={item.id} className="w-full max-w-lg mx-auto bg-[#182533] rounded-2xl overflow-hidden shadow-lg border border-[#242f3d]">
              <div className="relative aspect-[16/10] w-full bg-black overflow-hidden">
                {item.isStarsLocked ? (
                  /* Post Bloqueado con Estrellas */
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                    <img
                      src={item.url}
                      alt="Paid Media"
                      className="absolute inset-0 w-full h-full object-cover filter blur-[12px] scale-105 opacity-95 brightness-95 contrast-105 select-none"
                    />
                    <div className="absolute inset-0 bg-black/25 pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
                      <div className="w-11 h-11 rounded-full bg-black/75 backdrop-blur-xl border border-amber-400/50 flex items-center justify-center shadow-xl mb-1.5">
                        <Lock className="w-4 h-4 text-amber-400 animate-pulse" />
                      </div>
                      <div className="px-3 py-0.5 rounded-full bg-black/85 backdrop-blur-md border border-amber-500/40 text-amber-300 font-extrabold text-[11px] shadow-lg flex items-center gap-1">
                        <span>⭐</span>
                        <span>{item.starsPrice} Estrellas</span>
                      </div>
                    </div>
                  </div>
                ) : item.type === 'video' ? (
                  <video
                    src={item.url}
                    className="w-full h-full object-cover"
                    muted
                    autoPlay
                    loop
                    playsInline
                  />
                ) : (
                  <img src={item.url} alt="Post" className="w-full h-full object-cover" />
                )}
              </div>

              <div className="p-3 text-xs text-zinc-200 space-y-1">
                <p>{item.caption || '✨ Nuevo material exclusivo disponible en el catálogo.'}</p>
                {item.isStarsLocked && (
                  <p className="text-[11px] text-amber-400 font-semibold">
                    ⭐ Contenido VIP de Estreno — Desbloquea con Telegram Stars dentro de la Mini App.
                  </p>
                )}
              </div>

              {/* Botón de apertura a la Mini App */}
              <div className="p-2 pt-0">
                <button
                  type="button"
                  onClick={() => onNavigateToView('miniapp')}
                  className="w-full py-2 px-3 rounded-xl bg-[#2b5278] hover:bg-[#32608c] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{item.isStarsLocked ? `Desbloquear por ⭐ ${item.starsPrice} Estrellas` : 'Ver en Pantalla Completa (Mini App)'}</span>
                </button>
              </div>

              {/* Reacciones */}
              <div className="px-3 pb-2.5 pt-1 flex items-center justify-between text-[10px] text-zinc-400 border-t border-[#202d3b]/80">
                <div className="flex items-center gap-1.5">
                  {['🔥', '😍', '👏'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleReaction(postId, emoji)}
                      className="px-2 py-0.5 rounded-full bg-[#1e2c3a] hover:bg-[#2b3e52] text-zinc-200 font-medium flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                    >
                      <span>{emoji}</span>
                      <span className="text-[9px] font-mono text-zinc-300">
                        {reactions[postId]?.[emoji] || 0}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 text-[10px] text-[#6c7883]">
                  <Eye className="w-3 h-3" />
                  <span>2.1k</span>
                  <span className="ml-1">Hace {idx + 1}h</span>
                </div>
              </div>
            </div>
          );
        })}

      </div>

      {/* ── Barra Inferior Fija de Telegram: Silenciar ── */}
      <div className="bg-[#17212b] p-2.5 flex items-center justify-center border-t border-[#0e1621] shrink-0">
        <button
          type="button"
          className="text-xs text-[#70a5d6] font-bold uppercase tracking-wider hover:text-white transition-colors cursor-pointer"
        >
          Silenciar Notificaciones
        </button>
      </div>

    </div>
  );
};

