'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Sparkles,
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Bot,
  AlertCircle,
  Phone,
  MapPin,
  Clock,
  User,
  QrCode,
  Tag,
  Check,
  Building2,
  RefreshCw,
  Stethoscope,
  ShieldAlert,
  ChevronRight,
  ShieldCheck,
  Award,
  Pencil
} from 'lucide-react';
import { api, getAuthToken, getAuthUser } from '@/shared/lib/api';

export interface BookingMethodSelectorProps {
  isModal?: boolean;
  onClose?: () => void;
  initialMode?: 'select' | 'ai';
}

// ---------------------------------------------------------------------------
// 1. TỪ KHÓA NGUY HIỂM — CẤP CỨU KHẨN CẤP (SAFETY GUARDRAIL 115)
// ---------------------------------------------------------------------------
const EMERGENCY_KEYWORDS = [
  'đau thắt ngực', 'đau ngực dữ dội', 'tức ngực dữ dội', 'bóp nghẹt ngực',
  'khó thở dữ dội', 'thở dốc tím tái', 'ngưng thở', 'không thở được',
  'ngất xỉu', 'ngất', 'mất ý thức', 'hôn mê', 'bất tỉnh',
  'đột quỵ', 'tai biến', 'liệt nửa người', 'méo miệng', 'nói ngọng đột ngột',
  'nôn ra máu', 'ho ra máu tươi', 'xuất huyết dữ dội', 'chảy máu không cầm',
  'tai nạn giao thông', 'chấn thương sọ não', 'gãy xương hở', 'ngộ độc cấp',
  'co giật', 'sốt co giật', 'lú lẫn đột ngột'
];

function isEmergencySymptom(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return EMERGENCY_KEYWORDS.some(kw => lower.includes(kw));
}

// ---------------------------------------------------------------------------
// 2. CÁC NHÓM TRIỆU CHỨNG BAN ĐẦU & CÂU HỎI TRẮC NGHIỆM CHI TIẾT
// ---------------------------------------------------------------------------
interface SymptomCategory {
  id: string;
  label: string;
  specialtyCode: string;
  specialtyName: string;
  recommendedService: string;
  estimatedFee: string;
  natureOptions: string[];
  durationOptions: string[];
  associatedOptions: string[];
}

const SYMPTOM_CATEGORIES: Record<string, SymptomCategory> = {
  HEADACHE: {
    id: 'HEADACHE',
    label: '🤕 Đau đầu, chóng mặt',
    specialtyCode: 'INTERNAL_MEDICINE',
    specialtyName: 'Khoa Nội Tổng Quát & Thần Kinh',
    recommendedService: 'Gói Khám Thần Kinh & Đo Lưu Huyết Não',
    estimatedFee: '200.000 VNĐ',
    natureOptions: [
      'Nhói nửa đầu theo nhịp mạch',
      'Căng tức nặng cả đầu',
      'Âm ỉ sau gáy hoặc vùng trán',
      'Choáng váng khi đứng lên ngồi xuống'
    ],
    durationOptions: [
      'Mới bị hôm nay',
      'Được 2 - 3 ngày nay',
      'Kéo dài hơn 1 tuần',
      'Tái phát từng đợt nhiều tháng'
    ],
    associatedOptions: [
      'Buồn nôn hoặc sợ ánh sáng',
      'Mất ngủ, căng thẳng stress',
      'Sốt nhẹ, mệt mỏi toàn thân',
      'Không có triệu chứng đi kèm'
    ]
  },
  ABDOMINAL: {
    id: 'ABDOMINAL',
    label: '🤢 Đau bụng, tiêu hóa',
    specialtyCode: 'INTERNAL_MEDICINE',
    specialtyName: 'Khoa Nội Tiêu Hóa & Gan Mật',
    recommendedService: 'Gói Khám Tiêu Hóa & Siêu Âm Ổ Bụng',
    estimatedFee: '200.000 VNĐ',
    natureOptions: [
      'Đau âm ỉ trên rốn (vùng thượng vị)',
      'Quặn từng cơn quanh rốn',
      'Đau tức vùng bụng dưới',
      'Ợ chua, nóng rát thực quản'
    ],
    durationOptions: [
      'Mới bị vài giờ gần đây',
      'Được 1 - 2 ngày',
      'Kéo dài hơn 1 tuần',
      'Đau nhiều sau bữa ăn'
    ],
    associatedOptions: [
      'Buồn nôn hoặc nôn mửa',
      'Tiêu chảy hoặc phân lỏng',
      'Đầy hơi, khó tiêu chướng bụng',
      'Không có triệu chứng đi kèm'
    ]
  },
  RESPIRATORY: {
    id: 'RESPIRATORY',
    label: '🔥 Sốt, ho, cảm cúm',
    specialtyCode: 'INTERNAL_MEDICINE',
    specialtyName: 'Khoa Nội Hô Hấp & Truyền Nhiễm',
    recommendedService: 'Gói Khám Hô Hấp & Nội Soi Tai Mũi Họng',
    estimatedFee: '200.000 VNĐ',
    natureOptions: [
      'Sốt cao trên 38.5°C kèm lạnh run',
      'Ho khan, rát buốt cổ họng',
      'Ho có đờm, nghẹt đờm mũi',
      'Đau rát họng khi nuốt thức ăn'
    ],
    durationOptions: [
      'Mới bị từ sáng hoặc đêm qua',
      'Được 2 - 3 ngày nay',
      'Kéo dài 4 - 7 ngày',
      'Kéo dài trên 1 tuần'
    ],
    associatedOptions: [
      'Sổ mũi, hắt hơi liên tục',
      'Đau nhức mỏi cơ toàn thân',
      'Khó thở nhẹ khi vận động',
      'Không có triệu chứng đi kèm'
    ]
  },
  FATIGUE: {
    id: 'FATIGUE',
    label: '😫 Mệt mỏi, suy nhược',
    specialtyCode: 'INTERNAL_MEDICINE',
    specialtyName: 'Khoa Nội Tổng Quát & Khám Sức Khỏe',
    recommendedService: 'Gói Khám Sức Khỏe Tổng Quát & Tầm Soát Suy Nhược',
    estimatedFee: '200.000 VNĐ',
    natureOptions: [
      'Người uể oải, kiệt sức không có lực',
      'Hụt hơi, choáng váng hoa mắt khi vận động',
      'Chán ăn, sụt cân, ngủ li bì hoặc mất ngủ',
      'Mệt rã rời tay chân, đuối sức cả ngày'
    ],
    durationOptions: [
      'Mới bị 1 - 2 ngày gần đây',
      'Được khoảng 1 tuần nay',
      'Kéo dài từ 2 - 4 tuần',
      'Tình trạng suy nhược kéo dài nhiều tháng'
    ],
    associatedOptions: [
      'Kèm chán ăn, đắng miệng, sụt cân',
      'Kèm mất ngủ, trằn trọc, căng thẳng',
      'Kèm hồi hộp, tim đập nhanh',
      'Không có triệu chứng đi kèm'
    ]
  },
  BONE_JOINT: {
    id: 'BONE_JOINT',
    label: '🦴 Đau nhức xương khớp',
    specialtyCode: 'INTERNAL_MEDICINE',
    specialtyName: 'Khoa Nội Tổng Quát & Cơ Xương Khớp',
    recommendedService: 'Gói Khám Cơ Xương Khớp & Chụp X-Quang',
    estimatedFee: '200.000 VNĐ',
    natureOptions: [
      'Đau mỏi vai gáy hoặc cột sống thắt lưng',
      'Đau nhức khớp gối khi lên xuống cầu thang',
      'Tê bì đầu ngón tay, bàn chân',
      'Cứng khớp, khó vận động vào buổi sáng'
    ],
    durationOptions: [
      'Mới đau 2 - 3 ngày nay',
      'Kéo dài hơn 1 tuần',
      'Đau âm ỉ từ 1 - 3 tháng',
      'Tái phát kinh niên nhiều năm'
    ],
    associatedOptions: [
      'Kèm sưng nóng đỏ tại khớp',
      'Hạn chế cử động, khó cúi gập',
      'Kèm tiếng lạo xạo khi co duỗi khớp',
      'Không có triệu chứng đi kèm'
    ]
  },
  SKIN: {
    id: 'SKIN',
    label: '🔴 Ngứa, dị ứng da',
    specialtyCode: 'DERMATOLOGY',
    specialtyName: 'Chuyên Khoa Da Liễu & Thẩm Mỹ',
    recommendedService: 'Gói Khám & Soi Da Kỹ Thuật Số',
    estimatedFee: '250.000 VNĐ',
    natureOptions: [
      'Nổi mẩn đỏ ngứa ngáy dữ dội',
      'Nổi mề đay thành từng mảng',
      'Mụn nước hoặc sưng viêm rát',
      'Bong tróc, khô ngứa nứt nẻ'
    ],
    durationOptions: [
      'Mới xuất hiện sau khi ăn thức ăn lạ',
      'Được 2 - 3 ngày nay',
      'Kéo dài hơn 1 tuần',
      'Tái phát định kỳ khi thời tiết đổi'
    ],
    associatedOptions: [
      'Ngứa nhiều vào ban đêm',
      'Sưng phù mí mắt hoặc môi',
      'Rát buốt tại vùng tổn thương',
      'Không có triệu chứng đi kèm'
    ]
  },
  DENTAL: {
    id: 'DENTAL',
    label: '🦷 Đau răng, sưng nướu',
    specialtyCode: 'ODONTO_STOMATOLOGY',
    specialtyName: 'Chuyên Khoa Răng Hàm Mặt',
    recommendedService: 'Gói Khám Răng Toàn Diện & Chụp X-Quang',
    estimatedFee: '150.000 VNĐ',
    natureOptions: [
      'Đau buốt nhói khi ăn đồ nóng lạnh',
      'Đau nhức âm ỉ chân răng liên tục',
      'Sưng đỏ nướu hoặc chảy máu chân răng',
      'Đau răng khôn góc hàm trong cùng'
    ],
    durationOptions: [
      'Mới bị 1 - 2 ngày gần đây',
      'Được 3 - 5 ngày',
      'Đau dữ dội về ban đêm',
      'Kéo dài trên 1 tuần'
    ],
    associatedOptions: [
      'Kèm sưng một bên má',
      'Hơi thở có mùi khó chịu',
      'Khó há miệng hoặc khó nhai',
      'Không có triệu chứng đi kèm'
    ]
  },
  EYE: {
    id: 'EYE',
    label: '👁️ Mắt mờ, cộm rát',
    specialtyCode: 'OPHTHALMOLOGY',
    specialtyName: 'Chuyên Khoa Mắt (Nhãn Khoa)',
    recommendedService: 'Khám Mắt Tổng Quát & Kiểm Tra Thị Lực',
    estimatedFee: '200.000 VNĐ',
    natureOptions: [
      'Cộm xốn, đỏ mắt như có cát',
      'Mắt mờ, nhìn không rõ nét',
      'Chảy nước mắt và đổ ghèn nhiều',
      'Mỏi mắt, khô rát khi nhìn máy tính'
    ],
    durationOptions: [
      'Mới bị hôm nay',
      'Được 2 - 3 ngày nay',
      'Kéo dài hơn 1 tuần',
      'Tăng dần sau giờ làm việc'
    ],
    associatedOptions: [
      'Sợ ánh sáng hoặc chói mắt',
      'Ngứa và hay dụi mắt',
      'Đau nhức quanh hốc mắt',
      'Không có triệu chứng đi kèm'
    ]
  }
};

