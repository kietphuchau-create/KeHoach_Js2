package com.medsched.admin;

import com.medsched.common.AppExceptions;
import com.medsched.persistence.entity.MedicalCenterEntity;
import com.medsched.persistence.entity.ServiceEntity;
import com.medsched.persistence.entity.SpecialtyEntity;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.DoctorReviewJpaRepository;
import com.medsched.persistence.repository.MedicalCenterJpaRepository;
import com.medsched.persistence.repository.ServiceJpaRepository;
import com.medsched.persistence.repository.SpecialtyJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** CRUD for the base catalog: medical centers, specialties and services. */
@Service
public class CatalogService {

    private final MedicalCenterJpaRepository medicalCenters;
    private final SpecialtyJpaRepository specialties;
    private final ServiceJpaRepository services;
    private final DoctorJpaRepository doctors;
    private final UserJpaRepository users;
    private final DoctorReviewJpaRepository doctorReviews;

    public CatalogService(MedicalCenterJpaRepository medicalCenters,
                          SpecialtyJpaRepository specialties,
                          ServiceJpaRepository services,
                          DoctorJpaRepository doctors,
                          UserJpaRepository users,
                          DoctorReviewJpaRepository doctorReviews) {
        this.medicalCenters = medicalCenters;
        this.specialties = specialties;
        this.services = services;
        this.doctors = doctors;
        this.users = users;
        this.doctorReviews = doctorReviews;
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
     * Deactivates a medical center (soft delete). A hard delete is deliberately
     * avoided because its visit history, medical records and invoices must stay
     * queryable.
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

    @Transactional
    public void reactivateCenter(String id, String actorId) {
        MedicalCenterEntity center = medicalCenters.findById(id)
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy cơ sở y tế"));
        center.setActive(true);
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

    /** A specialty may only be deleted while no doctor still belongs to it. */
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

    /** Retires a service (soft delete) so old invoices can still resolve its name. */
    @Transactional
    public void deactivateService(String id, String actorId) {
        ServiceEntity service = services.findById(id)
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy dịch vụ"));
        service.setActive(false);
        service.setUpdatedAt(Instant.now());
        service.setUpdatedBy(actorId);
        services.save(service);
    }

    @Transactional(readOnly = true)
    public List<CatalogDtos.DoctorSummaryResponse> listDoctors(String specialtyId, String centerId) {
        List<com.medsched.persistence.entity.DoctorEntity> list = (specialtyId != null && !specialtyId.isBlank())
                ? doctors.findBySpecialtyId(specialtyId)
                : doctors.findAll();

        List<CatalogDtos.DoctorSummaryResponse> results = new ArrayList<>();
        for (var doc : list) {
            SpecialtyEntity sp = specialties.findById(doc.getSpecialtyId()).orElse(null);
            if (centerId != null && !centerId.isBlank() && sp != null && !centerId.equals(sp.getMedicalCenterId())) {
                continue;
            }
            var user = users.findById(doc.getUserId()).orElse(null);
            if (user == null || !user.isActive()) {
                continue;
            }
            results.add(toDoctorSummaryResponse(doc));
        }
        return results;
    }

    /**
     * Triển khai REQ-SEARCH-01 & REQ-SEARCH-02:
     * - Tìm kiếm kết hợp: từ khóa tên bác sĩ, chuyên khoa, cơ sở y tế, ngày trống.
     * - Lọc theo khoảng giá [minPrice, maxPrice].
     * - Sắp xếp theo giá khám (consultationFee), rating, hoặc tên.
     * - Phân trang an toàn chuẩn Spring Data JPA chống SQL Injection.
     */
    @Transactional(readOnly = true)
    public CatalogDtos.PageResponse<CatalogDtos.DoctorSummaryResponse> searchDoctors(
            String keyword,
            String specialtyId,
            String centerId,
            java.time.LocalDate availableDate,
            java.math.BigDecimal minPrice,
            java.math.BigDecimal maxPrice,
            String sortBy,
            String sortDir,
            int page,
            int size) {

        int pageNumber = Math.max(0, page);
        int pageSize = size <= 0 ? 10 : Math.min(100, size);

        org.springframework.data.jpa.domain.Specification<com.medsched.persistence.entity.DoctorEntity> spec =
                com.medsched.persistence.specification.DoctorSpecification.filter(
                        blankToNull(keyword),
                        blankToNull(specialtyId),
                        blankToNull(centerId),
                        availableDate,
                        minPrice,
                        maxPrice);

        boolean isSortByRating = "rating".equalsIgnoreCase(sortBy);
        boolean isSortByName = "name".equalsIgnoreCase(sortBy) || "fullName".equalsIgnoreCase(sortBy);

        // Trường hợp sắp xếp theo rating hoặc tên
        if (isSortByRating || isSortByName) {
            List<com.medsched.persistence.entity.DoctorEntity> allMatched = doctors.findAll(spec);
            List<CatalogDtos.DoctorSummaryResponse> mapped = new ArrayList<>();
            for (var doc : allMatched) {
                mapped.add(toDoctorSummaryResponse(doc));
            }

            boolean isDesc = "DESC".equalsIgnoreCase(sortDir);
            if (isSortByRating) {
                mapped.sort((a, b) -> {
                    double r1 = a.rating() != null ? a.rating() : 0.0;
                    double r2 = b.rating() != null ? b.rating() : 0.0;
                    return isDesc ? Double.compare(r2, r1) : Double.compare(r1, r2);
                });
            } else {
                mapped.sort((a, b) -> {
                    String n1 = a.fullName() != null ? a.fullName() : "";
                    String n2 = b.fullName() != null ? b.fullName() : "";
                    return isDesc ? n2.compareToIgnoreCase(n1) : n1.compareToIgnoreCase(n2);
                });
            }

            int totalElements = mapped.size();
            int totalPages = (int) Math.ceil((double) totalElements / pageSize);
            int fromIndex = Math.min(pageNumber * pageSize, totalElements);
            int toIndex = Math.min(fromIndex + pageSize, totalElements);
            List<CatalogDtos.DoctorSummaryResponse> pagedContent = mapped.subList(fromIndex, toIndex);

            return new CatalogDtos.PageResponse<>(pagedContent, pageNumber, pageSize, totalElements, totalPages);
        }

        // Trường hợp sắp xếp trực tiếp trên thuộc tính của DoctorEntity
        String sortProperty = "consultationFee";
        if ("fee".equalsIgnoreCase(sortBy) || "price".equalsIgnoreCase(sortBy) || "consultationFee".equalsIgnoreCase(sortBy)) {
            sortProperty = "consultationFee";
        } else if ("academicTitle".equalsIgnoreCase(sortBy)) {
            sortProperty = "academicTitle";
        } else if ("createdAt".equalsIgnoreCase(sortBy)) {
            sortProperty = "createdAt";
        }

        org.springframework.data.domain.Sort.Direction direction =
                "DESC".equalsIgnoreCase(sortDir) ? org.springframework.data.domain.Sort.Direction.DESC : org.springframework.data.domain.Sort.Direction.ASC;
        org.springframework.data.domain.Pageable pageable =
                org.springframework.data.domain.PageRequest.of(pageNumber, pageSize, org.springframework.data.domain.Sort.by(direction, sortProperty));

        org.springframework.data.domain.Page<com.medsched.persistence.entity.DoctorEntity> pagedResult = doctors.findAll(spec, pageable);

        List<CatalogDtos.DoctorSummaryResponse> content = new ArrayList<>();
        for (var doc : pagedResult.getContent()) {
            content.add(toDoctorSummaryResponse(doc));
        }

        return new CatalogDtos.PageResponse<>(
                content,
                pagedResult.getNumber(),
                pagedResult.getSize(),
                pagedResult.getTotalElements(),
                pagedResult.getTotalPages()
        );
    }

    private CatalogDtos.DoctorSummaryResponse toDoctorSummaryResponse(com.medsched.persistence.entity.DoctorEntity doc) {
        SpecialtyEntity sp = specialties.findById(doc.getSpecialtyId()).orElse(null);
        var user = users.findById(doc.getUserId()).orElse(null);
        MedicalCenterEntity center = sp != null ? medicalCenters.findById(sp.getMedicalCenterId()).orElse(null) : null;

        Double avgRating = doctorReviews.getAverageRatingByDoctorId(doc.getId());
        long reviewCount = doctorReviews.countByDoctorId(doc.getId());
        double finalRating = avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 5.0;

        return new CatalogDtos.DoctorSummaryResponse(
                doc.getId(),
                doc.getUserId(),
                user != null ? user.getFullName() : "Bác sĩ",
                user != null ? user.getPhone() : "",
                doc.getSpecialtyId(),
                sp != null ? sp.getName() : "Chuyên khoa",
                center != null ? center.getId() : (sp != null ? sp.getMedicalCenterId() : ""),
                center != null ? center.getName() : "",
                doc.getAcademicTitle() != null ? doc.getAcademicTitle() : "BS",
                doc.getConsultationFee() != null ? doc.getConsultationFee() : java.math.BigDecimal.valueOf(300000),
                doc.getRoomNumber() != null ? doc.getRoomNumber() : "P.101",
                doc.getBio() != null ? doc.getBio() : "",
                doc.getAvatarUrl(),
                finalRating,
                (int) reviewCount
        );
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
