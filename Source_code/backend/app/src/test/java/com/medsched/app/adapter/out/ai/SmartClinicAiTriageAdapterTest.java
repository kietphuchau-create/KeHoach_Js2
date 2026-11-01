package com.medsched.app.adapter.out.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SmartClinicAiTriageAdapterTest {

    @Test
    void fallsBackToClinicExpertWhenExternalAiIsUnavailable() {
        OpenRouterAiClient openRouter = mock(OpenRouterAiClient.class);
        when(openRouter.isConfigured()).thenReturn(true);
        when(openRouter.complete(any(), any(), anyDouble(), anyInt(), anyBoolean())).thenReturn(Optional.empty());
        var adapter = new SmartClinicAiTriageAdapter("", "gemini-test", openRouter, new ObjectMapper());

        var result = adapter.evaluateSymptoms("Ngứa da và nổi mẩn đỏ ở cổ", "");

        assertThat(result.specialtyCode()).isEqualTo("DERMATOLOGY");
        assertThat(result.specialtyName()).contains("Da Liễu");
    }

    @Test
    void usesValidStructuredOpenRouterResultBeforeLocalRules() {
        OpenRouterAiClient openRouter = mock(OpenRouterAiClient.class);
        when(openRouter.isConfigured()).thenReturn(true);
        when(openRouter.complete(any(), any(), anyDouble(), anyInt(), anyBoolean())).thenReturn(Optional.of("""
                {"specialtyCode":"OPHTHALMOLOGY","specialtyName":"Chuyên Khoa Mắt",
                "recommendedService":"Khám mắt","estimatedFee":"200.000 VNĐ",
                "clinicalSummary":"Đau đầu kèm nhìn mờ","preparationAdvice":"Mang kính đang dùng",
                "isEmergency":false,"emergencyWarning":null}
                """));
        var adapter = new SmartClinicAiTriageAdapter("", "gemini-test", openRouter, new ObjectMapper());

        var result = adapter.evaluateSymptoms("Đau đầu kèm nhìn mờ", "");

        assertThat(result.specialtyCode()).isEqualTo("OPHTHALMOLOGY");
    }

    @Test
    void emergencyGuardrailRunsBeforeAnyExternalProvider() {
        OpenRouterAiClient openRouter = mock(OpenRouterAiClient.class);
        when(openRouter.isConfigured()).thenReturn(true);
        var adapter = new SmartClinicAiTriageAdapter("", "gemini-test", openRouter, new ObjectMapper());

        var result = adapter.evaluateSymptoms("Đau ngực dữ dội và ngất xỉu", "");

        assertThat(result.isEmergency()).isTrue();
        assertThat(result.specialtyCode()).isEqualTo("EMERGENCY");
    }
}
