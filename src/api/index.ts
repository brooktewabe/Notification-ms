import express, { type Express } from "express";
import notificationRoutes from "./routes/notification.route";
import path from "path";

export default function initRoutes(app: Express): void {

  app.use("/api/notifications", notificationRoutes);

  // Health check
  app.get("/api/health", (req, res) => {
    res.status(200).json({
      success: true,
      message: "Notification service is running",
    });
  });

  // Serve logs as static files
  const LOGS_DIR = path.join(__dirname, "../logs");
  app.use("/api/logs", express.static(LOGS_DIR));

  // Serve assets as static files
  const ASSETS_DIR = path.join(__dirname, "../../assets");
  app.use("/assets", express.static(ASSETS_DIR));
}