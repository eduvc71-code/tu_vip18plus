import { CreatorProfile } from '../types';

export const initialDemoProfile: CreatorProfile = {
  id: 'demo_creator_1',
  name: 'Valeria S.',
  username: 'valeria_vip',
  bio: '✨ Modelo & Creadora Exclusiva (+18) | Sesiones VIP de estreno cada semana, backstage íntimo y sets sin censura.',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
  coverUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80',
  status: 'disponible',
  telegramChannelName: 'Valeria VIP • Canal Oficial',
  telegramBotName: 'Valeria_VipBot',
  telegramChannelSubscribers: 4320,
  links: [
    {
      id: 'l1',
      platform: 'onlyfans',
      title: 'OnlyFans VIP',
      url: 'https://onlyfans.com/valeria_vip',
      is_active: true
    },
    {
      id: 'l2',
      platform: 'fanvue',
      title: 'Fanvue Oficial',
      url: 'https://fanvue.com/valeria_vip',
      is_active: true
    },
    {
      id: 'l3',
      platform: 'fansly',
      title: 'Fansly VIP',
      url: 'https://fansly.com/valeria_vip',
      is_active: true
    },
    {
      id: 'l4',
      platform: 'instagram',
      title: 'Instagram Personal',
      url: 'https://instagram.com/valeria_vip',
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
  media: [
    // 1. Foto Free
    {
      id: 'm1',
      url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: false,
      starsPrice: 0,
      caption: '🌸 Sesión Golden Hour en estudio. ¡Bienvenidas a mi espacio VIP!',
      createdAt: 'Hace 2 horas'
    },
    // 2. Foto VIP Stars (1/5)
    {
      id: 'm2',
      url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: true,
      starsPrice: 50,
      caption: '🔥 Set Íntimo sin censura · Colección exclusiva en lencería de seda.',
      createdAt: 'Hace 4 horas'
    },
    // 3. Foto Free
    {
      id: 'm3',
      url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: false,
      starsPrice: 0,
      caption: '✨ Miradas que lo dicen todo. Foto disponible en alta definición.',
      createdAt: 'Hace 6 horas'
    },
    // 4. Video Free (1/4 videos)
    {
      id: 'm4',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      type: 'video',
      isStarsLocked: false,
      starsPrice: 0,
      caption: '🎥 Teaser de la sesión privada de este viernes. ¡Activa el audio!',
      createdAt: 'Hace 1 día'
    },
    // 5. Foto Free
    {
      id: 'm5',
      url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: false,
      starsPrice: 0,
      caption: '🖤 Elegancia nocturna en suite privada.',
      createdAt: 'Hace 1 día'
    },
    // 6. Foto VIP Stars (2/5)
    {
      id: 'm6',
      url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: true,
      starsPrice: 75,
      caption: '💎 Sesión Boudoir Exclusiva · Ángulos inéditos en alta resolución.',
      createdAt: 'Hace 2 días'
    },
    // 7. Video Free (2/4 videos)
    {
      id: 'm7',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      type: 'video',
      isStarsLocked: false,
      starsPrice: 0,
      caption: '🎬 Backstage en camerino antes del gran estreno.',
      createdAt: 'Hace 2 días'
    },
    // 8. Foto Free
    {
      id: 'm8',
      url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: false,
      starsPrice: 0,
      caption: '☀️ Disfrutando de la piscina en una tarde de sol.',
      createdAt: 'Hace 3 días'
    },
    // 9. Foto VIP Stars (3/5)
    {
      id: 'm9',
      url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: true,
      starsPrice: 100,
      caption: '⭐ Set Ultra VIP: Especial aniversario sin restricciones.',
      createdAt: 'Hace 3 días'
    },
    // 10. Video VIP Stars (4/5 y 3/4 videos)
    {
      id: 'm10',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      type: 'video',
      isStarsLocked: true,
      starsPrice: 150,
      caption: '🔞 Video Completo Exclusivo · 4K sin censura (Acceso con Estrellas).',
      createdAt: 'Hace 4 días'
    },
    // 11. Foto Free
    {
      id: 'm11',
      url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: false,
      starsPrice: 0,
      caption: '🤍 Sesión en blanco y negro · La sutileza de los detalles.',
      createdAt: 'Hace 4 días'
    },
    // 12. Foto Free
    {
      id: 'm12',
      url: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: false,
      starsPrice: 0,
      caption: '💄 Lista para la fiesta VIP de esta noche.',
      createdAt: 'Hace 5 días'
    },
    // 13. Foto VIP Stars (5/5)
    {
      id: 'm13',
      url: 'https://images.unsplash.com/photo-1516726817505-f5ed825624d8?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: true,
      starsPrice: 120,
      caption: '👑 Estreno de medianoche: Solo para miembros suscriptores.',
      createdAt: 'Hace 5 días'
    },
    // 14. Foto Free
    {
      id: 'm14',
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: false,
      starsPrice: 0,
      caption: '💋 Retrato en primer plano para mis suscriptores favoritos.',
      createdAt: 'Hace 6 días'
    },
    // 15. Video Free (4/4 videos)
    {
      id: 'm15',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
      type: 'video',
      isStarsLocked: false,
      starsPrice: 0,
      caption: '✨ Saludo especial y preview del próximo viaje.',
      createdAt: 'Hace 6 días'
    },
    // 16. Foto Free
    {
      id: 'm16',
      url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=900&q=80',
      type: 'photo',
      isStarsLocked: false,
      starsPrice: 0,
      caption: '🌹 Cerrando la semana con esta toma favorita.',
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
