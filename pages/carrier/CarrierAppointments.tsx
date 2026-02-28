import React from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Pagination } from '../../components/ui/Pagination';
import { Calendar, Clock, MapPin, Truck, ChevronRight, Filter } from 'lucide-react';
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
    const pageSize = 10;

    const paginatedAppointments = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return carrierAppointments.slice(start, start + pageSize);
    }, [carrierAppointments, currentPage, pageSize]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Mission History</h2>
                    <p className="text-slate-500 dark:text-gray-400 font-medium">Archive of all past and planned operations.</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-600 dark:text-gray-300 flex items-center gap-2 hover:bg-slate-200 transition-all">
                        <Filter className="w-3.5 h-3.5" /> Filter Results
                    </button>
                    <div className="px-4 py-2 bg-blue-500/10 text-blue-500 rounded-xl text-xs font-black uppercase tracking-widest border border-blue-500/20">
                        Total: {carrierAppointments.length}
                    </div>
                </div>
            </header>

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
                                            'bg-blue-500/10 text-blue-500'
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
                                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${appt.loadType === 'Inbound' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'}`}>
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
                                    <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter border ${appt.status === 'Completed' || appt.status === 'Departed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                            appt.status === 'Cancelled' || appt.status === 'Rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                        }`}>
                                        {appt.status.replace(/([A-Z])/g, ' $1').trim()}
                                    </span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-300 dark:text-gray-700 group-hover:text-blue-500 transition-colors" />
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
