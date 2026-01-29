import { Resend } from "resend";
import { config } from "../config/envConfig";
import { logger } from "../config/logger";
import type { IEmailPayload } from "../config/types/notification.d";

class EmailProvider {
  private client: Resend;

  constructor() {
    this.client = new Resend(config.resend.apiKey);
  }

  async send(payload: IEmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { to, subject, html, text, from } = payload;

      const recipients = Array.isArray(to) ? to : [to];

      const response = await this.client.emails.send({
        from: from || config.resend.fromEmail,
        to: recipients,
        subject,
        html,
        text,
      } as any);

      if (response.error) {
        logger.error("Resend API error:", response.error);
        return {
          success: false,
          error: response.error.message,
        };
      }

      logger.info(`Email sent successfully: ${response.data?.id}`);
      return {
        success: true,
        messageId: response.data?.id,
      };
    } catch (error) {
      logger.error("Email sending failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendBatch(payloads: IEmailPayload[]): Promise<Array<{ success: boolean; messageId?: string; error?: string }>> {
    return Promise.all(payloads.map((payload) => this.send(payload)));
  }
}

export const emailProvider = new EmailProvider();