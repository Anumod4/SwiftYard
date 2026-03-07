import React from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Pagination } from '../../components/ui/Pagination';
import { Truck, Activity, CheckCircle2, Clock, BarChart3, TrendingUp, AlertCircle, MapPin, Calendar, Timer, Package, ArrowRight } from 'lucide-react';
import { Appointment } from '../../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface CarrierDashboardProps {
    activeAppointments: Appointment[];
    pastAppointments: Appointment[];
    onSetSelectedApptId: (id: string) => void;
    onSetIsDetailsModalOpen: (open: boolean) => void;
}

const KPICard = React.memo<{ title: string; value: string | number; icon: React.FC<any>; color: string; subText?: string }>(({ title, value, icon: Icon, color, subText }) => (
    <GlassCard className="p-5 flex items-center justify-between border-b-4 border-b-transparent hover:border-b-current transition-all group overflow-hidden relative">
        <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-[0.03] rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500`} />
        <div>
            <p className="text-slate-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
            <h3 className="text-2xl md:text-3xl font-black tracking-tighter text-slate-900 dark:text-white">{value}</h3>
            {subText && <p className="text-[10px] text-slate-400 mt-1 font-medium">{subText}</p>}
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} shadow-lg shadow-current/20`}>
            <Icon className="w-6 h-6 text-white" />
        </div>
    </GlassCard>
));

