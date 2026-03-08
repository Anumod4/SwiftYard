
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { RoleDefinition } from '../types';
import { ALL_PERMISSIONS } from '../constants';
import { Plus, Edit2, Trash2, Shield, Lock, Check, Eye } from 'lucide-react';
import { ModalPortal } from '../components/ui/ModalPortal';
import { Pagination } from '../components/ui/Pagination';
import { DeleteConfirmationModal } from '../components/ui/DeleteConfirmationModal';

export const AdminRoles: React.FC = () => {
    const { roles, addRole, updateRole, deleteRole, addToast } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
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

    const handleDeleteClick = (roleId: string) => {
        setRoleToDelete(roleId);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (roleToDelete) {
            try {
                await deleteRole(roleToDelete);
                addToast('Role Deleted', 'Role removed.', 'info');
            } catch (err: any) {
                addToast('Error', err.message || 'Failed to delete', 'error');
            }
            setRoleToDelete(null);
        }
    };

    return (
        <div className="p-8 h-full flex flex-col animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tighter leading-tight">Access Protocol</h1>
                    <p className="text-muted text-lg opacity-70 font-medium">Define user roles and functional UI permissions.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-primary hover:bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center shadow-2xl shadow-primary/30 transition-all font-black uppercase tracking-widest text-xs active:scale-95"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Role
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedRoles.map(role => (
                    <GlassCard key={role.id} className="p-8 relative group border-none shadow-xl hover:scale-[1.02] transition-all bg-surface/50 rounded-[2.5rem] flex flex-col h-full overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]"></div>
                        <div className="absolute top-6 right-6 flex gap-2 z-10 transition-all duration-500 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0">
                            <button onClick={() => handleOpenModal(role)} className="w-10 h-10 flex items-center justify-center bg-surface hover:bg-primary hover:text-white rounded-xl shadow-lg transition-all text-muted"><Edit2 className="w-4.5 h-4.5" /></button>
                            {!role.isSystem && (
                                <button onClick={() => handleDeleteClick(role.id)} className="w-10 h-10 flex items-center justify-center bg-surface hover:bg-red-500 hover:text-white rounded-xl shadow-lg transition-all text-red-600"><Trash2 className="w-4.5 h-4.5" /></button>
                            )}
                        </div>

                        <div className="flex items-center gap-6 mb-8 pl-4">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500/10 flex items-center justify-center text-indigo-600 shadow-lg shadow-indigo-500/5 group-hover:rotate-3 transition-transform">
                                {role.isSystem ? <Lock className="w-8 h-8" /> : <Shield className="w-8 h-8" />}
                            </div>
                            <div className="overflow-hidden">
                                <h3 className="font-black text-foreground text-xl tracking-tighter truncate leading-tight">{role.name}</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted opacity-40 truncate">{role.id}</p>
                            </div>
                        </div>

                        <p className="text-sm font-bold text-muted opacity-80 min-h-[40px] mb-8 pl-4 leading-relaxed">
                            {role.description || "No description provided."}
                        </p>

                        <div className="mt-auto pl-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-4 opacity-40">Active Permissions</p>
                            <div className="flex flex-wrap gap-2">
                                {role.permissions?.slice(0, 4).map(p => {
                                    const level = role.accessLevels?.[p];
                                    const isViewOnly = level === 'view';
                                    return (
                                        <span key={p} className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border-2 ${isViewOnly ? 'bg-muted/5 border-border/50 text-muted opacity-60' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600'}`}>
                                            {p.replace(/-/g, ' ')} {isViewOnly && '(View)'}
                                        </span>
                                    );
                                })}
                                {(role.permissions?.length || 0) > 4 && (
                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted border-2 border-border/50 px-3 py-1.5 rounded-full bg-muted/5">
                                        +{role.permissions!.length - 4} More
                                    </span>
                                )}
                                {(!role.permissions || role.permissions.length === 0) && <span className="text-[10px] text-red-400 font-black uppercase italic tracking-widest">No access assigned</span>}
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
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
                        <div className="bg-surface w-full max-w-2xl rounded-[3rem] border border-border p-12 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <h2 className="text-4xl font-black mb-10 text-foreground tracking-tighter">{editingRole ? 'Adapt Role' : 'Architect New Role'}</h2>
                            <form onSubmit={handleSave} className="space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">Unique Role ID</label>
                                        <input
                                            required
                                            value={id}
                                            onChange={e => setId(e.target.value)}
                                            disabled={!!editingRole}
                                            className={`w-full bg-muted/5 border border-border rounded-2xl p-4 outline-none text-foreground font-black tracking-tighter text-lg focus:border-primary transition-all shadow-sm ${editingRole ? 'opacity-40 cursor-not-allowed' : ''}`}
                                            placeholder="e.g. yard-supervisor"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">Display Designation</label>
                                        <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-muted/5 border border-border rounded-2xl p-4 outline-none text-foreground font-black tracking-tighter text-lg focus:border-primary transition-all shadow-sm" placeholder="e.g. Master Supervisor" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 px-1">Functional Description</label>
                                    <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-muted/5 border border-border rounded-[2rem] p-6 outline-none text-foreground font-bold leading-relaxed focus:border-primary transition-all h-24 shadow-sm" placeholder="Define the operational scope of this role..." />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-4 px-1">Permission Matrix & Access Levels</label>
                                    <div className="bg-muted/5 p-4 rounded-[2.5rem] border border-border/50 max-h-96 overflow-y-auto custom-scrollbar shadow-inner">
                                        {ALL_PERMISSIONS.map(item => {
                                            const isSelected = permissions.includes(item.id);
                                            const level = accessLevels[item.id] || 'edit';

                                            return (
                                                <div key={item.id} className={`flex items-center justify-between p-4 mb-2 rounded-2xl transition-all border-2 ${isSelected ? 'bg-surface border-indigo-500/30 shadow-md scale-[1.01]' : 'border-transparent opacity-60 hover:opacity-100 hover:bg-muted/5'}`}>
                                                    <div
                                                        onClick={() => togglePermission(item.id)}
                                                        className="flex items-center gap-4 cursor-pointer flex-1"
                                                    >
                                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-indigo-500 border-indigo-500 scale-110' : 'border-muted/30'}`}>
                                                            {isSelected && <Check className="w-4 h-4 text-white" />}
                                                        </div>
                                                        <span className={`text-sm font-black tracking-tight ${isSelected ? 'text-foreground' : 'text-muted'}`}>
                                                            {item.label}
                                                        </span>
                                                    </div>

                                                    {isSelected && (
                                                        <div className="flex bg-muted/10 rounded-xl p-1 ml-4 border border-border/50 shadow-sm">
                                                            <button
                                                                type="button"
                                                                onClick={() => setLevel(item.id, 'view')}
                                                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${level === 'view' ? 'bg-surface text-foreground shadow-sm' : 'text-muted opacity-40 hover:opacity-100'}`}
                                                            >
                                                                <Eye className="w-3.5 h-3.5" /> Read
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setLevel(item.id, 'edit')}
                                                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${level === 'edit' ? 'bg-indigo-500 text-white shadow-xl shadow-indigo-500/20' : 'text-muted opacity-40 hover:opacity-100'}`}
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" /> Full
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-6 pt-10 mt-6 border-t border-border/50">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted hover:text-foreground transition-colors">Dismiss</button>
                                    <button type="submit" className="px-12 py-5 bg-primary hover:bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/30 transition-all active:scale-95">Commit Architecture</button>
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
                title="Delete Role"
                message="Are you sure you want to delete this role? This will stop all users assigned to this role from accessing the permitted features."
            />
        </div>
    );
};
