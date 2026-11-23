import React from 'react';

export interface AlertProps {
  variant?: 'danger' | 'warning' | 'info' | 'success';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'danger',
  title,
  children,
  className = '',
}) => {
  const variantStyles = {
    danger: 'border-l-2 border-danger bg-danger-bg text-danger-text',
    warning: 'border-l-2 border-amber-400 bg-amber-50 text-[#7A4B06]',
    info: 'border-l-2 border-teal-600 bg-teal-50 text-[#0F4E4A]',
    success: 'border-l-2 border-teal-600 bg-[#EDFAF7] text-[#0F4E4A]',
  }[variant];

  return (
    <div role="alert" className={`px-3.5 py-2.5 text-sm ${variantStyles} ${className}`}>
      {title && <p className="font-semibold mb-0.5">{title}</p>}
      <div>{children}</div>
    </div>
  );
};
