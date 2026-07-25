import React from 'react';

export const Badge = ({ children, className = '', variant = 'secondary' }) => {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors select-none';
  const variants = {
    primary: 'bg-accent/15 text-accent-light border-accent/30',
    secondary: 'bg-bg-raised text-text-secondary border-border',
    success: 'bg-success/15 text-success border-success/30',
    warning: 'bg-warning/15 text-warning border-warning/30',
    danger: 'bg-danger/15 text-danger border-danger/30',
    info: 'bg-info/15 text-info border-info/30',
  };
  return (
    <span className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
