package com.medsched.admin;

import com.medsched.common.AppExceptions;
import com.medsched.persistence.entity.MedicalCenterEntity;
import com.medsched.persistence.entity.ServiceEntity;
import com.medsched.persistence.entity.SpecialtyEntity;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.MedicalCenterJpaRepository;
import com.medsched.persistence.repository.ServiceJpaRepository;
import com.medsched.persistence.repository.SpecialtyJpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** CRUD danh mục nền: cơ sở y tế, chuyên khoa, dịch vụ khám. */
@Service
public class CatalogService {

    private final MedicalCenterJpaRepository medicalCenters;
    private final SpecialtyJpaRepository specialties;
    private final ServiceJpaRepository services;
    private final DoctorJpaRepository doctors;

    public CatalogService(MedicalCenterJpaRepository medicalCenters,
                          SpecialtyJpaRepository specialties,
                          ServiceJpaRepository services,
                          DoctorJpaRepository doctors) {
        this.medicalCenters = medicalCenters;
        this.specialties = specialties;
        this.services = services;
        this.doctors = doctors;
    }

    @Transactional(readOnly = true)
    public List<CatalogDtos.MedicalCenterResponse> listCenters() {
        List<CatalogDtos.MedicalCenterResponse> result = new ArrayList<>();
        for (MedicalCenterEntity center : medicalCenters.findAll()) {
            result.add(toResponse(center));
        }
        return result;
    }

    @Transactional
    public CatalogDtos.MedicalCenterResponse createCenter(CatalogDtos.MedicalCenterRequest request, String actorId) {
        medicalCenters.findByCode(request.code().trim()).ifPresent(existing -> {
            throw new AppExceptions.ConflictException("Mã cơ sở y tế đã tồn tại");
        });
        Instant now = Instant.now();
        MedicalCenterEntity center = new MedicalCenterEntity(UUID.randomUUID().toString(), request.code().trim(),
                request.name().trim(), request.address().trim(), blankToNull(request.phone()), true, now, now);
        center.setCreatedBy(actorId);
        center.setUpdatedBy(actorId);
        return toResponse(medicalCenters.save(center));
    }

    @Transactional
    public CatalogDtos.MedicalCenterResponse updateCenter(String id, CatalogDtos.MedicalCenterRequest request,
                                                          String actorId) {
        MedicalCenterEntity center = medicalCenters.findById(id)
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy cơ sở y tế"));
        center.setName(request.name().trim());
        center.setAddress(request.address().trim());
        center.setPhone(blankToNull(request.phone()));
        center.setUpdatedAt(Instant.now());
        center.setUpdatedBy(actorId);
        return toResponse(medicalCenters.save(center));
    }

    /**
     * Ngừng hoạt động cơ sở y tế (xóa mềm). Cố ý KHÔNG xóa cứng vì lịch sử khám,
     * hồ sơ bệnh án và hóa đơn của cơ sở đó vẫn phải tra cứu được.
     */
    @Transactional
    public void deactivateCenter(String id, String actorId) {
        MedicalCenterEntity center = medicalCenters.findById(id)
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy cơ sở y tế"));
        center.setActive(false);
        center.setUpdatedAt(Instant.now());
        center.setUpdatedBy(actorId);
        medicalCenters.save(center);
    }

    @Transactional(readOnly = true)
    public List<CatalogDtos.SpecialtyResponse> listSpecialties(String centerId) {
        List<SpecialtyEntity> found = (centerId == null || centerId.isBlank())
                ? specialties.findAll()
                : specialties.findByMedicalCenterId(centerId);
        List<CatalogDtos.SpecialtyResponse> result = new ArrayList<>();
        for (SpecialtyEntity specialty : found) {
            result.add(toResponse(specialty));
        }
        return result;
    }

    @Transactional
    public CatalogDtos.SpecialtyResponse createSpecialty(CatalogDtos.SpecialtyRequest request, String actorId) {
        requireCenter(request.medicalCenterId());
        specialties.findByMedicalCenterIdAndCode(request.medicalCenterId(), request.code().trim())
                .ifPresent(existing -> {
                    throw new AppExceptions.ConflictException("Mã chuyên khoa đã tồn tại trong cơ sở này");
                });
        Instant now = Instant.now();
        SpecialtyEntity specialty = new SpecialtyEntity(UUID.randomUUID().toString(), request.medicalCenterId(),
                request.name().trim(), request.code().trim(), blankToNull(request.description()),
                blankToNull(request.iconUrl()), now, now);
        specialty.setCreatedBy(actorId);
        specialty.setUpdatedBy(actorId);
        return toResponse(specialties.save(specialty));
    }

