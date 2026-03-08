
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { User, LogOut, Settings, Camera, Upload, X, ChevronDown, Mail, User as UserIcon, Building, Sun, Moon } from 'lucide-react';
import { ModalPortal } from './ui/ModalPortal';

export const UserProfile: React.FC = () => {
    const { userProfile, signOut, updateUserProfile, isAdmin, currentCarrier } = useAuth();
    const { allowedFacilities, currentFacilityId, theme, toggleTheme } = useData();
    const [isOpen, setIsOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Edit State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [photo, setPhoto] = useState('');
    const [loading, setLoading] = useState(false);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const openEditModal = () => {
        setName(userProfile?.displayName || '');
        setEmail(userProfile?.email || '');
        setPhoto(userProfile?.photoURL || '');
        setIsOpen(false);
        setIsEditModalOpen(true);
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) setPhoto(ev.target.result as string);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateUserProfile({ displayName: name, email: email, photoURL: photo });
            setIsEditModalOpen(false);
        } catch (error: any) {
            alert("Failed to update profile: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const currentFacilityName = allowedFacilities.find(f => f.id === currentFacilityId)?.name || 'Admin Console';

    // Determine subtitle label: Carrier Name > Super Admin > Facility Name
    const subtitleLabel = currentCarrier
        ? currentCarrier.name
        : (isAdmin && !currentFacilityId ? 'Super Admin' : currentFacilityName);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 p-1.5 pr-3 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/10"
            >
                <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md relative">
                    {userProfile?.photoURL ? (
                        <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <span>{getInitials(userProfile?.displayName)}</span>
                    )}
                </div>
                <div className="hidden sm:block text-right">
                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">{userProfile?.displayName || 'User'}</p>
                    <p className="text-[10px] text-slate-500 dark:text-gray-400 leading-none mt-1 truncate max-w-[100px]">{subtitleLabel}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                    <div className="p-4 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{userProfile?.displayName || 'User'}</p>
                        <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{userProfile?.email}</p>
                    </div>

                    <div className="p-2">
                        <button
                            onClick={openEditModal}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <Settings className="w-4 h-4" /> Edit Profile
                        </button>
                        <div className="my-1 border-t border-slate-200 dark:border-white/5" />
                        <button
                            onClick={() => signOut()}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                        >
                            <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">Edit Profile</h2>
                                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-6 space-y-6">
                                <div className="flex justify-center">
                                    <div className="relative group cursor-pointer">
                                        <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-slate-100 dark:border-white/10 shadow-lg">
                                            {photo ? <img src={photo} alt="Preview" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-200 dark:bg-white/5 flex items-center justify-center text-slate-400"><User className="w-12 h-12" /></div>}
                                        </div>
                                        <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white font-bold text-xs backdrop-blur-sm">
                                            <Camera className="w-6 h-6 mb-1" />
                                            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                                        </label>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div><label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-gray-500 mb-2">Full Name</label><div className="relative"><UserIcon className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" /><input value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium" placeholder="Your Name" /></div></div>
                                    <div><label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-gray-500 mb-2">Email Address</label><div className="relative"><Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" /><input value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium" placeholder="your@email.com" /></div></div>

                                    <div className="pt-2 border-t border-slate-200 dark:border-white/5">
                                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-gray-500 mb-4">Appearance</label>
                                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                    {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">Dark Mode</p>
                                                    <p className="text-[10px] text-slate-500 dark:text-gray-400">Currently {theme === 'dark' ? 'Enabled' : 'Disabled'}</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={toggleTheme}
                                                className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${theme === 'dark' ? 'bg-[#3B82F6]' : 'bg-slate-300'}`}
                                            >
                                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${theme === 'dark' ? 'translate-x-6' : ''}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3.5 rounded-xl font-bold text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">Cancel</button>
                                    <button type="submit" disabled={loading} className="flex-1 bg-[#3B82F6] hover:bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed">{loading ? 'Saving...' : 'Save Changes'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
};
