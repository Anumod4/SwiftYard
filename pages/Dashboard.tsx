
import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Resource, Trailer } from '../types';
import { Activity, Truck, Warehouse, Percent, CircleDot, AlertCircle, Briefcase, Timer, ArrowRight, Hourglass, AlertOctagon, MapPin, CalendarDays, Users, Navigation } from 'lucide-react';
import { Pagination } from '../components/ui/Pagination';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { TrailerActionModal } from '../components/TrailerActionModal';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

const KPICard = React.memo<{ title: string; value: string | number; icon: React.FC<any>; color: string; onClick?: () => void }>(({ title, value, icon: Icon, color, onClick }) => (
  <GlassCard
    onClick={onClick}
    className={`p-5 flex items-center justify-between ${onClick ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95' : ''} transition-all`}
  >
    <div>
      <p className="text-slate-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">{value}</h3>
    </div>
    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center ${color} shadow-lg`}>
      <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
    </div>
  </GlassCard>
));

const EfficiencyCard = React.memo<{ title: string; value: number; sub: string; icon: React.FC<any>; color: string }>(({ title, value, sub, icon: Icon, color }) => (
  <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl p-4 flex items-center gap-3 shadow-sm">
    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center ${color}`}>
      <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
    </div>
    <div>
      <p className="text-[10px] md:text-xs text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider">{title}</p>
      <p className="text-lg md:text-xl font-black text-slate-900 dark:text-white leading-none mt-0.5">
        {value} <span className="text-[10px] font-medium text-slate-400">{sub}</span>
      </p>
    </div>
  </div>
));

