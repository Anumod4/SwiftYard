import React, { useState } from 'react';
import { X, Sparkles, Calendar as CalendarIcon, CheckCircle2, Loader2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { DatePicker } from './ui/DatePicker';
import { generateAISchedule } from '../utils/aiScheduling';

interface AIScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AIScheduleModal: React.FC<AIScheduleModalProps> = ({ isOpen, onClose }) => {
    const { appointments, docks, trailers, bulkUpdateAppointments, t, addToast, settings, carriers, currentFacilityId } = useData();
    const [targetDate, setTargetDate] = useState<string>('');

    // UI States
    const [isProcessing, setIsProcessing] = useState(false);
    const [processStep, setProcessStep] = useState(0);

    if (!isOpen) return null;

    const handleRunAI = async () => {
        if (!targetDate) {
            addToast('Missing Date', 'Please select a target date first.', 'error');
            return;
        }

        setIsProcessing(true);
        setProcessStep(1); // Analyzing...

        try {
            // Artificial delay to make it feel like AI is thinking
            await new Promise(r => setTimeout(r, 1000));
            setProcessStep(2); // Generating schedules...
            await new Promise(r => setTimeout(r, 1000));

            // Execute Business Logic
            const updates = generateAISchedule({
                targetDate,
                appointments,
                docks,
                trailers,
                settings,
                carriers,
                currentFacilityId: currentFacilityId || ''
            });

            setProcessStep(3); // Applying changes...
            await new Promise(r => setTimeout(r, 800));

            if (updates.length > 0) {
                await bulkUpdateAppointments(updates);
                addToast('Smart Scheduling Complete', `Successfully auto-assigned ${updates.length} appointments.`, 'success');
            } else {
                addToast('No Eligible Appointments', 'Could not find any pending or scheduled appointments for this date.', 'info');
            }

            setTimeout(() => {
                setIsProcessing(false);
                setProcessStep(0);
                onClose();
            }, 500);

        } catch (error) {
            console.error('Smart Schedule Error:', error);
            addToast('Scheduling Error', 'An error occurred during schedule generation.', 'error');
            setIsProcessing(false);
            setProcessStep(0);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative bg-white dark:bg-[#1a1a1a] rounded-[2rem] w-full max-w-xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-slate-100 dark:border-white/5 relative bg-gradient-to-r from-indigo-500/10 to-blue-500/10 dark:from-indigo-500/5 dark:to-blue-500/5">
                    <button
                        onClick={onClose}
                        className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 relative overflow-hidden">
                            <Sparkles className="w-7 h-7 relative z-10" />
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                Smart Schedule
                                <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                                Intelligently arrange dock operations based on carrier tiers.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                    {isProcessing ? (
                        <div className="h-48 flex flex-col items-center justify-center space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse"></div>
                                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin relative z-10" />
                                <Sparkles className="w-4 h-4 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {processStep === 1 && "Analyzing parameters..."}
                                    {processStep === 2 && "Generating optimal schedules..."}
                                    {processStep === 3 && "Applying assignments..."}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-gray-400">Computing the best dock routing for your operation.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                                <p className="text-xs text-primary font-bold leading-relaxed">
                                    Smart Schedule automates your dock assignments by prioritizing high-tier carriers and optimizing time slots to ensure the highest productivity throughout the day.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4 text-primary" />
                                    Select Target Date
                                </h3>
                                <div className="relative w-full">
                                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <DatePicker
                                        value={targetDate}
                                        onChange={setTargetDate}
                                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-4 text-lg font-bold text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-inner"
                                        placeholder="Choose a date to optimize..."
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <div className="flex items-start gap-3 p-4 bg-muted/5 rounded-2xl border border-border">
                                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-xs font-bold text-foreground">Fixed Prioritization</h4>
                                        <p className="text-[10px] text-muted leading-relaxed mt-1">
                                            The system strictly follows: Carrier Tier (Platinum → Gold → Silver → Bronze) followed by Appointment Scheduled Time.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isProcessing}
                        className="px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleRunAI}
                        disabled={isProcessing || !targetDate}
                        className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/25 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-xs"
                    >
                        <Sparkles className="w-4 h-4" />
                        Run Smart Schedule
                    </button>
                </div>
            </div>
        </div>
    );
};
