import { Router, Response } from "express";
import {
  fetchAll,
  fetchById,
  fetchByFacility,
  insert,
  update,
  remove,
} from "../db";
import {
  AuthenticatedRequest,
  CreateAppointmentDTO,
  UpdateAppointmentDTO,
} from "../types";
import { emitEvent, EVENTS } from "../services/socket";
import { triggerWebhooks } from "../services/webhooks";

const router = Router();

// Get all appointments (filtered by facility context and carrier)
router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;
    const user = req.user;

    console.log("[Appointments] GET - facilityId:", facilityId, "user.role:", user?.role);

    // Check if user is a carrier - they should only see their own appointments
    const isCarrier = !!(user?.role === "carrier" || user?.carrierId);

    // Get all appointments (no facility filter) for carriers to filter by carrierId
    let appointments;
    if (isCarrier && user?.carrierId) {
      // Carrier - fetch all and filter by carrierId (now using carrier name)
      appointments = await fetchAll("appointments");
      // Use case-insensitive comparison since carrierId is now carrier name
      appointments = appointments.filter((a: any) =>
        a.carrierId && a.carrierId.toLowerCase() === user.carrierId?.toLowerCase()
      );
      console.log("[Appointments] Carrier filter applied, carrierId:", user.carrierId, "Results:", appointments.length);
    } else if (!facilityId) {
      // Admin console - return all
      appointments = await fetchAll("appointments");
    } else {
      // Has facility context
      appointments = await fetchByFacility("appointments", facilityId);
      // If carrier, also filter by carrierId
      if (isCarrier) {
        appointments = appointments.filter((a: any) =>
          a.carrierId && a.carrierId.toLowerCase() === user.carrierId?.toLowerCase()
        );
      }
    }

    console.log("[Appointments] Returning:", appointments.length, "appointments");
    res.json({ success: true, data: appointments });
  } catch (error: any) {
    console.error("Get appointments error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Get appointment by ID
router.get("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const appointment = await fetchById("appointments", req.params.id);

    if (!appointment) {
      res
        .status(404)
        .json({ success: false, error: { message: "Appointment not found" } });
      return;
    }

    res.json({ success: true, data: appointment });
  } catch (error: any) {
    console.error("Get appointment error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Save appointment (create or update)
router.post("/save", async (req: AuthenticatedRequest, res) => {
  try {
    const { id, ...rest } = req.body;
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;

    if (!facilityId) {
      res.status(400).json({
        success: false,
        error: { message: "Facility context required" },
      });
      return;
    }

    if (id) {
      const existing = await fetchById("appointments", id);
      if (!existing) {
        res.status(404).json({ success: false, error: { message: "Appointment not found" } });
        return;
      }

      const updates = rest;
      const history = [...(existing.history || [])];
      if (updates.status && updates.status !== existing.status) {
        history.push({ status: updates.status, timestamp: new Date().toISOString() });
      }

      await update("appointments", id, { ...updates, history });
      const updated = await fetchById("appointments", id);

      // Link trailer if number is provided or exists on record
      const trailerNumber = updates.trailerNumber || existing.trailerNumber;
      if (trailerNumber) {
        const trailers = await fetchAll("trailers");
        const trailer = trailers.find((t: any) => t.number?.toLowerCase() === trailerNumber.toLowerCase());

        const currentStatus = updates.status || existing.status;
        const targetTrailerStatus = currentStatus === 'Scheduled' || currentStatus === 'PendingApproval' ? 'Scheduled' : 'InTransit';

        if (trailer) {
          const trailerUpdates: any = { currentAppointmentId: id };
          if (currentStatus === 'Scheduled' && trailer.status !== 'Scheduled') {
            trailerUpdates.status = 'Scheduled';
            trailerUpdates.history = [...(trailer.history || []), { status: 'Scheduled', timestamp: new Date().toISOString() }];
          }
          await update("trailers", trailer.id, trailerUpdates);
        } else {
          const newTrailerId = `TRL-${Date.now()}`;
          const newTrailer = {
            id: newTrailerId,
            number: trailerNumber,
            carrierId: updates.carrierId || existing.carrierId,
            type: updates.trailerType || existing.trailerType || 'Standard 53ft',
            status: targetTrailerStatus,
            currentAppointmentId: id,
            history: [{ status: targetTrailerStatus, timestamp: new Date().toISOString() }]
          };
          await insert("trailers", newTrailer);
          emitEvent(EVENTS.TRAILER_CREATED, newTrailer, facilityId);
        }
      }

      emitEvent(EVENTS.APPOINTMENT_UPDATED, updated, updated?.facilityId);
      triggerWebhooks("appointment.updated", updated, updated?.facilityId);
      res.json({ success: true, data: updated });
    } else {
      const userCarrierId = req.user?.carrierId;
      const userRole = req.user?.role;
      const finalCarrierId = rest.carrierId || userCarrierId;
      const newId = `APT-${Date.now()}`;

      const isCarrierCreated = !!finalCarrierId && (userRole === 'carrier' || userRole?.toLowerCase().includes('carrier'));
      const status = isCarrierCreated ? "PendingApproval" : "Scheduled";
      const history = [{ status, timestamp: new Date().toISOString() }];

      const appointment = {
        id: newId,
        facilityId,
        ...rest,
        carrierId: finalCarrierId,
        status,
        history,
        acknowledgementStatus: "Pending",
        acknowledgementTime: null,
        instructionTimestamp: null,
        rejectionReason: null,
      };

      await insert("appointments", appointment);

      // Link trailer if number is provided
      if (rest.trailerNumber) {
        const trailers = await fetchAll("trailers");
        const trailer = trailers.find((t: any) => t.number?.toLowerCase() === rest.trailerNumber.toLowerCase());
        if (trailer) {
          await update("trailers", trailer.id, { currentAppointmentId: newId });
        } else {
          const newTrailerId = `TRL-${Date.now()}`;
          const initialStatus = status === 'Scheduled' || status === 'PendingApproval' ? 'Scheduled' : 'InTransit';
          const newTrailer = {
            id: newTrailerId,
            number: rest.trailerNumber,
            carrierId: finalCarrierId,
            type: rest.trailerType || 'Standard 53ft',
            status: initialStatus,
            currentAppointmentId: newId,
            history: [{ status: initialStatus, timestamp: new Date().toISOString() }]
          };
          await insert("trailers", newTrailer);
          emitEvent(EVENTS.TRAILER_CREATED, newTrailer, facilityId);
        }
      }

      const created = await fetchById("appointments", newId);
      emitEvent(EVENTS.APPOINTMENT_CREATED, created, created.facilityId);
      triggerWebhooks("appointment.created", created, created.facilityId);
      res.status(201).json({ success: true, data: created });
    }
  } catch (error: any) {
    console.error("Save appointment error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Bulk update appointments
router.post("/bulk-update", async (req: AuthenticatedRequest, res) => {
  try {
    const { updates } = req.body;
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;

    if (!facilityId) {
      res.status(400).json({ success: false, error: { message: "Facility context required" } });
      return;
    }

    if (!Array.isArray(updates)) {
      res.status(400).json({ success: false, error: { message: "Updates must be an array" } });
      return;
    }

    const results = [];
    for (const item of updates) {
      const { id, updates: itemUpdates } = item;
      const existing = await fetchById("appointments", id);

      if (existing) {
        const history = [...(existing.history || [])];
        if (itemUpdates.status && itemUpdates.status !== existing.status) {
          history.push({ status: itemUpdates.status, timestamp: new Date().toISOString() });
        }

        await update("appointments", id, { ...itemUpdates, history });
        const updated = await fetchById("appointments", id);

        // Link trailer if number is provided or available
        const bTrailerNumber = itemUpdates.trailerNumber || existing.trailerNumber;
        if (bTrailerNumber) {
          const trailers = await fetchAll("trailers");
          const trailer = trailers.find((t: any) => t.number?.toLowerCase() === bTrailerNumber.toLowerCase());

          const targetStatus = itemUpdates.status || existing.status;
          const initialStatus = targetStatus === 'Scheduled' || targetStatus === 'PendingApproval' ? 'Scheduled' : 'InTransit';

          if (trailer) {
            const trUpdates: any = { currentAppointmentId: id };
            if (targetStatus === 'Scheduled' && trailer.status !== 'Scheduled') {
              trUpdates.status = 'Scheduled';
              trUpdates.history = [...(trailer.history || []), { status: 'Scheduled', timestamp: new Date().toISOString() }];
            }
            await update("trailers", trailer.id, trUpdates);
          } else {
            const newTrailerId = `TRL-${Date.now()}`;
            const newTrailer = {
              id: newTrailerId,
              number: bTrailerNumber,
              carrierId: itemUpdates.carrierId || existing.carrierId,
              type: itemUpdates.trailerType || existing.trailerType || 'Standard 53ft',
              status: initialStatus,
              currentAppointmentId: id,
              history: [{ status: initialStatus, timestamp: new Date().toISOString() }]
            };
            await insert("trailers", newTrailer);
            emitEvent(EVENTS.TRAILER_CREATED, newTrailer, facilityId);
          }
        }

        emitEvent(EVENTS.APPOINTMENT_UPDATED, updated, updated?.facilityId);
        triggerWebhooks("appointment.updated", updated, updated?.facilityId);
        results.push(updated);
      }
    }

    res.json({ success: true, data: results });
  } catch (error: any) {
    console.error("Bulk update appointments error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Search appointments
router.post("/search", async (req: AuthenticatedRequest, res) => {
  try {
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;
    const user = req.user;
    const query = req.body;
    const isCarrier = user?.role === "carrier" || user?.carrierId;

    let appointments = await fetchAll("appointments");

    if (facilityId) {
      appointments = appointments.filter((a: any) => a.facilityId === facilityId);
    }

    if (isCarrier) {
      appointments = appointments.filter((a: any) =>
        a.carrierId && a.carrierId.toLowerCase() === user.carrierId?.toLowerCase()
      );
    }

    if (query && Object.keys(query).length > 0) {
      appointments = appointments.filter((a: any) => {
        return Object.entries(query).every(([key, value]) => {
          if (value === undefined || value === null || value === "") return true;
          const itemValue = a[key];
          if (typeof value === "string" && typeof itemValue === "string") {
            return itemValue.toLowerCase().includes(value.toLowerCase());
          }
          return itemValue === value;
        });
      });
    }

    res.json({ success: true, data: appointments, total: appointments.length });
  } catch (error: any) {
    console.error("Search appointments error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Delete appointment
router.delete("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const existing = await fetchById("appointments", req.params.id);

    if (!existing) {
      res
        .status(404)
        .json({ success: false, error: { message: "Appointment not found" } });
      return;
    }

    // Unlink trailer before deleting
    if (existing.trailerNumber) {
      const trailers = await fetchAll("trailers");
      const trailer = trailers.find((t: any) => t.number?.toLowerCase() === existing.trailerNumber.toLowerCase());
      if (trailer && trailer.currentAppointmentId === req.params.id) {
        await update("trailers", trailer.id, { currentAppointmentId: null });
      }
    }

    await remove("appointments", req.params.id);
    res.json({ success: true, message: "Appointment deleted" });
  } catch (error: any) {
    console.error("Delete appointment error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Cancel appointment
router.post("/:id/cancel", async (req: AuthenticatedRequest, res) => {
  try {
    const existing = await fetchById("appointments", req.params.id);

    if (!existing) {
      res
        .status(404)
        .json({ success: false, error: { message: "Appointment not found" } });
      return;
    }

    const history = [
      ...(existing.history || []),
      {
        status: "Cancelled",
        timestamp: new Date().toISOString(),
      },
    ];

    await update("appointments", req.params.id, {
      status: "Cancelled",
      history,
    });

    // Unlink trailer
    if (existing.trailerNumber) {
      const trailers = await fetchAll("trailers");
      const trailer = trailers.find((t: any) => t.number?.toLowerCase() === existing.trailerNumber.toLowerCase());
      if (trailer && trailer.currentAppointmentId === req.params.id) {
        await update("trailers", trailer.id, { currentAppointmentId: null });
      }
    }
    const updated = await fetchById("appointments", req.params.id);

    emitEvent(EVENTS.APPOINTMENT_CANCELLED, updated, updated?.facilityId);
    triggerWebhooks("appointment.cancelled", updated, updated?.facilityId);

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Cancel appointment error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Check-in appointment
router.post("/:id/checkin", async (req: AuthenticatedRequest, res) => {
  try {
    const { actualTime, dockId } = req.body;
    const appointment = await fetchById("appointments", req.params.id);

    if (!appointment) {
      res
        .status(404)
        .json({ success: false, error: { message: "Appointment not found" } });
      return;
    }

    const finalDockId = dockId || appointment.assignedResourceId;
    if (!finalDockId) {
      res
        .status(400)
        .json({ success: false, error: { message: "No dock assigned" } });
      return;
    }

    // Update appointment status
    const history = [
      ...(appointment.history || []),
      {
        status: "CheckedIn",
        timestamp: actualTime || new Date().toISOString(),
      },
    ];

    // Update appointment's assigned resource if dockId was provided
    const appUpdates: any = { status: "CheckedIn", history };
    if (dockId && dockId !== appointment.assignedResourceId) {
      appUpdates.assignedResourceId = dockId;
      console.log(
        `[CheckIn] Appointment ${req.params.id}: Updating assignedResourceId from ${appointment.assignedResourceId} to ${dockId}`,
      );
    }
    await update("appointments", req.params.id, appUpdates);

    // Update resource (dock) status
    await update("resources", finalDockId, {
      status: "Occupied",
      currentAppId: req.params.id,
    });
    console.log(
      `[CheckIn] Dock ${finalDockId} set to Occupied for appointment ${req.params.id}`,
    );

    // Update trailer status if exists
    if (appointment.trailerNumber) {
      const trailers = await fetchAll("trailers");
      const trailer = trailers.find(
        (t: any) => t.number === appointment.trailerNumber,
      );
      if (trailer) {
        await update("trailers", trailer.id, {
          status: "CheckedIn",
          location: finalDockId,
        });
      }
    }

    const updated = await fetchById("appointments", req.params.id);

    emitEvent(EVENTS.APPOINTMENT_CHECKED_IN, updated, updated?.facilityId);
    triggerWebhooks("appointment.checkedIn", updated, updated?.facilityId);

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Check-in appointment error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Check-out appointment
router.post("/:id/checkout", async (req: AuthenticatedRequest, res) => {
  try {
    const { dockId } = req.body;
    const appointment = await fetchById("appointments", req.params.id);

    if (!appointment) {
      res
        .status(404)
        .json({ success: false, error: { message: "Appointment not found" } });
      return;
    }

    const history = [
      ...(appointment.history || []),
      {
        status: "Completed",
        timestamp: new Date().toISOString(),
      },
    ];
    await update("appointments", req.params.id, {
      status: "Completed",
      history,
    });

    // Determine which dock/resource to release
    const resourceToRelease = dockId || appointment.assignedResourceId;
    console.log(
      `[Checkout] Appointment ${req.params.id}: Releasing resource ${resourceToRelease}`,
    );

    // Update resource (dock) status
    if (resourceToRelease) {
      await update("resources", resourceToRelease, {
        status: "Available",
        currentAppId: null,
        currentTrailerId: null,
      });
      console.log(`[Checkout] Resource ${resourceToRelease} set to Available`);
    }

    // Update trailer status if exists
    if (appointment.trailerNumber) {
      const trailers = await fetchAll("trailers");
      const trailer = trailers.find(
        (t: any) => t.number === appointment.trailerNumber,
      );
      if (trailer) {
        await update("trailers", trailer.id, {
          status: "CheckedOut",
          location: null,
        });
        console.log(
          `[Checkout] Trailer ${trailer.id} status set to CheckedOut`,
        );
      }
    }

    const updated = await fetchById("appointments", req.params.id);

    emitEvent(EVENTS.APPOINTMENT_CHECKED_OUT, updated, updated?.facilityId);
    triggerWebhooks("appointment.checkedOut", updated, updated?.facilityId);

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Check-out appointment error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Delete appointment
router.delete("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const existing = await fetchById("appointments", req.params.id);

    if (!existing) {
      res
        .status(404)
        .json({ success: false, error: { message: "Appointment not found" } });
      return;
    }

    // Unlink trailer before deleting
    if (existing.trailerNumber) {
      const trailers = await fetchAll("trailers");
      const trailer = trailers.find((t: any) => t.number?.toLowerCase() === existing.trailerNumber.toLowerCase());
      if (trailer && trailer.currentAppointmentId === req.params.id) {
        await update("trailers", trailer.id, { currentAppointmentId: null });
      }
    }

    await remove("appointments", req.params.id);
    res.json({ success: true, message: "Appointment deleted" });
  } catch (error: any) {
    console.error("Delete appointment error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
