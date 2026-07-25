import React from 'react';

export const Skeleton = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse bg-bg-raised rounded-md ${className}`}
      {...props}
    />
  );
};

export default Skeleton;
