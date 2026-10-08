'use client';

import React, { useState } from 'react';
import { TimeGranularity, TimeSeriesPoint } from '../types';
import { TrendingUp } from 'lucide-react';

interface AnalyticsLineChartProps {
  data: TimeSeriesPoint[];
  metricLabel: string;
  metricUnit?: string;
  granularity: TimeGranularity;
  onGranularityChange: (g: TimeGranularity) => void;
  availableMetrics: { id: string; label: string; unit: string }[];
  selectedMetricId: string;
  onMetricChange: (mId: string) => void;
}

export default function AnalyticsLineChart({
  data,
  metricLabel,
  metricUnit,
  granularity,
  onGranularityChange,
  availableMetrics,
  selectedMetricId,
  onMetricChange,
}: AnalyticsLineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
        Chưa có dữ liệu cho khoảng thời gian này
      </div>
    );
  }

  // Toạ độ SVG
  const width = 1000;
  const height = 300;
  const paddingLeft = 55;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const values = data.map((d) => d.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const minValue = 0; // Luôn bắt đầu từ 0 cho biểu đồ Google Analytics chuẩn
  const maxValue = rawMax === 0 ? 10 : Math.ceil(rawMax * 1.15);

  const getX = (index: number) => {
    if (data.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    const ratio = (val - minValue) / (maxValue - minValue);
    return paddingTop + chartHeight - ratio * chartHeight;
  };

  // Tính chuỗi điểm đường Polyline / Path
  const points = data.map((d, i) => ({
    x: getX(i),
    y: getY(d.value),
    point: d,
  }));

  const linePath = points.reduce((acc, curr, i) => {
    return i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const areaPath = `
    ${linePath}
    L ${points[points.length - 1].x} ${paddingTop + chartHeight}
    L ${points[0].x} ${paddingTop + chartHeight}
    Z
  `;

  // Các vạch ngang Y-axis (4 vạch)
  const yTicks = [0, 0.33, 0.66, 1].map((pct) => {
    const val = Math.round(minValue + (maxValue - minValue) * pct);
    return {
      value: val,
      y: paddingTop + chartHeight - pct * chartHeight,
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs transition hover:shadow-sm">
      {/* ── Tầng 1: Thanh Điều Khiển Google Analytics Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        {/* Bộ chọn chỉ số (Sessions vs Metric) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 ring-4 ring-sky-100" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chỉ Số:</span>
          </div>

          <div className="relative">
            <select
              value={selectedMetricId}
              onChange={(e) => onMetricChange(e.target.value)}
              className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-lg px-3 py-1.5 pr-8 focus:ring-2 focus:ring-sky-500 focus:outline-none transition cursor-pointer"
            >
              {availableMetrics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.unit})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Nút phân chia thời gian Google Analytics (Hourly | Day | Week | Month) */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold shadow-2xs">
          {(
            [
              { key: 'HOURLY', label: 'Giờ' },
              { key: 'DAY', label: 'Ngày' },
              { key: 'WEEK', label: 'Tuần' },
              { key: 'MONTH', label: 'Tháng' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onGranularityChange(item.key)}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                granularity === item.key
                  ? 'bg-white text-sky-700 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tầng 2: Vùng Vẽ Biểu Đồ SVG Tương Tác ── */}
      <div className="relative mt-4 w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            {/* Gradient màu nước biển phong cách Google Analytics */}
            <linearGradient id="gaAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Lưới ngang Grid lines & Nhãn trục Y */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={tick.y}
                x2={width - paddingRight}
                y2={tick.y}
                stroke="#f1f5f9"
                strokeWidth="1.5"
                strokeDasharray={i === 0 ? 'none' : '3 3'}
              />
              <text
                x={paddingLeft - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-mono"
              >
                {tick.value.toLocaleString()}
              </text>
            </g>
          ))}

          {/* Vùng bóng Area Gradient */}
          <path d={areaPath} fill="url(#gaAreaGradient)" />

          {/* Đường Line chính */}
          <path
            d={linePath}
            fill="none"
            stroke="#0284c7"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Các điểm mốc tròn (Data Points) */}
          {points.map((pt, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Vùng touch target rộng để dễ hover */}
                <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />

                {/* Điểm trắng viền xanh Google Analytics */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? '6' : '3.5'}
                  fill="#ffffff"
                  stroke="#0284c7"
                  strokeWidth={isHovered ? '3' : '2'}
                  className="transition-all duration-150"
                />

                {/* Đường dóng dọc khi hover */}
                {isHovered && (
                  <line
                    x1={pt.x}
                    y1={paddingTop}
                    x2={pt.x}
                    y2={paddingTop + chartHeight}
                    stroke="#94a3b8"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}
              </g>
            );
          })}

          {/* Nhãn trục X (Mốc thời gian) */}
          {points.map((pt, i) => {
            // Ẩn bớt nhãn nếu quá dày đặc
            const shouldShowLabel =
              data.length <= 10 ||
              i % 2 === 0 ||
              i === data.length - 1;

            if (!shouldShowLabel) return null;

            return (
              <text
                key={i}
                x={pt.x}
                y={height - 12}
                textAnchor="middle"
                className={`text-[10px] font-sans ${
                  hoveredIndex === i ? 'fill-sky-700 font-bold' : 'fill-slate-400'
                }`}
              >
                {pt.point.label}
              </text>
            );
          })}
        </svg>

        {/* ── Floating Tooltip khi Hover ── */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 bg-slate-900/95 text-white px-3 py-2 rounded-xl text-xs shadow-xl border border-slate-700 backdrop-blur-xs transition-all duration-75"
            style={{
              left: `${(points[hoveredIndex].x / width) * 100}%`,
              top: `${(points[hoveredIndex].y / height) * 100}%`,
            }}
          >
            <div className="text-[10px] text-slate-400 font-medium mb-0.5">
              Thời gian: {points[hoveredIndex].point.label}
            </div>
            <div className="font-extrabold text-white text-sm flex items-center gap-1.5">
              <span>{points[hoveredIndex].point.formattedValue || points[hoveredIndex].point.value.toLocaleString()}</span>
              {metricUnit && <span className="text-[11px] font-normal text-sky-300">{metricUnit}</span>}
            </div>
            <div className="text-[9px] text-emerald-400 mt-0.5 flex items-center gap-1">
              <TrendingUp size={10} />
              <span>Dữ liệu xác thực theo ca</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
