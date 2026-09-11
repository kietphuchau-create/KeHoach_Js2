package com.medsched.app.adapter.in.web;

import com.medsched.core.port.out.AiTriagePort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<Map<String, String>> triage(@RequestBody TriageRequest request) {
        String specialty = aiTriagePort.suggestSpecialty(request.symptoms());
        String summary = aiTriagePort.generateClinicalSummary(request.symptoms(), request.medicalHistory());
        return ResponseEntity.ok(Map.of(
                "suggestedSpecialty", specialty,
                "clinicalSummary", summary,
                "disclaimer", "Lưu ý: Kết quả định hướng bởi AI chỉ mang tính tham khảo, vui lòng tham vấn bác sĩ chuyên khoa."
        ));
    }
}
