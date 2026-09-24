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
import { SplashScreen } from './components/SplashScreen';
import { Heart, Send, Sparkles, UserCheck, X, ExternalLink, BarChart2, CheckCircle2, CreditCard } from 'lucide-react';

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [customButtons, setCustomButtons] = useState<CustomButton[]>([]);
  const [activePolls, setActivePolls] = useState<DynamicPoll[]>([]);
  const [userVotedPolls, setUserVotedPolls] = useState<Record<string, number>>({});
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [adminContactUsername, setAdminContactUsername] = useState('Danii_Catalogo_SCZ_bot');
  const [loading, setLoading] = useState(true);

  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | undefined>(undefined);
  const [requestProfile, setRequestProfile] = useState<Profile | null>(null);

  const [botUsername, setBotUsername] = useState('Danii_Catalogo_SCZ_bot');
  const [channelId, setChannelId] = useState('-1004356066811');
  const [modelDisplayName, setModelDisplayName] = useState('IAM Danii');
  const [modelVipLink, setModelVipLink] = useState('');
  const [telegramAuthorized, setTelegramAuthorized] = useState(false);
  const [accessChecking, setAccessChecking] = useState(true);
  const [pinnedText, setPinnedText] = useState('');
  const [pinnedActive, setPinnedActive] = useState(false);

  // Splash Screen & Welcome States
  const [welcomeMediaUrl, setWelcomeMediaUrl] = useState('');
  const [welcomeMediaType, setWelcomeMediaType] = useState<'photo' | 'video'>('photo');
  const [splashDescription, setSplashDescription] = useState('');
  const [showSplash, setShowSplash] = useState(true);
  const [isAgeVerified, setIsAgeVerified] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return Boolean(localStorage.getItem('danii_vip_subscriber_active') || localStorage.getItem('danii_vip_age_verified'));
    } catch {
      return false;
    }
  });
  const [showAgeModal, setShowAgeModal] = useState(false);

  const [isAdminView, setIsAdminView] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname.toLowerCase();
    return Boolean(
      params.get('admin_token') ||
      params.get('admin') === 'true' ||
      params.get('panel') === 'true' ||
      path === '/admin' ||
      path.startsWith('/admin/')
    );
  });
  const [isAdminClosed, setIsAdminClosed] = useState(false);

  // Telegram User Context state
  const [tgUser, setTgUser] = useState<TelegramUserContext | null>(null);

  // Detección precisa de si la vista actual se ejecuta dentro del contenedor Mini App / Webview de Telegram
  const isInsideTelegramMiniApp = typeof window !== 'undefined' && Boolean(
    (window as any).TelegramWebviewProxy ||
    ((window as any).Telegram?.WebApp && (
      ((window as any).Telegram.WebApp.initData && (window as any).Telegram.WebApp.initData.length > 0) ||
      ((window as any).Telegram.WebApp.platform && (window as any).Telegram.WebApp.platform !== 'unknown')
    )) ||
    window.location.hash.includes('tgWebAppData') ||
    window.location.search.includes('tgWebApp')
  );

  useEffect(() => {
    // Si es vista de administración y se abrió dentro del modal de Mini App de Telegram:
    // Hacemos handoff automático para que se abra en Google Chrome / Safari externo
    if (isAdminView && isInsideTelegramMiniApp) {
      const tg = (window as any).Telegram?.WebApp;
      if (tg && typeof tg.openLink === 'function') {
        try {
          const cleanUrl = window.location.origin + window.location.pathname + window.location.search;
          tg.openLink(cleanUrl);
          const t = setTimeout(() => {
            try { tg.close(); } catch {}
          }, 600);
          return () => clearTimeout(t);
        } catch (e) {
          console.warn('[Telegram Handoff Error]:', e);
        }
      }
    }
  }, [isAdminView, isInsideTelegramMiniApp]);

  useEffect(() => {
    // 1. Manejo de URLs de administración y dev/preview
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname.toLowerCase();
    if (
      params.get('admin_token') ||
      params.get('admin') === 'true' ||
      params.get('panel') === 'true' ||
      path === '/admin' ||
      path.startsWith('/admin/')
    ) {
      setIsAdminView(true);
      setAccessChecking(false);
      return;
    }

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

    // 2. Detección y maximización nativa de Telegram
    let timer1: any = null;
    let timer2: any = null;
    let handleUserTouch: any = null;

    const tgWebApp = (window as any).Telegram?.WebApp;
    if (tgWebApp) {
      const enforceFullscreen = () => {
        try {
          if (!tgWebApp.isExpanded) tgWebApp.expand();
        } catch {}
        try {
          // Minimizar la barra nativa de Telegram y ocupar pantalla completa
          if (typeof tgWebApp.requestFullscreen === 'function' && !tgWebApp.isFullscreen) {
            tgWebApp.requestFullscreen();
          }
        } catch {}
      };

      try {
        tgWebApp.ready();
        enforceFullscreen();

        // Mimetizar color de la barra superior con el fondo oscuro (#09090b)
        if (typeof tgWebApp.setHeaderColor === 'function') {
          try { tgWebApp.setHeaderColor('#09090b'); } catch {}
        }
        if (typeof tgWebApp.setBackgroundColor === 'function') {
          try { tgWebApp.setBackgroundColor('#09090b'); } catch {}
        }

        // Desactivar deslizamiento vertical accidental que cierra la Mini App
        if (typeof tgWebApp.disableVerticalSwipes === 'function') {
          try { tgWebApp.disableVerticalSwipes(); } catch {}
        }

        // Forzar primer plano, pantalla única y grande continua
        if (typeof tgWebApp.onEvent === 'function') {
          try {
            tgWebApp.onEvent('viewportChanged', enforceFullscreen);
          } catch {}
        }

        timer1 = setTimeout(enforceFullscreen, 300);
        timer2 = setTimeout(enforceFullscreen, 1000);

        handleUserTouch = () => {
          enforceFullscreen();
          window.removeEventListener('touchstart', handleUserTouch);
          window.removeEventListener('click', handleUserTouch);
        };
        window.addEventListener('touchstart', handleUserTouch, { passive: true });
        window.addEventListener('click', handleUserTouch, { passive: true });
      } catch (err) {
        console.warn('[Telegram Init Error]:', err);
      }

      setTelegramAuthorized(true);
      const user = tgWebApp.initDataUnsafe?.user;
      setTgUser({
        id: String(user?.id || 'telegram_user'),
        first_name: user?.first_name || 'Suscriptor VIP',
        username: user?.username || undefined
      });
    }

    // Liberar verificación para que la pantalla NUNCA se quede en negro
    setAccessChecking(false);

    // 3. Verificación de firma Telegram en segundo plano
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
        .catch(() => {});
    }

    return () => {
      if (timer1) clearTimeout(timer1);
      if (timer2) clearTimeout(timer2);
      if (handleUserTouch) {
        window.removeEventListener('touchstart', handleUserTouch);
        window.removeEventListener('click', handleUserTouch);
      }
    };
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

        // Soporte de Deep Links via startapp / start_param de Telegram
        try {
          const tgApp = (window as any).Telegram?.WebApp;
          const urlParams = new URLSearchParams(window.location.search);
          const sp = String(tgApp?.initDataUnsafe?.start_param || urlParams.get('tgWebAppStartParam') || urlParams.get('startapp') || '').trim();
          if (sp === 'pagos' || sp === 'metodos') {
            setShowPaymentModal(true);
          } else if (sp.startsWith('ver_')) {
            const targetId = sp.replace('ver_', '').trim();
            const found = data.find((p: any) => String(p.id) === targetId);
            if (found) {
              setSelectedProfile(found);
            }
          }
        } catch {}
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
          setBotUsername(safeBot || 'Danii_Catalogo_SCZ_bot');
        }
        if (info.admin_contact_username) {
          setAdminContactUsername(info.admin_contact_username.replace(/^@/, '').trim());
        }
        if (info.channel_id) setChannelId(info.channel_id);
        if (info.pinned_message_text !== undefined) setPinnedText(info.pinned_message_text);
        if (info.pinned_message_active !== undefined) setPinnedActive(Boolean(info.pinned_message_active));
        if (info.model_display_name) setModelDisplayName(info.model_display_name);
        if (info.model_vip_link !== undefined) setModelVipLink(info.model_vip_link);
        if (info.welcome_media_url !== undefined) setWelcomeMediaUrl(info.welcome_media_url || '');
        if (info.welcome_media_type !== undefined) setWelcomeMediaType(info.welcome_media_type || 'photo');
        if (info.splash_description !== undefined) setSplashDescription(info.splash_description || '');
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

  // Restauración activa del scroll táctil en la pantalla principal al cerrar cualquier modal
  useEffect(() => {
    const isAnyModalOpen = Boolean(selectedProfile || showPaymentModal || requestProfile);
    if (!isAnyModalOpen) {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = 'pan-y';

      // Nudge WebKit/Chromium para reanudar el despachador de eventos táctiles
      const rId = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('scroll'));
      }, 50);

      return () => clearTimeout(rId);
    }
  }, [selectedProfile, showPaymentModal, requestProfile]);

  // This template presents one creator profile.
  const filteredProfiles = profiles.slice(0, 1);

  const displayName = modelDisplayName?.trim() || 'IAM Danii';

  const isInsideTelegram = typeof window !== 'undefined' && Boolean((window as any).Telegram?.WebApp);
  // Si se abre el panel administrativo dentro de la Mini App de Telegram,
  // mostramos pantalla de redirección limpia para pasar a Google Chrome / navegador externo.
  if (isAdminView && isInsideTelegramMiniApp) {
    const cleanUrl = window.location.origin + window.location.pathname + window.location.search;
    const tg = (window as any).Telegram?.WebApp;
    return (
      <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center text-zinc-100 font-sans select-none">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center mb-5 shadow-xl shadow-amber-500/10 animate-pulse">
          <ExternalLink className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-xl font-black text-white mb-2 tracking-tight">Abriendo Panel en Navegador Web...</h2>
        <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
          El Panel Administrativo se ejecuta en tu navegador web (<strong className="text-amber-400 font-semibold">Google Chrome / Safari</strong>) como página web completa, sin marcos de Telegram ni botones de Mini App.
        </p>
        <button
          type="button"
          onClick={() => {
            if (tg?.openLink) {
              tg.openLink(cleanUrl);
              setTimeout(() => {
                try { tg.close(); } catch {}
              }, 400);
            } else {
              window.open(cleanUrl, '_system');
            }
          }}
          className="w-full max-w-xs py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-95 transition-all cursor-pointer border border-amber-400/40"
        >
          <ExternalLink className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
          <span>Abrir en Navegador (Chrome / Safari)</span>
        </button>
        <p className="text-[11px] text-zinc-500 mt-4">
          Toca el botón si tu navegador no se abrió automáticamente.
        </p>
      </div>
    );
  }

  if (isAdminView && isAdminClosed) {
    return (
      <div className="fixed inset-0 z-50 bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5 shadow-2xl">
          <CheckCircle2 className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-xl font-black text-white mb-2 tracking-tight">Panel Administrativo Cerrado</h2>
        <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
          Has cerrado el Panel de Administración. Puedes cerrar esta pestaña en tu navegador con total seguridad.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            type="button"
            onClick={() => {
              try { window.close(); } catch {}
              try { window.open('', '_self', ''); window.close(); } catch {}
            }}
            className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-zinc-700/60 transition-all cursor-pointer"
          >
            <X className="w-4 h-4 text-zinc-400" />
            <span>Cerrar Pestaña</span>
          </button>
          <a
            href={`https://t.me/${botUsername}`}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Volver al Bot de Telegram</span>
          </a>
          <button
            type="button"
            onClick={() => setIsAdminClosed(false)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer pt-2"
          >
            Reabrir Panel Admin
          </button>
        </div>
      </div>
    );
  }

  if (isAdminView) {
    return (
      <div className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] bg-zinc-950 text-zinc-100 font-sans p-0 m-0 flex flex-col overflow-hidden">
        <AdminPanel
          isOpen={true}
          onClose={() => {
            try {
              const tg = (window as any).Telegram?.WebApp;
              if (tg?.close) tg.close();
            } catch {}
            try { window.close(); } catch {}
            try { window.open('', '_self', ''); window.close(); } catch {}
            setIsAdminClosed(true);
          }}
          botUsername={botUsername}
          channelId={channelId}
        />
      </div>
    );
  }

  const isAccessAllowed = telegramAuthorized || Boolean(tgUser) || isInsideTelegram;

  if (accessChecking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-9 h-9 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin mb-3" />
        <p className="text-xs font-bold text-zinc-400">Cargando Canal VIP Free...</p>
      </div>
    );
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
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-zinc-950 touch-pan-y">
      
      {/* Splash Screen / Preview (Siempre visible al ingresar a la Mini App) */}
      {showSplash && (
        <SplashScreen
          mediaUrl={welcomeMediaUrl || filteredProfiles[0]?.photos?.[0]}
          mediaType={welcomeMediaType}
          modelName={displayName}
          splashDescription={splashDescription}
          onFinish={() => {
            setShowSplash(false);
            if (!isAgeVerified) {
              setShowAgeModal(true);
            }
          }}
        />
      )}

      {/* Age Modal Gate (+18) - Aparece tras el splash si es nuevo usuario */}
      <AgeModal
        isOpen={showAgeModal}
        onConfirm={() => {
          setIsAgeVerified(true);
          setShowAgeModal(false);
          fetchProfiles();
        }}
        modelName={displayName}
      />

      {/* Main Header & Navbar */}
      <Header
        botUsername={botUsername}
        modelName={displayName}
        onRefresh={fetchProfiles}
        loading={loading}
      />

      {/* Main Catalog View - Optimizado para aprovechar la pantalla en móviles */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-2 sm:px-6 lg:px-8 py-3 sm:py-6 space-y-5 sm:space-y-8 touch-pan-y">

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
                    onSelectProfile={(prof: Profile) => {
                      setSelectedMediaUrl(undefined);
                      setSelectedProfile(prof);
                    }}
                    onSelectMedia={(prof: Profile, mediaUrl?: string) => {
                      setSelectedMediaUrl(mediaUrl);
                      setSelectedProfile(prof);
                    }}
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
              <button
                type="button"
                onClick={() => {
                  const adminUrl = window.location.origin + '/?admin=true';
                  const tg = (window as any).Telegram?.WebApp;
                  if (tg?.openLink && isInsideTelegramMiniApp) {
                    tg.openLink(adminUrl);
                  } else {
                    setIsAdminView(true);
                  }
                }}
                title="Acceso Administrativo"
                className="opacity-20 hover:opacity-100 hover:text-amber-400 transition-opacity text-[10px] cursor-pointer"
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Profile Detail Lightbox Modal */}
      {selectedProfile && (
        <ProfileDetailModal
          profile={selectedProfile}
          initialMediaUrl={selectedMediaUrl}
          botUsername={botUsername}
          modelName={displayName}
          modelVipLink={modelVipLink}
          onClose={() => {
            setSelectedProfile(null);
            setSelectedMediaUrl(undefined);
            try {
              document.body.style.overflow = '';
              document.documentElement.style.overflow = '';
              document.body.style.touchAction = 'pan-y';
            } catch {}
          }}
          onOpenPaymentMethods={() => setShowPaymentModal(true)}
          onRequestAvailability={(prof: Profile) => setRequestProfile(prof)}
        />
      )}

      {/* Customer Availability Request Modal */}
      <RequestModal
        profile={requestProfile}
        modelName={displayName}
        tgUserContext={tgUser}
        onOpenPaymentMethods={() => setShowPaymentModal(true)}

        onClose={() => {
          setRequestProfile(null);
          try {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
            document.body.style.touchAction = 'pan-y';
          } catch {}
        }}
      />

      {/* Payment Methods Modal */}
      <PaymentMethodsModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          try {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
            document.body.style.touchAction = 'pan-y';
          } catch {}
        }}
        adminContactUsername={adminContactUsername}
        paymentMethods={paymentMethods}
      />

    </div>
  );
}
