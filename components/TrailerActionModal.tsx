
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { ModalPortal } from './ui/ModalPortal';
import { X, Truck, Container, Warehouse, LogOut, Navigation } from 'lucide-react';

interface TrailerActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointmentId: string;
}

export const TrailerActionModal: React.FC<TrailerActionModalProps> = ({ isOpen, onClose, appointmentId }) => {
    const {
        appointments,
        trailers,
        docks,
        yardSlots,
        updateAppointment,
        updateTrailer,
        addToast
    } = useData();

    const [selectedDockId, setSelectedDockId] = useState('');
    const [selectedSlotId, setSelectedSlotId] = useState('');
    const [action, setAction] = useState<'none' | 'to-dock' | 'to-yard' | 'exit'>('none');

    if (!isOpen) return null;

    const appt = appointments.find(a => a.id === appointmentId);
    if (!appt) return null;

    const trailer = trailers.find(t => t.number.toLowerCase() === appt.trailerNumber?.toLowerCase());
    const status = trailer?.status;
    const currentLocationId = trailer?.location;

    // Logic for display options
    const showToYard = status === 'GatedIn' || status === 'InYard';
    const showToDock = status === 'GatedIn' || status === 'InYard';
    const showExit = status === 'CheckedIn';

    const handleConfirm = async () => {
        try {
            const timestamp = new Date().toISOString();

            if (action === 'to-dock' && selectedDockId) {
                // Instruct driver to move to dock
                await updateAppointment(appt.id, {
                    assignedResourceId: selectedDockId,
                    status: 'MovingToDock',
                    acknowledgementStatus: 'Pending',
                    instructionTimestamp: timestamp
                });
                // Also update trailer status to reflect movement, and store destination dock so driver app can display it
                if (trailer) await updateTrailer(trailer.id, {
                    status: 'MovingToDock',
                    targetResourceId: selectedDockId,
                    instructionTimestamp: timestamp
                });

                addToast('Instruction Sent', 'Driver notified to proceed to dock.', 'success');

            } else if (action === 'exit') {
                // Instruct driver to leave dock
                await updateAppointment(appt.id, {
                    status: 'ReadyForCheckOut',
                    acknowledgementStatus: 'Pending',
                    instructionTimestamp: timestamp
                });
                if (trailer) await updateTrailer(trailer.id, {
                    status: 'ReadyForCheckOut',
                    instructionTimestamp: timestamp
                });

                addToast('Instruction Sent', 'Driver notified to check out of dock.', 'success');

            } else if (action === 'to-yard' && selectedSlotId) {
                // Instruct driver to move to yard slot
                // We use the Trailer record primarily for yard moves
                if (trailer) {
                    await updateTrailer(trailer.id, {
                        status: 'MovingToYard',
                        targetResourceId: selectedSlotId,
                        instructionTimestamp: timestamp
                    });
                }
                // If there's an active appointment, we might need to dissociate or update it
                // For now, if moving to yard, we assume the dock appointment is done or not relevant
                if (appt.status !== 'Completed' && appt.status !== 'Cancelled') {
                    // Keep appointment linked but maybe update status? 
                    // If it's a "Drop" appointment, it might be completing.
                    // If it's "Waiting", it stays scheduled.
                    // For this flow, we just focus on the trailer movement.
                }

                addToast('Instruction Sent', 'Driver notified to proceed to yard.', 'success');
            }
            onClose();
        } catch (err) {
            console.error(err);
            addToast('Error', 'Failed to send instruction.', 'error');
        }
    };

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-[#1a1a1a]">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-500/10 p-2 rounded-lg text-blue-600">
                                <Truck className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Send Instruction</h2>
                                <p className="text-xs text-slate-500 dark:text-gray-400">{appt.trailerNumber || 'Bobtail'} • {appt.driverName}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="p-6 space-y-6">
                        <p className="text-sm text-slate-600 dark:text-gray-300">
                            Select an action to trigger a notification on the Driver App.
                        </p>

                        <div className="grid grid-cols-1 gap-4">
                            {showToYard && (
                                <div className={`border rounded-xl p-4 transition-all cursor-pointer ${action === 'to-yard' ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500' : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'}`} onClick={() => setAction('to-yard')}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <Container className="w-5 h-5 text-emerald-500" />
                                        <span className="font-bold text-slate-900 dark:text-white">Move to Yard</span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-gray-400 mb-3">Instruct driver to park in a yard slot.</p>
                                    {action === 'to-yard' && (
                                        <select
                                            value={selectedSlotId}
                                            onChange={(e) => setSelectedSlotId(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full bg-white dark:bg-black/20 border border-slate-300 dark:border-white/20 rounded-lg p-2 text-sm outline-none"
                                        >
                                            <option value="">-- Select Yard Slot --</option>
                                            {yardSlots.filter(s => s.status === 'Available' && s.id !== currentLocationId).map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}

                            {showToDock && (
                                <div className={`border rounded-xl p-4 transition-all cursor-pointer ${action === 'to-dock' ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500' : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'}`} onClick={() => setAction('to-dock')}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <Warehouse className="w-5 h-5 text-blue-500" />
                                        <span className="font-bold text-slate-900 dark:text-white">Assign to Dock</span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-gray-400 mb-3">Instruct driver to proceed to a dock door.</p>
                                    {action === 'to-dock' && (
                                        <select
                                            value={selectedDockId}
                                            onChange={(e) => setSelectedDockId(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full bg-white dark:bg-black/20 border border-slate-300 dark:border-white/20 rounded-lg p-2 text-sm outline-none"
                                        >
                                            <option value="">-- Select Dock --</option>
                                            {docks.filter(d => d.id !== currentLocationId).map(d => (
                                                <option key={d.id} value={d.id}>{d.name} {d.status !== 'Available' ? '(Occupied)' : ''}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}

                            {showExit && (
                                <div className={`border rounded-xl p-4 transition-all cursor-pointer ${action === 'exit' ? 'border-orange-500 bg-orange-500/5 ring-1 ring-orange-500' : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'}`} onClick={() => setAction('exit')}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <LogOut className="w-5 h-5 text-orange-500" />
                                        <span className="font-bold text-slate-900 dark:text-white">Check Out of Dock</span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">Instruct driver to leave the dock (e.g., to Yard or Exit).</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-[#1a1a1a] border-t border-slate-200 dark:border-white/10 flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white font-bold text-sm">Cancel</button>
                        <button
                            disabled={action === 'none' || (action === 'to-yard' && !selectedSlotId) || (action === 'to-dock' && !selectedDockId)}
                            onClick={handleConfirm}
                            className="px-6 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg font-bold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Navigation className="w-4 h-4" /> Send Instruction
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};
