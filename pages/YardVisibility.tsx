import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Warehouse, Container, Truck, Box, Navigation, Clock, AlertTriangle, ArrowDown, ArrowUp, Search, CheckCircle2, Filter } from 'lucide-react';
import { DndContext, useDraggable, useDroppable, DragEndEvent, TouchSensor, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Trailer, Resource } from '../types';
import { differenceInMinutes } from 'date-fns';

// Helper to determine trailer color based on dwell time
const getDwellColor = (trailer: Trailer, thresholds: { yard: number, dock: number } | undefined) => {
    const yardThresh = thresholds?.yard || 4;
    const dockThresh = thresholds?.dock || 2;

    // Determine if we are calculating dock dwell or yard dwell
    const isAtDock = trailer.status === 'CheckedIn' || trailer.status === 'ReadyForCheckOut';

    // If at dock, dwell starts when it was CheckedIn (arrived at dock). If in yard, starts when GatedIn.
    const arrivedEvent = isAtDock
        ? (trailer.history.find(h => h.status === 'CheckedIn') || trailer.history.find(h => h.status === 'GatedIn') || trailer.history[0])
        : (trailer.history.find(h => h.status === 'GatedIn') || trailer.history[0]);

    if (!arrivedEvent) return 'bg-muted';

    const minutesDwell = differenceInMinutes(new Date(), new Date(arrivedEvent.timestamp));
    const hoursDwell = minutesDwell / 60;

    const limit = isAtDock ? dockThresh : yardThresh;

    if (hoursDwell < limit * 0.75) return 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'; // Good
    if (hoursDwell < limit) return 'bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]'; // Warning
    return 'bg-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]'; // Critical
};

// Draggable Trailer Component
const DraggableTrailer = ({ trailer, thresholds, indicator = 'none', onClick }: { trailer: Trailer, thresholds: any, indicator?: 'inbound' | 'outbound' | 'none', onClick?: (t: Trailer) => void }) => {
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
            onClick={(e) => {
                e.stopPropagation();
                if (onClick) onClick(trailer);
            }}
            className={`
                relative flex items-center justify-center p-2 rounded-xl cursor-grab active:cursor-grabbing shadow-lg border transition-all
                ${isDragging ? 'border-primary opacity-50 scale-110 z-50 ring-4 ring-primary/20 ' + colorClass : colorClass + ' hover:brightness-110 border-white/10'}
                w-full h-11 mt-1
                ${indicator === 'outbound' ? 'opacity-60 border-dashed ring-2 ring-orange-500/50' : ''}
                ${indicator === 'inbound' ? 'ring-2 ring-primary shadow-[0_0_20px_rgba(59,130,246,0.5)]' : ''}
            `}
        >
            {/* Top-down trailer roof styling */}
            <div className="absolute left-1 md:left-2 w-1.5 h-6 bg-slate-900/20 rounded-sm" />
            <div className="absolute right-1 md:right-2 w-1.5 h-6 bg-slate-900/20 rounded-sm" />

            <div className="absolute inset-x-2 top-0 border-t-2 border-white/30" />
            <div className="absolute inset-x-2 bottom-0 border-b-2 border-slate-900/10" />

            <span className="text-[10px] md:text-sm font-black text-white truncate px-2 drop-shadow-lg z-10">{trailer.number || trailer.id}</span>
            {colorClass.includes('red') && <AlertTriangle className="absolute -top-2 -right-2 w-5 h-5 text-red-500 bg-white dark:bg-black rounded-full p-1 shadow-lg" />}

            {indicator === 'inbound' && (
                <div className="absolute -left-2 -top-2 bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg animate-bounce flex items-center gap-0.5 z-20">
                    <ArrowDown className="w-2.5 h-2.5" /> IN
                </div>
            )}
            {indicator === 'outbound' && (
                <div className="absolute -left-2 -top-2 bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg flex items-center gap-0.5 z-20 opacity-90">
                    <ArrowUp className="w-2.5 h-2.5" /> OUT
                </div>
            )}
        </div>
    );
};