export const CarrierDashboard: React.FC<CarrierDashboardProps> = ({
    activeAppointments,
    pastAppointments,
    onSetSelectedApptId,
    onSetIsDetailsModalOpen,
}) => {
    const [currentPage, setCurrentPage] = React.useState(1);
    const pageSize = 10;

    const allAppointments = React.useMemo(() => [...activeAppointments, ...pastAppointments], [activeAppointments, pastAppointments]);

    const metrics = React.useMemo(() => {
        const completed = pastAppointments.filter(a => a.status === 'Completed' || a.status === 'Departed');

        let onTimeCount = 0;
        let totalTurnaround = 0;
        let turnaroundCount = 0;

        completed.forEach(a => {
            const history = a.history || [];
            const gatedIn = history.find(h => h.status === 'GatedIn' || h.status === 'CheckedIn');
            const finished = history.find(h => h.status === 'Completed' || h.status === 'Departed');

            if (gatedIn) {
                if (new Date(gatedIn.timestamp) <= new Date(a.startTime)) {
                    onTimeCount++;
                }

                if (finished) {
                    const diff = (new Date(finished.timestamp).getTime() - new Date(gatedIn.timestamp).getTime()) / (1000 * 60);
                    totalTurnaround += diff;
                    turnaroundCount++;
                }
            }
        });

        return {
            totalShipments: allAppointments.length,
            onTimeRate: completed.length > 0 ? Math.round((onTimeCount / completed.length) * 100) : 100,
            avgTurnaround: turnaroundCount > 0 ? Math.round(totalTurnaround / turnaroundCount) : 0,
            pendingApproval: activeAppointments.filter(a => a.status === 'PendingApproval').length,
            inboundCount: allAppointments.filter(a => a.loadType === 'Inbound').length,
            outboundCount: allAppointments.filter(a => a.loadType === 'Outbound').length,
            liveCount: allAppointments.filter(a => a.appointmentType === 'Live').length,
            dropCount: allAppointments.filter(a => a.appointmentType === 'Drop').length,
            rescheduleSuggestions: activeAppointments.filter(a => a.acknowledgementStatus === 'RescheduleSuggested').length,
        };
    }, [activeAppointments, pastAppointments, allAppointments]);

    const pieData = [
        { name: 'Inbound', value: metrics.inboundCount || 0, color: '#0a84ff' },
        { name: 'Outbound', value: metrics.outboundCount || 0, color: '#10b981' },
    ];

    const paginatedAppointments = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return activeAppointments.slice(start, start + pageSize);
    }, [activeAppointments, currentPage, pageSize]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <header className="flex justify-between items-center bg-white/40 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-200 dark:border-white/10 backdrop-blur-md">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Carrier Hub</h2>
                    <p className="text-slate-500 dark:text-gray-400 text-sm font-medium">Real-time load performance & analytics</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-2xl text-xs font-bold border border-emerald-500/20 flex items-center gap-2 shadow-sm">
                        <TrendingUp className="w-4 h-4" /> Operational Peak
                    </div>
                </div>
            </header>

            {metrics.rescheduleSuggestions > 0 && (
                <div
                    className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-[2rem] flex items-center justify-between cursor-pointer hover:bg-blue-500/15 transition-all group animate-pulse"
                    onClick={() => {
                        // Find the first one and open it
                        const firstSuggestion = activeAppointments.find(a => a.acknowledgementStatus === 'RescheduleSuggested');
                        if (firstSuggestion) {
                            onSetSelectedApptId(firstSuggestion.id);
                            onSetIsDetailsModalOpen(true);
                        }
                    }}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-lg font-black text-blue-600 dark:text-blue-400 leading-none">Reschedule Suggestions</h4>
                            <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Facility has proposed new times for {metrics.rescheduleSuggestions} appointments. Action required.</p>
                        </div>
                    </div>
                    <ArrowRight className="w-6 h-6 text-blue-500 group-hover:translate-x-1 transition-transform" />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Active Missions"
                    value={activeAppointments.length}
                    icon={Activity}
                    color="bg-blue-500"
                    subText={`${activeAppointments.filter(a => a.status === 'CheckedIn').length} Loads On-site`}
                />
                <KPICard
                    title="On-Time Perf"
                    value={`${metrics.onTimeRate}%`}
                    icon={CheckCircle2}
                    color="bg-emerald-500"
                    subText="Historical Arrival Precision"
                />
                <KPICard
                    title="Avg Lifecycle"
                    value={`${metrics.avgTurnaround}m`}
                    icon={Timer}
                    color="bg-purple-500"
                    subText="Minutes Entry to Exit"
                />
                <KPICard
                    title="Under Review"
                    value={metrics.pendingApproval}
                    icon={Clock}
                    color="bg-amber-500"
                    subText="Awaiting Facility Approval"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <GlassCard className="p-6 h-full flex flex-col items-center justify-center text-center">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 mb-8 w-full text-left flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" /> Load Split
                        </h3>
                        <div className="w-full aspect-square max-w-[200px] relative mb-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={65}
                                        outerRadius={90}
                                        paddingAngle={8}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e1e1e', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{metrics.totalShipments}</span>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Loads</span>
                            </div>
                        </div>
                        <div className="w-full space-y-3">
                            {pieData.map(d => (
                                <div key={d.name} className="flex items-center justify-between p-3 rounded-2xl bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                                        <span className="text-xs font-bold text-slate-600 dark:text-gray-300">{d.name}</span>
                                    </div>
                                    <span className="text-sm font-black text-slate-900 dark:text-white">{d.value}</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <Package className="w-6 h-6 text-purple-500" /> Active Operations
                        </h3>
                        <div className="flex gap-2">
                            <span className="text-[10px] font-black uppercase text-blue-500 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20">Live: {metrics.liveCount}</span>
                            <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">Drop: {metrics.dropCount}</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {activeAppointments.length === 0 ? (
                            <div className="bg-slate-50 dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl p-16 text-center">
                                <Truck className="w-16 h-16 text-slate-200 dark:text-gray-800 mx-auto mb-4" />
                                <p className="text-slate-400 dark:text-gray-600 font-bold uppercase tracking-widest text-sm italic">No missions in progress</p>
                            </div>
                        ) : (
                            paginatedAppointments.map(appt => (
                                <GlassCard
                                    key={appt.id}
                                    className="p-5 flex items-center justify-between group cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-all border-l-4 border-l-transparent hover:border-l-blue-500 shadow-sm"
                                    onClick={() => { onSetSelectedApptId(appt.id); onSetIsDetailsModalOpen(true); }}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={`w-14 h-14 rounded-3xl flex items-center justify-center transition-all group-hover:scale-110 ${appt.status === 'PendingApproval' ? 'bg-amber-500/10 text-amber-500' :
                                            appt.status === 'CheckedIn' ? 'bg-blue-500/10 text-blue-500' :
                                                'bg-indigo-500/10 text-indigo-500'
                                            }`}>
                                            <Truck className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-black text-slate-900 dark:text-white text-base tracking-tighter">{appt.trailerNumber || 'TBA'}</p>
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${appt.loadType === 'Inbound' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'
                                                    }`}>
                                                    {appt.loadType || 'Type N/A'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <p className="text-[10px] font-bold text-slate-500 dark:text-gray-400 flex items-center gap-1.5 uppercase tracking-wider">
                                                    <MapPin className="w-3 h-3 text-slate-400" /> {appt.facilityId}
                                                </p>
                                                <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-gray-700" />
                                                <p className="text-[10px] font-bold text-slate-500 dark:text-gray-400 flex items-center gap-1.5 uppercase tracking-wider">
                                                    <Calendar className="w-3 h-3 text-slate-400" /> {new Date(appt.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-3">
                                        <div className={`text-[10px] font-black px-4 py-1.5 rounded-2xl uppercase tracking-tighter shadow-sm ${appt.acknowledgementStatus === 'RescheduleSuggested' ? 'bg-blue-500 text-white shadow-blue-500/20' :
                                                appt.status === 'PendingApproval' ? 'bg-amber-500 text-white shadow-amber-500/20' :
                                                    appt.status === 'CheckedIn' ? 'bg-blue-500 text-white shadow-blue-500/20' :
                                                        'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-gray-400'
                                            }`}>
                                            {appt.acknowledgementStatus === 'RescheduleSuggested' ? 'Re-schedule Offered' : appt.status.replace(/([A-Z])/g, ' $1').trim()}
                                        </div>
                                        <p className="text-[11px] font-mono font-black text-slate-900 dark:text-white flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg">
                                            <Clock className="w-3 h-3 text-slate-400" /> {new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </GlassCard>
                            ))
                        )}
                    </div>

                    {activeAppointments.length > 0 && (
                        <div className="mt-8">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={Math.ceil(activeAppointments.length / pageSize)}
                                onPageChange={setCurrentPage}
                                totalRecords={activeAppointments.length}
                                pageSize={pageSize}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
