'use client';

import React from 'react';
import { DonutSegment } from '../types';

interface DonutChartProps {
  title: string;
  segments: DonutSegment[];
}

export default function DonutChart({ title, segments }: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  // Tính toạ độ cung tròn SVG Pie/Donut
  let accumulatedAngle = 0;

  const radius = 80;
  const strokeWidth = 32;
  const center = 100;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          {title}
        </h3>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-2">
          {/* Biểu đồ tròn SVG */}
          <div className="relative w-44 h-44 shrink-0">
            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
              {segments.map((seg, idx) => {
                const strokeDasharray = `${(seg.percentage / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -accumulatedAngle * (circumference / 360);
                accumulatedAngle += (seg.percentage / 100) * 360;

                return (
                  <circle
                    key={idx}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300 hover:opacity-85"
                  />
                );
              })}
            </svg>

            {/* Vùng tâm hình tròn */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[11px] font-semibold text-slate-400">Tổng mẫu</span>
              <span className="text-base font-extrabold text-slate-800">
                {total > 1000 ? `${(total / 1000).toFixed(1)}k` : total}
              </span>
            </div>
          </div>

          {/* Chú thích Legend giống Google Analytics (Returning vs New Visitor) */}
          <div className="space-y-3 w-full sm:w-auto">
            {segments.map((seg, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span
                  className="w-3.5 h-3.5 rounded-sm shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-700">{seg.label}</div>
                  <div className="text-slate-400 font-mono text-[11px]">
                    <span className="font-bold text-slate-900">{seg.percentage}%</span>{' '}
                    <span>({seg.value.toLocaleString()} lượt)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-3 mt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Chu kỳ: 100% các phiên hợp lệ</span>
        <span className="text-sky-600 font-medium">Báo cáo chuẩn</span>
      </div>
    </div>
  );
}
