
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Plus, Edit2, Trash2, Truck, Clock, Box, ListPlus } from 'lucide-react';
import { TrailerTypeDefinition } from '../types';
import { ModalPortal } from '../components/ui/ModalPortal';
import { Pagination } from '../components/ui/Pagination';
import { BulkCreatorModal, BulkColumn } from '../components/BulkCreatorModal';
import { VIEW_IDS } from '../constants';

export const TrailerTypes: React.FC = () => {
  const { trailerTypes, addTrailerType, updateTrailerType, deleteTrailerType, t, addToast, canEdit } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<TrailerTypeDefinition | null>(null);

  const [typeName, setTypeName] = useState('');
  const [duration, setDuration] = useState(60);
  const [processTimePerPallet, setProcessTimePerPallet] = useState<number | undefined>(undefined);

  const [isBulkOpen, setIsBulkOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const paginatedTrailerTypes = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return trailerTypes.slice(start, start + pageSize);
  }, [trailerTypes, currentPage, pageSize]);

  const canEditTypes = canEdit(VIEW_IDS.TRAILER_TYPES);

  const handleOpenModal = (type?: TrailerTypeDefinition) => {
    if (type) {
      setEditingType(type);
      setTypeName(type.name);
      setDuration(type.defaultDuration);
      setProcessTimePerPallet(type.processTimePerPallet);
    } else {
      setEditingType(null);
      setTypeName('');
      setDuration(60);
      setProcessTimePerPallet(undefined);
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim()) return;

    const payload: any = {
      name: typeName.trim(),
      defaultDuration: duration
    };

    if (processTimePerPallet !== undefined && processTimePerPallet > 0) {
      payload.processTimePerPallet = processTimePerPallet;
    }

    if (editingType) {
      updateTrailerType(editingType.id, payload);
    } else {
      addTrailerType(payload);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this trailer type?")) return;
    try {
      await deleteTrailerType(id);
      addToast("Trailer type deleted successfully", "success");
    } catch (err: any) {
      addToast(err.message || "Failed to delete trailer type", "error");
    }
  };

  const handleBulkSave = async (data: any[]) => {
    const promises = data.map(item => {
      const payload: any = {
        name: item.name,
        defaultDuration: Number(item.defaultDuration) || 60
      };
      if (item.processTimePerPallet && Number(item.processTimePerPallet) > 0) {
        payload.processTimePerPallet = Number(item.processTimePerPallet);
      }
      return addTrailerType(payload);
    });
    await Promise.all(promises);
    addToast('Bulk Create', `Created ${data.length} types.`, 'success');
  };

  const bulkColumns: BulkColumn[] = [
    { key: 'name', label: 'Type Name', type: 'text', required: true, placeholder: 'e.g. 20ft Container' },
    { key: 'defaultDuration', label: 'Default Duration (min)', type: 'number', required: true, defaultValue: 60 },
    { key: 'processTimePerPallet', label: 'Min/Pallet (Optional)', type: 'number', defaultValue: 0 }
  ];

  return (
    <div className="p-8 h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('tt.title')}</h1>
          <p className="text-slate-500 dark:text-gray-400">{t('tt.subtitle')}</p>
        </div>
        {canEditTypes && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsBulkOpen(true)}
              className="bg-slate-800 dark:bg-white/20 hover:bg-slate-700 dark:hover:bg-white/30 text-white px-4 py-3 rounded-xl flex items-center shadow-lg transition-all active:scale-95 font-bold"
              title="Bulk Create"
            >
              <ListPlus className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="bg-[#0a84ff] hover:bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center shadow-lg shadow-blue-500/30 transition-all active:scale-95 font-medium"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t('tt.add')}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedTrailerTypes.map(type => (
          <GlassCard key={type.id || type.name} className="p-6 flex flex-col group h-44 relative">
            {canEditTypes && (
              <div className="absolute top-4 right-4 flex gap-2 z-10">
                <button onClick={() => handleOpenModal(type)} className="p-1.5 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 rounded-lg text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(type.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-500 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            )}

            <div className="flex items-start justify-between pr-16">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-500 shrink-0">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-bold text-lg text-slate-900 dark:text-white block">{type.name}</span>
                  <div className="flex items-center text-xs text-slate-500 dark:text-gray-400 mt-1">
                    <Clock className="w-3 h-3 mr-1" /> {type.defaultDuration} {t('tt.defaultDuration')}
                  </div>
                  {type.processTimePerPallet ? (
                    <div className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                      <Box className="w-3 h-3 mr-1" /> {type.processTimePerPallet} {t('tt.processTime')}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(trailerTypes.length / pageSize)}
        onPageChange={setCurrentPage}
        totalRecords={trailerTypes.length}
        pageSize={pageSize}
      />

      {isModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-sm rounded-2xl border border-slate-200 dark:border-white/10 p-6">
              <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">{editingType ? t('common.edit') : t('common.add')} {t('tt.modalTitle')}</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1">{t('tt.typeName')} *</label>
                  <input
                    required
                    autoFocus
                    value={typeName}
                    onChange={e => setTypeName(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1">{t('tt.defServiceTime')} *</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    required
                    value={duration}
                    onChange={e => setDuration(parseInt(e.target.value))}
                    className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">{t('tt.multiplesHint')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1">Minutes/Pallet (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 5"
                    value={processTimePerPallet ?? ''}
                    onChange={e => setProcessTimePerPallet(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">{t('tt.palletHint')}</p>
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
        title="Bulk Create Trailer Types"
        subtitle="Add multiple equipment definitions."
        columns={bulkColumns}
        onSubmit={handleBulkSave}
      />
    </div>
  );
};
