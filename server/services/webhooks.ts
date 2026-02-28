import { turso } from "../../turso";
import crypto from "crypto";

export interface Webhook {
  id: string;
  facilityId?: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  event: string;
  payload: string;
  responseStatus?: number;
  responseBody?: string;
  success: boolean;
  createdAt: string;
}

export const WEBHOOK_EVENTS = [
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
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

const safeJsonParse = (str: any) => {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
};

export const fetchWebhooks = async (facilityId?: string): Promise<Webhook[]> => {
  let sql = "SELECT * FROM webhooks WHERE isActive = 1";
  const args: any[] = [];

  if (facilityId) {
    sql += " AND (facilityId = ? OR facilityId IS NULL)";
    args.push(facilityId);
  }

  const result = await turso.execute({ sql, args });
  return result.rows.map((row: any) => ({
    ...row,
    events: safeJsonParse(row.events) || [],
    isActive: Boolean(row.isActive),
  }));
};

export const fetchWebhookById = async (id: string): Promise<Webhook | null> => {
  const result = await turso.execute({
    sql: "SELECT * FROM webhooks WHERE id = ?",
    args: [id],
  });
  if (result.rows.length === 0) return null;
  const row: any = result.rows[0];
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

export const createWebhook = async (webhook: Omit<Webhook, "id" | "createdAt" | "updatedAt">): Promise<Webhook> => {
  const id = `WH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  await turso.execute({
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

export const updateWebhook = async (id: string, updates: Partial<Webhook>): Promise<Webhook | null> => {
  const existing = await fetchWebhookById(id);
  if (!existing) return null;

  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };

  await turso.execute({
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

export const deleteWebhook = async (id: string): Promise<boolean> => {
  const result = await turso.execute({
    sql: "DELETE FROM webhooks WHERE id = ?",
    args: [id],
  });
  return result.rowsAffected > 0;
};

const logWebhookCall = async (
  webhookId: string,
  event: string,
  payload: any,
  success: boolean,
  responseStatus?: number,
  responseBody?: string
): Promise<void> => {
  const id = `WHL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  await turso.execute({
    sql: `INSERT INTO webhook_logs (id, webhookId, event, payload, responseStatus, responseBody, success, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, webhookId, event, JSON.stringify(payload), responseStatus || null, responseBody || null, success ? 1 : 0, now],
  });
};

export const triggerWebhooks = async (event: WebhookEvent, data: any, facilityId?: string): Promise<void> => {
  const webhooks = await fetchWebhooks(facilityId);

  const matchingWebhooks = webhooks.filter((w) => w.events.includes(event));

  if (matchingWebhooks.length === 0) return;

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    data,
    facilityId,
  };

  const sendPromises = matchingWebhooks.map(async (webhook) => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Webhook-Event": event,
        "X-Webhook-ID": webhook.id,
      };

      if (webhook.secret) {
        const signature = crypto
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
    } catch (error: any) {
      console.error(`[Webhook] ${event} -> ${webhook.url} [ERROR]:`, error.message);
      await logWebhookCall(webhook.id, event, payload, false, 0, error.message);
    }
  });

  await Promise.allSettled(sendPromises);
};

export const fetchWebhookLogs = async (webhookId?: string, limit = 50): Promise<WebhookLog[]> => {
  let sql = "SELECT * FROM webhook_logs";
  const args: any[] = [];

  if (webhookId) {
    sql += " WHERE webhookId = ?";
    args.push(webhookId);
  }

  sql += " ORDER BY createdAt DESC LIMIT ?";
  args.push(limit);

  const result = await turso.execute({ sql, args });
  return result.rows.map((row: any) => ({
    ...row,
    success: Boolean(row.success),
    payload: safeJsonParse(row.payload),
  }));
};
