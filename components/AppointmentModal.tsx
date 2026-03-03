
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { ModalPortal } from './ui/ModalPortal';
import { X, Calendar, Clock, Truck, User, Briefcase, FileText, Package, Plus, Warehouse, Sparkles, Check, AlertCircle } from 'lucide-react';
import { Appointment, Resource } from '../types';
import { QuickAddDriverModal } from './QuickAddDriverModal';
import { DateTimePicker } from './ui/DateTimePicker';

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingId: string | null;
}

interface SuggestedDock {
    dock: Resource;
    score: number;
    reason: string;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({ isOpen, onClose, editingId }) => {
    const {
        appointments,
        addAppointment,
        updateAppointment,
        trailerTypes,
        carriers,
        drivers,
        docks,
        t,
        addToast,
        trailers,
        settings
    } = useData();

    // Core Fields
    const [startTime, setStartTime] = useState('');
    const [duration, setDuration] = useState(60);

    // Vehicle Fields
    const [trailerNumber, setTrailerNumber] = useState('');
    const [trailerType, setTrailerType] = useState('');
    const [isBobtail, setIsBobtail] = useState(false);

    // Driver & Carrier Fields
    const [carrierId, setCarrierId] = useState('');
    const [driverName, setDriverName] = useState('');

    // Cargo Fields
    const [poNumber, setPoNumber] = useState('');
    const [asnNumber, setAsnNumber] = useState('');
    const [palletCount, setPalletCount] = useState<number | ''>('');
    const [loadStatus, setLoadStatus] = useState<'Empty' | 'Loaded'>('Loaded');

    // Resource Assignment
    const [assignedResourceId, setAssignedResourceId] = useState('');
    const [suggestedDocks, setSuggestedDocks] = useState<SuggestedDock[]>([]);
    const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);