// ---------------------------------------------------------------------------
// 3. CHI NHÁNH MEDSCHED & BẢNG ÁNH XẠ KHU VỰC GẦN NHẤT
// ---------------------------------------------------------------------------
interface ClinicBranch {
  id: string;
  code: string;
  name: string;
  shortName: string;
  address: string;
  phone: string;
  districtKeywords: string[];
}

const CLINIC_BRANCHES: ClinicBranch[] = [
  {
    id: 'a1b2c3d4-0001-4000-8000-000000000001',
    code: 'MED_CN1',
    name: 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Trần Đại Nghĩa',
    shortName: 'Chi Nhánh Trần Đại Nghĩa (Bình Tân)',
    address: 'TOTALE COFFEE TEA, 96 Đ. Trần Đại Nghĩa, Tân Tạo, Hồ Chí Minh, Việt Nam',
    phone: '028 3912 3456 (Hotline tiếp đón)',
    districtKeywords: [
      'bình tân', 'tân tạo', 'trần đại nghĩa', 'an lạc', 'bình chánh', 'vĩnh lộc',
      'tân kiên', 'tên lửa', 'quốc lộ 1a', 'kinh dương vương', 'quận 6', 'q6', 'q.6',
      'quận 8', 'q8', 'q.8', 'long an'
    ]
  },
  {
    id: 'a1b2c3d4-0002-4000-8000-000000000002',
    code: 'MED_CN2',
    name: 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Trịnh Đình Thảo (ITC)',
    shortName: 'Chi Nhánh ITC Trịnh Đình Thảo (Tân Phú)',
    address: 'Cao Đẳng Công Nghệ Thông Tin TP.HCM, 12 Đ. Trịnh Đình Thảo, Tân Phú, Hồ Chí Minh 700000, Việt Nam',
    phone: '028 3999 8877 (Hotline tiếp đón)',
    districtKeywords: [
      'tân phú', 'trịnh đình thảo', 'hòa thạnh', 'itc', 'tân bình', 'quận 11', 'q11', 'q.11',
      'quận 10', 'q10', 'q.10', 'đầm sen', 'lũy bán bích', 'thoại ngọc hầu', 'quận 5', 'q5', 'q.5',
      'quận 3', 'q3', 'q.3', 'quận 1', 'q1', 'q.1', 'gò vấp', 'phú nhuận', 'bình thạnh',
      'quận 12', 'q12', 'hóc môn', 'thủ đức', 'quận 7', 'q7', 'nhà bè'
    ]
  }
];

// ---------------------------------------------------------------------------
// 4. DANH SÁCH BÁC SĨ MẪU CHUẨN & DỊCH VỤ PHÒNG KHÁM
// ---------------------------------------------------------------------------
interface ClinicServiceOption {
  id: string;
  label: string;
  feeText: string;
  icon: string;
  desc: string;
}

const CLINIC_SERVICES: ClinicServiceOption[] = [
  { id: 'STANDARD', label: 'Khám Chuyên Khoa Tiêu Chuẩn', feeText: '200.000 đ', icon: '🩺', desc: 'Khám lâm sàng, chẩn đoán và tư vấn phác đồ điều trị theo quy chuẩn phòng khám MedSched' },
];

interface TimeShiftOption {
  id: string;
  label: string;
  timeRange: string;
  icon: string;
}

const TIME_SHIFTS: TimeShiftOption[] = [
  { id: 'MORNING', label: 'Buổi Sáng', timeRange: '08:00 - 11:30', icon: '🌅' },
  { id: 'AFTERNOON', label: 'Buổi Chiều', timeRange: '13:30 - 16:00', icon: '🌇' },
];

interface DemoDoctor {
  id: string;
  name: string;
  title: string;
  specialtyCode: string;
  centerId: string;
  room: string;
  fee: number;
  gender: 'male' | 'female';
  isExpert?: boolean;
}

const DEMO_DOCTORS: DemoDoctor[] = [
  // Khoa Nội & Thần Kinh (Chi Nhánh 1 - Bình Tân)
  {
    id: 'doc-01',
    name: 'BS.CKII Nguyễn Văn An',
    title: 'Trưởng Khoa Nội & Thần Kinh (20 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    centerId: 'a1b2c3d4-0001-4000-8000-000000000001',
    room: 'Phòng P.208 - Tầng 2',
    fee: 200000,
    gender: 'male',
    isExpert: true,
  },
  {
    id: 'doc-01b',
    name: 'BS.CKI Hoàng Mỹ Linh',
    title: 'Bác sĩ Nội Thần Kinh - Giấc Ngủ (14 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    centerId: 'a1b2c3d4-0001-4000-8000-000000000001',
    room: 'Phòng P.206 - Tầng 2',
    fee: 200000,
    gender: 'female',
    isExpert: false,
  },
  // Khoa Nội & Thần Kinh (Chi Nhánh 2 - ITC Tân Phú)
  {
    id: 'doc-02',
    name: 'ThS.BS Trần Thị Mai',
    title: 'Phó Khoa Nội - Chuyên gia Hô Hấp (15 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    centerId: 'a1b2c3d4-0002-4000-8000-000000000002',
    room: 'Phòng P.101 - Tầng 1',
    fee: 200000,
    gender: 'female',
    isExpert: true,
  },
  {
    id: 'doc-02b',
    name: 'BS.CKII Lê Quang Vinh',
    title: 'Bác sĩ Nội Thần Kinh & Đau Đầu (18 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    centerId: 'a1b2c3d4-0002-4000-8000-000000000002',
    room: 'Phòng P.103 - Tầng 1',
    fee: 250000,
    gender: 'male',
    isExpert: true,
  },
  // Da Liễu
  {
    id: 'doc-03',
    name: 'BS.CKI Lê Hoàng Nam',
    title: 'Bác sĩ Da liễu & Laser Thẩm mỹ (15 năm kinh nghiệm)',
    specialtyCode: 'DERMATOLOGY',
    centerId: 'a1b2c3d4-0002-4000-8000-000000000002',
    room: 'Phòng P.102 - Tầng 1',
    fee: 250000,
    gender: 'male',
    isExpert: true,
  },
  {
    id: 'doc-03b',
    name: 'ThS.BS Bùi Phương Thảo',
    title: 'Chuyên gia Da Liễu & Dị Ứng (12 năm kinh nghiệm)',
    specialtyCode: 'DERMATOLOGY',
    centerId: 'a1b2c3d4-0001-4000-8000-000000000001',
    room: 'Phòng P.202 - Tầng 2',
    fee: 250000,
    gender: 'female',
    isExpert: false,
  },
  // Mắt (Nhãn Khoa)
  {
    id: 'doc-04',
    name: 'BS.CKII Phạm Quỳnh Chi',
    title: 'Chuyên gia Mắt & Khúc xạ giác mạc (16 năm kinh nghiệm)',
    specialtyCode: 'OPHTHALMOLOGY',
    centerId: 'a1b2c3d4-0001-4000-8000-000000000001',
    room: 'Phòng P.205 - Tầng 2',
    fee: 200000,
    gender: 'female',
    isExpert: true,
  },
  {
    id: 'doc-04b',
    name: 'ThS.BS Nguyễn Thanh Tùng',
    title: 'Bác sĩ Nhãn Khoa Tổng Quát (11 năm kinh nghiệm)',
    specialtyCode: 'OPHTHALMOLOGY',
    centerId: 'a1b2c3d4-0002-4000-8000-000000000002',
    room: 'Phòng P.105 - Tầng 1',
    fee: 200000,
    gender: 'male',
    isExpert: false,
  },
  // Răng Hàm Mặt
  {
    id: 'doc-05',
    name: 'ThS.BS Vũ Minh Đức',
    title: 'Bác sĩ Răng Hàm Mặt & Phục hình (10 năm kinh nghiệm)',
    specialtyCode: 'ODONTO_STOMATOLOGY',
    centerId: 'a1b2c3d4-0001-4000-8000-000000000001',
    room: 'Phòng P.209 - Tầng 2',
    fee: 150000,
    gender: 'male',
    isExpert: false,
  },
  {
    id: 'doc-05b',
    name: 'BS.CKI Đỗ Bích Ngọc',
    title: 'Chuyên gia Chỉnh Nha & Nha Khoa Trẻ Em (13 năm kinh nghiệm)',
    specialtyCode: 'ODONTO_STOMATOLOGY',
    centerId: 'a1b2c3d4-0002-4000-8000-000000000002',
    room: 'Phòng P.104 - Tầng 1',
    fee: 150000,
    gender: 'female',
    isExpert: true,
  }
];

