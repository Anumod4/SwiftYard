import React from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Pagination } from '../../components/ui/Pagination';
import { Building2, MapPin } from 'lucide-react';
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
    const pageSize = 10;

    const assignedFacilities = React.useMemo(() => {
        return facilities.filter(f => userProfile?.assignedFacilities.includes(f.id));
    }, [facilities, userProfile]);

    const paginatedFacilities = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return assignedFacilities.slice(start, start + pageSize);
    }, [assignedFacilities, currentPage, pageSize]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Assigned Facilities</h2>
                <p className="text-slate-500 dark:text-gray-400 text-sm">Operational guidelines and contact data for your routes.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paginatedFacilities.map(fac => (
                    <GlassCard key={fac.id} className="p-8 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Building2 className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{fac.name}</h3>
                                <p className="text-sm text-slate-500 dark:text-gray-400 font-mono">{fac.code}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3 text-sm">
                                <MapPin className="w-4 h-4 text-slate-500 dark:text-gray-400 mt-0.5" />
                                <span className="text-slate-600 dark:text-slate-300">{fac.address || 'Address not listed'}</span>
                            </div>
                        </div>

                        <button className="w-full py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl text-sm font-bold border border-slate-200 dark:border-white/10 transition-all">
                            Contact Coordinator
                        </button>
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
