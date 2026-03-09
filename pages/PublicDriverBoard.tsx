
import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Trailer, Appointment } from '../types';
import { Truck, Clock, ArrowRight, Play, CheckCircle2, AlertTriangle, MapPin, StopCircle, Timer, Calendar, RefreshCw, CheckSquare, MousePointerClick, MonitorPlay, Shield } from 'lucide-react';

export const PublicDriverBoard: React.FC = () => {
    const {
        trailers,
        appointments,
        docks,
        allResources,
        refreshData,
        updateAppointment,
        updateTrailer,
        moveTrailerToYard,
        addToast,
        theme,
        drivers,
        settings,
        yardSlots
    } = useData();

    const [currentTime, setCurrentTime] = useState(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Update clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Filter on-site trailers - Exclude Cancelled
    const onSiteTrailers = trailers.filter(t =>
        t.status !== 'GatedOut' && t.status !== 'Unknown' && t.status !== 'Cancelled'
    );

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshData();
        setIsRefreshing(false);
    };

    const handleManualConfirm = async (trailer: Trailer, appt?: Appointment) => {
        // Logic mirrors DriverView.tsx actions
        try {
            // 1. Confirm Arrival at Dock
            if (trailer.status === 'MovingToDock' || appt?.status === 'MovingToDock') {
                if (appt) await updateAppointment(appt.id, { status: 'ReadyForCheckIn' });
                const targetLocation = trailer.targetResourceId || trailer.location;
                await updateTrailer(trailer.id, {
                    status: 'ReadyForCheckIn',
                    location: targetLocation,
                    targetResourceId: null
                });
                addToast('Confirmed', `${trailer.number} marked as Arrived at Dock.`, 'success');
            }
            // 2. Confirm Arrival at Yard
            else if (trailer.status === 'MovingToYard' && trailer.targetResourceId) {
                const targetLocation = trailer.targetResourceId;
                moveTrailerToYard(trailer.id, targetLocation, appt?.id);
                await updateTrailer(trailer.id, { targetResourceId: null, location: targetLocation });
                addToast('Confirmed', `${trailer.number} parked in Yard.`, 'success');
            }
            // 3. Confirm Departure from Dock
            else if (trailer.status === 'ReadyForCheckOut' || appt?.status === 'ReadyForCheckOut') {
                if (appt) await updateAppointment(appt.id, { status: 'Completed', assignedResourceId: null });
                await updateTrailer(trailer.id, {
                    status: 'CheckedOut',
                    location: null,
                    currentAppointmentId: null
                });
                addToast('Confirmed', `${trailer.number} cleared from Dock.`, 'success');
            }
        } catch (err: any) {
            console.error(err);
            addToast('Error', 'Failed to update status.', 'error');
        }
    };

    const getTimerDisplay = (timestamp?: string, durationMinutes: number = 15) => {
        // Check Master Toggle
        if (settings.enableInstructionTimers === false) return null;

        if (!timestamp) return null;
        const start = new Date(timestamp).getTime();
        const end = start + (durationMinutes * 60 * 1000);
        const remainingMs = end - currentTime.getTime();
        const isOverdue = remainingMs < 0;

        // Countdown only shows if explicitly enabled (opt-in); overdue always shows
        const showCountdown = settings.showCountdownTimer === true;
        if (!showCountdown && !isOverdue) return null;

        const totalSeconds = Math.abs(Math.floor(remainingMs / 1000));
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        const formatted = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

        return { formatted, isOverdue };
    };

    // Helper to determine display data
    const getActionData = (trailer: Trailer) => {
        // Attempt to link to appointment for richer context
        const appt = appointments.find(a =>
            (a.trailerNumber === trailer.number && a.status !== 'Completed' && a.status !== 'Cancelled') ||
            (a.id === trailer.currentAppointmentId)
        );

        let statusLabel = 'WAITING';
        let instruction = 'Wait for assignment';
        let locationName = '-';
        let color = 'bg-yellow-500'; // Default: Waiting
        let icon = Clock;
        let timerData = null;
        let isHotlisted = false;
        let canConfirm = false;
        let confirmLabel = '';

        // Resolve Location Name helper
        const resolveResName = (id?: string | null) => {
            if (!id) return null;
            const cleanId = id.trim();
            return allResources.find(r => r.id === cleanId)?.name || cleanId;
        };

        // Calculate Current Location Name (if known)
        if (trailer.location) {
            locationName = resolveResName(trailer.location) || trailer.location;
        } else if (trailer.status === 'GatedIn') {
            locationName = 'Entry Gate';
        }

        // --- LOGIC MAPPING ---

        switch (trailer.status) {
            case 'Scheduled':
                statusLabel = 'SCHEDULED';
                instruction = 'Report to Guard Gate';
                color = 'bg-purple-600';
                icon = Calendar;
                break;

            case 'GatedIn':
                statusLabel = 'GATED IN';
                instruction = 'Waiting for dock or yard assignment';
                color = 'bg-blue-500';
                icon = CheckCircle2;
                break;

            case 'MovingToDock':
                statusLabel = 'MOVE TO DOCK';
                // Resolve destination dock: trailer's target prioritizes over appointment's resource
                const targetDock = trailer.targetResourceId
                    ? resolveResName(trailer.targetResourceId)
                    : appt?.assignedResourceId
                        ? resolveResName(appt.assignedResourceId)
                        : null;
                instruction = targetDock ? `Proceed to ${targetDock}` : 'Proceed to assigned dock';
                // Show destination as location for MovingToDock (do not fall back to current location)
                locationName = targetDock || 'Assigned Dock';
                color = 'bg-emerald-500 animate-pulse';
                icon = Play;
                timerData = getTimerDisplay(trailer.instructionTimestamp || appt?.instructionTimestamp, settings.instructionDurations?.moveToDock || 15);
                canConfirm = true;
                confirmLabel = 'Confirm Dock Arrival';
                break;

            case 'ReadyForCheckIn':
                statusLabel = 'ARRIVED';
                instruction = 'Wait at Dock for Staff';
                color = 'bg-blue-600';
                icon = StopCircle;
                locationName = appt?.assignedResourceId ? resolveResName(appt.assignedResourceId) || locationName : locationName;
                break;

            case 'CheckedIn':
                statusLabel = 'PROCESSING';
                instruction = 'Loading/Unloading in progress';
                color = 'bg-indigo-500';
                icon = Truck;
                break;

            case 'ReadyForCheckOut':
                statusLabel = 'EXIT DOCK';
                instruction = 'Leave dock immediately';
                color = 'bg-red-600 animate-pulse';
                icon = AlertTriangle;
                timerData = getTimerDisplay(trailer.instructionTimestamp || appt?.instructionTimestamp, settings.instructionDurations?.checkOut || 15);
                canConfirm = true;
                confirmLabel = 'Confirm Dock Exit';
                break;

            case 'CheckedOut':
                statusLabel = 'DEPARTING';
                instruction = 'Proceed to Exit Gate';
                color = 'bg-emerald-600';
                icon = ArrowRight;
                break;

            case 'MovingToYard':
                statusLabel = 'MOVE TO YARD';
                const targetSlot = trailer.targetResourceId ? resolveResName(trailer.targetResourceId) : null;
                instruction = targetSlot ? `Park in ${targetSlot}` : 'Proceed to yard slot';
                // Show destination as location for MovingToYard (do not fall back to current location)
                locationName = targetSlot || 'Assigned Slot';
                color = 'bg-emerald-500 animate-pulse';
                icon = Play;
                timerData = getTimerDisplay(trailer.instructionTimestamp, settings.instructionDurations?.moveToYard || 15);
                canConfirm = true;
                confirmLabel = 'Confirm Yard Arrival';
                break;

            case 'InYard':
                statusLabel = 'PARKED';
                instruction = 'Standby for assignment';
                color = 'bg-slate-500';
                icon = Clock;
                break;

            default:
                break;
        }

        // Override if appointment has specific "Moving" status even if trailer doesn't (sync lag)
        if (appt?.status === 'MovingToDock' && trailer.status !== 'MovingToDock') {
            statusLabel = 'MOVE TO DOCK';
            const targetDock = resolveResName(appt.assignedResourceId) || 'Assigned Dock';
            instruction = `Proceed to ${targetDock}`;
            color = 'bg-emerald-500 animate-pulse';
            icon = Play;
            timerData = getTimerDisplay(appt.instructionTimestamp, settings.instructionDurations?.moveToDock || 15);
            canConfirm = true;
            confirmLabel = 'Confirm Dock Arrival';
            locationName = targetDock;
        }

        // Hotlist Logic: If timer is expired, flag for visual alerting
        if (timerData && timerData.isOverdue) {
            isHotlisted = true;
        }

        return { statusLabel, instruction, locationName, color, icon, timerData, isHotlisted, canConfirm, confirmLabel, appt };
    };

    const isDark = theme === 'dark';

    return (
        <div className="h-full flex flex-col p-4 md:p-8 animate-in fade-in duration-500 overflow-hidden">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center">
                        <MonitorPlay className="w-8 h-8 mr-3 text-blue-500" />
                        Live Board
                    </h1>
                    <p className="text-slate-500 dark:text-gray-400">Driver instructions • {onSiteTrailers.length} vehicles on site</p>
                </div>

                <div className="flex gap-4 text-xs font-bold text-slate-500 dark:text-gray-400">
                    <div className="text-right">
                        <div className="text-2xl font-mono font-bold tracking-tighter text-emerald-600 dark:text-emerald-400">
                            {currentTime.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Board Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {onSiteTrailers.length === 0 ? (
                    <div className={`h-full flex flex-col items-center justify-center ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                        <Truck className="w-32 h-32 opacity-20 mb-4" />
                        <h2 className="text-3xl font-black uppercase tracking-widest opacity-50">No Active Vehicles</h2>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {onSiteTrailers.map(trailer => {
                            const { statusLabel, instruction, locationName, color, icon: Icon, timerData, isHotlisted, canConfirm, confirmLabel, appt } = getActionData(trailer);

                            // Display logic for timer overlay
                            const showCountdown = settings.showCountdownTimer !== false;
                            const shouldShowTimerOverlay = timerData && (showCountdown || timerData.isOverdue);

                            return (
                                <div
                                    key={trailer.id}
                                    className={`
                                    rounded-xl overflow-hidden flex shadow-lg transition-all group relative border min-h-[140px]
                                    ${isHotlisted
                                            ? `${isDark ? 'bg-red-900/20 border-red-500' : 'bg-red-50 border-red-300'} animate-[pulse_3s_ease-in-out_infinite]`
                                            : isDark ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50'
                                        }
                                `}
                                >
                                    {/* Left: ID & Driver */}
                                    <div className={`w-48 p-5 flex flex-col justify-center border-r relative overflow-hidden ${isHotlisted ? (isDark ? 'bg-red-900/30 border-red-500/50' : 'bg-red-100 border-red-200') : isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className={`absolute top-0 left-0 w-1 h-full ${isHotlisted ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                        <div className={`text-sm font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Trailer</div>
                                        <div className={`text-3xl font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`} title={trailer.number}>
                                            {trailer.number}
                                        </div>
                                        <div className={`mt-2 text-xs font-medium truncate flex items-center gap-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {trailer.owner}
                                            {appt?.driverName && (
                                                <>
                                                    <span className="opacity-30">•</span>
                                                    <div className={`px-1 rounded-[4px] border border-blue-500/20 text-blue-500 text-[8px] font-black uppercase font-mono tracking-tighter`}>
                                                        {drivers.find(d => d.name.toLowerCase() === appt.driverName?.toLowerCase())?.performance?.level ? `LVL ${drivers.find(d => d.name.toLowerCase() === appt.driverName?.toLowerCase())?.performance?.level}` : 'ROOKIE'}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Center: Instruction */}
                                    <div className="flex-1 p-5 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${color.replace('bg-', 'text-').replace('animate-pulse', '')} ${isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-100 border border-slate-200'}`}>
                                                    {statusLabel}
                                                </div>
                                                {isHotlisted && (
                                                    <div className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-500/20 border border-red-500/30 flex items-center gap-1 animate-pulse">
                                                        <AlertTriangle className="w-3 h-3" /> DELAYED
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`text-2xl font-bold leading-none mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                {instruction}
                                            </div>
                                            <div className={`text-xs font-mono mt-2 flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                <MapPin className="w-3 h-3" /> {(trailer.status === 'MovingToDock' || trailer.status === 'MovingToYard') ? 'Destination' : 'Current'}:{' '}
                                                <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{locationName}</span>
                                            </div>
                                        </div>

                                        {/* Manual Confirm Button — separate line below location */}
                                        {canConfirm && (
                                            <div className="mt-3">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleManualConfirm(trailer, appt); }}
                                                    className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors shadow-lg ${isDark ? 'bg-white/10 hover:bg-white/20 border border-white/20 text-white' : 'bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700'}`}
                                                >
                                                    <MousePointerClick className="w-3 h-3" /> {confirmLabel}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Icon Indicator */}
                                    <div className={`w-24 flex items-center justify-center relative ${isHotlisted ? 'bg-red-600' : color}`}>
                                        <Icon className="w-10 h-10 text-white" />
                                    </div>

                                    {/* Timer Overlay */}
                                    {shouldShowTimerOverlay && (
                                        <div className={`absolute top-2 right-2 px-2 py-1 rounded-lg border flex items-center gap-1 font-mono font-bold text-sm shadow-lg ${timerData.isOverdue ? 'bg-red-500 text-white border-red-400 scale-110 origin-top-right transition-transform' : isDark ? 'bg-black/60 text-white border-white/20' : 'bg-slate-800 text-white border-slate-600'}`}>
                                            <Timer className="w-3 h-3" />
                                            {timerData.isOverdue ? '-' : ''}{timerData.formatted}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
                {/* Top Drivers Ticker */}
                <div className={`mt-auto -mx-4 md:-mx-8 border-t px-8 py-3 flex items-center gap-6 overflow-hidden whitespace-nowrap ${isDark ? 'bg-[#1e1e1e] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-2 shrink-0">
                        <Shield className="w-4 h-4 text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Top Drivers</span>
                    </div>
                    <div className="flex gap-12 animate-marquee hover:pause-marquee">
                        {[...drivers]
                            .sort((a, b) => (b.performance?.points || 0) - (a.performance?.points || 0))
                            .slice(0, 10)
                            .map((d, i) => (
                                <div key={d.id} className="flex items-center gap-2">
                                    <span className="text-slate-500 font-bold text-xs">{i + 1}.</span>
                                    <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{d.name}</span>
                                    <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border ${(d.performance?.level || 1) === 5 ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' :
                                        (d.performance?.level || 1) === 4 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                                            (d.performance?.level || 1) === 3 ? 'bg-slate-400/10 border-slate-400/30 text-slate-400' :
                                                (d.performance?.level || 1) === 2 ? 'bg-orange-600/10 border-orange-600/30 text-orange-400' :
                                                    'bg-slate-500/10 border-slate-500/30 text-slate-500'
                                        }`}>
                                        LVL {d.performance?.level || 1}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                }
                .pause-marquee:hover {
                    animation-play-state: paused;
                }
            ` }} />
            </div>
        </div>
    );
};
