import { EventEmitter } from "events";
import type { QueueJob, INotification } from "../config/types/notification.d";
import { logger } from "../config/logger";

interface QueueConfig {
  processInterval: number;
  maxConcurrent: number;
}

export class NotificationQueue extends EventEmitter {
  private queue: QueueJob[] = [];
  private processing: Set<string> = new Set();
  private config: QueueConfig;
  private processTimer?: NodeJS.Timeout;
  private isProcessing = false;

  constructor(config: QueueConfig) {
    super();
    this.config = config;
  }

  add(notification: INotification): void {
    const job: QueueJob = {
      id: notification.id,
      notification,
      addedAt: new Date(),
    };

    this.queue.push(job);
    logger.info(`Added ${notification.type} notification to queue: ${job.id}`);
    this.emit("jobAdded", job);
  }

  start(): void {
    if (this.processTimer) {
      return;
    }

    logger.info(`Starting queue processor (interval: ${this.config.processInterval}ms)`);
    this.processTimer = setInterval(() => {
      this.processQueue();
    }, this.config.processInterval);
  }

  stop(): void {
    if (this.processTimer) {
      clearInterval(this.processTimer);
      this.processTimer = undefined;
      logger.info("Queue processor stopped");
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processing.size >= this.config.maxConcurrent) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.queue.length > 0 && this.processing.size < this.config.maxConcurrent) {
        const job = this.queue.shift();
        if (!job) break;

        this.processing.add(job.id);
        this.emit("jobProcessing", job);

        // Process asynchronously without awaiting
        this.processJob(job).finally(() => {
          this.processing.delete(job.id);
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processJob(job: QueueJob): Promise<void> {
    try {
      this.emit("jobProcess", job);
    } catch (error) {
      logger.error(`Error processing job ${job.id}:`, error);
      this.emit("jobError", job, error);
    }
  }

  getStats() {
    return {
      queueSize: this.queue.length,
      processingCount: this.processing.size,
    };
  }

  clear(): void {
    this.queue = [];
    this.processing.clear();
    logger.info("Queue cleared");
  }
}

class QueueManager {
  private static instance: QueueManager;
  
  // Separate queues for metered services (email, sms)
  private emailPriorityQueue: NotificationQueue;
  private emailNormalQueue: NotificationQueue;
  private smsPriorityQueue: NotificationQueue;
  private smsNormalQueue: NotificationQueue;
  
  private pushQueue: NotificationQueue;

  private constructor() {
    // Priority queues process faster
    this.emailPriorityQueue = new NotificationQueue({
      processInterval: 500,
      maxConcurrent: 5,
    });

    this.emailNormalQueue = new NotificationQueue({
      processInterval: 1000,
      maxConcurrent: 3,
    });

    this.smsPriorityQueue = new NotificationQueue({
      processInterval: 500,
      maxConcurrent: 3,
    });

    this.smsNormalQueue = new NotificationQueue({
      processInterval: 1000,
      maxConcurrent: 2,
    });

    this.pushQueue = new NotificationQueue({
      processInterval: 500,
      maxConcurrent: 10,
    });
  }

  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  addNotification(notification: INotification): void {
    const { type, priority } = notification;

    switch (type) {
      case "email":
        if (priority === "priority") {
          this.emailPriorityQueue.add(notification);
        } else {
          this.emailNormalQueue.add(notification);
        }
        break;

      case "sms":
        if (priority === "priority") {
          this.smsPriorityQueue.add(notification);
        } else {
          this.smsNormalQueue.add(notification);
        }
        break;

      case "push":
        this.pushQueue.add(notification);
        break;
    }
  }

  getQueue(type: "email" | "sms" | "push", priority?: "priority" | "normal"): NotificationQueue {
    if (type === "push") {
      return this.pushQueue;
    }

    if (type === "email") {
      return priority === "priority" ? this.emailPriorityQueue : this.emailNormalQueue;
    }

    return priority === "priority" ? this.smsPriorityQueue : this.smsNormalQueue;
  }

  startAll(): void {
    this.emailPriorityQueue.start();
    this.emailNormalQueue.start();
    this.smsPriorityQueue.start();
    this.smsNormalQueue.start();
    this.pushQueue.start();
    logger.info("All queues started");
  }

  stopAll(): void {
    this.emailPriorityQueue.stop();
    this.emailNormalQueue.stop();
    this.smsPriorityQueue.stop();
    this.smsNormalQueue.stop();
    this.pushQueue.stop();
    logger.info("All queues stopped");
  }

  getAllStats() {
    return {
      email: {
        priority: this.emailPriorityQueue.getStats(),
        normal: this.emailNormalQueue.getStats(),
      },
      sms: {
        priority: this.smsPriorityQueue.getStats(),
        normal: this.smsNormalQueue.getStats(),
      },
      push: this.pushQueue.getStats(),
    };
  }
}

export const queueManager = QueueManager.getInstance();