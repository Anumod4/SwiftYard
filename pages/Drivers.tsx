
import React, { useState, useMemo } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Driver } from '../types';
import { Plus, Edit2, Trash2, User, CheckCircle2, XCircle, Briefcase, ListPlus, Search, Phone } from 'lucide-react';
import { ModalPortal } from '../components/ui/ModalPortal';
import { Pagination } from '../components/ui/Pagination';
import { BulkCreatorModal, BulkColumn } from '../components/BulkCreatorModal';
import { VIEW_IDS } from '../constants';

export const Drivers: React.FC = () => {
  const { drivers, addDriver, updateDriver, deleteDriver, trailers, carriers, t, addToast, canEdit } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

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

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this driver? This action cannot be undone.")) {
      try {
        await deleteDriver(id);
        addToast('Deleted', 'Driver removed from registry.', 'info');
      } catch (err: any) {
        addToast('Error', err.message, 'error');
      }
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

  const getDriverStatus = (driverId: string) => {
    return trailers.some(t =>
      t.currentDriverId === driverId &&
      ['GatedIn', 'InYard', 'CheckedIn', 'CheckedOut'].includes(t.status)
    );
  };

  const filteredDrivers = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return drivers;
    const s = debouncedSearchTerm.toLowerCase();
    return drivers.filter(d =>
      d.name.toLowerCase().includes(s) ||
      d.licenseNumber.toLowerCase().includes(s) ||
      d.carrierId?.toLowerCase().includes(s)
    );
  }, [drivers, debouncedSearchTerm]);

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedDrivers.map(driver => (
          <DriverCard
            key={driver.id}
            driver={driver}
            canEdit={canEditDrivers}
            isOnSite={getDriverStatus(driver.id)}
            carrierName={getCarrierDisplayName(driver.carrierId)}
            onEdit={handleOpenModal}
            onDelete={handleDelete}
            t={t}
          />
        ))}
      </div>

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
    </div>
  );
};

const DriverCard = React.memo<{
  driver: Driver;
  canEdit: boolean;
  isOnSite: boolean;
  carrierName: string;
  onEdit: (d: Driver) => void;
  onDelete: (id: string) => void;
  t: any;
}>(({ driver, canEdit, isOnSite, carrierName, onEdit, onDelete, t }) => (
  <GlassCard className={`p-6 flex flex-col items-center text-center group relative h-full ${isOnSite ? 'border-emerald-500/30' : ''}`}>
    {canEdit && (
      <div className="absolute top-4 right-4 flex gap-2 z-10 transition-opacity opacity-0 group-hover:opacity-100">
        <button onClick={() => onEdit(driver)} className="p-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 rounded-xl text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-all"><Edit2 className="w-4 h-4" /></button>
        <button onClick={() => onDelete(driver.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-500 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
      </div>
    )}

    <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center mb-4 relative shadow-inner">
      <User className="w-10 h-10 text-slate-400 dark:text-gray-400" />
      <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center border-4 border-white dark:border-[#1e1e1e] shadow-lg ${isOnSite ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-gray-500'}`}>
        {isOnSite ? <CheckCircle2 className="w-3 h-3 text-white" /> : <XCircle className="w-3 h-3 text-white" />}
      </div>
    </div>

    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1 truncate w-full px-2" title={driver.name}>{driver.name}</h3>
    <div className="mb-6">
      {isOnSite ? (
        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">{t('drv.statusOn')}</span>
      ) : (
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 bg-slate-100 dark:bg-gray-500/10 px-3 py-1 rounded-full border border-slate-200 dark:border-white/5">{t('drv.statusAway')}</span>
      )}
    </div>

    <div className="w-full space-y-2.5 mt-auto">
      <div className="flex justify-between items-center text-sm bg-slate-50 dark:bg-black/20 p-2.5 rounded-xl border border-slate-100 dark:border-white/5">
        <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">{t('drv.license')}</span>
        <span className="font-mono font-bold text-slate-900 dark:text-white">{driver.licenseNumber}</span>
      </div>
      <div className="flex justify-between items-center text-sm bg-slate-50 dark:bg-black/20 p-2.5 rounded-xl border border-slate-100 dark:border-white/5">
        <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">{t('common.phone')}</span>
        <span className="text-slate-900 dark:text-white font-bold">{driver.phone}</span>
      </div>
      {carrierName && carrierName !== '-' && (
        <div className="flex justify-between items-center text-sm bg-blue-50/50 dark:bg-blue-500/5 p-2.5 rounded-xl border border-blue-100 dark:border-blue-500/10">
          <span className="text-blue-400 font-bold uppercase text-[10px] tracking-wider">{t('common.carrier')}</span>
          <span className="text-blue-600 dark:text-blue-400 font-black truncate max-w-[120px]" title={carrierName}>{carrierName}</span>
        </div>
      )}
    </div>
  </GlassCard>
));
