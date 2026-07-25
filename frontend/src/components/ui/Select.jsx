import React from 'react';

export const Select = React.forwardRef(({
  label,
  error,
  options = [],
  className = '',
  id,
  placeholder,
  ...props
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`flex flex-col gap-1 w-full text-left ${className}`}>
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={`w-full px-4 py-2.5 bg-bg-surface hover:bg-bg-raised text-text-primary border rounded-lg appearance-none transition-colors focus:bg-bg-raised focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-accent ${
            error ? 'border-danger focus:border-danger focus:ring-danger' : 'border-border'
          }`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-secondary">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
      {error && (
        <span className="text-xs text-danger font-medium mt-0.5" role="alert">
          {error}
        </span>
      )}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
