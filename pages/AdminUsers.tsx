import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { UserProfileData } from '../types';
import { Plus, Edit2, Trash2, Shield, Warehouse, Check, Briefcase, AlertCircle, Search } from 'lucide-react';
import { ModalPortal } from '../components/ui/ModalPortal';
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

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const paginatedUsers = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return allUsers.slice(start, start + pageSize);
    }, [allUsers, currentPage, pageSize]);

    useEffect(() => { performHousekeeping(); }, [performHousekeeping]);

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
        // Store carrier NAME as carrierId (not the ID)
        setCarrierId(cName);

        // Auto-assign the facility linked to this carrier if not already selected
        if (cName) {
            // Find carrier by name
            const selectedCarrier = allCarriers.find(c => c.name === cName);
            if (selectedCarrier && selectedCarrier.facilityId) {
                let facId = selectedCarrier.facilityId;
                // Handle if facilityId is JSON array
                try {
                    const parsed = JSON.parse(facId);
                    facId = Array.isArray(parsed) ? parsed[0] : parsed;
                } catch { }
                if (!selectedFacilities.includes(facId)) {
                    setSelectedFacilities(prev => [...prev, facId]);
                    addToast('Facility Assigned', `User linked to ${facilities.find(f => f.id === facId)?.name || 'Carrier Facility'} `, 'info');
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
            displayName: `${firstName} ${lastName} `.trim(),
            role,
            carrierId: isCarrier ? carrierId : null,
            assignedFacilities: selectedFacilities
        };
        // Ensure facilityId is sent for new users to avoid undefined on server side
        if (!editingUser) {
            // Prefer the first selected facility if user has multiple, else fallback to first facility in list
            if (selectedFacilities && selectedFacilities.length > 0) {
                payload.facilityId = selectedFacilities[0];
            } else {
                payload.facilityId = facilities[0]?.id ?? null;
            }
        }

        // No password required here, Clerk handles it

        try {
            if (editingUser) {
                await updateUser(editingUser.uid, payload);
                addToast('User Updated', `${payload.displayName} updated.`, 'success');
            } else {
                await addUser(payload);
                addToast('User Created', `${payload.displayName} created.They must use 'Forgot Password' to set their access.`, 'success');
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
        // Try exact match on ID
        let c = allCarriers.find(car => car.id === cId);
        // Try case-insensitive match on ID
        if (!c) c = allCarriers.find(car => car.id.toLowerCase() === cId.toLowerCase());
        // Try matching by name (carrierId now stores carrier name)
        if (!c) c = allCarriers.find(car => car.name.toLowerCase() === cId.toLowerCase());
        return c ? c.name : cId || 'Unknown';
    };

    // Logic to determine if a role is for a carrier
    const isCarrierRole = (roleId: string | undefined): boolean => {
        if (!roleId) return false;
        if (roleId === 'carrier') return true;
        const ro = roles.find(r => r.id === roleId);
        if (ro) return ro.name.toLowerCase().includes('carrier') || ro.id.toLowerCase().includes('carrier');
        return roleId.toLowerCase().includes('carrier');
    };

    const handleDeleteClick = (uid: string) => {
        setUserToDelete(uid);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (userToDelete) {
            deleteUser(userToDelete);
            setUserToDelete(null);
            setIsDeleteModalOpen(false); // Close modal after deletion
        }
    };

    return (
        <div className="p-8 h-full flex flex-col animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
                <div>
                    <h1 className="text-5xl font-black text-foreground mb-3 tracking-tighter leading-tight">User Directory</h1>
                    <p className="text-muted text-lg opacity-70 font-medium">Manage institutional access and personnel roles.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-primary hover:bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center shadow-2xl shadow-primary/30 transition-all font-black uppercase tracking-widest text-xs active:scale-95"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Account
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedUsers.map(user => (
                    <GlassCard key={user.uid} className="p-8 relative group h-full flex flex-col border-none shadow-xl hover:scale-[1.02] transition-all bg-surface/50 rounded-[2.5rem]">
                        <div className="absolute top-6 right-6 flex items-center gap-2 z-10 transition-all duration-500 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0">
                            <button
                                onClick={() => handleOpenModal(user)}
                                className="w-10 h-10 flex items-center justify-center bg-surface hover:bg-primary hover:text-white rounded-xl shadow-lg transition-all text-muted"
                                title="Edit"
                            >
                                <Edit2 className="w-4.5 h-4.5" />
                            </button>
                            <button
                                onClick={() => handleDeleteClick(user.uid)}
                                className="w-10 h-10 flex items-center justify-center bg-surface hover:bg-red-500 hover:text-white rounded-xl shadow-lg transition-all text-red-600"
                                title="Delete"
                            >
                                <Trash2 className="w-4.5 h-4.5" />
                            </button>
                        </div>
                        <div className="flex items-center gap-6 mb-8">
                            <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white font-black text-2xl shadow-xl transition-transform group-hover:rotate-3 ${user.role === 'admin' ? 'bg-indigo-500 shadow-indigo-500/20' : user.role === 'carrier' ? 'bg-amber-500 shadow-amber-500/20' : 'bg-primary shadow-primary/20'} `}>
                                {(user.displayName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                                <h3 className="font-black text-foreground text-xl tracking-tighter truncate leading-tight">{user.displayName}</h3>
                                <p className="text-xs font-bold text-muted opacity-60 truncate">{user.email}</p>
                            </div>
                        </div>
                        <div className="space-y-4 mt-auto">
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/5 border border-border/50">
                                <span className="text-[10px] text-muted font-black uppercase tracking-widest flex items-center gap-2">
                                    {isCarrierRole(user.role) || user.carrierId ? (
                                        <Briefcase className="w-3.5 h-3.5 text-amber-500" />
                                    ) : (
                                        <Warehouse className="w-3.5 h-3.5 text-primary" />
                                    )}
                                    Level
                                </span>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${isCarrierRole(user.role) || user.carrierId ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'} `}>
                                    {isCarrierRole(user.role) || user.carrierId ? 'Partner' : 'Internal'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/5 border border-border/50">
                                <span className="text-[10px] text-muted font-black uppercase tracking-widest flex items-center gap-2">
                                    <Shield className="w-3.5 h-3.5 text-muted" /> Access Role
                                </span>
                                <span className="text-sm font-black text-foreground tracking-tight">{getRoleName(user.role || 'user')}</span>
                            </div>
                            {user.carrierId && (
                                <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Organization</span>
                                        <Briefcase className="w-3.5 h-3.5 text-amber-500 opacity-40" />
                                    </div>
                                    <p className="font-black text-amber-700 dark:text-amber-400 text-sm mt-1 tracking-tighter truncate">{getCarrierName(user.carrierId || '')}</p>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                ))}
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(allUsers.length / pageSize)}
                onPageChange={setCurrentPage}
                totalRecords={allUsers.length}
                pageSize={pageSize}
            />

            {isModalOpen && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
                        <div className="bg-surface w-full max-w-2xl rounded-[3rem] p-12 shadow-2xl border border-border overflow-y-auto max-h-[90vh] custom-scrollbar">
                            <h2 className="text-4xl font-black mb-10 text-foreground tracking-tighter">{editingUser ? 'Edit User' : 'Provision New User'}</h2>

                            {!editingUser && (
                                <div className="bg-primary/5 text-primary p-6 rounded-[2rem] text-xs font-black uppercase tracking-widest leading-relaxed mb-10 flex gap-4 border border-primary/10 shadow-sm">
                                    <AlertCircle className="w-8 h-8 shrink-0 opacity-60" />
                                    <span>Passwords are handled securely via provider. New users must use "Forgot Password" to initialize their credentials.</span>
                                </div>
                            )}

                            <form onSubmit={handleSave} className="space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">First Name</label>
                                        <input required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-muted/5 border border-border rounded-2xl p-4 outline-none text-foreground font-bold focus:border-primary transition-all shadow-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">Last Name</label>
                                        <input required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-muted/5 border border-border rounded-2xl p-4 outline-none text-foreground font-bold focus:border-primary transition-all shadow-sm" />
                                    </div>
                                </div>
                                <div><label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">Email Address</label><input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-muted/5 border border-border rounded-2xl p-4 outline-none text-foreground font-bold focus:border-primary transition-all shadow-sm" disabled={!!editingUser} /></div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">System Access Level</label>
                                    <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-muted/5 border border-border rounded-2xl p-4 outline-none text-foreground focus:border-primary transition-all appearance-none font-black uppercase tracking-widest text-xs cursor-pointer shadow-sm">
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>

                                {isCarrierRole(role) && (
                                    <div className="animate-in slide-in-from-top-4 duration-500 p-6 bg-amber-500/5 rounded-3xl border border-amber-500/10">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-amber-600 mb-4 px-1">Partner Organization Assignment</label>
                                        {allCarriers.length > 0 ? (
                                            <select value={carrierId} onChange={handleCarrierChange} className="w-full bg-surface border border-amber-500/20 rounded-2xl p-4 outline-none text-foreground font-black tracking-tight text-lg shadow-xl cursor-not-allowed">
                                                <option value="">-- Select Partner Entity --</option>
                                                {allCarriers.map(c => {
                                                    const fac = facilities.find(f => f.id === c.facilityId);
                                                    return <option key={c.id} value={c.name}>{c.name} ({fac?.name || 'All Yards'})</option>;
                                                })}
                                            </select>
                                        ) : (
                                            <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest text-red-500">
                                                <AlertCircle className="w-5 h-5" />
                                                <span>No carrier entities defined. Create one first.</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-4 px-1">Authorized Facilities</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-64 overflow-y-auto p-6 bg-muted/5 border border-border rounded-[2rem] shadow-inner custom-scrollbar">
                                        {facilities.map(f => (
                                            <div key={f.id} onClick={() => toggleFacility(f.id)} className={`flex items-center gap-4 p-5 rounded-2xl cursor-pointer transition-all border-2 ${selectedFacilities.includes(f.id) ? 'bg-primary/10 border-primary shadow-lg scale-[1.02]' : 'bg-surface border-transparent hover:border-border/50 opacity-60'}`}>
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedFacilities.includes(f.id) ? 'bg-primary border-primary scale-110' : 'border-muted/30'}`}>{selectedFacilities.includes(f.id) && <Check className="w-4 h-4 text-white" />}</div>
                                                <span className="text-sm font-black tracking-tighter truncate">{f.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-6 pt-10 mt-6 border-t border-border/50">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted hover:text-foreground transition-colors">Dismiss</button>
                                    <button type="submit" className="px-12 py-5 bg-primary hover:bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/30 transition-all active:scale-95">Commit Changes</button>
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
                title="Delete User"
                message="Are you sure you want to delete this user? This action cannot be undone and will permanently remove their access to the system."
            />
        </div>
    );
};
