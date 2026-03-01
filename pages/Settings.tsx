
import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Settings as SettingsIcon, Moon, Database, Trash2, AlertTriangle, Download, Upload, HardDrive, Clock, Plus, X, Calendar, Languages, Timer, MessageSquare, Briefcase, Phone, Key, ShieldCheck, Activity, RefreshCw, Navigation, Eye, EyeOff, Workflow, Container, Bot, Sparkles } from 'lucide-react';
import { Shift, WhatsAppRecipient } from '../types';
import { Pagination } from '../components/ui/Pagination';
import { DatePicker } from '../components/ui/DatePicker';
import { DeleteConfirmationModal } from '../components/ui/DeleteConfirmationModal';

// Inner component to handle input state locally and save on blur
const ShiftCard: React.FC<{
    shift: Shift;
    onUpdate: (updates: Partial<Shift>) => void;
    onDelete: () => void;
}> = ({ shift, onUpdate, onDelete }) => {
    const [name, setName] = useState(shift.name);
    const [startTime, setStartTime] = useState(shift.startTime);
    const [endTime, setEndTime] = useState(shift.endTime);

    // Sync with external changes if needed (e.g. initial load or reset)
    useEffect(() => {
        setName(shift.name);
        setStartTime(shift.startTime);
        setEndTime(shift.endTime);
    }, [shift.id, shift.name, shift.startTime, shift.endTime]);

    const handleBlur = () => {
        // Only update if changed
        if (name !== shift.name || startTime !== shift.startTime || endTime !== shift.endTime) {
            onUpdate({ name, startTime, endTime });
        }
    };

    return (
        <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-[1.5rem] border border-slate-200 dark:border-white/10 group relative animate-in fade-in slide-in-from-bottom-2">
            <button
                onClick={onDelete}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
            >
                <X className="w-3.5 h-3.5" />
            </button>

            <div className="space-y-4">
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 mb-1 block">Shift Label</label>
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onBlur={handleBlur}
                        className="w-full bg-transparent text-slate-900 dark:text-white font-bold border-b border-transparent focus:border-[#0a84ff] outline-none"
                        placeholder="e.g. Day Shift"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 mb-1 block">Start</label>
                        <input
                            type="time"
                            value={startTime}
                            onChange={e => setStartTime(e.target.value)}
                            onBlur={handleBlur}
                            className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-sm font-mono text-slate-900 dark:text-white focus:border-[#0a84ff] outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 mb-1 block">End</label>
                        <input
                            type="time"
                            value={endTime}
                            onChange={e => setEndTime(e.target.value)}
                            onBlur={handleBlur}
                            className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-sm font-mono text-slate-900 dark:text-white focus:border-[#0a84ff] outline-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export const Settings: React.FC = () => {
    const { settings, updateSettings, resetData, resetEfficiencyStats, exportDatabase, importDatabase, t, addToast, yardSlots } = useData();
    const [fileInputKey, setFileInputKey] = useState(0);
    const [activeDay, setActiveDay] = useState('Monday');

    // Modal states
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isEffResetModalOpen, setIsEffResetModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);

    // Local state for settings inputs to prevent API call on every keystroke
    const [localYardName, setLocalYardName] = useState(settings.yardName || 'SwiftYard');
    const [localLanguage, setLocalLanguage] = useState(settings.language || 'en');
    const [localYardThresh, setLocalYardThresh] = useState(String(settings.dwellThresholds?.yard || 4));
    const [localDockThresh, setLocalDockThresh] = useState(String(settings.dwellThresholds?.dock || 2));

    // Sync local state when settings change from external source
    useEffect(() => {
        setLocalYardName(settings.yardName || 'SwiftYard');
        setLocalLanguage(settings.language || 'en');
        setLocalYardThresh(String(settings.dwellThresholds?.yard || 4));
        setLocalDockThresh(String(settings.dwellThresholds?.dock || 2));
    }, [settings.yardName, settings.language, settings.dwellThresholds]);

    // Save handlers
    const handleYardNameBlur = () => {
        if (localYardName !== settings.yardName) {
            console.log('[Settings] Saving yardName:', localYardName);
            updateSettings({ ...settings, yardName: localYardName });
        }
    };

    const handleLanguageChange = (val: string) => {
        setLocalLanguage(val as 'en' | 'hi');
        updateSettings({ ...settings, language: val as 'en' | 'hi' });
    };

    const handleYardThreshBlur = () => {
        const numVal = Number(localYardThresh) || 4;
        if (numVal !== settings.dwellThresholds?.yard) {
            updateSettings({
                ...settings,
                dwellThresholds: { ...settings.dwellThresholds, yard: numVal, dock: settings.dwellThresholds?.dock || 2 }
            });
        }
    };

    const handleDockThreshBlur = () => {
        const numVal = Number(localDockThresh) || 2;
        if (numVal !== settings.dwellThresholds?.dock) {
            updateSettings({
                ...settings,
                dwellThresholds: { ...settings.dwellThresholds, dock: numVal, yard: settings.dwellThresholds?.yard || 4 }
            });
        }
    };

    // Gate In Workflow state
    const [localGateInFlow, setLocalGateInFlow] = useState<string>(settings.gateInFlow || 'YardDefault');
    const [localDefaultYardSlotId, setLocalDefaultYardSlotId] = useState(settings.defaultYardSlotId || '');

    // Instruction Timers state
    const [localTimersEnabled, setLocalTimersEnabled] = useState(settings.enableInstructionTimers !== false);
    const [localShowCountdown, setLocalShowCountdown] = useState(settings.showCountdownTimer !== false);
    const [localMoveToDock, setLocalMoveToDock] = useState(String(settings.instructionDurations?.moveToDock || 15));
    const [localMoveToYard, setLocalMoveToYard] = useState(String(settings.instructionDurations?.moveToYard || 15));
    const [localCheckOut, setLocalCheckOut] = useState(String(settings.instructionDurations?.checkOut || 15));

    // WhatsApp state
    const [localAlertsEnabled, setLocalAlertsEnabled] = useState(settings.enableWhatsAppAlerts !== false);
    const [localAiScheduleEnabled, setLocalAiScheduleEnabled] = useState(settings.enableAiSchedule !== false);

    // Metrics Range state
    const [localMetricStart, setLocalMetricStart] = useState(settings.metricsRange?.start || '');
    const [localMetricEnd, setLocalMetricEnd] = useState(settings.metricsRange?.end || '');

    // Sync all local state when settings change
    useEffect(() => {
        setLocalGateInFlow(settings.gateInFlow || 'YardDefault');
        setLocalDefaultYardSlotId(settings.defaultYardSlotId || '');
        setLocalTimersEnabled(settings.enableInstructionTimers !== false);
        setLocalShowCountdown(settings.showCountdownTimer !== false);
        setLocalMoveToDock(String(settings.instructionDurations?.moveToDock || 15));
        setLocalMoveToYard(String(settings.instructionDurations?.moveToYard || 15));
        setLocalCheckOut(String(settings.instructionDurations?.checkOut || 15));
        setLocalAlertsEnabled(settings.enableWhatsAppAlerts !== false);
        setLocalAiScheduleEnabled(settings.enableAiSchedule !== false);
        setLocalMetricStart(settings.metricsRange?.start || '');
        setLocalMetricEnd(settings.metricsRange?.end || '');
    }, [settings]);

    // Gate In Workflow handlers
    const handleGateInFlowChange = (flow: 'YardDefault' | 'DockDirect') => {
        setLocalGateInFlow(flow);
        updateSettings({ ...settings, gateInFlow: flow });
    };

    const handleDefaultYardSlotBlur = () => {
        if (localDefaultYardSlotId !== settings.defaultYardSlotId) {
            updateSettings({ ...settings, defaultYardSlotId: localDefaultYardSlotId });
        }
    };

    // Instruction Timers handlers
    const handleTimersToggle = () => {
        const newVal = !localTimersEnabled;
        setLocalTimersEnabled(newVal);
        updateSettings({ ...settings, enableInstructionTimers: newVal });
    };

    const handleShowCountdownToggle = () => {
        const newVal = !localShowCountdown;
        setLocalShowCountdown(newVal);
        updateSettings({ ...settings, showCountdownTimer: newVal });
    };

    const handleMoveToDockBlur = () => {
        const val = Number(localMoveToDock) || 15;
        if (val !== settings.instructionDurations?.moveToDock) {
            updateSettings({
                ...settings,
                instructionDurations: {
                    ...settings.instructionDurations,
                    moveToDock: val,
                    moveToYard: settings.instructionDurations?.moveToYard || 15,
                    checkOut: settings.instructionDurations?.checkOut || 15
                }
            });
        }
    };

    const handleMoveToYardBlur = () => {
        const val = Number(localMoveToYard) || 15;
        if (val !== settings.instructionDurations?.moveToYard) {
            updateSettings({
                ...settings,
                instructionDurations: {
                    ...settings.instructionDurations,
                    moveToYard: val,
                    moveToDock: settings.instructionDurations?.moveToDock || 15,
                    checkOut: settings.instructionDurations?.checkOut || 15
                }
            });
        }
    };

    const handleCheckOutBlur = () => {
        const val = Number(localCheckOut) || 15;
        if (val !== settings.instructionDurations?.checkOut) {
            updateSettings({
                ...settings,
                instructionDurations: {
                    ...settings.instructionDurations,
                    checkOut: val,
                    moveToDock: settings.instructionDurations?.moveToDock || 15,
                    moveToYard: settings.instructionDurations?.moveToYard || 15
                }
            });
        }
    };

    const handleAiScheduleToggle = () => {
        const newVal = !localAiScheduleEnabled;
        setLocalAiScheduleEnabled(newVal);
        updateSettings({ ...settings, enableAiSchedule: newVal });
    };

    // WhatsApp handler
    const handleAlertsToggle = () => {
        const newVal = !localAlertsEnabled;
        setLocalAlertsEnabled(newVal);
        updateSettings({ ...settings, enableWhatsAppAlerts: newVal });
    };

    // Metrics Range handlers
    const handleMetricRangeUpdate = () => {
        if (localMetricStart && localMetricEnd) {
            updateSettings({ ...settings, metricsRange: { start: localMetricStart, end: localMetricEnd } });
            addToast('Metrics Updated', 'Dashboard now filtering by selected range.', 'success');
        }
    };

    const clearMetricsRange = () => {
        setLocalMetricStart('');
        setLocalMetricEnd('');
        updateSettings({ ...settings, metricsRange: undefined });
        addToast('Metrics Updated', 'Dashboard showing all-time data.', 'info');
    };

    // WhatsApp State
    const [newName, setNewName] = useState('');
    const [newDesignation, setNewDesignation] = useState('');
    const [newNumber, setNewNumber] = useState('');

    // WhatsApp API Creds State (Local)
    const [phoneId, setPhoneId] = useState(settings.whatsappConfig?.phoneNumberId || '');
    const [token, setToken] = useState(settings.whatsappConfig?.accessToken || '');

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const [waCurrentPage, setWaCurrentPage] = useState(1);
    const waPageSize = 10;

    const recipients = settings.adminWhatsappRecipients || [];
    const paginatedRecipients = React.useMemo(() => {
        const start = (waCurrentPage - 1) * waPageSize;
        return recipients.slice(start, start + waPageSize);
    }, [recipients, waCurrentPage, waPageSize]);

    const handleReset = () => {
        setIsResetModalOpen(true);
    };

    const handleConfirmReset = () => {
        resetData();
    };

    const handleResetEfficiency = async () => {
        setIsEffResetModalOpen(true);
    };

    const handleConfirmEffReset = async () => {
        await resetEfficiencyStats();
        addToast('Metrics Reset', 'Operational Efficiency numbers reset to 0.', 'info');
    };

    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.currentTarget.files?.[0];
        if (file) {
            setPendingImportFile(file);
            setIsImportModalOpen(true);
        }
    };

    const handleConfirmImport = async () => {
        if (pendingImportFile) {
            try {
                await importDatabase(pendingImportFile);
                addToast('Import Successful', 'Data restored from Excel.', 'success');
            } catch (e: any) {
                addToast('Import Failed', e.message || 'Unknown error', 'error');
            }
            setPendingImportFile(null);
            setFileInputKey(prev => prev + 1);
        }
    };

    const addShift = (day: string) => {
        const newShift: Shift = {
            id: `s-${Date.now()}`,
            name: 'New Shift',
            startTime: '08:00',
            endTime: '16:00'
        };
        const currentHours = { ...settings.workingHours };
        currentHours[day] = [...(currentHours[day] || []), newShift];
        updateSettings({ ...settings, workingHours: currentHours });
    };

    const removeShift = (day: string, shiftId: string) => {
        const currentHours = { ...settings.workingHours };
        currentHours[day] = currentHours[day].filter(s => s.id !== shiftId);
        updateSettings({ ...settings, workingHours: currentHours });
    };

    const updateShift = (day: string, shiftId: string, updates: Partial<Shift>) => {
        const currentHours = { ...settings.workingHours };
        currentHours[day] = currentHours[day].map(s => s.id === shiftId ? { ...s, ...updates } : s);
        updateSettings({ ...settings, workingHours: currentHours });
    };

    // WhatsApp Logic
    const handleAddRecipient = () => {
        if (!newNumber.trim() || !newName.trim()) return;

        const current = settings.adminWhatsappRecipients || [];
        const newRecipient: WhatsAppRecipient = {
            id: `WA-${Date.now()}`,
            name: newName.trim(),
            designation: newDesignation.trim() || 'Staff',
            number: newNumber.trim()
        };

        updateSettings({ ...settings, adminWhatsappRecipients: [...current, newRecipient] });
        setNewName('');
        setNewDesignation('');
        setNewNumber('');
    };

    const handleRemoveRecipient = (id: string) => {
        const current = settings.adminWhatsappRecipients || [];
        updateSettings({ ...settings, adminWhatsappRecipients: current.filter(r => r.id !== id) });
    };

    const handleSaveApiCreds = () => {
        updateSettings({
            ...settings,
            whatsappConfig: {
                phoneNumberId: phoneId,
                accessToken: token
            }
        });
        addToast('Success', 'WhatsApp Credentials Saved', 'success');
    };

    const handleMetricsRangeUpdate = () => {
        if (localMetricStart && localMetricEnd) {
            updateSettings({ ...settings, metricsRange: { start: localMetricStart, end: localMetricEnd } });
            addToast('Metrics Updated', 'Dashboard now filtering by selected range.', 'success');
        }
    };

    const alertsEnabled = settings.enableWhatsAppAlerts !== false;

    return (
        <div className="p-8 h-full flex flex-col animate-in fade-in duration-500 overflow-y-auto custom-scrollbar pointer-events-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('settings.title')}</h1>
                <p className="text-slate-500 dark:text-gray-400">{t('settings.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                {/* Left Column */}
                <div className="space-y-6">
                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                            <SettingsIcon className="w-5 h-5 mr-2 text-blue-500" /> {t('settings.general')}
                        </h2>
                        <GlassCard className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-2">{t('settings.yardName')} *</label>
                                <input
                                    value={localYardName}
                                    onChange={e => setLocalYardName(e.target.value)}
                                    onBlur={handleYardNameBlur}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-blue-500 outline-none transition-all"
                                />
                            </div>

                            {/* Language Selector */}
                            <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-white/5">
                                <div className="flex items-center gap-3">
                                    <Languages className="w-5 h-5 text-slate-400 dark:text-gray-400" />
                                    <span className="text-slate-900 dark:text-white">{t('settings.language')}</span>
                                </div>
                                <select
                                    value={localLanguage}
                                    onChange={e => handleLanguageChange(e.target.value)}
                                    className="bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 outline-none"
                                >
                                    <option value="en">English</option>
                                    <option value="hi">हिंदी (Hindi)</option>
                                </select>
                            </div>

                        </GlassCard>
                    </section>

                    {/* Operational Thresholds */}
                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                            <Timer className="w-5 h-5 mr-2 text-cyan-500" /> {t('settings.thresholds')}
                        </h2>
                        <GlassCard className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 dark:text-gray-400 mb-2">{t('settings.yardThresh')}</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={localYardThresh}
                                        onChange={e => setLocalYardThresh(e.target.value)}
                                        onBlur={handleYardThreshBlur}
                                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-cyan-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 dark:text-gray-400 mb-2">{t('settings.dockThresh')}</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={localDockThresh}
                                        onChange={e => setLocalDockThresh(e.target.value)}
                                        onBlur={handleDockThreshBlur}
                                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-cyan-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-gray-500 italic">These values determine when alerts are triggered on the Dashboard.</p>
                        </GlassCard>
                    </section>

                    {/* Gate In Workflow Configuration */}
                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                            <Workflow className="w-5 h-5 mr-2 text-emerald-500" /> Gate In Workflow
                        </h2>
                        <GlassCard className="p-6 space-y-6">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-gray-400 mb-2">Automated Flow Logic</label>
                                <div className="flex flex-col gap-2">
                                    <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <input
                                            type="radio"
                                            name="gateInFlow"
                                            checked={localGateInFlow === 'YardDefault'}
                                            onChange={() => handleGateInFlowChange('YardDefault')}
                                            className="mt-1"
                                        />
                                        <div>
                                            <span className="block font-bold text-slate-900 dark:text-white text-sm">Option 1: Move to Default Yard</span>
                                            <span className="block text-xs text-slate-500 dark:text-gray-400 mt-1">Automatically instructs driver to proceed to a specific yard holding area upon gate entry.</span>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <input
                                            type="radio"
                                            name="gateInFlow"
                                            checked={localGateInFlow === 'DockDirect'}
                                            onChange={() => handleGateInFlowChange('DockDirect')}
                                            className="mt-1"
                                        />
                                        <div>
                                            <span className="block font-bold text-slate-900 dark:text-white text-sm">Option 2: Move to Assigned Dock</span>
                                            <span className="block text-xs text-slate-500 dark:text-gray-400 mt-1">Directs driver to their assigned dock if available. Defaults to 'Gated In' status for ad-hoc arrivals.</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {settings.gateInFlow === 'YardDefault' && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-xs font-bold uppercase text-slate-500 dark:text-gray-400 mb-2">Default Yard Location</label>
                                    <div className="relative">
                                        <Container className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                        <select
                                            value={localDefaultYardSlotId}
                                            onChange={(e) => setLocalDefaultYardSlotId(e.target.value)}
                                            onBlur={handleDefaultYardSlotBlur}
                                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg pl-10 pr-3 py-3 text-slate-900 dark:text-white focus:border-emerald-500 outline-none appearance-none"
                                        >
                                            <option value="">-- Select Holding Slot --</option>
                                            {yardSlots.map(slot => (
                                                <option key={slot.id} value={slot.id}>{slot.name} ({slot.status})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <p className="text-xs text-slate-400 dark:text-gray-500 mt-2 italic">
                                        All gated-in trailers will be immediately directed to this location.
                                    </p>
                                </div>
                            )}
                        </GlassCard>
                    </section>

                    {/* AI Configuration */}
                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                            <Bot className="w-5 h-5 mr-2 text-purple-500" /> AI Capabilities
                        </h2>
                        <GlassCard className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-purple-500" /> AI Schedule Assistant
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Enable intelligent auto-scheduling and dock management.</p>
                                </div>
                                <button
                                    onClick={handleAiScheduleToggle}
                                    className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${localAiScheduleEnabled ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${localAiScheduleEnabled ? 'translate-x-5' : ''}`} />
                                </button>
                            </div>
                        </GlassCard>
                    </section>

                    {/* Instruction Timers */}
                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                            <Navigation className="w-5 h-5 mr-2 text-indigo-500" /> Instruction Timers (Minutes)
                        </h2>
                        <GlassCard className="p-6">
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-white/5">
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white text-sm">Time-Sensitive Instructions</p>
                                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Track overdue status for critical movements.</p>
                                </div>
                                <button
                                    onClick={handleTimersToggle}
                                    className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${localTimersEnabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${localTimersEnabled ? 'translate-x-5' : ''}`} />
                                </button>
                            </div>

                            <div className={`space-y-6 transition-all duration-300 ${!localTimersEnabled ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                                {/* Display Toggle */}
                                <div className="flex items-center justify-between bg-slate-100 dark:bg-black/20 p-3 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        {localShowCountdown ? <Eye className="w-4 h-4 text-indigo-500" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                                        <span className="text-sm font-bold text-slate-700 dark:text-gray-300">Show Countdown Timer</span>
                                    </div>
                                    <button
                                        onClick={handleShowCountdownToggle}
                                        className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${localShowCountdown ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${localShowCountdown ? 'translate-x-5' : ''}`} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 dark:text-gray-400 mb-2">Move to Dock</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={localMoveToDock}
                                            onChange={(e) => setLocalMoveToDock(e.target.value)}
                                            onBlur={handleMoveToDockBlur}
                                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 dark:text-gray-400 mb-2">Move to Yard</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={localMoveToYard}
                                            onChange={(e) => setLocalMoveToYard(e.target.value)}
                                            onBlur={handleMoveToYardBlur}
                                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 dark:text-gray-400 mb-2">Check Out</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={localCheckOut}
                                            onChange={(e) => setLocalCheckOut(e.target.value)}
                                            onBlur={handleCheckOutBlur}
                                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </section>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Storage */}
                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                            <HardDrive className="w-5 h-5 mr-2 text-blue-500" /> {t('settings.storage')}
                        </h2>
                        <GlassCard className="p-6 space-y-4">
                            <p className="text-sm text-slate-500 dark:text-gray-400">
                                Data is stored securely. Create regular Excel backups to ensure data portability.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={exportDatabase}
                                    className="bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Download className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                                    </div>
                                    <span className="font-bold text-sm">Export to Excel</span>
                                </button>

                                <div className="relative group">
                                    <input
                                        key={fileInputKey}
                                        type="file"
                                        accept=".xlsx"
                                        onChange={handleFileImport}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white p-4 rounded-xl flex flex-col items-center justify-center gap-2 h-full transition-all">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Upload className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                                        </div>
                                        <span className="font-bold text-sm">Import Excel</span>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </section>

                    {/* WhatsApp Section */}
                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                            <MessageSquare className="w-5 h-5 mr-2 text-green-500" /> {t('settings.whatsapp')}
                        </h2>
                        <GlassCard className="p-6">
                            <div className="flex items-start justify-between mb-4 gap-4">
                                <p className="text-sm text-slate-500 dark:text-gray-400">{t('settings.waDesc')}</p>

                                {/* Master Toggle */}
                                <div className="flex items-center gap-3 shrink-0 bg-slate-100 dark:bg-black/20 p-2 rounded-xl">
                                    <span className="text-xs font-bold uppercase text-slate-500 dark:text-gray-400">Alerts</span>
                                    <button
                                        onClick={handleAlertsToggle}
                                        className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${localAlertsEnabled ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${localAlertsEnabled ? 'translate-x-5' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            <div className={`transition-opacity duration-300 space-y-6 ${!localAlertsEnabled ? 'opacity-50 pointer-events-none grayscale' : ''}`}>

                                {/* API Credentials */}
                                <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-200 dark:border-white/5 space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500 dark:text-gray-400">
                                        <Key className="w-3 h-3" /> Meta Cloud API Credentials
                                    </div>
                                    <div>
                                        <input
                                            value={phoneId}
                                            onChange={e => setPhoneId(e.target.value)}
                                            placeholder="Phone Number ID"
                                            className="w-full mb-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:border-green-500 outline-none"
                                        />
                                        <input
                                            type="password"
                                            value={token}
                                            onChange={e => setToken(e.target.value)}
                                            placeholder="Permanent Access Token"
                                            className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:border-green-500 outline-none"
                                        />
                                    </div>
                                    <button onClick={handleSaveApiCreds} className="w-full py-1.5 bg-slate-200 dark:bg-white/10 hover:bg-green-500 hover:text-white text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                                        <ShieldCheck className="w-3 h-3" /> Save Credentials
                                    </button>
                                </div>

                                {/* Recipient Management */}
                                <div>
                                    <div className="space-y-3 mb-4 bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-200 dark:border-white/5">
                                        <div className="grid grid-cols-2 gap-3">
                                            <input
                                                type="text"
                                                placeholder="Name (e.g. John Doe)"
                                                value={newName}
                                                onChange={e => setNewName(e.target.value)}
                                                className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white focus:border-green-500 outline-none"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Role (e.g. Manager)"
                                                value={newDesignation}
                                                onChange={e => setNewDesignation(e.target.value)}
                                                className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white focus:border-green-500 outline-none"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="tel"
                                                placeholder={t('settings.waInput')}
                                                value={newNumber}
                                                onChange={e => setNewNumber(e.target.value)}
                                                className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white focus:border-green-500 outline-none"
                                            />
                                            <button
                                                onClick={handleAddRecipient}
                                                className="bg-green-600 hover:bg-green-700 text-white px-4 rounded-lg font-bold text-sm shadow-lg shadow-green-500/20 active:scale-95 transition-all"
                                            >
                                                {t('settings.waAdd')}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {recipients.length === 0 && (
                                            <div className="text-center py-4 text-xs text-slate-400 italic">No recipients added yet.</div>
                                        )}
                                        {paginatedRecipients.map(recipient => (
                                            <div key={recipient.id} className="flex justify-between items-center bg-slate-100 dark:bg-white/5 p-3 rounded-lg border border-slate-200 dark:border-white/5">
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white text-sm">{recipient.name}</div>
                                                    <div className="flex gap-2 text-xs text-slate-500 dark:text-gray-400">
                                                        <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {recipient.designation}</span>
                                                        <span className="flex items-center gap-1 font-mono"><Phone className="w-3 h-3" /> {recipient.number}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleRemoveRecipient(recipient.id)} className="p-1.5 bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-gray-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {recipients.length > 0 && (
                                            <div className="mt-4">
                                                <Pagination
                                                    currentPage={waCurrentPage}
                                                    totalPages={Math.ceil(recipients.length / waPageSize)}
                                                    onPageChange={setWaCurrentPage}
                                                    totalRecords={recipients.length}
                                                    pageSize={waPageSize}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </section>

                    {/* Efficiency Metrics Range */}
                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                            <Activity className="w-5 h-5 mr-2 text-indigo-500" /> Efficiency Metrics Range
                        </h2>
                        <GlassCard className="p-6 !overflow-visible">
                            <div className="space-y-4">
                                <p className="text-sm text-slate-500 dark:text-gray-400">
                                    Filter dashboard efficiency metrics based on a specific date range. Leave empty to see all-time stats.
                                </p>

                                <div className="flex gap-4 items-center">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-xs font-bold text-slate-500 dark:text-gray-400">From Date</label>
                                        <DatePicker
                                            value={localMetricStart}
                                            onChange={setLocalMetricStart}
                                            className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none cursor-pointer"
                                            placeholder="Start Date"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <label className="text-xs font-bold text-slate-500 dark:text-gray-400">To Date</label>
                                        <DatePicker
                                            value={localMetricEnd}
                                            onChange={setLocalMetricEnd}
                                            className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none cursor-pointer"
                                            placeholder="End Date"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end pt-2 flex-wrap">
                                    {settings.metricsRange && (
                                        <button
                                            onClick={clearMetricsRange}
                                            className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 text-xs font-bold rounded-lg transition-colors"
                                        >
                                            Clear Filter
                                        </button>
                                    )}
                                    <button
                                        onClick={handleResetEfficiency}
                                        className="px-4 py-2 bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        <Trash2 className="w-3 h-3" /> Reset Stats
                                    </button>
                                    <button
                                        onClick={handleMetricsRangeUpdate}
                                        disabled={!localMetricStart || !localMetricEnd}
                                        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white border border-indigo-500/20 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <RefreshCw className="w-3 h-3" /> Apply Range
                                    </button>
                                </div>
                            </div>
                        </GlassCard>
                    </section>
                </div>
            </div>

            <DeleteConfirmationModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                onConfirm={handleConfirmReset}
                title="WIPE ALL DATA"
                message="Are you sure you want to delete ALL data? This includes all appointments, drivers, and resource configurations. This action cannot be undone and will reset the system to its initial state."
            />

            <DeleteConfirmationModal
                isOpen={isEffResetModalOpen}
                onClose={() => setIsEffResetModalOpen(false)}
                onConfirm={handleConfirmEffReset}
                title="Reset Metrics"
                message="Are you sure you want to reset Operational Efficiency metrics to 0? This effectively hides all historical data from calculation. Current active appointments will remain unaffected."
            />

            <DeleteConfirmationModal
                isOpen={isImportModalOpen}
                onClose={() => {
                    setIsImportModalOpen(false);
                    setPendingImportFile(null);
                    setFileInputKey(prev => prev + 1);
                }}
                onConfirm={handleConfirmImport}
                title="Confirm Data Import"
                message="Importing a backup will OVERWRITE all current data in the system. This action cannot be undone. Do you want to proceed with the selected file?"
            />
            {/* Facility Working Hours */}
            <section className="mb-10">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-purple-500" /> {t('settings.workingHours')}
                </h2>
                <GlassCard className="p-8">
                    <div className="flex gap-2 mb-8 bg-slate-100 dark:bg-black/30 p-1 rounded-2xl border border-slate-200 dark:border-white/5 overflow-x-auto">
                        {days.map(day => (
                            <button
                                key={day}
                                onClick={() => setActiveDay(day)}
                                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeDay === day ? 'bg-white dark:bg-white/10 text-[#0a84ff] shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-gray-500">{activeDay} {t('settings.shifts')}</h3>
                            <button
                                onClick={() => addShift(activeDay)}
                                className="text-[11px] font-black uppercase tracking-widest flex items-center gap-1 text-[#0a84ff] hover:text-blue-400"
                            >
                                <Plus className="w-3.5 h-3.5" /> {t('settings.addShift')}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(settings.workingHours[activeDay] || []).length === 0 ? (
                                <div className="col-span-2 text-center py-10 bg-slate-50 dark:bg-white/5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/5">
                                    <Clock className="w-8 h-8 text-slate-300 dark:text-gray-700 mx-auto mb-3" />
                                    <p className="text-sm text-slate-400 dark:text-gray-500">{t('settings.closed')} on {activeDay}.</p>
                                </div>
                            ) : (
                                settings.workingHours[activeDay].map(shift => (
                                    <ShiftCard
                                        key={shift.id}
                                        shift={shift}
                                        onUpdate={(updates) => updateShift(activeDay, shift.id, updates)}
                                        onDelete={() => removeShift(activeDay, shift.id)}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    <div className="mt-8 flex items-center gap-3 bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20">
                        <AlertTriangle className="w-5 h-5 text-[#0a84ff]" />
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium leading-relaxed">
                            Note: The Appointment Calendar will automatically scale its view to match the earliest start and latest end times defined here.
                        </p>
                    </div>
                </GlassCard>
            </section>

            <section>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                    <Database className="w-5 h-5 mr-2 text-red-500" /> {t('settings.danger')}
                </h2>
                <GlassCard className="p-6 space-y-6">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                        <div>
                            <h3 className="font-bold text-red-600 dark:text-red-500">{t('settings.reset')}</h3>
                            <p className="text-sm text-red-600/80 dark:text-gray-400 mt-1 mb-4">
                                This will wipe all local data and restore the application to its initial state.
                            </p>
                            <button
                                onClick={handleReset}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors"
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> {t('settings.resetBtn')}
                            </button>
                        </div>
                    </div>
                </GlassCard>
            </section>
        </div>
    );
};
