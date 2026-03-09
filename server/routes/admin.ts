import { Router } from 'express';
import { fetchAll, fetchById, fetchByFacility, insert, update, remove, clearTable, transaction } from '../db';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest, CreateUserDTO, UpdateUserDTO, CreateRoleDTO, UpdateRoleDTO, CreateFacilityDTO, UpdateFacilityDTO } from '../types';
import { createClerkClient } from "@clerk/backend";
// Invitation email flow removed

const router = Router();

// Helper to resolve carrierId from carrier name (use carrier name as carrierId)
async function resolveCarrierId(carrierIdOrName: string): Promise<string> {
  if (!carrierIdOrName) return '';

  // If it looks like a CAR- ID, return as-is
  if (carrierIdOrName.startsWith('CAR-')) {
    // Check if carrier exists with this ID
    const carrier = await fetchById('carriers', carrierIdOrName);
    if (carrier) return carrier.name; // Return the name instead of ID
    return carrierIdOrName;
  }

  // Try to find carrier by name
  const carriers = await fetchAll('carriers');
  const carrier = carriers.find((c: any) => c.name.toLowerCase() === carrierIdOrName.toLowerCase());
  if (carrier) return carrier.name;

  // Return as-is if not found
  return carrierIdOrName;
}

// ==================== USERS ====================

