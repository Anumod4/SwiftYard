"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// Get all trailer types (filtered by facility context)
router.get('/', async (req, res) => {
    try {
        const facilityId = req.headers['x-facility-id'] || req.currentFacilityId;
        if (!facilityId) {
            const types = await (0, db_1.fetchAll)('trailer_types');
            res.json({ success: true, data: types });
            return;
        }
        const types = await (0, db_1.fetchByFacility)('trailer_types', facilityId);
        res.json({ success: true, data: types });
    }
    catch (error) {
        console.error('Get trailer types error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Get trailer type by ID
router.get('/:id', async (req, res) => {
    try {
        const type = await (0, db_1.fetchById)('trailer_types', req.params.id);
        if (!type) {
            res.status(404).json({ success: false, error: { message: 'Trailer type not found' } });
            return;
        }
        res.json({ success: true, data: type });
    }
    catch (error) {
        console.error('Get trailer type error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Save trailer type (create or update)
router.post('/save', async (req, res) => {
    try {
        const { id, ...rest } = req.body;
        const facilityId = req.headers['x-facility-id'] || req.currentFacilityId;
        if (!facilityId) {
            res.status(400).json({ success: false, error: { message: 'Facility context required' } });
            return;
        }
        if (id) {
            const existing = await (0, db_1.fetchById)('trailer_types', id);
            if (!existing) {
                res.status(404).json({ success: false, error: { message: 'Trailer type not found' } });
                return;
            }
            await (0, db_1.update)('trailer_types', id, rest);
            const updated = await (0, db_1.fetchById)('trailer_types', id);
            res.json({ success: true, data: updated });
        }
        else {
            const newId = `TT-${Date.now()}`;
            const trailerType = { id: newId, facilityId, ...rest };
            await (0, db_1.insert)('trailer_types', trailerType);
            const created = await (0, db_1.fetchById)('trailer_types', newId);
            res.status(201).json({ success: true, data: created });
        }
    }
    catch (error) {
        console.error('Save trailer type error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Search trailer types
router.post('/search', async (req, res) => {
    try {
        const facilityId = req.headers['x-facility-id'] || req.currentFacilityId;
        const query = req.body;
        let types = facilityId ? await (0, db_1.fetchByFacility)('trailer_types', facilityId) : await (0, db_1.fetchAll)('trailer_types');
        if (query && Object.keys(query).length > 0) {
            types = types.filter((t) => {
                return Object.entries(query).every(([key, value]) => {
                    if (value === undefined || value === null || value === '')
                        return true;
                    const itemValue = t[key];
                    if (typeof value === 'string' && typeof itemValue === 'string') {
                        return itemValue.toLowerCase().includes(value.toLowerCase());
                    }
                    return itemValue === value;
                });
            });
        }
        res.json({ success: true, data: types, total: types.length });
    }
    catch (error) {
        console.error('Search trailer types error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Delete trailer type
router.delete('/:id', async (req, res) => {
    try {
        const existing = await (0, db_1.fetchById)('trailer_types', req.params.id);
        if (!existing) {
            res.status(404).json({ success: false, error: { message: 'Trailer type not found' } });
            return;
        }
        await (0, db_1.remove)('trailer_types', req.params.id);
        res.json({ success: true, message: 'Trailer type deleted' });
    }
    catch (error) {
        console.error('Delete trailer type error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
exports.default = router;
