
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { AppointmentModal } from '../components/AppointmentModal';
import { DatePicker } from '../components/ui/DatePicker';
import { Pagination } from '../components/ui/Pagination';
import { Search, Plus, Clock, Edit2, Ban, Truck, User, Calendar, FileText, CheckCircle2, AlertTriangle, ArrowRight, ChevronDown, X, Check, Eye, Sparkles } from 'lucide-react';
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
    const [appointmentToProcess, setAppointmentToProcess] = useState<string | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const canEditSchedule = canEdit(VIEW_IDS.SCHEDULE);

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
        e.stopPropagation();
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
        setAppointmentToProcess(id);
        setIsRejectModalOpen(true);
    };

    const handleConfirmReject = async () => {
        if (appointmentToProcess) {
            await updateAppointment(appointmentToProcess, { status: 'Rejected' });
            addToast('Rejected', 'Appointment request rejected.', 'info');
            setAppointmentToProcess(null);
        }
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
            ? <span className="ml-1 text-blue-500 font-bold">&uarr;</span>
            : <span className="ml-1 text-blue-500 font-bold">&darr;</span>;
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
        <div className="p-8 h-full flex flex-col animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('schedule.title')}</h1>
                    <p className="text-slate-500 dark:text-gray-400">{t('schedule.subtitle')}</p>
                </div>
                {canEditSchedule && (
                    <div className="flex items-center gap-3">
                        {settings.enableAiSchedule !== false && (
                            <button
                                onClick={() => setIsAiModalOpen(true)}
                                className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white px-4 py-2 rounded-xl flex items-center shadow-lg shadow-purple-500/25 active:scale-95 transition-all font-bold"
                            >
                                <Sparkles className="w-5 h-5 mr-2" />
                                AI Schedule
                            </button>
                        )}
                        <button
                            onClick={handleCreate}
                            className="bg-[#0a84ff] hover:bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center shadow-lg shadow-blue-500/30 transition-all active:scale-95 font-medium"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            {t('schedule.new')}
                        </button>
                    </div>
                )}
            </div>

            {/* Filters Bar */}
            <GlassCard className="mb-6 p-4 !overflow-visible z-50">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
                    {/* General Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500" />
                        <input
                            type="text"
                            placeholder={t('schedule.searchPlaceholder')}
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

                    {/* Date Range */}
                    <div className="flex gap-2 items-center flex-1">
                        <DatePicker
                            value={startDate}
                            onChange={setStartDate}
                            className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 outline-none cursor-pointer"
                            placeholder="Start Date"
                        />
                        <span className="text-slate-400 dark:text-gray-500">-</span>
                        <DatePicker
                            value={endDate}
                            onChange={setEndDate}
                            className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 outline-none cursor-pointer"
                            placeholder="End Date"
                        />
                        {(startDate || endDate) && (
                            <button
                                onClick={() => { setStartDate(''); setEndDate(''); }}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                title="Clear Date Filter"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Status Tabs */}
                <div className="flex gap-2 w-full overflow-x-auto pb-1 custom-scrollbar">
                    {['All', 'PendingApproval', 'Scheduled', 'ReadyForCheckIn', 'CheckedIn', 'Completed', 'Departed', 'Cancelled', 'Rejected'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${statusFilter === status ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                        >
                            {status === 'All' ? 'All Statuses' : status.replace(/([A-Z])/g, ' $1').trim()}
                        </button>
                    ))}
                </div>
            </GlassCard>

            <GlassCard className="flex-1 overflow-hidden flex flex-col">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-50 dark:bg-[#1a1a1a] z-10 text-xs uppercase text-slate-500 dark:text-gray-500 font-bold tracking-wider">
                            <tr>
                                <th onClick={() => handleSort('startTime')} className="p-5 border-b border-slate-200 dark:border-white/10 cursor-pointer group hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                    {t('common.time')} {getSortIcon('startTime')}
                                </th>
                                <th onClick={() => handleSort('trailerNumber')} className="p-5 border-b border-slate-200 dark:border-white/10 cursor-pointer group hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                    {t('common.trailer')} {getSortIcon('trailerNumber')}
                                </th>
                                <th onClick={() => handleSort('driverName')} className="p-5 border-b border-slate-200 dark:border-white/10 cursor-pointer group hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                    {t('common.driver')} {getSortIcon('driverName')}
                                </th>
                                <th onClick={() => handleSort('carrierId')} className="p-5 border-b border-slate-200 dark:border-white/10 cursor-pointer group hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                    {t('common.carrier')} {getSortIcon('carrierId')}
                                </th>
                                <th onClick={() => handleSort('status')} className="p-5 border-b border-slate-200 dark:border-white/10 cursor-pointer group hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                    {t('common.status')} {getSortIcon('status')}
                                </th>
                                <th className="p-5 border-b border-slate-200 dark:border-white/10 text-right">
                                    {t('common.actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                            {filteredAppointments.length === 0 ? (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-gray-500">
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
                                        <tr key={appt.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                            <td className="p-5">
                                                <div className="flex items-center text-slate-900 dark:text-white font-medium">
                                                    <Clock className="w-4 h-4 mr-2 text-slate-400 dark:text-gray-500" />
                                                    {new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-gray-500 mt-1 pl-6">
                                                    {formatDate(appt.startTime)}
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${appt.isBobtail ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                                                        <Truck className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 dark:text-white">{appt.isBobtail ? 'Bobtail' : appt.trailerNumber}</div>
                                                        <div className="text-xs text-slate-500 dark:text-gray-500">{appt.trailerType || 'N/A'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-slate-600 dark:text-gray-300 font-medium">{appt.driverName}</span>
                                                </div>
                                            </td>
                                            <td className="p-5 text-sm text-slate-600 dark:text-gray-300">
                                                {getCarrierName(appt.carrierId)}
                                            </td>
                                            <td className="p-5">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                         ${appt.status === 'Scheduled' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-500 border-blue-500/20' :
                                                        appt.status === 'CheckedIn' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20' :
                                                            appt.status === 'Cancelled' || appt.status === 'Rejected' ? 'bg-red-500/10 text-red-600 dark:text-red-500 border-red-500/20' :
                                                                appt.status === 'Completed' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-500 border-orange-500/20' :
                                                                    appt.status === 'PendingApproval' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20' :
                                                                        'bg-slate-200 dark:bg-gray-500/10 text-slate-500 dark:text-gray-400 border-slate-300 dark:border-gray-500/20'
                                                    }
                      `}>
                                                    {appt.status.replace(/([A-Z])/g, ' $1').trim()}
                                                </span>
                                            </td>
                                            <td className="p-5 text-right">
                                                <div className="flex justify-end gap-2 items-center">

                                                    {/* Approval Actions - Updated to Text Buttons */}
                                                    {appt.status === 'PendingApproval' && canEditSchedule && (
                                                        <>
                                                            <button
                                                                onClick={() => handleApprove(appt.id)}
                                                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1"
                                                            >
                                                                <Check className="w-3 h-3" /> Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectClick(appt.id)}
                                                                className="px-3 py-1.5 bg-white dark:bg-white/5 border border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                                                            >
                                                                <X className="w-3 h-3" /> Reject
                                                            </button>
                                                        </>
                                                    )}

                                                    {/* Cancel Button */}
                                                    {canCancel && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleCancelClick(e, appt.id)}
                                                            className="p-2 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20 rounded-lg text-orange-600 dark:text-orange-500 transition-colors"
                                                            title="Cancel Appointment"
                                                        >
                                                            <Ban className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    {/* Edit Button */}
                                                    {canModify && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => canEditSchedule ? handleEdit(e, appt.id) : null}
                                                            className={`p-2 rounded-lg transition-colors ${canEditSchedule ? 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white cursor-pointer' : 'bg-transparent text-slate-400 cursor-default opacity-50'}`}
                                                            title={canEditSchedule ? "Edit" : "View Only"}
                                                        >
                                                            {canEditSchedule ? <Edit2 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                    )}
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
                onConfirm={handleConfirmReject}
                title="Reject Request"
                message="Are you sure you want to reject this appointment request? This will notify the requester that their slot is no longer reserved."
            />
        </div>
    );
};
