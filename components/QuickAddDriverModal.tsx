
import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { ModalPortal } from './ui/ModalPortal';
import { X, User, FileText, Phone, Briefcase, Check } from 'lucide-react';

interface QuickAddDriverModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (driverId: string, name: string, carrierId?: string) => void;
    defaultCarrierId?: string;
}

export const QuickAddDriverModal: React.FC<QuickAddDriverModalProps> = ({ isOpen, onClose, onSuccess, defaultCarrierId }) => {
    const { addDriver, carriers } = useData();
    const [name, setName] = useState('');
    const [license, setLicense] = useState('');
    const [phone, setPhone] = useState('');
    const [carrierId, setCarrierId] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (defaultCarrierId) {
                setCarrierId(defaultCarrierId);
            } else {
                setCarrierId('');
            }
            // Reset other fields
            setName('');
            setLicense('');
            setPhone('');
        }
    }, [isOpen, defaultCarrierId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !license || !phone) return;

        setLoading(true);
        try {
            const newId = await addDriver({
                name,
                licenseNumber: license,
                phone,
                carrierId: carrierId || undefined
            });
            // Pass back details directly to avoid waiting for global state refresh in parent
            onSuccess(newId, name, carrierId || undefined);
            onClose();
            // Reset form
            setName('');
            setLicense('');
            setPhone('');
            setCarrierId('');
        } catch (err) {
            console.error(err);
            alert("Failed to add driver. Please check console.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-surface w-full max-w-md rounded-[2rem] shadow-2xl border border-border overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                    <div className="p-6 border-b border-border flex justify-between items-center bg-muted/5">
                        <h2 className="text-xl font-black text-foreground tracking-tight">Add New Driver</h2>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/10 text-muted transition-colors"><X className="w-5 h-5" /></button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-muted mb-2 uppercase tracking-[0.2em] opacity-60">Full Name *</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/40" />
                                    <input
                                        required
                                        autoFocus
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full bg-muted/5 border border-border rounded-2xl pl-12 pr-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold"
                                        placeholder="Driver Name"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-muted mb-2 uppercase tracking-[0.2em] opacity-60">License Number *</label>
                                <div className="relative">
                                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/40" />
                                    <input
                                        required
                                        value={license}
                                        onChange={e => setLicense(e.target.value)}
                                        className="w-full bg-muted/5 border border-border rounded-2xl pl-12 pr-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold"
                                        placeholder="License #"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-muted mb-2 uppercase tracking-[0.2em] opacity-60">Phone Number *</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/40" />
                                    <input
                                        required
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="w-full bg-muted/5 border border-border rounded-2xl pl-12 pr-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold"
                                        placeholder="Phone"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-muted mb-2 uppercase tracking-[0.2em] opacity-60">Carrier</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/40" />
                                    <select
                                        value={carrierId}
                                        onChange={e => setCarrierId(e.target.value)}
                                        disabled={!!defaultCarrierId}
                                        className={`w-full bg-muted/5 border border-border rounded-2xl pl-12 pr-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold appearance-none ${defaultCarrierId ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        <option value="">-- Independent / Unknown --</option>
                                        {carriers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                {defaultCarrierId && <p className="text-[10px] text-primary mt-2 flex items-center gap-1 font-black uppercase tracking-widest opacity-60">* Linked to organization</p>}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button type="button" onClick={onClose} className="px-6 py-3 text-sm font-black uppercase tracking-widest text-muted hover:text-foreground transition-colors">Cancel</button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-8 py-3 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 flex items-center gap-2 disabled:opacity-70 transition-all active:scale-95"
                            >
                                {loading ? 'Saving...' : <><Check className="w-4 h-4" /> Save Driver</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </ModalPortal>
    );
};
