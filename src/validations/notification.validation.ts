import Joi from "joi";

export const createEmailSchema = {
  body: Joi.object().keys({
    to: Joi.alternatives().try(Joi.string().email(), Joi.array().items(Joi.string().email())).required(),
    // Either use template-based email OR raw html/text
    templateId: Joi.string().optional(),
    templateVariables: Joi.object().optional(),
    // email fields (for non-template emails)
    subject: Joi.string().when('templateId', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    // html: Joi.string().optional(),
    text: Joi.string().optional(),
    from: Joi.string().email().optional(),
    scheduledFor: Joi.date().optional(),
    priority: Joi.string().valid("normal", "priority").default("normal"),
  }).or("templateId", "html", "text"),
};

export const createSmsSchema = {
  body: Joi.object().keys({
    to: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).required(),
    body: Joi.string().required(),
    scheduledFor: Joi.date().optional(),
    from: Joi.string().optional(),
    priority: Joi.string().valid("normal", "priority").default("normal"),
  }),
};

