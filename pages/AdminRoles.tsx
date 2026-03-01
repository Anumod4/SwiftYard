
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { RoleDefinition } from '../types';
import { ALL_PERMISSIONS } from '../constants';
import { Plus, Edit2, Trash2, Shield, Lock, Check, Eye } from 'lucide-react';
import { ModalPortal } from '../components/ui/ModalPortal';
import { Pagination } from '../components/ui/Pagination';

export const AdminRoles: React.FC = () => {
    const { roles, addRole, updateRole, deleteRole, addToast } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);

    const [id, setId] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [permissions, setPermissions] = useState<string[]>([]);
    const [accessLevels, setAccessLevels] = useState<Record<string, 'view' | 'edit'>>({});

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const paginatedRoles = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return roles.slice(start, start + pageSize);
    }, [roles, currentPage, pageSize]);

    const handleOpenModal = (role?: RoleDefinition) => {
        if (role) {
            setEditingRole(role);
            setId(role.id);
            setName(role.name);
            setDescription(role.description || '');
            setPermissions(role.permissions || []);

            // Ensure state accessLevels is fully populated for all permissions.
            // Default to 'edit' if a permission exists but has no explicit level (Legacy/Default behavior).
            const initialLevels = { ...(role.accessLevels || {}) };
            (role.permissions || []).forEach(p => {
                if (!initialLevels[p]) initialLevels[p] = 'edit';
            });
            setAccessLevels(initialLevels);
        } else {
            setEditingRole(null);
            setId('');
            setName('');
            setDescription('');
            setPermissions([]);
            setAccessLevels({});
        }
        setIsModalOpen(true);
    };

    const togglePermission = (permId: string) => {
        setPermissions(prev => {
            if (prev.includes(permId)) {
                // Removing permission
                const newLevels = { ...accessLevels };
                delete newLevels[permId];
                setAccessLevels(newLevels);
                return prev.filter(p => p !== permId);
            } else {
                // Adding permission - Default to 'view' for safety when explicitly adding
                const newLevels = { ...accessLevels, [permId]: 'view' } as Record<string, 'view' | 'edit'>;
                setAccessLevels(newLevels);
                return [...prev, permId];
            }
        });
    };

    const setLevel = (permId: string, level: 'view' | 'edit') => {
        setAccessLevels(prev => ({ ...prev, [permId]: level } as Record<string, 'view' | 'edit'>));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        const cleanId = id.trim().toLowerCase().replace(/\s+/g, '-');
        if (!cleanId || !name) {
            addToast('Validation Error', 'Role ID and Name are required.', 'error');
            return;
        }

        const payload = {
            id: cleanId,
            name,
            description,
            isSystem: editingRole?.isSystem || false,
            permissions,
            accessLevels
        };

        try {
            if (editingRole) {
                await updateRole(payload);
                addToast('Role Updated', `${name} updated successfully.`, 'success');
            } else {
                if (roles.some(r => r.id === cleanId)) {
                    addToast('Error', 'Role ID already exists.', 'error');
                    return;
                }
                await addRole(payload);
                addToast('Role Added', `${name} created successfully.`, 'success');
            }
            setIsModalOpen(false);
        } catch (err: any) {
            addToast('Error', err.message, 'error');
        }
    };

    const handleDelete = async (roleId: string) => {
        if (!window.confirm("Are you sure you want to delete this role?")) return;
        try {
            await deleteRole(roleId);
            addToast('Role Deleted', 'Role removed.', 'info');
        } catch (err: any) {
            addToast('Error', err.message || 'Failed to delete', 'error');
        }
    };

    return (
        <div className="p-8 h-full flex flex-col animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Role Management</h1>
                    <p className="text-slate-500 dark:text-gray-400">Define user roles and UI permissions.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl flex items-center shadow-lg shadow-purple-500/30 transition-all active:scale-95 font-medium"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Role
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedRoles.map(role => (
                    <GlassCard key={role.id} className="p-6 relative group border-l-4 border-l-purple-500 flex flex-col h-full">
                        <div className="absolute top-4 right-4 flex gap-2">
                            <button onClick={() => handleOpenModal(role)} className="p-2 bg-slate-100 dark:bg-white/10 hover:bg-blue-500 hover:text-white rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                            {!role.isSystem && (
                                <button onClick={() => handleDelete(role.id)} className="p-2 bg-slate-100 dark:bg-white/10 hover:bg-red-500 hover:text-white rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                            )}
                        </div>

                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                {role.isSystem ? <Lock className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-lg">{role.name}</h3>
                                <p className="text-xs font-mono text-slate-500">{role.id}</p>
                            </div>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-gray-300 min-h-[40px] mb-4">
                            {role.description || "No description provided."}
                        </p>

                        <div className="mt-auto">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Access</p>
                            <div className="flex flex-wrap gap-1">
                                {role.permissions?.slice(0, 5).map(p => {
                                    const level = role.accessLevels?.[p];
                                    const isViewOnly = level === 'view';
                                    return (
                                        <span key={p} className={`text-[10px] px-2 py-1 rounded border ${isViewOnly ? 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500' : 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400'}`}>
                                            {p} {isViewOnly && '(View)'}
                                        </span>
                                    );
                                })}
                                {(role.permissions?.length || 0) > 5 && <span className="text-[10px] text-slate-400 px-1">+{role.permissions!.length - 5} more</span>}
                                {(!role.permissions || role.permissions.length === 0) && <span className="text-[10px] text-red-400 italic">No access defined</span>}
                            </div>
                        </div>
                    </GlassCard>
                ))}
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(roles.length / pageSize)}
                onPageChange={setCurrentPage}
                totalRecords={roles.length}
                pageSize={pageSize}
            />

            {isModalOpen && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">{editingRole ? 'Edit Role' : 'New Role'}</h2>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Role ID {editingRole && '(Read Only)'}</label>
                                    <input
                                        required
                                        value={id}
                                        onChange={e => setId(e.target.value)}
                                        disabled={!!editingRole}
                                        className={`w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 outline-none focus:border-purple-500 text-slate-900 dark:text-white ${editingRole ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        placeholder="e.g. supervisor"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Display Name</label>
                                    <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 outline-none focus:border-purple-500 text-slate-900 dark:text-white" placeholder="e.g. Shift Supervisor" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                                    <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 outline-none focus:border-purple-500 text-slate-900 dark:text-white h-20 resize-none" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2">Permissions & Access Level</label>
                                    <div className="bg-slate-50 dark:bg-black/20 p-1 rounded-xl border border-slate-200 dark:border-white/10 max-h-80 overflow-y-auto custom-scrollbar">
                                        {ALL_PERMISSIONS.map(item => {
                                            const isSelected = permissions.includes(item.id);
                                            // IMPORTANT: Default to 'edit' if not present, to match backend logic and show true status
                                            const level = accessLevels[item.id] || 'edit';

                                            return (
                                                <div key={item.id} className={`flex items-center justify-between p-3 mb-1 rounded-lg transition-colors ${isSelected ? 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5' : 'hover:bg-slate-200 dark:hover:bg-white/5'}`}>
                                                    <div
                                                        onClick={() => togglePermission(item.id)}
                                                        className="flex items-center gap-3 cursor-pointer flex-1"
                                                    >
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-slate-300 dark:border-white/20'}`}>
                                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                                        </div>
                                                        <span className={`text-sm font-medium ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-gray-400'}`}>
                                                            {item.label}
                                                        </span>
                                                    </div>

                                                    {isSelected && (
                                                        <div className="flex bg-slate-100 dark:bg-black/40 rounded-lg p-0.5 ml-2 border border-slate-200 dark:border-white/10">
                                                            <button
                                                                type="button"
                                                                onClick={() => setLevel(item.id, 'view')}
                                                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1 ${level === 'view' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                            >
                                                                <Eye className="w-3 h-3" /> View Only
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setLevel(item.id, 'edit')}
                                                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1 ${level === 'edit' ? 'bg-purple-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                            >
                                                                <Edit2 className="w-3 h-3" /> Full Access
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white font-bold text-sm">Cancel</button>
                                    <button type="submit" className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm shadow-lg">Save Role</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
};
