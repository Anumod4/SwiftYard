
import React, { useState, useEffect } from 'react';
import { ModalPortal } from './ui/ModalPortal';
import { X, Plus, Trash2, Save, AlertCircle } from 'lucide-react';

export interface BulkColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  required?: boolean;
  options?: { value: string; label: string }[]; // For select type
  defaultValue?: any;
  placeholder?: string;
}

interface BulkCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  columns: BulkColumn[];
  onSubmit: (data: any[]) => Promise<void>;
}

export const BulkCreatorModal: React.FC<BulkCreatorModalProps> = ({ 
  isOpen, onClose, title, subtitle, columns, onSubmit 
}) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize with 5 empty rows
  useEffect(() => {
    if (isOpen) {
      const initialRow = {};
      columns.forEach(c => initialRow[c.key] = c.defaultValue || '');
      setRows(Array(5).fill(null).map(() => ({ ...initialRow, _tempId: Math.random() })));
      setError('');
    }
  }, [isOpen, columns]);

  const handleAddRow = () => {
    const newRow: any = { _tempId: Math.random() };
    columns.forEach(c => newRow[c.key] = c.defaultValue || '');
    setRows([...rows, newRow]);
  };

  const handleRemoveRow = (index: number) => {
    const newRows = [...rows];
    newRows.splice(index, 1);
    setRows(newRows);
  };

  const handleChange = (index: number, key: string, value: any) => {
    const newRows = [...rows];
    newRows[index][key] = value;
    setRows(newRows);
  };

  const handleSubmit = async () => {
    setError('');
    
    // Filter out completely empty rows
    const activeRows = rows.filter(row => {
        // Check if at least one required field has data, or just check if the row isn't practically empty
        return columns.some(c => row[c.key] && row[c.key].toString().trim() !== '');
    });

    if (activeRows.length === 0) {
        setError("Please enter data in at least one row.");
        return;
    }

    // Validation
    for (let i = 0; i < activeRows.length; i++) {
        const row = activeRows[i];
        for (const col of columns) {
            if (col.required && (!row[col.key] || row[col.key].toString().trim() === '')) {
                setError(`Row ${i + 1}: ${col.label} is required.`);
                return;
            }
        }
    }

    setLoading(true);
    try {
        // Strip internal _tempId before submitting
        const cleanData = activeRows.map(({ _tempId, ...rest }) => rest);
        await onSubmit(cleanData);
        onClose();
    } catch (err: any) {
        console.error(err);
        setError("Failed to save data. " + (err.message || ''));
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-[#1a1a1a]">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">{subtitle}</p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
              <X className="w-6 h-6"/>
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mx-6 mt-6 bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-bold">
                <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {/* Table Area */}
          <div className="p-6 overflow-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className="p-3 w-12 text-center text-xs font-bold text-slate-400">#</th>
                  {columns.map(col => (
                    <th key={col.key} className="p-3 text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                      {col.label} {col.required && <span className="text-red-500">*</span>}
                    </th>
                  ))}
                  <th className="p-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {rows.map((row, idx) => (
                  <tr key={row._tempId} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-3 text-center text-xs text-slate-400 font-mono">{idx + 1}</td>
                    {columns.map(col => (
                      <td key={col.key} className="p-2">
                        {col.type === 'select' ? (
                          <select
                            value={row[col.key]}
                            onChange={(e) => handleChange(idx, col.key, e.target.value)}
                            className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 outline-none"
                          >
                            <option value="">Select...</option>
                            {col.options?.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={col.type}
                            value={row[col.key]}
                            onChange={(e) => handleChange(idx, col.key, e.target.value)}
                            placeholder={col.placeholder}
                            className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 outline-none"
                          />
                        )}
                      </td>
                    ))}
                    <td className="p-2 text-center">
                      <button 
                        onClick={() => handleRemoveRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-50 group-hover:opacity-100"
                        tabIndex={-1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <button 
              onClick={handleAddRow}
              className="mt-4 flex items-center gap-2 text-blue-500 hover:text-blue-600 font-bold text-sm px-2 py-1 rounded hover:bg-blue-500/10 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Row
            </button>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3 bg-slate-50 dark:bg-[#1a1a1a]">
            <button 
              onClick={onClose} 
              className="px-6 py-3 rounded-xl font-bold text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : <><Save className="w-4 h-4" /> Save All Records</>}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
