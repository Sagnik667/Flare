import React from 'react';

export const Button = React.forwardRef(({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  type = 'button',
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const variants = {
    primary: 'bg-accent hover:bg-accent-light text-white shadow-lg shadow-accent/20 active:bg-accent-dark',
    secondary: 'bg-bg-raised hover:bg-bg-overlay text-text-primary border border-border hover:border-text-muted active:bg-bg-base',
    danger: 'bg-danger hover:bg-red-600 text-white shadow-lg shadow-danger/20 active:bg-sos-dark',
    sos: 'bg-sos hover:bg-sos-pulse text-white shadow-sos shadow-red-900/60 font-bold uppercase tracking-wider animate-pulse hover:animate-none',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-raised active:bg-bg-base',
    outline: 'bg-transparent text-accent hover:bg-accent/10 border border-accent hover:border-accent-light',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg rounded-xl',
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading...
        </>
      ) : (
        <>
          {Icon && <Icon className={`h-4 w-4 ${children ? 'mr-2' : ''}`} />}
          {children}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
