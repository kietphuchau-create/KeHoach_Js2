package com.medsched.app.adapter.in.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.medsched.app.adapter.in.ai.MedSchedAiTools;
import com.medsched.core.port.out.AiTriagePort;
import com.medsched.core.port.out.TriageEvaluation;
import com.medsched.app.adapter.out.ai.GeminiGeneralAssistantService;
import com.medsched.app.adapter.out.ai.InternalKnowledgeRagService;
import com.medsched.app.adapter.out.ai.PatientBookingRecommendationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.HttpHeaders;
import jakarta.servlet.http.HttpServletRequest;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.ArrayList;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/ai")
public class TriageController {

    private final AiTriagePort aiTriagePort;
    private final MedSchedAiTools aiTools;
    private final AiRequestGuard aiRequestGuard;
    private final GeminiGeneralAssistantService generalAssistant;
    private final InternalKnowledgeRagService knowledgeRag;
    private final PatientBookingRecommendationService bookingRecommendations;
    private final ObjectMapper objectMapper;

    public TriageController(AiTriagePort aiTriagePort, MedSchedAiTools aiTools, AiRequestGuard aiRequestGuard,
                            GeminiGeneralAssistantService generalAssistant,
                            InternalKnowledgeRagService knowledgeRag,
                            PatientBookingRecommendationService bookingRecommendations,
                            ObjectMapper objectMapper) {
        this.aiTriagePort = aiTriagePort;
        this.aiTools = aiTools;
        this.aiRequestGuard = aiRequestGuard;
        this.generalAssistant = generalAssistant;
        this.knowledgeRag = knowledgeRag;
        this.bookingRecommendations = bookingRecommendations;
        this.objectMapper = objectMapper;
    }

    public record TriageRequest(String symptoms, String medicalHistory) {}
    public record ToolExecuteRequest(String toolName, Map<String, Object> arguments) {}
    public record ChatRequest(String message, String role, String context) {}

    @PostMapping("/triage")
    public ResponseEntity<Map<String, Object>> triage(@RequestBody TriageRequest request, HttpServletRequest httpRequest) {
        String symptoms = request != null ? request.symptoms() : "";
        String identity = authenticatedRole() != null
                ? SecurityContextHolder.getContext().getAuthentication().getName()
                : "ip:" + httpRequest.getRemoteAddr();
        AiRequestGuard.Decision guard = aiRequestGuard.check(identity, symptoms);
        if (!guard.allowed()) {
            return ResponseEntity.status(429).header(HttpHeaders.RETRY_AFTER, String.valueOf(guard.retryAfterSeconds()))
                    .body(Map.of("message", guard.message()));
        }
        TriageEvaluation eval = aiTriagePort.evaluateSymptoms(symptoms, request != null ? request.medicalHistory() : "");

        Map<String, Object> response = new HashMap<>();
        // Tương thích ngược với các hàm Frontend cũ
        response.put("specialty", eval.specialtyName());
        response.put("suggestedSpecialty", eval.specialtyCode());
        response.put("summary", eval.clinicalSummary());
        response.put("clinicalSummary", eval.clinicalSummary());
        response.put("disclaimer", eval.disclaimer());

        // Các trường mở rộng mới chuẩn hóa cho Phòng khám tư
        response.put("specialtyCode", eval.specialtyCode());
        response.put("specialtyName", eval.specialtyName());
        response.put("recommendedService", eval.recommendedService());
        response.put("estimatedFee", eval.estimatedFee());
        response.put("preparationAdvice", eval.preparationAdvice());
        response.put("isEmergency", eval.isEmergency());
        response.put("emergencyWarning", eval.emergencyWarning());

        return ResponseEntity.ok(response);
    }

    /**
     * Khám phá danh mục các công cụ AI (AI/MCP Tools) có sẵn trong hệ thống.
     */
    @GetMapping("/tools")
    public ResponseEntity<List<Map<String, Object>>> getTools() {
        return ResponseEntity.ok(aiTools.getToolDefinitions());
    }

    /**
     * Cho phép AI Agent hoặc Frontend Client thực thi trực tiếp các Tool y tế.
     */
    @PostMapping("/tools/execute")
    public ResponseEntity<Map<String, Object>> executeTool(@RequestBody ToolExecuteRequest request, HttpServletRequest httpRequest) {
        if (request == null) return ResponseEntity.badRequest().body(errorBody("Nội dung MCP tool không hợp lệ."));
        String role = authenticatedRole();
        if (role == null) return ResponseEntity.status(403).body(errorBody("Cần đăng nhập để thực thi MCP tool."));
        if (!isToolAllowed(request.toolName(), role)) {
            return ResponseEntity.status(403).body(errorBody("Vai trò hiện tại không được phép thực thi MCP tool này."));
        }
        AiRequestGuard.Decision guard = aiRequestGuard.check(
                SecurityContextHolder.getContext().getAuthentication().getName(),
                request.toolName() + ":" + String.valueOf(request.arguments()));
        if (!guard.allowed()) {
            return ResponseEntity.status(429).header(HttpHeaders.RETRY_AFTER, String.valueOf(guard.retryAfterSeconds()))
                    .body(errorBody(guard.message()));
        }
        String result = aiTools.executeTool(request.toolName(), request.arguments());
        Map<String, Object> toolResponse = new HashMap<>();
        toolResponse.put("toolName", request.toolName() != null ? request.toolName() : "");
        toolResponse.put("result", result);
        return ResponseEntity.ok(toolResponse);
    }

