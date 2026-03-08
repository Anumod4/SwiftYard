
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Resource, UnavailabilityPeriod } from '../types';
import { Plus, Edit2, Trash2, Warehouse, Container, Clock, AlertTriangle, X, RefreshCcw, Settings2, ShieldCheck, ShieldAlert, Check, Briefcase, Truck, ListPlus, ArrowRightFromLine, ArrowLeftToLine, ArrowRightLeft, Users, Search, ChevronDown } from 'lucide-react';
import { ModalPortal } from '../components/ui/ModalPortal';
import { Pagination } from '../components/ui/Pagination';
import { BulkCreatorModal, BulkColumn } from '../components/BulkCreatorModal';
import { DeleteConfirmationModal } from '../components/ui/DeleteConfirmationModal';
import { VIEW_IDS } from '../constants';

export const Resources: React.FC = () => {
  const { docks, yardSlots, addResource, updateResource, deleteResource, forceClearResource, trailerTypes, carriers, t, addToast, canEdit } = useData();
  const [activeTab, setActiveTab] = useState<'Dock' | 'YardSlot'>('Dock');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [resourceToProcess, setResourceToProcess] = useState<string | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  // Bulk Create State
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [status, setStatus] = useState<any>('Available');
  const [operationMode, setOperationMode] = useState<'Inbound' | 'Outbound' | 'Both'>('Both');
  const [capacity, setCapacity] = useState<number>(1);
  const [allowedTrailerTypes, setAllowedTrailerTypes] = useState<string[]>([]);
  const [allowedCarrierIds, setAllowedCarrierIds] = useState<string[]>([]);
  const [unavailability, setUnavailability] = useState<UnavailabilityPeriod[]>([]);

  // Filtering & Sorting State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'capacity'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const canEditResources = canEdit(VIEW_IDS.RESOURCES);

  const handleOpenModal = (res?: Resource) => {
    if (res) {
      setEditingResource(res);
      setName(res.name);
      setStatus(res.status);
      setOperationMode(res.operationMode || 'Both');
      setCapacity(res.capacity || 1);
      setAllowedTrailerTypes(res.allowedTrailerTypes || []);
      setAllowedCarrierIds(res.allowedCarrierIds || []);
      setUnavailability(res.unavailability || []);
    } else {
      setEditingResource(null);
      setName('');
      setStatus('Available');
      setOperationMode('Both');
      setCapacity(1);
      setAllowedTrailerTypes([]);
      setAllowedCarrierIds([]);
      setUnavailability([]);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditResources) return;

    // Construct base payload
    const payload: any = {
      name,
      type: activeTab,
      status,
      operationMode,
      capacity: activeTab === 'YardSlot' ? capacity : 1, // Force 1 for Docks
      allowedTrailerTypes,
      allowedCarrierIds,
      unavailability: unavailability
    };

    if (editingResource) {
      payload.id = editingResource.id;
      if (editingResource.currentAppId) payload.currentAppId = editingResource.currentAppId;
      if (editingResource.currentTrailerId) payload.currentTrailerId = editingResource.currentTrailerId;
    }

    try {
      if (editingResource) {
        await updateResource(payload);
      } else {
        await addResource(payload);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to save resource:", error);
    }
  };

  const handleBulkSave = async (data: any[]) => {
    // Loop through data and create resources
    // Note: We need unique IDs. Date.now() might conflict in a loop, so we add an index suffix.
    const promises = data.map((item) => {
      const payload: Partial<Resource> = {
        name: item.name,
        type: activeTab,
        status: item.status || 'Available',
        operationMode: 'Both', // Default for bulk
        capacity: activeTab === 'YardSlot' ? (Number(item.capacity) || 1) : 1,
        allowedTrailerTypes: [], // Default to all
        allowedCarrierIds: []
      };
      return addResource(payload);
    });

    await Promise.all(promises);
    addToast('Bulk Create', `Successfully created ${data.length} ${activeTab}s.`, 'success');
  };

  const toggleTrailerType = (type: string) => {
    if (!canEditResources) return;
    setAllowedTrailerTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleCarrier = (id: string) => {
    if (!canEditResources) return;
    setAllowedCarrierIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleForceClearClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResourceToProcess(id);
    setIsClearModalOpen(true);
  };

  const handleConfirmClear = () => {
    if (resourceToProcess) {
      forceClearResource(resourceToProcess);
      setResourceToProcess(null);
    }
  };

  const handleManagementToggle = () => {
    setIsManageMode(!isManageMode);
  };

  const handleDeleteClick = (e: React.MouseEvent, item: Resource) => {
    e.preventDefault();
    e.stopPropagation();

    if (item.status !== 'Available') {
      addToast('Cannot Delete', `Resource is currently ${item.status}. Clear it first.`, 'error');
      return;
    }

    setResourceToProcess(item.id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (resourceToProcess) {
      try {
        await deleteResource(resourceToProcess);
        addToast("Resource deleted successfully", "success");
      } catch (error: any) {
        addToast(error.message || "Failed to delete resource", "error");
      }
      setResourceToProcess(null);
    }
  };

  const currentList = activeTab === 'Dock' ? docks : yardSlots;

  const filteredResources = React.useMemo(() => {
    return currentList
      .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        let modifier = sortOrder === 'asc' ? 1 : -1;
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) * modifier;
        } else if (sortBy === 'status') {
          return a.status.localeCompare(b.status) * modifier;
        } else if (sortBy === 'capacity') {
          const capA = a.capacity || 1;
          const capB = b.capacity || 1;
          return (capA - capB) * modifier;
        }
        return 0;
      });
  }, [currentList, searchTerm, sortBy, sortOrder]);

  const paginatedResources = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredResources.slice(start, start + pageSize);
  }, [filteredResources, currentPage, pageSize]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, sortBy, sortOrder]);

  const bulkColumns: BulkColumn[] = [
    { key: 'name', label: 'Name / Number', type: 'text', required: true, placeholder: 'e.g. Row 05' },
    {
      key: 'status', label: 'Initial Status', type: 'select', required: true, defaultValue: 'Available',
      options: [
        { value: 'Available', label: 'Available' },
        { value: 'Unavailable', label: 'Unavailable (Maintenance)' }
      ]
    }
  ];

  if (activeTab === 'YardSlot') {
    bulkColumns.push({ key: 'capacity', label: 'Capacity', type: 'number', defaultValue: 1 });
  }

  return (
    <div className="p-8 h-full flex flex-col animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tighter">{t('res.title')}</h1>
          <p className="text-muted text-lg opacity-70 font-medium">{t('res.subtitle')}</p>
        </div>
        <div className="flex gap-4 items-end">
          {canEditResources && (
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleManagementToggle}
                className={`px-6 py-4 rounded-[1.25rem] flex items-center gap-3 font-black uppercase tracking-widest text-[10px] transition-all border-2 ${isManageMode
                  ? 'bg-red-500 border-red-500 text-white shadow-xl shadow-red-500/30'
                  : 'bg-surface border-border text-muted hover:bg-muted/5'
                  }`}
              >
                {isManageMode ? <ShieldAlert className="w-5 h-5 animate-pulse" /> : <ShieldCheck className="w-5 h-5 text-primary" />}
                {isManageMode ? t('res.modeExit') : t('res.modeEnter')}
              </button>

              <button
                type="button"
                onClick={() => setIsBulkOpen(true)}
                className="bg-surface border border-border hover:bg-muted/5 text-foreground px-6 py-4 rounded-[1.25rem] flex items-center shadow-lg transition-all active:scale-95 font-bold"
                title="Bulk Create"
              >
                <ListPlus className="w-5 h-5 mr-1 text-primary" />
              </button>

              <button
                type="button"
                onClick={() => handleOpenModal()}
                className="bg-primary hover:bg-blue-600 text-white px-8 py-4 rounded-[1.25rem] flex items-center shadow-xl shadow-primary/20 transition-all active:scale-95 font-black uppercase tracking-widest text-xs whitespace-nowrap"
              >
                <Plus className="w-5 h-5 mr-2" />
                {activeTab === 'Dock' ? t('res.addDock') : t('res.addSlot')}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex bg-muted/5 p-1.5 rounded-[1.5rem] mb-10 max-w-2xl">
        <button
          onClick={() => { setActiveTab('Dock'); }}
          className={`flex-1 py-4 rounded-[1.125rem] flex items-center justify-center gap-3 transition-all ${activeTab === 'Dock' ? 'bg-surface text-primary shadow-xl ring-1 ring-border' : 'text-muted hover:text-foreground'}`}
        >
          <Warehouse className={`w-6 h-6 ${activeTab === 'Dock' ? 'text-primary' : 'text-muted/40'}`} />
          <span className="font-black text-lg tracking-tighter uppercase">{t('res.docks')}</span>
        </button>
        <button
          onClick={() => { setActiveTab('YardSlot'); }}
          className={`flex-1 py-4 rounded-[1.125rem] flex items-center justify-center gap-3 transition-all ${activeTab === 'YardSlot' ? 'bg-surface text-emerald-500 shadow-xl ring-1 ring-border' : 'text-muted hover:text-foreground'}`}
        >
          <Container className={`w-6 h-6 ${activeTab === 'YardSlot' ? 'text-emerald-500' : 'text-muted/40'}`} />
          <span className="font-black text-lg tracking-tighter uppercase">{t('res.slots')}</span>
        </button>
      </div>

      <GlassCard className="mb-8 p-6 !overflow-visible z-50 rounded-[2.5rem] border-none shadow-xl">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted transition-colors group-focus-within:text-primary" />
            <input
              type="text"
              placeholder="Search by resource name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-muted/5 border border-border rounded-[1.25rem] pl-14 pr-6 py-4 text-sm text-foreground focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-muted/5 border border-border rounded-[1.25rem] px-6 py-4 text-sm text-foreground focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none cursor-pointer font-bold transition-all appearance-none pr-12"
              >
                <option value="name">Sort by Name</option>
                <option value="status">Sort by Status</option>
                {activeTab === 'YardSlot' && <option value="capacity">Sort by Capacity</option>}
              </select>
              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            </div>

            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-4 bg-muted/5 hover:bg-muted/10 border border-border rounded-[1.25rem] text-muted transition-all active:scale-90"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              <ArrowRightFromLine className={`w-5 h-5 transition-transform duration-300 ${sortOrder === 'desc' ? 'rotate-90 text-primary' : '-rotate-90 text-primary'}`} />
            </button>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
        {paginatedResources.map(item => (
          <div key={item.id} className="relative h-full">
            {isManageMode && (
              <div className="absolute -top-3 -right-3 z-[110] flex flex-col gap-3">
                {item.status === 'Occupied' ? (
                  <button
                    type="button"
                    onClick={(e) => handleForceClearClick(e, item.id)}
                    className="w-14 h-14 rounded-full bg-orange-500 text-white flex flex-col items-center justify-center shadow-2xl border-4 border-white dark:border-[#121212] hover:scale-110 active:scale-95 transition-all text-[8px] font-black uppercase"
                  >
                    <RefreshCcw className="w-6 h-6 mb-0.5" />
                    {t('res.reset')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteClick(e, item)}
                    className="w-14 h-14 rounded-full bg-red-600 text-white flex flex-col items-center justify-center shadow-2xl border-4 border-white dark:border-[#121212] hover:scale-110 active:scale-95 transition-all"
                  >
                    <Trash2 className="w-7 h-7" />
                    <span className="text-[7px] font-black uppercase tracking-tighter">{t('common.delete')}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenModal(item); }}
                  className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-2xl border-4 border-white dark:border-[#121212] hover:scale-110 active:scale-95 transition-all ml-auto"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}

            <GlassCard
              onClick={() => !isManageMode && handleOpenModal(item)}
              className={`flex flex-col h-full overflow-hidden p-0 transition-all duration-500 rounded-[2.5rem] border-none shadow-xl ${isManageMode ? 'ring-4 ring-red-500/10 scale-95 opacity-80 cursor-default grayscale-[0.2]' : 'hover:scale-[1.03] hover:shadow-2xl cursor-pointer border-l-4 border-l-transparent hover:border-l-primary'
                }`}
            >
              <div className="p-8 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${item.type === 'Dock' ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                      {item.type === 'Dock' ? <Warehouse className="w-7 h-7" /> : <Container className="w-7 h-7" />}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-foreground tracking-tighter leading-tight">{item.name}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted opacity-60">Location Unit</p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 text-[10px] rounded-2xl border-2 font-black uppercase tracking-[0.2em] shadow-sm ${item.status === 'Available' ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                    item.status === 'Unavailable' ? 'bg-orange-500/5 border-orange-500/10 text-orange-600 dark:text-orange-400' :
                      'bg-primary/5 border-primary/10 text-primary'
                    }`}>
                    {item.status}
                  </div>
                </div>

                <div className="space-y-6 flex-1">

                  {/* Operation Mode */}
                  {item.type === 'Dock' && (
                    <div className="p-4 rounded-2xl bg-muted/5 border border-border/50">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3">Operation Mode</p>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-surface shadow-sm">
                          {(!item.operationMode || item.operationMode === 'Both') && <ArrowRightLeft className="w-4 h-4 text-purple-500" />}
                          {item.operationMode === 'Inbound' && <ArrowRightFromLine className="w-4 h-4 text-emerald-500" />}
                          {item.operationMode === 'Outbound' && <ArrowLeftToLine className="w-4 h-4 text-blue-500" />}
                        </div>
                        <span className="text-sm font-black text-foreground tracking-tight">{item.operationMode || 'Both (In & Out)'}</span>
                      </div>
                    </div>
                  )}

                  {/* Yard Capacity */}
                  {item.type === 'YardSlot' && (
                    <div className="p-4 rounded-2xl bg-muted/5 border border-border/50">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3">Capacity</p>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-surface shadow-sm text-emerald-500">
                          <Users className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-black text-foreground tracking-tight">Max {item.capacity || 1} Trailers</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-4 px-1">{t('res.capabilities')}</p>
                    <div className="flex flex-wrap gap-2">
                      {(item.allowedTrailerTypes || []).map(t => (
                        <span key={t} className="text-[11px] px-4 py-2 bg-muted/5 text-foreground rounded-xl border border-border/50 font-black shadow-sm">{t}</span>
                      ))}
                      {(!item.allowedTrailerTypes || item.allowedTrailerTypes.length === 0) && <span className="text-[10px] text-muted/30 italic px-1 font-black uppercase tracking-widest">{t('res.universal')}</span>}
                    </div>
                  </div>

                  {item.allowedCarrierIds && item.allowedCarrierIds.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-4 px-1">Restricted To</p>
                      <div className="flex flex-wrap gap-2">
                        {carriers.filter(c => item.allowedCarrierIds?.includes(c.id)).map(c => {
                          return (
                            <span key={c.id} className="text-[10px] px-4 py-2 bg-primary/5 text-primary rounded-xl border border-primary/10 font-black shadow-sm">
                              {c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {!isManageMode && canEditResources && (
                <div className="bg-muted/5 py-4 px-8 border-t border-border/50 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted group-hover:text-primary transition-colors">
                  <span>Configure {activeTab}</span>
                  <Edit2 className="w-4 h-4" />
                </div>
              )}
            </GlassCard>
          </div>
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(filteredResources.length / pageSize)}
        onPageChange={setCurrentPage}
        totalRecords={filteredResources.length}
        pageSize={pageSize}
      />

      {isModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-surface w-full max-w-5xl rounded-[3rem] border border-border p-12 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col shadow-2xl relative">
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-primary/10 rounded-[2.5rem] flex items-center justify-center">
                    <Settings2 className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black text-foreground tracking-tighter">{canEditResources ? (editingResource ? t('res.modalEdit') : t('res.modalNew')) : 'View'} {activeTab}</h2>
                    <p className="text-lg text-muted font-medium opacity-60">{t('res.modalSubtitle')}</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-14 h-14 hover:bg-muted/10 rounded-2xl flex items-center justify-center transition-all group"><X className="w-8 h-8 text-muted group-hover:text-foreground" /></button>
              </div>

              <form onSubmit={handleSave} className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="col-span-1 md:col-span-3">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-3 px-1">{t('res.identifier')} *</label>
                    <input disabled={!canEditResources} required value={name} onChange={e => setName(e.target.value)} className={`w-full bg-muted/5 border border-border focus:ring-4 focus:ring-primary/10 focus:border-primary rounded-2xl p-6 text-2xl font-black tracking-tighter text-foreground focus:outline-none transition-all ${!canEditResources && 'opacity-60 cursor-not-allowed'}`} placeholder="e.g. Row A - Lane 1" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-3 px-1">{t('res.defaultStatus')} *</label>
                    <div className="relative group">
                      <select disabled={!canEditResources} value={status} onChange={e => setStatus(e.target.value)} className={`w-full bg-muted/5 border border-border focus:ring-4 focus:ring-primary/10 focus:border-primary rounded-2xl p-5 text-foreground focus:outline-none appearance-none font-bold pr-12 ${!canEditResources && 'opacity-60 cursor-not-allowed'}`}>
                        <option value="Available">{t('res.statusAvail')}</option>
                        <option value="Unavailable">{t('res.statusUnavail')}</option>
                      </select>
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none" />
                    </div>
                  </div>

                  {activeTab === 'YardSlot' && (
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-3 px-1">Capacity</label>
                      <div className="relative">
                        <Users className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                        <input
                          disabled={!canEditResources}
                          type="number"
                          min="1"
                          value={capacity}
                          onChange={e => setCapacity(parseInt(e.target.value))}
                          className={`w-full bg-muted/5 border border-border focus:ring-4 focus:ring-primary/10 focus:border-primary rounded-2xl pl-14 pr-6 py-5 text-foreground focus:outline-none font-bold ${!canEditResources && 'opacity-60 cursor-not-allowed'}`}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'Dock' && (
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-3 px-1">Operation Mode</label>
                      <div className={`flex bg-muted/5 rounded-[1.25rem] p-1.5 border border-border ${!canEditResources && 'opacity-60 cursor-not-allowed pointer-events-none'}`}>
                        <button
                          type="button"
                          onClick={() => setOperationMode('Inbound')}
                          className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${operationMode === 'Inbound' ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'text-muted hover:text-foreground hover:bg-muted/5'}`}
                        >
                          <ArrowRightFromLine className="w-4 h-4" /> Inbound
                        </button>
                        <button
                          type="button"
                          onClick={() => setOperationMode('Outbound')}
                          className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${operationMode === 'Outbound' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-muted hover:text-foreground hover:bg-muted/5'}`}
                        >
                          <ArrowLeftToLine className="w-4 h-4" /> Outbound
                        </button>
                        <button
                          type="button"
                          onClick={() => setOperationMode('Both')}
                          className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${operationMode === 'Both' ? 'bg-purple-500 text-white shadow-xl shadow-purple-500/20' : 'text-muted hover:text-foreground hover:bg-muted/5'}`}
                        >
                          <ArrowRightLeft className="w-4 h-4" /> Both
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-5 px-1">{t('res.equipTypes')}</label>
                    <div className={`flex flex-wrap gap-3 ${!canEditResources && 'opacity-60 pointer-events-none'}`}>
                      {trailerTypes.map(def => {
                        const type = def.name;
                        const isSelected = allowedTrailerTypes.includes(type);

                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => toggleTrailerType(type)}
                            className={`px-5 py-3 rounded-2xl border font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2
                                      ${isSelected
                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
                                : 'bg-muted/5 border-border text-foreground hover:bg-muted/10'
                              }`}
                          >
                            {isSelected ? <Check className="w-4 h-4" /> : <Truck className="w-4 h-4 opacity-30" />}
                            {type}
                          </button>
                        );
                      })}
                      {trailerTypes.length === 0 && <span className="text-xs text-muted/30 italic">No equipment types defined.</span>}
                    </div>
                    <p className="text-[10px] text-muted opacity-40 mt-4 italic font-medium px-1">
                      * Empty selection allows all equipment.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-5 px-1">Allowed Carriers</label>
                    <div className={`flex flex-wrap gap-3 max-h-64 overflow-y-auto custom-scrollbar p-1 ${!canEditResources && 'opacity-60 pointer-events-none'}`}>
                      {carriers.map(c => {
                        const isSelected = allowedCarrierIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleCarrier(c.id)}
                            className={`px-5 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2
                                            ${isSelected
                                ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-500/30'
                                : 'bg-muted/5 border-border text-foreground hover:bg-muted/10'
                              }`}
                          >
                            {isSelected ? <Check className="w-4 h-4" /> : <Briefcase className="w-4 h-4 opacity-30" />}
                            {c.name}
                          </button>
                        );
                      })}
                      {carriers.length === 0 && <span className="text-xs text-muted/30 italic px-1">No carriers defined.</span>}
                    </div>
                    <p className="text-[10px] text-muted opacity-40 mt-4 italic font-medium px-1">
                      * Empty selection allows all organizations.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-6 pt-10 border-t border-border/50">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-5 text-xs font-black uppercase tracking-widest text-muted hover:text-foreground transition-colors">{canEditResources ? t('common.dismiss') : 'Close'}</button>
                  {canEditResources && (
                    <button type="submit" className="px-16 py-5 bg-primary hover:bg-blue-600 rounded-3xl font-black uppercase tracking-widest text-xs text-white shadow-2xl shadow-primary/30 transition-all active:scale-95">
                      {editingResource ? 'Update Location' : 'Deploy Location'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      <BulkCreatorModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        title={`Bulk Create ${activeTab}s`}
        subtitle="Add multiple resources at once."
        columns={bulkColumns}
        onSubmit={handleBulkSave}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={`Delete ${activeTab}`}
        message={`Are you sure you want to delete this ${activeTab.toLowerCase()}? This will permanently remove it from the yard map.`}
      />

      <DeleteConfirmationModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleConfirmClear}
        title="Force Clear Resource"
        message="CRITICAL ACTION: This will force the resource status back to 'Available', potentially disconnecting it from an active appointment. Proceed?"
      />
    </div>
  );
};
