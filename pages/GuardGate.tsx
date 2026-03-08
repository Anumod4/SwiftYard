
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Truck, LogIn, LogOut, Search, User, FileText, Camera, Plus, Scale, X, CheckCircle2, Calendar } from 'lucide-react';
import { QuickAddDriverModal } from '../components/QuickAddDriverModal';
import { ModalPortal } from '../components/ui/ModalPortal';
import { TrailerStatus, Resource } from '../types';

export const GuardGate: React.FC = () => {
    const {
        appointments, trailers, drivers, carriers, trailerTypes, docks,
        addTrailer, updateTrailer, updateAppointment, gateOutTrailer: triggerGateOut, addAppointment,
        t, addToast, settings, yardSlots
    } = useData();

    const [activeTab, setActiveTab] = useState<'in' | 'out'>('in');

    // Gate In Form
    const [trailerNum, setTrailerNum] = useState('');
    const [trailerType, setTrailerType] = useState('');
    const [driverId, setDriverId] = useState('');
    const [driverName, setDriverName] = useState('');
    const [driverLicense, setDriverLicense] = useState('');
    const [driverPhone, setDriverPhone] = useState('');
    const [carrierId, setCarrierId] = useState('');
    const [carrierName, setCarrierName] = useState(''); // Allow free text if not in DB
    const [ewayBill, setEwayBill] = useState('');
    const [docExpiry, setDocExpiry] = useState(''); // New State for Expiry
    const [weight, setWeight] = useState('');

    // Gate Out Form & Modal
    const [outSearch, setOutSearch] = useState('');
    const [gateOutModalOpen, setGateOutModalOpen] = useState(false);
    const [selectedTrailerId, setSelectedTrailerId] = useState<string | null>(null);
    const [checkoutWeight, setCheckoutWeight] = useState('');
    const [checkoutDocs, setCheckoutDocs] = useState('');

    // Modals
    const [isQuickAddDriverOpen, setIsQuickAddDriverOpen] = useState(false);

    // Filter Drivers: Only show "Away" drivers (not currently on site)
    const availableDrivers = useMemo(() => {
        let filtered = drivers.filter(d => d.status === 'Away');

        // If a carrier is selected AND it exists in the Carriers table (meaning it's a known carrier ID,
        // not a free-text owner name), filter the drivers.
        // We check if carrierId exists in carriers to confirm it's an ID.
        if (carrierId && carriers.some(c => c.id === carrierId)) {
            filtered = filtered.filter(d => d.carrierId === carrierId);
        }

        // If we are currently editing an appointment and checking in, 
        // the already assigned driver should be visible even if they are marked On Site
        if (driverId && !filtered.find(d => d.id === driverId)) {
            const selectedDriver = drivers.find(d => d.id === driverId);
            if (selectedDriver) {
                filtered.push(selectedDriver);
            }
        }

        return filtered;
    }, [drivers, carrierId, driverId, carriers]);

    const handleDriverSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        setDriverId(selectedId);

        if (selectedId) {
            const driver = drivers.find(d => d.id === selectedId);
            if (driver) {
                setDriverName(driver.name);
                setDriverLicense(driver.licenseNumber);
                setDriverPhone(driver.phone);
                // If no carrier selected, auto-select driver's carrier
                if (!carrierId && driver.carrierId) {
                    // Driver's carrierId now stores carrier name
                    setCarrierId(driver.carrierId);
                    setCarrierName(driver.carrierId);
                }
            }
        } else {
            setDriverName('');
            setDriverLicense('');
            setDriverPhone('');
        }
    };

    // Handle Carrier Selection - filters drivers and clears driver if not compatible
    const handleCarrierSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedCarrier = e.target.value;
        setCarrierId(selectedCarrier);

        // Find carrier name
        const carrier = carriers.find(c => c.id === selectedCarrier || c.name === selectedCarrier);
        setCarrierName(carrier?.name || selectedCarrier);

        // Clear driver if it's not from the newly selected carrier
        if (driverId) {
            const driver = drivers.find(d => d.id === driverId);
            if (driver && driver.carrierId && driver.carrierId.toLowerCase() !== selectedCarrier.toLowerCase()) {
                setDriverId('');
                setDriverName('');
                setDriverLicense('');
                setDriverPhone('');
            }
        }
    };

    // Auto-fill logic
    const handleTrailerBlur = () => {
        if (!trailerNum.trim()) return;
        const normalizedNum = trailerNum.toLowerCase().trim();

        // 1. Check for Scheduled or PendingApproval Appointment (Priority for today's data)
        // PendingApproval status is for carrier-created appointments that need yard approval
        const scheduled = appointments.find(a =>
            (a.status === 'Scheduled' || a.status === 'PendingApproval') &&
            a.trailerNumber?.trim().toLowerCase() === normalizedNum
        );

        if (scheduled) {
            // DEBUG: Log the appointment data to see what's available
            console.log('[GuardGate] Found appointment:', scheduled);

            // Populate from Appointment
            if (scheduled.trailerType) setTrailerType(scheduled.trailerType);

            // Carrier - populate from appointment (carrierId now stores carrier name)
            console.log('[GuardGate] Appointment carrierId:', scheduled.carrierId, 'Available carriers:', carriers.map(c => ({ id: c.id, name: c.name })));
            if (scheduled.carrierId) {
                // Try to find carrier by name first (since carrierId now stores name)
                let carrier = carriers.find(ca => ca.name.toLowerCase() === scheduled.carrierId?.toLowerCase());
                // Try case-insensitive ID match
                if (!carrier) carrier = carriers.find(ca => ca.id.toLowerCase() === scheduled.carrierId?.toLowerCase());

                if (carrier) {
                    setCarrierId(carrier.name);  // Use carrier name as value to match dropdown
                    setCarrierName(carrier.name);
                } else {
                    // Carrier not found - set the name as-is
                    setCarrierId(scheduled.carrierId);
                    setCarrierName(scheduled.carrierId);
                }
            } else {
                // No carrierId in appointment - clear carrier fields
                setCarrierId('');
                setCarrierName('');
            }

            // Attempt to fill driver details if known
            console.log('[GuardGate] Looking for driver:', scheduled.driverName, 'Available drivers:', drivers.map(d => ({ id: d.id, name: d.name, phone: d.phone })));
            if (scheduled.driverName) {
                // Try to find driver by name (case-insensitive)
                let knownDriver = drivers.find(d => d.name.toLowerCase().trim() === scheduled.driverName?.toLowerCase().trim());

                // If not found by exact match, try partial match
                if (!knownDriver) {
                    knownDriver = drivers.find(d => d.name.toLowerCase().includes(scheduled.driverName?.toLowerCase().trim()));
                }

                if (knownDriver) {
                    console.log('[GuardGate] Driver found:', knownDriver);
                    setDriverId(knownDriver.id);
                    setDriverName(knownDriver.name);
                    setDriverLicense(knownDriver.licenseNumber);
                    setDriverPhone(knownDriver.phone);
                } else {
                    // If driver is unknown in our system, fill the name but can't select from dropdown
                    console.log('[GuardGate] Driver not found in drivers list, using appointment driverName');
                    setDriverId('');
                    setDriverName(scheduled.driverName || '');
                    setDriverLicense('');
                    setDriverPhone('');
                }
            }

            const statusMsg = scheduled.status === 'PendingApproval'
                ? "Pending Approval - Please approve before gating in"
                : "Found Schedule";
            addToast(scheduled.status === 'PendingApproval' ? "Appointment Pending" : "Found Schedule",
                scheduled.status === 'PendingApproval'
                    ? "This appointment requires approval before gate-in"
                    : "Details loaded from scheduled appointment.",
                scheduled.status === 'PendingApproval' ? "info" : "success");
            return;
        }

        // 2. Fallback to Trailer Registry (History)
        const existing = trailers.find(t => (t.number || '').toLowerCase().trim() === normalizedNum);
        if (existing) {
            // If we have an existing trailer, populate known fields
            let dataFound = false;

            if (existing.carrierId) {
                // Try to find carrier by name first (since carrierId now stores name)
                let carrier = carriers.find(ca => ca.name.toLowerCase() === existing.carrierId?.toLowerCase());
                // Try case-insensitive ID match
                if (!carrier) carrier = carriers.find(ca => ca.id.toLowerCase() === existing.carrierId?.toLowerCase());

                if (carrier) {
                    setCarrierId(carrier.name);  // Use carrier name as value to match dropdown
                    setCarrierName(carrier.name);
                } else {
                    setCarrierId(existing.carrierId);
                    setCarrierName(existing.owner || existing.carrierId);
                }
                dataFound = true;
            }

            if (existing.type && existing.type !== 'Unknown') {
                setTrailerType(existing.type);
                dataFound = true;
            }

            // Try to find the last known driver for this trailer
            let dId = existing.currentDriverId;
            let driver = drivers.find(d => d.id === dId);

            // If not found by ID, try to find by name
            if (!driver && existing.currentDriverId) {
                driver = drivers.find(d => d.name.toLowerCase() === existing.currentDriverId?.toLowerCase());
            }

            if (driver) {
                setDriverId(driver.id);
                setDriverName(driver.name);
                setDriverLicense(driver.licenseNumber);
                setDriverPhone(driver.phone);
                dataFound = true;
            }

            if (dataFound) {
                addToast("Auto-filled", "Trailer and Driver details loaded from history.", "info", 3000);
            }
        }
    };

    const handleGateIn = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            console.log('[GuardGate] Starting gate in process for:', trailerNum);
            console.log('[GuardGate] Current trailers:', trailers.map(t => ({ id: t.id, number: t.number })));

            // Determine Initial Status and Target based on Settings
            let initialStatus: TrailerStatus = 'GatedIn';
            let targetResId: string | undefined = undefined;
            let instructionTime: string | undefined = undefined;
            let apptStatus: string | undefined = undefined;

            // Check if appointment exists to see if we can use DockDirect
            const existingAppt = appointments.find(a => a.trailerNumber?.toLowerCase() === trailerNum.toLowerCase() && a.status === 'Scheduled');
            console.log('[GuardGate] Found appointment:', existingAppt);

            // Helper to check if resource matches trailer (type and carrier)
            const resourceMatches = (res: Resource) => {
                const matchesType = !res.allowedTrailerTypes || res.allowedTrailerTypes.length === 0 || res.allowedTrailerTypes.includes(trailerType);

                const currentCarrierToMatch = carrierName || carrierId || '';
                const matchingCarrier = carriers.find(c => c.name.toLowerCase() === currentCarrierToMatch.toLowerCase());
                const matchesCarrier = !res.allowedCarrierIds || res.allowedCarrierIds.length === 0 || (matchingCarrier && res.allowedCarrierIds.includes(matchingCarrier.id));

                return matchesType && matchesCarrier;
            };

            let foundAutomation = false;

            if (settings.gateInFlow === 'DockDirect') {
                // Option 2 Logic: Dock Direct Priority

                // 1. Assigned dock door if the dock door is available
                if (existingAppt && existingAppt.assignedResourceId) {
                    const assignedDock = docks.find(d => d.id === existingAppt.assignedResourceId);
                    if (assignedDock && assignedDock.status === 'Available') {
                        initialStatus = 'MovingToDock';
                        targetResId = assignedDock.id;
                        instructionTime = new Date().toISOString();
                        apptStatus = 'MovingToDock';
                        foundAutomation = true;
                    }
                }

                // 2. Any AVAILABLE dock door based on carrier and trailer type matching
                if (!foundAutomation) {
                    const availableDock = docks.find(d => d.status === 'Available' && d.type === 'Dock' && resourceMatches(d));
                    if (availableDock) {
                        initialStatus = 'MovingToDock';
                        targetResId = availableDock.id;
                        instructionTime = new Date().toISOString();
                        apptStatus = 'MovingToDock';
                        foundAutomation = true;
                    }
                }
            }

            // Fallback for DockDirect failure or if YardDefault is configured
            if (!foundAutomation) {
                // Option 1 Logic: Move to Yard

                // 1. Default yard slot (existing config in settings ui)
                if (settings.defaultYardSlotId) {
                    const defaultSlot = yardSlots.find(s => s.id === settings.defaultYardSlotId);
                    if (defaultSlot && defaultSlot.status === 'Available') {
                        initialStatus = 'MovingToYard';
                        targetResId = defaultSlot.id;
                        instructionTime = new Date().toISOString();
                        apptStatus = existingAppt ? 'GatedIn' : undefined;
                        foundAutomation = true;
                    }
                }

                // 2. Next available yard slot sorted by location name
                if (!foundAutomation) {
                    const availableSlot = [...yardSlots]
                        .filter(s => s.status === 'Available')
                        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))[0];

                    if (availableSlot) {
                        initialStatus = 'MovingToYard';
                        targetResId = availableSlot.id;
                        instructionTime = new Date().toISOString();
                        apptStatus = existingAppt ? 'GatedIn' : undefined;
                        foundAutomation = true;
                    }
                }
            }

            // If still no automation found (no docks, no slots, or ad-hoc with no defaults)
            if (!foundAutomation) {
                initialStatus = 'GatedIn';
                apptStatus = existingAppt ? 'GatedIn' : undefined;
            }

            // 1. Determine if Trailer exists, create or update
            const existingTrailer = trailers.find(t => t.number?.toLowerCase() === trailerNum.toLowerCase());
            console.log('[GuardGate] Existing trailer found:', existingTrailer);

            // Get carrier name to save (use carrierName which has the resolved name, fallback to carrierId)
            const carrierToSave = carrierName || carrierId || '';

            // Get facilityId from existing appointment or use current facility
            const facilityIdForTrailer = existingAppt?.facilityId || '';
            console.log('[GuardGate] Facility ID for trailer:', facilityIdForTrailer);

            // Also get from localStorage as backup
            const localStorageFacility = localStorage.getItem('swiftyard_facility_id');
            console.log('[GuardGate] Facility from localStorage:', localStorageFacility);

            const trailerPayload: any = {
                status: initialStatus,
                type: trailerType || 'Unknown',
                carrierId: carrierToSave || undefined,  // Save carrier NAME (not ID) to match other parts of the system
                owner: carrierToSave || 'Unknown',       // Also save as owner for display
                currentDriverId: driverId || undefined,
                ewayBillNumber: ewayBill || undefined,
                ewayBillExpiry: docExpiry || undefined,
                checkInWeight: weight ? parseFloat(weight) : undefined,
                targetResourceId: targetResId,
                instructionTimestamp: instructionTime,
                facilityId: facilityIdForTrailer || localStorageFacility || undefined,  // Include facilityId for trailer creation
                location: null // Clear previous trip's location when gating in
            };
            console.log('[GuardGate] Trailer payload:', trailerPayload);

            if (existingTrailer) {
                console.log('[GuardGate] Updating existing trailer:', existingTrailer.id);
                await updateTrailer(existingTrailer.id, trailerPayload);
            } else {
                // Create new trailer record
                const id = `TRL-${Date.now()}`;
                console.log('[GuardGate] Creating new trailer with id:', id, 'payload:', trailerPayload);
                try {
                    await addTrailer({ ...trailerPayload, id, number: trailerNum });
                    console.log('[GuardGate] Trailer created successfully');
                } catch (err) {
                    console.error('[GuardGate] Error creating trailer:', err);
                    addToast('Error', 'Failed to create trailer: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
                    return;
                }
            }

            // 2. Update or Create Appointment
            if (existingAppt) {
                await updateAppointment(existingAppt.id, {
                    status: apptStatus as any || 'GatedIn',
                    driverName: driverName,
                    carrierId: carrierToSave || undefined,  // Save carrier NAME
                    instructionTimestamp: instructionTime
                });
            } else {
                // Create ad-hoc appointment
                await addAppointment({
                    trailerNumber: trailerNum,
                    trailerType: trailerType,
                    driverName: driverName,
                    carrierId: carrierToSave || undefined,  // Save carrier NAME
                    status: 'Scheduled', // Ad-hoc always starts Scheduled logic-wise, then immediate gate-in
                    startTime: new Date().toISOString(),
                    durationMinutes: 60,
                    isBobtail: false
                });
                // Note: The logic above assumes ad-hoc doesn't trigger DockDirect because no dock assigned yet.
                // So for ad-hoc, it effectively just Gates In.
            }

            addToast('Entry Processed', `${trailerNum} gated in successfully.`, 'success');

            // Reset Form
            setTrailerNum('');
            setTrailerType('');
            setDriverId('');
            setDriverName('');
            setDriverLicense('');
            setDriverPhone('');
            setCarrierId('');
            setCarrierName('');
            setEwayBill('');
            setDocExpiry('');
            setWeight('');

        } catch (err: any) {
            addToast('Error', err.message, 'error');
        }
    };

    const openGateOutModal = (id: string) => {
        setSelectedTrailerId(id);
        setCheckoutWeight('');
        setCheckoutDocs('');
        setGateOutModalOpen(true);
    };

    const handleGateOutConfirm = async () => {
        if (!selectedTrailerId) return;
        try {
            await triggerGateOut(
                selectedTrailerId,
                checkoutWeight ? parseFloat(checkoutWeight) : undefined,
                checkoutDocs || undefined
            );
            setGateOutModalOpen(false);
            setSelectedTrailerId(null);
        } catch (err: any) {
            addToast('Error', err.message, 'error');
        }
    };

    const handleQuickAddSuccess = (newId: string, name: string, cId?: string) => {
        setDriverId(newId);
        setDriverName(name);
        if (cId) setCarrierId(cId);
    };

    // Filter for Gate Out Tab
    const trailersToExit = trailers.filter(t =>
        ['CheckedOut', 'ReadyForCheckOut'].includes(t.status) &&
        (t.number.toLowerCase().includes(outSearch.toLowerCase()))
    );

    return (
        <div className="p-8 h-full flex flex-col animate-in fade-in duration-700">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tighter mb-2">{t('guard.title')}</h1>
                    <p className="text-muted text-lg opacity-80">{t('guard.subtitle')}</p>
                </div>
            </div>

            <div className="flex gap-6 mb-10">
                <button
                    onClick={() => setActiveTab('in')}
                    className={`flex-1 py-5 rounded-[2rem] flex items-center justify-center gap-4 transition-all border-4 ${activeTab === 'in' ? 'bg-surface border-primary shadow-2xl shadow-primary/20' : 'bg-transparent border-transparent text-muted hover:bg-muted/5'}`}
                >
                    <LogIn className={`w-7 h-7 ${activeTab === 'in' ? 'text-primary' : 'opacity-40'}`} />
                    <span className="font-black text-xl uppercase tracking-widest">{t('guard.induct')}</span>
                </button>
                <button
                    onClick={() => setActiveTab('out')}
                    className={`flex-1 py-5 rounded-[2rem] flex items-center justify-center gap-4 transition-all border-4 ${activeTab === 'out' ? 'bg-surface border-orange-500 shadow-2xl shadow-orange-500/20' : 'bg-transparent border-transparent text-muted hover:bg-muted/5'}`}
                >
                    <LogOut className={`w-7 h-7 ${activeTab === 'out' ? 'text-orange-500' : 'opacity-40'}`} />
                    <span className="font-black text-xl uppercase tracking-widest">{t('guard.exodus')}</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeTab === 'in' ? (
                    <GlassCard className="p-10 max-w-5xl mx-auto rounded-[3rem] border-border/50">
                        <form onSubmit={handleGateIn} className="space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

                                {/* Vehicle Details */}
                                <div className="space-y-8">
                                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted opacity-50 border-b border-border/50 pb-3">Vehicle Information</h3>
                                    <div>
                                        <label className="block text-[10px] font-black text-muted mb-2 uppercase tracking-widest opacity-60">{t('guard.trailerNum')} *</label>
                                        <div className="relative">
                                            <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/40" />
                                            <input
                                                required
                                                value={trailerNum}
                                                onChange={e => setTrailerNum(e.target.value)}
                                                onBlur={handleTrailerBlur}
                                                className="w-full bg-muted/5 border border-border rounded-2xl pl-12 pr-4 py-4 text-xl font-black text-foreground uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all tracking-tight"
                                                placeholder="Enter Trailer ID"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-muted mb-2 uppercase tracking-widest opacity-60">Trailer Type</label>
                                        <select
                                            value={trailerType}
                                            onChange={e => setTrailerType(e.target.value)}
                                            className="w-full bg-muted/5 border border-border rounded-2xl px-4 py-4 text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                                        >
                                            <option value="">-- Select Type --</option>
                                            {trailerTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-muted mb-2 uppercase tracking-widest opacity-60">{t('guard.carrier')}</label>
                                        <select
                                            value={carrierId}
                                            onChange={handleCarrierSelect}
                                            className="w-full bg-muted/5 border border-border rounded-2xl px-4 py-4 text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                                        >
                                            <option value="">-- {t('guard.selectCarrier')} --</option>
                                            {carriers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Driver Details */}
                                <div className="space-y-8">
                                    <div className="flex justify-between items-end border-b border-border/50 pb-3">
                                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted opacity-50">Driver Information</h3>
                                        <button type="button" onClick={() => setIsQuickAddDriverOpen(true)} className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                                            <Plus className="w-3.5 h-3.5" /> New Driver
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-muted mb-2 uppercase tracking-widest opacity-60">{t('guard.driverName')} *</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/40" />
                                            <select
                                                required
                                                value={driverId}
                                                onChange={handleDriverSelect}
                                                className="w-full bg-muted/5 border border-border rounded-2xl pl-12 pr-4 py-4 text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                                            >
                                                <option value="">-- Select Driver --</option>
                                                {availableDrivers.map(d => (
                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-muted mb-2 uppercase tracking-widest opacity-60">{t('guard.driverLicense')}</label>
                                            <input
                                                value={driverLicense}
                                                onChange={e => setDriverLicense(e.target.value)}
                                                className="w-full bg-muted/5 border border-border rounded-2xl px-4 py-4 text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                placeholder="License #"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-muted mb-2 uppercase tracking-widest opacity-60">{t('guard.driverPhone')}</label>
                                            <input
                                                value={driverPhone}
                                                onChange={e => setDriverPhone(e.target.value)}
                                                className="w-full bg-muted/5 border border-border rounded-2xl px-4 py-4 text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                placeholder="Phone #"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-black text-muted mb-2 uppercase tracking-widest opacity-60">Document Information</label>
                                            <div className="flex gap-3">
                                                <input
                                                    value={ewayBill}
                                                    onChange={e => setEwayBill(e.target.value)}
                                                    className="w-full bg-muted/5 border border-border rounded-2xl px-4 py-4 text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                    placeholder="Doc Number (Optional)"
                                                />
                                                <button type="button" className="px-5 bg-muted/10 rounded-2xl text-muted hover:bg-muted/20 hover:text-foreground transition-all">
                                                    <Camera className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-muted mb-2 uppercase tracking-widest opacity-60">Document Expiry</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/40" />
                                                <input
                                                    type="date"
                                                    value={docExpiry}
                                                    onChange={e => setDocExpiry(e.target.value)}
                                                    className="w-full bg-muted/5 border border-border rounded-2xl pl-12 pr-4 py-4 text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-muted mb-2 uppercase tracking-widest opacity-60">Weight (kg)</label>
                                            <div className="relative">
                                                <Scale className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/40" />
                                                <input
                                                    type="number"
                                                    value={weight}
                                                    onChange={e => setWeight(e.target.value)}
                                                    className="w-full bg-muted/5 border border-border rounded-2xl pl-12 pr-4 py-4 text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                    placeholder="Optional"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-border/50 flex justify-end">
                                <button
                                    type="submit"
                                    className="px-12 py-5 bg-primary hover:bg-primary/90 text-white rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-primary/20 active:scale-95 transition-all flex items-center gap-3"
                                >
                                    <LogIn className="w-6 h-6" /> {t('guard.gateInBtn')}
                                </button>
                            </div>
                        </form>
                    </GlassCard>
                ) : (
                    <div className="space-y-6">
                        <div className="max-w-xl mx-auto relative mb-12">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/40" />
                            <input
                                value={outSearch}
                                onChange={e => setOutSearch(e.target.value)}
                                className="w-full bg-surface border border-border rounded-full pl-14 pr-6 py-4 text-foreground focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 font-bold shadow-lg"
                                placeholder="Search vehicle to exit..."
                            />
                        </div>

                        {trailersToExit.length === 0 ? (
                            <div className="text-center py-20 text-slate-400 dark:text-gray-500">
                                <LogOut className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p>No vehicles ready for departure found.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {trailersToExit.map(trailer => (
                                    <GlassCard key={trailer.id} className="p-8 flex flex-col items-center text-center rounded-[2.5rem] border-orange-500/20 hover:border-orange-500 transition-all group shadow-xl">
                                        <div className="w-20 h-20 rounded-[2rem] bg-orange-500/10 flex items-center justify-center mb-6 transform transition-transform group-hover:scale-110 group-hover:rotate-3">
                                            <Truck className="w-10 h-10 text-orange-500" />
                                        </div>
                                        <h3 className="text-3xl font-black text-foreground tracking-tighter mb-2">{trailer.number}</h3>
                                        <p className="text-sm font-black uppercase tracking-widest text-muted opacity-60 mb-8">{trailer.owner}</p>

                                        <button
                                            onClick={() => openGateOutModal(trailer.id)}
                                            className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            <LogOut className="w-4 h-4" /> {t('guard.gateOutBtn')}
                                        </button>
                                    </GlassCard>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <QuickAddDriverModal
                isOpen={isQuickAddDriverOpen}
                onClose={() => setIsQuickAddDriverOpen(false)}
                onSuccess={handleQuickAddSuccess}
            />

            {gateOutModalOpen && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                        <div className="bg-surface w-full max-w-md rounded-[2.5rem] shadow-2xl border border-border overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/5">
                                <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
                                    <LogOut className="w-6 h-6 text-orange-500" /> Confirm Exit
                                </h2>
                                <button onClick={() => setGateOutModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/10 text-muted transition-colors"><X className="w-5 h-5" /></button>
                            </div>

                            <div className="p-8 space-y-6">
                                <p className="text-sm font-bold text-muted opacity-80 leading-relaxed">
                                    Please verify checkout details before finalizing the departure.
                                </p>
                                <div>
                                    <label className="block text-[10px] font-black text-muted mb-2 uppercase tracking-widest opacity-60">Checkout Weight (kg)</label>
                                    <div className="relative">
                                        <Scale className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/40" />
                                        <input
                                            type="number"
                                            value={checkoutWeight}
                                            onChange={e => setCheckoutWeight(e.target.value)}
                                            className="w-full bg-muted/5 border border-border rounded-2xl pl-12 pr-4 py-4 text-foreground font-black focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                            placeholder="Optional"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-muted mb-2 uppercase tracking-widest opacity-60">Document Information</label>
                                    <div className="relative">
                                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/40" />
                                        <input
                                            value={checkoutDocs}
                                            onChange={e => setCheckoutDocs(e.target.value)}
                                            className="w-full bg-muted/5 border border-border rounded-2xl pl-12 pr-4 py-4 text-foreground font-black focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                            placeholder="Optional"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 p-6 bg-muted/5 border-t border-border">
                                <button onClick={() => setGateOutModalOpen(false)} className="px-6 py-3 text-sm font-black uppercase tracking-widest text-muted hover:text-foreground transition-colors">Cancel</button>
                                <button
                                    onClick={handleGateOutConfirm}
                                    className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-500/30 flex items-center gap-2 active:scale-95 transition-all"
                                >
                                    <CheckCircle2 className="w-4 h-4" /> Confirm Exit
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
};
