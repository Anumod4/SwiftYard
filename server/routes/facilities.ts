import { Router } from "express";
import { fetchAll, fetchById, fetchByFacility, insert, update, remove } from "../db";
import { AuthenticatedRequest } from "../types";

const router = Router();

// Get all facilities - returns all for authenticated users
router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const facilities = await fetchAll("facilities");
    res.json({ success: true, data: facilities });
  } catch (error: any) {
    console.error("Get facilities error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Get facility by ID
router.get("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const facility = await fetchById("facilities", req.params.id);
    if (!facility) {
      res.status(404).json({ success: false, error: { message: "Facility not found" } });
      return;
    }
    res.json({ success: true, data: facility });
  } catch (error: any) {
    console.error("Get facility error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Save facility (create or update)
router.post("/save", async (req: AuthenticatedRequest, res) => {
  try {
    const { id, ...rest } = req.body;
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;

    if (id) {
      const existing = await fetchById("facilities", id);
      if (!existing) {
        res.status(404).json({ success: false, error: { message: "Facility not found" } });
        return;
      }
      await update("facilities", id, rest);
      const updated = await fetchById("facilities", id);
      res.json({ success: true, data: updated });
    } else {
      const newId = `FAC-${Date.now()}`;
      const facility = { id: newId, facilityId, ...rest };
      await insert("facilities", facility);
      const created = await fetchById("facilities", newId);
      res.status(201).json({ success: true, data: created });
    }
  } catch (error: any) {
    console.error("Save facility error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Search facilities
router.post("/search", async (req: AuthenticatedRequest, res) => {
  try {
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;
    const query = req.body;
    let facilities = facilityId ? await fetchByFacility("facilities", facilityId) : await fetchAll("facilities");

    if (query && Object.keys(query).length > 0) {
      facilities = facilities.filter((f: any) => {
        return Object.entries(query).every(([key, value]) => {
          if (value === undefined || value === null || value === "") return true;
          const itemValue = f[key];
          if (typeof value === "string" && typeof itemValue === "string") {
            return itemValue.toLowerCase().includes(value.toLowerCase());
          }
          return itemValue === value;
        });
      });
    }

    res.json({ success: true, data: facilities, total: facilities.length });
  } catch (error: any) {
    console.error("Search facilities error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Delete facility
router.delete("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const existing = await fetchById("facilities", req.params.id);
    if (!existing) {
      res.status(404).json({ success: false, error: { message: "Facility not found" } });
      return;
    }
    await remove("facilities", req.params.id);
    res.json({ success: true, message: "Facility deleted" });
  } catch (error: any) {
    console.error("Delete facility error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
