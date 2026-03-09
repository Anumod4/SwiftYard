
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Trailer } from '../types';
import { Plus, Edit2, Search, Truck, MapPin, Calendar, Clock, ListPlus, User, Briefcase, FileText, ArrowRightCircle, Filter, ChevronDown, X, Navigation, Eye } from 'lucide-react';
import { ModalPortal } from '../components/ui/ModalPortal';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { BulkCreatorModal, BulkColumn } from '../components/BulkCreatorModal';
import { TrailerActionModal } from '../components/TrailerActionModal';
import { QuickAddDriverModal } from '../components/QuickAddDriverModal';
import { VIEW_IDS } from '../constants';

// --- MultiSelect Dropdown Component ---
const MultiSelectDropdown: React.FC<{
    label: string;
    options: { id: string; name: string }[];
    selectedIds: string[];
    onToggle: (id: string) => void;
}> = ({ label, options, selectedIds, onToggle }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedCount = selectedIds.length;

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between bg-muted/5 border ${isOpen ? 'border-primary' : 'border-border'} rounded-[1.25rem] px-5 py-4 text-sm text-foreground font-bold transition-all hover:bg-muted/10`}
            >
                <span className="truncate flex items-center gap-2">
                    {selectedCount > 0 && <span className="w-5 h-5 flex items-center justify-center bg-primary text-white text-[10px] rounded-full">{selectedCount}</span>}
                    {label}
                </span>
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-3 w-72 max-h-80 overflow-y-auto custom-scrollbar bg-surface border border-border rounded-[2rem] shadow-2xl z-[100] p-6 animate-in fade-in zoom-in-95 duration-200">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-4 px-2">{label}</h4>
                    <div className="space-y-1">
                        {options.length === 0 ? (
                            <div className="p-4 text-xs text-muted text-center italic">No options available</div>
                        ) : (
                            options.map(opt => (
                                <label key={opt.id} className="flex items-center gap-3 p-3 hover:bg-muted/5 rounded-2xl cursor-pointer transition-all group">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(opt.id)}
                                            onChange={() => onToggle(opt.id)}
                                            className="w-5 h-5 rounded-lg border-border text-primary focus:ring-primary/20 bg-transparent transition-all cursor-pointer"
                                        />
                                    </div>
                                    <span className={`text-sm tracking-tight transition-colors truncate font-bold ${selectedIds.includes(opt.id) ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>
                                        {opt.name}
                                    </span>
                                </label>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const Trailers: React.FC = () => {
    const {
        trailers, appointments, carriers, drivers, trailerTypes, docks, yardSlots,
        addTrailer, updateTrailer, t, addToast, formatDateTime, canEdit
    } = useData();

    // View State
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [statusFilter, setStatusFilter] = useState<string>('All');

    // Advanced Filters
    const [carrierFilterIds, setCarrierFilterIds] = useState<string[]>([]);
    const [typeFilterNames, setTypeFilterNames] = useState<string[]>([]);
    const [locationSearch, setLocationSearch] = useState('');
    const debouncedLocationSearch = useDebounce(locationSearch, 300);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('All');
        setCarrierFilterIds([]);
        setTypeFilterNames([]);
        setLocationSearch('');
    };

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTrailer, setEditingTrailer] = useState<Trailer | null>(null);

    // Action Modal State
    const [isActionOpen, setIsActionOpen] = useState(false);
    const [selectedApptId, setSelectedApptId] = useState<string | null>(null);

    // Quick Add Driver Modal State
    const [isQuickAddDriverOpen, setIsQuickAddDriverOpen] = useState(false);

    // Bulk Create State
    const [isBulkOpen, setIsBulkOpen] = useState(false);

    // Form Fields
    const [number, setNumber] = useState('');
    const [type, setType] = useState('');
    const [carrierId, setCarrierId] = useState('');
    const [driverId, setDriverId] = useState('');

    const canEditTrailers = canEdit(VIEW_IDS.TRAILERS);

    // Handle Quick Add Callback
    const handleQuickAddSuccess = (newDriverId: string, newDriverName: string, newCarrierId?: string) => {
        setDriverId(newDriverId);
        if (newCarrierId) {
            setCarrierId(newCarrierId);
        }
        addToast('Success', `Driver ${newDriverName} added and selected.`, 'success');
    };

    const handleOpenModal = (trailer?: Trailer) => {
        if (trailer) {
            setEditingTrailer(trailer);
            setNumber(trailer.number);
            setType(trailer.type);
            setCarrierId(trailer.carrierId || '');
            setDriverId(trailer.currentDriverId || '');
        } else {
            setEditingTrailer(null);
            setNumber('');
            setType(trailerTypes.length > 0 ? trailerTypes[0].name : 'Unknown');
            setCarrierId('');
            setDriverId('');
        }
        setIsModalOpen(true);
    };

    // Filter Drivers: Only show "Away" drivers (not currently on site) based on Carrier
    const filteredDrivers = useMemo(() => {
        const awayDrivers = drivers.filter(d => d.status === 'Away');

        if (!carrierId) return awayDrivers;

        // Case-insensitive comparison since carrierId now stores carrier name
        return awayDrivers.filter(d =>
            d.carrierId && d.carrierId.toLowerCase() === carrierId.toLowerCase()
        );
    }, [drivers, carrierId]);

    // Handle Driver Selection (Auto-populates Carrier)
    const handleDriverChange = (newDriverId: string) => {
        setDriverId(newDriverId);
        const driver = drivers.find(d => d.id === newDriverId);
        if (driver && driver.carrierId) {
            // Auto-populate carrier from driver (handle both ID and name)
            let driverCarrier = drivers.find(d => d.id === newDriverId)?.carrierId;
            if (driverCarrier) {
                // Try to find carrier by name
                const carrier = carriers.find(c => c.name.toLowerCase() === driverCarrier?.toLowerCase());
                if (carrier) {
                    setCarrierId(carrier.name);
                } else {
                    setCarrierId(driverCarrier);
                }
            }
        }
    };

    // Handle Carrier Selection (filters drivers)
    const handleCarrierChange = (newCarrierId: string) => {
        setCarrierId(newCarrierId);
        // Clear driver if it's not from the newly selected carrier
        if (driverId) {
            const driver = drivers.find(d => d.id === driverId);
            if (driver && driver.carrierId && driver.carrierId.toLowerCase() !== newCarrierId.toLowerCase()) {
                setDriverId('');
            }
        }
    };

    // Check if carrier should be locked (if driver is selected and has a carrier)
    const isCarrierLocked = useMemo(() => {
        if (!driverId) return false;
        const driver = drivers.find(d => d.id === driverId);
        return !!driver?.carrierId;
    }, [driverId, drivers]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Derive owner from Carrier Name (carrierId now stores name)
        let derivedOwner = carrierId || 'Private/Unknown';

        const payload: Partial<Trailer> = {
            number,
            owner: derivedOwner,
            type,
            // If editing, keep status. If new, default to Scheduled.
            status: editingTrailer ? editingTrailer.status : 'Scheduled',
            carrierId: carrierId || undefined,
            currentDriverId: driverId || undefined
        };

        try {
            if (editingTrailer) {
                await updateTrailer(editingTrailer.id, payload);
                addToast('Updated', `${number} updated.`, 'success');
            } else {
                await addTrailer(payload);
                addToast('Created', `${number} registered.`, 'success');
            }
            setIsModalOpen(false);
        } catch (err: any) {
            addToast('Error', err.message, 'error');
        }
    };

    const handleBulkSave = async (data: any[]) => {
        const promises = data.map(item => addTrailer({
            number: item.number,
            owner: item.owner || 'Unknown',
            type: item.type || 'Unknown',
            status: 'Scheduled'
        }));
        await Promise.all(promises);
        addToast('Bulk Create', `Registered ${data.length} trailers.`, 'success');
    };

    // Dynamic search for appointment ID if the trailer record doesn't have it
    const findActiveAppointmentId = (trailer: Trailer): string | undefined => {
        if (trailer.currentAppointmentId) return trailer.currentAppointmentId;

        const appt = appointments.find(a =>
            (a.trailerNumber?.toLowerCase() === trailer.number.toLowerCase()) &&
            !['Completed', 'Departed', 'Cancelled'].includes(a.status)
        );
        return appt?.id;
    };

    const openActionMenu = (trailer: Trailer) => {
        const apptId = findActiveAppointmentId(trailer);
        if (apptId) {
            setSelectedApptId(apptId);
            setIsActionOpen(true);
        } else {
            addToast("No Active Appointment", "Could not find an active appointment for this trailer.", "error");
        }
    };

    const getLocationName = (locationId?: string) => {
        if (!locationId) return null;
        const resource = [...docks, ...yardSlots].find(r => r.id === locationId);
        return resource ? resource.name : locationId;
    };

    const toggleCarrierFilter = (id: string) => {
        setCarrierFilterIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    };

    const toggleTypeFilter = (name: string) => {
        setTypeFilterNames(prev => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]);
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <span className="opacity-0 group-hover:opacity-30 ml-1 text-[10px]">&uarr;&darr;</span>;
        }
        return sortConfig.direction === 'asc'
            ? <span className="ml-1 text-primary font-black">&uarr;</span>
            : <span className="ml-1 text-primary font-black">&darr;</span>;
    };

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, statusFilter, carrierFilterIds, typeFilterNames, debouncedLocationSearch, sortConfig]);

    const filteredTrailers = useMemo(() => {
        return trailers.filter(t => {
            // 1. General Search
            const matchesSearch = t.number.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                t.owner.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

            // 2. Status Filter
            const matchesStatus = statusFilter === 'All' || t.status === statusFilter;

            // 3. Carrier Filter (Multi-Select)
            const matchesCarrier = carrierFilterIds.length === 0 ||
                (t.carrierId && carrierFilterIds.some(cfid =>
                    cfid === t.carrierId ||
                    cfid.toLowerCase() === t.carrierId?.toLowerCase() ||
                    t.carrierId?.toLowerCase() === cfid.toLowerCase()
                ));

            // 4. Trailer Type Filter (Multi-Select)
            const matchesType = typeFilterNames.length === 0 ||
                (t.type && typeFilterNames.includes(t.type));

            // 5. Location Filter (Wildcard)
            let matchesLocation = true;
            if (debouncedLocationSearch.trim()) {
                const locName = getLocationName(t.location) || 'Unassigned';
                const safePattern = debouncedLocationSearch.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
                const regex = new RegExp(`^${safePattern}$`, 'i');

                if (!debouncedLocationSearch.includes('*')) {
                    matchesLocation = locName.toLowerCase().includes(debouncedLocationSearch.toLowerCase());
                } else {
                    matchesLocation = regex.test(locName);
                }
            }

            return matchesSearch && matchesStatus && matchesCarrier && matchesType && matchesLocation;
        }).sort((a, b) => {
            if (!sortConfig) return 0;
            const { key, direction } = sortConfig;
            const modifier = direction === 'asc' ? 1 : -1;

            switch (key) {
                case 'number':
                    return a.number.localeCompare(b.number, undefined, { numeric: true }) * modifier;
                case 'type':
                    return (a.type || '').localeCompare(b.type || '') * modifier;
                case 'status':
                    return a.status.localeCompare(b.status) * modifier;
                case 'driver':
                    const driverA = a.currentDriverId ? (drivers.find(d => d.id === a.currentDriverId)?.name || 'Unknown') : '';
                    const driverB = b.currentDriverId ? (drivers.find(d => d.id === b.currentDriverId)?.name || 'Unknown') : '';
                    return driverA.localeCompare(driverB) * modifier;
                case 'carrier':
                    const getCarrier = (trailer: Trailer) => {
                        if (!trailer.carrierId) return trailer.owner || '-';
                        let c = carriers.find(ca => ca.id === trailer.carrierId);
                        if (!c) c = carriers.find(ca => ca.id.toLowerCase() === trailer.carrierId?.toLowerCase());
                        if (!c) c = carriers.find(ca => ca.name.toLowerCase() === trailer.carrierId?.toLowerCase());
                        return c ? c.name : trailer.carrierId;
                    };
                    return getCarrier(a).localeCompare(getCarrier(b)) * modifier;
                case 'location':
                    const locA = getLocationName(a.location) || 'Unknown';
                    const locB = getLocationName(b.location) || 'Unknown';
                    return locA.localeCompare(locB) * modifier;
                default:
                    return 0;
            }
        });
    }, [trailers, debouncedSearchTerm, statusFilter, carrierFilterIds, typeFilterNames, debouncedLocationSearch, drivers, carriers, docks, yardSlots, sortConfig]);

    const paginatedTrailers = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredTrailers.slice(start, start + pageSize);
    }, [filteredTrailers, currentPage, pageSize]);

    const bulkColumns: BulkColumn[] = [
        { key: 'number', label: 'Trailer Number', type: 'text', required: true },
        { key: 'owner', label: 'Owner / Company', type: 'text' },
        {
            key: 'type', label: 'Type', type: 'select',
            options: trailerTypes.map(t => ({ value: t.name, label: t.name }))
        }
    ];

    const isDirty = React.useMemo(() => {
        if (!isModalOpen) return false;
        if (editingTrailer) {
            return number !== editingTrailer.number ||
                type !== editingTrailer.type ||
                carrierId !== (editingTrailer.carrierId || '') ||
                driverId !== (editingTrailer.currentDriverId || '');
        }
        return number !== '' ||
            (type !== (trailerTypes.length > 0 ? trailerTypes[0].name : 'Unknown')) ||
            carrierId !== '' ||
            driverId !== '';
    }, [isModalOpen, editingTrailer, number, type, carrierId, driverId, trailerTypes]);

    return (
        <div className="p-8 h-full flex flex-col animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tighter leading-tight">Equipment Log</h1>
                    <p className="text-muted text-lg font-medium opacity-70">Monitor live asset status and localized positioning.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-8 py-4 rounded-2xl flex items-center gap-3 font-black uppercase tracking-widest text-xs transition-all border-2 ${showFilters ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20' : 'bg-surface border-border text-muted hover:bg-muted/5'}`}
                    >
                        <Filter className="w-5 h-5" />
                        {showFilters ? 'Hide Filters' : 'Advanced Filters'}
                    </button>
                    {canEditTrailers && (
                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsBulkOpen(true)}
                                className="bg-surface border border-border hover:bg-muted/5 text-foreground px-6 py-4 rounded-2xl flex items-center shadow-lg transition-all active:scale-95 font-bold"
                                title="Bulk Create"
                            >
                                <ListPlus className="w-5 h-5 text-primary" />
                            </button>
                            <button
                                onClick={() => handleOpenModal()}
                                className="bg-primary hover:bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center shadow-2xl shadow-primary/30 transition-all active:scale-95 font-black uppercase tracking-widest text-xs"
                            >
                                <Plus className="w-5 h-5 mr-2" />
                                {t('log.add')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showFilters && (
                <GlassCard className="mb-8 p-10 animate-in slide-in-from-top duration-500 rounded-[2.5rem] border-none shadow-2xl !overflow-visible z-50">
                    <div className="flex justify-between items-center mb-10">
                        <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase">Query Filters</h2>
                        <button onClick={clearFilters} className="text-[10px] font-black text-primary hover:text-blue-600 uppercase tracking-[0.2em] transition-colors bg-primary/5 px-4 py-2 rounded-xl">Clear All Logic</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                        {/* Carrier Filter */}
                        <div className="flex-1">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">Carrier Network</label>
                            <MultiSelectDropdown
                                label="Carriers"
                                options={carriers.map(c => ({ id: c.id, name: c.name }))}
                                selectedIds={carrierFilterIds}
                                onToggle={toggleCarrierFilter}
                            />
                        </div>

                        {/* Trailer Type Filter */}
                        <div className="flex-1">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">Equipment Types</label>
                            <MultiSelectDropdown
                                label="Trailer Types"
                                options={trailerTypes.map(t => ({ id: t.name, name: t.name }))}
                                selectedIds={typeFilterNames}
                                onToggle={toggleTypeFilter}
                            />
                        </div>

                        {/* Location Wildcard Filter */}
                        <div className="flex-1">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">Position Link</label>
                            <div className="relative group">
                                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted transition-colors group-focus-within:text-primary" />
                                <input
                                    type="text"
                                    placeholder="Location (e.g. Dock*)"
                                    value={locationSearch}
                                    onChange={(e) => setLocationSearch(e.target.value)}
                                    className="w-full bg-muted/5 border border-border rounded-[1.25rem] pl-14 pr-12 py-4 text-sm text-foreground focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                                />
                                {locationSearch && (
                                    <button
                                        onClick={() => setLocationSearch('')}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted/10 rounded-full text-muted hover:text-foreground transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted px-1">Logistics Status</label>
                        <div className="flex gap-3 w-full overflow-x-auto pb-2 custom-scrollbar">
                            {['All', 'Scheduled', 'GatedIn', 'InYard', 'CheckedIn', 'CheckedOut', 'GatedOut'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2
                                        ${statusFilter === status
                                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                            : 'bg-muted/5 text-muted border-transparent hover:border-border hover:bg-muted/10'}`}
                                >
                                    {status === 'All' ? t('log.statusAll') : status.replace(/([A-Z])/g, ' $1').trim()}
                                </button>
                            ))}
                        </div>
                    </div>
                </GlassCard>
            )}

            <div className="relative mb-8 group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted w-6 h-6 transition-colors group-focus-within:text-primary" />
                <input
                    type="text"
                    placeholder={t('log.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-surface border-2 border-border/50 rounded-[1.5rem] pl-16 pr-6 py-5 font-bold text-foreground outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-xl placeholder:text-muted/40"
                />
            </div>

            <GlassCard className="flex-1 overflow-hidden flex flex-col rounded-[2.5rem] border-none shadow-2xl bg-surface/40">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredTrailers.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-muted">
                            <Truck className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-lg font-medium">{t('log.empty')}</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead className="sticky top-0 bg-surface/95 backdrop-blur-xl z-10 text-[10px] uppercase text-muted font-black tracking-[0.2em] border-b border-border">
                                <tr>
                                    <th onClick={() => handleSort('number')} className="p-10 cursor-pointer group hover:bg-primary/5 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <Truck className="w-3 h-3" />
                                            Trailer {getSortIcon('number')}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('driver')} className="p-8 cursor-pointer group hover:bg-muted/5 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <User className="w-3 h-3" />
                                            Driver {getSortIcon('driver')}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('carrier')} className="p-8 cursor-pointer group hover:bg-muted/5 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="w-3 h-3" />
                                            Carrier {getSortIcon('carrier')}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('location')} className="p-8 cursor-pointer group hover:bg-muted/5 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-3 h-3" />
                                            Location {getSortIcon('location')}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('status')} className="p-8 cursor-pointer group hover:bg-muted/5 transition-colors text-center">
                                        <div className="flex items-center gap-2 justify-center">
                                            <Navigation className="w-3 h-3" />
                                            Status {getSortIcon('status')}
                                        </div>
                                    </th>
                                    <th className="p-8 text-right pr-12">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50 bg-surface/30">
                                {paginatedTrailers.map(trailer => {
                                    const canInstruct = ['GatedIn', 'MovingToDock', 'ReadyForCheckIn', 'CheckedIn', 'ReadyForCheckOut', 'CheckedOut', 'MovingToYard', 'InYard'].includes(trailer.status);
                                    const driverName = drivers.find(d => d.id === trailer.currentDriverId)?.name || 'Unknown Driver';
                                    const carrierName = (() => {
                                        if (!trailer.carrierId) return trailer.owner || '-';
                                        let c = carriers.find(ca => ca.id === trailer.carrierId);
                                        if (!c) c = carriers.find(ca => ca.id.toLowerCase() === trailer.carrierId?.toLowerCase());
                                        if (!c) c = carriers.find(ca => ca.name.toLowerCase() === trailer.carrierId?.toLowerCase());
                                        return c ? c.name : trailer.carrierId;
                                    })();
                                    const locationName = getLocationName(trailer.location);
                                    const hasActiveAppt = !!findActiveAppointmentId(trailer);

                                    return (
                                        <tr
                                            key={trailer.id}
                                            className="hover:bg-muted/5 transition-all group cursor-pointer relative border-l-4 border-l-transparent hover:border-l-primary"
                                            onClick={() => handleOpenModal(trailer)}
                                        >
                                            <td className="p-8">
                                                <div className="flex items-center gap-5">
                                                    <div className={`p-4 rounded-[1.25rem] transition-all group-hover:scale-110 group-hover:rotate-3 shadow-lg bg-primary/10 text-primary`}>
                                                        <Truck className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-foreground text-lg tracking-tighter leading-none">{trailer.number}</div>
                                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted opacity-60 mt-2">{trailer.type || 'Unknown'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-8">
                                                <div className="flex items-center gap-3.5">
                                                    <div className="w-10 h-10 rounded-full bg-muted/5 border border-border flex items-center justify-center group-hover:border-primary/30 transition-colors">
                                                        <User className="w-5 h-5 text-muted group-hover:text-primary transition-colors" />
                                                    </div>
                                                    <span className="text-foreground font-bold text-base tracking-tight">{driverName}</span>
                                                </div>
                                            </td>
                                            <td className="p-8">
                                                <div className="font-black uppercase tracking-widest text-sm text-primary group-hover:tracking-[0.1em] transition-all duration-300 truncate max-w-[200px]">{carrierName}</div>
                                            </td>
                                            <td className="p-8">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className={`w-4 h-4 ${locationName ? 'text-primary' : 'text-muted/40'}`} />
                                                    <span className={`text-sm font-black ${locationName ? 'text-foreground' : 'text-muted italic'}`}>
                                                        {locationName || 'Unassigned'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-8 text-center">
                                                <span className={`inline-flex items-center px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border-2
                                                    ${trailer.status === 'CheckedIn' ? 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 border-emerald-500/20' :
                                                        ['GatedIn', 'MovingToDock', 'MovingToYard'].includes(trailer.status) ? 'bg-primary/5 text-primary border-primary/20' :
                                                            ['ReadyForCheckIn', 'ReadyForCheckOut'].includes(trailer.status) ? 'bg-orange-500/5 text-orange-600 dark:text-orange-500 border-orange-500/20 shadow-lg shadow-orange-500/10' :
                                                                'bg-muted/10 text-muted border-border/20'
                                                    }
                                                `}>
                                                    {trailer.status.replace(/([A-Z])/g, ' $1').trim()}
                                                </span>
                                            </td>
                                            <td className="p-8 text-right pr-12 whitespace-nowrap overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end gap-3 items-center transition-all duration-300 translate-x-12 group-hover:translate-x-0">
                                                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                                        {canEditTrailers && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleOpenModal(trailer)}
                                                                    className="w-12 h-12 flex items-center justify-center bg-muted/10 hover:bg-primary hover:text-white rounded-[1rem] text-muted transition-all shadow-lg hover:shadow-primary/30"
                                                                    title="Edit"
                                                                >
                                                                    <Edit2 className="w-5 h-5" />
                                                                </button>
                                                                {trailer.status === 'Scheduled' && (
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (window.confirm(`Are you sure you want to cancel trailer ${trailer.number}?`)) {
                                                                                try {
                                                                                    await updateTrailer(trailer.id, { status: 'Cancelled' });
                                                                                    addToast('Success', `Trailer ${trailer.number} cancelled.`, 'success');
                                                                                } catch (e: any) {
                                                                                    addToast('Error', e.message, 'error');
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="w-12 h-12 flex items-center justify-center bg-red-500/10 hover:bg-red-500 hover:text-white rounded-[1rem] text-red-600 transition-all shadow-lg hover:shadow-red-500/30"
                                                                        title="Cancel"
                                                                    >
                                                                        <X className="w-5 h-5" />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}

                                                        {canInstruct && hasActiveAppt && canEditTrailers && (
                                                            <button
                                                                onClick={() => openActionMenu(trailer)}
                                                                className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95"
                                                                title="Driver Instruction"
                                                            >
                                                                <Navigation className="w-4 h-4" /> Instruct
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </GlassCard>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                isDirty={isDirty}
                title={`${editingTrailer ? (canEditTrailers ? t('common.edit') : 'View') : t('common.add')} Trailer`}
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-2">Trailer Number *</label>
                            <input disabled={!canEditTrailers} required value={number} onChange={e => setNumber(e.target.value)} className={`w-full bg-muted/5 border border-border rounded-xl p-4 text-foreground font-bold focus:border-primary outline-none transition-all ${!canEditTrailers && 'opacity-60 cursor-not-allowed'}`} placeholder="e.g. TR-1234" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-2">Type</label>
                            <select disabled={!canEditTrailers} value={type} onChange={e => setType(e.target.value)} className={`w-full bg-muted/5 border border-border rounded-xl p-4 text-foreground font-bold focus:border-primary outline-none appearance-none ${!canEditTrailers && 'opacity-60 cursor-not-allowed'}`}>
                                {trailerTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-2">Carrier</label>
                        <select
                            value={carrierId}
                            onChange={e => handleCarrierChange(e.target.value)}
                            disabled={isCarrierLocked || !canEditTrailers}
                            className={`w-full bg-muted/5 border border-border rounded-xl p-4 text-foreground font-bold focus:border-primary outline-none appearance-none transition-all ${(isCarrierLocked || !canEditTrailers) ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            <option value="">-- Select Carrier --</option>
                            {carriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        {isCarrierLocked && canEditTrailers && <p className="text-[10px] text-primary mt-2 font-bold italic">* Locked to selected Driver's carrier</p>}
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-muted">Current Driver</label>
                            {canEditTrailers && (
                                <button
                                    type="button"
                                    onClick={() => setIsQuickAddDriverOpen(true)}
                                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-blue-600 flex items-center gap-1.5"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Quick Add
                                </button>
                            )}
                        </div>
                        <select disabled={!canEditTrailers} value={driverId} onChange={e => handleDriverChange(e.target.value)} className={`w-full bg-muted/5 border border-border rounded-xl p-4 text-foreground font-bold focus:border-primary outline-none appearance-none transition-all ${!canEditTrailers && 'opacity-60 cursor-not-allowed'}`}>
                            <option value="">-- Select Driver --</option>
                            {filteredDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>

                    <div className="flex justify-end gap-5 pt-8 border-t border-border/50">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-sm font-black uppercase tracking-widest text-muted hover:text-foreground transition-colors">{t('common.dismiss')}</button>
                        {canEditTrailers && (
                            <button type="submit" className="px-10 py-4 bg-primary hover:bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/30 transition-all active:scale-95">Save</button>
                        )}
                    </div>
                </form>
            </Modal>

            {selectedApptId && (
                <TrailerActionModal
                    isOpen={isActionOpen}
                    onClose={() => { setIsActionOpen(false); setSelectedApptId(null); }}
                    appointmentId={selectedApptId}
                />
            )}

            <QuickAddDriverModal
                isOpen={isQuickAddDriverOpen}
                onClose={() => setIsQuickAddDriverOpen(false)}
                onSuccess={handleQuickAddSuccess}
            />

            <BulkCreatorModal
                isOpen={isBulkOpen}
                onClose={() => setIsBulkOpen(false)}
                title="Bulk Register Trailers"
                subtitle="Add multiple equipment records."
                columns={bulkColumns}
                onSubmit={handleBulkSave}
            />
        </div>
    );
};
