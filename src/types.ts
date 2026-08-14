/**
 * Shared type definitions for Tú • Espacio VIP (+18)
 */

export type ProfileStatus = 'borrador' | 'disponible' | 'ocupada' | 'pausada' | 'retirada';

export interface Profile {
  id: string;
  name: string;
  age: number; // Always >= 18
  zone: string; // 'Contenido +18 VIP'
  description: string;
  rate_bs: number; // Precio suscripción / pack VIP en Bs.
  commission_bs: number; // 0 (sin comisión)
  photos: string[]; // URLs or paths to uploaded images and videos
  status: ProfileStatus;
  created_at: string;
  updated_at: string;
  telegram_message_id?: number | null;
  priority_order: number;
}

export type RequestStatus = 'pendiente' | 'qr_enviado' | 'auto_respondida' | 'confirmado' | 'rechazado' | 'completado' | 'fallida';

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
