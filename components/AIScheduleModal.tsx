import React, { useState } from 'react';
import { X, Bot, Sparkles, Calendar as CalendarIcon, GripVertical, CheckCircle2, Loader2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { DatePicker } from './ui/DatePicker';
import { generateAISchedule, PriorityAttribute } from '../utils/aiScheduling';

interface AIScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AVAILABLE_ATTRIBUTES: { id: PriorityAttribute; label: string; desc: string }[] = [
    { id: 'carrier', label: 'Carrier', desc: 'Group by specific carriers to streamline processing.' },
    { id: 'trailerType', label: 'Trailer Type', desc: 'Organize arrivals by the type of trailers.' },
    { id: 'gatedInTime', label: 'Gated In Time', desc: 'Prioritize trailers that arrived at the gate earliest.' },
    { id: 'createdTime', label: 'Appointment Creation Time', desc: 'First come, first served based on booking time.' }
];

export const AIScheduleModal: React.FC<AIScheduleModalProps> = ({ isOpen, onClose }) => {
    const { appointments, docks, trailers, bulkUpdateAppointments, t, addToast } = useData();
    const [targetDate, setTargetDate] = useState<string>('');
    const [priorities, setPriorities] = useState<PriorityAttribute[]>(['carrier', 'gatedInTime']);

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
                priorities,
                appointments,
                docks,
                trailers
            });

            setProcessStep(3); // Applying changes...
            await new Promise(r => setTimeout(r, 800));

            if (updates.length > 0) {
                await bulkUpdateAppointments(updates);
                addToast('AI Scheduling Complete', `Successfully auto-assigned ${updates.length} appointments.`, 'success');
            } else {
                addToast('No Eligible Appointments', 'Could not find any pending or scheduled appointments for this date.', 'info');
            }

            setTimeout(() => {
                setIsProcessing(false);
                setProcessStep(0);
                onClose();
            }, 500);

        } catch (error) {
            console.error('AI Schedule Error:', error);
            addToast('AI Error', 'An error occurred during schedule generation.', 'error');
            setIsProcessing(false);
            setProcessStep(0);
        }
    };

    // Simple Drag & Drop Reordering (Simulated by clicking up/down since DnD library isn't guaranteed)
    const movePriority = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index > 0) {
            const newP = [...priorities];
            [newP[index - 1], newP[index]] = [newP[index], newP[index - 1]];
            setPriorities(newP);
        } else if (direction === 'down' && index < priorities.length - 1) {
            const newP = [...priorities];
            [newP[index], newP[index + 1]] = [newP[index + 1], newP[index]];
            setPriorities(newP);
        }
    };

    const togglePriority = (attr: PriorityAttribute) => {
        if (priorities.includes(attr)) {
            setPriorities(priorities.filter(p => p !== attr));
        } else {
            setPriorities([...priorities, attr]);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative bg-white dark:bg-[#1a1a1a] rounded-[2rem] w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header elements */}
                <div className="p-8 border-b border-slate-100 dark:border-white/5 relative bg-gradient-to-r from-purple-500/10 to-blue-500/10 dark:from-purple-500/5 dark:to-blue-500/5">
                    <button
                        onClick={onClose}
                        className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-500/30 relative overflow-hidden">
                            <Bot className="w-7 h-7 relative z-10" />
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                AI Schedule Assistant
                                <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" />
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                                Intelligently arrange and prioritize your daily dock operations.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-8">
                    {isProcessing ? (
                        <div className="h-64 flex flex-col items-center justify-center space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full animate-pulse"></div>
                                <Loader2 className="w-16 h-16 text-purple-500 animate-spin relative z-10" />
                                <Bot className="w-6 h-6 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {processStep === 1 && "Analyzing parameters..."}
                                    {processStep === 2 && "Generating optimal schedules..."}
                                    {processStep === 3 && "Applying assignments..."}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-gray-400">Please wait while the AI computes the best dock routing.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Step 1: Date */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-xs">1</span>
                                    Target Date
                                </h3>
                                <div className="relative w-full md:w-1/2">
                                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <DatePicker
                                        value={targetDate}
                                        onChange={setTargetDate}
                                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                                        placeholder="Select Date..."
                                    />
                                </div>
                            </div>

                            {/* Step 2: Priorities */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-xs">2</span>
                                    Prioritization Sequence
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">
                                    Select and order the rules the AI should follow. The top rule has the highest priority.
                                </p>

                                <div className="space-y-3">
                                    {AVAILABLE_ATTRIBUTES.map(attr => {
                                        const isSelected = priorities.includes(attr.id);
                                        const rankIndex = priorities.indexOf(attr.id);

                                        return (
                                            <div
                                                key={attr.id}
                                                className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-purple-50/50 dark:bg-purple-500/5 border-purple-200 dark:border-purple-500/30' : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'}`}
                                                onClick={() => togglePriority(attr.id)}
                                            >
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border ${isSelected ? 'bg-purple-500 border-purple-500 text-white' : 'bg-white dark:bg-black/50 border-slate-300 dark:border-gray-600'}`}>
                                                    {isSelected && <CheckCircle2 className="w-4 h-4" />}
                                                </div>

                                                <div className="flex-1">
                                                    <div className="font-bold text-sm text-slate-900 dark:text-white">{attr.label}</div>
                                                    <div className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">{attr.desc}</div>
                                                </div>

                                                {isSelected && (
                                                    <div className="flex flex-col gap-1 items-center" onClick={(e) => e.stopPropagation()}>
                                                        <span className="text-[10px] font-bold uppercase text-purple-500 mr-2">Rank: {rankIndex + 1}</span>
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => movePriority(rankIndex, 'up')}
                                                                disabled={rankIndex === 0}
                                                                className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
                                                            >
                                                                ▲
                                                            </button>
                                                            <button
                                                                onClick={() => movePriority(rankIndex, 'down')}
                                                                disabled={rankIndex === priorities.length - 1}
                                                                className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
                                                            >
                                                                ▼
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isProcessing}
                        className="px-6 py-2.5 rounded-xl font-bold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleRunAI}
                        disabled={isProcessing || priorities.length === 0}
                        className="px-8 py-2.5 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white rounded-xl font-bold shadow-lg shadow-purple-500/25 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Sparkles className="w-4 h-4" />
                        Generate AI Schedule
                    </button>
                </div>
            </div>
        </div>
    );
};
