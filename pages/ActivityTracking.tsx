
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Activity } from '../types';
import {
    History, Search, Filter, Download as DownloadIcon,
    Calendar as CalendarIcon, User, Truck, Building, MapPin, Hash, X, Eye
} from 'lucide-react';
import { Pagination } from '../components/ui/Pagination';
import * as XLSX from 'xlsx';

export const ActivityTracking: React.FC = () => {
    const { activities, t, formatDateTime, formatDate, dataLoading } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Filters
    const [filterAction, setFilterAction] = useState('');
    const [filterUser, setFilterUser] = useState('');
    const [filterAppt, setFilterAppt] = useState('');
    const [filterTrailer, setFilterTrailer] = useState('');
    const [filterCarrier, setFilterCarrier] = useState('');
    const [filterLocation, setFilterLocation] = useState('');
    const [filterDate, setFilterDate] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    const matchesFilter = (val: string | undefined, filter: string) => {
        if (!filter) return true;
        if (!val) return false;

        const f = filter.toLowerCase().trim();
        const v = val.toLowerCase().trim();

        // Support * as wildcard
        if (f.includes('*')) {
            const regexStr = f.replace(/\*/g, '.*');
            const regex = new RegExp(`^${regexStr}$`);
            return regex.test(v);
        }

        // Support multiple values (comma separated)
        if (f.includes(',')) {
            const parts = f.split(',').map(p => p.trim()).filter(p => p);
            return parts.some(p => v.includes(p));
        }

        return v.includes(f);
    };

    const filteredActivities = useMemo(() => {
        return activities.filter(activity => {
            const matchesSearch = !searchTerm ||
                activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                activity.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                activity.details?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesAction = matchesFilter(activity.action, filterAction);
            const matchesUser = matchesFilter(activity.userName || activity.userEmail, filterUser);
            const matchesAppt = matchesFilter(activity.appointmentId, filterAppt);
            const matchesTrailer = matchesFilter(activity.trailerId, filterTrailer);
            const matchesCarrier = matchesFilter(activity.carrierName, filterCarrier);
            const matchesLocation = matchesFilter(activity.locationName, filterLocation);
            const matchesDate = !filterDate || activity.timestamp.includes(filterDate);

            return matchesSearch && matchesAction && matchesUser && matchesAppt && matchesTrailer && matchesCarrier && matchesLocation && matchesDate;
        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [activities, searchTerm, filterAction, filterUser, filterAppt, filterTrailer, filterCarrier, filterLocation, filterDate]);

    const paginatedActivities = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredActivities.slice(start, start + pageSize);
    }, [filteredActivities, currentPage]);

    const handleExport = () => {
        const dataToExport = filteredActivities.map(a => ({
            Timestamp: formatDateTime(a.timestamp),
            Action: a.action,
            User: a.userName || a.userEmail || 'System',
            'User Role': a.userRole || '',
            'Appointment ID': a.appointmentId || '',
            'Trailer ID': a.trailerId || '',
            'Carrier': a.carrierName || '',
            'Driver': a.driverName || '',
            'Location': a.locationName || '',
            'Details': a.details || ''
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Activities");
        XLSX.writeFile(wb, `SwiftYard_Activity_Log_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const clearFilters = () => {
        setFilterAction('');
        setFilterUser('');
        setFilterAppt('');
        setFilterTrailer('');
        setFilterCarrier('');
        setFilterLocation('');
        setFilterDate('');
        setSearchTerm('');
    };

    return (
        <div className="p-8 h-full flex flex-col animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-black text-foreground mb-2 tracking-tighter flex items-center gap-4">
                        <History className="w-10 h-10 text-primary" />
                        Activity Tracking
                    </h1>
                    <p className="text-muted text-lg opacity-70 font-medium font-inter">Audit logs of every action performed in the system.</p>
                </div>
                <div className="flex gap-4 items-end">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-8 py-4 rounded-[1.25rem] flex items-center gap-3 font-black uppercase tracking-widest text-xs transition-all border-2 ${showFilters ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20' : 'bg-surface border-border text-muted hover:bg-muted/5'}`}
                    >
                        <Filter className="w-5 h-5" />
                        {showFilters ? 'Hide Filters' : 'Advanced Filters'}
                    </button>
                    <button
                        onClick={handleExport}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-[1.25rem] flex items-center gap-3 shadow-xl shadow-emerald-500/20 transition-all active:scale-95 font-black uppercase tracking-widest text-xs whitespace-nowrap"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        Export Audit Log
                    </button>
                </div>
            </div>

            {showFilters && (
                <GlassCard className="mb-8 p-10 animate-in slide-in-from-top duration-500 rounded-[2.5rem] border-none shadow-2xl">
                    <div className="flex justify-between items-center mb-10">
                        <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase">Query Filters</h2>
                        <button onClick={clearFilters} className="text-[10px] font-black text-primary hover:text-blue-600 uppercase tracking-[0.2em] transition-colors bg-primary/5 px-4 py-2 rounded-xl">Clear All Logic</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">Action Type</label>
                            <input
                                value={filterAction}
                                onChange={e => setFilterAction(e.target.value)}
                                placeholder="e.g. create*, gate*"
                                className="w-full bg-muted/5 border border-border rounded-2xl px-5 py-4 text-sm font-bold text-foreground outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">User Identity</label>
                            <input
                                value={filterUser}
                                onChange={e => setFilterUser(e.target.value)}
                                placeholder="e.g. john*, admin@*"
                                className="w-full bg-muted/5 border border-border rounded-2xl px-5 py-4 text-sm font-bold text-foreground outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">Appointment ID</label>
                            <input
                                value={filterAppt}
                                onChange={e => setFilterAppt(e.target.value)}
                                placeholder="e.g. APPT-*"
                                className="w-full bg-muted/5 border border-border rounded-2xl px-5 py-4 text-sm font-bold text-foreground outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">Trailer Reference</label>
                            <input
                                value={filterTrailer}
                                onChange={e => setFilterTrailer(e.target.value)}
                                placeholder="e.g. TRL-*"
                                className="w-full bg-muted/5 border border-border rounded-2xl px-5 py-4 text-sm font-bold text-foreground outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">Carrier Name</label>
                            <input
                                value={filterCarrier}
                                onChange={e => setFilterCarrier(e.target.value)}
                                placeholder="e.g. DHL, FedEx"
                                className="w-full bg-muted/5 border border-border rounded-2xl px-5 py-4 text-sm font-bold text-foreground outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">Location Unit</label>
                            <input
                                value={filterLocation}
                                onChange={e => setFilterLocation(e.target.value)}
                                placeholder="e.g. Dock*, Yard*"
                                className="w-full bg-muted/5 border border-border rounded-2xl px-5 py-4 text-sm font-bold text-foreground outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">Execution Date</label>
                            <input
                                type="date"
                                value={filterDate}
                                onChange={e => setFilterDate(e.target.value)}
                                className="w-full bg-muted/5 border border-border rounded-2xl px-5 py-4 text-sm font-bold text-foreground outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                </GlassCard>
            )}

            <div className="relative mb-8 group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted w-6 h-6 transition-colors group-focus-within:text-primary" />
                <input
                    type="text"
                    placeholder="Quick search by action, user, or specific details..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-surface border-2 border-border/50 rounded-[1.5rem] pl-16 pr-6 py-5 font-bold text-foreground outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-xl placeholder:text-muted/40"
                />
            </div>

            <GlassCard className="flex-1 overflow-hidden flex flex-col rounded-[2.5rem] border-none shadow-2xl">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead className="sticky top-0 bg-surface/90 backdrop-blur-md z-10 text-[10px] uppercase text-muted font-black tracking-[0.2em] border-b border-border">
                            <tr>
                                <th className="p-8">Timestamp</th>
                                <th className="p-8">Action</th>
                                <th className="p-8">User Identity</th>
                                <th className="p-8">References</th>
                                <th className="p-8">Action Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50 bg-surface/30">
                            {paginatedActivities.map((activity) => (
                                <tr key={activity.id} className="hover:bg-muted/5 transition-all group border-l-4 border-l-transparent hover:border-l-primary">
                                    <td className="p-8">
                                        <div className="flex flex-col">
                                            <span className="text-base font-black text-foreground tracking-tighter leading-none">{formatDateTime(activity.timestamp).split(',')[0]}</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted opacity-60 mt-2">{formatDateTime(activity.timestamp).split(',')[1]}</span>
                                        </div>
                                    </td>
                                    <td className="p-8">
                                        <div className={`inline-flex items-center px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] border-2 shadow-sm ${activity.action.toLowerCase().includes('create') || activity.action.toLowerCase().includes('add') ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                            activity.action.toLowerCase().includes('update') || activity.action.toLowerCase().includes('edit') ? 'bg-primary/5 border-primary/10 text-primary' :
                                                activity.action.toLowerCase().includes('delete') || activity.action.toLowerCase().includes('remove') ? 'bg-red-500/5 border-red-500/10 text-red-600 dark:text-red-400' :
                                                    'bg-muted/10 border-border/20 text-muted'
                                            }`}>
                                            {activity.action}
                                        </div>
                                    </td>
                                    <td className="p-8">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-2xl bg-muted/5 border border-border flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg">
                                                <User className="w-6 h-6 text-muted group-hover:text-primary transition-colors" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-lg font-black text-foreground tracking-tighter leading-none">{activity.userName || 'System Auto'}</span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-primary opacity-70 mt-2">{activity.userRole || 'Process Agent'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-8">
                                        <div className="flex flex-wrap gap-2.5 max-w-[240px]">
                                            {activity.appointmentId && (
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10 shadow-sm" title="Appointment ID">
                                                    <Hash className="w-3.5 h-3.5" /> {activity.appointmentId}
                                                </div>
                                            )}
                                            {activity.trailerId && (
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-3 py-1.5 rounded-xl border border-emerald-500/10 shadow-sm" title="Trailer ID">
                                                    <Truck className="w-3.5 h-3.5" /> {activity.trailerId}
                                                </div>
                                            )}
                                            {activity.locationName && (
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 bg-orange-500/5 px-3 py-1.5 rounded-xl border border-orange-500/10 shadow-sm" title="Location">
                                                    <MapPin className="w-3.5 h-3.5" /> {activity.locationName}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-8">
                                        <p className="text-sm font-bold text-foreground opacity-80 max-w-sm" title={activity.details}>
                                            {activity.details || <span className="text-muted/30 italic font-normal tracking-normal lowercase">No secondary details</span>}
                                        </p>
                                    </td>
                                </tr>
                            ))}
                            {filteredActivities.length === 0 && !dataLoading && (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-6">
                                            <div className="w-20 h-20 bg-muted/5 rounded-full flex items-center justify-center">
                                                <History className="w-10 h-10 text-muted/20" />
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-2xl font-black text-foreground tracking-tighter uppercase">{t('drv.empty') || 'No Audit Logs Found'}</p>
                                                <p className="text-base text-muted font-medium">Try broadening your search or clearing advanced filters.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            <div className="mt-6">
                <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredActivities.length / pageSize)}
                    onPageChange={setCurrentPage}
                    totalRecords={filteredActivities.length}
                    pageSize={pageSize}
                />
            </div>
        </div>
    );
};
