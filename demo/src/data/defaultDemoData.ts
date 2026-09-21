import { CreatorProfile } from '../types';

export const initialDemoProfile: CreatorProfile = {
  id: 'demo_creator_1',
  name: 'Creadora VIP',
  username: 'creadora_vip',
  bio: '✨ Creadora Exclusiva (+18) | Esta plataforma es 100% personalizable y se adapta a la medida de cualquier Creadora de Contenido, Modelo o Agencia.',
  avatarUrl: 'https://images.unsplash.com/photo-1603562767384-c8fe55858c2f?auto=format&fit=crop&w=600&q=80',
  coverUrl: 'https://images.unsplash.com/photo-1483884105135-c06ea81a7a80?auto=format&fit=crop&w=1200&q=80',
  status: 'disponible',
  telegramChannelName: 'Canal VIP • Creadora Oficial',
  telegramBotName: 'Creadora_VipBot',
  telegramChannelSubscribers: 4320,
  links: [
    {
      id: 'l1',
      platform: 'onlyfans',
      title: 'OnlyFans VIP',
      url: 'https://onlyfans.com/creadora_vip',
      is_active: true
    },
    {
      id: 'l2',
      platform: 'fanvue',
      title: 'Fanvue Oficial',
      url: 'https://fanvue.com/creadora_vip',
      is_active: true
    },
    {
      id: 'l3',
      platform: 'fansly',
      title: 'Fansly VIP',
      url: 'https://fansly.com/creadora_vip',
      is_active: true
    },
    {
      id: 'l4',
      platform: 'instagram',
      title: 'Instagram Personal',
      url: 'https://instagram.com/creadora_vip',
      is_active: true
    },
    {
      id: 'l5',
      platform: 'whatsapp',
      title: 'WhatsApp Privado',
      url: 'https://wa.me/59170000000',
      is_active: true
    }
  ],
  // 16 Contenidos en total: 11 Free y 5 VIP Pago con Estrellas (~31%)
  // Cero rostros: Siluetas femeninas difuminadas y artísticas a contraluz
  media: [
    // 1. Foto Free (Silueta atardecer dorado)
    {
      id: 'm1',
      url: 'https://images.unsplash.com/photo-1508153460964-48ffffcb0829?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: false,
      starsPrice: 0,
      caption: '🌸 Sesión a contraluz en estudio. ¡Bienvenidas a mi espacio VIP!',
      createdAt: 'Hace 2 horas'
    },
    // 2. Foto VIP Stars (1/5)
    {
      id: 'm2',
      url: 'https://images.unsplash.com/photo-1648330578222-13ca65367087?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: true,
      starsPrice: 50,
      caption: '🔥 Silueta íntima a contraluz en golden hour · Colección exclusiva.',
      createdAt: 'Hace 4 horas'
    },
    // 3. Foto Free
    {
      id: 'm3',
      url: 'https://images.unsplash.com/photo-1556065685-813b084639c5?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: false,
      starsPrice: 0,
      caption: '✨ Silueta y reflejos en el agua en alta definición.',
      createdAt: 'Hace 6 horas'
    },
    // 4. Video Free (1/4 videos)
    {
      id: 'm4',
      url: './videos/demo_video_1.mp4',
      posterUrl: 'https://images.unsplash.com/photo-1637699344843-39cecad43588?auto=format&fit=crop&w=900&q=80',
      type: 'video',
      isStarsLocked: false,
      starsPrice: 0,
      caption: '🎥 Teaser de la sesión privada en estudio. ¡Activa el audio!',
      createdAt: 'Hace 1 día'
    },
    // 5. Foto Free
    {
      id: 'm5',
      url: 'https://images.unsplash.com/photo-1542533450-52ccfdc39aba?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: false,
      starsPrice: 0,
      caption: '🖤 Elegancia de silueta nocturna junto al mar.',
      createdAt: 'Hace 1 día'
    },
    // 6. Foto VIP Stars (2/5)
    {
      id: 'm6',
      url: 'https://images.unsplash.com/photo-1637699344726-b1ea3fff4cae?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: true,
      starsPrice: 75,
      caption: '💎 Silueta artística de estudio · Luces y sombras inéditas.',
      createdAt: 'Hace 2 días'
    },
    // 7. Video Free (2/4 videos)
    {
      id: 'm7',
      url: './videos/demo_video_2.mp4',
      posterUrl: 'https://images.unsplash.com/photo-1495581600346-93f223866d0a?auto=format&fit=crop&w=900&q=80',
      type: 'video',
      isStarsLocked: false,
      starsPrice: 0,
      caption: '🎬 Backstage de producción e iluminación antes del estreno.',
      createdAt: 'Hace 2 días'
    },
    // 8. Foto Free
    {
      id: 'm8',
      url: 'https://images.unsplash.com/photo-1618599056968-4eefc008cef6?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: false,
      starsPrice: 0,
      caption: '☀️ Silueta playera disfrutando el crepúsculo.',
      createdAt: 'Hace 3 días'
    },
    // 9. Foto VIP Stars (3/5)
    {
      id: 'm9',
      url: 'https://images.unsplash.com/photo-1423420634464-89006b3454a8?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: true,
      starsPrice: 100,
      caption: '⭐ Set Ultra VIP: Silueta artística sin censura.',
      createdAt: 'Hace 3 días'
    },
    // 10. Video VIP Stars (4/5 y 3/4 videos)
    {
      id: 'm10',
      url: './videos/demo_video_3.mp4',
      posterUrl: 'https://images.unsplash.com/photo-1603562767384-c8fe55858c2f?auto=format&fit=crop&w=900&q=80',
      type: 'video',
      isStarsLocked: true,
      starsPrice: 150,
      caption: '🔞 Video Exclusivo en Alta Calidad (Acceso con Estrellas).',
      createdAt: 'Hace 4 días'
    },
    // 11. Foto Free
    {
      id: 'm11',
      url: 'https://images.unsplash.com/photo-1729009704569-474ddd86ed3a?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: false,
      starsPrice: 0,
      caption: '🤍 Silueta cálida con destellos de luz solar.',
      createdAt: 'Hace 4 días'
    },
    // 12. Foto Free
    {
      id: 'm12',
      url: 'https://images.unsplash.com/photo-1610729733460-4a284ab02ca1?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: false,
      starsPrice: 0,
      caption: '💄 Silueta con ambientación neón en estudio.',
      createdAt: 'Hace 5 días'
    },
    // 13. Foto VIP Stars (5/5)
    {
      id: 'm13',
      url: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: true,
      starsPrice: 120,
      caption: '👑 Silueta contraluz premium: Solo para miembros suscriptores.',
      createdAt: 'Hace 5 días'
    },
    // 14. Foto Free
    {
      id: 'm14',
      url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: false,
      starsPrice: 0,
      caption: '💋 Silueta artística difuminada en blanco y negro.',
      createdAt: 'Hace 6 días'
    },
    // 15. Video Free (4/4 videos)
    {
      id: 'm15',
      url: './videos/demo_video_4.mp4',
      posterUrl: 'https://images.unsplash.com/photo-1483884105135-c06ea81a7a80?auto=format&fit=crop&w=900&q=80',
      type: 'video',
      isStarsLocked: false,
      starsPrice: 0,
      caption: '✨ Video cinemático en bucle · Saludo especial a suscriptores.',
      createdAt: 'Hace 6 días'
    },
    // 16. Foto Free
    {
      id: 'm16',
      url: 'https://images.unsplash.com/photo-1508153460964-48ffffcb0829?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: false,
      starsPrice: 0,
      caption: '🌹 Cerrando el set con esta silueta al horizonte.',
      createdAt: 'Hace 1 semana'
    }
  ],
  paymentMethods: [
    {
      id: 'pm1',
      title: '🇧🇴 QR Simple (Bolivia)',
      description: 'Transferencia inmediata vía QR para todos los bancos de Bolivia (Banco Unión, BCP, BNB, Banco FIE, etc.).',
      is_active: true,
      image_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=PAGO_VIP_DEMO_QR_BOLIVIA',
      category: 'qr'
    },
    {
      id: 'pm2',
      title: '🪙 Cripto USDT (TRC20 / BEP20)',
      description: 'Pagos en USDT o Binance Pay. Rápido, anónimo y sin comisiones intermedias.',
      is_active: true,
      image_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=TRC20_WALLET_DEMO_TUVIPFREE',
      category: 'crypto'
    },
    {
      id: 'pm3',
      title: '🇺🇸 Zelle (USA)',
      description: 'Pagos directos en dólares desde cualquier cuenta bancaria en Estados Unidos.',
      is_active: true,
      category: 'bank'
    },
    {
      id: 'pm4',
      title: '💳 Tarjeta / PayPal / Western Union',
      description: 'Aceptamos transferencias internacionales para suscriptores en Chile, Perú, Argentina, México, España y USA.',
      is_active: true,
      category: 'other'
    }
  ]
};

