
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
          ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(59,130,246,0.3)]'
          : 'bg-surface/60 border-border hover:border-muted/30 hover:bg-surface/80 shadow-sm backdrop-blur-md'
        }
        ${className}
      `}
    >
      {children}
    </div>
  );
};
