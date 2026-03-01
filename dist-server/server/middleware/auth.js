"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFacilityAccess = exports.errorHandler = exports.requirePermission = exports.setFacilityContext = exports.requireCarrier = exports.requireAdmin = exports.authenticate = exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const JWT_SECRET = process.env.JWT_SECRET || "swiftyard-secret-key-change-in-production";
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
};
exports.verifyToken = verifyToken;
// Middleware to authenticate requests
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res
                .status(401)
                .json({ success: false, error: { message: "No token provided" } });
            return;
        }
        const token = authHeader.substring(7);
        const decoded = (0, exports.verifyToken)(token);
        // Verify user still exists
        const user = await (0, db_1.fetchById)("users", decoded.uid, "uid");
        if (!user) {
            res
                .status(401)
                .json({ success: false, error: { message: "User not found" } });
            return;
        }
        req.user = {
            uid: decoded.uid,
            email: decoded.email,
            displayName: decoded.displayName,
            role: decoded.role,
            assignedFacilities: decoded.assignedFacilities,
            carrierId: decoded.carrierId,
            facilityId: decoded.facilityId,
        };
        next();
    }
    catch (error) {
        if (error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError") {
            res
                .status(401)
                .json({
                success: false,
                error: { message: "Invalid or expired token" },
            });
            return;
        }
        next(error);
    }
};
exports.authenticate = authenticate;
// Middleware to check if user has admin role
const requireAdmin = (req, res, next) => {
    const role = req.user?.role?.toLowerCase();
    if (!req.user || role !== "admin") {
        console.log("[Auth] Admin access denied. User role:", req.user?.role);
        res
            .status(403)
            .json({ success: false, error: { message: "Admin access required" } });
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
// Middleware to check if user has carrier role
const requireCarrier = (req, res, next) => {
    const isCarrier = req.user?.role === "carrier" ||
        req.user?.role?.toLowerCase().includes("carrier") ||
        !!req.user?.carrierId;
    if (!isCarrier) {
        res
            .status(403)
            .json({ success: false, error: { message: "Carrier access required" } });
        return;
    }
    next();
};
exports.requireCarrier = requireCarrier;
// Middleware to set current facility context
const setFacilityContext = (req, res, next) => {
    const facilityIdFromQuery = req.query.facilityId;
    const facilityIdFromHeader = req.headers["x-facility-id"] || req.headers["X-Facility-ID"];
    console.log("[Auth] Facility - Query:", facilityIdFromQuery, "Header:", facilityIdFromHeader, "Token:", req.user?.facilityId);
    if (!req.user) {
        res
            .status(401)
            .json({ success: false, error: { message: "Unauthorized" } });
        return;
    }
    // Admins are strictly system-level and never have a facility context
    if (req.user.role === "admin") {
        req.currentFacilityId = null;
        console.log("[Auth] Admin strictly global context (null facility)");
        next();
        return;
    }
    // Header is mandatory for most protected requests, except for admins who can have a null context
    if (!facilityIdFromHeader && !facilityIdFromQuery) {
        // For non-admins, if header is missing, try to use their bound facility or first assigned facility
        // instead of throwing 400 immediately, which can break initial data loading.
        if (req.user.facilityId) {
            req.currentFacilityId = req.user.facilityId;
            console.log("[Auth] Missing header, defaulting to bound facility:", req.currentFacilityId);
            next();
            return;
        }
        const allowed = req.user.assignedFacilities || [];
        if (allowed.length > 0) {
            req.currentFacilityId = allowed[0];
            console.log("[Auth] Missing header, defaulting to first allowed facility:", req.currentFacilityId);
            next();
            return;
        }
        res.status(400).json({
            success: false,
            error: { message: "X-Facility-ID header is required for this request" },
        });
        return;
    }
    const facilityId = facilityIdFromHeader || facilityIdFromQuery;
    // If user has a facilityId in token, they can ONLY use that facility
    if (req.user.facilityId) {
        // Override context with the facility from token, even if they requested a different one
        // This prevents "Access Denied" if the client has a stale X-Facility-ID header during init
        req.currentFacilityId = req.user.facilityId;
        console.log("[Auth] Facility locked to token facility:", req.currentFacilityId);
        next();
        return;
    }
    // Admins can access all facilities or null for admin console
    if (req.user.role === "admin") {
        req.currentFacilityId = facilityId || null;
        console.log("[Auth] Admin facilityId set to:", req.currentFacilityId);
        next();
        return;
    }
    // For non-admin users, validate facility access
    const allowedFacilities = req.user.assignedFacilities || [];
    if (facilityId) {
        if (!allowedFacilities.includes(facilityId)) {
            res.status(403).json({
                success: false,
                error: { message: "Access denied to this facility. User does not have access to facility " + facilityId },
            });
            return;
        }
        req.currentFacilityId = facilityId;
    }
    else if (allowedFacilities.length > 0) {
        req.currentFacilityId = allowedFacilities[0];
    }
    else {
        req.currentFacilityId = null;
    }
    next();
};
exports.setFacilityContext = setFacilityContext;
// Middleware to check view permissions
const requirePermission = (viewId) => {
    return async (req, res, next) => {
        if (!req.user) {
            res
                .status(401)
                .json({ success: false, error: { message: "Unauthorized" } });
            return;
        }
        // Admins have full access
        if (req.user.role === "admin") {
            next();
            return;
        }
        // Fetch role definition
        const role = await (0, db_1.fetchById)("roles", req.user.role, "id");
        if (!role) {
            res
                .status(403)
                .json({ success: false, error: { message: "Role not found" } });
            return;
        }
        const permissions = safeJsonParse(role.permissions) || [];
        if (!permissions.includes(viewId)) {
            res.status(403).json({
                success: false,
                error: { message: "Permission denied" },
            });
            return;
        }
        // Check access level (view vs edit)
        const accessLevels = safeJsonParse(role.accessLevels) || {};
        const requiredEdit = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
        if (requiredEdit && accessLevels[viewId] === "view") {
            res.status(403).json({
                success: false,
                error: { message: "Edit permission required" },
            });
            return;
        }
        next();
    };
};
exports.requirePermission = requirePermission;
// Helper to parse JSON fields from DB
const safeJsonParse = (str) => {
    if (!str)
        return null;
    try {
        return JSON.parse(str);
    }
    catch {
        return null;
    }
};
// Error handler middleware
const errorHandler = (err, req, res, next) => {
    console.error("API Error:", err);
    const status = err.status || 500;
    const message = err.message || "Internal server error";
    res.status(status).json({
        success: false,
        error: {
            message,
            code: err.code,
        },
    });
};
exports.errorHandler = errorHandler;
// Validate facility access for data operations
const validateFacilityAccess = (req, res, next) => {
    const { facilityId } = req.params;
    if (!facilityId) {
        next();
        return;
    }
    if (!req.user) {
        res
            .status(401)
            .json({ success: false, error: { message: "Unauthorized" } });
        return;
    }
    // Admins can access all
    if (req.user.role === "admin") {
        next();
        return;
    }
    // Check if user has access to this facility
    if (!req.user.assignedFacilities?.includes(facilityId)) {
        res.status(403).json({
            success: false,
            error: { message: "Access denied to this facility" },
        });
        return;
    }
    next();
};
exports.validateFacilityAccess = validateFacilityAccess;
