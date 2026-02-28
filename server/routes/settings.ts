import { Router } from 'express';
import { fetchAll, fetchById, fetchByFacility, insert, update, remove } from '../db';
import { AuthenticatedRequest } from '../types';

const router = Router();

// Update settings (PUT)
router.put('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { id, ...rest } = req.body;
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;
    const settingsId = id || facilityId || 'global';
    const newData = rest.data || rest;

    const existing = await fetchById('settings', settingsId);
    
    if (existing) {
      await update('settings', settingsId, { data: JSON.stringify(newData) });
    } else {
      await insert('settings', { id: settingsId, data: JSON.stringify(newData) });
    }

    const updated = await fetchById('settings', settingsId);
    res.json({
      success: true,
      data: updated ? (typeof updated.data === 'string' ? JSON.parse(updated.data) : updated.data) : newData
    });
  } catch (error: any) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Get settings
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;
    const settingsId = facilityId || 'global';

    let settings = await fetchById('settings', settingsId);

    if (facilityId && !settings) {
      const globalSettings = await fetchById('settings', 'global');
      if (globalSettings) {
        settings = globalSettings;
      }
    }

    res.json({
      success: true,
      data: settings ? (typeof settings.data === 'string' ? JSON.parse(settings.data) : settings.data) : {}
    });
  } catch (error: any) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Save settings (create or update)
router.post('/save', async (req: AuthenticatedRequest, res) => {
  try {
    const { id, ...rest } = req.body;
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;
    const settingsId = id || facilityId || 'global';
    const newData = rest.data || rest;

    const existing = await fetchById('settings', settingsId);
    
    if (existing) {
      await update('settings', settingsId, { data: JSON.stringify(newData) });
    } else {
      await insert('settings', { id: settingsId, data: JSON.stringify(newData) });
    }

    const updated = await fetchById('settings', settingsId);
    res.json({
      success: true,
      data: updated ? (typeof updated.data === 'string' ? JSON.parse(updated.data) : updated.data) : newData
    });
  } catch (error: any) {
    console.error('Save settings error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Search settings
router.post('/search', async (req: AuthenticatedRequest, res) => {
  try {
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;
    const query = req.body;
    let settings = facilityId ? await fetchByFacility('settings', facilityId) : await fetchAll('settings');

    if (query && Object.keys(query).length > 0) {
      settings = settings.filter((s: any) => {
        return Object.entries(query).every(([key, value]) => {
          if (value === undefined || value === null || value === '') return true;
          const itemValue = s[key];
          if (typeof value === 'string' && typeof itemValue === 'string') {
            return itemValue.toLowerCase().includes(value.toLowerCase());
          }
          return itemValue === value;
        });
      });
    }

    const parsed = settings.map((s: any) => ({
      ...s,
      data: typeof s.data === 'string' ? JSON.parse(s.data) : s.data
    }));

    res.json({ success: true, data: parsed, total: parsed.length });
  } catch (error: any) {
    console.error('Search settings error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Get all settings (admin only)
router.get('/all/list', async (req: AuthenticatedRequest, res) => {
  try {
    const settings = await fetchAll('settings');
    res.json({ success: true, data: settings });
  } catch (error: any) {
    console.error('Get all settings error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Delete settings
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const existing = await fetchById('settings', req.params.id);
    if (!existing) {
      res.status(404).json({ success: false, error: { message: 'Settings not found' } });
      return;
    }
    await remove('settings', req.params.id);
    res.json({ success: true, message: 'Settings deleted' });
  } catch (error: any) {
    console.error('Delete settings error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
