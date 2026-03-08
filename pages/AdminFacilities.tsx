
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Facility } from '../types';
import { Plus, Edit2, Trash2, Building, MapPin, Hash } from 'lucide-react';
import { ModalPortal } from '../components/ui/ModalPortal';
import { Pagination } from '../components/ui/Pagination';
import { DeleteConfirmationModal } from '../components/ui/DeleteConfirmationModal';

export const AdminFacilities: React.FC = () => {
  const { facilities, addFacility, updateFacility, deleteFacility, addToast } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [facilityToDelete, setFacilityToDelete] = useState<string | null>(null);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [code, setCode] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const paginatedFacilities = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return facilities.slice(start, start + pageSize);
  }, [facilities, currentPage, pageSize]);

  const handleOpenModal = (fac?: Facility) => {
    if (fac) {
      setEditingFacility(fac);
      setName(fac.name);
      setAddress(fac.address || '');
      setCode(fac.code || '');
    } else {
      setEditingFacility(null);
      setName('');
      setAddress('');
      setCode('');
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, address, code };
    if (editingFacility) {
      updateFacility({ ...editingFacility, ...payload });
      addToast('Updated', 'Facility updated', 'success');
    } else {
      addFacility(payload);
    }
    setIsModalOpen(false);
  };

  const handleDeleteClick = (id: string) => {
    setFacilityToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (facilityToDelete) {
      deleteFacility(facilityToDelete);
      setFacilityToDelete(null);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tighter leading-tight">Asset Logistics</h1>
          <p className="text-muted text-lg opacity-70 font-medium">Configure operational facilities and regional nodes.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary hover:bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center shadow-2xl shadow-primary/30 transition-all font-black uppercase tracking-widest text-xs active:scale-95"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Facility
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedFacilities.map(fac => (
          <GlassCard key={fac.id} className="p-8 group relative border-none shadow-xl hover:scale-[1.02] transition-all bg-surface/50 rounded-[2.5rem]">
            <div className="absolute top-6 right-6 flex items-center gap-2 z-10 transition-all duration-500 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0">
              <button
                onClick={() => handleOpenModal(fac)}
                className="w-10 h-10 flex items-center justify-center bg-surface hover:bg-primary hover:text-white rounded-xl shadow-lg transition-all text-muted"
                title="Edit"
              >
                <Edit2 className="w-4.5 h-4.5" />
              </button>
              <button
                onClick={() => handleDeleteClick(fac.id)}
                className="w-10 h-10 flex items-center justify-center bg-surface hover:bg-red-500 hover:text-white rounded-xl shadow-lg transition-all text-red-600"
                title="Delete"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="flex items-center gap-6 mb-8">
              <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500/10 flex items-center justify-center text-indigo-600 shadow-lg shadow-indigo-500/5 group-hover:rotate-3 transition-transform">
                <Building className="w-8 h-8" />
              </div>
              <div className="overflow-hidden">
                <h3 className="font-black text-foreground text-xl tracking-tighter truncate leading-tight">{fac.name}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted opacity-40 truncate">{fac.id.slice(0, 8)}</p>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              {fac.address && (
                <div className="flex items-center gap-4 p-4 bg-muted/5 rounded-2xl border border-border/30">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-foreground font-bold tracking-tight truncate">{fac.address}</span>
                </div>
              )}
              {fac.code && (
                <div className="flex items-center justify-between p-4 bg-muted/5 rounded-2xl border border-border/30">
                  <div className="flex items-center gap-4">
                    <Hash className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted">Internal Code</span>
                  </div>
                  <span className="font-black text-indigo-600 dark:text-indigo-400">{fac.code}</span>
                </div>
              )}
            </div>
          </GlassCard>
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(facilities.length / pageSize)}
        onPageChange={setCurrentPage}
        totalRecords={facilities.length}
        pageSize={pageSize}
      />

      {isModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-surface w-full max-w-lg rounded-[3.5rem] border border-border p-12 shadow-2xl">
              <h2 className="text-4xl font-black mb-10 text-foreground tracking-tighter">{editingFacility ? 'Edit Facility' : 'New Facility Portal'}</h2>
              <form onSubmit={handleSave} className="space-y-8">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">Facility Designation *</label>
                  <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-muted/5 border border-border rounded-2xl p-4 outline-none text-foreground font-black tracking-tighter text-lg focus:border-primary transition-all shadow-sm" placeholder="e.g. Northeast Logistics Center" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">Physical Address</label>
                  <input value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-muted/5 border border-border rounded-2xl p-4 outline-none text-foreground font-black tracking-tighter text-lg focus:border-primary transition-all shadow-sm" placeholder="123 Industrial Way..." />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">Routing Code</label>
                  <input value={code} onChange={e => setCode(e.target.value)} className="w-full bg-muted/5 border border-border rounded-2xl p-4 outline-none text-foreground font-black tracking-tighter text-lg focus:border-primary transition-all shadow-sm" placeholder="e.g. YARD-01" />
                </div>

                <div className="flex justify-end gap-6 pt-10 mt-6 border-t border-border/50">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted hover:text-foreground transition-colors">Dismiss</button>
                  <button type="submit" className="px-12 py-5 bg-primary hover:bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/30 transition-all active:scale-95">Commit Designation</button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Facility"
        message="Are you sure you want to delete this facility? This will remove all associated data and yard configurations."
      />
    </div>
  );
};
