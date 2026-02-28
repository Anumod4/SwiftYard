import React from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Lock, MapPin, Truck, Calendar, Clock, User, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Facility, TrailerTypeDefinition, Driver } from '../../types';

interface CarrierBookingProps {
    canEditBooking: boolean;
    handleBooking: (e: React.FormEvent) => Promise<void>;
    bookingFacilityId: string;
    setBookingFacilityId: (id: string) => void;
    bookingLoad: 'Inbound' | 'Outbound';
    setBookingLoad: (load: 'Inbound' | 'Outbound') => void;
    bookingDate: string;
    setBookingDate: (date: string) => void;
    bookingTime: string;
    setBookingTime: (time: string) => void;
    bookingTrailer: string;
    setBookingTrailer: (trailer: string) => void;
    bookingType: string;
    setBookingType: (type: string) => void;
    bookingDriverId: string;
    setBookingDriverId: (id: string) => void;
    setBookingDriverName: (name: string) => void;
    setIsNewDriverModalOpen: (open: boolean) => void;
    facilities: Facility[];
    userProfile: any;
    trailerTypes: TrailerTypeDefinition[];
    availableDrivers: Driver[];
    isSubmitting: boolean;
}

export const CarrierBooking: React.FC<CarrierBookingProps> = ({
    canEditBooking,
    handleBooking,
    bookingFacilityId,
    setBookingFacilityId,
    bookingLoad,
    setBookingLoad,
    bookingDate,
    setBookingDate,
    bookingTime,
    setBookingTime,
    bookingTrailer,
    setBookingTrailer,
    bookingType,
    setBookingType,
    bookingDriverId,
    setBookingDriverId,
    setBookingDriverName,
    setIsNewDriverModalOpen,
    facilities,
    userProfile,
    trailerTypes,
    availableDrivers,
    isSubmitting,
}) => {
    if (!canEditBooking) {
        return (
            <div className="h-full flex flex-col items-center justify-center py-24 text-center animate-in fade-in">
                <div className="w-24 h-24 bg-red-500/10 rounded-[2rem] flex items-center justify-center mb-8 border border-red-500/20 shadow-xl shadow-red-500/5">
                    <Lock className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Access Restricted</h2>
                <p className="text-slate-500 dark:text-gray-400 max-w-sm font-medium">Your current role has view-only permissions. Contact your administrator to enable booking privileges.</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <header className="mb-10 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-blue-500/20 shadow-sm">
                    <Calendar className="w-3 h-3" /> New Appointment
                </div>
                <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">Reserve Your Slot</h2>
                <p className="text-slate-500 dark:text-gray-400 font-medium">Schedule your next Mission today.</p>
            </header>

            <GlassCard className="p-1 md:p-10 relative overflow-hidden bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 opacity-50" />

                <form onSubmit={handleBooking} className="p-6 md:p-0 space-y-10">
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shadow-inner">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Operational Base</h3>
                                <p className="text-[10px] text-slate-400 font-medium uppercase">Select the destination facility & flow</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest ml-1">Destination Facility</label>
                                <select
                                    required
                                    value={bookingFacilityId}
                                    onChange={e => setBookingFacilityId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-slate-900 dark:text-white font-bold focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Choose a Location...</option>
                                    {facilities.filter(f => userProfile?.assignedFacilities.includes(f.id)).map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest ml-1">Traffic Direction</label>
                                <div className="flex bg-slate-100 dark:bg-black/20 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setBookingLoad('Inbound')}
                                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${bookingLoad === 'Inbound' ? 'bg-white dark:bg-white/10 text-blue-500 shadow-sm border border-slate-200 dark:border-white/10' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                                    >
                                        Inbound
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBookingLoad('Outbound')}
                                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${bookingLoad === 'Outbound' ? 'bg-white dark:bg-white/10 text-blue-500 shadow-sm border border-slate-200 dark:border-white/10' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                                    >
                                        Outbound
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Temporal Logistics</h3>
                                <p className="text-[10px] text-slate-400 font-medium uppercase">Schedule the precise arrival window</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest ml-1">Arrival Date</label>
                                <input
                                    type="date"
                                    required
                                    value={bookingDate}
                                    onChange={e => setBookingDate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-slate-900 dark:text-white font-bold focus:border-blue-500 outline-none transition-all cursor-pointer"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest ml-1">Scheduled Time</label>
                                <input
                                    type="time"
                                    required
                                    value={bookingTime}
                                    onChange={e => setBookingTime(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-slate-900 dark:text-white font-bold focus:border-blue-500 outline-none transition-all cursor-pointer"
                                />
                            </div>
                        </div>
                    </section>

                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                                <Truck className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Asset & Driver</h3>
                                <p className="text-[10px] text-slate-400 font-medium uppercase">Define the equipment and assigned personnel</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest ml-1">Trailer Number</label>
                                    <input
                                        required
                                        value={bookingTrailer}
                                        onChange={e => setBookingTrailer(e.target.value)}
                                        placeholder="EX: TRL-9012"
                                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-slate-900 dark:text-white font-bold placeholder:text-slate-300 dark:placeholder:text-gray-700 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest ml-1">Trailer Type</label>
                                    <select
                                        required
                                        value={bookingType}
                                        onChange={e => setBookingType(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-slate-900 dark:text-white font-bold focus:border-blue-500 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="">Select Equipment...</option>
                                        {trailerTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest ml-1">Assigned Driver</label>
                                {!bookingFacilityId ? (
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
                                        <AlertCircle className="w-4 h-4" /> Please select a facility to load available drivers.
                                    </div>
                                ) : (
                                    <div className="flex gap-3">
                                        <div className="relative flex-1">
                                            <select
                                                required
                                                value={bookingDriverId}
                                                onChange={e => {
                                                    if (e.target.value === '__new__') {
                                                        setIsNewDriverModalOpen(true);
                                                    } else {
                                                        setBookingDriverId(e.target.value);
                                                        const driver = availableDrivers.find(d => d.id === e.target.value);
                                                        setBookingDriverName(driver?.name || '');
                                                    }
                                                }}
                                                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-slate-900 dark:text-white font-bold focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="">Select or Create Driver...</option>
                                                {availableDrivers.map(d => (
                                                    <option key={d.id} value={d.id}>{d.name} ({d.licenseNumber})</option>
                                                ))}
                                                <option value="__new__" className="text-blue-500 font-bold">+ Onboard New Driver</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <User className="w-4 h-4 text-slate-400" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <div className="pt-6 relative group">
                        <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-xl group-hover:blur-2xl opacity-10 transition-all" />
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm relative overflow-hidden"
                        >
                            {isSubmitting ? (
                                <>
                                    <Activity className="w-5 h-5 animate-pulse" /> Finalizing Booking...
                                </>
                            ) : (
                                <>
                                    Finalize Appointment <CheckCircle2 className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </GlassCard>

            <div className="mt-8 flex items-center gap-4 bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10 max-w-lg mx-auto">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-[10px] text-amber-600 dark:text-amber-500 font-bold leading-relaxed uppercase tracking-wider">
                    Note: Your request will be sent for facility review. You will receive a notification once the status is updated.
                </p>
            </div>
        </div>
    );
};
