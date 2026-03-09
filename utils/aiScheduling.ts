import { Appointment, Resource, Trailer, AppSettings, Carrier } from '../types';

export interface AIScheduleConfig {
    targetDate: string; // YYYY-MM-DD
    appointments: Appointment[];
    docks: Resource[];
    trailers: Trailer[];
    carriers: Carrier[];
    settings: AppSettings;
    currentFacilityId: string;
}

export function generateAISchedule(config: AIScheduleConfig): { id: string; updates: Partial<Appointment> }[] {
    const { targetDate, appointments, docks, trailers, carriers, settings, currentFacilityId } = config;

    // Helper to get carrier tier weight
    const getTierWeight = (carrierId?: string): number => {
        if (!carrierId) return 0;
        const carrier = carriers.find(c => c.id === carrierId);
        if (!carrier) return 0;

        // Use currentFacilityId for tier lookup
        const perf = carrier.performance?.[currentFacilityId];
        if (!perf) return 0;

        const effective = perf.manualScore !== undefined ? perf.manualScore : (perf.systemScore || 0);

        if (effective >= 95) return 4; // Platinum
        if (effective >= 85) return 3; // Gold
        if (effective >= 75) return 2; // Silver
        return 1; // Bronze
    };

    // 1. Filter eligible appointments for the target date
    const targetStart = new Date(targetDate);
    targetStart.setHours(0, 0, 0, 0);
    const targetEnd = new Date(targetDate);
    targetEnd.setHours(23, 59, 59, 999);

    const eligibleAppts = appointments.filter(a => {
        // Priority objective: assign a dock door to every appointment in scheduled status
        if (a.status !== 'Scheduled') return false;

        // Check if appointment is on the target date
        const apptTime = new Date(a.startTime);
        return apptTime >= targetStart && apptTime <= targetEnd;
    });

    // 2. Sort eligible appointments based on priority rules:
    // Priority 1: Carrier's Tier
    // Priority 2: Appointment scheduled time
    const sortedAppts = [...eligibleAppts].sort((a, b) => {
        const weightA = getTierWeight(a.carrierId);
        const weightB = getTierWeight(b.carrierId);

        if (weightA !== weightB) {
            return weightB - weightA; // Higher tier first
        }

        // Tier tie-break: Scheduled time
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    // 3. Assign to available dock slots prioritizing time over location
    // Find earliest shift start for the target date
    const dayName = new Date(targetDate).toLocaleDateString('en-US', { weekday: 'long' });
    const shifts = settings.workingHours?.[dayName] || [];

    let minStartMs = targetStart.getTime();
    if (shifts.length > 0) {
        const sortedShifts = [...shifts].sort((a, b) => a.startTime.localeCompare(b.startTime));
        const [h, m] = sortedShifts[0].startTime.split(':').map(Number);
        const shiftStart = new Date(targetStart);
        shiftStart.setHours(h, m, 0, 0);
        minStartMs = shiftStart.getTime();
    } else if (Object.keys(settings.workingHours || {}).length > 0) {
        return []; // Closed today
    }

    const scheduleStart = new Date(minStartMs);

    // Tracking when each dock is next available
    const dockAvailability = docks
        .filter(d => d.type === 'Dock' && d.status !== 'Unavailable')
        .map(d => ({
            dockId: d.id,
            nextAvailableTime: scheduleStart.getTime(),
            allowedCarrierIds: d.allowedCarrierIds || [],
            allowedTrailerTypes: d.allowedTrailerTypes || []
        }));

    const updates: { id: string; updates: Partial<Appointment> }[] = [];

    for (const appt of sortedAppts) {
        const cId = appt.carrierId;
        const tType = appt.trailerType;

        // Filter docks that match carrier and trailer type criteria
        const eligibleDocks = dockAvailability.filter(da => {
            // Check carrier matching criteria
            if (cId && da.allowedCarrierIds.length > 0) {
                if (!da.allowedCarrierIds.includes(cId)) return false;
            }

            // Check trailer type criteria
            if (tType && da.allowedTrailerTypes.length > 0) {
                if (!da.allowedTrailerTypes.includes(tType)) return false;
            }

            return true;
        });

        if (eligibleDocks.length === 0) {
            continue; // No dock can handle this appointment
        }

        // Find the eligible dock available earliest
        eligibleDocks.sort((a, b) => {
            if (a.nextAvailableTime !== b.nextAvailableTime) {
                return a.nextAvailableTime - b.nextAvailableTime;
            }
            return a.dockId.localeCompare(b.dockId);
        });

        const selectedDock = eligibleDocks[0];

        // System should schedule all open appointments in shortest time possible
        // using dock availability to the fullest across the day.
        // We start assigning from the earliest available time.
        let assignTimeMs = selectedDock.nextAvailableTime;

        // Ensure assignTimeMs falls within a shift
        let isValidTime = false;
        let nextPotentialStartMs = Infinity;

        for (const shift of shifts) {
            const [sH, sM] = shift.startTime.split(':').map(Number);
            const [eH, eM] = shift.endTime.split(':').map(Number);
            const sTime = new Date(targetStart); sTime.setHours(sH, sM, 0, 0);
            const eTime = new Date(targetStart); eTime.setHours(eH, eM, 0, 0);

            if (assignTimeMs >= sTime.getTime() && assignTimeMs < eTime.getTime()) {
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
        const durationMs = (appt.durationMinutes || 30) * 60000;

        updates.push({
            id: appt.id,
            updates: {
                startTime: assignTime.toISOString(),
                assignedResourceId: selectedDock.dockId
            }
        });

        // Update the dock's availability (+ 5 mins buffer for turnover)
        selectedDock.nextAvailableTime = assignTimeMs + durationMs + (5 * 60000);
    }

    return updates;
}
