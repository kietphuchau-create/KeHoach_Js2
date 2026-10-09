package com.medsched.app.adapter.out.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medsched.core.port.out.AiTriagePort;
import com.medsched.core.port.out.TriageEvaluation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Locale;
import java.util.Map;

/**
 * Adapter Trợ lý AI Thông minh cho Chuỗi Phòng khám Tư MedSched.
 * <p>
 * Áp dụng mô hình Hybrid Dual-Engine:
 * 1. AI LLM Engine (Google Gemini 2.5 Flash / OpenAI): Phân tích ngữ cảnh tự nhiên sâu sắc khi có API key.
 * 2. Clinic Expert Engine & Safety Guardrail: Hệ thống chuyên gia y tế phòng khám tốc độ cao,
 *    đặc biệt tích hợp quy chuẩn cảnh báo cấp cứu 115 (Medical Safety Guardrail) và gợi ý dịch vụ tư nhân.
 */
@Component
@Primary
public class SmartClinicAiTriageAdapter implements AiTriagePort {

    private static final Logger log = LoggerFactory.getLogger(SmartClinicAiTriageAdapter.class);
    private static final String DEFAULT_DISCLAIMER = "Lưu ý: Kết quả định hướng bởi Trợ lý AI chỉ mang tính tham khảo dịch vụ, vui lòng thăm khám trực tiếp với bác sĩ chuyên khoa.";

    private final String geminiApiKey;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public SmartClinicAiTriageAdapter(
            @Value("${app.gemini.api-key:${GEMINI_API_KEY:}}") String geminiApiKey,
            ObjectMapper objectMapper
    ) {
        this.geminiApiKey = geminiApiKey;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().build();
    }

    @Override
    public String suggestSpecialty(String symptoms) {
        return evaluateSymptoms(symptoms, null).specialtyCode();
    }

    @Override
    public String generateClinicalSummary(String symptoms, String medicalHistory) {
        return evaluateSymptoms(symptoms, medicalHistory).clinicalSummary();
    }

    @Override
    public TriageEvaluation evaluateSymptoms(String symptoms, String medicalHistory) {
        if (symptoms == null || symptoms.isBlank()) {
            return new TriageEvaluation(
                    "INTERNAL_MEDICINE",
                    "Khoa Nội Tổng Quát",
                    "Gói Khám Tổng Quát Tiêu Chuẩn",
                    "200.000 VNĐ",
                    "Bệnh nhân chưa cung cấp triệu chứng cụ thể, đăng ký khám tổng quát.",
                    "Nên nhịn ăn sáng trước 6-8 tiếng nếu dự kiến xét nghiệm máu tổng quát.",
                    false,
                    null,
                    DEFAULT_DISCLAIMER
            );
        }

        // 1. Kiểm tra Guardrail Cấp Cứu Khẩn Cấp (Medical Safety Guardrail)
        TriageEvaluation emergencyCheck = checkEmergencyGuardrail(symptoms);
        if (emergencyCheck != null) {
            return emergencyCheck;
        }

        // 2. Thử gọi mô hình AI Gemini (nếu có API Key hợp lệ và mạng khả dụng)
        if (geminiApiKey != null && !geminiApiKey.isBlank() && !geminiApiKey.contains("chua-cau-hinh")) {
            try {
                TriageEvaluation aiResult = callGeminiLlmTriage(symptoms, medicalHistory);
                if (aiResult != null) {
                    return aiResult;
                }
            } catch (Exception e) {
                log.warn("Gemini AI API tạm thời không phản hồi ({}), chuyển sang Clinic Expert Engine", e.getMessage());
            }
        }

        // 3. Fallback sang Clinic Expert Engine chuyên sâu cho phòng khám tư
        return evaluateWithClinicExpertSystem(symptoms, medicalHistory);
    }

