
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick, active = false }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl border transition-all duration-300
        ${active 
          ? 'bg-[#0a84ff]/10 border-[#0a84ff] shadow-[0_0_20px_rgba(10,132,255,0.3)]' 
          : 'bg-white/60 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-white/80 dark:hover:bg-white/10 shadow-sm dark:shadow-lg backdrop-blur-md'
        }
        ${className}
      `}
    >
      {children}
    </div>
  );
};
