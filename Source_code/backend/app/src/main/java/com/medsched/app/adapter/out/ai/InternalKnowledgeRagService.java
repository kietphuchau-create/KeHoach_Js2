package com.medsched.app.adapter.out.ai;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/** Local retrieval over reviewed clinic knowledge; no external API/token is required. */
@Service
public class InternalKnowledgeRagService {
    private static final int MAX_ANSWER_CHARS = 900;
    private static final List<String> MEDICAL_TERMS = List.of(
            "benh", "dau", "sot", "ho", "kho tho", "chay mau", "dieu tri", "trieu chung", "suc khoe",
            "thuoc", "kham", "bac si", "chuyen khoa", "xet nghiem", "chuan doan", "cap cuu", "rang",
            "dau mat", "mo mat", "thi luc", "benh da", "da lieu", "noi man", "tim mach", "dau tim", "hoi hop",
            "huyet ap", "da day", "ung thu", "chan thuong", "nhiem trung", "di ung"
    );
    private static final Set<String> QUERY_STOP_WORDS = Set.of(
            "ban", "la", "gi", "co", "cua", "va", "toi", "minh", "cho", "duoc", "khong",
            "do", "thu", "nhat", "tim", "gan", "san"
    );
    private static final List<String> CLINIC_TERMS = List.of(
            "medsched", "dat lich", "lich kham", "lich hen", "gio kham", "khung gio", "gio trong",
            "co so", "chi nhanh", "dia chi", "lien he", "bac si", "chuyen khoa", "dich vu", "gia kham",
            "phi kham", "chi phi", "check in", "check-in", "ma dat lich", "ma hen", "qr", "tiep don",
            "hang doi", "thanh toan", "hoa don", "giao dich", "ho so", "don thuoc", "doi lich", "huy lich"
    );
    private static final List<String> SPECIFIC_MEDICAL_TOPICS = List.of(
            "ung thu", "ung buou", "san khoa", "thai san", "than kinh", "chan thuong", "tai mui hong",
            "benh than", "tiet nieu", "tam than"
    );
    private final List<KnowledgeChunk> staticChunks;
    private final ProjectKnowledgeCatalogService projectCatalog;

    public InternalKnowledgeRagService(ProjectKnowledgeCatalogService projectCatalog) {
        this.staticChunks = loadKnowledgeBase();
        this.projectCatalog = projectCatalog;
    }

    public Optional<Answer> retrieve(String question) {
        if (question == null || question.isBlank()) return Optional.empty();
        String normalizedQuestion = normalize(question);
        List<String> terms = List.of(normalizedQuestion.split("\\s+"));
        return allChunks().stream()
                .map(chunk -> new ScoredChunk(chunk, score(chunk, normalizedQuestion, terms)))
                .filter(item -> item.score() >= 2)
                .max(Comparator.comparingInt(ScoredChunk::score))
                .map(item -> new Answer(limit(item.chunk().answer()), item.chunk().title(), item.score()));
    }

    public boolean isMedicalQuestion(String question) {
        String normalized = " " + normalize(question).replaceAll("[^a-z0-9]+", " ").trim() + " ";
        return MEDICAL_TERMS.stream().anyMatch(term -> normalized.contains(" " + term + " "));
    }

    public boolean isClinicQuestion(String question) {
        String normalized = " " + normalize(question).replaceAll("[^a-z0-9]+", " ").trim() + " ";
        return CLINIC_TERMS.stream().anyMatch(term -> normalized.contains(" " + term.replace('-', ' ') + " "));
    }

    public boolean isUnsupportedMedicalTopic(String question) {
        String normalizedQuestion = " " + normalize(question).replaceAll("[^a-z0-9]+", " ").trim() + " ";
        return SPECIFIC_MEDICAL_TOPICS.stream()
                .filter(topic -> normalizedQuestion.contains(" " + topic + " "))
                .anyMatch(topic -> allChunks().stream().noneMatch(chunk ->
                        (" " + normalize(chunk.title() + " " + chunk.keywords() + " " + chunk.answer())
                                .replaceAll("[^a-z0-9]+", " ").trim() + " ").contains(" " + topic + " ")));
    }

    private List<KnowledgeChunk> allChunks() {
        List<KnowledgeChunk> result = new ArrayList<>(staticChunks);
        for (ProjectKnowledgeCatalogService.Entry entry : projectCatalog.loadPublicEntries()) {
            result.add(new KnowledgeChunk(entry.title(), entry.keywords(), entry.answer()));
        }
        return result;
    }

    private int score(KnowledgeChunk chunk, String question, List<String> terms) {
        int score = 0;
        String keywords = normalize(chunk.keywords());
        String title = normalize(chunk.title());
        Set<String> keywordTokens = tokenSet(keywords);
        Set<String> titleTokens = tokenSet(title);
        for (String term : terms) {
            if (term.length() < 3 || QUERY_STOP_WORDS.contains(term)) continue;
            if (keywordTokens.contains(term)) score += 2;
            if (titleTokens.contains(term)) score += 1;
        }
        if (question.contains(keywords)) score += 3;
        return score;
    }

    private Set<String> tokenSet(String value) {
        return new HashSet<>(List.of(value.replaceAll("[^a-z0-9]+", " ").trim().split("\\s+")));
    }

    private List<KnowledgeChunk> loadKnowledgeBase() {
        List<KnowledgeChunk> result = new ArrayList<>();
        try (var stream = new ClassPathResource("ai/patient-knowledge-base.md").getInputStream();
             var reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String title = null, keywords = "";
            StringBuilder answer = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.startsWith("## ")) {
                    addChunk(result, title, keywords, answer);
                    title = line.substring(3).trim(); keywords = ""; answer = new StringBuilder();
                } else if (line.toLowerCase(Locale.ROOT).startsWith("keywords:")) {
                    keywords = line.substring("keywords:".length()).trim();
                } else if (!line.isBlank()) {
                    if (answer.length() > 0) answer.append('\n');
                    answer.append(line.trim());
                }
            }
            addChunk(result, title, keywords, answer);
        } catch (Exception ignored) { }
        if (result.isEmpty()) result.add(new KnowledgeChunk("Hỗ trợ chung", "phòng khám đặt lịch giờ khám", "Bạn có thể đặt lịch trên MedSched hoặc liên hệ lễ tân để được hỗ trợ."));
        return List.copyOf(result);
    }

    private void addChunk(List<KnowledgeChunk> result, String title, String keywords, StringBuilder answer) {
        if (title != null && !answer.isEmpty()) result.add(new KnowledgeChunk(title, keywords, answer.toString()));
    }

    private String normalize(String value) {
        String decomposed = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD);
        return decomposed.replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).replace('đ', 'd');
    }

    private String limit(String value) { return value.length() <= MAX_ANSWER_CHARS ? value : value.substring(0, MAX_ANSWER_CHARS - 1).strip() + "…"; }

    public record Answer(String text, String source, int relevance) {}
    private record KnowledgeChunk(String title, String keywords, String answer) {}
    private record ScoredChunk(KnowledgeChunk chunk, int score) {}
}
