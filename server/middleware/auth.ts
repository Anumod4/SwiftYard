import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { fetchById, fetchAll } from "../db";
import { JWTPayload, AuthenticatedRequest, ApiResponse } from "../types";

const JWT_SECRET =
  process.env.JWT_SECRET || "swiftyard-secret-key-change-in-production";

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

// Middleware to authenticate requests
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res
        .status(401)
        .json({ success: false, error: { message: "No token provided" } });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    // Verify user still exists
    const user = await fetchById("users", decoded.uid, "uid");
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
  } catch (error: any) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
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

// Middleware to check if user has admin role
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
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

// Middleware to check if user has carrier role
export const requireCarrier = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const isCarrier =
    req.user?.role === "carrier" ||
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

// Middleware to set current facility context
export const setFacilityContext = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const facilityIdFromQuery = req.query.facilityId as string | undefined;
  const facilityIdFromHeader = (req.headers["x-facility-id"] as string) || (req.headers["X-Facility-ID"] as string);

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
  } else if (allowedFacilities.length > 0) {
    req.currentFacilityId = allowedFacilities[0];
  } else {
    req.currentFacilityId = null;
  }

  next();
};

// Middleware to check view permissions
export const requirePermission = (viewId: string) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
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
    const role = await fetchById("roles", req.user.role, "id");

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
    const accessLevels: Record<string, string> =
      safeJsonParse(role.accessLevels) || {};
    const requiredEdit = ["POST", "PUT", "PATCH", "DELETE"].includes(
      req.method,
    );

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

// Helper to parse JSON fields from DB
const safeJsonParse = (str: any) => {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

// Error handler middleware
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
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

// Validate facility access for data operations
export const validateFacilityAccess = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
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
