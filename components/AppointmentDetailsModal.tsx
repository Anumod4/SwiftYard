
import React from 'react';
import { useData } from '../contexts/DataContext';
import { ModalPortal } from './ui/ModalPortal';
import { X, Calendar, Clock, MapPin, Truck, User, FileText, Package, Briefcase, Info, List } from 'lucide-react';

interface AppointmentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointmentId: string;
}

export const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({ isOpen, onClose, appointmentId }) => {
    const { appointments, docks, yardSlots, carriers, formatDate, formatDateTime } = useData();

    if (!isOpen) return null;

    const appt = appointments.find(a => a.id === appointmentId);
    if (!appt) return null;

    const locationName = [...docks, ...yardSlots].find(r => r.id === appt.assignedResourceId)?.name || 'Unassigned';

    // Robust carrier name lookup with case-insensitive matching
    const getCarrierName = (id?: string) => {
        if (!id) return 'N/A';
        // Try exact match first
        let c = carriers.find(c => c.id === id);
        // Try case-insensitive match
        if (!c) c = carriers.find(c => c.id.toLowerCase() === id.toLowerCase());
        // Try matching by name as fallback
        if (!c) c = carriers.find(c => c.name.toLowerCase() === id.toLowerCase());
        return c ? c.name : id;
    };
    const carrierName = getCarrierName(appt.carrierId);

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-start bg-slate-50 dark:bg-[#1a1a1a]">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Appointment Details</h2>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${appt.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' :
                                        appt.status === 'Scheduled' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' :
                                            appt.status === 'Cancelled' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
                                                'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                    }`}>
                                    {appt.status.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-mono select-all">ID: {appt.id}</p>
                        </div>
                        <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

                            {/* Timing */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest border-b border-slate-100 dark:border-white/5 pb-2">Schedule</h3>
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-gray-300">{formatDate(appt.startTime)}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-gray-300">
                                        {new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        <span className="text-slate-400 text-xs ml-1">({appt.durationMinutes} min)</span>
                                    </span>
                                </div>
                            </div>

                            {/* Location */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest border-b border-slate-100 dark:border-white/5 pb-2">Location</h3>
                                <div className="flex items-center gap-3">
                                    <MapPin className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{locationName}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Info className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm text-slate-600 dark:text-gray-400">{appt.appointmentType || 'Standard'} • {appt.loadType || 'General'}</span>
                                </div>
                            </div>

                            {/* Driver & Carrier */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest border-b border-slate-100 dark:border-white/5 pb-2">Driver & Carrier</h3>
                                <div className="flex items-center gap-3">
                                    <User className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-gray-300">{appt.driverName}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Briefcase className="w-4 h-4 text-slate-400" />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-700 dark:text-gray-300">{carrierName}</span>
                                        {appt.carrierId && carriers.find(c => c.id === appt.carrierId)?.bufferTimeMinutes !== undefined && (
                                            <span className="text-[10px] font-bold text-[#0a84ff] flex items-center gap-1 mt-0.5">
                                                <Clock className="w-3 h-3" /> Buffer: {carriers.find(c => c.id === appt.carrierId)?.bufferTimeMinutes}m
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Vehicle */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest border-b border-slate-100 dark:border-white/5 pb-2">Vehicle</h3>
                                <div className="flex items-center gap-3">
                                    <Truck className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{appt.isBobtail ? 'Bobtail' : appt.trailerNumber}</span>
                                </div>
                                {!appt.isBobtail && (
                                    <div className="flex items-center gap-3 pl-7">
                                        <span className="text-xs text-slate-500">{appt.trailerType}</span>
                                    </div>
                                )}
                            </div>

                            {/* Cargo */}
                            <div className="col-span-1 md:col-span-2 space-y-3">
                                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest border-b border-slate-100 dark:border-white/5 pb-2">Cargo Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm text-slate-600 dark:text-gray-400">PO: <span className="text-slate-900 dark:text-white font-mono font-bold">{appt.poNumber || '-'}</span></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm text-slate-600 dark:text-gray-400">ASN: <span className="text-slate-900 dark:text-white font-mono font-bold">{appt.asnNumber || '-'}</span></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm text-slate-600 dark:text-gray-400">Pallets: <span className="text-slate-900 dark:text-white font-bold">{appt.palletCount || 0}</span></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Info className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm text-slate-600 dark:text-gray-400">Status: <span className="text-slate-900 dark:text-white font-bold">{appt.loadStatus}</span></span>
                                    </div>
                                </div>
                            </div>

                            {/* History */}
                            <div className="col-span-1 md:col-span-2 space-y-3">
                                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest border-b border-slate-100 dark:border-white/5 pb-2 flex items-center gap-2">
                                    <List className="w-3 h-3" /> Timeline
                                </h3>
                                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 max-h-32 overflow-y-auto custom-scrollbar border border-slate-200 dark:border-white/10">
                                    {appt.history?.slice().reverse().map((h, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-dashed border-slate-200 dark:border-white/10 last:border-0">
                                            <span className="font-bold text-slate-700 dark:text-gray-300">{h.status.replace(/([A-Z])/g, ' $1').trim()}</span>
                                            <span className="text-slate-500 font-mono">{formatDateTime(h.timestamp)}</span>
                                        </div>
                                    ))}
                                    {(!appt.history || appt.history.length === 0) && <div className="text-xs text-slate-400 italic">No history available</div>}
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1a1a1a] flex justify-end">
                        <button onClick={onClose} className="px-6 py-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white rounded-lg text-sm font-bold transition-colors">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};
