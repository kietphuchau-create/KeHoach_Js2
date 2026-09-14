package com.medsched.core.port.out;

/**
 * Cổng ra cho phần Trí tuệ nhân tạo.
 * Tầng nghiệp vụ chỉ biết đến giao diện này, nên có thể thay bản cài đặt
 * (quy tắc từ khóa / Spring AI / mô hình khác) mà không sửa use case.
 */
public interface AiTriagePort {

    /** Gợi ý mã chuyên khoa phù hợp từ mô tả triệu chứng. */
    String suggestSpecialty(String symptoms);

    /** Tóm tắt ngắn gọn bệnh sử để bác sĩ đọc nhanh trước khi khám. */
    String generateClinicalSummary(String symptoms, String medicalHistory);
}
