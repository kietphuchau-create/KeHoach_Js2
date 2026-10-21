package com.medsched.common;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Endpoint kiểm tra tình trạng sống của hệ thống (Liveness Health Check).
 * Phản hồi siêu tốc trong 1ms với mã HTTP 200 OK, chuyên dụng cho UptimeRobot / Render Keep-Alive.
 */
@RestController
public class HealthController {

    @GetMapping({"/", "/health", "/api/health", "/api/v1/health"})
    public ResponseEntity<Map<String, Object>> checkHealth() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "MedSched Healthcare Backend API",
                "timestamp", Instant.now().toString(),
                "code", 200
        ));
    }
}
