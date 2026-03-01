"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const socket_1 = require("../services/socket");
const webhooks_1 = require("../services/webhooks");
const router = (0, express_1.Router)();
// Get all trailers (filtered by facility context)
router.get("/", async (req, res) => {
    try {
        const facilityId = req.headers['x-facility-id'] || req.currentFacilityId;
        if (!facilityId) {
            const trailers = await (0, db_1.fetchAll)("trailers");
            res.json({ success: true, data: trailers });
            return;
        }
        const trailers = await (0, db_1.fetchByFacility)("trailers", facilityId);
        res.json({ success: true, data: trailers });
    }
    catch (error) {
        console.error("Get trailers error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Get trailer by ID
router.get("/:id", async (req, res) => {
    try {
        const trailer = await (0, db_1.fetchById)("trailers", req.params.id);
        if (!trailer) {
            res
                .status(404)
                .json({ success: false, error: { message: "Trailer not found" } });
            return;
        }
        res.json({ success: true, data: trailer });
    }
    catch (error) {
        console.error("Get trailer error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Save trailer (create or update)
router.post("/save", async (req, res) => {
    try {
        const { id, facilityId: bodyFacilityId, number, ...rest } = req.body;
        const headerFacilityId = req.headers['x-facility-id'] || req.currentFacilityId;
        // Use facilityId from body if available, otherwise use header/context
        const facilityId = bodyFacilityId || headerFacilityId;
        console.log("[Trailers] Save - id:", id, "number:", number, "facilityId:", facilityId);
        if (!facilityId) {
            console.log("[Trailers] Save - No facilityId found. Body:", req.body, "Header:", req.headers['x-facility-id']);
            res.status(400).json({ success: false, error: { message: "Facility context required" } });
            return;
        }
        // If ID is provided, try to find existing trailer - if not found, create new one
        if (id) {
            const existing = await (0, db_1.fetchById)("trailers", id);
            if (existing) {
                // Update existing trailer
                const history = [...(existing.history || [])];
                if (rest.status && rest.status !== existing.status) {
                    history.push({ status: rest.status, timestamp: new Date().toISOString() });
                    // Sync with appointment
                    let appId = rest.currentAppointmentId || existing.currentAppointmentId;
                    // Fallback: If no direct link, find active appointment by trailer number
                    if (!appId && existing.number) {
                        const allApps = await (0, db_1.fetchAll)("appointments");
                        const activeApp = allApps.find((a) => a.trailerNumber?.toLowerCase() === existing.number.toLowerCase() &&
                            !["Completed", "Cancelled", "Departed"].includes(a.status) &&
                            a.facilityId === existing.facilityId);
                        if (activeApp) {
                            appId = activeApp.id;
                            // Also update the trailer to store this link for next time
                            await (0, db_1.update)("trailers", id, { currentAppointmentId: appId });
                        }
                    }
                    if (appId) {
                        const app = await (0, db_1.fetchById)("appointments", appId);
                        if (app) {
                            const appHistory = [...(app.history || []), { status: rest.status, timestamp: new Date().toISOString() }];
                            await (0, db_1.update)("appointments", appId, { status: rest.status, history: appHistory });
                        }
                    }
                }
                await (0, db_1.update)("trailers", id, { ...rest, history });
                const updated = await (0, db_1.fetchById)("trailers", id);
                (0, socket_1.emitEvent)(socket_1.EVENTS.TRAILER_UPDATED, updated, updated?.facilityId);
                (0, webhooks_1.triggerWebhooks)("trailer.updated", updated, updated?.facilityId);
                res.json({ success: true, data: updated });
            }
            else {
                // ID provided but not found - create new trailer with provided ID
                console.log("[Trailers] Save - ID not found, creating new trailer with provided ID:", id);
                const status = rest.status || "Scheduled";
                const history = [{ status, timestamp: new Date().toISOString() }];
                const trailer = {
                    id,
                    number,
                    facilityId,
                    ...rest,
                    status,
                    history,
                    photos: [],
                    documents: [],
                    instructionTimestamp: null,
                };
                await (0, db_1.insert)("trailers", trailer);
                const created = await (0, db_1.fetchById)("trailers", id);
                (0, socket_1.emitEvent)(socket_1.EVENTS.TRAILER_CREATED, created, created.facilityId);
                (0, webhooks_1.triggerWebhooks)("trailer.created", created, created.facilityId);
                res.status(201).json({ success: true, data: created });
            }
        }
        else {
            // No ID provided - check if trailer with this number already exists
            const allTrailers = await (0, db_1.fetchAll)("trailers");
            const existingByNumber = allTrailers.find((t) => t.number?.toLowerCase() === number?.toLowerCase());
            if (existingByNumber) {
                // Update existing trailer
                console.log("[Trailers] Save - Found existing trailer by number, updating:", existingByNumber.id);
                const history = [...(existingByNumber.history || [])];
                if (rest.status && rest.status !== existingByNumber.status) {
                    history.push({ status: rest.status, timestamp: new Date().toISOString() });
                    // Sync with appointment
                    let appId = rest.currentAppointmentId || existingByNumber.currentAppointmentId;
                    // Fallback: If no direct link, find active appointment by trailer number
                    if (!appId && existingByNumber.number) {
                        const allApps = await (0, db_1.fetchAll)("appointments");
                        const activeApp = allApps.find((a) => a.trailerNumber?.toLowerCase() === existingByNumber.number.toLowerCase() &&
                            !["Completed", "Cancelled", "Departed"].includes(a.status) &&
                            a.facilityId === existingByNumber.facilityId);
                        if (activeApp) {
                            appId = activeApp.id;
                            // Also update the trailer to store this link for next time
                            await (0, db_1.update)("trailers", existingByNumber.id, { currentAppointmentId: appId });
                        }
                    }
                    if (appId) {
                        const app = await (0, db_1.fetchById)("appointments", appId);
                        if (app) {
                            const appHistory = [...(app.history || []), { status: rest.status, timestamp: new Date().toISOString() }];
                            await (0, db_1.update)("appointments", appId, { status: rest.status, history: appHistory });
                        }
                    }
                }
                await (0, db_1.update)("trailers", existingByNumber.id, { ...rest, history });
                const updated = await (0, db_1.fetchById)("trailers", existingByNumber.id);
                (0, socket_1.emitEvent)(socket_1.EVENTS.TRAILER_UPDATED, updated, updated?.facilityId);
                (0, webhooks_1.triggerWebhooks)("trailer.updated", updated, updated?.facilityId);
                res.json({ success: true, data: updated });
            }
            else {
                // Create new trailer
                const newId = `TRL-${Date.now()}`;
                const status = rest.status || "Scheduled";
                const history = [{ status, timestamp: new Date().toISOString() }];
                const trailer = {
                    id: newId,
                    number,
                    facilityId,
                    ...rest,
                    status,
                    history,
                    photos: [],
                    documents: [],
                    instructionTimestamp: null,
                };
                console.log("[Trailers] Save - Creating new trailer:", trailer);
                await (0, db_1.insert)("trailers", trailer);
                const created = await (0, db_1.fetchById)("trailers", newId);
                (0, socket_1.emitEvent)(socket_1.EVENTS.TRAILER_CREATED, created, created.facilityId);
                (0, webhooks_1.triggerWebhooks)("trailer.created", created, created.facilityId);
                res.status(201).json({ success: true, data: created });
            }
        }
    }
    catch (error) {
        console.error("Save trailer error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Search trailers
router.post("/search", async (req, res) => {
    try {
        const facilityId = req.headers['x-facility-id'] || req.currentFacilityId;
        const query = req.body;
        let trailers = facilityId ? await (0, db_1.fetchByFacility)("trailers", facilityId) : await (0, db_1.fetchAll)("trailers");
        if (query && Object.keys(query).length > 0) {
            trailers = trailers.filter((t) => {
                return Object.entries(query).every(([key, value]) => {
                    if (value === undefined || value === null || value === "")
                        return true;
                    const itemValue = t[key];
                    if (typeof value === "string" && typeof itemValue === "string") {
                        return itemValue.toLowerCase().includes(value.toLowerCase());
                    }
                    return itemValue === value;
                });
            });
        }
        res.json({ success: true, data: trailers, total: trailers.length });
    }
    catch (error) {
        console.error("Search trailers error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Gate out trailer
router.post("/:id/gateout", async (req, res) => {
    try {
        const { checkOutWeight, checkOutDocNumber } = req.body;
        const trailer = await (0, db_1.fetchById)("trailers", req.params.id);
        if (!trailer) {
            res
                .status(404)
                .json({ success: false, error: { message: "Trailer not found" } });
            return;
        }
        const history = [
            ...(trailer.history || []),
            {
                status: "GatedOut",
                timestamp: new Date().toISOString(),
            },
        ];
        // Find the dock/resource this trailer is on
        const dockId = trailer.location;
        await (0, db_1.update)("trailers", req.params.id, {
            status: "GatedOut",
            checkOutWeight,
            checkOutDocNumber,
            location: null,
            history,
        });
        // Update related appointment if exists
        let appId = trailer.currentAppointmentId;
        if (!appId && trailer.number) {
            const allApps = await (0, db_1.fetchAll)("appointments");
            const activeApp = allApps.find((a) => a.trailerNumber?.toLowerCase() === trailer.number.toLowerCase() &&
                !["Completed", "Cancelled", "Departed"].includes(a.status) &&
                a.facilityId === trailer.facilityId);
            if (activeApp)
                appId = activeApp.id;
        }
        if (appId) {
            const appointment = await (0, db_1.fetchById)("appointments", appId);
            if (appointment) {
                const appHistory = [
                    ...(appointment.history || []),
                    {
                        status: "Departed",
                        timestamp: new Date().toISOString(),
                    },
                ];
                await (0, db_1.update)("appointments", appId, {
                    status: "Departed",
                    history: appHistory,
                });
                // Release the dock/resource
                const dockResource = appointment.assignedResourceId || dockId;
                if (dockResource) {
                    await (0, db_1.update)("resources", dockResource, {
                        status: "Available",
                        currentAppId: null,
                        currentTrailerId: null,
                    });
                }
            }
        }
        else if (dockId) {
            // If no appointment but trailer had a location, release that resource
            const resource = await (0, db_1.fetchById)("resources", dockId);
            if (resource) {
                await (0, db_1.update)("resources", dockId, {
                    status: "Available",
                    currentAppId: null,
                    currentTrailerId: null,
                });
            }
        }
        const updated = await (0, db_1.fetchById)("trailers", req.params.id);
        (0, socket_1.emitEvent)(socket_1.EVENTS.TRAILER_GATE_OUT, updated, updated?.facilityId);
        (0, webhooks_1.triggerWebhooks)("trailer.gateOut", updated, updated?.facilityId);
        res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error("Gate out trailer error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Driver endpoint - Update trailer status (no auth required)
router.post("/driver/update-status", async (req, res) => {
    try {
        const { trailerId, status, location } = req.body;
        if (!trailerId) {
            res.status(400).json({ success: false, error: { message: "Trailer ID required" } });
            return;
        }
        if (!status) {
            res.status(400).json({ success: false, error: { message: "Status required" } });
            return;
        }
        const trailer = await (0, db_1.fetchById)("trailers", trailerId);
        if (!trailer) {
            res.status(404).json({ success: false, error: { message: "Trailer not found" } });
            return;
        }
        const history = [
            ...(trailer.history || []),
            {
                status,
                timestamp: new Date().toISOString(),
            },
        ];
        const updates = {
            status,
            history,
        };
        if (location !== undefined) {
            updates.location = location;
        }
        await (0, db_1.update)("trailers", trailerId, updates);
        // If status is CheckedOut or ReadyForCheckIn, handle related appointment and resource
        if (status === "CheckedOut" || status === "ReadyForCheckIn" || status === "InYard" || status === "Departed" || status === "CheckedIn") {
            const locationToSet = location !== undefined ? location : trailer.location;
            let appId = trailer.currentAppointmentId;
            if (!appId && trailer.number) {
                // Fallback: lookup active appointment by number
                const allApps = await (0, db_1.fetchAll)("appointments");
                const activeApp = allApps.find((a) => a.trailerNumber?.toLowerCase() === trailer.number.toLowerCase() &&
                    !["Completed", "Cancelled", "Departed"].includes(a.status) &&
                    a.facilityId === trailer.facilityId);
                if (activeApp) {
                    appId = activeApp.id;
                    await (0, db_1.update)("trailers", trailerId, { currentAppointmentId: appId });
                }
            }
            if (appId) {
                const appointment = await (0, db_1.fetchById)("appointments", appId);
                if (appointment) {
                    const appHistory = [
                        ...(appointment.history || []),
                        {
                            status: status === "CheckedOut" ? "Departed" : status,
                            timestamp: new Date().toISOString(),
                        },
                    ];
                    const appUpdates = {
                        status: status === "CheckedOut" ? "Departed" : status,
                        history: appHistory,
                    };
                    if (locationToSet && status === "ReadyForCheckIn") {
                        appUpdates.assignedResourceId = locationToSet;
                    }
                    await (0, db_1.update)("appointments", trailer.currentAppointmentId, appUpdates);
                    const dockResource = appointment.assignedResourceId || trailer.location || locationToSet;
                    if (dockResource) {
                        if (status === "CheckedOut") {
                            await (0, db_1.update)("resources", dockResource, {
                                status: "Available",
                                currentAppId: null,
                                currentTrailerId: null,
                            });
                        }
                        else if (status === "ReadyForCheckIn") {
                            await (0, db_1.update)("resources", dockResource, {
                                status: "Occupied",
                                currentAppId: appointment.id,
                                currentTrailerId: trailer.id
                            });
                        }
                    }
                }
            }
            else if (trailer.location || locationToSet) {
                const resId = trailer.location || locationToSet;
                if (status === "CheckedOut") {
                    await (0, db_1.update)("resources", resId, {
                        status: "Available",
                        currentAppId: null,
                        currentTrailerId: null,
                    });
                }
            }
        }
        const updated = await (0, db_1.fetchById)("trailers", trailerId);
        (0, socket_1.emitEvent)(socket_1.EVENTS.TRAILER_UPDATED, updated, updated?.facilityId);
        (0, webhooks_1.triggerWebhooks)("trailer.updated", updated, updated?.facilityId);
        res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error("Driver update status error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Driver endpoint - Move trailer to yard (no auth required)
router.post("/driver/move-to-yard", async (req, res) => {
    try {
        const { trailerId, slotId, appointmentId } = req.body;
        if (!trailerId) {
            res.status(400).json({ success: false, error: { message: "Trailer ID required" } });
            return;
        }
        if (!slotId) {
            res.status(400).json({ success: false, error: { message: "Slot ID required" } });
            return;
        }
        const trailer = await (0, db_1.fetchById)("trailers", trailerId);
        if (!trailer) {
            res.status(404).json({ success: false, error: { message: "Trailer not found" } });
            return;
        }
        const history = [
            ...(trailer.history || []),
            {
                status: "InYard",
                timestamp: new Date().toISOString(),
            },
        ];
        await (0, db_1.update)("trailers", trailerId, {
            status: "InYard",
            location: slotId,
            history,
        });
        let finalAppId = appointmentId;
        if (!finalAppId && trailer.number) {
            const allApps = await (0, db_1.fetchAll)("appointments");
            const activeApp = allApps.find((a) => a.trailerNumber?.toLowerCase() === trailer.number.toLowerCase() &&
                !["Completed", "Cancelled", "Departed"].includes(a.status) &&
                a.facilityId === trailer.facilityId);
            if (activeApp)
                finalAppId = activeApp.id;
        }
        if (finalAppId) {
            const appointment = await (0, db_1.fetchById)("appointments", finalAppId);
            if (appointment) {
                const appHistory = [
                    ...(appointment.history || []),
                    {
                        status: "InYard",
                        timestamp: new Date().toISOString(),
                    },
                ];
                await (0, db_1.update)("appointments", finalAppId, {
                    status: "InYard",
                    assignedResourceId: slotId,
                    history: appHistory,
                });
            }
        }
        const updated = await (0, db_1.fetchById)("trailers", trailerId);
        (0, socket_1.emitEvent)(socket_1.EVENTS.TRAILER_MOVED_TO_YARD, updated, updated?.facilityId);
        (0, webhooks_1.triggerWebhooks)("trailer.movedToYard", updated, updated?.facilityId);
        res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error("Driver move to yard error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Move trailer to yard (authenticated)
router.post("/:id/move-to-yard", async (req, res) => {
    try {
        const { slotId, appointmentId } = req.body;
        const trailer = await (0, db_1.fetchById)("trailers", req.params.id);
        if (!trailer) {
            res
                .status(404)
                .json({ success: false, error: { message: "Trailer not found" } });
            return;
        }
        if (!slotId) {
            res
                .status(400)
                .json({ success: false, error: { message: "Slot ID required" } });
            return;
        }
        const history = [
            ...(trailer.history || []),
            {
                status: "InYard",
                timestamp: new Date().toISOString(),
            },
        ];
        await (0, db_1.update)("trailers", req.params.id, {
            status: "InYard",
            location: slotId,
            history,
        });
        // Update appointment if provided or found
        let finalAppId = appointmentId;
        if (!finalAppId && trailer.number) {
            const allApps = await (0, db_1.fetchAll)("appointments");
            const activeApp = allApps.find((a) => a.trailerNumber?.toLowerCase() === trailer.number.toLowerCase() &&
                !["Completed", "Cancelled", "Departed"].includes(a.status) &&
                a.facilityId === trailer.facilityId);
            if (activeApp)
                finalAppId = activeApp.id;
        }
        if (finalAppId) {
            const appointment = await (0, db_1.fetchById)("appointments", finalAppId);
            if (appointment) {
                const appHistory = [
                    ...(appointment.history || []),
                    {
                        status: "InYard",
                        timestamp: new Date().toISOString(),
                    },
                ];
                await (0, db_1.update)("appointments", finalAppId, {
                    status: "InYard",
                    assignedResourceId: slotId,
                    history: appHistory,
                });
            }
        }
        const updated = await (0, db_1.fetchById)("trailers", req.params.id);
        (0, socket_1.emitEvent)(socket_1.EVENTS.TRAILER_MOVED_TO_YARD, updated, updated?.facilityId);
        (0, webhooks_1.triggerWebhooks)("trailer.movedToYard", updated, updated?.facilityId);
        res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error("Move to yard error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Delete trailer
router.delete("/:id", async (req, res) => {
    try {
        const existing = await (0, db_1.fetchById)("trailers", req.params.id);
        if (!existing) {
            res
                .status(404)
                .json({ success: false, error: { message: "Trailer not found" } });
            return;
        }
        await (0, db_1.remove)("trailers", req.params.id);
        res.json({ success: true, message: "Trailer deleted" });
    }
    catch (error) {
        console.error("Delete trailer error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
exports.default = router;