const ResourceNode = React.memo<{
  resource: Resource;
  apptInfo?: { number?: string, type?: string, isBobtail: boolean };
  inboundTrailer?: Trailer;
  occupancyCount: number;
  now: Date;
  onAction?: (apptId: string) => void;
}>(({ resource, apptInfo, inboundTrailer, occupancyCount, now, onAction }) => {
  // Real-time status check: If status is Available BUT we are in a maintenance window, show Unavailable
  const isTimeUnavailable = resource.unavailability?.some(u =>
    new Date(u.startTime) <= now && new Date(u.endTime) >= now
  );

  // Effective status calculation
  let effectiveStatus = resource.status;
  if (resource.status === 'Available' && isTimeUnavailable) {
    effectiveStatus = 'Unavailable';
  }

  const isOccupied = effectiveStatus === 'Occupied';
  const isUnavailable = effectiveStatus === 'Unavailable';

  let statusColor = 'bg-emerald-500';
  let statusGlow = 'shadow-[0_0_10px_rgba(16,185,129,0.3)]';

  if (isOccupied) {
    statusColor = 'bg-[#0a84ff]';
    statusGlow = 'shadow-[0_0_10px_rgba(10,132,255,0.3)]';
  } else if (isUnavailable) {
    statusColor = 'bg-orange-500';
    statusGlow = 'shadow-[0_0_10px_rgba(249,115,22,0.3)]';
  }

  // Determine what to show for preferences
  const hasCarrierRestriction = resource.allowedCarrierIds && resource.allowedCarrierIds.length > 0;
  const hasTypeRestriction = resource.allowedTrailerTypes && resource.allowedTrailerTypes.length > 0;

  return (
    <GlassCard className="p-4 flex flex-col min-h-[10rem] hover:scale-[1.02] cursor-pointer group relative overflow-hidden transition-all duration-300">
      {/* Status Bar */}
      <div className={`absolute top-0 left-0 w-1 h-full ${statusColor}`}></div>

      {/* Header */}
      <div className="flex justify-between items-start mb-3 pl-2">
        <span className="font-bold text-base md:text-lg text-slate-900 dark:text-gray-200 truncate pr-2" title={resource.name}>{resource.name}</span>
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusColor} ${statusGlow}`} />
      </div>

      {/* Body */}
      <div className="flex-1 pl-2 mb-3">
        <div className="flex justify-between items-center mb-1.5">
          <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-widest font-bold">{effectiveStatus}</p>
          {resource.type === 'YardSlot' && (resource.capacity || 1) > 1 && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold">
              <Users className="w-3 h-3" /> {occupancyCount} / {resource.capacity}
            </div>
          )}
        </div>

        {isOccupied && apptInfo ? (
          <div className="flex flex-col gap-1 text-[#0a84ff] bg-blue-50 dark:bg-blue-500/10 p-2 rounded-lg -ml-1 border border-blue-100 dark:border-blue-500/20 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <Truck className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-sm font-bold truncate">{apptInfo.isBobtail ? 'Bobtail' : apptInfo.number || 'Occupied'}</span>
              </div>
            </div>
            {!apptInfo.isBobtail && apptInfo.type && (
              <span className="text-[10px] text-blue-500 dark:text-blue-300 truncate opacity-80 pl-5">{apptInfo.type}</span>
            )}
          </div>
        ) : inboundTrailer ? (
          <div className="flex flex-col gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-lg -ml-1 border border-emerald-100 dark:border-emerald-500/20 relative animate-pulse">
            <div className="flex items-center gap-1.5 min-w-0">
              <Truck className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-sm font-bold truncate flex-1">Inbound: {inboundTrailer.number}</span>
            </div>
            {inboundTrailer.type && (
              <span className="text-[10px] text-emerald-500 dark:text-emerald-300 truncate opacity-80 pl-5">{inboundTrailer.type}</span>
            )}
          </div>
        ) : isUnavailable && isTimeUnavailable ? (
          <div className="text-[10px] text-orange-500 font-bold flex items-center gap-1 bg-orange-50 dark:bg-orange-500/10 p-2 rounded-lg -ml-1 border border-orange-100 dark:border-orange-500/20">
            <AlertCircle className="w-3 h-3" /> Maintenance Active
          </div>
        ) : (
          <div className="text-xs text-slate-300 dark:text-gray-700 italic pl-1">Ready for assignment</div>
        )}
      </div>

    </GlassCard>
  );
});

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { metrics, docks, yardSlots, appointments, trailers, settings, t, formatDate } = useData();
  const [now, setNow] = useState(new Date());

  // Action Modal State
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedApptId, setSelectedApptId] = useState<string | null>(null);

  const [stuckPage, setStuckPage] = useState(1);
  const stuckPageSize = 5; // Dashboard side panel, smaller page size

  // Force re-render every minute to update time-based unavailability
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const data = [
    { name: 'Available', value: docks.filter(d => d.status === 'Available').length },
    { name: 'Occupied', value: docks.filter(d => d.status === 'Occupied').length },
    { name: 'Unavailable', value: docks.filter(d => d.status === 'Unavailable').length },
  ];
  const COLORS = ['#10b981', '#0a84ff', '#f97316'];

  const getApptInfo = (id?: string) => {
    if (!id) return undefined;
    const a = appointments.find(x => x.id === id);
    if (!a) return undefined;
    return { number: a.trailerNumber, type: a.trailerType, isBobtail: a.isBobtail };
  }

  // Get current occupancy count for a resource
  const getOccupancyCount = (resourceId: string) => {
    return trailers.filter(t =>
      (t.location === resourceId && ['InYard', 'GatedIn', 'CheckedIn'].includes(t.status))
    ).length;
  };

  const getInboundTrailer = (resourceId: string) => {
    return trailers.find(t => t.targetResourceId === resourceId && ['MovingToDock', 'MovingToYard'].includes(t.status));
  };

  const handleAction = (apptId: string) => {
    setSelectedApptId(apptId);
    setIsActionModalOpen(true);
  };

  // Count active unavailable warnings (Including time-based ones)
  const activeAlerts = docks.filter(d => {
    if (d.status === 'Unavailable') return true;
    if (d.status === 'Available' && d.unavailability?.some(u => new Date(u.startTime) <= now && new Date(u.endTime) >= now)) return true;
    return false;
  }).length;

  // Identify Stuck Trailers for List based on Configured Thresholds
  const thresholdYard = settings.dwellThresholds?.yard || 4;
  const thresholdDock = settings.dwellThresholds?.dock || 2;

  const stuckTrailers = trailers.filter(t => {
    if (['Scheduled', 'GatedOut', 'Cancelled', 'Unknown'].includes(t.status)) return false;
    const history = t.history || []; // Safe default
    const arrival = history.find(h => h.status !== 'Scheduled');
    if (arrival) {
      const totalHours = (now.getTime() - new Date(arrival.timestamp).getTime()) / (1000 * 60 * 60);

      // Rule 1: Yard Dwell
      if (totalHours > thresholdYard) return true;

      // Rule 2: Dock Dwell
      if (t.status === 'CheckedIn') {
        const lastCheckedIn = [...history].reverse().find(h => h.status === 'CheckedIn');
        if (lastCheckedIn) {
          const dockHours = (now.getTime() - new Date(lastCheckedIn.timestamp).getTime()) / (1000 * 60 * 60);
          if (dockHours > thresholdDock) return true;
        }
      }
    }
    return false;
  }).sort((a, b) => {
    // Sort by longest stay
    const aHist = a.history || [];
    const bHist = b.history || [];
    const aIn = aHist.find(h => h.status !== 'Scheduled')?.timestamp || '';
    const bIn = bHist.find(h => h.status !== 'Scheduled')?.timestamp || '';
    return new Date(aIn).getTime() - new Date(bIn).getTime();
  });

  const paginatedStuck = React.useMemo(() => {
    const start = (stuckPage - 1) * stuckPageSize;
    return stuckTrailers.slice(start, start + stuckPageSize);
  }, [stuckTrailers, stuckPage]);

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('dash.title')}</h1>
          <p className="text-slate-500 dark:text-gray-400 text-sm md:text-base">{t('dash.subtitle')}</p>
        </div>
        <div className="self-start md:self-auto">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
            <CircleDot className="w-3 h-3 mr-1 animate-pulse" /> {t('dash.live')}
          </span>
        </div>
      </header>

      {/* KPIs - Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <KPICard
          title={t('kpi.pending')}
          value={metrics.pendingAppointments}
          icon={Activity}
          color="bg-indigo-500"
          onClick={() => onNavigate('schedule')}
        />
        <KPICard
          title={t('kpi.occupied')}
          value={metrics.occupiedDocks}
          icon={Warehouse}
          color="bg-blue-500"
          onClick={() => onNavigate('resources')}
        />
        <KPICard
          title={t('kpi.yard')}
          value={metrics.trailersInYard}
          icon={Truck}
          color="bg-violet-500"
          onClick={() => onNavigate('trailers')}
        />
        <KPICard
          title={t('kpi.occupancy')}
          value={`${metrics.dockOccupancyRate}%`}
          icon={Percent}
          color="bg-emerald-500"
        />
      </div>

      {/* Operational Efficiency */}
      <section>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white flex items-center">
            <Timer className="w-5 h-5 mr-2 text-slate-500" /> {t('dash.efficiency')}
          </h2>
          {settings.metricsRange ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <CalendarDays className="w-3 h-3" />
              {formatDate(settings.metricsRange.start)} - {formatDate(settings.metricsRange.end)}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-200 dark:bg-white/10 rounded-full text-xs font-bold text-slate-500 dark:text-gray-400">
              <CalendarDays className="w-3 h-3" /> All Time
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <EfficiencyCard
            title={t('dash.gateToDock')}
            value={metrics.avgGateToDock}
            sub={t('dash.mins')}
            icon={ArrowRight}
            color="bg-cyan-500"
          />
          <EfficiencyCard
            title={t('dash.dockDwell')}
            value={metrics.avgDockDwell}
            sub={t('dash.mins')}
            icon={Hourglass}
            color="bg-amber-500"
          />
          <EfficiencyCard
            title={t('dash.yardDwell')}
            value={metrics.avgYardDwell}
            sub={t('dash.mins')}
            icon={Warehouse}
            color="bg-purple-500"
          />
          <div
            className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
            onClick={() => {
              const el = document.getElementById('congestion-panel');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center ${metrics.longStayTrailers > 0 ? 'bg-red-500 animate-pulse' : 'bg-slate-300 dark:bg-white/20'}`}>
              <AlertOctagon className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] md:text-xs text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider">{t('dash.longStay')}</p>
              <p className={`text-lg md:text-xl font-black ${metrics.longStayTrailers > 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'} leading-none mt-0.5`}>
                {metrics.longStayTrailers}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout - Updated for Tablet Visibility */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">

        {/* Main Grid (Docks/Slots) - Takes 2 cols on Large, 1 on Mobile/Tablet Portrait */}
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t('dash.docks')}</h2>
              <div className="flex gap-2 text-[10px] md:text-xs text-slate-600 dark:text-gray-400">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Avail</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#0a84ff]"></div> Occ</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Unavail</div>
              </div>
            </div>
            {/* Responsive Grid for Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...docks].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })).map(dock => (
                <ResourceNode
                  key={dock.id}
                  resource={dock}
                  now={now}
                  apptInfo={getApptInfo(dock.currentAppId)}
                  inboundTrailer={getInboundTrailer(dock.id)}
                  occupancyCount={dock.status === 'Occupied' ? 1 : 0}
                  onAction={handleAction}
                />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">{t('dash.slots')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...yardSlots].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })).map(slot => (
                <ResourceNode
                  key={slot.id}
                  resource={slot}
                  now={now}
                  apptInfo={getApptInfo(slot.currentAppId)}
                  inboundTrailer={getInboundTrailer(slot.id)}
                  occupancyCount={getOccupancyCount(slot.id)}
                  onAction={handleAction}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Side Panel - Always visible now, stacks on mobile/tablet */}
        <div className="space-y-6">
          <GlassCard className="p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">{t('dash.distribution')}</h3>
            <div className="h-64 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f1f1f', border: 'none', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Centered Text */}
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">{docks.length}</span>
                <span className="text-xs text-slate-500 dark:text-gray-500">{t('dash.total')}</span>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {data.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-sm text-slate-700 dark:text-gray-300">{d.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">{d.value}</span>
                </div>
              ))}
            </div>

            {activeAlerts > 0 && (
              <div className="mt-8">
                <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-orange-500">{t('dash.alert')}</h4>
                    <p className="text-xs text-orange-600 dark:text-gray-400 mt-1">{activeAlerts} {t('dash.alertMsg')}</p>
                  </div>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Congestion Watchlist */}
          <div id="congestion-panel">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                <AlertOctagon className="w-5 h-5 mr-2 text-red-500" /> {t('dash.congestion')}
              </h3>
              <div className="text-[10px] text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded">
                &gt;{thresholdYard}h Yard / &gt;{thresholdDock}h Dock
              </div>
            </div>
            <div className="bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
              {stuckTrailers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-gray-500 text-sm">
                  No trailers exceeding dwell time limits.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-white/5 overflow-y-auto custom-scrollbar">
                  {paginatedStuck.map(t => {
                    const history = t.history || [];
                    const arrival = history.find(h => h.status !== 'Scheduled')?.timestamp;
                    const hours = arrival ? Math.floor((now.getTime() - new Date(arrival).getTime()) / (1000 * 60 * 60)) : 0;

                    // Find location if checked in
                    let locationName = 'Yard';
                    const checkedIn = history.find(h => h.status === 'CheckedIn');
                    if (t.status === 'CheckedIn' && checkedIn?.location) {
                      const loc = [...docks, ...yardSlots].find(r => r.id === checkedIn.location);
                      if (loc) locationName = loc.name;
                    }

                    return (
                      <div key={t.id} className="p-4 hover:bg-red-500/5 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-slate-900 dark:text-white">{t.number}</span>
                          <span className="text-xs font-black text-red-500 bg-red-500/10 px-2 py-0.5 rounded">{hours}h Total</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-gray-400">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {locationName}</span>
                          <span>{t.owner}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {stuckTrailers.length > 0 && (
                <div className="p-2 border-t border-slate-200 dark:border-white/5">
                  <Pagination
                    currentPage={stuckPage}
                    totalPages={Math.ceil(stuckTrailers.length / stuckPageSize)}
                    onPageChange={setStuckPage}
                    totalRecords={stuckTrailers.length}
                    pageSize={stuckPageSize}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <TrailerActionModal
        isOpen={isActionModalOpen}
        onClose={() => { setIsActionModalOpen(false); setSelectedApptId(null); }}
        appointmentId={selectedApptId || ''}
      />
    </div>
  );
};
