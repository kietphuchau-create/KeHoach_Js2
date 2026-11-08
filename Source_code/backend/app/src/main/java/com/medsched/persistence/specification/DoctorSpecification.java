package com.medsched.persistence.specification;

import com.medsched.persistence.entity.DoctorEntity;
import com.medsched.persistence.entity.DoctorScheduleEntity;
import com.medsched.persistence.entity.SpecialtyEntity;
import com.medsched.persistence.entity.TimeSlotEntity;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.enums.ScheduleStatus;
import com.medsched.persistence.enums.SlotStatus;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Specification phục vụ tìm kiếm và lọc bác sĩ động (JPA Criteria API)
 * Tuân thủ yêu cầu:
 * - REQ-SEARCH-01: Tìm theo tên (User.fullName), chuyên khoa, ngày trống; phân trang an toàn chống SQL Injection.
 * - REQ-SEARCH-02: Lọc theo khoảng giá [minPrice, maxPrice].
 */
public class DoctorSpecification {

    public static Specification<DoctorEntity> filter(
            String keyword,
            String specialtyId,
            String centerId,
            LocalDate availableDate,
            BigDecimal minPrice,
            BigDecimal maxPrice) {

        return (Root<DoctorEntity> root, CriteriaQuery<?> query, CriteriaBuilder cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Chỉ lấy Bác sĩ có tài khoản User đang hoạt động (active = true)
            Subquery<String> activeUserSubquery = query.subquery(String.class);
            Root<UserEntity> activeUserRoot = activeUserSubquery.from(UserEntity.class);
            activeUserSubquery.select(activeUserRoot.get("id"))
                    .where(cb.isTrue(activeUserRoot.get("active")));
            predicates.add(root.get("userId").in(activeUserSubquery));

            // 2. Tìm kiếm theo từ khóa tên bác sĩ (User.fullName)
            if (keyword != null && !keyword.trim().isEmpty()) {
                String pattern = "%" + keyword.trim().toLowerCase() + "%";
                Subquery<String> keywordSubquery = query.subquery(String.class);
                Root<UserEntity> userRoot = keywordSubquery.from(UserEntity.class);
                keywordSubquery.select(userRoot.get("id"))
                        .where(cb.like(cb.lower(userRoot.get("fullName")), pattern));
                predicates.add(root.get("userId").in(keywordSubquery));
            }

            // 3. Lọc theo chuyên khoa
            if (specialtyId != null && !specialtyId.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("specialtyId"), specialtyId.trim()));
            }

            // 4. Lọc theo cơ sở y tế (thông qua SpecialtyEntity.medicalCenterId)
            if (centerId != null && !centerId.trim().isEmpty()) {
                Subquery<String> centerSubquery = query.subquery(String.class);
                Root<SpecialtyEntity> specRoot = centerSubquery.from(SpecialtyEntity.class);
                centerSubquery.select(specRoot.get("id"))
                        .where(cb.equal(specRoot.get("medicalCenterId"), centerId.trim()));
                predicates.add(root.get("specialtyId").in(centerSubquery));
            }

            // 5. Lọc theo khoảng giá khám [minPrice, maxPrice]
            if (minPrice != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("consultationFee"), minPrice));
            }
            if (maxPrice != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("consultationFee"), maxPrice));
            }

            // 6. Lọc theo ngày còn slot trống (availableDate)
            if (availableDate != null) {
                Subquery<String> schedSubquery = query.subquery(String.class);
                Root<DoctorScheduleEntity> schedRoot = schedSubquery.from(DoctorScheduleEntity.class);

                // Subquery tìm các scheduleId có ít nhất 1 time-slot AVAILABLE
                Subquery<String> slotSubquery = query.subquery(String.class);
                Root<TimeSlotEntity> slotRoot = slotSubquery.from(TimeSlotEntity.class);
                slotSubquery.select(slotRoot.get("scheduleId"))
                        .where(cb.equal(slotRoot.get("status"), SlotStatus.AVAILABLE));

                schedSubquery.select(schedRoot.get("doctorId"))
                        .where(
                                cb.equal(schedRoot.get("workDate"), availableDate),
                                cb.equal(schedRoot.get("status"), ScheduleStatus.ACTIVE),
                                schedRoot.get("id").in(slotSubquery)
                        );
                predicates.add(root.get("id").in(schedSubquery));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
