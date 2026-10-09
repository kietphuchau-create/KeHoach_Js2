package com.medsched.core.port.out;

/**
 * Cổng ra (Outbound Port) cho phần Trợ lý Trí tuệ Nhân tạo (AI Clinic Assistant).
 * Áp dụng kiến trúc Lục giác (Hexagonal Architecture):
 * Tầng Core chỉ giao tiếp qua Port này, không phụ thuộc vào Framework hay SDK bên ngoài.
 */
public interface AiTriagePort {

    /** Gợi ý mã chuyên khoa phù hợp từ mô tả triệu chứng. */
    String suggestSpecialty(String symptoms);

    /** Tóm tắt ngắn gọn bệnh sử để bác sĩ đọc nhanh trước khi khám. */
    String generateClinicalSummary(String symptoms, String medicalHistory);

    /** Đánh giá toàn diện triệu chứng, tư vấn dịch vụ phòng khám và cảnh báo an toàn cấp cứu 115. */
    TriageEvaluation evaluateSymptoms(String symptoms, String medicalHistory);
}
