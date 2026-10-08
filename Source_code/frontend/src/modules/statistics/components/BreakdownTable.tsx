'use client';

import React from 'react';
import { BreakdownItem } from '../types';

interface BreakdownTableProps {
  title: string;
  headers: {
    rank: string;
    name: string;
    primary: string;
    secondary?: string;
  };
  items: BreakdownItem[];
}

export default function BreakdownTable({ title, headers, items }: BreakdownTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {title}
          </h3>
          <span className="text-[11px] text-sky-600 font-semibold cursor-pointer hover:underline">
            Chi tiết &rarr;
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 font-bold border-b border-slate-100 pb-2">
                <th className="py-2 px-1 w-8">{headers.rank}</th>
                <th className="py-2 px-3">{headers.name}</th>
                <th className="py-2 px-3 text-right">{headers.primary}</th>
                {headers.secondary && (
                  <th className="py-2 px-3 text-right hidden sm:table-cell">
                    {headers.secondary}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-1 font-bold text-slate-400 text-center">{item.rank}</td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                      <span>{item.title}</span>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                            item.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {item.subtitle && (
                      <div className="text-[11px] text-slate-400 mt-0.5">{item.subtitle}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-slate-800 font-mono">
                    {item.primaryMetric}
                  </td>
                  {headers.secondary && (
                    <td className="py-3 px-3 text-right text-slate-500 font-mono hidden sm:table-cell">
                      {item.secondaryMetric || '—'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pt-3 mt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Hiển thị top 5 hạng mục dẫn đầu</span>
        <span className="text-slate-500 font-medium">Tự động cập nhật</span>
      </div>
    </div>
  );
}
