
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { TrailerActionModal } from '../components/TrailerActionModal';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Warehouse, Clock, CalendarClock, PlayCircle, CheckCircle2, Info, CalendarDays, Container, MapPin } from 'lucide-react';
import { Shift } from '../types';

// --- Static Helpers Defined Outside Component ---
const isSameDay = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

const minutesFromTime = (time: string): number => {
  if (!time) return 0;
  const parts = time.split(':');
  if (parts.length < 2) return 0;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return (h * 60) + m;
};

const DAYS_NAMES_LIST = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEK_DAYS_SHORT_LIST = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const TrailerTimeline: React.FC = () => {
  const { appointments, docks, trailers, settings, t, formatDate } = useData();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedApptId, setSelectedApptId] = useState<string | null>(null);
  
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isPickerOpen) {
      setPickerDate(new Date(selectedDate));
    }
  }, [isPickerOpen, selectedDate]);

  const currentShifts = useMemo(() => {
    const dayName = DAYS_NAMES_LIST[selectedDate.getDay()];
    return settings.workingHours[dayName] || [];
  }, [selectedDate, settings.workingHours]);

  const visibleRange = useMemo(() => {
    if (currentShifts.length === 0) {
      return { start: 0, end: 1440, isClosed: true };
    }
    const startTimes = currentShifts.map(s => minutesFromTime(s.startTime));
    const endTimes = currentShifts.map(s => minutesFromTime(s.endTime));
    
    // Using spread instead of apply for better readability
    const minStart = Math.min(...startTimes);
    const maxEnd = Math.max(...endTimes);
    
    return { 
      start: Math.max(0, minStart - 30), 
      end: Math.min(1440, maxEnd + 30),
      isClosed: false
    };
  }, [currentShifts]);

  const totalVisibleMinutes = Math.max(1, visibleRange.end - visibleRange.start);

  const handleDateChange = (daysOffset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + daysOffset);
    setSelectedDate(newDate);
  };

  const changePickerMonth = (offset: number) => {
    const newDate = new Date(pickerDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setPickerDate(newDate);
  };

  const selectDate = (date: Date) => {
    setSelectedDate(date);
    setIsPickerOpen(false);
  };

  const jumpToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setPickerDate(today);
    setIsPickerOpen(false);
  };

  const calendarGrid = useMemo(() => {
    const year = pickerDate.getFullYear();
    const month = pickerDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const grid = [];
    for (let i = 0; i < firstDay; i++) {
      grid.push({ day: daysInPrevMonth - firstDay + 1 + i, date: new Date(year, month - 1, daysInPrevMonth - firstDay + 1 + i), isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      grid.push({ day: i, date: new Date(year, month, i), isCurrentMonth: true });
    }
    const remaining = 42 - grid.length;
    for (let i = 1; i <= remaining; i++) {
      grid.push({ day: i, date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    return grid;
  }, [pickerDate]);

  // Only display Docks, hide Yard Slots
  const dockResources = useMemo(() => {
    return [...docks].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  }, [docks]);

  const timeSlotLabels = useMemo(() => {
    const labels = [];
    const startHour = Math.floor(visibleRange.start / 60);
    const endHour = Math.ceil(visibleRange.end / 60);
    for (let h = startHour; h < endHour; h++) {
      labels.push(h);
    }
    return labels;
  }, [visibleRange]);

  const getShiftStyle = (shift: Shift) => {
    const startMin = minutesFromTime(shift.startTime);
    const endMin = minutesFromTime(shift.endTime);
    const leftVal = ((startMin - visibleRange.start) / totalVisibleMinutes) * 100;
    const widthVal = ((endMin - startMin) / totalVisibleMinutes) * 100;
    return { left: leftVal + '%', width: widthVal + '%' };
  };

  const getEventStyle = (startTime: string, durationMinutes: number) => {
    const date = new Date(startTime);
    const eventStartMinutes = (date.getHours() * 60) + date.getMinutes();
    const leftVal = ((eventStartMinutes - visibleRange.start) / totalVisibleMinutes) * 100;
    const widthVal = (durationMinutes / totalVisibleMinutes) * 100;
    return { left: leftVal + '%', width: Math.max(widthVal, 0.5) + '%' };
  };

  const getAppointmentsForDock = (dockId: string) => {
    return appointments.filter(a => {
      // Use local date comparison helper instead of UTC string splitting to fix timezone issues
      return isSameDay(new Date(a.startTime), selectedDate) && 
             a.assignedResourceId === dockId && 
             a.status !== 'Cancelled';
    });
  };

  const isToday = isSameDay(selectedDate, new Date());
  const currentMinutesTotal = (currentTime.getHours() * 60) + currentTime.getMinutes();
  const showCurrentTime = isToday && currentMinutesTotal >= visibleRange.start && currentMinutesTotal <= visibleRange.end;
  const currentTimePercentage = (currentMinutesTotal - visibleRange.start) / totalVisibleMinutes;
  
  // Safe calculation string construction
  const timeIndicatorLeft = "calc(10rem + (100% - 10rem) * " + currentTimePercentage + ")";

  return (
    <div className="p-8 h-full flex flex-col animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-blue-500"/> {t('cal.title')}
          </h1>
          <p className="text-slate-500 dark:text-gray-400">
            Visualise trailer flow and dock utilization.
            {visibleRange.isClosed && <span className="ml-2 text-red-500 font-bold uppercase text-[10px] bg-red-500/10 px-2 py-0.5 rounded">{t('cal.closed')}</span>}
          </p>
        </div>
        <div className="relative z-50 flex items-center bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1 shadow-lg backdrop-blur-md">
          <button onClick={() => handleDateChange(-1)} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronLeft className="w-5 h-5"/></button>
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/5 transition-colors group text-slate-900 dark:text-white" onClick={() => setIsPickerOpen(!isPickerOpen)}>
              <CalendarIcon className="w-4 h-4 text-blue-500" /><span className="font-mono font-bold text-sm min-w-[100px] text-center">{formatDate(selectedDate.toISOString())}</span>
            </button>
            {isPickerOpen && (
              <div ref={pickerRef} className="absolute top-full right-0 mt-4 w-72 bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-4 animate-in zoom-in-95 duration-200 z-[100]">
                <div className="flex justify-between items-center mb-4">
                  <button onClick={() => changePickerMonth(-1)} className="p-1 hover:bg-slate-100"><ChevronLeft className="w-4 h-4"/></button>
                  <span className="font-bold text-sm">{pickerDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric'})}</span>
                  <button onClick={() => changePickerMonth(1)} className="p-1 hover:bg-slate-100"><ChevronRight className="w-4 h-4"/></button>
                </div>
                <div className="grid grid-cols-7 mb-2">{WEEK_DAYS_SHORT_LIST.map(d => <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1 uppercase">{d}</div>)}</div>
                <div className="grid grid-cols-7 gap-1">{calendarGrid.map((item, idx) => (
                  <button key={idx} onClick={() => selectDate(item.date)} className={`h-8 w-8 rounded-full flex items-center justify-center text-xs transition-all ${!item.isCurrentMonth ? 'text-slate-300' : 'text-slate-600 hover:bg-slate-100'} ${isSameDay(item.date, selectedDate) ? '!bg-[#3B82F6] !text-white font-bold shadow-lg' : ''}`}>{item.day}</button>
                ))}</div>
                <div className="mt-3 pt-3 border-t flex justify-center"><button onClick={jumpToToday} className="text-xs text-blue-600 font-medium">Jump to Today</button></div>
              </div>
            )}
          </div>
          <button onClick={() => handleDateChange(1)} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronRight className="w-5 h-5"/></button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 dark:bg-[#1a1a1a] rounded-2xl border border-slate-200 dark:border-white/10 relative shadow-inner">
        {visibleRange.isClosed ? (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center animate-in fade-in duration-700">
            <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6"><Clock className="w-12 h-12 text-red-500" /></div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">{t('cal.closed')}</h2>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-x-auto overflow-y-auto custom-scrollbar relative">
            {showCurrentTime && (
              <div className="absolute top-20 bottom-0 z-50 pointer-events-none" style={{ left: timeIndicatorLeft }}>
                <div className="h-full border-l-2 border-red-500 relative shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                  <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-red-500 rounded-full shadow-md" />
                  <div className="absolute top-2 -left-6 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">{currentTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                </div>
              </div>
            )}
            <div className="flex h-20 border-b border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#1a1a1a] sticky top-0 z-40 min-w-[1000px]">
              <div className="w-40 shrink-0 border-r border-slate-200 dark:border-white/10 bg-slate-200 dark:bg-[#1e1e1e] sticky left-0 z-50 flex items-center pl-4 font-bold text-slate-500 dark:text-gray-400 text-xs uppercase tracking-wider shadow-md">
                <Warehouse className="w-4 h-4 mr-2" /> {t('cal.resource')}
              </div>
              <div className="flex-1 flex flex-col relative">
                <div className="h-10 flex border-b border-slate-200 dark:border-white/5 relative">
                  {currentShifts.map((shift, i) => (
                    <div key={shift.id} style={getShiftStyle(shift)} className={`absolute inset-y-0.5 flex items-center justify-center px-2 rounded-md ${i % 2 === 0 ? 'bg-blue-500/20 text-blue-700' : 'bg-indigo-500/20 text-indigo-700'} border border-white/10 z-10`}>
                      <span className="text-[10px] font-black uppercase tracking-tighter truncate flex items-center"><Info className="w-3 h-3 mr-1" />{shift.name}</span>
                    </div>
                  ))}
                </div>
                <div className="h-10 flex relative">
                  {timeSlotLabels.map((h) => {
                    const posLeft = ((h * 60 - visibleRange.start) / totalVisibleMinutes) * 100;
                    return <div key={h} className="absolute top-0 bottom-0 border-l border-slate-200 dark:border-white/5 flex items-center justify-center text-[10px] font-bold text-slate-400 dark:text-gray-500 pl-1" style={{ left: posLeft + '%' }}>{h}:00</div>;
                  })}
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-[1000px]">
              {/* DOCK ROWS */}
              {dockResources.map((resource) => {
                  const dockAppts = getAppointmentsForDock(resource.id);
                  return (
                    <div key={resource.id} className="flex h-24 border-b border-slate-200 dark:border-white/5 relative group hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                      <div className="w-40 shrink-0 border-r border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1e1e1e] sticky left-0 z-30 flex flex-col justify-center px-4 group-hover:bg-slate-100 dark:group-hover:bg-[#252525] transition-colors shadow-sm">
                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{resource.name}</span>
                        <span className="text-[10px] text-slate-500 dark:text-gray-500">{resource.type}</span>
                      </div>
                      <div className="flex-1 relative">
                        {timeSlotLabels.map(h => {
                          const gridLeft = ((h * 60 - visibleRange.start) / totalVisibleMinutes) * 100;
                          return <div key={h} className="absolute top-0 bottom-0 border-l border-slate-200 dark:border-white/5 pointer-events-none" style={{ left: gridLeft + '%' }} />;
                        })}
                        {dockAppts.map(appt => {
                          const style = getEventStyle(appt.startTime, appt.durationMinutes);
                          const isScheduled = appt.status === 'Scheduled';
                          const isCheckedIn = appt.status === 'CheckedIn';
                          
                          // Check if physically onsite to allow move interactions
                          const trailer = trailers.find(t => (t.number || '').toLowerCase() === (appt.trailerNumber || '').toLowerCase());
                          const isGatedIn = trailer && ['GatedIn', 'InYard', 'CheckedIn'].includes(trailer.status);

                          return (
                            <div 
                                key={appt.id} 
                                style={style} 
                                className={`absolute top-2 bottom-2 rounded-lg border-2 shadow-sm z-20 flex flex-col justify-center px-2 overflow-hidden cursor-pointer hover:brightness-110 hover:scale-[1.05] hover:z-30 transition-all 
                                    ${isScheduled ? 'bg-blue-500/80 border-blue-300 border-dashed text-white' : 
                                      isCheckedIn ? 'bg-emerald-600 border-emerald-400 border-solid text-white' : 
                                      'bg-slate-500 border-slate-400 text-white'}
                                    ${!isGatedIn && isScheduled ? 'opacity-80 cursor-default' : 'cursor-pointer'}
                                `} 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    // Restrict move: Only open modal if trailer is gated in
                                    if (!isGatedIn && isScheduled) return;

                                    setSelectedApptId(appt.id); 
                                    setIsActionModalOpen(true); 
                                }}
                            >
                              <div className="flex items-center gap-1 mb-0.5">{isScheduled ? <CalendarClock className="w-3 h-3" /> : isCheckedIn ? <PlayCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}<span className="text-[9px] font-black uppercase tracking-wider">{isScheduled ? 'Planned' : isCheckedIn ? 'Active' : 'Done'}</span></div>
                              <span className="text-xs font-bold truncate leading-tight">{appt.isBobtail ? 'Bobtail' : appt.trailerNumber}</span>
                              <span className="text-[10px] opacity-80 truncate leading-tight">{appt.driverName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
              })}
            </div>
          </div>
        )}
      </div>
      <TrailerActionModal isOpen={isActionModalOpen} onClose={() => { setIsActionModalOpen(false); setSelectedApptId(null); }} appointmentId={selectedApptId || ''} />
    </div>
  );
};
