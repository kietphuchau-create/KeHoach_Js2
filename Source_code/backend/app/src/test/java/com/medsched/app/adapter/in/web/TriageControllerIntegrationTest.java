package com.medsched.app.adapter.in.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medsched.app.adapter.in.ai.MedSchedAiTools;
import com.medsched.app.adapter.out.ai.InternalKnowledgeRagService;
import com.medsched.app.adapter.out.ai.PatientBookingRecommendationService;
import com.medsched.core.port.out.AiTriagePort;
import com.medsched.core.port.out.TriageEvaluation;
import com.medsched.security.AppUserDetailsService;
import com.medsched.security.JwtAuthenticationFilter;
import com.medsched.security.JwtService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.test.context.support.WithMockUser;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = TriageController.class)
@AutoConfigureMockMvc(addFilters = false)
class TriageControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AiTriagePort aiTriagePort;

    @MockBean
    private MedSchedAiTools aiTools;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private AppUserDetailsService appUserDetailsService;

    @MockBean
    private AiRequestGuard aiRequestGuard;

    @MockBean
    private InternalKnowledgeRagService knowledgeRag;

    @MockBean
    private PatientBookingRecommendationService bookingRecommendations;

    @BeforeEach
    void allowAiRequests() {
        given(aiRequestGuard.check(any(), any()))
                .willReturn(new AiRequestGuard.Decision(true, null, 0));
        given(aiRequestGuard.check(any(), any(), any()))
                .willReturn(new AiRequestGuard.Decision(true, null, 0));
    }

    @Test
    @DisplayName("POST /api/ai/triage returns triage analysis")
    void triage_success() throws Exception {
        TriageEvaluation eval = new TriageEvaluation(
                "CARDIO", "Khoa Tim Mạch",
                "Gói Khám Tim", "500,000 VND",
                "Đau thắt ngực", "Nghỉ ngơi",
                false, "Không", "Tham khảo"
        );
        given(aiTriagePort.evaluateSymptoms(eq("Đau ngực"), any())).willReturn(eval);

        TriageController.TriageRequest request = new TriageController.TriageRequest("Đau ngực", "");

        mockMvc.perform(post("/api/ai/triage")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.specialtyCode").value("CARDIO"))
                .andExpect(jsonPath("$.specialtyName").value("Khoa Tim Mạch"))
                .andExpect(jsonPath("$.recommendedService").value("Gói Khám Tim"));
    }

    @Test
    @DisplayName("GET /api/ai/tools returns available AI tool definitions")
    void getTools_success() throws Exception {
        List<Map<String, Object>> tools = List.of(
                Map.of("name", "triage_patient_symptoms", "description", "Triage symptoms"),
                Map.of("name", "lookup_doctor_directory", "description", "Doctor directory")
        );
        given(aiTools.getToolDefinitions()).willReturn(tools);

        mockMvc.perform(get("/api/ai/tools"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("triage_patient_symptoms"))
                .andExpect(jsonPath("$[1].name").value("lookup_doctor_directory"));
    }

    @Test
    @DisplayName("POST /api/ai/tools/execute executes medical tool successfully")
    @WithMockUser(username = "admin@medsched.vn", roles = "ADMIN")
    void executeTool_success() throws Exception {
        given(aiTools.executeTool(eq("verify_booking_code"), any())).willReturn("{\"status\":\"CONFIRMED\"}");

        TriageController.ToolExecuteRequest request = new TriageController.ToolExecuteRequest(
                "verify_booking_code",
                Map.of("bookingCode", "MED-123456")
        );

        mockMvc.perform(post("/api/ai/tools/execute")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.toolName").value("verify_booking_code"))
                .andExpect(jsonPath("$.result").value("{\"status\":\"CONFIRMED\"}"));
    }

    @Test
    @WithMockUser(username = "patient@medsched.vn", roles = "PATIENT")
    @DisplayName("Patient switching symptoms starts a new clarification flow")
    void patientSwitchesSymptomTopic() throws Exception {
        var request = new TriageController.ChatRequest(
                "đau bụng",
                "PATIENT",
                "[USER] Đau răng buốt khi uống nước lạnh\n[ASSISTANT] Bạn đau răng nào?"
        );

        mockMvc.perform(post("/api/ai/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reply").value(org.hamcrest.Matchers.containsString("trên rốn")))
                .andExpect(jsonPath("$.reply").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("răng nào"))));
    }

    @Test
    @WithMockUser(username = "patient@medsched.vn", roles = "PATIENT")
    @DisplayName("Patient is asked only for symptom details that are still missing")
    void patientIsNotAskedAnsweredDetailAgain() throws Exception {
        var request = new TriageController.ChatRequest(
                "bên phải",
                "PATIENT",
                "[USER] Tôi bị đau bụng\n[ASSISTANT] Bạn đau ở vị trí nào và cảm giác ra sao?"
        );

        mockMvc.perform(post("/api/ai/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reply").value(org.hamcrest.Matchers.containsString("Cảm giác")))
                .andExpect(jsonPath("$.reply").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("vị trí nào"))));
    }

    @Test
    @WithMockUser(username = "patient@medsched.vn", roles = "PATIENT")
    @DisplayName("Unrelated patient question is rejected without using an external AI")
    void unrelatedQuestionIsRejected() throws Exception {
        String context = "[USER] Tôi bị đau đầu\n[ASSISTANT] Bạn đau ở vị trí nào?";
        given(knowledgeRag.retrieve(any())).willReturn(java.util.Optional.empty());
        given(knowledgeRag.isMedicalQuestion(any())).willReturn(false);
        var request = new TriageController.ChatRequest("Thủ đô của Nhật Bản là gì?", "PATIENT", context);

        mockMvc.perform(post("/api/ai/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reply").value(org.hamcrest.Matchers.containsString("chỉ hỗ trợ các vấn đề thuộc lĩnh vực y tế")))
                .andExpect(jsonPath("$.answerSource").value("UNRELATED_GUARDRAIL"));
    }

    @Test
    @WithMockUser(username = "patient@medsched.vn", roles = "PATIENT")
    @DisplayName("Negative answer to an early clarification asks for enough detail to book")
    void negativeAnswerWithInsufficientDetailsRequestsBetterDescription() throws Exception {
        String context = "[USER] Tôi bị đau bụng bên phải\n"
                + "[ASSISTANT] Cảm giác khó chịu là âm ỉ, nhói, quặn, nóng rát hay kiểu nào khác?";
        var request = new TriageController.ChatRequest("không gì cả", "PATIENT", context);

        mockMvc.perform(post("/api/ai/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reply").value(org.hamcrest.Matchers.containsString("chưa có đủ thông tin")))
                .andExpect(jsonPath("$.reply").value(org.hamcrest.Matchers.containsString("hỗ trợ bạn đặt lịch ngay")))
                .andExpect(jsonPath("$.answerSource").value("CLARIFICATION"));
    }

    @Test
    @WithMockUser(username = "patient@medsched.vn", roles = "PATIENT")
    @DisplayName("Negative answer after sufficient symptom details proceeds to booking support")
    void negativeAnswerWithEnoughDetailsProceedsToTriage() throws Exception {
        String context = "[USER] Tôi đau bụng bên phải, quặn từng cơn từ 2 ngày nay, mức độ 6/10\n"
                + "[ASSISTANT] Bạn có kèm sốt, buồn nôn, nôn hoặc tiêu chảy không?";
        given(aiTools.triagePatientSymptoms(any(), eq(""))).willReturn("""
                {"specialtyCode":"INTERNAL_MEDICINE","specialtyName":"Khoa Nội Tổng Quát",
                 "clinicalSummary":"Đau bụng bên phải, quặn từng cơn 2 ngày, mức độ 6/10",
                 "recommendedService":"Khám Nội Tổng Quát","estimatedFee":"200.000 VNĐ",
                 "preparationAdvice":"Mang theo hồ sơ cũ","isEmergency":false}
                """);
        given(bookingRecommendations.recommend("INTERNAL_MEDICINE")).willReturn(java.util.Optional.empty());
        var request = new TriageController.ChatRequest("không", "PATIENT", context);

        mockMvc.perform(post("/api/ai/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.executedTool").value("triage_patient_symptoms"))
                .andExpect(jsonPath("$.reply").value(org.hamcrest.Matchers.containsString("Cảm ơn bạn đã cung cấp đủ thông tin")))
                .andExpect(jsonPath("$.answerSource").value("MCP_TOOL"));
    }

    @Test
    @WithMockUser(username = "patient@medsched.vn", roles = "PATIENT")
    @DisplayName("Unsupported medical question reports that MedSched does not treat it")
    void unsupportedMedicalQuestionUsesScopeGuardrail() throws Exception {
        given(knowledgeRag.retrieve(any())).willReturn(java.util.Optional.empty());
        given(knowledgeRag.isMedicalQuestion("MedSched có điều trị ung thư không?")).willReturn(true);
        var request = new TriageController.ChatRequest("MedSched có điều trị ung thư không?", "PATIENT", "");

        mockMvc.perform(post("/api/ai/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reply").value(org.hamcrest.Matchers.containsString("không điều trị")))
                .andExpect(jsonPath("$.answerSource").value("INTERNAL_SCOPE_GUARDRAIL"));
    }

    @Test
    @WithMockUser(username = "patient@medsched.vn", roles = "PATIENT")
    @DisplayName("General chat falls back to reviewed RAG when external AI is unavailable")
    void generalChatFallsBackToInternalRag() throws Exception {
        String question = "Tôi cần chuẩn bị gì trước khi khám?";
        given(knowledgeRag.isClinicQuestion(question)).willReturn(true);
        given(knowledgeRag.retrieve(question)).willReturn(Optional.of(
                new InternalKnowledgeRagService.Answer("Mang theo giấy tờ và hồ sơ khám.", "Chuẩn bị trước khi khám", 5)));

        mockMvc.perform(post("/api/ai/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TriageController.ChatRequest(question, "PATIENT", ""))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answerSource").value("INTERNAL_RAG"))
                .andExpect(jsonPath("$.reply").value(org.hamcrest.Matchers.containsString("Mang theo giấy tờ")));
    }

    @Test
    @WithMockUser(username = "patient@medsched.vn", roles = "PATIENT")
    @DisplayName("Valid LLM specialty is not overwritten by the symptom family")
    void validLlmSpecialtyIsPreserved() throws Exception {
        String symptoms = "Đau đầu bên trái âm ỉ liên tục 2 ngày, mức độ 5/10, kèm nhìn mờ";
        given(aiTools.triagePatientSymptoms(any(), eq(""))).willReturn("""
                {"specialtyCode":"OPHTHALMOLOGY","specialtyName":"Chuyên Khoa Mắt",
                "recommendedService":"Khám mắt","estimatedFee":"200.000 VNĐ",
                "clinicalSummary":"Đau đầu kèm nhìn mờ","preparationAdvice":"Mang kính đang dùng",
                "isEmergency":false,"emergencyWarning":null}
                """);
        given(bookingRecommendations.recommend("OPHTHALMOLOGY")).willReturn(Optional.empty());

        mockMvc.perform(post("/api/ai/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TriageController.ChatRequest(symptoms, "PATIENT", ""))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reply").value(org.hamcrest.Matchers.containsString("Chuyên Khoa Mắt")));
    }
}
