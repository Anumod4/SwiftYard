import { Router } from 'express';
import { fetchAll, fetchById, fetchByFacility, insert, update, remove } from '../db';
import { AuthenticatedRequest, CreateTrailerTypeDTO, UpdateTrailerTypeDTO } from '../types';

const router = Router();

// Get all trailer types (filtered by facility context)
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;

    if (!facilityId) {
      const types = await fetchAll('trailer_types');
      res.json({ success: true, data: types });
      return;
    }

    const types = await fetchByFacility('trailer_types', facilityId);
    res.json({ success: true, data: types });
  } catch (error: any) {
    console.error('Get trailer types error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Get trailer type by ID
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const type = await fetchById('trailer_types', req.params.id);

    if (!type) {
      res.status(404).json({ success: false, error: { message: 'Trailer type not found' } });
      return;
    }

    res.json({ success: true, data: type });
  } catch (error: any) {
    console.error('Get trailer type error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Save trailer type (create or update)
router.post('/save', async (req: AuthenticatedRequest, res) => {
  try {
    const { id, ...rest } = req.body;
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;

    if (!facilityId) {
      res.status(400).json({ success: false, error: { message: 'Facility context required' } });
      return;
    }

    if (id) {
      const existing = await fetchById('trailer_types', id);
      if (!existing) {
        res.status(404).json({ success: false, error: { message: 'Trailer type not found' } });
        return;
      }
      await update('trailer_types', id, rest);
      const updated = await fetchById('trailer_types', id);
      res.json({ success: true, data: updated });
    } else {
      const newId = `TT-${Date.now()}`;
      const trailerType = { id: newId, facilityId, ...rest };
      await insert('trailer_types', trailerType);
      const created = await fetchById('trailer_types', newId);
      res.status(201).json({ success: true, data: created });
    }
  } catch (error: any) {
    console.error('Save trailer type error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Search trailer types
router.post('/search', async (req: AuthenticatedRequest, res) => {
  try {
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;
    const query = req.body;

    let types = facilityId ? await fetchByFacility('trailer_types', facilityId) : await fetchAll('trailer_types');

    if (query && Object.keys(query).length > 0) {
      types = types.filter((t: any) => {
        return Object.entries(query).every(([key, value]) => {
          if (value === undefined || value === null || value === '') return true;
          const itemValue = t[key];
          if (typeof value === 'string' && typeof itemValue === 'string') {
            return itemValue.toLowerCase().includes(value.toLowerCase());
          }
          return itemValue === value;
        });
      });
    }

    res.json({ success: true, data: types, total: types.length });
  } catch (error: any) {
    console.error('Search trailer types error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Delete trailer type
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const existing = await fetchById('trailer_types', req.params.id);

    if (!existing) {
      res.status(404).json({ success: false, error: { message: 'Trailer type not found' } });
      return;
    }

    await remove('trailer_types', req.params.id);
    res.json({ success: true, message: 'Trailer type deleted' });
  } catch (error: any) {
    console.error('Delete trailer type error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
