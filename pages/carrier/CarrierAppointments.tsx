import React from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Pagination } from '../../components/ui/Pagination';
import { Calendar, Clock, MapPin, Truck, ChevronRight, Filter, Search, X } from 'lucide-react';
import { Appointment, Facility, Resource } from '../../types';

interface CarrierAppointmentsProps {
    carrierAppointments: Appointment[];
    onSetSelectedApptId: (id: string) => void;
    onSetIsDetailsModalOpen: (open: boolean) => void;
    facilities: Facility[];
    cancelAppointment: (id: string) => Promise<void>;
    docks: Resource[];
    yardSlots: Resource[];
}

export const CarrierAppointments: React.FC<CarrierAppointmentsProps> = ({
    carrierAppointments,
    onSetSelectedApptId,
    onSetIsDetailsModalOpen,
    facilities,
    cancelAppointment,
    docks,
    yardSlots,
}) => {
    const [currentPage, setCurrentPage] = React.useState(1);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [showFilters, setShowFilters] = React.useState(false);
    const [statusFilter, setStatusFilter] = React.useState('All');
    const [sortField, setSortField] = React.useState<'startTime' | 'trailerNumber' | 'loadType' | 'facilityId' | 'location' | 'status'>('startTime');
    const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
    const pageSize = 15;

    const getLocationName = (resId?: string) => {
        if (!resId) return 'N/A';
        const res = [...docks, ...yardSlots].find(r => r.id === resId);
        return res ? res.name : resId;
    };

    const filteredAppointments = React.useMemo(() => {
        let result = [...carrierAppointments];

        if (searchTerm.trim()) {
            const s = searchTerm.toLowerCase();
            result = result.filter(a =>
                a.trailerNumber?.toLowerCase().includes(s) ||
                a.id.toLowerCase().includes(s) ||
                facilities.find(f => f.id === a.facilityId)?.name.toLowerCase().includes(s)
            );
        }

        if (statusFilter !== 'All') {
            result = result.filter(a => a.status === statusFilter);
        }

        // Apply Sorting
        result.sort((a, b) => {
            let valA: any, valB: any;

            if (sortField === 'location') {
                valA = getLocationName(a.assignedResourceId);
                valB = getLocationName(b.assignedResourceId);
            } else if (sortField === 'facilityId') {
                valA = facilities.find(f => f.id === a.facilityId)?.name || '';
                valB = facilities.find(f => f.id === b.facilityId)?.name || '';
            } else {
                valA = (a as any)[sortField] || '';
                valB = (b as any)[sortField] || '';
            }

            if (typeof valA === 'string') {
                return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return sortOrder === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
        });

        return result;
    }, [carrierAppointments, searchTerm, statusFilter, facilities, sortField, sortOrder, docks, yardSlots]);

    const paginatedAppointments = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredAppointments.slice(start, start + pageSize);
    }, [filteredAppointments, currentPage, pageSize]);

    const handleSort = (field: typeof sortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('All');
        setSortField('startTime');
        setSortOrder('desc');
    };

    const handleCancel = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to cancel this appointment? This action cannot be undone.')) {
            await cancelAppointment(id);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Completed':
            case 'Departed':
                return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'Cancelled':
            case 'Rejected':
                return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'PendingApproval':
                return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'CheckedIn':
            case 'InYard':
                return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            default:
                return 'bg-slate-500/10 text-slate-500 border-slate-200 dark:border-white/10';
        }
    };

    const SortIcon = ({ field }: { field: typeof sortField }) => {
        if (sortField !== field) return <div className="w-3 h-3 ml-1 opacity-20"><ChevronRight className="w-full h-full rotate-90" /></div>;
        return (
            <div className={`w-3 h-3 ml-1 text-primary transition-transform ${sortOrder === 'desc' ? 'rotate-90' : '-rotate-90'}`}>
                <ChevronRight className="w-full h-full" />
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Appointments History</h1>
                    <p className="text-slate-500 dark:text-gray-400 text-sm">Comprehensive archive of all facility appointments.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-6 py-3 rounded-xl flex items-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all border ${showFilters ? 'bg-[#3B82F6] border-[#3B82F6] text-white shadow-lg shadow-[#3B82F6]/20' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/10'}`}
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                    </button>
                    <div className="px-6 py-3 bg-[#3B82F6]/10 text-[#3B82F6] rounded-xl text-[10px] font-black uppercase tracking-widest border border-[#3B82F6]/20 flex items-center">
                        Total Records: {filteredAppointments.length}
                    </div>
                </div>
            </header>

            {showFilters && (
                <GlassCard className="p-8 animate-in slide-in-from-top duration-300 rounded-3xl border-none shadow-xl bg-white/60 dark:bg-black/40 backdrop-blur-md">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-sm font-black text-foreground tracking-widest uppercase">Query Logic</h2>
                        <button onClick={clearFilters} className="text-[10px] font-black text-[#3B82F6] hover:underline uppercase tracking-widest">Reset Lifecycle</button>
                    </div>
                    <div className="space-y-2">
                        <div className="flex gap-2 flex-wrap">
                            {['All', 'PendingApproval', 'Scheduled', 'ReadyForCheckIn', 'CheckedIn', 'Completed', 'Departed', 'Cancelled', 'Rejected'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border
                                        ${statusFilter === status
                                            ? 'bg-primary text-white border-primary shadow-md'
                                            : 'bg-white dark:bg-white/5 text-slate-500 dark:text-gray-400 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'}`}
                                >
                                    {status === 'All' ? 'All' : status.replace(/([A-Z])/g, ' $1').trim()}
                                </button>
                            ))}
                        </div>
                    </div>
                </GlassCard>
            )}

            <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 transition-colors group-focus-within:text-primary" />
                <input
                    type="text"
                    placeholder="Search by trailer, carrier ref, or facility..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl pl-14 pr-6 py-4 font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm"
                />
            </div>

            <GlassCard className="overflow-hidden border-none shadow-xl rounded-3xl bg-white/40 dark:bg-white/5 backdrop-blur-xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-100/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('startTime')}>
                                    <div className="flex items-center">DateTime <SortIcon field="startTime" /></div>
                                </th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('trailerNumber')}>
                                    <div className="flex items-center">Trailer Number <SortIcon field="trailerNumber" /></div>
                                </th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('loadType')}>
                                    <div className="flex items-center">Traffic Direction <SortIcon field="loadType" /></div>
                                </th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('facilityId')}>
                                    <div className="flex items-center">Facility <SortIcon field="facilityId" /></div>
                                </th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('location')}>
                                    <div className="flex items-center">Current Location <SortIcon field="location" /></div>
                                </th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('status')}>
                                    <div className="flex items-center">Status <SortIcon field="status" /></div>
                                </th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {paginatedAppointments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center">
                                        <Calendar className="w-12 h-12 text-slate-200 dark:text-gray-800 mx-auto mb-4" />
                                        <p className="text-slate-400 dark:text-gray-600 font-bold uppercase tracking-widest text-xs italic">No matching records</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedAppointments.map(appt => (
                                    <tr
                                        key={appt.id}
                                        onClick={() => { onSetSelectedApptId(appt.id); onSetIsDetailsModalOpen(true); }}
                                        className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-900 dark:text-white font-bold text-sm tracking-tight">
                                                    {new Date(appt.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-primary" /> {new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500">
                                                    <Truck className="w-4 h-4" />
                                                </div>
                                                <span className="text-slate-900 dark:text-white font-black text-sm">{appt.trailerNumber || 'TBA'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${appt.loadType === 'Inbound' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                                                {appt.loadType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-3 h-3 text-slate-400" />
                                                <span className="text-slate-600 dark:text-gray-300 font-bold text-xs uppercase">
                                                    {facilities.find(f => f.id === appt.facilityId)?.name || appt.facilityId}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-slate-600 dark:text-gray-300 font-mono text-xs font-bold uppercase">
                                                {getLocationName(appt.assignedResourceId)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tight border ${getStatusStyle(appt.status)}`}>
                                                {appt.status.replace(/([A-Z])/g, ' $1').trim()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                {['PendingApproval', 'Scheduled'].includes(appt.status) && (
                                                    <button
                                                        onClick={(e) => handleCancel(e, appt.id)}
                                                        className="p-1.5 hover:bg-red-500/10 text-slate-300 hover:text-red-500 rounded-lg transition-all"
                                                        title="Cancel Appointment"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-primary transition-colors" />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            <div className="flex items-center justify-between px-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Showing {Math.min(filteredAppointments.length, (currentPage - 1) * pageSize + 1)} - {Math.min(filteredAppointments.length, currentPage * pageSize)} of {filteredAppointments.length}
                </p>
                <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredAppointments.length / pageSize)}
                    onPageChange={setCurrentPage}
                    totalRecords={filteredAppointments.length}
                    pageSize={pageSize}
                />
            </div>
        </div>
    );
};
