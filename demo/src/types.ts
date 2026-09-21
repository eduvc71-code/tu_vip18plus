export type SocialPlatform = 'onlyfans' | 'fanvue' | 'fansly' | 'instagram' | 'twitter' | 'whatsapp';

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  title: string;
  url: string;
  is_active: boolean;
}

export interface PaymentMethod {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  image_url?: string;
  category?: 'qr' | 'crypto' | 'bank' | 'other';
}

export interface MediaItem {
  id: string;
  url: string;
  type: 'photo' | 'video';
  isStarsLocked: boolean;
  starsPrice: number;
  caption: string;
  createdAt: string;
}

export interface CreatorProfile {
  id: string;
  name: string;
  username: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  status: 'disponible' | 'activa' | 'offline';
  links: SocialLink[];
  media: MediaItem[];
  paymentMethods: PaymentMethod[];
  telegramChannelName: string;
  telegramBotName: string;
  telegramChannelSubscribers: number;
}

export type DemoView = 'admin' | 'miniapp' | 'channel' | 'bot';
