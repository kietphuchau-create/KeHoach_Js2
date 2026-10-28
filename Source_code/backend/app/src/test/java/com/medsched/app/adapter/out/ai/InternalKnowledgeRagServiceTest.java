package com.medsched.app.adapter.out.ai;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class InternalKnowledgeRagServiceTest {

    @Test
    void retrievesCurrentPublicProjectDataBeforeReportingNoMatch() {
        ProjectKnowledgeCatalogService catalog = mock(ProjectKnowledgeCatalogService.class);
        given(catalog.loadPublicEntries()).willReturn(List.of(
                new ProjectKnowledgeCatalogService.Entry(
                        "Dịch vụ Khám Da liễu",
                        "dịch vụ da liễu giá phí",
                        "Khám Da liễu có giá 250.000 VNĐ."
                )
        ));
        InternalKnowledgeRagService rag = new InternalKnowledgeRagService(catalog);

        assertThat(rag.retrieve("Giá khám da liễu bao nhiêu?")).isPresent()
                .get().extracting(InternalKnowledgeRagService.Answer::text)
                .asString().contains("250.000 VNĐ");
    }

    @Test
    void distinguishesMedicalQuestionFromUnrelatedQuestion() {
        ProjectKnowledgeCatalogService catalog = mock(ProjectKnowledgeCatalogService.class);
        given(catalog.loadPublicEntries()).willReturn(List.of());
        InternalKnowledgeRagService rag = new InternalKnowledgeRagService(catalog);

        assertThat(rag.isMedicalQuestion("Hệ thống có điều trị ung thư không?")).isTrue();
        assertThat(rag.isMedicalQuestion("Thủ đô Nhật Bản là gì?")).isFalse();
        assertThat(rag.isMedicalQuestion("Tôi đã mua vé rồi")).isFalse();
        assertThat(rag.isMedicalQuestion("Tìm khách sạn gần đây")).isFalse();
        assertThat(rag.isClinicQuestion("Tôi muốn đặt lịch khám")).isTrue();
        assertThat(rag.isClinicQuestion("Tìm khách sạn gần đây")).isFalse();
        assertThat(rag.isUnsupportedMedicalTopic("MedSched có điều trị ung thư không?")).isTrue();
    }

    @Test
    void doesNotMatchAnUnrelatedWordThatIsOnlyAFragmentOfMedicalContent() {
        ProjectKnowledgeCatalogService catalog = mock(ProjectKnowledgeCatalogService.class);
        given(catalog.loadPublicEntries()).willReturn(List.of(
                new ProjectKnowledgeCatalogService.Entry(
                        "Dịch vụ Khám Da liễu",
                        "dịch vụ da liễu khám cơ bản tư vấn bệnh da nổi mẩn đỏ tim mạch",
                        "Khám Da liễu cơ bản."
                )
        ));
        InternalKnowledgeRagService rag = new InternalKnowledgeRagService(catalog);

        assertThat(rag.retrieve("Thủ đô Nhật Bản là gì?")).isEmpty();
        assertThat(rag.retrieve("Tìm khách sạn gần đây")).isEmpty();
    }
}