// Droppable Resource Area (Dock or Yard Slot)
const DroppableResource = ({ resource, trailers, thresholds, activeDragTrailer }: { resource: Resource, trailers: Trailer[], thresholds: any, activeDragTrailer?: Trailer | null }) => {
    const isDock = resource.type === 'Dock';
    const capacity = resource.capacity || 1;
    const isFull = trailers.length >= capacity;
    const isMulti = capacity > 1 && trailers.length > 1;

    const isEligible = useMemo(() => {
        if (!activeDragTrailer) return true;
        if (!isDock) return true;

        const carrierAllowed = !resource.allowedCarrierIds?.length ||
            (activeDragTrailer.carrierId && resource.allowedCarrierIds.includes(activeDragTrailer.carrierId));

        const typeAllowed = !resource.allowedTrailerTypes?.length ||
            (activeDragTrailer.type && resource.allowedTrailerTypes.includes(activeDragTrailer.type));

        return carrierAllowed && typeAllowed;
    }, [activeDragTrailer, resource, isDock]);

    const { setNodeRef, isOver } = useDroppable({
        id: resource.id,
        data: { resource },
        disabled: !isEligible
    });
    const [expanded, setExpanded] = useState(false);

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
                p-4 rounded-[2rem] border-2 transition-all min-h-[120px] flex flex-col gap-3 relative
                ${!isEligible ? 'opacity-30 grayscale cursor-not-allowed border-dashed' :
                    isOver && !isFull ? 'border-primary bg-primary/5 ring-4 ring-primary/10' :
                        'border-border/50 bg-muted/5 hover:bg-muted/10'}
                ${isFull && isEligible ? 'opacity-80 border-amber-500/30' : ''}
            `}
        >
            <div className="flex items-center justify-between mb-1 pb-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                    {isDock ? <Box className="w-4 h-4 text-primary" /> : <Warehouse className="w-4 h-4 text-muted" />}
                    <span className="text-sm font-black text-foreground uppercase tracking-tight">{resource.name}</span>
                </div>
                <span className="text-[10px] font-black text-muted opacity-60">{trailers.length}/{capacity}</span>
            </div>

            <div className="flex-1 flex flex-col gap-2 relative">
                {isMulti && !expanded ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                        className="w-full py-3 bg-muted/10 hover:bg-muted/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted transition-all"
                    >
                        View {trailers.length} Trailers
                    </button>
                ) : (
                    <>
                        {isMulti && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                                className="text-[9px] text-muted hover:text-foreground uppercase font-black tracking-widest self-end mb-1 opacity-60"
                            >
                                Collapse
                            </button>
                        )}
                        <div className={`flex flex-col gap-1.5 ${isMulti ? 'max-h-64 overflow-y-auto custom-scrollbar pr-1' : ''}`}>
                            {trailers.map(t => (
                                <DraggableTrailer key={`${t.id}-${getIndicator(t)}`} trailer={t} thresholds={thresholds} indicator={getIndicator(t)} onClick={(t) => (window as any)._setTrailerDetails?.(t)} />
                            ))}
                        </div>
                    </>
                )}
                {trailers.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-[10px] text-muted font-black uppercase tracking-widest italic opacity-30">Empty</div>
                )}
            </div>
        </div>
    );
};

export const YardVisibility: React.FC = () => {
    const { docks, yardSlots, trailers, updateTrailer, settings, addToast } = useData();
    const [locationFilter, setLocationFilter] = useState('');
    const [trailerFilter, setTrailerFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedTrailer, setSelectedTrailer] = useState<Trailer | null>(null);
    const [activeDragTrailer, setActiveDragTrailer] = useState<Trailer | null>(null);
    const [capacityAlert, setCapacityAlert] = useState<{ open: boolean, message: string } | null>(null);

    const clearFilters = () => {
        setLocationFilter('');
        setTrailerFilter('');
        setSearchTerm('');
    };

    // Provide setter globally for DroppableResource components to access
    (window as any)._setTrailerDetails = setSelectedTrailer;

    const getTrailerDwellDetails = (trailer: Trailer) => {
        const yardThresh = settings?.dwellThresholds?.yard || 4;
        const dockThresh = settings?.dwellThresholds?.dock || 2;

        const isAtDock = trailer.status === 'CheckedIn' || trailer.status === 'ReadyForCheckOut';

        const arrivedEvent = isAtDock
            ? (trailer.history.find(h => h.status === 'CheckedIn') || trailer.history.find(h => h.status === 'GatedIn') || trailer.history[0])
            : (trailer.history.find(h => h.status === 'GatedIn') || trailer.history[0]);

        if (!arrivedEvent) return null;

        const arrivedDate = new Date(arrivedEvent.timestamp);
        const limit = isAtDock ? dockThresh : yardThresh;

        const warningDate = new Date(arrivedDate.getTime() + (limit * 0.75 * 60 * 60 * 1000));
        const criticalDate = new Date(arrivedDate.getTime() + (limit * 60 * 60 * 1000));

        return { arrivedDate, warningDate, criticalDate, limit, isAtDock };
    };

    const matchSearchQuery = (text: string, query: string) => {
        if (!query.trim()) return true;
        const terms = query.split(',').map(t => t.trim()).filter(Boolean);
        return terms.some(term => {
            if (term.includes('*')) {
                const escapeRegExp = (string: string) => string.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
                const regexPattern = '^' + term.split('*').map(escapeRegExp).join('.*') + '$';
                try {
                    return new RegExp(regexPattern, 'i').test(text);
                } catch {
                    return text.toLowerCase().includes(term.toLowerCase().replace(/\*/g, ''));
                }
            }
            return text.toLowerCase().includes(term.toLowerCase());
        });
    };

    // Map trailers to their locations
    const activeTrailers = useMemo(() => {
        let list = trailers.filter(t => ['Scheduled', 'InTransit', 'GatedIn', 'MovingToDock', 'ReadyForCheckIn', 'CheckedIn', 'MovingToYard', 'InYard', 'ReadyForCheckOut', 'CheckedOut'].includes(t.status));

        if (searchTerm.trim()) {
            const s = searchTerm.toLowerCase();
            list = list.filter(t => (t.number || t.id).toLowerCase().includes(s));
        }

        if (trailerFilter) {
            list = list.filter(t => matchSearchQuery(t.number || t.id, trailerFilter));
        }
        return list;
    }, [trailers, trailerFilter, searchTerm]);

    // Sort locations alphabetically
    const sortedDocks = useMemo(() => {
        let list = [...docks];
        if (searchTerm.trim()) {
            const s = searchTerm.toLowerCase();
            list = list.filter(d => d.name.toLowerCase().includes(s));
        }
        if (locationFilter) {
            list = list.filter(d => matchSearchQuery(d.name, locationFilter));
        }
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [docks, locationFilter, searchTerm]);

    const sortedSlots = useMemo(() => {
        let list = [...yardSlots];
        if (searchTerm.trim()) {
            const s = searchTerm.toLowerCase();
            list = list.filter(item => item.name.toLowerCase().includes(s));
        }
        if (locationFilter) {
            list = list.filter(s => matchSearchQuery(s.name, locationFilter));
        }
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [yardSlots, locationFilter, searchTerm]);

    // We assume trailer current location matches its `targetResourceId` or `location` string
    const getTrailersForResource = (resId: string) => {
        return activeTrailers.filter(t => t.targetResourceId === resId || t.location === resId);
    };

    // Trailers that are active but not mapped accurately to a resource (waiting in general yard)
    const isLocationKnown = (loc?: string | null) => loc && [...docks, ...yardSlots].some(r => r.id === loc);
    const unassignedTrailers = activeTrailers.filter(t => !isLocationKnown(t.targetResourceId) && !isLocationKnown(t.location));

    // Calculate dynamic box width based on the longest trailer name on the board so it doesn't truncate heavily
    const minBoxWidth = useMemo(() => {
        let maxLen = 0;
        activeTrailers.forEach(t => {
            const name = t.number || t.id || '';
            if (name.length > maxLen) maxLen = name.length;
        });
        // Base width of 140px + roughly 8px per character. Max it out at something reasonable so it doesn't break the layout.
        const calculatedWidth = 140 + (maxLen * 8);
        return Math.min(Math.max(calculatedWidth, 140), 300); // Between 140px and 300px min-width
    }, [activeTrailers]);

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

        // Check Capacity
        const capacity = targetResource.capacity || 1;
        const currentOccupants = activeTrailers.filter(t => t.targetResourceId === targetResource.id || (t.location === targetResource.id && !t.targetResourceId)).length;
        if (currentOccupants >= capacity) {
            setCapacityAlert({
                open: true,
                message: `${targetResource.name} is already full (Capacity: ${capacity}).`
            });
            return;
        }

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
        <div className="h-full flex flex-col p-8 animate-in fade-in duration-1000">
            <div className="mb-10 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center tracking-tighter">
                        <Warehouse className="w-10 h-10 mr-4 text-primary" />
                        Yard Visibility
                    </h1>
                    <p className="text-muted text-lg opacity-80 font-medium">Interactive Digital Twin. Drag trailers to instruct operators.</p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-8 py-4 rounded-2xl flex items-center gap-3 font-black uppercase tracking-widest text-xs transition-all border-2 ${showFilters ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20' : 'bg-surface border-border text-muted hover:bg-muted/5'}`}
                    >
                        <Filter className="w-5 h-5" />
                        {showFilters ? 'Hide Filters' : 'Advanced Filters'}
                    </button>
                    <div className="hidden md:flex flex-col items-end gap-2 justify-center">
                        <div className="flex gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted opacity-60">
                            <div className="flex items-center gap-2.5"><div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> Recent</div>
                            <div className="flex items-center gap-2.5"><div className="w-3 h-3 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]" /> Warning</div>
                            <div className="flex items-center gap-2.5"><div className="w-3 h-3 bg-red-500 animate-pulse rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" /> Critical</div>
                        </div>
                    </div>
                </div>
            </div>

            {showFilters && (
                <GlassCard className="mb-8 p-10 animate-in slide-in-from-top duration-500 rounded-[2.5rem] border-none shadow-2xl">
                    <div className="flex justify-between items-center mb-10">
                        <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase">Visibility Pattern Filters</h2>
                        <button onClick={clearFilters} className="text-[10px] font-black text-primary hover:text-blue-600 uppercase tracking-[0.2em] transition-colors bg-primary/5 px-4 py-2 rounded-xl">Rest Core State</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">Location Logic (* wildcards allowed)</label>
                            <input
                                type="text"
                                placeholder="e.g. *DOCK*, ZONE-A"
                                value={locationFilter}
                                onChange={(e) => setLocationFilter(e.target.value)}
                                className="w-full bg-muted/5 border border-border rounded-[1.25rem] px-5 py-4 text-sm font-bold text-foreground focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">Trailer Logic (* wildcards allowed)</label>
                            <input
                                type="text"
                                placeholder="e.g. TRL-001, *DFG*"
                                value={trailerFilter}
                                onChange={(e) => setTrailerFilter(e.target.value)}
                                className="w-full bg-muted/5 border border-border rounded-[1.25rem] px-5 py-4 text-sm font-bold text-foreground focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                            />
                        </div>
                    </div>
                </GlassCard>
            )}

            <div className="relative mb-8 group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted w-6 h-6 transition-colors group-focus-within:text-primary" />
                <input
                    type="text"
                    placeholder="Quick search by mission ID, trailer, or facility..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-surface border-2 border-border/50 rounded-[1.5rem] pl-16 pr-6 py-5 font-bold text-foreground outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-xl placeholder:text-muted/40"
                />
            </div>

            <DndContext sensors={sensors} onDragStart={(e) => {
                const trailer = e.active.data.current?.trailer;
                if (trailer) setActiveDragTrailer(trailer);
            }} onDragEnd={(e) => {
                setActiveDragTrailer(null);
                handleDragEnd(e);
            }}>
                <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">

                    {/* Left Panel: General Pool / Unassigned Arrivals */}
                    <div className="w-full lg:w-80 flex flex-col gap-4">
                        <GlassCard className="flex-1 flex flex-col p-6 rounded-[2.5rem] border-l-8 border-l-primary/30">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
                                <Box className="w-6 h-6 text-primary" />
                                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-foreground opacity-80">
                                    General Holding
                                </h2>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-6 leading-relaxed opacity-60">
                                Trailers in the yard without a specific location assignment or currently in transit.
                            </p>

                            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3 custom-scrollbar p-3 bg-muted/5 rounded-3xl border border-dashed border-border/50 whitespace-normal break-words">
                                {unassignedTrailers.map(t => (
                                    <DraggableTrailer key={t.id} trailer={t} thresholds={settings.dwellThresholds} onClick={setSelectedTrailer} />
                                ))}
                                {unassignedTrailers.length === 0 && (
                                    <div className="flex-1 flex flex-col items-center justify-center text-[10px] text-muted font-black uppercase tracking-widest italic opacity-40 gap-4">
                                        <CheckCircle2 className="w-8 h-8 opacity-20" />
                                        All clear
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    </div>

                    {/* Canvas Area: Slots and Docks */}
                    <GlassCard className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-muted/5 rounded-[3rem] border-2 border-dashed border-border relative">
                        {/* Background Grid Pattern */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.05] dark:opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--muted) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

                        <div className="relative z-10 flex flex-col gap-12">

                            {/* Docks Section */}
                            <div>
                                <h3 className="text-xs font-black text-muted uppercase tracking-[0.3em] mb-6 flex items-center opacity-70">
                                    <Box className="w-5 h-5 mr-3 text-primary" /> Active Dock Portals
                                </h3>
                                <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minBoxWidth}px, 1fr))` }}>
                                    {sortedDocks.map(dock => (
                                        <DroppableResource
                                            key={dock.id}
                                            resource={dock}
                                            trailers={getTrailersForResource(dock.id)}
                                            thresholds={settings.dwellThresholds}
                                            activeDragTrailer={activeDragTrailer}
                                        />
                                    ))}
                                    {sortedDocks.length === 0 && <span className="text-muted italic text-[10px] font-black uppercase tracking-widest opacity-40">No docks configured.</span>}
                                </div>
                            </div>

                            <hr className="border-border/50" />

                            {/* Yard Slots Section */}
                            <div>
                                <h3 className="text-xs font-black text-muted uppercase tracking-[0.3em] mb-6 flex items-center opacity-70">
                                    <Warehouse className="w-5 h-5 mr-3 text-indigo-500" /> Strategic Parking Slots
                                </h3>
                                <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minBoxWidth}px, 1fr))` }}>
                                    {sortedSlots.map(slot => (
                                        <DroppableResource
                                            key={slot.id}
                                            resource={slot}
                                            trailers={getTrailersForResource(slot.id)}
                                            thresholds={settings.dwellThresholds}
                                            activeDragTrailer={activeDragTrailer}
                                        />
                                    ))}
                                    {sortedSlots.length === 0 && <span className="text-muted italic text-[10px] font-black uppercase tracking-widest opacity-40">No yard slots configured.</span>}
                                </div>
                            </div>

                        </div>
                    </GlassCard>

                </div>
            </DndContext>

            {
                selectedTrailer && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={(e) => { e.stopPropagation(); setSelectedTrailer(null); }}>
                        <div className="bg-surface rounded-[3rem] p-10 w-full max-w-md shadow-2xl border border-border relative animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setSelectedTrailer(null)} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/10 text-muted transition-colors">✕</button>
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-4 bg-primary/10 rounded-3xl text-primary">
                                    <Truck className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-foreground tracking-tighter">{selectedTrailer.number}</h2>
                                    <p className="text-xs font-black uppercase tracking-widest text-muted opacity-60 mt-1">{selectedTrailer.type} • {selectedTrailer.owner}</p>
                                </div>
                            </div>

                            {(() => {
                                const details = getTrailerDwellDetails(selectedTrailer);
                                if (!details) return <p className="text-sm text-muted italic opacity-40">No dwell history recorded yet.</p>;
                                return (
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-1 p-4 bg-muted/5 rounded-[1.5rem] border border-border/50">
                                            <p className="text-[10px] text-muted uppercase font-black tracking-widest opacity-60">{details.isAtDock ? 'Arrived at Dock' : 'Arrived at Facility'}</p>
                                            <p className="text-sm font-black text-foreground tracking-tight">{details.arrivedDate.toLocaleString()}</p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            <div className="flex flex-col gap-1 p-4 bg-emerald-500/5 rounded-[1.5rem] border border-emerald-500/20">
                                                <p className="text-[10px] text-emerald-500 uppercase font-black tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Secure Window</p>
                                                <p className="text-sm font-black text-emerald-900 dark:text-emerald-400">Until {details.warningDate.toLocaleTimeString()}</p>
                                            </div>
                                            <div className="flex flex-col gap-1 p-4 bg-amber-500/5 rounded-[1.5rem] border border-amber-500/20">
                                                <p className="text-[10px] text-amber-500 uppercase font-black tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400" /> Warning Threshold</p>
                                                <p className="text-sm font-black text-amber-900 dark:text-amber-400">Until {details.criticalDate.toLocaleTimeString()}</p>
                                            </div>
                                            <div className="flex flex-col gap-1 p-4 bg-red-500/5 rounded-[1.5rem] border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                                                <p className="text-[10px] text-red-500 uppercase font-black tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Critical Breach</p>
                                                <p className="text-sm font-black text-red-900 dark:text-red-400">From {details.criticalDate.toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )
            }

            {
                capacityAlert?.open && (
                    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={(e) => { e.stopPropagation(); setCapacityAlert(null); }}>
                        <div className="bg-surface rounded-[3rem] p-10 w-full max-w-sm shadow-2xl border border-red-500/20 relative text-center flex flex-col items-center animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                            <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center mb-6">
                                <AlertTriangle className="w-10 h-10 text-red-500 animate-pulse" />
                            </div>
                            <h2 className="text-2xl font-black text-foreground tracking-tighter mb-2">Capacity Full</h2>
                            <p className="text-muted font-bold text-sm leading-relaxed opacity-60 mb-8">{capacityAlert.message}</p>
                            <button
                                onClick={() => setCapacityAlert(null)}
                                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-red-500/20 transition-all active:scale-95"
                            >
                                Understood
                            </button>
                        </div>
                    </div>
                )
            }
        </div>
    );
};
