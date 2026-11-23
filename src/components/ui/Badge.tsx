import React from 'react';

export interface BadgeProps {
  variant?: 'default' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-surface-muted text-ink border border-border',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
    success: 'bg-[#E6F4F1] text-[#0F4E4A] border border-[#BDE3DB]',
    warning: 'bg-[#FEF6E7] text-[#874D00] border border-[#FADBA2]',
    danger: 'bg-danger-bg text-danger-text border border-[#FECDCA]',
    info: 'bg-[#EBF5FB] text-[#134E5E] border border-[#BCE1EE]',
  }[variant];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${variantStyles} ${className}`}
    >
      {children}
    </span>
  );
};
