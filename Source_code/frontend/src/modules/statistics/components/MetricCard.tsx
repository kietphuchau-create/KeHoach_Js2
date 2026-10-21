'use client';

import React from 'react';
import { MetricCardData } from '../types';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';

interface MetricCardProps {
  card: MetricCardData;
  isSelected?: boolean;
  onClick?: () => void;
}

export default function MetricCard({ card, isSelected, onClick }: MetricCardProps) {
  const { label, value, unit, changePercent, isPositiveGood = true, sparklineData, tooltip } = card;

  // Vẽ SVG Sparkline mini
  const sparkWidth = 140;
  const sparkHeight = 32;
  const minVal = Math.min(...sparklineData);
  const maxVal = Math.max(...sparklineData);
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  const points = sparklineData.map((val, i) => {
    const x = (i / (sparklineData.length - 1)) * sparkWidth;
    const y = sparkHeight - ((val - minVal) / range) * (sparkHeight - 6) - 3;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  const isUp = (changePercent ?? 0) >= 0;
  const isGood = isPositiveGood ? isUp : !isUp;

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-2xl border transition-all duration-150 cursor-pointer ${
        isSelected
          ? 'bg-sky-50/60 border-sky-300 ring-2 ring-sky-200 shadow-sm'
          : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
      }`}
      title={tooltip}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-xs font-semibold text-slate-500 truncate" title={label}>
          {label}
        </span>
        {tooltip && <Info size={12} className="text-slate-300 shrink-0" />}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-black text-slate-800 tracking-tight">{value}</span>
        {unit && <span className="text-xs font-semibold text-slate-500">{unit}</span>}
      </div>

      {/* Mini SVG Sparkline dưới chân card giống hệt Google Analytics */}
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="w-28 h-7">
          <svg viewBox={`0 0 ${sparkWidth} ${sparkHeight}`} className="w-full h-full overflow-visible">
            <path
              d={pathD}
              fill="none"
              stroke="#0284c7"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {changePercent !== undefined && (
          <div
            className={`flex items-center gap-0.5 text-[11px] font-bold shrink-0 ${
              isGood ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>
              {isUp ? '+' : ''}
              {changePercent}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
