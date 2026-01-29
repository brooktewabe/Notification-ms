import express, { RequestHandler } from "express";
import { notificationController } from "../../controllers/notification.controller";
import { validate } from "../../lib/validate";
import {
  createEmailSchema,
  createSmsSchema,
  createPushSchema,
} from "../../validations/notification.validation";

const router = express.Router();

// Send notifications
router.post(
  "/email",
  validate(createEmailSchema),
  notificationController.sendEmail as RequestHandler
);


// Get notifications
router.get(
  "/",
  notificationController.getNotifications as RequestHandler
);

router.get(
  "/stats",
  notificationController.getStats as RequestHandler
);

// Get email templates
router.get(
  "/email/templates",
  notificationController.getEmailTemplates as RequestHandler
);

router.get(
  "/:id",
  notificationController.getNotification as RequestHandler
);

// Retry failed notification
router.post(
  "/:id/retry",
  notificationController.retryNotification as RequestHandler
);

export default router;