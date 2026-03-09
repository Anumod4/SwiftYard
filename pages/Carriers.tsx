
import React, { useState, useMemo } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Carrier } from '../types';
import { Plus, Edit2, Trash2, Briefcase, Mail, Phone, ListPlus, Search, Filter, Star, Trophy, Shield, Medal, Target, Clock, TrendingUp } from 'lucide-react';
import { ModalPortal } from '../components/ui/ModalPortal';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { BulkCreatorModal, BulkColumn } from '../components/BulkCreatorModal';
import { DeleteConfirmationModal } from '../components/ui/DeleteConfirmationModal';
import { VIEW_IDS } from '../constants';

export const Carriers: React.FC = () => {
  const { carriers, addCarrier, updateCarrier, deleteCarrier, t, addToast, canEdit, getCarrierTier, currentFacilityId } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [carrierToDelete, setCarrierToDelete] = useState<string | null>(null);
  const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [showFilters, setShowFilters] = useState(false);

  const clearFilters = () => {
    setSearchTerm('');
  };

  // Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Billing Overrides
  const [freeYardHours, setFreeYardHours] = useState('');
  const [freeDockHours, setFreeDockHours] = useState('');
  const [yardRatePerDay, setYardRatePerDay] = useState('');
  const [dockRatePerHour, setDockRatePerHour] = useState('');
  const [bufferTime, setBufferTime] = useState('');
  const [manualScore, setManualScore] = useState('');
  const [bookingAdvanceHours, setBookingAdvanceHours] = useState('');

  const [isBulkOpen, setIsBulkOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const canEditCarriers = canEdit(VIEW_IDS.CARRIERS);

  const handleOpenModal = (c?: Carrier) => {
    if (c) {
      setEditingCarrier(c);
      setName(c.name);
      setEmail(c.contactEmail || '');
      setPhone(c.contactPhone || '');
      setFreeYardHours(c.billingOverrides?.freeYardHours?.toString() || '');
      setFreeDockHours(c.billingOverrides?.freeDockHours?.toString() || '');
      setYardRatePerDay(c.billingOverrides?.yardRatePerDay?.toString() || '');
      setDockRatePerHour(c.billingOverrides?.dockRatePerHour?.toString() || '');
      setBufferTime(c.bufferTimeMinutes?.toString() || '');
      const perf = (c.performance?.[currentFacilityId || ''] || {}) as any;
      setManualScore(perf.manualScore?.toString() || '');
      setBookingAdvanceHours(perf.bookingAdvanceHours?.toString() || '');
    } else {
      setEditingCarrier(null);
      setName('');
      setEmail('');
      setPhone('');
      setFreeYardHours('');
      setFreeDockHours('');
      setYardRatePerDay('');
      setDockRatePerHour('');
      setBufferTime('');
      setManualScore('');
      setBookingAdvanceHours('');
    }
    setIsModalOpen(true);
  };

  const isDirty = useMemo(() => {
    if (!isModalOpen) return false;
    const currentPerformance = (editingCarrier?.performance?.[currentFacilityId!] || {}) as any;

    const overridesMatch = () => {
      const bo = editingCarrier?.billingOverrides || {};
      return (freeYardHours === (bo.freeYardHours?.toString() || '')) &&
        (freeDockHours === (bo.freeDockHours?.toString() || '')) &&
        (yardRatePerDay === (bo.yardRatePerDay?.toString() || '')) &&
        (dockRatePerHour === (bo.dockRatePerHour?.toString() || ''));
    };

    if (editingCarrier) {
      return name !== editingCarrier.name ||
        email !== (editingCarrier.contactEmail || '') ||
        phone !== (editingCarrier.contactPhone || '') ||
        bufferTime !== (editingCarrier.bufferTimeMinutes?.toString() || '') ||
        manualScore !== (currentPerformance.manualScore?.toString() || '') ||
        bookingAdvanceHours !== (currentPerformance.bookingAdvanceHours?.toString() || '') ||
        !overridesMatch();
    }
    return name !== '' || email !== '' || phone !== '' || bufferTime !== '' || manualScore !== '' || bookingAdvanceHours !== '' ||
      freeYardHours !== '' || freeDockHours !== '' || yardRatePerDay !== '' || dockRatePerHour !== '';
  }, [isModalOpen, name, email, phone, bufferTime, manualScore, bookingAdvanceHours, freeYardHours, freeDockHours, yardRatePerDay, dockRatePerHour, editingCarrier, currentFacilityId]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse billing overrides
    const overrides: Carrier['billingOverrides'] = {
      freeYardHours: freeYardHours !== '' ? Number(freeYardHours) : undefined,
      freeDockHours: freeDockHours !== '' ? Number(freeDockHours) : undefined,
      yardRatePerDay: yardRatePerDay !== '' ? Number(yardRatePerDay) : undefined,
      dockRatePerHour: dockRatePerHour !== '' ? Number(dockRatePerHour) : undefined,
    };

    const fid = currentFacilityId || '';
    const payload: Partial<Carrier> = {
      name,
      facilityId: fid, // CRITICAL: Ensure facilityId is present
      contactEmail: email || undefined,
      contactPhone: phone || undefined,
      billingOverrides: overrides,
      bufferTimeMinutes: bufferTime !== '' ? Number(bufferTime) : undefined,
      performance: {
        ...(editingCarrier?.performance || {}),
        [fid]: {
          ...(editingCarrier?.performance?.[fid] || { systemScore: 100 }),
          manualScore: manualScore !== '' ? Number(manualScore) : undefined,
          bookingAdvanceHours: bookingAdvanceHours !== '' ? Number(bookingAdvanceHours) : undefined
        }
      }
    };

    if (editingCarrier) {
      updateCarrier({ ...editingCarrier, ...payload });
    } else {
      addCarrier(payload);
    }
    setIsModalOpen(false);
  };

  const handleDeleteClick = (id: string) => {
    setCarrierToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (carrierToDelete) {
      try {
        await deleteCarrier(carrierToDelete);
        addToast("Carrier deleted successfully", "success");
      } catch (err: any) {
        addToast(err.message || "Failed to delete carrier", "error");
      }
      setCarrierToDelete(null);
    }
  };

  const handleBulkSave = async (data: any[]) => {
    const promises = data.map(item => addCarrier({
      name: item.name,
      contactEmail: item.contactEmail || undefined,
      contactPhone: item.contactPhone || undefined
    }));
    await Promise.all(promises);
    addToast('Bulk Create', `Created ${data.length} carriers.`, 'success');
  };

  const filteredCarriers = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return carriers;
    const s = debouncedSearchTerm.toLowerCase();
    return carriers.filter(c =>
      c.name.toLowerCase().includes(s) ||
      c.contactEmail?.toLowerCase().includes(s)
    );
  }, [carriers, debouncedSearchTerm]);

  const paginatedCarriers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCarriers.slice(start, start + pageSize);
  }, [filteredCarriers, currentPage, pageSize]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const bulkColumns: BulkColumn[] = [
    { key: 'name', label: 'Carrier Name', type: 'text', required: true },
    { key: 'contactEmail', label: 'Email', type: 'text' },
    { key: 'contactPhone', label: 'Phone', type: 'text' },
    { key: 'bufferTimeMinutes', label: 'Buffer Time (Mins)', type: 'number' }
  ];

  return (
    <div className="p-8 h-full flex flex-col animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tighter leading-tight">Carrier Network</h1>
          <p className="text-muted text-lg font-medium opacity-70">{t('car.subtitle')}</p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-8 py-4 rounded-2xl flex items-center gap-3 font-black uppercase tracking-widest text-xs transition-all border-2 ${showFilters ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20' : 'bg-surface border-border text-muted hover:bg-muted/5'}`}
          >
            <Filter className="w-5 h-5" />
            {showFilters ? 'Hide Filters' : 'Advanced Filters'}
          </button>
          {canEditCarriers && (
            <div className="flex gap-4">
              <button
                onClick={() => setIsBulkOpen(true)}
                className="bg-surface border border-border hover:bg-muted/5 text-foreground px-6 py-4 rounded-2xl flex items-center shadow-lg transition-all active:scale-95 font-bold"
                title="Bulk Create"
              >
                <ListPlus className="w-5 h-5 text-primary" />
              </button>
              <button
                onClick={() => handleOpenModal()}
                className="bg-primary hover:bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center shadow-2xl shadow-primary/30 transition-all active:scale-95 font-black uppercase tracking-widest text-xs whitespace-nowrap"
              >
                <Plus className="w-5 h-5 mr-2" />
                {t('car.add')}
              </button>
            </div>
          )}
        </div>
      </div>

      {showFilters && (
        <GlassCard className="mb-8 p-10 animate-in slide-in-from-top duration-500 rounded-[2.5rem] border-none shadow-2xl !overflow-visible z-50">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase">Query Filters</h2>
            <button onClick={clearFilters} className="text-[10px] font-black text-primary hover:text-blue-600 uppercase tracking-[0.2em] transition-colors bg-primary/5 px-4 py-2 rounded-xl">Clear All Logic</button>
          </div>
          <div className="text-center py-10 text-muted italic font-medium">No additional filters available for carriers. Use global search below.</div>
        </GlassCard>
      )}

      <div className="relative mb-8 group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted w-6 h-6 transition-colors group-focus-within:text-primary" />
        <input
          type="text"
          placeholder="Quick search by name or contact info..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-surface border-2 border-border/50 rounded-[1.5rem] pl-16 pr-6 py-5 font-bold text-foreground outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-xl placeholder:text-muted/40"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedCarriers.map(carrier => (
          <CarrierCard
            key={carrier.id}
            carrier={carrier}
            canEdit={canEditCarriers}
            onEdit={handleOpenModal}
            onDelete={handleDeleteClick}
            getCarrierTier={getCarrierTier}
            t={t}
          />
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(filteredCarriers.length / pageSize)}
        onPageChange={setCurrentPage}
        totalRecords={filteredCarriers.length}
        pageSize={pageSize}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isDirty={isDirty}
        title={(editingCarrier ? t('common.edit') : t('common.add')) + ' ' + t('car.modalTitle')}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-2">{t('car.name')} *</label>
            <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-muted/5 border border-border rounded-xl p-4 text-foreground font-bold focus:border-primary focus:outline-none transition-all" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-2">{t('car.email')}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-muted/5 border border-border rounded-xl p-4 text-foreground font-bold focus:border-primary focus:outline-none transition-all" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-2">{t('car.phone')}</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-muted/5 border border-border rounded-xl p-4 text-foreground font-bold focus:border-primary focus:outline-none transition-all" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-2">Buffer Time (Minutes)</label>
            <input type="number" min="0" value={bufferTime} onChange={e => setBufferTime(e.target.value)} placeholder="Minutes before/after" className="w-full bg-muted/5 border border-border rounded-xl p-4 text-foreground font-bold focus:border-primary focus:outline-none transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-2">Manual Score (0-100)</label>
              <input type="number" min="0" max="100" value={manualScore} onChange={e => setManualScore(e.target.value)} className="w-full bg-muted/5 border border-border rounded-xl p-4 text-foreground font-bold focus:border-primary focus:outline-none transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-2">Priority Booking (Hrs)</label>
              <input type="number" min="0" value={bookingAdvanceHours} onChange={e => setBookingAdvanceHours(e.target.value)} placeholder="Custom hours early" className="w-full bg-muted/5 border border-border rounded-xl p-4 text-foreground font-bold focus:border-primary focus:outline-none transition-all" />
            </div>
          </div>

          <div className="pt-6 border-t border-border/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground mb-4 opacity-100">Custom Billing Rules (Optional)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-1.5 opacity-60">Free Yard Hrs</label>
                <input type="number" min="0" placeholder="System Default" value={freeYardHours} onChange={e => setFreeYardHours(e.target.value)} className="w-full bg-muted/5 border border-border rounded-xl p-3 text-sm text-foreground font-bold focus:border-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-1.5 opacity-60">Yard Rate/Day ($)</label>
                <input type="number" min="0" placeholder="System Default" value={yardRatePerDay} onChange={e => setYardRatePerDay(e.target.value)} className="w-full bg-muted/5 border border-border rounded-xl p-3 text-sm text-foreground font-bold focus:border-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-1.5 opacity-60">Free Dock Hrs</label>
                <input type="number" min="0" placeholder="System Default" value={freeDockHours} onChange={e => setFreeDockHours(e.target.value)} className="w-full bg-muted/5 border border-border rounded-xl p-3 text-sm text-foreground font-bold focus:border-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-1.5 opacity-60">Dock Rate/Hr ($)</label>
                <input type="number" min="0" placeholder="System Default" value={dockRatePerHour} onChange={e => setDockRatePerHour(e.target.value)} className="w-full bg-muted/5 border border-border rounded-xl p-3 text-sm text-foreground font-bold focus:border-primary outline-none transition-all" />
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-border/50 flex justify-end gap-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted hover:text-foreground transition-all">Dismiss</button>
            <button type="submit" className="bg-primary hover:bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/30 transition-all active:scale-95">Save Details</button>
          </div>
        </form>
      </Modal>

      <BulkCreatorModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        title="Bulk Create Carriers"
        subtitle="Add multiple transport partners."
        columns={bulkColumns}
        onSubmit={handleBulkSave}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Carrier"
        message="Are you sure you want to delete this carrier? This will remove all their associated system records and active transport assignments."
      />
    </div >
  );
};

const CarrierCard = React.memo<{
  carrier: Carrier;
  canEdit: boolean;
  onEdit: (c: Carrier) => void;
  onDelete: (id: string) => void;
  getCarrierTier: (c: Carrier, fid?: string) => string;
  t: any;
}>(({ carrier, canEdit, onEdit, onDelete, getCarrierTier, t }) => {
  const { currentFacilityId } = useData();
  const perf = (carrier.performance?.[currentFacilityId || ''] || { systemScore: 100 }) as any;
  const tier = getCarrierTier(carrier, currentFacilityId || undefined);
  const tierColors: Record<string, string> = {
    'Platinum': 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    'Gold': 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    'Silver': 'text-slate-400 bg-slate-400/10 border-slate-400/20',
    'Bronze': 'text-orange-600 bg-orange-600/10 border-orange-600/20',
  };
  const TierIcon = tier === 'Platinum' ? Trophy : tier === 'Gold' ? Medal : tier === 'Silver' ? Shield : Star;

  return (
    <GlassCard className="p-10 flex flex-col group relative h-full hover:scale-[1.02] transition-all duration-500 border-none shadow-xl bg-surface/50 rounded-[2.5rem] overflow-hidden">
      <div className="absolute top-0 left-0 w-2 h-full bg-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]"></div>
      {canEdit && (
        <div className="absolute top-8 right-8 flex items-center gap-2 z-10 transition-all duration-500 opacity-0 group-hover:opacity-100">
          <button
            onClick={() => onEdit(carrier)}
            className="w-10 h-10 flex items-center justify-center bg-surface hover:bg-primary hover:text-white rounded-xl shadow-lg transition-all text-muted"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(carrier.id)}
            className="w-10 h-10 flex items-center justify-center bg-surface hover:bg-red-500 hover:text-white rounded-xl shadow-lg transition-all text-red-600"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-6 mb-10 pr-28 pl-4">
        <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center shrink-0 transition-transform group-hover:rotate-3 shadow-lg shadow-primary/5">
          <Briefcase className="w-8 h-8 text-primary" />
        </div>
        <div className="overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-2xl font-black text-foreground leading-tight truncate tracking-tighter">{carrier.name}</h3>
            <div className={`px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${tierColors[tier]}`}>
              <TierIcon className="w-3 h-3" />
              {tier}
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted opacity-40">System ID: {carrier.id.slice(0, 8)}</p>
        </div>
      </div>

      <div className="space-y-6 mt-2 flex-1 pl-4">
        {carrier.contactEmail && (
          <div className="flex items-center text-sm text-foreground font-bold group/item">
            <div className="p-2.5 rounded-xl bg-muted/5 mr-4 transition-colors group-hover/item:bg-primary/10">
              <Mail className="w-4.5 h-4.5 text-muted transition-colors group-hover/item:text-primary" />
            </div>
            <span className="truncate opacity-80 select-all">{carrier.contactEmail}</span>
          </div>
        )}
        {carrier.contactPhone && (
          <div className="flex items-center text-sm text-foreground font-bold group/item">
            <div className="p-2.5 rounded-xl bg-muted/5 mr-4 transition-colors group-hover/item:bg-primary/10">
              <Phone className="w-4.5 h-4.5 text-muted transition-colors group-hover/item:text-primary" />
            </div>
            <span className="opacity-80 select-all">{carrier.contactPhone}</span>
          </div>
        )}
        {!carrier.contactEmail && !carrier.contactPhone && (
          <div className="text-[10px] text-muted/30 italic px-1 font-black uppercase tracking-[0.2em]">{t('car.noContact')}</div>
        )}

        <div className="mt-8 pt-8 border-t border-border/50 grid grid-cols-2 gap-4">
          <div className="bg-muted/5 p-4 rounded-2xl border border-border/30">
            <div className="flex items-center gap-2 text-muted mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="text-[8px] font-black uppercase tracking-widest opacity-60">System Score</span>
            </div>
            <div className="text-lg font-black text-foreground tracking-tighter">{perf.systemScore || 0}%</div>
          </div>
          <div className="bg-muted/5 p-4 rounded-2xl border border-border/30">
            <div className="flex items-center gap-2 text-muted mb-1">
              <Target className="w-3.5 h-3.5" />
              <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Manual Score</span>
            </div>
            <div className="text-lg font-black text-foreground tracking-tighter">{perf.manualScore || 'N/A'}%</div>
          </div>
        </div>

        {(perf.bookingAdvanceHours !== undefined || carrier.bufferTimeMinutes !== undefined) && (
          <div className="mt-4 space-y-4">
            {perf.bookingAdvanceHours !== undefined && (
              <div className="flex items-center justify-between bg-primary/5 p-4 rounded-2xl border border-primary/20">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-[10px] text-primary font-black uppercase tracking-widest">Priority Booking</span>
                </div>
                <span className="text-sm font-black text-primary tracking-tight">+{perf.bookingAdvanceHours}h</span>
              </div>
            )}
            {carrier.bufferTimeMinutes !== undefined && (
              <div className="flex items-center justify-between bg-muted/5 p-4 rounded-2xl border border-border/30">
                <span className="text-[10px] text-muted font-black uppercase tracking-widest opacity-60">Ops Buffer</span>
                <span className="text-sm font-black text-foreground tracking-tight">{carrier.bufferTimeMinutes}m</span>
              </div>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
});
