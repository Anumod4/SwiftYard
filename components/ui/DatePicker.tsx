
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useData } from '../../contexts/DataContext';

interface DatePickerProps {
  value: string; // Expects YYYY-MM-DD
  onChange: (date: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({ 
  value, 
  onChange, 
  className = "", 
  placeholder = "Select Date",
  required = false
}) => {
  const { formatDate } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Internal date for the picker navigation (year/month)
  const [pickerDate, setPickerDate] = useState(new Date());

  // Initialize picker date from value if present
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setPickerDate(date);
      }
    }
  }, [isOpen, value]);

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

  const handleSelect = (date: Date) => {
    // Format to YYYY-MM-DD for the value
    // Adjust for timezone offset to ensure we get the correct YYYY-MM-DD part
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset*60*1000));
    const val = adjustedDate.toISOString().split('T')[0];
    
    onChange(val);
    setIsOpen(false);
  };

  const jumpToToday = () => {
    const today = new Date();
    setPickerDate(today);
    handleSelect(today);
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

  const displayValue = value ? formatDate(value) : '';

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`text-left ${className} ${!displayValue ? 'text-slate-400 dark:text-gray-500' : ''}`}
      >
        {displayValue || placeholder}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-4 animate-in zoom-in-95 duration-200 ring-1 ring-black/5 dark:ring-white/10 z-[200]">
            <div className="flex justify-between items-center mb-4">
                <button type="button" onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-600 dark:text-gray-300"><ChevronLeft className="w-4 h-4"/></button>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{pickerDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric'})}</span>
                <button type="button" onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-600 dark:text-gray-300"><ChevronRight className="w-4 h-4"/></button>
            </div>
            <div className="grid grid-cols-7 mb-2">
                {weekDaysShort.map(d => <div key={d} className="text-center text-[10px] font-bold text-slate-400 dark:text-gray-500 py-1 uppercase">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {calendarGrid.map((item, idx) => (
                    <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelect(item.date)}
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-xs transition-all 
                            ${!item.isCurrentMonth ? 'text-slate-300 dark:text-gray-600' : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'} 
                            ${isSameDay(item.date, value) ? '!bg-[#0a84ff] !text-white font-bold shadow-lg' : ''}
                        `}
                    >
                        {item.day}
                    </button>
                ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/5 flex justify-center">
                    <button type="button" onClick={jumpToToday} className="text-xs text-blue-600 dark:text-blue-500 hover:text-blue-500 dark:hover:text-blue-400 font-medium">Jump to Today</button>
            </div>
        </div>
      )}
    </div>
  );
};
