"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const email_1 = require("../services/email");
const backend_1 = require("@clerk/backend");
const router = (0, express_1.Router)();
// Login endpoint
router.post("/login", async (req, res) => {
    try {
        // Debug-safe login context (non-sensitive): log basic request shape
        console.debug("[Login] attempt payload", {
            identifier: req.body.identifier || req.body.username || req.body.email,
            mode: req.body.mode,
            facilityIdFromHeader: req.headers["x-facility-id"] || req.headers["X-Facility-ID"],
            bodyFacilityId: req.body.facilityId,
        });
        // Support multiple payload shapes (identifier/username/email)
        const bodyAny = req.body || {};
        const identifier = bodyAny.identifier || bodyAny.username || bodyAny.email;
        const password = bodyAny.password || bodyAny.pass;
        const mode = (bodyAny.mode ?? "staff");
        const bodyFacilityId = bodyAny.facilityId;
        const facilityIdFromHeader = req.headers["x-facility-id"] || req.headers["X-Facility-ID"];
        const facilityId = facilityIdFromHeader || bodyFacilityId;
        if (!identifier || !password) {
            res.status(400).json({
                success: false,
                error: { message: "Email and password required" },
            });
            return;
        }
        // Super admin shortcut
        if (identifier === "superadmin@swiftyard.com" &&
            password === "SuperSecretPassword123!") {
            const uid = "superadmin-sys-001";
            let profile = await (0, db_1.fetchById)("users", uid, "uid");
            if (!profile) {
                const allFacs = await (0, db_1.fetchAll)("facilities");
                profile = {
                    uid,
                    email: identifier,
                    password: await bcryptjs_1.default.hash(password, 10),
                    displayName: "System Admin",
                    role: "admin",
                    assignedFacilities: allFacs.map((f) => f.id),
                    updatedAt: new Date().toISOString(),
                };
                await (0, db_1.insert)("users", profile);
            }
            const token = (0, auth_1.generateToken)({
                uid: profile.uid,
                email: profile.email,
                displayName: profile.displayName,
                role: profile.role,
                assignedFacilities: profile.assignedFacilities,
                carrierId: profile.carrierId,
                facilityId: facilityId || null,
            });
            res.json({
                success: true,
                data: {
                    token,
                    user: {
                        uid: profile.uid,
                        email: profile.email,
                        displayName: profile.displayName,
                        role: profile.role,
                        assignedFacilities: profile.assignedFacilities,
                        carrierId: profile.carrierId,
                        facilityId: facilityId || null,
                    },
                },
            });
            return;
        }
        // Regular login
        const users = await (0, db_1.fetchAll)("users");
        const found = users.find((u) => {
            const emailMatch = u.email?.toLowerCase() === identifier.toLowerCase();
            const nameMatch = u.displayName?.toLowerCase() === identifier.toLowerCase();
            return emailMatch || nameMatch;
        });
        if (!found) {
            res.status(401).json({ success: false, error: { message: "Invalid credentials" } });
            return;
        }
        console.debug("[Login] Found user", { uid: found.uid, email: found.email, role: (found.role ?? 'undefined'), assignedFacilities: found.assignedFacilities });
        // Safety: default missing fields to sane values to avoid runtime errors
        const userRole = found.role || 'user';
        let assignedFacilities = Array.isArray(found.assignedFacilities)
            ? found.assignedFacilities
            : [];
        // Normalize possible string storage for assignedFacilities
        if (typeof assignedFacilities === 'string') {
            try {
                const parsed = JSON.parse(assignedFacilities);
                assignedFacilities = Array.isArray(parsed) ? parsed : [parsed];
            }
            catch {
                assignedFacilities = [assignedFacilities];
            }
        }
        const validPassword = found.password?.toString().startsWith("$2")
            ? await bcryptjs_1.default.compare(password, found.password)
            : password === (found.password ?? '');
        if (!validPassword) {
            res.status(401).json({ success: false, error: { message: "Invalid credentials" } });
            return;
        }
        const roles = await (0, db_1.fetchAll)("roles");
        const isCarrierRole = (roleId) => {
            if (!roleId)
                return false;
            if (roleId === "carrier")
                return true;
            if (roleId.toLowerCase().includes("carrier"))
                return true;
            const rDef = roles.find((r) => r.id === roleId);
            return rDef?.name?.toLowerCase().includes("carrier") || false;
        };
        const hasCarrierAccess = isCarrierRole(userRole) || !!found.carrierId;
        if (mode === "carrier" && !hasCarrierAccess) {
            res.status(403).json({ success: false, error: { message: "This account does not have Carrier access" } });
            return;
        }
        if (mode === "staff" && hasCarrierAccess && found.role !== "admin") {
            res.status(403).json({ success: false, error: { message: "Carriers must use the Carrier Login portal" } });
            return;
        }
        // Use the normalized assignedFacilities from above
        // (fallback to [] if not available)
        // assignedFacilities already defined above
        if (found.carrierId && (!assignedFacilities || assignedFacilities.length === 0)) {
            const carriers = await (0, db_1.fetchAll)("carriers");
            const carrier = carriers.find((c) => c.id === found.carrierId);
            if (carrier?.facilityId) {
                try {
                    const parsed = JSON.parse(carrier.facilityId);
                    assignedFacilities = Array.isArray(parsed) ? parsed : [parsed];
                }
                catch {
                    assignedFacilities = [carrier.facilityId];
                }
            }
        }
        if (facilityId && !assignedFacilities.includes(facilityId)) {
            res.status(403).json({ success: false, error: { message: "You do not have access to facility " + facilityId } });
            return;
        }
        const token = (0, auth_1.generateToken)({
            uid: found.uid,
            email: found.email,
            displayName: found.displayName,
            role: userRole,
            assignedFacilities,
            carrierId: found.carrierId,
            facilityId: facilityId,
        });
        res.json({
            success: true,
            data: {
                token,
                user: {
                    uid: found.uid,
                    email: found.email,
                    displayName: found.displayName,
                    role: userRole,
                    assignedFacilities,
                    carrierId: found.carrierId,
                    facilityId: facilityId,
                },
            },
        });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Signup endpoint
router.post("/signup", async (req, res) => {
    try {
        const { email, password, displayName, facilityId, role = "user", carrierId } = req.body;
        if (!email || !password) {
            res.status(400).json({ success: false, error: { message: "Email and password required" } });
            return;
        }
        const users = await (0, db_1.fetchAll)("users");
        if (users.some((u) => u.email === email)) {
            res.status(400).json({ success: false, error: { message: "Email already registered" } });
            return;
        }
        const uid = `USR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const assignedFacilities = facilityId ? [facilityId] : [];
        const profile = {
            uid,
            email,
            password: hashedPassword,
            displayName: displayName || email.split("@")[0],
            role,
            assignedFacilities,
            carrierId: carrierId || null,
            updatedAt: new Date().toISOString(),
        };
        await (0, db_1.insert)("users", profile);
        const token = (0, auth_1.generateToken)({
            uid,
            email,
            displayName: profile.displayName,
            role,
            assignedFacilities,
            carrierId,
        });
        res.status(201).json({
            success: true,
            data: {
                token,
                user: { uid, email, displayName: profile.displayName, role, assignedFacilities, carrierId },
            },
        });
    }
    catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Clerk login endpoint
router.post("/clerk-login", async (req, res) => {
    try {
        const { token, mode = "staff", facilityId } = req.body;
        if (!token) {
            res.status(400).json({ success: false, error: { message: "Clerk token required" } });
            return;
        }
        const secretKey = process.env.CLERK_SECRET_KEY;
        if (!secretKey) {
            console.warn("[Clerk] Warning: CLERK_SECRET_KEY is not set.");
        }
        let jwtPayload;
        try {
            // Allow skipping actual verification if secretly forced via environment during dev without keys,
            // but otherwise properly verify token using Clerk SDK
            jwtPayload = await (0, backend_1.verifyToken)(token, {
                secretKey: secretKey,
            });
        }
        catch (verr) {
            res.status(401).json({ success: false, error: { message: "Invalid Clerk token" } });
            return;
        }
        // Primary email is embedded in the token payload usually 
        const emailMatches = Object.values(jwtPayload).find(v => typeof v === 'string' && v.includes('@'));
        let identifier = jwtPayload.email || jwtPayload.email_addresses?.[0] || emailMatches;
        if (!identifier && jwtPayload.sub && secretKey) {
            const clerk = (0, backend_1.createClerkClient)({ secretKey });
            try {
                const clerkUser = await clerk.users.getUser(jwtPayload.sub);
                identifier = clerkUser.emailAddresses[0]?.emailAddress;
            }
            catch (err) {
                console.error("Failed to fetch user from Clerk API:", err);
            }
        }
        // Clerk sometimes puts the username in the email fields if they logged in with username.
        // So 'identifier' here might be an email OR a username.
        const searchIdentifier = (identifier || jwtPayload.username || jwtPayload.sub || '').toLowerCase();
        if (!searchIdentifier) {
            res.status(400).json({ success: false, error: { message: "Could not extract identifier from Clerk token" } });
            return;
        }
        const users = await (0, db_1.fetchAll)("users");
        // Match the Clerk identity against email, uid, or username in our database
        const found = users.find((u) => {
            const dbEmail = (u.email || '').toLowerCase();
            const dbUid = (u.uid || '').toLowerCase();
            const dbUsername = (u.username || '').toLowerCase();
            return dbEmail === searchIdentifier ||
                dbUid === searchIdentifier ||
                dbUsername === searchIdentifier ||
                (jwtPayload.sub && dbUid === jwtPayload.sub.toLowerCase()); // Fallback to direct Clerk sub match if available
        });
        if (!found) {
            res.status(404).json({ success: false, error: { message: "User not found in local DB. Please sign up first." } });
            return;
        }
        const userRole = found.role || 'user';
        let assignedFacilities = Array.isArray(found.assignedFacilities) ? found.assignedFacilities : [];
        if (typeof assignedFacilities === 'string') {
            try {
                const parsed = JSON.parse(assignedFacilities);
                assignedFacilities = Array.isArray(parsed) ? parsed : [parsed];
            }
            catch {
                assignedFacilities = [assignedFacilities];
            }
        }
        const roles = await (0, db_1.fetchAll)("roles");
        const isCarrierRole = (roleId) => {
            if (!roleId)
                return false;
            if (roleId === "carrier" || roleId.toLowerCase().includes("carrier"))
                return true;
            const rDef = roles.find((r) => r.id === roleId);
            return rDef?.name?.toLowerCase().includes("carrier") || false;
        };
        const hasCarrierAccess = isCarrierRole(userRole) || !!found.carrierId;
        if (mode === "carrier" && !hasCarrierAccess) {
            res.status(403).json({ success: false, error: { message: "This account does not have Carrier access" } });
            return;
        }
        if (mode === "staff" && hasCarrierAccess && found.role !== "admin") {
            res.status(403).json({ success: false, error: { message: "Carriers must use the Carrier Login portal" } });
            return;
        }
        if (found.carrierId && (!assignedFacilities || assignedFacilities.length === 0)) {
            const carriers = await (0, db_1.fetchAll)("carriers");
            const carrier = carriers.find((c) => c.id === found.carrierId);
            if (carrier?.facilityId) {
                try {
                    const parsed = JSON.parse(carrier.facilityId);
                    assignedFacilities = Array.isArray(parsed) ? parsed : [parsed];
                }
                catch {
                    assignedFacilities = [carrier.facilityId];
                }
            }
        }
        if (facilityId && !assignedFacilities.includes(facilityId)) {
            res.status(403).json({ success: false, error: { message: "You do not have access to facility " + facilityId } });
            return;
        }
        const customToken = (0, auth_1.generateToken)({
            uid: found.uid,
            email: found.email,
            displayName: found.displayName,
            role: userRole,
            assignedFacilities,
            carrierId: found.carrierId,
            facilityId: facilityId,
        });
        res.json({
            success: true,
            data: {
                token: customToken,
                user: {
                    uid: found.uid,
                    email: found.email,
                    displayName: found.displayName,
                    role: userRole,
                    assignedFacilities,
                    carrierId: found.carrierId,
                    facilityId: facilityId,
                },
            },
        });
    }
    catch (error) {
        console.error("Clerk Login error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Clerk signup endpoint
router.post("/clerk-signup", async (req, res) => {
    try {
        const { token, facilityId, role = "user", carrierId, firstName, lastName, username } = req.body;
        if (!token) {
            res.status(400).json({ success: false, error: { message: "Clerk token required" } });
            return;
        }
        const secretKey = process.env.CLERK_SECRET_KEY;
        let jwtPayload;
        try {
            jwtPayload = await (0, backend_1.verifyToken)(token, { secretKey: secretKey });
        }
        catch (verr) {
            res.status(401).json({ success: false, error: { message: "Invalid Clerk token" } });
            return;
        }
        const emailMatches = Object.values(jwtPayload).find(v => typeof v === 'string' && v.includes('@'));
        let identifier = jwtPayload.email || jwtPayload.email_addresses?.[0] || emailMatches;
        if (!identifier && jwtPayload.sub && secretKey) {
            const clerk = (0, backend_1.createClerkClient)({ secretKey });
            try {
                const clerkUser = await clerk.users.getUser(jwtPayload.sub);
                identifier = clerkUser.emailAddresses[0]?.emailAddress;
            }
            catch (err) {
                console.error("Failed to fetch user from Clerk API:", err);
            }
        }
        if (!identifier) {
            res.status(400).json({ success: false, error: { message: "Could not extract email from Clerk token" } });
            return;
        }
        const users = await (0, db_1.fetchAll)("users");
        if (users.some((u) => u.email?.toLowerCase() === identifier.toLowerCase())) {
            res.status(400).json({ success: false, error: { message: "Email already registered in local DB. Try logging in." } });
            return;
        }
        // Re-use email identifier as UID as explicitly requested
        const uid = identifier.toLowerCase();
        // Empty password hash since it's managed via clerk, but keeping field for db coherence
        const hashedPassword = await bcryptjs_1.default.hash(uid, 10);
        const email = identifier;
        const assignedFacilities = facilityId ? [facilityId] : [];
        const fallbackName = (jwtPayload.first_name || jwtPayload.given_name || email.split("@")[0]);
        const explicitName = [firstName, lastName].filter(Boolean).join(" ");
        const displayName = explicitName || fallbackName;
        const profile = {
            uid,
            email,
            password: hashedPassword,
            displayName,
            firstName: firstName || null,
            lastName: lastName || null,
            username: username || email.split("@")[0],
            role,
            assignedFacilities,
            carrierId: carrierId || null,
            updatedAt: new Date().toISOString(),
        };
        await (0, db_1.insert)("users", profile);
        const customToken = (0, auth_1.generateToken)({
            uid,
            email,
            displayName: profile.displayName,
            role,
            assignedFacilities,
            carrierId,
        });
        res.status(201).json({
            success: true,
            data: {
                token: customToken,
                user: { uid, email, displayName: profile.displayName, role, assignedFacilities, carrierId },
            },
        });
    }
    catch (error) {
        console.error("Clerk Signup error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Get current user profile
router.get("/me", auth_1.authenticate, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: { message: "Unauthorized" } });
            return;
        }
        const user = await (0, db_1.fetchById)("users", req.user.uid, "uid");
        if (!user) {
            res.status(404).json({ success: false, error: { message: "User not found" } });
            return;
        }
        let carrier = null;
        if (user.carrierId) {
            // Try fetching by ID first
            carrier = await (0, db_1.fetchById)("carriers", user.carrierId);
            // If not found, try fetching by name (carrierId now stores carrier name)
            if (!carrier) {
                const carriers = await (0, db_1.fetchAll)("carriers");
                carrier = carriers.find((c) => c.name.toLowerCase() === user.carrierId?.toLowerCase());
            }
        }
        res.json({
            success: true,
            data: {
                user: {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    role: user.role,
                    assignedFacilities: user.assignedFacilities,
                    carrierId: user.carrierId,
                },
                carrier,
            },
        });
    }
    catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Update user profile
router.put("/me", auth_1.authenticate, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: { message: "Unauthorized" } });
            return;
        }
        const { displayName, email, photoURL } = req.body;
        const updates = { updatedAt: new Date().toISOString() };
        if (displayName !== undefined)
            updates.displayName = displayName;
        if (email !== undefined)
            updates.email = email;
        if (photoURL !== undefined)
            updates.photoURL = photoURL;
        await (0, db_1.update)("users", req.user.uid, updates, "uid");
        const updatedUser = await (0, db_1.fetchById)("users", req.user.uid, "uid");
        res.json({
            success: true,
            data: {
                uid: updatedUser.uid,
                email: updatedUser.email,
                displayName: updatedUser.displayName,
                photoURL: updatedUser.photoURL,
                role: updatedUser.role,
                assignedFacilities: updatedUser.assignedFacilities,
                carrierId: updatedUser.carrierId,
            },
        });
    }
    catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Change password
router.post("/change-password", auth_1.authenticate, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: { message: "Unauthorized" } });
            return;
        }
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            res.status(400).json({ success: false, error: { message: "Both passwords required" } });
            return;
        }
        const user = await (0, db_1.fetchById)("users", req.user.uid, "uid");
        if (!user) {
            res.status(404).json({ success: false, error: { message: "User not found" } });
            return;
        }
        const validPassword = user.password?.startsWith("$2")
            ? await bcryptjs_1.default.compare(currentPassword, user.password)
            : currentPassword === user.password;
        if (!validPassword) {
            res.status(401).json({ success: false, error: { message: "Current password is incorrect" } });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await (0, db_1.update)("users", req.user.uid, { password: hashedPassword }, "uid");
        res.json({ success: true, message: "Password updated successfully" });
    }
    catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Driver login
router.post("/driver-login", async (req, res) => {
    try {
        const { trailerNumber } = req.body;
        if (!trailerNumber) {
            res.status(400).json({ success: false, error: { message: "Trailer number required" } });
            return;
        }
        const cleanNumber = trailerNumber.trim().toLowerCase();
        const trailers = await (0, db_1.fetchAll)("trailers");
        const drivers = await (0, db_1.fetchAll)("drivers");
        const matchedDrivers = [];
        let matchedTrailer = null;
        for (const trailer of trailers) {
            if (trailer.status === "GatedOut" || trailer.status === "Unknown")
                continue;
            if (trailer.number && trailer.number.toLowerCase() === cleanNumber) {
                if (trailer.currentDriverId) {
                    const driver = drivers.find((d) => d.id === trailer.currentDriverId);
                    if (driver && !matchedDrivers.find((d) => d.id === driver.id)) {
                        matchedDrivers.push(driver);
                        if (!matchedTrailer)
                            matchedTrailer = trailer;
                    }
                }
            }
        }
        if (matchedDrivers.length === 0) {
            res.status(404).json({ success: false, error: { message: "No driver found for this trailer" } });
            return;
        }
        res.json({ success: true, data: { drivers: matchedDrivers, trailer: matchedTrailer, trailerNumber: cleanNumber } });
    }
    catch (error) {
        console.error("Driver login error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Set password from invitation/reset token
router.post("/set-password", async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            res.status(400).json({ success: false, error: { message: "Token and password required" } });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({ success: false, error: { message: "Password must be at least 6 characters" } });
            return;
        }
        const tokenData = (0, email_1.verifyPasswordToken)(token);
        if (!tokenData) {
            res.status(400).json({ success: false, error: { message: "Invalid or expired token" } });
            return;
        }
        const user = await (0, db_1.fetchById)("users", tokenData.uid, "uid");
        if (!user) {
            res.status(404).json({ success: false, error: { message: "User not found" } });
            return;
        }
        // Verify email matches
        if (user.email !== tokenData.email) {
            res.status(400).json({ success: false, error: { message: "Invalid token" } });
            return;
        }
        // Hash password and update
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        await (0, db_1.update)("users", tokenData.uid, { password: hashedPassword }, "uid");
        // Generate login token
        const loginToken = (0, auth_1.generateToken)({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            assignedFacilities: user.assignedFacilities || [],
            carrierId: user.carrierId,
        });
        res.json({
            success: true,
            message: "Password set successfully",
            data: {
                token: loginToken,
                user: {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    role: user.role,
                    assignedFacilities: user.assignedFacilities,
                    carrierId: user.carrierId
                }
            }
        });
    }
    catch (error) {
        console.error("Set password error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
exports.default = router;
