
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Facility } from '../types';
import { Plus, Edit2, Trash2, Building, MapPin, Hash } from 'lucide-react';
import { ModalPortal } from '../components/ui/ModalPortal';
import { Pagination } from '../components/ui/Pagination';

export const AdminFacilities: React.FC = () => {
  const { facilities, addFacility, updateFacility, deleteFacility, addToast } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  return (
    <div className="p-8 h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Facilities</h1>
          <p className="text-slate-500 dark:text-gray-400">Manage physical locations and yards.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl flex items-center shadow-lg shadow-purple-500/30 transition-all active:scale-95 font-medium"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Facility
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedFacilities.map(fac => (
          <GlassCard key={fac.id} className="p-6 group relative">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleOpenModal(fac)} className="p-2 bg-slate-100 dark:bg-white/10 hover:bg-blue-500 hover:text-white rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => { if (window.confirm('Are you sure you want to delete this facility?')) deleteFacility(fac.id); }} className="p-2 bg-slate-100 dark:bg-white/10 hover:bg-red-500 hover:text-white rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">{fac.name}</h3>
                <p className="text-xs text-slate-500">{fac.id}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-slate-600 dark:text-gray-300">
              {fac.address && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /> {fac.address}</div>}
              {fac.code && <div className="flex items-center gap-2"><Hash className="w-4 h-4 text-slate-400" /> {fac.code}</div>}
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-2xl">
              <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">{editingFacility ? 'Edit Facility' : 'New Facility'}</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Facility Name *</label>
                  <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 outline-none focus:border-purple-500 text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Address</label>
                  <input value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 outline-none focus:border-purple-500 text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Facility Code</label>
                  <input value={code} onChange={e => setCode(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 outline-none focus:border-purple-500 text-slate-900 dark:text-white" placeholder="e.g. YARD-01" />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white font-bold text-sm">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm shadow-lg">Save</button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
