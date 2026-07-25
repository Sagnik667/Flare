import React, { useState } from 'react';

export const Tooltip = ({ children, content, position = 'top', className = '' }) => {
  const [visible, setVisible] = useState(false);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={`absolute z-30 px-2.5 py-1 text-xs text-text-primary bg-bg-overlay border border-border rounded shadow-md whitespace-nowrap pointer-events-none ${positions[position]}`}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