interface ClinicTimeSlot {
  time: string;
  startMinutes: number;
  session: 'MORNING' | 'AFTERNOON';
}

const BASE_TIME_SLOTS: ClinicTimeSlot[] = [
  // Buổi Sáng (08:00 - 11:30)
  { time: '08:00 - 08:30', startMinutes: 8 * 60, session: 'MORNING' },
  { time: '08:30 - 09:00', startMinutes: 8 * 60 + 30, session: 'MORNING' },
  { time: '09:00 - 09:30', startMinutes: 9 * 60, session: 'MORNING' },
  { time: '09:30 - 10:00', startMinutes: 9 * 60 + 30, session: 'MORNING' },
  { time: '10:00 - 10:30', startMinutes: 10 * 60, session: 'MORNING' },
  { time: '10:30 - 11:00', startMinutes: 10 * 60 + 30, session: 'MORNING' },
  // Buổi Chiều (13:30 - 16:00)
  { time: '13:30 - 14:00', startMinutes: 13 * 60 + 30, session: 'AFTERNOON' },
  { time: '14:00 - 14:30', startMinutes: 14 * 60, session: 'AFTERNOON' },
  { time: '14:30 - 15:00', startMinutes: 14 * 60 + 30, session: 'AFTERNOON' },
  { time: '15:00 - 15:30', startMinutes: 15 * 60, session: 'AFTERNOON' },
  { time: '15:30 - 16:00', startMinutes: 15 * 60 + 30, session: 'AFTERNOON' },
];

// Helper xử lý ngày giờ đồng bộ chuẩn với BookingForm
const getTodayISODate = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${year}-${month}-${day}`;
};

const isPastAllTodaySlots = (): boolean => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= 15 * 60 + 30; // 15:30
};

const getNextAvailableWeekday = (baseDate?: Date): string => {
  const d = baseDate ? new Date(baseDate) : new Date();
  if (!baseDate && isPastAllTodaySlots()) {
    d.setDate(d.getDate() + 1);
  }
  // Bỏ qua Thứ 7 (6) và Chủ Nhật (0)
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
};

const formatVietnameseFullDate = (iso: string): string => {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts.map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = dateObj.getDay();
  const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const dayName = dayNames[dayOfWeek] || '';
  return `${dayName}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
};

