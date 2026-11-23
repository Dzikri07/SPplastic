import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  id?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  id,
  className = '',
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-ink mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        className={`w-full h-11 px-3.5 rounded-md border bg-white text-[15px] text-ink placeholder:text-subtle transition-colors hover:border-border-strong focus:outline-none focus:border-teal-600 focus:ring-[3px] focus:ring-teal-600/20 disabled:bg-surface-muted disabled:text-muted ${
          error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-border'
        } ${className}`}
      />
      {error ? (
        <p className="mt-1.5 text-xs text-danger-text">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-muted">{helperText}</p>
      ) : null}
    </div>
  );
};
