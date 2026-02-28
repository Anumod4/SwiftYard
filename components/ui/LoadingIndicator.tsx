import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingIndicatorProps {
  message?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  message = 'Processing...', 
  fullScreen = false,
  overlay = true 
}) => {
  const containerClass = fullScreen 
    ? 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm'
    : 'flex items-center justify-center p-4';

  const contentClass = overlay
    ? 'bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-6 flex flex-col items-center gap-4 min-w-[200px]'
    : 'flex items-center gap-3';

  return (
    <div className={containerClass}>
      <div className={contentClass}>
        <div className="relative">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <div className="absolute inset-0 w-10 h-10 border-2 border-blue-200 dark:border-blue-900 rounded-full animate-ping opacity-30" />
        </div>
        {message && (
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 animate-pulse">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

// Inline loading spinner for buttons and small areas
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };
  
  return (
    <Loader2 className={`${sizeClasses[size]} text-white animate-spin`} />
  );
};