    /**
     * AI Agent Chat Orchestrator:
     * Nhận tin nhắn trò chuyện từ nhân viên (Lễ tân, Bác sĩ, Admin) hoặc Bệnh nhân,
     * tự động nhận diện intent, kích hoạt các MCP Tool tương ứng và phản hồi bằng ngôn ngữ tự nhiên.
     */
    @PostMapping("/chat")
    public ResponseEntity<Map<String, Object>> chat(@RequestBody ChatRequest request, HttpServletRequest httpRequest) {
        if (request == null) return ResponseEntity.badRequest().body(chatError("Nội dung chat không hợp lệ."));
        String msg = request.message() != null ? request.message().trim() : "";
        String role = request.role() != null ? request.role().trim().toUpperCase() : "PATIENT";
        String actualRole = authenticatedRole();
        if (!"PATIENT".equals(role) && (actualRole == null || !actualRole.equals(role))) {
            return ResponseEntity.status(403).body(chatError("Bạn không có quyền dùng trợ lý AI ở chế độ " + role + "."));
        }
        String identity = actualRole != null ? SecurityContextHolder.getContext().getAuthentication().getName() : "ip:" + httpRequest.getRemoteAddr();
        AiRequestGuard.Decision guard = aiRequestGuard.check(identity, msg);
        if (!guard.allowed()) {
            return ResponseEntity.status(429).header(HttpHeaders.RETRY_AFTER, String.valueOf(guard.retryAfterSeconds()))
                    .body(chatError(guard.message()));
        }
        ChatResult result = switch (role) {
            case "ADMIN" -> handleAdminChat(msg, request.context());
            case "STAFF" -> handleStaffChat(msg, request.context());
            case "DOCTOR" -> handleDoctorChat(msg, identity, request.context());
            default -> handlePatientChat(msg, request.context());
        };

        Map<String, Object> response = new HashMap<>();
        response.put("reply", result.reply());
        response.put("executedTool", result.tool());
        response.put("toolResult", result.data());
        response.put("answerSource", result.source());
        response.put("tokenSaved", result.source() == null || !result.source().endsWith("_API"));
        return ResponseEntity.ok(response);
    }

    private ChatResult handlePatientChat(String message, String context) {
        String lower = message.toLowerCase(Locale.ROOT);
        String lastAssistant = lastContextMessage(context, "[ASSISTANT] ");
        String explicitFamily = explicitSymptomFamily(lower);
        boolean continuation = explicitFamily == null && isLikelyClinicalAnswer(lower, lastAssistant);
        if (!looksLikeSymptomTriage(lower) && !continuation) {
            return aiFirstOrInternal(message, "PATIENT", context,
                    "Mình chưa có đủ thông tin để trả lời chắc chắn. Bạn có thể diễn đạt câu hỏi rõ hơn một chút nhé.");
        }

        PatientEpisode episode = collectPatientEpisode(context, message, explicitFamily, continuation);
        String story = episode.story();
        if (hasEmergencyWarning(story)) {
            String raw = aiTools.triagePatientSymptoms(story, "");
            return new ChatResult(formatTriage(raw), "triage_patient_symptoms", "MCP_TOOL");
        }

        String family = episode.family();
        String primaryQuestion = missingPrimaryQuestion(story, family);
        if (primaryQuestion != null) {
            return new ChatResult(primaryQuestion, null, "CLARIFICATION");
        }
        String courseQuestion = missingCourseQuestion(story);
        if (courseQuestion != null) {
            return new ChatResult(courseQuestion, null, "CLARIFICATION");
        }
        if (!hasAssociatedSymptoms(story)) {
            return new ChatResult(associatedSymptomQuestion(family), null, "CLARIFICATION");
        }

        String raw = normalizeTriageForFamily(aiTools.triagePatientSymptoms(story, ""), family);
        JsonNode triage = json(raw);
        if (triage != null && !triage.path("isEmergency").asBoolean(false)) {
            var recommendation = bookingRecommendations.recommend(text(triage, "specialtyCode", ""));
            if (recommendation.isPresent()) {
                var booking = recommendation.get();
                return new ChatResult(
                        formatTriage(raw) + formatBookingRecommendation(booking),
                        "triage_patient_symptoms", "MCP_TOOL",
                        bookingSupportData(booking, story)
                );
            }
        }
        return new ChatResult(formatTriage(raw), "triage_patient_symptoms", "MCP_TOOL");
    }

    private ChatResult handleAdminChat(String message, String context) {
        String lower = message.toLowerCase(Locale.ROOT);
        if (containsAny(lower, "thống kê", "báo cáo", "doanh thu", "số ca", "lưu lượng", "hiệu suất", "hôm nay", "tuần", "tháng")) {
            String range = lower.contains("tháng") ? "THIS_MONTH"
                    : containsAny(lower, "tuần", "7 ngày") ? "LAST_7_DAYS" : "TODAY";
            String raw = aiTools.getAdminStatistics(range);
            return new ChatResult(formatAdminStatistics(raw), "get_admin_statistics", "MCP_TOOL");
        }
        if (containsAny(lower, "tài khoản", "bị khóa", "đang khóa", "người dùng", "bao nhiêu bệnh nhân", "bao nhiêu bác sĩ", "bao nhiêu thuốc", "danh mục")) {
            String raw = aiTools.getAdminAccountOverview();
            return new ChatResult(formatAdminAccounts(raw), "admin_account_overview", "MCP_TOOL");
        }
        return aiFirstOrInternal(message, "ADMIN", context,
                "Tôi có thể tổng hợp dữ liệu vận hành, tài khoản đang hoạt động hoặc bị khóa, số hồ sơ bệnh nhân, bác sĩ, thuốc và tình hình khám theo ngày, tuần hoặc tháng. Bạn có thể hỏi tự nhiên, chẳng hạn: “Hiện có bao nhiêu tài khoản bị khóa?”");
    }

