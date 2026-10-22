import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface AlertMessageProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose?: () => void;
  className?: string;
  center?: boolean;
}

export default function AlertMessage({
  type,
  message,
  onClose,
  className = '',
  center,
}: AlertMessageProps) {
  if (!message) return null;

  const config = {
    success: {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      icon: <CheckCircle2 size={17} className="text-emerald-600 shrink-0" />,
    },
    error: {
      bg: 'bg-red-50 text-red-800 border-red-200',
      icon: <AlertCircle size={17} className="text-red-600 shrink-0" />,
    },
    info: {
      bg: 'bg-blue-50 text-blue-800 border-blue-200',
      icon: <Info size={17} className="text-blue-600 shrink-0" />,
    },
  }[type];

  const isCentered = center ?? (type === 'success' && !onClose);

  return (
    <div
      className={`p-3 rounded-xl border flex items-center ${
        isCentered ? 'justify-center text-center' : 'justify-between'
      } gap-2.5 text-xs sm:text-sm ${config.bg} ${className}`}
    >
      <div className={`flex items-center gap-2 ${isCentered ? 'justify-center' : ''}`}>
        {config.icon}
        <span className="font-semibold">{message}</span>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="opacity-60 hover:opacity-100 transition p-1 shrink-0 cursor-pointer"
          aria-label="Đóng thông báo"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
