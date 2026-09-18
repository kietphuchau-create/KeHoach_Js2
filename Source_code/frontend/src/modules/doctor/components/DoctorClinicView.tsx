'use client';

import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Users, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  User, 
  FileText, 
  Activity, 
  AlertCircle,
  Building2,
  Phone,
  ShieldCheck,
  Volume2
} from 'lucide-react';
import { getAuthUser } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';

interface PatientQueueItem {
  id: string;
  queueNumber: string;
  bookingCode: string;
  patientName: string;
  gender: string;
  birthYear: number;
  phone: string;
  cccd: string;
  symptoms: string;
  aiSummary: string;
  status: 'WAITING' | 'IN_CONSULTATION' | 'COMPLETED';
  checkInTime: string;
}

export default function DoctorClinicView() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [clinicActive, setClinicActive] = useState(true);
  const [activePatientIndex, setActivePatientIndex] = useState(1);
  const [notification, setNotification] = useState<string | null>(null);

  // Initial demo queue data
  const [queue, setQueue] = useState<PatientQueueItem[]>([
    {
      id: 'p001',
      queueNumber: '01',
      bookingCode: 'MED-2026-8890',
      patientName: 'Lê Thành Tài',
      gender: 'Nam',
      birthYear: 1998,
      phone: '0912345678',
      cccd: '079098012345',
      symptoms: 'Đau tức ngực nhẹ khi làm việc quá sức, đo huyết áp tại nhà 135/85.',
      aiSummary: 'Triệu chứng tim mạch nhẹ: Đau tức ngực gắng sức | Tiền sử: Tiền sử gia đình huyết áp | Phân loại: Ưu tiên trung bình',
      status: 'COMPLETED',
      checkInTime: '08:15',
    },
    {
      id: 'p002',
      queueNumber: '02',
      bookingCode: 'MED-2026-8891',
      patientName: 'Trang Huỳnh',
      gender: 'Nữ',
      birthYear: 2001,
      phone: '0987654321',
      cccd: '079101098765',
      symptoms: 'Thường xuyên hồi hộp, tim đập nhanh sau khi uống cà phê hoặc thức khuya.',
      aiSummary: 'Nhịp tim nhanh kịch phát do chất kích thích | Hướng chuyên khoa: Khoa Nội Tim Mạch | Đề xuất: Điện tâm đồ ECG',
      status: 'IN_CONSULTATION',
      checkInTime: '08:22',
    },
    {
      id: 'p003',
      queueNumber: '03',
      bookingCode: 'MED-2026-8899',
      patientName: 'Châu Tuấn Kiệt',
      gender: 'Nam',
      birthYear: 2000,
      phone: '0901234567',
      cccd: '079095012345',
      symptoms: 'Đau thắt ngực nhẹ khi leo cầu thang, khó thở nhẹ ban đêm, thỉnh thoảng choáng.',
      aiSummary: 'Cảnh báo đau thắt ngực gắng sức | Khó thở tư thế nằm | Cần kiểm tra siêu âm tim Doppler màu',
      status: 'WAITING',
      checkInTime: '08:30',
    },
    {
      id: 'p004',
      queueNumber: '04',
      bookingCode: 'MED-2026-8902',
      patientName: 'Nguyễn Thị Yến Nhi',
      gender: 'Nữ',
      birthYear: 2002,
      phone: '0933456789',
      cccd: '079102345678',
      symptoms: 'Khám sức khỏe tổng quát tim mạch định kỳ theo gói dịch vụ công ty.',
      aiSummary: 'Khám định kỳ tổng quát | Không có tiền sử bệnh lý nền nguy cơ cao',
      status: 'WAITING',
      checkInTime: '08:45',
    },
  ]);

  const [clinicalNotes, setClinicalNotes] = useState('');

  useEffect(() => {
    const user = getAuthUser();
    setCurrentUser(user);
  }, []);

  const currentPatient = queue[activePatientIndex] || queue[0];

  const handleCallNext = () => {
    // Find next waiting patient
    const nextIdx = queue.findIndex((p, idx) => idx > activePatientIndex && p.status === 'WAITING');
    if (nextIdx !== -1) {
      // Mark current as completed
      setQueue((prev) =>
        prev.map((p, idx) => {
          if (idx === activePatientIndex) return { ...p, status: 'COMPLETED' };
          if (idx === nextIdx) return { ...p, status: 'IN_CONSULTATION' };
          return p;
        })
      );
      setActivePatientIndex(nextIdx);
      setClinicalNotes('');
      setNotification(`Đã gọi bệnh nhân STT #${queue[nextIdx].queueNumber} - ${queue[nextIdx].patientName} vào phòng khám.`);
    } else {
      setNotification('Hiện tại đã hết bệnh nhân đang xếp hàng trong ca trực!');
    }
  };

  const handleSelectPatient = (index: number) => {
    setActivePatientIndex(index);
    setClinicalNotes('');
  };

  const waitingCount = queue.filter((p) => p.status === 'WAITING').length;
  const completedCount = queue.filter((p) => p.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 mb-1 text-xs font-bold uppercase tracking-wider">
            <Stethoscope size={18} />
            <span>Phân Hệ Buồng Khám Chuyên Khoa (Doctor Console)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            {currentUser?.fullName ? `Bàn Khám: ${currentUser.fullName}` : 'Bàn Khám: PGS.TS.BS Trần Văn Hùng'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-2">
            <span>Phòng 201 - Lầu 2 (Khoa Nội Tim Mạch)</span>
            <span>•</span>
            <span className="text-blue-600 font-semibold">Cơ sở MedSched Quận 1</span>
          </p>
        </div>

        {/* Status & Stats */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 flex items-center gap-3 text-center text-xs">
            <div className="px-3 border-r border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Đang chờ</span>
              <span className="text-lg font-bold text-amber-600">{waitingCount} ca</span>
            </div>
            <div className="px-3">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Đã xong</span>
              <span className="text-lg font-bold text-emerald-600">{completedCount} ca</span>
            </div>
          </div>

          <button
            onClick={() => setClinicActive(!clinicActive)}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition cursor-pointer flex items-center gap-2 ${
              clinicActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${clinicActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span>{clinicActive ? 'Đang Mở Khám' : 'Tạm Dừng Khám'}</span>
          </button>
        </div>
      </div>

      {notification && (
        <AlertMessage type="info" message={notification} onClose={() => setNotification(null)} />
      )}

      {/* Main 2-Column Clinical Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Waiting Queue (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Users size={18} className="text-blue-600" />
                <span>Hàng Đợi Khám Trước Cửa Phòng</span>
              </h3>
              <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                Tổng: {queue.length}
              </span>
            </div>

            {/* Quick Call Next Button */}
            <button
              type="button"
              onClick={handleCallNext}
              className="w-full mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <Volume2 size={18} />
              <span>GỌI BỆNH NHÂN TIẾP THEO (CALL NEXT)</span>
            </button>

            {/* Queue List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {queue.map((patient, index) => {
                const isActive = index === activePatientIndex;
                return (
                  <div
                    key={patient.id}
                    onClick={() => handleSelectPatient(index)}
                    className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-center justify-between ${
                      isActive
                        ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                        : patient.status === 'COMPLETED'
                        ? 'border-slate-100 bg-slate-50 opacity-70 hover:opacity-100'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl font-extrabold flex items-center justify-center text-sm ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : patient.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {patient.queueNumber}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{patient.patientName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {patient.gender} • {new Date().getFullYear() - patient.birthYear} tuổi • Mã: {patient.bookingCode}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {patient.status === 'IN_CONSULTATION' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                          ĐANG KHÁM
                        </span>
                      )}
                      {patient.status === 'WAITING' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          ĐANG CHỜ
                        </span>
                      )}
                      {patient.status === 'COMPLETED' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          ĐÃ KHÁM
                        </span>
                      )}
                      <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                        {patient.checkInTime}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Active Patient Consultation Console (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
            {/* Header of Active Patient */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-lg">
                  {currentPatient.queueNumber}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-800">{currentPatient.patientName}</h2>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">
                      {currentPatient.gender} • {currentPatient.birthYear}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    CCCD: {currentPatient.cccd} • SĐT: {currentPatient.phone}
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                Mã Hẹn: <strong>{currentPatient.bookingCode}</strong>
              </div>
            </div>

            {/* Spring AI Clinical Summary - Highlight of MedSched */}
            <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 rounded-2xl p-4.5 space-y-2.5">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                <Sparkles size={16} className="text-purple-600" />
                <span>TÓM TẮT LÂM SÀNG BỆNH ÁN TỪ SPRING AI:</span>
              </div>
              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl text-xs text-slate-800 leading-relaxed border border-purple-100/80 shadow-xs">
                <p className="font-semibold text-purple-950 mb-1">
                  Triệu chứng bệnh nhân khai báo: &ldquo;{currentPatient.symptoms}&rdquo;
                </p>
                <p className="text-slate-600 italic flex items-start gap-1.5">
                  <Sparkles size={14} className="text-purple-600 shrink-0 mt-0.5" />
                  <span><strong>AI Đánh Giá:</strong> {currentPatient.aiSummary}</span>
                </p>
              </div>
            </div>

            {/* Clinical Diagnosis & Treatment Notes */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Ghi Chú Chẩn Đoán & Chỉ Định Điều Trị Của Bác Sĩ:
              </label>
              <textarea
                rows={4}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Nhập kết quả nghe tim phổi, chỉ định đo điện tim ECG, kê đơn thuốc hoặc hẹn tái khám..."
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs text-slate-800 font-mono leading-relaxed"
              />
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleCallNext}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition shadow-md shadow-emerald-600/20 text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>Hoàn Tất Ca Này & Chuyển Ca Tiếp Theo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
