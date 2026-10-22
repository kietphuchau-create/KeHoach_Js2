'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  pageSize?: number;
}

export default function BreakdownTable({ 
  title, 
  headers, 
  items, 
  pageSize = 4 
}: BreakdownTableProps) {
  const [currentPage, setCurrentPage] = useState(0);

  // Tự động reset về trang 1 khi danh sách hoặc tiêu đề thay đổi
  useEffect(() => {
    setCurrentPage(0);
  }, [items, title]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const validPage = Math.min(currentPage, totalPages - 1);
  const currentItems = items.slice(validPage * pageSize, (validPage + 1) * pageSize);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between h-full min-h-[380px]">
      <div>
        <div className="pb-3 border-b border-slate-100 mb-3 flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            {title}
          </h3>
          <span className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
            Tổng cộng: {items.length} bác sĩ / chuyên khoa
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 font-bold border-b border-slate-100 pb-2">
                <th className="py-2.5 px-2 w-10 text-center">{headers.rank}</th>
                <th className="py-2.5 px-3">{headers.name}</th>
                <th className="py-2.5 px-3 text-right">{headers.primary}</th>
                {headers.secondary && (
                  <th className="py-2.5 px-3 text-right hidden sm:table-cell">
                    {headers.secondary}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={headers.secondary ? 4 : 3} className="py-8 text-center text-slate-400">
                    Chưa có dữ liệu thống kê
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-2 font-bold text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                        item.rank === 1
                          ? 'bg-amber-100 text-amber-800 font-black'
                          : item.rank === 2
                          ? 'bg-slate-200 text-slate-700 font-bold'
                          : item.rank === 3
                          ? 'bg-amber-50 text-amber-700 font-bold'
                          : 'text-slate-400 font-bold'
                      }`}>
                        {item.rank}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                        <span>{item.title}</span>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                              item.badgeColor || 'bg-amber-50 text-amber-700 border-amber-200'
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
                    <td className="py-3 px-3 text-right font-black text-slate-800 font-mono text-sm">
                      {item.primaryMetric}
                    </td>
                    {headers.secondary && (
                      <td className="py-3 px-3 text-right text-slate-500 font-mono hidden sm:table-cell">
                        {item.secondaryMetric || '—'}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="pt-3 mt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-500">
        <div className="flex items-center gap-1 text-[11px] flex-wrap">
          <span>Hiển thị</span>
          <strong className="text-slate-700 font-bold">
            {items.length === 0 ? 0 : validPage * pageSize + 1} - {Math.min((validPage + 1) * pageSize, items.length)}
          </strong>
          <span>trên</span>
          <strong className="text-slate-700 font-bold">{items.length}</strong>
          <span>mục</span>
          <span className="text-slate-400 font-normal">({pageSize} bác sĩ/trang)</span>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={validPage === 0}
              className="inline-flex items-center gap-0.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 hover:text-pine-teal transition shadow-2xs cursor-pointer text-xs"
              title="Trang trước"
            >
              <ChevronLeft size={13} />
              <span className="hidden sm:inline">Trước</span>
            </button>

            {/* Page number buttons */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i).map((pageIdx) => {
                const isActive = validPage === pageIdx;
                return (
                  <button
                    key={pageIdx}
                    type="button"
                    onClick={() => setCurrentPage(pageIdx)}
                    className={`min-w-[28px] h-7 px-1.5 flex items-center justify-center rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer ${
                      isActive
                        ? 'bg-pine-teal text-white border border-pine-teal'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-mint-soft hover:text-pine-teal'
                    }`}
                  >
                    {pageIdx + 1}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={validPage >= totalPages - 1}
              className="inline-flex items-center gap-0.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 hover:text-pine-teal transition shadow-2xs cursor-pointer text-xs"
              title="Trang sau"
            >
              <span className="hidden sm:inline">Sau</span>
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
