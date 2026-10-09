package com.medsched.app.adapter.in.web;

import com.medsched.core.port.out.AiTriagePort;
import com.medsched.core.port.out.TriageEvaluation;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class TriageController {

    private final AiTriagePort aiTriagePort;

    public TriageController(AiTriagePort aiTriagePort) {
        this.aiTriagePort = aiTriagePort;
    }

    public record TriageRequest(String symptoms, String medicalHistory) {}

    @PostMapping("/triage")
    public ResponseEntity<Map<String, Object>> triage(@RequestBody TriageRequest request) {
        TriageEvaluation eval = aiTriagePort.evaluateSymptoms(request.symptoms(), request.medicalHistory());

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
}
