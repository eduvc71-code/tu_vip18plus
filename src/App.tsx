import { useState, useEffect } from 'react';
import { Profile, CustomButton, DynamicPoll, PaymentMethod } from './types';
import { Header } from './components/Header';
import { ProfileCard } from './components/ProfileCard';
import { ProfileDetailModal } from './components/ProfileDetailModal';
import { RequestModal, TelegramUserContext } from './components/RequestModal';
import { AgeModal } from './components/AgeModal';
import { AdminPanel } from './components/AdminPanel';
import { TelegramGate } from './components/TelegramGate';
import { PaymentMethodsModal } from './components/PaymentMethodsModal';
import { Heart, Send, Sparkles, UserCheck, X, ExternalLink, BarChart2, CheckCircle2, CreditCard } from 'lucide-react';

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [customButtons, setCustomButtons] = useState<CustomButton[]>([]);
  const [activePolls, setActivePolls] = useState<DynamicPoll[]>([]);
  const [userVotedPolls, setUserVotedPolls] = useState<Record<string, number>>({});
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [adminContactUsername, setAdminContactUsername] = useState('IAM_Danii_VIP_bot');
  const [loading, setLoading] = useState(true);

  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [requestProfile, setRequestProfile] = useState<Profile | null>(null);

  const [botUsername, setBotUsername] = useState('IAM_Danii_VIP_bot');
  const [channelId, setChannelId] = useState('-1004356066811');
  const [modelDisplayName, setModelDisplayName] = useState('IAM Danii');
  const [modelVipLink, setModelVipLink] = useState('');
  const [telegramAuthorized, setTelegramAuthorized] = useState(false);
  const [accessChecking, setAccessChecking] = useState(true);
  const [pinnedText, setPinnedText] = useState('');
  const [pinnedActive, setPinnedActive] = useState(false);

  const [showIntroBanner, setShowIntroBanner] = useState(false);
  const [isAdminView, setIsAdminView] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return Boolean(
      params.get('admin_token') ||
      params.get('admin') === 'true' ||
      params.get('panel') === 'true'
    );
  });

  // Telegram User Context state
  const [tgUser, setTgUser] = useState<TelegramUserContext | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntroBanner(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin_token') || params.get('admin') === 'true' || params.get('panel') === 'true') {
      setIsAdminView(true);
      setAccessChecking(false);
      return;
    }

    // Permitir previsualización en navegador local con ?dev=true o ?preview=true
    if (params.get('dev') === 'true' || params.get('preview') === 'true') {
      setTelegramAuthorized(true);
      setTgUser({
        id: '123456789',
        first_name: 'Usuario Demo',
        username: 'demo_user'
      });
      setAccessChecking(false);
      return;
    }

    const tgWebApp = (window as any).Telegram?.WebApp;
    if (tgWebApp) {
      try {
        tgWebApp.ready();
        tgWebApp.expand();

        // 1. Solicitar Pantalla Completa nativa (Telegram Bot API 8.0+)
        if (typeof tgWebApp.requestFullscreen === 'function') {
          try {
            tgWebApp.requestFullscreen();
          } catch (fsErr) {
            console.warn('[Telegram Fullscreen]:', fsErr);
          }
        }

        // 2. Mimetizar color de la barra superior con el fondo oscuro (#09090b)
        if (typeof tgWebApp.setHeaderColor === 'function') {
          try {
            tgWebApp.setHeaderColor('#09090b');
          } catch {}
        }
        if (typeof tgWebApp.setBackgroundColor === 'function') {
          try {
            tgWebApp.setBackgroundColor('#09090b');
          } catch {}
        }

        // 3. Desactivar deslizamiento vertical accidental que cierra la Mini App
        if (typeof tgWebApp.disableVerticalSwipes === 'function') {
          try {
            tgWebApp.disableVerticalSwipes();
          } catch {}
        }

        // 4. Forzar primer plano, pantalla única y grande continua
        if (typeof tgWebApp.onEvent === 'function') {
          try {
            tgWebApp.onEvent('viewportChanged', () => {
              if (!tgWebApp.isExpanded) {
                tgWebApp.expand();
              }
              if (typeof tgWebApp.requestFullscreen === 'function' && !tgWebApp.isFullscreen) {
                try { tgWebApp.requestFullscreen(); } catch {}
              }
            });
          } catch {}
        }
      } catch {
        // Safe fallback
      }

      setTelegramAuthorized(true);
      if (tgWebApp.initDataUnsafe?.user?.id) {
        setTgUser({
          id: String(tgWebApp.initDataUnsafe.user.id),
          first_name: tgWebApp.initDataUnsafe.user.first_name || 'Usuario Telegram',
          username: tgWebApp.initDataUnsafe.user.username || undefined
        });
      }
    }

    const initData = String(tgWebApp?.initData || '');
    if (initData) {
      fetch('/api/telegram/access/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: initData })
      })
        .then(async response => ({ ok: response.ok, data: await response.json() }))
        .then(({ ok, data }) => {
          if (ok && data?.user?.id) {
            setTelegramAuthorized(true);
            setTgUser({
              id: String(data.user.id),
              first_name: data.user.first_name || 'Usuario Telegram',
              username: data.user.username || undefined
            });
          }
        })
        .catch(() => {})
        .finally(() => setAccessChecking(false));
    } else {
      setAccessChecking(false);
    }
  }, []);

  // Fetch Public Info & Profiles
  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const [resProfiles, resInfo, resButtons, resPolls, resPay] = await Promise.all([
        fetch('/api/profiles'),
        fetch('/api/info'),
        fetch('/api/buttons/public?target=miniapp'),
        fetch('/api/polls/active'),
        fetch('/api/payment-methods')
      ]);

      if (resProfiles.ok) {
        const data = await resProfiles.json();
        setProfiles(data);
      }
      if (resButtons.ok) {
        setCustomButtons(await resButtons.json());
      }
      if (resPolls.ok) {
        setActivePolls(await resPolls.json());
      }
      if (resPay && resPay.ok) {
        setPaymentMethods(await resPay.json());
      }
      if (resInfo.ok) {
        const info = await resInfo.json();
        if (info.bot_username) {
          const safeBot = info.bot_username.replace(/^@/, '').trim();
          setBotUsername(safeBot || 'IAM_Danii_VIP_bot');
        }
        if (info.admin_contact_username) {
          setAdminContactUsername(info.admin_contact_username.replace(/^@/, '').trim());
        }
        if (info.channel_id) setChannelId(info.channel_id);
        if (info.pinned_message_text !== undefined) setPinnedText(info.pinned_message_text);
        if (info.pinned_message_active !== undefined) setPinnedActive(Boolean(info.pinned_message_active));
        if (info.model_display_name) setModelDisplayName(info.model_display_name);
        if (info.model_vip_link !== undefined) setModelVipLink(info.model_vip_link);
      }
    } catch {
      // safe fallback
    } finally {
      setLoading(false);
    }
  };

  const handleVotePoll = async (pollId: string, optionIndex: number) => {
    try {
      const voterId = tgUser?.id || (typeof window !== 'undefined' ? (localStorage.getItem('danii_voter_id') || (() => {
        const gen = 'guest_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('danii_voter_id', gen);
        return gen;
      })()) : 'user');

      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          option_index: optionIndex,
          user_id: voterId
        })
      });
      const data = await res.json();
      if (res.ok && data.poll) {
        setActivePolls(prev => prev.map(p => p.id === pollId ? data.poll : p));
        setUserVotedPolls(prev => ({ ...prev, [pollId]: optionIndex }));
      }
    } catch {
      // safe fallback
    }
  };

  useEffect(() => {
    fetchProfiles();

    // Subscribe to SSE for live real-time updates when Administrator updates profiles on Telegram
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = () => {
      fetchProfiles();
    };
    eventSource.addEventListener('PROFILE_UPDATED', () => fetchProfiles());
    eventSource.addEventListener('PROFILE_DELETED', () => fetchProfiles());
    eventSource.addEventListener('TELEGRAM_UPDATE', () => fetchProfiles());
    eventSource.addEventListener('PAYMENT_METHOD_UPDATED', () => fetchProfiles());
    eventSource.addEventListener('REACTION_UPDATED', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data?.profileId && data?.reactions) {
          setProfiles((prev) =>
            prev.map((p) => (p.id === data.profileId ? { ...p, reactions: data.reactions } : p))
          );
          setSelectedProfile((prev) =>
            prev && prev.id === data.profileId ? { ...prev, reactions: data.reactions } : prev
          );
        } else {
          fetchProfiles();
        }
      } catch {
        fetchProfiles();
      }
    });

    return () => {
      eventSource.close();
    };
  }, []);

  // This template presents one creator profile.
  const filteredProfiles = profiles.slice(0, 1);

  const displayName = modelDisplayName?.trim() || 'IAM Danii';

  const isAccessAllowed = telegramAuthorized && Boolean(tgUser);

  if (isAdminView) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
        <AdminPanel
          isOpen={true}
          onClose={() => {
            setIsAdminView(false);
            try {
              const urlParams = new URLSearchParams(window.location.search);
              urlParams.delete('admin');
              urlParams.delete('panel');
              urlParams.delete('admin_token');
              const newQuery = urlParams.toString();
              const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : '');
              window.history.replaceState({}, document.title, newUrl);
            } catch {}
          }}
          botUsername={botUsername}
          channelId={channelId}
        />
      </div>
    );
  }

  if (accessChecking) {
    return <div className="min-h-screen bg-zinc-950" aria-label="Validando acceso desde Telegram" />;
  }

  if (!isAccessAllowed) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
        <TelegramGate
          botUsername={botUsername}
          onOpenAdmin={() => setIsAdminView(true)}
          onContinue={() => {
            setTelegramAuthorized(true);
            setTgUser({ id: 'guest', first_name: 'Visitante VIP' });
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-zinc-950">
      
      {/* Age Modal Gate (+18) */}
      <AgeModal onConfirm={() => fetchProfiles()} modelName={displayName} />

      {/* Main Header & Navbar */}
      <Header
        botUsername={botUsername}
        modelName={displayName}
        onRefresh={fetchProfiles}
        loading={loading}
        onOpenAdmin={() => setIsAdminView(true)}
      />

      {/* Main Catalog View */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        
        {/* Intro Splash Welcome Banner (desaparece automático tras 5s o con botón X) */}
        {showIntroBanner && (
          <div className="relative rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-zinc-950 border border-amber-500/30 p-4 sm:p-6 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
            <button
              onClick={() => setShowIntroBanner(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer z-20"
              title="Cerrar introducción"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Contenido Exclusivo VIP
                  </span>
                  {tgUser && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 border border-sky-500/40 text-sky-300">
                      <UserCheck className="w-3 h-3" />
                      {tgUser.first_name}
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white font-serif truncate">
                  Galería Privada de {displayName}
                </h2>
                <p className="text-xs text-zinc-300 mt-0.5 truncate">
                  Suscripciones y contenido exclusivo.
                </p>
                {modelVipLink && (
                  <a
                    href={modelVipLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center mt-2 text-[11px] font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-4"
                  >
                    Abrir red social
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pinned Announcement Banner from Admin */}
        {pinnedActive && pinnedText && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 border border-amber-500/40 text-amber-200 text-sm flex items-center gap-3 shadow-lg shadow-amber-500/5">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="flex-1 font-medium">
              <strong className="text-amber-400 uppercase tracking-wide mr-2">[Anuncio Fijado]</strong>
              {pinnedText}
            </div>
          </div>
        )}

        {/* Custom Interactive Buttons */}
        {customButtons.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2.5 my-3">
            {customButtons.map(btn => (
              <a
                key={btn.id}
                href={btn.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-zinc-900 to-amber-500/10 hover:from-amber-500/30 hover:to-amber-500/20 border border-amber-500/40 text-amber-300 hover:text-amber-200 font-bold text-xs shadow-lg shadow-amber-500/5 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{btn.label}</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            ))}
          </div>
        )}

        {/* Profile Section */}
        <section className="space-y-5">

          {loading && profiles.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-zinc-400">Cargando contenido exclusivo...</p>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="py-16 text-center bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 space-y-3">
              <Heart className="w-10 h-10 text-zinc-600 mx-auto" />
              <h4 className="text-base font-bold text-white">No se encontró contenido.</h4>
              <p className="text-xs text-zinc-400">El administrador aún no ha publicado el perfil.</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-full">
                {filteredProfiles.map((p: Profile) => (
                  <ProfileCard
                    key={p.id}
                    profile={p}
                    botUsername={botUsername}
                    modelName={displayName}
                    modelVipLink={modelVipLink}
                    onSelectProfile={(prof: Profile) => setSelectedProfile(prof)}
                    onRequestAvailability={(prof: Profile) => setRequestProfile(prof)}
                    onOpenPaymentMethods={() => setShowPaymentModal(true)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Dynamic Polls Section */}
        {activePolls.length > 0 && (
          <div className="space-y-4 my-6">
            {activePolls.map(poll => {
              const totalVotes = Object.values(poll.votes || {}).reduce((a, b) => a + b, 0);
              const userVoted = userVotedPolls[poll.id] !== undefined;
              return (
                <div key={poll.id} className="p-5 rounded-3xl bg-zinc-900/90 border border-amber-500/30 shadow-xl space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
                      <BarChart2 className="w-4 h-4" />
                    </span>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                      Encuesta Exclusiva
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {poll.question}
                  </h3>

                  <div className="space-y-2">
                    {poll.options.map((opt, idx) => {
                      const votes = (poll.votes?.[idx] ?? (poll.votes as any)?.[opt]) || 0;
                      const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                      const isSelected = userVotedPolls[poll.id] === idx;

                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => !userVoted && handleVotePoll(poll.id, idx)}
                          disabled={userVoted}
                          className={`w-full text-left p-3 rounded-2xl border transition-all relative overflow-hidden group cursor-pointer ${
                            isSelected
                              ? 'border-amber-500 bg-amber-500/15 text-white shadow-md shadow-amber-500/10'
                              : userVoted
                              ? 'border-zinc-800 bg-zinc-950/60 text-zinc-300'
                              : 'border-zinc-800 bg-zinc-950/80 hover:border-amber-500/60 hover:bg-zinc-900 text-zinc-200 active:scale-[0.99]'
                          }`}
                        >
                          {userVoted && (
                            <div
                              className={`absolute inset-y-0 left-0 transition-all duration-500 ${isSelected ? 'bg-amber-500/25' : 'bg-zinc-800/40'}`}
                              style={{ width: `${pct}%` }}
                            />
                          )}

                          <div className="relative z-10 flex items-center justify-between gap-3 text-xs">
                            <span className="font-semibold flex items-center gap-2">
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                              {opt}
                            </span>
                            {userVoted && (
                              <span className="font-mono text-[11px] font-bold text-amber-400 shrink-0">
                                {votes} ({pct}%)
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                    <span>{totalVotes} {totalVotes === 1 ? 'voto' : 'votos'}</span>
                    <span>{userVoted ? '✓ Ya participaste en esta encuesta' : 'Toca una opción para votar'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* Legal Footer & Discretion Disclaimer */}
      <footer className="mt-12 bg-zinc-950 border-t border-zinc-900 text-zinc-400 text-xs py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500">
            <p>© {new Date().getFullYear()} {displayName}. Todos los derechos reservados.</p>
            <div className="flex items-center gap-4">
              <a href={`https://t.me/${botUsername}`} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 flex items-center gap-1 transition-colors">
                <Send className="w-3.5 h-3.5" /> Canal VIP Telegram
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Profile Detail Lightbox Modal */}
      <ProfileDetailModal
        profile={selectedProfile}
        botUsername={botUsername}
        modelName={displayName}
        modelVipLink={modelVipLink}
        onClose={() => setSelectedProfile(null)}
        onRequestAvailability={(prof: Profile) => setRequestProfile(prof)}
      />

      {/* Customer Availability Request Modal */}
      <RequestModal
        profile={requestProfile}
        modelName={displayName}
        tgUserContext={tgUser}
        onClose={() => setRequestProfile(null)}
      />

      {/* Payment Methods Modal */}
      <PaymentMethodsModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        adminContactUsername={adminContactUsername}
        paymentMethods={paymentMethods}
      />

    </div>
  );
}
