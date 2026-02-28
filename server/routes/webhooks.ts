import { Router } from "express";
import {
  fetchWebhooks,
  fetchWebhookById,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  fetchWebhookLogs,
  WEBHOOK_EVENTS,
} from "../services/webhooks";
import { AuthenticatedRequest } from "../types";

const router = Router();

router.get("/events", (req, res) => {
  res.json({ success: true, data: WEBHOOK_EVENTS });
});

router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const facilityId = req.currentFacilityId;
    const webhooks = await fetchWebhooks(facilityId || undefined);
    res.json({ success: true, data: webhooks });
  } catch (error: any) {
    console.error("Get webhooks error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const webhook = await fetchWebhookById(req.params.id);
    if (!webhook) {
      res.status(404).json({ success: false, error: { message: "Webhook not found" } });
      return;
    }
    res.json({ success: true, data: webhook });
  } catch (error: any) {
    console.error("Get webhook error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    const { name, url, events, secret, isActive = true } = req.body;

    if (!name || !url || !events || !Array.isArray(events)) {
      res.status(400).json({
        success: false,
        error: { message: "Name, url, and events array are required" },
      });
      return;
    }

    const invalidEvents = events.filter((e: string) => !WEBHOOK_EVENTS.includes(e as any));
    if (invalidEvents.length > 0) {
      res.status(400).json({
        success: false,
        error: { message: `Invalid events: ${invalidEvents.join(", ")}` },
      });
      return;
    }

    const webhook = await createWebhook({
      name,
      url,
      events,
      secret,
      isActive,
      facilityId: req.currentFacilityId,
    });

    res.status(201).json({ success: true, data: webhook });
  } catch (error: any) {
    console.error("Create webhook error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.put("/:id", async (req: AuthenticatedRequest, res) => {
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
      const invalidEvents = events.filter((e: string) => !WEBHOOK_EVENTS.includes(e as any));
      if (invalidEvents.length > 0) {
        res.status(400).json({
          success: false,
          error: { message: `Invalid events: ${invalidEvents.join(", ")}` },
        });
        return;
      }
    }

    const webhook = await updateWebhook(req.params.id, {
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
  } catch (error: any) {
    console.error("Update webhook error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.delete("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const deleted = await deleteWebhook(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: { message: "Webhook not found" } });
      return;
    }
    res.json({ success: true, message: "Webhook deleted" });
  } catch (error: any) {
    console.error("Delete webhook error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get("/:id/logs", async (req: AuthenticatedRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = await fetchWebhookLogs(req.params.id, limit);
    res.json({ success: true, data: logs });
  } catch (error: any) {
    console.error("Get webhook logs error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get("/logs", async (req: AuthenticatedRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = await fetchWebhookLogs(undefined, limit);
    res.json({ success: true, data: logs });
  } catch (error: any) {
    console.error("Get webhook logs error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