    private ChatResult handleStaffChat(String message, String context) {
        String lower = message.toLowerCase(Locale.ROOT);
        String code = detectBookingCode(message);
        if (containsAny(lower, "mới nhất", "gần nhất", "hôm nay", "đang chờ", "hàng đợi", "bao nhiêu ca")) {
            String raw = aiTools.getReceptionTodayOverview();
            return new ChatResult(formatReceptionOverview(raw), "reception_today_overview", "MCP_TOOL");
        }
        if (code != null && containsAny(lower, "tiếp đón", "checkin", "check-in", "vừa đến", "có mặt")) {
            String raw = aiTools.receptionCheckin(code);
            return new ChatResult(formatReceptionCheckin(raw, code), "reception_checkin", "MCP_TOOL");
        }
        if (code != null && containsAny(lower, "tra cứu", "kiểm tra", "xem vé", "thông tin", "trạng thái")) {
            String raw = aiTools.verifyBookingCode(code);
            return new ChatResult(formatBooking(raw), "verify_booking_code", "MCP_TOOL");
        }
        if (containsAny(lower, "tìm bệnh nhân", "tra cứu bệnh nhân", "sđt", "số điện thoại", "cccd", "hồ sơ")) {
            String keyword = message.replaceAll("(?i)(tìm bệnh nhân|tra cứu bệnh nhân|sđt|số điện thoại|cccd|hồ sơ|cho tôi|giúp tôi|bệnh nhân)", "").trim();
            if (keyword.isBlank()) {
                return new ChatResult("Bạn cho tôi tên, số điện thoại hoặc CCCD của bệnh nhân cần tra cứu nhé.", null, "CLARIFICATION");
            }
            String raw = aiTools.searchPatient(keyword);
            return new ChatResult(formatPatientSearch(raw, keyword), "search_patient", "MCP_TOOL");
        }
        return aiFirstOrInternal(message, "STAFF", context,
                "Tôi có thể hỗ trợ tra cứu bệnh nhân, kiểm tra vé hẹn, tiếp đón, xem hàng đợi và liệt kê các bệnh nhân mới nhất trong ngày. Bạn cứ hỏi theo cách tự nhiên, tôi sẽ tự chọn dữ liệu phù hợp.");
    }

    private ChatResult handleDoctorChat(String message, String email, String context) {
        String lower = message.toLowerCase(Locale.ROOT);
        String code = detectBookingCode(message);
        if (containsAny(lower, "hôm nay", "hàng đợi", "đang chờ", "bao nhiêu bệnh nhân", "ca khám của tôi", "lịch khám")) {
            String raw = aiTools.getDoctorTodayOverview(email);
            return new ChatResult(formatDoctorOverview(raw), "doctor_today_overview", "MCP_TOOL");
        }
        if (containsAny(lower, "thuốc", "kê đơn", "biệt dược", "hoạt chất")) {
            String keyword = message.replaceAll("(?i)(tra cứu thuốc|tìm thuốc|kê đơn|hỏi về thuốc|thông tin thuốc|thuốc)", "").trim();
            if (keyword.isBlank()) return new ChatResult("Bác sĩ vui lòng cho biết tên thuốc hoặc hoạt chất cần tra cứu.", null, "CLARIFICATION");
            String raw = aiTools.doctorConsultMedicines(keyword);
            return new ChatResult(formatMedicines(raw, keyword), "doctor_consult_medicines", "MCP_TOOL");
        }
        if (containsAny(lower, "tóm tắt", "bệnh án", "tiền sử", "ca khám")) {
            String target = code != null ? code : message.replaceAll("(?i)(tóm tắt bệnh án|tiền sử|cho tôi|ca khám|mã)", "").trim();
            if (target.isBlank()) return new ChatResult("Bác sĩ vui lòng cung cấp mã lịch hẹn hoặc mã đặt khám cần tóm tắt.", null, "CLARIFICATION");
            String raw = aiTools.doctorSummarizePatient(target);
            return new ChatResult(formatDoctorSummary(raw), "doctor_summarize_patient", "MCP_TOOL");
        }
        if (looksLikeSymptomTriage(lower)) {
            String raw = aiTools.triagePatientSymptoms(message, "");
            return new ChatResult(formatTriageForDoctor(raw), "triage_patient_symptoms", "MCP_TOOL");
        }
        return aiFirstOrInternal(message, "DOCTOR", context,
                "Tôi có thể hỗ trợ bác sĩ xem tải khám hôm nay, tóm tắt bệnh án theo mã, tra cứu danh mục thuốc và phân tích triệu chứng để tham khảo chuyên khoa. Vui lòng nêu câu hỏi hoặc mã ca khám cụ thể.");
    }

    private ChatResult aiFirstOrInternal(String message, String role, String context, String fallback) {
        var aiAnswer = generalAssistant.answerDetailed(message, role, context);
        if (aiAnswer.isPresent()) {
            return new ChatResult(aiAnswer.get().text(), null, aiAnswer.get().source());
        }
        var ragAnswer = knowledgeRag.retrieve(message);
        return ragAnswer
                .map(answer -> new ChatResult(answer.text() + "\n\nNguồn: dữ liệu hướng dẫn nội bộ MedSched.", "internal_rag_retrieval", "INTERNAL_RAG"))
                .orElseGet(() -> new ChatResult(fallback, null, "LOCAL_ASSISTANT"));
    }

    private record ChatResult(String reply, String tool, String source, Object data) {
        private ChatResult(String reply, String tool, String source) {
            this(reply, tool, source, null);
        }
    }
    private record PatientEpisode(String story, String family) {}

    private PatientEpisode collectPatientEpisode(String context, String currentMessage,
                                                  String currentFamily, boolean continuation) {
        List<String> priorUsers = contextMessages(context, "[USER] ");
        String family = currentFamily;
        int start = priorUsers.size();

        if (currentFamily != null) {
            for (int i = priorUsers.size() - 1; i >= 0; i--) {
                String priorFamily = explicitSymptomFamily(priorUsers.get(i).toLowerCase(Locale.ROOT));
                if (priorFamily != null) {
                    if (priorFamily.equals(currentFamily)) start = i;
                    break;
                }
            }
        } else if (continuation) {
            for (int i = priorUsers.size() - 1; i >= 0; i--) {
                String priorFamily = explicitSymptomFamily(priorUsers.get(i).toLowerCase(Locale.ROOT));
                if (priorFamily != null) {
                    family = priorFamily;
                    start = i;
                    break;
                }
            }
        }

        if (family == null) family = "GENERAL";
        List<String> episode = new ArrayList<>();
        if (start < priorUsers.size()) episode.addAll(priorUsers.subList(start, priorUsers.size()));
        episode.add(currentMessage.trim());
        return new PatientEpisode(String.join("; ", episode), family);
    }