    /**
     * Medical Safety Guardrail: Phát hiện ngay dấu hiệu nguy kịch để khuyên gọi 115.
     */
    private TriageEvaluation checkEmergencyGuardrail(String symptoms) {
        String s = symptoms.toLowerCase(Locale.ROOT);
        boolean isEmergency = s.contains("đau thắt ngực") || s.contains("đau ngực dữ dội") ||
                s.contains("khó thở dữ dội") || s.contains("thở dốc tím tái") ||
                s.contains("ngất xỉu") || s.contains("mất ý thức") || s.contains("hôn mê") ||
                s.contains("đột quỵ") || s.contains("liệt nửa người") || s.contains("méo miệng") ||
                s.contains("nôn ra máu") || s.contains("ho ra máu tươi") ||
                s.contains("tai nạn giao thông") || s.contains("gãy xương hở") || s.contains("chấn thương sọ não") ||
                s.contains("ngộ độc cấp");

        if (isEmergency) {
            return new TriageEvaluation(
                    "EMERGENCY",
                    "Cấp Cứu Khẩn Cấp (Tuyến Bệnh Viện)",
                    "Chuyển Viện Cấp Cứu 115 Ngay Lập Tức",
                    "Không Áp Dụng (Cần Chuyển Viện)",
                    "CẢNH BÁO: Phát hiện dấu hiệu cấp cứu đe dọa tính mạng: " + symptoms.strip(),
                    "Giữ bệnh nhân ở tư thế an toàn, thông thoáng đường thở. KHÔNG tự ý cho uống nước hay thuốc lạ.",
                    true,
                    "🚨 CẢNH BÁO NGUY HIỂM: Triệu chứng của bạn có dấu hiệu cấp cứu khẩn cấp! Phòng khám tư MedSched chỉ điều trị ngoại trú và KHÔNG có khoa hồi sức cấp cứu chuyên sâu. Vui lòng gọi ngay 115 hoặc di chuyển khẩn cấp tới Bệnh viện Đa khoa gần nhất!",
                    "Cảnh báo an toàn y tế bắt buộc theo quy định phòng khám tư nhân."
            );
        }
        return null;
    }

    /**
     * Clinic Expert Engine: Bộ quy tắc chuyên sâu chuẩn hóa cho Phòng khám tư MedSched.
     */
    private TriageEvaluation evaluateWithClinicExpertSystem(String symptoms, String medicalHistory) {
        String s = symptoms.toLowerCase(Locale.ROOT);
        String code;
        String name;
        String service;
        String fee;
        String advice;

        if (s.contains("bé") || s.contains("trẻ") || s.contains("em bé") || s.contains("con tôi") || s.contains("cháu")) {
            code = "PEDIATRICS";
            name = "Chuyên Khoa Nhi";
            service = "Gói Khám Nhi Tổng Quát & Tư Vấn Dinh Dưỡng";
            fee = "200.000 VNĐ";
            advice = "Mang theo sổ tiêm chủng của bé và danh sách các loại thuốc bé đang dùng (nếu có). Giữ ấm cho trẻ khi di chuyển.";
        } else if (s.contains("da") || s.contains("ngứa") || s.contains("mẩn") || s.contains("mề đay") ||
                s.contains("mụn") || s.contains("dị ứng") || s.contains("chàm") || s.contains("vảy nến") || s.contains("rụng tóc")) {
            code = "DERMATOLOGY";
            name = "Chuyên Khoa Da Liễu";
            service = "Gói Khám & Soi Da Kỹ Thuật Số";
            fee = "250.000 VNĐ";
            advice = "Tránh gãi mạnh gây trầy xước. Không tự ý bôi các loại thuốc mỡ hoặc mỹ phẩm lạ lên vùng tổn thương trước khi bác sĩ thăm khám.";
        } else if (s.contains("răng") || s.contains("nướu") || s.contains("lợi") || s.contains("hàm") ||
                s.contains("nhức răng") || s.contains("sâu răng") || s.contains("chảy máu chân răng") || s.contains("tẩy trắng")) {
            code = "ODONTO_STOMATOLOGY";
            name = "Chuyên Khoa Răng Hàm Mặt";
            service = "Gói Khám Răng Toàn Diện & Chụp X-Quang Răng";
            fee = "150.000 VNĐ";
            advice = "Vệ sinh răng miệng nhẹ nhàng trước khi đến khám. Tránh dùng đồ uống quá nóng hoặc quá lạnh nếu răng đang ê buốt.";
        } else if (s.contains("mắt") || s.contains("thị lực") || s.contains("mờ") || s.contains("cộm") ||
                s.contains("đau mắt") || s.contains("đỏ mắt") || s.contains("cận") || s.contains("nhức mắt")) {
            code = "OPHTHALMOLOGY";
            name = "Chuyên Khoa Mắt";
            service = "Gói Đo Khúc Xạ & Khám Mắt Chuyên Sâu";
            fee = "200.000 VNĐ";
            advice = "Tháo kính áp tròng (nếu có) trước khi khám ít nhất 2 giờ. Mang theo kính cũ đang đeo để bác sĩ so sánh thị lực.";
        } else {
            code = "INTERNAL_MEDICINE";
            name = "Khoa Nội Tổng Quát";
            service = "Gói Khám Nội Khoa & Tư Vấn Sức Khỏe Toàn Diện";
            fee = "200.000 VNĐ";
            advice = "Nên nhịn ăn sáng 6-8 tiếng nếu bạn có nhu cầu xét nghiệm máu hoặc siêu âm ổ bụng. Uống đủ nước lọc.";
        }

        StringBuilder summary = new StringBuilder("Triệu chứng ghi nhận: ").append(symptoms.strip());
        if (medicalHistory != null && !medicalHistory.isBlank()) {
            summary.append(" | Tiền sử: ").append(medicalHistory.strip());
        }
        summary.append(" | Đề xuất: ").append(name).append(" (").append(service).append(")");

        return new TriageEvaluation(
                code,
                name,
                service,
                fee,
                summary.toString(),
                advice,
                false,
                null,
                DEFAULT_DISCLAIMER
        );
    }

