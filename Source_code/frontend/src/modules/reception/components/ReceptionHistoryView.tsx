'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, 
  QrCode, 
  ShieldCheck, 
  UserCheck, 
  Search, 
  Calendar, 
  RefreshCw, 
  Printer, 
  Eye, 
  X, 
  User, 
  Clock, 
  Phone, 
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Filter,
  CheckCircle2,
  AlertCircle,
  Building2,
  Stethoscope,
  Share2,
  Check,
  Trash2
} from 'lucide-react';
import { api, ReceptionHistoryItem, ReceptionHistorySummary } from '@/shared/lib/api';
import { getLocalDateString } from '@/shared/lib/formatters';

export default function ReceptionHistoryView() {
  const [historyItems, setHistoryItems] = useState<ReceptionHistoryItem[]>([]);
  const [summary, setSummary] = useState<ReceptionHistorySummary>({
    totalCheckins: 0,
    qrCheckins: 0,
    cccdCheckins: 0,
    manualWalkinCheckins: 0,
    completedCount: 0,
    waitingCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Bộ lọc
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'QR_CODE' | 'CCCD_QR' | 'MANUAL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED_NO_SHOW'>('ALL');
  const [datePreset, setDatePreset] = useState<'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'ALL' | 'CUSTOM'>('ALL');
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modal Chi tiết & In Phiếu Tiếp Đón
  const [selectedItem, setSelectedItem] = useState<ReceptionHistoryItem | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteItem = async (item: ReceptionHistoryItem) => {
    const ok = window.confirm(
      `Bạn có chắc chắn muốn xóa lượt tiếp đón [${item.bookingCode}] (#${item.queueNumber}) của bệnh nhân "${item.patientName}" không?\n\nThao tác này sẽ xóa sạch phiếu khám và tài khoản test khỏi hệ thống.`
    );
    if (!ok) return;

    try {
      setDeletingId(item.appointmentId);
      await api.deleteReceptionAppointment(item.appointmentId);
      setHistoryItems((prev) => prev.filter((x) => x.appointmentId !== item.appointmentId));
      
      // Đồng bộ ngay lập tức sang giao diện buồng khám Bác sĩ (/doctor) qua BroadcastChannel
      try {
        const syncChannel = new BroadcastChannel('medsched_queue_sync');
        syncChannel.postMessage({ type: 'QUEUE_UPDATED' });
        syncChannel.close();
      } catch {}

      // Tải lại toàn bộ dữ liệu & làm mới ngay các thẻ thống kê tổng hợp (Summary KPIs) về 0
      await loadData();

      alert(`Đã xóa thành công lượt tiếp đón [${item.bookingCode}]!`);
    } catch (err: any) {
      alert(`Lỗi khi xóa lượt tiếp đón: ${err?.message || 'Không thể xóa'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let from: string | undefined;
      let to: string | undefined;
      const today = new Date();

      if (datePreset === 'TODAY') {
        from = getLocalDateString(today);
        to = from;
      } else if (datePreset === 'LAST_7_DAYS') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        from = getLocalDateString(d);
        to = getLocalDateString(today);
      } else if (datePreset === 'LAST_30_DAYS') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        from = getLocalDateString(d);
        to = getLocalDateString(today);
      } else if (datePreset === 'CUSTOM') {
        from = customStartDate || undefined;
        to = customEndDate || undefined;
      }

      const res = await api.getReceptionHistory({
        q: searchQuery.trim() || undefined,
        method: methodFilter !== 'ALL' ? methodFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        from,
        to,
      });

      if (res) {
        setHistoryItems(res.items || []);
        if (res.summary) {
          setSummary(res.summary);
        }
      }
    } catch (err) {
      console.warn('Lỗi khi tải lịch sử tiếp đón:', err);
      setHistoryItems([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, methodFilter, statusFilter, datePreset, customStartDate, customEndDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrintSlip = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleCopySMS = (item: ReceptionHistoryItem) => {
    const text = `MEDSCHED - THÔNG TIN TIẾP ĐÓN KHÁM BỆNH:\nBệnh nhân: ${item.patientName}\nSTT Tiếp Nhận: #${item.queueNumber}\nBác sĩ: ${item.doctorName}\nPhòng khám: ${item.roomNumber} (${item.specialtyName})\nThời gian tiếp đón: ${item.formattedCheckInTime}\nTra cứu hồ sơ: http://localhost:3000/my-appointments`;
    navigator.clipboard.writeText(text);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const getMethodBadge = (method: string) => {
    if (method === 'QR_CODE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <QrCode size={12} /> Quét QR Vé Hẹn
        </span>
      );
    }
    if (method === 'CCCD_QR') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <ShieldCheck size={12} /> CCCD Gắn Chip
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <Users size={12} /> Tiếp Nhận Tại Quầy
      </span>
    );
  };

  const getDatePresetLabel = () => {
    switch (datePreset) {
      case 'TODAY':
        return 'Hôm Nay';
      case 'LAST_7_DAYS':
        return '7 Ngày Gần Nhất';
      case 'LAST_30_DAYS':
        return '30 Ngày Gần Nhất';
      case 'CUSTOM':
        if (customStartDate && customEndDate) {
          if (customStartDate === customEndDate) return customStartDate;
          return `${customStartDate} → ${customEndDate}`;
        }
        if (customStartDate) return `Từ ${customStartDate}`;
        if (customEndDate) return `Đến ${customEndDate}`;
        return 'Khoảng ngày cụ thể';
      case 'ALL':
      default:
        return 'Tất Cả Thời Gian';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CHECKED_IN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Đang Chờ Khám
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Đang Trong Phòng
          </span>
        );
      case 'WAITING_FOR_LAB_RESULTS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            Làm Cận Lâm Sàng
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={12} /> Đã Khám Xong
          </span>
        );
      case 'MISSED_NO_SHOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle size={12} /> Vắng Mặt
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">

      {/* ── Thẻ Thống Kê Nhanh (Summary KPI Scorecards) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
            <UserCheck size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Tiếp Đón</div>
            <div className="text-2xl font-extrabold text-slate-800 mt-0.5">
              {summary.totalCheckins}{' '}
              <span className="text-xs font-normal text-slate-400">lượt</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <QrCode size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quét QR Vé Hẹn</div>
            <div className="text-2xl font-extrabold text-slate-800 mt-0.5">
              {summary.qrCheckins}{' '}
              <span className="text-xs font-normal text-slate-400">lượt</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">CCCD Gắn Chip</div>
            <div className="text-2xl font-extrabold text-slate-800 mt-0.5">
              {summary.cccdCheckins}{' '}
              <span className="text-xs font-normal text-slate-400">lượt</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Users size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vãng Lai Tại Quầy</div>
            <div className="text-2xl font-extrabold text-slate-800 mt-0.5">
              {summary.manualWalkinCheckins}{' '}
              <span className="text-xs font-normal text-slate-400">lượt</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Thanh Bộ Lọc & Tìm Kiếm ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Ô Tìm Kiếm */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên bệnh nhân, số điện thoại, CCCD, mã hẹn (WALK..., CCCD...), STT..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pine-teal/30 focus:border-pine-teal transition bg-slate-50/50 hover:bg-white"
            />
          </div>

          {/* Lọc Phương Thức Tiếp Đón */}
          <div className="flex items-center gap-2">
            <select
              value={methodFilter}
              onChange={(e: any) => setMethodFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-pine-teal/30 cursor-pointer"
            >
              <option value="ALL">🔍 Tất cả phương thức</option>
              <option value="QR_CODE">📱 Quét QR Vé Hẹn</option>
              <option value="CCCD_QR">💳 Thẻ CCCD Gắn Chip</option>
              <option value="MANUAL">📝 Vãng Lai Tại Quầy</option>
            </select>

            {/* Lọc Trạng Thái */}
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-pine-teal/30 cursor-pointer"
            >
              <option value="ALL">🏷️ Tất cả trạng thái</option>
              <option value="CHECKED_IN">⏳ Đang chờ khám</option>
              <option value="IN_PROGRESS">🩺 Đang trong phòng</option>
              <option value="COMPLETED">✅ Đã khám xong</option>
              <option value="MISSED_NO_SHOW">❌ Vắng mặt</option>
            </select>
          </div>
        </div>

        {/* Nút Chọn Mốc Thời Gian (Gộp 1 nút & 1 icon duy nhất) */}
        <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-100 text-xs flex-wrap">
          <button
            type="button"
            onClick={() => setShowDatePickerModal(true)}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition flex items-center gap-2 cursor-pointer shadow-2xs hover:border-pine-teal"
            title="Bấm để chọn mốc thời gian hoặc khoảng ngày cụ thể"
          >
            <Calendar size={14} className="text-pine-teal shrink-0" />
            <span className="font-bold text-slate-600">Thời gian:</span>
            <span className="font-bold text-pine-teal bg-teal-50 border border-teal-200/80 px-2.5 py-0.5 rounded-lg text-xs">
              {getDatePresetLabel()}
            </span>
            <ChevronDown size={14} className="text-slate-400 shrink-0 ml-0.5" />
          </button>

          <span className="text-[11px] text-slate-400 font-medium">
            Hiển thị <strong>{historyItems.length}</strong> kết quả tiếp đón
          </span>
        </div>
      </div>

      {/* ── Bảng Danh Sách Lịch Sử Tiếp Đón ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center">
            <RefreshCw className="animate-spin mb-3 text-pine-teal" size={32} />
            <p className="text-sm font-semibold text-slate-600">Đang truy xuất lịch sử tiếp đón từ máy chủ...</p>
          </div>
        ) : historyItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <UserCheck size={28} className="text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-700">Chưa có lượt tiếp đón nào phù hợp</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Không tìm thấy hồ sơ tiếp đón nào khớp với từ khóa tìm kiếm hoặc mốc thời gian đã chọn.
            </p>
            {datePreset !== 'ALL' && (
              <button
                type="button"
                onClick={() => setDatePreset('ALL')}
                className="mt-3.5 px-3.5 py-1.5 rounded-xl bg-pine-teal text-white text-xs font-semibold hover:bg-teal-700 transition shadow-2xs cursor-pointer"
              >
                Xem tất cả lịch sử tiếp đón
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4">Mã Vé &amp; STT</th>
                  <th className="py-3.5 px-4">Bệnh Nhân</th>
                  <th className="py-3.5 px-4">Phương Thức</th>
                  <th className="py-3.5 px-4">Phòng &amp; Bác Sĩ</th>
                  <th className="py-3.5 px-4">Giờ Tiếp Đón</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyItems.map((item) => (
                  <tr key={item.appointmentId} className="hover:bg-slate-50/70 transition">
                    {/* STT & Mã vé */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                          item.queueNumber.startsWith('W-') 
                            ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                            : 'bg-sky-100 text-sky-900 border border-sky-300'
                        }`}>
                          #{item.queueNumber}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {item.bookingCode}
                        </span>
                      </div>
                    </td>

                    {/* Bệnh nhân */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800 text-xs">
                        {item.patientName}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{item.gender} ({new Date().getFullYear() - item.birthYear} tuổi)</span>
                        {item.phone && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{item.phone}</span>
                          </>
                        )}
                        {item.cccdNumber && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-slate-400">CCCD: {item.cccdNumber}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Phương thức tiếp đón */}
                    <td className="py-3.5 px-4">
                      {getMethodBadge(item.checkinMethod)}
                    </td>

                    {/* Phòng khám & Bác sĩ */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Building2 size={13} className="text-teal-600 shrink-0" />
                        <span>{item.roomNumber}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Stethoscope size={12} className="text-slate-400 shrink-0" />
                        <span>{item.doctorName}</span>
                      </div>
                    </td>

                    {/* Giờ tiếp đón */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <Clock size={13} className="text-slate-400 shrink-0" />
                        <span>{item.formattedCheckInTime || item.formattedCreatedAt}</span>
                      </div>
                    </td>

                    {/* Trạng thái ca khám */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(item.status)}
                    </td>

                    {/* Nút xem phiếu & in phiếu */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition cursor-pointer shadow-2xs hover:border-pine-teal/40 hover:text-pine-teal"
                          title="Xem chi tiết phiếu tiếp đón & in vé"
                        >
                          <Eye size={13} />
                          <span>Chi Tiết</span>
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === item.appointmentId}
                          onClick={() => handleDeleteItem(item)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 font-semibold transition cursor-pointer shadow-2xs hover:border-rose-300 text-xs"
                          title="Xóa lượt tiếp đón test này"
                        >
                          <Trash2 size={13} className="text-rose-600" />
                          <span>{deletingId === item.appointmentId ? 'Đang xóa...' : 'Xóa'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Popup Chọn Mốc Thời Gian Cụ Thể ── */}
      {showDatePickerModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowDatePickerModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-50/60 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-800">
                    Chọn Mốc Thời Gian Tra Cứu
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Lọc danh sách tiếp đón theo khoảng thời gian cụ thể
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDatePickerModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
                title="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Mốc thời gian nhanh
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDatePreset('TODAY');
                      setShowDatePickerModal(false);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      datePreset === 'TODAY'
                        ? 'bg-pine-teal text-white border-pine-teal shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>Hôm Nay</span>
                    {datePreset === 'TODAY' && <Check size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDatePreset('LAST_7_DAYS');
                      setShowDatePickerModal(false);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      datePreset === 'LAST_7_DAYS'
                        ? 'bg-pine-teal text-white border-pine-teal shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>7 Ngày Gần Nhất</span>
                    {datePreset === 'LAST_7_DAYS' && <Check size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDatePreset('LAST_30_DAYS');
                      setShowDatePickerModal(false);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      datePreset === 'LAST_30_DAYS'
                        ? 'bg-pine-teal text-white border-pine-teal shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>30 Ngày Gần Nhất</span>
                    {datePreset === 'LAST_30_DAYS' && <Check size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDatePreset('ALL');
                      setShowDatePickerModal(false);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      datePreset === 'ALL'
                        ? 'bg-pine-teal text-white border-pine-teal shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>Tất Cả Thời Gian</span>
                    {datePreset === 'ALL' && <Check size={14} />}
                  </button>
                </div>
              </div>

              {/* Phân cách */}
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                  <span className="bg-white px-2">Hoặc chọn khoảng ngày cụ thể</span>
                </div>
              </div>

              {/* Khoảng ngày tùy chọn */}
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Từ ngày:
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pine-teal/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Đến ngày:
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pine-teal/30"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!customStartDate && !customEndDate}
                  onClick={() => {
                    setDatePreset('CUSTOM');
                    setShowDatePickerModal(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check size={14} />
                  <span>Áp Dụng Khoảng Ngày Cụ Thể</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setDatePreset('ALL');
                  setCustomStartDate('');
                  setCustomEndDate('');
                  setShowDatePickerModal(false);
                }}
                className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                Đặt lại tất cả
              </button>
              <button
                type="button"
                onClick={() => setShowDatePickerModal(false)}
                className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Xem & In Phiếu Tiếp Đón ── */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 px-5 bg-gradient-to-r from-pine-teal to-teal-primary text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Printer size={18} />
                <h3 className="font-bold text-sm">Phiếu Tiếp Đón Bệnh Nhân</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Nội Dung Phiếu Tiếp Đón (Chuẩn Bản In Bệnh Viện) */}
            <div className="p-6 space-y-4 print:p-0" id="reception-ticket-slip">
              {/* Header phiếu */}
              <div className="text-center pb-3 border-b border-dashed border-slate-300">
                <div className="text-xs font-black tracking-wider uppercase text-pine-teal">
                  BỆNH VIỆN ĐA KHOA QUỐC TẾ MEDSCHED
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Chi Nhánh Trung Tâm • Hotline Tiếp Đón: 1900 6868
                </div>
                <div className="text-sm font-bold text-slate-800 mt-2">
                  PHIẾU KHÁM BỆNH &amp; SỐ THỨ TỰ PHÒNG KHÁM
                </div>
              </div>

              {/* Số thứ tự to nổi bật */}
              <div className="text-center py-2 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  SỐ THỨ TỰ CỦA BẠN
                </div>
                <div className="text-4xl font-black text-pine-teal tracking-tight mt-0.5 font-mono">
                  #{selectedItem.queueNumber}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-1">
                  Mã cuộc hẹn: <strong className="text-slate-800 font-mono">{selectedItem.bookingCode}</strong>
                </div>
              </div>

              {/* Chi tiết tiếp đón */}
              <div className="space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Họ và tên bệnh nhân:</span>
                  <span className="font-bold text-slate-800 uppercase">{selectedItem.patientName}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Giới tính &amp; Tuổi:</span>
                  <span className="font-semibold text-slate-700">
                    {selectedItem.gender} • {new Date().getFullYear() - selectedItem.birthYear} tuổi ({selectedItem.birthYear})
                  </span>
                </div>
                {selectedItem.phone && (
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Số điện thoại:</span>
                    <span className="font-mono font-semibold text-slate-800">{selectedItem.phone}</span>
                  </div>
                )}
                {selectedItem.cccdNumber && (
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Số CCCD / Định danh:</span>
                    <span className="font-mono font-semibold text-slate-800">{selectedItem.cccdNumber}</span>
                  </div>
                )}
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Phòng khám chuyên khoa:</span>
                  <span className="font-bold text-teal-primary">{selectedItem.roomNumber} ({selectedItem.specialtyName})</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Bác sĩ phụ trách:</span>
                  <span className="font-bold text-slate-800">{selectedItem.doctorName}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Hình thức tiếp nhận:</span>
                  <span>{getMethodBadge(selectedItem.checkinMethod)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Thời gian tiếp đón:</span>
                  <span className="font-semibold text-slate-700">{selectedItem.formattedCheckInTime}</span>
                </div>
              </div>

              {/* Lời dặn */}
              <div className="text-[11px] text-slate-500 bg-amber-50/70 p-3 rounded-xl border border-amber-200/60 leading-relaxed text-center">
                👉 Quý khách vui lòng ngồi tại ghế chờ trước cửa <strong>{selectedItem.roomNumber}</strong>. Khi loa gọi đến số <strong>#{selectedItem.queueNumber}</strong>, xin mời vào phòng khám.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 px-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleCopySMS(selectedItem)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition cursor-pointer"
              >
                {copiedPhone ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
                <span>{copiedPhone ? 'Đã sao chép SMS!' : 'Sao chép tin nhắn SMS'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-pine-teal hover:bg-pine-teal-hover text-white transition shadow-xs cursor-pointer"
                >
                  <Printer size={15} />
                  <span>In Phiếu Ngay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
