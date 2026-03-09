import React from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Pagination } from '../../components/ui/Pagination';
import { Building2, MapPin, Search } from 'lucide-react';
import { Facility, UserProfileData } from '../../types';

interface CarrierFacilitiesProps {
    facilities: Facility[];
    userProfile: UserProfileData | null;
}

export const CarrierFacilities: React.FC<CarrierFacilitiesProps> = ({
    facilities,
    userProfile,
}) => {
    const [currentPage, setCurrentPage] = React.useState(1);
    const [searchTerm, setSearchTerm] = React.useState('');
    const pageSize = 10;

    const assignedFacilities = React.useMemo(() => {
        let list = facilities.filter(f => userProfile?.assignedFacilities.includes(f.id));
        if (searchTerm.trim()) {
            const s = searchTerm.toLowerCase();
            list = list.filter(f =>
                f.name.toLowerCase().includes(s) ||
                f.code.toLowerCase().includes(s) ||
                f.address?.toLowerCase().includes(s)
            );
        }
        return list;
    }, [facilities, userProfile, searchTerm]);

    const paginatedFacilities = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return assignedFacilities.slice(start, start + pageSize);
    }, [assignedFacilities, currentPage, pageSize]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Assigned Facilities</h1>
                    <p className="text-slate-500 dark:text-gray-400 text-sm">Operational guidelines and contact data for your routes.</p>
                </div>
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted transition-colors group-focus-within:text-primary" />
                    <input
                        type="text"
                        placeholder="Search facilities..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[1.25rem] pl-14 pr-6 py-4 text-sm text-foreground focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold placeholder:text-muted/40"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paginatedFacilities.map(fac => (
                    <GlassCard key={fac.id} className="p-8 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6]">
                                <Building2 className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{fac.name}</h3>
                                <p className="text-sm text-slate-500 dark:text-gray-400 font-mono">{fac.code}</p>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                            <div className="flex items-start gap-3 text-sm">
                                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                <span className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{fac.address || 'Address not listed'}</span>
                            </div>

                            {(fac.mobile || fac.phone || fac.email) ? (
                                <div className="grid grid-cols-1 gap-3 mt-6">
                                    {fac.email && (
                                        <div className="flex items-center gap-3 px-4 py-3 bg-blue-500/5 rounded-xl border border-blue-500/10 transition-colors hover:bg-blue-500/10">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 lowercase">{fac.email}</span>
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        {fac.mobile && (
                                            <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-slate-500/5 rounded-xl border border-slate-200/50 dark:border-white/5">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mob</span>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{fac.mobile}</span>
                                            </div>
                                        )}
                                        {fac.phone && (
                                            <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-slate-500/5 rounded-xl border border-slate-200/50 dark:border-white/5">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tel</span>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{fac.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="px-4 py-3 bg-slate-500/5 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Contact Records Available</span>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                ))}
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(assignedFacilities.length / pageSize)}
                onPageChange={setCurrentPage}
                totalRecords={assignedFacilities.length}
                pageSize={pageSize}
            />
        </div>
    );
};
