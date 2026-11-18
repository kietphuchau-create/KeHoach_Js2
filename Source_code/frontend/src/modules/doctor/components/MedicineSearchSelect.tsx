'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, X, Building2 } from 'lucide-react';
import { MedicineInventoryItem } from '@/shared/lib/medicineInventory';

interface MedicineSearchSelectProps {
  medicines: MedicineInventoryItem[];
  value: string;
  currentFallbackLabel?: string;
  onSelect: (med: MedicineInventoryItem) => void;
  placeholder?: string;
  size?: 'sm' | 'md';
  accent?: 'teal' | 'amber' | 'slate';
  className?: string;
}

const normalizeVietnamese = (str: string): string =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

const formatBranchLabel = (medicalCenterName?: string): string => {
  if (!medicalCenterName) return 'Kho Dược Chung';
  const parts = medicalCenterName.split(' - ');
  return parts.length > 1 ? parts.slice(1).join(' - ').trim() : medicalCenterName;
};

export default function MedicineSearchSelect({
  medicines,
  value,
  currentFallbackLabel,
  onSelect,
  placeholder = '-- Chọn thuốc từ kho dược phòng khám --',
  size = 'md',
  accent = 'slate',
  className = '',
}: MedicineSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openUpward: boolean;
  }>({ top: 0, left: 0, width: 320, openUpward: false });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedMed = useMemo(
    () => medicines.find((m) => m.id === value),
    [medicines, value]
  );

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const minDropdownWidth = Math.max(rect.width, 340);
    const maxAllowedWidth = Math.min(minDropdownWidth, window.innerWidth - 16);
    let left = rect.left;
    if (left + maxAllowedWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - maxAllowedWidth - 8);
    }

    const estimatedHeight = 330;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    setCoords({
      top: openUpward ? Math.max(8, rect.top - 6) : Math.min(window.innerHeight - 16, rect.bottom + 6),
      left,
      width: maxAllowedWidth,
      openUpward,
    });
  }, []);

  // Tự động focus vào ô tìm kiếm & cập nhật vị trí khi mở dropdown
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const raf = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    const handleScroll = (e: Event) => {
      if (dropdownRef.current && e.target instanceof Node && dropdownRef.current.contains(e.target)) {
        return;
      }
      updatePosition();
    };
    const handleResize = () => updatePosition();

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updatePosition]);

  // Đóng dropdown khi click ra ngoài hoặc bấm phím ESC (không làm đóng modal cha)
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen]);

  const groupedMedicines = useMemo(() => {
    const terms = normalizeVietnamese(searchQuery).split(/\s+/).filter(Boolean);
    const filtered = medicines.filter((m) => {
      if (terms.length === 0) return true;
      const haystack = normalizeVietnamese(
        `${m.name} ${m.activeIngredient || ''} ${m.code || ''} ${m.medicalCenterName || ''} ${m.unit}`
      );
      return terms.every((t) => haystack.includes(t));
    });

    const groups: { branch: string; items: MedicineInventoryItem[] }[] = [];
    const groupMap = new Map<string, MedicineInventoryItem[]>();

    for (const item of filtered) {
      const branch = formatBranchLabel(item.medicalCenterName);
      let list = groupMap.get(branch);
      if (!list) {
        list = [];
        groupMap.set(branch, list);
        groups.push({ branch, items: list });
      }
      list.push(item);
    }

    return groups;
  }, [medicines, searchQuery]);

  const selectableMedicines = useMemo(
    () => groupedMedicines.flatMap((g) => g.items).filter((m) => m.stockQuantity !== 0),
    [groupedMedicines]
  );

  useEffect(() => {
    setHighlightedIdx(0);
  }, [searchQuery, isOpen]);

  const borderAccentClass =
    accent === 'amber'
      ? 'border-amber-400 focus:ring-amber-500/20'
      : accent === 'teal'
      ? 'border-teal-400 focus:ring-teal-500/20'
      : 'border-slate-300 focus:border-teal-600 focus:ring-teal-500/20';

  const triggerPaddingClass =
    size === 'sm' ? 'px-2.5 py-1 text-xs rounded-lg' : 'px-3.5 py-2.5 text-sm rounded-xl';

  const displayLabel = selectedMed
    ? `${selectedMed.name}${selectedMed.activeIngredient ? ` (${selectedMed.activeIngredient})` : ''}`
    : value === '__current__' && currentFallbackLabel
    ? currentFallbackLabel
    : '';

  const showFallbackInList =
    Boolean(currentFallbackLabel) &&
    value === '__current__' &&
    (!searchQuery.trim() ||
      normalizeVietnamese(currentFallbackLabel || '').includes(normalizeVietnamese(searchQuery)));

  const handleSelectMedicine = (med: MedicineInventoryItem) => {
    if (med.stockQuantity === 0) return;
    onSelect(med);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (selectableMedicines.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx((prev) => (prev + 1) % selectableMedicines.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx((prev) => (prev - 1 + selectableMedicines.length) % selectableMedicines.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = selectableMedicines[highlightedIdx] || selectableMedicines[0];
      if (target) handleSelectMedicine(target);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setSearchQuery('');
          setIsOpen((prev) => !prev);
        }}
        className={`w-full bg-white border ${borderAccentClass} ${triggerPaddingClass} flex items-center justify-between gap-2 text-left font-bold transition focus:outline-none focus:ring-2 cursor-pointer ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Search
            size={size === 'sm' ? 13 : 15}
            className="text-teal-600 shrink-0"
          />
          {displayLabel ? (
            <span className="truncate text-slate-900">{displayLabel}</span>
          ) : (
            <span className="truncate text-slate-400 font-medium">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          size={size === 'sm' ? 14 : 16}
          className={`text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-teal-600' : ''
          }`}
        />
      </button>

      {mounted &&
        isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              top: coords.openUpward ? undefined : `${coords.top}px`,
              bottom: coords.openUpward ? `${window.innerHeight - coords.top}px` : undefined,
            }}
            className="z-[80] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Ô nhập từ khóa tìm kiếm */}
            <div className="p-2.5 bg-slate-50/90 border-b border-slate-200">
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-3 text-teal-600 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchInputKeyDown}
                  placeholder="Tìm tên thuốc, hoạt chất, chi nhánh..."
                  className="w-full pl-8 pr-7 py-2 bg-white border border-teal-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                    title="Xóa từ khóa"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Danh sách thuốc đã lọc */}
            <div className="max-h-64 overflow-y-auto p-1.5 space-y-2">
              {showFallbackInList && (
                <div>
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Đang kê trong đơn
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-full px-3 py-2 rounded-xl bg-teal-50 text-teal-900 text-left text-xs font-bold flex items-center justify-between gap-2 border border-teal-200 cursor-pointer"
                  >
                    <span className="truncate">{currentFallbackLabel}</span>
                    <Check size={14} className="text-teal-700 shrink-0" />
                  </button>
                </div>
              )}

              {groupedMedicines.length === 0 && !showFallbackInList ? (
                <div className="py-6 px-4 text-center space-y-1">
                  <p className="text-xs font-bold text-slate-500">
                    Không tìm thấy thuốc phù hợp với "{searchQuery}"
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Thử tìm theo tên biệt dược hoặc hoạt chất khác
                  </p>
                </div>
              ) : (
                groupedMedicines.map((group) => (
                  <div key={group.branch} className="space-y-0.5">
                    <div className="px-2.5 py-1 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-teal-800 bg-teal-50/50 rounded-lg">
                      <Building2 size={11} className="text-teal-600 shrink-0" />
                      <span className="truncate">{group.branch}</span>
                    </div>
                    {group.items.map((med) => {
                      const isSelected = med.id === value;
                      const isOut = med.stockQuantity === 0;
                      const isLow = med.stockQuantity > 0 && med.stockQuantity <= 30;
                      const activeTarget = selectableMedicines[highlightedIdx];
                      const isHighlighted = !isOut && activeTarget?.id === med.id;
                      return (
                        <button
                          key={med.id}
                          type="button"
                          disabled={isOut}
                          onMouseEnter={() => {
                            if (!isOut) {
                              const idx = selectableMedicines.findIndex((m) => m.id === med.id);
                              if (idx >= 0) setHighlightedIdx(idx);
                            }
                          }}
                          onClick={() => handleSelectMedicine(med)}
                          className={`w-full px-3 py-2 rounded-xl text-left transition flex items-center justify-between gap-2 ${
                            isOut
                              ? 'opacity-55 bg-slate-50 cursor-not-allowed'
                              : isSelected
                              ? 'bg-teal-50 border border-teal-300 text-teal-950 cursor-pointer'
                              : isHighlighted
                              ? 'bg-teal-50/80 text-slate-900 cursor-pointer'
                              : 'hover:bg-teal-50/70 text-slate-800 cursor-pointer'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold truncate">
                              {med.name}
                              {med.activeIngredient && (
                                <span className="font-medium text-slate-500">
                                  {' '}
                                  ({med.activeIngredient})
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px]">
                              <span className="font-mono font-bold text-slate-700">
                                {med.unitPrice.toLocaleString('vi-VN')} đ
                              </span>
                              <span className="text-slate-300">•</span>
                              {isOut ? (
                                <span className="font-bold text-rose-600">❌ HẾT HÀNG</span>
                              ) : (
                                <span
                                  className={`font-semibold ${
                                    isLow ? 'text-amber-600' : 'text-emerald-700'
                                  }`}
                                >
                                  Còn {med.stockQuantity} {med.unit.toLowerCase()}
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <Check size={15} className="text-teal-700 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
