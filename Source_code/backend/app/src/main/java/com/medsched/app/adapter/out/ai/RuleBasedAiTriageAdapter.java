package com.medsched.app.adapter.out.ai;

import com.medsched.core.port.out.AiTriagePort;
import com.medsched.core.port.out.TriageEvaluation;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Bản cài đặt dự phòng cho {@link AiTriagePort} bằng quy tắc từ khóa cơ bản.
 */
public class RuleBasedAiTriageAdapter implements AiTriagePort {

    /** Danh sách từ khóa (ngăn bằng dấu phẩy) -> mã chuyên khoa trong bảng specialties. */
    private static final Map<String, String> RULES = new LinkedHashMap<>();

    static {
        RULES.put("da,ngứa,mẩn,nổi mề đay,mụn,nám,vảy,chàm,dị ứng", "DERMATOLOGY");
        RULES.put("răng,nướu,lợi,hàm,nhức răng,sâu răng", "ODONTO_STOMATOLOGY");
        RULES.put("mắt,thị lực,cận,mờ mắt,đau mắt,nhức mắt", "OPHTHALMOLOGY");
        RULES.put("tim,huyết áp,đau ngực,khó thở,hồi hộp,tiêu hóa,dạ dày,sốt,ho,đau bụng", "INTERNAL_MEDICINE");
    }

    @Override
    public String suggestSpecialty(String symptoms) {
        if (symptoms == null || symptoms.isBlank()) {
            return "INTERNAL_MEDICINE";
        }
        String text = symptoms.toLowerCase(Locale.ROOT);
        for (Map.Entry<String, String> rule : RULES.entrySet()) {
            for (String keyword : rule.getKey().split(",")) {
                if (text.contains(keyword)) {
                    return rule.getValue();
                }
            }
        }
        return "INTERNAL_MEDICINE";
    }

    @Override
    public String generateClinicalSummary(String symptoms, String medicalHistory) {
        if (symptoms == null || symptoms.isBlank()) {
            return null;
        }
        String trimmed = symptoms.strip();
        String shortened = trimmed.length() > 180 ? trimmed.substring(0, 180) + "..." : trimmed;
        StringBuilder summary = new StringBuilder("Triệu chứng chính: ").append(shortened);
        if (medicalHistory != null && !medicalHistory.isBlank()) {
            String history = medicalHistory.strip();
            summary.append(" | Tiền sử: ")
                    .append(history.length() > 120 ? history.substring(0, 120) + "..." : history);
        }
        summary.append(" | Hướng chuyên khoa: ").append(suggestSpecialty(symptoms));
        return summary.toString();
    }

    @Override
    public TriageEvaluation evaluateSymptoms(String symptoms, String medicalHistory) {
        String code = suggestSpecialty(symptoms);
        String summary = generateClinicalSummary(symptoms, medicalHistory);
        return new TriageEvaluation(
                code,
                "Khoa " + code,
                "Dịch vụ Khám Tiêu Chuẩn",
                "200.000 VNĐ",
                summary,
                "Vui lòng mang theo sổ khám và thuốc cũ nếu có.",
                false,
                null,
                "Lưu ý: Kết quả mang tính tham khảo kỹ thuật."
        );
    }
}
