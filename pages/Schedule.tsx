import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { AppointmentModal } from '../components/AppointmentModal';
import { SuggestTimeModal } from '../components/SuggestTimeModal';
import { AppointmentDetailsModal } from '../components/AppointmentDetailsModal';
import { DatePicker } from '../components/ui/DatePicker';
import { Pagination } from '../components/ui/Pagination';
import { Search, Plus, Clock, Edit2, Ban, Truck, User, Calendar, FileText, CheckCircle2, AlertTriangle, ArrowRight, ChevronDown, X, Check, Eye, Sparkles, Filter } from 'lucide-react';
import { AIScheduleModal } from '../components/AIScheduleModal';
import { DeleteConfirmationModal } from '../components/ui/DeleteConfirmationModal';
import { Appointment } from '../types';
import { VIEW_IDS } from '../constants';

// --- MultiSelect Dropdown Component (Local Definition) ---
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

export const Schedule: React.FC = () => {
    const { appointments, trailers, addToast, updateAppointment, cancelAppointment, deleteAppointment, carriers, trailerTypes, t, formatDateTime, formatDate, canEdit, settings } = useData();

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Scheduled' | 'CheckedIn' | 'Completed' | 'Cancelled' | 'Departed' | 'PendingApproval' | 'Rejected' | 'ReadyForCheckIn'>('All');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Advanced Filters (Multi-Select)
    const [carrierFilterIds, setCarrierFilterIds] = useState<string[]>([]);
    const [typeFilterNames, setTypeFilterNames] = useState<string[]>([]);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'startTime', direction: 'asc' });

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
    const [appointmentToProcess, setAppointmentToProcess] = useState<string | null>(null);

    // Read Only Details Modal State
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedDetailsApptId, setSelectedDetailsApptId] = useState<string | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const canEditSchedule = canEdit(VIEW_IDS.SCHEDULE);
    const [showFilters, setShowFilters] = useState(false);

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('All');
        setStartDate('');
        setCarrierFilterIds([]);
        setTypeFilterNames([]);
    };

    // Actions
    const handleCancelClick = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setAppointmentToProcess(id);
        setIsCancelModalOpen(true);
    };

    const handleConfirmCancel = async () => {
        if (appointmentToProcess) {
            try {
                await cancelAppointment(appointmentToProcess);
                addToast('Success', 'Appointment cancelled successfully.', 'success');
            } catch (err: any) {
                console.error(err);
                addToast('Cancellation Failed', err.message || 'Unknown error occurred.', 'error');
            }
            setAppointmentToProcess(null);
        }
    };

    const handleEdit = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent row click
        setEditingId(id);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingId(null);
        setIsModalOpen(true);
    };

    const handleApprove = async (id: string) => {
        await updateAppointment(id, { status: 'Scheduled' });
        addToast('Approved', 'Appointment approved and scheduled.', 'success');
    };

    const handleRejectClick = (id: string) => {
        const appt = appointments.find(a => a.id === id);
        if (appt?.acknowledgementStatus === 'RescheduleSuggested') {
            setAppointmentToProcess(id);
            setIsRejectModalOpen(true);
        } else {
            setAppointmentToProcess(id);
            setIsSuggestModalOpen(true);
        }
    };

    const handleConfirmFullReject = async () => {
        if (appointmentToProcess) {
            await updateAppointment(appointmentToProcess, {
                status: 'Rejected',
                acknowledgementStatus: 'Rejected'
            });
            setIsRejectModalOpen(false);
            setAppointmentToProcess(null);
            addToast('Rejected', 'Appointment fully rejected.', 'info');
        }
    };

    const handleSuggestConfirm = async (suggestedTime: string) => {
        if (appointmentToProcess) {
            await updateAppointment(appointmentToProcess, {
                suggestedStartTime: suggestedTime,
                acknowledgementStatus: 'RescheduleSuggested'
            });
            setIsSuggestModalOpen(false);
            setAppointmentToProcess(null);
            addToast('Suggestion Sent', 'Alternate time has been suggested.', 'success');
        }
    };

    const handleConfirmReject = handleConfirmFullReject; // Fallback for any legacy calls

    const handleRowClick = (id: string) => {
        setSelectedDetailsApptId(id);
        setIsDetailsModalOpen(true);
    };

    const getCarrierName = (id?: string) => {
        if (!id) return '-';
        // Try exact match first
        let c = carriers.find(c => c.id === id);
        // Try case-insensitive match
        if (!c) c = carriers.find(c => c.id.toLowerCase() === id.toLowerCase());
        // Try matching by name as fallback
        if (!c) c = carriers.find(c => c.name.toLowerCase() === id.toLowerCase());
        return c ? c.name : id;
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

    const filteredAppointments = appointments.filter(a => {
        // 1. General Search
        const matchText =
            (a.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (a.trailerNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.id.toLowerCase().includes(searchTerm.toLowerCase()));

        if (!matchText) return false;

        // 2. Status Filter
        if (statusFilter !== 'All' && a.status !== statusFilter) return false;

        // 3. Date Filter
        if (startDate && new Date(a.startTime) < new Date(startDate)) return false;
        if (endDate && new Date(a.startTime) > new Date(new Date(endDate).setHours(23, 59, 59))) return false;

        // 4. Carrier Filter (Multi-Select)
        if (carrierFilterIds.length > 0) {
            if (!a.carrierId || !carrierFilterIds.includes(a.carrierId)) return false;
        }

        // 5. Trailer Type Filter (Multi-Select)
        if (typeFilterNames.length > 0) {
            if (!a.trailerType || !typeFilterNames.includes(a.trailerType)) return false;
        }

        return true;
    }).sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        const modifier = direction === 'asc' ? 1 : -1;

        switch (key) {
            case 'startTime':
                return (new Date(a.startTime).getTime() - new Date(b.startTime).getTime()) * modifier;
            case 'trailerNumber':
                const numA = a.isBobtail ? 'Bobtail' : (a.trailerNumber || '');
                const numB = b.isBobtail ? 'Bobtail' : (b.trailerNumber || '');
                return numA.localeCompare(numB, undefined, { numeric: true }) * modifier;
            case 'driverName':
                return (a.driverName || '').localeCompare(b.driverName || '') * modifier;
            case 'carrierId':
                const carrierA = getCarrierName(a.carrierId);
                const carrierB = getCarrierName(b.carrierId);
                return carrierA.localeCompare(carrierB) * modifier;
            case 'status':
                return a.status.localeCompare(b.status) * modifier;
            default:
                return 0;
        }
    });

    const paginatedAppointments = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredAppointments.slice(start, start + pageSize);
    }, [filteredAppointments, currentPage, pageSize]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, startDate, endDate, carrierFilterIds, typeFilterNames]);

    return (
        <div className="p-8 h-full flex flex-col animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tighter leading-tight">Appointment Schedule</h1>
                    <p className="text-muted text-lg font-medium opacity-70">{t('schedule.subtitle')}</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-8 py-4 rounded-2xl flex items-center gap-3 font-black uppercase tracking-widest text-xs transition-all border-2 ${showFilters ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20' : 'bg-surface border-border text-muted hover:bg-muted/5'}`}
                    >
                        <Filter className="w-5 h-5" />
                        {showFilters ? 'Hide Filters' : 'Advanced Filters'}
                    </button>
                    <button
                        onClick={() => setIsAiModalOpen(true)}
                        className="bg-surface border border-border hover:bg-muted/5 text-foreground px-6 py-4 rounded-2xl flex items-center shadow-lg transition-all active:scale-95 font-bold"
                        title="AI Automation"
                    >
                        <Sparkles className="w-5 h-5 mr-3 text-primary animate-pulse" />
                        AI Optimizer
                    </button>
                    {canEditSchedule && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-primary hover:bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center shadow-2xl shadow-primary/30 transition-all active:scale-95 font-black uppercase tracking-widest text-xs"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            {t('schedule.add')}
                        </button>
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
                        <div className="flex-1">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">Planned Date</label>
                            <div className="relative group">
                                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted transition-colors group-focus-within:text-primary z-10" />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-muted/5 border border-border rounded-[1.25rem] pl-14 pr-6 py-4 text-sm text-foreground focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold appearance-none cursor-pointer"
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">Carrier Network</label>
                            <MultiSelectDropdown
                                label={t('common.carrier')}
                                options={carriers.map(c => ({ id: c.id, name: c.name }))}
                                selectedIds={carrierFilterIds}
                                onToggle={(id) => setCarrierFilterIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">Equipment Types</label>
                            <MultiSelectDropdown
                                label="Trailer Types"
                                options={trailerTypes.map(t => ({ id: t.name, name: t.name }))}
                                selectedIds={typeFilterNames}
                                onToggle={(id) => setTypeFilterNames(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted px-1">Operational Status</label>
                        <div className="flex gap-3 w-full overflow-x-auto pb-2 custom-scrollbar">
                            {['All', 'PendingApproval', 'Scheduled', 'ReadyForCheckIn', 'CheckedIn', 'Completed', 'Departed', 'Cancelled', 'Rejected'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status as any)}
                                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2
                                        ${statusFilter === status
                                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                            : 'bg-muted/5 text-muted border-transparent hover:border-border hover:bg-muted/10'}`}
                                >
                                    {status === 'All' ? 'All Statuses' : status.replace(/([A-Z])/g, ' $1').trim()}
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
                    placeholder={t('schedule.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-surface border-2 border-border/50 rounded-[1.5rem] pl-16 pr-6 py-5 font-bold text-foreground outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-xl placeholder:text-muted/40"
                />
            </div>

            <GlassCard className="flex-1 overflow-hidden flex flex-col rounded-[2.5rem] border-none shadow-2xl bg-surface/40">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead className="sticky top-0 bg-surface/95 backdrop-blur-xl z-10 text-[10px] uppercase text-muted font-black tracking-[0.2em] border-b border-border">
                            <tr>
                                <th onClick={() => handleSort('startTime')} className="p-10 cursor-pointer group hover:bg-primary/5 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3 h-3" />
                                        {t('schedule.time')} {getSortIcon('startTime')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('trailerNumber')} className="p-8 cursor-pointer group hover:bg-muted/5 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Truck className="w-3 h-3" />
                                        {t('common.trailer')} {getSortIcon('trailerNumber')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('driverName')} className="p-8 cursor-pointer group hover:bg-muted/5 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <User className="w-3 h-3" />
                                        {t('common.driver')} {getSortIcon('driverName')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('carrierId')} className="p-8 cursor-pointer group hover:bg-muted/5 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-3 h-3" />
                                        {t('common.carrier')} {getSortIcon('carrierId')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('status')} className="p-8 cursor-pointer group hover:bg-muted/5 transition-colors text-center">
                                    <div className="flex items-center gap-2 justify-center">
                                        <CheckCircle2 className="w-3 h-3" />
                                        {t('common.status')} {getSortIcon('status')}
                                    </div>
                                </th>
                                <th className="p-8 text-right pr-12">
                                    {t('common.actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50 bg-surface/30">
                            {filteredAppointments.length === 0 ? (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="h-64 flex flex-col items-center justify-center text-muted">
                                            <Calendar className="w-12 h-12 mb-4 opacity-20" />
                                            <p className="text-lg font-medium">{t('schedule.emptyTitle')}</p>
                                            <p className="text-sm mt-1">{t('schedule.emptyDesc')}</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedAppointments.map(appt => {

                                    const associatedTrailer = trailers.find(t => (t.number || '').toLowerCase() === (appt.trailerNumber || '').toLowerCase());
                                    const isTrailerSafe = !associatedTrailer || associatedTrailer.status === 'Scheduled';
                                    const canCancel = appt.status === 'Scheduled' && isTrailerSafe && canEditSchedule;
                                    const canModify = ['Scheduled', 'GatedIn', 'MovingToDock', 'ReadyForCheckIn'].includes(appt.status);

                                    return (
                                        <tr
                                            key={appt.id}
                                            className="hover:bg-muted/5 transition-all group cursor-pointer relative border-l-4 border-l-transparent hover:border-l-primary"
                                            onClick={() => handleRowClick(appt.id)}
                                        >
                                            <td className="p-8">
                                                <div className="flex items-center text-foreground font-black tracking-tighter text-xl">
                                                    <Clock className="w-5 h-5 mr-3 text-primary opacity-80" />
                                                    {new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted opacity-60 mt-2 pl-8">
                                                    {formatDate(appt.startTime)}
                                                </div>
                                            </td>
                                            <td className="p-8">
                                                <div className="flex items-center gap-5">
                                                    <div className={`p-4 rounded-[1.25rem] transition-all group-hover:scale-110 group-hover:rotate-3 shadow-lg ${appt.isBobtail ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'bg-primary/10 text-primary'}`}>
                                                        <Truck className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-foreground text-lg tracking-tighter leading-none">{appt.isBobtail ? 'Bobtail' : appt.trailerNumber}</div>
                                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted opacity-60 mt-2">{appt.trailerType || 'N/A'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-8">
                                                <div className="flex items-center gap-3.5">
                                                    <div className="w-10 h-10 rounded-full bg-muted/5 border border-border flex items-center justify-center group-hover:border-primary/30 transition-colors">
                                                        <User className="w-5 h-5 text-muted group-hover:text-primary transition-colors" />
                                                    </div>
                                                    <span className="text-foreground font-bold text-base tracking-tight">{appt.driverName}</span>
                                                </div>
                                            </td>
                                            <td className="p-8">
                                                <div className="font-black uppercase tracking-widest text-sm text-primary group-hover:tracking-[0.1em] transition-all duration-300">{getCarrierName(appt.carrierId)}</div>
                                                {appt.carrierId && carriers.find(c => c.id === appt.carrierId)?.bufferTimeMinutes !== undefined && (
                                                    <div className="text-[10px] text-primary font-black uppercase flex items-center gap-1.5 mt-2 opacity-70">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        Buffer: {carriers.find(c => c.id === appt.carrierId)?.bufferTimeMinutes}m
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-8 text-center">
                                                <span className={`inline-flex items-center px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border-2
                                                    ${appt.status === 'Scheduled' ? 'bg-primary/5 text-primary border-primary/20' :
                                                        appt.status === 'CheckedIn' ? 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 border-emerald-500/20' :
                                                            appt.status === 'Cancelled' || appt.status === 'Rejected' ? 'bg-red-500/5 text-red-600 dark:text-red-500 border-red-500/20 shadow-lg shadow-red-500/10' :
                                                                appt.status === 'Completed' ? 'bg-orange-500/5 text-orange-600 dark:text-orange-500 border-orange-500/20' :
                                                                    appt.status === 'PendingApproval' ? 'bg-amber-500/5 text-amber-600 dark:text-amber-500 border-amber-500/20 animate-pulse' :
                                                                        'bg-muted/10 text-muted border-border/20'
                                                    }
                                                `}>
                                                    {appt.status.replace(/([A-Z])/g, ' $1').trim()}
                                                </span>
                                            </td>
                                            <td className="p-8 text-right pr-12 whitespace-nowrap overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end gap-3 items-center transition-all duration-300 translate-x-12 group-hover:translate-x-0">
                                                    {appt.status === 'PendingApproval' && canEditSchedule && (
                                                        <div className="flex gap-2.5">
                                                            <button
                                                                onClick={() => handleApprove(appt.id)}
                                                                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2"
                                                            >
                                                                <Check className="w-4 h-4" /> Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectClick(appt.id)}
                                                                className="px-6 py-3 bg-surface border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 flex items-center gap-2 shadow-lg"
                                                            >
                                                                <X className="w-4 h-4" /> Reject
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                                        {canCancel && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleCancelClick(e, appt.id)}
                                                                className="w-12 h-12 flex items-center justify-center bg-red-500/10 hover:bg-red-500 hover:text-white rounded-[1rem] text-red-600 transition-all shadow-lg hover:shadow-red-500/30"
                                                                title="Cancel Appointment"
                                                            >
                                                                <Ban className="w-5 h-5" />
                                                            </button>
                                                        )}

                                                        {canModify && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => canEditSchedule ? handleEdit(e, appt.id) : null}
                                                                className={`w-12 h-12 flex items-center justify-center rounded-[1rem] transition-all shadow-lg ${canEditSchedule ? 'bg-muted/10 hover:bg-primary hover:text-white text-muted cursor-pointer hover:shadow-primary/30' : 'bg-transparent text-muted cursor-default opacity-50'}`}
                                                                title={canEditSchedule ? "Edit" : "View Only"}
                                                            >
                                                                {canEditSchedule ? <Edit2 className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredAppointments.length / pageSize)}
                    onPageChange={setCurrentPage}
                    totalRecords={filteredAppointments.length}
                    pageSize={pageSize}
                />
            </GlassCard>

            <AppointmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                editingId={editingId}
            />

            <AIScheduleModal
                isOpen={isAiModalOpen}
                onClose={() => setIsAiModalOpen(false)}
            />

            <DeleteConfirmationModal
                isOpen={isCancelModalOpen}
                onClose={() => setIsCancelModalOpen(false)}
                onConfirm={handleConfirmCancel}
                title="Cancel Appointment"
                message="Are you sure you want to cancel this appointment? This will release the dock and update the trailer's scheduling priority."
            />

            <DeleteConfirmationModal
                isOpen={isRejectModalOpen}
                onClose={() => setIsRejectModalOpen(false)}
                onConfirm={handleConfirmFullReject}
                title="Reject Request"
                message="Are you sure you want to completely reject this appointment request? This will notify the carrier that their request is cancelled."
            />

            <SuggestTimeModal
                isOpen={isSuggestModalOpen}
                onClose={() => setIsSuggestModalOpen(false)}
                onConfirm={handleSuggestConfirm}
                currentStartTime={appointmentToProcess ? appointments.find(a => a.id === appointmentToProcess)?.startTime || new Date().toISOString() : new Date().toISOString()}
            />

            <AppointmentDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => { setIsDetailsModalOpen(false); setSelectedDetailsApptId(null); }}
                appointmentId={selectedDetailsApptId || ''}
            />
        </div >
    );
};
