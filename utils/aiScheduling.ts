import { Appointment, Resource, Trailer, AppSettings } from '../types';

export type PriorityAttribute = 'carrier' | 'trailerType' | 'createdTime' | 'gatedInTime' | 'yardDuration';

export interface AIScheduleConfig {
    targetDate: string; // YYYY-MM-DD
    priorities: PriorityAttribute[];
    appointments: Appointment[];
    docks: Resource[];
    trailers: Trailer[];
    settings: AppSettings;
}

export function generateAISchedule(config: AIScheduleConfig): { id: string; updates: Partial<Appointment> }[] {
    const { targetDate, priorities, appointments, docks, trailers, settings } = config;

    // 1. Filter eligible appointments for the target date
    const targetStart = new Date(targetDate);
    targetStart.setHours(0, 0, 0, 0);
    const targetEnd = new Date(targetDate);
    targetEnd.setHours(23, 59, 59, 999);

    const eligibleAppts = appointments.filter(a => {
        // Schedule if they are waiting for a dock or just scheduled (already scheduled ones can be moved or reconsidered, but let's re-assign only those without docks or pending assignment)
        // Usually, 'Scheduled', 'GatedIn', 'InYard' are open states waiting for a dock assignment.
        if (!['Scheduled', 'GatedIn', 'InYard'].includes(a.status)) return false;

        // Exclude if it already has an assigned dock and is actively in use
        if (['GatedIn', 'InYard'].includes(a.status) && a.assignedResourceId) {
            // Re-evaluating is okay, but if it has a dock, it might not need one unless we want to reset all. Let's process everything that lacks a dock or is just 'Scheduled'.
            if (a.assignedResourceId) return false;
        }

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
    // Get shift timings for the target date
    const dayName = new Date(targetDate).toLocaleDateString('en-US', { weekday: 'long' });
    const shifts = settings.workingHours?.[dayName] || [];

    // Find earliest shift start
    let minStartMs = targetStart.getTime(); // fallback to 00:00
    if (shifts.length > 0) {
        const sortedShifts = [...shifts].sort((a, b) => a.startTime.localeCompare(b.startTime));
        const [h, m] = sortedShifts[0].startTime.split(':').map(Number);
        const shiftStart = new Date(targetStart);
        shiftStart.setHours(h, m, 0, 0);
        minStartMs = shiftStart.getTime();
    } else {
        // If closed, return empty (already filtered by date, but just in case)
        if (Object.keys(settings.workingHours || {}).length > 0) return [];
    }

    const scheduleStart = new Date(minStartMs);

    // Tracking when each dock is next available
    const dockAvailability = docks.map(d => ({
        dockId: d.id,
        nextAvailableTime: scheduleStart.getTime()
    }));

    const updates: { id: string; updates: Partial<Appointment> }[] = [];

    for (const appt of sortedAppts) {
        // Determine eligibility
        const cId = appt.carrierId;
        const tType = appt.trailerType;

        // Filter docks that match eligibility
        const eligibleDocks = dockAvailability.filter(da => {
            const d = docks.find(r => r.id === da.dockId);
            if (!d) return false;
            if (d.status === 'Unavailable') return false;

            // Check carrier
            if (cId && d.allowedCarrierIds && d.allowedCarrierIds.length > 0) {
                if (!d.allowedCarrierIds.includes(cId)) return false;
            }

            // Check trailer type
            if (tType && d.allowedTrailerTypes && d.allowedTrailerTypes.length > 0) {
                if (!d.allowedTrailerTypes.includes(tType)) return false;
            }

            return true;
        });

        if (eligibleDocks.length === 0) {
            console.warn(`[Smart Schedule] No eligible docks found for appointment ${appt.id}`);
            continue; // Skip if no docks are allowed to handle this
        }

        // Find the eligible dock that is available earliest. Tie-break using dock id to assign sequentially.
        eligibleDocks.sort((a, b) => {
            if (a.nextAvailableTime !== b.nextAvailableTime) {
                return a.nextAvailableTime - b.nextAvailableTime;
            }
            const dockA = docks.find(d => d.id === a.dockId)?.name || a.dockId;
            const dockB = docks.find(d => d.id === b.dockId)?.name || b.dockId;
            return dockA.localeCompare(dockB, undefined, { numeric: true });
        });

        const selectedDock = eligibleDocks[0];

        // The assignment time must be at or after the dock's next availability
        // AND at or after the appointment's requested startTime.
        const requestedTime = new Date(appt.startTime).getTime();
        let assignTimeMs = Math.max(selectedDock.nextAvailableTime, requestedTime);

        // Ensure assignTimeMs falls within a shift
        // If it falls outside all shifts, jump to the start of the next shift
        let isValidTime = false;
        let nextPotentialStartMs = Infinity;

        for (const shift of shifts) {
            const [sH, sM] = shift.startTime.split(':').map(Number);
            const [eH, eM] = shift.endTime.split(':').map(Number);
            const sTime = new Date(targetStart); sTime.setHours(sH, sM, 0, 0);
            const eTime = new Date(targetStart); eTime.setHours(eH, eM, 0, 0);

            if (assignTimeMs >= sTime.getTime() && assignTimeMs <= eTime.getTime()) {
                isValidTime = true;
                break;
            }
            if (sTime.getTime() > assignTimeMs && sTime.getTime() < nextPotentialStartMs) {
                nextPotentialStartMs = sTime.getTime();
            }
        }

        if (!isValidTime && nextPotentialStartMs !== Infinity) {
            assignTimeMs = nextPotentialStartMs;
        }

        const assignTime = new Date(assignTimeMs);

        // Default duration to 30 mins if not provided
        const durationMs = (appt.durationMinutes || 30) * 60000;

        // Add to updates list
        updates.push({
            id: appt.id,
            updates: {
                startTime: assignTime.toISOString(),
                assignedResourceId: selectedDock.dockId,
                status: appt.status === 'Scheduled' ? 'Scheduled' : appt.status // preserve InYard/GatedIn if they already arrived, or keep Scheduled
            }
        });

        // Update the dock's availability (+ 10 mins buffer for shuffling)
        selectedDock.nextAvailableTime = assignTimeMs + durationMs + (10 * 60000);
    }

    return updates;
}
