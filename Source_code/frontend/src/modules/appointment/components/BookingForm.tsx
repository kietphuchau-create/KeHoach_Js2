'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  Clock, 
  Stethoscope, 
  Sparkles, 
  CheckCircle2, 
  Building2, 
  User, 
  ArrowRight, 
  ArrowLeft, 
  QrCode, 
  MapPin, 
  ShieldCheck,
  Printer,
  ChevronRight
} from 'lucide-react';
import { api, AppointmentResponse, getAuthUser } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import LoadingSpinner from '@/shared/components/Feedback/LoadingSpinner';

export default function BookingForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [centers, setCenters] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const user = getAuthUser();
    const roles: string[] = user?.roles || [];
    if (roles.includes('ROLE_ADMIN')) {
      router.push('/admin');
    } else if (roles.includes('ROLE_DOCTOR')) {
      router.push('/doctor');
    } else if (roles.includes('ROLE_STAFF')) {
      router.push('/reception');
    }
  }, [router]);

  // Form selections
  const [selectedCenter, setSelectedCenter] = useState<string>('mc000001-0000-0000-0000-000000000001');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('sp000001-0000-0000-0000-000000000001');
  const [selectedDoctor, setSelectedDoctor] = useState({
    id: 'd0000001-0000-0000-0000-000000000001',
    name: 'PGS.TS.BS Trần Văn Hùng',
    title: 'Trưởng Khoa Nội Tim Mạch',
    room: 'P.201 - Lầu 2',
    fee: 300000,
  });
  const [selectedSlot, setSelectedSlot] = useState({
    id: 'sl000002-0000-0000-0000-000000000001',
    time: '08:30 - 09:00',
    date: 'Hôm nay',
  });
  const [symptoms, setSymptoms] = useState('Đau thắt ngực nhẹ khi leo cầu thang, hồi hộp đánh trống ngực vào buổi tối.');
  const [aiPreview, setAiPreview] = useState<{ specialty: string; summary: string } | null>(null);
  const [analyzingAi, setAnalyzingAi] = useState(false);

  // Submit states
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AppointmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCategories() {
      try {
        const [c, s] = await Promise.all([
          api.getMedicalCenters().catch(() => [
            { id: 'mc000001-0000-0000-0000-000000000001', name: 'MedSched Quận 1', address: '120 Nguyễn Du, P. Bến Thành, Q.1' },
            { id: 'mc000002-0000-0000-0000-000000000002', name: 'MedSched Quận 7', address: '45 Nguyễn Thị Thập, P. Tân Hưng, Q.7' },
          ]),
          api.getSpecialties().catch(() => [
            { id: 'sp000001-0000-0000-0000-000000000001', name: 'Khoa Nội Tim Mạch', code: 'INTERNAL_MEDICINE' },
            { id: 'sp000002-0000-0000-0000-000000000002', name: 'Khoa Da Liễu', code: 'DERMATOLOGY' },
            { id: 'sp000003-0000-0000-0000-000000000003', name: 'Khoa Răng Hàm Mặt', code: 'ODONTO_STOMATOLOGY' },
            { id: 'sp000004-0000-0000-0000-000000000004', name: 'Khoa Mắt', code: 'OPHTHALMOLOGY' },
          ]),
        ]);
        setCenters(c);
        setSpecialties(s);
      } finally {
        setLoadingData(false);
      }
    }
    loadCategories();
  }, []);

  const handleAnalyzeSymptoms = async () => {
    if (!symptoms.trim()) return;
    setAnalyzingAi(true);
    try {
      const res = await api.triageSymptoms(symptoms);
      setAiPreview(res);
    } catch (e: any) {
      console.error(e);
    } finally {
      setAnalyzingAi(false);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await api.bookAppointment({
        medicalCenterId: selectedCenter,
        patientProfileId: 'p0000001-0000-0000-0000-000000000001',
        doctorId: selectedDoctor.id,
        slotId: selectedSlot.id,
        symptoms: symptoms.trim() || 'Khám kiểm tra sức khỏe định kỳ',
        medicalHistory: 'Huyết áp bình thường, không dị ứng thuốc kháng sinh',
      });
      setResult(res);
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Đặt lịch thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const doctorList = [
    {
      id: 'd0000001-0000-0000-0000-000000000001',
      name: 'PGS.TS.BS Trần Văn Hùng',
      title: 'Chuyên gia Tim mạch 25 năm kinh nghiệm',
      room: 'P.201 - Lầu 2',
      fee: 300000,
      specialty: 'Khoa Nội Tim Mạch',
    },
    {
      id: 'd0000002-0000-0000-0000-000000000002',
      name: 'BS.CKII Nguyễn Minh Anh',
      title: 'Bác sĩ chuyên khoa Da Liễu thẩm mỹ',
      room: 'P.104 - Lầu 1',
      fee: 250000,
      specialty: 'Khoa Da Liễu',
    },
    {
      id: 'd0000003-0000-0000-0000-000000000003',
      name: 'ThS.BS Hoàng Trọng Nam',
      title: 'Bác sĩ Phục hình Răng Hàm Mặt',
      room: 'P.302 - Lầu 3',
      fee: 200000,
      specialty: 'Khoa Răng Hàm Mặt',
    },
  ];

  const timeSlots = [
    { id: 'sl000001-0000-0000-0000-000000000001', time: '08:00 - 08:30', status: 'full', label: 'Đã kín chỗ' },
    { id: 'sl000002-0000-0000-0000-000000000001', time: '08:30 - 09:00', status: 'available', label: 'Khả dụng' },
    { id: 'sl000003-0000-0000-0000-000000000001', time: '09:00 - 09:30', status: 'available', label: 'Khả dụng' },
    { id: 'sl000004-0000-0000-0000-000000000001', time: '09:30 - 10:00', status: 'available', label: 'Khả dụng' },
    { id: 'sl000005-0000-0000-0000-000000000001', time: '14:00 - 14:30', status: 'available', label: 'Khả dụng' },
    { id: 'sl000006-0000-0000-0000-000000000001', time: '14:30 - 15:00', status: 'available', label: 'Khả dụng' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
              <Calendar size={14} />
              <span>Cổng Dịch Vụ Khách Hàng MedSched</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Đặt Lịch Khám Trực Tuyến</h1>
            <p className="text-slate-500 text-sm mt-1">
              Quy trình 4 bước đặt trước ca khám theo thời gian thực kết hợp phân loại triệu chứng tự động bằng <strong>Spring AI</strong>.
            </p>
          </div>
          {step < 4 && (
            <div className="bg-slate-100 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 shrink-0">
              Bước {step} / 3
            </div>
          )}
        </div>

        {/* Stepper Wizard Progress */}
        {step < 4 && (
          <div className="grid grid-cols-3 gap-2 pb-6 border-b border-slate-100">
            <button
              onClick={() => setStep(1)}
              className={`p-2.5 rounded-xl text-left transition flex items-center gap-2 cursor-pointer ${
                step === 1 ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 1 ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-700'
              }`}>1</div>
              <span className="text-xs font-semibold hidden sm:inline">Cơ Sở & Khoa</span>
            </button>

            <button
              onClick={() => setStep(2)}
              className={`p-2.5 rounded-xl text-left transition flex items-center gap-2 cursor-pointer ${
                step === 2 ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 2 ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-700'
              }`}>2</div>
              <span className="text-xs font-semibold hidden sm:inline">Bác Sĩ & Giờ</span>
            </button>

            <button
              onClick={() => setStep(3)}
              className={`p-2.5 rounded-xl text-left transition flex items-center gap-2 cursor-pointer ${
                step === 3 ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 3 ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-700'
              }`}>3</div>
              <span className="text-xs font-semibold hidden sm:inline">Triệu Chứng & AI</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mt-4">
            <AlertMessage type="error" message={error} onClose={() => setError(null)} />
          </div>
        )}

        {/* Step 1: Cơ Sở & Chuyên Khoa */}
        {step === 1 && (
          <div className="mt-6 space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                1. Chọn Cơ Sở Y Tế Tiếp Nhận:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {centers.map((center) => (
                  <div
                    key={center.id}
                    onClick={() => setSelectedCenter(center.id)}
                    className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      selectedCenter === center.id
                        ? 'border-blue-600 bg-blue-50/50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800 text-sm">{center.name}</span>
                        {selectedCenter === center.id && <CheckCircle2 size={18} className="text-blue-600" />}
                      </div>
                      <p className="text-xs text-slate-500 flex items-start gap-1">
                        <MapPin size={14} className="shrink-0 mt-0.5" />
                        <span>{center.address}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                2. Chọn Chuyên Khoa Thăm Khám:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {specialties.map((spec) => (
                  <div
                    key={spec.id}
                    onClick={() => setSelectedSpecialty(spec.id)}
                    className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-center justify-between ${
                      selectedSpecialty === spec.id
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <Stethoscope size={16} className="text-blue-600" />
                      <span>{spec.name}</span>
                    </div>
                    {selectedSpecialty === spec.id && <CheckCircle2 size={16} className="text-blue-600" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <span>Tiếp tục chọn Bác sĩ</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Bác Sĩ & Khung Giờ */}
        {step === 2 && (
          <div className="mt-6 space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                1. Chọn Bác Sĩ Phụ Trách:
              </label>
              <div className="space-y-3">
                {doctorList.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoctor(doc)}
                    className={`p-4 rounded-xl border-2 transition cursor-pointer flex items-start justify-between ${
                      selectedDoctor.id === doc.id
                        ? 'border-blue-600 bg-blue-50/50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {doc.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800 text-sm">{doc.name}</h4>
                          <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            {doc.room}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{doc.title}</p>
                        <div className="text-xs font-semibold text-emerald-600 mt-1">
                          Phí tư vấn: {doc.fee.toLocaleString('vi-VN')} đ
                        </div>
                      </div>
                    </div>
                    {selectedDoctor.id === doc.id && <CheckCircle2 size={18} className="text-blue-600" />}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                2. Chọn Khung Giờ Khám (Time-slot):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {timeSlots.map((slot) => {
                  const isFull = slot.status === 'full';
                  const isSelected = selectedSlot.id === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={isFull}
                      onClick={() => setSelectedSlot({ id: slot.id, time: slot.time, date: 'Hôm nay' })}
                      className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                        isFull
                          ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                          : isSelected
                          ? 'border-blue-600 bg-blue-600 text-white shadow-sm cursor-pointer'
                          : 'border-slate-200 bg-white hover:border-blue-400 text-slate-700 cursor-pointer'
                      }`}
                    >
                      <span className="text-xs font-bold">{slot.time}</span>
                      <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-blue-100' : isFull ? 'text-slate-400' : 'text-emerald-600'}`}>
                        {slot.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium text-sm transition cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft size={16} /> Quay lại
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer text-sm"
              >
                <span>Tiếp tục nhập Triệu chứng</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Triệu Chứng & Spring AI Triage */}
        {step === 3 && (
          <form onSubmit={handleBook} className="mt-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Mô Tả Triệu Chứng & Cảm Giác Khó Chịu:
                </label>
                <button
                  type="button"
                  onClick={handleAnalyzeSymptoms}
                  disabled={analyzingAi || !symptoms.trim()}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 transition cursor-pointer"
                >
                  <Sparkles size={13} className="text-purple-600" />
                  <span>{analyzingAi ? 'Đang phân tích...' : 'Thử phân tích AI'}</span>
                </button>
              </div>
              <textarea
                rows={4}
                required
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Ví dụ: Đau tức vùng ngực trái, hồi hộp đánh trống ngực vào ban đêm, thỉnh thoảng choáng nhẹ..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm text-slate-800"
              />
              <p className="text-xs text-slate-400 mt-1">
                * Dữ liệu triệu chứng sẽ được Spring AI xử lý và tóm tắt gửi tới Bác sĩ trước khi bạn bước vào phòng khám.
              </p>
            </div>

            {/* AI Summary Preview Card */}
            {aiPreview && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-purple-800 font-bold text-xs">
                  <Sparkles size={16} className="text-purple-600" />
                  <span>KẾT QUẢ ĐÁNH GIÁ TỰ ĐỘNG TỪ SPRING AI:</span>
                </div>
                <div className="bg-white/80 backdrop-blur-xs p-3 rounded-xl text-xs text-slate-700 border border-purple-100">
                  <div className="font-semibold text-purple-900 mb-0.5">Gợi ý chuyên khoa: {aiPreview.specialty}</div>
                  <p className="italic text-slate-600">{aiPreview.summary}</p>
                </div>
              </div>
            )}

            {/* Appointment Booking Summary Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 text-slate-600">
              <div className="font-bold text-slate-800 text-sm mb-1">Xác nhận thông tin đặt khám:</div>
              <div className="grid grid-cols-2 gap-2">
                <div>Bác sĩ: <strong className="text-slate-800">{selectedDoctor.name}</strong></div>
                <div>Phòng khám: <strong className="text-slate-800">{selectedDoctor.room}</strong></div>
                <div>Khung giờ: <strong className="text-blue-600">{selectedSlot.time} ({selectedSlot.date})</strong></div>
                <div>Giá khám tư vấn: <strong className="text-emerald-600">{selectedDoctor.fee.toLocaleString('vi-VN')} đ</strong></div>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium text-sm transition cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft size={16} /> Quay lại
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer text-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang khóa slot & tạo vé khám...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Xác Nhận & Xuất Vé Khám</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 4: Vé Hẹn Khám Điện Tử (E-Ticket) */}
        {step === 4 && result && (
          <div className="mt-4 space-y-6">
            <div className="bg-gradient-to-b from-blue-600 to-indigo-700 text-white p-6 rounded-t-3xl relative overflow-hidden">
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={24} className="text-cyan-300" />
                  <span className="font-bold tracking-wider text-sm uppercase">Bệnh Viện Đa Khoa MedSched</span>
                </div>
                <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-mono font-bold">VÉ KHÁM ĐIỆN TỬ</span>
              </div>
              <div className="mt-4 text-center relative z-10">
                <span className="text-xs text-blue-200 uppercase tracking-wider">Số Thứ Tự Vào Khám</span>
                <div className="text-4xl font-extrabold text-white mt-0.5 tracking-tight">
                  STT #{result.queueNumber || '02'}
                </div>
                <div className="text-xs text-cyan-200 mt-1">Mã đặt chỗ: <strong className="font-mono text-white text-sm">{result.bookingCode}</strong></div>
              </div>
            </div>

            {/* Ticket body */}
            <div className="bg-white border-2 border-dashed border-slate-200 p-6 rounded-b-3xl -mt-6 pt-8 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-4 border-b border-slate-100">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 block">Bác sĩ chuyên khoa:</span>
                    <strong className="text-slate-800 font-semibold">{selectedDoctor.name}</strong>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Địa điểm & Phòng khám:</span>
                    <span className="text-slate-700 font-medium">{selectedDoctor.room}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Khung giờ hẹn:</span>
                    <span className="text-blue-600 font-bold">{selectedSlot.time} (Hôm nay)</span>
                  </div>
                </div>

                {/* Simulated QR Code Badge */}
                <div className="flex flex-col items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="w-28 h-28 bg-white border border-slate-300 rounded-xl p-2 flex items-center justify-center shadow-inner">
                    <QrCode size={92} className="text-slate-800" />
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-slate-500 mt-2">
                    {result.bookingCode}
                  </span>
                </div>
              </div>

              {/* AI Clinical Summary on ticket */}
              {result.aiSummary && (
                <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl text-xs text-purple-900">
                  <div className="flex items-center gap-1 font-bold mb-0.5 text-purple-800">
                    <Sparkles size={13} />
                    <span>Tóm Tắt Bệnh Án Điện Tử Từ Spring AI:</span>
                  </div>
                  <p className="italic text-slate-700">🤖 {result.aiSummary}</p>
                </div>
              )}

              <div className="text-xs text-slate-500 bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-start gap-2">
                <span className="text-base leading-none">💡</span>
                <span>
                  <strong>Hướng dẫn tiếp đón:</strong> Quý khách vui lòng có mặt trước 10 phút và quét mã QR vé này hoặc đưa thẻ CCCD gắn chip tại Quầy Tiếp Đón để vào thẳng buồng khám.
                </span>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 rounded-xl transition text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer size={16} />
                  <span>In Phiếu / Lưu PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setStep(1);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar size={16} />
                  <span>Đặt ca khám mới</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
