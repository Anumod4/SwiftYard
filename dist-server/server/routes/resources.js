"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const socket_1 = require("../services/socket");
const webhooks_1 = require("../services/webhooks");
const router = (0, express_1.Router)();
// Get all resources (filtered by facility context)
router.get('/', async (req, res) => {
    try {
        const facilityId = req.headers['x-facility-id'] || req.currentFacilityId;
        if (!facilityId) {
            const resources = await (0, db_1.fetchAll)('resources');
            res.json({ success: true, data: resources });
            return;
        }
        const resources = await (0, db_1.fetchByFacility)('resources', facilityId);
        res.json({ success: true, data: resources });
    }
    catch (error) {
        console.error('Get resources error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Get resource by ID
router.get('/:id', async (req, res) => {
    try {
        const resource = await (0, db_1.fetchById)('resources', req.params.id);
        if (!resource) {
            res.status(404).json({ success: false, error: { message: 'Resource not found' } });
            return;
        }
        res.json({ success: true, data: resource });
    }
    catch (error) {
        console.error('Get resource error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Save resource (create or update)
router.post('/save', async (req, res) => {
    try {
        const { id, ...rest } = req.body;
        const facilityId = req.headers['x-facility-id'] || req.currentFacilityId;
        if (!facilityId) {
            res.status(400).json({ success: false, error: { message: 'Facility context required' } });
            return;
        }
        if (id) {
            const existing = await (0, db_1.fetchById)('resources', id);
            if (!existing) {
                res.status(404).json({ success: false, error: { message: 'Resource not found' } });
                return;
            }
            await (0, db_1.update)('resources', id, rest);
            const updated = await (0, db_1.fetchById)('resources', id);
            (0, socket_1.emitEvent)(socket_1.EVENTS.RESOURCE_UPDATED, updated, updated?.facilityId);
            (0, webhooks_1.triggerWebhooks)('resource.updated', updated, updated?.facilityId);
            res.json({ success: true, data: updated });
        }
        else {
            const newId = rest.name.trim(); // Use name as ID
            const existing = await (0, db_1.fetchById)('resources', newId);
            if (existing) {
                res.status(400).json({ success: false, error: { message: `Resource with name "${newId}" already exists` } });
                return;
            }
            const resource = {
                id: newId,
                facilityId,
                ...rest,
                allowedTrailerTypes: rest.allowedTrailerTypes || [],
                allowedCarrierIds: rest.allowedCarrierIds || [],
                currentAppId: null,
                currentTrailerId: null,
                unavailability: [],
            };
            await (0, db_1.insert)('resources', resource);
            const created = await (0, db_1.fetchById)('resources', newId);
            (0, socket_1.emitEvent)(socket_1.EVENTS.RESOURCE_CREATED, created, created.facilityId);
            (0, webhooks_1.triggerWebhooks)('resource.created', created, created.facilityId);
            res.status(201).json({ success: true, data: created });
        }
    }
    catch (error) {
        console.error('Save resource error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Search resources
router.post('/search', async (req, res) => {
    try {
        const facilityId = req.headers['x-facility-id'] || req.currentFacilityId;
        const query = req.body;
        let resources = facilityId ? await (0, db_1.fetchByFacility)('resources', facilityId) : await (0, db_1.fetchAll)('resources');
        if (query && Object.keys(query).length > 0) {
            resources = resources.filter((r) => {
                return Object.entries(query).every(([key, value]) => {
                    if (value === undefined || value === null || value === '')
                        return true;
                    const itemValue = r[key];
                    if (typeof value === 'string' && typeof itemValue === 'string') {
                        return itemValue.toLowerCase().includes(value.toLowerCase());
                    }
                    return itemValue === value;
                });
            });
        }
        res.json({ success: true, data: resources, total: resources.length });
    }
    catch (error) {
        console.error('Search resources error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Delete resource
router.delete('/:id', async (req, res) => {
    try {
        const existing = await (0, db_1.fetchById)('resources', req.params.id);
        if (!existing) {
            res.status(404).json({ success: false, error: { message: 'Resource not found' } });
            return;
        }
        await (0, db_1.remove)('resources', req.params.id);
        (0, socket_1.emitEvent)(socket_1.EVENTS.RESOURCE_UPDATED, { id: req.params.id }, existing.facilityId);
        (0, webhooks_1.triggerWebhooks)('resource.updated', { id: req.params.id }, existing.facilityId);
        res.json({ success: true, message: 'Resource deleted' });
    }
    catch (error) {
        console.error('Delete resource error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Force clear resource
router.post('/:id/clear', async (req, res) => {
    try {
        const existing = await (0, db_1.fetchById)('resources', req.params.id);
        if (!existing) {
            res.status(404).json({ success: false, error: { message: 'Resource not found' } });
            return;
        }
        await (0, db_1.update)('resources', req.params.id, {
            status: 'Available',
            currentAppId: null,
            currentTrailerId: null
        });
        const updated = await (0, db_1.fetchById)('resources', req.params.id);
        (0, socket_1.emitEvent)(socket_1.EVENTS.RESOURCE_CLEARED, updated, updated?.facilityId);
        (0, webhooks_1.triggerWebhooks)('resource.cleared', updated, updated?.facilityId);
        res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error('Clear resource error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
exports.default = router;