// Get all users (admin only)
router.get('/users', async (req: AuthenticatedRequest, res) => {
  try {
    console.log('[Admin] GET /users - Fetching all users');
    const users = await fetchAll('users');
    console.log(`[Admin] GET /users - Found ${users.length} users`);
    const sanitized = users.map((u: any) => ({
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      photoURL: u.photoURL,
      role: u.role,
      assignedFacilities: u.assignedFacilities,
      carrierId: u.carrierId,
      updatedAt: u.updatedAt
    }));
    res.json({ success: true, data: sanitized });
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Get user by ID
router.get('/users/:uid', async (req: AuthenticatedRequest, res) => {
  try {
    const user = await fetchById('users', req.params.uid, 'uid');

    if (!user) {
      res.status(404).json({ success: false, error: { message: 'User not found' } });
      return;
    }

    res.json({
      success: true, data: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: user.role,
        assignedFacilities: user.assignedFacilities,
        carrierId: user.carrierId,
        updatedAt: user.updatedAt
      }
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Save user (create or update)
router.post('/users/save', async (req: AuthenticatedRequest, res) => {
  console.log('[Admin] /users/save request body:', JSON.stringify(req.body));
  try {
    const { uid, password, facilityId: bodyFacilityId, ...rest } = req.body;
    // Resolve facilityId from body first, then headers, then context
    const facilityId = (bodyFacilityId as string) || (req.headers['x-facility-id'] as string) || req.currentFacilityId;

    if (uid) {
      const existing = await fetchById('users', uid, 'uid');
      if (!existing) {
        res.status(404).json({ success: false, error: { message: 'User not found' } });
        return;
      }
      const updates = { ...rest, updatedAt: new Date().toISOString() };
      if (password) updates.password = bcrypt.hashSync(password, 10);
      // Resolve carrierId from carrier name if provided
      if (updates.carrierId) {
        updates.carrierId = await resolveCarrierId(updates.carrierId);
      }
      await update('users', uid, updates, 'uid');
      const updated = await fetchById('users', uid, 'uid');

      // AUTO-LINK: If this user belongs to a Carrier and was just assigned Facilities, link the Carrier to those Facilities directly
      if (updated.carrierId && updated.assignedFacilities && Array.isArray(updated.assignedFacilities)) {
        for (const facId of updated.assignedFacilities) {
          const fac = await fetchById('facilities', facId);
          if (fac) {
            const existingCarriers = fac.allowedCarrierIds || [];
            if (!existingCarriers.includes(updated.carrierId)) {
              await update('facilities', facId, {
                allowedCarrierIds: [...existingCarriers, updated.carrierId]
              });
            }
          }
        }
      }

      res.json({
        success: true, data: {
          uid: updated.uid,
          email: updated.email,
          displayName: updated.displayName,
          photoURL: updated.photoURL,
          role: updated.role,
          assignedFacilities: updated.assignedFacilities,
          carrierId: updated.carrierId
        }
      });
    } else {
      console.log('[Admin] Creating new user. Body:', JSON.stringify(req.body, null, 2));
      const users = await fetchAll('users');
      if (users.some((u: any) => u.email === rest.email)) {
        console.warn('[Admin] Email already registered:', rest.email);
        res.status(400).json({ success: false, error: { message: 'Email already registered' } });
        return;
      }

      // Use the email (lowercase) as the UID to match the auth.ts signup behavior
      let newUid = rest.email.toLowerCase();

      // 1. Create User in Clerk via Backend API
      try {
        const secretKey = process.env.CLERK_SECRET_KEY;
        console.log('[Admin] CLERK_SECRET_KEY present:', !!secretKey);
        if (secretKey) {
          const clerkClient = createClerkClient({ secretKey });
          console.log('[Admin] Calling Clerk createUser for:', rest.email);

          // Generate an alphanumeric username based on firstname.lastname (min 4 chars)
          const fName = (req.body.firstName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const lName = (req.body.lastName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          let baseUsername = [fName, lName].filter(Boolean).join('.') || rest.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
          const username = baseUsername.length >= 4 ? baseUsername : `${baseUsername}${Math.random().toString(36).substring(2, 7)}`;

          const clerkUser = await clerkClient.users.createUser({
            emailAddress: [rest.email],
            username: username,
            firstName: req.body.firstName || '',
            lastName: req.body.lastName || '',
            skipPasswordRequirement: true
          });

          // DO NOT override newUid with clerkUser.id to maintain consistency with auth.ts
          console.log(`[Admin] Successfully created user in Clerk. Clerk ID: ${clerkUser.id}, DB UID: ${newUid}`);
        } else {
          console.warn('[Admin] CLERK_SECRET_KEY missing, skipping Clerk provisioning.');
        }
      } catch (err: any) {
        console.error('[Admin] Failed to create user in Clerk API. Full error:', JSON.stringify(err, null, 2));
        res.status(500).json({ success: false, error: { message: err.errors?.[0]?.longMessage || err.message || 'Failed to provision user in Clerk API' } });
        return;
      }

      // 2. Create User in Turso DB
      console.log('[Admin] Proceeding to Turso DB insertion with uid:', newUid);
      const user = {
        uid: newUid,
        email: rest.email,
        role: rest.role || 'user',
        assignedFacilities: rest.assignedFacilities || [],
        // If creating a carrier user, resolve carrierId from carrier name if needed
        carrierId: rest.carrierId ? await resolveCarrierId(rest.carrierId) : null,
        password: bcrypt.hashSync(Math.random().toString(36).substring(2), 10), // random dummy hash since passwordless
        displayName: rest.displayName || rest.email.split('@')[0],
        updatedAt: new Date().toISOString()
      };

      console.log('[Admin] Preparing to insert user into Turso:', JSON.stringify(user, null, 2));
      await insert('users', user);
      console.log('[Admin] Successfully inserted user into Turso DB.');

      const created = await fetchById('users', newUid, 'uid');
      console.log('[Admin] Created user fetched uid:', created?.uid);
      // AUTO-LINK: If this new user belongs to a Carrier and was assigned Facilities, link the Carrier to those Facilities directly
      if (created.carrierId && created.assignedFacilities && Array.isArray(created.assignedFacilities)) {
        for (const facId of created.assignedFacilities) {
          const fac = await fetchById('facilities', facId);
          if (fac) {
            const existingCarriers = fac.allowedCarrierIds || [];
            if (!existingCarriers.includes(created.carrierId)) {
              await update('facilities', facId, {
                allowedCarrierIds: [...existingCarriers, created.carrierId]
              });
            }
          }
        }
      }

      res.status(201).json({
        success: true, data: {
          uid: created.uid,
          email: created.email,
          displayName: created.displayName,
          role: created.role,
          assignedFacilities: created.assignedFacilities,
          carrierId: created.carrierId
        }
      });
    }
  } catch (error: any) {
    console.error('Save user error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Search users
router.post('/users/search', async (req: AuthenticatedRequest, res) => {
  try {
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;
    const query = req.body;
    let users = facilityId ? await fetchByFacility('users', facilityId) : await fetchAll('users');

    if (query && Object.keys(query).length > 0) {
      users = users.filter((u: any) => {
        return Object.entries(query).every(([key, value]) => {
          if (value === undefined || value === null || value === '') return true;
          const itemValue = u[key];
          if (typeof value === 'string' && typeof itemValue === 'string') {
            return itemValue.toLowerCase().includes(value.toLowerCase());
          }
          return itemValue === value;
        });
      });
    }

    const sanitized = users.map((u: any) => ({
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      photoURL: u.photoURL,
      role: u.role,
      assignedFacilities: u.assignedFacilities,
      carrierId: u.carrierId,
      updatedAt: u.updatedAt
    }));

    res.json({ success: true, data: sanitized, total: sanitized.length });
  } catch (error: any) {
    console.error('Search users error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Delete user
router.delete('/users/:uid', async (req: AuthenticatedRequest, res) => {
  try {
    const existing = await fetchById('users', req.params.uid, 'uid');

    if (!existing) {
      res.status(404).json({ success: false, error: { message: 'User not found' } });
      return;
    }

    await remove('users', req.params.uid, 'uid');
    res.json({ success: true, message: 'User deleted' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ==================== ROLES ====================

// Get all roles
router.get('/roles', async (req: AuthenticatedRequest, res) => {
  try {
    console.log('[Admin] GET /roles - Fetching all roles');
    const roles = await fetchAll('roles');
    console.log(`[Admin] GET /roles - Found ${roles.length} roles`);
    res.json({ success: true, data: roles });
  } catch (error: any) {
    console.error('Get roles error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Get role by ID
router.get('/roles/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const role = await fetchById('roles', req.params.id);

    if (!role) {
      res.status(404).json({ success: false, error: { message: 'Role not found' } });
      return;
    }

    res.json({ success: true, data: role });
  } catch (error: any) {
    console.error('Get role error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Save role (create or update)
router.post('/roles/save', async (req: AuthenticatedRequest, res) => {
  try {
    const { id, isSystem, ...rest } = req.body;
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;

    if (id) {
      const existing = await fetchById('roles', id);
      if (!existing) {
        res.status(404).json({ success: false, error: { message: 'Role not found' } });
        return;
      }
      await update('roles', id, rest);
      const updated = await fetchById('roles', id);
      res.json({ success: true, data: updated });
    } else {
      const newId = `ROLE-${Date.now()}`;
      // Roles are system-wide, removing facilityId from payload to avoid insert error
      const role = { id: newId, ...rest, isSystem: isSystem ? 1 : 0 };
      await insert('roles', role);
      const created = await fetchById('roles', newId);
      res.status(201).json({ success: true, data: created });
    }
  } catch (error: any) {
    console.error('Save role error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Search roles
router.post('/roles/search', async (req: AuthenticatedRequest, res) => {
  try {
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;
    const query = req.body;
    let roles = facilityId ? await fetchByFacility('roles', facilityId) : await fetchAll('roles');

    if (query && Object.keys(query).length > 0) {
      roles = roles.filter((r: any) => {
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

    res.json({ success: true, data: roles, total: roles.length });
  } catch (error: any) {
    console.error('Search roles error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Delete role
router.delete('/roles/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const existing = await fetchById('roles', req.params.id);

    if (!existing) {
      res.status(404).json({ success: false, error: { message: 'Role not found' } });
      return;
    }

    await remove('roles', req.params.id);
    res.json({ success: true, message: 'Role deleted' });
  } catch (error: any) {
    console.error('Delete role error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ==================== FACILITIES ====================

// Get all facilities
router.get('/facilities', async (req: AuthenticatedRequest, res) => {
  try {
    const facilities = await fetchAll('facilities');
    res.json({ success: true, data: facilities });
  } catch (error: any) {
    console.error('Get facilities error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Get facility by ID
router.get('/facilities/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const facility = await fetchById('facilities', req.params.id);

    if (!facility) {
      res.status(404).json({ success: false, error: { message: 'Facility not found' } });
      return;
    }

    res.json({ success: true, data: facility });
  } catch (error: any) {
    console.error('Get facility error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Save facility (create or update)
router.post('/facilities/save', async (req: AuthenticatedRequest, res) => {
  try {
    const { id, ...rest } = req.body;
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;

    if (id) {
      const existing = await fetchById('facilities', id);
      if (!existing) {
        res.status(404).json({ success: false, error: { message: 'Facility not found' } });
        return;
      }
      await update('facilities', id, rest);
      const updated = await fetchById('facilities', id);
      res.json({ success: true, data: updated });
    } else {
      const newId = `FAC-${Date.now()}`;
      const facility = { id: newId, ...rest };
      await insert('facilities', facility);
      const created = await fetchById('facilities', newId);
      res.status(201).json({ success: true, data: created });
    }
  } catch (error: any) {
    console.error('Save facility error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Search facilities
router.post('/facilities/search', async (req: AuthenticatedRequest, res) => {
  try {
    const facilityId = req.headers['x-facility-id'] as string || req.currentFacilityId;
    const query = req.body;
    let facilities = facilityId ? await fetchByFacility('facilities', facilityId) : await fetchAll('facilities');

    if (query && Object.keys(query).length > 0) {
      facilities = facilities.filter((f: any) => {
        return Object.entries(query).every(([key, value]) => {
          if (value === undefined || value === null || value === '') return true;
          const itemValue = f[key];
          if (typeof value === 'string' && typeof itemValue === 'string') {
            return itemValue.toLowerCase().includes(value.toLowerCase());
          }
          return itemValue === value;
        });
      });
    }

    res.json({ success: true, data: facilities, total: facilities.length });
  } catch (error: any) {
    console.error('Search facilities error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Delete facility
router.delete('/facilities/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const existing = await fetchById('facilities', req.params.id);

    if (!existing) {
      res.status(404).json({ success: false, error: { message: 'Facility not found' } });
      return;
    }

    await remove('facilities', req.params.id);
    res.json({ success: true, message: 'Facility deleted' });
  } catch (error: any) {
    console.error('Delete facility error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Factory Reset
router.post('/factory-reset', async (req: AuthenticatedRequest, res) => {
  try {
    const { deleteCarriers, deleteDrivers, deleteResources, deleteTrailerTypes, deleteActivityLogs } = req.body;

    await transaction(async () => {
      // Mandatory transactional data
      await clearTable('appointments');
      await clearTable('trailers');

      // Optional/Related data
      if (deleteActivityLogs) await clearTable('activity_logs');
      if (deleteCarriers) await clearTable('carriers');
      if (deleteDrivers) await clearTable('drivers');
      if (deleteResources) await clearTable('resources');
      if (deleteTrailerTypes) await clearTable('trailer_types');

      // Always clear webhook logs
      await clearTable('webhook_logs');
    });

    res.json({ success: true, message: 'Factory reset completed successfully' });
  } catch (error: any) {
    console.error('Factory reset error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
