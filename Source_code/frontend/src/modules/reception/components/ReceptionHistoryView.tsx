'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
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
  Filter,
  CheckCircle2,
  AlertCircle,
  Building2,
  Stethoscope,
  Share2,
  Check
} from 'lucide-react';
import { api, ReceptionHistoryItem, ReceptionHistorySummary } from '@/shared/lib/api';

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
  const [datePreset, setDatePreset] = useState<'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'ALL'>('TODAY');

  // Modal Chi tiết & In Phiếu Tiếp Đón
  const [selectedItem, setSelectedItem] = useState<ReceptionHistoryItem | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let from: string | undefined;
      let to: string | undefined;
      const today = new Date();

      if (datePreset === 'TODAY') {
        from = today.toISOString().slice(0, 10);
        to = from;
      } else if (datePreset === 'LAST_7_DAYS') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        from = d.toISOString().slice(0, 10);
        to = today.toISOString().slice(0, 10);
      } else if (datePreset === 'LAST_30_DAYS') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        from = d.toISOString().slice(0, 10);
        to = today.toISOString().slice(0, 10);
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
  }, [searchQuery, methodFilter, statusFilter, datePreset]);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-150">
      {/* ── Breadcrumb & Action Toolbar ── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span className="text-teal-primary font-bold">medsched.hospital.vn</span>
            <span>&rsaquo;</span>
            <span className="text-slate-700">Phân Hệ Tiếp Đón</span>
            <span>&rsaquo;</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-pine-teal font-bold uppercase text-[10px]">
              RECEPTION ARCHIVE
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <UserCheck className="text-pine-teal" size={26} />
            Lịch Sử Tiếp Đón &amp; Check-in Bệnh Nhân
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tra cứu toàn bộ danh sách lượt bệnh nhân đã quét QR vé hẹn, thẻ CCCD gắn chip và cấp số khám vãng lai tại quầy.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <Link
            href="/reception"
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-pine-teal hover:bg-pine-teal-hover text-white transition shadow-xs"
          >
            <QrCode size={15} />
            <span>Đến Quầy Tiếp Đón</span>
          </Link>
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-pine-teal transition cursor-pointer"
            title="Làm mới danh sách"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

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

        {/* Mốc Thời Gian Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1 mr-1">
            <Calendar size={13} /> Thời gian:
          </span>
          <button
            type="button"
            onClick={() => setDatePreset('TODAY')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              datePreset === 'TODAY'
                ? 'bg-pine-teal text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hôm Nay
          </button>
          <button
            type="button"
            onClick={() => setDatePreset('LAST_7_DAYS')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              datePreset === 'LAST_7_DAYS'
                ? 'bg-pine-teal text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            7 Ngày Gần Nhất
          </button>
          <button
            type="button"
            onClick={() => setDatePreset('LAST_30_DAYS')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              datePreset === 'LAST_30_DAYS'
                ? 'bg-pine-teal text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            30 Ngày Gần Nhất
          </button>
          <button
            type="button"
            onClick={() => setDatePreset('ALL')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              datePreset === 'ALL'
                ? 'bg-pine-teal text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất Cả Thời Gian
          </button>

          <span className="ml-auto text-[11px] text-slate-400">
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
