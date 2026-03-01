
import React, { useState, useMemo } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Driver } from '../types';
import { Plus, Edit2, Trash2, User, CheckCircle2, XCircle, Briefcase, ListPlus, Search, Phone } from 'lucide-react';
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
    if (!sortConfig || sortConfig.key !== key) return null;
    return <span className="ml-1 font-bold text-blue-500 dark:text-blue-400">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
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
    <div className="p-8 h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('drv.title')}</h1>
          <p className="text-slate-500 dark:text-gray-400">{t('drv.subtitle')}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search drivers..."
              className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {canEditDrivers && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsBulkOpen(true)}
                className="bg-slate-800 dark:bg-white/20 hover:bg-slate-700 dark:hover:bg-white/30 text-white px-4 py-2 rounded-xl flex items-center shadow-md transition-all active:scale-95 font-bold"
                title="Bulk Create"
              >
                <ListPlus className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleOpenModal()}
                className="bg-[#0a84ff] hover:bg-blue-600 text-white px-6 py-2 rounded-xl flex items-center shadow-lg shadow-blue-500/30 transition-all active:scale-95 font-medium whitespace-nowrap"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('drv.add')}
              </button>
            </div>
          )}
        </div>
      </div>

      <GlassCard className="flex-1 overflow-hidden flex flex-col p-0 mb-6">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredDrivers.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-gray-500">
              <User className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">{t('drv.empty') || 'No drivers found.'}</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 bg-slate-50 dark:bg-[#1a1a1a] z-10 text-xs uppercase text-slate-500 dark:text-gray-500 font-bold tracking-wider">
                <tr>
                  <th onClick={() => handleSort('name')} className="p-5 border-b border-slate-200 dark:border-white/10 cursor-pointer group hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                    {t('drv.fullName')} {getSortIcon('name')}
                  </th>
                  <th onClick={() => handleSort('licenseNumber')} className="p-5 border-b border-slate-200 dark:border-white/10 cursor-pointer group hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                    {t('drv.license')} {getSortIcon('licenseNumber')}
                  </th>
                  <th onClick={() => handleSort('phone')} className="p-5 border-b border-slate-200 dark:border-white/10 cursor-pointer group hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                    {t('common.phone')} {getSortIcon('phone')}
                  </th>
                  <th onClick={() => handleSort('carrier')} className="p-5 border-b border-slate-200 dark:border-white/10 cursor-pointer group hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                    {t('common.carrier')} {getSortIcon('carrier')}
                  </th>
                  <th onClick={() => handleSort('status')} className="p-5 border-b border-slate-200 dark:border-white/10 cursor-pointer group hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                    Status {getSortIcon('status')}
                  </th>
                  <th className="p-5 border-b border-slate-200 dark:border-white/10 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {paginatedDrivers.map(driver => {
                  const isOnSite = driver.status === 'On Site';
                  const carrierName = getCarrierDisplayName(driver.carrierId);

                  return (
                    <tr key={driver.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex flex-shrink-0 items-center justify-center relative ${isOnSite ? 'bg-emerald-50! dark:bg-emerald-500/10' : 'bg-slate-100 dark:bg-white/5'}`}>
                            <User className={`w-4 h-4 ${isOnSite ? 'text-emerald-500' : 'text-slate-400'}`} />
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]" title={driver.name}>
                            {driver.name}
                          </span>
                        </div>
                      </td>
                      <td className="p-5 font-mono font-medium text-slate-600 dark:text-gray-300">
                        {driver.licenseNumber}
                      </td>
                      <td className="p-5 font-medium text-slate-600 dark:text-gray-300 flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {driver.phone}
                      </td>
                      <td className="p-5">
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate max-w-[150px] inline-block" title={carrierName}>
                          {carrierName !== '-' ? carrierName : <span className="text-slate-400 italic">None</span>}
                        </span>
                      </td>
                      <td className="p-5">
                        {isOnSite ? (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 border border-emerald-500/20">{t('drv.statusOn') || 'On Site'}</span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 bg-slate-100 dark:bg-gray-500/10 border border-slate-200 dark:border-white/5">{t('drv.statusAway') || 'Away'}</span>
                        )}
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex justify-end gap-2">
                          {canEditDrivers ? (
                            <>
                              <button onClick={() => handleOpenModal(driver)} className="p-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteClick(driver.id)} className="p-2 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No access</span>
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
            <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-2xl">
              <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">{editingDriver ? t('drv.edit') : t('drv.add')}</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1">{t('drv.fullName')} *</label>
                  <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1">{t('drv.license')} *</label>
                  <input required value={license} onChange={e => setLicense(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1">{t('common.phone')} *</label>
                  <input required value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1">{t('common.carrier')}</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 w-5 h-5 text-slate-400 dark:text-gray-500" />
                    <select
                      value={carrierId}
                      onChange={e => setCarrierId(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg pl-10 pr-3 py-3 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none appearance-none"
                    >
                      <option value="">-- No Carrier --</option>
                      {carriers.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white">{t('common.cancel')}</button>
                  <button type="submit" className="px-6 py-2 bg-[#0a84ff] hover:bg-blue-600 rounded-lg font-medium text-white">{t('common.save')}</button>
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