    @Transactional
    public CatalogDtos.SpecialtyResponse updateSpecialty(String id, CatalogDtos.SpecialtyRequest request,
                                                         String actorId) {
        SpecialtyEntity specialty = requireSpecialty(id);
        specialty.setName(request.name().trim());
        specialty.setCode(request.code().trim());
        specialty.setDescription(blankToNull(request.description()));
        specialty.setIconUrl(blankToNull(request.iconUrl()));
        specialty.setUpdatedAt(Instant.now());
        specialty.setUpdatedBy(actorId);
        return toResponse(specialties.save(specialty));
    }

    /** Chỉ cho xóa chuyên khoa khi chưa có bác sĩ nào thuộc chuyên khoa đó. */
    @Transactional
    public void deleteSpecialty(String id) {
        SpecialtyEntity specialty = requireSpecialty(id);
        if (!doctors.findBySpecialtyId(id).isEmpty()) {
            throw new AppExceptions.ConflictException(
                    "Không thể xóa chuyên khoa đang có bác sĩ. Hãy chuyển bác sĩ sang chuyên khoa khác trước.");
        }
        specialties.delete(specialty);
    }

    @Transactional(readOnly = true)
    public List<CatalogDtos.ServiceResponse> listServices(String specialtyId) {
        List<ServiceEntity> found = (specialtyId == null || specialtyId.isBlank())
                ? services.findAll()
                : services.findBySpecialtyIdAndActiveTrue(specialtyId);
        List<CatalogDtos.ServiceResponse> result = new ArrayList<>();
        for (ServiceEntity service : found) {
            result.add(toResponse(service));
        }
        return result;
    }

    @Transactional
    public CatalogDtos.ServiceResponse createService(CatalogDtos.ServiceRequest request, String actorId) {
        requireSpecialty(request.specialtyId());
        services.findBySpecialtyIdAndCode(request.specialtyId(), request.code().trim()).ifPresent(existing -> {
            throw new AppExceptions.ConflictException("Mã dịch vụ đã tồn tại trong chuyên khoa này");
        });
        Instant now = Instant.now();
        ServiceEntity service = new ServiceEntity(UUID.randomUUID().toString(), request.specialtyId(),
                request.name().trim(), request.code().trim(), blankToNull(request.description()),
                request.price(), request.estimatedDurationMinutes(), now, now);
        service.setCreatedBy(actorId);
        service.setUpdatedBy(actorId);
        return toResponse(services.save(service));
    }

    @Transactional
    public CatalogDtos.ServiceResponse updateService(String id, CatalogDtos.ServiceRequest request, String actorId) {
        ServiceEntity service = services.findById(id)
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy dịch vụ"));
        requireSpecialty(request.specialtyId());
        service.setSpecialtyId(request.specialtyId());
        service.setName(request.name().trim());
        service.setCode(request.code().trim());
        service.setDescription(blankToNull(request.description()));
        service.setPrice(request.price());
        service.setEstimatedDurationMinutes(request.estimatedDurationMinutes());
        service.setUpdatedAt(Instant.now());
        service.setUpdatedBy(actorId);
        return toResponse(services.save(service));
    }

    /** Ngừng cung cấp dịch vụ (xóa mềm) để hóa đơn cũ vẫn tra được tên dịch vụ. */
    @Transactional
    public void deactivateService(String id, String actorId) {
        ServiceEntity service = services.findById(id)
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy dịch vụ"));
        service.setActive(false);
        service.setUpdatedAt(Instant.now());
        service.setUpdatedBy(actorId);
        services.save(service);
    }

    private MedicalCenterEntity requireCenter(String id) {
        return medicalCenters.findById(id)
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy cơ sở y tế"));
    }

    private SpecialtyEntity requireSpecialty(String id) {
        return specialties.findById(id)
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy chuyên khoa"));
    }

    private CatalogDtos.MedicalCenterResponse toResponse(MedicalCenterEntity center) {
        return new CatalogDtos.MedicalCenterResponse(center.getId(), center.getCode(), center.getName(),
                center.getAddress(), center.getPhone(), center.isActive());
    }

    private CatalogDtos.SpecialtyResponse toResponse(SpecialtyEntity specialty) {
        String centerName = medicalCenters.findById(specialty.getMedicalCenterId())
                .map(center -> center.getName()).orElse(null);
        return new CatalogDtos.SpecialtyResponse(specialty.getId(), specialty.getMedicalCenterId(), centerName,
                specialty.getName(), specialty.getCode(), specialty.getDescription(), specialty.getIconUrl());
    }

    private CatalogDtos.ServiceResponse toResponse(ServiceEntity service) {
        String specialtyName = specialties.findById(service.getSpecialtyId())
                .map(specialty -> specialty.getName()).orElse(null);
        return new CatalogDtos.ServiceResponse(service.getId(), service.getSpecialtyId(), specialtyName,
                service.getName(), service.getCode(), service.getDescription(), service.getPrice(),
                service.getEstimatedDurationMinutes(), service.isActive());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

}
