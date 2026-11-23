import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-md transition-colors ' +
    'focus:outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2 ' +
    'disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer';

  const sizeClasses = {
    sm: 'h-9 px-3 text-xs gap-1.5',
    md: 'h-11 px-4 text-[15px] gap-2.5',
    lg: 'h-12 px-5 text-base gap-3',
  }[size];

  const variantClasses = {
    primary:
      'bg-petrol-900 text-white hover:bg-petrol-800 focus-visible:ring-teal-600/50',
    secondary:
      'bg-white text-ink border border-border hover:bg-surface-muted hover:border-border-strong focus-visible:ring-teal-600/30',
    danger:
      'bg-danger text-white hover:bg-[#912018] focus-visible:ring-danger/40',
    ghost:
      'bg-transparent text-ink hover:bg-surface-muted focus-visible:ring-teal-600/30',
  }[variant];

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
    >
      {isLoading && (
        <span
          className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
};
