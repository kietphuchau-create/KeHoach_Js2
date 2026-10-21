'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Search, 
  Calendar, 
  RefreshCw, 
  Printer, 
  Eye, 
  X, 
  User, 
  Clock, 
  Pill, 
  CheckCircle2, 
  Stethoscope, 
  Building2, 
  Download,
  AlertCircle,
  Phone,
  ChevronRight,
  Receipt
} from 'lucide-react';
import { api, getAuthToken, getAuthUser, ConsultationHistoryItem, PrescriptionDetail } from '@/shared/lib/api';

export default function DoctorHistoryView() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [historyList, setHistoryList] = useState<ConsultationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS'>('ALL');

  // Modal xem chi tiết đơn thuốc
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [prescriptionDetail, setPrescriptionDetail] = useState<PrescriptionDetail | null>(null);
  const [loadingPrescription, setLoadingPrescription] = useState(false);
  const [errorPrescription, setErrorPrescription] = useState<string | null>(null);

  useEffect(() => {
    const user = getAuthUser();
    setCurrentUser(user);
  }, []);

  const loadHistory = useCallback(async () => {
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

      const res = await api.getDoctorConsultationHistory({
        q: searchQuery.trim() || undefined,
        from,
        to,
      });

      if (Array.isArray(res)) {
        setHistoryList(res);
      } else {
        setHistoryList([]);
      }
    } catch (err) {
      console.warn('Lỗi tải lịch sử khám:', err);
      setHistoryList([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, datePreset]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleOpenPrescriptionModal = async (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setPrescriptionDetail(null);
    setErrorPrescription(null);
    setLoadingPrescription(true);

    try {
      const res = await api.getDoctorAppointmentPrescription(appointmentId);
      if (res && res.items) {
        setPrescriptionDetail(res);
      } else {
        setErrorPrescription('Không tìm thấy thông tin đơn thuốc của ca khám này.');
      }
    } catch (err: any) {
      setErrorPrescription(err?.message || 'Không thể tải chi tiết đơn thuốc.');
    } finally {
      setLoadingPrescription(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Thống kê nhanh
  const totalCompleted = historyList.length;
  const totalPrescriptions = historyList.filter(h => h.prescriptionId).length;
  const totalRevenue = historyList.reduce((acc, h) => acc + (Number(h.totalMedicineAmount) || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 animate-in fade-in duration-150">
      {/* ── 1. Header Banner & Nút Điều Hướng ── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span className="text-teal-700 font-bold">medsched.hospital.vn</span>
            <span>&rsaquo;</span>
            <span className="text-slate-700">Phân Hệ Bác Sĩ</span>
            <span>&rsaquo;</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
              HISTORICAL ARCHIVE
            </span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="text-teal-700" size={26} />
            <span>Lịch Sử Khám Bệnh &amp; Đơn Thuốc Đã Kê</span>
            {loading && <RefreshCw size={16} className="text-teal-600 animate-spin ml-1" />}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tra cứu toàn bộ hồ sơ bệnh nhân từng khám, xem lại kết luận bệnh án và chi tiết đơn thuốc điện tử qua các ca trực.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <Link
            href="/doctor"
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white transition shadow-xs cursor-pointer"
          >
            <Stethoscope size={15} />
            <span>Vào Buồng Khám Ca Trực</span>
          </Link>
          <button
            type="button"
            onClick={() => loadHistory()}
            disabled={loading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
            title="Làm mới danh sách"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── 2. Thẻ Chỉ Số Tổng Hợp Nhanh (KPI Scorecards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200 shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Ca Khám Đã Hoàn Tất</div>
            <div className="text-xl font-extrabold text-slate-800 mt-0.5">
              {totalCompleted} <span className="text-xs font-normal text-slate-400">bệnh nhân</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200 shrink-0">
            <Pill size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Đơn Thuốc Điện Tử Đã Kê</div>
            <div className="text-xl font-extrabold text-slate-800 mt-0.5">
              {totalPrescriptions} <span className="text-xs font-normal text-slate-400">đơn thuốc</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0">
            <Receipt size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Tổng Giá Trị Thuốc Kê Đơn</div>
            <div className="text-xl font-extrabold text-emerald-700 mt-0.5 font-mono">
              {totalRevenue.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-400 font-sans">VNĐ</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Thanh Bộ Lọc & Tìm Kiếm ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Input Tìm Kiếm */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên bệnh nhân, số điện thoại, mã hẹn (MS...), chẩn đoán bệnh án..."
            className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white text-xs"
          />
        </div>

        {/* Dropdown Thời Gian */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={datePreset}
              onChange={(e: any) => setDatePreset(e.target.value)}
              className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-300 font-bold text-slate-800 rounded-xl pl-3.5 pr-8 py-2.5 focus:ring-2 focus:ring-teal-600 text-xs shadow-2xs cursor-pointer"
            >
              <option value="ALL">📅 Tất cả thời gian</option>
              <option value="TODAY">📅 Hôm nay</option>
              <option value="LAST_7_DAYS">📅 7 ngày gần nhất</option>
              <option value="LAST_30_DAYS">📅 30 ngày qua</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <Calendar size={13} />
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Bảng Danh Sách Lịch Sử Khám Bệnh ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <RefreshCw size={24} className="animate-spin mx-auto text-teal-600" />
            <p className="text-xs font-semibold">Đang tải lịch sử khám bệnh từ máy chủ...</p>
          </div>
        ) : historyList.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2 px-4">
            <FileText size={36} className="mx-auto text-slate-300 mb-1" />
            <p className="text-sm font-bold text-slate-700">Chưa có ca khám hoàn tất nào phù hợp</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Không tìm thấy hồ sơ ca khám nào với từ khóa hoặc mốc thời gian đã chọn.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Mã Phiếu &amp; STT</th>
                  <th className="py-3.5 px-4">Bệnh Nhân</th>
                  <th className="py-3.5 px-4">Thời Gian Khám</th>
                  <th className="py-3.5 px-4">Chẩn Đoán Kết Luận</th>
                  <th className="py-3.5 px-4">Đơn Thuốc Đã Kê</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {historyList.map((item) => (
                  <tr key={item.appointmentId} className="hover:bg-teal-50/40 transition">
                    {/* Mã & STT */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg font-black text-xs ${
                          item.queueType === 'WALKIN'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-blue-100 text-blue-900 border border-blue-300'
                        }`}>
                          {item.queueNumber}
                        </span>
                        <div>
                          <span className="font-mono font-bold text-slate-700">{item.bookingCode}</span>
                          <span className="block text-[10px] text-slate-400">
                            {item.queueType === 'WALKIN' ? 'Vãng lai' : 'Đặt trước'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Bệnh nhân */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-[13px]">{item.patientName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span>{item.gender}</span>
                        <span>•</span>
                        <span>{new Date().getFullYear() - item.birthYear} tuổi</span>
                        {item.phone && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 font-mono">
                              <Phone size={10} /> {item.phone}
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Thời gian */}
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      <div className="flex items-center gap-1 text-slate-800 font-semibold">
                        <Clock size={12} className="text-teal-700" />
                        <span>{item.formattedDate}</span>
                      </div>
                    </td>

                    {/* Chẩn đoán */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-teal-900 text-xs leading-snug">
                        {item.diagnosis}
                      </div>
                      {item.doctorAdvice && (
                        <div className="text-[11px] text-slate-500 italic mt-0.5 truncate" title={item.doctorAdvice}>
                          &ldquo;{item.doctorAdvice}&rdquo;
                        </div>
                      )}
                    </td>

                    {/* Đơn thuốc */}
                    <td className="py-3.5 px-4">
                      {item.prescriptionId ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Pill size={11} /> {item.medicineCount} loại thuốc
                          </span>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5 font-bold">
                            {Number(item.totalMedicineAmount).toLocaleString('vi-VN')} đ
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Không kê đơn</span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {item.prescriptionId ? (
                        <button
                          type="button"
                          onClick={() => handleOpenPrescriptionModal(item.appointmentId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 transition cursor-pointer shadow-2xs"
                          title="Bấm để xem danh mục thuốc chi tiết đã kê"
                        >
                          <Eye size={13} />
                          <span>Xem Đơn Thuốc</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 5. Modal Chi Tiết Đơn Thuốc Điện Tử ── */}
      {selectedAppointmentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-teal-800 text-white p-4 px-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-teal-200" />
                <h3 className="text-base font-extrabold tracking-tight">
                  Chi Tiết Đơn Thuốc Điện Tử Khám Bệnh
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppointmentId(null)}
                className="p-1 text-teal-200 hover:text-white rounded-lg hover:bg-teal-700 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {loadingPrescription ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <RefreshCw size={20} className="animate-spin mx-auto text-teal-600" />
                  <p>Đang tải thông tin đơn thuốc...</p>
                </div>
              ) : errorPrescription ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{errorPrescription}</span>
                </div>
              ) : prescriptionDetail ? (
                <div id="printable-prescription" className="space-y-4">
                  {/* Tiêu đề phòng khám */}
                  <div className="border-b border-slate-200 pb-3 flex items-start justify-between">
                    <div>
                      <div className="text-sm font-black text-teal-900 uppercase">HỆ THỐNG PHÒNG KHÁM ĐA KHOA MEDSCHED</div>
                      <div className="text-[11px] text-slate-500">Mã Đơn Thuốc: <span className="font-mono font-bold text-slate-700">{prescriptionDetail.prescriptionId}</span></div>
                    </div>
                    <div className="text-right text-[11px] text-slate-500">
                      <div>Ngày kê: <span className="font-bold text-slate-700">{new Date(prescriptionDetail.createdAt).toLocaleDateString('vi-VN')}</span></div>
                      <div>Bác sĩ: <span className="font-bold text-teal-800">{prescriptionDetail.doctorName}</span></div>
                    </div>
                  </div>

                  {/* Chẩn đoán & Lời dặn */}
                  <div className="bg-teal-50/60 border border-teal-200 rounded-xl p-3.5 space-y-1.5">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Stethoscope size={14} className="text-teal-700" />
                      <span>Chẩn đoán:</span>
                      <span className="text-teal-900 font-extrabold">{prescriptionDetail.diagnosis}</span>
                    </div>
                    {prescriptionDetail.doctorAdvice && (
                      <div className="text-[11px] text-slate-600 pl-5">
                        <strong className="text-slate-700">Lời dặn của bác sĩ:</strong> {prescriptionDetail.doctorAdvice}
                      </div>
                    )}
                  </div>

                  {/* Danh sách thuốc */}
                  <div>
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                      <Pill size={13} className="text-teal-700" />
                      <span>Danh Mục Thuốc Kê Đơn ({prescriptionDetail.items.length} loại)</span>
                    </h4>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Tên Thuốc &amp; Dược Chất</th>
                            <th className="py-2.5 px-3 text-center">ĐVT</th>
                            <th className="py-2.5 px-3 text-center">SL</th>
                            <th className="py-2.5 px-3 text-right">Đơn Giá</th>
                            <th className="py-2.5 px-3 text-right">Thành Tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {prescriptionDetail.items.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-slate-50/60">
                              <td className="py-2 px-3 text-slate-400 font-bold">{idx + 1}</td>
                              <td className="py-2 px-3">
                                <div className="font-bold text-slate-800">{item.medicineName}</div>
                                <div className="text-[11px] text-teal-800 font-normal italic mt-0.5">{item.dosage}</div>
                              </td>
                              <td className="py-2 px-3 text-center text-slate-600">{item.unit}</td>
                              <td className="py-2 px-3 text-center font-bold text-slate-800">{item.quantity}</td>
                              <td className="py-2 px-3 text-right font-mono text-slate-600">
                                {Number(item.unitPrice || 0).toLocaleString('vi-VN')} đ
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                {Number(item.totalPrice || 0).toLocaleString('vi-VN')} đ
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-teal-50 border-t border-teal-200 font-bold text-slate-800">
                            <td colSpan={5} className="py-2.5 px-3 text-right uppercase text-[11px]">
                              Tổng Tiền Thuốc:
                            </td>
                            <td className="py-2.5 px-3 text-right text-teal-900 font-mono text-sm font-extrabold">
                              {Number(prescriptionDetail.totalMedicineAmount || 0).toLocaleString('vi-VN')} đ
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedAppointmentId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 transition cursor-pointer"
              >
                Đóng Lại
              </button>

              {prescriptionDetail && (
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white transition shadow-xs cursor-pointer"
                >
                  <Printer size={15} />
                  <span>In Đơn Thuốc</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
