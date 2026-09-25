import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'secondary' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  withDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  dot = false,
  withDot = false,
  className = '',
  ...props
}) => {
  const hasDot = dot || withDot;
  const baseStyles =
    'inline-flex items-center font-bold rounded-full select-none tracking-wide leading-none whitespace-nowrap shrink-0 transition-colors';

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const variantStyles = {
    primary: 'bg-emerald-50 text-teal-800 border border-teal-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border border-amber-300',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
    info: 'bg-sky-50 text-sky-800 border border-sky-200',
    purple: 'bg-purple-50 text-purple-800 border border-purple-200',
    secondary: 'bg-slate-100 text-slate-700 border border-slate-200',
    neutral: 'bg-slate-50 text-slate-600 border border-slate-200',
  };

  const dotColors = {
    primary: 'bg-teal-700',
    success: 'bg-emerald-600',
    warning: 'bg-amber-600',
    danger: 'bg-rose-600',
    info: 'bg-sky-600',
    purple: 'bg-purple-600',
    secondary: 'bg-slate-500',
    neutral: 'bg-slate-400',
  };

  return (
    <span
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {hasDot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} shrink-0`} />}
      {children}
    </span>
  );
};

export default Badge;
