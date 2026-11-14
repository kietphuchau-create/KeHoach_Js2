package com.medsched.core.port.in;

import com.medsched.core.domain.model.Appointment;

/**
 * ============================================================================
 * CỔNG VÀO NGHIỆP VỤ: ĐẶT LỊCH KHÁM BỆNH (INBOUND PORT / USE CASE)
 * ============================================================================
 * Kiến trúc: Hexagonal Architecture (Ports and Adapters).
 * Vị trí: Thuộc tầng Core (Lõi nghiệp vụ độc lập 100%, không phụ thuộc Spring/JPA).
 *
 * Vai trò:
 *  - Đóng vai trò là "Bản hợp đồng trừu tượng" (Interface) định nghĩa hành vi đặt lịch khám.
 *  - Tầng bên ngoài (Controller, Web, REST API, CLI hoặc Test) muốn đặt lịch
 *    thì BẮT BUỘC phải gọi qua Port này, không được can thiệp trực tiếp vào Database.
 */
public interface BookAppointmentUseCase {

    /**
     * DTO LỆNH ĐẶT LỊCH (COMMAND DTO - IMMUTABLE RECORD)
     * 
     * Sử dụng Java Record để đảm bảo dữ liệu đầu vào là bất biến (Immutable),
     * không bị sửa đổi ngoài ý muốn trong quá trình truyền qua các tầng kiến trúc.
     *
     * @param medicalCenterId  Mã cơ sở y tế / phòng khám nơi diễn ra ca khám.
     * @param patientProfileId Mã hồ sơ bệnh nhân (người trực tiếp được khám).
     * @param doctorId         Mã định danh bác sĩ phụ trách ca khám.
     * @param slotId           Mã khung giờ khám (khóa ngoại tham chiếu tới time_slots).
     * @param symptoms         Triệu chứng lâm sàng ban đầu do bệnh nhân khai báo.
     * @param medicalHistory   Tiền sử bệnh án hoặc lưu ý y tế kèm theo.
     */
    record Command(
            String medicalCenterId,
            String patientProfileId,
            String doctorId,
            String slotId,
            String symptoms,
            String medicalHistory
    ) {}

    /**
     * Thực thi nghiệp vụ đặt lịch khám bệnh.
     *
     * @param command Đối tượng chứa đầy đủ thông tin đặt lịch hợp lệ.
     * @return Đối tượng {@link Appointment} đại diện cho ca khám vừa được khởi tạo
     *         (ở trạng thái khởi đầu PENDING và sinh mã đặt hẹn bookingCode).
     */
    Appointment book(Command command);
}

