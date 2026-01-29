import express from "express";
import xss from "xss-clean";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import httpStatus from "http-status";
import { config } from "./config/envConfig";
import { successHandler, errorHandler } from "./config/morgan";
import { ApiError } from "./utils/ApiError";
import { errorConverter, errHandler } from "./lib/error";
import initRoutes from "./api/index";
import { queueManager } from "./lib/queueManager";
import { logger } from "./config/logger";
import { schedulerService } from "./services/scheduler.service";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(successHandler);
app.use(errorHandler);
app.use(xss());

// Security headers
app.use(
  helmet.contentSecurityPolicy({
    directives: config.cspOptions.directives,
    reportOnly: false,
  })
);
app.use(helmet.xFrameOptions());
app.use(helmet.noSniff());

// CORS
if (config.env === "production") {
  app.use(
    cors({
      origin: [
       'http://localhost:5173',
      ],
    })
  );
  app.options(
    "*",
    cors({
      origin: [
        'http://localhost:5173',
      ],
    })
  );
} else {
  app.use(cors());
  app.options("*", cors());
}

app.set("trust proxy", true);

// Request logging
app.use((req, res, next) => {
  logger.info(`[${req.method}] ${req.originalUrl}`);
  next();
});

// Initialize routes
initRoutes(app);

// Start queue processors
queueManager.startAll();
logger.info("Queue processors started");
// Start scheduler for scheduled notifications
schedulerService.start();
// 404 handler
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, "404 Not found"));
});

// Error handlers
app.use(errorConverter);
app.use(errHandler);

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  queueManager.stopAll();
  schedulerService.stop();
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  queueManager.stopAll();
  schedulerService.stop();
  process.exit(0);
});

// Start server
app.listen(config.port, () => {
  logger.info(`Notification service running on port ${config.port}`);
  logger.info(`Environment: ${config.env}`);
});

export default app;