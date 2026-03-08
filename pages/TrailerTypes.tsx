
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Plus, Edit2, Trash2, Truck, Clock, Box, ListPlus } from 'lucide-react';
import { TrailerTypeDefinition } from '../types';
import { ModalPortal } from '../components/ui/ModalPortal';
import { Pagination } from '../components/ui/Pagination';
import { BulkCreatorModal, BulkColumn } from '../components/BulkCreatorModal';
import { DeleteConfirmationModal } from '../components/ui/DeleteConfirmationModal';
import { VIEW_IDS } from '../constants';

export const TrailerTypes: React.FC = () => {
  const { trailerTypes, addTrailerType, updateTrailerType, deleteTrailerType, t, addToast, canEdit } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<string | null>(null);
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

  const handleDeleteClick = (id: string) => {
    setTypeToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (typeToDelete) {
      try {
        await deleteTrailerType(typeToDelete);
        addToast("Trailer type deleted successfully", "success");
      } catch (err: any) {
        addToast(err.message || "Failed to delete trailer type", "error");
      }
      setTypeToDelete(null);
    }
  };

  const handleDelete = async (id: string) => {
    // Replaced by DeleteConfirmationModal
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
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('tt.title')}</h1>
          <p className="text-muted">{t('tt.subtitle')}</p>
        </div>
        {canEditTypes && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsBulkOpen(true)}
              className="bg-muted/10 hover:bg-muted/20 text-foreground px-4 py-3 rounded-xl flex items-center shadow-lg transition-all active:scale-95 font-bold"
              title="Bulk Create"
            >
              <ListPlus className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="bg-primary hover:bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center shadow-lg shadow-primary/30 transition-all active:scale-95 font-medium"
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
              <div className="absolute top-4 right-4 flex items-center gap-2 z-10 transition-all duration-300 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto translate-x-2 group-hover:translate-x-0">
                <button
                  onClick={() => handleOpenModal(type)}
                  className="w-8 h-8 flex items-center justify-center bg-muted/10 hover:bg-primary hover:text-white rounded-lg transition-colors text-muted"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteClick(type.id)}
                  className="w-8 h-8 flex items-center justify-center bg-red-500/10 hover:bg-red-500 hover:text-white rounded-lg transition-colors text-red-600 dark:text-red-500"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-start justify-between pr-16">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-bold text-lg text-foreground block">{type.name}</span>
                  <div className="flex items-center text-xs text-muted mt-1">
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
            <div className="bg-surface w-full max-w-sm rounded-2xl border border-border p-6 shadow-2xl">
              <h2 className="text-xl font-bold mb-6 text-foreground">{editingType ? t('common.edit') : t('common.add')} {t('tt.modalTitle')}</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">{t('tt.typeName')} *</label>
                  <input
                    required
                    autoFocus
                    value={typeName}
                    onChange={e => setTypeName(e.target.value)}
                    className="w-full bg-muted/5 border border-border rounded-lg p-3 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted mb-1">{t('tt.defServiceTime')} *</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    required
                    value={duration}
                    onChange={e => setDuration(parseInt(e.target.value))}
                    className="w-full bg-muted/5 border border-border rounded-lg p-3 text-foreground focus:border-primary focus:outline-none"
                  />
                  <p className="text-xs text-muted/60 mt-1">{t('tt.multiplesHint')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Minutes/Pallet (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 5"
                    value={processTimePerPallet ?? ''}
                    onChange={e => setProcessTimePerPallet(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full bg-muted/5 border border-border rounded-lg p-3 text-foreground focus:border-primary focus:outline-none"
                  />
                  <p className="text-xs text-muted/60 mt-1">{t('tt.palletHint')}</p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted hover:text-foreground font-bold">{t('common.cancel')}</button>
                  <button type="submit" className="px-6 py-2 bg-primary hover:bg-blue-600 rounded-lg font-medium text-white shadow-lg shadow-primary/20">{t('common.save')}</button>
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

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Trailer Type"
        message="Are you sure you want to delete this trailer type? This will affect all existing and future appointment scheduling for this equipment category."
      />
    </div>
  );
};
