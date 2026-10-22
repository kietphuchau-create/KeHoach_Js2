package com.medsched.app.adapter.out.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Calls the configured real LLM first. Callers decide how to fall back when it is unavailable. */
@Service
public class GeminiGeneralAssistantService {
    private static final Logger log = LoggerFactory.getLogger(GeminiGeneralAssistantService.class);

    private final String apiKey;
    private final String model;
    private final OpenRouterAiClient openRouter;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public GeminiGeneralAssistantService(
            @Value("${app.gemini.api-key:${GEMINI_API_KEY:}}") String apiKey,
            @Value("${app.gemini.model:gemini-2.5-flash}") String model,
            OpenRouterAiClient openRouter,
            ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.model = model;
        this.openRouter = openRouter;
        this.objectMapper = objectMapper;
        var requestFactory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(4));
        requestFactory.setReadTimeout(Duration.ofSeconds(12));
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    public Optional<String> answer(String message, String role, String context) {
        return answerDetailed(message, role, context).map(AiAnswer::text);
    }

    public Optional<AiAnswer> answerDetailed(String message, String role, String context) {
        if (message == null || message.isBlank()) return Optional.empty();

        String safeContext = context == null ? "" : context.strip();
        if (safeContext.length() > 6_000) safeContext = safeContext.substring(safeContext.length() - 6_000);
        String prompt = "Lịch sử gần đây:\n" + safeContext
                + "\n\nCâu hỏi mới cần trả lời:\n" + message.strip();

        // Ưu tiên Gemini nếu được cấu hình API Key
        if (isConfigured()) {
            Map<String, Object> request = Map.of(
                    "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", systemPrompt(role) + "\n\n" + prompt)))),
                    "generationConfig", Map.of(
                            "temperature", 0.35,
                            "maxOutputTokens", 2048,
                            "thinkingConfig", Map.of("thinkingBudget", 0)
                    )
            );
            try {
                String body = restClient.post()
                        .uri("https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent", model)
                        .header("x-goog-api-key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(request)
                        .retrieve()
                        .body(String.class);
                var geminiAnswer = extractText(body);
                if (geminiAnswer.isPresent()) {
                    return Optional.of(new AiAnswer(geminiAnswer.get(), "GEMINI_API"));
                }
            } catch (Exception exception) {
                log.warn("Gemini general assistant unavailable: {}", exception.getMessage());
            }
        }

        var openRouterAnswer = openRouter.complete(systemPrompt(role), prompt, 0.35, 1200, false);
        if (openRouterAnswer.isPresent()) {
            return Optional.of(new AiAnswer(openRouterAnswer.get(), "OPENROUTER_API"));
        }
        return Optional.empty();
    }

    public record AiAnswer(String text, String source) {}

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank() && !apiKey.contains("chua-cau-hinh") && !apiKey.contains("demo-");
    }

    private Optional<String> extractText(String body) {
        if (body == null || body.isBlank()) return Optional.empty();
        try {
            JsonNode parts = objectMapper.readTree(body).path("candidates").path(0).path("content").path("parts");
            if (!parts.isArray()) return Optional.empty();
            StringBuilder result = new StringBuilder();
            for (JsonNode part : parts) {
                String text = part.path("text").asText("").strip();
                if (!text.isBlank()) {
                    if (!result.isEmpty()) result.append('\n');
                    result.append(text);
                }
            }
            return result.isEmpty() ? Optional.empty() : Optional.of(result.toString());
        } catch (Exception exception) {
            log.warn("Could not parse Gemini response: {}", exception.getMessage());
            return Optional.empty();
        }
    }

    private String systemPrompt(String role) {
        String roleName = switch (role == null ? "PATIENT" : role) {
            case "ADMIN" -> "quản trị viên";
            case "STAFF" -> "lễ tân";
            case "DOCTOR" -> "bác sĩ";
            default -> "bệnh nhân";
        };
        return """
                Bạn là Trợ lý AI Y tế của Hệ thống Phòng khám Thông minh MedSched đang trò chuyện với %s.
                PHẠM VI HOẠT ĐỘNG CHUYÊN BIỆT:
                - Chỉ hỗ trợ giải đáp về các vấn đề sức khỏe ban đầu, định hướng chuyên khoa, thủ tục khám chữa bệnh, thông tin dịch vụ, thuốc và tiếp đón tại MedSched.
                RÀNG BUỘC NGHIỆP VỤ BẮT BUỘC (GUARDRAILS):
                - TUYỆT ĐỐI KHÔNG giải bài toán, không tính toán biểu thức số học (như 1+1, 2x3, đạo hàm...), không làm thơ, không bàn luận giải trí hay trả lời các câu hỏi ngoài lề y tế.
                - Nếu người dùng nhập phép tính, câu đố hoặc câu hỏi ngoài lề không liên quan đến sức khỏe/phòng khám, bạn PHẢI TỪ CHỐI LỊCH SỰ VÀ NHẮC NHỞ:
                  "Dạ, tôi là Trợ lý Y tế MedSched, chuyên hỗ trợ tư vấn sức khỏe, định hướng chuyên khoa và quy trình khám tại phòng khám. Tôi không hỗ trợ giải toán hoặc các nội dung ngoài phạm vi y tế. Bạn đang có vấn đề sức khỏe nào cần bác sĩ tư vấn không ạ?"
                - Với nội dung y tế: không khẳng định chẩn đoán tuyệt đối; ưu tiên an toàn, khuyên khám trực tiếp khi cần và cảnh báo gọi 115 nếu có dấu hiệu nguy cấp.
                - Không hiển thị JSON, tên hàm, tên công cụ hay giải thích kỹ thuật phía sau câu trả lời.
                """.formatted(roleName);
    }
}
