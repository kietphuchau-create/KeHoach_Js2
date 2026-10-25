import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface AlertMessageProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose?: () => void;
  className?: string;
  center?: boolean;
  pinned?: boolean;
  autoDismissDuration?: number;
}

export default function AlertMessage({
  type,
  message,
  onClose,
  className = '',
  center,
  pinned = false,
  autoDismissDuration = 5000,
}: AlertMessageProps) {
  useEffect(() => {
    if (!pinned || !onClose || !message) return;
    const timer = setTimeout(() => {
      onClose();
    }, autoDismissDuration);
    return () => clearTimeout(timer);
  }, [pinned, onClose, message, autoDismissDuration]);

  if (!message) return null;

  const config = {
    success: {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      icon: <CheckCircle2 size={17} className="text-emerald-600 shrink-0" />,
      pinnedBg: 'bg-white/95 border-emerald-300 shadow-2xl shadow-emerald-950/10 text-slate-800',
      iconBox: 'bg-emerald-600 text-white',
      badge: 'Thành Công',
      badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      pinnedIcon: <CheckCircle2 size={18} className="text-white" />,
    },
    error: {
      bg: 'bg-red-50 text-red-800 border-red-200',
      icon: <AlertCircle size={17} className="text-red-600 shrink-0" />,
      pinnedBg: 'bg-white/95 border-rose-300 shadow-2xl shadow-rose-950/10 text-slate-800',
      iconBox: 'bg-rose-600 text-white',
      badge: 'Thông Báo Lỗi',
      badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
      pinnedIcon: <AlertCircle size={18} className="text-white" />,
    },
    info: {
      bg: 'bg-blue-50 text-blue-800 border-blue-200',
      icon: <Info size={17} className="text-blue-600 shrink-0" />,
      pinnedBg: 'bg-white/95 border-blue-300 shadow-2xl shadow-blue-950/10 text-slate-800',
      iconBox: 'bg-blue-600 text-white',
      badge: 'Thông Tin',
      badgeColor: 'text-blue-700 bg-blue-50 border-blue-200',
      pinnedIcon: <Info size={18} className="text-white" />,
    },
  }[type];

  if (pinned) {
    return (
      <div className="fixed top-5 right-5 z-[9999] max-w-md w-[calc(100vw-2.5rem)] sm:w-[420px] pointer-events-auto animate-in slide-in-from-top-4 sm:slide-in-from-right-8 fade-in duration-300">
        <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-start gap-3.5 relative ${config.pinnedBg} ${className}`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${config.iconBox}`}>
            {config.pinnedIcon}
          </div>
          <div className="flex-1 pr-2">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${config.badgeColor}`}>
                {config.badge}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">• Vừa xong</span>
            </div>
            <p className="text-xs text-slate-800 leading-relaxed font-semibold">
              {message}
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-xl transition cursor-pointer shrink-0"
              title="Đóng thông báo"
              aria-label="Đóng thông báo"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

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
