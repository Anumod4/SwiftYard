
import React, { useState } from 'react';
import { AlertTriangle, X, CheckSquare, Square } from 'lucide-react';
import { ModalPortal } from './ModalPortal';

interface FactoryResetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (options: {
        deleteCarriers: boolean;
        deleteDrivers: boolean;
        deleteResources: boolean;
        deleteTrailerTypes: boolean;
        deleteActivityLogs: boolean;
    }) => void;
}

export const FactoryResetModal: React.FC<FactoryResetModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
}) => {
    const [options, setOptions] = useState({
        deleteCarriers: false,
        deleteDrivers: false,
        deleteResources: false,
        deleteTrailerTypes: false,
        deleteActivityLogs: true, // Selected by default as it's transactional historical data
    });

    if (!isOpen) return null;

    const toggleOption = (key: keyof typeof options) => {
        setOptions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleConfirm = () => {
        onConfirm(options);
        onClose();
    };

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300">
                    <div className="relative p-6">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-500 animate-pulse" />
                            </div>

                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">SYSTEM FACTORY RESET</h2>

                            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 mb-6 w-full text-left">
                                <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-1 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" /> Transactional Data (Always Deleted)
                                </h3>
                                <p className="text-xs text-amber-700 dark:text-amber-500/80">
                                    All current and historical Appointments and Trailers will be permanently removed. Related UI views (Dashboard, Appointments, Yard Visibility) will be reset.
                                </p>
                            </div>

                            <div className="w-full space-y-3 mb-8">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-gray-500 mb-2">Master Data Deletion (Optional)</h3>

                                <button
                                    onClick={() => toggleOption('deleteCarriers')}
                                    className="flex items-center justify-between w-full p-3 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl border border-slate-200 dark:border-white/10 transition-colors group"
                                >
                                    <div className="flex flex-col items-start">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">Carriers</span>
                                        <span className="text-[10px] text-slate-500">Remove all transport providers</span>
                                    </div>
                                    {options.deleteCarriers ? <CheckSquare className="w-5 h-5 text-red-500" /> : <Square className="w-5 h-5 text-slate-400" />}
                                </button>

                                <button
                                    onClick={() => toggleOption('deleteDrivers')}
                                    className="flex items-center justify-between w-full p-3 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl border border-slate-200 dark:border-white/10 transition-colors group"
                                >
                                    <div className="flex flex-col items-start">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">Drivers</span>
                                        <span className="text-[10px] text-slate-500">Remove all driver records</span>
                                    </div>
                                    {options.deleteDrivers ? <CheckSquare className="w-5 h-5 text-red-500" /> : <Square className="w-5 h-5 text-slate-400" />}
                                </button>

                                <button
                                    onClick={() => toggleOption('deleteResources')}
                                    className="flex items-center justify-between w-full p-3 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl border border-slate-200 dark:border-white/10 transition-colors group"
                                >
                                    <div className="flex flex-col items-start">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">Resources (Docks/Slots)</span>
                                        <span className="text-[10px] text-slate-500">Reset facility configurations</span>
                                    </div>
                                    {options.deleteResources ? <CheckSquare className="w-5 h-5 text-red-500" /> : <Square className="w-5 h-5 text-slate-400" />}
                                </button>

                                <button
                                    onClick={() => toggleOption('deleteTrailerTypes')}
                                    className="flex items-center justify-between w-full p-3 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl border border-slate-200 dark:border-white/10 transition-colors group"
                                >
                                    <div className="flex flex-col items-start">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">Trailer Types</span>
                                        <span className="text-[10px] text-slate-500">Remove custom trailer categories</span>
                                    </div>
                                    {options.deleteTrailerTypes ? <CheckSquare className="w-5 h-5 text-red-500" /> : <Square className="w-5 h-5 text-slate-400" />}
                                </button>

                                <button
                                    onClick={() => toggleOption('deleteActivityLogs')}
                                    className="flex items-center justify-between w-full p-3 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl border border-slate-200 dark:border-white/10 transition-colors group"
                                >
                                    <div className="flex flex-col items-start">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">Activity Tracking</span>
                                        <span className="text-[10px] text-slate-500">Wipe all audit logs and ledger records</span>
                                    </div>
                                    {options.deleteActivityLogs ? <CheckSquare className="w-5 h-5 text-red-500" /> : <Square className="w-5 h-5 text-slate-400" />}
                                </button>
                            </div>

                            <p className="text-xs text-red-500 font-medium mb-6 px-4 text-center">
                                Warning: This action cannot be undone. System will be restored to its initial state based on your selections.
                            </p>

                            <div className="flex w-full gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="flex-2 px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-500/30 transition-all active:scale-95"
                                >
                                    Proceed with Reset
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};
