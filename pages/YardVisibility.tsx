import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Warehouse, Container, Truck, Box, Navigation, Clock, AlertTriangle, ArrowDown, ArrowUp } from 'lucide-react';
import { DndContext, useDraggable, useDroppable, DragEndEvent, TouchSensor, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Trailer, Resource } from '../types';
import { differenceInMinutes } from 'date-fns';

// Helper to determine trailer color based on dwell time
const getDwellColor = (trailer: Trailer, thresholds: { yard: number, dock: number } | undefined) => {
    const yardThresh = thresholds?.yard || 4;
    const dockThresh = thresholds?.dock || 2;

    const arrivedEvent = trailer.history.find(h => h.status === 'GatedIn' || h.status === 'CheckedIn') || trailer.history[0];
    if (!arrivedEvent) return 'bg-slate-500';

    const minutesDwell = differenceInMinutes(new Date(), new Date(arrivedEvent.timestamp));
    const hoursDwell = minutesDwell / 60;

    const isAtDock = trailer.status === 'CheckedIn' || trailer.status === 'ReadyForCheckOut';
    const limit = isAtDock ? dockThresh : yardThresh;

    if (hoursDwell < limit * 0.75) return 'bg-emerald-500'; // Good
    if (hoursDwell < limit) return 'bg-amber-400'; // Warning
    return 'bg-red-500 animate-pulse'; // Critical
};

// Draggable Trailer Component
const DraggableTrailer = ({ trailer, thresholds, indicator = 'none' }: { trailer: Trailer, thresholds: any, indicator?: 'inbound' | 'outbound' | 'none' }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: trailer.id,
        data: { trailer }
    });

    const isBobtail = trailer.type.toLowerCase().includes('bobtail');
    const colorClass = getDwellColor(trailer, thresholds);

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`
                relative flex items-center justify-center p-2 rounded-lg cursor-grab active:cursor-grabbing shadow-sm border ${isDragging ? 'border-blue-500' : 'border-slate-700/20 dark:border-white/20'}
                ${isDragging ? 'opacity-50 scale-105 z-50 ring-2 ring-blue-500 ' + colorClass : colorClass + ' hover:brightness-110 transition-all'}
                w-full h-10 mt-1
                ${indicator === 'outbound' ? 'opacity-50 border-dashed ring-2 ring-orange-500/50' : ''}
                ${indicator === 'inbound' ? 'ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : ''}
            `}
        >
            {/* Top-down trailer roof styling */}
            <div className="absolute left-1 md:left-2 w-1.5 h-6 bg-slate-900/20 rounded-sm" />
            <div className="absolute right-1 md:right-2 w-1.5 h-6 bg-slate-900/20 rounded-sm" />

            <div className="absolute inset-x-2 top-0 border-t-2 border-white/30" />
            <div className="absolute inset-x-2 bottom-0 border-b-2 border-slate-900/10" />

            <span className="text-[10px] md:text-xs font-black text-white truncate px-2 drop-shadow-md z-10">{trailer.number || trailer.id}</span>
            {colorClass.includes('red') && <AlertTriangle className="absolute -top-2 -right-2 w-4 h-4 text-red-500 bg-white rounded-full p-0.5 shadow-sm" />}

            {indicator === 'inbound' && (
                <div className="absolute -left-2 -top-2 bg-blue-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg animate-bounce flex items-center gap-0.5 z-20">
                    <ArrowDown className="w-2.5 h-2.5" /> IN
                </div>
            )}
            {indicator === 'outbound' && (
                <div className="absolute -left-2 -top-2 bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow flex items-center gap-0.5 z-20 opacity-90">
                    <ArrowUp className="w-2.5 h-2.5" /> OUT
                </div>
            )}
        </div>
    );
};

