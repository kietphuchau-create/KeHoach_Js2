package com.medsched.app.adapter.out.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Small OpenRouter chat-completions client shared by general chat and medical triage. */
@Service
public class OpenRouterAiClient {
    private static final Logger log = LoggerFactory.getLogger(OpenRouterAiClient.class);

    private final String apiKey;
    private final String model;
    private final String baseUrl;
    private final String siteUrl;
    private final String appName;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public OpenRouterAiClient(
            @Value("${app.openrouter.api-key:${OPENROUTER_API_KEY:}}") String apiKey,
            @Value("${app.openrouter.model:${OPENROUTER_MODEL:openrouter/free}}") String model,
            @Value("${app.openrouter.base-url:${OPENROUTER_BASE_URL:https://openrouter.ai/api/v1}}") String baseUrl,
            @Value("${app.openrouter.site-url:${OPENROUTER_SITE_URL:http://localhost:3000}}") String siteUrl,
            @Value("${app.openrouter.app-name:${OPENROUTER_APP_NAME:MedSched AI}}") String appName,
            ObjectMapper objectMapper) {
        this.apiKey = apiKey == null ? "" : apiKey.strip();
        this.model = model == null || model.isBlank() ? "openrouter/free" : model.strip();
        this.baseUrl = trimTrailingSlash(baseUrl == null ? "https://openrouter.ai/api/v1" : baseUrl.strip());
        this.siteUrl = siteUrl == null ? "" : siteUrl.strip();
        this.appName = appName == null || appName.isBlank() ? "MedSched AI" : appName.strip();
        this.objectMapper = objectMapper;
        var requestFactory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(30));
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    public Optional<String> complete(String systemPrompt, String userPrompt,
                                     double temperature, int maxTokens, boolean jsonMode) {
        if (!isConfigured() || userPrompt == null || userPrompt.isBlank()) return Optional.empty();

        List<Map<String, String>> messages = new ArrayList<>();
        if (systemPrompt != null && !systemPrompt.isBlank()) {
            messages.add(Map.of("role", "system", "content", systemPrompt));
        }
        messages.add(Map.of("role", "user", "content", userPrompt));

        Map<String, Object> request = new LinkedHashMap<>();
        request.put("model", model);
        request.put("messages", messages);
        request.put("temperature", temperature);
        request.put("max_tokens", maxTokens);
        if (jsonMode) request.put("response_format", Map.of("type", "json_object"));

        try {
            var requestSpec = restClient.post()
                    .uri(baseUrl + "/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .header("X-Title", appName)
                    .contentType(MediaType.APPLICATION_JSON);
            if (!siteUrl.isBlank()) requestSpec = requestSpec.header("HTTP-Referer", siteUrl);
            String body = requestSpec.body(request).retrieve().body(String.class);
            return extractText(body);
        } catch (Exception exception) {
            log.warn("OpenRouter unavailable; switching to fallback: {}", exception.getMessage());
            return Optional.empty();
        }
    }

    public boolean isConfigured() {
        return !apiKey.isBlank() && !apiKey.contains("your_") && !apiKey.contains("chua-cau-hinh")
                && !apiKey.contains("demo-");
    }

    public String model() {
        return model;
    }

    private Optional<String> extractText(String body) {
        if (body == null || body.isBlank()) return Optional.empty();
        try {
            JsonNode content = objectMapper.readTree(body).path("choices").path(0).path("message").path("content");
            if (content.isTextual()) {
                String text = content.asText("").strip();
                return text.isBlank() ? Optional.empty() : Optional.of(text);
            }
            if (content.isArray()) {
                StringBuilder result = new StringBuilder();
                for (JsonNode part : content) {
                    String text = part.path("text").asText("").strip();
                    if (!text.isBlank()) {
                        if (!result.isEmpty()) result.append('\n');
                        result.append(text);
                    }
                }
                return result.isEmpty() ? Optional.empty() : Optional.of(result.toString());
            }
        } catch (Exception exception) {
            log.warn("Could not parse OpenRouter response: {}", exception.getMessage());
        }
        return Optional.empty();
    }

    private static String trimTrailingSlash(String value) {
        while (value.endsWith("/")) value = value.substring(0, value.length() - 1);
        return value;
    }
}
