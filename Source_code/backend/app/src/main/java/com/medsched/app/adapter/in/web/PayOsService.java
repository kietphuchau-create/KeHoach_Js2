package com.medsched.app.adapter.in.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class PayOsService {

    private static final Logger log = LoggerFactory.getLogger(PayOsService.class);
    private static final String PAYOS_BASE_URL = "https://api-merchant.payos.vn";

    @Value("${payos.client-id:}")
    private String clientId;

    @Value("${payos.api-key:}")
    private String apiKey;

    @Value("${payos.checksum-key:}")
    private String checksumKey;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public PayOsService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder()
                .baseUrl(PAYOS_BASE_URL)
                .build();
    }

    public record PayOsCreateResult(
            long orderCode,
            int amount,
            String description,
            String accountNumber,
            String accountName,
            String bin,
            String checkoutUrl,
            String qrCode,
            String paymentLinkId,
            String status
    ) {}

    public record PayOsPaymentInfo(
            long orderCode,
            int amount,
            String status, // "PAID", "PENDING", "PROCESSING", "CANCELLED"
            String transactionDateTime
    ) {}

    /**
     * Tạo Link Thanh Toán & Mã QR Động qua PayOS API.
     */
    public Optional<PayOsCreateResult> createPaymentLink(long orderCode, int amount, String description,
                                                         String returnUrl, String cancelUrl) {
        if (!isConfigured()) {
            log.warn("PayOS chưa được cấu hình; bỏ qua yêu cầu tạo payment link.");
            return Optional.empty();
        }
        try {
            // PayOS yêu cầu description tối đa 25 ký tự, không dấu
            String safeDesc = sanitizeDescription(description);

            // Tạo chuỗi ký tự sắp xếp theo alphabet: amount={amount}&cancelUrl={cancelUrl}&description={description}&orderCode={orderCode}&returnUrl={returnUrl}
            String dataToSign = "amount=" + amount
                    + "&cancelUrl=" + cancelUrl
                    + "&description=" + safeDesc
                    + "&orderCode=" + orderCode
                    + "&returnUrl=" + returnUrl;

            String signature = calculateHmacSha256(dataToSign, checksumKey);

            Map<String, Object> body = Map.of(
                    "orderCode", orderCode,
                    "amount", amount,
                    "description", safeDesc,
                    "cancelUrl", cancelUrl,
                    "returnUrl", returnUrl,
                    "signature", signature
            );

            String responseBody = restClient.post()
                    .uri("/v2/payment-requests")
                    .header("x-client-id", clientId)
                    .header("x-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseBody);
            String code = root.path("code").asText("");
            if ("00".equals(code)) {
                JsonNode data = root.path("data");
                return Optional.of(new PayOsCreateResult(
                        orderCode,
                        amount,
                        safeDesc,
                        data.path("accountNumber").asText(""),
                        data.path("accountName").asText("CHAU TUAN KIET"),
                        data.path("bin").asText("970452"),
                        data.path("checkoutUrl").asText(""),
                        data.path("qrCode").asText(""),
                        data.path("paymentLinkId").asText(""),
                        data.path("status").asText("PENDING")
                ));
            } else {
                log.warn("PayOS createPaymentLink error: {}", root.path("desc").asText());
            }
        } catch (Exception e) {
            log.error("PayOS createPaymentLink exception: {}", e.getMessage());
        }
        return Optional.empty();
    }

    /**
     * Kiểm tra trạng thái thanh toán từ PayOS qua orderCode (Polling trực tiếp máy chủ PayOS).
     */
    public Optional<PayOsPaymentInfo> getPaymentInfo(long orderCode) {
        if (!isConfigured()) return Optional.empty();
        try {
            String responseBody = restClient.get()
                    .uri("/v2/payment-requests/{orderCode}", orderCode)
                    .header("x-client-id", clientId)
                    .header("x-api-key", apiKey)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseBody);
            String code = root.path("code").asText("");
            if ("00".equals(code)) {
                JsonNode data = root.path("data");
                return Optional.of(new PayOsPaymentInfo(
                        orderCode,
                        data.path("amount").asInt(0),
                        data.path("status").asText("PENDING"),
                        data.path("transactionDateTime").asText("")
                ));
            }
        } catch (Exception e) {
            log.debug("PayOS getPaymentInfo orderCode {}: {}", orderCode, e.getMessage());
        }
        return Optional.empty();
    }

    /**
     * Xác thực tính toàn vẹn chữ ký Webhook từ PayOS.
     */
    public boolean verifyWebhookSignature(Map<String, Object> data, String signature) {
        if (!isConfigured() || data == null || signature == null || signature.isBlank()) {
            return false;
        }
        try {
            // Sắp xếp các trường của object data theo alphabet
            List<String> sortedKeys = new ArrayList<>(data.keySet());
            Collections.sort(sortedKeys);

            StringBuilder sb = new StringBuilder();
            for (String key : sortedKeys) {
                Object val = data.get(key);
                if (val != null) {
                    if (sb.length() > 0) sb.append("&");
                    sb.append(key).append("=").append(val.toString());
                }
            }

            String calculatedSig = calculateHmacSha256(sb.toString(), checksumKey);
            return calculatedSig.equalsIgnoreCase(signature.trim());
        } catch (Exception e) {
            log.warn("PayOS webhook signature verification error: {}", e.getMessage());
            return false;
        }
    }

    public static String calculateHmacSha256(String data, String key) {
        try {
            Mac hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            hmac.init(secretKeySpec);
            byte[] bytes = hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("Lỗi tính toán HMAC-SHA256 cho PayOS", e);
        }
    }

    private String sanitizeDescription(String desc) {
        if (desc == null || desc.isBlank()) return "MEDPAY";
        String clean = desc.replaceAll("[^a-zA-Z0-9 ]", "").trim();
        if (clean.length() > 25) {
            clean = clean.substring(0, 25);
        }
        return clean.isBlank() ? "MEDPAY" : clean;
    }

    private boolean isConfigured() {
        return clientId != null && !clientId.isBlank()
                && apiKey != null && !apiKey.isBlank()
                && checksumKey != null && !checksumKey.isBlank();
    }
}
