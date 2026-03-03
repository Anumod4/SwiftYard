
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
    X
} from 'lucide-react';
import { VIEW_IDS, CARRIER_NAV_ITEMS } from '../constants';

// Lazy load sub-views
const CarrierDashboard = lazy(() => import('./carrier/CarrierDashboard').then(m => ({ default: m.CarrierDashboard })));
const CarrierBooking = lazy(() => import('./carrier/CarrierBooking').then(m => ({ default: m.CarrierBooking })));
const CarrierAppointments = lazy(() => import('./carrier/CarrierAppointments').then(m => ({ default: m.CarrierAppointments })));
const CarrierFacilities = lazy(() => import('./carrier/CarrierFacilities').then(m => ({ default: m.CarrierFacilities })));

export const CarrierPortal: React.FC = () => {
    const { userProfile, signOut, currentCarrier } = useAuth();
    const { facilities, appointments, addAppointment, trailerTypes, addToast, refreshData, canEdit, theme, actionLoading, actionLoadingMessage, drivers, addDriver, carriers, settings } = useData();
    const [currentView, setCurrentView] = useState(VIEW_IDS.CARRIER_DASHBOARD);
    const [isRefreshing, setIsRefreshing] = useState(false);

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

    const renderSidebar = () => (
        <div className="w-20 lg:w-64 h-screen fixed left-0 top-0 border-r border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#121212]/90 backdrop-blur-xl flex flex-col z-50 transition-colors duration-300">
            <div className="h-24 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-200 dark:border-white/5">
                <div className="w-20 h-20 flex items-center justify-center">
                    <Logo className="w-full h-full" />
                </div>
                <div className="hidden lg:flex ml-3 flex-col">
                    <span className="font-bold text-2xl tracking-tight text-slate-900 dark:text-white block leading-none">
                        SwiftYard
                    </span>
                    <span className="text-[10px] uppercase font-black tracking-widest text-blue-500 dark:text-blue-400">Carrier Portal</span>
                </div>
            </div>

            <nav className="flex-1 py-8 flex flex-col gap-2 px-3 overflow-y-auto custom-scrollbar">
                {CARRIER_NAV_ITEMS.map(item => {
                    const Icon = item.icon === 'LayoutDashboard' ? LayoutDashboard :
                        item.icon === 'CalendarPlus' ? CalendarPlus :
                            item.icon === 'Calendar' ? Calendar : Building2;
                    const isActive = currentView === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => setCurrentView(item.id)}
                            className={`
                              flex items-center p-3 rounded-xl transition-all duration-200 group
                              ${isActive
                                    ? 'bg-[#0a84ff] text-white shadow-lg shadow-blue-900/50'
                                    : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                }
                          `}
                        >
                            <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-slate-400 dark:text-gray-400 group-hover:text-slate-900 dark:group-hover:text-white'}`} />
                            <span className="hidden lg:block ml-3 font-medium">{item.label.replace('Carrier: ', '')}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );

    return (
        <>
            {actionLoading && <LoadingIndicator message={actionLoadingMessage} fullScreen overlay />}
            <div className="flex h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white">
                {renderSidebar()}
                <main className="flex-1 flex flex-col h-full relative ml-20 lg:ml-64 transition-all duration-300">
                    {/* Header with UserProfile and Refresh - Matching Yard App style */}
                    <div className="w-full flex justify-end items-center px-8 pt-6 pb-2 shrink-0">
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
                                    facilities={facilities}
                                    userProfile={userProfile}
                                    trailerTypes={trailerTypes}
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
                </main>
            </div>
        </>
    );
};
