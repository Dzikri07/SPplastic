import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  id?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  id,
  children,
  className = '',
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-ink mb-1.5">
          {label}
        </label>
      )}
      <select
        id={selectId}
        {...props}
        className={`w-full h-11 px-3.5 rounded-md border bg-white text-[15px] text-ink transition-colors hover:border-border-strong focus:outline-none focus:border-teal-600 focus:ring-[3px] focus:ring-teal-600/20 disabled:bg-surface-muted disabled:text-muted ${
          error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-border'
        } ${className}`}
      >
        {children}
      </select>
      {error ? (
        <p className="mt-1.5 text-xs text-danger-text">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-muted">{helperText}</p>
      ) : null}
    </div>
  );
};
