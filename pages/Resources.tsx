
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Resource, UnavailabilityPeriod } from '../types';
import { Plus, Edit2, Trash2, Warehouse, Container, Clock, AlertTriangle, X, RefreshCcw, Settings2, ShieldCheck, ShieldAlert, Check, Briefcase, Truck, ListPlus, ArrowRightFromLine, ArrowLeftToLine, ArrowRightLeft, Users } from 'lucide-react';
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
    <div className="p-8 h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('res.title')}</h1>
          <p className="text-slate-500 dark:text-gray-400">{t('res.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {canEditResources && (
            <>
              <button
                type="button"
                onClick={handleManagementToggle}
                className={`px-5 py-3 rounded-xl flex items-center gap-3 font-black uppercase tracking-tighter transition-all border-2 ${isManageMode
                  ? 'bg-red-600 border-red-700 text-white shadow-xl shadow-red-500/40 scale-105'
                  : 'bg-slate-200 dark:bg-white/10 border-slate-300 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-white/20'
                  }`}
              >
                {isManageMode ? <ShieldAlert className="w-5 h-5 animate-pulse" /> : <ShieldCheck className="w-5 h-5" />}
                {isManageMode ? t('res.modeExit') : t('res.modeEnter')}
              </button>

              <button
                type="button"
                onClick={() => setIsBulkOpen(true)}
                className="bg-slate-800 dark:bg-white/20 hover:bg-slate-700 dark:hover:bg-white/30 text-white px-4 py-3 rounded-xl flex items-center shadow-lg transition-all active:scale-95 font-bold"
                title="Bulk Create"
              >
                <ListPlus className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => handleOpenModal()}
                className="bg-[#0a84ff] hover:bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center shadow-lg shadow-blue-500/30 transition-all active:scale-95 font-bold"
              >
                <Plus className="w-5 h-5 mr-2" />
                {activeTab === 'Dock' ? t('res.addDock') : t('res.addSlot')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-4 mb-10">
        <button
          onClick={() => { setActiveTab('Dock'); }}
          className={`flex-1 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all border-2 ${activeTab === 'Dock' ? 'bg-white dark:bg-white/10 border-blue-500 shadow-xl' : 'bg-transparent border-transparent text-slate-500 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}
        >
          <Warehouse className={`w-6 h-6 ${activeTab === 'Dock' ? 'text-blue-500' : ''}`} />
          <span className="font-black text-lg uppercase tracking-tight">{t('res.docks')}</span>
        </button>
        <button
          onClick={() => { setActiveTab('YardSlot'); }}
          className={`flex-1 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all border-2 ${activeTab === 'YardSlot' ? 'bg-white dark:bg-white/10 border-emerald-500 shadow-xl' : 'bg-transparent border-transparent text-slate-500 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}
        >
          <Container className={`w-6 h-6 ${activeTab === 'YardSlot' ? 'text-emerald-500' : ''}`} />
          <span className="font-black text-lg uppercase tracking-tight">{t('res.slots')}</span>
        </button>
      </div>

      <GlassCard className="mb-6 p-4 !overflow-visible z-50">
        <div className="flex flex-col md:flex-row gap-4 mb-2">
          {/* General Search */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search resources by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg pl-4 pr-10 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 outline-none"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest hidden md:inline-block">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 outline-none cursor-pointer"
            >
              <option value="name">Name</option>
              <option value="status">Status</option>
              {activeTab === 'YardSlot' && <option value="capacity">Capacity</option>}
            </select>

            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-2.5 bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              <ArrowRightFromLine className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-90' : '-rotate-90'}`} />
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
              className={`flex flex-col h-full overflow-hidden p-0 transition-all duration-300 ${isManageMode ? 'ring-4 ring-red-500/10 scale-95 opacity-80 cursor-default grayscale-[0.2]' : 'hover:scale-[1.02] cursor-pointer'
                }`}
            >
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${item.type === 'Dock' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                      {item.type === 'Dock' ? <Warehouse className="w-6 h-6" /> : <Container className="w-6 h-6" />}
                    </div>
                    {item.name}
                  </h3>
                  <div className={`px-3 py-1.5 text-[10px] rounded-full border-2 font-black uppercase tracking-widest ${item.status === 'Available' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-500' :
                    item.status === 'Unavailable' ? 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-500' :
                      'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
                    }`}>
                    {item.status}
                  </div>
                </div>

                <div className="space-y-6 flex-1">

                  {/* Operation Mode */}
                  {item.type === 'Dock' && (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-gray-500 font-black mb-2">Operation Mode</p>
                      <div className="flex items-center gap-2">
                        {(!item.operationMode || item.operationMode === 'Both') && <ArrowRightLeft className="w-4 h-4 text-purple-500" />}
                        {item.operationMode === 'Inbound' && <ArrowRightFromLine className="w-4 h-4 text-emerald-500" />}
                        {item.operationMode === 'Outbound' && <ArrowLeftToLine className="w-4 h-4 text-blue-500" />}
                        <span className="text-sm font-bold text-slate-700 dark:text-gray-300">{item.operationMode || 'Both (In & Out)'}</span>
                      </div>
                    </div>
                  )}

                  {/* Yard Capacity */}
                  {item.type === 'YardSlot' && (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-gray-500 font-black mb-2">Capacity</p>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-bold text-slate-700 dark:text-gray-300">Max {item.capacity || 1} Trailers</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-gray-500 font-black mb-3">{t('res.capabilities')}</p>
                    <div className="flex flex-wrap gap-2">
                      {(item.allowedTrailerTypes || []).map(t => (
                        <span key={t} className="text-[11px] px-3 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-white/10 font-black">{t}</span>
                      ))}
                      {(!item.allowedTrailerTypes || item.allowedTrailerTypes.length === 0) && <span className="text-xs text-slate-400 dark:text-gray-600 italic font-medium">{t('res.universal')}</span>}
                    </div>
                  </div>

                  {item.allowedCarrierIds && item.allowedCarrierIds.length > 0 && (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-gray-500 font-black mb-3">Allowed Carriers</p>
                      <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto custom-scrollbar p-1">
                        {carriers.length === 0 && <span className="text-sm text-slate-500 italic">No carriers defined.</span>}
                        {carriers.map(c => {
                          const isSelected = allowedCarrierIds.includes(c.id);
                          return (
                            <span key={c.id} className="text-[10px] px-3 py-1.5 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-xl border border-purple-200 dark:border-purple-500/20 font-black">
                              {c.name.substring(0, 10)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {!isManageMode && canEditResources && (
                <div className="bg-slate-50 dark:bg-white/5 py-3 px-6 border-t border-slate-200 dark:border-white/5 flex items-center justify-center text-[11px] font-bold text-slate-400 dark:text-gray-500 group transition-colors">
                  <div className="flex items-center gap-2 group-hover:text-blue-500">
                    <Edit2 className="w-3.5 h-3.5" /> {t('res.configure')}
                  </div>
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
            <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-4xl rounded-[2.5rem] border-2 border-slate-200 dark:border-white/10 p-10 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col shadow-2xl relative">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-blue-500/10 rounded-3xl">
                    <Settings2 className="w-8 h-8 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{canEditResources ? (editingResource ? t('res.modalEdit') : t('res.modalNew')) : 'View'} {activeTab}</h2>
                    <p className="text-sm text-slate-500 dark:text-gray-400 font-medium">{t('res.modalSubtitle')}</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-7 h-7 text-slate-500 dark:text-gray-400" /></button>
              </div>

              <form onSubmit={handleSave} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="col-span-1 md:col-span-3">
                    <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400 mb-3">{t('res.identifier')} *</label>
                    <input disabled={!canEditResources} required value={name} onChange={e => setName(e.target.value)} className={`w-full bg-slate-100 dark:bg-black/40 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 text-xl font-bold text-slate-900 dark:text-white focus:outline-none transition-all ${!canEditResources && 'opacity-60 cursor-not-allowed'}`} placeholder="e.g. Row A - Lane 1" />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400 mb-3">{t('res.defaultStatus')} *</label>
                    <select disabled={!canEditResources} value={status} onChange={e => setStatus(e.target.value)} className={`w-full bg-slate-100 dark:bg-black/40 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 text-slate-900 dark:text-white focus:outline-none appearance-none font-bold ${!canEditResources && 'opacity-60 cursor-not-allowed'}`}>
                      <option value="Available">{t('res.statusAvail')}</option>
                      <option value="Unavailable">{t('res.statusUnavail')}</option>
                    </select>
                  </div>

                  {activeTab === 'YardSlot' && (
                    <div>
                      <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400 mb-3">Capacity</label>
                      <div className="relative">
                        <Users className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                        <input
                          disabled={!canEditResources}
                          type="number"
                          min="1"
                          value={capacity}
                          onChange={e => setCapacity(parseInt(e.target.value))}
                          className={`w-full bg-slate-100 dark:bg-black/40 border-2 border-transparent focus:border-blue-500 rounded-2xl pl-12 pr-4 py-4 text-slate-900 dark:text-white focus:outline-none font-bold ${!canEditResources && 'opacity-60 cursor-not-allowed'}`}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'Dock' && (
                    <div className="col-span-2">
                      <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400 mb-3">Operation Mode</label>
                      <div className={`flex bg-slate-100 dark:bg-black/40 rounded-2xl p-1 ${!canEditResources && 'opacity-60 cursor-not-allowed pointer-events-none'}`}>
                        <button
                          type="button"
                          onClick={() => setOperationMode('Inbound')}
                          className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${operationMode === 'Inbound' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                          <ArrowRightFromLine className="w-4 h-4" /> Inbound
                        </button>
                        <button
                          type="button"
                          onClick={() => setOperationMode('Outbound')}
                          className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${operationMode === 'Outbound' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                          <ArrowLeftToLine className="w-4 h-4" /> Outbound
                        </button>
                        <button
                          type="button"
                          onClick={() => setOperationMode('Both')}
                          className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${operationMode === 'Both' ? 'bg-purple-500 text-white shadow-md' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                          <ArrowRightLeft className="w-4 h-4" /> Both
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400 mb-4">{t('res.equipTypes')}</label>
                    <div className={`flex flex-wrap gap-2 ${!canEditResources && 'opacity-60 pointer-events-none'}`}>
                      {trailerTypes.map(def => {
                        const type = def.name;
                        const isSelected = allowedTrailerTypes.includes(type);

                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => toggleTrailerType(type)}
                            className={`px-4 py-3 rounded-xl border font-bold transition-all text-sm flex items-center gap-2
                                      ${isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                                : 'bg-slate-100 dark:bg-white/5 border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                              }`}
                          >
                            {isSelected && <Check className="w-4 h-4" />}
                            {type}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 italic">
                      * Leaving all unselected implies universal access (any type).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400 mb-4">Allowed Carriers</label>
                    <div className={`flex flex-wrap gap-2 max-h-64 overflow-y-auto custom-scrollbar p-1 ${!canEditResources && 'opacity-60 pointer-events-none'}`}>
                      {carriers.length === 0 && <span className="text-sm text-slate-500 italic">No carriers defined.</span>}
                      {carriers.map(c => {
                        const isSelected = allowedCarrierIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleCarrier(c.id)}
                            className={`px-3 py-2 rounded-xl border text-sm font-bold transition-all flex items-center gap-2
                                            ${isSelected
                                ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                                : 'bg-slate-100 dark:bg-white/5 border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                              }`}
                          >
                            {isSelected && <Briefcase className="w-3 h-3" />}
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 italic">
                      * Leaving all unselected implies universal access (any carrier).
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-5 pt-8 border-t border-slate-200 dark:border-white/10">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-sm font-bold text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors">{canEditResources ? t('common.dismiss') : 'Close'}</button>
                  {canEditResources && (
                    <button type="submit" className="px-10 py-4 bg-[#0a84ff] hover:bg-blue-600 rounded-2xl font-black text-white shadow-xl shadow-blue-500/30 transition-all active:scale-95">
                      {editingResource ? t('res.apply') : t('res.deploy')}
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
