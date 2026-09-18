import React from 'react';
import { Inbox, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title = 'Chưa có dữ liệu',
  description = 'Hiện tại hệ thống chưa ghi nhận bản ghi nào phù hợp.',
  onRetry,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 my-4 space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
        {icon || <Inbox size={24} />}
      </div>
      <h3 className="font-semibold text-slate-700 text-base">{title}</h3>
      <p className="text-xs text-slate-400 max-w-sm">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition"
        >
          <RefreshCw size={14} />
          <span>Thử lại</span>
        </button>
      )}
    </div>
  );
}
