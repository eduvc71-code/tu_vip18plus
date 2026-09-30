/**
 * Shared type definitions for IAM Danii VIP
 */

export type ProfileStatus = 'borrador' | 'disponible' | 'ocupada' | 'pausada' | 'retirada' | 'activa';

export interface EphemeralMediaConfig {
  [mediaUrl: string]: {
    enabled?: boolean;
    ephemeral?: boolean;
    duration?: number; // Duración en segundos (ej. 5, 10, 15)
    duration_seconds?: number;
  };
}

export type CustomButtonType = 'url' | 'telegram' | 'subscription';

export interface CustomButton {
  id: string;
  label: string;
  url: string;
  type?: CustomButtonType;
  visible_channel: boolean;
  visible_miniapp: boolean;
  is_active: boolean;
  priority_order: number;
  created_at: string;
}

export interface TelegramBotoneraCountry {
  id: string;
  flag: string;
  name: string;
  label: string;
  order: number;
  active: boolean;
}

export interface TelegramBotoneraPlan {
  id: string;
  name: string;
  plan_type: 'monthly' | 'semester' | 'permanent';
  price: string;
  description: string;
  order: number;
  active: boolean;
}

export interface TelegramBotonera {
  id: string;
  name: string;
  status: 'draft' | 'published' | 'anchored';
  target: 'channel' | 'bot' | 'both';
  title: string;
  intro: string;
  country_label: string;
  plan_label: string;
  confirmation_title: string;
  confirmation_text: string;
  contact_text: string;
  is_active: boolean;
  countries: TelegramBotoneraCountry[];
  plans: TelegramBotoneraPlan[];
  created_at: string;
  updated_at: string;
  published_message_id?: number | null;
}

export interface DynamicPoll {
  id: string;
  question: string;
  options: string[];
  votes: Record<number, number>;
  telegram_poll_id?: string;
  telegram_message_id?: number;
  visible_channel: boolean;
  visible_miniapp: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  name: string;
  age?: number;
  zone: string; // 'Contenido +18 VIP'
  description: string;
  rate_bs: number; // Precio suscripción / pack VIP en Bs.
  commission_bs: number; // 0 (sin comisión)
  photos: string[]; // URLs or paths to uploaded images and videos
  ephemeral_config?: EphemeralMediaConfig;
  media_descriptions?: Record<string, string>;
  media_status?: Record<string, 1 | 2>; // 1=Activa (visible en mini app/canal), 2=Para Publicar (oculta/borrador)
  media_stars?: Record<string, number>; // Precio en Estrellas de Telegram para contenido de pago
  telegram_media_file_ids?: Record<string, string>; // Mapeo de mediaUrl a telegram file_id
  status: ProfileStatus;
  created_at: string;
  updated_at: string;
  telegram_message_id?: number | null;
  priority_order: number;
}

export type BotMediaCategory = 'bienvenida' | 'auto_reply' | 'drip' | 'vip_privado' | 'general';

export interface BotMediaItem {
  id: string;
  media_url: string;
  telegram_file_id?: string;
  caption: string;
  category: BotMediaCategory;
  is_published: boolean;
  created_at: string;
}

export type RequestStatus = 'pendiente' | 'qr_enviado' | 'auto_respondida' | 'confirmado' | 'rechazado' | 'completado' | 'fallida' | 'comision_pagada';

export interface CustomerRequest {
  id: string;
  profile_id: string;
  profile_name: string;
  telegram_user_id?: string;
  telegram_username?: string;
  telegram_first_name?: string;
  status: RequestStatus;
  created_at: string;
  admin_notified_at?: string;
  auto_reply_at?: string;
  responded_at?: string;
  notes?: string;
}

export interface ConversationState {
  telegram_user_id: string;
  step: string;
  draft_data: Partial<Profile>;
  active_profile_id?: string;
  last_updated: string;
}

export interface AuditLog {
  id: string;
  action: string;
  performed_by: string;
  profile_id?: string;
  details: string;
  timestamp: string;
}

export interface SyncErrorLog {
  id: string;
  profile_id: string;
  action: string;
  error_message: string;
  timestamp: string;
  status: 'pending' | 'resolved' | 'retried';
}

export interface CommissionLog {
  id: string;
  request_id?: string;
  telegram_user: string;
  profile_name: string;
  amount_bs: number;
  paid_at: string;
}

export interface AdminSession {
  token: string;
  telegram_user_id: string;
  expires_at: number;
}

export interface BotStatusInfo {
  configured: boolean;
  bot_username: string;
  channel_id: string;
  admin_count: number;
  webhook_url?: string;
  admin_contact_username?: string;
}

export interface PaymentMethod {
  id: string;
  title: string;
  category: 'national' | 'international' | 'service';
  image_url?: string | null;
  description?: string;
  price?: string | null;
  is_active: boolean;
  priority_order: number;
  updated_at?: string;
}

export interface B2File {
  key: string;
  size: number;
  lastModified: string;
  name: string;
}

export interface AuditedB2Media extends B2File {
  references: Array<{
    profileId: string;
    profileName: string;
    url: string;
    status: number | null;
  }>;
}

export interface AuditedGalleryMedia {
  profileId: string;
  profileName: string;
  url: string;
  source: 'b2' | 'telegram' | 'local' | 'external';
  b2Key: string | null;
  b2ObjectExists: boolean;
  b2ObjectDeletable: boolean;
  status: number | null;
  description: string;
}
