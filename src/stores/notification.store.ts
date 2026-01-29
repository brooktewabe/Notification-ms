import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import type {
  INotification,
  NotificationType,
  NotificationPriority,
} from "../config/types/notification.d";
import { logger } from "../config/logger";

class NotificationStore {
  private static instance: NotificationStore;
  private db: Database.Database;

  private constructor() {
    this.db = new Database("notifications.db");
    this.initialize();
  }

  static getInstance(): NotificationStore {
    if (!NotificationStore.instance) {
      NotificationStore.instance = new NotificationStore();
    }
    return NotificationStore.instance;
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        payload TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        scheduled_for TEXT,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_status
        ON notifications (status);
        
      CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for
        ON notifications (scheduled_for);
        
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at
        ON notifications (created_at);

      CREATE INDEX IF NOT EXISTS idx_notifications_cursor
      ON notifications (created_at DESC, id DESC);
    `);

    logger.info("SQLite NotificationStore initialized");
  }

  /* ---------------- CREATE ---------------- */

  create(
    type: NotificationType,
    payload: any,
    priority: NotificationPriority = "normal",
    scheduledFor?: Date,
    maxRetries = 3
  ): INotification {
    const now = new Date();
    const notification: INotification = {
      id: randomUUID(),
      type,
      priority,
      status: "pending",
      payload,
      retryCount: 0,
      maxRetries,
      scheduledFor,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(`
        INSERT INTO notifications (
          id, type, priority, status, payload,
          retry_count, max_retries, scheduled_for,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        notification.id,
        notification.type,
        notification.priority,
        notification.status,
        JSON.stringify(notification.payload),
        notification.retryCount,
        notification.maxRetries,
        notification.scheduledFor?.toISOString() || null,
        notification.createdAt.toISOString(),
        notification.updatedAt.toISOString()
      );

    logger.info(`Notification created: ${notification.id}`);
    return notification;
  }

  /* ---------------- READ ---------------- */

  findById(id: string): INotification | undefined {
    const row = this.db
      .prepare(`SELECT * FROM notifications WHERE id = ?`)
      .get(id);

    return row ? this.mapRow(row) : undefined;
  }

  findAll(filters?: {
    type?: NotificationType;
    status?: string;
    priority?: NotificationPriority;
    startDate?: Date;
    endDate?: Date;
  }): INotification[] {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters?.type) {
      conditions.push("type = ?");
      params.push(filters.type);
    }

    if (filters?.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }

    if (filters?.priority) {
      conditions.push("priority = ?");
      params.push(filters.priority);
    }

    if (filters?.startDate) {
      conditions.push("created_at >= ?");
      params.push(filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      conditions.push("created_at <= ?");
      params.push(filters.endDate.toISOString());
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = this.db
      .prepare(`
        SELECT * FROM notifications
        ${where}
        ORDER BY created_at DESC
      `)
      .all(...params);

    return rows.map((row) => this.mapRow(row));
  }

  findWithCursor(
    filters: {
      type?: NotificationType;
      status?: string;
      priority?: NotificationPriority;
      search?: string;
      startDate?: Date;
      endDate?: Date;
    },
    cursor?: { createdAt: Date; id: string },
    limit: number = 20
  ): { notifications: INotification[]; hasMore: boolean } {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.type) {
      conditions.push("type = ?");
      params.push(filters.type);
    }

    if (filters.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }
    
    if (filters.search) {
      conditions.push(`
        (
          (
            json_type(payload, '$.to') = 'text'
            AND json_extract(payload, '$.to') LIKE ?
          )
          OR
          (
            json_type(payload, '$.to') = 'array'
            AND EXISTS (
              SELECT 1
              FROM json_each(payload, '$.to')
              WHERE value LIKE ?
            )
          )
        )
      `);

      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.priority) {
      conditions.push("priority = ?");
      params.push(filters.priority);
    }

    if (filters.startDate) {
      conditions.push("created_at >= ?");
      params.push(filters.startDate.toISOString());
    }

    if (filters.endDate) {
      conditions.push("created_at <= ?");
      params.push(filters.endDate.toISOString());
    }

    if (cursor) {
      conditions.push(`
        (
          created_at < ?
          OR (created_at = ? AND id < ?)
        )
      `);
      params.push(
        cursor.createdAt.toISOString(),
        cursor.createdAt.toISOString(),
        cursor.id
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = this.db
      .prepare(`
        SELECT *
        FROM notifications
        ${where}
        ORDER BY created_at DESC, id DESC
        LIMIT ?
      `)
      .all(...params, limit + 1);

    const hasMore = rows.length > limit;
    const sliced = hasMore ? rows.slice(0, limit) : rows;

    return {
      notifications: sliced.map((r) => this.mapRow(r)),
      hasMore,
    };
  }

  findScheduled(): INotification[] {
    const now = new Date();
    const rows = this.db
      .prepare(`
        SELECT * FROM notifications 
        WHERE status = 'pending' 
        AND scheduled_for IS NOT NULL 
        AND scheduled_for <= ?
        ORDER BY scheduled_for ASC
      `)
      .all(now.toISOString());

    return rows.map((row) => this.mapRow(row));
  }

  count(filters?: { type?: NotificationType; status?: string }): number {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters?.type) {
      conditions.push("type = ?");
      params.push(filters.type);
    }

    if (filters?.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const row = this.db
      .prepare(`SELECT COUNT(*) as count FROM notifications ${where}`)
      .get(...params);

    return (row as any).count;
  }

  /* ---------------- UPDATE ---------------- */

  update(
    id: string,
    updates: Partial<INotification>
  ): INotification | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    const updated: INotification = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.db
      .prepare(`
        UPDATE notifications SET
          type = ?,
          priority = ?,
          status = ?,
          payload = ?,
          retry_count = ?,
          max_retries = ?,
          scheduled_for = ?,
          updated_at = ?
        WHERE id = ?
      `)
      .run(
        updated.type,
        updated.priority,
        updated.status,
        JSON.stringify(updated.payload),
        updated.retryCount,
        updated.maxRetries,
        updated.scheduledFor?.toISOString() || null,
        updated.updatedAt.toISOString(),
        updated.id
      );

    return updated;
  }

  /* ---------------- DELETE ---------------- */

  delete(id: string): boolean {
    const result = this.db
      .prepare(`DELETE FROM notifications WHERE id = ?`)
      .run(id);

    return result.changes > 0;
  }

  /* ---------------- STATS ---------------- */

  getStats() {
    const rows = this.db
      .prepare(`
        SELECT status, COUNT(*) as count
        FROM notifications
        GROUP BY status
      `)
      .all();

    const stats: Record<string, number> = {
      total: 0,
      pending: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      retry: 0,
    };

    for (const row of rows) {
      stats[(row as any).status] = (row as any).count;
      stats.total += (row as any).count;
    }

    return stats;
  }

  /* ---------------- MAPPER ---------------- */

  private mapRow(row: any): INotification {
    return {
      id: row.id,
      type: row.type,
      priority: row.priority,
      status: row.status,
      payload: JSON.parse(row.payload),
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      scheduledFor: row.scheduled_for ? new Date(row.scheduled_for) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const notificationStore = NotificationStore.getInstance();
