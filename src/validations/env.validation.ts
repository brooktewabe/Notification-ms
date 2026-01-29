import joi from 'joi';

const envVarSchema = joi
  .object({
    PORT: joi.number().positive().required(),
    NODE_ENV: joi.string().valid('development', 'production').optional(),
    RESEND_API_KEY: joi.string().required(),
    FROM_EMAIL: joi.string().email().required(),

    FIREBASE_CLIENT_EMAIL: joi.string().email().required(),
    MAX_RETRY_ATTEMPTS: joi.number().positive().required(),
    QUEUE_PROCESS_INTERVAL: joi.number().positive().required(),
    PRIORITY_QUEUE_PROCESS_INTERVAL: joi.number().positive().required(),
    EMAIL_RATE_LIMIT_PER_MINUTE: joi.number().positive().required(),
    BASE_URL: joi.string().uri().required(),
  })
  .unknown();

export const envValidation = {
  validate: (env: NodeJS.ProcessEnv) => envVarSchema.validate(env),
};
