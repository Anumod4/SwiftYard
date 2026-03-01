"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// Get all facilities - returns all for authenticated users
router.get("/", async (req, res) => {
    try {
        const facilities = await (0, db_1.fetchAll)("facilities");
        res.json({ success: true, data: facilities });
    }
    catch (error) {
        console.error("Get facilities error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Get facility by ID
router.get("/:id", async (req, res) => {
    try {
        const facility = await (0, db_1.fetchById)("facilities", req.params.id);
        if (!facility) {
            res.status(404).json({ success: false, error: { message: "Facility not found" } });
            return;
        }
        res.json({ success: true, data: facility });
    }
    catch (error) {
        console.error("Get facility error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Save facility (create or update)
router.post("/save", async (req, res) => {
    try {
        const { id, ...rest } = req.body;
        const facilityId = req.headers['x-facility-id'] || req.currentFacilityId;
        if (id) {
            const existing = await (0, db_1.fetchById)("facilities", id);
            if (!existing) {
                res.status(404).json({ success: false, error: { message: "Facility not found" } });
                return;
            }
            await (0, db_1.update)("facilities", id, rest);
            const updated = await (0, db_1.fetchById)("facilities", id);
            res.json({ success: true, data: updated });
        }
        else {
            const newId = `FAC-${Date.now()}`;
            const facility = { id: newId, facilityId, ...rest };
            await (0, db_1.insert)("facilities", facility);
            const created = await (0, db_1.fetchById)("facilities", newId);
            res.status(201).json({ success: true, data: created });
        }
    }
    catch (error) {
        console.error("Save facility error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Search facilities
router.post("/search", async (req, res) => {
    try {
        const facilityId = req.headers['x-facility-id'] || req.currentFacilityId;
        const query = req.body;
        let facilities = facilityId ? await (0, db_1.fetchByFacility)("facilities", facilityId) : await (0, db_1.fetchAll)("facilities");
        if (query && Object.keys(query).length > 0) {
            facilities = facilities.filter((f) => {
                return Object.entries(query).every(([key, value]) => {
                    if (value === undefined || value === null || value === "")
                        return true;
                    const itemValue = f[key];
                    if (typeof value === "string" && typeof itemValue === "string") {
                        return itemValue.toLowerCase().includes(value.toLowerCase());
                    }
                    return itemValue === value;
                });
            });
        }
        res.json({ success: true, data: facilities, total: facilities.length });
    }
    catch (error) {
        console.error("Search facilities error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Delete facility
router.delete("/:id", async (req, res) => {
    try {
        const existing = await (0, db_1.fetchById)("facilities", req.params.id);
        if (!existing) {
            res.status(404).json({ success: false, error: { message: "Facility not found" } });
            return;
        }
        await (0, db_1.remove)("facilities", req.params.id);
        res.json({ success: true, message: "Facility deleted" });
    }
    catch (error) {
        console.error("Delete facility error:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
exports.default = router;
