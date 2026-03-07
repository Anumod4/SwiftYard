
import { Router } from 'express';
import { turso } from '../../turso';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from '../types';

const router = Router();

// Get all activities
router.get('/', async (req: AuthenticatedRequest, res) => {
    try {
        const { facilityId } = req.query;
        let query = "SELECT * FROM activity_logs";
        const args: any[] = [];

        if (facilityId && facilityId !== 'null') {
            query += " WHERE facilityId = ?";
            args.push(facilityId);
        }

        query += " ORDER BY timestamp DESC LIMIT 1000";

        const result = await turso.execute({
            sql: query,
            args: args
        });

        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        console.error("Failed to fetch activities:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Log an activity
router.post('/log', async (req: AuthenticatedRequest, res) => {
    try {
        const activity = req.body;
        const id = uuidv4();

        await turso.execute({
            sql: `
                INSERT INTO activity_logs (
                    id, timestamp, action, userEmail, userName, userRole, userId,
                    appointmentId, trailerId, carrierName, driverName, locationName,
                    details, facilityId
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
                id,
                activity.timestamp || new Date().toISOString(),
                activity.action,
                activity.userEmail || null,
                activity.userName || null,
                activity.userRole || null,
                activity.userId || null,
                activity.appointmentId || null,
                activity.trailerId || null,
                activity.carrierName || null,
                activity.driverName || null,
                activity.locationName || null,
                activity.details || null,
                activity.facilityId || null
            ]
        });

        res.json({ success: true, data: { ...activity, id } });
    } catch (error: any) {
        console.error("Failed to log activity:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

export default router;
