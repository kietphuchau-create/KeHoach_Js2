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

class GeminiGeneralAssistantServiceTest {

    @Test
    void reportsOpenRouterAsTheSourceWhenPrimaryProviderSucceeds() {
        OpenRouterAiClient openRouter = mock(OpenRouterAiClient.class);
        when(openRouter.complete(any(), any(), anyDouble(), anyInt(), anyBoolean()))
                .thenReturn(Optional.of("Câu trả lời từ OpenRouter"));
        var service = new GeminiGeneralAssistantService("", "gemini-test", openRouter, new ObjectMapper());

        var answer = service.answerDetailed("Xin chào", "PATIENT", "");

        assertThat(answer).isPresent();
        assertThat(answer.orElseThrow().source()).isEqualTo("OPENROUTER_API");
    }

    @Test
    void returnsEmptySoCallerCanUseRagWhenAllExternalProvidersAreUnavailable() {
        OpenRouterAiClient openRouter = mock(OpenRouterAiClient.class);
        when(openRouter.complete(any(), any(), anyDouble(), anyInt(), anyBoolean())).thenReturn(Optional.empty());
        var service = new GeminiGeneralAssistantService("", "gemini-test", openRouter, new ObjectMapper());

        assertThat(service.answerDetailed("Giờ khám?", "PATIENT", "")).isEmpty();
    }
}
