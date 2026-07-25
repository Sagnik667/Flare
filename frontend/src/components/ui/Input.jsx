import React from 'react';

export const Input = React.forwardRef(({
  label,
  error,
  type = 'text',
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`flex flex-col gap-1 w-full text-left ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        id={inputId}
        className={`w-full px-4 py-2.5 bg-bg-surface hover:bg-bg-raised text-text-primary border rounded-lg transition-colors placeholder:text-text-muted focus:bg-bg-raised focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-accent ${
          error ? 'border-danger focus:border-danger focus:ring-danger' : 'border-border'
        }`}
        {...props}
      />
      {error && (
        <span className="text-xs text-danger font-medium mt-0.5 animate-fadeIn" role="alert">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
