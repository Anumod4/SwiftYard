import { Router } from 'express';
import { fetchAll, fetchById, fetchByFacility, insert, update, remove } from '../db';
import { AuthenticatedRequest, CreateResourceDTO, UpdateResourceDTO } from '../types';
import { emitEvent, EVENTS } from '../services/socket';
import { triggerWebhooks } from '../services/webhooks';

const router = Router();

// Get all resources (filtered by facility context)
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;

    if (!facilityId) {
      const resources = await fetchAll('resources');
      res.json({ success: true, data: resources });
      return;
    }

    const resources = await fetchByFacility('resources', facilityId);
    res.json({ success: true, data: resources });
  } catch (error: any) {
    console.error('Get resources error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Get resource by ID
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const resource = await fetchById('resources', req.params.id);

    if (!resource) {
      res.status(404).json({ success: false, error: { message: 'Resource not found' } });
      return;
    }

    res.json({ success: true, data: resource });
  } catch (error: any) {
    console.error('Get resource error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Save resource (create or update)
router.post('/save', async (req: AuthenticatedRequest, res) => {
  try {
    const { id, ...rest } = req.body;
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;

    if (!facilityId) {
      res.status(400).json({ success: false, error: { message: 'Facility context required' } });
      return;
    }

    if (id) {
      const existing = await fetchById('resources', id);
      if (!existing) {
        res.status(404).json({ success: false, error: { message: 'Resource not found' } });
        return;
      }
      await update('resources', id, rest);
      const updated = await fetchById('resources', id);
      emitEvent(EVENTS.RESOURCE_UPDATED, updated, updated?.facilityId);
      triggerWebhooks('resource.updated', updated, updated?.facilityId);
      res.json({ success: true, data: updated });
    } else {
      const newId = rest.name.trim(); // Use name as ID
      const existing = await fetchById('resources', newId);
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
      await insert('resources', resource);
      const created = await fetchById('resources', newId);
      emitEvent(EVENTS.RESOURCE_CREATED, created, created.facilityId);
      triggerWebhooks('resource.created', created, created.facilityId);
      res.status(201).json({ success: true, data: created });
    }
  } catch (error: any) {
    console.error('Save resource error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Search resources
router.post('/search', async (req: AuthenticatedRequest, res) => {
  try {
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;
    const query = req.body;

    let resources = facilityId ? await fetchByFacility('resources', facilityId) : await fetchAll('resources');

    if (query && Object.keys(query).length > 0) {
      resources = resources.filter((r: any) => {
        return Object.entries(query).every(([key, value]) => {
          if (value === undefined || value === null || value === '') return true;
          const itemValue = r[key];
          if (typeof value === 'string' && typeof itemValue === 'string') {
            return itemValue.toLowerCase().includes(value.toLowerCase());
          }
          return itemValue === value;
        });
      });
    }

    res.json({ success: true, data: resources, total: resources.length });
  } catch (error: any) {
    console.error('Search resources error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Delete resource
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const existing = await fetchById('resources', req.params.id);

    if (!existing) {
      res.status(404).json({ success: false, error: { message: 'Resource not found' } });
      return;
    }

    await remove('resources', req.params.id);

    emitEvent(EVENTS.RESOURCE_UPDATED, { id: req.params.id }, existing.facilityId);
    triggerWebhooks('resource.updated', { id: req.params.id }, existing.facilityId);

    res.json({ success: true, message: 'Resource deleted' });
  } catch (error: any) {
    console.error('Delete resource error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Force clear resource
router.post('/:id/clear', async (req: AuthenticatedRequest, res) => {
  try {
    const existing = await fetchById('resources', req.params.id);

    if (!existing) {
      res.status(404).json({ success: false, error: { message: 'Resource not found' } });
      return;
    }

    await update('resources', req.params.id, {
      status: 'Available',
      currentAppId: null,
      currentTrailerId: null
    });

    const updated = await fetchById('resources', req.params.id);

    emitEvent(EVENTS.RESOURCE_CLEARED, updated, updated?.facilityId);
    triggerWebhooks('resource.cleared', updated, updated?.facilityId);

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Clear resource error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
