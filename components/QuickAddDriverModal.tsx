
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
            <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-[#1a1a1a]">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add New Driver</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5"/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Full Name *</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <input 
                                    required
                                    autoFocus
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#0a84ff]"
                                    placeholder="Driver Name"
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">License Number *</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <input 
                                    required
                                    value={license}
                                    onChange={e => setLicense(e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#0a84ff]"
                                    placeholder="License #"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Phone Number *</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <input 
                                    required
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#0a84ff]"
                                    placeholder="Phone"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Carrier</label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <select 
                                    value={carrierId}
                                    onChange={e => setCarrierId(e.target.value)}
                                    disabled={!!defaultCarrierId}
                                    className={`w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#0a84ff] appearance-none ${defaultCarrierId ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    <option value="">-- Independent / Unknown --</option>
                                    {carriers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            {defaultCarrierId && <p className="text-[10px] text-blue-500 mt-1 italic">* Automatically linked to your organization</p>}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white">Cancel</button>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="px-6 py-2 bg-[#0a84ff] hover:bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-70"
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