// Droppable Resource Area (Dock or Yard Slot)
const DroppableResource = ({ resource, trailers, thresholds }: { resource: Resource, trailers: Trailer[], thresholds: any }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: resource.id,
        data: { resource }
    });
    const [expanded, setExpanded] = useState(false);

    const isDock = resource.type === 'Dock';
    const capacity = resource.capacity || 1;
    const isFull = trailers.length >= capacity;
    const isMulti = capacity > 1 && trailers.length > 1;

    const getIndicator = (trailer: Trailer) => {
        if (trailer.targetResourceId === resource.id && trailer.location !== resource.id) return 'inbound';
        if (trailer.location === resource.id && trailer.targetResourceId && trailer.targetResourceId !== resource.id) return 'outbound';
        if (trailer.location === resource.id && (trailer.status === 'ReadyForCheckOut' || trailer.status === 'CheckedOut')) return 'outbound';
        return 'none';
    };

    return (
        <div
            ref={setNodeRef}
            className={`
                p-3 rounded-xl border-2 transition-all min-h-[100px] flex flex-col gap-2 relative
                ${isOver && !isFull ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20'}
                ${isFull ? 'opacity-70 border-amber-200 dark:border-amber-900' : ''}
            `}
        >
            <div className="flex items-center justify-between mb-1 pb-2 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                    {isDock ? <Box className="w-4 h-4 text-slate-400" /> : <Warehouse className="w-4 h-4 text-slate-400" />}
                    <span className="text-sm font-bold text-slate-700 dark:text-gray-300">{resource.name}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{trailers.length}/{capacity}</span>
            </div>

            <div className="flex-1 flex flex-col gap-2 relative">
                {isMulti && !expanded ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                        className="w-full py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-gray-300 transition-colors"
                    >
                        View {trailers.length} Trailers
                    </button>
                ) : (
                    <>
                        {isMulti && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                                className="text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-white uppercase font-bold self-end mb-1"
                            >
                                Collapse
                            </button>
                        )}
                        <div className={`flex flex-col gap-1 ${isMulti ? 'max-h-48 overflow-y-auto custom-scrollbar pr-1' : ''}`}>
                            {trailers.map(t => (
                                <DraggableTrailer key={`${t.id}-${getIndicator(t)}`} trailer={t} thresholds={thresholds} indicator={getIndicator(t)} />
                            ))}
                        </div>
                    </>
                )}
                {trailers.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-xs text-slate-400 italic">Empty</div>
                )}
            </div>
        </div>
    );
};