    private List<String> contextMessages(String context, String prefix) {
        List<String> messages = new ArrayList<>();
        if (context == null || context.isBlank()) return messages;
        for (String line : context.split("\\R")) {
            if (line.startsWith(prefix)) messages.add(line.substring(prefix.length()).trim());
        }
        return messages;
    }

    private String lastContextMessage(String context, String prefix) {
        List<String> messages = contextMessages(context, prefix);
        return messages.isEmpty() ? "" : messages.get(messages.size() - 1);
    }

    private String explicitSymptomFamily(String lower) {
        String positive = normalizeForMatching(lower);
        for (String symptom : List.of("sot", "kho tho", "ho", "dau hong", "dau dau", "dau bung",
                "dau nguc", "dau rang", "ngua", "noi man", "phat ban")) {
            positive = positive
                    .replace("khong " + symptom, "")
                    .replace("khong bi " + symptom, "")
                    .replace("khong co " + symptom, "")
                    .replace("chua " + symptom, "")
                    .replace("chua bi " + symptom, "");
        }
        if (positive.contains("dau dau") || positive.contains("nhuc dau")) return "HEADACHE";
        if (positive.contains("dau bung")) return "ABDOMINAL";
        if (positive.contains("dau nguc") || positive.contains("tuc nguc")) return "CHEST";
        if (positive.contains("dau rang") || positive.contains("nhuc rang") || positive.contains("buot rang")) return "DENTAL";
        if (containsAny(positive, "ngua da", "noi man", "phat ban", "me day")) return "SKIN";
        if (containsAny(positive, "ho khan", "ho co dom", "kho tho", "dau hong", "sot")) return "RESPIRATORY";
        return null;
    }

    private boolean isLikelyClinicalAnswer(String lower, String lastAssistant) {
        if (lastAssistant == null || lastAssistant.isBlank() || !isClarificationQuestion(lastAssistant)) return false;
        boolean meaningfulDetail = containsAny(lower, "bên trái", "bên phải", "ở giữa", "trên rốn", "dưới rốn", "quanh rốn",
                "thượng vị", "hạ sườn", "hố chậu", "nửa đầu", "cả đầu", "trán", "thái dương", "sau gáy",
                "hàm trên", "hàm dưới", "ở cổ", "cổ", "mặt", "tay", "chân", "lưng", "toàn thân",
                "âm ỉ", "nhói", "quặn", "buốt", "nóng rát", "bóp nghẹt", "đè nặng",
                "liên tục", "từng cơn", "đột ngột", "tăng dần", "nhẹ", "vừa", "nặng", "dữ dội",
                "có sốt", "không sốt", "buồn nôn", "không nôn", "khó thở", "không có", "không kèm", "có kèm");
        boolean measuredDetail = Pattern.compile("\\b\\d+\\s*(phút|giờ|ngày|tuần|tháng|/\\s*10|độ)\\b",
                Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE).matcher(lower).find();
        return meaningfulDetail || measuredDetail;
    }

    private boolean isClarificationQuestion(String text) {
        String lower = text.toLowerCase(Locale.ROOT);
        return text.contains("?") && containsAny(lower, "vị trí", "cảm giác", "bắt đầu", "mức độ", "đi kèm",
                "đau", "sốt", "ho", "triệu chứng", "tổn thương", "vùng nào", "bao lâu", "0 đến 10");
    }

    private String missingPrimaryQuestion(String story, String family) {
        String lower = story.toLowerCase(Locale.ROOT);
        boolean location = hasLocation(lower, family);
        boolean quality = hasQuality(lower, family);
        if (location && quality) return null;
        if (!location && !quality) return switch (family) {
            case "HEADACHE" -> "Bạn đau nửa đầu, cả đầu hay rõ ở vị trí nào như trán, thái dương hoặc sau gáy? Cảm giác đau là nhói, giật theo nhịp, âm ỉ hay siết chặt?";
            case "ABDOMINAL" -> "Bạn đau ở trên rốn, quanh rốn, dưới rốn, bên trái hay bên phải? Cơn đau âm ỉ, quặn từng cơn, nóng rát hay đau nhói?";
            case "CHEST" -> "Bạn đau giữa ngực hay lệch bên nào? Cảm giác là đè nặng, bóp nghẹt, nóng rát hay đau nhói?";
            case "DENTAL" -> "Bạn đau răng nào, thuộc hàm trên hay hàm dưới, bên trái hay bên phải? Cơn đau âm ỉ, đau khi nhai, buốt nóng lạnh hay kèm sưng nướu?";
            case "SKIN" -> "Tổn thương nằm ở vùng nào và có dạng mảng đỏ, mụn nước, sưng, bong tróc hay mề đay?";
            case "RESPIRATORY" -> "Bạn đã đo nhiệt độ chưa? Nếu ho, đó là ho khan hay có đờm và bạn có thấy khó thở không?";
            default -> "Bạn khó chịu ở vị trí nào và cảm giác cụ thể ra sao, chẳng hạn âm ỉ, nhói, nóng rát, ngứa hay co thắt?";
        };
        if (!location) return locationQuestion(family);
        return qualityQuestion(family);
    }