    // UI State
    const [isQuickAddDriverOpen, setIsQuickAddDriverOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (editingId) {
                const appt = appointments.find(a => a.id === editingId);
                if (appt) {
                    setStartTime(appt.startTime);
                    setDuration(appt.durationMinutes);

                    setTrailerNumber(appt.trailerNumber || '');
                    setTrailerType(appt.trailerType || '');
                    setIsBobtail(appt.isBobtail);

                    setDriverName(appt.driverName);
                    setCarrierId(appt.carrierId || '');

                    setPoNumber(appt.poNumber || '');
                    setAsnNumber(appt.asnNumber || '');
                    setPalletCount(appt.palletCount || '');
                    setLoadStatus(appt.loadStatus || 'Loaded');
                    setAssignedResourceId(appt.assignedResourceId || '');
                }
            } else {
                // Defaults
                const now = new Date();
                setStartTime(now.toISOString());
                setDuration(60);

                setTrailerNumber('');
                setTrailerType(trailerTypes.length > 0 ? trailerTypes[0].name : '');
                setIsBobtail(false);

                setDriverName('');
                setCarrierId('');

                setPoNumber('');
                setAsnNumber('');
                setPalletCount('');
                setLoadStatus('Loaded');
                setAssignedResourceId('');
            }
            setSuggestedDocks([]);
            setIsSuggestionsVisible(false);
        }
    }, [isOpen, editingId, appointments, trailerTypes]);

    // Filter drivers based on selected carrier AND exclude on-site drivers
    const filteredDrivers = useMemo(() => {
        // 1. Identify on-site drivers (associated with active trailers)
        const onSiteDriverIds = new Set(
            trailers
                .filter(t => ['GatedIn', 'MovingToDock', 'ReadyForCheckIn', 'CheckedIn', 'ReadyForCheckOut', 'CheckedOut', 'MovingToYard', 'InYard'].includes(t.status) && t.currentDriverId)
                .map(t => t.currentDriverId)
        );

        // 2. Filter list
        let list = drivers;
        if (carrierId) {
            const selectedCarrier = carriers.find(c => c.id === carrierId);
            list = list.filter(d => d.carrierId === carrierId || (selectedCarrier && d.carrierId === selectedCarrier.name));
        }

        return list.filter(d => !onSiteDriverIds.has(d.id));
    }, [drivers, carrierId, trailers, carriers]);

    useEffect(() => {
        const typeDef = trailerTypes.find(t => t.name === trailerType);
        if (!typeDef) return;

        // Base: Default Duration
        let calculated = typeDef.defaultDuration || 60;

        // Logic: If Pallet Count > 0 AND PerPallet rate exists
        if (palletCount && typeof palletCount === 'number' && palletCount > 0 && typeDef.processTimePerPallet && typeDef.processTimePerPallet > 0) {
            calculated = Math.ceil(palletCount * typeDef.processTimePerPallet);
        }

        setDuration(calculated);
    }, [palletCount, trailerType, trailerTypes]);

    // Operational Hours Validation
    const isWithinOperationalHours = useMemo(() => {
        if (!startTime) return true;

        const date = new Date(startTime);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const shifts = settings.workingHours?.[dayName] || [];

        // If no shifts defined for a day, we assume it's closed? 
        // Or if the settings are empty, we allow anything (failsafe).
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
    }, [startTime, settings.workingHours]);

    const operationalHint = useMemo(() => {
        if (!startTime) return null;
        const date = new Date(startTime);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const shifts = settings.workingHours?.[dayName] || [];

        if (shifts.length === 0) return `Facility is closed on ${dayName}`;
        return `Operating Hours: ${shifts.map(s => `${s.startTime}-${s.endTime}`).join(', ')}`;
    }, [startTime, settings.workingHours]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        // Validation
        if (!isBobtail && !trailerNumber.trim()) {
            addToast('Required', 'Trailer Number is required.', 'error');
            return;
        }

        if (!isWithinOperationalHours) {
            addToast('Outside Operational Hours', operationalHint || 'Selected time is outside facility operational hours.', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            // Explicitly format payload to use NULL for empty optionals (SQL safety)
            const payload: Partial<Appointment> = {
                startTime: new Date(startTime).toISOString(),
                durationMinutes: duration,

                isBobtail,
                trailerNumber: isBobtail ? null : trailerNumber,
                trailerType: isBobtail ? null : trailerType,

                carrierId: carrierId || null,
                driverName: driverName || 'Unknown Driver',

                poNumber: poNumber || null,
                asnNumber: asnNumber || null,
                palletCount: palletCount === '' ? null : Number(palletCount),
                loadStatus: loadStatus,
                assignedResourceId: assignedResourceId || null
            };

            if (editingId) {
                await updateAppointment(editingId, payload);
                addToast('Updated', 'Appointment updated successfully', 'success');
            } else {
                await addAppointment(payload);
                addToast('Created', 'Appointment created successfully', 'success');
            }
            onClose();
        } catch (error: any) {
            console.error("Appointment Save Error:", error);
            addToast('Error', error.message || 'Failed to save appointment', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDriverChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const val = e.target.value;
        setDriverName(val);

        // Auto-select carrier if driver is known AND carrier isn't already locked
        const knownDriver = drivers.find(d => d.name === val);
        if (knownDriver && knownDriver.carrierId && !carrierId) {
            const matchingCarrier = carriers.find(c => c.id === knownDriver.carrierId || c.name === knownDriver.carrierId);
            if (matchingCarrier) {
                setCarrierId(matchingCarrier.id);
            } else {
                setCarrierId(knownDriver.carrierId);
            }
        }
    };

    const handleQuickAddSuccess = (newId: string, name: string, newCarrierId?: string) => {
        setDriverName(name);
        if (newCarrierId) setCarrierId(newCarrierId);
        addToast('Success', 'Driver created and selected', 'success');
    };

    // --- DOCK SUGGESTION LOGIC ---
    const handleSuggestDocks = () => {
        const results: SuggestedDock[] = docks.filter(dock => {
            // 1. Availability Check
            if (dock.status !== 'Available') return false;

            // 2. Load Status vs Operation Mode Check
            const mode = dock.operationMode || 'Both';
            // Loaded usually implies Unloading (Inbound)
            if (loadStatus === 'Loaded' && mode === 'Outbound') return false;
            // Empty usually implies Loading (Outbound)
            if (loadStatus === 'Empty' && mode === 'Inbound') return false;

            // 3. Strict Constraint Filtering (if dock has restrictions, must match)
            const typeRestricted = dock.allowedTrailerTypes && dock.allowedTrailerTypes.length > 0;
            const carrierRestricted = dock.allowedCarrierIds && dock.allowedCarrierIds.length > 0;

            // If restricted, check for match. If not restricted, it passes (Universal).
            if (typeRestricted && !dock.allowedTrailerTypes.includes(trailerType)) return false;
            if (carrierRestricted && !dock.allowedCarrierIds.includes(carrierId)) return false;

            return true;
        }).map(dock => {
            // Scoring Logic
            let score = 0;
            let matchReasons: string[] = [];

            const typeRestricted = dock.allowedTrailerTypes && dock.allowedTrailerTypes.length > 0;
            const carrierRestricted = dock.allowedCarrierIds && dock.allowedCarrierIds.length > 0;

            // Priority: Both > Type > Carrier
            if (typeRestricted && dock.allowedTrailerTypes.includes(trailerType)) {
                score += 2;
                matchReasons.push("Type");
            }
            if (carrierRestricted && dock.allowedCarrierIds.includes(carrierId)) {
                score += 1;
                matchReasons.push("Carrier");
            }

            if (score === 0) {
                matchReasons.push("Universal");
            }

            return { dock, score, reason: matchReasons.join(' & ') };
        });

        // Sort by Score descending
        results.sort((a, b) => b.score - a.score);
        setSuggestedDocks(results);
        setIsSuggestionsVisible(true);
    };

    const selectSuggestion = (dockId: string) => {
        setAssignedResourceId(dockId);
        setIsSuggestionsVisible(false);
    };

    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-[#1a1a1a]">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingId ? t('common.edit') : t('schedule.new')}</h2>
                        <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5" /></button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

                        {/* 1. Vehicle Details */}
                        {!isBobtail && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Trailer Type *</label>
                                    <div className="relative">
                                        <Truck className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                        <select
                                            value={trailerType}
                                            onChange={e => setTrailerType(e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-3 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-[#0a84ff] appearance-none"
                                        >
                                            <option value="">Select Type</option>
                                            {trailerTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Load Status</label>
                                    <div className="flex bg-slate-100 dark:bg-black/20 rounded-xl p-1 border border-slate-200 dark:border-white/10">
                                        <button
                                            type="button"
                                            onClick={() => setLoadStatus('Loaded')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${loadStatus === 'Loaded' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 dark:text-gray-400'}`}
                                        >
                                            Loaded
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setLoadStatus('Empty')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${loadStatus === 'Empty' ? 'bg-slate-500 text-white shadow-sm' : 'text-slate-500 dark:text-gray-400'}`}
                                        >
                                            Empty
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Date & Time *</label>
                                <DateTimePicker
                                    value={startTime}
                                    onChange={setStartTime}
                                    isInvalid={!isWithinOperationalHours}
                                    hint={startTime ? operationalHint : null}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Duration (Min)</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                    <input
                                        type="number"
                                        min="15"
                                        step="15"
                                        value={duration}
                                        onChange={e => setDuration(parseInt(e.target.value))}
                                        className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-[#0a84ff]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. Trailer Number */}
                        {!isBobtail && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Trailer Number</label>
                                <div className="relative">
                                    <Truck className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                    <input
                                        value={trailerNumber}
                                        onChange={e => setTrailerNumber(e.target.value)}
                                        className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-[#0a84ff] uppercase font-medium"
                                        placeholder="TRL-####"
                                    />
                                </div>
                            </div>
                        )}

                        {/* 4. Carrier & Driver */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Carrier *</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                    <select
                                        value={carrierId}
                                        onChange={e => {
                                            setCarrierId(e.target.value);
                                            const driver = drivers.find(d => d.name === driverName);
                                            if (driver && driver.carrierId && driver.carrierId !== e.target.value) {
                                                setDriverName('');
                                            }
                                        }}
                                        className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-[#0a84ff] appearance-none"
                                    >
                                        <option value="">Select Carrier</option>
                                        {carriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Driver Name</label>
                                    <button
                                        type="button"
                                        onClick={() => setIsQuickAddDriverOpen(true)}
                                        className="text-[10px] font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> New Driver
                                    </button>
                                </div>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                    <select
                                        value={driverName}
                                        onChange={handleDriverChange as any}
                                        className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-[#0a84ff] appearance-none"
                                    >
                                        <option value="">Select Driver</option>
                                        {filteredDrivers.map(d => (
                                            <option key={d.id} value={d.name}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Dock Assignment Logic */}
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Assigned Dock (Optional)</label>
                                <button
                                    type="button"
                                    onClick={handleSuggestDocks}
                                    className="text-[10px] font-bold text-purple-500 hover:text-purple-400 flex items-center gap-1"
                                >
                                    <Sparkles className="w-3 h-3" /> Suggest Docks
                                </button>
                            </div>

                            {isSuggestionsVisible && (
                                <div className="mb-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-500/20 rounded-xl p-2 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex justify-between items-center px-2 pb-2 border-b border-purple-200 dark:border-purple-500/20 mb-2">
                                        <span className="text-xs font-bold text-purple-700 dark:text-purple-300">Suggested Docks for {loadStatus}</span>
                                        <button type="button" onClick={() => setIsSuggestionsVisible(false)}><X className="w-3 h-3 text-purple-400" /></button>
                                    </div>
                                    <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1">
                                        {suggestedDocks.length === 0 ? (
                                            <div className="text-center text-xs text-slate-400 py-2">No matching available docks found.</div>
                                        ) : (
                                            suggestedDocks.map((s, idx) => (
                                                <button
                                                    key={s.dock.id}
                                                    type="button"
                                                    onClick={() => selectSuggestion(s.dock.id)}
                                                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white dark:hover:bg-purple-500/20 transition-colors text-left group"
                                                >
                                                    <div>
                                                        <span className="text-sm font-bold text-slate-800 dark:text-white block">{s.dock.name}</span>
                                                        <span className="text-[10px] text-slate-500 dark:text-purple-300">Matches: {s.reason}</span>
                                                    </div>
                                                    {idx === 0 && <span className="text-[9px] bg-purple-500 text-white px-1.5 py-0.5 rounded">Best</span>}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="relative">
                                <Warehouse className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <select
                                    value={assignedResourceId}
                                    onChange={e => setAssignedResourceId(e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-3 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-[#0a84ff] appearance-none"
                                >
                                    <option value="">-- No Dock Assigned --</option>
                                    {docks.map(d => (
                                        <option key={d.id} value={d.id}>
                                            {d.name} {d.status !== 'Available' ? '(Occupied)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* 5. Details (PO, ASN, Pallets) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Purchase Order (PO) #</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                    <input
                                        value={poNumber}
                                        onChange={e => setPoNumber(e.target.value)}
                                        className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-[#0a84ff]"
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">ASN Number</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                    <input
                                        value={asnNumber}
                                        onChange={e => setAsnNumber(e.target.value)}
                                        className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-[#0a84ff]"
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Pallets</label>
                                <div className="relative">
                                    <Package className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                    <input
                                        type="number"
                                        min="0"
                                        value={palletCount}
                                        onChange={e => setPalletCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                                        className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-[#0a84ff]"
                                        placeholder="Qty"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 6. Bobtail Toggle (Bottom) */}
                        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                                    <Truck className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white text-sm">Driver only appointment</p>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">Driver checking in without trailer</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={isBobtail} onChange={e => setIsBobtail(e.target.checked)} />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                            </label>
                        </div>

                    </form>

                    <div className="p-6 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3 bg-slate-50 dark:bg-[#1a1a1a]">
                        <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors">{t('common.cancel')}</button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-8 py-3 bg-[#0a84ff] hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {editingId ? t('common.save') : 'Confirm Schedule'} <Clock className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <QuickAddDriverModal
                isOpen={isQuickAddDriverOpen}
                onClose={() => setIsQuickAddDriverOpen(false)}
                onSuccess={handleQuickAddSuccess}
            />
        </ModalPortal>
    );
};
