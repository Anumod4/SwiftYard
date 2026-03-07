
import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Logo } from '../components/Logo';
import { UserProfile } from '../components/UserProfile';
import { AppointmentDetailsModal } from '../components/AppointmentDetailsModal';
import { LoadingIndicator } from '../components/ui/LoadingIndicator';
import {
    LayoutDashboard,
    CalendarPlus,
    Calendar,
    Building2,
    LogOut,
    MapPin,
    Truck,
    Clock,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Lock,
    Plus,
    User,
    X,
    Menu,
    Search
} from 'lucide-react';
import { VIEW_IDS, CARRIER_NAV_ITEMS } from '../constants';

// Lazy load sub-views
const CarrierDashboard = lazy(() => import('./carrier/CarrierDashboard').then(m => ({ default: m.CarrierDashboard })));
const CarrierBooking = lazy(() => import('./carrier/CarrierBooking').then(m => ({ default: m.CarrierBooking })));
const CarrierAppointments = lazy(() => import('./carrier/CarrierAppointments').then(m => ({ default: m.CarrierAppointments })));
const CarrierFacilities = lazy(() => import('./carrier/CarrierFacilities').then(m => ({ default: m.CarrierFacilities })));

export const CarrierPortal: React.FC = () => {
    const { userProfile, signOut, currentCarrier } = useAuth();
    const { facilities, appointments, addAppointment, trailerTypes, addToast, refreshData, canEdit, theme, actionLoading, actionLoadingMessage, drivers, addDriver, carriers, settings, addTrailerType, allTrailers } = useData();
    const [currentView, setCurrentView] = useState(VIEW_IDS.CARRIER_DASHBOARD);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedApptId, setSelectedApptId] = useState<string | null>(null);

    // Booking Form State
    const [bookingFacilityId, setBookingFacilityId] = useState('');
    const [bookingStartTime, setBookingStartTime] = useState('');
    const [bookingTrailer, setBookingTrailer] = useState('');
    const [bookingType, setBookingType] = useState('');
    const [bookingDriverId, setBookingDriverId] = useState('');
    const [bookingDriverName, setBookingDriverName] = useState('');
    const [bookingLoad, setBookingLoad] = useState<'Inbound' | 'Outbound'>('Inbound');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Derived Data
    // Use userProfile.carrierId as fallback if currentCarrier is not loaded yet
    const effectiveCarrierId = currentCarrier?.id || userProfile?.carrierId;

    // Filter drivers by facility, carrier, and availability
    const availableDrivers = useMemo(() => {
        if (!effectiveCarrierId) return [];

        console.log('[CarrierPortal] Driver filter debug:', {
            effectiveCarrierId,
            totalDrivers: drivers.length,
            driverCarrierIds: drivers.map(d => ({ id: d.id, name: d.name, carrierId: d.carrierId }))
        });

        // Get driver IDs that are currently on site (busy)
        const onSiteDriverIds = new Set(
            appointments
                .filter(a => ['GatedIn', 'MovingToDock', 'ReadyForCheckIn', 'CheckedIn', 'ReadyForCheckOut', 'CheckedOut', 'MovingToYard', 'InYard'].includes(a.status))
                .map(a => a.driverName)
        );

        return drivers.filter(d => {
            // Must match carrier name (case-insensitive)
            const carrierMatch = d.carrierId && d.carrierId.toLowerCase() === effectiveCarrierId?.toLowerCase();
            if (!carrierMatch) return false;

            // Must match facility if selected
            if (bookingFacilityId && d.facilityId !== bookingFacilityId) return false;

            // Must not be currently on site (available)
            const isAvailable = !onSiteDriverIds.has(d.name);
            return isAvailable;
        });
    }, [drivers, effectiveCarrierId, bookingFacilityId, appointments]);

    const carrierAppointments = useMemo(() => {
        if (!effectiveCarrierId) return [];
        return appointments.filter(a => {
            const hasIdMatch = a.carrierId && a.carrierId.toLowerCase() === effectiveCarrierId?.toLowerCase();
            const hasNameMatch = a.carrierId && carriers.some(c => c.id === effectiveCarrierId && c.name.toLowerCase() === a.carrierId?.toLowerCase());
            return hasIdMatch || hasNameMatch;
        }).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    }, [appointments, effectiveCarrierId, carriers]);

    // New Driver Modal State
    const [isNewDriverModalOpen, setIsNewDriverModalOpen] = useState(false);
    const [newDriverName, setNewDriverName] = useState('');
    const [newDriverLicense, setNewDriverLicense] = useState('');
    const [newDriverPhone, setNewDriverPhone] = useState('');
    const [isCreatingDriver, setIsCreatingDriver] = useState(false);

    // Handle creating a new driver
    const handleCreateDriver = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bookingFacilityId || !effectiveCarrierId) return;

        setIsCreatingDriver(true);
        try {
            await addDriver({
                name: newDriverName,
                licenseNumber: newDriverLicense,
                phone: newDriverPhone,
                facilityId: bookingFacilityId,
                carrierId: effectiveCarrierId
            });
            addToast('Driver Created', 'New driver has been added successfully.', 'success');
            setIsNewDriverModalOpen(false);
            setNewDriverName('');
            setNewDriverLicense('');
            setNewDriverPhone('');
            // Refresh data to get the new driver
            await refreshData();
        } catch (err: any) {
            addToast('Error', err.message || 'Failed to create driver', 'error');
        } finally {
            setIsCreatingDriver(false);
        }
    };

    const activeAppointments = carrierAppointments.filter(a => ['Scheduled', 'CheckingIn', 'CheckedIn', 'MovingToDock', 'ReadyForCheckIn', 'ReadyForCheckOut', 'GatedIn', 'InYard', 'MovingToYard'].includes(a.status));
    const pastAppointments = carrierAppointments.filter(a => ['Completed', 'Departed', 'Cancelled', 'Rejected'].includes(a.status));

    const availableTrailerTypes = useMemo(() => {
        if (!bookingFacilityId) return trailerTypes;
        return trailerTypes.filter(t => !t.facilityId || t.facilityId === bookingFacilityId);
    }, [trailerTypes, bookingFacilityId]);

    // New Trailer Type Modal State
    const [isNewTrailerTypeModalOpen, setIsNewTrailerTypeModalOpen] = useState(false);
    const [newTrailerTypeName, setNewTrailerTypeName] = useState('');
    const [isCreatingTrailerType, setIsCreatingTrailerType] = useState(false);

    const handleCreateTrailerType = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bookingFacilityId || !newTrailerTypeName.trim()) return;

        setIsCreatingTrailerType(true);
        try {
            await addTrailerType({
                name: newTrailerTypeName,
                facilityId: bookingFacilityId,
                defaultDuration: 60
            });
            addToast('Trailer Type Created', 'New equipment type has been added.', 'success');
            setIsNewTrailerTypeModalOpen(false);
            setNewTrailerTypeName('');
            await refreshData();
        } catch (err: any) {
            addToast('Error', err.message || 'Failed to create trailer type', 'error');
        } finally {
            setIsCreatingTrailerType(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshData();
        setIsRefreshing(false);
    };

    // Operational Hours Validation
    const isWithinOperationalHours = useMemo(() => {
        if (!bookingStartTime) return true;

        const date = new Date(bookingStartTime);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const shifts = settings.workingHours?.[dayName] || [];

        if (Object.keys(settings.workingHours || {}).length === 0) return true;
        if (shifts.length === 0) return false;

        const timeInMinutes = date.getHours() * 60 + date.getMinutes();

        return shifts.some(shift => {
            const [startH, startM] = shift.startTime.split(':').map(Number);
            const [endH, endM] = shift.endTime.split(':').map(Number);
            const shiftStart = startH * 60 + startM;
            const shiftEnd = endH * 60 + endM;

            return timeInMinutes >= shiftStart && timeInMinutes <= shiftEnd;
        });
    }, [bookingStartTime, settings.workingHours]);

    const operationalHint = useMemo(() => {
        if (!bookingStartTime) return null;
        const date = new Date(bookingStartTime);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const shifts = settings.workingHours?.[dayName] || [];

        if (shifts.length === 0) return `Facility is closed on ${dayName}`;
        return `Operating Hours: ${shifts.map(s => `${s.startTime}-${s.endTime}`).join(', ')}`;
    }, [bookingStartTime, settings.workingHours]);

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();

        // Use effectiveCarrierId instead of currentCarrier to handle cases where carrier isn't loaded yet
        if (!effectiveCarrierId) {
            addToast('Error', 'Carrier not loaded. Please refresh the page.', 'error');
            return;
        }

        if (!bookingFacilityId) {
            addToast('Error', 'Please select a facility.', 'error');
            return;
        }

        if (!isWithinOperationalHours) {
            addToast('Outside Operational Hours', operationalHint || 'Selected time is outside facility operational hours.', 'error');
            return;
        }

        const isTrailerActiveElsewhere = allTrailers.some(t =>
            t.number.toLowerCase() === bookingTrailer.toLowerCase() &&
            t.status !== 'GatedOut' && t.status !== 'Unknown' && t.status !== 'Cancelled'
        );

        if (isTrailerActiveElsewhere) {
            addToast('Trailer Busy', `Trailer ${bookingTrailer} is already active at a facility. It must depart before it can be booked again.`, 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            await addAppointment({
                facilityId: bookingFacilityId,
                carrierId: effectiveCarrierId,
                startTime: bookingStartTime,
                durationMinutes: 60, // Default
                trailerNumber: bookingTrailer,
                trailerType: bookingType,
                driverName: bookingDriverName || (availableDrivers.find(d => d.id === bookingDriverId)?.name || ''),
                loadType: bookingLoad,
                status: 'PendingApproval', // Carrier bookings usually require approval
                isBobtail: false // Assumption for simplicity
            });

            addToast('Request Sent', 'Appointment request submitted for approval.', 'success');

            // Reset
            setBookingTrailer('');
            setBookingDriverId('');
            setBookingDriverName('');
            setCurrentView(VIEW_IDS.CARRIER_APPOINTMENTS);
        } catch (err: any) {
            addToast('Error', err.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderSidebar = () => {
        const filteredItems = CARRIER_NAV_ITEMS.filter(item => item.label.replace('Carrier: ', '').toLowerCase().includes(searchTerm.toLowerCase()));

        return (
            <>
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
                <div className={`
                    w-[280px] h-screen fixed left-0 top-0 border-r border-slate-200 dark:border-white/10 
                    bg-white/95 dark:bg-[#121212]/95 backdrop-blur-xl flex flex-col z-50 transition-transform duration-300 shadow-2xl
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}>
                    <div className="h-24 flex items-center justify-between px-6 border-b border-slate-200 dark:border-white/5 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 flex items-center justify-center">
                                <Logo className="w-full h-full" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white block leading-none">
                                    SwiftYard
                                </span>
                                <span className="text-[10px] uppercase font-black tracking-widest text-blue-500 dark:text-blue-400">Carrier Portal</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="p-2 bg-slate-100 dark:bg-white/10 rounded-full hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                        >
                            <X className="w-4 h-4 text-slate-600 dark:text-gray-300" />
                        </button>
                    </div>

                    <div className="p-4 border-b border-slate-200 dark:border-white/5 shrink-0">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search UI..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-white/5 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0a84ff] text-slate-900 dark:text-white transition-all"
                            />
                        </div>
                    </div>

                    <nav className="flex-1 py-4 flex flex-col gap-1 px-3 overflow-y-auto custom-scrollbar">
                        {filteredItems.length === 0 ? (
                            <div className="py-8 text-center text-sm text-slate-500">
                                No UI matches "{searchTerm}"
                            </div>
                        ) : (
                            filteredItems.map(item => {
                                const Icon = item.icon === 'LayoutDashboard' ? LayoutDashboard :
                                    item.icon === 'CalendarPlus' ? CalendarPlus :
                                        item.icon === 'Calendar' ? Calendar : Building2;
                                const isActive = currentView === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => { setCurrentView(item.id); setIsSidebarOpen(false); }}
                                        className={`
                                        flex items-center p-3 rounded-xl transition-all duration-200 group w-full text-left
                                        ${isActive
                                                ? 'bg-[#0a84ff] text-white shadow-lg shadow-blue-900/50'
                                                : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                            }
                                    `}
                                    >
                                        <Icon className={`w-6 h-6 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-gray-400 group-hover:text-slate-900 dark:group-hover:text-white'}`} />
                                        <span className="ml-3 font-bold truncate flex-1">{item.label.replace('Carrier: ', '')}</span>
                                    </button>
                                );
                            })
                        )}
                    </nav>
                </div>
            </>
        );
    };

    return (
        <>
            {actionLoading && <LoadingIndicator message={actionLoadingMessage} fullScreen overlay />}
            <div className="flex h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white w-full overflow-hidden">
                {renderSidebar()}
                <main className="flex-1 flex flex-col h-full relative w-full transition-all duration-300">
                    {/* Header with UserProfile and Refresh - Matching Yard App style */}
                    <div className="w-full flex justify-between items-center px-8 pt-6 pb-2 shrink-0">
                        <div className="flex items-center">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="p-3 bg-white/60 dark:bg-black/40 backdrop-blur-md rounded-xl border border-white/20 shadow-sm hover:bg-white/80 dark:hover:bg-white/10 transition-colors mr-4"
                            >
                                <Menu className="w-6 h-6 text-slate-700 dark:text-gray-300" />
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleRefresh} disabled={isRefreshing} className="p-2.5 rounded-full bg-white dark:bg-white/10 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/20 transition-all"><RefreshCw className={`w-5 h-5 text-slate-600 dark:text-white ${isRefreshing ? 'animate-spin' : ''}`} /></button>
                            <UserProfile />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar bg-gradient-to-br from-slate-50 to-slate-200 dark:from-[#0f172a] dark:to-[#1e293b]">
                        <Suspense fallback={<div className="h-full flex items-center justify-center"><LoadingIndicator overlay={false} message="Loading view..." /></div>}>
                            {currentView === VIEW_IDS.CARRIER_DASHBOARD && (
                                <CarrierDashboard
                                    activeAppointments={activeAppointments}
                                    pastAppointments={pastAppointments}
                                    onSetSelectedApptId={setSelectedApptId}
                                    onSetIsDetailsModalOpen={setIsDetailsModalOpen}
                                />
                            )}
                            {currentView === VIEW_IDS.CARRIER_BOOKING && (
                                <CarrierBooking
                                    canEditBooking={canEdit(VIEW_IDS.CARRIER_BOOKING)}
                                    handleBooking={handleBooking}
                                    bookingFacilityId={bookingFacilityId}
                                    setBookingFacilityId={setBookingFacilityId}
                                    bookingLoad={bookingLoad}
                                    setBookingLoad={setBookingLoad}
                                    bookingStartTime={bookingStartTime}
                                    setBookingStartTime={setBookingStartTime}
                                    bookingTrailer={bookingTrailer}
                                    setBookingTrailer={setBookingTrailer}
                                    bookingType={bookingType}
                                    setBookingType={setBookingType}
                                    bookingDriverId={bookingDriverId}
                                    setBookingDriverId={setBookingDriverId}
                                    setBookingDriverName={setBookingDriverName}
                                    setIsNewDriverModalOpen={setIsNewDriverModalOpen}
                                    setIsNewTrailerTypeModalOpen={setIsNewTrailerTypeModalOpen}
                                    facilities={facilities}
                                    userProfile={userProfile}
                                    trailerTypes={availableTrailerTypes}
                                    availableDrivers={availableDrivers}
                                    isSubmitting={isSubmitting}
                                    isWithinOperationalHours={isWithinOperationalHours}
                                    operationalHint={operationalHint}
                                />
                            )}
                            {currentView === VIEW_IDS.CARRIER_APPOINTMENTS && (
                                <CarrierAppointments
                                    carrierAppointments={carrierAppointments}
                                    onSetSelectedApptId={setSelectedApptId}
                                    onSetIsDetailsModalOpen={setIsDetailsModalOpen}
                                    facilities={facilities}
                                />
                            )}
                            {currentView === VIEW_IDS.CARRIER_FACILITIES && (
                                <CarrierFacilities
                                    facilities={facilities}
                                    userProfile={userProfile}
                                />
                            )}
                        </Suspense>
                    </div>

                    <AppointmentDetailsModal
                        isOpen={isDetailsModalOpen}
                        onClose={() => { setIsDetailsModalOpen(false); setSelectedApptId(null); }}
                        appointmentId={selectedApptId || ''}
                    />

                    {/* New Driver Modal */}
                    {isNewDriverModalOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsNewDriverModalOpen(false)} />
                            <div className="relative bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Add New Driver</h3>
                                    <button onClick={() => setIsNewDriverModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                                        <X className="w-5 h-5 text-slate-500" />
                                    </button>
                                </div>

                                {/* Show facility and carrier info */}
                                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <p className="text-sm text-blue-800 dark:text-blue-200">
                                        <span className="font-bold">Facility:</span> {facilities.find(f => f.id === bookingFacilityId)?.name || bookingFacilityId}
                                    </p>
                                    <p className="text-sm text-blue-800 dark:text-blue-200">
                                        <span className="font-bold">Carrier:</span> {effectiveCarrierId}
                                    </p>
                                </div>

                                <form onSubmit={handleCreateDriver} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-2 uppercase">Driver Name</label>
                                        <input
                                            required
                                            value={newDriverName}
                                            onChange={e => setNewDriverName(e.target.value)}
                                            placeholder="Full Name"
                                            className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-2 uppercase">License Number</label>
                                        <input
                                            required
                                            value={newDriverLicense}
                                            onChange={e => setNewDriverLicense(e.target.value)}
                                            placeholder="DL Number"
                                            className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-2 uppercase">Phone Number</label>
                                        <input
                                            required
                                            type="tel"
                                            value={newDriverPhone}
                                            onChange={e => setNewDriverPhone(e.target.value)}
                                            placeholder="Phone Number"
                                            className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={isCreatingDriver}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                                        >
                                            {isCreatingDriver ? 'Creating...' : 'Add Driver'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* New Trailer Type Modal */}
                    {isNewTrailerTypeModalOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsNewTrailerTypeModalOpen(false)} />
                            <div className="relative bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Add New Equipment Type</h3>
                                    <button onClick={() => setIsNewTrailerTypeModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                                        <X className="w-5 h-5 text-slate-500" />
                                    </button>
                                </div>

                                <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                    <p className="text-sm text-indigo-800 dark:text-indigo-200">
                                        <span className="font-bold">Facility:</span> {facilities.find(f => f.id === bookingFacilityId)?.name || bookingFacilityId}
                                    </p>
                                </div>

                                <form onSubmit={handleCreateTrailerType} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-2 uppercase">Equipment / Trailer Type Name</label>
                                        <input
                                            required
                                            value={newTrailerTypeName}
                                            onChange={e => setNewTrailerTypeName(e.target.value)}
                                            placeholder="e.g. 53ft Dry Van"
                                            className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={isCreatingTrailerType}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                                        >
                                            {isCreatingTrailerType ? 'Creating...' : 'Add Equipment Type'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
};