const getUpcomingWeekdays = (count: number = 5): Array<{ iso: string; label: string; subLabel: string }> => {
  const result: Array<{ iso: string; label: string; subLabel: string }> = [];
  const todayIso = getTodayISODate();
  const cur = new Date();
  if (isPastAllTodaySlots()) {
    cur.setDate(cur.getDate() + 1);
  }
  while (result.length < count) {
    if (cur.getDay() !== 0 && cur.getDay() !== 6) {
      const day = String(cur.getDate()).padStart(2, '0');
      const month = String(cur.getMonth() + 1).padStart(2, '0');
      const year = cur.getFullYear();
      const iso = `${year}-${month}-${day}`;
      const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      const dayName = dayNames[cur.getDay()];
      
      let label = `${dayName} (${day}/${month})`;
      if (iso === todayIso) {
        label = `Hôm nay (${day}/${month})`;
      } else {
        const tom = new Date();
        tom.setDate(tom.getDate() + 1);
        const tomDay = String(tom.getDate()).padStart(2, '0');
        const tomMonth = String(tom.getMonth() + 1).padStart(2, '0');
        const tomIso = `${tom.getFullYear()}-${tomMonth}-${tomDay}`;
        if (iso === tomIso) {
          label = `Ngày mai (${day}/${month})`;
        }
      }
      result.push({ iso, label, subLabel: `${day}/${month}/${year}` });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return result;
};

// Cấu hình ngân hàng VietQR chính thức của Trưởng nhóm (KienlongBank)
const VIETQR_BANK_CONFIG = {
  bankId: 'KLB',
  bankName: 'KienlongBank - Ngân Hàng TMCP Kiên Long',
  accountNo: '18112007',
  accountName: 'CHAU TUAN KIET',
  depositAmount: 2000,
};

// ---------------------------------------------------------------------------
// 5. COMPONENT CHÍNH
// ---------------------------------------------------------------------------
type AiWizardStep =
  | 'CHOOSE_SYMPTOM'      // Bước 1: Chọn triệu chứng ban đầu hoặc gõ
  | 'CLARIFY_DETAILS'     // Bước 2: Chọn chi tiết: Đau như thế nào, Đau bao lâu, Kèm theo gì
  | 'INPUT_LOCATION'      // Bước 3: Chọn Chi nhánh phòng khám MedSched
  | 'SELECT_DOCTOR_SLOT'  // Bước 4: Chọn Bác sĩ & Giờ khám khả dụng còn trống
  | 'CONFIRM_PAYMENT'     // Bước 5: Quét mã chuyển 2k hoặc nhập mã khuyến mãi
  | 'COMPLETED'           // Bước 6: Hoàn tất đặt chỗ & cấp mã hẹn
  | 'EMERGENCY';          // Cảnh báo cấp cứu khẩn cấp 115

export default function BookingMethodSelector({
  isModal = false,
  onClose,
  initialMode = 'select',
}: BookingMethodSelectorProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'select' | 'ai'>(initialMode);

  // Trạng thái từng bước của AI Wizard
  const [aiStep, setAiStep] = useState<AiWizardStep>('CHOOSE_SYMPTOM');

  // Dữ liệu người dùng chọn
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>('HEADACHE');
  const [customSymptomInput, setCustomSymptomInput] = useState<string>('');
  
  // Trạng thái gọi Gemini 2.5 AI Triage thực tế
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);
  const [aiClinicalSummary, setAiClinicalSummary] = useState<string>('');
  const [aiPreparationAdvice, setAiPreparationAdvice] = useState<string>('');

  // Bước 2: Các lựa chọn chi tiết & ô nhập tình trạng khác
  const [selectedNature, setSelectedNature] = useState<string>('');
  const [customNatureInput, setCustomNatureInput] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<string>('');
  const [selectedAssociated, setSelectedAssociated] = useState<string>('');
  const [otherSymptomDetail, setOtherSymptomDetail] = useState<string>('');

  // Bước 3: Chi nhánh & Dịch vụ phòng khám & Ngày khám
  const [selectedBranch, setSelectedBranch] = useState<ClinicBranch>(CLINIC_BRANCHES[0]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('STANDARD');
  const [bookingDate, setBookingDate] = useState<string>(() => getNextAvailableWeekday());
  const [selectedShiftId, setSelectedShiftId] = useState<string>('MORNING');

  // Danh sách 5 ngày làm việc sắp tới (Thứ 2 đến Thứ 6)
  const upcomingWeekdays = useMemo(() => getUpcomingWeekdays(5), []);

  // Lọc các khung giờ theo Buổi và Ngày khám (tự động disable giờ đã qua nếu là hôm nay)
  const shiftSlots = useMemo(() => {
    const isToday = bookingDate === getTodayISODate();
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return BASE_TIME_SLOTS.filter(s => s.session === selectedShiftId).map(slot => {
      const isPast = isToday && slot.startMinutes <= currentMinutes;
      return {
        ...slot,
        disabled: isPast,
        label: isPast ? 'Đã qua giờ' : 'Khả dụng',
      };
    });
  }, [selectedShiftId, bookingDate]);

  // Bước 4: Bác sĩ & Khung giờ & Bộ lọc
  const [selectedDoctor, setSelectedDoctor] = useState<DemoDoctor | null>(null);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>('08:00 - 08:30');
  const [doctorFilter, setDoctorFilter] = useState<'ALL' | 'EXPERT' | 'MALE' | 'FEMALE'>('ALL');

  // Tự động đồng bộ slot hợp lệ đầu tiên khi đổi buổi hoặc đổi ngày
  useEffect(() => {
    const firstAvailable = shiftSlots.find(s => !s.disabled);
    if (firstAvailable) {
      if (!shiftSlots.some(s => s.time === selectedSlotTime && !s.disabled)) {
        setSelectedSlotTime(firstAvailable.time);
      }
    } else {
      setSelectedSlotTime('');
    }
  }, [shiftSlots]);

  // Bước 5: Thông tin bệnh nhân & Thanh toán cọc / Voucher
  const [patientName, setPatientName] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [paymentTab, setPaymentTab] = useState<'vietqr' | 'promo'>('vietqr');
  const [promoCodeInput, setPromoCodeInput] = useState<string>('');
  const [promoApplied, setPromoApplied] = useState<boolean>(false);
  const [promoMessage, setPromoMessage] = useState<string>('');
  const [bookingSuccessCode, setBookingSuccessCode] = useState<string>('');

  // Tự động điền thông tin nếu đã đăng nhập
  useEffect(() => {
    const user = getAuthUser();
    if (user) {
      if (user.fullName) setPatientName(user.fullName);
      if (user.phone) setPatientPhone(user.phone);
    }
  }, []);

  const activeCategory = useMemo(() => {
    return SYMPTOM_CATEGORIES[selectedCategoryKey] || SYMPTOM_CATEGORIES.HEADACHE;
  }, [selectedCategoryKey]);

  // Lọc danh sách bác sĩ theo chuyên khoa, chi nhánh và bộ lọc tiêu chí
  const availableDoctors = useMemo(() => {
    let matched = DEMO_DOCTORS.filter(
      d => d.specialtyCode === activeCategory.specialtyCode && d.centerId === selectedBranch.id
    );
    if (matched.length === 0) {
      matched = DEMO_DOCTORS.filter(d => d.specialtyCode === activeCategory.specialtyCode);
    }
    if (matched.length === 0) matched = [DEMO_DOCTORS[0]];

    if (doctorFilter === 'EXPERT') {
      const filtered = matched.filter(d => d.isExpert);
      return filtered.length > 0 ? filtered : matched;
    } else if (doctorFilter === 'MALE') {
      const filtered = matched.filter(d => d.gender === 'male');
      return filtered.length > 0 ? filtered : matched;
    } else if (doctorFilter === 'FEMALE') {
      const filtered = matched.filter(d => d.gender === 'female');
      return filtered.length > 0 ? filtered : matched;
    }
    return matched;
  }, [activeCategory, selectedBranch, doctorFilter]);

  // Cập nhật bác sĩ mặc định khi danh sách bác sĩ thay đổi
  useEffect(() => {
    if (availableDoctors.length > 0) {
      setSelectedDoctor(availableDoctors[0]);
    }
  }, [availableDoctors]);

  // --- XỬ LÝ SỰ KIỆN ---

  const handleChooseManual = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('medsched_open_ai');
    }
    if (onClose) onClose();
    router.push('/booking');
  };

  const handleSelectAiMode = () => {
    const token = getAuthToken();
    if (!token) {
      if (onClose) onClose();
      router.push('/login?reason=ai_required&redirect=/booking-method');
      return;
    }
    setViewMode('ai');
    setAiStep('CHOOSE_SYMPTOM');
  };

  // Bước 1: Khi bấm chọn một triệu chứng ban đầu
  const handleSelectSymptomPill = (categoryKey: string) => {
    // Kiểm tra cấp cứu nếu là gõ tự do
    setSelectedCategoryKey(categoryKey);
    const cat = SYMPTOM_CATEGORIES[categoryKey];
    if (cat) {
      // Đặt mặc định lựa chọn đầu tiên để người dùng dễ chọn
      setSelectedNature(cat.natureOptions[0] || '');
      setCustomNatureInput('');
      setSelectedDuration(cat.durationOptions[0] || '');
      setSelectedAssociated(cat.associatedOptions[0] || '');
    }
    // Chuyển sang Bước 2: Hiển thị các câu hỏi trắc nghiệm chi tiết
    setAiStep('CLARIFY_DETAILS');
  };

  // Khi người dùng bấm nút Phân tích từ ô nhập tự do (Gọi Gemini 2.5 AI Triage thực tế từ Backend)
  const handleAnalyzeCustomInput = async () => {
    const text = customSymptomInput.trim();
    if (!text) return;

    // 1. Kiểm tra an toàn khẩn cấp 115 nhanh ở Client
    if (isEmergencySymptom(text)) {
      setAiStep('EMERGENCY');
      return;
    }

    setIsAiAnalyzing(true);
    try {
      // 2. Gửi triệu chứng tới Backend Gemini 2.5 AI Triage Engine
      const triage = await api.triageSymptoms(text);

      if (triage?.isEmergency) {
        setAiStep('EMERGENCY');
        setIsAiAnalyzing(false);
        return;
      }

      if (triage?.clinicalSummary || triage?.summary) {
        setAiClinicalSummary(triage.clinicalSummary || triage.summary);
      }
      if (triage?.preparationAdvice) {
        setAiPreparationAdvice(triage.preparationAdvice);
      }

      // Xác định Chuyên mục phù hợp từ mã chuyên khoa AI trả về
      const code = triage?.specialtyCode || triage?.specialty || '';
      const lower = text.toLowerCase();
      let targetKey = 'FATIGUE';

      if (code === 'DERMATOLOGY') {
        targetKey = 'SKIN';
      } else if (code === 'ODONTO_STOMATOLOGY') {
        targetKey = 'DENTAL';
      } else if (code === 'OPHTHALMOLOGY') {
        targetKey = 'EYE';
      } else {
        // INTERNAL_MEDICINE (Khoa Nội Đa Khoa)
        if (
          lower.includes('đầu') ||
          lower.includes('chóng mặt') ||
          lower.includes('nhức đầu') ||
          lower.includes('mất ngủ') ||
          lower.includes('hoa mắt') ||
          lower.includes('choáng váng')
        ) {
          targetKey = 'HEADACHE';
        } else if (
          lower.includes('bụng') ||
          lower.includes('dạ dày') ||
          lower.includes('tiêu chảy') ||
          lower.includes('ợ chua') ||
          lower.includes('nôn') ||
          lower.includes('buồn nôn') ||
          lower.includes('tiêu hóa') ||
          lower.includes('đầy hơi') ||
          lower.includes('bao tử')
        ) {
          targetKey = 'ABDOMINAL';
        } else if (
          lower.includes('sốt') ||
          lower.includes('ho') ||
          lower.includes('cảm') ||
          lower.includes('cúm') ||
          lower.includes('họng') ||
          lower.includes('sổ mũi') ||
          lower.includes('nghẹt mũi') ||
          lower.includes('rát họng')
        ) {
          targetKey = 'RESPIRATORY';
        } else if (
          lower.includes('khớp') ||
          lower.includes('xương') ||
          lower.includes('vai gáy') ||
          lower.includes('lưng') ||
          lower.includes('cột sống') ||
          lower.includes('đầu gối') ||
          lower.includes('tê bì') ||
          lower.includes('thoái hóa')
        ) {
          targetKey = 'BONE_JOINT';
        } else {
          // Mệt mỏi, suy nhược hoặc đau nhức toàn thân
          targetKey = 'FATIGUE';
        }
      }

      setSelectedCategoryKey(targetKey);
      const cat = SYMPTOM_CATEGORIES[targetKey];
      if (cat) {
        const isPreset = cat.natureOptions.includes(text);
        if (isPreset) {
          setSelectedNature(text);
          setCustomNatureInput('');
        } else {
          setCustomNatureInput(text);
          setSelectedNature(text);
        }
        setSelectedDuration(cat.durationOptions[0] || '');
        setSelectedAssociated(cat.associatedOptions[0] || '');
      }

      // Đưa tóm tắt lâm sàng từ Gemini AI vào phần ghi chú cho bác sĩ
      const aiSummaryText = triage?.clinicalSummary ? ` [AI Triage: ${triage.clinicalSummary}]` : '';
      if (!otherSymptomDetail) {
        setOtherSymptomDetail(`Bệnh nhân mô tả: ${text}${aiSummaryText}`);
      }

      setAiStep('CLARIFY_DETAILS');
    } catch (error) {
      console.warn('Lỗi gọi AI triage, fallback sang nhận diện cục bộ:', error);
      setSelectedCategoryKey('FATIGUE');
      setAiStep('CLARIFY_DETAILS');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // Bước 2 -> Bước 3: Sau khi chọn xong chi tiết triệu chứng -> Sang chọn Chi nhánh
  const handleProceedToLocation = () => {
    // Kiểm tra nếu trong chi tiết hoặc tình trạng khác có từ khóa cấp cứu
    const combined = `${selectedNature} ${selectedDuration} ${selectedAssociated} ${otherSymptomDetail} ${customSymptomInput}`;
    if (isEmergencySymptom(combined)) {
      setAiStep('EMERGENCY');
      return;
    }
    setAiStep('INPUT_LOCATION');
  };

  // Bước 3 -> Bước 4: Sau khi chọn chi nhánh -> Chuyển sang chọn Bác sĩ & Giờ
  const handleProceedToDoctorSlot = () => {
    setAiStep('SELECT_DOCTOR_SLOT');
  };

  // Bước 4 -> Bước 5: Sau khi chọn Bác sĩ & Giờ -> Sang bước thanh toán / ưu đãi
  const handleProceedToPayment = () => {
    setAiStep('CONFIRM_PAYMENT');
  };

  // Bước 5: Áp dụng mã khuyến mãi
  const handleApplyPromoCode = () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;
    const validCodes = ['MEDSCHED2026', 'VIP', 'GIAOVIEN', 'MEDFREE', 'TESTER', 'UDAI2K', 'GIAM100', 'FREE'];
    if (validCodes.includes(code)) {
      setPromoApplied(true);
      setPromoMessage(`Áp dụng mã ${code} thành công! Bạn được miễn phí 100% tiền đặt cọc (0 đ).`);
    } else {
      setPromoApplied(false);
      setPromoMessage('Mã ưu đãi không hợp lệ hoặc đã hết lượt sử dụng.');
    }
  };

  // Bước 5 -> Bước 6: Xác nhận hoàn tất đặt chỗ
  const handleConfirmFinalBooking = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const generatedCode = `MED-${randomSuffix}`;
    setBookingSuccessCode(generatedCode);
    setAiStep('COMPLETED');
  };

  // ---------------------------------------------------------------------------
  // GIAO DIỆN CHÍNH
  // ---------------------------------------------------------------------------
  return (
    <div
      className="relative w-full max-w-2xl mx-auto"
      onClick={(e) => isModal && e.stopPropagation()}
    >
      {/* Nút đóng modal khi ở chế độ Modal */}
      {isModal && onClose && (
        <button
          onClick={onClose}
          aria-label="Đóng bảng chọn"
          className="absolute -top-10 right-1 sm:-top-11 sm:right-0 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 flex items-center justify-center shadow-md transition cursor-pointer"
        >
          <X size={16} />
        </button>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: CHỌN PHƯƠNG THỨC (ĐẶT TRỰC TIẾP VS TƯ VẤN CÙNG AI)                */}
      {/* ========================================================================= */}
      {viewMode === 'select' ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-5 w-full">
          {/* KHUNG 1: ĐẶT LỊCH TRỰC TIẾP */}
          <div
            onClick={handleChooseManual}
            className="group relative bg-white rounded-3xl p-3 sm:p-5 border-2 border-slate-200/90 hover:border-emerald-500 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between hover:-translate-y-1"
          >
            <div>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                  <Calendar size={16} className="text-emerald-600 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 sm:px-2 rounded-md bg-slate-100 text-slate-600">
                  Chủ động
                </span>
              </div>
              <h2 className="text-[12px] sm:text-base font-bold text-slate-800 group-hover:text-emerald-700 transition-colors flex items-center gap-1 leading-tight">
                <span>🩺</span>
                <span>ĐẶT LỊCH TRỰC TIẾP</span>
              </h2>
              <p className="text-[9.5px] sm:text-xs text-slate-500 mt-1 leading-snug">
                Dành cho bạn đã biết rõ bác sĩ hoặc chuyên khoa cần khám.
              </p>
              <ul className="mt-2.5 sm:mt-3 space-y-1 sm:space-y-1.5 text-[9.5px] sm:text-[11px] text-slate-600">
                <li className="flex items-center gap-1 sm:gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  <span>Chọn khoa &amp; bác sĩ quen</span>
                </li>
                <li className="flex items-center gap-1 sm:gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  <span>Chủ động ngày &amp; giờ khám</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              className="mt-3.5 sm:mt-5 w-full py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl text-[10.5px] sm:text-xs font-bold text-emerald-800 bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white border border-emerald-200 group-hover:border-emerald-600 transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer"
            >
              <span className="hidden sm:inline">Chọn Bác Sĩ &amp; Giờ Khám</span>
              <span className="sm:hidden">Đặt Trực Tiếp</span>
              <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>

          {/* KHUNG 2: TƯ VẤN CÙNG TRỢ LÝ AI */}
          <div
            onClick={handleSelectAiMode}
            className="group relative bg-white rounded-3xl p-3 sm:p-5 border-2 border-purple-200 hover:border-purple-500 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between hover:-translate-y-1 ring-2 ring-purple-100/60"
          >
            <div className="absolute -top-2.5 right-2 sm:right-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[8px] sm:text-[10px] font-extrabold px-1.5 py-0.5 sm:px-2 rounded-full shadow-xs flex items-center gap-0.5">
              <Sparkles size={9} />
              <span>Khuyên Dùng</span>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-purple-100 to-indigo-100 text-purple-700 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                  <Sparkles size={16} className="text-purple-600 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 sm:px-2 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                  AI Triage
                </span>
              </div>
              <h2 className="text-[12px] sm:text-base font-bold text-slate-800 group-hover:text-purple-700 transition-colors flex items-center gap-1 leading-tight">
                <span>✨</span>
                <span>TƯ VẤN CÙNG AI</span>
              </h2>
              <p className="text-[9.5px] sm:text-xs text-slate-500 mt-1 leading-snug">
                Chưa rõ chuyên khoa? AI gợi ý trắc nghiệm và bác sĩ gần nhất.
              </p>
              <ul className="mt-2.5 sm:mt-3 space-y-1 sm:space-y-1.5 text-[9.5px] sm:text-[11px] text-slate-600">
                <li className="flex items-center gap-1 sm:gap-1.5">
                  <CheckCircle2 size={12} className="text-purple-500 shrink-0" />
                  <span>Trắc nghiệm triệu chứng nhanh</span>
                </li>
                <li className="flex items-center gap-1 sm:gap-1.5">
                  <CheckCircle2 size={12} className="text-purple-500 shrink-0" />
                  <span>Tìm chi nhánh &amp; bác sĩ gần nhất</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              className="mt-3.5 sm:mt-5 w-full py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl text-[10.5px] sm:text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 group-hover:from-purple-700 group-hover:to-indigo-700 transition-all flex items-center justify-center gap-1 shadow-sm shadow-purple-500/20 cursor-pointer"
            >
              <Bot size={13} className="shrink-0" />
              <span className="hidden sm:inline">Khám Phá Với AI Ngay</span>
              <span className="sm:hidden">Tư Vấn Với AI</span>
              <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW 2: MÀN HÌNH AI THÔNG MINH ĐA BƯỚC (AI CLINICAL WIZARD)               */
        /* ========================================================================= */
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col h-full animate-fadeIn">
          {/* Header AI & Thanh tiến trình */}
          <div className="px-5 pt-3.5 pb-2.5 border-b border-purple-100 flex items-center justify-between bg-gradient-to-r from-purple-50/90 via-white to-indigo-50/90 shrink-0">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (aiStep === 'CHOOSE_SYMPTOM' || aiStep === 'EMERGENCY' || aiStep === 'COMPLETED') {
                    setViewMode('select');
                  } else if (aiStep === 'CLARIFY_DETAILS') {
                    setAiStep('CHOOSE_SYMPTOM');
                  } else if (aiStep === 'INPUT_LOCATION') {
                    setAiStep('CLARIFY_DETAILS');
                  } else if (aiStep === 'SELECT_DOCTOR_SLOT') {
                    setAiStep('INPUT_LOCATION');
                  } else if (aiStep === 'CONFIRM_PAYMENT') {
                    setAiStep('SELECT_DOCTOR_SLOT');
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-purple-100 text-purple-700 transition cursor-pointer"
                title="Quay lại bước trước"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                  Trợ Lý Y Tế AI MedSched
                  <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full font-bold">
                    Gemini 2.5
                  </span>
                </h3>
                <p className="text-[10px] text-slate-500">
                  {aiStep === 'CHOOSE_SYMPTOM' && 'Bước 1: Chọn hoặc mô tả triệu chứng'}
                  {aiStep === 'CLARIFY_DETAILS' && 'Bước 2: Xác nhận chi tiết cảm giác & thời gian'}
                  {aiStep === 'INPUT_LOCATION' && 'Bước 3: Chọn Chi nhánh phòng khám'}
                  {aiStep === 'SELECT_DOCTOR_SLOT' && 'Bước 4: Chọn Bác sĩ & Giờ khám khả dụng'}
                  {aiStep === 'CONFIRM_PAYMENT' && 'Bước 5: Xác nhận đặt chỗ & Cọc 2k / Mã ưu đãi'}
                  {aiStep === 'COMPLETED' && '🎉 Đặt lịch hẹn thành công!'}
                  {aiStep === 'EMERGENCY' && '🚨 Cảnh báo an toàn y tế cấp cứu'}
                </p>
              </div>
            </div>

            {/* Chỉ báo các bước */}
            {aiStep !== 'EMERGENCY' && aiStep !== 'COMPLETED' && (
              <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-100/70 px-2.5 py-1 rounded-full">
                <span>Bước</span>
                <span className="text-purple-900 font-extrabold">
                  {aiStep === 'CHOOSE_SYMPTOM' && '1/5'}
                  {aiStep === 'CLARIFY_DETAILS' && '2/5'}
                  {aiStep === 'INPUT_LOCATION' && '3/5'}
                  {aiStep === 'SELECT_DOCTOR_SLOT' && '4/5'}
                  {aiStep === 'CONFIRM_PAYMENT' && '5/5'}
                </span>
              </div>
            )}
          </div>

          {/* Thân nội dung từng bước */}
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 max-h-[75vh]">

            {/* =================================================================== */}
            {/* TRƯỜNG HỢP ĐẶC BIỆT: BÁO ĐỘNG CẤP CỨU 115 (EMERGENCY)               */}
            {/* =================================================================== */}
            {aiStep === 'EMERGENCY' && (
              <div className="p-5 bg-red-50 border-2 border-red-500 rounded-3xl space-y-4 animate-bounce-short">
                <div className="flex items-center gap-3 text-red-700">
                  <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-lg animate-pulse">
                    <ShieldAlert size={28} />
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-extrabold text-red-900 leading-tight">
                      🚨 CẢNH BÁO NGUY HIỂM: DẤU HIỆU CẤP CỨU Y TẾ!
                    </h4>
                    <p className="text-xs text-red-700 font-medium mt-0.5">
                      Phát hiện dấu hiệu nguy kịch đe dọa trực tiếp đến tính mạng.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-white/90 rounded-2xl border border-red-200 text-xs text-slate-800 leading-relaxed space-y-2">
                  <p className="font-bold text-red-800">
                    ⚠️ Phòng khám ngoại trú MedSched KHÔNG có khoa hồi sức cấp cứu chuyên sâu.
                  </p>
                  <p>
                    Triệu chứng của bạn (đau thắt ngực dữ dội, khó thở tím tái, ngất xỉu, đột quỵ, nôn ra máu, tai nạn...) cần được can thiệp y khoa khẩn cấp tại Bệnh viện Đa khoa có đơn vị Hồi sức Cấp cứu (ICU).
                  </p>
                  <p className="text-[11px] text-slate-600 italic">
                    Vui lòng giữ người bệnh ở tư thế an toàn, thông thoáng đường thở và gọi xe cấp cứu ngay lập tức.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <a
                    href="tel:115"
                    className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
                  >
                    <Phone size={18} className="animate-bounce" />
                    <span>GỌI CẤP CỨU 115 NGAY LẬP TỨC</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomSymptomInput('');
                      setAiStep('CHOOSE_SYMPTOM');
                    }}
                    className="py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-2xl border border-slate-300 transition cursor-pointer"
                  >
                    Quay Lại / Khai Báo Khác
                  </button>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* BƯỚC 1: CHỌN TRIỆU CHỨNG BAN ĐẦU HOẶC NHẬP TỰ DO                    */}
            {/* =================================================================== */}
            {aiStep === 'CHOOSE_SYMPTOM' && (
              <div className="space-y-4">
                {/* Lời chào AI */}
                <div className="flex items-start gap-2.5 bg-purple-50/80 p-3.5 rounded-2xl border border-purple-200">
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Bot size={15} />
                  </div>
                  <div className="text-[11.5px] text-slate-700 leading-relaxed">
                    <p className="font-bold text-purple-900 mb-0.5">Dạ, MedSched chào bạn!</p>
                    <p>Hãy chọn vấn đề bạn đang gặp phải bên dưới. Em sẽ hỏi thêm vài chi tiết ngắn gọn để tìm đúng chi nhánh và bác sĩ gần bạn nhất nhé!</p>
                  </div>
                </div>

                {/* Danh sách nút chọn nhanh triệu chứng chính */}
                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-2">
                    👉 Bấm chọn vấn đề sức khỏe của bạn:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.values(SYMPTOM_CATEGORIES).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectSymptomPill(cat.id)}
                        className="p-3 text-left bg-slate-50 hover:bg-purple-50 text-slate-800 hover:text-purple-950 border border-slate-200 hover:border-purple-300 rounded-2xl transition duration-200 shadow-2xs hover:shadow-xs cursor-pointer flex flex-col justify-between group active:scale-98"
                      >
                        <span className="text-xs font-bold block mb-1 group-hover:text-purple-700">
                          {cat.label}
                        </span>
                        <span className="text-[10px] text-slate-500 line-clamp-1">
                          {cat.specialtyName}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hoặc gõ tự do */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Hoặc tự nhập triệu chứng nếu bạn muốn mô tả riêng:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customSymptomInput}
                      onChange={(e) => setCustomSymptomInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeCustomInput()}
                      placeholder="Ví dụ: Tôi bị đau tức ngực, hoặc đau đầu khó ngủ..."
                      className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-xs text-slate-800"
                    />
                    <button
                      type="button"
                      disabled={!customSymptomInput.trim() || isAiAnalyzing}
                      onClick={handleAnalyzeCustomInput}
                      className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-60 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      {isAiAnalyzing ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Gemini 2.5 đang phân tích...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} />
                          <span>Tiếp Tục</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* BƯỚC 2: CÁC LỰA CHỌN CỤ THỂ (ĐAU NHƯ THẾ NÀO, BAO LÂU, KÈM THEO GÌ) */}
            {/* =================================================================== */}
            {aiStep === 'CLARIFY_DETAILS' && (
              <div className="space-y-4">
                {/* Kết quả phân tích Gemini AI Triage chuyên sâu nếu có */}
                {aiClinicalSummary && (
                  <div className="bg-gradient-to-r from-purple-50 via-indigo-50/70 to-purple-50 border border-purple-200 rounded-2xl p-3.5 space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                        <Sparkles size={14} className="text-purple-600" />
                        <span>Đánh giá sơ bộ từ Trợ Lý Y Tế AI (Gemini 2.5):</span>
                      </div>
                      <span className="text-[9px] bg-purple-200/80 text-purple-800 font-extrabold px-2 py-0.5 rounded-full">
                        AI Verified
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {aiClinicalSummary}
                    </p>
                    {aiPreparationAdvice && (
                      <p className="text-[11px] text-purple-800 italic pt-1 border-t border-purple-200/60 flex items-start gap-1">
                        <span>💡</span>
                        <span><strong>Lời khuyên chuẩn bị:</strong> {aiPreparationAdvice}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Lời dẫn AI */}
                <div className="flex items-start gap-2.5 bg-purple-50/80 p-3.5 rounded-2xl border border-purple-200">
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Bot size={15} />
                  </div>
                  <div className="text-[11.5px] text-slate-700 leading-relaxed">
                    <p className="font-bold text-purple-900 mb-0.5">
                      Vấn đề đã chọn: {activeCategory.label}
                    </p>
                    <p>Để định hướng chuẩn xác, bạn chỉ cần chạm chọn các đặc điểm cụ thể dưới đây (không cần gõ chữ):</p>
                  </div>
                </div>

                {/* Câu hỏi 1: Cảm giác đau như thế nào? */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                    Cảm giác khó chịu hoặc biểu hiện cụ thể ra sao?
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                    {activeCategory.natureOptions.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedNature(opt)}
                        className={`p-2.5 text-xs text-left rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          selectedNature === opt
                            ? 'bg-purple-100/80 border-purple-600 text-purple-950 font-bold shadow-2xs'
                            : 'bg-slate-50 hover:bg-purple-50/50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span>{opt}</span>
                        {selectedNature === opt && <Check size={14} className="text-purple-700 shrink-0" />}
                      </button>
                    ))}
                  </div>

                  {/* Ô nhập triệu chứng / biểu hiện khác cụ thể */}
                  <div className="pt-1">
                    <div className="relative flex items-center">
                      <div className="absolute left-3 text-purple-600 shrink-0 pointer-events-none">
                        <Pencil size={13} />
                      </div>
                      <input
                        type="text"
                        value={customNatureInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomNatureInput(val);
                          if (val.trim()) {
                            setSelectedNature(val.trim());
                          }
                        }}
                        onFocus={() => {
                          if (customNatureInput.trim()) {
                            setSelectedNature(customNatureInput.trim());
                          }
                        }}
                        placeholder="✍️ Hoặc tự gõ biểu hiện / triệu chứng cụ thể khác của bạn..."
                        className={`w-full py-2.5 pl-8 pr-8 text-xs rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                          customNatureInput.trim() && selectedNature === customNatureInput.trim()
                            ? 'bg-purple-100/90 border-purple-600 text-purple-950 font-bold shadow-2xs'
                            : 'bg-slate-50 hover:bg-white border-slate-200 text-slate-800 focus:bg-white'
                        }`}
                      />
                      {customNatureInput.trim() && selectedNature === customNatureInput.trim() && (
                        <Check size={14} className="text-purple-700 absolute right-3 shrink-0" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Câu hỏi 2: Đau bao lâu rồi? */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                    Triệu chứng này đã kéo dài bao lâu?
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    {activeCategory.durationOptions.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedDuration(opt)}
                        className={`p-2.5 text-xs text-left rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          selectedDuration === opt
                            ? 'bg-purple-100/80 border-purple-600 text-purple-950 font-bold shadow-2xs'
                            : 'bg-slate-50 hover:bg-purple-50/50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span>{opt}</span>
                        {selectedDuration === opt && <Check size={14} className="text-purple-700 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Câu hỏi 3: Triệu chứng kèm theo? */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
                    Bạn có kèm theo triệu chứng nào khác không?
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                    {activeCategory.associatedOptions.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedAssociated(opt)}
                        className={`p-2.5 text-xs text-left rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          selectedAssociated === opt
                            ? 'bg-purple-100/80 border-purple-600 text-purple-950 font-bold shadow-2xs'
                            : 'bg-slate-50 hover:bg-purple-50/50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span>{opt}</span>
                        {selectedAssociated === opt && <Check size={14} className="text-purple-700 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Câu hỏi 4: Ô nhập tình trạng khác */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">4</span>
                      Tình trạng khác hoặc lưu ý thêm cho bác sĩ (nếu có):
                    </span>
                    <span className="text-[10px] text-slate-400 italic">Không bắt buộc</span>
                  </div>
                  <textarea
                    rows={2}
                    value={otherSymptomDetail}
                    onChange={(e) => setOtherSymptomDetail(e.target.value)}
                    placeholder="Nhập tình trạng khác của bạn... (Ví dụ: Đã uống thuốc nhưng không đỡ, có tiền sử bệnh lý nền, dị ứng thuốc...)"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-xs text-slate-800 transition placeholder:text-slate-400"
                  />
                </div>

                {/* Nút tiếp tục sang Bước 3 */}
                <button
                  type="button"
                  onClick={handleProceedToLocation}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer mt-3"
                >
                  <span>Tiếp Tục: Chọn Chi Nhánh Phòng Khám</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            )}

            {/* =================================================================== */}
            {/* BƯỚC 3: CÁC LỰA CHỌN PHÒNG KHÁM & DỊCH VỤ MEDSCHED                  */}
            {/* =================================================================== */}
            {aiStep === 'INPUT_LOCATION' && (
              <div className="space-y-4">
                {/* Kết luận chuyên khoa AI */}
                <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-purple-700 font-semibold block uppercase tracking-wider">
                      Đã định hướng chuyên khoa:
                    </span>
                    <span className="text-sm font-extrabold text-purple-950">
                      {activeCategory.specialtyName}
                    </span>
                  </div>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    Khớp 100%
                  </span>
                </div>

                {/* Lựa chọn 1: Chọn Chi Nhánh Phòng Khám */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                    Chọn cơ sở phòng khám MedSched ({CLINIC_BRANCHES.length} chi nhánh):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CLINIC_BRANCHES.map((branch) => {
                      const isSelected = selectedBranch.id === branch.id;
                      return (
                        <button
                          key={branch.id}
                          type="button"
                          onClick={() => setSelectedBranch(branch)}
                          className={`p-3 text-left rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
                            isSelected
                              ? 'bg-purple-50/90 border-purple-600 shadow-xs ring-2 ring-purple-200'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-xs font-extrabold text-slate-900 line-clamp-1">
                              {branch.shortName}
                            </span>
                            {isSelected && (
                              <CheckCircle2 size={15} className="text-purple-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-[10.5px] text-slate-500 line-clamp-2">
                            📍 {branch.address}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Lựa chọn 2: Gói dịch vụ phòng khám chuẩn hoá (Đã loại bỏ các gói ảo) */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                    Gói dịch vụ phòng khám:
                  </span>
                  <div className="p-3 bg-gradient-to-r from-purple-50 via-indigo-50/40 to-white rounded-2xl border-2 border-purple-200/90 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center text-base shadow-xs shrink-0">
                        🩺
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">Khám Chuyên Khoa Tiêu Chuẩn</h4>
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">Quy chuẩn phòng khám</span>
                        </div>
                        <p className="text-[10.5px] text-slate-500 mt-0.5 line-clamp-1">
                          Khám lâm sàng, chẩn đoán triệu chứng &amp; tư vấn phác đồ điều trị cùng bác sĩ
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <span className="text-xs sm:text-sm font-black text-purple-700 font-mono">200.000 đ</span>
                      <span className="text-[9.5px] text-slate-400 block font-medium">BHYT / Đa khoa</span>
                    </div>
                  </div>
                </div>

                {/* Lựa chọn 3: Chọn Ngày khám bệnh (Thứ 2 - Thứ 6) */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
                      Chọn ngày khám bệnh (Thứ 2 - Thứ 6):
                    </span>
                    <span className="text-[10px] text-purple-700 font-bold">
                      Đang chọn: {formatVietnameseFullDate(bookingDate)}
                    </span>
                  </div>

                  {/* Chips chọn ngày nhanh 5 ngày làm việc kế tiếp */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    {upcomingWeekdays.map((item) => {
                      const isSelected = bookingDate === item.iso;
                      return (
                        <button
                          key={item.iso}
                          type="button"
                          onClick={() => setBookingDate(item.iso)}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-2xs'
                              : 'bg-slate-50 hover:bg-purple-50/70 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="block text-[11px] leading-tight font-bold">{item.label}</span>
                          <span className={`block text-[9.5px] mt-0.5 ${isSelected ? 'text-purple-100' : 'text-slate-400'}`}>
                            {item.subLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Ô chọn ngày tùy chỉnh */}
                  <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                    <span className="flex items-center gap-1 text-[10.5px]">
                      <Calendar size={13} className="text-purple-600" />
                      <span>Hoặc chọn ngày khác:</span>
                    </span>
                    <input
                      type="date"
                      min={getTodayISODate()}
                      value={bookingDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          const selected = new Date(e.target.value);
                          if (selected.getDay() === 0 || selected.getDay() === 6) {
                            alert('Phòng khám MedSched chỉ làm việc từ Thứ 2 đến Thứ 6. Hệ thống tự động chuyển sang ngày làm việc tiếp theo.');
                            setBookingDate(getNextAvailableWeekday(selected));
                          } else {
                            setBookingDate(e.target.value);
                          }
                        }
                      }}
                      className="p-1 px-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Lựa chọn 4: Chọn Buổi đến phòng khám */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">4</span>
                    Chọn buổi đến phòng khám:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_SHIFTS.map((shift) => {
                      const isSelected = selectedShiftId === shift.id;
                      return (
                        <button
                          key={shift.id}
                          type="button"
                          onClick={() => setSelectedShiftId(shift.id)}
                          className={`p-2.5 text-center rounded-xl border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-2xs'
                              : 'bg-slate-50 hover:bg-purple-50/50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="block text-xs font-bold">{shift.icon} {shift.label}</span>
                          <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-purple-100' : 'text-slate-500'}`}>
                            {shift.timeRange}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nút tiếp tục sang Bước 4 */}
                <button
                  type="button"
                  onClick={handleProceedToDoctorSlot}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer mt-3"
                >
                  <span>Tiếp Tục: Chọn Bác Sĩ Tại {selectedBranch.shortName}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            )}

            {/* =================================================================== */}
            {/* BƯỚC 4: CÁC LỰA CHỌN BÁC SĨ & GIỜ KHÁM KHẢ DỤNG                     */}
            {/* =================================================================== */}
            {aiStep === 'SELECT_DOCTOR_SLOT' && (
              <div className="space-y-4">
                {/* Lời dẫn AI */}
                <div className="flex items-start gap-2.5 bg-purple-50/80 p-3 rounded-2xl border border-purple-200">
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Bot size={15} />
                  </div>
                  <div className="text-[11.5px] text-slate-700 leading-relaxed">
                    <p className="font-bold text-purple-900 mb-0.5">
                      Bác sĩ chuyên khoa tại {selectedBranch.shortName}
                    </p>
                    <p>Hệ thống có nhiều bác sĩ chuyên môn cao. Vui lòng bấm chọn bác sĩ và khung giờ bạn muốn khám:</p>
                  </div>
                </div>

                {/* Lựa chọn 1: Bộ lọc Bác sĩ (Chips) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                      Lọc tiêu chí Bác sĩ:
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      {availableDoctors.length} bác sĩ khả dụng
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'ALL', label: '✨ Tất Cả Bác Sĩ' },
                      { id: 'EXPERT', label: '🏆 Trưởng Khoa / Chuyên Gia' },
                      { id: 'MALE', label: '👨‍⚕️ Bác Sĩ Nam' },
                      { id: 'FEMALE', label: '👩‍⚕️ Bác Sĩ Nữ' },
                    ].map((f) => {
                      const isActive = doctorFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setDoctorFilter(f.id as any)}
                          className={`px-3 py-1.5 text-xs rounded-full border transition cursor-pointer ${
                            isActive
                              ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-2xs'
                              : 'bg-slate-100 hover:bg-purple-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Lựa chọn 2: Danh sách Bác sĩ chuyên khoa */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                    Chọn Bác sĩ phụ trách:
                  </span>
                  <div className="space-y-2">
                    {availableDoctors.map((doc) => {
                      const isSelected = selectedDoctor?.id === doc.id;
                      return (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedDoctor(doc)}
                          className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-purple-50/90 border-purple-600 shadow-sm ring-1 ring-purple-300'
                              : 'bg-white hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm shadow-xs ${
                              isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {doc.gender === 'female' ? '👩‍⚕️' : '👨‍⚕️'}
                            </div>
                            <div>
                              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                                {doc.name}
                                {doc.isExpert && (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                    <Award size={10} /> Chuyên Gia
                                  </span>
                                )}
                              </h4>
                              <p className="text-[10.5px] text-slate-500 line-clamp-1">{doc.title}</p>
                              <p className="text-[10px] text-purple-700 font-bold mt-0.5">
                                📍 {doc.room} • Phí khám: {doc.fee.toLocaleString('vi-VN')} đ
                              </p>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                            isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300'
                          }`}>
                            {isSelected && <Check size={12} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lựa chọn 3: Khung giờ khám khả dụng còn trống */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
                      Chọn Giờ khám khả dụng:
                    </span>
                    <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                      📅 {formatVietnameseFullDate(bookingDate)}
                    </span>
                  </div>

                  {/* Nút chuyển đổi nhanh Buổi Sáng / Buổi Chiều ngay tại Bước 4 */}
                  <div className="flex gap-2">
                    {TIME_SHIFTS.map((shift) => (
                      <button
                        key={shift.id}
                        type="button"
                        onClick={() => setSelectedShiftId(shift.id)}
                        className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1 ${
                          selectedShiftId === shift.id
                            ? 'bg-purple-100 text-purple-900 border-purple-400 shadow-2xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>{shift.icon}</span>
                        <span>{shift.label} ({shift.timeRange})</span>
                      </button>
                    ))}
                  </div>

                  {/* Lưới các khung giờ chuẩn y tế */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {shiftSlots.map((slot, idx) => {
                      const isSelected = selectedSlotTime === slot.time;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={slot.disabled}
                          onClick={() => !slot.disabled && setSelectedSlotTime(slot.time)}
                          className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                            slot.disabled
                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                              : isSelected
                              ? 'bg-purple-600 text-white border-purple-600 shadow-sm cursor-pointer'
                              : 'bg-slate-50 hover:bg-purple-50 text-slate-700 border-slate-200 cursor-pointer'
                          }`}
                        >
                          <span>{slot.time}</span>
                          <span className={`text-[9px] ${isSelected ? 'text-purple-200' : slot.disabled ? 'text-slate-400' : 'text-emerald-600'}`}>
                            {slot.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nút tiếp tục sang Bước 5 */}
                <button
                  type="button"
                  onClick={handleProceedToPayment}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer mt-3"
                >
                  <span>Tiếp Tục: Xác Nhận &amp; Giữ Chỗ (Chuyển 2k / Ưu Đãi)</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            )}

            {/* =================================================================== */}
            {/* BƯỚC 5: XÁC NHẬN ĐẶT CHỖ & QUÉT MÃ CHUYỂN 2K HOẶC MÃ ƯU ĐÃI         */}
            {/* =================================================================== */}
            {aiStep === 'CONFIRM_PAYMENT' && (
              <div className="space-y-4">
                {/* Tóm tắt phiếu khám */}
                <div className="p-3.5 bg-gradient-to-br from-slate-50 to-purple-50/50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80">
                    <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Stethoscope size={14} className="text-purple-600" />
                      Phiếu Khám Của Bạn
                    </span>
                    <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded-full">
                      {activeCategory.specialtyName}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                    <div>
                      <span className="text-slate-500 block">Bác sĩ phụ trách:</span>
                      <span className="font-bold text-slate-900">{selectedDoctor?.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Phòng khám:</span>
                      <span className="font-bold text-slate-900">{selectedDoctor?.room}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Thời gian &amp; Ngày khám:</span>
                      <span className="font-bold text-purple-700">
                        {selectedSlotTime} • {formatVietnameseFullDate(bookingDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Cơ sở &amp; Gói khám:</span>
                      <span className="font-bold text-slate-900 line-clamp-1">
                        {selectedBranch.shortName} • Khám Tiêu Chuẩn (200.000 đ)
                      </span>
                    </div>
                    {otherSymptomDetail && (
                      <div className="col-span-2 pt-1 border-t border-slate-200/60 text-[10.5px]">
                        <span className="text-slate-500 block">Tình trạng khác đã ghi chú:</span>
                        <span className="font-medium text-slate-800 italic line-clamp-2">
                          &ldquo;{otherSymptomDetail}&rdquo;
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Thông tin bệnh nhân */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Họ và tên bệnh nhân:
                    </label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Số điện thoại nhận vé:
                    </label>
                    <input
                      type="text"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="0912 345 678"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>
                </div>

                {/* PHẦN ĐẶT CỌC GIỮ CHỖ (2.000 VNĐ HOẶC MÃ ƯU ĐÃI) */}
                <div className="p-4 bg-purple-50/70 rounded-2xl border-2 border-purple-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-purple-950">
                        Đặt Cọc Giữ Chỗ Tránh Lỡ Lịch Hẹn
                      </h4>
                      <p className="text-[10px] text-purple-700">
                        Số tiền cọc: <span className="font-extrabold text-xs">2.000 VNĐ</span> (hoặc miễn phí bằng mã ưu đãi)
                      </p>
                    </div>
                    <span className="text-[9px] bg-purple-200 text-purple-900 font-bold px-2 py-0.5 rounded-full">
                      Tự Động Hoàn Trả
                    </span>
                  </div>

                  {/* Tabs: Quét mã VietQR vs Nhập mã ưu đãi */}
                  <div className="flex rounded-xl bg-purple-100/70 p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setPaymentTab('vietqr')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        paymentTab === 'vietqr'
                          ? 'bg-white text-purple-900 shadow-2xs'
                          : 'text-purple-700 hover:text-purple-950'
                      }`}
                    >
                      <QrCode size={13} />
                      <span>Quét Mã Chuyển 2K</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentTab('promo')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        paymentTab === 'promo'
                          ? 'bg-white text-purple-900 shadow-2xs'
                          : 'text-purple-700 hover:text-purple-950'
                      }`}
                    >
                      <Tag size={13} />
                      <span>Nhập Mã Khuyến Mãi</span>
                    </button>
                  </div>

                  {/* TAB 1: QUÉT MÃ VIETQR CHUYỂN 2K */}
                  {paymentTab === 'vietqr' && (
                    <div className="p-3 bg-white rounded-xl border border-purple-100 flex flex-col sm:flex-row items-center gap-3">
                      <div className="w-28 h-28 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs shrink-0 flex items-center justify-center">
                        <img
                          src={`https://img.vietqr.io/image/${VIETQR_BANK_CONFIG.bankId}-${VIETQR_BANK_CONFIG.accountNo}-compact2.png?amount=2000&addInfo=MED%20${patientPhone || 'DATLICH'}&accountName=${encodeURIComponent(VIETQR_BANK_CONFIG.accountName)}`}
                          alt="VietQR 2000d"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="text-[11px] text-slate-700 space-y-1 flex-1 text-center sm:text-left">
                        <p className="font-bold text-slate-900">
                          Ngân hàng: {VIETQR_BANK_CONFIG.bankName}
                        </p>
                        <p>STK: <span className="font-extrabold text-purple-800">{VIETQR_BANK_CONFIG.accountNo}</span></p>
                        <p>Chủ TK: <span className="font-bold">{VIETQR_BANK_CONFIG.accountName}</span></p>
                        <p>Số tiền: <span className="font-extrabold text-emerald-700 text-xs">2.000 VNĐ</span></p>
                        <p className="text-[10px] text-slate-500 italic">
                          Mở app ngân hàng quét mã để giữ chỗ ngay tức thì.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: NHẬP MÃ KHUYẾN MÃI */}
                  {paymentTab === 'promo' && (
                    <div className="p-3 bg-white rounded-xl border border-purple-100 space-y-2">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Nhập mã ưu đãi của bạn (Ví dụ: MEDSCHED2026, VIP, GIAOVIEN):
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoCodeInput}
                          onChange={(e) => setPromoCodeInput(e.target.value)}
                          placeholder="Nhập mã ưu đãi..."
                          className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={handleApplyPromoCode}
                          className="px-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                        >
                          Áp Dụng
                        </button>
                      </div>
                      {promoMessage && (
                        <p className={`text-[10.5px] font-bold ${promoApplied ? 'text-emerald-700' : 'text-red-600'}`}>
                          {promoApplied ? '🎉 ' : '⚠️ '}{promoMessage}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Nút bấm chốt đơn hoàn tất */}
                <button
                  type="button"
                  onClick={handleConfirmFinalBooking}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <CheckCircle2 size={18} />
                  <span>XÁC NHẬN ĐẶT LỊCH KHÁM NGAY</span>
                </button>
              </div>
            )}

            {/* =================================================================== */}
            {/* BƯỚC 6: HOÀN TẤT ĐẶT LỊCH THÀNH CÔNG (COMPLETED)                     */}
            {/* =================================================================== */}
            {aiStep === 'COMPLETED' && (
              <div className="p-5 bg-gradient-to-br from-emerald-50 via-teal-50 to-white rounded-3xl border-2 border-emerald-400 text-center space-y-4 animate-scaleUp">
                <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-500/30">
                  <Check size={32} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                    🎉 ĐẶT LỊCH KHÁM THÀNH CÔNG!
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Cảm ơn bạn đã tin tưởng dịch vụ Trợ lý AI Thông Minh MedSched.
                  </p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-emerald-200 shadow-2xs text-left text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500">Mã Lịch Hẹn (Booking Code):</span>
                    <span className="font-extrabold text-sm text-purple-700 tracking-wider">
                      {bookingSuccessCode}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Bệnh nhân:</span>
                    <span className="font-bold text-slate-800">{patientName || 'Quý khách'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Bác sĩ phụ trách:</span>
                    <span className="font-bold text-slate-800">{selectedDoctor?.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Phòng khám:</span>
                    <span className="font-bold text-emerald-800">{selectedDoctor?.room}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Ngày khám:</span>
                    <span className="font-bold text-purple-800">{formatVietnameseFullDate(bookingDate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Giờ khám:</span>
                    <span className="font-bold text-slate-800">{selectedSlotTime} ({selectedShiftId === 'MORNING' ? 'Buổi Sáng' : 'Buổi Chiều'})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Gói dịch vụ:</span>
                    <span className="font-bold text-emerald-800">Khám Chuyên Khoa Tiêu Chuẩn (200.000 đ)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Chi nhánh tiếp đón:</span>
                    <span className="font-bold text-slate-800">{selectedBranch.shortName}</span>
                  </div>
                </div>

                <div className="p-3 bg-purple-50 rounded-xl text-[11px] text-purple-900 leading-relaxed text-left">
                  💡 <strong>Hướng dẫn tiếp đón:</strong> Quý khách vui lòng đến quầy lễ tân chi nhánh trước 10 phút, đọc số điện thoại hoặc mã vé <strong>{bookingSuccessCode}</strong> để được cấp số thứ tự ưu tiên vào buồng khám.
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onClose) onClose();
                      router.push('/dashboard');
                    }}
                    className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Xem Hồ Sơ Lịch Hẹn
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('select');
                      setAiStep('CHOOSE_SYMPTOM');
                    }}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Về Trang Đặt Lịch
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
