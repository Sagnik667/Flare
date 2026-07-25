import React from 'react';

export const EmptyState = ({ title, description, icon: Icon, action, className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-bg-surface border border-border border-dashed rounded-xl ${className}`}>
      {Icon && <Icon className="h-10 w-10 text-text-secondary mb-3" />}
      <h3 className="text-base font-bold text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-secondary max-w-sm mb-4">{description}</p>
      {action && action}
    </div>
  );
};

export default EmptyState;
