'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Pencil,
  Loader2,
  Copy,
  Send,
  ExternalLink,
  Navigation
} from 'lucide-react';
import { api, getAuthToken, getAuthUser } from '@/shared/lib/api';
import { validatePromotion } from '@/shared/lib/promotions';
import { formatDoctorFullName } from '@/shared/lib/formatters';
import { 
  getBranchGoogleMapsUrl, 
  getBranchDirectionUrl 
} from '@/shared/lib/branchCoordinates';

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

const VIETNAMESE_VOWELS_REGEX = /[aàáảãạăằắẳẵặâầấẩẫậeèéẻẽẹêềếểễệiìíỉĩịoòóỏõọôồốổỗộơờớởỡợuùúủũụưừứửữựyỳýỷỹỵ]/i;

// 1. Kiểm tra spam, phép tính toán học hoặc chuỗi gõ phím vô nghĩa (áp dụng toàn cục cho tất cả các bước)
function isSpamOrMathOrGibberishInput(text: string): { isInvalid: boolean; message?: string } {
  if (!text || !text.trim()) {
    return { isInvalid: true, message: 'Vui lòng nhập nội dung trao đổi với trợ lý y tế.' };
  }
  const clean = text.trim();

  // a. Phép tính số học hoặc phương trình toán (ví dụ: 1+=, 1+1=, 1+1, 2*3, 5+5, 10/2)
  // Loại trừ các trường hợp khung giờ y tế như "13:30 - 14:00", "08:00 - 11:30", "1h - 2h", "13h - 14h", "ngày 23/10"
  const isTimeRange = /\d{1,2}(?::\d{2}|h)\s*(?:-|đến|tới)\s*\d{1,2}(?::\d{2}|h)/i.test(clean) ||
                      /(?:hôm nay|ngày mai|thứ\s*\d|\d{1,2}\/\d{1,2})/i.test(clean);

  if (!isTimeRange) {
    const hasMathOperators = /[\+\*\/=\%\^÷]/.test(clean);
    const hasDigits = /\d/.test(clean);
    const isOnlyMathChars = /^[\d\s\+\-\*\/=\.,\(\)\%\^\&÷xX]+$/.test(clean);

    if (
      (hasMathOperators && hasDigits && isOnlyMathChars) ||
      /^[\d\s]*[\+\-\*\/=÷xX]{2,}[\d\s]*$/.test(clean) || // vd: 1+=, +=, ++
      /^[\d\s\+\-\*\/=\.\,\(\)\%\^\&÷]+$/.test(clean) ||
      /^(giải toán|tính giúp|1\s*\+\s*1|2\s*\+\s*2)/i.test(clean)
    ) {
      return {
        isInvalid: true,
        message: `⚠️ **Phép tính "${clean}" không phải là thông tin đặt khám hoặc triệu chứng y tế!**\n\nMedSched là hệ thống y tế hỗ trợ đặt lịch khám bệnh với bác sĩ chuyên khoa.\n\n👉 Vui lòng mô tả yêu cầu đặt khám hoặc bấm chọn các phương án có sẵn trên màn hình nhé!`
      };
    }
  }

  // b. Toàn ký tự đặc biệt spam: ???, ..., !!!, ---, @@@, ===, +++
  if (/^[!@#$%^&*()_+=\-\[\]{}|\\:;"'<>,.?/~`\s]+$/.test(clean) && clean.length >= 2) {
    return {
      isInvalid: true,
      message: `⚠️ Tin nhắn chỉ chứa các ký tự đặc biệt. Vui lòng nhập từ ngữ có nghĩa hoặc bấm chọn các phương án trên màn hình!`
    };
  }

  // c. Ký tự lặp spam (vd: aaaaa, zzzzz, 11111)
  if (/(.)\1{4,}/.test(clean)) {
    return {
      isInvalid: true,
      message: `⚠️ Tin nhắn chứa ký tự lặp vô nghĩa. Vui lòng nhập thông tin rõ ràng để em hỗ trợ bạn tốt nhất nhé!`
    };
  }

  // d. Chuỗi gõ phím ngẫu nhiên / vô nghĩa (Gibberish / Keyboard Smash)
  // Ví dụ: "b sfbsfhnsSFsfn n fsnxtzj", "asdfghjkl", "qwertyuiop"
  const words = clean.split(/\s+/).filter(w => w.length > 0);

  // d1. Nếu tổng chuỗi dài hơn 6 ký tự mà không chứa bất kỳ nguyên âm nào
  if (clean.length >= 6 && !VIETNAMESE_VOWELS_REGEX.test(clean)) {
    return {
      isInvalid: true,
      message: `⚠️ Nội dung "${clean}" không có nghĩa rõ ràng trong tiếng Việt. Vui lòng nhập yêu cầu đặt khám cụ thể hoặc bấm chọn các phương án trên màn hình nhé!`
    };
  }

  // d2. Nếu có từ dài >= 6 ký tự không chứa nguyên âm nào (vd: sfbsfhnsSFsfn, fsnxtzj)
  const hasVowellessLongWord = words.some(w => {
    const lettersOnly = w.replace(/[^a-zA-Zàáảãạăằắẳẵặâầấẩẫậeèéẻẽẹêềếểễệiìíỉĩịoòóỏõọôồốổỗộơờớởỡợuùúủũụưừứửữựyỳýỷỹỵ]/gi, '');
    return lettersOnly.length >= 6 && !VIETNAMESE_VOWELS_REGEX.test(lettersOnly);
  });

  // d3. Nếu có từ chứa 5 phụ âm liên tiếp không có nguyên âm xen kẽ
  const has5ConsecutiveConsonants = /[bcdfghjklmnpqrstvwxz]{5,}/i.test(clean);

  // d4. Các chuỗi gõ phím bàn phím liên tiếp phổ biến
  const hasKeyboardSmash = /(asdfgh|zxcvbn|qwerty|qwert|hjkl)/i.test(clean);

  if (hasVowellessLongWord || has5ConsecutiveConsonants || hasKeyboardSmash) {
    return {
      isInvalid: true,
      message: `⚠️ Nội dung "${clean}" không có nghĩa rõ ràng. Vui lòng nhập từ ngữ có nghĩa hoặc bấm chọn các phương án trên màn hình nhé!`
    };
  }

  return { isInvalid: false };
}

// 2. Kiểm tra xem nội dung nhập có phải là lưu ý y tế / triệu chứng hợp lệ để ghi vào hồ sơ bác sĩ hay không
function isLikelyMedicalNote(text: string): boolean {
  if (!text || text.trim().length < 4) return false;
  const lower = text.toLowerCase();
  const MEDICAL_NOTE_KEYWORDS = [
    'đau', 'dau', 'sốt', 'sot', 'ho', 'ngứa', 'ngua', 'mệt', 'met', 'dị ứng', 'di ung',
    'viêm', 'loét', 'huyết áp', 'tiểu đường', 'tim mạch', 'bao tử', 'dạ dày',
    'uống thuốc', 'đơn thuốc', 'toa thuốc', 'tiền sử', 'bệnh án', 'xét nghiệm',
    'mang thai', 'cho con bú', 'đi lại', 'xe lăn', 'người già', 'trẻ em', 'khám lại',
    'tái khám', 'kết quả', 'chóng mặt', 'nôn', 'chảy máu', 'khó thở', 'tức ngực',
    'chấn thương', 'răng', 'mắt', 'tai', 'mũi', 'họng', 'xương', 'khớp'
  ];
  return MEDICAL_NOTE_KEYWORDS.some(kw => lower.includes(kw));
}

// 3. Kiểm tra riêng cho bước chọn triệu chứng ban đầu (CHOOSE_SYMPTOM)
function isNonMedicalOrSpamInput(text: string): { isInvalid: boolean; message?: string } {
  // Tiền lọc qua bộ lọc spam toàn cục trước
  const spamCheck = isSpamOrMathOrGibberishInput(text);
  if (spamCheck.isInvalid) return spamCheck;

  const clean = text.trim();
  const lower = clean.toLowerCase();

  // Từ chào hỏi vu vơ hoặc quá ngắn mà không chứa bất kỳ từ khóa sức khỏe nào
  const greetingsOnly = /^(chào|chao|hi|hello|alo|ê|hey|test|abc|xyz|haha|hihi|hehe|ok|vâng|da|dạ|có|không|khong|ai|bot|help)$/i;
  if (greetingsOnly.test(clean) || (clean.length < 3 && !['ho', 'sốt', 'đau'].includes(lower))) {
    return {
      isInvalid: true,
      message: `Dạ MedSched chào bạn! Để em có thể tìm đúng bác sĩ chuyên khoa phù hợp nhất, bạn hãy mô tả cảm giác khó chịu bạn đang gặp phải (ví dụ: *"tôi bị đau đầu chóng mặt"*, *"sốt cao 39 độ"*, *"đau nhức lưng"*...) hoặc chọn nhanh vào một trong các thẻ triệu chứng bên dưới nhé!`
    };
  }

  // Kiểm tra xem có chứa bất kỳ từ khóa y tế, bộ phận cơ thể hoặc dấu hiệu sức khỏe hay không
  const HEALTH_INDICATORS = [
    'đau', 'dau', 'nhức', 'nhuc', 'mỏi', 'moi', 'sốt', 'sot', 'ho', 'ngứa', 'ngua',
    'mẩn', 'man', 'rát', 'rat', 'buốt', 'buot', 'mệt', 'met', 'nôn', 'non', 'ói', 'oi',
    'chóng mặt', 'chong mat', 'hoa mắt', 'hoa mat', 'tức', 'tuc', 'khó thở', 'kho tho',
    'nghẹt', 'nghet', 'sổ mũi', 'so mui', 'chảy mũi', 'chay mui', 'rụng tóc', 'rung toc',
    'mờ', 'mo', 'cộm', 'com', 'đỏ', 'do', 'răng', 'rang', 'nướu', 'nuou', 'lợi', 'loi',
    'dị ứng', 'di ung', 'mề đay', 'me day', 'tê', 'te', 'viêm', 'viem', 'loét', 'loet',
    'tiêu chảy', 'tieu chay', 'táo bón', 'tao bon', 'sưng', 'sung', 'phù', 'phu',
    'huyết áp', 'huyet ap', 'tim', 'gan', 'thận', 'than', 'dạ dày', 'da day', 'bao tử', 'bao tu',
    'ruột', 'ruot', 'khớp', 'khop', 'cơ', 'co', 'xương', 'xuong', 'lưng', 'lung', 'gối', 'goi',
    'cổ', 'co', 'vai', 'gáy', 'gay', 'da', 'tai', 'mũi', 'mui', 'họng', 'hong', 'bụng', 'bung',
    'đầu', 'dau', 'mất ngủ', 'mat ngu', 'suy nhược', 'suy nhuoc', 'uể oải', 'ue oai',
    'kiệt sức', 'kiet suc', 'đuối', 'duoi', 'tiền đình', 'tien dinh', 'nhiệt', 'nhiet',
    'mụn', 'mun', 'vảy nến', 'vay nen', 'chàm', 'cham', 'sâu răng', 'sau rang',
    'thị lực', 'thi luc', 'khám', 'kham', 'bệnh', 'benh', 'ốm', 'om', 'bị', 'bi',
    'chảy máu', 'chay mau', 'nổi hạch', 'noi hach', 'khó nuốt', 'kho nuot', 'ù tai', 'u tai',
    'chấn thương', 'chan thuong', 'bỏng', 'bong', 'ngã', 'nga', 'đụng', 'dung'
  ];

  const hasHealthIndicator = HEALTH_INDICATORS.some(kw => lower.includes(kw));
  if (!hasHealthIndicator) {
    return {
      isInvalid: true,
      message: `⚠️ Nội dung "${clean}" dường như không phải là một triệu chứng y tế hoặc vấn đề sức khỏe cần thăm khám.\n\nVui lòng mô tả rõ hơn biểu hiện bất thường trên cơ thể của bạn (ví dụ: *"đau đầu căng thẳng"*, *"sốt về chiều"*, *"đau rát bao tử"*, *"ngứa da nổi hột"*...) hoặc bấm chọn vào các thẻ triệu chứng chuyên khoa bên dưới để bác sĩ hỗ trợ bạn chính xác nhất!`
    };
  }

  return { isInvalid: false };
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
    label: '🧴 Ngứa, dị ứng da',
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

// Danh sách chi nhánh thuần động: Không lưu cứng bất kỳ tên hay địa chỉ nào trong code frontend
const CLINIC_BRANCHES: ClinicBranch[] = [];

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
  rawName?: string;
  academicTitle?: string;
  title: string;
  specialtyCode?: string;
  specialtyName?: string;
  specialtyId?: string;
  categoryKeys?: string[];
  centerId?: string;
  room: string;
  fee: number;
  gender?: 'male' | 'female';
  isExpert?: boolean;
}

const DEMO_DOCTORS: DemoDoctor[] = [
  // -------------------------------------------------------------------------
  // 1. KHOA NỘI & THẦN KINH (HEADACHE: Đau đầu, chóng mặt, tiền đình, mất ngủ)
  // -------------------------------------------------------------------------
  // Chi Nhánh 1: Bình Tân
  {
    id: 'doc-head-01',
    name: 'BS.CKII Nguyễn Văn An',
    title: 'Trưởng Khoa Thần Kinh - Đau Đầu & Mạch Máu Não (20 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    categoryKeys: ['HEADACHE'],
    centerId: 'a1b2c3d4-0001-4000-8000-000000000001',
    room: 'Phòng P.208 - Tầng 2',
    fee: 200000,
    gender: 'male',
    isExpert: true,
  },
  {
    id: 'doc-head-01b',
    name: 'BS.CKI Hoàng Mỹ Linh',
    title: 'Bác sĩ Nội Thần Kinh - Giấc Ngủ & Tiền Đình (14 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    categoryKeys: ['HEADACHE'],
    centerId: 'a1b2c3d4-0001-4000-8000-000000000001',
    room: 'Phòng P.206 - Tầng 2',
    fee: 200000,
    gender: 'female',
    isExpert: false,
  },
  // Chi Nhánh 2: ITC Tân Phú
  {
    id: 'doc-head-02',
    name: 'BS.CKII Lê Quang Vinh',
    title: 'Bác sĩ Chuyên Khoa Thần Kinh & Đau Đầu Mãn Tính (18 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    categoryKeys: ['HEADACHE'],
    centerId: 'a1b2c3d4-0002-4000-8000-000000000002',
    room: 'Phòng P.103 - Tầng 1',
    fee: 250000,
    gender: 'male',
    isExpert: true,
  },
  {
    id: 'doc-head-02b',
    name: 'ThS.BS Nguyễn Hoài Thu',
    title: 'Bác sĩ Nội Thần Kinh & Trị Liệu Giấc Ngủ (13 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    categoryKeys: ['HEADACHE'],
    centerId: 'a1b2c3d4-0002-4000-8000-000000000002',
    room: 'Phòng P.102 - Tầng 1',
    fee: 200000,
    gender: 'female',
    isExpert: true,
  },

  // -------------------------------------------------------------------------
  // 2. KHOA HÔ HẤP & TRUYỀN NHIỄM (RESPIRATORY: Sốt, ho, cảm cúm, phổi)
  // -------------------------------------------------------------------------
  // Chi Nhánh 1: Bình Tân
  {
    id: 'doc-resp-01',
    name: 'ThS.BS Chu Đình Triều',
    title: 'Trưởng Đơn Nguyên Hô Hấp & Dị Ứng Thời Tiết (16 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    categoryKeys: ['RESPIRATORY'],
    centerId: 'a1b2c3d4-0001-4000-8000-000000000001',
    room: 'Phòng P.204 - Tầng 2',
    fee: 200000,
    gender: 'male',
    isExpert: true,
  },
  {
    id: 'doc-resp-01b',
    name: 'BS.CKI Phạm Thúy Nga',
    title: 'Bác sĩ Chuyên Khoa Hô Hấp & Tai Mũi Họng (12 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    categoryKeys: ['RESPIRATORY'],
    centerId: 'a1b2c3d4-0001-4000-8000-000000000001',
    room: 'Phòng P.205 - Tầng 2',
    fee: 200000,
    gender: 'female',
    isExpert: false,
  },
  // Chi Nhánh 2: ITC Tân Phú
  {
    id: 'doc-resp-02',
    name: 'ThS.BS Trần Thị Mai',
    title: 'Phó Khoa Nội - Chuyên gia Hô Hấp & Phổi (15 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    categoryKeys: ['RESPIRATORY'],
    centerId: 'a1b2c3d4-0002-4000-8000-000000000002',
    room: 'Phòng P.101 - Tầng 1',
    fee: 200000,
    gender: 'female',
    isExpert: true,
  },
  {
    id: 'doc-resp-02b',
    name: 'BS.CKII Đỗ Thành Trung',
    title: 'Bác sĩ Hô Hấp & Cảm Cúm Truyền Nhiễm (14 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    categoryKeys: ['RESPIRATORY'],
    centerId: 'a1b2c3d4-0002-4000-8000-000000000002',
    room: 'Phòng P.106 - Tầng 1',
    fee: 200000,
    gender: 'male',
    isExpert: false,
  },

  // -------------------------------------------------------------------------
  // 3. KHOA TIÊU HÓA & GAN MẬT (ABDOMINAL: Đau bụng, dạ dày, tiêu hóa)
  // -------------------------------------------------------------------------
  // Chi Nhánh 1: Bình Tân
  {
    id: 'doc-ab-01',
    name: 'BS.CKII Trần Quốc Bảo',
    title: 'Trưởng Khoa Tiêu Hóa - Gan Mật & Dạ Dày (19 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    categoryKeys: ['ABDOMINAL'],
    centerId: 'a1b2c3d4-0001-4000-8000-000000000001',
    room: 'Phòng P.207 - Tầng 2',
    fee: 200000,
    gender: 'male',
    isExpert: true,
  },
  {
    id: 'doc-ab-01b',
    name: 'BS.CKI Lê Thị Ánh Tuyết',
    title: 'Bác sĩ Tiêu Hóa & Nội Soi Dạ Dày (11 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    categoryKeys: ['ABDOMINAL'],
    centerId: 'a1b2c3d4-0001-4000-8000-000000000001',
    room: 'Phòng P.201 - Tầng 2',
    fee: 200000,
    gender: 'female',
    isExpert: false,
  },
  // Chi Nhánh 2: ITC Tân Phú
  {
    id: 'doc-ab-02',
    name: 'ThS.BS Đặng Thúy Hà',
    title: 'Chuyên gia Tiêu Hóa & Dinh Dưỡng Đường Ruột (15 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    categoryKeys: ['ABDOMINAL'],
    centerId: 'a1b2c3d4-0002-4000-8000-000000000002',
    room: 'Phòng P.107 - Tầng 1',
    fee: 200000,
    gender: 'female',
    isExpert: true,
  },
  {
    id: 'doc-ab-02b',
    name: 'BS.CKI Nguyễn Minh Tuấn',
    title: 'Bác sĩ Nội Tiêu Hóa & Đại Tràng (12 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    categoryKeys: ['ABDOMINAL'],
    centerId: 'a1b2c3d4-0002-4000-8000-000000000002',
    room: 'Phòng P.108 - Tầng 1',
    fee: 200000,
    gender: 'male',
    isExpert: false,
  },

  // -------------------------------------------------------------------------
  // 4. KHOA CƠ XƯƠNG KHỚP (BONE_JOINT: Đau nhức xương khớp, cột sống)
  // -------------------------------------------------------------------------
  // Chi Nhánh 1: Bình Tân
  {
    id: 'doc-bj-01',
    name: 'BS.CKII Phan Văn Nam',
    title: 'Trưởng Khoa Cơ Xương Khớp & Thoái Hóa Cột Sống (21 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    categoryKeys: ['BONE_JOINT'],
    centerId: 'a1b2c3d4-0001-4000-8000-000000000001',
    room: 'Phòng P.210 - Tầng 2',
    fee: 200000,
    gender: 'male',
    isExpert: true,
  },
  {
    id: 'doc-bj-01b',
    name: 'BS.CKI Võ Thị Kim Oanh',
    title: 'Bác sĩ Phục Hồi Chức Năng Cơ Xương Khớp (13 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    categoryKeys: ['BONE_JOINT'],
    centerId: 'a1b2c3d4-0001-4000-8000-000000000001',
    room: 'Phòng P.211 - Tầng 2',
    fee: 200000,
    gender: 'female',
    isExpert: false,
  },
  // Chi Nhánh 2: ITC Tân Phú
  {
    id: 'doc-bj-02',
    name: 'ThS.BS Trịnh Khắc Duy',
    title: 'Chuyên gia Cơ Xương Khớp & Thoát Vị Đĩa Đệm (16 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    categoryKeys: ['BONE_JOINT'],
    centerId: 'a1b2c3d4-0002-4000-8000-000000000002',
    room: 'Phòng P.109 - Tầng 1',
    fee: 200000,
    gender: 'male',
    isExpert: true,
  },
  {
    id: 'doc-bj-02b',
    name: 'BS.CKI Nguyễn Thanh Thủy',
    title: 'Bác sĩ Chấn Thương Chỉnh Hình & Khớp (10 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    categoryKeys: ['BONE_JOINT'],
    centerId: 'a1b2c3d4-0002-4000-8000-000000000002',
    room: 'Phòng P.110 - Tầng 1',
    fee: 200000,
    gender: 'female',
    isExpert: false,
  },

  // -------------------------------------------------------------------------
  // 5. KHOA NỘI TỔNG QUÁT & KHÁM SỨC KHỎE (FATIGUE: Mệt mỏi, suy nhược)
  // -------------------------------------------------------------------------
  // Chi Nhánh 1: Bình Tân
  {
    id: 'doc-fat-01',
    name: 'BS.CKII Nguyễn Văn An',
    title: 'Trưởng Khoa Nội Tổng Quát & Khám Sức Khỏe (20 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    categoryKeys: ['FATIGUE'],
    centerId: 'a1b2c3d4-0001-4000-8000-000000000001',
    room: 'Phòng P.208 - Tầng 2',
    fee: 200000,
    gender: 'male',
    isExpert: true,
  },
  {
    id: 'doc-fat-01b',
    name: 'BS.CKI Hoàng Mỹ Linh',
    title: 'Bác sĩ Nội Khoa & Tầm Soát Suy Nhược (14 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    categoryKeys: ['FATIGUE'],
    centerId: 'a1b2c3d4-0001-4000-8000-000000000001',
    room: 'Phòng P.206 - Tầng 2',
    fee: 200000,
    gender: 'female',
    isExpert: false,
  },
  // Chi Nhánh 2: ITC Tân Phú
  {
    id: 'doc-fat-02',
    name: 'BS.CKII Lê Quang Vinh',
    title: 'Bác sĩ Nội Tổng Quát & Phục Hồi Thể Lực (18 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    categoryKeys: ['FATIGUE'],
    centerId: 'a1b2c3d4-0002-4000-8000-000000000002',
    room: 'Phòng P.103 - Tầng 1',
    fee: 250000,
    gender: 'male',
    isExpert: true,
  },
  {
    id: 'doc-fat-02b',
    name: 'ThS.BS Nguyễn Hoài Thu',
    title: 'Bác sĩ Nội Khoa & Dinh Dưỡng Hồi Phục (13 năm kinh nghiệm)',
    specialtyCode: 'INTERNAL_MEDICINE',
    categoryKeys: ['FATIGUE'],
    centerId: 'a1b2c3d4-0002-4000-8000-000000000002',
    room: 'Phòng P.102 - Tầng 1',
    fee: 200000,
    gender: 'female',
    isExpert: true,
  },

  // -------------------------------------------------------------------------
  // 6. KHOA DA LIỄU & DỊ ỨNG (SKIN: Ngứa, dị ứng da)
  // -------------------------------------------------------------------------
  // Chi Nhánh 1: Bình Tân
  {
    id: 'doc-sk-01',
    name: 'BS.CKII Nguyễn Tấn Phát',
    title: 'Trưởng Khoa Da Liễu & Miễn Dịch (17 năm kinh nghiệm)',
    specialtyCode: 'DERMATOLOGY',
    categoryKeys: ['SKIN'],
    centerId: 'a1b2c3d4-0001-4000-8000-000000000001',
    room: 'Phòng P.203 - Tầng 2',
    fee: 250000,
    gender: 'male',
    isExpert: true,
  },
  {
    id: 'doc-03b',
    name: 'ThS.BS Bùi Phương Thảo',
    title: 'Chuyên gia Da Liễu & Dị Ứng (12 năm kinh nghiệm)',
    specialtyCode: 'DERMATOLOGY',
    categoryKeys: ['SKIN'],
    centerId: 'a1b2c3d4-0001-4000-8000-000000000001',
    room: 'Phòng P.202 - Tầng 2',
    fee: 250000,
    gender: 'female',
    isExpert: false,
  },
  // Chi Nhánh 2: ITC Tân Phú
  {
    id: 'doc-03',
    name: 'BS.CKI Lê Hoàng Nam',
    title: 'Bác sĩ Da Liễu & Laser Thẩm Mỹ (15 năm kinh nghiệm)',
    specialtyCode: 'DERMATOLOGY',
    categoryKeys: ['SKIN'],
    centerId: 'a1b2c3d4-0002-4000-8000-000000000002',
    room: 'Phòng P.102 - Tầng 1',
    fee: 250000,
    gender: 'male',
    isExpert: true,
  },
  {
    id: 'doc-sk-02',
    name: 'ThS.BS Trần Ngọc Lan',
    title: 'Chuyên gia Da Liễu & Trị Liệu Dị Ứng Da (11 năm kinh nghiệm)',
    specialtyCode: 'DERMATOLOGY',
    categoryKeys: ['SKIN'],
    centerId: 'a1b2c3d4-0002-4000-8000-000000000002',
    room: 'Phòng P.111 - Tầng 1',
    fee: 250000,
    gender: 'female',
    isExpert: false,
  },
];

interface ClinicTimeSlot {
  id?: string;
  time: string;
  startMinutes: number;
  session: 'MORNING' | 'AFTERNOON';
}

const BASE_TIME_SLOTS: ClinicTimeSlot[] = [
  // Buổi Sáng (08:00 - 11:30)
  { id: 'sl000001-0000-0000-0000-000000000001', time: '08:00 - 08:30', startMinutes: 8 * 60, session: 'MORNING' },
  { id: 'sl000002-0000-0000-0000-000000000001', time: '08:30 - 09:00', startMinutes: 8 * 60 + 30, session: 'MORNING' },
  { id: 'sl000003-0000-0000-0000-000000000001', time: '09:00 - 09:30', startMinutes: 9 * 60, session: 'MORNING' },
  { id: 'sl000004-0000-0000-0000-000000000001', time: '09:30 - 10:00', startMinutes: 9 * 60 + 30, session: 'MORNING' },
  { id: 'sl000005-0000-0000-0000-000000000001', time: '10:00 - 10:30', startMinutes: 10 * 60, session: 'MORNING' },
  { id: 'sl000006-0000-0000-0000-000000000001', time: '10:30 - 11:00', startMinutes: 10 * 60 + 30, session: 'MORNING' },
  // Buổi Chiều (13:30 - 16:00)
  { id: 'sl000007-0000-0000-0000-000000000001', time: '13:30 - 14:00', startMinutes: 13 * 60 + 30, session: 'AFTERNOON' },
  { id: 'sl000008-0000-0000-0000-000000000001', time: '14:00 - 14:30', startMinutes: 14 * 60, session: 'AFTERNOON' },
  { id: 'sl000009-0000-0000-0000-000000000001', time: '14:30 - 15:00', startMinutes: 14 * 60 + 30, session: 'AFTERNOON' },
  { id: 'sl000010-0000-0000-0000-000000000001', time: '15:00 - 15:30', startMinutes: 15 * 60, session: 'AFTERNOON' },
  { id: 'sl000011-0000-0000-0000-000000000001', time: '15:30 - 16:00', startMinutes: 15 * 60 + 30, session: 'AFTERNOON' },
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


// ---------------------------------------------------------------------------
// 5. COMPONENT CHÍNH — KHUNG CHAT ZALO FULL MÀN HÌNH LIỀN MẠCH
// ---------------------------------------------------------------------------
type AiWizardStep =
  | 'CHOOSE_SYMPTOM'          // Bước 1: Chọn triệu chứng ban đầu hoặc gõ
  | 'CLARIFY_DETAILS'         // Bước 2: Chọn chi tiết: Đau như thế nào, Đau bao lâu, Kèm theo gì
  | 'UNSUPPORTED_SPECIALTY'   // Thông báo an toàn: Phòng khám chưa có bác sĩ chuyên môn này
  | 'DOCTOR_NO_SLOTS'         // Bác sĩ chuyên môn phụ trách chưa có ca khám mở sẵn -> quay lại sau hoặc đổi ngày
  | 'INPUT_LOCATION'          // Bước 3: Chọn Chi nhánh phòng khám MedSched
  | 'SELECT_DOCTOR_SLOT'      // Bước 4: Chọn Bác sĩ & Giờ khám khả dụng còn trống
  | 'CONFIRM_PAYMENT'         // Bước 5: Quét mã chuyển 2k hoặc nhập mã khuyến mãi
  | 'COMPLETED'               // Bước 6: Hoàn tất đặt chỗ & cấp mã hẹn
  | 'EMERGENCY';              // Cảnh báo cấp cứu khẩn cấp 115

const VALID_PROMO_CODES = ['MEDSCHED2026', 'VIP', 'GIAOVIEN', 'MEDFREE', 'TESTER', 'DEMO2K', 'UDAI2K', 'GIAM100', 'FREE'];

export interface ClarifyQuestionMeta {
  questionNumber: number;
  totalQuestions: number;
  questionTitle: string;
  options: string[];
  fieldKey: 'nature' | 'duration' | 'associated' | 'followup';
}

export interface ChatActionOption {
  label: string;
  actionKey: 'CONFIRM_PROPOSAL_TO_DOCTOR' | 'SELECT_BRANCH' | 'SELECT_SHIFT' | 'CUSTOM_TEXT' | 'CHANGE_DATE' | 'SELECT_ALT_DOCTOR' | 'RESET_SYMPTOMS';
  payload?: any;
  variant?: 'primary' | 'secondary' | 'outline';
}

export interface NurseProposal {
  branch: ClinicBranch;
  date?: string;
  shiftId: 'MORNING' | 'AFTERNOON';
  slotTime: string;
  note?: string;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  time: string;
  text?: string;
  widget?: AiWizardStep;
  isCompleteWidget?: boolean;
  isTypingComplete?: boolean;
  clarifyMeta?: ClarifyQuestionMeta;
  actionOptions?: ChatActionOption[];
}

// Hàm hỗ trợ format chữ đậm **in đậm** trong tin nhắn
function renderFormattedText(raw: string) {
  if (!raw || !raw.includes('**')) {
    return raw;
  }
  const parts = raw.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-extrabold text-purple-950">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

// Helper phân tích ý định ngôn ngữ tự nhiên của bệnh nhân (NLU Receptionist Parser)
// Helper phân tích ý định ngôn ngữ tự nhiên của bệnh nhân (NLU Receptionist Parser)
function parsePatientBookingIntent(
  rawText: string,
  currentBranch: ClinicBranch | null,
  currentBookingDate: string,
  availableBranches: ClinicBranch[] = []
) {
  const text = rawText.toLowerCase().trim();

  // 1. Nhận diện chi nhánh hoàn toàn động dựa trên các cơ sở tải trực tiếp từ Database
  let matchedBranch: ClinicBranch | null = null;
  const branchList = availableBranches;

  for (const b of branchList) {
    const searchTerms = [
      b.code?.toLowerCase(),
      b.shortName?.toLowerCase(),
      b.name?.toLowerCase(),
      ...(b.districtKeywords || [])
    ].filter(Boolean);

    if (searchTerms.some(term => term && term.length > 1 && text.includes(term))) {
      matchedBranch = b;
      break;
    }
  }

  // 2. Nhận diện ca / buổi
  let matchedShift: 'MORNING' | 'AFTERNOON' | null = null;
  const isMorningMentioned = text.includes('sáng') || text.includes('sang') || text.includes('morning');
  const isAfternoonMentioned = text.includes('chiều') || text.includes('chieu') || text.includes('afternoon') || text.includes('tối');

  if (isMorningMentioned && !isAfternoonMentioned) matchedShift = 'MORNING';
  if (isAfternoonMentioned && !isMorningMentioned) matchedShift = 'AFTERNOON';

  // 3. Nhận diện xung đột giờ nghỉ trưa (Ca chiều bắt đầu lúc 13:30, bệnh nhân xin khám 1h - 2h hoặc 13h - 14h hoặc 1h chiều)
  const is1h30 = text.includes('13:30') || text.includes('13h30') || text.includes('1h30');
  const isLunchBreakOrEarlyAfternoon = !is1h30 && (
    /1h\s*(?:đến|-|tới)?\s*2h/i.test(text) ||
    /13h\s*(?:đến|-|tới)?\s*14h/i.test(text) ||
    /từ\s*(?:1h|13h)/i.test(text) ||
    /(?:1h|13h)\s*(?:chiều|trưa)/i.test(text) ||
    /\b(?:1h|13h|13:00)\b/i.test(text) ||
    text.includes('1h đến 2h') ||
    text.includes('1h den 2h') ||
    text.includes('1h-2h') ||
    text.includes('13h-14h') ||
    text.includes('13h đến 14h')
  );

  let proposedSlot: string | null = null;
  let isEarlyAfternoonConflict = false;

  if (isLunchBreakOrEarlyAfternoon) {
    isEarlyAfternoonConflict = true;
    matchedShift = 'AFTERNOON';
    proposedSlot = '13:30 - 14:00';
  } else if (is1h30) {
    matchedShift = 'AFTERNOON';
    proposedSlot = '13:30 - 14:00';
  } else if (text.includes('14:00') || text.includes('14h') || text.includes('2h chiều') || text.includes('2h')) {
    matchedShift = 'AFTERNOON';
    proposedSlot = '14:00 - 14:30';
  } else if (text.includes('14:30') || text.includes('14h30') || text.includes('2h30')) {
    matchedShift = 'AFTERNOON';
    proposedSlot = '14:30 - 15:00';
  } else if (text.includes('15:00') || text.includes('15h') || text.includes('3h chiều') || text.includes('3h')) {
    matchedShift = 'AFTERNOON';
    proposedSlot = '15:00 - 15:30';
  } else if (text.includes('15:30') || text.includes('15h30') || text.includes('3h30')) {
    matchedShift = 'AFTERNOON';
    proposedSlot = '15:30 - 16:00';
  } else if (text.includes('8h') || text.includes('08:00') || text.includes('8:00')) {
    matchedShift = 'MORNING';
    proposedSlot = text.includes('8h30') || text.includes('8:30') ? '08:30 - 09:00' : '08:00 - 08:30';
  } else if (text.includes('9h') || text.includes('09:00') || text.includes('9:00')) {
    matchedShift = 'MORNING';
    proposedSlot = text.includes('9h30') || text.includes('9:30') ? '09:30 - 10:00' : '09:00 - 09:30';
  } else if (text.includes('10h') || text.includes('10:00')) {
    matchedShift = 'MORNING';
    proposedSlot = text.includes('10h30') || text.includes('10:30') ? '10:30 - 11:00' : '10:00 - 10:30';
  } else if (text.includes('11h') || text.includes('11:00')) {
    matchedShift = 'MORNING';
    proposedSlot = '10:30 - 11:00';
  }

  // 4. Nhận diện ngày khám
  let matchedDate: string | null = null;
  if (text.includes('hôm nay') || text.includes('hom nay')) {
    matchedDate = getTodayISODate();
  } else if (text.includes('ngày mai') || text.includes('ngay mai') || text.includes('mai')) {
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    matchedDate = getNextAvailableWeekday(tom);
  }

  // 5. Nhận diện phản hồi đồng ý / xác nhận từ bệnh nhân
  const isAgreement =
    /^(đồng ý|dong y|ok|oke|okie|được|duoc|chốt|chot|vâng|vang|yes|yep|chuyển đi|chuyen di|đặt đi|dat di|tiếp tục|tiep tuc|chọn bác sĩ|xem bác sĩ|được nha|ok em|được chứ|duoc nha)/i.test(text) ||
    text === 'ok' || text === 'oke' || text === 'được' || text === 'đồng ý' || text === 'chốt' ||
    text.includes('chuyển sang') || text.includes('đặt từ 13:30');

  return {
    matchedBranch,
    matchedShift,
    proposedSlot,
    isEarlyAfternoonConflict,
    matchedDate,
    isAgreement,
  };
}

// Component gõ chữ từng từ kiểu Streaming Typewriter cho AI (Gemini 2.5)
interface StreamingAiTextProps {
  fullText: string;
  isFinished?: boolean;
  onFinish?: () => void;
  onWordTyped?: () => void;
}

function StreamingAiText({ fullText, isFinished, onFinish, onWordTyped }: StreamingAiTextProps) {
  const tokens = useMemo(() => {
    return fullText.match(/\S+|\s+/g) || [fullText];
  }, [fullText]);

  const [displayedCount, setDisplayedCount] = useState<number>(isFinished ? tokens.length : 0);
  const [isDone, setIsDone] = useState<boolean>(isFinished || false);

  useEffect(() => {
    if (isFinished) {
      setDisplayedCount(tokens.length);
      setIsDone(true);
      return;
    }

    let current = 0;
    const timer = setInterval(() => {
      current++;
      setDisplayedCount(current);

      if (onWordTyped && current % 3 === 0) {
        onWordTyped();
      }

      if (current >= tokens.length) {
        clearInterval(timer);
        setIsDone(true);
        if (onFinish) onFinish();
        if (onWordTyped) onWordTyped();
      }
    }, 18); // Nhịp gõ 18ms mỗi từ/khoảng trắng -> chữ nhảy ra từng từ cực kỳ sống động và tự nhiên

    return () => clearInterval(timer);
  }, [tokens, isFinished]);

  const handleSkipTyping = () => {
    if (!isDone) {
      setDisplayedCount(tokens.length);
      setIsDone(true);
      if (onFinish) onFinish();
      if (onWordTyped) onWordTyped();
    }
  };

  const visibleTokens = isDone ? tokens : tokens.slice(0, displayedCount);
  const visibleText = visibleTokens.join('');

  return (
    <div onClick={handleSkipTyping} className="cursor-pointer select-text" title="Bấm để xem nhanh toàn bộ">
      <p className="whitespace-pre-line leading-relaxed">
        {renderFormattedText(visibleText)}
        {!isDone && (
          <span className="inline-block w-1.5 h-3.5 bg-purple-600 ml-1 rounded-xs align-middle animate-pulse" />
        )}
      </p>
    </div>
  );
}

export default function BookingMethodSelector({
  isModal = false,
  onClose,
  initialMode = 'select',
}: BookingMethodSelectorProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'select' | 'ai'>(initialMode);

  // Trạng thái từng bước của AI Wizard
  const [aiStep, setAiStep] = useState<AiWizardStep>('CHOOSE_SYMPTOM');

  // Lịch sử tin nhắn hội thoại dạng Zalo Stream liền mạch
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const isInitiatingAptRef = useRef<boolean>(false);

  // Dữ liệu người dùng chọn (mặc định chưa chọn để bệnh nhân tự bấm chọn hoặc gõ triệu chứng)
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>('');
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
  const [selectedFollowup, setSelectedFollowup] = useState<string>('');
  const [otherSymptomDetail, setOtherSymptomDetail] = useState<string>('');

  // Quản lý khảo sát lâm sàng từng câu một có bộ đếm (Interactive 1-by-1 Conversational Triage)
  const [clarifyQuestionIndex, setClarifyQuestionIndex] = useState<number>(1);
  const [totalClarifyQuestions, setTotalClarifyQuestions] = useState<number>(3);

  // Quản lý danh sách chi nhánh thực tế từ DB & Popup chi tiết cơ sở Google Maps
  const [branches, setBranches] = useState<ClinicBranch[]>([]);
  const [isBranchesLoading, setIsBranchesLoading] = useState<boolean>(true);
  const [selectedBranchForModal, setSelectedBranchForModal] = useState<ClinicBranch | null>(null);
  const [userCustomLocation, setUserCustomLocation] = useState<string>('');

  // Bước 3: Chi nhánh & Dịch vụ phòng khám & Ngày khám
  const [selectedBranch, setSelectedBranch] = useState<ClinicBranch | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('STANDARD');
  const [bookingDate, setBookingDate] = useState<string>(() => getNextAvailableWeekday());
  const [selectedShiftId, setSelectedShiftId] = useState<string>('MORNING');
  // Đề xuất lịch khám thông minh từ Y tá / Lễ tân AI
  const [nurseProposal, setNurseProposal] = useState<NurseProposal | null>(null);

  // Đồng bộ danh mục chi nhánh 100% từ CSDL qua API (loại bỏ chi nhánh bị phong tỏa)
  useEffect(() => {
    let isMounted = true;
    setIsBranchesLoading(true);
    api.getMedicalCenters()
      .then((data: any[]) => {
        if (!isMounted) return;
        // Chỉ lấy những cơ sở đang hoạt động thực tế (active !== false), loại bỏ chi nhánh phong tỏa
        const activeCenters = Array.isArray(data) ? data.filter((c: any) => c.active !== false) : [];

        const mapped: ClinicBranch[] = activeCenters.map((c: any) => {
          let shortName = c.name || c.code;
          if (c.name && c.name.includes('-')) {
            const parts = c.name.split('-');
            shortName = parts.slice(1).join('-').trim();
          }
          if (!shortName || shortName.length < 3) {
            shortName = c.name || c.code;
          }

          const rawKeywords = [
            c.code?.toLowerCase(),
            c.name?.toLowerCase(),
            shortName.toLowerCase(),
            ...(c.address ? c.address.toLowerCase().split(/[,.-]+/).map((s: string) => s.trim()).filter((s: string) => s.length > 2) : []),
          ];
          const uniqueKeywords = Array.from(new Set(rawKeywords.filter(Boolean)));

          return {
            id: c.id,
            code: c.code,
            name: c.name,
            shortName: shortName,
            address: c.address || 'Đang cập nhật địa chỉ',
            phone: c.phone || '028 3912 3456 (Hotline tiếp đón)',
            districtKeywords: uniqueKeywords,
          };
        });

        setBranches(mapped);
        if (mapped.length > 0) {
          setSelectedBranch(prev => {
            if (!prev) return mapped[0];
            const match = mapped.find(b => b.id === prev.id || b.code === prev.code);
            return match || mapped[0];
          });
        }
      })
      .catch(err => {
        console.warn('Lỗi tải danh mục chi nhánh từ máy chủ:', err);
      })
      .finally(() => {
        if (isMounted) setIsBranchesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Danh sách 5 ngày làm việc sắp tới (Thứ 2 đến Thứ 6)
  const upcomingWeekdays = useMemo(() => getUpcomingWeekdays(5), []);

  // Bước 4: Bác sĩ & Khung giờ & Bộ lọc (Đồng bộ 100% CSDL)
  const [dbDoctors, setDbDoctors] = useState<DemoDoctor[]>([]);
  const [isDoctorsLoading, setIsDoctorsLoading] = useState<boolean>(true);
  const [selectedDoctor, setSelectedDoctor] = useState<DemoDoctor | null>(null);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>('08:00 - 08:30');
  const [doctorFilter, setDoctorFilter] = useState<'ALL' | 'EXPERT' | 'MALE' | 'FEMALE'>('ALL');

  // Dynamic slots tải từ CSDL theo bác sĩ và ngày đang chọn
  const [dynamicSlots, setDynamicSlots] = useState<Array<{
    id: string;
    time: string;
    startMinutes: number;
    status: string;
    label: string;
    disabled: boolean;
  }>>([]);
  const [isSlotsLoading, setIsSlotsLoading] = useState<boolean>(false);

  // Đồng bộ ca trực và số lượng slot trống thời gian thực từ CSDL
  const [doctorSchedulesMap, setDoctorSchedulesMap] = useState<Record<string, {
    hasSchedule: boolean;
    availableCount: number;
    totalSlots: number;
    bookedSlots: number;
    earliestSlotTime?: string;
    roomNumber?: string;
  }>>({});

  useEffect(() => {
    let isCancelled = false;
    api.getDoctorSchedules(undefined, bookingDate, bookingDate)
      .then((schedules: any[]) => {
        if (isCancelled) return;
        const map: Record<string, {
          hasSchedule: boolean;
          availableCount: number;
          totalSlots: number;
          bookedSlots: number;
          earliestSlotTime?: string;
          roomNumber?: string;
        }> = {};

        if (Array.isArray(schedules)) {
          const isToday = bookingDate === getTodayISODate();
          const now = new Date();
          const currentMinutes = now.getHours() * 60 + now.getMinutes();

          schedules.forEach((s: any) => {
            if (!s.doctorId) return;
            const validSlots = Array.isArray(s.slots) ? s.slots.filter((slot: any) => {
              if (slot.status !== 'AVAILABLE') return false;
              if (isToday && slot.startTime) {
                const parts = slot.startTime.split(':');
                const startMin = parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
                return startMin > currentMinutes;
              }
              return true;
            }) : [];

            map[s.doctorId] = {
              hasSchedule: s.status === 'ACTIVE',
              availableCount: validSlots.length,
              totalSlots: s.totalSlots || 0,
              bookedSlots: s.bookedSlots || 0,
              earliestSlotTime: validSlots.length > 0 ? validSlots[0].startTime : undefined,
              roomNumber: s.roomNumber,
            };
          });
        }
        setDoctorSchedulesMap(map);
      })
      .catch((err) => {
        console.warn('Lỗi đồng bộ lịch trực bác sĩ thời gian thực:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [bookingDate]);

  // Đồng bộ danh mục bác sĩ từ CSDL qua API
  useEffect(() => {
    let isMounted = true;
    setIsDoctorsLoading(true);
    api.getDoctors()
      .then((data: any[]) => {
        if (!isMounted) return;
        if (Array.isArray(data) && data.length > 0) {
          const mapped: DemoDoctor[] = data.map((d: any) => {
            const rawName = d.fullName || '';
            const academicTitle = d.academicTitle || '';
            const formattedName = formatDoctorFullName(academicTitle, rawName);

            const catKeys: string[] = [];
            const specName = (d.specialtyName || '').toLowerCase();
            if (specName.includes('thần kinh') || specName.includes('não')) {
              catKeys.push('HEADACHE');
            }
            if (specName.includes('tiêu hóa') || specName.includes('gan mật') || specName.includes('dạ dày')) {
              catKeys.push('ABDOMINAL');
            }
            if (specName.includes('hô hấp') || specName.includes('truyền nhiễm') || specName.includes('phổi')) {
              catKeys.push('RESPIRATORY');
            }
            if (specName.includes('xương') || specName.includes('khớp') || specName.includes('cơ xương khớp')) {
              catKeys.push('BONE_JOINT');
            }
            if (specName.includes('da') || specName.includes('da liễu') || specName.includes('thẩm mỹ')) {
              catKeys.push('SKIN');
            }
            if (specName.includes('răng') || specName.includes('hàm') || specName.includes('mặt')) {
              catKeys.push('DENTAL');
            }
            if (specName.includes('mắt') || specName.includes('nhãn khoa')) {
              catKeys.push('EYE');
            }
            // Khoa Nội Tổng Quát phụ trách suy nhược, mệt mỏi, khám tổng quát ban đầu
            if (specName.includes('nội tổng quát') || specName.includes('tổng quát') || specName.includes('khám sức khỏe')) {
              catKeys.push('FATIGUE');
            }

            const lowerName = rawName.toLowerCase();
            const isFemale = lowerName.includes('thị') || lowerName.includes('hương') || 
              lowerName.includes('linh') || lowerName.includes('thảo') || lowerName.includes('thu') ||
              lowerName.includes('mai') || lowerName.includes('lan') || lowerName.includes('trang') ||
              lowerName.includes('ngọc') || lowerName.includes('hoa') || lowerName.includes('phương');

            const isExpert = (academicTitle && (academicTitle.includes('CKII') || academicTitle.includes('TS') || academicTitle.includes('PGS') || academicTitle.includes('GS') || academicTitle.includes('Trưởng'))) ||
              (d.bio && (d.bio.includes('Trưởng') || d.bio.includes('Chuyên gia')));

            const roomText = d.roomNumber 
              ? (d.roomNumber.toLowerCase().startsWith('phòng') ? d.roomNumber : `Phòng ${d.roomNumber}`)
              : 'Phòng P.208 - Tầng 2';

            return {
              id: d.id,
              name: formattedName || rawName || 'Bác sĩ chuyên khoa',
              rawName,
              academicTitle,
              title: d.bio || `${academicTitle || 'Bác sĩ'} - ${d.specialtyName || 'Chuyên khoa'}`,
              specialtyCode: d.specialtyCode || (specName.includes('da') ? 'DERMATOLOGY' : specName.includes('răng') ? 'ODONTO_STOMATOLOGY' : specName.includes('mắt') ? 'OPHTHALMOLOGY' : 'INTERNAL_MEDICINE'),
              specialtyName: d.specialtyName || '',
              specialtyId: d.specialtyId || '',
              categoryKeys: catKeys,
              centerId: d.medicalCenterId,
              room: roomText,
              fee: Number(d.consultationFee) || 200000,
              gender: isFemale ? 'female' : 'male',
              isExpert: !!isExpert,
            };
          });
          setDbDoctors(mapped);
        }
      })
      .catch((err) => {
        console.warn('Lỗi tải danh mục bác sĩ từ máy chủ:', err);
      })
      .finally(() => {
        if (isMounted) setIsDoctorsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Tải danh sách ca khám thực tế từ CSDL khi đổi bác sĩ hoặc ngày khám
  useEffect(() => {
    if (!selectedDoctor?.id) {
      setDynamicSlots([]);
      return;
    }
    let isCancelled = false;
    setIsSlotsLoading(true);
    api.getDoctorAvailableSlots(selectedDoctor.id, bookingDate)
      .then((data) => {
        if (!isCancelled && Array.isArray(data) && data.length > 0) {
          setDynamicSlots(data);
        } else if (!isCancelled) {
          setDynamicSlots([]);
        }
      })
      .catch((err) => {
        console.warn('Không thể tải lịch khám bác sĩ từ DB:', err);
        if (!isCancelled) setDynamicSlots([]);
      })
      .finally(() => {
        if (!isCancelled) setIsSlotsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedDoctor?.id, bookingDate]);

  // Lọc các khung giờ theo Buổi và Ngày khám (Ưu tiên lịch thực từ Database nếu có)
  const shiftSlots = useMemo(() => {
    const isToday = bookingDate === getTodayISODate();
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (dynamicSlots.length > 0) {
      const isMorning = selectedShiftId === 'MORNING';
      const filtered = dynamicSlots.filter(s => {
        if (s.startMinutes !== undefined) {
          return isMorning ? s.startMinutes < 720 : s.startMinutes >= 720;
        }
        const hour = parseInt(s.time?.split(':')[0] || '8', 10);
        return isMorning ? hour < 12 : hour >= 12;
      });

      if (filtered.length > 0) {
        return filtered.map(slot => {
          const isPast = isToday && slot.startMinutes <= currentMinutes;
          const isDisabled = slot.disabled || slot.status === 'full' || slot.status === 'expired' || slot.status === 'locked' || isPast;
          let label = slot.label;
          if (isPast) {
            label = 'Đã qua giờ';
          } else if (slot.status === 'full' || slot.status === 'locked') {
            label = 'Hết chỗ';
          } else if (!label) {
            label = isDisabled ? 'Không khả dụng' : 'Khả dụng';
          }

          return {
            id: slot.id,
            time: slot.time,
            startMinutes: slot.startMinutes,
            session: selectedShiftId as 'MORNING' | 'AFTERNOON',
            disabled: isDisabled,
            label: label,
          };
        });
      }
    }

    // Khi đặt theo bác sĩ cụ thể mà bác sĩ chưa có ca trực: Không tự sinh slot ảo
    if (selectedDoctor?.id) {
      return [];
    }

    // Fallback: BASE_TIME_SLOTS
    return BASE_TIME_SLOTS.filter(s => s.session === selectedShiftId).map(slot => {
      const isPast = isToday && slot.startMinutes <= currentMinutes;
      return {
        id: `base-${slot.time}`,
        ...slot,
        disabled: isPast,
        label: isPast ? 'Đã qua giờ' : 'Khả dụng',
      };
    });
  }, [dynamicSlots, selectedShiftId, bookingDate, selectedDoctor?.id]);

  // Tự động đồng bộ khung giờ hợp lệ khi danh sách giờ thay đổi
  useEffect(() => {
    if (shiftSlots.length > 0) {
      const currentValid = shiftSlots.find(s => s.time === selectedSlotTime && !s.disabled);
      if (!currentValid) {
        const firstAvailable = shiftSlots.find(s => !s.disabled);
        if (firstAvailable) {
          setSelectedSlotTime(firstAvailable.time);
        } else {
          setSelectedSlotTime(shiftSlots[0].time);
        }
      }
    }
  }, [shiftSlots, selectedSlotTime]);

  // Bước 5: Thông tin bệnh nhân & Thanh toán cọc 2k / Mã ưu đãi
  const [patientName, setPatientName] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [paymentTab, setPaymentTab] = useState<'vietqr' | 'promo'>('vietqr');
  const [promoCode, setPromoCode] = useState<string>('');
  const [promoSuccessMsg, setPromoSuccessMsg] = useState<string>('');
  const [promoErrorMsg, setPromoErrorMsg] = useState<string>('');

  // Mã định danh chuyển khoản cọc (duy nhất mỗi phiên đặt khám)
  const [transferBookingCode, setTransferBookingCode] = useState<string>('');

  // Trạng thái kiểm tra thanh toán
  const [isCheckingManual, setIsCheckingManual] = useState<boolean>(false);
  const [checkManualMessage, setCheckManualMessage] = useState<string>('');
  const [qrCountdown, setQrCountdown] = useState<number>(300);
  const [isCheckingAuto, setIsCheckingAuto] = useState<boolean>(false);
  const [isPaymentVerified, setIsPaymentVerified] = useState<boolean>(false);
  const isPaymentVerifiedRef = useRef<boolean>(false);
  const [payOsData, setPayOsData] = useState<{
    accountNumber?: string;
    accountName?: string;
    bin?: string;
    checkoutUrl?: string;
    qrCode?: string;
  } | null>(null);

  // Bước 6: Đặt chỗ thành công
  const [bookingSuccessCode, setBookingSuccessCode] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [createdAppointment, setCreatedAppointment] = useState<any>(null);
  const [isBookingSubmitting, setIsBookingSubmitting] = useState<boolean>(false);
  const [isCancelingBooking, setIsCancelingBooking] = useState<boolean>(false);

  // Chuyên mục triệu chứng hiện tại
  const activeCategory = useMemo(() => {
    return SYMPTOM_CATEGORIES[selectedCategoryKey] || SYMPTOM_CATEGORIES.HEADACHE;
  }, [selectedCategoryKey]);

  // Format giờ hiện tại cho tin nhắn
  const getFormattedTime = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // Tự động cuộn xuống tin nhắn mới nhất trong khung chat (KHÔNG làm cuộn cả cửa sổ trang web)
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    setTimeout(() => {
      if (chatScrollContainerRef.current) {
        chatScrollContainerRef.current.scrollTo({
          top: chatScrollContainerRef.current.scrollHeight,
          behavior,
        });
      }
    }, 60);
  };

  const handleMessageTypingComplete = (msgId: string) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isTypingComplete: true } : m));
    scrollToBottom('smooth');
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, aiStep, isAiAnalyzing]);

  // Luôn reset vị trí cuộn của trang web về đỉnh khi vào/đổi giao diện hoặc chuyển bước
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
    }
  }, [viewMode, aiStep]);

  // Khởi tạo cuộc hội thoại Zalo liền mạch khi mở chế độ AI
  useEffect(() => {
    if (viewMode === 'ai' && messages.length === 0) {
      setMessages([
        {
          id: 'welcome-ai-1',
          sender: 'ai',
          time: getFormattedTime(),
          text: `Dạ, MedSched chào bạn! 👋 Em là Trợ Lý Y Tế AI (Gemini 2.5) đồng hành trực tuyến 24/7 cùng bạn.\n\nHãy bấm chọn nhanh vấn đề sức khỏe bạn đang gặp phải bên dưới hoặc mô tả trực tiếp vào thanh chat cố định bên dưới. Em sẽ phân tích và tìm đúng chuyên khoa, chi nhánh và bác sĩ gần bạn nhất nhé!`,
          widget: 'CHOOSE_SYMPTOM',
          isTypingComplete: false,
        }
      ]);
    }
  }, [viewMode, messages.length]);

  // Tự động điền thông tin người dùng nếu đã đăng nhập
  useEffect(() => {
    const u = getAuthUser();
    if (u) {
      if (u.fullName && !patientName) setPatientName(u.fullName);
      if (u.phone && !patientPhone) setPatientPhone(u.phone);
    }
  }, [patientName, patientPhone]);

  // Sinh mã chuyển khoản cọc 2k khi vào bước thanh toán và khởi tạo appointment thực tế
  useEffect(() => {
    if (aiStep === 'CONFIRM_PAYMENT' && !transferBookingCode && !isInitiatingAptRef.current && !createdAppointment?.id) {
      initiateBackendAppointment().then((apt) => {
        if (!apt) {
          const randNum = Math.floor(100000 + Math.random() * 900000);
          const code = `MED${randNum}`;
          setTransferBookingCode(code);
          api.createRealPayment({
            bookingCode: code,
            amount: 2000,
            paymentType: 'DEPOSIT',
            method: 'BANK_TRANSFER',
          }).then((payRes: any) => {
            if (payRes) {
              setPayOsData({
                accountNumber: payRes.accountNumber || undefined,
                accountName: payRes.accountName || undefined,
                bin: payRes.bin || undefined,
                checkoutUrl: payRes.checkoutUrl || undefined,
                qrCode: payRes.qrCode || undefined,
              });
            }
          }).catch((err) => {
            console.warn('Khởi tạo giao dịch cọc 2k AI booking:', err);
          });
        }
      });
    }
  }, [aiStep, transferBookingCode, createdAppointment?.id]);

  // Đếm ngược 5 phút QR và tự động polling kiểm tra tiền cọc qua checkRealPaymentStatus
  useEffect(() => {
    if (aiStep !== 'CONFIRM_PAYMENT' || !transferBookingCode) return;

    const timer = setInterval(() => {
      setQrCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    const polling = setInterval(async () => {
      try {
        setIsCheckingAuto(true);
        const res = await api.checkRealPaymentStatus({
          bookingCode: transferBookingCode,
          appointmentId: createdAppointment?.id,
        });
        if (res?.status === 'SUCCEEDED' || res?.success) {
          clearInterval(polling);
          clearInterval(timer);
          isPaymentVerifiedRef.current = true;
          setIsPaymentVerified(true);
          handleConfirmFinalBooking(true);
        }
      } catch (err) {
        // Tiếp tục polling ngầm
      } finally {
        setIsCheckingAuto(false);
      }
    }, 3000);

    return () => {
      clearInterval(timer);
      clearInterval(polling);
    };
  }, [aiStep, transferBookingCode, createdAppointment?.id]);

  // Thông tin thanh toán cọc PayOS VietQR đồng bộ
  const effectiveAccountNo = payOsData?.accountNumber || VIETQR_BANK_CONFIG.accountNo;
  const effectiveAccountName = payOsData?.accountName || VIETQR_BANK_CONFIG.accountName;
  const effectiveBin = payOsData?.bin || VIETQR_BANK_CONFIG.bankId;
  const bankDisplayName = payOsData?.bin ? (payOsData.bin === '970452' ? 'KienlongBank (Đối tác PayOS)' : 'Ngân hàng đối tác PayOS (Napas 247)') : VIETQR_BANK_CONFIG.bankName.split(' - ')[0];
  const qrSrc = payOsData?.qrCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(payOsData.qrCode)}`
    : `https://img.vietqr.io/image/${effectiveBin}-${effectiveAccountNo}-compact2.png?amount=2000&addInfo=MEDPAY%20${transferBookingCode}&accountName=${encodeURIComponent(effectiveAccountName)}`;

  // Danh sách bác sĩ phù hợp với chuyên khoa, cơ sở và bộ lọc (RÀNG BUỘC NGHIÊM NGẶT THEO TRIỆU CHỨNG & CƠ SỞ)
  const availableDoctors = useMemo(() => {
    const doctorPool = dbDoctors.length > 0 ? dbDoctors : DEMO_DOCTORS;
    
    // 1. Ràng buộc nghiêm ngặt: Bác sĩ PHẢI thuộc cơ sở được chọn VÀ đúng chuyên khoa
    const matched = doctorPool.filter(d => {
      // a. RÀNG BUỘC CƠ SỞ: Tuyệt đối không lấy bác sĩ cơ sở này gán sang cơ sở khác
      if (selectedBranch) {
        const matchesBranch = d.centerId && (
          d.centerId === selectedBranch.id ||
          d.centerId === selectedBranch.code ||
          (d.centerId && selectedBranch.id && d.centerId.toLowerCase() === selectedBranch.id.toLowerCase())
        );
        if (!matchesBranch) return false;
      }

      // b. RÀNG BUỘC CHUYÊN KHOA ĐÚNG TRIỆU CHỨNG
      const matchesCategory = d.categoryKeys?.includes(selectedCategoryKey) ||
        (d.specialtyCode && d.specialtyCode === activeCategory.specialtyCode) ||
        (d.specialtyName && activeCategory.specialtyName && (
          d.specialtyName.toLowerCase().includes(activeCategory.specialtyName.toLowerCase()) ||
          activeCategory.specialtyName.toLowerCase().includes(d.specialtyName.toLowerCase())
        ));
      return matchesCategory;
    });

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
  }, [dbDoctors, selectedCategoryKey, activeCategory, selectedBranch, doctorFilter]);

  // Danh sách bác sĩ thực tế đang có mặt tại phòng khám (không trùng lặp) để hiển thị minh bạch
  const activeClinicDoctors = useMemo(() => {
    const pool = dbDoctors.length > 0 ? dbDoctors : DEMO_DOCTORS;
    const seen = new Set<string>();
    const list: DemoDoctor[] = [];
    for (const d of pool) {
      const key = (d.name || '').trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        list.push(d);
      }
    }
    return list;
  }, [dbDoctors]);

  // Cập nhật bác sĩ mặc định khi danh sách thay đổi theo cơ sở (Chỉ gán khi người dùng đã bước sang bước chọn Bác sĩ)
  useEffect(() => {
    if (
      aiStep === 'UNSUPPORTED_SPECIALTY' || 
      aiStep === 'DOCTOR_NO_SLOTS' ||
      aiStep === 'EMERGENCY' || 
      aiStep === 'CHOOSE_SYMPTOM' || 
      aiStep === 'CLARIFY_DETAILS' ||
      aiStep === 'INPUT_LOCATION'
    ) {
      setSelectedDoctor(null);
      return;
    }
    if (availableDoctors.length > 0) {
      if (!selectedDoctor || !availableDoctors.some(d => d.id === selectedDoctor.id)) {
        setSelectedDoctor(availableDoctors[0]);
      }
    } else {
      setSelectedDoctor(null);
    }
  }, [availableDoctors, selectedDoctor, aiStep]);

  // --- CÁC HÀM XỬ LÝ SỰ KIỆN LIỀN MẠCH (ZALO CHAT FLOW) ---

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

  // Làm mới cuộc hội thoại
  const handleResetConversation = () => {
    setSelectedCategoryKey('');
    setAiClinicalSummary('');
    setAiPreparationAdvice('');
    setAiStep('CHOOSE_SYMPTOM');
    setClarifyQuestionIndex(1);
    setTotalClarifyQuestions(3);
    setSelectedNature('');
    setSelectedDuration('');
    setSelectedAssociated('');
    setSelectedFollowup('');
    setCustomNatureInput('');
    setOtherSymptomDetail('');
    setIsPaymentVerified(false);
    isPaymentVerifiedRef.current = false;
    setCheckManualMessage('');
    setPromoCode('');
    setPromoSuccessMsg('');
    setPromoErrorMsg('');
    setMessages([
      {
        id: 'msg-' + Date.now(),
        sender: 'ai',
        time: getFormattedTime(),
        text: `Dạ, em đã làm mới cuộc trò chuyện. Hãy chọn vấn đề sức khỏe bạn đang gặp phải bên dưới hoặc gõ trực tiếp vào thanh chat nhé!`,
        widget: 'CHOOSE_SYMPTOM',
        isTypingComplete: false,
      }
    ]);
  };

  // Bước 1: Khi bấm chọn một triệu chứng ban đầu dạng thẻ
  const handleSelectSymptomPill = (categoryKey: string) => {
    setSelectedCategoryKey(categoryKey);
    const cat = SYMPTOM_CATEGORIES[categoryKey];
    setSelectedNature('');
    setSelectedDuration('');
    setSelectedAssociated('');
    setSelectedFollowup('');
    setCustomNatureInput('');
    setClarifyQuestionIndex(1);
    setTotalClarifyQuestions(3);

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      time: getFormattedTime(),
      text: `Tôi đang gặp vấn đề: ${cat ? cat.label : categoryKey}`,
    };

    const aiMsg: ChatMessage = {
      id: 'msg-' + (Date.now() + 1),
      sender: 'ai',
      time: getFormattedTime(),
      text: `Dạ MedSched đã ghi nhận bạn đang gặp triệu chứng **${cat ? cat.label : categoryKey}**.\n\nĐể hỗ trợ bác sĩ nắm rõ mức độ khó chịu và chẩn đoán chính xác nhất, em xin phép hỏi bạn một số câu hỏi nhanh nhé!`,
      widget: 'CLARIFY_DETAILS',
      clarifyMeta: {
        questionNumber: 1,
        totalQuestions: 3,
        questionTitle: 'Cảm giác khó chịu hoặc biểu hiện cụ thể ra sao?',
        options: cat ? cat.natureOptions : ['Khó chịu nhẹ', 'Đau vừa phải', 'Đau nhiều', 'Khó chịu không rõ'],
        fieldKey: 'nature',
      },
      isTypingComplete: false,
    };

    setAiStep('CLARIFY_DETAILS');
    setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);
  };

  // Khi người dùng bấm vào 1 trong 4 lựa chọn trắc nghiệm
  const handleSelectClarifyOption = (optionText: string, fieldKey?: string) => {
    if (fieldKey === 'nature') setSelectedNature(optionText);
    else if (fieldKey === 'duration') setSelectedDuration(optionText);
    else if (fieldKey === 'associated') setSelectedAssociated(optionText);
    else if (fieldKey === 'followup') setSelectedFollowup(optionText);

    // Tự động điền vào khung chat cố định ở đáy để người dùng có thể bấm Gửi hoặc gõ thêm
    setInputMessage(optionText);
  };

  // Tiến trình hỏi từng câu trắc nghiệm lâm sàng (1-by-1 Conversational Triage)
  const handleAdvanceClarify = (customAnswer?: string) => {
    let answer = (customAnswer || inputMessage).trim();
    if (!answer) {
      if (clarifyQuestionIndex === 1) answer = selectedNature || activeCategory.natureOptions[0];
      else if (clarifyQuestionIndex === 2) answer = selectedDuration || activeCategory.durationOptions[0];
      else if (clarifyQuestionIndex === 3) answer = selectedAssociated || activeCategory.associatedOptions[0];
      else answer = selectedFollowup || 'Không có';
    } else if (customAnswer) {
      // Nếu người dùng tự gõ câu trả lời, kiểm tra ràng buộc không được nhập phép tính hoặc spam
      const validation = isNonMedicalOrSpamInput(answer);
      if (validation.isInvalid) {
        const userMsg: ChatMessage = {
          id: 'msg-' + Date.now(),
          sender: 'user',
          time: getFormattedTime(),
          text: answer,
        };
        const warningMsg: ChatMessage = {
          id: 'msg-' + (Date.now() + 1),
          sender: 'ai',
          time: getFormattedTime(),
          text: `⚠️ **Câu trả lời "${answer}" không liên quan đến biểu hiện sức khỏe!**\n\nVui lòng mô tả cụ thể cảm giác khó chịu của bạn (hoặc bấm chọn vào 1 trong các phương án gợi ý bên trên) để bác sĩ nắm đúng tình trạng nhé!`,
          widget: 'CLARIFY_DETAILS',
          clarifyMeta: messages[messages.length - 1]?.clarifyMeta,
          isTypingComplete: false,
        };
        setInputMessage('');
        setMessages(prev => [...prev, userMsg, warningMsg]);
        return;
      }
    }

    setInputMessage('');

    let currentNature = selectedNature;
    let currentDuration = selectedDuration;
    let currentAssociated = selectedAssociated;
    let currentFollowup = selectedFollowup;

    if (clarifyQuestionIndex === 1) {
      setSelectedNature(answer);
      currentNature = answer;
    } else if (clarifyQuestionIndex === 2) {
      setSelectedDuration(answer);
      currentDuration = answer;
    } else if (clarifyQuestionIndex === 3) {
      setSelectedAssociated(answer);
      currentAssociated = answer;
    } else if (clarifyQuestionIndex === 4) {
      setSelectedFollowup(answer);
      currentFollowup = answer;
    }

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      time: getFormattedTime(),
      text: answer,
    };

    // Kiểm tra xem có cần hỏi thêm câu 4 (Hỏi kỹ về tiền sử dùng thuốc / bệnh lý nền) hay không
    const lower = answer.toLowerCase() + ' ' + (currentNature || '').toLowerCase();
    const isSevereOrComplex = (
      lower.includes('sốt') ||
      lower.includes('đau') ||
      lower.includes('nôn') ||
      lower.includes('chảy máu') ||
      lower.includes('buốt') ||
      lower.includes('nặng') ||
      lower.includes('khó chịu') ||
      lower.includes('tái phát') ||
      lower.includes('nhiều tháng') ||
      lower.includes('nhiều năm')
    );

    if (clarifyQuestionIndex === 1) {
      // Sang Câu 2: Thời gian
      const targetTotal = isSevereOrComplex ? 4 : 3;
      setTotalClarifyQuestions(targetTotal);
      setClarifyQuestionIndex(2);

      const aiMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        time: getFormattedTime(),
        text: `Dạ em đã ghi nhận biểu hiện: "${answer}".\n\nTiếp theo, bạn cho em biết triệu chứng này bạn đã bị kéo dài bao lâu rồi ạ?`,
        widget: 'CLARIFY_DETAILS',
        clarifyMeta: {
          questionNumber: 2,
          totalQuestions: targetTotal,
          questionTitle: 'Triệu chứng này đã kéo dài bao lâu?',
          options: activeCategory.durationOptions,
          fieldKey: 'duration',
        },
        isTypingComplete: false,
      };

      setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);
    } else if (clarifyQuestionIndex === 2) {
      // Sang Câu 3: Triệu chứng kèm theo
      setClarifyQuestionIndex(3);

      const aiMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        time: getFormattedTime(),
        text: `Dạ, tình trạng đã diễn ra "${answer}".\n\nBạn có thấy xuất hiện thêm dấu hiệu bất thường nào khác đi kèm không ạ?`,
        widget: 'CLARIFY_DETAILS',
        clarifyMeta: {
          questionNumber: 3,
          totalQuestions: totalClarifyQuestions,
          questionTitle: 'Bạn có kèm theo triệu chứng nào khác không?',
          options: activeCategory.associatedOptions,
          fieldKey: 'associated',
        },
        isTypingComplete: false,
      };

      setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);
    } else if (clarifyQuestionIndex === 3 && totalClarifyQuestions === 4) {
      // Sang Câu 4 (Hỏi kỹ về tiền sử & thuốc)
      setClarifyQuestionIndex(4);

      const aiMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        time: getFormattedTime(),
        text: `Dạ em đã lưu ghi nhận: "${answer}".\n\nĐể hỗ trợ bác sĩ kê đơn và chuẩn bị dụng cụ thăm khám chu đáo nhất, bạn cho em hỏi thêm: Bạn đã từng dùng thuốc gì hoặc có tiền sử bệnh lý cần lưu ý không?`,
        widget: 'CLARIFY_DETAILS',
        clarifyMeta: {
          questionNumber: 4,
          totalQuestions: 4,
          questionTitle: 'Tiền sử dùng thuốc hoặc bệnh lý nền',
          options: [
            'Chưa dùng thuốc gì, không có bệnh nền',
            'Đang tự uống thuốc hạ sốt / giảm đau',
            'Đang điều trị bệnh nền (huyết áp, dạ dày...)',
            'Từng bị triệu chứng tương tự trước đây',
          ],
          fieldKey: 'followup',
        },
        isTypingComplete: false,
      };

      setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);
    } else {
      // ĐÃ HOÀN TẤT CÁC CÂU HỎI -> TỔNG HỢP VÀ ĐÁNH GIÁ TÍNH PHÙ HỢP CỦA BÁC SĨ TẠI PHÒNG KHÁM
      const doctorPool = dbDoctors.length > 0 ? dbDoctors : DEMO_DOCTORS;
      const matchingDoctors = doctorPool.filter(d => {
        return (
          d.categoryKeys?.includes(selectedCategoryKey) ||
          (d.specialtyCode && d.specialtyCode === activeCategory.specialtyCode) ||
          (d.specialtyName && activeCategory.specialtyName && (
            d.specialtyName.toLowerCase().includes(activeCategory.specialtyName.toLowerCase()) ||
            activeCategory.specialtyName.toLowerCase().includes(d.specialtyName.toLowerCase())
          ))
        );
      });

      const summaryNote = [
        `• **Biểu hiện lâm sàng:** ${currentNature || 'Bình thường'}`,
        `• **Thời gian diễn tiến:** ${currentDuration || 'Mới bị'}`,
        `• **Dấu hiệu kèm theo:** ${currentAssociated || 'Không có'}`,
        currentFollowup ? `• **Tiền sử / Thuốc:** ${currentFollowup}` : null,
      ].filter(Boolean).join('\n');

      if (matchingDoctors.length === 0) {
        // TRƯỜNG HỢP: PHÒNG KHÁM CHƯA CÓ BÁC SĨ CHUYÊN MÔN PHÙ HỢP VỚI TÌNH TRẠNG NÀY (VD: RĂNG HÀM MẶT, MẮT...)
        setAiStep('UNSUPPORTED_SPECIALTY');
        setSelectedDoctor(null);

        const aiMsg: ChatMessage = {
          id: 'msg-' + (Date.now() + 1),
          sender: 'ai',
          time: getFormattedTime(),
          text: `⚠️ **THÔNG BÁO GIỚI HẠN CHUYÊN MÔN Y TẾ TẠI PHÒNG KHÁM**\n\nDạ sau khi ghi nhận đầy đủ biểu hiện của bạn:\n${summaryNote}\n\nTheo định hướng chuyên môn, tình trạng của bạn cần được thăm khám tại **${activeCategory.specialtyName}**.\n\nTuy nhiên, **hiện tại hệ thống MedSched CHƯA CÓ Bác sĩ chuyên môn phụ trách chuyên khoa này**. Để bảo đảm an toàn tuyệt đối và hiệu quả chẩn đoán chính xác nhất, hệ thống **không thể gán ghép bác sĩ chuyên khoa khác** để khám cho bạn.\n\n👉 **Khuyến nghị y tế:** Bạn nên đến trực tiếp các **bệnh viện chuyên khoa hoặc cơ sở y tế tuyến trên** để được thăm khám đầy đủ máy móc chuyên dụng.\n\n📌 **Phòng khám MedSched hiện CHỈ HỖ TRỢ ĐẶT LỊCH với các chuyên khoa có Bác sĩ chuyên môn phụ trách thực tế:**\n• **Chuyên khoa Da liễu:** BSNT Trương Văn A, BS.CKII Nguyễn Minh Anh, BS. Đỗ Quang Vinh, BS. Lê Thị Thu Hà (điều trị viêm da, dị ứng, mẩn ngứa, mụn nhọt...)\n• **Chuyên khoa Nội tổng quát:** PGS.TS Trần Văn Hùng (chẩn đoán suy nhược cơ thể, mệt mỏi kéo dài, đau đầu tiền đình, tiêu hóa, hô hấp...)\n\nBạn có thể tham khảo danh sách bác sĩ chuyên môn đang khám tại phòng khám bên dưới hoặc bấm nút **"Mô tả triệu chứng khác"** nếu bạn cần khám vấn đề sức khỏe khác:`,
          widget: 'UNSUPPORTED_SPECIALTY',
          isTypingComplete: false,
        };

        setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);
        return;
      }

      // KIỂM TRA SỐ LƯỢNG CA KHÁM VÀ SLOT KHẢ DỤNG THỜI GIAN THỰC TỪ CSDL
      const matchingWithSlots = matchingDoctors.filter(d => (doctorSchedulesMap[d.id]?.availableCount ?? 0) > 0);
      const matchingWithoutSlots = matchingDoctors.filter(d => (doctorSchedulesMap[d.id]?.availableCount ?? 0) === 0);
      const otherDoctorsWithSlots = doctorPool.filter(d => !matchingDoctors.some(m => m.id === d.id) && (doctorSchedulesMap[d.id]?.availableCount ?? 0) > 0);

      if (matchingWithSlots.length > 0) {
        // TRƯỜNG HỢP 1: BÁC SĨ CHUYÊN KHOA ĐANG CÓ CA KHÁM SẴN SÀNG VÀ CÒN CHỖ TRỐNG (ƯU TIÊN ĐẶT LỊCH CAO NHẤT)
        const primaryDoc = matchingWithSlots[0];
        setSelectedDoctor(primaryDoc);
        if (primaryDoc.centerId) {
          const matchBranch = branches.find(b => b.id === primaryDoc.centerId || b.code === primaryDoc.centerId);
          if (matchBranch) setSelectedBranch(matchBranch);
        }
        setAiStep('SELECT_DOCTOR_SLOT');
        const availCount = doctorSchedulesMap[primaryDoc.id]?.availableCount || 0;
        const earliestTime = doctorSchedulesMap[primaryDoc.id]?.earliestSlotTime || '08:00';

        const aiMsg: ChatMessage = {
          id: 'msg-' + (Date.now() + 1),
          sender: 'ai',
          time: getFormattedTime(),
          text: `Dạ rất rõ ràng và chi tiết! 🩺 Em đã ghi nhận đầy đủ hồ sơ triệu chứng của bạn:\n\n${summaryNote}\n\nTheo định hướng chuyên môn, tình trạng của bạn hoàn toàn phù hợp thăm khám tại **${activeCategory.specialtyName}** (Độ khớp AI: 100%).\n\n👨‍⚕️ **Bác sĩ chuyên môn phụ trách:** **${primaryDoc.name}** (${primaryDoc.room || 'Phòng khám chuyên khoa'}).\n⚡ **Cập nhật thời gian thực:** Bác sĩ đang có ca trực với **${availCount} khung giờ khám còn trống** trong ngày (khung giờ sớm nhất: **${earliestTime}**).\n\nEm đã chọn sẵn bác sĩ cho bạn. Mời bạn chọn khung giờ khám phù hợp bên dưới để giữ chỗ ngay nhé!`,
          widget: 'SELECT_DOCTOR_SLOT',
          isTypingComplete: false,
        };

        setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);
        return;
      }

      // TRƯỜNG HỢP 2: BÁC SĨ CHUYÊN KHOA PHÙ HỢP CÓ TRONG HỆ THỐNG NHƯNG HIỆN CHƯA CÓ CA KHÁM MỞ SẴN TRONG NGÀY
      // Tuân thủ nghiêm ngặt chỉ đạo: Bác sĩ ... có thể điều trị những triệu chứng mà bạn nêu nhưng chưa có ca khám hãy quay lại sau.
      setAiStep('DOCTOR_NO_SLOTS');
      setSelectedDoctor(null);
      const doctorNames = matchingWithoutSlots.map(d => d.name).join(', ') || matchingDoctors.map(d => d.name).join(', ');
      const altDoctor = otherDoctorsWithSlots.length > 0 ? otherDoctorsWithSlots[0] : null;

      const aiMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        time: getFormattedTime(),
        text: `Dạ em đã ghi nhận đầy đủ hồ sơ triệu chứng của bạn:\n\n${summaryNote}\n\nTheo định hướng chuyên môn, tình trạng của bạn cần được thăm khám tại **${activeCategory.specialtyName}**.\n\n👨‍⚕️ Bác sĩ **${doctorNames}** tại phòng khám MedSched có thể điều trị những triệu chứng mà bạn nêu, nhưng hiện tại **hôm nay chưa có ca khám mở sẵn** (hoặc các ca khám trong ngày đã kín lịch). Bạn vui lòng quay lại sau hoặc chọn ngày khám khác nhé!${altDoctor ? `\n\n💡 *Gợi ý thay thế:* Nếu bạn cần được thăm khám ban đầu ngay hôm nay, phòng khám có Bác sĩ **${altDoctor.name}** (${altDoctor.specialtyName}) đang có ca trực sẵn sàng tiếp nhận.` : ''}`,
        widget: 'DOCTOR_NO_SLOTS',
        actionOptions: [
          {
            label: '📅 Kiểm tra lịch ngày mai',
            actionKey: 'CHANGE_DATE',
            variant: 'primary',
          },
          ...(altDoctor ? [{
            label: `🩺 Khám với ${altDoctor.name}`,
            actionKey: 'SELECT_ALT_DOCTOR' as const,
            variant: 'secondary' as const,
            payload: { doctor: altDoctor },
          }] : []),
          {
            label: '🔄 Mô tả triệu chứng khác',
            actionKey: 'RESET_SYMPTOMS',
            variant: 'outline',
          },
        ],
        isTypingComplete: false,
      };

      setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);
    }
  };

  // Đặt lại khảo sát để người dùng mô tả lại triệu chứng khác
  const handleResetToSymptomChoice = () => {
    setSelectedCategoryKey('');
    setSelectedNature('');
    setSelectedDuration('');
    setSelectedAssociated('');
    setSelectedFollowup('');
    setCustomNatureInput('');
    setClarifyQuestionIndex(1);
    setTotalClarifyQuestions(3);
    setSelectedDoctor(null);
    setAiStep('CHOOSE_SYMPTOM');

    const resetMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'ai',
      time: getFormattedTime(),
      text: 'Dạ vâng, em đã làm mới khảo sát. Mời bạn chọn triệu chứng sức khỏe bên dưới hoặc mô tả trực tiếp vào thanh chat để em hỗ trợ nhé!',
      widget: 'CHOOSE_SYMPTOM',
      isTypingComplete: false,
    };
    setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), resetMsg]);
  };

  // Chọn đặt khám trực tiếp với một trong các bác sĩ thực tế đang có mặt tại phòng khám
  const handleSelectDoctorDirectly = (doc: DemoDoctor) => {
    const targetKey = doc.categoryKeys?.[0] || (doc.specialtyCode === 'DERMATOLOGY' ? 'SKIN' : 'FATIGUE');
    setSelectedCategoryKey(targetKey);
    setSelectedDoctor(doc);
    if (doc.centerId) {
      const matchBranch = branches.find(b => b.id === doc.centerId || b.code === doc.centerId);
      if (matchBranch) setSelectedBranch(matchBranch);
    }
    setAiStep('SELECT_DOCTOR_SLOT');

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      time: getFormattedTime(),
      text: `Tôi muốn đặt lịch khám với ${doc.name}`,
    };

    const aiMsg: ChatMessage = {
      id: 'msg-' + (Date.now() + 1),
      sender: 'ai',
      time: getFormattedTime(),
      text: `Dạ vâng! Hệ thống đã ghi nhận bạn muốn khám với **${doc.name}** (${doc.room || 'Phòng khám chuyên khoa'}).\n\nMời bạn chọn ngày và khung giờ khám còn trống bên dưới để giữ chỗ nhé:`,
      widget: 'SELECT_DOCTOR_SLOT',
      isTypingComplete: false,
    };

    setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);
  };

  // Xử lý khi người dùng bấm vào một nút tác vụ nhanh (Quick Action Chip) trong tin nhắn AI
  const handleExecuteActionOption = (opt: ChatActionOption) => {
    if (opt.actionKey === 'CONFIRM_PROPOSAL_TO_DOCTOR') {
      const p = opt.payload as NurseProposal;
      const targetBranch = p?.branch || selectedBranch;
      const targetShift = p?.shiftId || selectedShiftId;
      const targetSlot = p?.slotTime || selectedSlotTime;
      const targetDate = p?.date || bookingDate;

      setSelectedBranch(targetBranch);
      setSelectedShiftId(targetShift);
      setSelectedSlotTime(targetSlot);
      if (p?.date) setBookingDate(p.date);
      setNurseProposal(null);

      const userMsg: ChatMessage = {
        id: 'msg-' + Date.now(),
        sender: 'user',
        time: getFormattedTime(),
        text: `Đồng ý: Chọn ${targetBranch.shortName} • Khung giờ: ${targetSlot} (${targetShift === 'AFTERNOON' ? 'Buổi Chiều' : 'Buổi Sáng'})`,
      };

      const aiMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        time: getFormattedTime(),
        text: `Dạ vâng tuyệt vời ạ! Em đã thiết lập thông tin giúp bạn:\n• 📍 Cơ sở: **${targetBranch.shortName}**\n• 📅 Ngày khám: **${formatVietnameseFullDate(targetDate)}**\n• ⏰ Khung giờ: **${targetSlot} (${targetShift === 'AFTERNOON' ? 'Buổi Chiều' : 'Buổi Sáng'})**\n\nDưới đây là danh sách các Bác sĩ chuyên khoa đang trực ca ${targetShift === 'AFTERNOON' ? 'chiều' : 'sáng'} tại ${targetBranch.shortName}. Em mời bạn xem qua và bấm chọn Bác sĩ phù hợp bên dưới nhé:`,
        widget: 'SELECT_DOCTOR_SLOT',
        isTypingComplete: false,
      };

      setAiStep('SELECT_DOCTOR_SLOT');
      setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);
    } else if (opt.actionKey === 'SELECT_BRANCH') {
      const branch = opt.payload?.branch as ClinicBranch;
      if (branch) {
        setSelectedBranch(branch);
        const userMsg: ChatMessage = {
          id: 'msg-' + Date.now(),
          sender: 'user',
          time: getFormattedTime(),
          text: `Tôi chọn ${branch.shortName}`,
        };
        const aiMsg: ChatMessage = {
          id: 'msg-' + (Date.now() + 1),
          sender: 'ai',
          time: getFormattedTime(),
          text: `Dạ em đã chuyển cơ sở sang **${branch.shortName}** giúp bạn rồi ạ! 🏥\n\nBạn dự định đến khám vào **Buổi Sáng (08:00 - 11:30)** hay **Buổi Chiều (13:30 - 16:00)** để em chuẩn bị danh sách bác sĩ cho bạn nhé?`,
          actionOptions: [
            {
              label: '🌅 Buổi Sáng (08:00 - 11:30)',
              actionKey: 'SELECT_SHIFT',
              variant: 'outline',
              payload: { branch, shift: 'MORNING' },
            },
            {
              label: '🌇 Buổi Chiều (13:30 - 16:00)',
              actionKey: 'SELECT_SHIFT',
              variant: 'outline',
              payload: { branch, shift: 'AFTERNOON' },
            },
          ],
          isTypingComplete: false,
        };
        setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);
      }
    } else if (opt.actionKey === 'SELECT_SHIFT') {
      const shift = opt.payload?.shift as 'MORNING' | 'AFTERNOON';
      const branch = (opt.payload?.branch as ClinicBranch) || selectedBranch;
      if (shift) {
        setSelectedShiftId(shift);
        if (opt.payload?.branch) setSelectedBranch(branch);
        const userMsg: ChatMessage = {
          id: 'msg-' + Date.now(),
          sender: 'user',
          time: getFormattedTime(),
          text: `Tôi muốn khám vào ${shift === 'MORNING' ? 'Buổi Sáng' : 'Buổi Chiều'}`,
        };
        const defaultSlot = shift === 'MORNING' ? '08:00 - 08:30' : '13:30 - 14:00';
        setSelectedSlotTime(defaultSlot);

        const aiMsg: ChatMessage = {
          id: 'msg-' + (Date.now() + 1),
          sender: 'ai',
          time: getFormattedTime(),
          text: `Dạ em đã ghi nhận bạn khám **${shift === 'MORNING' ? 'Buổi Sáng (08:00 - 11:30)' : 'Buổi Chiều (13:30 - 16:00)'}** tại **${branch.shortName}**! 🩺\n\nDưới đây là danh sách bác sĩ và các khung giờ khả dụng. Bạn hãy bấm chọn bác sĩ phù hợp nhé:`,
          widget: 'SELECT_DOCTOR_SLOT',
          isTypingComplete: false,
        };
        setAiStep('SELECT_DOCTOR_SLOT');
        setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);
      }
    } else if (opt.actionKey === 'CHANGE_DATE') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowIso = tomorrow.toISOString().split('T')[0];
      setBookingDate(tomorrowIso);
      const userMsg: ChatMessage = {
        id: 'msg-' + Date.now(),
        sender: 'user',
        time: getFormattedTime(),
        text: `Kiểm tra lịch khám ngày mai (${formatVietnameseFullDate(tomorrowIso)})`,
      };
      const aiMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        time: getFormattedTime(),
        text: `Dạ em đã chuyển ngày khám sang **ngày mai (${formatVietnameseFullDate(tomorrowIso)})** để kiểm tra ca trực của bác sĩ giúp bạn rồi nhé! Dưới đây là danh sách bác sĩ và các khung giờ:`,
        widget: 'SELECT_DOCTOR_SLOT',
        isTypingComplete: false,
      };
      setAiStep('SELECT_DOCTOR_SLOT');
      setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);
    } else if (opt.actionKey === 'SELECT_ALT_DOCTOR') {
      const doc = opt.payload?.doctor as DemoDoctor;
      if (doc) {
        handleSelectDoctorDirectly(doc);
      }
    } else if (opt.actionKey === 'RESET_SYMPTOMS') {
      handleResetToSymptomChoice();
    } else if (opt.actionKey === 'CUSTOM_TEXT') {
      const txt = opt.payload?.text;
      if (txt) {
        setInputMessage(txt);
      }
    }
  };

  // Xử lý ngôn ngữ tự nhiên như Y tá / Lễ tân thực tế ở Bước 3 (INPUT_LOCATION)
  const handleLocationStepNaturalLanguage = (text: string, userMsg: ChatMessage) => {
    const intent = parsePatientBookingIntent(text, selectedBranch, bookingDate, branches);

    // 1. Nếu người dùng phản hồi đồng ý với đề xuất của y tá
    if (intent.isAgreement && nurseProposal) {
      const p = nurseProposal;
      const targetBranch = p.branch || selectedBranch || branches[0];
      const targetShift = p.shiftId || selectedShiftId;
      const targetSlot = p.slotTime || selectedSlotTime;
      const targetDate = p.date || bookingDate;

      if (targetBranch) setSelectedBranch(targetBranch);
      setSelectedShiftId(targetShift);
      setSelectedSlotTime(targetSlot);
      if (p.date) setBookingDate(p.date);
      setNurseProposal(null);

      const aiMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        time: getFormattedTime(),
        text: `Dạ vâng tuyệt vời ạ! Em đã thiết lập lịch khám giúp bạn:\n• 📍 Cơ sở: **${targetBranch?.shortName || 'Phòng khám'}**\n• 📅 Ngày khám: **${formatVietnameseFullDate(targetDate)}**\n• ⏰ Khung giờ: **${targetSlot} (${targetShift === 'AFTERNOON' ? 'Buổi Chiều' : 'Buổi Sáng'})**\n\nDưới đây là danh sách các Bác sĩ chuyên khoa đang trực ca ${targetShift === 'AFTERNOON' ? 'chiều' : 'sáng'} tại ${targetBranch?.shortName || 'phòng khám'}. Em mời bạn xem qua và bấm chọn Bác sĩ phù hợp bên dưới nhé:`,
        widget: 'SELECT_DOCTOR_SLOT',
        isTypingComplete: false,
      };

      setAiStep('SELECT_DOCTOR_SLOT');
      setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);
      return;
    }

    // 2. Nếu người dùng nhập yêu cầu ca khám bị lệch vào giờ nghỉ trưa (1h - 2h chiều) -> Như yêu cầu của người dùng!
    if (intent.isEarlyAfternoonConflict) {
      const targetBranch = intent.matchedBranch || selectedBranch || branches[0];
      const targetSlot = intent.proposedSlot || '13:30 - 14:00';
      const targetDate = intent.matchedDate || bookingDate;

      if (targetBranch) setSelectedBranch(targetBranch);
      setSelectedShiftId('AFTERNOON');
      setSelectedSlotTime(targetSlot);
      if (intent.matchedDate) setBookingDate(intent.matchedDate);

      const proposal: NurseProposal = {
        branch: targetBranch,
        shiftId: 'AFTERNOON',
        slotTime: targetSlot,
        date: targetDate,
      };
      setNurseProposal(proposal);

      const aiMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        time: getFormattedTime(),
        text: `Dạ em đã ghi nhận bạn chọn **${targetBranch?.shortName || 'phòng khám'}** ạ! 🏥\n\nVề giờ khám: Ca chiều của phòng khám bắt đầu đón tiếp từ **13:30** (từ 11:30 đến 13:30 là giờ nghỉ trưa của các bác sĩ).\n👉 Khung giờ sớm nhất và phù hợp nhất với mong muốn của bạn là **13:30 - 14:00**.\n\nBạn có muốn em chuyển sang đặt từ **13:30 đến 14:00** để chuyển sang bước chọn Bác sĩ luôn không ạ?`,
        actionOptions: [
          {
            label: '✅ Đồng ý (13:30 - 14:00), chọn bác sĩ ngay ➔',
            actionKey: 'CONFIRM_PROPOSAL_TO_DOCTOR',
            variant: 'primary',
            payload: proposal,
          },
          {
            label: '🕒 Đổi sang 14:00 - 14:30',
            actionKey: 'CONFIRM_PROPOSAL_TO_DOCTOR',
            variant: 'secondary',
            payload: { ...proposal, slotTime: '14:00 - 14:30' },
          },
          {
            label: '🌅 Đổi sang Buổi Sáng (08:00 - 11:30)',
            actionKey: 'SELECT_SHIFT',
            variant: 'outline',
            payload: { branch: targetBranch, shift: 'MORNING' },
          },
        ],
        isTypingComplete: false,
      };

      setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);
      return;
    }

    // 3. Nếu người dùng chọn được khung giờ hợp lệ cụ thể
    if (intent.proposedSlot) {
      const targetBranch = intent.matchedBranch || selectedBranch || branches[0];
      const targetShift = intent.matchedShift || (intent.proposedSlot.startsWith('13') || intent.proposedSlot.startsWith('14') || intent.proposedSlot.startsWith('15') ? 'AFTERNOON' : 'MORNING');
      const targetSlot = intent.proposedSlot;
      const targetDate = intent.matchedDate || bookingDate;

      if (targetBranch) setSelectedBranch(targetBranch);
      setSelectedShiftId(targetShift);
      setSelectedSlotTime(targetSlot);
      if (intent.matchedDate) setBookingDate(intent.matchedDate);
      setNurseProposal(null);

      const aiMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        time: getFormattedTime(),
        text: `Dạ tuyệt vời ạ! Em đã chọn giúp bạn:\n• 📍 Cơ sở: **${targetBranch?.shortName || 'phòng khám'}**\n• 📅 Ngày khám: **${formatVietnameseFullDate(targetDate)}**\n• ⏰ Khung giờ: **${targetSlot} (${targetShift === 'AFTERNOON' ? 'Buổi Chiều' : 'Buổi Sáng'})**\n\nDưới đây là danh sách các Bác sĩ chuyên khoa đang trực ca ${targetShift === 'AFTERNOON' ? 'chiều' : 'sáng'} tại ${targetBranch?.shortName || 'phòng khám'}. Em mời bạn xem qua và bấm chọn Bác sĩ phù hợp bên dưới nhé:`,
        widget: 'SELECT_DOCTOR_SLOT',
        isTypingComplete: false,
      };

      setAiStep('SELECT_DOCTOR_SLOT');
      setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);
      return;
    }

    // 4. Nếu người dùng chỉ nói tên chi nhánh
    if (intent.matchedBranch && !intent.matchedShift) {
      const targetBranch = intent.matchedBranch;
      setSelectedBranch(targetBranch);
      if (intent.matchedDate) setBookingDate(intent.matchedDate);

      const aiMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        time: getFormattedTime(),
        text: `Dạ em đã chuyển sang **${targetBranch.shortName}** giúp bạn rồi ạ! 🏥\n\nBạn dự định đến khám vào **Buổi Sáng (08:00 - 11:30)** hay **Buổi Chiều (13:30 - 16:00)** để em chuẩn bị danh sách bác sĩ cho bạn nhé?`,
        actionOptions: [
          {
            label: '🌅 Buổi Sáng (08:00 - 11:30)',
            actionKey: 'SELECT_SHIFT',
            variant: 'outline',
            payload: { branch: targetBranch, shift: 'MORNING' },
          },
          {
            label: '🌇 Buổi Chiều (13:30 - 16:00)',
            actionKey: 'SELECT_SHIFT',
            variant: 'outline',
            payload: { branch: targetBranch, shift: 'AFTERNOON' },
          },
        ],
        isTypingComplete: false,
      };

      setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);
      return;
    }

    // 5. Nếu người dùng chỉ chọn buổi / ca
    if (intent.matchedShift && !intent.matchedBranch) {
      const targetShift = intent.matchedShift;
      setSelectedShiftId(targetShift);
      if (intent.matchedDate) setBookingDate(intent.matchedDate);

      const aiMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        time: getFormattedTime(),
        text: `Dạ em đã ghi nhận bạn muốn khám vào **${targetShift === 'MORNING' ? 'Buổi Sáng (08:00 - 11:30)' : 'Buổi Chiều (13:30 - 16:00)'}** ạ! ⏰\n\nBạn muốn khám tại cơ sở nào của MedSched để em hiển thị danh sách bác sĩ tại cơ sở đó nhé?`,
        actionOptions: branches.slice(0, 3).map((b, idx) => ({
          label: `🏥 ${b.shortName}`,
          actionKey: 'CONFIRM_PROPOSAL_TO_DOCTOR',
          variant: (idx === 0 ? 'primary' : 'secondary') as any,
          payload: {
            branch: b,
            shiftId: targetShift,
            slotTime: targetShift === 'MORNING' ? '08:00 - 08:30' : '13:30 - 14:00',
            date: bookingDate,
          },
        })),
        isTypingComplete: false,
      };

      setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);
      return;
    }

    // 6. Trường hợp chung / fallback: Chỉ lưu vào hồ sơ bác sĩ nếu là ghi chú y tế thực sự
    if (isLikelyMedicalNote(text)) {
      setOtherSymptomDetail(prev => prev ? `${prev}. ${text}` : text);
      const aiMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        time: getFormattedTime(),
        text: `Dạ em đã ghi nhận thêm lưu ý y tế của bạn: "${text}" vào hồ sơ gửi cho bác sĩ ạ! 📋\n\nBạn hãy bấm chọn cơ sở và buổi khám trên màn hình, hoặc nói cho em biết cơ sở bạn muốn đến (như ITC hoặc Bình Tân) nhé!`,
        isTypingComplete: false,
      };
      setMessages(prev => [...prev, userMsg, aiMsg]);
      return;
    }

    const aiMsg: ChatMessage = {
      id: 'msg-' + (Date.now() + 1),
      sender: 'ai',
      time: getFormattedTime(),
      text: `Dạ em chưa nhận diện được yêu cầu về cơ sở hoặc thời gian khám từ nội dung: "${text}".\n\n👉 Bạn hãy bấm chọn trực tiếp **Cơ sở** và **Buổi khám** trên màn hình, hoặc nói cho em biết cơ sở bạn muốn đến (như *Chi Nhánh TĐN*, *Tân Phú*) và buổi khám (*buổi sáng*, *buổi chiều*) nhé!`,
      isTypingComplete: false,
    };
    setMessages(prev => [...prev, userMsg, aiMsg]);
  };

  // Xử lý ngôn ngữ tự nhiên ở Bước 4 (SELECT_DOCTOR_SLOT)
  const handleDoctorSlotStepNaturalLanguage = (text: string, userMsg: ChatMessage) => {
    const lower = text.toLowerCase();
    const intent = parsePatientBookingIntent(text, selectedBranch, bookingDate, branches);

    // Kiểm tra đổi giờ
    if (intent.proposedSlot) {
      setSelectedSlotTime(intent.proposedSlot);
      if (intent.matchedShift) setSelectedShiftId(intent.matchedShift);
      const aiMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        time: getFormattedTime(),
        text: `Dạ em đã chuyển khung giờ khám của bạn sang **${intent.proposedSlot}** rồi nhé! Bạn hãy bấm chọn Bác sĩ bên dưới để tiếp tục nhé!`,
        isTypingComplete: false,
      };
      setMessages(prev => [...prev, userMsg, aiMsg]);
      return;
    }

    // Kiểm tra tìm bác sĩ
    const matchedDoc = availableDoctors.find(d => 
      lower.includes(d.name.toLowerCase()) ||
      lower.includes(d.name.split(' ').slice(-2).join(' ').toLowerCase()) ||
      lower.includes(d.name.split(' ').pop()?.toLowerCase() || '')
    ) || (
      lower.includes('trưởng khoa') || lower.includes('chuyên gia') 
        ? availableDoctors.find(d => d.isExpert)
        : lower.includes('nữ') 
        ? availableDoctors.find(d => d.gender === 'female')
        : lower.includes('nam')
        ? availableDoctors.find(d => d.gender === 'male')
        : null
    );

    if (matchedDoc) {
      setSelectedDoctor(matchedDoc);
      const aiMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        time: getFormattedTime(),
        text: `Dạ em đã chọn **${matchedDoc.name}** (${matchedDoc.title} - ${matchedDoc.room}) giúp bạn rồi ạ! 🩺\n\nEm đã chuẩn bị sẵn hồ sơ đặt khám bên dưới. Mời bạn kiểm tra lại thông tin và xác nhận đặt cọc 2.000đ (hoặc nhập mã ưu đãi) để giữ chỗ nhé!`,
        widget: 'CONFIRM_PAYMENT',
        isTypingComplete: false,
      };
      setAiStep('CONFIRM_PAYMENT');
      setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);
      return;
    }

    // Nếu người dùng nhắc đến bác sĩ thuộc chuyên khoa khác (ví dụ: đau đầu nhưng lại hỏi bác sĩ khoa Hô hấp)
    const allDocPool = dbDoctors.length > 0 ? dbDoctors : DEMO_DOCTORS;
    const otherSpecialtyDoc = allDocPool.find(d =>
      lower.includes(d.name.toLowerCase()) ||
      lower.includes(d.name.split(' ').slice(-2).join(' ').toLowerCase()) ||
      lower.includes(d.name.split(' ').pop()?.toLowerCase() || '')
    );
    if (otherSpecialtyDoc) {
      const aiMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        time: getFormattedTime(),
        text: `Dạ, **${otherSpecialtyDoc.name}** là bác sĩ thuộc **${otherSpecialtyDoc.title}** ạ!\n\nVì bạn đang gặp vấn đề **${activeCategory.label}**, phòng khám MedSched đã tự động ràng buộc danh sách chỉ hiển thị các Bác sĩ chuyên khoa **${activeCategory.specialtyName}** bên dưới để thăm khám đúng triệu chứng nhất cho bạn. Bạn hãy bấm chọn bác sĩ chuyên khoa phù hợp bên dưới nhé!`,
        isTypingComplete: false,
      };
      setMessages(prev => [...prev, userMsg, aiMsg]);
      return;
    }

    // Nếu người dùng đồng ý với bác sĩ hiện tại
    if (intent.isAgreement) {
      handleProceedToPayment();
      return;
    }

    // Fallback: Chỉ lưu vào hồ sơ nếu là ghi chú y tế thực tế
    if (isLikelyMedicalNote(text)) {
      setOtherSymptomDetail(prev => prev ? `${prev}. ${text}` : text);
      const aiMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        time: getFormattedTime(),
        text: `Dạ em đã ghi nhận thêm lưu ý y tế: "${text}" vào hồ sơ khám. Bạn hãy bấm chọn Bác sĩ và khung giờ ưng ý trong danh sách bên dưới nhé!`,
        isTypingComplete: false,
      };
      setMessages(prev => [...prev, userMsg, aiMsg]);
      return;
    }

    const aiMsg: ChatMessage = {
      id: 'msg-' + (Date.now() + 1),
      sender: 'ai',
      time: getFormattedTime(),
      text: `Dạ em chưa nhận diện được tên Bác sĩ hoặc khung giờ từ nội dung: "${text}".\n\n👉 Bạn hãy bấm chọn trực tiếp một Bác sĩ và khung giờ khám trong danh sách bên dưới nhé!`,
      isTypingComplete: false,
    };
    setMessages(prev => [...prev, userMsg, aiMsg]);
  };

  // Xử lý ngôn ngữ tự nhiên ở Bước 5 (CONFIRM_PAYMENT)
  const handlePaymentStepNaturalLanguage = (text: string, userMsg: ChatMessage) => {
    const upper = text.toUpperCase().trim();
    // Kiểm tra mã ưu đãi
    const foundPromo = VALID_PROMO_CODES.find(c => upper.includes(c));
    if (foundPromo) {
      setPromoCode(foundPromo);
      setPaymentTab('promo');
      const valRes = validatePromotion(foundPromo, 2000);
      const isFree = valRes.valid ? valRes.isFree : (foundPromo !== 'DEMO2K' && foundPromo !== 'UDAI2K');
      if (isFree) {
        setIsPaymentVerified(true);
        isPaymentVerifiedRef.current = true;
        setPromoSuccessMsg(`Áp dụng thành công mã ${foundPromo}! Giảm 100% tiền cọc (0 VNĐ).`);
        api.confirmRealPayment({
          bookingCode: transferBookingCode,
          paymentType: 'PROMO_FREE',
        }).catch(console.warn);

        const aiMsg: ChatMessage = {
          id: 'msg-' + (Date.now() + 1),
          sender: 'ai',
          time: getFormattedTime(),
          text: `Dạ em đã áp dụng mã ưu đãi **${foundPromo}** giúp bạn rồi ạ! 🎉 Bạn được miễn phí 100% tiền cọc (0 VNĐ). Bạn bấm nút **Xác Nhận & Đặt Lịch Miễn Phí** bên dưới để nhận mã số khám nhé!`,
          isTypingComplete: false,
        };
        setMessages(prev => [...prev, userMsg, aiMsg]);
      } else {
        setPromoSuccessMsg(`Áp dụng thành công mã ${foundPromo}! Đồng giá cọc 2.000 đ. Vui lòng quét mã VietQR để chuyển tiền thật nhé.`);
        const aiMsg: ChatMessage = {
          id: 'msg-' + (Date.now() + 1),
          sender: 'ai',
          time: getFormattedTime(),
          text: `Dạ em đã áp dụng mã **${foundPromo}** giúp bạn rồi ạ! 🎉 Tiền cọc được chốt ở mức **2.000 VNĐ** để bạn quét VietQR chuyển tiền kiểm thử thực tế.`,
          isTypingComplete: false,
        };
        setMessages(prev => [...prev, userMsg, aiMsg]);
      }
      return;
    }

    // Nếu hỏi về tiền cọc
    if (text.toLowerCase().includes('cọc') || text.toLowerCase().includes('tiền') || text.toLowerCase().includes('sao lại')) {
      const aiMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        time: getFormattedTime(),
        text: `Dạ bạn hoàn toàn yên tâm nhé! Khoản đặt cọc 2.000 VNĐ nhằm tránh đặt ảo và đảm bảo giữ chỗ bác sĩ riêng cho bạn. Số tiền này sẽ được hoàn trả tự động 100% ngay khi bạn đến quầy tiếp đón của phòng khám ạ.\n\nNgoài ra, bạn có thể nhập mã ưu đãi **VIP** hoặc **MEDSCHED2026** để được miễn phí 100% tiền cọc nhé!`,
        isTypingComplete: false,
      };
      setMessages(prev => [...prev, userMsg, aiMsg]);
      return;
    }

    if (isLikelyMedicalNote(text)) {
      setOtherSymptomDetail(prev => prev ? `${prev}. ${text}` : text);
      const aiMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        time: getFormattedTime(),
        text: `Dạ em đã lưu thêm ghi chú y tế: "${text}". Bạn vui lòng quét mã QR chuyển khoản 2.000đ hoặc nhập mã ưu đãi bên dưới để hoàn tất nhé!`,
        isTypingComplete: false,
      };
      setMessages(prev => [...prev, userMsg, aiMsg]);
      return;
    }

    const aiMsg: ChatMessage = {
      id: 'msg-' + (Date.now() + 1),
      sender: 'ai',
      time: getFormattedTime(),
      text: `Dạ em chưa nhận diện được mã ưu đãi hoặc yêu cầu từ: "${text}".\n\n👉 Bạn hãy quét mã VietQR bên dưới để đặt cọc 2.000đ hoặc nhập mã ưu đãi (như **VIP**, **MEDSCHED2026**) nhé!`,
      isTypingComplete: false,
    };
    setMessages(prev => [...prev, userMsg, aiMsg]);
  };

  // Khi người dùng gửi tin nhắn từ thanh nhập cố định ở đáy
  const handleSendInputMessage = async () => {
    const text = inputMessage.trim();
    if (!text || isAiAnalyzing) return;

    // 0. GLOBAL GUARDRAIL: Chặn phép tính toán học, ký tự spam, gibberish/keyboard smash ở TẤT CẢ các bước
    const spamCheck = isSpamOrMathOrGibberishInput(text);
    if (spamCheck.isInvalid) {
      setInputMessage('');
      const userMsg: ChatMessage = {
        id: 'msg-' + Date.now(),
        sender: 'user',
        time: getFormattedTime(),
        text: text,
      };
      const warningMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        time: getFormattedTime(),
        text: spamCheck.message || 'Nội dung bạn vừa nhập không hợp lệ.',
        isTypingComplete: false,
      };
      setMessages(prev => [...prev, userMsg, warningMsg]);
      return;
    }

    setInputMessage('');

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      time: getFormattedTime(),
      text: text,
    };

    // Kiểm tra an toàn cấp cứu 115
    if (isEmergencySymptom(text)) {
      const emergencyMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        time: getFormattedTime(),
        text: `🚨 CẢNH BÁO NGUY HIỂM: DẤU HIỆU CẤP CỨU Y TẾ!`,
        widget: 'EMERGENCY',
        isTypingComplete: false,
      };
      setAiStep('EMERGENCY');
      setMessages(prev => [...prev, userMsg, emergencyMsg]);
      return;
    }

    // NẾU ĐANG Ở BƯỚC KHẢO SÁT LÂM SÀNG TỪNG CÂU (CLARIFY_DETAILS)
    if (aiStep === 'CLARIFY_DETAILS') {
      handleAdvanceClarify(text);
      return;
    }

    // Nếu đang ở trạng thái bác sĩ chưa có ca khám mở sẵn (DOCTOR_NO_SLOTS)
    if (aiStep === 'DOCTOR_NO_SLOTS') {
      const lower = text.toLowerCase();
      if (lower.includes('ngày mai') || lower.includes('mai') || lower.includes('hôm sau') || lower.includes('đổi ngày') || lower.includes('chọn ngày')) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowIso = tomorrow.toISOString().split('T')[0];
        setBookingDate(tomorrowIso);
        const aiMsg: ChatMessage = {
          id: 'msg-' + (Date.now() + 1),
          sender: 'ai',
          time: getFormattedTime(),
          text: `Dạ em đã chuyển ngày khám sang **ngày mai (${formatVietnameseFullDate(tomorrowIso)})** để kiểm tra ca trực của bác sĩ giúp bạn rồi nhé! Dưới đây là danh sách bác sĩ và các khung giờ:`,
          widget: 'SELECT_DOCTOR_SLOT',
          isTypingComplete: false,
        };
        setAiStep('SELECT_DOCTOR_SLOT');
        setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);
        return;
      }
    }

    // Nếu đang ở bước đầu, cấp cứu, hoặc vừa được cảnh báo giới hạn chuyên môn / chưa có ca khám và muốn nhập triệu chứng khác
    if (aiStep === 'CHOOSE_SYMPTOM' || aiStep === 'EMERGENCY' || aiStep === 'UNSUPPORTED_SPECIALTY' || aiStep === 'DOCTOR_NO_SLOTS') {
      // 1. Kiểm tra tiền lọc ràng buộc y tế: Phép tính, spam, câu vô nghĩa
      const validation = isNonMedicalOrSpamInput(text);
      if (validation.isInvalid) {
        const warningMsg: ChatMessage = {
          id: 'msg-' + (Date.now() + 1),
          sender: 'ai',
          time: getFormattedTime(),
          text: validation.message || 'Nội dung bạn vừa nhập không phải là triệu chứng y tế hợp lệ.',
          widget: 'CHOOSE_SYMPTOM',
          isTypingComplete: false,
        };
        setAiStep('CHOOSE_SYMPTOM');
        setMessages(prev => [...prev, userMsg, warningMsg]);
        return;
      }

      setIsAiAnalyzing(true);
      setMessages(prev => [...prev, userMsg]);
      try {
        const triage = await api.triageSymptoms(text);
        if (triage?.isEmergency) {
          const emergencyMsg: ChatMessage = {
            id: 'msg-' + (Date.now() + 1),
            sender: 'ai',
            time: getFormattedTime(),
            text: `🚨 CẢNH BÁO NGUY HIỂM: DẤU HIỆU CẤP CỨU Y TẾ!`,
            widget: 'EMERGENCY',
          };
          setAiStep('EMERGENCY');
          setMessages(prev => [...prev, emergencyMsg]);
          setIsAiAnalyzing(false);
          return;
        }

        const summary = triage?.clinicalSummary || triage?.summary || '';
        const summaryLower = summary.toLowerCase();

        // 2. Kiểm tra nếu kết quả trả về từ AI đánh giá là không có triệu chứng hoặc phép toán
        if (
          summaryLower.includes('không cung cấp triệu chứng') ||
          summaryLower.includes('chỉ đưa ra phép tính') ||
          summaryLower.includes('không phải là triệu chứng') ||
          summaryLower.includes('không có thông tin y tế') ||
          summaryLower.includes('phép tính') ||
          summaryLower.includes('không rõ ràng') ||
          triage?.specialtyCode === 'INVALID_INPUT'
        ) {
          const warningMsg: ChatMessage = {
            id: 'msg-' + (Date.now() + 1),
            sender: 'ai',
            time: getFormattedTime(),
            text: `⚠️ **Trợ lý Y tế MedSched:**\n\nNội dung "${text}" chưa thể hiện rõ dấu hiệu hoặc triệu chứng y tế nào cần thăm khám.\n\n👉 Vui lòng mô tả cụ thể triệu chứng cơ thể bạn đang gặp phải (ví dụ: *"đau đầu"*, *"sốt cao"*, *"đau bụng"*, *"phát ban da"*...) hoặc bấm chọn các thẻ gợi ý bên dưới để tiếp tục!`,
            widget: 'CHOOSE_SYMPTOM',
            isTypingComplete: false,
          };
          setIsAiAnalyzing(false);
          setAiStep('CHOOSE_SYMPTOM');
          setMessages(prev => [...prev, warningMsg]);
          return;
        }

        const advice = triage?.preparationAdvice || '';
        setAiClinicalSummary(summary);
        setAiPreparationAdvice(advice);

        // Phân loại triệu chứng chính xác dựa trên nội dung bệnh nhân nhập hoặc AI Triage
        const lower = text.toLowerCase();
        let targetKey = '';

        // 1. Nhận diện trực tiếp từ từ khóa bệnh nhân gõ
        if (
          lower.includes('mệt') ||
          lower.includes('met') ||
          lower.includes('suy nhược') ||
          lower.includes('suy nhuoc') ||
          lower.includes('uể oải') ||
          lower.includes('ue oai') ||
          lower.includes('kiệt sức') ||
          lower.includes('kiet suc') ||
          lower.includes('đuối') ||
          lower.includes('duoi') ||
          lower.includes('oải')
        ) {
          targetKey = 'FATIGUE';
        } else if (
          lower.includes('đầu') ||
          lower.includes('dau') ||
          lower.includes('chóng mặt') ||
          lower.includes('chong mat') ||
          lower.includes('tiền đình') ||
          lower.includes('tien dinh') ||
          lower.includes('mất ngủ') ||
          lower.includes('mat ngu') ||
          lower.includes('não') ||
          lower.includes('nao')
        ) {
          targetKey = 'HEADACHE';
        } else if (
          lower.includes('bụng') ||
          lower.includes('bung') ||
          lower.includes('dạ dày') ||
          lower.includes('da day') ||
          lower.includes('tiêu hóa') ||
          lower.includes('tieu hoa') ||
          lower.includes('tiêu chảy') ||
          lower.includes('tieu chay') ||
          lower.includes('nôn') ||
          lower.includes('ợ') ||
          lower.includes('ruột')
        ) {
          targetKey = 'ABDOMINAL';
        } else if (
          lower.includes('sốt') ||
          lower.includes('sot') ||
          lower.includes('ho') ||
          lower.includes('cảm') ||
          lower.includes('cam') ||
          lower.includes('họng') ||
          lower.includes('hong') ||
          lower.includes('sổ mũi') ||
          lower.includes('so mui') ||
          lower.includes('nghẹt mũi') ||
          lower.includes('phổi') ||
          lower.includes('phoi')
        ) {
          targetKey = 'RESPIRATORY';
        } else if (
          lower.includes('xương') ||
          lower.includes('xuong') ||
          lower.includes('khớp') ||
          lower.includes('khop') ||
          lower.includes('lưng') ||
          lower.includes('lung') ||
          lower.includes('gối') ||
          lower.includes('goi') ||
          lower.includes('cột sống') ||
          lower.includes('vai gáy') ||
          lower.includes('thoái hóa')
        ) {
          targetKey = 'BONE_JOINT';
        } else if (
          lower.includes('da') ||
          lower.includes('ngứa') ||
          lower.includes('ngua') ||
          lower.includes('dị ứng') ||
          lower.includes('di ung') ||
          lower.includes('mẩn') ||
          lower.includes('mụn') ||
          lower.includes('mề đay')
        ) {
          targetKey = 'SKIN';
        } else if (
          lower.includes('răng') ||
          lower.includes('rang') ||
          lower.includes('nướu') ||
          lower.includes('nuou') ||
          lower.includes('lợi') ||
          lower.includes('hàm') ||
          lower.includes('ham') ||
          lower.includes('nhai')
        ) {
          targetKey = 'DENTAL';
        } else if (
          lower.includes('mắt') ||
          lower.includes('mat') ||
          lower.includes('mờ') ||
          lower.includes('cộm') ||
          lower.includes('chói') ||
          lower.includes('nhãn')
        ) {
          targetKey = 'EYE';
        }

        // 2. Nếu từ khóa chưa phân biệt rõ, map theo mã chuyên khoa từ AI Triage
        if (!targetKey) {
          const code = triage?.specialtyCode || triage?.specialty || '';
          if (code === 'DERMATOLOGY') targetKey = 'SKIN';
          else if (code === 'ODONTO_STOMATOLOGY') targetKey = 'DENTAL';
          else if (code === 'OPHTHALMOLOGY') targetKey = 'EYE';
          else {
            const summaryLower = (summary || '').toLowerCase();
            if (summaryLower.includes('mệt') || summaryLower.includes('suy nhược')) targetKey = 'FATIGUE';
            else if (summaryLower.includes('đầu') || summaryLower.includes('thần kinh') || summaryLower.includes('chóng mặt')) targetKey = 'HEADACHE';
            else if (summaryLower.includes('tiêu hóa') || summaryLower.includes('bụng') || summaryLower.includes('dạ dày')) targetKey = 'ABDOMINAL';
            else if (summaryLower.includes('hô hấp') || summaryLower.includes('sốt') || summaryLower.includes('ho')) targetKey = 'RESPIRATORY';
            else if (summaryLower.includes('xương') || summaryLower.includes('khớp')) targetKey = 'BONE_JOINT';
            else targetKey = '';
          }
        }

        if (!targetKey) {
          const warningMsg: ChatMessage = {
            id: 'msg-' + (Date.now() + 1),
            sender: 'ai',
            time: getFormattedTime(),
            text: `Dạ em chưa nhận diện được vấn đề sức khỏe cụ thể từ mô tả "${text}".\n\nBạn hãy mô tả rõ hơn cảm giác khó chịu hoặc bấm chọn trực tiếp vào một trong các thẻ triệu chứng chuyên khoa bên dưới để em định hướng đúng bác sĩ nhé!`,
            widget: 'CHOOSE_SYMPTOM',
            isTypingComplete: false,
          };
          setIsAiAnalyzing(false);
          setAiStep('CHOOSE_SYMPTOM');
          setMessages(prev => [...prev, warningMsg]);
          return;
        }

        setSelectedCategoryKey(targetKey);
        const cat = SYMPTOM_CATEGORIES[targetKey];
        setSelectedNature(text);
        setSelectedDuration('');
        setSelectedAssociated('');
        setSelectedFollowup('');
        setCustomNatureInput(text);
        setClarifyQuestionIndex(1);
        setTotalClarifyQuestions(3);

        const aiMsg: ChatMessage = {
          id: 'msg-' + (Date.now() + 1),
          sender: 'ai',
          time: getFormattedTime(),
          text: summary 
            ? `Dạ, Trợ lý AI (Gemini 2.5) đã phân tích triệu chứng của bạn:\n\n💬 ${summary}${advice ? `\n\n💡 Lời khuyên chuẩn bị: ${advice}` : ''}\n\nĐể định hướng chuyên khoa và bác sĩ chính xác nhất, bạn vui lòng cho em biết thêm chi tiết qua các câu hỏi nhanh dưới đây nhé:`
            : `Dạ em đã ghi nhận mô tả "${text}". Để hỗ trợ bác sĩ chuẩn bị chu đáo, bạn vui lòng cho em biết thêm chi tiết nhé:`,
          widget: 'CLARIFY_DETAILS',
          clarifyMeta: {
            questionNumber: 1,
            totalQuestions: 3,
            questionTitle: 'Cảm giác khó chịu hoặc biểu hiện cụ thể ra sao?',
            options: cat ? cat.natureOptions : ['Khó chịu nhẹ', 'Đau vừa phải', 'Đau nhiều', 'Khó chịu không rõ'],
            fieldKey: 'nature',
          },
          isTypingComplete: false,
        };

        setAiStep('CLARIFY_DETAILS');
        setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), aiMsg]);
      } catch (err) {
        console.error(err);
        const aiMsg: ChatMessage = {
          id: 'msg-' + (Date.now() + 1),
          sender: 'ai',
          time: getFormattedTime(),
          text: `Dạ em đã ghi nhận triệu chứng: "${text}". Để bác sĩ tiện theo dõi, bạn hãy cho em biết biểu hiện cụ thể bên dưới nhé:`,
          widget: 'CLARIFY_DETAILS',
          clarifyMeta: {
            questionNumber: 1,
            totalQuestions: 3,
            questionTitle: 'Cảm giác khó chịu hoặc biểu hiện cụ thể ra sao?',
            options: ['Khó chịu nhẹ', 'Đau vừa phải', 'Đau nhiều', 'Khó chịu không rõ'],
            fieldKey: 'nature',
          },
          isTypingComplete: false,
        };
        setAiStep('CLARIFY_DETAILS');
        setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), aiMsg]);
      } finally {
        setIsAiAnalyzing(false);
      }
    } else if (aiStep === 'INPUT_LOCATION') {
      handleLocationStepNaturalLanguage(text, userMsg);
    } else if (aiStep === 'SELECT_DOCTOR_SLOT') {
      handleDoctorSlotStepNaturalLanguage(text, userMsg);
    } else if (aiStep === 'CONFIRM_PAYMENT') {
      handlePaymentStepNaturalLanguage(text, userMsg);
    } else {
      // Ở các bước sau, chỉ lưu vào hồ sơ bác sĩ nếu thực sự là ghi chú y tế
      if (isLikelyMedicalNote(text)) {
        setOtherSymptomDetail(prev => prev ? `${prev}. ${text}` : text);
        const aiMsg: ChatMessage = {
          id: 'msg-' + (Date.now() + 1),
          sender: 'ai',
          time: getFormattedTime(),
          text: `Dạ MedSched em đã lưu ghi chú y tế: "${text}" vào hồ sơ gửi cho bác sĩ. Bạn tiếp tục bấm chọn các bước đặt khám bên dưới nhé!`,
          isTypingComplete: false,
        };
        setMessages(prev => [...prev, userMsg, aiMsg]);
      } else {
        const aiMsg: ChatMessage = {
          id: 'msg-' + (Date.now() + 1),
          sender: 'ai',
          time: getFormattedTime(),
          text: `Dạ MedSched chưa nhận diện được yêu cầu từ: "${text}". Bạn vui lòng thao tác trực tiếp trên các mục hiển thị trên màn hình nhé!`,
          isTypingComplete: false,
        };
        setMessages(prev => [...prev, userMsg, aiMsg]);
      }
    }
  };

  // Bước 3 -> Bước 4: Chuyển sang chọn Bác sĩ & Giờ khám
  const handleProceedToDoctorSlot = () => {
    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      time: getFormattedTime(),
      text: `Chọn cơ sở: ${selectedBranch?.shortName || 'Phòng khám'} • Ngày khám: ${formatVietnameseFullDate(bookingDate)} • Buổi: ${selectedShiftId === 'MORNING' ? 'Buổi Sáng' : 'Buổi Chiều'}`,
    };

    // Kiểm tra tính sẵn sàng của Bác sĩ tại cơ sở đã chọn
    if (availableDoctors.length === 0) {
      const pool = dbDoctors.length > 0 ? dbDoctors : DEMO_DOCTORS;
      const docOtherBranch = pool.find(d => 
        d.categoryKeys?.includes(selectedCategoryKey) ||
        (d.specialtyCode && d.specialtyCode === activeCategory.specialtyCode) ||
        (d.specialtyName && activeCategory.specialtyName && d.specialtyName.toLowerCase().includes(activeCategory.specialtyName.toLowerCase()))
      );
      const branchWithDoc = docOtherBranch && docOtherBranch.centerId
        ? branches.find(b => b.id === docOtherBranch.centerId || b.code === docOtherBranch.centerId)
        : branches.find(b => b.id !== selectedBranch?.id);

      const aiMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        time: getFormattedTime(),
        text: `⚠️ **THÔNG BÁO TÌNH TRẠNG BÁC SĨ TẠI CƠ SỞ:**\n\nDạ, hiện tại cơ sở **${selectedBranch?.shortName || 'phòng khám'}** chưa có Bác sĩ chuyên khoa **${activeCategory.specialtyName}** trực tiếp khám trong ngày ${formatVietnameseFullDate(bookingDate)}.\n\n👉 Bác sĩ chuyên khoa hiện đang làm việc và tiếp đón bệnh nhân tại **${branchWithDoc?.shortName || 'Chi Nhánh TĐN'}**.\n\nĐể đảm bảo bạn được bác sĩ chuyên khoa thăm khám đúng hẹn, bạn hãy bấm nút bên dưới để chuyển sang cơ sở có bác sĩ nhé:`,
        actionOptions: branchWithDoc ? [
          {
            label: `🏥 Chuyển sang ${branchWithDoc.shortName}`,
            actionKey: 'CONFIRM_PROPOSAL_TO_DOCTOR',
            variant: 'primary',
            payload: {
              branch: branchWithDoc,
              shiftId: selectedShiftId,
              slotTime: selectedShiftId === 'MORNING' ? '08:00 - 08:30' : '13:30 - 14:00',
              date: bookingDate,
            },
          },
        ] : undefined,
        widget: 'SELECT_DOCTOR_SLOT',
        isTypingComplete: false,
      };

      setAiStep('SELECT_DOCTOR_SLOT');
      setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);
      return;
    }

    const aiMsg: ChatMessage = {
      id: 'msg-' + (Date.now() + 1),
      sender: 'ai',
      time: getFormattedTime(),
      text: `Tuyệt vời! Dưới đây là danh sách bác sĩ chuyên khoa và các khung giờ khám khả dụng tại ${selectedBranch?.shortName || 'phòng khám'}. Bạn hãy bấm chọn bác sĩ và giờ khám phù hợp nhất nhé:`,
      widget: 'SELECT_DOCTOR_SLOT',
      isTypingComplete: false,
    };

    setAiStep('SELECT_DOCTOR_SLOT');
    setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);
  };

  // Khởi tạo bản ghi Appointment thực tế trong CSDL Backend
  const initiateBackendAppointment = async (): Promise<any> => {
    if (createdAppointment?.id || isInitiatingAptRef.current) return createdAppointment;
    isInitiatingAptRef.current = true;

    try {
      // 1. Phân giải Patient Profile ID từ User đang đăng nhập
      let currentPatientProfileId = '';
      try {
        const profile = await api.getProfile();
        if (profile?.patientProfile?.profileId) {
          currentPatientProfileId = profile.patientProfile.profileId;
        }
      } catch (e) {
        // Backend tự động phân giải từ JWT Session principal
      }

      // 2. Tìm Bác sĩ & Chi nhánh hợp lệ (Ưu tiên ID thực từ DB)
      let docId = selectedDoctor?.id;
      if (!docId || docId.startsWith('doc-')) {
        const realDoc = dbDoctors.find(d => !d.id.startsWith('doc-')) || dbDoctors[0];
        if (realDoc) docId = realDoc.id;
      }

      let centerId = selectedBranch?.id;
      if (!centerId && branches.length > 0) {
        centerId = branches[0].id;
      }

      // 3. Phân giải danh sách Slot khả dụng từ CSDL để tránh triệt để lỗi 409 xung đột giữ chỗ
      let availableSlotList: any[] = [];
      if (docId) {
        try {
          const fresh = await api.getDoctorAvailableSlots(docId, bookingDate);
          if (Array.isArray(fresh)) {
            availableSlotList = fresh.filter((s: any) => !s.disabled && s.status !== 'BOOKED' && s.status !== 'full');
          }
        } catch (slotErr) {
          console.warn('Lấy slot bác sĩ từ DB:', slotErr);
        }
      }

      // Thu thập danh sách các slot ứng viên (ưu tiên slot khớp giờ người dùng chọn, sau đó là các slot khả dụng khác)
      let candidateSlotIds: string[] = [];
      const startHour = (selectedSlotTime || '08:00').split(':')[0].trim();
      const bestMatch = availableSlotList.find((s: any) => s.time?.startsWith(startHour));
      if (bestMatch?.id) candidateSlotIds.push(bestMatch.id);

      availableSlotList.forEach((s: any) => {
        if (s.id && !candidateSlotIds.includes(s.id)) candidateSlotIds.push(s.id);
      });

      // Thử bổ sung từ shiftSlots nếu chưa có ứng viên nào
      shiftSlots.forEach((s: any) => {
        if (s.id && !s.id.startsWith('base-') && !s.disabled && !candidateSlotIds.includes(s.id)) {
          candidateSlotIds.push(s.id);
        }
      });

      if (candidateSlotIds.length === 0) {
        candidateSlotIds.push('sl000001-0000-0000-0000-000000000001');
      }

      // 4. Định dạng triệu chứng
      const symptomsList = [
        customNatureInput || selectedNature || activeCategory.label,
        selectedDuration ? `Thời gian: ${selectedDuration}` : null,
        selectedAssociated ? `Kèm theo: ${selectedAssociated}` : null,
        patientName ? `Bệnh nhân: ${patientName}` : null,
        patientPhone ? `SĐT: ${patientPhone}` : null,
        aiClinicalSummary ? `[AI Triage]: ${aiClinicalSummary}` : null,
      ].filter(Boolean);
      const formattedSymptoms = symptomsList.join(' • ') || 'Đặt khám tư vấn qua Trợ Lý Y Tế AI MedSched';

      // 5. Thử book với các slot khả dụng (tự động thử slot tiếp theo nếu gặp 409 conflict)
      let res: any = null;
      for (const sId of candidateSlotIds) {
        try {
          res = await api.bookAppointment({
            medicalCenterId: centerId,
            patientProfileId: currentPatientProfileId,
            doctorId: docId || '',
            slotId: sId,
            symptoms: formattedSymptoms,
            medicalHistory: '',
          });
          if (res && res.id) {
            break;
          }
        } catch (bookErr: any) {
          console.warn(`Slot ${sId} không khả dụng (409 conflict), đang thử slot tiếp theo...`, bookErr);
        }
      }

      if (res && res.id) {
        setCreatedAppointment(res);
        if (res.bookingCode) {
          setTransferBookingCode(res.bookingCode);
          // Khởi tạo payment cọc trên backend cho đúng mã này
          api.createRealPayment({
            appointmentId: res.id,
            bookingCode: res.bookingCode,
            amount: 2000,
            paymentType: 'DEPOSIT',
            method: 'BANK_TRANSFER',
          }).then((payRes: any) => {
            if (payRes) {
              setPayOsData({
                accountNumber: payRes.accountNumber || undefined,
                accountName: payRes.accountName || undefined,
                bin: payRes.bin || undefined,
                checkoutUrl: payRes.checkoutUrl || undefined,
                qrCode: payRes.qrCode || undefined,
              });
            }
          }).catch(console.warn);
        }
        return res;
      }
    } catch (err: any) {
      console.warn('Không thể khởi tạo appointment PENDING:', err);
      isInitiatingAptRef.current = false;
    }
    return null;
  };

  // Bước 4 -> Bước 5: Chuyển sang Xác nhận & Giữ chỗ (Cọc 2k / Ưu đãi)
  const handleProceedToPayment = () => {
    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      time: getFormattedTime(),
      text: `Chọn bác sĩ: ${selectedDoctor?.name || 'Bác sĩ chuyên khoa'} (${selectedDoctor?.room || 'Phòng khám'}) • Khung giờ: ${selectedSlotTime}`,
    };

    const aiMsg: ChatMessage = {
      id: 'msg-' + (Date.now() + 1),
      sender: 'ai',
      time: getFormattedTime(),
      text: `Hồ sơ đặt khám của bạn đã sẵn sàng! 📋 Để tránh tình trạng đặt ảo và giữ chỗ đúng giờ hẹn, phòng khám cần bạn xác nhận thông tin và đặt cọc 2.000 VNĐ (sẽ tự động hoàn trả khi check-in, hoặc miễn phí với mã ưu đãi):`,
      widget: 'CONFIRM_PAYMENT',
      isTypingComplete: false,
    };

    setAiStep('CONFIRM_PAYMENT');
    setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);

    // Khởi tạo ngay bản ghi Appointment thực tế trong CSDL Backend
    initiateBackendAppointment();
  };

  // Áp dụng mã ưu đãi
  const handleApplyPromoCode = () => {
    setPromoErrorMsg('');
    setPromoSuccessMsg('');
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      setPromoErrorMsg('Vui lòng nhập mã ưu đãi.');
      return;
    }
    const valRes = validatePromotion(code, 2000);
    if (valRes.valid || VALID_PROMO_CODES.includes(code)) {
      const isFree = valRes.valid ? valRes.isFree : (code !== 'DEMO2K' && code !== 'UDAI2K');
      if (isFree) {
        setIsPaymentVerified(true);
        isPaymentVerifiedRef.current = true;
        setPromoSuccessMsg(valRes.valid ? `Áp dụng thành công mã ${code}! ${valRes.message}` : `Áp dụng thành công mã ${code}! Giảm 100% tiền cọc (0 VNĐ).`);
        setTimeout(() => {
          handleConfirmFinalBooking(true);
        }, 800);
      } else {
        setPaymentTab('vietqr');
        setPromoSuccessMsg(`Áp dụng thành công mã ${code}! Đồng giá cọc 2.000 đ để quét VietQR thật. Vui lòng chuyển 2.000 đ bên tab Chuyển khoản.`);
      }
    } else {
      setPromoErrorMsg(valRes.message || 'Mã ưu đãi không hợp lệ hoặc đã hết hạn.');
    }
  };

  // Kiểm tra thanh toán thủ công khi bấm "Tôi Đã Chuyển Khoản — Kiểm Tra Ngay"
  const handleCheckPaymentManual = async () => {
    const targetCode = transferBookingCode || createdAppointment?.bookingCode;
    if (!targetCode) return;
    setIsCheckingManual(true);
    setCheckManualMessage('');
    try {
      // Kiểm tra trạng thái thanh toán THỰC TẾ từ PayOS / Cổng ngân hàng
      const res = await api.checkRealPaymentStatus({
        bookingCode: targetCode,
        appointmentId: createdAppointment?.id,
      });

      if (res?.status === 'SUCCEEDED' || res?.success) {
        setIsPaymentVerified(true);
        isPaymentVerifiedRef.current = true;
        setCheckManualMessage('✓ Đã xác thực thành công giao dịch chuyển khoản 2.000 VNĐ từ ngân hàng! Đang cấp vé hẹn...');
        await handleConfirmFinalBooking(true);
      } else {
        setCheckManualMessage(
          `Hệ thống chưa nhận được khoản chuyển 2.000 VNĐ với nội dung "MEDPAY ${targetCode}". Nếu bạn vừa chuyển trên App ngân hàng, vui lòng đợi 5-10 giây để cổng ngân hàng cập nhật rồi bấm kiểm tra lại (hoặc sang tab "Nhập Mã Ưu Đãi" để đặt chỗ miễn phí).`
        );
      }
    } catch (err: any) {
      setCheckManualMessage(err?.message || 'Không thể kết nối cổng kiểm tra giao dịch ngân hàng. Vui lòng thử lại sau giây lát.');
    } finally {
      setIsCheckingManual(false);
    }
  };

  // Hoàn tất đặt chỗ (Bước 6) — GHI NHẬN CSDL VÀ CHUYỂN CONFIRMED
  const handleConfirmFinalBooking = async (bypassVerification: boolean | unknown = false) => {
    if (isBookingSubmitting) return;

    const isBypassed = bypassVerification === true;
    // Bắt buộc phải có xác nhận thanh toán thật qua VietQR hoặc mã ưu đãi 0đ (kiểm tra cả ref và bypass)
    if (!isBypassed && !isPaymentVerified && !isPaymentVerifiedRef.current && !promoCode) {
      setCheckManualMessage('Vui lòng quét mã VietQR chuyển khoản 2.000 VNĐ hoặc nhập mã ưu đãi trước khi cấp vé hẹn.');
      return;
    }

    setIsBookingSubmitting(true);
    setCheckManualMessage('');

    try {
      // 1. Đảm bảo đã có bản ghi Appointment trong CSDL
      let apt = createdAppointment;
      if (!apt || !apt.id) {
        apt = await initiateBackendAppointment();
      }

      const finalCode = apt?.bookingCode || transferBookingCode || ('MED' + Math.floor(100000 + Math.random() * 900000));
      setBookingSuccessCode(finalCode);

      // 2. Cập nhật trạng thái thanh toán sang CONFIRMED trong CSDL Backend
      try {
        await api.confirmRealPayment({
          appointmentId: apt?.id,
          bookingCode: finalCode,
          paymentType: promoCode ? 'PROMO_FREE' : 'DEPOSIT',
          amount: promoCode ? 0 : 2000,
          promoCode: promoCode || undefined,
        });
      } catch (payErr) {
        console.warn('confirmRealPayment warning:', payErr);
      }

      // 3. Phát sự kiện toàn cục để trang /my-appointments tự động tải lại phiếu khám ngay lập tức
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('appointment_created', { detail: { bookingCode: finalCode } }));
      }

      const userMsg: ChatMessage = {
        id: 'msg-' + Date.now(),
        sender: 'user',
        time: getFormattedTime(),
        text: `Đã hoàn tất xác nhận đặt hẹn và giữ chỗ`,
      };

      const aiMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        time: getFormattedTime(),
        text: `🎉 Chúc mừng bạn! Phiếu khám đã được ghi nhận thành công trên hệ thống MedSched với mã đặt hẹn **${finalCode}**.\n\nThông tin đã được đồng bộ vào hệ thống phòng khám. Bạn có thể xem ngay phiếu khám trong mục **Phiếu Khám Của Tôi**!`,
        widget: 'COMPLETED',
        isTypingComplete: false,
      };

      setAiStep('COMPLETED');
      setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);
    } catch (err: any) {
      console.error('Lỗi xác nhận đặt hẹn:', err);
      setCheckManualMessage(err?.message || 'Có lỗi khi xác nhận phiếu khám. Vui lòng thử lại.');
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  // Hủy ca khám hiện tại & giải phóng khung giờ khám
  const handleCancelCurrentBooking = async () => {
    const targetApt = createdAppointment;
    const targetCode = bookingSuccessCode || transferBookingCode || targetApt?.bookingCode;
    const targetId = targetApt?.id;

    if (!targetId && !targetCode) {
      handleResetConversation();
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn hủy lịch hẹn mã "${targetCode}" không? Khung giờ khám sẽ được giải phóng lại cho người bệnh khác.`)) {
      return;
    }

    setIsCancelingBooking(true);
    try {
      if (targetId) {
        await api.cancelAppointment(targetId, 'Bệnh nhân hủy qua cổng Trợ Lý AI');
      } else if (targetCode) {
        try {
          const apt = await api.getAppointmentByCode(targetCode);
          if (apt?.id) {
            await api.cancelAppointment(apt.id, 'Bệnh nhân hủy qua cổng Trợ Lý AI');
          }
        } catch (e) {
          console.warn('Lỗi tìm ca khám để hủy:', e);
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('appointment_created'));
      }

      // Thông báo vào khung chat
      setMessages(prev => [
        ...prev,
        {
          id: `cancel-${Date.now()}`,
          sender: 'ai',
          time: getFormattedTime(),
          text: `🗑️ **Đã hủy lịch hẹn khám ${targetCode} thành công!**\n\nKhung giờ khám đã được hoàn trả. Bạn có thể chọn lại bác sĩ và khung giờ khác bên dưới hoặc bấm **[Làm mới]** trên thanh tiêu đề để bắt đầu lượt khám mới nhé!`,
          widget: 'SELECT_DOCTOR_SLOT',
          isTypingComplete: true,
        }
      ]);
      isInitiatingAptRef.current = false;
      setAiStep('SELECT_DOCTOR_SLOT');
      setIsPaymentVerified(false);
      isPaymentVerifiedRef.current = false;
      setTransferBookingCode('');
      setPayOsData(null);
      setCreatedAppointment(null);
      setBookingSuccessCode('');
      alert(`Đã hủy thành công ca khám mã ${targetCode}!`);
    } catch (err: any) {
      alert(err?.message || 'Không thể hủy ca khám lúc này. Vui lòng thử lại trong mục Phiếu Khám.');
    } finally {
      setIsCancelingBooking(false);
    }
  };

  // Sao chép mã
  const handleCopyCode = (code: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Sao chép thông tin chuyển khoản cọc (STK, Nội dung)
  const [copiedPaymentField, setCopiedPaymentField] = useState<string | null>(null);
  const handleCopyPaymentInfo = (text: string, field: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedPaymentField(field);
      setTimeout(() => setCopiedPaymentField(null), 2000);
    }
  };

  // ---------------------------------------------------------------------------
  // GIAO DIỆN CHÍNH
  // ---------------------------------------------------------------------------
  return (
    <div
      className={`relative w-full mx-auto transition-all duration-300 ${
        viewMode === 'ai'
          ? isModal
            ? 'w-full h-[calc(100dvh-1rem)] sm:h-[calc(100dvh-1.5rem)] lg:h-[calc(100dvh-2rem)] max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-1.5rem)] lg:max-h-[calc(100dvh-2rem)] max-w-full lg:max-w-6xl xl:max-w-7xl flex flex-col min-h-0'
            : 'w-full h-full max-h-full max-w-full lg:max-w-6xl xl:max-w-7xl flex flex-col min-h-0'
          : 'max-w-2xl my-auto'
      }`}
      onClick={(e) => isModal && e.stopPropagation()}
    >
      {/* Nút đóng modal khi ở chế độ Modal và viewMode === 'select' */}
      {isModal && onClose && viewMode === 'select' && (
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
        /* VIEW 2: MÀN HÌNH KHUNG CHAT ZALO THÔNG MINH FULL MÀN HÌNH                 */
        /* ========================================================================= */
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col lg:flex-row h-full w-full min-h-0 animate-fadeIn">
          
          {/* CỘT CHÍNH: KHUNG CHAT ZALO (CHIA 70% TRÊN LAPTOP / 100% TRÊN MOBILE) */}
          <div className="flex-1 min-h-0 flex flex-col h-full bg-slate-50/60 relative overflow-hidden">
            
            {/* Header Chat Zalo - Cố định trên đỉnh, đảm bảo luôn hiển thị đầy đủ */}
            <div className="px-3 sm:px-5 py-2 sm:py-3 border-b border-purple-100 flex items-center justify-between bg-gradient-to-r from-purple-50 via-white to-indigo-50 shrink-0 shadow-xs z-30 sticky top-0">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setViewMode('select')}
                  className="p-1.5 rounded-lg hover:bg-purple-100 text-purple-700 transition cursor-pointer"
                  title="Quay lại chọn phương thức"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Sparkles size={18} />
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute -bottom-0.5 -right-0.5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                    Trợ Lý Y Tế AI MedSched
                    <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full font-bold">
                      Gemini 2.5
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Trực tuyến 24/7 • Luồng hội thoại liền mạch</span>
                  </p>
                </div>
              </div>

              {/* Các nút công cụ bên phải header */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleResetConversation}
                  className="p-1.5 px-2.5 text-[11px] font-bold text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                  title="Làm mới cuộc trò chuyện"
                >
                  <RefreshCw size={12} />
                  <span className="hidden sm:inline">Làm mới</span>
                </button>

                {isModal && onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    title="Đóng khung chat"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Vùng Tin Nhắn Chat Cuộn Liền Mạch */}
            <div
              ref={chatScrollContainerRef}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-6 py-3 sm:py-4 space-y-3.5 sm:space-y-4 touch-pan-y"
            >
              
              {/* Danh sách các bong bóng tin nhắn */}
              {messages.map((msg) => {
                const isAi = msg.sender === 'ai';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start sm:gap-2.5 gap-0 ${isAi ? 'justify-start w-full' : 'justify-end'} animate-fadeIn`}
                  >
                    {/* Avatar AI - Ẩn trên mobile để tiết kiệm diện tích tối đa, chỉ hiện trên tablet/desktop */}
                    {isAi && (
                      <div className="hidden sm:flex w-8 h-8 rounded-xl bg-purple-600 text-white items-center justify-center shrink-0 shadow-xs mt-0.5">
                        <Bot size={16} />
                      </div>
                    )}

                    {/* Khung nội dung tin nhắn */}
                    <div className={`space-y-2.5 ${isAi ? 'w-full sm:max-w-[85%] text-left' : 'max-w-[90%] sm:max-w-[80%] text-right'}`}>
                      
                      {/* Bong bóng chữ */}
                      <div
                        className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-xs inline-block ${
                          isAi
                            ? 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-xs'
                        }`}
                      >
                        {isAi && msg.text ? (
                          <StreamingAiText
                            fullText={msg.text}
                            isFinished={msg.isTypingComplete !== false}
                            onFinish={() => handleMessageTypingComplete(msg.id)}
                            onWordTyped={() => scrollToBottom('auto')}
                          />
                        ) : (
                          <p className="whitespace-pre-line">{renderFormattedText(msg.text || '')}</p>
                        )}
                      </div>

                      {/* Hiển thị các nút tương tác nhanh từ Y tá / Lễ tân AI */}
                      {isAi && msg.actionOptions && msg.actionOptions.length > 0 && (msg.isTypingComplete !== false || msg.isCompleteWidget) && (
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-0.5 animate-fadeIn">
                          {msg.actionOptions.map((opt, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleExecuteActionOption(opt)}
                              className={`px-3 py-2 text-[11px] sm:text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 ${
                                opt.variant === 'secondary'
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                                  : opt.variant === 'outline'
                                  ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'
                                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xs'
                              }`}
                            >
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      <span className="block text-[9px] text-slate-400 px-1 font-mono">
                        {msg.time}
                      </span>

                      {/* =================================================================== */}
                      {/* CÁC WIDGET TƯƠNG TÁC (CHỈ HIỆN KHI AI GÕ XONG HOẶC ĐÃ HOÀN TẤT)     */}
                      {/* =================================================================== */}
                      {msg.widget && (msg.isTypingComplete !== false || !isAi || msg.isCompleteWidget) && (
                        <div className="animate-fadeIn">
                          {/* WIDGET BƯỚC 1: LỰA CHỌN TRIỆU CHỨNG BAN ĐẦU */}
                          {msg.widget === 'CHOOSE_SYMPTOM' && (
                        <div className="p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-xs space-y-2 mt-1">
                          <span className="text-[11px] sm:text-xs font-bold text-slate-700 block">
                            👉 Bấm chọn nhanh vấn đề sức khỏe của bạn:
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                            {Object.values(SYMPTOM_CATEGORIES).map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => handleSelectSymptomPill(cat.id)}
                                className={`p-2 sm:p-2.5 text-left border rounded-xl sm:rounded-2xl transition duration-200 cursor-pointer flex flex-col justify-between group active:scale-98 ${
                                  selectedCategoryKey === cat.id
                                    ? 'bg-purple-100/90 border-purple-600 shadow-2xs'
                                    : 'bg-slate-50 hover:bg-purple-50 text-slate-800 hover:text-purple-950 border-slate-200 hover:border-purple-300'
                                }`}
                              >
                                <span className="text-[11px] sm:text-xs font-bold block mb-0.5 group-hover:text-purple-700 leading-snug">
                                  {cat.label}
                                </span>
                                <span className="text-[9.5px] sm:text-[10px] text-slate-500 line-clamp-1">
                                  {cat.specialtyName}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* =================================================================== */}
                      {/* WIDGET BƯỚC 2: CÁC CÂU HỎI LÂM SÀNG TỪNG CÂU (1-BY-1 VỚI BỘ ĐẾM)    */}
                      {/* =================================================================== */}
                      {msg.widget === 'CLARIFY_DETAILS' && (
                        <div className="space-y-2 mt-1.5 animate-fadeIn">
                          {/* Đánh giá AI Triage nếu có ở câu hỏi đầu tiên */}
                          {msg.clarifyMeta?.questionNumber === 1 && aiClinicalSummary && (
                            <div className="bg-gradient-to-r from-purple-50 via-indigo-50/70 to-purple-50 border border-purple-200 rounded-xl p-2.5 sm:p-3 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] sm:text-xs font-bold text-purple-900 flex items-center gap-1">
                                  <Sparkles size={13} className="text-purple-600" />
                                  Đánh giá sơ bộ Gemini 2.5:
                                </span>
                                <span className="text-[9px] bg-purple-200 text-purple-800 font-extrabold px-1.5 py-0.5 rounded">
                                  AI Verified
                                </span>
                              </div>
                              <p className="text-[11px] sm:text-xs text-slate-700 font-medium leading-relaxed">
                                {aiClinicalSummary}
                              </p>
                              {aiPreparationAdvice && (
                                <p className="text-[10px] sm:text-[10.5px] text-purple-800 italic pt-1 border-t border-purple-200/60">
                                  💡 <strong>Chuẩn bị:</strong> {aiPreparationAdvice}
                                </p>
                              )}
                            </div>
                          )}

                          {/* THẺ CÂU HỎI ĐANG HOẠT ĐỘNG (CHỈ HIỆN 1 CÂU KÈM BỘ ĐẾM) */}
                          {msg.clarifyMeta && !msg.isCompleteWidget && (
                            <div className="p-3 sm:p-4 bg-white border-2 border-purple-300 rounded-2xl shadow-sm space-y-2.5">
                              {/* Header câu hỏi với Bộ Đếm (Counter Badge) */}
                              <div className="flex items-center justify-between pb-2 border-b border-purple-100">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] sm:text-xs font-black tracking-wide shadow-2xs">
                                    Câu {msg.clarifyMeta.questionNumber}/{msg.clarifyMeta.totalQuestions}
                                  </span>
                                  <span className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight">
                                    {msg.clarifyMeta.questionTitle}
                                  </span>
                                </div>
                                <span className="text-[10px] text-purple-600 font-bold hidden sm:inline-block">
                                  {msg.clarifyMeta.questionNumber === msg.clarifyMeta.totalQuestions ? 'Câu hỏi cuối' : 'Khảo sát lâm sàng'}
                                </span>
                              </div>

                              <p className="text-[10.5px] sm:text-[11px] text-slate-500 italic">
                                👉 Bấm chọn 1 trong 4 lựa chọn (sẽ tự điền vào ô chat bên dưới), sau đó bấm nút <strong>Gửi</strong> hoặc tự nhập miêu tả chi tiết:
                              </p>

                              {/* 4 Lựa chọn trắc nghiệm */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                                {msg.clarifyMeta.options.map((opt, idx) => {
                                  const isSelected = (
                                    (msg.clarifyMeta?.fieldKey === 'nature' && selectedNature === opt) ||
                                    (msg.clarifyMeta?.fieldKey === 'duration' && selectedDuration === opt) ||
                                    (msg.clarifyMeta?.fieldKey === 'associated' && selectedAssociated === opt) ||
                                    (msg.clarifyMeta?.fieldKey === 'followup' && selectedFollowup === opt) ||
                                    (inputMessage === opt)
                                  );

                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => handleSelectClarifyOption(opt, msg.clarifyMeta?.fieldKey)}
                                      className={`p-2.5 sm:p-3 text-xs text-left rounded-xl border transition-all cursor-pointer flex items-center justify-between group active:scale-98 ${
                                        isSelected
                                          ? 'bg-purple-100/90 border-purple-600 text-purple-950 font-bold shadow-2xs ring-1 ring-purple-400'
                                          : 'bg-slate-50 hover:bg-purple-50/70 border-slate-200 text-slate-700 hover:text-purple-900 hover:border-purple-300'
                                      }`}
                                    >
                                      <span className="leading-snug pr-1.5">{opt}</span>
                                      <div className="shrink-0">
                                        {isSelected ? (
                                          <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
                                            <Check size={12} />
                                          </span>
                                        ) : (
                                          <span className="w-5 h-5 rounded-full border border-slate-300 group-hover:border-purple-400 flex items-center justify-center text-[10px] text-slate-400 group-hover:text-purple-600 font-bold">
                                            {idx + 1}
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Thanh công cụ dưới câu hỏi (BẮT BUỘC KHẢO SÁT LÂM SÀNG, KHÔNG CHO BỎ QUA ĐỂ ĐẢM BẢO AN TOÀN Y TẾ) */}
                              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                                <div className="flex items-center gap-1.5 text-[10.5px] sm:text-[11px] text-slate-500 font-medium">
                                  <ShieldCheck size={13} className="text-purple-600 shrink-0" />
                                  <span>Khảo sát bắt buộc ({msg.clarifyMeta.questionNumber}/{msg.clarifyMeta.totalQuestions})</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleAdvanceClarify()}
                                  className="py-1.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                                >
                                  <span>{msg.clarifyMeta.questionNumber === msg.clarifyMeta.totalQuestions ? 'Xác nhận & Kiểm tra bác sĩ ➔' : 'Tiếp tục câu sau'}</span>
                                  <ArrowRight size={13} />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* KHI CÂU HỎI ĐÃ HOÀN TẤT: HIỂN THỊ TINH GỌN */}
                          {msg.clarifyMeta && msg.isCompleteWidget && (
                            <div className="p-2 sm:p-2.5 bg-slate-50/80 border border-slate-200/80 rounded-xl text-[11px] text-slate-500 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center font-bold shrink-0">✓</span>
                                <span className="font-semibold text-slate-700 truncate">{msg.clarifyMeta.questionTitle}</span>
                              </div>
                              <span className="text-[10px] text-emerald-700 font-bold shrink-0 ml-2">Đã hoàn thành</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* =================================================================== */}
                      {/* WIDGET BƯỚC 3: CÁC LỰA CHỌN PHÒNG KHÁM, DỊCH VỤ & NGÀY KHÁM          */}
                      {/* =================================================================== */}
                      {msg.widget === 'INPUT_LOCATION' && (
                        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3.5 mt-1.5">
                          {/* Chuyên khoa định hướng */}
                          <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-purple-700 font-bold block uppercase">
                                Chuyên khoa định hướng:
                              </span>
                              <span className="text-xs sm:text-sm font-extrabold text-purple-950">
                                {activeCategory.specialtyName}
                              </span>
                            </div>
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                              Khớp 100%
                            </span>
                          </div>

                          {/* Chọn Chi Nhánh */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800 block">
                                1. Chọn cơ sở phòng khám MedSched:
                              </span>
                              <span className="text-[10px] text-purple-600 font-bold flex items-center gap-1">
                                <MapPin size={11} />
                                Bấm cơ sở để xem Google Maps
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {isBranchesLoading ? (
                                <>
                                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 animate-pulse h-20 flex flex-col justify-between">
                                    <div className="h-3 bg-slate-200 rounded w-2/3" />
                                    <div className="h-2 bg-slate-200 rounded w-full" />
                                  </div>
                                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 animate-pulse h-20 flex flex-col justify-between">
                                    <div className="h-3 bg-slate-200 rounded w-2/3" />
                                    <div className="h-2 bg-slate-200 rounded w-full" />
                                  </div>
                                </>
                              ) : branches.length === 0 ? (
                                <div className="col-span-2 p-3 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                                  Đang đồng bộ cơ sở phòng khám từ máy chủ...
                                </div>
                              ) : (
                                branches.map((branch) => {
                                  const isSelected = selectedBranch?.id === branch.id;
                                  return (
                                    <div
                                      key={branch.id}
                                      onClick={() => {
                                        setSelectedBranch(branch);
                                        setSelectedBranchForModal(branch);
                                      }}
                                      className={`p-3 text-left rounded-xl border-2 transition cursor-pointer flex flex-col justify-between group active:scale-98 ${
                                        isSelected
                                          ? 'bg-purple-50/90 border-purple-600 shadow-2xs'
                                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                                      }`}
                                    >
                                      <div>
                                        <div className="flex items-center justify-between gap-1 mb-1">
                                          <span className="text-xs font-extrabold text-slate-900 line-clamp-1 group-hover:text-purple-700 transition">
                                            {branch.shortName}
                                          </span>
                                          {isSelected && <CheckCircle2 size={15} className="text-purple-600 shrink-0" />}
                                        </div>
                                        <p className="text-[10px] text-slate-500 line-clamp-2">
                                          📍 {branch.address}
                                        </p>
                                      </div>

                                      {/* Nút xem bản đồ và chi tiết */}
                                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                                        <span className="text-slate-400 group-hover:text-purple-600 font-medium flex items-center gap-1">
                                          <Phone size={10} />
                                          {branch.phone.split(' ')[0]}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold hover:bg-purple-200 transition">
                                          <span>Bản đồ &amp; So sánh</span>
                                          <ExternalLink size={10} />
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* Chọn Ngày khám */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800">
                                2. Chọn ngày khám (Thứ 2 - Thứ 6):
                              </span>
                              <span className="text-[10px] text-purple-700 font-bold">
                                {formatVietnameseFullDate(bookingDate)}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                              {upcomingWeekdays.map((item) => {
                                const isSelected = bookingDate === item.iso;
                                return (
                                  <button
                                    key={item.iso}
                                    type="button"
                                    onClick={() => setBookingDate(item.iso)}
                                    className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                                      isSelected
                                        ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-2xs'
                                        : 'bg-slate-50 hover:bg-purple-50 border-slate-200 text-slate-700'
                                    }`}
                                  >
                                    <span className="block text-[11px] font-bold leading-tight">{item.label}</span>
                                    <span className={`block text-[9px] mt-0.5 ${isSelected ? 'text-purple-100' : 'text-slate-400'}`}>
                                      {item.subLabel}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Chọn Buổi khám */}
                          <div className="space-y-1.5 pt-1">
                            <span className="text-xs font-bold text-slate-800 block">
                              3. Chọn buổi đến phòng khám:
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              {TIME_SHIFTS.map((shift) => {
                                const isSelected = selectedShiftId === shift.id;
                                return (
                                  <button
                                    key={shift.id}
                                    type="button"
                                    onClick={() => setSelectedShiftId(shift.id)}
                                    className={`p-2.5 text-center rounded-xl border-2 transition cursor-pointer ${
                                      isSelected
                                        ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-2xs'
                                        : 'bg-slate-50 hover:bg-purple-50 border-slate-200 text-slate-700'
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
                            className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                          >
                            <span>Tiếp Tục: Chọn Bác Sĩ Tại {selectedBranch?.shortName || 'Phòng Khám'}</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      )}

                      {/* =================================================================== */}
                      {/* WIDGET BƯỚC 4: LỰA CHỌN BÁC SĨ & KHUNG GIỜ KHẢ DỤNG                 */}
                      {/* =================================================================== */}
                      {msg.widget === 'SELECT_DOCTOR_SLOT' && (
                        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3.5 mt-1.5">
                          {/* Banner hiển thị chuyên khoa ràng buộc theo triệu chứng */}
                          <div className="p-2.5 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-purple-700 font-bold block uppercase tracking-wider">
                                Chuyên khoa điều trị triệu chứng:
                              </span>
                              <span className="text-xs sm:text-sm font-extrabold text-purple-950 flex items-center gap-1.5 mt-0.5">
                                <span>{activeCategory.label.split(' ')[0]}</span>
                                <span>{activeCategory.specialtyName}</span>
                              </span>
                            </div>
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 border border-emerald-200">
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              Khớp đúng bệnh
                            </span>
                          </div>

                          {/* Bộ lọc bác sĩ */}
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
                                  className={`px-2.5 py-1 text-[11px] rounded-full border transition cursor-pointer ${
                                    isActive
                                      ? 'bg-purple-600 text-white border-purple-600 font-bold'
                                      : 'bg-slate-100 hover:bg-purple-50 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {f.label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Danh sách Bác sĩ */}
                          <div className="space-y-2">
                            {isDoctorsLoading && availableDoctors.length === 0 ? (
                              <div className="py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center flex flex-col items-center justify-center gap-2">
                                <Loader2 size={20} className="animate-spin text-purple-600" />
                                <span className="text-xs font-semibold text-slate-600">
                                  Đang đồng bộ danh sách bác sĩ chuyên khoa từ hệ thống...
                                </span>
                              </div>
                            ) : availableDoctors.length === 0 ? (
                              <div className="py-5 px-4 bg-amber-50 rounded-2xl border border-amber-200 text-center space-y-2.5">
                                <p className="text-xs font-bold text-amber-900 flex items-center justify-center gap-1.5">
                                  <AlertCircle size={15} className="text-amber-600 shrink-0" />
                                  <span>Cơ sở &quot;{selectedBranch?.shortName}&quot; hiện chưa có Bác sĩ chuyên khoa {activeCategory.specialtyName} làm việc!</span>
                                </p>
                                <p className="text-[11px] text-amber-800 leading-relaxed">
                                  Bác sĩ chuyên môn hiện đang làm việc và tiếp đón bệnh nhân tại <strong>Chi Nhánh TĐN</strong>. Bạn vui lòng chuyển cơ sở để tiếp tục đặt lịch:
                                </p>
                                <div className="flex flex-wrap justify-center gap-2 pt-1">
                                  {branches.filter(b => b.id !== selectedBranch?.id).map(b => (
                                    <button
                                      key={b.id}
                                      type="button"
                                      onClick={() => setSelectedBranch(b)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                                    >
                                      <Building2 size={12} />
                                      <span>Chuyển sang {b.shortName} ➔</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              availableDoctors.map((doc) => {
                                const isSelected = selectedDoctor?.id === doc.id;
                                return (
                                  <div
                                    key={doc.id}
                                    onClick={() => setSelectedDoctor(doc)}
                                    className={`p-2.5 rounded-xl border-2 transition cursor-pointer flex items-center justify-between ${
                                      isSelected
                                        ? 'bg-purple-50/90 border-purple-600 shadow-2xs ring-1 ring-purple-300'
                                        : 'bg-white hover:bg-slate-50 border-slate-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-sm ${
                                        isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700'
                                      }`}>
                                        {doc.gender === 'female' ? '👩‍⚕️' : '👨‍⚕️'}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                                            {doc.name}
                                            {doc.isExpert && (
                                              <span className="text-[8.5px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                                <Award size={9} /> Chuyên Gia
                                              </span>
                                            )}
                                          </h4>
                                          {doctorSchedulesMap[doc.id] ? (
                                            (doctorSchedulesMap[doc.id].availableCount > 0) ? (
                                              <span className="text-[8.5px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
                                                ⚡ Có ca trực ({doctorSchedulesMap[doc.id].availableCount} slot)
                                              </span>
                                            ) : (
                                              <span className="text-[8.5px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-full">
                                                🕒 Chưa mở ca ngày này
                                              </span>
                                            )
                                          ) : null}
                                        </div>
                                        <p className="text-[10px] text-slate-500 line-clamp-1">{doc.title}</p>
                                        <p className="text-[9.5px] text-purple-700 font-bold">
                                          📍 {doc.room} • Phí khám: {doc.fee.toLocaleString('vi-VN')} đ
                                        </p>
                                      </div>
                                    </div>
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                                      isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300'
                                    }`}>
                                      {isSelected && <Check size={10} />}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Khung giờ khám */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800">
                                Chọn Giờ khám khả dụng:
                              </span>
                              <span className="text-[10px] text-purple-700 font-bold">
                                📅 {formatVietnameseFullDate(bookingDate)}
                              </span>
                            </div>
                            {isSlotsLoading ? (
                              <div className="py-4 bg-purple-50/50 rounded-xl border border-dashed border-purple-200 text-center flex items-center justify-center gap-2">
                                <Loader2 size={16} className="animate-spin text-purple-600" />
                                <span className="text-[11px] font-semibold text-purple-700">
                                  Đang đồng bộ ca khám khả dụng từ CSDL...
                                </span>
                              </div>
                            ) : shiftSlots.length === 0 ? (
                              <div className="py-4 px-3 bg-amber-50/70 rounded-xl border border-dashed border-amber-300 text-center space-y-2">
                                <div className="text-xs font-bold text-amber-950 flex items-center justify-center gap-1.5">
                                  <Clock size={14} className="text-amber-600" />
                                  <span>Bác sĩ {selectedDoctor?.name || ''} chưa có ca khám trong {selectedShiftId === 'MORNING' ? 'Buổi Sáng' : 'Buổi Chiều'} ({formatVietnameseFullDate(bookingDate)})</span>
                                </div>
                                <p className="text-[11px] text-amber-800 leading-relaxed">
                                  Bác sĩ có thể chưa mở lịch trực hoặc đã hết chỗ trống. Bạn có thể đổi sang {selectedShiftId === 'MORNING' ? 'Buổi Chiều' : 'Buổi Sáng'} hoặc chuyển sang ngày khác:
                                </p>
                                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedShiftId(selectedShiftId === 'MORNING' ? 'AFTERNOON' : 'MORNING')}
                                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                                  >
                                    Đổi sang {selectedShiftId === 'MORNING' ? 'Buổi Chiều' : 'Buổi Sáng'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const tomorrow = new Date();
                                      tomorrow.setDate(tomorrow.getDate() + 1);
                                      setBookingDate(tomorrow.toISOString().split('T')[0]);
                                    }}
                                    className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg font-bold text-[11px] cursor-pointer"
                                  >
                                    📅 Xem ngày mai
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                {shiftSlots.map((slot, idx) => {
                                  const isSelected = selectedSlotTime === slot.time;
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      disabled={slot.disabled}
                                      onClick={() => !slot.disabled && setSelectedSlotTime(slot.time)}
                                      className={`py-1.5 px-2 text-xs font-bold rounded-xl border transition text-center flex flex-col items-center justify-center ${
                                        slot.disabled
                                          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                          : isSelected
                                          ? 'bg-purple-600 text-white border-purple-600 shadow-2xs cursor-pointer'
                                          : 'bg-slate-50 hover:bg-purple-50 text-slate-700 border-slate-200 cursor-pointer'
                                      }`}
                                    >
                                      <span>{slot.time}</span>
                                      <span className={`text-[8.5px] ${isSelected ? 'text-purple-200' : slot.disabled ? 'text-slate-400' : 'text-emerald-600'}`}>
                                        {slot.label}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Nút tiếp tục sang Bước 5 */}
                          <button
                            type="button"
                            disabled={!selectedDoctor || shiftSlots.length === 0 || !shiftSlots.some(s => s.time === selectedSlotTime && !s.disabled)}
                            onClick={handleProceedToPayment}
                            className={`w-full py-2.5 px-4 font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 mt-2 ${
                              !selectedDoctor
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white cursor-pointer'
                            }`}
                          >
                            <span>Tiếp Tục: Xác Nhận &amp; Giữ Chỗ (Cọc 2k / Ưu Đãi)</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      )}

                      {/* =================================================================== */}
                      {/* WIDGET BƯỚC 5: XÁC NHẬN ĐẶT CHỖ & CỌC 2K / MÃ ƯU ĐÃI                */}
                      {/* =================================================================== */}
                      {msg.widget === 'CONFIRM_PAYMENT' && (
                        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3.5 mt-1.5">
                          {/* Tóm tắt phiếu khám */}
                          <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 space-y-1.5 text-[11px] text-slate-700">
                            <div className="flex items-center justify-between pb-1 border-b border-purple-200">
                              <span className="font-extrabold text-purple-950 flex items-center gap-1">
                                <Stethoscope size={13} className="text-purple-600" />
                                Tóm Tắt Phiếu Khám
                              </span>
                              <span className="font-bold text-purple-800 bg-purple-100 px-1.5 py-0.5 rounded">
                                {activeCategory.specialtyName}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                              <div>Bác sĩ: <strong>{selectedDoctor?.name}</strong></div>
                              <div>Phòng: <strong>{selectedDoctor?.room}</strong></div>
                              <div>Giờ: <strong className="text-purple-700">{selectedSlotTime}</strong></div>
                              <div>Ngày: <strong>{formatVietnameseFullDate(bookingDate)}</strong></div>
                              <div className="col-span-2">Cơ sở: <strong>{selectedBranch?.shortName || '---'}</strong></div>
                            </div>
                          </div>

                          {/* Thông tin bệnh nhân */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">
                                Họ và tên người khám:
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
                              <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">
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

                          {/* Phần đặt cọc 2.000 đ hoặc ưu đãi */}
                          <div className="p-3 bg-purple-50/80 rounded-xl border border-purple-200 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-xs font-extrabold text-purple-950">
                                  Đặt Cọc Giữ Chỗ (2.000 VNĐ)
                                </h4>
                                <p className="text-[10px] text-purple-700">
                                  Tự động hoàn trả khi check-in hoặc dùng mã ưu đãi
                                </p>
                              </div>
                              <span className="text-[9px] bg-purple-200 text-purple-900 font-bold px-2 py-0.5 rounded-full">
                                Hoàn tiền 100%
                              </span>
                            </div>

                            {/* Tabs VietQR / Mã ưu đãi */}
                            <div className="flex rounded-lg bg-purple-100 p-0.5 gap-1">
                              <button
                                type="button"
                                onClick={() => setPaymentTab('vietqr')}
                                className={`flex-1 py-1 text-xs font-bold rounded-md transition cursor-pointer flex items-center justify-center gap-1 ${
                                  paymentTab === 'vietqr' ? 'bg-white text-purple-900 shadow-2xs' : 'text-purple-700'
                                }`}
                              >
                                <QrCode size={12} />
                                <span>Quét Mã Chuyển 2K</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setPaymentTab('promo')}
                                className={`flex-1 py-1 text-xs font-bold rounded-md transition cursor-pointer flex items-center justify-center gap-1 ${
                                  paymentTab === 'promo' ? 'bg-white text-purple-900 shadow-2xs' : 'text-purple-700'
                                }`}
                              >
                                <Tag size={12} />
                                <span>Nhập Mã Ưu Đãi</span>
                              </button>
                            </div>

                            {/* Tab 1: VietQR 2k */}
                            {paymentTab === 'vietqr' && (
                              <div className="bg-white rounded-2xl border-2 border-purple-200 p-3 sm:p-4 text-center space-y-3 shadow-2xs">
                                {/* Khung mã QR phóng to, sắc nét */}
                                <div className="bg-gradient-to-b from-purple-50/80 to-white p-2.5 sm:p-3 rounded-2xl border border-purple-100 inline-block w-full max-w-[280px] mx-auto shadow-inner">
                                  <img
                                    src={qrSrc}
                                    alt="Mã VietQR cọc 2k"
                                    className="w-56 h-56 sm:w-60 sm:h-60 max-w-full object-contain mx-auto rounded-xl bg-white p-1.5 shadow-xs border border-purple-100/90"
                                  />
                                  <p className="text-[10px] sm:text-[11px] text-purple-900 font-semibold mt-2 flex items-center justify-center gap-1.5">
                                    <ShieldCheck size={14} className="text-purple-600 shrink-0" />
                                    <span>Quét bằng <strong>App Ngân hàng</strong> hoặc <strong>Ví MoMo</strong></span>
                                  </p>
                                </div>

                                {/* Bảng thông tin chuyển khoản kèm nút 1-click sao chép trên điện thoại */}
                                <div className="bg-purple-50/60 rounded-xl p-2.5 sm:p-3 border border-purple-100 text-left text-xs space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500 text-[11px]">Ngân hàng:</span>
                                    <strong className="text-slate-900 font-bold text-xs">{bankDisplayName}</strong>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500 text-[11px]">Số tài khoản:</span>
                                    <div className="flex items-center gap-1.5">
                                      <strong className="text-purple-900 font-mono font-bold text-xs">{effectiveAccountNo}</strong>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyPaymentInfo(effectiveAccountNo, 'acc')}
                                        className="px-2 py-0.5 bg-white hover:bg-purple-100 border border-purple-200 rounded text-[10.5px] text-purple-700 font-semibold flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs"
                                        title="Sao chép số tài khoản"
                                      >
                                        {copiedPaymentField === 'acc' ? (
                                          <>
                                            <Check size={12} className="text-emerald-600" />
                                            <span className="text-emerald-700 font-bold">Đã chép</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy size={12} />
                                            <span>Chép STK</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500 text-[11px]">Chủ tài khoản:</span>
                                    <strong className="text-slate-900 font-bold uppercase text-xs">{effectiveAccountName}</strong>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500 text-[11px]">Số tiền cọc:</span>
                                    <strong className="text-purple-700 font-black font-mono text-sm">2.000 VNĐ</strong>
                                  </div>

                                  <div className="flex items-center justify-between pt-1.5 border-t border-purple-100">
                                    <span className="text-slate-500 text-[11px]">Nội dung CK:</span>
                                    <div className="flex items-center gap-1.5">
                                      <strong className="text-purple-900 font-mono font-bold text-xs bg-purple-100 px-1.5 py-0.5 rounded">
                                        MEDPAY {transferBookingCode}
                                      </strong>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyPaymentInfo(`MEDPAY ${transferBookingCode}`, 'memo')}
                                        className="px-2 py-0.5 bg-white hover:bg-purple-100 border border-purple-200 rounded text-[10.5px] text-purple-700 font-semibold flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs"
                                        title="Sao chép nội dung chuyển khoản"
                                      >
                                        {copiedPaymentField === 'memo' ? (
                                          <>
                                            <Check size={12} className="text-emerald-600" />
                                            <span className="text-emerald-700 font-bold">Đã chép</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy size={12} />
                                            <span>Chép ND</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Đếm ngược và trạng thái tự động nhận diện */}
                                  <div className="flex items-center justify-between pt-1.5 border-t border-purple-100 text-[10.5px] text-slate-500">
                                    <div className="flex items-center gap-1">
                                      <Clock size={12} className="text-purple-600 shrink-0" />
                                      <span>Hết hạn: <strong className="text-purple-900 font-mono font-bold">{Math.floor(qrCountdown / 60)}:{(qrCountdown % 60).toString().padStart(2, '0')}</strong></span>
                                    </div>
                                    {isCheckingAuto ? (
                                      <span className="text-purple-600 font-semibold animate-pulse flex items-center gap-1">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-600 animate-ping" />
                                        Đang đợi chuyển...
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">Tự động khớp lệnh</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Tab 2: Promo Code */}
                            {paymentTab === 'promo' && (
                              <div className="space-y-1.5 p-2 bg-white rounded-xl border border-purple-200">
                                <div className="flex gap-1.5">
                                  <input
                                    type="text"
                                    value={promoCode}
                                    onChange={(e) => setPromoCode(e.target.value)}
                                    placeholder="Ví dụ: MEDSCHED2026, VIP, GIAOVIEN..."
                                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs uppercase font-mono"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleApplyPromoCode}
                                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                                  >
                                    Áp Dụng
                                  </button>
                                </div>
                                {promoSuccessMsg && <p className="text-[10.5px] text-emerald-600 font-bold">✓ {promoSuccessMsg}</p>}
                                {promoErrorMsg && <p className="text-[10.5px] text-red-600 font-medium">✕ {promoErrorMsg}</p>}
                              </div>
                            )}
                          </div>

                          {/* Nút kiểm tra thanh toán / hoàn tất đặt chỗ */}
                          <div className="space-y-1.5 pt-1">
                            {paymentTab === 'vietqr' ? (
                              <button
                                type="button"
                                onClick={handleCheckPaymentManual}
                                disabled={isCheckingManual || isBookingSubmitting}
                                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                              >
                                {isCheckingManual || isBookingSubmitting ? (
                                  <>
                                    <Loader2 size={16} className="animate-spin shrink-0" />
                                    <span>Đang Kiểm Tra Đối Soát Ngân Hàng...</span>
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw size={15} className="shrink-0" />
                                    <span>Tôi Đã Chuyển Khoản — Kiểm Tra Ngay</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              promoSuccessMsg && isPaymentVerified ? (
                                <button
                                  type="button"
                                  onClick={() => handleConfirmFinalBooking()}
                                  disabled={isBookingSubmitting}
                                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                  {isBookingSubmitting ? (
                                    <>
                                      <Loader2 size={16} className="animate-spin shrink-0" />
                                      <span>Đang Cấp Vé Hẹn...</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 size={15} />
                                      <span>Xác Nhận Giữ Chỗ Miễn Phí (0 VNĐ)</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <div className="text-center p-2.5 bg-purple-50/70 border border-purple-100 rounded-xl text-[11px] text-purple-800">
                                  Nhập mã ưu đãi hợp lệ phía trên để nhận ưu đãi cọc 0 VNĐ, hoặc chọn tab <strong>Chuyển khoản VietQR</strong> để chuyển 2.000 VNĐ.
                                </div>
                              )
                            )}

                            {checkManualMessage && (
                              <p className={`text-[11px] p-2.5 rounded-xl border text-center leading-relaxed ${
                                checkManualMessage.includes('✓')
                                  ? 'text-emerald-800 bg-emerald-50 border-emerald-200 font-semibold'
                                  : 'text-amber-800 bg-amber-50 border-amber-200'
                              }`}>
                                {checkManualMessage}
                              </p>
                            )}

                            {/* Nút hủy bỏ ca đặt chỗ này */}
                            <button
                              type="button"
                              onClick={handleCancelCurrentBooking}
                              disabled={isCancelingBooking || isBookingSubmitting}
                              className="w-full py-2 px-3 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 mt-1"
                            >
                              <X size={14} />
                              <span>{isCancelingBooking ? 'Đang Hủy Ca Khám...' : 'Hủy Ca Khám Này & Chọn Lại Bác Sĩ'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* =================================================================== */}
                      {/* WIDGET BƯỚC 6: HOÀN TẤT ĐẶT CHỖ & CẤP MÃ HẸN (COMPLETED)            */}
                      {/* =================================================================== */}
                      {msg.widget === 'COMPLETED' && (
                        <div className="p-4 bg-white border-2 border-emerald-500 rounded-2xl shadow-md space-y-3 mt-1.5 animate-fadeIn">
                          <div className="flex items-center gap-2.5 text-emerald-700">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 shadow-xs">
                              <CheckCircle2 size={24} className="text-emerald-600" />
                            </div>
                            <div>
                              <h4 className="text-xs sm:text-sm font-extrabold text-emerald-900">
                                ĐẶT LỊCH HẸN THÀNH CÔNG!
                              </h4>
                              <p className="text-[10.5px] text-emerald-700">
                                Phòng khám MedSched hân hạnh được đón tiếp bạn.
                              </p>
                            </div>
                          </div>

                          {/* Thẻ vé hẹn điện tử */}
                          <div className="p-3 bg-gradient-to-br from-slate-50 to-emerald-50/50 rounded-xl border border-slate-200 text-xs text-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                              <span className="text-slate-500 font-medium">Mã đặt hẹn khám:</span>
                              <div className="flex items-center gap-1">
                                <span className="font-mono font-black text-purple-700 text-sm">
                                  {bookingSuccessCode || transferBookingCode}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(bookingSuccessCode || transferBookingCode)}
                                  className="p-1 text-slate-400 hover:text-purple-700 transition cursor-pointer"
                                  title="Sao chép mã"
                                >
                                  {isCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-[11px]">
                              <div>Bác sĩ: <strong>{selectedDoctor?.name}</strong></div>
                              <div>Phòng: <strong>{selectedDoctor?.room}</strong></div>
                              <div>Giờ: <strong className="text-purple-700">{selectedSlotTime}</strong></div>
                              <div>Ngày: <strong>{formatVietnameseFullDate(bookingDate)}</strong></div>
                              <div className="col-span-2">Cơ sở: <strong>{selectedBranch?.shortName || '---'}</strong></div>
                            </div>
                          </div>

                          {/* Nút điều hướng & Hủy ca khám */}
                          <div className="flex flex-col sm:flex-row gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (typeof window !== 'undefined') {
                                  window.dispatchEvent(new CustomEvent('appointment_created'));
                                }
                                if (onClose) onClose();
                                router.push('/my-appointments');
                              }}
                              className="flex-1 py-2.5 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer text-center"
                            >
                              Xem Lịch Hẹn Của Tôi
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelCurrentBooking}
                              disabled={isCancelingBooking}
                              className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                            >
                              <X size={13} />
                              <span>{isCancelingBooking ? 'Đang Hủy...' : 'Hủy Lịch Hẹn Này'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleResetConversation}
                              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                            >
                              Đặt Thêm Mới
                            </button>
                          </div>
                        </div>
                      )}

                      {/* =================================================================== */}
                      {/* TRƯỜNG HỢP ĐẶC BIỆT: BÁO ĐỘNG CẤP CỨU 115 (EMERGENCY)               */}
                      {/* =================================================================== */}
                      {msg.widget === 'EMERGENCY' && (
                        <div className="p-4 bg-red-50 border-2 border-red-500 rounded-2xl space-y-3 mt-1.5 animate-bounce-short">
                          <div className="flex items-center gap-2.5 text-red-700">
                            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md">
                              <ShieldAlert size={22} />
                            </div>
                            <div>
                              <h4 className="text-xs sm:text-sm font-extrabold text-red-900 leading-tight">
                                🚨 CẢNH BÁO NGUY HIỂM: DẤU HIỆU CẤP CỨU Y TẾ!
                              </h4>
                              <p className="text-[10.5px] text-red-700 font-medium">
                                Cần được can thiệp y khoa khẩn cấp tại Bệnh viện có ICU.
                              </p>
                            </div>
                          </div>
                          <div className="p-3 bg-white/90 rounded-xl border border-red-200 text-xs text-slate-800 space-y-1.5">
                            <p className="font-bold text-red-800">
                              ⚠️ Phòng khám ngoại trú MedSched KHÔNG tiếp nhận cấp cứu đe dọa tính mạng.
                            </p>
                            <p className="text-[11px] text-slate-600">
                              Vui lòng giữ người bệnh thông thoáng đường thở và liên hệ cấp cứu khẩn cấp ngay:
                            </p>
                          </div>
                          <a
                            href="tel:115"
                            className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
                          >
                            <Phone size={16} className="animate-bounce" />
                            <span>GỌI CẤP CỨU 115 NGAY LẬP TỨC</span>
                          </a>
                        </div>
                      )}

                      {/* =================================================================== */}
                      {/* TRƯỜNG HỢP: CHUYÊN KHOA PHÒNG KHÁM CHƯA CÓ BÁC SĨ (UNSUPPORTED)    */}
                      {/* =================================================================== */}
                      {msg.widget === 'UNSUPPORTED_SPECIALTY' && (
                        <div className="p-3.5 sm:p-4 bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-rose-50/40 border-2 border-amber-300 rounded-2xl space-y-3 mt-1.5 shadow-sm">
                          {/* Banner cảnh báo an toàn y tế */}
                          <div className="flex items-start gap-2.5 text-amber-900">
                            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                              <AlertCircle size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-xs sm:text-sm font-extrabold text-amber-950">
                                  Giới Hạn Chuyên Môn Y Tế Phòng Khám
                                </h4>
                                <span className="px-2 py-0.5 bg-amber-200/80 text-amber-900 text-[10px] font-bold rounded-full">
                                  An toàn người bệnh
                                </span>
                              </div>
                              <p className="text-[11px] text-amber-800 font-medium mt-0.5 leading-relaxed">
                                Phòng khám MedSched hiện <strong>chưa có Bác sĩ chuyên môn</strong> phụ trách chuyên khoa <strong>{activeCategory.specialtyName}</strong>. Hệ thống tuân thủ nguyên tắc y khoa không gán ghép bác sĩ trái chuyên môn.
                              </p>
                            </div>
                          </div>

                          {/* Khuyến nghị tuyến trên */}
                          <div className="p-2.5 sm:p-3 bg-white/95 rounded-xl border border-amber-200 text-xs text-slate-800 space-y-1 shadow-xs">
                            <p className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                              <Building2 size={14} className="text-amber-600 shrink-0" />
                              Khuyến nghị chuyển viện chuyên khoa:
                            </p>
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              Để đảm bảo an toàn tuyệt đối và hiệu quả chẩn đoán chính xác bằng trang thiết bị chuyên dụng, bạn nên thăm khám tại các <strong>bệnh viện chuyên khoa hoặc cơ sở y tế tuyến trên</strong>.
                            </p>
                          </div>

                          {/* Danh sách các bác sĩ và chuyên khoa MedSched thực tế có mặt */}
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] sm:text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <Stethoscope size={13} className="text-purple-600" />
                                Bác sĩ chuyên môn thực tế đang khám tại MedSched:
                              </span>
                              <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                                {activeClinicDoctors.length} Bác sĩ
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {activeClinicDoctors.map((doc) => {
                                const isInternal = doc.specialtyCode === 'INTERNAL_MEDICINE' || (doc.specialtyName || '').toLowerCase().includes('nội');
                                return (
                                  <div
                                    key={doc.id}
                                    className="p-2.5 bg-white rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-xs transition flex flex-col justify-between gap-2"
                                  >
                                    <div className="flex items-start gap-2">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${isInternal ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                                        {doc.name.charAt(doc.name.lastIndexOf(' ') + 1) || 'B'}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <h5 className="font-bold text-slate-900 text-xs truncate" title={doc.name}>
                                          {doc.name}
                                        </h5>
                                        <p className="text-[10.5px] text-purple-800 font-medium truncate">
                                          {doc.specialtyName || (isInternal ? 'Khoa Nội tổng quát' : 'Khoa Da liễu')}
                                        </p>
                                        <p className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                          <MapPin size={10} className="shrink-0" />
                                          <span>{doc.room}</span>
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleSelectDoctorDirectly(doc)}
                                      className="w-full py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-[10.5px] rounded-lg transition flex items-center justify-center gap-1 cursor-pointer border border-purple-200"
                                    >
                                      <span>Đặt khám với bác sĩ này</span>
                                      <ArrowRight size={11} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Các nút hành động */}
                          <div className="pt-1.5 flex flex-wrap items-center gap-2 border-t border-amber-200/70">
                            <button
                              type="button"
                              onClick={handleResetToSymptomChoice}
                              className="flex-1 py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <RefreshCw size={13} />
                              <span>Mô tả triệu chứng khác</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleChooseManual}
                              className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span>Đặt lịch truyền thống</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* =================================================================== */}
                      {/* TRƯỜNG HỢP: BÁC SĨ CHUYÊN KHOA CHƯA CÓ CA KHÁM MỞ SẴN (DOCTOR_NO_SLOTS) */}
                      {/* =================================================================== */}
                      {msg.widget === 'DOCTOR_NO_SLOTS' && (
                        <div className="p-3.5 sm:p-4 bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-amber-50/40 border-2 border-amber-300 rounded-2xl space-y-3 mt-1.5 shadow-sm">
                          {/* Banner thông báo */}
                          <div className="flex items-start gap-2.5 text-amber-950">
                            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                              <Clock size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-xs sm:text-sm font-extrabold text-amber-950">
                                  Bác Sĩ Chuyên Môn Chưa Có Ca Khám Hôm Nay
                                </h4>
                                <span className="px-2 py-0.5 bg-amber-200/80 text-amber-900 text-[10px] font-bold rounded-full">
                                  Dữ liệu thời gian thực
                                </span>
                              </div>
                              <p className="text-[11px] text-amber-900 font-medium mt-0.5 leading-relaxed">
                                Bác sĩ chuyên khoa tại phòng khám MedSched có thể điều trị những triệu chứng mà bạn nêu, nhưng hiện tại <strong>chưa có ca khám mở sẵn</strong> trong ngày hôm nay.
                              </p>
                            </div>
                          </div>

                          {/* Lựa chọn tiếp theo */}
                          <div className="p-3 bg-white/95 rounded-xl border border-amber-200 space-y-2 text-xs shadow-2xs">
                            <p className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                              <Calendar size={13} className="text-amber-600" />
                              Giải pháp gợi ý dành cho bạn:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const tomorrow = new Date();
                                  tomorrow.setDate(tomorrow.getDate() + 1);
                                  const tomorrowIso = tomorrow.toISOString().split('T')[0];
                                  setBookingDate(tomorrowIso);
                                  const userMsg: ChatMessage = {
                                    id: 'msg-' + Date.now(),
                                    sender: 'user',
                                    time: getFormattedTime(),
                                    text: `Kiểm tra lịch khám ngày mai (${formatVietnameseFullDate(tomorrowIso)})`,
                                  };
                                  const aiMsg: ChatMessage = {
                                    id: 'msg-' + (Date.now() + 1),
                                    sender: 'ai',
                                    time: getFormattedTime(),
                                    text: `Dạ em đã chuyển ngày khám sang **ngày mai (${formatVietnameseFullDate(tomorrowIso)})** để kiểm tra ca trực của bác sĩ giúp bạn rồi nhé!`,
                                    widget: 'SELECT_DOCTOR_SLOT',
                                    isTypingComplete: false,
                                  };
                                  setAiStep('SELECT_DOCTOR_SLOT');
                                  setMessages(prev => [...prev.map(m => ({ ...m, isCompleteWidget: true })), userMsg, aiMsg]);
                                }}
                                className="p-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
                              >
                                <Calendar size={14} />
                                <span>Kiểm Tra Lịch Khám Ngày Mai</span>
                              </button>

                              <a
                                href="tel:19001234"
                                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-300 transition"
                              >
                                <Phone size={14} className="text-emerald-600" />
                                <span>Hotline: 1900 1234</span>
                              </a>
                            </div>
                          </div>

                          {/* Bác sĩ khác đang có ca trực hôm nay nếu có */}
                          {activeClinicDoctors.filter(d => (doctorSchedulesMap[d.id]?.availableCount ?? 0) > 0).length > 0 && (
                            <div className="p-2.5 bg-emerald-50/90 rounded-xl border border-emerald-200 text-xs space-y-1.5">
                              <p className="font-bold text-emerald-900 text-[11px] flex items-center gap-1">
                                <Stethoscope size={13} className="text-emerald-600" />
                                Bác sĩ đang có ca trực sẵn sàng khám hôm nay:
                              </p>
                              {activeClinicDoctors.filter(d => (doctorSchedulesMap[d.id]?.availableCount ?? 0) > 0).map(altDoc => (
                                <div key={altDoc.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-emerald-200 gap-2">
                                  <div className="min-w-0">
                                    <div className="font-bold text-slate-900 text-xs truncate">{altDoc.name}</div>
                                    <div className="text-[10px] text-slate-500 truncate">{altDoc.specialtyName} • {altDoc.room}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectDoctorDirectly(altDoc)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-2xs transition cursor-pointer shrink-0"
                                  >
                                    Đặt Khám Ngay
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Nút mô tả triệu chứng khác */}
                          <div className="pt-1 flex justify-center">
                            <button
                              type="button"
                              onClick={handleResetToSymptomChoice}
                              className="text-[11px] font-bold text-amber-900 hover:text-amber-950 underline flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw size={12} />
                              <span>Mô tả triệu chứng sức khỏe khác</span>
                            </button>
                          </div>
                        </div>
                      )}

                        </div>
                      )}

                    </div>
                  </div>
                );
              })}

              {/* Chỉ báo AI đang suy nghĩ / gõ tin nhắn */}
              {isAiAnalyzing && (
                <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 p-2.5 rounded-xl border border-purple-200 w-fit animate-pulse">
                  <Bot size={15} />
                  <span>Gemini 2.5 đang phân tích triệu chứng...</span>
                </div>
              )}

              {/* Điểm neo tự động cuộn xuống cuối */}
              <div ref={messagesEndRef} />
            </div>

            {/* =================================================================== */}
            {/* THANH NHẬP CỐ ĐỊNH Ở ĐÁY (STICKY BOTTOM INPUT BAR - ZALO STYLE)     */}
            {/* =================================================================== */}
            {/* THANH NHẬP NỘI DUNG CHAT CỐ ĐỊNH Ở ĐÁY KHUNG (GIỐNG ZALO) */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-1.5 sm:p-2.5 border-t border-slate-200/90 shadow-lg z-20 shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2 max-w-4xl mx-auto">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendInputMessage();
                    }
                  }}
                  disabled={isAiAnalyzing}
                  placeholder={
                    aiStep === 'CHOOSE_SYMPTOM'
                      ? 'Nhập triệu chứng của bạn (VD: mệt mỏi, đau đầu, ngứa da...)'
                      : aiStep === 'CLARIFY_DETAILS'
                      ? 'Gõ câu trả lời của bạn hoặc bấm chọn phương án bên trên...'
                      : (aiStep === 'UNSUPPORTED_SPECIALTY' || aiStep === 'DOCTOR_NO_SLOTS')
                      ? 'Nhập mô tả triệu chứng khác bạn muốn khám hoặc chọn ngày...'
                      : 'Nhập tin nhắn trao đổi với trợ lý AI... (Nhấn Enter để gửi)'
                  }
                  className="flex-1 py-2 sm:py-2 px-3 sm:px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-xs sm:text-sm text-slate-800 transition"
                />
                <button
                  type="button"
                  onClick={handleSendInputMessage}
                  disabled={!inputMessage.trim() || isAiAnalyzing}
                  className="py-2 px-3 sm:px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                  title="Gửi tin nhắn"
                >
                  <Send size={15} />
                  <span className="hidden sm:inline">Gửi</span>
                </button>
              </div>
            </div>

          </div>

          {/* =================================================================== */}
          {/* CỘT PHỤ (CHỈ HIỆN TRÊN LAPTOP/DESKTOP LG: 30%): BẢNG TÓM TẮT HỒ SƠ */}
          {/* =================================================================== */}
          <div className="hidden lg:flex lg:w-72 xl:w-80 2xl:w-96 flex-col bg-white border-l border-slate-200/90 p-2.5 xl:p-4 overflow-y-auto shrink-0 justify-between h-full min-h-0">
            <div className="space-y-2 xl:space-y-3">
              <div className="flex items-center justify-between pb-1.5 xl:pb-2 border-b border-slate-100">
                <h4 className="font-extrabold text-slate-900 text-xs xl:text-sm flex items-center gap-1.5">
                  <Stethoscope size={15} className="text-purple-600" />
                  Hồ Sơ Đặt Khám Trực Tiếp
                </h4>
                <span className="text-[9px] xl:text-[9.5px] bg-purple-100 text-purple-800 font-extrabold px-1.5 py-0.5 rounded-full">
                  Live Snapshot
                </span>
              </div>

              {/* Thẻ tóm tắt thông tin theo thời gian thực */}
              <div className="p-2.5 xl:p-3 bg-gradient-to-br from-slate-50 to-purple-50/60 rounded-xl xl:rounded-2xl border border-slate-200 space-y-1.5 xl:space-y-2 text-xs text-slate-700">
                <div>
                  <span className="text-[9.5px] xl:text-[10px] text-slate-400 block font-medium">Chuyên khoa định hướng:</span>
                  <span className="font-extrabold text-purple-950 text-xs xl:text-sm block">
                    {activeCategory.specialtyName}
                  </span>
                </div>

                {/* Chi tiết triệu chứng đang khảo sát theo thời gian thực */}
                {(selectedNature || selectedDuration || selectedAssociated) && (
                  <div className="pt-1.5 border-t border-slate-200/70 text-[10.5px] space-y-1">
                    {selectedNature && (
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-slate-400 text-[9.5px] shrink-0">Biểu hiện:</span>
                        <span className="font-semibold text-slate-800 text-right truncate max-w-[170px]" title={selectedNature}>
                          {selectedNature}
                        </span>
                      </div>
                    )}
                    {selectedDuration && (
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-slate-400 text-[9.5px] shrink-0">Thời gian:</span>
                        <span className="font-semibold text-purple-700 text-right truncate max-w-[170px]" title={selectedDuration}>
                          {selectedDuration}
                        </span>
                      </div>
                    )}
                    {selectedAssociated && (
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-slate-400 text-[9.5px] shrink-0">Kèm theo:</span>
                        <span className="font-semibold text-slate-700 text-right truncate max-w-[170px]" title={selectedAssociated}>
                          {selectedAssociated}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <span className="text-[9.5px] xl:text-[10px] text-slate-400 block font-medium">Cơ sở MedSched:</span>
                  <span className="font-bold text-slate-900 block text-xs">
                    {selectedBranch?.shortName || (isBranchesLoading ? 'Đang nạp dữ liệu cơ sở...' : 'Vui lòng chọn cơ sở')}
                  </span>
                  <p className="text-[9.5px] text-slate-500 line-clamp-1">📍 {selectedBranch?.address || '---'}</p>
                </div>
                <div>
                  <span className="text-[9.5px] xl:text-[10px] text-slate-400 block font-medium">Bác sĩ phụ trách:</span>
                  <span className="font-bold text-slate-900 block text-xs">
                    {aiStep === 'UNSUPPORTED_SPECIALTY' ? (
                      <span className="text-amber-700 font-semibold">⚠️ Chưa có BS chuyên khoa này</span>
                    ) : aiStep === 'DOCTOR_NO_SLOTS' ? (
                      <span className="text-amber-700 font-semibold">🕒 Chưa có ca khám mở sẵn hôm nay</span>
                    ) : aiStep === 'CHOOSE_SYMPTOM' || aiStep === 'CLARIFY_DETAILS' ? (
                      <span className="text-purple-700 font-medium">🔍 Đang khảo sát triệu chứng...</span>
                    ) : aiStep === 'INPUT_LOCATION' ? (
                      <span className="text-slate-500 font-medium">⏳ Chờ chọn bác sĩ ở bước tiếp theo</span>
                    ) : selectedDoctor ? (
                      selectedDoctor.name
                    ) : (
                      <span className="text-amber-600 font-medium">⚠️ Chưa có bác sĩ tại cơ sở này</span>
                    )}
                  </span>
                  {selectedDoctor && aiStep !== 'UNSUPPORTED_SPECIALTY' && aiStep !== 'CHOOSE_SYMPTOM' && aiStep !== 'CLARIFY_DETAILS' && aiStep !== 'INPUT_LOCATION' && (
                    <p className="text-[9.5px] text-purple-700 font-medium">{selectedDoctor.room}</p>
                  )}
                </div>
                <div>
                  <span className="text-[9.5px] xl:text-[10px] text-slate-400 block font-medium">Ngày &amp; Giờ khám:</span>
                  <span className="font-bold text-purple-700 block text-xs">
                    {aiStep === 'INPUT_LOCATION' ? (
                      `${selectedShiftId === 'MORNING' ? 'Buổi Sáng (08:00 - 11:30)' : 'Buổi Chiều (13:30 - 16:00)'} • ${formatVietnameseFullDate(bookingDate)}`
                    ) : (
                      `${selectedSlotTime} • ${formatVietnameseFullDate(bookingDate)}`
                    )}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-slate-200/70 flex items-center justify-between">
                  <div>
                    <span className="text-[9.5px] text-slate-400 block font-medium">Chi phí khám:</span>
                    <span className="font-extrabold text-slate-900 text-xs">
                      {selectedDoctor?.fee ? `${selectedDoctor.fee.toLocaleString('vi-VN')} đ` : '200.000 đ'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9.5px] text-slate-400 block font-medium">Tiền cọc giữ chỗ:</span>
                    <span className="font-extrabold text-purple-700 text-xs">2.000 đ</span>
                  </div>
                </div>
              </div>

              {/* Tiến trình 5 bước mini */}
              <div className="space-y-1">
                <span className="text-[10px] xl:text-[11px] font-bold text-slate-700 block">
                  Tiến độ hoàn tất:
                </span>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { step: 'CHOOSE_SYMPTOM', label: '1. Triệu chứng' },
                    { step: 'CLARIFY_DETAILS', label: '2. Biểu hiện' },
                    { step: 'INPUT_LOCATION', label: '3. Cơ sở' },
                    { step: 'SELECT_DOCTOR_SLOT', label: '4. Bác sĩ' },
                    { step: 'CONFIRM_PAYMENT', label: '5. Cọc 2k' },
                  ].map((s, idx) => {
                    const stepOrder = ['CHOOSE_SYMPTOM', 'CLARIFY_DETAILS', 'INPUT_LOCATION', 'SELECT_DOCTOR_SLOT', 'CONFIRM_PAYMENT', 'COMPLETED'];
                    const currentIdx = stepOrder.indexOf(aiStep);
                    const thisIdx = idx;
                    const isDone = currentIdx > thisIdx;
                    const isCurrent = currentIdx === thisIdx;

                    return (
                      <div
                        key={s.step}
                        className={`h-1 xl:h-1.5 rounded-full transition-all ${
                          isDone
                            ? 'bg-emerald-500'
                            : isCurrent
                            ? 'bg-purple-600 animate-pulse'
                            : 'bg-slate-200'
                        }`}
                        title={s.label}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Thông tin hỗ trợ & bảo mật phía dưới cột phụ */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-[9.5px] xl:text-[10px] text-slate-600 space-y-0.5">
                <p className="flex items-center gap-1 text-slate-800 font-bold">
                  <ShieldCheck size={12} className="text-emerald-600" />
                  Bảo mật y tế 100%
                </p>
                <p className="line-clamp-2">Toàn bộ hồ sơ triệu chứng và thông tin đặt lịch được mã hóa an toàn theo tiêu chuẩn Bộ Y Tế.</p>
              </div>
              <div className="flex items-center justify-between text-[9.5px] xl:text-[10px] text-slate-500 px-0.5">
                <span>Hotline: <strong>1900 1234</strong></span>
                <span className="text-red-600 font-bold">Cấp cứu: 115</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP CHI TIẾT CHI NHÁNH & SO SÁNH KHOẢNG CÁCH GOOGLE MAPS                 */}
      {/* ========================================================================= */}
      {selectedBranchForModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
          onClick={() => setSelectedBranchForModal(null)}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="px-4 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-purple-50 via-white to-indigo-50 border-b border-purple-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-tight">
                    Thông Tin Cơ Sở &amp; Bản Đồ Google Maps
                  </h3>
                  <p className="text-[10px] text-purple-700 font-medium mt-0.5">
                    Hệ thống Phòng khám Đa khoa Quốc tế MedSched
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBranchForModal(null)}
                className="w-7 h-7 rounded-full bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer shadow-xs border border-slate-200"
                title="Đóng popup"
              >
                <X size={15} />
              </button>
            </div>

            {/* Nội dung chi tiết cơ sở */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs text-slate-700">
              {/* Tên & Địa chỉ */}
              <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-1.5">
                <span className="font-black text-purple-950 text-sm block">
                  {selectedBranchForModal.name}
                </span>
                <p className="text-slate-700 flex items-start gap-1.5 text-xs">
                  <MapPin size={14} className="text-purple-600 shrink-0 mt-0.5" />
                  <span><strong>Địa chỉ chính xác:</strong> {selectedBranchForModal.address}</span>
                </p>
                <p className="text-slate-700 flex items-center gap-1.5 text-xs">
                  <Phone size={13} className="text-emerald-600 shrink-0" />
                  <span><strong>Hotline hỗ trợ &amp; tiếp đón:</strong> {selectedBranchForModal.phone}</span>
                </p>
                <p className="text-slate-700 flex items-center gap-1.5 text-xs">
                  <Clock size={13} className="text-purple-600 shrink-0" />
                  <span><strong>Giờ làm việc:</strong> Thứ 2 - Thứ 6 (08:00 - 17:30)</span>
                </p>
              </div>

              {/* Tiện ích cơ sở */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-[11px] text-slate-600">
                <span className="font-bold text-slate-800 block text-xs">
                  ✨ Tiện ích dịch vụ tại chi nhánh:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                    <span>Tiếp đón 1s (QR/CCCD)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                    <span>Bãi đỗ ô tô &amp; xe máy free</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                    <span>Máy đo sinh hiệu tự động</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                    <span>Phòng khám vô khuẩn Bộ Y Tế</span>
                  </div>
                </div>
              </div>

              {/* KHUNG SO SÁNH KHOẢNG CÁCH GOOGLE MAPS */}
              <div className="p-3.5 bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-white rounded-2xl border-2 border-purple-200/90 space-y-2.5">
                <div className="flex items-center gap-1.5 text-purple-900 font-bold text-xs">
                  <Navigation size={14} className="text-purple-600" />
                  <span>Nhập địa chỉ của bạn để so sánh khoảng cách:</span>
                </div>
                <p className="text-[10.5px] text-slate-500">
                  Nhập địa chỉ nhà, công ty hoặc quận/huyện của bạn để xem lộ trình di chuyển chi tiết nhất trên Google Maps:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userCustomLocation}
                    onChange={(e) => setUserCustomLocation(e.target.value)}
                    placeholder="Ví dụ: Quận 11, Tân Bình, 123 Lê Đại Hành..."
                    className="flex-1 py-2 px-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-xs text-slate-800 shadow-2xs"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  {/* Nút chỉ đường từ vị trí nhập vào (theo tọa độ GPS chính xác) */}
                  <a
                    href={getBranchDirectionUrl(selectedBranchForModal, userCustomLocation)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
                  >
                    <Navigation size={13} />
                    <span>{userCustomLocation.trim() ? 'Chỉ Đường & Đo Khoảng Cách' : 'Chỉ Đường Từ Vị Trí Của Tôi'}</span>
                    <ExternalLink size={12} />
                  </a>

                  {/* Nút mở trực tiếp vị trí trên Google Maps (theo tọa độ GPS chính xác) */}
                  <a
                    href={getBranchGoogleMapsUrl(selectedBranchForModal)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 bg-white hover:bg-purple-50 text-purple-700 font-bold text-xs rounded-xl border border-purple-300 transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
                  >
                    <span>Xem Vị Trí Chi Nhánh</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedBranchForModal(null)}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedBranch(selectedBranchForModal);
                  setSelectedBranchForModal(null);
                }}
                className="py-2 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={14} />
                <span>Chọn Cơ Sở Này Cho Lịch Hẹn</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
