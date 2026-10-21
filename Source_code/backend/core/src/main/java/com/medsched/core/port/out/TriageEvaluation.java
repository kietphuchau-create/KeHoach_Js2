package com.medsched.core.port.out;

/**
 * Kết quả phân tích triệu chứng & tư vấn dịch vụ từ Trợ lý AI Phòng khám MedSched.
 */
public record TriageEvaluation(
        String specialtyCode,       // Ví dụ: DERMATOLOGY, ODONTO_STOMATOLOGY, INTERNAL_MEDICINE, OPHTHALMOLOGY, PEDIATRICS
        String specialtyName,       // Tên tiếng Việt hiển thị (ví dụ: Chuyên Khoa Da Liễu)
        String recommendedService,  // Dịch vụ phòng khám tư vấn (ví dụ: Gói Khám & Soi Da Chuyên Sâu)
        String estimatedFee,        // Chi phí khám niêm yết (ví dụ: 250.000 VNĐ)
        String clinicalSummary,     // Tóm tắt 2 dòng súc tích gửi Bác sĩ
        String preparationAdvice,   // Dặn dò chuẩn bị trước khi đến phòng khám
        boolean isEmergency,        // Cờ cảnh báo cấp cứu nguy kịch
        String emergencyWarning,    // Khuyến cáo 115 nếu là ca nguy hiểm
        String disclaimer           // Khuyến cáo pháp lý y khoa
) {}
