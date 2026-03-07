
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
        <div className="p-8 h-full flex flex-col animate-in fade-in duration-500">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-3">
                        <History className="w-8 h-8 text-blue-500" />
                        Activity Tracking
                    </h1>
                    <p className="text-slate-500 dark:text-gray-400 font-medium font-inter">Audit logs of every action performed in the system.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-5 py-3 rounded-xl flex items-center gap-2 font-bold transition-all border-2 ${showFilters ? 'bg-blue-500 border-blue-600 text-white' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-50'}`}
                    >
                        <Filter className="w-5 h-5" />
                        {showFilters ? 'Hide Filters' : 'Filters'}
                    </button>
                    <button
                        onClick={handleExport}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition-all active:scale-95 font-bold"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        Export Data
                    </button>
                </div>
            </div>

            {showFilters && (
                <GlassCard className="mb-6 p-6 animate-in slide-in-from-top duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Advanced Filters</h2>
                        <button onClick={clearFilters} className="text-xs font-bold text-blue-500 hover:text-blue-600 uppercase tracking-widest">Clear All</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Action Type</label>
                            <input
                                value={filterAction}
                                onChange={e => setFilterAction(e.target.value)}
                                placeholder="e.g. create*, gate*"
                                className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">User Name / Email</label>
                            <input
                                value={filterUser}
                                onChange={e => setFilterUser(e.target.value)}
                                placeholder="e.g. john*, admin@*"
                                className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Appointment ID</label>
                            <input
                                value={filterAppt}
                                onChange={e => setFilterAppt(e.target.value)}
                                placeholder="e.g. APPT-*"
                                className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Trailer ID</label>
                            <input
                                value={filterTrailer}
                                onChange={e => setFilterTrailer(e.target.value)}
                                placeholder="e.g. TRL-*"
                                className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Carrier Name</label>
                            <input
                                value={filterCarrier}
                                onChange={e => setFilterCarrier(e.target.value)}
                                placeholder="e.g. DHL, FedEx"
                                className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Location Name</label>
                            <input
                                value={filterLocation}
                                onChange={e => setFilterLocation(e.target.value)}
                                placeholder="e.g. Dock*, Yard*"
                                className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Date</label>
                            <input
                                type="date"
                                value={filterDate}
                                onChange={e => setFilterDate(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>
                </GlassCard>
            )}

            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Quick search by action, user or details..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all shadow-lg"
                />
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="rounded-[2rem] border border-slate-200 dark:border-white/10 overflow-hidden flex-1 flex flex-col bg-white/50 dark:bg-black/20 backdrop-blur-xl">
                    <div className="overflow-x-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Timestamp</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Action</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">User</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Refs</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {paginatedActivities.map((activity) => (
                                    <tr key={activity.id} className="hover:bg-slate-50/30 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-700 dark:text-gray-200">{formatDateTime(activity.timestamp).split(',')[0]}</span>
                                                <span className="text-[10px] font-bold text-slate-400 dark:text-gray-500">{formatDateTime(activity.timestamp).split(',')[1]}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight border ${activity.action.toLowerCase().includes('create') || activity.action.toLowerCase().includes('add') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' :
                                                    activity.action.toLowerCase().includes('update') || activity.action.toLowerCase().includes('edit') ? 'bg-blue-500/10 border-blue-500/20 text-blue-600' :
                                                        activity.action.toLowerCase().includes('delete') || activity.action.toLowerCase().includes('remove') ? 'bg-red-500/10 border-red-500/20 text-red-600' :
                                                            'bg-slate-500/10 border-slate-500/20 text-slate-600'
                                                }`}>
                                                {activity.action}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-700 dark:text-gray-200">{activity.userName || 'System'}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 dark:text-gray-500">{activity.userRole}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1.5">
                                                {activity.appointmentId && (
                                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-500 bg-blue-500/5 px-2 py-0.5 rounded-full w-fit border border-blue-500/10">
                                                        <Hash className="w-3 h-3" /> {activity.appointmentId}
                                                    </div>
                                                )}
                                                {activity.trailerId && (
                                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded-full w-fit border border-emerald-500/10">
                                                        <Truck className="w-3 h-3" /> {activity.trailerId}
                                                    </div>
                                                )}
                                                {activity.locationName && (
                                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-orange-500 bg-orange-500/5 px-2 py-0.5 rounded-full w-fit border border-orange-500/10">
                                                        <MapPin className="w-3 h-3" /> {activity.locationName}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-sm font-bold text-slate-600 dark:text-gray-400 max-w-xs truncate" title={activity.details}>
                                                {activity.details || '-'}
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                                {filteredActivities.length === 0 && !dataLoading && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4">
                                                <History className="w-16 h-16 text-slate-200 dark:text-white/5" />
                                                <div className="space-y-1">
                                                    <p className="text-lg font-black text-slate-400">No activities found</p>
                                                    <p className="text-sm text-slate-400/60 font-medium">Try adjusting your filters or search terms.</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

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
        </div>
    );
};