    private boolean hasLocation(String lower, String family) {
        return switch (family) {
            case "HEADACHE" -> containsAny(lower, "nửa đầu", "cả đầu", "trán", "thái dương", "sau gáy", "đỉnh đầu", "bên trái", "bên phải");
            case "ABDOMINAL" -> containsAny(lower, "trên rốn", "dưới rốn", "hạ sườn", "thượng vị", "hố chậu", "bên trái", "bên phải", "quanh rốn");
            case "CHEST" -> containsAny(lower, "bên trái", "bên phải", "giữa ngực", "sau xương ức");
            case "DENTAL" -> containsAny(lower, "răng hàm", "răng cửa", "hàm trên", "hàm dưới", "bên trái", "bên phải", "răng số");
            case "SKIN" -> containsAny(lower, "tay", "chân", "mặt", "lưng", "bụng", "toàn thân", "cổ", "ngực");
            case "RESPIRATORY" -> true;
            default -> containsAny(lower, "đầu", "bụng", "ngực", "lưng", "tay", "chân", "mặt", "cổ", "răng", "họng");
        };
    }

    private boolean hasQuality(String lower, String family) {
        return switch (family) {
            case "SKIN" -> containsAny(lower, "mụn nước", "mảng đỏ", "sưng", "bong tróc", "mề đay", "ngứa", "rát");
            case "RESPIRATORY" -> containsAny(lower, "ho khan", "ho đờm", "có đờm", "khó thở", "đau họng", "sổ mũi", "độ c");
            default -> containsAny(lower, "giật", "nhói", "âm ỉ", "siết", "quặn", "buốt", "nóng rát", "bóp nghẹt", "đè nặng", "đau khi nhai");
        };
    }

    private String locationQuestion(String family) {
        return switch (family) {
            case "HEADACHE" -> "Bạn đau nửa đầu, cả đầu hay rõ ở vị trí nào như trán, thái dương hoặc sau gáy?";
            case "ABDOMINAL" -> "Bạn đau ở trên rốn, quanh rốn, dưới rốn, bên trái hay bên phải?";
            case "CHEST" -> "Bạn đau giữa ngực hay lệch bên trái hoặc bên phải?";
            case "DENTAL" -> "Bạn đau răng nào, thuộc hàm trên hay hàm dưới, bên trái hay bên phải?";
            case "SKIN" -> "Tổn thương nằm ở vùng nào trên cơ thể?";
            default -> "Bạn khó chịu rõ nhất ở vị trí nào?";
        };
    }

    private String qualityQuestion(String family) {
        return switch (family) {
            case "SKIN" -> "Tổn thương có dạng mảng đỏ, mụn nước, sưng, bong tróc hay mề đay?";
            case "RESPIRATORY" -> "Nếu ho, đó là ho khan hay có đờm; bạn có đau họng hoặc khó thở không?";
            case "DENTAL" -> "Cơn đau âm ỉ, đau khi nhai, buốt nóng lạnh hay có sưng nướu?";
            default -> "Cảm giác khó chịu là âm ỉ, nhói, quặn, nóng rát, siết chặt hay theo kiểu nào khác?";
        };
    }

    private String missingCourseQuestion(String story) {
        String lower = story.toLowerCase(Locale.ROOT);
        boolean duration = Pattern.compile("\\b\\d+\\s*(phút|giờ|ngày|tuần|tháng)\\b", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE)
                .matcher(lower).find() || containsAny(lower, "hôm nay", "hôm qua", "sáng nay", "đêm qua", "mới bị", "lâu rồi");
        boolean pattern = containsAny(lower, "đột ngột", "tăng dần", "liên tục", "từng cơn", "thỉnh thoảng", "khi ăn", "khi vận động");
        boolean severity = Pattern.compile("\\b([0-9]|10)\\s*/\\s*10\\b").matcher(lower).find()
                || containsAny(lower, "nhẹ", "vừa", "nặng", "dữ dội", "rất đau");
        List<String> questions = new ArrayList<>();
        if (!duration) questions.add("Triệu chứng bắt đầu từ khi nào");
        if (!pattern) questions.add("xuất hiện đột ngột hay tăng dần, liên tục hay từng cơn");
        if (!severity) questions.add("mức độ khó chịu từ 0 đến 10 là bao nhiêu");
        if (questions.isEmpty()) return null;
        return "Cảm ơn bạn. " + String.join("; ", questions) + "?";
    }

    private boolean hasAssociatedSymptoms(String story) {
        String lower = story.toLowerCase(Locale.ROOT);
        return containsAny(lower, "buồn nôn", "nôn", "sốt", "chóng mặt", "mờ mắt", "nhìn mờ", "sợ ánh sáng", "tê", "yếu", "khó thở", "cứng cổ", "phát ban", "tiêu chảy", "không kèm", "không có triệu chứng", "không sốt", "không nôn");
    }

    private String associatedSymptomQuestion(String family) {
        return switch (family) {
            case "HEADACHE" -> "Bạn có kèm buồn nôn, nôn, sốt, chóng mặt, nhìn mờ, sợ ánh sáng, tê yếu tay chân hoặc cứng cổ không? Gần đây bạn có bị va đập đầu không?";
            case "ABDOMINAL" -> "Bạn có kèm sốt, buồn nôn, nôn, tiêu chảy, táo bón, tiểu buốt hoặc đi ngoài ra máu không? Nếu có khả năng mang thai, bạn cũng vui lòng cho biết.";
            case "CHEST" -> "Bạn có khó thở, vã mồ hôi, buồn nôn, chóng mặt hoặc đau lan ra tay, lưng hay hàm không? Cơn đau có tăng khi vận động không?";
            default -> "Bạn có triệu chứng nào đi kèm như sốt, buồn nôn, chóng mặt, khó thở, tê yếu, phát ban hoặc chảy máu không? Nếu không có, bạn hãy trả lời “không có triệu chứng kèm theo”.";
        };
    }

    private boolean hasEmergencyWarning(String story) {
        String lower = story.toLowerCase(Locale.ROOT);
        return containsAny(lower, "khó thở dữ dội", "không thở được", "đau ngực dữ dội", "ngất", "co giật",
                "liệt", "méo miệng", "nói khó", "lú lẫn", "đau đầu dữ dội nhất", "chảy máu không cầm", "nôn ra máu");
    }

