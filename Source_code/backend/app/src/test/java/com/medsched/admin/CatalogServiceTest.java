package com.medsched.admin;

import com.medsched.persistence.entity.MedicalCenterEntity;
import com.medsched.persistence.entity.ServiceEntity;
import com.medsched.persistence.entity.SpecialtyEntity;
import com.medsched.persistence.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CatalogServiceTest {

    @Mock
    private MedicalCenterJpaRepository medicalCenters;
    @Mock
    private SpecialtyJpaRepository specialties;
    @Mock
    private ServiceJpaRepository services;
    @Mock
    private DoctorJpaRepository doctors;
    @Mock
    private UserJpaRepository users;

    private CatalogService catalogService;

    @BeforeEach
    void setUp() {
        catalogService = new CatalogService(medicalCenters, specialties, services, doctors, users);
    }

    @Test
    @DisplayName("Quản lý cơ sở y tế: liệt kê và tạo mới")
    void givenMedicalCenter_whenListAndCreate_thenSuccess() {
        MedicalCenterEntity center = new MedicalCenterEntity("c-1", "MC01", "Benh vien A", "Ha Noi", "0243123456", true, Instant.now(), Instant.now());
        given(medicalCenters.findAll()).willReturn(List.of(center));
        given(medicalCenters.findByCode("MC02")).willReturn(Optional.empty());
        given(medicalCenters.save(any())).willAnswer(inv -> inv.getArgument(0));

        var list = catalogService.listCenters();
        assertThat(list).hasSize(1);
        assertThat(list.get(0).name()).isEqualTo("Benh vien A");

        var req = new CatalogDtos.MedicalCenterRequest("MC02", "Benh vien B", "Da Nang", "0236123456");
        var created = catalogService.createCenter(req, "admin-1");
        assertThat(created.name()).isEqualTo("Benh vien B");
        verify(medicalCenters).save(any());
    }

    @Test
    @DisplayName("Quản lý chuyên khoa và dịch vụ khám")
    void givenSpecialtyAndService_whenManage_thenSuccess() {
        MedicalCenterEntity center = new MedicalCenterEntity("c-1", "MC01", "BV A", "HN", "024", true, Instant.now(), Instant.now());
        SpecialtyEntity spec = new SpecialtyEntity("sp-1", "c-1", "Khoa Tim Mach", "CARDIO", "Khoa tim", null, Instant.now(), Instant.now());
        ServiceEntity srv = new ServiceEntity("srv-1", "sp-1", "Sieu am tim", "ECHO", "Do tim", BigDecimal.valueOf(500000), 30, Instant.now(), Instant.now());

        given(specialties.findByMedicalCenterId("c-1")).willReturn(List.of(spec));
        given(services.findBySpecialtyIdAndActiveTrue("sp-1")).willReturn(List.of(srv));
        given(specialties.findById("sp-1")).willReturn(Optional.of(spec));
        given(medicalCenters.findById("c-1")).willReturn(Optional.of(center));

        var specs = catalogService.listSpecialties("c-1");
        assertThat(specs).hasSize(1);
        assertThat(specs.get(0).name()).isEqualTo("Khoa Tim Mach");

        var srvs = catalogService.listServices("sp-1");
        assertThat(srvs).hasSize(1);
        assertThat(srvs.get(0).name()).isEqualTo("Sieu am tim");
    }
}
