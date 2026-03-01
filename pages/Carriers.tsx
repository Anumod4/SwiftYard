
import React, { useState, useMemo } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Carrier } from '../types';
import { Plus, Edit2, Trash2, Briefcase, Mail, Phone, ListPlus, Search } from 'lucide-react';
import { ModalPortal } from '../components/ui/ModalPortal';
import { Pagination } from '../components/ui/Pagination';
import { BulkCreatorModal, BulkColumn } from '../components/BulkCreatorModal';
import { DeleteConfirmationModal } from '../components/ui/DeleteConfirmationModal';
import { VIEW_IDS } from '../constants';

export const Carriers: React.FC = () => {
  const { carriers, addCarrier, updateCarrier, deleteCarrier, t, addToast, canEdit } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [carrierToDelete, setCarrierToDelete] = useState<string | null>(null);
  const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

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
    } else {
      setEditingCarrier(null);
      setName('');
      setEmail('');
      setPhone('');
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      contactEmail: email || undefined,
      contactPhone: phone || undefined
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
    { key: 'contactPhone', label: 'Phone', type: 'text' }
  ];

  return (
    <div className="p-8 h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('car.title')}</h1>
          <p className="text-slate-500 dark:text-gray-400">{t('car.subtitle')}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search carriers..."
              className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {canEditCarriers && (
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
                {t('car.add')}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedCarriers.map(carrier => (
          <CarrierCard
            key={carrier.id}
            carrier={carrier}
            canEdit={canEditCarriers}
            onEdit={handleOpenModal}
            onDelete={handleDeleteClick}
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

      {isModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 p-6">
              <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">{editingCarrier ? t('common.edit') : t('common.add')} {t('car.modalTitle')}</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1">{t('car.name')} *</label>
                  <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1">{t('car.email')}</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1">{t('car.phone')}</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
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
    </div>
  );
};

const CarrierCard = React.memo<{
  carrier: Carrier;
  canEdit: boolean;
  onEdit: (c: Carrier) => void;
  onDelete: (id: string) => void;
  t: any;
}>(({ carrier, canEdit, onEdit, onDelete, t }) => (
  <GlassCard className="p-6 flex flex-col group relative h-full">
    {canEdit && (
      <div className="absolute top-4 right-4 flex gap-2 z-10 transition-opacity opacity-0 group-hover:opacity-100">
        <button onClick={() => onEdit(carrier)} className="p-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 rounded-xl text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-all"><Edit2 className="w-4 h-4" /></button>
        <button onClick={() => onDelete(carrier.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-500 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
      </div>
    )}

    <div className="flex items-center gap-4 mb-4 pr-12">
      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
        <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="overflow-hidden">
        <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight truncate">{carrier.name}</h3>
        <p className="text-[10px] text-slate-400 dark:text-gray-500 truncate tracking-widest font-bold uppercase">{carrier.id.slice(0, 8)}</p>
      </div>
    </div>

    <div className="space-y-3 mt-2 flex-1">
      {carrier.contactEmail && (
        <div className="flex items-center text-sm text-slate-600 dark:text-gray-400">
          <Mail className="w-4 h-4 mr-2 text-slate-400 dark:text-gray-600" />
          <span className="truncate">{carrier.contactEmail}</span>
        </div>
      )}
      {carrier.contactPhone && (
        <div className="flex items-center text-sm text-slate-600 dark:text-gray-400">
          <Phone className="w-4 h-4 mr-2 text-slate-400 dark:text-gray-600" />
          {carrier.contactPhone}
        </div>
      )}
      {!carrier.contactEmail && !carrier.contactPhone && (
        <div className="text-xs text-slate-400 dark:text-gray-600 italic px-1">{t('car.noContact')}</div>
      )}
    </div>
  </GlassCard>
));
