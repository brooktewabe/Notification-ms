import dotenv from "dotenv";
import { configureLogger, logger } from "./logger";
import { envValidation } from "../validations/env.validation";

dotenv.config();

const { value: envVars, error } = envValidation.validate(process.env);
if (error) {
  logger.error(error);
}

// Configure logger with environment
configureLogger(envVars.NODE_ENV);

export interface Config {
  port: number;
  env: string;
  baseUrl: string;
  resend: {
    apiKey: string;
    fromEmail: string;
  };

  queue: {
    maxRetryAttempts: number;
    processInterval: number;
    priorityProcessInterval: number;
  };
  rateLimits: {
    emailPerMinute: number;
    smsPerMinute: number;
  };
  cspOptions: {
    directives: {
      defaultSrc: string[];
      styleSrc: string[];
      scriptSrc: string[];
      fontSrc: string[];
    };
  };
}

export const config: Config = {
  port: envVars.PORT,
  env: envVars.NODE_ENV,
  baseUrl: envVars.BASE_URL,
  resend: {
    apiKey: envVars.RESEND_API_KEY,
    fromEmail: envVars.FROM_EMAIL,
  },

  queue: {
    maxRetryAttempts: envVars.MAX_RETRY_ATTEMPTS,
    processInterval: envVars.QUEUE_PROCESS_INTERVAL,
    priorityProcessInterval: envVars.PRIORITY_QUEUE_PROCESS_INTERVAL,
  },
  rateLimits: {
    emailPerMinute: envVars.EMAIL_RATE_LIMIT_PER_MINUTE,
    smsPerMinute: envVars.SMS_RATE_LIMIT_PER_MINUTE,
  },
  cspOptions: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
    },
  },
};