import { Router } from 'express';
import { fetchAll, fetchById, fetchByFacility, insert, update, remove } from '../db';
import { AuthenticatedRequest, CreateCarrierDTO, UpdateCarrierDTO } from '../types';
import { emitEvent, EVENTS } from '../services/socket';
import { triggerWebhooks } from '../services/webhooks';

const router = Router();

// Get all carriers (returns all for authenticated users)
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    // Return all carriers to allow user creation with carrier assignment
    const carriers = await fetchAll('carriers');
    res.json({ success: true, data: carriers });
  } catch (error: any) {
    console.error('Get carriers error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Get carrier by ID
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const carrier = await fetchById('carriers', req.params.id);

    if (!carrier) {
      res.status(404).json({ success: false, error: { message: 'Carrier not found' } });
      return;
    }

    res.json({ success: true, data: carrier });
  } catch (error: any) {
    console.error('Get carrier error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Save carrier (create or update)
router.post('/save', async (req: AuthenticatedRequest, res) => {
  try {
    const { id, facilityIds, ...rest } = req.body;
    const currentFacilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;

    let carrierFacilityId: string | string[];

    if (id) {
      const existing = await fetchById('carriers', id);
      if (!existing) {
        res.status(404).json({ success: false, error: { message: 'Carrier not found' } });
        return;
      }
      const updates: any = { ...rest };
      if (facilityIds && Array.isArray(facilityIds)) {
        updates.facilityId = JSON.stringify(facilityIds);
      }
      await update('carriers', id, updates);
      const updated = await fetchById('carriers', id);
      let eventFacilityId: string | undefined;
      try {
        const parsed = updated?.facilityId ? JSON.parse(updated.facilityId) : null;
        eventFacilityId = Array.isArray(parsed) ? parsed[0] : (parsed || undefined);
      } catch {
        eventFacilityId = updated?.facilityId;
      }
      emitEvent(EVENTS.CARRIER_UPDATED, updated, eventFacilityId);
      triggerWebhooks('carrier.updated', updated, eventFacilityId);
      res.json({ success: true, data: updated });
    } else {
      if (facilityIds && Array.isArray(facilityIds)) {
        carrierFacilityId = JSON.stringify(facilityIds);
      } else if (currentFacilityId) {
        carrierFacilityId = currentFacilityId;
      } else {
        res.status(400).json({ success: false, error: { message: 'Facility context required' } });
        return;
      }

      const newId = `CAR-${Date.now()}`;
      const carrier = { id: newId, facilityId: carrierFacilityId, ...rest };
      await insert('carriers', carrier);
      const created = await fetchById('carriers', newId);
      emitEvent(EVENTS.CARRIER_CREATED, created, currentFacilityId);
      triggerWebhooks('carrier.created', created, currentFacilityId);
      res.status(201).json({ success: true, data: created });
    }
  } catch (error: any) {
    console.error('Save carrier error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Search carriers
router.post('/search', async (req: AuthenticatedRequest, res) => {
  try {
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;
    const query = req.body;

    let carriers = facilityId ? await fetchByFacility('carriers', facilityId) : await fetchAll('carriers');

    if (query && Object.keys(query).length > 0) {
      carriers = carriers.filter((c: any) => {
        return Object.entries(query).every(([key, value]) => {
          if (value === undefined || value === null || value === '') return true;
          const itemValue = c[key];
          if (typeof value === 'string' && typeof itemValue === 'string') {
            return itemValue.toLowerCase().includes(value.toLowerCase());
          }
          return itemValue === value;
        });
      });
    }

    res.json({ success: true, data: carriers, total: carriers.length });
  } catch (error: any) {
    console.error('Search carriers error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Delete carrier
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const existing = await fetchById('carriers', req.params.id);

    if (!existing) {
      res.status(404).json({ success: false, error: { message: 'Carrier not found' } });
      return;
    }

    await remove('carriers', req.params.id);

    emitEvent(EVENTS.CARRIER_DELETED, { id: req.params.id }, existing.facilityId);
    triggerWebhooks('carrier.deleted', { id: req.params.id }, existing.facilityId);

    res.json({ success: true, message: 'Carrier deleted' });
  } catch (error: any) {
    console.error('Delete carrier error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
