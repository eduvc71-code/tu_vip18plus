import React, { useState, useEffect, useRef } from 'react';
import { Smile, Sparkles, Lock, RefreshCw, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { renderEmojiPreview, renderEmojiTag } from '../../client/mtprotoHelpers';

interface StickerItem {
  shortName: string;
  customEmojiId: string;
  emoji: string;
}

interface PackSummary {
  shortName: string;
  count: number;
}

interface EmojiPickerPopoverProps {
  token: string | null;
  onInsertEmoji: (emojiTag: string) => void;
  className?: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export const EmojiPickerPopover: React.FC<EmojiPickerPopoverProps> = ({
  token,
  onInsertEmoji,
  className = '',
  textareaRef
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [lastChecked, setLastChecked] = useState<string>('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [selectedPack, setSelectedPack] = useState<string>('');
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(false);
  const [loadingStickers, setLoadingStickers] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Consultar estado Premium del admin
  const fetchPremiumStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/premium-status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIsPremium(Boolean(data.isPremium));
        setLastChecked(data.checkedAt || '');
      }
    } catch {
      // Ignorar error de red silencioso
    }
  };

  useEffect(() => {
    fetchPremiumStatus();
  }, [token]);

  // Sincronizar en vivo con Telegram
  const handleSyncPremium = async () => {
    if (!token || syncing) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/admin/premium-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setIsPremium(Boolean(data.isPremium));
        setLastChecked(data.checkedAt || new Date().toISOString());
        if (data.isPremium) {
          setSyncMessage({
            type: 'success',
            text: '⭐ ¡Genial! Tu cuenta de Telegram Premium fue detectada con éxito. Los Emojis VIP están activos.'
          });
        } else {
          setSyncMessage({
            type: 'error',
            text: 'ℹ️ No se detectó Telegram Premium en el Telegram ID actual. Abre tu chat con el Bot y escribe /start desde tu cuenta de Telegram para vincularla.'
          });
        }
      } else {
        setSyncMessage({
          type: 'error',
          text: data.error || 'No se pudo conectar con Telegram Bot API para verificar.'
        });
      }
    } catch {
      setSyncMessage({
        type: 'error',
        text: 'Error de red al intentar sincronizar con Telegram.'
      });
    } finally {
      setSyncing(false);
    }
  };

  // Cargar paquetes cuando se abre el popover
  const loadPacks = async () => {
    if (!token) return;
    setLoadingPacks(true);
    try {
      const res = await fetch('/api/admin/emoji-pack/packs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPacks(data);
        if (data.length > 0 && !selectedPack) {
          setSelectedPack(data[0].shortName);
        }
      }
    } catch (e) {
      console.error('Error al cargar packs de emojis:', e);
    } finally {
      setLoadingPacks(false);
    }
  };

  // Cargar stickers del paquete seleccionado
  const loadStickers = async (packName: string) => {
    if (!token || !packName) return;
    setLoadingStickers(true);
    try {
      const res = await fetch(`/api/admin/emoji-pack/${encodeURIComponent(packName)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStickers(data);
      }
    } catch (e) {
      console.error('Error al cargar stickers del pack:', e);
    } finally {
      setLoadingStickers(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPacks();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedPack && isOpen) {
      loadStickers(selectedPack);
    }
  }, [selectedPack, isOpen]);

  const handleEmojiClick = (customEmojiId: string, emojiFallback: string) => {
    const tag = renderEmojiTag(customEmojiId, emojiFallback);
    onInsertEmoji(tag);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      {/* Botón Disparador */}
      {isPremium ? (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-linear-to-r from-pink-500/20 via-amber-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 border border-amber-500/50 text-amber-300 hover:text-amber-200 text-[11px] font-bold cursor-pointer transition-all shadow-sm active:scale-95"
          title="Insertar emojis animados VIP en la descripción"
        >
          <Smile className="w-3.5 h-3.5 text-pink-400" />
          <span>Emojis VIP</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Cuenta Premium Activa"></span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowSyncModal(true)}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-[11px] font-semibold cursor-pointer transition-all"
          title="Se requiere Telegram Premium para insertar Emojis VIP. Toca para verificar o sincronizar."
        >
          <Lock className="w-3 h-3 text-amber-500/80" />
          <span>Emojis VIP</span>
          <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-mono">Premium</span>
        </button>
      )}

      {/* Modal Informativo / Sincronización si no es Premium */}
      {showSyncModal && (
        <div
          className="fixed inset-0 z-80 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowSyncModal(false)}
        >
          <div
            className="relative w-full max-w-md bg-zinc-900 border border-amber-500/50 rounded-2xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm">Estado de Telegram Premium</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Los <strong>Emojis VIP Animados</strong> requieren que la cuenta de Telegram de la Administradora posea <strong>Telegram Premium</strong> activo para poder emitirlos en los canales y mensajes.
            </p>

            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Estado detectado:</span>
                <span className={`font-bold flex items-center gap-1 ${isPremium ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isPremium ? '⭐ Premium Activo' : '⚠️ No Detectado / Inactivo'}
                </span>
              </div>
              {lastChecked && (
                <div className="text-[10px] text-zinc-500">
                  Última comprobación: {new Date(lastChecked).toLocaleTimeString()}
                </div>
              )}
            </div>

            <div className="space-y-2 text-xs text-zinc-400 bg-zinc-950/60 p-3 rounded-xl border border-zinc-850">
              <p className="font-semibold text-zinc-300">💡 ¿Cómo vincular o activar tu cuenta?</p>
              <ol className="list-decimal list-inside space-y-1 text-[11px]">
                <li>Abre tu chat con el Bot en Telegram.</li>
                <li>Envía el comando <code>/start</code> desde tu cuenta personal de Administradora.</li>
                <li>El bot leerá tu estrella de Telegram Premium y habilitará automáticamente los emojis en este Panel.</li>
              </ol>
            </div>

            {syncMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  syncMessage.type === 'success'
                    ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-950/60 border border-amber-500/40 text-amber-300'
                }`}
              >
                {syncMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                )}
                <span className="leading-relaxed">{syncMessage.text}</span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleSyncPremium}
                disabled={syncing}
                className="flex-1 py-2.5 px-3 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-extrabold text-xs cursor-pointer shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Verificando con Telegram...' : '🔄 Sincronizar Ahora'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popover Selector de Emojis VIP */}
      {isOpen && isPremium && (
        <div
          className="absolute right-0 top-full mt-2 z-70 w-80 sm:w-96 bg-zinc-900 border border-amber-500/40 rounded-2xl shadow-2xl p-3 space-y-2.5 text-xs animate-in fade-in zoom-in-95 duration-150"
          style={{ minWidth: '300px' }}
        >
          {/* Header Popover */}
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>Selector de Emojis VIP</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Selector de Paquetes en pestañas */}
          {loadingPacks ? (
            <div className="py-4 text-center text-zinc-500 flex items-center justify-center gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-pink-400" />
              Cargando paquetes...
            </div>
          ) : packs.length === 0 ? (
            <div className="py-4 text-center text-zinc-500 text-xs">
              No hay paquetes de emojis importados aún. Ve a la pestaña "Emojis VIP" para importarlos.
            </div>
          ) : (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
              {packs.map((p) => (
                <button
                  key={p.shortName}
                  type="button"
                  onClick={() => setSelectedPack(p.shortName)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedPack === p.shortName
                      ? 'bg-pink-600 text-white shadow-sm shadow-pink-600/30'
                      : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-750'
                  }`}
                  title={`${p.shortName} (${p.count} emojis)`}
                >
                  {p.shortName}
                </button>
              ))}
            </div>
          )}

          {/* Rejilla de Emojis */}
          {loadingStickers ? (
            <div className="py-8 text-center text-zinc-500 flex items-center justify-center gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-pink-400" />
              Cargando emojis...
            </div>
          ) : stickers.length === 0 ? (
            <div className="py-6 text-center text-zinc-500 text-xs">
              Este paquete no contiene stickers registrados.
            </div>
          ) : (
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-56 overflow-y-auto p-1.5 bg-zinc-950/70 rounded-xl border border-zinc-800/80">
              {stickers.map((stk) => (
                <button
                  key={stk.customEmojiId}
                  type="button"
                  onClick={() => handleEmojiClick(stk.customEmojiId, stk.emoji)}
                  className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-pink-500/50 flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-90"
                  title={`Insertar: ${stk.emoji || 'Emoji'}`}
                >
                  <div className="w-6 h-6 flex items-center justify-center pointer-events-none">
                    {renderEmojiPreview(stk.customEmojiId, stk.emoji, 24)}
                  </div>
                  <span className="text-[8px] text-zinc-500 font-mono mt-0.5 truncate max-w-full pointer-events-none">
                    {stk.emoji || '✨'}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="text-[10px] text-zinc-400 italic text-center pt-1 border-t border-zinc-850">
            Toca cualquier emoji para insertarlo en tu texto
          </div>
        </div>
      )}
    </div>
  );
};

