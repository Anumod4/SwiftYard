"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// Update settings (PUT)
router.put('/', async (req, res) => {
    try {
        const { id, ...rest } = req.body;
        const facilityId = req.headers['x-facility-id'] || req.currentFacilityId;
        const settingsId = id || facilityId || 'global';
        const newData = rest.data || rest;
        const existing = await (0, db_1.fetchById)('settings', settingsId);
        if (existing) {
            await (0, db_1.update)('settings', settingsId, { data: JSON.stringify(newData) });
        }
        else {
            await (0, db_1.insert)('settings', { id: settingsId, data: JSON.stringify(newData) });
        }
        const updated = await (0, db_1.fetchById)('settings', settingsId);
        res.json({
            success: true,
            data: updated ? (typeof updated.data === 'string' ? JSON.parse(updated.data) : updated.data) : newData
        });
    }
    catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Get settings
router.get('/', async (req, res) => {
    try {
        const facilityId = req.headers['x-facility-id'] || req.currentFacilityId;
        const settingsId = facilityId || 'global';
        let settings = await (0, db_1.fetchById)('settings', settingsId);
        if (facilityId && !settings) {
            const globalSettings = await (0, db_1.fetchById)('settings', 'global');
            if (globalSettings) {
                settings = globalSettings;
            }
        }
        res.json({
            success: true,
            data: settings ? (typeof settings.data === 'string' ? JSON.parse(settings.data) : settings.data) : {}
        });
    }
    catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Save settings (create or update)
router.post('/save', async (req, res) => {
    try {
        const { id, ...rest } = req.body;
        const facilityId = req.headers['x-facility-id'] || req.currentFacilityId;
        const settingsId = id || facilityId || 'global';
        const newData = rest.data || rest;
        const existing = await (0, db_1.fetchById)('settings', settingsId);
        if (existing) {
            await (0, db_1.update)('settings', settingsId, { data: JSON.stringify(newData) });
        }
        else {
            await (0, db_1.insert)('settings', { id: settingsId, data: JSON.stringify(newData) });
        }
        const updated = await (0, db_1.fetchById)('settings', settingsId);
        res.json({
            success: true,
            data: updated ? (typeof updated.data === 'string' ? JSON.parse(updated.data) : updated.data) : newData
        });
    }
    catch (error) {
        console.error('Save settings error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Search settings
router.post('/search', async (req, res) => {
    try {
        const facilityId = req.headers['x-facility-id'] || req.currentFacilityId;
        const query = req.body;
        let settings = facilityId ? await (0, db_1.fetchByFacility)('settings', facilityId) : await (0, db_1.fetchAll)('settings');
        if (query && Object.keys(query).length > 0) {
            settings = settings.filter((s) => {
                return Object.entries(query).every(([key, value]) => {
                    if (value === undefined || value === null || value === '')
                        return true;
                    const itemValue = s[key];
                    if (typeof value === 'string' && typeof itemValue === 'string') {
                        return itemValue.toLowerCase().includes(value.toLowerCase());
                    }
                    return itemValue === value;
                });
            });
        }
        const parsed = settings.map((s) => ({
            ...s,
            data: typeof s.data === 'string' ? JSON.parse(s.data) : s.data
        }));
        res.json({ success: true, data: parsed, total: parsed.length });
    }
    catch (error) {
        console.error('Search settings error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Get all settings (admin only)
router.get('/all/list', async (req, res) => {
    try {
        const settings = await (0, db_1.fetchAll)('settings');
        res.json({ success: true, data: settings });
    }
    catch (error) {
        console.error('Get all settings error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
// Delete settings
router.delete('/:id', async (req, res) => {
    try {
        const existing = await (0, db_1.fetchById)('settings', req.params.id);
        if (!existing) {
            res.status(404).json({ success: false, error: { message: 'Settings not found' } });
            return;
        }
        await (0, db_1.remove)('settings', req.params.id);
        res.json({ success: true, message: 'Settings deleted' });
    }
    catch (error) {
        console.error('Delete settings error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});
exports.default = router;
