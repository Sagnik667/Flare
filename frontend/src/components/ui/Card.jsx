import React from 'react';

export const Card = ({ children, className = '', hoverable = false, ...props }) => {
  return (
    <div
      className={`bg-bg-surface border border-border rounded-xl p-5 transition-all duration-200 ${
        hoverable ? 'hover:border-text-secondary hover:bg-bg-raised cursor-pointer shadow-md' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