export const YardVisibility: React.FC = () => {
    const { docks, yardSlots, trailers, updateTrailer, settings, addToast } = useData();

    // Map trailers to their locations
    const activeTrailers = trailers.filter(t => ['Scheduled', 'InTransit', 'GatedIn', 'MovingToDock', 'ReadyForCheckIn', 'CheckedIn', 'MovingToYard', 'InYard'].includes(t.status));

    // Sort locations alphabetically
    const sortedDocks = useMemo(() => [...docks].sort((a, b) => a.name.localeCompare(b.name)), [docks]);
    const sortedSlots = useMemo(() => [...yardSlots].sort((a, b) => a.name.localeCompare(b.name)), [yardSlots]);

    // We assume trailer current location matches its `targetResourceId` or `location` string
    const getTrailersForResource = (resId: string) => {
        return activeTrailers.filter(t => t.targetResourceId === resId || t.location === resId);
    };

    // Trailers that are active but not mapped accurately to a resource (waiting in general yard)
    const isLocationKnown = (loc?: string | null) => loc && [...docks, ...yardSlots].some(r => r.id === loc);
    const unassignedTrailers = activeTrailers.filter(t => !isLocationKnown(t.targetResourceId) && !isLocationKnown(t.location));

    // Setup DnD Sensors (supports mouse and touch)
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) return; // Dropped outside a valid zone

        const trailer = active.data.current?.trailer as Trailer;
        const targetResource = over.data.current?.resource as Resource;

        if (!trailer || !targetResource) return;
        if (trailer.targetResourceId === targetResource.id || trailer.location === targetResource.id) return; // Dropped in same place

        // Determine intended action based on target type
        try {
            if (targetResource.type === 'Dock') {
                // Moving to a Dock
                await updateTrailer(trailer.id, {
                    status: 'MovingToDock',
                    targetResourceId: targetResource.id,
                    instructionTimestamp: new Date().toISOString(),
                    history: [
                        { status: 'MovingToDock', timestamp: new Date().toISOString(), location: targetResource.id },
                        ...trailer.history
                    ]
                });
                addToast('Driver Instructed', `${trailer.number} instructed to move to ${targetResource.name}`, 'success');
            } else {
                // Moving to a Yard Slot
                await updateTrailer(trailer.id, {
                    status: 'MovingToYard',
                    targetResourceId: targetResource.id,
                    instructionTimestamp: new Date().toISOString(),
                    history: [
                        { status: 'MovingToYard', timestamp: new Date().toISOString(), location: targetResource.id },
                        ...trailer.history
                    ]
                });
                addToast('Driver Instructed', `${trailer.number} instructed to move to ${targetResource.name}`, 'info');
            }
        } catch (e: any) {
            addToast('Move Failed', e.message || 'Error updating trailer location.', 'error');
        }
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-8 animate-in fade-in duration-500">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center">
                        <Warehouse className="w-8 h-8 mr-3 text-emerald-500" />
                        Yard Visibility
                    </h1>
                    <p className="text-slate-500 dark:text-gray-400">Interactive Digital Twin. Drag trailers to instruct operators.</p>
                </div>

                <div className="flex gap-4 text-xs font-bold text-slate-500 dark:text-gray-400">
                    <div className="flex items-center"><div className="w-3 h-3 bg-emerald-500 rounded-full mr-2" /> Recent</div>
                    <div className="flex items-center"><div className="w-3 h-3 bg-amber-400 rounded-full mr-2" /> Warning</div>
                    <div className="flex items-center"><div className="w-3 h-3 bg-red-500 animate-pulse rounded-full mr-2" /> Critical</div>
                </div>
            </div>

            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">

                    {/* Left Panel: General Pool / Unassigned Arrivals */}
                    <div className="w-full lg:w-72 flex flex-col gap-4">
                        <GlassCard className="flex-1 flex flex-col p-4 border-l-4 border-l-emerald-500">
                            <h2 className="text-sm font-black uppercase text-slate-800 dark:text-slate-200 mb-4 pb-2 border-b border-slate-200 dark:border-white/10">
                                Unassigned / Holding
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-gray-400 mb-4 tracking-wide">
                                Trailers in the yard without a specific location assignment or currently in transit.
                            </p>

                            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3 custom-scrollbar p-2 bg-slate-50 dark:bg-black/20 rounded-xl border border-dashed border-slate-300 dark:border-white/5 whitespace-normal break-words">
                                {unassignedTrailers.map(t => (
                                    <DraggableTrailer key={t.id} trailer={t} thresholds={settings.dwellThresholds} />
                                ))}
                                {unassignedTrailers.length === 0 && (
                                    <div className="flex-1 flex items-center justify-center text-sm text-slate-400 italic">
                                        No unassigned trailers.
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    </div>

                    {/* Canvas Area: Slots and Docks */}
                    <GlassCard className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-100/50 dark:bg-[#0f172a]/50 border-2 border-dashed border-slate-300 dark:border-white/10 relative">
                        {/* Background Grid Pattern */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />

                        <div className="relative z-10 flex flex-col gap-8">

                            {/* Docks Section */}
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                                    <Box className="w-5 h-5 mr-2 text-blue-500" /> Dock Doors
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                    {sortedDocks.map(dock => (
                                        <DroppableResource
                                            key={dock.id}
                                            resource={dock}
                                            trailers={getTrailersForResource(dock.id)}
                                            thresholds={settings.dwellThresholds}
                                        />
                                    ))}
                                    {sortedDocks.length === 0 && <span className="text-slate-400 italic text-sm">No docks configured.</span>}
                                </div>
                            </div>

                            <hr className="border-slate-300 dark:border-white/10" />

                            {/* Yard Slots Section */}
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                                    <Warehouse className="w-5 h-5 mr-2 text-indigo-500" /> Parking Slots
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                                    {sortedSlots.map(slot => (
                                        <DroppableResource
                                            key={slot.id}
                                            resource={slot}
                                            trailers={getTrailersForResource(slot.id)}
                                            thresholds={settings.dwellThresholds}
                                        />
                                    ))}
                                    {sortedSlots.length === 0 && <span className="text-slate-400 italic text-sm">No yard slots configured.</span>}
                                </div>
                            </div>

                        </div>
                    </GlassCard>

                </div>
            </DndContext>
        </div>
    );
};
