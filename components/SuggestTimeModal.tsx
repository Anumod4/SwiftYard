
import React, { useState } from 'react';
import { ModalPortal } from './ui/ModalPortal';
import { X, Calendar, Clock, CheckCircle2, History } from 'lucide-react';
import { useData } from '../contexts/DataContext';

interface SuggestTimeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (suggestedTime: string) => void;
    currentStartTime: string;
}

export const SuggestTimeModal: React.FC<SuggestTimeModalProps> = ({ isOpen, onClose, onConfirm, currentStartTime }) => {
    const [suggestedTime, setSuggestedTime] = useState(currentStartTime);

    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-[#1a1a1a]">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <History className="w-5 h-5 text-blue-500" /> Suggest Alternate Time
                        </h2>
                        <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="p-6 space-y-5">
                        <p className="text-sm text-slate-500 dark:text-gray-400">
                            The original requested time is not available. Please suggest an alternative slot for the carrier to review.
                        </p>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5 uppercase tracking-widest">New Suggested Time</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <input
                                    type="datetime-local"
                                    value={suggestedTime.substring(0, 16)}
                                    onChange={e => setSuggestedTime(new Date(e.target.value).toISOString())}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-500/5 p-4 rounded-xl border border-blue-100 dark:border-blue-500/10">
                            <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter mb-2">Original Request</h4>
                            <div className="text-sm font-bold text-slate-700 dark:text-gray-300 flex items-center gap-2">
                                <Clock className="w-4 h-4" /> {new Date(currentStartTime).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 p-4 bg-slate-50 dark:bg-[#1a1a1a] border-t border-slate-200 dark:border-white/10">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Cancel</button>
                        <button
                            onClick={() => onConfirm(suggestedTime)}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95"
                        >
                            <CheckCircle2 className="w-4 h-4" /> Send Suggestion
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};
