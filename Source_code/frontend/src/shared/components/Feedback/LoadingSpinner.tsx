import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  className?: string;
}

export default function LoadingSpinner({
  message = 'Đang tải dữ liệu từ máy chủ...',
  size = 28,
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3 ${className}`}>
      <Loader2 size={size} className="animate-spin text-blue-600" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
