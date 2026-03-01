"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const socket_1 = require("../services/socket");
const webhooks_1 = require("../services/webhooks");
const router = (0, express_1.Router)();
// Get all carriers (returns all for authenticated users)
router.get('/', async (req, res) => {
    try {
        // Return all carriers to allow user creation with carrier assignment
        const carriers = await (0, db_1.fetchAll)('carriers');
        res.json({ success: true, data: carriers });
    }
    catch (error) {
        console.error('Get carriers error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Get carrier by ID
router.get('/:id', async (req, res) => {
    try {
        const carrier = await (0, db_1.fetchById)('carriers', req.params.id);
        if (!carrier) {
            res.status(404).json({ success: false, error: { message: 'Carrier not found' } });
            return;
        }
        res.json({ success: true, data: carrier });
    }
    catch (error) {
        console.error('Get carrier error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Save carrier (create or update)
router.post('/save', async (req, res) => {
    try {
        const { id, facilityIds, ...rest } = req.body;
        const currentFacilityId = req.headers['x-facility-id'] || req.currentFacilityId;
        let carrierFacilityId;
        if (id) {
            const existing = await (0, db_1.fetchById)('carriers', id);
            if (!existing) {
                res.status(404).json({ success: false, error: { message: 'Carrier not found' } });
                return;
            }
            const updates = { ...rest };
            if (facilityIds && Array.isArray(facilityIds)) {
                updates.facilityId = JSON.stringify(facilityIds);
            }
            await (0, db_1.update)('carriers', id, updates);
            const updated = await (0, db_1.fetchById)('carriers', id);
            let eventFacilityId;
            try {
                const parsed = updated?.facilityId ? JSON.parse(updated.facilityId) : null;
                eventFacilityId = Array.isArray(parsed) ? parsed[0] : (parsed || undefined);
            }
            catch {
                eventFacilityId = updated?.facilityId;
            }
            (0, socket_1.emitEvent)(socket_1.EVENTS.CARRIER_UPDATED, updated, eventFacilityId);
            (0, webhooks_1.triggerWebhooks)('carrier.updated', updated, eventFacilityId);
            res.json({ success: true, data: updated });
        }
        else {
            if (facilityIds && Array.isArray(facilityIds)) {
                carrierFacilityId = JSON.stringify(facilityIds);
            }
            else if (currentFacilityId) {
                carrierFacilityId = currentFacilityId;
            }
            else {
                res.status(400).json({ success: false, error: { message: 'Facility context required' } });
                return;
            }
            const newId = `CAR-${Date.now()}`;
            const carrier = { id: newId, facilityId: carrierFacilityId, ...rest };
            await (0, db_1.insert)('carriers', carrier);
            const created = await (0, db_1.fetchById)('carriers', newId);
            (0, socket_1.emitEvent)(socket_1.EVENTS.CARRIER_CREATED, created, currentFacilityId);
            (0, webhooks_1.triggerWebhooks)('carrier.created', created, currentFacilityId);
            res.status(201).json({ success: true, data: created });
        }
    }
    catch (error) {
        console.error('Save carrier error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Search carriers
router.post('/search', async (req, res) => {
    try {
        const facilityId = req.headers['x-facility-id'] || req.currentFacilityId;
        const query = req.body;
        let carriers = facilityId ? await (0, db_1.fetchByFacility)('carriers', facilityId) : await (0, db_1.fetchAll)('carriers');
        if (query && Object.keys(query).length > 0) {
            carriers = carriers.filter((c) => {
                return Object.entries(query).every(([key, value]) => {
                    if (value === undefined || value === null || value === '')
                        return true;
                    const itemValue = c[key];
                    if (typeof value === 'string' && typeof itemValue === 'string') {
                        return itemValue.toLowerCase().includes(value.toLowerCase());
                    }
                    return itemValue === value;
                });
            });
        }
        res.json({ success: true, data: carriers, total: carriers.length });
    }
    catch (error) {
        console.error('Search carriers error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Delete carrier
router.delete('/:id', async (req, res) => {
    try {
        const existing = await (0, db_1.fetchById)('carriers', req.params.id);
        if (!existing) {
            res.status(404).json({ success: false, error: { message: 'Carrier not found' } });
            return;
        }
        await (0, db_1.remove)('carriers', req.params.id);
        (0, socket_1.emitEvent)(socket_1.EVENTS.CARRIER_DELETED, { id: req.params.id }, existing.facilityId);
        (0, webhooks_1.triggerWebhooks)('carrier.deleted', { id: req.params.id }, existing.facilityId);
        res.json({ success: true, message: 'Carrier deleted' });
    }
    catch (error) {
        console.error('Delete carrier error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
exports.default = router;
