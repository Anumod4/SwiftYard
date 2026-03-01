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
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">User Management</h1>
                    <p className="text-slate-500 dark:text-gray-400">Control system access and carrier assignments.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl flex items-center shadow-lg shadow-purple-500/30 transition-all font-medium"><Plus className="w-5 h-5 mr-2" />Add User</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedUsers.map(user => (
                    <GlassCard key={user.uid} className="p-6 relative group">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenModal(user)} className="p-2 bg-slate-100 dark:bg-white/10 hover:bg-blue-500 hover:text-white rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteClick(user.uid)} className="p-2 bg-slate-100 dark:bg-white/10 hover:bg-red-500 hover:text-white rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`w - 12 h - 12 rounded - full flex items - center justify - center text - white font - bold text - lg ${user.role === 'admin' ? 'bg-purple-500' : user.role === 'carrier' ? 'bg-amber-500' : 'bg-blue-500'} `}>{(user.displayName || 'U').charAt(0).toUpperCase()}</div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">{user.displayName}</h3>
                                <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm bg-slate-50 dark:bg-white/5 p-2 rounded">
                                <span className="text-slate-500 flex items-center gap-2">
                                    {isCarrierRole(user.role) || user.carrierId ? (
                                        <Briefcase className="w-4 h-4 text-amber-500" />
                                    ) : (
                                        <Warehouse className="w-4 h-4 text-blue-500" />
                                    )}
                                    Type
                                </span>
                                <span className={`font - black uppercase text - [10px] px - 2 py - 0.5 rounded ${isCarrierRole(user.role) || user.carrierId ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'} `}>
                                    {isCarrierRole(user.role) || user.carrierId ? 'Carrier User' : 'Yard User'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm bg-slate-50 dark:bg-white/5 p-2 rounded">
                                <span className="text-slate-500 flex items-center gap-2"><Shield className="w-4 h-4" /> Role</span>
                                <span className="font-bold uppercase text-[10px]">{getRoleName(user.role || 'user')}</span>
                            </div>
                            {user.carrierId && (
                                <div className="flex items-center justify-between text-sm bg-amber-50 dark:bg-amber-500/10 p-2 rounded">
                                    <span className="text-amber-600 flex items-center gap-2"><Briefcase className="w-4 h-4" /> Carrier</span>
                                    <span className="font-bold text-amber-700 dark:text-amber-400 text-xs">{getCarrierName(user.carrierId || '')}</span>
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
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-white/10">
                            <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">{editingUser ? 'Edit User' : 'New User'}</h2>

                            {!editingUser && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-lg text-xs font-medium mb-4 flex gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>User will be provisioned without a password. They must use the "Forgot Password" link on the login page to set their access.</span>
                                </div>
                            )}

                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">First Name</label><input required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 outline-none text-slate-900 dark:text-white" /></div>
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Last Name</label><input required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 outline-none text-slate-900 dark:text-white" /></div>
                                </div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">Email</label><input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 outline-none text-slate-900 dark:text-white" disabled={!!editingUser} /></div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Role</label>
                                    <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 outline-none text-slate-900 dark:text-white">
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                {isCarrierRole(role) && (
                                    <div className="animate-in slide-in-from-top-2 duration-300">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Assign to Carrier Organization</label>
                                        {allCarriers.length > 0 ? (
                                            <select value={carrierId} onChange={handleCarrierChange} className="w-full bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/20 rounded-lg p-2.5 outline-none text-slate-900 dark:text-white">
                                                <option value="">-- Choose Carrier Organization --</option>
                                                {allCarriers.map(c => {
                                                    const fac = facilities.find(f => f.id === c.facilityId);
                                                    return <option key={c.id} value={c.name}>{c.name} ({fac?.name || 'Unknown'})</option>;
                                                })}
                                            </select>
                                        ) : (
                                            <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-500/20 p-3 rounded-lg flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
                                                <AlertCircle className="w-4 h-4" />
                                                <span>No carriers found. Please create a Carrier first.</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {/* Invitation UI removed: emails will not be sent now */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2">Facility Access</label>
                                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-slate-200 dark:border-white/10 rounded-lg">
                                        {facilities.map(f => (
                                            <div key={f.id} onClick={() => toggleFacility(f.id)} className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${selectedFacilities.includes(f.id) ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-gray-400'}`}>
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedFacilities.includes(f.id) ? 'bg-purple-500 border-purple-500' : 'border-slate-300'}`}>{selectedFacilities.includes(f.id) && <Check className="w-3 h-3 text-white" />}</div>
                                                <span className="text-sm">{f.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10 mt-4">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 hover:text-slate-900 font-bold text-sm">Cancel</button>
                                    <button type="submit" className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm shadow-lg">Save User</button>
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
