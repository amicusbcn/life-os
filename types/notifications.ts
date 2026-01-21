// types/notifications.ts

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'action_needed';
export type NotificationPriority = 'low' | 'normal' | 'high';

export interface AppNotification {
  id: string; // UUID
  created_at: string;
  recipient_id: string;
  sender_module: string;
  title: string;
  message: string | null;
  link_url: string | null;
  type: NotificationType;
  priority: NotificationPriority;
  read_at: string | null;
  is_archived: boolean;
}

// Para crear una nueva desde código (Server Actions)
export interface CreateNotificationDTO {
  recipient_id: string;
  sender_module: string;
  title: string;
  message?: string;
  link_url?: string;
  type?: NotificationType;
  priority?: NotificationPriority;
}