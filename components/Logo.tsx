
import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-10 h-10" }) => {
  return (
    <img 
      src="/logo.png" 
      alt="SwiftYard Logo" 
      className={`object-contain ${className}`}
      onError={(e) => {
        console.warn("Logo failed to load");
        e.currentTarget.style.display = 'none';
      }}
    />
  );
};
