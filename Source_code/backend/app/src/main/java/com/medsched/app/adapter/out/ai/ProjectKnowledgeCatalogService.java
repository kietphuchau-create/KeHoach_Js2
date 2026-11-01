package com.medsched.app.adapter.out.ai;

import com.medsched.persistence.entity.DoctorEntity;
import com.medsched.persistence.entity.MedicalCenterEntity;
import com.medsched.persistence.entity.ServiceEntity;
import com.medsched.persistence.entity.SpecialtyEntity;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.MedicalCenterJpaRepository;
import com.medsched.persistence.repository.ServiceJpaRepository;
import com.medsched.persistence.repository.SpecialtyJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import org.springframework.stereotype.Service;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Builds a customer-safe RAG catalogue from current project data. */
@Service
public class ProjectKnowledgeCatalogService {
    private final MedicalCenterJpaRepository centers;
    private final SpecialtyJpaRepository specialties;
    private final ServiceJpaRepository services;
    private final DoctorJpaRepository doctors;
    private final UserJpaRepository users;

    public ProjectKnowledgeCatalogService(MedicalCenterJpaRepository centers,
                                          SpecialtyJpaRepository specialties,
                                          ServiceJpaRepository services,
                                          DoctorJpaRepository doctors,
                                          UserJpaRepository users) {
        this.centers = centers;
        this.specialties = specialties;
        this.services = services;
        this.doctors = doctors;
        this.users = users;
    }

    public List<Entry> loadPublicEntries() {
        try {
            List<MedicalCenterEntity> centerRows = centers.findAll().stream().filter(MedicalCenterEntity::isActive).toList();
            Map<String, MedicalCenterEntity> centerById = centerRows.stream()
                    .collect(Collectors.toMap(MedicalCenterEntity::getId, Function.identity(), (left, right) -> left));
            List<SpecialtyEntity> specialtyRows = specialties.findAll().stream()
                    .filter(specialty -> centerById.containsKey(specialty.getMedicalCenterId()))
                    .toList();
            Map<String, SpecialtyEntity> specialtyById = specialtyRows.stream()
                    .collect(Collectors.toMap(SpecialtyEntity::getId, Function.identity(), (left, right) -> left));
            List<ServiceEntity> serviceRows = services.findAll().stream()
                    .filter(ServiceEntity::isActive)
                    .filter(service -> specialtyById.containsKey(service.getSpecialtyId()))
                    .toList();
            List<DoctorEntity> doctorRows = doctors.findAll();
            Map<String, UserEntity> userById = users.findAll().stream().filter(UserEntity::isActive)
                    .collect(Collectors.toMap(UserEntity::getId, Function.identity(), (left, right) -> left));

            List<Entry> entries = new ArrayList<>();
            for (MedicalCenterEntity center : centerRows) {
                entries.add(new Entry(
                        "Cơ sở " + center.getName(),
                        join("cơ sở chi nhánh địa chỉ số điện thoại liên hệ", center.getCode(), center.getName(), center.getAddress()),
                        "Cơ sở " + center.getName() + " tại " + center.getAddress()
                                + optional(". Điện thoại: ", center.getPhone()) + "."
                ));
            }
            for (SpecialtyEntity specialty : specialtyRows) {
                MedicalCenterEntity center = centerById.get(specialty.getMedicalCenterId());
                entries.add(new Entry(
                        "Chuyên khoa " + specialty.getName(),
                        join("chuyên khoa khoa khám điều trị", specialty.getCode(), specialty.getName(), specialty.getDescription()),
                        specialty.getName() + optional(" tại cơ sở ", center != null ? center.getName() : null)
                                + optional(": ", specialty.getDescription()) + "."
                ));
            }
            NumberFormat money = NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN"));
            for (ServiceEntity service : serviceRows) {
                SpecialtyEntity specialty = specialtyById.get(service.getSpecialtyId());
                entries.add(new Entry(
                        "Dịch vụ " + service.getName(),
                        join("dịch vụ giá phí chi phí thời lượng đặt khám", service.getCode(), service.getName(), service.getDescription(),
                                specialty != null ? specialty.getName() : null),
                        service.getName() + optional(" thuộc ", specialty != null ? specialty.getName() : null)
                                + ". Giá hiện tại: " + money.format(service.getPrice()) + " VNĐ. Thời lượng dự kiến: "
                                + service.getEstimatedDurationMinutes() + " phút" + optional(". ", service.getDescription()) + "."
                ));
            }
            for (DoctorEntity doctor : doctorRows) {
                UserEntity user = userById.get(doctor.getUserId());
                SpecialtyEntity specialty = specialtyById.get(doctor.getSpecialtyId());
                if (user == null || specialty == null) continue;
                String displayName = join(doctor.getAcademicTitle(), user.getFullName()).trim();
                entries.add(new Entry(
                        "Bác sĩ " + displayName,
                        join("bác sĩ chuyên khoa phí khám phòng khám", displayName, specialty.getName(), doctor.getBio()),
                        "Bác sĩ " + displayName + " - " + specialty.getName()
                                + ". Phí khám: " + money.format(doctor.getConsultationFee()) + " VNĐ"
                                + optional(". Phòng: ", doctor.getRoomNumber()) + optional(". ", doctor.getBio()) + "."
                ));
            }
            return entries;
        } catch (RuntimeException ignored) {
            return List.of();
        }
    }

    private static String optional(String prefix, String value) {
        return value == null || value.isBlank() ? "" : prefix + value.trim();
    }

    private static String join(String... values) {
        return java.util.Arrays.stream(values).filter(value -> value != null && !value.isBlank())
                .map(String::trim).collect(Collectors.joining(" "));
    }

    public record Entry(String title, String keywords, String answer) {}
}
