
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Trailer } from '../types';
import { Plus, Edit2, Search, Truck, MapPin, Calendar, Clock, ListPlus, User, Briefcase, FileText, ArrowRightCircle, Filter, ChevronDown, X, Navigation, Eye } from 'lucide-react';
import { ModalPortal } from '../components/ui/ModalPortal';
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
                className={`w-full flex items-center justify-between bg-slate-100 dark:bg-black/20 border ${isOpen ? 'border-blue-500' : 'border-slate-200 dark:border-white/10'} rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-gray-200 transition-all`}
            >
                <span className="truncate">
                    {selectedCount === 0 ? label : `${label} (${selectedCount})`}
                </span>
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 max-h-60 overflow-y-auto custom-scrollbar bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-[100] p-2">
                    {options.length === 0 ? (
                        <div className="p-2 text-xs text-slate-400 text-center">No options available</div>
                    ) : (
                        options.map(opt => (
                            <label key={opt.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(opt.id)}
                                    onChange={() => onToggle(opt.id)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-700 dark:text-gray-300 truncate">{opt.name}</span>
                            </label>
                        ))
                    )}
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
            ? <span className="ml-1 text-blue-500 font-bold">&uarr;</span>
            : <span className="ml-1 text-blue-500 font-bold">&darr;</span>;
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

    return (
        <div className="p-8 h-full flex flex-col animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('log.title')}</h1>
                    <p className="text-slate-500 dark:text-gray-400">{t('log.subtitle')}</p>
                </div>
                {canEditTrailers && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsBulkOpen(true)}
                            className="bg-slate-800 dark:bg-white/20 hover:bg-slate-700 dark:hover:bg-white/30 text-white px-4 py-3 rounded-xl flex items-center shadow-lg transition-all active:scale-95 font-bold"
                            title="Bulk Create"
                        >
                            <ListPlus className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-[#0a84ff] hover:bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center shadow-lg shadow-blue-500/30 transition-all active:scale-95 font-medium"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            {t('log.add')}
                        </button>
                    </div>
                )}
            </div>

            <GlassCard className="mb-6 p-4 !overflow-visible z-50">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
                    {/* General Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500" />
                        <input
                            type="text"
                            placeholder={t('log.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 outline-none"
                        />
                    </div>

                    {/* Carrier Filter */}
                    <div className="flex-1">
                        <MultiSelectDropdown
                            label="Carriers"
                            options={carriers.map(c => ({ id: c.id, name: c.name }))}
                            selectedIds={carrierFilterIds}
                            onToggle={toggleCarrierFilter}
                        />
                    </div>

                    {/* Trailer Type Filter */}
                    <div className="flex-1">
                        <MultiSelectDropdown
                            label="Trailer Types"
                            options={trailerTypes.map(t => ({ id: t.name, name: t.name }))}
                            selectedIds={typeFilterNames}
                            onToggle={toggleTypeFilter}
                        />
                    </div>

                    {/* Location Wildcard Filter */}
                    <div className="relative flex-1">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500" />
                        <input
                            type="text"
                            placeholder="Location (e.g. Dock*)"
                            value={locationSearch}
                            onChange={(e) => setLocationSearch(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 outline-none"
                        />
                        {locationSearch && (
                            <button
                                onClick={() => setLocationSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 w-full overflow-x-auto pb-1 custom-scrollbar">
                    {['All', 'Scheduled', 'GatedIn', 'InYard', 'CheckedIn', 'CheckedOut', 'GatedOut'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${statusFilter === status ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                        >
                            {status === 'All' ? t('log.statusAll') : status}
                        </button>
                    ))}
                </div>
            </GlassCard>

            <GlassCard className="flex-1 overflow-hidden flex flex-col p-0">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredTrailers.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-gray-500">
                            <Truck className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg font-medium">{t('log.empty')}</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead className="sticky top-0 bg-slate-50 dark:bg-[#1a1a1a] z-10 text-xs uppercase text-slate-500 dark:text-gray-500 font-bold tracking-wider">
                                <tr>
                                    <th className="p-5 border-b border-slate-200 dark:border-white/10 w-2"></th>
                                    <th onClick={() => handleSort('number')} className="p-5 border-b border-slate-200 dark:border-white/10 cursor-pointer group hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                        Trailer {getSortIcon('number')}
                                    </th>
                                    <th onClick={() => handleSort('driver')} className="p-5 border-b border-slate-200 dark:border-white/10 cursor-pointer group hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                        Driver {getSortIcon('driver')}
                                    </th>
                                    <th onClick={() => handleSort('carrier')} className="p-5 border-b border-slate-200 dark:border-white/10 cursor-pointer group hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                        Carrier {getSortIcon('carrier')}
                                    </th>
                                    <th onClick={() => handleSort('location')} className="p-5 border-b border-slate-200 dark:border-white/10 cursor-pointer group hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                        Location {getSortIcon('location')}
                                    </th>
                                    <th onClick={() => handleSort('status')} className="p-5 border-b border-slate-200 dark:border-white/10 cursor-pointer group hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                        Status {getSortIcon('status')}
                                    </th>
                                    <th className="p-5 border-b border-slate-200 dark:border-white/10">Documents</th>
                                    <th className="p-5 border-b border-slate-200 dark:border-white/10 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
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
                                    const docCount = (trailer.documents?.length || 0) + (trailer.ewayBillNumber ? 1 : 0);
                                    const hasActiveAppt = !!findActiveAppointmentId(trailer);

                                    let statusColor = "bg-slate-500";
                                    let statusBg = "bg-slate-100 dark:bg-white/5";
                                    let statusText = "text-slate-500";

                                    if (trailer.status === 'CheckedIn') {
                                        statusColor = "bg-emerald-500";
                                        statusBg = "bg-emerald-500/10";
                                        statusText = "text-emerald-600 dark:text-emerald-400";
                                    } else if (['GatedIn', 'MovingToDock', 'MovingToYard'].includes(trailer.status)) {
                                        statusColor = "bg-blue-500";
                                        statusBg = "bg-blue-500/10";
                                        statusText = "text-blue-600 dark:text-blue-400";
                                    } else if (['ReadyForCheckIn', 'ReadyForCheckOut'].includes(trailer.status)) {
                                        statusColor = "bg-orange-500";
                                        statusBg = "bg-orange-500/10";
                                        statusText = "text-orange-600 dark:text-orange-400";
                                    }

                                    return (
                                        <tr key={trailer.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group relative">
                                            <td className="p-0 w-2">
                                                <div className={`w-1 h-full absolute left-0 top-0 bottom-0 ${statusColor}`}></div>
                                            </td>
                                            <td className="p-4 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400`}>
                                                        <Truck className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 dark:text-white">{trailer.number}</div>
                                                        <div className="text-xs text-slate-500 dark:text-gray-500">{trailer.type || 'Unknown'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-sm font-medium text-slate-600 dark:text-gray-300">{driverName}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-sm font-medium text-slate-600 dark:text-gray-300 truncate max-w-[150px]">{carrierName}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className={`w-3.5 h-3.5 ${locationName ? 'text-slate-400' : 'text-slate-300 dark:text-slate-600'}`} />
                                                    <span className={`text-sm font-medium ${locationName ? 'text-slate-600 dark:text-gray-300' : 'text-slate-400 italic'}`}>
                                                        {locationName || 'Unassigned'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-transparent ${statusBg} ${statusText}`}>
                                                    {trailer.status.replace(/([A-Z])/g, ' $1').trim()}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-sm font-medium text-slate-600 dark:text-gray-300">
                                                        {docCount > 0 ? `${docCount} Files` : '-'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right pr-6">
                                                <div className="flex justify-end gap-2 items-center">
                                                    {canEditTrailers ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleOpenModal(trailer)}
                                                                className="p-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                                                                title="Edit Trailer"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
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
                                                                    className="p-2 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg text-red-600 dark:text-red-400 transition-colors"
                                                                    title="Cancel Trailer"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleOpenModal(trailer)}
                                                            className="p-2 bg-transparent text-slate-400 cursor-default opacity-50"
                                                            title="View details"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    {canInstruct && hasActiveAppt && canEditTrailers && (
                                                        <button
                                                            onClick={() => openActionMenu(trailer)}
                                                            className="p-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors"
                                                            title="Driver Instruction"
                                                        >
                                                            <Navigation className="w-4 h-4" />
                                                        </button>
                                                    )}
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

            {isModalOpen && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                            <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">{editingTrailer ? (canEditTrailers ? t('common.edit') : 'View') : t('common.add')} Trailer</h2>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1">Trailer Number *</label>
                                        <input disabled={!canEditTrailers} required value={number} onChange={e => setNumber(e.target.value)} className={`w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-blue-500 outline-none ${!canEditTrailers && 'opacity-60 cursor-not-allowed'}`} placeholder="e.g. TR-1234" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1">Type</label>
                                        <select disabled={!canEditTrailers} value={type} onChange={e => setType(e.target.value)} className={`w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-blue-500 outline-none appearance-none ${!canEditTrailers && 'opacity-60 cursor-not-allowed'}`}>
                                            {trailerTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1">Carrier</label>
                                    <select
                                        value={carrierId}
                                        onChange={e => setCarrierId(e.target.value)}
                                        disabled={isCarrierLocked || !canEditTrailers}
                                        className={`w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-blue-500 outline-none appearance-none ${(isCarrierLocked || !canEditTrailers) ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    >
                                        <option value="">-- Select Carrier --</option>
                                        {carriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    {isCarrierLocked && canEditTrailers && <p className="text-[10px] text-blue-500 mt-1 italic">* Locked to selected Driver's carrier</p>}
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-xs font-bold text-slate-500 dark:text-gray-400">Current Driver</label>
                                        {canEditTrailers && (
                                            <button
                                                type="button"
                                                onClick={() => setIsQuickAddDriverOpen(true)}
                                                className="text-[10px] font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" /> Quick Add
                                            </button>
                                        )}
                                    </div>
                                    <select disabled={!canEditTrailers} value={driverId} onChange={e => handleDriverChange(e.target.value)} className={`w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-blue-500 outline-none appearance-none ${!canEditTrailers && 'opacity-60 cursor-not-allowed'}`}>
                                        <option value="">-- Select Driver --</option>
                                        {filteredDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white font-bold text-sm">Cancel</button>
                                    {canEditTrailers && (
                                        <button type="submit" className="px-6 py-2 bg-[#0a84ff] hover:bg-blue-600 text-white rounded-lg font-bold text-sm shadow-lg">Save</button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}

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
