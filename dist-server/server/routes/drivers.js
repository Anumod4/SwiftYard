"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const socket_1 = require("../services/socket");
const webhooks_1 = require("../services/webhooks");
const router = (0, express_1.Router)();
// Helper to resolve carrierId from carrier name (use carrier name as carrierId)
async function resolveDriverCarrierId(carrierIdOrName) {
    if (!carrierIdOrName)
        return '';
    // If it's already a name (not starting with CAR-), return as-is
    if (!carrierIdOrName.startsWith('CAR-')) {
        return carrierIdOrName;
    }
    // If it looks like a CAR- ID, find the carrier and return its name
    const carriers = await (0, db_1.fetchAll)('carriers');
    const carrier = carriers.find((c) => c.id === carrierIdOrName);
    if (carrier)
        return carrier.name;
    return carrierIdOrName;
}
// Get all drivers (filtered by facility context)
router.get('/', async (req, res) => {
    try {
        const facilityId = req.headers['x-facility-id'] || req.currentFacilityId;
        if (!facilityId) {
            const drivers = await (0, db_1.fetchAll)('drivers');
            res.json({ success: true, data: drivers });
            return;
        }
        const drivers = await (0, db_1.fetchByFacility)('drivers', facilityId);
        res.json({ success: true, data: drivers });
    }
    catch (error) {
        console.error('Get drivers error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Get driver by ID
router.get('/:id', async (req, res) => {
    try {
        const driver = await (0, db_1.fetchById)('drivers', req.params.id);
        if (!driver) {
            res.status(404).json({ success: false, error: { message: 'Driver not found' } });
            return;
        }
        res.json({ success: true, data: driver });
    }
    catch (error) {
        console.error('Get driver error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Save driver (create or update)
router.post('/save', async (req, res) => {
    try {
        const { id, ...rest } = req.body;
        const facilityId = req.headers['x-facility-id'] || req.currentFacilityId;
        if (!facilityId) {
            res.status(400).json({ success: false, error: { message: 'Facility context required' } });
            return;
        }
        // Resolve carrierId to carrier name if needed
        let resolvedCarrierId = rest.carrierId;
        if (resolvedCarrierId) {
            resolvedCarrierId = await resolveDriverCarrierId(resolvedCarrierId);
        }
        if (id) {
            const existing = await (0, db_1.fetchById)('drivers', id);
            if (!existing) {
                res.status(404).json({ success: false, error: { message: 'Driver not found' } });
                return;
            }
            await (0, db_1.update)('drivers', id, { ...rest, carrierId: resolvedCarrierId });
            const updated = await (0, db_1.fetchById)('drivers', id);
            (0, socket_1.emitEvent)(socket_1.EVENTS.DRIVER_UPDATED, updated, updated?.facilityId);
            (0, webhooks_1.triggerWebhooks)('driver.updated', updated, updated?.facilityId);
            res.json({ success: true, data: updated });
        }
        else {
            const newId = `DRV-${Date.now()}`;
            const driver = { id: newId, facilityId, ...rest, carrierId: resolvedCarrierId };
            await (0, db_1.insert)('drivers', driver);
            await (0, db_1.insert)('drivers', driver);
            const created = await (0, db_1.fetchById)('drivers', newId);
            (0, socket_1.emitEvent)(socket_1.EVENTS.DRIVER_CREATED, created, created.facilityId);
            (0, webhooks_1.triggerWebhooks)('driver.created', created, created.facilityId);
            res.status(201).json({ success: true, data: created });
        }
    }
    catch (error) {
        console.error('Save driver error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Search drivers
router.post('/search', async (req, res) => {
    try {
        const facilityId = req.headers['x-facility-id'] || req.currentFacilityId;
        const query = req.body;
        let drivers = facilityId ? await (0, db_1.fetchByFacility)('drivers', facilityId) : await (0, db_1.fetchAll)('drivers');
        if (query && Object.keys(query).length > 0) {
            drivers = drivers.filter((d) => {
                return Object.entries(query).every(([key, value]) => {
                    if (value === undefined || value === null || value === '')
                        return true;
                    const itemValue = d[key];
                    if (typeof value === 'string' && typeof itemValue === 'string') {
                        return itemValue.toLowerCase().includes(value.toLowerCase());
                    }
                    return itemValue === value;
                });
            });
        }
        res.json({ success: true, data: drivers, total: drivers.length });
    }
    catch (error) {
        console.error('Search drivers error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Delete driver
router.delete('/:id', async (req, res) => {
    try {
        const existing = await (0, db_1.fetchById)('drivers', req.params.id);
        if (!existing) {
            res.status(404).json({ success: false, error: { message: 'Driver not found' } });
            return;
        }
        await (0, db_1.remove)('drivers', req.params.id);
        (0, socket_1.emitEvent)(socket_1.EVENTS.DRIVER_DELETED, { id: req.params.id }, existing.facilityId);
        (0, webhooks_1.triggerWebhooks)('driver.deleted', { id: req.params.id }, existing.facilityId);
        res.json({ success: true, message: 'Driver deleted' });
    }
    catch (error) {
        console.error('Delete driver error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
exports.default = router;
