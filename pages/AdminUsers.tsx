
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { UserProfileData } from '../types';
import { Plus, Edit2, Trash2, Shield, Warehouse, Check, Briefcase, AlertCircle, Search, Mail, User } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { DeleteConfirmationModal } from '../components/ui/DeleteConfirmationModal';

export const AdminUsers: React.FC = () => {
    const { allUsers = [], facilities = [], roles = [], allCarriers = [], updateUser, deleteUser, addUser, addToast, performHousekeeping } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<UserProfileData | null>(null);

    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState<string>('user');
    const [carrierId, setCarrierId] = useState<string>('');
    const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState<'displayName' | 'email' | 'role'>('displayName');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    useEffect(() => { performHousekeeping(); }, [performHousekeeping]);

    const filteredUsers = useMemo(() => {
        let list = [...allUsers];
        if (searchTerm.trim()) {
            const s = searchTerm.toLowerCase();
            list = list.filter(u =>
                (u.displayName || '').toLowerCase().includes(s) ||
                (u.email || '').toLowerCase().includes(s)
            );
        }
        return list.sort((a, b) => {
            const valA = (a as any)[sortField] || '';
            const valB = (b as any)[sortField] || '';
            return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
    }, [allUsers, searchTerm, sortField, sortOrder]);

    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredUsers.slice(start, start + pageSize);
    }, [filteredUsers, currentPage, pageSize]);

    const isDirty = useMemo(() => {
        if (!isModalOpen) return false;
        if (editingUser) {
            const parts = (editingUser.displayName || '').split(' ');
            const eFirstName = parts[0] || '';
            const eLastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
            const facilitiesChanged = JSON.stringify([...selectedFacilities].sort()) !== JSON.stringify([...(editingUser.assignedFacilities || [])].sort());

            return email !== (editingUser.email || '') ||
                firstName !== eFirstName ||
                lastName !== eLastName ||
                role !== (editingUser.role || 'user') ||
                carrierId !== (editingUser.carrierId || '') ||
                facilitiesChanged;
        }
        return email !== '' || firstName !== '' || lastName !== '' || role !== 'user' || carrierId !== '' || selectedFacilities.length > 0;
    }, [isModalOpen, email, firstName, lastName, role, carrierId, selectedFacilities, editingUser]);

    const handleOpenModal = (user?: UserProfileData) => {
        if (user) {
            setEditingUser(user);
            setEmail(user.email || '');
            const parts = (user.displayName || '').split(' ');
            setFirstName(parts[0] || '');
            setLastName(parts.length > 1 ? parts.slice(1).join(' ') : '');
            setRole(user.role || 'user');
            setCarrierId(user.carrierId || '');
            setSelectedFacilities(Array.isArray(user.assignedFacilities) ? [...user.assignedFacilities] : []);
        } else {
            setEditingUser(null);
            setEmail('');
            setFirstName('');
            setLastName('');
            setRole('user');
            setCarrierId('');
            setSelectedFacilities([]);
        }
        setIsModalOpen(true);
    };

    const toggleFacility = (fid: string) => {
        setSelectedFacilities(prev => prev.includes(fid) ? prev.filter(id => id !== fid) : [...prev, fid]);
    };

    const handleCarrierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const cName = e.target.value;
        setCarrierId(cName);
        if (cName) {
            const selectedCarrier = allCarriers.find(c => c.name === cName);
            if (selectedCarrier && selectedCarrier.facilityId) {
                let facId = selectedCarrier.facilityId;
                try {
                    const parsed = JSON.parse(facId);
                    facId = Array.isArray(parsed) ? parsed[0] : parsed;
                } catch { }
                if (!selectedFacilities.includes(facId)) {
                    setSelectedFacilities(prev => [...prev, facId]);
                    addToast('Facility Assigned', `User linked to ${facilities.find(f => f.id === facId)?.name || 'Carrier Facility'}`, 'info');
                }
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const isCarrier = roles.find(r => r.id === role)?.name.toLowerCase().includes('carrier') || role.includes('carrier');
        if (isCarrier && !carrierId) {
            addToast('Error', 'Please select a carrier organization', 'error');
            return;
        }
        if (!isCarrier && selectedFacilities.length === 0) {
            addToast('Error', 'Please assign at least one facility', 'error');
            return;
        }

        const payload: any = {
            email,
            firstName,
            lastName,
            displayName: `${firstName} ${lastName}`.trim(),
            role,
            carrierId: isCarrier ? carrierId : null,
            assignedFacilities: selectedFacilities
        };
        if (!editingUser) {
            if (selectedFacilities && selectedFacilities.length > 0) {
                payload.facilityId = selectedFacilities[0];
            } else {
                payload.facilityId = facilities[0]?.id ?? null;
            }
        }

        try {
            if (editingUser) {
                await updateUser(editingUser.uid, payload);
                addToast('User Updated', `${payload.displayName} updated.`, 'success');
            } else {
                await addUser(payload);
                addToast('User Created', `${payload.displayName} created.`, 'success');
            }
            setIsModalOpen(false);
        } catch (err: any) {
            addToast('Error', err.message || 'Failed to save', 'error');
        }
    };

    const getRoleName = (roleId: string) => {
        const r = roles.find(ro => ro.id === roleId);
        return r ? r.name : roleId;
    };

    const getCarrierName = (cId: string) => {
        if (!cId) return '-';
        let c = allCarriers.find(car => car.id === cId || car.id.toLowerCase() === cId.toLowerCase() || car.name.toLowerCase() === cId.toLowerCase());
        return c ? c.name : cId;
    };

    const isCarrierRole = (roleId: string | undefined): boolean => {
        if (!roleId) return false;
        if (roleId === 'carrier') return true;
        const ro = roles.find(r => r.id === roleId);
        if (ro) return ro.name.toLowerCase().includes('carrier') || ro.id.toLowerCase().includes('carrier');
        return roleId.toLowerCase().includes('carrier');
    };

    const handleSort = (field: typeof sortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const handleDeleteClick = (uid: string) => {
        setUserToDelete(uid);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (userToDelete) {
            deleteUser(userToDelete);
            setUserToDelete(null);
            setIsDeleteModalOpen(false);
        }
    };

    return (
        <div className="p-8 h-full flex flex-col animate-in fade-in duration-500 overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tighter leading-tight">User Directory</h1>
                    <p className="text-muted text-lg opacity-70 font-medium italic">Manage institutional access and personnel roles.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:border-primary outline-none transition-all w-64 font-bold"
                        />
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-primary hover:bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center shadow-2xl shadow-primary/30 transition-all font-black uppercase tracking-widest text-xs active:scale-95"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add Account
                    </button>
                </div>
            </div>

            <GlassCard className="flex-1 overflow-hidden border-none shadow-xl rounded-[2.5rem] bg-surface/30 backdrop-blur-xl mb-6">
                <div className="h-full overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1100px]">
                        <thead>
                            <tr className="bg-muted/5 border-b border-border/50">
                                <th className="px-8 py-6 text-[10px] font-black text-muted uppercase tracking-widest cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('displayName')}>
                                    <div className="flex items-center gap-2">Display Name {sortField === 'displayName' && (sortOrder === 'asc' ? '↑' : '↓')}</div>
                                </th>
                                <th className="px-8 py-6 text-[10px] font-black text-muted uppercase tracking-widest cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('role')}>
                                    <div className="flex items-center gap-2">System Role {sortField === 'role' && (sortOrder === 'asc' ? '↑' : '↓')}</div>
                                </th>
                                <th className="px-8 py-6 text-[10px] font-black text-muted uppercase tracking-widest">Organization</th>
                                <th className="px-8 py-6 text-[10px] font-black text-muted uppercase tracking-widest">Authorized Facilities</th>
                                <th className="px-8 py-6 text-[10px] font-black text-muted uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {paginatedUsers.map(user => (
                                <tr key={user.uid} className="group hover:bg-muted/5 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg ${user.role === 'admin' ? 'bg-indigo-500' : user.role === 'carrier' ? 'bg-amber-500' : 'bg-primary'}`}>
                                                {(user.displayName || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-black text-foreground tracking-tight text-base leading-none mb-1">{user.displayName}</p>
                                                <p className="text-[10px] font-bold text-muted opacity-60 flex items-center gap-1.5 lowercase italic"><Mail className="w-3 h-3" /> {user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{getRoleName(user.role || 'user')}</span>
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md w-fit ${isCarrierRole(user.role) || user.carrierId ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'}`}>
                                                {isCarrierRole(user.role) || user.carrierId ? 'Partner' : 'Internal'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        {user.carrierId ? (
                                            <div className="flex items-center gap-2 text-sm font-black text-amber-600 dark:text-amber-400 tracking-tight">
                                                <Briefcase className="w-4 h-4 opacity-50" />
                                                {getCarrierName(user.carrierId)}
                                            </div>
                                        ) : (
                                            <span className="text-muted opacity-30 font-black uppercase text-[10px] tracking-widest">Internal Entity</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                                            {Array.isArray(user.assignedFacilities) && user.assignedFacilities.length > 0 ? (
                                                user.assignedFacilities.slice(0, 3).map(fid => {
                                                    const f = facilities.find(fac => fac.id === fid);
                                                    return <span key={fid} className="px-2 py-1 rounded bg-muted/5 border border-border text-[9px] font-bold text-muted truncate whitespace-nowrap">{f?.name || fid.slice(0, 8)}</span>
                                                })
                                            ) : (
                                                <span className="text-xs text-muted opacity-40 font-bold italic">No access assigned</span>
                                            )}
                                            {Array.isArray(user.assignedFacilities) && user.assignedFacilities.length > 3 && (
                                                <span className="text-[9px] font-black text-primary uppercase ml-1">+{user.assignedFacilities.length - 3} More</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenModal(user)} className="w-9 h-9 flex items-center justify-center bg-surface hover:bg-primary hover:text-white rounded-lg shadow-sm border border-border/50 transition-all text-muted" title="Edit"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDeleteClick(user.uid)} className="w-9 h-9 flex items-center justify-center bg-surface hover:bg-red-500 hover:text-white rounded-lg shadow-sm border border-border/50 transition-all text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredUsers.length / pageSize)}
                onPageChange={setCurrentPage}
                totalRecords={filteredUsers.length}
                pageSize={pageSize}
            />

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                isDirty={isDirty}
                title={editingUser ? 'Update Credentials' : 'Provision Access'}
                maxWidth="max-w-2xl"
            >
                {!editingUser && (
                    <div className="bg-primary/5 text-primary p-6 rounded-3xl text-[10px] font-black uppercase tracking-widest leading-relaxed mb-8 flex gap-4 border border-primary/10">
                        <AlertCircle className="w-6 h-6 shrink-0 opacity-60" />
                        <span>Security Protocol: Credentials must be initialized via "Forgot Password" by the recipient.</span>
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-2 px-1">First Name</label>
                            <input required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-muted/5 border border-border rounded-xl p-4 outline-none text-foreground font-black tracking-tight focus:border-primary transition-all" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-2 px-1">Last Name</label>
                            <input required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-muted/5 border border-border rounded-xl p-4 outline-none text-foreground font-black tracking-tight focus:border-primary transition-all" />
                        </div>
                    </div>
                    <div><label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-2 px-1">Email Terminal</label><input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-muted/5 border border-border rounded-xl p-4 outline-none text-foreground font-black tracking-tight focus:border-primary transition-all" disabled={!!editingUser} /></div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-2 px-1">Permissions Tier</label>
                        <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-muted/5 border border-border rounded-xl p-4 outline-none text-foreground font-black uppercase tracking-widest text-[11px] focus:border-primary transition-all cursor-pointer">
                            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>

                    {isCarrierRole(role) && (
                        <div className="p-6 bg-amber-500/5 rounded-3xl border border-amber-500/10">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-amber-600 mb-4 px-1">Organization Linkage</label>
                            {allCarriers.length > 0 ? (
                                <select value={carrierId} onChange={handleCarrierChange} className="w-full bg-surface border border-amber-500/20 rounded-xl p-4 outline-none text-foreground font-black tracking-tight text-lg shadow-sm">
                                    <option value="">-- Select Partner Entity --</option>
                                    {allCarriers.map(c => {
                                        const fac = facilities.find(f => f.id === c.facilityId);
                                        return <option key={c.id} value={c.name}>{c.name} ({fac?.name || 'All Yards'})</option>;
                                    })}
                                </select>
                            ) : (
                                <div className="text-red-500 font-black uppercase text-[9px] tracking-widest bg-red-500/5 p-4 rounded-xl border border-red-500/10">No carrier entities available.</div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-4 px-1">Nodal Access Authorization</label>
                        <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-4 bg-muted/5 border border-border rounded-2xl custom-scrollbar">
                            {facilities.map(f => (
                                <div key={f.id} onClick={() => toggleFacility(f.id)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border-2 ${selectedFacilities.includes(f.id) ? 'bg-primary/10 border-primary' : 'bg-surface border-transparent opacity-60'}`}>
                                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${selectedFacilities.includes(f.id) ? 'bg-primary' : 'border border-muted/30'}`}>{selectedFacilities.includes(f.id) && <Check className="w-3.5 h-3.5 text-white" />}</div>
                                    <span className="text-[10px] font-black tracking-tighter truncate uppercase">{f.name}</span>
                                </div>
                            ))}
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
                title="Deauthorise User"
                message="Are you sure you want to delete this user? This action will permanently revoke all system access across all assigned facilities."
            />
        </div>
    );
};