    private String detectBookingCode(String message) {
        Matcher matcher = Pattern.compile("(MED[-]?\\d+|WALK[-_]?\\d+|A-\\d+|W-\\d+)", Pattern.CASE_INSENSITIVE).matcher(message);
        return matcher.find() ? matcher.group(1).toUpperCase(Locale.ROOT) : null;
    }

    private boolean containsAny(String value, String... needles) {
        String normalizedValue = normalizeForMatching(value);
        for (String needle : needles) {
            if (normalizedValue.contains(normalizeForMatching(needle))) return true;
        }
        return false;
    }

    private String normalizeForMatching(String value) {
        String decomposed = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD);
        return decomposed.replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replace('đ', 'd')
                .replaceAll("[^a-z0-9/]+", " ")
                .strip();
    }

    private JsonNode json(String raw) {
        try {
            return objectMapper.readTree(raw);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String text(JsonNode node, String field, String fallback) {
        if (node == null || !node.hasNonNull(field)) return fallback;
        String value = node.get(field).asText();
        return value.isBlank() || "null".equalsIgnoreCase(value) ? fallback : value;
    }

    private String formatTriage(String raw) {
        JsonNode node = json(raw);
        if (node == null || !node.isObject()) return raw;
        boolean emergency = node.path("isEmergency").asBoolean(false);
        StringBuilder reply = new StringBuilder();
        if (emergency) {
            reply.append("Dấu hiệu bạn mô tả có thể cần được đánh giá khẩn cấp. ")
                    .append(text(node, "emergencyWarning", "Hãy gọi 115 hoặc đến cơ sở cấp cứu gần nhất ngay.")).append("\n\n");
        } else {
            reply.append("Cảm ơn bạn đã cung cấp đủ thông tin. Dựa trên mô tả hiện tại, bạn nên được khám tại **")
                    .append(text(node, "specialtyName", "chuyên khoa phù hợp")).append("**.\n\n");
        }
        String clinical = text(node, "clinicalSummary", "Các triệu chứng đã được ghi nhận để bác sĩ đánh giá trực tiếp.");
        clinical = clinical.replaceFirst("(?i)^Triệu chứng ghi nhận:\\s*", "");
        int suggestionIndex = clinical.indexOf(" | Đề xuất:");
        if (suggestionIndex >= 0) clinical = clinical.substring(0, suggestionIndex);
        if (clinical.length() > 280) clinical = clinical.substring(0, 277) + "...";
        reply.append("Thông tin đã ghi nhận: ").append(clinical).append("\n")
                .append("Dịch vụ gợi ý: ").append(text(node, "recommendedService", "Khám chuyên khoa")).append("\n")
                .append("Chi phí tham khảo: ").append(text(node, "estimatedFee", "Liên hệ phòng khám")).append("\n")
                .append("Chuẩn bị trước khám: ").append(text(node, "preparationAdvice", "Mang theo hồ sơ và danh sách thuốc đang sử dụng."))
                .append("\n\nĐây là hướng dẫn sàng lọc ban đầu, không thay thế chẩn đoán trực tiếp của bác sĩ.");
        return reply.toString();
    }

    private String normalizeTriageForFamily(String raw, String family) {
        JsonNode parsed = json(raw);
        if (!(parsed instanceof ObjectNode node)) return raw;
        String specialtyCode = text(node, "specialtyCode", "").toUpperCase(Locale.ROOT);
        if (java.util.Set.of("DERMATOLOGY", "ODONTO_STOMATOLOGY", "OPHTHALMOLOGY",
                "PEDIATRICS", "INTERNAL_MEDICINE", "EMERGENCY").contains(specialtyCode)) {
            return raw;
        }
        // Chỉ dùng ánh xạ xác định khi nhà cung cấp AI thiếu hoặc trả mã ngoài danh mục MedSched.
        switch (family) {
            case "SKIN" -> applySpecialty(node, "DERMATOLOGY", "Chuyên Khoa Da Liễu",
                    "Gói Khám & Soi Da Kỹ Thuật Số", "250.000 VNĐ");
            case "DENTAL" -> applySpecialty(node, "ODONTO_STOMATOLOGY", "Chuyên Khoa Răng Hàm Mặt",
                    "Gói Khám Răng Toàn Diện & Chụp X-Quang Răng", "150.000 VNĐ");
            case "HEADACHE", "ABDOMINAL", "CHEST", "RESPIRATORY" -> applySpecialty(node,
                    "INTERNAL_MEDICINE", "Khoa Nội Tổng Quát",
                    "Gói Khám Nội Khoa & Tư Vấn Sức Khỏe Toàn Diện", "200.000 VNĐ");
            default -> { return raw; }
        }
        try {
            return objectMapper.writeValueAsString(node);
        } catch (Exception ignored) {
            return raw;
        }
    }

    private void applySpecialty(ObjectNode node, String code, String name, String service, String fee) {
        node.put("specialtyCode", code);
        node.put("specialtyName", name);
        node.put("recommendedService", service);
        node.put("estimatedFee", fee);
    }

    private String formatBookingRecommendation(PatientBookingRecommendationService.BookingRecommendation booking) {
        StringBuilder reply = new StringBuilder("\n\nHỗ trợ đặt lịch MedSched:\n")
                .append("• Chuyên khoa phù hợp: ").append(booking.specialtyName()).append("\n");
        if (booking.doctors().isEmpty()) {
            return reply.append("• Hiện chưa có bác sĩ trực được cập nhật cho chuyên khoa này. Bạn vẫn có thể mở trang đặt lịch để xem các lựa chọn mới nhất.")
                    .toString();
        }
        reply.append("• Bác sĩ phù hợp đang nhận lịch:");
        for (var doctor : booking.doctors().stream().limit(3).toList()) {
            reply.append("\n  - ").append(doctorDisplayName(doctor));
            if (doctor.roomNumber() != null && !doctor.roomNumber().isBlank()) {
                reply.append(" — phòng ").append(doctor.roomNumber());
            }
            if (doctor.consultationFee() != null) {
                reply.append(", phí khám ").append(formatVnd(doctor.consultationFee()));
            }
            if (!doctor.availableSlots().isEmpty()) {
                reply.append(". Lịch gần nhất: ").append(doctor.availableSlots().get(0).displayTime());
            } else {
                reply.append(". Chưa có khung giờ trống được công bố");
            }
        }
        reply.append("\n\nBạn có thể bấm “Đặt lịch khám” bên dưới; hệ thống sẽ điền sẵn chuyên khoa, bác sĩ gợi ý và triệu chứng đã cung cấp.");
        return reply.toString();
    }

    private Map<String, Object> bookingSupportData(
            PatientBookingRecommendationService.BookingRecommendation booking, String symptoms) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("type", "PATIENT_BOOKING_SUPPORT");
        data.put("specialtyCode", booking.specialtyCode());
        data.put("specialtyName", booking.specialtyName());
        data.put("specialtyId", booking.specialtyId());
        data.put("symptoms", symptoms);
        data.put("bookingPath", "/booking");
        data.put("doctors", booking.doctors());
        return data;
    }

    private String doctorDisplayName(PatientBookingRecommendationService.DoctorOption doctor) {
        String name = doctor.doctorName() == null || doctor.doctorName().isBlank()
                ? "Bác sĩ chuyên khoa" : doctor.doctorName();
        String title = doctor.academicTitle();
        if (title == null || title.isBlank() || name.toLowerCase(Locale.ROOT).startsWith(title.toLowerCase(Locale.ROOT))) {
            return name;
        }
        return title + " " + name;
    }

    private String formatVnd(long amount) {
        return String.format(Locale.US, "%,d", amount).replace(',', '.') + " VNĐ";
    }

    private String formatTriageForDoctor(String raw) {
        JsonNode node = json(raw);
        if (node == null || !node.isObject()) return raw;
        return "Định hướng lâm sàng: " + text(node, "clinicalSummary", "Chưa đủ dữ kiện.")
                + "\nChuyên khoa phù hợp: " + text(node, "specialtyName", "Chưa xác định")
                + "\nCảnh báo cấp cứu: " + (node.path("isEmergency").asBoolean(false) ? "Có" : "Chưa ghi nhận")
                + "\n\nKết quả chỉ hỗ trợ sàng lọc; bác sĩ cần đối chiếu sinh hiệu, khám thực thể và cận lâm sàng.";
    }

    private String formatAdminAccounts(String raw) {
        JsonNode node = json(raw);
        if (node == null) return raw;
        return "Hiện hệ thống có **" + node.path("totalAccounts").asLong() + " tài khoản**, gồm "
                + node.path("activeAccounts").asLong() + " tài khoản đang hoạt động và **"
                + node.path("lockedAccounts").asLong() + " tài khoản bị khóa**.\n\n"
                + "Dữ liệu danh mục hiện có: " + node.path("patientProfiles").asLong() + " hồ sơ bệnh nhân, "
                + node.path("doctors").asLong() + " hồ sơ bác sĩ và " + node.path("medicines").asLong() + " thuốc.";
    }

    private String formatAdminStatistics(String raw) {
        JsonNode node = json(raw);
        if (node == null) return raw;
        return text(node, "aiSummary", "Đã tổng hợp số liệu phòng khám.")
                + "\n\nChi tiết: " + node.path("completedCount").asLong() + " ca hoàn thành, "
                + node.path("checkedInCount").asLong() + " ca đã check-in, "
                + node.path("inProgressCount").asLong() + " ca đang khám, "
                + node.path("cancelledCount").asLong() + " ca đã hủy. Tỷ lệ hoàn thành: "
                + text(node, "rateCompleted", "0%") + ".";
    }

    private String formatReceptionOverview(String raw) {
        JsonNode node = json(raw);
        if (node == null) return raw;
        StringBuilder reply = new StringBuilder("Hôm nay quầy đã ghi nhận **")
                .append(node.path("totalToday").asLong()).append(" ca**: ")
                .append(node.path("waiting").asLong()).append(" ca đang chờ, ")
                .append(node.path("inProgress").asLong()).append(" ca đang khám và ")
                .append(node.path("completed").asLong()).append(" ca đã hoàn thành.");
        JsonNode recent = node.path("recentPatients");
        if (recent.isArray() && !recent.isEmpty()) {
            reply.append("\n\nCác bệnh nhân mới nhất:");
            for (JsonNode item : recent) {
                reply.append("\n• ").append(text(item, "patientName", "Chưa rõ tên"))
                        .append(" — mã ").append(text(item, "bookingCode", "N/A"))
                        .append(", số ").append(text(item, "queueNumber", "N/A"))
                        .append(" (").append(vietnameseStatus(text(item, "status", "N/A"))).append(")");
            }
        }
        return reply.toString();
    }

    private String formatDoctorOverview(String raw) {
        JsonNode node = json(raw);
        if (node == null) return raw;
        return "Bác sĩ " + text(node, "doctorName", "") + " có **" + node.path("totalToday").asLong()
                + " ca được ghi nhận hôm nay**: " + node.path("waiting").asLong() + " ca đang chờ, "
                + node.path("inProgress").asLong() + " ca đang khám, " + node.path("waitingForLab").asLong()
                + " ca chờ kết quả xét nghiệm và " + node.path("completed").asLong() + " ca đã hoàn thành.";
    }

    private String formatReceptionCheckin(String raw, String code) {
        JsonNode node = json(raw);
        if (node == null) return raw;
        String status = text(node, "status", "");
        if ("SUCCESS".equals(status)) {
            return "Đã tiếp đón thành công **" + text(node, "patientName", "bệnh nhân") + "** với mã " + code
                    + ". Số thứ tự: **" + text(node, "queueNumber", "đang cấp") + "**, phòng khám: "
                    + text(node, "doctorRoom", "đang điều phối") + ".";
        }
        if ("ALREADY_CHECKED_IN".equals(status)) {
            return "Bệnh nhân **" + text(node, "patientName", "") + "** đã được tiếp đón trước đó, số thứ tự "
                    + text(node, "queueNumber", "N/A") + ", phòng " + text(node, "doctorRoom", "đang điều phối") + ".";
        }
        return text(node, "message", raw);
    }

    private String formatBooking(String raw) {
        JsonNode node = json(raw);
        if (node == null) return raw;
        return "Thông tin vé **" + text(node, "bookingCode", "N/A") + "**:\n"
                + "• Bệnh nhân: " + text(node, "patientName", "N/A") + "\n"
                + "• Số thứ tự: " + text(node, "queueNumber", "N/A") + "\n"
                + "• Phòng khám: " + text(node, "doctorRoom", "Đang điều phối") + "\n"
                + "• Trạng thái: " + vietnameseStatus(text(node, "status", "N/A"));
    }

    private String formatPatientSearch(String raw, String keyword) {
        JsonNode node = json(raw);
        if (node == null || !node.isArray()) return raw;
        if (node.isEmpty()) return "Không tìm thấy bệnh nhân phù hợp với “" + keyword + "”.";
        StringBuilder reply = new StringBuilder("Tìm thấy ").append(node.size()).append(" hồ sơ phù hợp:");
        for (JsonNode item : node) {
            reply.append("\n• **").append(text(item, "fullName", "Chưa rõ tên")).append("**")
                    .append(" — SĐT: ").append(text(item, "phone", "chưa cập nhật"));
            if (item.hasNonNull("latestBookingCode")) {
                reply.append(", vé gần nhất: ").append(text(item, "latestBookingCode", "N/A"))
                        .append(" (").append(vietnameseStatus(text(item, "latestStatus", "N/A"))).append(")");
            }
        }
        return reply.toString();
    }

    private String formatDoctorSummary(String raw) {
        JsonNode node = json(raw);
        if (node == null) return raw;
        return "Tóm tắt bệnh án của **" + text(node, "patientName", "bệnh nhân") + "**:\n"
                + "• Triệu chứng: " + text(node, "symptoms", "Chưa ghi nhận") + "\n"
                + "• Tiền sử: " + text(node, "medicalHistory", "Chưa ghi nhận") + "\n"
                + "• Đánh giá hỗ trợ: " + text(node, "aiClinicalAssessment", "Chưa đủ dữ kiện") + "\n"
                + "• Chuyên khoa gợi ý: " + text(node, "suggestedSpecialty", "Chưa xác định") + "\n"
                + "• Lưu ý: " + text(node, "doctorClinicalAdvice", "Cần thăm khám trực tiếp.");
    }

    private String formatMedicines(String raw, String keyword) {
        JsonNode node = json(raw);
        if (node == null || !node.isArray()) return raw;
        if (node.isEmpty()) return "Không tìm thấy thuốc phù hợp với “" + keyword + "” trong danh mục.";
        StringBuilder reply = new StringBuilder("Các thuốc phù hợp với “").append(keyword).append("”:");
        for (JsonNode item : node) {
            reply.append("\n• **").append(text(item, "name", "Không rõ tên")).append("**")
                    .append(" — hoạt chất: ").append(text(item, "activeIngredient", "chưa cập nhật"))
                    .append(", đơn vị: ").append(text(item, "unit", "N/A"));
        }
        reply.append("\n\nCần đối chiếu dị ứng, bệnh nền, chức năng gan thận và phác đồ trước khi kê đơn.");
        return reply.toString();
    }

    private String vietnameseStatus(String status) {
        return switch (status) {
            case "PENDING" -> "chờ xác nhận";
            case "CONFIRMED" -> "đã xác nhận";
            case "CHECKED_IN" -> "đang chờ khám";
            case "IN_PROGRESS" -> "đang khám";
            case "WAITING_FOR_LAB_RESULTS" -> "chờ kết quả xét nghiệm";
            case "COMPLETED" -> "đã hoàn thành";
            case "CANCELLED" -> "đã hủy";
            case "MISSED_NO_SHOW" -> "vắng mặt";
            default -> status;
        };
    }

    private boolean looksLikeSymptomTriage(String lower) {
        return lower.contains("đau") || lower.contains("nhức") || lower.contains("sốt") || lower.contains("khó chịu")
                || lower.contains("ho") || lower.contains("ngứa") || lower.contains("buốt") || lower.contains("chóng mặt")
                || lower.contains("buồn nôn") || lower.contains("khám gì") || lower.contains("triệu chứng");
    }

    private String authenticatedRole() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        if (auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) return "ADMIN";
        if (auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_DOCTOR"))) return "DOCTOR";
        if (auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_STAFF"))) return "STAFF";
        return "PATIENT";
    }

    private boolean isToolAllowed(String toolName, String role) {
        if (toolName == null) return false;
        if ("ADMIN".equals(role)) return true;
        if ("STAFF".equals(role)) return List.of("reception_checkin", "verify_booking_code", "search_patient", "lookup_doctor_directory", "get_available_time_slots").contains(toolName);
        if ("DOCTOR".equals(role)) return List.of("doctor_summarize_patient", "doctor_consult_medicines", "lookup_doctor_directory", "get_available_time_slots", "triage_patient_symptoms").contains(toolName);
        return "triage_patient_symptoms".equals(toolName) || "lookup_doctor_directory".equals(toolName) || "get_available_time_slots".equals(toolName);
    }

    private Map<String, Object> chatError(String message) {
        Map<String, Object> result = new HashMap<>();
        result.put("reply", message);
        result.put("executedTool", null);
        result.put("toolResult", null);
        return result;
    }

    private Map<String, Object> errorBody(String message) {
        return Map.of("message", message);
    }
}