    /**
     * Gọi Google Gemini LLM API để phân tích ngữ cảnh y khoa tự nhiên.
     */
    private TriageEvaluation callGeminiLlmTriage(String symptoms, String medicalHistory) {
        String systemPrompt = """
                Bạn là Trợ lý AI Y tế của Chuỗi Phòng khám Tư nhân MedSched (Việt Nam).
                Nhiệm vụ của bạn: Phân tích mô tả triệu chứng của bệnh nhân, gợi ý chuyên khoa, dịch vụ phòng khám, giá niêm yết, lời dặn chuẩn bị và tóm tắt bệnh án.
                Danh sách chuyên khoa của phòng khám:
                - DERMATOLOGY (Chuyên Khoa Da Liễu) - Giá khám: 250.000 VNĐ
                - ODONTO_STOMATOLOGY (Chuyên Khoa Răng Hàm Mặt) - Giá khám: 150.000 VNĐ
                - OPHTHALMOLOGY (Chuyên Khoa Mắt) - Giá khám: 200.000 VNĐ
                - PEDIATRICS (Chuyên Khoa Nhi) - Giá khám: 200.000 VNĐ
                - INTERNAL_MEDICINE (Khoa Nội Tổng Quát) - Giá khám: 200.000 VNĐ
                
                QUY TẮC AN TOÀN BẮT BUỘC:
                Nếu bệnh nhân có dấu hiệu cấp cứu đe dọa tính mạng (đau ngực dữ dội, khó thở cấp, ngất xỉu, đột quỵ, nôn ra máu, tai nạn nặng):
                Đặt "isEmergency": true, "specialtyCode": "EMERGENCY", và đưa lời cảnh báo gọi ngay 115 trong "emergencyWarning".
                
                Hãy trả về DUY NHẤT một chuỗi JSON hợp lệ không kèm markdown backticks, theo mẫu:
                {
                  "specialtyCode": "DERMATOLOGY",
                  "specialtyName": "Chuyên Khoa Da Liễu",
                  "recommendedService": "Gói Khám & Soi Da Kỹ Thuật Số",
                  "estimatedFee": "250.000 VNĐ",
                  "clinicalSummary": "Tóm tắt triệu chứng 2 dòng súc tích cho bác sĩ",
                  "preparationAdvice": "Lời dặn bệnh nhân chuẩn bị trước khi đến phòng khám",
                  "isEmergency": false,
                  "emergencyWarning": null
                }
                """;

        String userPrompt = "Triệu chứng bệnh nhân: " + symptoms +
                (medicalHistory != null && !medicalHistory.isBlank() ? "\nTiền sử bệnh: " + medicalHistory : "");

        Map<String, Object> requestBody = Map.of(
                "contents", java.util.List.of(
                        Map.of(
                                "role", "user",
                                "parts", java.util.List.of(
                                        Map.of("text", systemPrompt + "\n\n" + userPrompt)
                                )
                        )
                ),
                "generationConfig", Map.of(
                        "temperature", 0.2,
                        "maxOutputTokens", 1024,
                        "thinkingConfig", Map.of("thinkingBudget", 0)
                )
        );

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiApiKey;

        String responseBody = restClient.post()
                .uri(url)
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(String.class);

        if (responseBody == null || responseBody.isBlank()) {
            return null;
        }

        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    String rawText = parts.get(0).path("text").asText();
                    String cleanJson = rawText.replaceAll("(?s)```json\\s*", "")
                            .replaceAll("(?s)```\\s*", "")
                            .strip();

                    JsonNode aiJson = objectMapper.readTree(cleanJson);
                    return new TriageEvaluation(
                            aiJson.path("specialtyCode").asText("INTERNAL_MEDICINE"),
                            aiJson.path("specialtyName").asText("Khoa Nội Tổng Quát"),
                            aiJson.path("recommendedService").asText("Gói Khám Nội Khoa Tiêu Chuẩn"),
                            aiJson.path("estimatedFee").asText("200.000 VNĐ"),
                            aiJson.path("clinicalSummary").asText(symptoms),
                            aiJson.path("preparationAdvice").asText("Vui lòng mang theo kết quả khám bệnh trước đây (nếu có)."),
                            aiJson.path("isEmergency").asBoolean(false),
                            aiJson.path("emergencyWarning").isNull() ? null : aiJson.path("emergencyWarning").asText(),
                            DEFAULT_DISCLAIMER
                    );
                }
            }
        } catch (Exception parseEx) {
            log.warn("Không thể parse JSON từ Gemini ({}): {}", parseEx.getMessage(), responseBody);
        }

        return null;
    }
}
