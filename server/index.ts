import "./config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { initializeSchema, runMigrations } from "../turso";
import {
  authenticate,
  setFacilityContext,
  requireAdmin,
  errorHandler,
} from "./middleware/auth";
import authRoutes from "./routes/auth";
import appointmentsRoutes from "./routes/appointments";
import trailersRoutes from "./routes/trailers";
import resourcesRoutes from "./routes/resources";
import driversRoutes from "./routes/drivers";
import carriersRoutes from "./routes/carriers";
import trailerTypesRoutes from "./routes/trailerTypes";
import adminRoutes from "./routes/admin";
import settingsRoutes from "./routes/settings";
import webhookRoutes from "./routes/webhooks";
import facilityRoutes from "./routes/facilities";
import roleRoutes from "./routes/roles";
import { setSocketIO } from "./services/socket";
import { AuthenticatedRequest } from "./types";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

setSocketIO(io);

export const socketIO = io;

io.on("connection", (socket) => {
  console.log("[Socket.IO] Client connected:", socket.id);

  socket.on("join-facility", (facilityId: string) => {
    socket.join(`facility:${facilityId}`);
    console.log(`[Socket.IO] Client ${socket.id} joined facility:${facilityId}`);
  });

  socket.on("disconnect", () => {
    console.log("[Socket.IO] Client disconnected:", socket.id);
  });
});

const PORT = Number(process.env.PORT) || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Debug: Log when routes are registered
console.log('[Server] Registering routes...');
console.log('[Server] Appointments:', typeof appointmentsRoutes);
console.log('[Server] Resources:', typeof resourcesRoutes);
console.log('[Server] Drivers:', typeof driversRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Test email endpoint (remove in production)
app.post("/test-email", async (req, res) => {
  const { to, subject, html } = req.body;
  const { sendEmail } = await import("./services/email.js");
  try {
    const result = await sendEmail(to, subject, html);
    res.json({ success: result, message: result ? "Email sent" : "Failed" });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Public routes (before authenticate middleware)
app.use("/api/auth", authRoutes);

// Public lookup for signup and layout
app.get("/api/public/facilities", async (req, res) => {
  try {
    const { fetchAll } = await import("./db");
    const facilities = await fetchAll("facilities");
    res.json({ success: true, data: facilities });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

app.get("/api/public/carriers", async (req, res) => {
  try {
    const { fetchAll } = await import("./db");
    const carriers = await fetchAll("carriers");
    res.json({ success: true, data: carriers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Public driver/trailer/resources lookup for driver login (no auth required)
app.use("/api/public/trailers", trailersRoutes);
app.use("/api/public/resources", resourcesRoutes);
app.use("/api/public/drivers", driversRoutes); // Use more specific path for drivers
app.use("/api/public", driversRoutes); // Keep as fallback but after more specific ones

// Protected routes - authenticate all /api routes EXCEPT /api/public/*
app.use("/api", (req, res, next) => {
  // Skip auth for public routes
  if (req.path.startsWith("/public")) {
    return next();
  }
  authenticate(req, res, next);
}, setFacilityContext);

// Data routes (protected)
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/trailers", trailersRoutes);
app.use("/api/resources", resourcesRoutes);
app.use("/api/drivers", driversRoutes);
app.use("/api/carriers", carriersRoutes);
app.use("/api/trailer-types", trailerTypesRoutes);

// Admin routes (users, roles, facilities)
app.use("/api/admin", requireAdmin, adminRoutes);

// Settings route
app.use("/api/settings", settingsRoutes);

// Webhooks route
app.use("/api/webhooks", webhookRoutes);

// Facilities route (accessible to all authenticated users)
app.use("/api/facilities", facilityRoutes);

// Roles route (accessible to all authenticated users)
app.use("/api/roles", roleRoutes);

// Dashboard metrics endpoint
app.get(
  "/api/dashboard/metrics",
  authenticate,
  setFacilityContext,
  async (req, res) => {
    try {
      const { fetchByFacility, fetchAll } = await import("./db");

      const facilityId = (req as AuthenticatedRequest).currentFacilityId;

      // Fetch data based on facility context
      let appointments = facilityId
        ? await fetchByFacility("appointments", facilityId)
        : await fetchAll("appointments");

      let resources = facilityId
        ? await fetchByFacility("resources", facilityId)
        : await fetchAll("resources");

      let trailers = facilityId
        ? await fetchByFacility("trailers", facilityId)
        : await fetchAll("trailers");

      const docks = resources.filter((r: any) => r.type === "Dock");

      // Calculate metrics
      const pendingAppointments = appointments.filter(
        (a: any) => a.status === "Scheduled",
      ).length;
      const occupiedDocks = docks.filter(
        (d: any) => d.status === "Occupied",
      ).length;
      const trailersInYard = trailers.filter(
        (t: any) => t.status === "InYard",
      ).length;
      const dockOccupancyRate =
        docks.length > 0 ? Math.round((occupiedDocks / docks.length) * 100) : 0;

      // Calculate average times from history
      let g2dSum = 0,
        g2dCount = 0,
        ddSum = 0,
        ddCount = 0;
      appointments.forEach((a: any) => {
        const h = a.history || [];
        const gatedIn = h.find((x: any) => x.status === "GatedIn");
        const checkedIn = h.find((x: any) => x.status === "CheckedIn");
        const completed = h.find((x: any) => x.status === "Completed");

        if (gatedIn && checkedIn) {
          g2dSum +=
            (new Date(checkedIn.timestamp).getTime() -
              new Date(gatedIn.timestamp).getTime()) /
            60000;
          g2dCount++;
        }
        if (checkedIn && completed) {
          ddSum +=
            (new Date(completed.timestamp).getTime() -
              new Date(checkedIn.timestamp).getTime()) /
            60000;
          ddCount++;
        }
      });

      res.json({
        success: true,
        data: {
          pendingAppointments,
          occupiedDocks,
          trailersInYard,
          dockOccupancyRate,
          avgGateToDock: g2dCount > 0 ? Math.round(g2dSum / g2dCount) : 0,
          avgDockDwell: ddCount > 0 ? Math.round(ddSum / ddCount) : 0,
          avgYardDwell: 0,
          longStayTrailers: 0,
        },
      });
    } catch (error: any) {
      console.error("Get metrics error:", error);
      res
        .status(500)
        .json({ success: false, error: { message: error.message } });
    }
  },
);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { message: `Route ${req.method} ${req.path} not found` },
  });
});

// Cloud Run requires the server to start listening IMMEDIATELY on PORT.
// The health check probe fires within seconds of container start.
// We MUST bind to PORT first, then initialize the DB in the background.
let dbReady = false;

const bindPort = process.env.PORT ? parseInt(process.env.PORT, 10) : PORT;

// Step 1: Start listening immediately so Cloud Run health check passes
httpServer.listen(bindPort, "0.0.0.0", () => {
  console.log(`[Server] Listening on port ${bindPort} (0.0.0.0)`);
  console.log(`[Server] Health check: http://0.0.0.0:${bindPort}/health`);

  // Step 2: Initialize DB in the background after server is already listening
  initializeSchema()
    .then(() => runMigrations())
    .then(() => {
      dbReady = true;
      console.log("[Server] Database ready.");
    })
    .catch((err) => {
      console.error("[Server] Database init failed:", err);
      // Don't crash — let the server keep running and log the error
    });
});

httpServer.on("error", (err) => {
  console.error("[Server] Failed to bind:", err);
  process.exit(1);
});

export default app;
