
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { CheckCircle2, ArrowRightCircle, MapPin, LogOut, Search, Clock, Truck, Calendar, Warehouse, Loader2 } from 'lucide-react';
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

    // Default location: existing assignment -> or none
    // If existing assignment is a Yard Slot, we reset to empty to force Dock selection or Auto
    const isAssignedToDock = docks.some(d => d.id === appt.assignedResourceId);
    setAssignedLocationId(isAssignedToDock ? (appt.assignedResourceId || '') : '');
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
    <div className="p-8 h-full flex flex-col animate-in zoom-in-95 duration-500">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('gate.title')}</h1>
          <p className="text-slate-500 dark:text-gray-400">{t('gate.subtitle')}</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder={t('gate.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#0a84ff]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full overflow-hidden">

        {/* Left Col: Arrivals */}
        <div className="flex flex-col gap-4 h-full overflow-hidden">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-700 dark:text-gray-300">{t('gate.arrivals')}</h2>
            <span className="text-xs bg-slate-200 dark:bg-white/10 px-2 py-1 rounded-full text-slate-600 dark:text-gray-400">{incoming.length} {t('gate.pending')}</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {incoming.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-400 dark:text-gray-500 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-2xl">
                <p>{t('gate.emptyArrivals')}</p>
              </div>
            ) : (
              paginatedIncoming.map(appt => {
                const isReady = appt.status === 'ReadyForCheckIn';

                return (
                  <GlassCard key={appt.id} className="p-4 flex items-center justify-between group border-2 border-emerald-500/50 bg-emerald-500/5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs bg-emerald-500 text-white animate-pulse">
                        ARR
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">{appt.isBobtail ? 'Bobtail' : appt.trailerNumber}</h3>
                        <div className="flex gap-2 text-xs text-slate-500 dark:text-gray-400">
                          <span>{appt.driverName}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Arrived at Dock</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => initiateCheckIn(appt)}
                      className="px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-all flex items-center bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      {t('gate.checkIn')} <ArrowRightCircle className="ml-2 w-4 h-4" />
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
        <div className="flex flex-col gap-4 h-full overflow-hidden">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-700 dark:text-gray-300">{t('gate.inventory')}</h2>
            <span className="text-xs bg-emerald-500/10 px-2 py-1 rounded-full text-emerald-600 dark:text-emerald-500">{active.length} {t('gate.onsite')}</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {active.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-400 dark:text-gray-500 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-2xl">
                <p>{t('gate.emptyInventory')}</p>
              </div>
            ) : (
              paginatedActive.map(appt => {
                const isDeparting = appt.status === 'ReadyForCheckOut';
                return (
                  <GlassCard key={appt.id} className={`p-4 flex items-center justify-between group ${isDeparting ? 'border-orange-500/50 bg-orange-500/5' : 'hover:border-emerald-500/30'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${isDeparting ? 'bg-orange-500 text-white animate-pulse' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'}`}>
                        {isDeparting ? 'DEP' : 'YARD'}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">{appt.isBobtail ? 'Bobtail' : appt.trailerNumber}</h3>
                        <div className="flex gap-2 text-xs text-slate-500 dark:text-gray-400 items-center">
                          <MapPin className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">{getLocationName(appt.assignedResourceId)}</span>
                          <span>• {appt.driverName}</span>
                        </div>
                        {isDeparting && <p className="text-[10px] text-orange-500 font-bold mt-1">Waiting for Departure...</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCheckOut(appt.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all flex items-center ${isDeparting
                        ? 'bg-orange-600 hover:bg-orange-500 text-white border-orange-600'
                        : 'bg-slate-100 dark:bg-white/5 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-500 text-slate-500 dark:text-gray-400 border-slate-200 dark:border-white/10 hover:border-red-500/30'
                        }`}
                    >
                      {isDeparting ? 'Confirm Departure' : t('gate.checkOut')} {isDeparting ? <CheckCircle2 className="ml-2 w-4 h-4" /> : <LogOut className="ml-2 w-4 h-4" />}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center gap-3 bg-slate-50 dark:bg-[#1a1a1a]">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('gate.modalTitle')}</h2>
                <p className="text-xs text-slate-500 dark:text-gray-400">{checkInTarget.isBobtail ? 'Bobtail' : checkInTarget.trailerNumber}</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-500/5 rounded-lg p-3 border border-blue-500/10">
                <p className="text-xs text-blue-600 dark:text-blue-300 mb-1">{t('gate.modalOriginal')}</p>
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-100 font-medium">
                  <Calendar className="w-4 h-4" />
                  {formatDateTime(checkInTarget.startTime)}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-500 dark:text-gray-400 block mb-2">
                  {t('gate.modalActual')} *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 w-5 h-5 text-slate-400 dark:text-gray-500" />
                  <input
                    type="datetime-local"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:border-[#0a84ff] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-500 dark:text-gray-400 block mb-2">
                  {t('gate.modalAssign')}
                </label>
                <div className="relative">
                  <Warehouse className="absolute left-3 top-3 w-5 h-5 text-slate-400 dark:text-gray-500" />
                  <select
                    value={assignedLocationId}
                    onChange={(e) => setAssignedLocationId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:border-[#0a84ff] outline-none appearance-none"
                  >
                    <option value="">{t('gate.autoAssign')}</option>
                    <optgroup label="Dock Doors">
                      {docks.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.status !== 'Available' ? `(${d.status})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <p className="text-xs text-slate-500 dark:text-gray-500 mt-2">
                  {t('gate.modalAssignHint')}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-[#151515] border-t border-slate-200 dark:border-white/5 flex justify-end gap-3">
              <button
                onClick={() => setCheckInTarget(null)}
                className="px-4 py-2 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white font-medium text-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmCheckIn}
                className="px-6 py-2 bg-[#0a84ff] hover:bg-blue-600 text-white rounded-lg font-medium text-sm flex items-center shadow-lg shadow-blue-500/20"
              >
                {t('gate.confirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal Overlay */}
      {justProcessed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <GlassCard className="max-w-sm w-full p-8 flex flex-col items-center text-center bg-white dark:bg-white/10">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${justProcessed.type === 'in' ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-gray-700'}`}>
              {justProcessed.type === 'in' ? <CheckCircle2 className="w-8 h-8 text-white" /> : <LogOut className="w-8 h-8 text-white" />}
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{justProcessed.message}</h3>

            {justProcessed.type === 'in' && (
              <div className="bg-slate-100 dark:bg-white/5 rounded-xl p-4 w-full border border-slate-200 dark:border-white/10 mt-4">
                <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-gray-500 font-bold mb-1">{t('gate.assignedLoc')}</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">{assignedLoc}</p>
              </div>
            )}

            <button
              onClick={() => setJustProcessed(null)}
              className="mt-8 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-900 dark:text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {t('gate.close')}
            </button>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
