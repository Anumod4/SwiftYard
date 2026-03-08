
import React, { useState, useMemo } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Driver } from '../types';
import { Plus, Edit2, Trash2, User, CheckCircle2, XCircle, Briefcase, ListPlus, Search, Phone, ChevronDown, Filter } from 'lucide-react';
import { ModalPortal } from '../components/ui/ModalPortal';
import { Pagination } from '../components/ui/Pagination';
import { BulkCreatorModal, BulkColumn } from '../components/BulkCreatorModal';
import { DeleteConfirmationModal } from '../components/ui/DeleteConfirmationModal';
import { VIEW_IDS } from '../constants';

export const Drivers: React.FC = () => {
  const { drivers, addDriver, updateDriver, deleteDriver, trailers, carriers, t, addToast, canEdit } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<string | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [showFilters, setShowFilters] = useState(false);
  const [carrierFilterIds, setCarrierFilterIds] = useState<string[]>([]);

  const clearFilters = () => {
    setSearchTerm('');
    setCarrierFilterIds([]);
  };

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <span className="opacity-0 group-hover:opacity-30 ml-1 text-[10px]">&uarr;&darr;</span>;
    return <span className="ml-1 font-black text-primary">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  // Form
  const [name, setName] = useState('');
  const [license, setLicense] = useState('');
  const [phone, setPhone] = useState('');
  const [carrierId, setCarrierId] = useState('');

  const [isBulkOpen, setIsBulkOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const canEditDrivers = canEdit(VIEW_IDS.DRIVERS);

  // Helper to get carrier name from driver.carrierId (handles both ID and name)
  const getCarrierDisplayName = (cId: string | undefined) => {
    if (!cId) return '-';
    // Try exact match on ID
    let c = carriers.find(car => car.id === cId);
    // Try case-insensitive match on ID
    if (!c) c = carriers.find(car => car.id.toLowerCase() === cId.toLowerCase());
    // Try matching by name (carrierId now stores carrier name)
    if (!c) c = carriers.find(car => car.name.toLowerCase() === cId.toLowerCase());
    return c ? c.name : cId;
  };

  const handleOpenModal = (d?: Driver) => {
    if (d) {
      setEditingDriver(d);
      setName(d.name);
      setLicense(d.licenseNumber);
      setPhone(d.phone);
      setCarrierId(d.carrierId || '');
    } else {
      setEditingDriver(null);
      setName('');
      setLicense('');
      setPhone('');
      setCarrierId('');
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      licenseNumber: license,
      phone,
      carrierId: carrierId || undefined
    };

    if (editingDriver) {
      updateDriver({ ...editingDriver, ...payload });
    } else {
      addDriver(payload);
    }
    setIsModalOpen(false);
  };

  const handleDeleteClick = (id: string) => {
    setDriverToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (driverToDelete) {
      try {
        await deleteDriver(driverToDelete);
        addToast("Driver deleted successfully", "success");
      } catch (err: any) {
        addToast(err.message || "Failed to delete driver", "error");
      }
      setDriverToDelete(null);
    }
  };

  const handleBulkSave = async (data: any[]) => {
    // Use Promise.all for parallel creation now that IDs are safe
    const promises = data.map(item => addDriver({
      name: item.name,
      licenseNumber: item.licenseNumber,
      phone: item.phone,
      carrierId: item.carrierId || undefined
    }));

    await Promise.all(promises);
    addToast('Bulk Create', `Created ${data.length} drivers.`, 'success');
  };


  const filteredDrivers = useMemo(() => {
    let result = drivers;

    if (debouncedSearchTerm.trim()) {
      const s = debouncedSearchTerm.toLowerCase();
      result = result.filter(d =>
        d.name.toLowerCase().includes(s) ||
        d.licenseNumber.toLowerCase().includes(s) ||
        d.carrierId?.toLowerCase().includes(s)
      );
    }

    if (carrierFilterIds.length > 0) {
      result = result.filter(d => {
        if (!d.carrierId) return false;
        return carrierFilterIds.some(cid => {
          const c = carriers.find(car => car.id === cid);
          return c && d.carrierId?.toLowerCase() === c.name.toLowerCase();
        });
      });
    }

    if (sortConfig) {
      result = [...result].sort((a, b) => {
        let valA: any = a[sortConfig.key as keyof Driver] || '';
        let valB: any = b[sortConfig.key as keyof Driver] || '';

        // Special handling for computed fields
        if (sortConfig.key === 'carrier') {
          valA = getCarrierDisplayName(a.carrierId).toLowerCase();
          valB = getCarrierDisplayName(b.carrierId).toLowerCase();
        } else if (sortConfig.key === 'status') {
          valA = a.status;
          valB = b.status;
        } else if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = (typeof valB === 'string' ? valB : String(valB)).toLowerCase();
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [drivers, debouncedSearchTerm, sortConfig]);

  const paginatedDrivers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDrivers.slice(start, start + pageSize);
  }, [filteredDrivers, currentPage, pageSize]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const bulkColumns: BulkColumn[] = [
    { key: 'name', label: 'Full Name', type: 'text', required: true },
    { key: 'licenseNumber', label: 'License #', type: 'text', required: true },
    { key: 'phone', label: 'Phone', type: 'text', required: true },
    {
      key: 'carrierId', label: 'Carrier', type: 'select',
      options: carriers.map(c => ({ value: c.name, label: c.name }))
    }
  ];

  return (
    <div className="p-8 h-full flex flex-col animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tighter">{t('drv.title')}</h1>
          <p className="text-muted text-lg opacity-70 font-medium">{t('drv.subtitle')}</p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-8 py-4 rounded-2xl flex items-center gap-3 font-black uppercase tracking-widest text-xs transition-all border-2 ${showFilters ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20' : 'bg-surface border-border text-muted hover:bg-muted/5'}`}
          >
            <Filter className="w-5 h-5" />
            {showFilters ? 'Hide Filters' : 'Advanced Filters'}
          </button>
          {canEditDrivers && (
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
                <Plus className="w-5 h-5 mr-1" />
                {t('drv.add')}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="flex-1">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">Carrier Network</label>
              <div className="relative group">
                <button
                  onClick={() => {
                    const dropdown = document.getElementById('carrier-dropdown');
                    if (dropdown) dropdown.classList.toggle('hidden');
                  }}
                  className="w-full flex items-center justify-between bg-muted/5 border border-border rounded-[1.25rem] px-5 py-4 text-sm text-foreground font-bold"
                >
                  <span className="truncate flex items-center gap-2">
                    {carrierFilterIds.length > 0 && <span className="w-5 h-5 flex items-center justify-center bg-primary text-white text-[10px] rounded-full">{carrierFilterIds.length}</span>}
                    {t('common.carrier')}
                  </span>
                  <ChevronDown className="w-4 h-4 ml-2" />
                </button>
                <div id="carrier-dropdown" className="hidden absolute top-full left-0 mt-3 w-72 max-h-80 overflow-y-auto custom-scrollbar bg-surface border border-border rounded-[2rem] shadow-2xl z-[100] p-6">
                  {carriers.map(c => (
                    <label key={c.id} className="flex items-center gap-3 p-3 hover:bg-muted/5 rounded-2xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={carrierFilterIds.includes(c.id)}
                        onChange={() => setCarrierFilterIds(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
                        className="w-5 h-5 rounded-lg border-border text-primary"
                      />
                      <span className="text-sm font-bold">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      <div className="relative mb-8 group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted w-6 h-6 transition-colors group-focus-within:text-primary" />
        <input
          type="text"
          placeholder="Quick search by name, license or carrier..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-surface border-2 border-border/50 rounded-[1.5rem] pl-16 pr-6 py-5 font-bold text-foreground outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-xl placeholder:text-muted/40"
        />
      </div>

      <GlassCard className="flex-1 overflow-hidden flex flex-col rounded-[2.5rem] border-none shadow-2xl">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredDrivers.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted">
              <User className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">{t('drv.empty') || 'No drivers found.'}</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 bg-surface/90 backdrop-blur-md z-10 text-[10px] uppercase text-muted font-black tracking-[0.2em] border-b border-border">
                <tr>
                  <th onClick={() => handleSort('name')} className="p-8 cursor-pointer group hover:bg-muted/5 transition-colors">
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3" />
                      {t('drv.fullName')} {getSortIcon('name')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('licenseNumber')} className="p-8 cursor-pointer group hover:bg-muted/5 transition-colors">
                    License {getSortIcon('licenseNumber')}
                  </th>
                  <th onClick={() => handleSort('phone')} className="p-8 cursor-pointer group hover:bg-muted/5 transition-colors">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      {t('common.phone')} {getSortIcon('phone')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('carrier')} className="p-8 cursor-pointer group hover:bg-muted/5 transition-colors">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3 h-3" />
                      {t('common.carrier')} {getSortIcon('carrier')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('status')} className="p-8 cursor-pointer group hover:bg-muted/5 transition-colors text-center">
                    Status {getSortIcon('status')}
                  </th>
                  <th className="p-8 text-right pr-12">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 bg-surface/30">
                {paginatedDrivers.map(driver => {
                  const isOnSite = driver.status === 'On Site';
                  const carrierName = getCarrierDisplayName(driver.carrierId);

                  return (
                    <tr
                      key={driver.id}
                      className="hover:bg-muted/5 transition-all group relative cursor-pointer border-l-4 border-l-transparent hover:border-l-primary"
                      onClick={() => handleOpenModal(driver)}
                    >
                      <td className="p-8">
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-[1.25rem] flex flex-shrink-0 items-center justify-center relative transition-all group-hover:scale-110 group-hover:rotate-3 shadow-lg ${isOnSite ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
                            <User className="w-6 h-6" />
                          </div>
                          <span className="font-black text-foreground text-lg tracking-tighter truncate max-w-[200px]" title={driver.name}>
                            {driver.name}
                          </span>
                        </div>
                      </td>
                      <td className="p-8 font-black uppercase tracking-widest text-xs text-muted/60">
                        {driver.licenseNumber}
                      </td>
                      <td className="p-8">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-muted/5 flex items-center justify-center">
                            <Phone className="w-4 h-4 text-muted/40" />
                          </div>
                          <span className="font-bold text-foreground text-base tracking-tight">{driver.phone}</span>
                        </div>
                      </td>
                      <td className="p-8">
                        <span className="text-sm font-black uppercase tracking-widest text-primary group-hover:tracking-[0.1em] transition-all duration-300 truncate max-w-[200px] inline-block" title={carrierName}>
                          {carrierName !== '-' ? carrierName : <span className="text-muted/30 italic font-normal tracking-normal lowercase">No Organization</span>}
                        </span>
                      </td>
                      <td className="p-8 text-center">
                        {isOnSite ? (
                          <span className="inline-flex px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border-2 border-emerald-500/20 shadow-lg shadow-emerald-500/5">{t('drv.statusOn') || 'On Site'}</span>
                        ) : (
                          <span className="inline-flex px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-muted bg-muted/10 border-2 border-border/20">{t('drv.statusAway') || 'Away'}</span>
                        )}
                      </td>
                      <td className="p-8 text-right pr-12 whitespace-nowrap overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-3 items-center transition-all duration-300 translate-x-12 group-hover:translate-x-0">
                          {canEditDrivers ? (
                            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => handleOpenModal(driver)} className="w-12 h-12 flex items-center justify-center bg-muted/10 hover:bg-primary hover:text-white rounded-[1rem] text-muted transition-all shadow-lg hover:shadow-primary/30" title="Edit"><Edit2 className="w-5 h-5" /></button>
                              <button onClick={() => handleDeleteClick(driver.id)} className="w-12 h-12 flex items-center justify-center bg-red-500/10 hover:bg-red-500 hover:text-white text-red-600 rounded-[1rem] transition-all shadow-lg hover:shadow-red-500/30" title="Delete"><Trash2 className="w-5 h-5" /></button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted/30 italic">No access</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>

      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(filteredDrivers.length / pageSize)}
        onPageChange={setCurrentPage}
        totalRecords={filteredDrivers.length}
        pageSize={pageSize}
      />

      {isModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-surface w-full max-w-lg rounded-[3rem] border border-border p-10 shadow-2xl relative overflow-y-auto max-h-[90vh] custom-scrollbar">
              <h2 className="text-3xl font-black mb-10 text-foreground tracking-tighter">{editingDriver ? t('drv.edit') : t('drv.add')} Driver</h2>
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-3 px-1">{t('drv.fullName')} *</label>
                  <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-muted/5 border border-border rounded-2xl p-5 text-foreground font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all" placeholder="Enter full name" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-3 px-1">{t('drv.license')} *</label>
                    <input required value={license} onChange={e => setLicense(e.target.value)} className="w-full bg-muted/5 border border-border rounded-2xl p-5 text-foreground font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all" placeholder="License #" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-3 px-1">{t('common.phone')} *</label>
                    <input required value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-muted/5 border border-border rounded-2xl p-5 text-foreground font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all" placeholder="Phone #" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-3 px-1">{t('common.carrier')}</label>
                  <div className="relative group">
                    <Briefcase className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-muted transition-colors group-focus-within:text-primary" />
                    <select
                      value={carrierId}
                      onChange={e => setCarrierId(e.target.value)}
                      className="w-full bg-muted/5 border border-border rounded-2xl pl-16 pr-6 py-5 text-foreground font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none appearance-none transition-all"
                    >
                      <option value="">-- No Organization --</option>
                      {carriers.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-5 pt-10 border-t border-border/50 mt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-sm font-black uppercase tracking-widest text-muted hover:text-foreground transition-colors">{t('common.dismiss')}</button>
                  <button type="submit" className="px-12 py-5 bg-primary hover:bg-blue-600 rounded-2xl font-black uppercase tracking-widest text-xs text-white shadow-xl shadow-primary/30 transition-all active:scale-95">{t('common.save')}</button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      <BulkCreatorModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        title="Bulk Create Drivers"
        subtitle="Register multiple drivers at once."
        columns={bulkColumns}
        onSubmit={handleBulkSave}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Driver"
        message="Are you sure you want to delete this driver? Their historical records will be preserved, but they will no longer be available for new assignments."
      />
    </div>
  );
};


