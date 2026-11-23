import React from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0F2E33]/40 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-white rounded-md border border-border w-full ${maxWidth} my-8 shadow-sm flex flex-col`}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="font-display text-lg font-bold text-ink tracking-tight">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-muted mt-0.5">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted hover:text-ink rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
