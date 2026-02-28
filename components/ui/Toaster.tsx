
import React from 'react';
import { useData } from '../../contexts/DataContext';
import { CheckCircle2, AlertCircle, Info, X, ExternalLink, Send } from 'lucide-react';

export const Toaster: React.FC = () => {
  const { toasts, removeToast } = useData();

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <div 
          key={toast.id}
          className="bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 rounded-xl p-4 shadow-2xl flex items-start gap-3 pointer-events-auto animate-in slide-in-from-right-10 fade-in duration-300"
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> :
           toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" /> :
           <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />}
          
          <div className="flex-1">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">{toast.title}</h4>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 leading-relaxed whitespace-pre-wrap">{toast.message}</p>
            
            {toast.actionLabel && (
                <div className="mt-2">
                    {toast.onAction ? (
                        <button
                            onClick={() => {
                                if (toast.onAction) toast.onAction();
                                removeToast(toast.id);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                        >
                            <Send className="w-3 h-3" /> {toast.actionLabel}
                        </button>
                    ) : toast.actionLink ? (
                        <a 
                          href={toast.actionLink} 
                          target="_blank" 
                          rel="noreferrer"
                          onClick={() => removeToast(toast.id)}
                          className="inline-flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                            {toast.actionLabel} <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                    ) : null}
                </div>
            )}
          </div>

          <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
