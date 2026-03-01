"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchWebhookLogs = exports.triggerWebhooks = exports.deleteWebhook = exports.updateWebhook = exports.createWebhook = exports.fetchWebhookById = exports.fetchWebhooks = exports.WEBHOOK_EVENTS = void 0;
const turso_1 = require("../../turso");
const crypto_1 = __importDefault(require("crypto"));
exports.WEBHOOK_EVENTS = [
    // Appointments
    "appointment.created",
    "appointment.updated",
    "appointment.cancelled",
    "appointment.checkedIn",
    "appointment.checkedOut",
    // Trailers
    "trailer.created",
    "trailer.updated",
    "trailer.gateOut",
    "trailer.movedToYard",
    // Drivers
    "driver.created",
    "driver.updated",
    "driver.deleted",
    // Carriers
    "carrier.created",
    "carrier.updated",
    "carrier.deleted",
    // Resources
    "resource.created",
    "resource.updated",
    "resource.cleared",
    // Users
    "user.created",
    "user.updated",
    "user.deleted",
];
const safeJsonParse = (str) => {
    if (!str)
        return null;
    try {
        return JSON.parse(str);
    }
    catch (e) {
        return null;
    }
};
const fetchWebhooks = async (facilityId) => {
    let sql = "SELECT * FROM webhooks WHERE isActive = 1";
    const args = [];
    if (facilityId) {
        sql += " AND (facilityId = ? OR facilityId IS NULL)";
        args.push(facilityId);
    }
    const result = await turso_1.turso.execute({ sql, args });
    return result.rows.map((row) => ({
        ...row,
        events: safeJsonParse(row.events) || [],
        isActive: Boolean(row.isActive),
    }));
};
exports.fetchWebhooks = fetchWebhooks;
const fetchWebhookById = async (id) => {
    const result = await turso_1.turso.execute({
        sql: "SELECT * FROM webhooks WHERE id = ?",
        args: [id],
    });
    if (result.rows.length === 0)
        return null;
    const row = result.rows[0];
    return {
        id: row.id,
        facilityId: row.facilityId,
        name: row.name,
        url: row.url,
        events: safeJsonParse(row.events) || [],
        secret: row.secret,
        isActive: Boolean(row.isActive),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
};
exports.fetchWebhookById = fetchWebhookById;
const createWebhook = async (webhook) => {
    const id = `WH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    await turso_1.turso.execute({
        sql: `INSERT INTO webhooks (id, facilityId, name, url, events, secret, isActive, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
            id,
            webhook.facilityId || null,
            webhook.name,
            webhook.url,
            JSON.stringify(webhook.events),
            webhook.secret || null,
            webhook.isActive ? 1 : 0,
            now,
            now,
        ],
    });
    return { ...webhook, id, createdAt: now, updatedAt: now };
};
exports.createWebhook = createWebhook;
const updateWebhook = async (id, updates) => {
    const existing = await (0, exports.fetchWebhookById)(id);
    if (!existing)
        return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await turso_1.turso.execute({
        sql: `UPDATE webhooks SET name = ?, url = ?, events = ?, secret = ?, isActive = ?, updatedAt = ?
          WHERE id = ?`,
        args: [
            updated.name,
            updated.url,
            JSON.stringify(updated.events),
            updated.secret || null,
            updated.isActive ? 1 : 0,
            updated.updatedAt,
            id,
        ],
    });
    return updated;
};
exports.updateWebhook = updateWebhook;
const deleteWebhook = async (id) => {
    const result = await turso_1.turso.execute({
        sql: "DELETE FROM webhooks WHERE id = ?",
        args: [id],
    });
    return result.rowsAffected > 0;
};
exports.deleteWebhook = deleteWebhook;
const logWebhookCall = async (webhookId, event, payload, success, responseStatus, responseBody) => {
    const id = `WHL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    await turso_1.turso.execute({
        sql: `INSERT INTO webhook_logs (id, webhookId, event, payload, responseStatus, responseBody, success, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, webhookId, event, JSON.stringify(payload), responseStatus || null, responseBody || null, success ? 1 : 0, now],
    });
};
const triggerWebhooks = async (event, data, facilityId) => {
    const webhooks = await (0, exports.fetchWebhooks)(facilityId);
    const matchingWebhooks = webhooks.filter((w) => w.events.includes(event));
    if (matchingWebhooks.length === 0)
        return;
    const payload = {
        event,
        timestamp: new Date().toISOString(),
        data,
        facilityId,
    };
    const sendPromises = matchingWebhooks.map(async (webhook) => {
        try {
            const headers = {
                "Content-Type": "application/json",
                "X-Webhook-Event": event,
                "X-Webhook-ID": webhook.id,
            };
            if (webhook.secret) {
                const signature = crypto_1.default
                    .createHmac("sha256", webhook.secret)
                    .update(JSON.stringify(payload))
                    .digest("hex");
                headers["X-Webhook-Signature"] = signature;
            }
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            const response = await fetch(webhook.url, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            const responseText = await response.text();
            const success = response.ok;
            await logWebhookCall(webhook.id, event, payload, success, response.status, responseText);
            console.log(`[Webhook] ${event} -> ${webhook.url} [${response.status}]`);
        }
        catch (error) {
            console.error(`[Webhook] ${event} -> ${webhook.url} [ERROR]:`, error.message);
            await logWebhookCall(webhook.id, event, payload, false, 0, error.message);
        }
    });
    await Promise.allSettled(sendPromises);
};
exports.triggerWebhooks = triggerWebhooks;
const fetchWebhookLogs = async (webhookId, limit = 50) => {
    let sql = "SELECT * FROM webhook_logs";
    const args = [];
    if (webhookId) {
        sql += " WHERE webhookId = ?";
        args.push(webhookId);
    }
    sql += " ORDER BY createdAt DESC LIMIT ?";
    args.push(limit);
    const result = await turso_1.turso.execute({ sql, args });
    return result.rows.map((row) => ({
        ...row,
        success: Boolean(row.success),
        payload: safeJsonParse(row.payload),
    }));
};
exports.fetchWebhookLogs = fetchWebhookLogs;
