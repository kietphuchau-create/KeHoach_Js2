'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Ticket, 
  Plus, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Edit2, 
  Trash2, 
  Copy, 
  Check, 
  Calendar, 
  Users, 
  Clock, 
  Sparkles,
  ArrowRight,
  Gift,
  Percent,
  Coins,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  UserPlus,
  BarChart3,
  X
} from 'lucide-react';
import { 
  Promotion, 
  DiscountType,
  getPromotionsFromDb, 
  addPromotionToDb, 
  updatePromotionInDb, 
  deletePromotionFromDb, 
  togglePromotionStatusInDb,
  PROMOTIONS_UPDATED_EVENT 
} from '@/shared/lib/promotions';
import { getLocalDateString } from '@/shared/lib/formatters';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';

export default function PromotionManager() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'inactive'>('ALL');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 5;

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    description: string;
    discountType: DiscountType;
    discountValue: number;
    maxUses: number | '';
    startDate: string;
    endDate: string;
    status: 'active' | 'inactive';
    targetAudience: string;
  }>({
    code: '',
    name: '',
    description: '',
    discountType: 'FREE_DEPOSIT',
    discountValue: 100,
    maxUses: '',
    startDate: getLocalDateString(),
    endDate: '2026-12-31',
    status: 'active',
    targetAudience: 'Toàn bộ bệnh nhân',
  });

  const loadData = async () => {
    try {
      const data = await getPromotionsFromDb();
      setPromotions(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener(PROMOTIONS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(PROMOTIONS_UPDATED_EVENT, handleUpdate);
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      discountType: 'FREE_DEPOSIT',
      discountValue: 100,
      maxUses: '',
      startDate: getLocalDateString(),
      endDate: '2026-12-31',
      status: 'active',
      targetAudience: 'Toàn bộ bệnh nhân',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (promo: Promotion) => {
    setModalMode('edit');
    setEditingId(promo.id);
    setFormData({
      code: promo.code,
      name: promo.name,
      description: promo.description,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      maxUses: promo.maxUses !== undefined ? promo.maxUses : '',
      startDate: promo.startDate,
      endDate: promo.endDate,
      status: promo.status,
      targetAudience: promo.targetAudience || 'Toàn bộ bệnh nhân',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.code.trim()) {
        throw new Error('Vui lòng nhập mã ưu đãi (VD: HE2026, MEDFREE...)');
      }
      if (!formData.name.trim()) {
        throw new Error('Vui lòng nhập tên chương trình ưu đãi.');
      }

      if (modalMode === 'create') {
        await addPromotionToDb({
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          description: formData.description.trim(),
          discountType: formData.discountType,
          discountValue: Number(formData.discountValue),
          maxUses: formData.maxUses === '' ? undefined : Number(formData.maxUses),
          startDate: formData.startDate,
          endDate: formData.endDate,
          status: formData.status,
          targetAudience: formData.targetAudience.trim(),
        });
        setMessage({ type: 'success', text: `Tạo mã khuyến mãi [${formData.code.toUpperCase()}] thành công vào CSDL MySQL!` });
      } else if (editingId) {
        await updatePromotionInDb(editingId, {
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          description: formData.description.trim(),
          discountType: formData.discountType,
          discountValue: Number(formData.discountValue),
          maxUses: formData.maxUses === '' ? undefined : Number(formData.maxUses),
          startDate: formData.startDate,
          endDate: formData.endDate,
          status: formData.status,
          targetAudience: formData.targetAudience.trim(),
        });
        setMessage({ type: 'success', text: `Cập nhật thông tin mã [${formData.code.toUpperCase()}] trong MySQL thành công!` });
      }

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi xử lý mã khuyến mãi.' });
    }
  };

  const handleToggle = async (id: string, code: string) => {
    try {
      await togglePromotionStatusInDb(id);
      setMessage({ type: 'success', text: `Đã thay đổi trạng thái mã [${code}] trên CSDL MySQL!` });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi đổi trạng thái mã.' });
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn mã khuyến mãi [${code}] khỏi CSDL MySQL?`)) return;
    try {
      await deletePromotionFromDb(id);
      setMessage({ type: 'success', text: `Đã xóa thành công mã khuyến mãi [${code}] khỏi CSDL MySQL.` });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi xóa mã.' });
    }
  };

  // Lọc dữ liệu
  const filtered = promotions.filter((p) => {
    const matchSearch =
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const validPage = Math.min(currentPage, totalPages - 1);
  const currentPromos = filtered.slice(validPage * pageSize, (validPage + 1) * pageSize);

  // Thống kê nhanh
  const totalCount = promotions.length;
  const activeCount = promotions.filter((p) => p.status === 'active').length;
  const totalUsed = promotions.reduce((sum, p) => sum + (p.usedCount || 0), 0);
  const freeDepositCount = promotions.filter((p) => p.discountType === 'FREE_DEPOSIT').length;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Alert Message (Ghim nổi góc trên bên phải) */}
      {message && (
        <AlertMessage pinned type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}



      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tổng Mã Ưu Đãi</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Ticket size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-800 mt-2 font-mono">{totalCount}</div>
          <span className="text-[11px] text-slate-400">Chương trình trong hệ thống</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">Đang Hoạt Động</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-2 font-mono">{activeCount}</div>
          <span className="text-[11px] text-emerald-600">Sẵn sàng áp dụng cho người dùng</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700">Lượt Đã Dùng</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-700 mt-2 font-mono">{totalUsed}</div>
          <span className="text-[11px] text-blue-600">Lượt bệnh nhân hưởng ưu đãi</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">Miễn Cọc (0 đ)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-2 font-mono">{freeDepositCount}</div>
          <span className="text-[11px] text-amber-600">Mã miễn 100% (GIAOVIEN, MEDFREE...)</span>
        </div>
      </div>

      {/* Toolbar: Search & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tabs - Đã xóa khung trắng bao quanh, chuẩn hóa từng nút rời */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap shrink-0">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'active', label: 'Đang hoạt động' },
            { id: 'inactive', label: 'Tạm dừng' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setStatusFilter(tab.id as any); setCurrentPage(0); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap shadow-xs border ${
                statusFilter === tab.id
                  ? 'bg-pine-teal text-white border-pine-teal'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search Input & Create Button */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); }}
              placeholder="Tìm theo mã, tên ưu đãi..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-mint-light rounded-xl focus:outline-none focus:ring-2 focus:ring-pine-teal/30 shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs whitespace-nowrap shrink-0"
          >
            <Plus size={15} />
            <span>Tạo Mã Mới</span>
          </button>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-mint-light overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-mint-soft border-b border-mint-light text-slate-700 uppercase font-bold tracking-wider">
                <th className="py-3.5 px-3.5 whitespace-nowrap">Mã Voucher</th>
                <th className="py-3.5 px-3 whitespace-nowrap">Chương Trình &amp; Mô Tả</th>
                <th className="py-3.5 px-3 whitespace-nowrap text-center">Mức Giảm</th>
                <th className="py-3.5 px-3 whitespace-nowrap text-center">Lượt Sử Dụng</th>
                <th className="py-3.5 px-3 whitespace-nowrap">Thời Gian Áp Dụng</th>
                <th className="py-3.5 px-2 w-20 whitespace-nowrap text-center">Trạng Thái</th>
                <th className="py-3.5 px-3.5 w-32 whitespace-nowrap text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentPromos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Không tìm thấy mã khuyến mãi nào phù hợp.
                  </td>
                </tr>
              ) : (
                currentPromos.map((promo) => (
                  <tr key={promo.id} className="hover:bg-mint-soft/40 transition">
                    {/* Mã Voucher + Copy button */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap font-medium">
                      <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                        <span className="font-mono font-black text-amber-900 text-sm">{promo.code}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(promo.code)}
                          className="text-amber-700 hover:text-amber-900 p-0.5 rounded cursor-pointer transition"
                          title="Sao chép mã"
                        >
                          {copiedCode === promo.code ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        </button>
                      </div>
                      {promo.targetAudience && (
                        <div className="text-[10px] text-slate-400 mt-0.5">{promo.targetAudience}</div>
                      )}
                    </td>

                    {/* Tên & Mô Tả */}
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-800 text-xs sm:text-sm">{promo.name}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{promo.description}</div>
                    </td>

                    {/* Mức Giảm */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-center">
                      {promo.discountType === 'FREE_DEPOSIT' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                          <Sparkles size={11} />
                          <span>Miễn 100% Cọc (0 đ)</span>
                        </span>
                      ) : promo.discountType === 'FIX_TO_2K' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-teal-100 text-teal-800 border border-teal-300 shadow-2xs">
                          <Coins size={11} />
                          <span>Đồng Giá 2.000 đ (Demo)</span>
                        </span>
                      ) : promo.discountType === 'PERCENT' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-purple-100 text-purple-800 border border-purple-300 shadow-2xs">
                          <Percent size={11} />
                          <span>Giảm {promo.discountValue}% Cọc</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs">
                          <Coins size={11} />
                          <span>Giảm {promo.discountValue.toLocaleString('vi-VN')} đ</span>
                        </span>
                      )}
                    </td>

                    {/* Lượt Sử Dụng */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-center">
                      <span className="font-bold text-slate-800 font-mono text-xs">{promo.usedCount}</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {' '}/ {promo.maxUses ? promo.maxUses : '∞'}
                      </span>
                    </td>

                    {/* Thời Gian Áp Dụng */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="text-slate-700 font-mono text-[11px]">{promo.startDate} $\rightarrow$ {promo.endDate}</div>
                    </td>

                    {/* Trạng Thái */}
                    <td className="py-3.5 px-2 w-20 whitespace-nowrap text-center">
                      <div className="inline-flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleToggle(promo.id, promo.code)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center shadow-2xs transition hover:scale-110 cursor-pointer border ${
                            promo.status === 'active'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : 'bg-slate-100 text-slate-400 border-slate-300'
                          }`}
                          title={promo.status === 'active' ? 'Đang hoạt động (Bấm để tạm dừng)' : 'Đã tạm dừng (Bấm để kích hoạt)'}
                        >
                          {promo.status === 'active' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                        </button>
                      </div>
                    </td>

                    {/* Thao Tác */}
                    <td className="py-3.5 px-3.5 w-32 whitespace-nowrap text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(promo)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition bg-sky-50 text-sky-700 hover:bg-sky-100 hover:scale-110 active:scale-95 border border-sky-200 cursor-pointer shadow-2xs"
                          title="Chỉnh sửa mã khuyến mãi"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(promo.id, promo.code)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition bg-rose-50 text-rose-600 hover:bg-rose-100 hover:scale-110 active:scale-95 border border-rose-200 cursor-pointer shadow-2xs"
                          title="Xóa mã này"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span>Hiển thị</span>
              <strong className="text-slate-800 font-bold">
                {validPage * pageSize + 1} - {Math.min((validPage + 1) * pageSize, filtered.length)}
              </strong>
              <span>trên tổng số</span>
              <strong className="text-slate-800 font-bold">{filtered.length}</strong>
              <span>mã ưu đãi</span>
              <span className="text-slate-400 font-normal ml-1">({pageSize} mã/trang)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={validPage === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 hover:text-pine-teal transition shadow-2xs cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>Trang trước</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i).map((pageIdx) => (
                  <button
                    key={pageIdx}
                    type="button"
                    onClick={() => setCurrentPage(pageIdx)}
                    className={`min-w-[32px] h-8 px-2 flex items-center justify-center rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer ${
                      validPage === pageIdx
                        ? 'bg-pine-teal text-white border border-pine-teal'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-mint-soft hover:text-pine-teal'
                    }`}
                  >
                    {pageIdx + 1}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={validPage >= totalPages - 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 hover:text-pine-teal transition shadow-2xs cursor-pointer"
              >
                <span>Trang sau</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Tạo / Chỉnh Sửa Mã Khuyến Mãi */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-mint-light w-full max-w-lg overflow-hidden transform transition-all max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-mint-soft px-6 py-4 border-b border-mint-light flex items-center justify-between">
              <div className="flex items-center gap-2 text-pine-teal font-bold text-base">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <Ticket size={18} />
                </div>
                <span>{modalMode === 'create' ? 'Tạo Mã Khuyến Mãi Mới' : 'Chỉnh Sửa Mã Khuyến Mãi'}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mã Voucher (Code) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="VD: HE2026, MEDFREE, TRIAN50..."
                  className="w-full px-3.5 py-2.5 font-mono font-bold text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pine-teal/30 focus:bg-white uppercase"
                />
                <p className="text-[11px] text-slate-400 mt-1">Người dùng sẽ nhập mã này ở bước đặt lịch khám hoặc thanh toán.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên Chương Trình Ưu Đãi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Ưu Đãi Khách Hàng Mới..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pine-teal/30 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô Tả Quyền Lợi</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="VD: Miễn phí tiền cọc, giảm 20% khi đặt trước..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pine-teal/30 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loại Mức Giảm</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => {
                      const type = e.target.value as DiscountType;
                      setFormData({
                        ...formData,
                        discountType: type,
                        discountValue: type === 'FREE_DEPOSIT' ? 100 : type === 'FIX_TO_2K' ? 2000 : type === 'PERCENT' ? 20 : 30000,
                      });
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pine-teal/30 focus:bg-white"
                  >
                    <option value="FREE_DEPOSIT">Miễn 100% Tiền Cọc (0 đ)</option>
                    <option value="FIX_TO_2K">Đồng Giá 2.000 đ (Demo Quét QR Thật)</option>
                    <option value="PERCENT">Giảm Theo Phần Trăm (%)</option>
                    <option value="FIXED">Giảm Số Tiền Cố Định (VNĐ)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {formData.discountType === 'FREE_DEPOSIT'
                      ? 'Giá trị (% cọc)'
                      : formData.discountType === 'FIX_TO_2K'
                      ? 'Số tiền còn lại (VNĐ)'
                      : formData.discountType === 'PERCENT'
                      ? 'Tỷ lệ giảm (%)'
                      : 'Số tiền giảm (VNĐ)'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={formData.discountType === 'PERCENT' ? 100 : 1000000}
                    disabled={formData.discountType === 'FREE_DEPOSIT' || formData.discountType === 'FIX_TO_2K'}
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pine-teal/30 focus:bg-white disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giới Hạn Lượt Dùng (Bỏ trống = Không giới hạn)</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value === '' ? '' : Number(e.target.value) })}
                    placeholder="Không giới hạn"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pine-teal/30 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Đối Tượng Áp Dụng</label>
                  <input
                    type="text"
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                    placeholder="Toàn bộ bệnh nhân..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pine-teal/30 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày Bắt Đầu</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pine-teal/30 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày Hết Hạn</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pine-teal/30 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Trạng Thái Kích Hoạt</label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.status === 'active'}
                      onChange={() => setFormData({ ...formData, status: 'active' })}
                      className="text-pine-teal"
                    />
                    <span>Kích hoạt ngay (Người dùng có thể nhập)</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.status === 'inactive'}
                      onChange={() => setFormData({ ...formData, status: 'inactive' })}
                      className="text-pine-teal"
                    />
                    <span>Tạm dừng</span>
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-pine-teal hover:bg-pine-teal-hover text-white font-bold cursor-pointer shadow-xs"
                >
                  {modalMode === 'create' ? 'Lưu & Phát Hành Mã' : 'Cập Nhật Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
