
import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Resource, Trailer } from '../types';
import { Activity, Truck, Warehouse, Percent, CircleDot, AlertCircle, Briefcase, Timer, ArrowRight, Hourglass, AlertOctagon, MapPin, CalendarDays, Users, Navigation, CheckCircle2 } from 'lucide-react';
import { Pagination } from '../components/ui/Pagination';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { TrailerActionModal } from '../components/TrailerActionModal';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

const KPICard = React.memo<{ title: string; value: string | number; icon: React.FC<any>; color: string; onClick?: () => void }>(({ title, value, icon: Icon, color, onClick }) => (
  <GlassCard
    onClick={onClick}
    className={`p-6 flex items-center justify-between ${onClick ? 'cursor-pointer hover:bg-muted/5 active:scale-95' : ''} transition-all duration-300 border-l-4 border-l-transparent hover:border-l-primary/50 overflow-hidden relative group`}
  >
    <div className="relative z-10">
      <p className="text-muted text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">{title}</p>
      <h3 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground">{value}</h3>
    </div>
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color} shadow-lg shadow-black/5 transform transition-transform group-hover:scale-110 group-hover:rotate-3`}>
      <Icon className="w-7 h-7 text-white" />
    </div>
    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 -mr-16 -mt-16 rounded-full blur-3xl group-hover:bg-primary/5 transition-colors" />
  </GlassCard>
));

const EfficiencyCard = React.memo<{ title: string; value: number; sub: string; icon: React.FC<any>; color: string }>(({ title, value, sub, icon: Icon, color }) => (
  <div className="bg-surface border border-border rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-300 group">
    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${color} transition-transform group-hover:scale-110`}>
      <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
    </div>
    <div>
      <p className="text-[10px] text-muted font-black uppercase tracking-widest opacity-60 mb-0.5">{title}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-xl md:text-2xl font-black text-foreground tracking-tighter">
          {value}
        </p>
        <span className="text-[10px] font-black uppercase tracking-widest text-muted/60">{sub}</span>
      </div>
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
  t: any;
}>(({ resource, apptInfo, inboundTrailer, occupancyCount, now, onAction, t }) => {
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
  let statusGlow = 'shadow-[0_0_15px_rgba(16,185,129,0.3)]';

  if (isOccupied) {
    statusColor = 'bg-primary';
    statusGlow = 'shadow-[0_0_15px_rgba(59,130,246,0.3)]';
  } else if (isUnavailable) {
    statusColor = 'bg-orange-500';
    statusGlow = 'shadow-[0_0_15px_rgba(249,115,22,0.3)]';
  }

  // Determine what to show for preferences
  const hasCarrierRestriction = resource.allowedCarrierIds && resource.allowedCarrierIds.length > 0;
  const hasTypeRestriction = resource.allowedTrailerTypes && resource.allowedTrailerTypes.length > 0;

  return (
    <GlassCard className="p-5 flex flex-col min-h-[11rem] hover:scale-[1.02] cursor-pointer group relative overflow-hidden transition-all duration-300 border border-border/50">
      {/* Status Bar */}
      <div className={`absolute top-0 left-0 w-1.5 h-full ${statusColor}`}></div>

      {/* Header */}
      <div className="flex justify-between items-start mb-4 pl-3">
        <span className="font-black text-lg md:text-xl text-foreground tracking-tight truncate pr-2" title={resource.name}>{resource.name}</span>
        <div className={`w-3 h-3 rounded-full shrink-0 ${statusColor} ${statusGlow} transition-all group-hover:scale-125`} />
      </div>

      {/* Body */}
      <div className="flex-1 pl-3 mb-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-[10px] text-muted uppercase tracking-[0.2em] font-black opacity-60">{effectiveStatus}</p>
          {resource.type === 'YardSlot' && (resource.capacity || 1) > 1 && (
            <div className="flex items-center gap-1 bg-muted/10 px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight">
              <Users className="w-3 h-3" /> {occupancyCount} / {resource.capacity}
            </div>
          )}
        </div>

        {isOccupied && apptInfo ? (
          <div className="flex flex-col gap-1.5 text-primary bg-primary/5 p-3 rounded-[1.25rem] -ml-2 border border-primary/10 relative group-hover:bg-primary/10 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Truck className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-black tracking-tight truncate">{apptInfo.isBobtail ? 'Bobtail' : apptInfo.number || 'Occupied'}</span>
              </div>
            </div>
            {!apptInfo.isBobtail && apptInfo.type && (
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60 pl-6">{apptInfo.type}</span>
            )}
          </div>
        ) : inboundTrailer ? (
          <div className="flex flex-col gap-1.5 text-emerald-600 bg-emerald-500/5 p-3 rounded-[1.25rem] -ml-2 border border-emerald-500/10 relative animate-pulse">
            <div className="flex items-center gap-2 min-w-0">
              <Navigation className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-black tracking-tight truncate flex-1">Inbound: {inboundTrailer.number}</span>
            </div>
            {inboundTrailer.type && (
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60 pl-6">{inboundTrailer.type}</span>
            )}
          </div>
        ) : isUnavailable && isTimeUnavailable ? (
          <div className="text-[10px] text-orange-500 font-black uppercase tracking-widest flex items-center gap-2 bg-orange-500/5 p-3 rounded-[1.25rem] -ml-2 border border-orange-500/10">
            <AlertCircle className="w-4 h-4" /> Maintenance
          </div>
        ) : (
          <div className="text-xs text-muted/40 italic pl-1 font-bold uppercase tracking-widest">{t('dash.ready')}</div>
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
  const COLORS = ['#10b981', '#3B82F6', '#f97316'];

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
    <div className="p-4 md:p-10 space-y-10 md:space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tighter mb-2 leading-tight">Operational Insight</h1>
          <p className="text-muted text-lg font-medium opacity-80">{t('dash.subtitle')}</p>
        </div>
        <div className="self-start md:self-auto">
          <span className="inline-flex items-center px-6 py-3 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/20 shadow-xl shadow-emerald-500/5">
            <CircleDot className="w-4 h-4 mr-3 animate-pulse" /> {t('dash.live')} System
          </span>
        </div>
      </header>

      {/* KPIs - Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
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
          color="bg-primary"
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight flex items-center">
            <Timer className="w-6 h-6 mr-3 text-muted opacity-40" /> {t('dash.efficiency')}
          </h2>
          {settings.metricsRange ? (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-widest text-primary shadow-lg shadow-primary/5">
              <CalendarDays className="w-3.5 h-3.5" />
              {formatDate(settings.metricsRange.start)} - {formatDate(settings.metricsRange.end)}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/10 rounded-full text-[10px] font-black uppercase tracking-widest text-muted">
              <CalendarDays className="w-3.5 h-3.5" /> All Time
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            className="bg-surface border border-border rounded-2xl p-5 flex items-center gap-4 cursor-pointer hover:bg-muted/5 transition-all duration-300 group shadow-sm hover:shadow-md"
            onClick={() => {
              const el = document.getElementById('congestion-panel');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${metrics.longStayTrailers > 0 ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/20' : 'bg-muted/20'}`}>
              <AlertOctagon className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] text-muted font-black uppercase tracking-widest opacity-60 mb-0.5">{t('dash.longStay')}</p>
              <p className={`text-xl md:text-2xl font-black ${metrics.longStayTrailers > 0 ? 'text-red-500' : 'text-foreground'} tracking-tighter leading-none`}>
                {metrics.longStayTrailers}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout - Updated for Tablet Visibility */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">

        {/* Main Grid (Docks/Slots) - Takes 2 cols on Large, 1 on Mobile/Tablet Portrait */}
        <div className="lg:col-span-2 space-y-12">
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-foreground tracking-tight">{t('dash.docks')}</h2>
              <div className="flex gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div> Avail</div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.3)]"></div> Occ</div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.3)]"></div> Unavail</div>
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
                  t={t}
                />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black text-foreground tracking-tight mb-6">{t('dash.slots')}</h2>
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
                  t={t}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Side Panel - Always visible now, stacks on mobile/tablet */}
        <div className="space-y-8">
          <GlassCard className="p-8 flex flex-col">
            <h3 className="text-xl font-black text-foreground tracking-tight mb-8">{t('dash.distribution')}</h3>
            <div className="h-64 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Centered Text */}
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-4xl font-black text-foreground tracking-tighter">{docks.length}</span>
                <span className="text-[10px] text-muted font-black uppercase tracking-widest">{t('dash.total')}</span>
              </div>
            </div>

            <div className="mt-10 space-y-3">
              {data.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between p-4 rounded-2xl bg-muted/5 border border-border/50 transition-colors hover:bg-muted/10">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full shadow-lg" style={{ backgroundColor: COLORS[i], boxShadow: `0 0 10px ${COLORS[i]}40` }} />
                    <span className="text-sm text-foreground font-bold tracking-tight">{d.name}</span>
                  </div>
                  <span className="font-black text-foreground">{d.value}</span>
                </div>
              ))}
            </div>

            {activeAlerts > 0 && (
              <div className="mt-8">
                <div className="bg-orange-500/10 border border-orange-500/20 p-5 rounded-2xl flex gap-4 animate-in slide-in-from-bottom duration-500">
                  <AlertCircle className="w-6 h-6 text-orange-500 shrink-0" />
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-orange-500 mb-1">{t('dash.alert')}</h4>
                    <p className="text-xs text-muted font-bold leading-relaxed">{activeAlerts} {t('dash.alertMsg')}</p>
                  </div>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Congestion Watchlist */}
          <div id="congestion-panel" className="animate-in fade-in duration-1000 delay-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-foreground tracking-tight flex items-center">
                <AlertOctagon className="w-6 h-6 mr-3 text-red-500" /> {t('dash.congestion')}
              </h3>
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-muted bg-muted/10 px-3 py-1.5 rounded-full border border-border/50">
                &gt;{thresholdYard}h Yard / &gt;{thresholdDock}h Dock
              </div>
            </div>
            <div className="bg-surface border border-border rounded-[2rem] overflow-hidden shadow-xl shadow-black/5 backdrop-blur-md">
              {stuckTrailers.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-muted/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-muted opacity-20" />
                  </div>
                  <p className="text-sm text-muted font-black uppercase tracking-widest opacity-40">All clear</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30 overflow-y-auto custom-scrollbar max-h-[400px]">
                  {paginatedStuck.map(t => {
                    const history = t.history || [];
                    const arrival = history.find(h => h.status !== 'Scheduled')?.timestamp;
                    const hours = arrival ? Math.floor((now.getTime() - new Date(arrival).getTime()) / (1000 * 60 * 60)) : 0;

                    let locationName = 'Yard';
                    const checkedIn = history.find(h => h.status === 'CheckedIn');
                    if (t.status === 'CheckedIn' && checkedIn?.location) {
                      const loc = [...docks, ...yardSlots].find(r => r.id === checkedIn.location);
                      if (loc) locationName = loc.name;
                    }

                    return (
                      <div key={t.id} className="p-5 hover:bg-red-500/5 transition-all group cursor-default border-l-4 border-l-transparent hover:border-l-red-500">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-black text-foreground tracking-tight text-base group-hover:text-red-500 transition-colors">{t.number}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-3 py-1 rounded-full">{hours}h Dwell</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted opacity-60">
                          <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {locationName}</span>
                          <span className="truncate ml-2">{t.owner}</span>
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
