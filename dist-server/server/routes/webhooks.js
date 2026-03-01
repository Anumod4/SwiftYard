"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webhooks_1 = require("../services/webhooks");
const router = (0, express_1.Router)();
router.get("/events", (req, res) => {
    res.json({ success: true, data: webhooks_1.WEBHOOK_EVENTS });
});
router.get("/", async (req, res) => {
    try {
        const facilityId = req.currentFacilityId;
        const webhooks = await (0, webhooks_1.fetchWebhooks)(facilityId || undefined);
        res.json({ success: true, data: webhooks });
    }
    catch (error) {
        console.error("Get webhooks error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
router.get("/:id", async (req, res) => {
    try {
        const webhook = await (0, webhooks_1.fetchWebhookById)(req.params.id);
        if (!webhook) {
            res.status(404).json({ success: false, error: { message: "Webhook not found" } });
            return;
        }
        res.json({ success: true, data: webhook });
    }
    catch (error) {
        console.error("Get webhook error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
router.post("/", async (req, res) => {
    try {
        const { name, url, events, secret, isActive = true } = req.body;
        if (!name || !url || !events || !Array.isArray(events)) {
            res.status(400).json({
                success: false,
                error: { message: "Name, url, and events array are required" },
            });
            return;
        }
        const invalidEvents = events.filter((e) => !webhooks_1.WEBHOOK_EVENTS.includes(e));
        if (invalidEvents.length > 0) {
            res.status(400).json({
                success: false,
                error: { message: `Invalid events: ${invalidEvents.join(", ")}` },
            });
            return;
        }
        const webhook = await (0, webhooks_1.createWebhook)({
            name,
            url,
            events,
            secret,
            isActive,
            facilityId: req.currentFacilityId,
        });
        res.status(201).json({ success: true, data: webhook });
    }
    catch (error) {
        console.error("Create webhook error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
router.put("/:id", async (req, res) => {
    try {
        const { name, url, events, secret, isActive } = req.body;
        if (events && !Array.isArray(events)) {
            res.status(400).json({
                success: false,
                error: { message: "Events must be an array" },
            });
            return;
        }
        if (events) {
            const invalidEvents = events.filter((e) => !webhooks_1.WEBHOOK_EVENTS.includes(e));
            if (invalidEvents.length > 0) {
                res.status(400).json({
                    success: false,
                    error: { message: `Invalid events: ${invalidEvents.join(", ")}` },
                });
                return;
            }
        }
        const webhook = await (0, webhooks_1.updateWebhook)(req.params.id, {
            name,
            url,
            events,
            secret,
            isActive,
        });
        if (!webhook) {
            res.status(404).json({ success: false, error: { message: "Webhook not found" } });
            return;
        }
        res.json({ success: true, data: webhook });
    }
    catch (error) {
        console.error("Update webhook error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
router.delete("/:id", async (req, res) => {
    try {
        const deleted = await (0, webhooks_1.deleteWebhook)(req.params.id);
        if (!deleted) {
            res.status(404).json({ success: false, error: { message: "Webhook not found" } });
            return;
        }
        res.json({ success: true, message: "Webhook deleted" });
    }
    catch (error) {
        console.error("Delete webhook error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
router.get("/:id/logs", async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const logs = await (0, webhooks_1.fetchWebhookLogs)(req.params.id, limit);
        res.json({ success: true, data: logs });
    }
    catch (error) {
        console.error("Get webhook logs error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
router.get("/logs", async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const logs = await (0, webhooks_1.fetchWebhookLogs)(undefined, limit);
        res.json({ success: true, data: logs });
    }
    catch (error) {
        console.error("Get webhook logs error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
exports.default = router;
