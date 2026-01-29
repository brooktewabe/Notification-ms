import { logger } from "../config/logger";

interface RateLimitConfig {
  maxPerMinute: number;
  windowMs: number;
}

class RateLimiter {
  private counts: Map<string, number[]> = new Map();
  private config: RateLimitConfig;

  constructor(maxPerMinute: number) {
    this.config = {
      maxPerMinute,
      windowMs: 60000, // 1 minute
    };
  }

  canProcess(key: string): boolean {
    const now = Date.now();
    const timestamps = this.counts.get(key) || [];

    // Remove timestamps outside the window
    const validTimestamps = timestamps.filter((ts) => now - ts < this.config.windowMs);

    if (validTimestamps.length >= this.config.maxPerMinute) {
      logger.warn(`Rate limit reached for ${key}: ${validTimestamps.length}/${this.config.maxPerMinute}`);
      return false;
    }

    validTimestamps.push(now);
    this.counts.set(key, validTimestamps);
    return true;
  }

  getRemainingQuota(key: string): number {
    const now = Date.now();
    const timestamps = this.counts.get(key) || [];
    const validTimestamps = timestamps.filter((ts) => now - ts < this.config.windowMs);
    return Math.max(0, this.config.maxPerMinute - validTimestamps.length);
  }

  reset(key: string): void {
    this.counts.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.counts.entries()) {
      const validTimestamps = timestamps.filter((ts) => now - ts < this.config.windowMs);
      if (validTimestamps.length === 0) {
        this.counts.delete(key);
      } else {
        this.counts.set(key, validTimestamps);
      }
    }
  }
}

class RateLimitManager {
  private static instance: RateLimitManager;
  private emailLimiter: RateLimiter;
  private smsLimiter: RateLimiter;
  private cleanupInterval?: NodeJS.Timeout;

  private constructor(emailLimit: number, smsLimit: number) {
    this.emailLimiter = new RateLimiter(emailLimit);
    this.smsLimiter = new RateLimiter(smsLimit);

    // Cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.emailLimiter.cleanup();
      this.smsLimiter.cleanup();
    }, 5 * 60 * 1000);
  }

  static getInstance(emailLimit: number = 60, smsLimit: number = 30): RateLimitManager {
    if (!RateLimitManager.instance) {
      RateLimitManager.instance = new RateLimitManager(emailLimit, smsLimit);
    }
    return RateLimitManager.instance;
  }

  canProcessEmail(): boolean {
    return this.emailLimiter.canProcess("email");
  }

  canProcessSms(): boolean {
    return this.smsLimiter.canProcess("sms");
  }

  getEmailQuota(): number {
    return this.emailLimiter.getRemainingQuota("email");
  }

  getSmsQuota(): number {
    return this.smsLimiter.getRemainingQuota("sms");
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export const rateLimitManager = RateLimitManager.getInstance;