export type NotificationType = "email" | "sms" | "push";
export type NotificationStatus = "pending" | "processing" | "sent" | "failed" | "retry";
export type NotificationPriority = "normal" | "priority";

export interface IEmailPayload {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export interface ISmsPayload {
  to: string;
  body: string;
  from?: string;
}

export interface INotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  payload: IEmailPayload | ISmsPayload | IPushPayload;
  retryCount: number;
  maxRetries: number;
  scheduledFor?: Date;
  sentAt?: Date;
  failedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueueJob {
  id: string;
  notification: INotification;
  addedAt: Date;
}

export interface QueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
}