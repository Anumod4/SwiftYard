
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, Check, AlertCircle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';

interface DateTimePickerProps {
    value: string; // ISO string
    onChange: (date: string) => void;
    className?: string;
    placeholder?: string;
    required?: boolean;
    isInvalid?: boolean;
    hint?: string | null;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
    value,
    onChange,
    className = "",
    placeholder = "Select Date & Time",
    required = false,
    isInvalid = false,
    hint = null
}) => {
    const { formatDate } = useData();
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Internal date for the picker navigation (year/month)
    const [pickerDate, setPickerDate] = useState(new Date());

    // Internal state for time selection
    const [selectedTime, setSelectedTime] = useState("12:00");

    useEffect(() => {
        if (value) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                setPickerDate(date);
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                setSelectedTime(`${hours}:${minutes}`);
            }
        }
    }, [value]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const changeMonth = (offset: number) => {
        const newDate = new Date(pickerDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setPickerDate(newDate);
    };

    const handleDateSelect = (date: Date) => {
        const [hours, minutes] = selectedTime.split(':').map(Number);
        const newDateTime = new Date(date);
        newDateTime.setHours(hours, minutes, 0, 0);
        onChange(newDateTime.toISOString());
    };

    const handleTimeChange = (time: string) => {
        setSelectedTime(time);
        if (value) {
            const date = new Date(value);
            const [hours, minutes] = time.split(':').map(Number);
            date.setHours(hours, minutes, 0, 0);
            onChange(date.toISOString());
        } else {
            // If no date selected yet, use today
            const date = new Date();
            const [hours, minutes] = time.split(':').map(Number);
            date.setHours(hours, minutes, 0, 0);
            onChange(date.toISOString());
        }
    };

    // Generate Grid
    const calendarGrid = useMemo(() => {
        const year = pickerDate.getFullYear();
        const month = pickerDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const grid = [];
        for (let i = 0; i < firstDay; i++) {
            grid.push({
                day: daysInPrevMonth - firstDay + 1 + i,
                date: new Date(year, month - 1, daysInPrevMonth - firstDay + 1 + i),
                isCurrentMonth: false
            });
        }
        for (let i = 1; i <= daysInMonth; i++) {
            grid.push({
                day: i,
                date: new Date(year, month, i),
                isCurrentMonth: true
            });
        }
        const remaining = 42 - grid.length;
        for (let i = 1; i <= remaining; i++) {
            grid.push({
                day: i,
                date: new Date(year, month + 1, i),
                isCurrentMonth: false
            });
        }
        return grid;
    }, [pickerDate]);

    const weekDaysShort = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const isSameDay = (d1: Date, d2Str: string) => {
        if (!d2Str) return false;
        const d2 = new Date(d2Str);
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    const formatDisplay = (iso: string) => {
        if (!iso) return "";
        const date = new Date(iso);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full text-left pl-10 pr-4 py-3 bg-slate-100 dark:bg-black/20 border ${isInvalid ? 'border-red-500' : 'border-slate-200 dark:border-white/10'} rounded-xl text-sm transition-all focus:outline-none focus:border-[#3B82F6] ${!value ? 'text-slate-400 dark:text-gray-500' : 'text-slate-900 dark:text-white font-medium'}`}
                >
                    {value ? formatDisplay(value) : placeholder}
                </button>
            </div>

            {hint && value && (
                <div className={`mt-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${isInvalid ? 'text-red-500' : 'text-emerald-500'}`}>
                    {isInvalid ? <AlertCircle className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                    {hint}
                </div>
            )}

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-[340px] bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-4 animate-in zoom-in-95 duration-200 ring-1 ring-black/5 dark:ring-white/10 z-[200]">
                    <div className="flex gap-4">
                        {/* Calendar Side */}
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-4">
                                <button type="button" onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-600 dark:text-gray-300"><ChevronLeft className="w-4 h-4" /></button>
                                <span className="font-bold text-slate-900 dark:text-white text-[12px]">{pickerDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
                                <button type="button" onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-600 dark:text-gray-300"><ChevronRight className="w-4 h-4" /></button>
                            </div>
                            <div className="grid grid-cols-7 mb-1">
                                {weekDaysShort.map(d => <div key={d} className="text-center text-[10px] font-bold text-slate-400 dark:text-gray-500 py-1 uppercase">{d}</div>)}
                            </div>
                            <div className="grid grid-cols-7 gap-0.5">
                                {calendarGrid.map((item, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleDateSelect(item.date)}
                                        className={`h-7 w-7 rounded-lg flex items-center justify-center text-[11px] transition-all 
                                    ${!item.isCurrentMonth ? 'text-slate-300 dark:text-gray-600' : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'} 
                                    ${isSameDay(item.date, value) ? '!bg-[#3B82F6] !text-white font-bold shadow-md' : ''}
                                `}
                                    >
                                        {item.day}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Time Side */}
                        <div className="w-24 border-l border-slate-200 dark:border-white/5 pl-4 flex flex-col">
                            <div className="flex items-center gap-2 mb-3 text-slate-500 dark:text-gray-400">
                                <Clock className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Time</span>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 max-h-[180px] pr-1">
                                {Array.from({ length: 24 * 4 }).map((_, i) => {
                                    const h = Math.floor(i / 4);
                                    const m = (i % 4) * 15;
                                    const t = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                                    const isSelected = selectedTime === t;
                                    return (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => handleTimeChange(t)}
                                            className={`py-1.5 px-2 rounded-lg text-[11px] font-medium text-center transition-all ${isSelected ? 'bg-blue-500 text-white font-bold shadow-sm' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                                        >
                                            {t}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/5 flex justify-between items-center">
                        <button type="button" onClick={() => {
                            const today = new Date();
                            handleDateSelect(today);
                        }} className="text-[10px] text-blue-600 dark:text-blue-500 hover:text-blue-500 dark:hover:text-blue-400 font-bold uppercase tracking-wider">Today</button>

                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="bg-slate-900 dark:bg-white text-white dark:text-black px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
