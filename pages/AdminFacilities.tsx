
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Facility } from '../types';
import { Plus, Edit2, Trash2, Building, MapPin, Hash } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
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
  const [mobile, setMobile] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [sortField, setSortField] = useState<'name' | 'id' | 'code'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const sortedFacilities = useMemo(() => {
    return [...facilities].sort((a, b) => {
      const valA = (a as any)[sortField] || '';
      const valB = (b as any)[sortField] || '';
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }, [facilities, sortField, sortOrder]);

  const paginatedFacilities = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedFacilities.slice(start, start + pageSize);
  }, [sortedFacilities, currentPage, pageSize]);

  const isDirty = useMemo(() => {
    if (!isModalOpen) return false;
    if (editingFacility) {
      return name !== editingFacility.name ||
        address !== (editingFacility.address || '') ||
        code !== (editingFacility.code || '') ||
        mobile !== (editingFacility.mobile || '') ||
        phone !== (editingFacility.phone || '') ||
        email !== (editingFacility.email || '');
    }
    return name !== '' || address !== '' || code !== '' || mobile !== '' || phone !== '' || email !== '';
  }, [isModalOpen, name, address, code, mobile, phone, email, editingFacility]);

  const handleOpenModal = (fac?: Facility) => {
    if (fac) {
      setEditingFacility(fac);
      setName(fac.name);
      setAddress(fac.address || '');
      setCode(fac.code || '');
      setMobile(fac.mobile || '');
      setPhone(fac.phone || '');
      setEmail(fac.email || '');
    } else {
      setEditingFacility(null);
      setName('');
      setAddress('');
      setCode('');
      setMobile('');
      setPhone('');
      setEmail('');
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, address, code, mobile, phone, email };
    if (editingFacility) {
      updateFacility({ ...editingFacility, ...payload });
      addToast('Updated', 'Facility updated', 'success');
    } else {
      addFacility(payload);
      addToast('Success', 'Facility created', 'success');
    }
    setIsModalOpen(false);
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
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
    <div className="p-8 h-full flex flex-col animate-in fade-in duration-500 overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tighter leading-tight">Facilities</h1>
          <p className="text-muted text-lg opacity-70 font-medium italic">Configure operational facilities and regional nodes.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary hover:bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center shadow-2xl shadow-primary/30 transition-all font-black uppercase tracking-widest text-xs active:scale-95"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Facility
        </button>
      </div>

      <GlassCard className="flex-1 overflow-hidden border-none shadow-xl rounded-[2.5rem] bg-surface/30 backdrop-blur-xl mb-6">
        <div className="h-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-muted/5 border-b border-border/50">
                <th className="px-8 py-6 text-[10px] font-black text-muted uppercase tracking-widest cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-2">Facility Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="px-8 py-6 text-[10px] font-black text-muted uppercase tracking-widest cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('code')}>
                  <div className="flex items-center gap-2">Routing Code {sortField === 'code' && (sortOrder === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="px-8 py-6 text-[10px] font-black text-muted uppercase tracking-widest">Physical Address</th>
                <th className="px-8 py-6 text-[10px] font-black text-muted uppercase tracking-widest">Contact Details</th>
                <th className="px-8 py-6 text-[10px] font-black text-muted uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {paginatedFacilities.map(fac => (
                <tr key={fac.id} className="group hover:bg-muted/5 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Building className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-black text-foreground tracking-tight text-base leading-none mb-1">{fac.name}</p>
                        <p className="text-[9px] font-bold text-muted uppercase opacity-40">{fac.id.slice(0, 12)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 rounded-lg bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 font-black text-xs border border-indigo-500/10">{fac.code || '---'}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-sm text-foreground font-bold tracking-tight max-w-xs truncate">
                      <MapPin className="w-3.5 h-3.5 text-muted shrink-0" />
                      {fac.address || 'N/A'}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1">
                      {fac.email && <span className="text-[10px] font-black text-primary lowercase tracking-tight">{fac.email}</span>}
                      <div className="flex gap-4">
                        {fac.mobile && <span className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-1.5"><Hash className="w-3 h-3" /> {fac.mobile}</span>}
                        {fac.phone && <span className="text-[10px] font-bold text-muted opacity-60 uppercase tracking-widest">{fac.phone}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenModal(fac)}
                        className="w-9 h-9 flex items-center justify-center bg-surface hover:bg-primary hover:text-white rounded-lg shadow-sm border border-border/50 transition-all text-muted"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(fac.id)}
                        className="w-9 h-9 flex items-center justify-center bg-surface hover:bg-red-500 hover:text-white rounded-lg shadow-sm border border-border/50 transition-all text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedFacilities.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Building className="w-12 h-12 text-muted/20 mx-auto mb-4" />
                    <p className="text-muted font-black uppercase tracking-widest text-xs italic">No facilities configured</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(facilities.length / pageSize)}
        onPageChange={setCurrentPage}
        totalRecords={facilities.length}
        pageSize={pageSize}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isDirty={isDirty}
        title={editingFacility ? 'Edit Facility Identity' : 'Commission New Facility'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-2 px-1">Legal Name *</label>
              <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-muted/5 border border-border rounded-xl p-4 outline-none text-foreground font-black tracking-tighter text-lg focus:border-primary transition-all" placeholder="Regional Distribution Hub" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-2 px-1">Physical Address</label>
              <input value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-muted/5 border border-border rounded-xl p-4 outline-none text-foreground font-bold focus:border-primary transition-all" placeholder="123 Export Lane" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-2 px-1">Operational Code</label>
              <input value={code} onChange={e => setCode(e.target.value)} className="w-full bg-muted/5 border border-border rounded-xl p-4 outline-none text-foreground font-black tracking-widest focus:border-primary transition-all" placeholder="HUB-NE-01" />
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-border/30">
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground opacity-50 px-1">Contact Metadata</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-2 px-1">Public Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-muted/5 border border-border rounded-xl p-4 outline-none text-foreground font-bold focus:border-primary transition-all" placeholder="logistics@facility.com" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-2 px-1">Mobile Hotline</label>
                <input value={mobile} onChange={e => setMobile(e.target.value)} className="w-full bg-muted/5 border border-border rounded-xl p-4 outline-none text-foreground font-bold focus:border-primary transition-all" placeholder="+1 (555) 0011" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-2 px-1">Fixed Phone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-muted/5 border border-border rounded-xl p-4 outline-none text-foreground font-bold focus:border-primary transition-all" placeholder="+1 (555) 0022" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-6 pt-10 border-t border-border/50">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted hover:text-foreground transition-colors">Discard</button>
            <button type="submit" className="px-10 py-4 bg-primary hover:bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 transition-all active:scale-95">Commit Records</button>
          </div>
        </form>
      </Modal>

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
