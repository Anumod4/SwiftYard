
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { CheckCircle2, ArrowRightCircle, MapPin, LogOut, Search, Clock, Truck, Calendar, Warehouse, Loader2, X } from 'lucide-react';
import { Pagination } from '../components/ui/Pagination';
import { Appointment } from '../types';

export const Gatehouse: React.FC = () => {
  const { appointments, trailers, checkInAppointment, checkOutAppointment, updateAppointment, updateTrailer, docks, yardSlots, t, formatDateTime, addToast } = useData();
  const [justProcessed, setJustProcessed] = useState<{ id: string, message: string, type: 'in' | 'out' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Check In Modal State
  const [checkInTarget, setCheckInTarget] = useState<Appointment | null>(null);
  const [checkInTime, setCheckInTime] = useState('');
  const [assignedLocationId, setAssignedLocationId] = useState('');

  const [incomingPage, setIncomingPage] = useState(1);
  const [activePage, setActivePage] = useState(1);
  const pageSize = 10;

  // Filter lists - Updated to strictly show only ReadyForCheckIn as requested
  const incoming = appointments.filter(a =>
    ['ReadyForCheckIn'].includes(a.status) &&
    (a.trailerNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const active = appointments.filter(a =>
    ['CheckedIn', 'ReadyForCheckOut'].includes(a.status) &&
    (a.trailerNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const paginatedIncoming = React.useMemo(() => {
    const start = (incomingPage - 1) * pageSize;
    return incoming.slice(start, start + pageSize);
  }, [incoming, incomingPage, pageSize]);

  const paginatedActive = React.useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return active.slice(start, start + pageSize);
  }, [active, activePage, pageSize]);

  React.useEffect(() => {
    setIncomingPage(1);
    setActivePage(1);
  }, [searchTerm]);

  // 1. Open Modal
  const initiateCheckIn = (appt: Appointment) => {
    setCheckInTarget(appt);
    // Default to "Now" in datetime-local format
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setCheckInTime(now.toISOString().slice(0, 16));

    const trailer = trailers.find(t => t.number.toLowerCase() === appt.trailerNumber?.toLowerCase());

    // Default location: use the trailer's actual current location in the yard, if present. 
    // Otherwise, fall back to the appointment's assigned resource
    const currentLocationId = trailer?.location || appt.assignedResourceId || '';
    setAssignedLocationId(currentLocationId);
  };

  // 2. Confirm Modal
  const confirmCheckIn = () => {
    if (!checkInTarget || !checkInTime) return;

    const isoTime = new Date(checkInTime).toISOString();
    checkInAppointment(checkInTarget.id, isoTime, assignedLocationId || undefined);

    // Optimistic UI feedback
    setTimeout(() => {
      setJustProcessed({ id: checkInTarget.id, message: t('gate.successIn'), type: 'in' });
    }, 50);

    setCheckInTarget(null);
  };

  const handleCheckOut = async (id: string) => {
    const appt = appointments.find(a => a.id === id);
    if (!appt) return;

    if (appt.status === 'CheckedIn') {
      const timestamp = new Date().toISOString();
      // Trigger Driver Instruction
      await updateAppointment(appt.id, {
        status: 'ReadyForCheckOut',
        instructionTimestamp: timestamp
      });
      const trailer = trailers.find(t => t.number.toLowerCase() === appt.trailerNumber?.toLowerCase());
      if (trailer) await updateTrailer(trailer.id, {
        status: 'ReadyForCheckOut',
        instructionTimestamp: timestamp
      });

      addToast('Instruction Sent', 'Driver notified to check out of dock.', 'success');
    } else if (appt.status === 'ReadyForCheckOut') {
      // Finalize Departure
      checkOutAppointment(id, appt.assignedResourceId);
      setJustProcessed({ id, message: t('gate.successOut'), type: 'out' });
    }
  };

  const getLocationName = (resId?: string) => {
    if (!resId) return 'Unassigned';
    const res = [...docks, ...yardSlots].find(r => r.id === resId);
    return res ? res.name : resId;
  };

  const [assignedLoc, setAssignedLoc] = useState<string>('');

  React.useEffect(() => {
    if (justProcessed && justProcessed.type === 'in') {
      const updatedAppt = appointments.find(a => a.id === justProcessed.id);
      if (updatedAppt && updatedAppt.assignedResourceId) {
        setAssignedLoc(getLocationName(updatedAppt.assignedResourceId));
      } else {
        setAssignedLoc('Processing...');
      }
    }
  }, [appointments, justProcessed]);

  return (
    <div className="p-8 h-full flex flex-col animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-foreground mb-2 tracking-tighter">{t('gate.title')}</h1>
          <p className="text-muted text-lg opacity-70 font-medium">{t('gate.subtitle')}</p>
        </div>
        <div className="relative w-80 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted transition-colors group-focus-within:text-primary" />
          <input
            type="text"
            placeholder={t('gate.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface border border-border rounded-[1.25rem] pl-14 pr-6 py-4 text-sm text-foreground focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold placeholder:text-muted/40 shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full overflow-hidden">

        {/* Left Col: Arrivals */}
        <div className="flex flex-col gap-6 h-full overflow-hidden">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black text-foreground tracking-tighter uppercase">{t('gate.arrivals')}</h2>
            <span className="text-[10px] bg-primary/10 px-4 py-1.5 rounded-full text-primary font-black uppercase tracking-widest">{incoming.length} {t('gate.pending')}</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {incoming.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted border-2 border-dashed border-border rounded-[2.5rem] bg-muted/5 opacity-50">
                <Truck className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-black uppercase tracking-widest text-[10px]">{t('gate.emptyArrivals')}</p>
              </div>
            ) : (
              paginatedIncoming.map(appt => {
                return (
                  <GlassCard key={appt.id} className="p-8 flex items-center justify-between group border-none shadow-xl rounded-[2.5rem] hover:scale-[1.02] transition-all bg-emerald-500/5 ring-1 ring-emerald-500/20">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-xs bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 animate-pulse uppercase tracking-widest">
                        ARR
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-foreground tracking-tighter leading-tight">{appt.isBobtail ? 'Bobtail' : appt.trailerNumber}</h3>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-sm font-black text-muted opacity-60 tracking-tight">{appt.driverName}</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">At Dock Gate</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => initiateCheckIn(appt)}
                      className="px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl transition-all flex items-center bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95"
                    >
                      {t('gate.checkIn')} <ArrowRightCircle className="ml-2 w-5 h-5" />
                    </button>
                  </GlassCard>
                )
              })
            )}
          </div>
          {incoming.length > 0 && (
            <div className="mt-2">
              <Pagination
                currentPage={incomingPage}
                totalPages={Math.ceil(incoming.length / pageSize)}
                onPageChange={setIncomingPage}
                totalRecords={incoming.length}
                pageSize={pageSize}
              />
            </div>
          )}
        </div>

        {/* Right Col: Active Inventory */}
        <div className="flex flex-col gap-6 h-full overflow-hidden">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black text-foreground tracking-tighter uppercase">{t('gate.inventory')}</h2>
            <span className="text-[10px] bg-emerald-500/10 px-4 py-1.5 rounded-full text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">{active.length} {t('gate.onsite')}</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {active.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted border-2 border-dashed border-border rounded-[2.5rem] bg-muted/5 opacity-50">
                <Warehouse className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-black uppercase tracking-widest text-[10px]">{t('gate.emptyInventory')}</p>
              </div>
            ) : (
              paginatedActive.map(appt => {
                const isDeparting = appt.status === 'ReadyForCheckOut';
                return (
                  <GlassCard key={appt.id} className={`p-8 flex items-center justify-between group border-none shadow-xl rounded-[2.5rem] hover:scale-[1.02] transition-all bg-surface/50 border-l-4 ${isDeparting ? 'border-l-orange-500 bg-orange-500/[0.03]' : 'border-l-primary'}`}>
                    <div className="flex items-center gap-6">
                      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-xs shadow-lg uppercase tracking-widest ${isDeparting ? 'bg-orange-500 text-white shadow-orange-500/20 animate-pulse' : 'bg-primary/10 text-primary shadow-primary/10'}`}>
                        {isDeparting ? 'DEP' : 'YARD'}
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-foreground tracking-tighter leading-tight">{appt.isBobtail ? 'Bobtail' : appt.trailerNumber}</h3>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/10 rounded-lg">
                            <MapPin className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-black text-primary uppercase tracking-tight">{getLocationName(appt.assignedResourceId)}</span>
                          </div>
                          <span className="text-sm font-black text-muted opacity-60 tracking-tight">{appt.driverName}</span>
                        </div>
                        {isDeparting && <p className="text-[10px] text-orange-500 font-black uppercase tracking-[0.2em] mt-3 animate-pulse">Confirmation Required</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCheckOut(appt.id)}
                      className={`px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all flex items-center active:scale-95 shadow-xl ${isDeparting
                        ? 'bg-orange-600 border-orange-600 text-white shadow-orange-500/20 hover:bg-orange-500'
                        : 'bg-surface border-border hover:bg-muted/5 text-muted hover:text-foreground'
                        }`}
                    >
                      {isDeparting ? 'Confirm Departure' : t('gate.checkOut')} {isDeparting ? <CheckCircle2 className="ml-2 w-5 h-5" /> : <LogOut className="ml-2 w-5 h-5" />}
                    </button>
                  </GlassCard>
                )
              })
            )}
          </div>
          {active.length > 0 && (
            <div className="mt-2">
              <Pagination
                currentPage={activePage}
                totalPages={Math.ceil(active.length / pageSize)}
                onPageChange={setActivePage}
                totalRecords={active.length}
                pageSize={pageSize}
              />
            </div>
          )}
        </div>

      </div>

      {/* Check In Confirmation Modal */}
      {checkInTarget && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-2xl rounded-[3rem] border border-border p-12 flex flex-col shadow-2xl relative">
            <div className="flex justify-between items-start mb-10">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-primary/10 rounded-[2.5rem] flex items-center justify-center text-primary">
                  <Truck className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-4xl font-black text-foreground tracking-tighter">{t('gate.modalTitle')}</h2>
                  <p className="text-lg text-muted font-medium opacity-60">{checkInTarget.isBobtail ? 'Bobtail Unit' : `Trailer ${checkInTarget.trailerNumber}`}</p>
                </div>
              </div>
              <button onClick={() => setCheckInTarget(null)} className="w-14 h-14 hover:bg-muted/10 rounded-2xl flex items-center justify-center transition-all group"><X className="w-8 h-8 text-muted group-hover:text-foreground" /></button>
            </div>

            <div className="space-y-10">
              <div className="p-8 bg-primary/5 rounded-[2rem] border border-primary/10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-3">{t('gate.modalOriginal')}</p>
                <div className="flex items-center gap-3 text-3xl font-black text-foreground tracking-tighter">
                  <Calendar className="w-8 h-8 text-primary" />
                  {formatDateTime(checkInTarget.startTime)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-3 px-1">
                    {t('gate.modalActual')} *
                  </label>
                  <div className="relative group">
                    <Clock className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-muted group-focus-within:text-primary transition-colors" />
                    <input
                      type="datetime-local"
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                      className="w-full bg-muted/5 border border-border rounded-2xl pl-16 pr-6 py-5 text-lg font-black tracking-tighter text-foreground focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-3 px-1">
                    Assigned Dock / Slot
                  </label>
                  <div className="relative">
                    <Warehouse className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-emerald-500" />
                    <div className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-2xl pl-16 pr-6 py-5 text-lg font-black tracking-tighter text-emerald-600 dark:text-emerald-400">
                      {getLocationName(assignedLocationId) || 'Ready for Allocation'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-muted/5 rounded-2xl border border-border/50 flex items-center gap-4">
                <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center shadow-sm">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs font-black text-muted uppercase tracking-widest leading-relaxed">
                  System validates physical arrival at identified gate location.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-6 pt-12 mt-4 border-t border-border/50">
              <button
                onClick={() => setCheckInTarget(null)}
                className="px-10 py-5 text-xs font-black uppercase tracking-widest text-muted hover:text-foreground transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmCheckIn}
                className="px-16 py-5 bg-primary hover:bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/30 transition-all active:scale-95"
              >
                {t('gate.confirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal Overlay */}
      {justProcessed && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <GlassCard className="max-w-xl w-full p-12 flex flex-col items-center text-center bg-surface border-none shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-[4rem]">
            <div className={`w-32 h-32 rounded-[3.5rem] flex items-center justify-center mb-10 shadow-2xl ${justProcessed.type === 'in' ? 'bg-emerald-500 shadow-emerald-500/40 text-white' : 'bg-orange-500 shadow-orange-500/40 text-white'}`}>
              {justProcessed.type === 'in' ? <CheckCircle2 className="w-16 h-16" /> : <LogOut className="w-16 h-16" />}
            </div>
            <h3 className="text-4xl font-black text-foreground mb-4 tracking-tighter uppercase">{justProcessed.message}</h3>
            <p className="text-muted font-medium text-lg opacity-60 mb-10">Gate operation logged successfully.</p>

            {justProcessed.type === 'in' && (
              <div className="bg-emerald-500/5 rounded-[2.5rem] p-10 w-full border border-emerald-500/10 shadow-inner">
                <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400 font-black mb-4">{t('gate.assignedLoc')}</p>
                <p className="text-6xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter animate-pulse">{assignedLoc}</p>
              </div>
            )}

            <button
              onClick={() => setJustProcessed(null)}
              className="mt-12 bg-primary hover:bg-blue-600 text-white px-16 py-6 rounded-3xl font-black uppercase tracking-widest text-sm shadow-2xl shadow-primary/30 transition-all active:scale-95"
            >
              {t('gate.close')}
            </button>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
