import React, { useState, useEffect } from 'react';
import { renderEmojiPreview, renderEmojiTag } from '../client/mtprotoHelpers';
import { Download, Trash2, Copy, Check, Sparkles, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface StickerItem {
  shortName: string;
  customEmojiId: string;
  emoji: string;
  addedAt?: string;
}

interface PackSummary {
  shortName: string;
  count: number;
}

const DEFAULT_PACK_URLS = [
  'https://t.me/addemoji/KirillUsenkoPack',
  'https://t.me/addemoji/Fonts5ByAlane_Daires_by_fStikBot',
  'https://t.me/addemoji/MagnetaFont',
  'https://t.me/addemoji/L4EVector001_by_fStikBot',
  'https://t.me/addemoji/LoveDayEmoji',
  'https://t.me/addemoji/Decoration_Pack2',
  'https://t.me/addemoji/EffectEmoji',
  'https://t.me/addemoji/PencilEmoji',
  'https://t.me/addemoji/Pinkholographic',
  'https://t.me/addemoji/ToryStick_pink002_by_TgEmodziBot',
  'https://t.me/addemoji/SoftPinkTonesEmojiSet'
];

interface EmojiPackManagerProps {
  token: string | null;
  onSelectEmojiTag?: (tag: string) => void;
}

export const EmojiPackManager: React.FC<EmojiPackManagerProps> = ({ token, onSelectEmojiTag }) => {
  const [urlsInput, setUrlsInput] = useState<string>(DEFAULT_PACK_URLS.join('\n'));
  const [importing, setImporting] = useState<boolean>(false);
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [selectedPack, setSelectedPack] = useState<string>('');
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [loadingStickers, setLoadingStickers] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchPacks = async () => {
    if (!token) return;
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
      console.error('Error fetching emoji packs:', e);
    }
  };

  const fetchStickers = async (shortName: string) => {
    if (!token || !shortName) return;
    setLoadingStickers(true);
    try {
      const res = await fetch(`/api/admin/emoji-pack/${encodeURIComponent(shortName)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStickers(data);
      }
    } catch (e) {
      console.error('Error fetching pack stickers:', e);
    } finally {
      setLoadingStickers(false);
    }
  };

  useEffect(() => {
    fetchPacks();
  }, [token]);

  useEffect(() => {
    if (selectedPack) {
      fetchStickers(selectedPack);
    } else {
      setStickers([]);
    }
  }, [selectedPack, token]);

  const handleImport = async () => {
    if (!token) return;
    const urls = urlsInput
      .split('\n')
      .map(u => u.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      showNotification('error', 'Por favor ingresa al menos un enlace de pack de emojis.');
      return;
    }

    setImporting(true);
    try {
      const res = await fetch('/api/admin/emoji-pack/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ urls })
      });
      const data = await res.json();
      const totalImported = data.totalImported ?? (data.results || []).reduce((acc: number, cur: any) => acc + (cur.count || 0), 0);
      if (res.ok && data.success && totalImported > 0) {
        showNotification('success', `¡Importación completada! Se procesaron ${data.results?.length || 0} packs (${totalImported} emojis en total).`);
        fetchPacks();
      } else {
        const errorMsg = data.error || data.results?.find((r: any) => r.error)?.error || 'No se importó ningún emoji. Verifica el enlace o nombre del pack.';
        showNotification('error', errorMsg);
      }
    } catch {
      showNotification('error', 'Error de conexión con el servidor al importar.');
    } finally {
      setImporting(false);
    }
  };

  const handleDeletePack = async (shortName: string) => {
    if (!token) return;
    if (!confirm(`¿Eliminar el pack "${shortName}" de la base de datos?`)) return;

    try {
      const res = await fetch(`/api/admin/emoji-pack/${encodeURIComponent(shortName)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showNotification('success', `Pack ${shortName} eliminado.`);
        if (selectedPack === shortName) {
          setSelectedPack('');
        }
        fetchPacks();
      }
    } catch {
      showNotification('error', 'Error de red al eliminar pack.');
    }
  };

  const handleCopyTag = (customId: string, fallback: string) => {
    const tag = renderEmojiTag(customId, fallback);
    navigator.clipboard.writeText(tag);
    setCopiedId(customId);
    setTimeout(() => setCopiedId(null), 2000);
    if (onSelectEmojiTag) {
      onSelectEmojiTag(tag);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 bg-zinc-950/80 rounded-2xl border border-zinc-800/80">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-pink-400" />
            Importador de Emojis Premium de Telegram
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Importa paquetes mediante la API de Telegram (GramJS). Consumo 100% en CDN remota (0% almacenamiento de multimedia en tu servidor).
          </p>
        </div>
        <button
          type="button"
          onClick={fetchPacks}
          className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all text-xs flex items-center gap-1.5 cursor-pointer"
          title="Refrescar lista de packs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar
        </button>
      </div>

      {notification && (
        <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
          notification.type === 'success' ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300' : 'bg-rose-950/50 border-rose-500/50 text-rose-300'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Formulario de Importación de Enlaces */}
      <div className="flex flex-col gap-2.5 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/60">
        <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
          <span>Enlaces de Telegram Emoji Packs (uno por línea):</span>
          <span className="text-[11px] text-zinc-500 font-normal">{DEFAULT_PACK_URLS.length} enlaces preconfigurados</span>
        </label>
        <textarea
          rows={5}
          value={urlsInput}
          onChange={e => setUrlsInput(e.target.value)}
          placeholder="https://t.me/addemoji/KirillUsenkoPack&#10;https://t.me/addemoji/Pinkholographic"
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 font-mono focus:border-pink-500/60 focus:ring-1 focus:ring-pink-500/60 focus:outline-none resize-y"
        />
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => setUrlsInput(DEFAULT_PACK_URLS.join('\n'))}
            className="text-[11px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
          >
            Restaurar enlaces recomendados
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={importing}
            className="px-4 py-2 rounded-xl bg-linear-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-pink-600/20 disabled:opacity-50 cursor-pointer"
          >
            {importing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Importando desde Telegram...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                Importar Paquetes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Lista de Paquetes Disponibles */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Packs Guardados ({packs.length})
          </h4>
        </div>

        {packs.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-xs bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
            No hay paquetes importados todavía. Presiona "Importar Paquetes" arriba para cargar tus emojis.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {packs.map(p => (
              <div
                key={p.shortName}
                onClick={() => setSelectedPack(p.shortName)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  selectedPack === p.shortName
                    ? 'bg-pink-500/15 border-pink-500/60 text-pink-300 font-bold shadow-sm'
                    : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                }`}
              >
                <span>{p.shortName}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                  {p.count}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePack(p.shortName);
                  }}
                  className="p-1 hover:text-rose-400 text-zinc-500 rounded transition-colors"
                  title="Eliminar este pack"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cuadrícula de Emojis del Pack Seleccionado */}
      {selectedPack && (
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between border-t border-zinc-800/80 pt-4">
            <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-2">
              <span>Emojis en: <span className="text-pink-400 font-mono">{selectedPack}</span></span>
              <span className="text-[11px] text-zinc-500 font-normal">({stickers.length} emojis)</span>
            </h4>
            <span className="text-[11px] text-zinc-400 italic">
              Toca un emoji para copiar su etiqueta &lt;tg-emoji&gt;
            </span>
          </div>

          {loadingStickers ? (
            <div className="flex items-center justify-center py-10 gap-2 text-zinc-400 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-pink-400" />
              Cargando emojis del pack...
            </div>
          ) : stickers.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 text-xs bg-zinc-900/30 rounded-xl">
              Este pack no tiene stickers registrados.
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2.5 max-h-96 overflow-y-auto p-2 bg-zinc-950/60 rounded-xl border border-zinc-800/60">
              {stickers.map((stk) => {
                const isCopied = copiedId === stk.customEmojiId;
                return (
                  <button
                    key={stk.customEmojiId}
                    type="button"
                    onClick={() => handleCopyTag(stk.customEmojiId, stk.emoji)}
                    className="group relative flex flex-col items-center justify-center p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 hover:border-pink-500/50 transition-all cursor-pointer"
                    title={`Copiar etiqueta para: ID ${stk.customEmojiId} (Fallback: ${stk.emoji})`}
                  >
                    <div className="w-8 h-8 flex items-center justify-center">
                      {renderEmojiPreview(stk.customEmojiId, stk.emoji, 30)}
                    </div>
                    <span className="text-[9px] text-zinc-500 mt-1 font-mono truncate max-w-full">
                      {stk.emoji || '✨'}
                    </span>
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isCopied ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-zinc-400 hover:text-white" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

