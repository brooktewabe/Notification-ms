import httpStatus from "http-status";
import { notificationStore } from "../stores/notification.store";
import { queueManager } from "../lib/queueManager";
import { emailProvider } from "../providers/email.provider";
import { smsProvider } from "../providers/sms.provider";
import { pushProvider } from "../providers/push.provider";
import { rateLimitManager } from "../lib/rateLimiter";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";
import { config } from "../config/envConfig";
import type {
  INotification,
  IEmailPayload,
  ISmsPayload,
  NotificationType,
  NotificationPriority,
} from "../config/types/notification.d";

class NotificationService {
  constructor() {
    this.initializeQueueProcessors();
  }

  private initializeQueueProcessors(): void {
    // Email queues
    const emailPriorityQueue = queueManager.getQueue("email", "priority");
    const emailNormalQueue = queueManager.getQueue("email", "normal");

    emailPriorityQueue.on("jobProcess", async (job) => {
      await this.processEmailJob(job.notification);
    });

    emailNormalQueue.on("jobProcess", async (job) => {
      await this.processEmailJob(job.notification);
    });

    // SMS queues
    const smsPriorityQueue = queueManager.getQueue("sms", "priority");
    const smsNormalQueue = queueManager.getQueue("sms", "normal");

    smsPriorityQueue.on("jobProcess", async (job) => {
      await this.processSmsJob(job.notification);
    });

    smsNormalQueue.on("jobProcess", async (job) => {
      await this.processSmsJob(job.notification);
    });

    // Push queue
    const pushQueue = queueManager.getQueue("push");

    pushQueue.on("jobProcess", async (job) => {
      await this.processPushJob(job.notification);
    });
  }

  async createNotification(
    type: NotificationType,
    payload: IEmailPayload | ISmsPayload,
    priority: NotificationPriority = "normal",
    scheduledFor?: Date,
  ): Promise<INotification> {
    try {
      const notification = notificationStore.create(
        type,
        payload,
        priority,
        scheduledFor,
        config.queue.maxRetryAttempts
      );

      // Add to queue if not scheduled
      if (!scheduledFor || scheduledFor <= new Date()) {
        queueManager.addNotification(notification);
      }

      logger.info(`Notification created: ${notification.id}`);
      return notification;
    } catch (error) {
      logger.error("Failed to create notification:", error);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to create notification");
    }
  }

  private async processEmailJob(notification: INotification) {
    const limiter = rateLimitManager(config.rateLimits.emailPerMinute, config.rateLimits.smsPerMinute);

    if (!limiter.canProcessEmail()) {
      logger.warn(`Email rate limit reached, requeueing notification ${notification.id}`);
      // Re-add to queue after a delay
      setTimeout(() => queueManager.addNotification(notification), 5000);
      return;
    }

    await this.processNotification(notification, emailProvider.send.bind(emailProvider));
  }

  private async processSmsJob(notification: INotification) {
    const limiter = rateLimitManager(config.rateLimits.emailPerMinute, config.rateLimits.smsPerMinute);

    if (!limiter.canProcessSms()) {
      logger.warn(`SMS rate limit reached, requeueing notification ${notification.id}`);
      setTimeout(() => queueManager.addNotification(notification), 5000);
      return;
    }

    await this.processNotification(notification, smsProvider.send.bind(smsProvider));
  }

  private async processPushJob(notification: INotification) {
    await this.processNotification(notification, pushProvider.send.bind(pushProvider));
  }

  private async processNotification(
    notification: INotification,
    sender: (payload: any) => Promise<{ success: boolean; messageId?: string; error?: string }>
  ) {
    try {
      notificationStore.update(notification.id, { status: "processing" });

      const result = await sender(notification.payload);

      if (result.success) {
        notificationStore.update(notification.id, {
          status: "sent",
          sentAt: new Date(),
        });
        logger.info(`Notification sent successfully: ${notification.id}`);
      } else {
        await this.handleFailure(notification, result.error || "Unknown error");
      }
    } catch (error) {
      logger.error(`Error processing notification ${notification.id}:`, error);
      await this.handleFailure(notification, error instanceof Error ? error.message : "Unknown error");
    }
  }

  private async handleFailure(notification: INotification, errorMessage: string) {
    const updated = notificationStore.findById(notification.id);
    if (!updated) return;

    const newRetryCount = updated.retryCount + 1;

    if (newRetryCount < updated.maxRetries) {
      notificationStore.update(notification.id, {
        status: "retry",
        retryCount: newRetryCount,
        error: errorMessage,
      });

      logger.info(`Retrying notification ${notification.id} (attempt ${newRetryCount}/${updated.maxRetries})`);
      
      // Exponential backoff
      const delay = Math.pow(2, newRetryCount) * 1000;
      setTimeout(() => {
        const n = notificationStore.findById(notification.id);
        if (n) queueManager.addNotification(n);
      }, delay);
    } else {
      notificationStore.update(notification.id, {
        status: "failed",
        retryCount: newRetryCount,
        failedAt: new Date(),
        error: errorMessage,
      });
      logger.error(`Notification failed after ${updated.maxRetries} attempts: ${notification.id}`);
    }
  }

  async getNotificationById(id: string): Promise<INotification | null> {
    return notificationStore.findById(id) || null;
  }

  async getNotifications(
    filters: {
      type?: NotificationType;
      status?: string;
      priority?: NotificationPriority;
      search?: string;
      startDate?: Date;
      endDate?: Date;
    },
    cursor?: { createdAt: Date; id: string },
    limit: number = 10
  ): Promise<{
    notifications: INotification[];
    nextCursor?: { createdAt: Date; id: string };
    hasMore: boolean;
  }> {
    const { notifications, hasMore } =
      notificationStore.findWithCursor(filters, cursor, limit);

    const last = notifications[notifications.length - 1];

    return {
      notifications,
      hasMore,
      nextCursor: hasMore && last
        ? { createdAt: last.createdAt, id: last.id }
        : undefined,
    };
  }

  async retryFailedNotification(id: string): Promise<INotification> {
    const notification = notificationStore.findById(id);

    if (!notification) {
      throw new ApiError(httpStatus.NOT_FOUND, "Notification not found");
    }

    if (notification.status !== "failed") {
      throw new ApiError(httpStatus.BAD_REQUEST, "Only failed notifications can be retried");
    }

    const updated = notificationStore.update(id, {
      status: "retry",
      retryCount: 0,
      error: undefined,
    });

    if (updated) {
      queueManager.addNotification(updated);
    }

    return updated!;
  }

  getQueueStats() {
    return queueManager.getAllStats();
  }

  getStoreStats() {
    return notificationStore.getStats();
  }

  getRateLimits() {
    const limiter = rateLimitManager(config.rateLimits.emailPerMinute, config.rateLimits.smsPerMinute);
    return {
      email: {
        remaining: limiter.getEmailQuota(),
        limit: config.rateLimits.emailPerMinute,
      },
      sms: {
        remaining: limiter.getSmsQuota(),
        limit: config.rateLimits.smsPerMinute,
      },
    };
  }
}

export const notificationService = new NotificationService();