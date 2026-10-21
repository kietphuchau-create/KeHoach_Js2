import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface AlertMessageProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose?: () => void;
  className?: string;
}

export default function AlertMessage({
  type,
  message,
  onClose,
  className = '',
}: AlertMessageProps) {
  if (!message) return null;

  const config = {
    success: {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />,
    },
    error: {
      bg: 'bg-red-50 text-red-800 border-red-200',
      icon: <AlertCircle size={18} className="text-red-600 shrink-0" />,
    },
    info: {
      bg: 'bg-blue-50 text-blue-800 border-blue-200',
      icon: <Info size={18} className="text-blue-600 shrink-0" />,
    },
  }[type];

  return (
    <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm ${config.bg} ${className}`}>
      <div className="flex items-center gap-2.5">
        {config.icon}
        <span className="font-medium">{message}</span>
      </div>
      {onClose && (
        <button onClick={onClose} className="opacity-60 hover:opacity-100 transition p-1">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
