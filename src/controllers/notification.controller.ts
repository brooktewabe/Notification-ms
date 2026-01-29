import { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import { notificationService } from "../services/notification.service";
import { emailTemplateService } from "../services/emailTemplate.service";
import { ApiError } from "../utils/ApiError";

export const sendEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { priority, scheduledFor, templateId, templateVariables, ...payload } = req.body;

    let emailPayload = payload;

    // If templateId is provided, render the template
    if (templateId) {
      const rendered = await emailTemplateService.renderTemplate(templateId, templateVariables || {});
      const templateDef = emailTemplateService.getTemplateDefinition(templateId);

      emailPayload = {
        ...payload,
        subject: payload.subject || templateDef?.defaultSubject || "Notification",
        html: rendered.html,
        text: rendered.text,
      };
    }

    const notification = await notificationService.createNotification(
      "email",
      emailPayload,
      priority,
      scheduledFor ? new Date(scheduledFor) : undefined,
    );

    res.status(httpStatus.CREATED).json({
      success: true,
      message: "Email notification queued successfully",
      data: {
        notificationId: notification.id,
        status: notification.status,
        scheduledFor: notification.scheduledFor,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getEmailTemplates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = emailTemplateService.getAvailableTemplates();

    res.status(httpStatus.OK).json({
      success: true,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
};


export const getNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const notification = await notificationService.getNotificationById(id);

    if (!notification) {
      throw new ApiError(httpStatus.NOT_FOUND, "Notification not found");
    }

    res.status(httpStatus.OK).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      type,
      status,
      priority,
      search,
      startDate,
      endDate,
      cursorCreatedAt,
      cursorId,
      limit,
    } = req.query;

    const result = await notificationService.getNotifications(
      {
        type: type as any,
        status: status as string,
        priority: priority as any,
        search: search as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      },
      cursorCreatedAt && cursorId
        ? {
            createdAt: new Date(cursorCreatedAt as string),
            id: cursorId as string,
          }
        : undefined,
      Math.max(1, parseInt(limit as string) || 10)
    );

    res.status(httpStatus.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const retryNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const notification = await notificationService.retryFailedNotification(id);

    res.status(httpStatus.OK).json({
      success: true,
      message: "Notification retry initiated",
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queueStats = notificationService.getQueueStats();
    const storeStats = notificationService.getStoreStats();
    const rateLimits = notificationService.getRateLimits();

    res.status(httpStatus.OK).json({
      success: true,
      data: {
        queues: queueStats,
        store: storeStats,
        rateLimits,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const notificationController = {
  sendEmail,
  getNotification,
  getNotifications,
  retryNotification,
  getStats,
  getEmailTemplates,
};