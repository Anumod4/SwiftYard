
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Search, LogOut, Clock, Truck, MapPin, CheckCircle2, ShieldAlert, RefreshCw } from 'lucide-react';

export const GateOut: React.FC = () => {
  const { appointments, gateOutTrailer, trailers, docks, yardSlots, t } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [processedId, setProcessedId] = useState<string | null>(null);

  // Filter for trailers that are ready for exit.
  const yardInventory = useMemo(() => {
    return appointments.filter(a => 
      ['Completed', 'GatedIn', 'InYard'].includes(a.status) && 
      (a.trailerNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       a.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
       a.id.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [appointments, searchTerm]);

  const handleGateOut = async (id: string) => {
    const appt = appointments.find(a => a.id === id);
    if (!appt) return;
    
    // Look up the corresponding trailer record using the number from the appointment
    const trailer = trailers.find(t => t.number === appt.trailerNumber);
    
    if (trailer) {
        // Correctly call the gateOut function on the trailer entity
        await gateOutTrailer(trailer.id);
    } else {
        console.error("Trailer record not found for appointment", id);
        // Fallback: If no trailer record exists (unlikely in normal flow), we can't gate it out properly.
        // We'd need to manually close the appointment via a different method or error out.
        alert("System Error: Corresponding trailer record not found. Cannot process gate out.");
        return;
    }

    setProcessedId(id);
    setTimeout(() => setProcessedId(null), 3000);
  };

  const getLocationName = (resId?: string) => {
    if (!resId) return 'N/A';
    const res = [...docks, ...yardSlots].find(r => r.id === resId);
    return res ? res.name : 'Unknown';
  };

  const calculateStayDuration = (startTime: string) => {
    const start = new Date(startTime).getTime();
    const now = Date.now();
    const diff = now - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="p-8 h-full flex flex-col animate-in slide-in-from-right-4 duration-500">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('gateout.title')}</h1>
          <p className="text-slate-500 dark:text-gray-400">{t('gateout.subtitle')}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500" />
            <input 
              type="text" 
              placeholder={t('gateout.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#0a84ff] transition-all"
            />
          </div>
        </div>
      </div>

      {processedId && (
        <div className="mb-6 animate-in fade-in slide-in-from-top-4">
          <div className="bg-[#0a84ff]/10 border border-[#0a84ff]/30 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-blue-500/10">
             <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#0a84ff]" />
                <span className="text-slate-900 dark:text-white font-medium text-lg">{t('gateout.success')}</span>
             </div>
             <button onClick={() => setProcessedId(null)} className="text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white">
               <RefreshCw className="w-5 h-5" />
             </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
        {yardInventory.length === 0 ? (
          <div className="h-80 flex flex-col items-center justify-center text-slate-400 dark:text-gray-500 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[2.5rem]">
            <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
              <LogOut className="w-10 h-10 opacity-20" />
            </div>
            <p className="text-xl font-medium">{t('gateout.emptyTitle')}</p>
            <p className="text-sm mt-2">{t('gateout.emptyDesc')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {yardInventory.map(appt => (
              <GlassCard key={appt.id} className={`p-6 flex flex-col justify-between transition-all group overflow-visible ${appt.status === 'Completed' ? 'border-orange-500/50 bg-orange-500/5' : 'hover:border-[#0a84ff]/50'}`}>
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${appt.status === 'Completed' ? 'bg-orange-500/10 text-orange-500' : 'bg-[#0a84ff]/10 text-[#0a84ff]'}`}>
                        <Truck className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{appt.isBobtail ? 'Bobtail' : appt.trailerNumber}</h3>
                        <p className="text-xs text-slate-500 dark:text-gray-500 font-mono uppercase tracking-widest mt-1">ID: {appt.id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className={`text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest border ${appt.status === 'Completed' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                           {appt.status === 'Completed' ? 'Ready to Exit' : t('gateout.active')}
                       </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-5 border-y border-slate-200 dark:border-white/5 my-2">
                    <div>
                      <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase font-black tracking-widest mb-2">{t('gateout.location')}</p>
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                        <MapPin className="w-4 h-4 text-[#0a84ff]" />
                        <span className="text-lg font-bold">{getLocationName(appt.assignedResourceId)}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase font-black tracking-widest mb-2">{t('gateout.timeInYard')}</p>
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                        <Clock className="w-4 h-4 text-slate-400 dark:text-gray-400" />
                        <span className="text-lg font-bold">{calculateStayDuration((appt.history || []).find(h => h.status === 'CheckedIn')?.timestamp || appt.startTime)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm pt-2">
                    <div>
                      <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase font-black tracking-widest mb-1">{t('common.driver')}</p>
                      <p className="font-bold text-slate-900 dark:text-white text-lg">{appt.driverName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase font-black tracking-widest mb-1">{t('gateout.equipment')}</p>
                      <p className="font-bold text-slate-900 dark:text-white text-lg">{appt.trailerType || 'NONE'}</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => handleGateOut(appt.id)}
                  className="mt-8 w-full bg-[#0a84ff] hover:bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                >
                  <LogOut className="w-6 h-6" /> {t('gateout.checkoutBtn')}
                </button>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};