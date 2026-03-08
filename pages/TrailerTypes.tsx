
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
    <div className="p-8 h-full flex flex-col animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tighter leading-tight">Equipment Types</h1>
          <p className="text-muted text-lg font-medium opacity-70">{t('tt.subtitle')}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {canEditTypes && (
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
                {t('tt.add')}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedTrailerTypes.map(type => (
          <GlassCard key={type.id || type.name} className="p-10 flex flex-col group relative h-full hover:scale-[1.02] transition-all duration-500 border-none shadow-xl bg-surface/50 rounded-[2.5rem] overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]"></div>
            {canEditTypes && (
              <div className="absolute top-8 right-8 flex items-center gap-2 z-10 transition-all duration-500 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => handleOpenModal(type)}
                  className="w-10 h-10 flex items-center justify-center bg-surface hover:bg-primary hover:text-white rounded-xl shadow-lg transition-all text-muted"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteClick(type.id)}
                  className="w-10 h-10 flex items-center justify-center bg-surface hover:bg-red-500 hover:text-white rounded-xl shadow-lg transition-all text-red-600"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-6 mb-10 pr-12 pl-4">
              <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center shrink-0 transition-transform group-hover:rotate-3 shadow-lg shadow-primary/5">
                <Truck className="w-8 h-8 text-primary" />
              </div>
              <div className="overflow-hidden">
                <h3 className="text-2xl font-black text-foreground leading-tight truncate tracking-tighter">{type.name}</h3>
                <p className="text-[10px] text-muted truncate tracking-widest font-black uppercase opacity-40">Equipment Class</p>
              </div>
            </div>

            <div className="space-y-6 mt-2 flex-1 pl-4">
              <div className="flex items-center text-sm text-foreground font-bold group/item">
                <div className="p-2.5 rounded-xl bg-muted/5 mr-4 transition-colors group-hover/item:bg-primary/10">
                  <Clock className="w-4.5 h-4.5 text-muted transition-colors group-hover/item:text-primary" />
                </div>
                <span className="opacity-80 font-black tracking-tight">{type.defaultDuration} Minutes Standard</span>
              </div>

              {type.processTimePerPallet ? (
                <div className="flex items-center text-sm font-bold group/item">
                  <div className="p-2.5 rounded-xl bg-emerald-500/5 mr-4 transition-colors group-hover/item:bg-emerald-500/10">
                    <Box className="w-4.5 h-4.5 text-emerald-500" />
                  </div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black tracking-tight">{type.processTimePerPallet} Min / Unit</span>
                </div>
              ) : (
                <div className="text-[10px] text-muted/30 italic px-1 font-black uppercase tracking-[0.2em] mt-4">Static Loading Profile</div>
              )}
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-surface w-full max-w-sm rounded-[2.5rem] border border-border p-8 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
              <h2 className="text-2xl font-black mb-8 text-foreground tracking-tight">{editingType ? t('common.edit') : t('common.add')} {t('tt.modalTitle')}</h2>
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-2">{t('tt.typeName')} *</label>
                  <input
                    required
                    autoFocus
                    placeholder="e.g. 53ft Dry Van"
                    value={typeName}
                    onChange={e => setTypeName(e.target.value)}
                    className="w-full bg-muted/5 border border-border rounded-xl p-4 text-foreground font-bold focus:border-primary focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-2">{t('tt.defServiceTime')} (Min) *</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    required
                    value={duration}
                    onChange={e => setDuration(parseInt(e.target.value))}
                    className="w-full bg-muted/5 border border-border rounded-xl p-4 text-foreground font-bold focus:border-primary focus:outline-none transition-all"
                  />
                  <p className="text-[10px] text-muted/40 font-black uppercase tracking-widest mt-2">{t('tt.multiplesHint')}</p>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-2">Minutes/Pallet (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 5"
                    value={processTimePerPallet ?? ''}
                    onChange={e => setProcessTimePerPallet(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full bg-muted/5 border border-border rounded-xl p-4 text-foreground font-bold focus:border-primary focus:outline-none transition-all"
                  />
                  <p className="text-[10px] text-muted/40 font-black uppercase tracking-widest mt-2">{t('tt.palletHint')}</p>
                </div>

                <div className="flex justify-end gap-5 pt-8 border-t border-border/50">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-sm font-black uppercase tracking-widest text-muted hover:text-foreground transition-colors">{t('common.cancel')}</button>
                  <button type="submit" className="px-10 py-4 bg-primary hover:bg-blue-600 rounded-2xl font-black uppercase tracking-widest text-xs text-white shadow-xl shadow-primary/30 transition-all active:scale-95">{t('common.save')}</button>
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
