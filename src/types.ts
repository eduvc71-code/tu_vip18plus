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

export interface ProfileReactions {
  likes?: number;       // 👍 Likes
  hearts?: number;      // ❤️ Corazones
  stars?: number;       // ⭐ Estrellas
  fires?: number;       // 🔥 Fuego
  in_love?: number;     // 🥰 Enamorado
  kiss?: number;        // 💋 Beso
  heart_eyes?: number;  // 😍 Ojos corazón
  clap?: number;        // 👏 Aplausos
  party?: number;       // 🎉 Fiesta
  star_struck?: number; // 🤩 Emocionado
  [key: string]: number | undefined;
}

export interface CustomButton {
  id: string;
  label: string;
  url: string;
  visible_channel: boolean;
  visible_miniapp: boolean;
  is_active: boolean;
  priority_order: number;
  created_at: string;
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
  age: number; // Always >= 18
  zone: string; // 'Contenido +18 VIP'
  description: string;
  rate_bs: number; // Precio suscripción / pack VIP en Bs.
  commission_bs: number; // 0 (sin comisión)
  photos: string[]; // URLs or paths to uploaded images and videos
  ephemeral_config?: EphemeralMediaConfig;
  media_descriptions?: Record<string, string>;
  media_status?: Record<string, 1 | 2>; // 1=Activa (visible en mini app/canal), 2=Para Publicar (oculta/borrador)
  status: ProfileStatus;
  created_at: string;
  updated_at: string;
  telegram_message_id?: number | null;
  priority_order: number;
  reactions?: ProfileReactions;
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
}
