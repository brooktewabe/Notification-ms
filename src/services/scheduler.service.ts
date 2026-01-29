import { notificationStore } from "../stores/notification.store";
import { queueManager } from "../lib/queueManager";
import { logger } from "../config/logger";

class SchedulerService {
  private schedulerInterval?: NodeJS.Timeout;
  private checkIntervalMs = 60000; // Check every minute

  start() {
    if (this.schedulerInterval) {
      logger.warn("Scheduler already running");
      return;
    }

    logger.info("Starting notification scheduler");
    this.schedulerInterval = setInterval(() => {
      this.processScheduledNotifications();
    }, this.checkIntervalMs);

    // Run immediately on start
    this.processScheduledNotifications();
  }

  stop() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = undefined;
      logger.info("Notification scheduler stopped");
    }
  }

  private processScheduledNotifications() {
    try {
      const scheduledNotifications = notificationStore.findScheduled();

      if (scheduledNotifications.length > 0) {
        logger.info(`Found ${scheduledNotifications.length} scheduled notifications ready to send`);

        for (const notification of scheduledNotifications) {
          queueManager.addNotification(notification);
        }
      }
    } catch (error) {
      logger.error("Error processing scheduled notifications:", error);
    }
  }
}

export const schedulerService = new SchedulerService();