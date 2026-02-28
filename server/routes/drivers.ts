import { Router } from 'express';
import { fetchAll, fetchById, fetchByFacility, insert, update, remove } from '../db';
import { AuthenticatedRequest, CreateDriverDTO, UpdateDriverDTO } from '../types';
import { emitEvent, EVENTS } from '../services/socket';
import { triggerWebhooks } from '../services/webhooks';

const router = Router();

// Helper to resolve carrierId from carrier name (use carrier name as carrierId)
async function resolveDriverCarrierId(carrierIdOrName: string): Promise<string> {
  if (!carrierIdOrName) return '';
  
  // If it's already a name (not starting with CAR-), return as-is
  if (!carrierIdOrName.startsWith('CAR-')) {
    return carrierIdOrName;
  }
  
  // If it looks like a CAR- ID, find the carrier and return its name
  const carriers = await fetchAll('carriers');
  const carrier = carriers.find((c: any) => c.id === carrierIdOrName);
  if (carrier) return carrier.name;
  
  return carrierIdOrName;
}

// Get all drivers (filtered by facility context)
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;

    if (!facilityId) {
      const drivers = await fetchAll('drivers');
      res.json({ success: true, data: drivers });
      return;
    }

    const drivers = await fetchByFacility('drivers', facilityId);
    res.json({ success: true, data: drivers });
  } catch (error: any) {
    console.error('Get drivers error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Get driver by ID
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const driver = await fetchById('drivers', req.params.id);

    if (!driver) {
      res.status(404).json({ success: false, error: { message: 'Driver not found' } });
      return;
    }

    res.json({ success: true, data: driver });
  } catch (error: any) {
    console.error('Get driver error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Save driver (create or update)
router.post('/save', async (req: AuthenticatedRequest, res) => {
  try {
    const { id, ...rest } = req.body;
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;

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
      const existing = await fetchById('drivers', id);
      if (!existing) {
        res.status(404).json({ success: false, error: { message: 'Driver not found' } });
        return;
      }
      await update('drivers', id, { ...rest, carrierId: resolvedCarrierId });
      const updated = await fetchById('drivers', id);
      emitEvent(EVENTS.DRIVER_UPDATED, updated, updated?.facilityId);
      triggerWebhooks('driver.updated', updated, updated?.facilityId);
      res.json({ success: true, data: updated });
    } else {
      const newId = `DRV-${Date.now()}`;
      const driver = { id: newId, facilityId, ...rest, carrierId: resolvedCarrierId };
      await insert('drivers', driver);
      await insert('drivers', driver);
      const created = await fetchById('drivers', newId);
      emitEvent(EVENTS.DRIVER_CREATED, created, created.facilityId);
      triggerWebhooks('driver.created', created, created.facilityId);
      res.status(201).json({ success: true, data: created });
    }
  } catch (error: any) {
    console.error('Save driver error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Search drivers
router.post('/search', async (req: AuthenticatedRequest, res) => {
  try {
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;
    const query = req.body;

    let drivers = facilityId ? await fetchByFacility('drivers', facilityId) : await fetchAll('drivers');

    if (query && Object.keys(query).length > 0) {
      drivers = drivers.filter((d: any) => {
        return Object.entries(query).every(([key, value]) => {
          if (value === undefined || value === null || value === '') return true;
          const itemValue = d[key];
          if (typeof value === 'string' && typeof itemValue === 'string') {
            return itemValue.toLowerCase().includes(value.toLowerCase());
          }
          return itemValue === value;
        });
      });
    }

    res.json({ success: true, data: drivers, total: drivers.length });
  } catch (error: any) {
    console.error('Search drivers error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Delete driver
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const existing = await fetchById('drivers', req.params.id);

    if (!existing) {
      res.status(404).json({ success: false, error: { message: 'Driver not found' } });
      return;
    }

    await remove('drivers', req.params.id);

    emitEvent(EVENTS.DRIVER_DELETED, { id: req.params.id }, existing.facilityId);
    triggerWebhooks('driver.deleted', { id: req.params.id }, existing.facilityId);

    res.json({ success: true, message: 'Driver deleted' });
  } catch (error: any) {
    console.error('Delete driver error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
