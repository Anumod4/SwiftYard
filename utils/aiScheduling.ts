import { Appointment, Resource, Trailer } from '../types';

export type PriorityAttribute = 'carrier' | 'trailerType' | 'createdTime' | 'gatedInTime' | 'yardDuration';

export interface AIScheduleConfig {
    targetDate: string; // YYYY-MM-DD
    priorities: PriorityAttribute[];
    appointments: Appointment[];
    docks: Resource[];
    trailers: Trailer[];
}

export function generateAISchedule(config: AIScheduleConfig): { id: string; updates: Partial<Appointment> }[] {
    const { targetDate, priorities, appointments, docks, trailers } = config;

    // 1. Filter eligible appointments for the target date
    const targetStart = new Date(targetDate);
    targetStart.setHours(0, 0, 0, 0);
    const targetEnd = new Date(targetDate);
    targetEnd.setHours(23, 59, 59, 999);

    const eligibleAppts = appointments.filter(a => {
        // Only schedule PendingApproval or Scheduled
        if (!['PendingApproval', 'Scheduled'].includes(a.status)) return false;

        // Check if appointment is on the target date
        const apptTime = new Date(a.startTime);
        return apptTime >= targetStart && apptTime <= targetEnd;
    });

    // 2. Sort eligible appointments based on priority sequence
    const sortedAppts = [...eligibleAppts].sort((a, b) => {
        for (const attr of priorities) {
            if (attr === 'carrier') {
                const cA = a.carrierId || '';
                const cB = b.carrierId || '';
                if (cA !== cB) return cA.localeCompare(cB); // simple alphabetic grouping for carrier
            } else if (attr === 'trailerType') {
                const tA = a.trailerType || '';
                const tB = b.trailerType || '';
                if (tA !== tB) return tA.localeCompare(tB);
            } else if (attr === 'createdTime') {
                // Fallback to id parsing for createdTime
                const timeA = parseInt(a.id.replace('APT-', ''), 10) || 0;
                const timeB = parseInt(b.id.replace('APT-', ''), 10) || 0;
                if (timeA !== timeB) return timeA - timeB;
            } else if (attr === 'gatedInTime' || attr === 'yardDuration') {
                // Find associated trailers
                const trA = trailers.find(t => t.number === a.trailerNumber);
                const trB = trailers.find(t => t.number === b.trailerNumber);

                const gateInA = trA?.history?.find(h => h.status === 'GatedIn')?.timestamp;
                const gateInB = trB?.history?.find(h => h.status === 'GatedIn')?.timestamp;

                const timeA = gateInA ? new Date(gateInA).getTime() : Infinity;
                const timeB = gateInB ? new Date(gateInB).getTime() : Infinity;

                if (timeA !== timeB) return timeA - timeB; // earlier gated in first
            }
        }
        return 0; // If all priorities match, keep original order
    });

    // 3. Assign to available dock slots prioritizing time over location
    // We need to keep a rolling schedule of availability for each dock.
    // We'll initialize each dock's available time starting at targetStart (e.g., 08:00 AM if we have working hours, or 00:00).
    // Let's assume scheduling starts at 08:00 AM for simplicity, or we can use targetStart with 00:00.
    const scheduleStart = new Date(targetStart);
    scheduleStart.setHours(8, 0, 0, 0); // Start at 8 AM 

    // Tracking when each dock is next available
    const dockAvailability = docks.map(d => ({
        dockId: d.id,
        nextAvailableTime: scheduleStart.getTime()
    }));

    const updates: { id: string; updates: Partial<Appointment> }[] = [];

    for (const appt of sortedAppts) {
        // Find the dock that is available earliest
        dockAvailability.sort((a, b) => a.nextAvailableTime - b.nextAvailableTime);

        const selectedDock = dockAvailability[0];
        const assignTime = new Date(selectedDock.nextAvailableTime);

        // Default duration to 30 mins if not provided
        const durationMs = (appt.durationMinutes || 30) * 60000;

        // Add to updates list
        updates.push({
            id: appt.id,
            updates: {
                startTime: assignTime.toISOString(),
                assignedResourceId: selectedDock.dockId,
                status: 'Scheduled' // Ensure it's marked as Scheduled
            }
        });

        // Update the dock's availability
        selectedDock.nextAvailableTime += durationMs;
    }

    return updates;
}
