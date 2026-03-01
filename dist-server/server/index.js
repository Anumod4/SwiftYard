"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketIO = void 0;
require("./config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const turso_1 = require("../turso");
const auth_1 = require("./middleware/auth");
const auth_2 = __importDefault(require("./routes/auth"));
const appointments_1 = __importDefault(require("./routes/appointments"));
const trailers_1 = __importDefault(require("./routes/trailers"));
const resources_1 = __importDefault(require("./routes/resources"));
const drivers_1 = __importDefault(require("./routes/drivers"));
const carriers_1 = __importDefault(require("./routes/carriers"));
const trailerTypes_1 = __importDefault(require("./routes/trailerTypes"));
const admin_1 = __importDefault(require("./routes/admin"));
const settings_1 = __importDefault(require("./routes/settings"));
const webhooks_1 = __importDefault(require("./routes/webhooks"));
const facilities_1 = __importDefault(require("./routes/facilities"));
const roles_1 = __importDefault(require("./routes/roles"));
const socket_1 = require("./services/socket");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});
(0, socket_1.setSocketIO)(io);
exports.socketIO = io;
io.on("connection", (socket) => {
    console.log("[Socket.IO] Client connected:", socket.id);
    socket.on("join-facility", (facilityId) => {
        socket.join(`facility:${facilityId}`);
        console.log(`[Socket.IO] Client ${socket.id} joined facility:${facilityId}`);
    });
    socket.on("disconnect", () => {
        console.log("[Socket.IO] Client disconnected:", socket.id);
    });
});
const PORT = Number(process.env.PORT) || 4000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
// Debug: Log when routes are registered
console.log('[Server] Registering routes...');
console.log('[Server] Appointments:', typeof appointments_1.default);
console.log('[Server] Resources:', typeof resources_1.default);
console.log('[Server] Drivers:', typeof drivers_1.default);
// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
// Test email endpoint (remove in production)
app.post("/test-email", async (req, res) => {
    const { to, subject, html } = req.body;
    const { sendEmail } = await Promise.resolve().then(() => __importStar(require("./services/email.js")));
    try {
        const result = await sendEmail(to, subject, html);
        res.json({ success: result, message: result ? "Email sent" : "Failed" });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// Public routes (before authenticate middleware)
app.use("/api/auth", auth_2.default);
// Public lookup for signup and layout
app.get("/api/public/facilities", async (req, res) => {
    try {
        const { fetchAll } = await Promise.resolve().then(() => __importStar(require("./db")));
        const facilities = await fetchAll("facilities");
        res.json({ success: true, data: facilities });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
app.get("/api/public/carriers", async (req, res) => {
    try {
        const { fetchAll } = await Promise.resolve().then(() => __importStar(require("./db")));
        const carriers = await fetchAll("carriers");
        res.json({ success: true, data: carriers });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Public driver/trailer/resources lookup for driver login (no auth required)
app.use("/api/public/trailers", trailers_1.default);
app.use("/api/public/resources", resources_1.default);
app.use("/api/public/drivers", drivers_1.default); // Use more specific path for drivers
app.use("/api/public", drivers_1.default); // Keep as fallback but after more specific ones
// Protected routes - authenticate all /api routes EXCEPT /api/public/*
app.use("/api", (req, res, next) => {
    // Skip auth for public routes
    if (req.path.startsWith("/public")) {
        return next();
    }
    (0, auth_1.authenticate)(req, res, next);
}, auth_1.setFacilityContext);
// Data routes (protected)
app.use("/api/appointments", appointments_1.default);
app.use("/api/trailers", trailers_1.default);
app.use("/api/resources", resources_1.default);
app.use("/api/drivers", drivers_1.default);
app.use("/api/carriers", carriers_1.default);
app.use("/api/trailer-types", trailerTypes_1.default);
// Admin routes (users, roles, facilities)
app.use("/api/admin", auth_1.requireAdmin, admin_1.default);
// Settings route
app.use("/api/settings", settings_1.default);
// Webhooks route
app.use("/api/webhooks", webhooks_1.default);
// Facilities route (accessible to all authenticated users)
app.use("/api/facilities", facilities_1.default);
// Roles route (accessible to all authenticated users)
app.use("/api/roles", roles_1.default);
// Dashboard metrics endpoint
app.get("/api/dashboard/metrics", auth_1.authenticate, auth_1.setFacilityContext, async (req, res) => {
    try {
        const { fetchByFacility, fetchAll } = await Promise.resolve().then(() => __importStar(require("./db")));
        const facilityId = req.currentFacilityId;
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
        const docks = resources.filter((r) => r.type === "Dock");
        // Calculate metrics
        const pendingAppointments = appointments.filter((a) => a.status === "Scheduled").length;
        const occupiedDocks = docks.filter((d) => d.status === "Occupied").length;
        const trailersInYard = trailers.filter((t) => t.status === "InYard").length;
        const dockOccupancyRate = docks.length > 0 ? Math.round((occupiedDocks / docks.length) * 100) : 0;
        // Calculate average times from history
        let g2dSum = 0, g2dCount = 0, ddSum = 0, ddCount = 0;
        appointments.forEach((a) => {
            const h = a.history || [];
            const gatedIn = h.find((x) => x.status === "GatedIn");
            const checkedIn = h.find((x) => x.status === "CheckedIn");
            const completed = h.find((x) => x.status === "Completed");
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
    }
    catch (error) {
        console.error("Get metrics error:", error);
        res
            .status(500)
            .json({ success: false, error: { message: error.message } });
    }
});
// Error handling
app.use(auth_1.errorHandler);
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
    (0, turso_1.initializeSchema)()
        .then(() => (0, turso_1.runMigrations)())
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
exports.default = app;
