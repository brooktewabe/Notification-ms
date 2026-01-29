import twilio from "twilio";
import { config } from "../config/envConfig";
import { logger } from "../config/logger";
import type { ISmsPayload } from "../config/types/notification.d";

class SmsProvider {
  private client: twilio.Twilio;

  constructor() {
    this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
  }

  async send(payload: ISmsPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { to, body, from } = payload;

      const message = await this.client.messages.create({
        from: from || config.twilio.phoneNumber,
        to,
        body,
      });

      logger.info(`SMS sent successfully: ${message.sid}`);
      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error: any) {
      logger.error("SMS sending failed:", error);
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  }

  async sendBatch(payloads: ISmsPayload[]): Promise<Array<{ success: boolean; messageId?: string; error?: string }>> {
    return Promise.all(payloads.map((payload) => this.send(payload)));
  }
}

export const smsProvider = new SmsProvider();