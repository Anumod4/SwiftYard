import React from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Pagination } from '../../components/ui/Pagination';
import { Calendar, Clock, MapPin, Truck, ChevronRight, Filter, Search } from 'lucide-react';
import { Appointment, Facility } from '../../types';

interface CarrierAppointmentsProps {
    carrierAppointments: Appointment[];
    onSetSelectedApptId: (id: string) => void;
    onSetIsDetailsModalOpen: (open: boolean) => void;
    facilities: Facility[];
}

export const CarrierAppointments: React.FC<CarrierAppointmentsProps> = ({
    carrierAppointments,
    onSetSelectedApptId,
    onSetIsDetailsModalOpen,
    facilities,
}) => {
    const [currentPage, setCurrentPage] = React.useState(1);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [showFilters, setShowFilters] = React.useState(false);
    const [statusFilter, setStatusFilter] = React.useState('All');
    const pageSize = 10;

    const filteredAppointments = React.useMemo(() => {
        let result = carrierAppointments;

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

        return result;
    }, [carrierAppointments, searchTerm, statusFilter, facilities]);

    const paginatedAppointments = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredAppointments.slice(start, start + pageSize);
    }, [filteredAppointments, currentPage, pageSize]);

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('All');
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Mission History</h1>
                    <p className="text-slate-500 dark:text-gray-400 font-medium">Archive of all past and planned operations.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-8 py-4 rounded-2xl flex items-center gap-3 font-black uppercase tracking-widest text-xs transition-all border-2 ${showFilters ? 'bg-[#3B82F6] border-[#3B82F6] text-white shadow-xl shadow-[#3B82F6]/20' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 hover:bg-slate-50'}`}
                    >
                        <Filter className="w-5 h-5" />
                        {showFilters ? 'Hide Filters' : 'Advanced Filters'}
                    </button>
                    <div className="px-8 py-4 bg-[#3B82F6]/10 text-[#3B82F6] rounded-2xl text-xs font-black uppercase tracking-widest border border-[#3B82F6]/20 flex items-center shadow-lg">
                        Total: {filteredAppointments.length}
                    </div>
                </div>
            </header>

            {showFilters && (
                <GlassCard className="mb-0 p-10 animate-in slide-in-from-top duration-500 rounded-[2.5rem] border-none shadow-2xl">
                    <div className="flex justify-between items-center mb-10">
                        <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase">Query Filters</h2>
                        <button onClick={clearFilters} className="text-[10px] font-black text-[#3B82F6] hover:text-blue-600 uppercase tracking-[0.2em] transition-colors bg-[#3B82F6]/5 px-4 py-2 rounded-xl">Clear All Logic</button>
                    </div>
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted px-1">Operational Status</label>
                        <div className="flex gap-3 w-full overflow-x-auto pb-2 custom-scrollbar">
                            {['All', 'PendingApproval', 'Scheduled', 'ReadyForCheckIn', 'CheckedIn', 'Completed', 'Departed', 'Cancelled', 'Rejected'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2
                                        ${statusFilter === status
                                            ? 'bg-[#3B82F6] text-white border-[#3B82F6] shadow-lg shadow-[#3B82F6]/20'
                                            : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-gray-400 border-transparent hover:border-slate-200 dark:hover:border-white/10 hover:bg-slate-100'}`}
                                >
                                    {status === 'All' ? 'All Statuses' : status.replace(/([A-Z])/g, ' $1').trim()}
                                </button>
                            ))}
                        </div>
                    </div>
                </GlassCard>
            )}

            <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6 transition-colors group-focus-within:text-[#3B82F6]" />
                <input
                    type="text"
                    placeholder="Quick search by mission ID, trailer, or facility..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-white/5 rounded-[1.5rem] pl-16 pr-6 py-5 font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-[#3B82F6]/10 focus:border-[#3B82F6] transition-all shadow-xl placeholder:text-slate-400"
                />
            </div>

            <div className="space-y-4">
                {paginatedAppointments.length === 0 ? (
                    <div className="py-20 text-center bg-slate-50 dark:bg-white/5 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-white/10">
                        <Calendar className="w-12 h-12 text-slate-300 dark:text-gray-700 mx-auto mb-4" />
                        <p className="text-slate-500 dark:text-gray-400 font-bold uppercase tracking-widest text-sm italic">No records found</p>
                    </div>
                ) : (
                    paginatedAppointments.map(appt => (
                        <GlassCard
                            key={appt.id}
                            className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-all border border-slate-200/50 dark:border-white/5 hover:shadow-xl group"
                            onClick={() => { onSetSelectedApptId(appt.id); onSetIsDetailsModalOpen(true); }}
                        >
                            <div className="flex items-center gap-5 md:min-w-[250px]">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${['Completed', 'Departed'].includes(appt.status) ? 'bg-emerald-500/10 text-emerald-500' :
                                    ['Cancelled', 'Rejected'].includes(appt.status) ? 'bg-red-500/10 text-red-500' :
                                        'bg-[#3B82F6]/10 text-[#3B82F6]'
                                    }`}>
                                    <Calendar className="w-7 h-7" />
                                </div>
                                <div>
                                    <p className="text-slate-900 dark:text-white font-black text-lg tracking-tighter leading-none mb-1">
                                        {new Date(appt.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 dark:text-gray-500 tracking-widest">
                                        <Clock className="w-3 h-3" /> {new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:flex md:items-center gap-6 flex-1">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest leading-none">Resource</p>
                                    <div className="flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-slate-400" />
                                        <p className="text-slate-900 dark:text-white font-bold text-sm tracking-tight">{appt.trailerNumber || 'TBA'}</p>
                                        {appt.loadType && (
                                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${appt.loadType === 'Inbound' ? 'bg-[#3B82F6] text-white' : 'bg-emerald-500 text-white'}`}>
                                                {appt.loadType}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest leading-none">Facility</p>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-slate-400" />
                                        <p className="text-slate-900 dark:text-white font-bold text-sm tracking-tight">
                                            {facilities.find(f => f.id === appt.facilityId)?.name || appt.facilityId.substring(0, 15)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-white/5">
                                <div className="text-right flex flex-col items-end">
                                    <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter border ${appt.acknowledgementStatus === 'RescheduleSuggested' ? 'bg-[#3B82F6] text-white border-[#3B82F6]/20 shadow-lg shadow-[#3B82F6]/20' :
                                        appt.status === 'Completed' || appt.status === 'Departed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                            appt.status === 'Cancelled' || appt.status === 'Rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20'
                                        }`}>
                                        {appt.acknowledgementStatus === 'RescheduleSuggested' ? 'Re-schedule Offered' : appt.status.replace(/([A-Z])/g, ' $1').trim()}
                                    </span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-300 dark:text-gray-700 group-hover:text-[#3B82F6] transition-colors" />
                            </div>
                        </GlassCard>
                    ))
                )}
            </div>

            <div className="mt-8">
                <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(carrierAppointments.length / pageSize)}
                    onPageChange={setCurrentPage}
                    totalRecords={carrierAppointments.length}
                    pageSize={pageSize}
                />
            </div>
        </div>
    );
};
