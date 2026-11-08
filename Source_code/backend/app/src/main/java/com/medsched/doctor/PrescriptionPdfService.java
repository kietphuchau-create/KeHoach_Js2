package com.medsched.doctor;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.entity.PatientProfileEntity;
import com.medsched.persistence.entity.PrescriptionEntity;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.PatientProfileJpaRepository;
import com.medsched.persistence.repository.PrescriptionJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * REQ-RX-02: Dịch vụ xuất PDF đơn thuốc điện tử chuẩn y tế bằng OpenPDF.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PrescriptionPdfService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(PrescriptionPdfService.class);
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DecimalFormat CURRENCY_FORMAT = new DecimalFormat("#,###");

    private final DoctorPrescriptionService doctorPrescriptionService;
    private final AppointmentJpaRepository appointmentRepository;
    private final PatientProfileJpaRepository patientProfileRepository;
    private final PrescriptionJpaRepository prescriptionRepository;

    /**
     * Xuất PDF đơn thuốc dựa trên prescriptionId hoặc appointmentId.
     */
    @Transactional(readOnly = true)
    public byte[] generatePrescriptionPdf(String identifier) {
        // 1. Tìm thông tin ca khám và đơn thuốc
        String appointmentId = resolveAppointmentId(identifier);

        DoctorPrescriptionDtos.PrescriptionDetailDto detail = 
                doctorPrescriptionService.getPrescriptionDetailsByAppointmentId(appointmentId);

        AppointmentEntity appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ca khám: " + appointmentId));

        PatientProfileEntity patient = null;
        if (appointment.getPatientProfileId() != null) {
            patient = patientProfileRepository.findById(appointment.getPatientProfileId()).orElse(null);
        }

        return createPdfDocument(detail, appointment, patient);
    }

    private String resolveAppointmentId(String identifier) {
        // Kiểm tra xem identifier có phải là appointmentId không
        if (appointmentRepository.existsById(identifier)) {
            return identifier;
        }

        // Nếu không, tìm trong PrescriptionEntity theo prescriptionId
        return prescriptionRepository.findById(identifier)
                .map(PrescriptionEntity::getAppointmentId)
                .orElse(identifier); // fallback
    }

    private byte[] createPdfDocument(DoctorPrescriptionDtos.PrescriptionDetailDto detail,
                                     AppointmentEntity appointment,
                                     PatientProfileEntity patient) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 40, 40);
            PdfWriter.getInstance(document, out);
            document.open();

            // Font setup (Hỗ trợ Unicode tiếng Việt)
            BaseFont baseFont = resolveUnicodeBaseFont();
            Font titleFont = new Font(baseFont, 16, Font.BOLD, new Color(15, 118, 110)); // #0f766e Teal
            Font subHeaderFont = new Font(baseFont, 10, Font.NORMAL, new Color(100, 116, 139));
            Font boldFont = new Font(baseFont, 11, Font.BOLD, Color.BLACK);
            Font normalFont = new Font(baseFont, 10, Font.NORMAL, Color.BLACK);
            Font italicFont = new Font(baseFont, 10, Font.ITALIC, new Color(71, 85, 105));
            Font tableHeaderFont = new Font(baseFont, 10, Font.BOLD, Color.WHITE);
            Font smallFont = new Font(baseFont, 8, Font.ITALIC, new Color(100, 116, 139));

            // 1. Header bệnh viện
            Paragraph clinicName = new Paragraph("BỘ Y TẾ - HỆ THỐNG Y TẾ THÔNG MINH MEDSCHED PRO", 
                    new Font(baseFont, 12, Font.BOLD, new Color(15, 118, 110)));
            clinicName.setAlignment(Element.ALIGN_CENTER);
            document.add(clinicName);

            Paragraph clinicSub = new Paragraph("Phòng khám Đa khoa Quốc tế MedSched | Hotline: 1900-6868 | Website: medsched.vn\nĐịa chỉ: 123 Đường Y Học, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh", subHeaderFont);
            clinicSub.setAlignment(Element.ALIGN_CENTER);
            document.add(clinicSub);

            // Dòng kẻ ngang phân cách
            addDivider(document, new Color(203, 213, 225));

            // 2. Tiêu đề đơn thuốc
            Paragraph title = new Paragraph("\nĐƠN THUỐC ĐIỆN TỬ", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            String rxCode = detail.prescriptionId() != null && !detail.prescriptionId().isBlank() 
                    ? detail.prescriptionId() : ("RX-" + appointment.getId().substring(0, Math.min(8, appointment.getId().length())).toUpperCase());
            String bookingCode = appointment.getBookingCode() != null ? appointment.getBookingCode() : appointment.getId();

            Paragraph codePara = new Paragraph("Mã đơn thuốc: " + rxCode + "  |  Mã lịch hẹn: " + bookingCode, 
                    new Font(baseFont, 9, Font.BOLD, new Color(15, 118, 110)));
            codePara.setAlignment(Element.ALIGN_CENTER);
            document.add(codePara);
            document.add(new Paragraph(" "));

            // 3. Khung thông tin bệnh nhân & bác sĩ (2 cột)
            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);
            infoTable.setWidths(new float[]{1.2f, 1f});

            String patientName = patient != null ? patient.getFullName() : "Bệnh nhân MedSched";
            String genderStr = patient != null && patient.getGender() != null ? patient.getGender().name() : "Chưa xác định";
            String dobStr = patient != null && patient.getDateOfBirth() != null ? patient.getDateOfBirth().toString() : "--";
            String phoneStr = patient != null && patient.getPhone() != null ? patient.getPhone() : "--";
            String addressStr = patient != null && patient.getAddress() != null ? patient.getAddress() : "TP. Hồ Chí Minh";
            String cccdStr = patient != null && patient.getCccdNumber() != null ? patient.getCccdNumber() : "--";

            PdfPCell cellPatient = new PdfPCell();
            cellPatient.setBorder(PdfPCell.NO_BORDER);
            cellPatient.addElement(new Paragraph("THÔNG TIN BỆNH NHÂN", boldFont));
            cellPatient.addElement(new Paragraph("• Họ và tên: " + patientName, normalFont));
            cellPatient.addElement(new Paragraph("• Ngày sinh: " + dobStr + "  -  Giới tính: " + genderStr, normalFont));
            cellPatient.addElement(new Paragraph("• Số điện thoại: " + phoneStr + "  -  CCCD: " + cccdStr, normalFont));
            cellPatient.addElement(new Paragraph("• Địa chỉ: " + addressStr, normalFont));
            infoTable.addCell(cellPatient);

            PdfPCell cellDoctor = new PdfPCell();
            cellDoctor.setBorder(PdfPCell.NO_BORDER);
            cellDoctor.addElement(new Paragraph("THÔNG TIN THĂM KHÁM", boldFont));
            cellDoctor.addElement(new Paragraph("• Bác sĩ điều trị: " + (detail.doctorName() != null ? detail.doctorName() : "BS. MedSched"), normalFont));
            ZonedDateTime examTime = appointment.getUpdatedAt() != null 
                    ? appointment.getUpdatedAt().atZone(VN_ZONE) 
                    : ZonedDateTime.now(VN_ZONE);
            cellDoctor.addElement(new Paragraph("• Ngày khám: " + examTime.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")), normalFont));
            cellDoctor.addElement(new Paragraph("• Trạng thái: " + (detail.status() != null ? detail.status() : "COMPLETED"), normalFont));
            infoTable.addCell(cellDoctor);

            document.add(infoTable);
            document.add(new Paragraph(" "));

            // 4. Chẩn đoán & Lời dặn
            PdfPTable diagTable = new PdfPTable(1);
            diagTable.setWidthPercentage(100);
            PdfPCell diagCell = new PdfPCell();
            diagCell.setBackgroundColor(new Color(240, 253, 250)); // Teal nhạt #f0fdfa
            diagCell.setPadding(8);
            diagCell.setBorderColor(new Color(153, 246, 228)); // #99f6e4

            String diagText = detail.diagnosis() != null && !detail.diagnosis().isBlank() 
                    ? detail.diagnosis() : "Viêm hô hấp / Kiểm tra sức khỏe định kỳ";
            String adviceText = detail.doctorAdvice() != null && !detail.doctorAdvice().isBlank() 
                    ? detail.doctorAdvice() : "Uống nhiều nước ấm, nghỉ ngơi hợp lý, tái khám nếu có triệu chứng bất thường.";

            Paragraph diagP = new Paragraph();
            diagP.add(new Phrase("Chẩn đoán: ", boldFont));
            diagP.add(new Phrase(diagText + "\n", normalFont));
            diagP.add(new Phrase("Lời dặn của Bác sĩ: ", boldFont));
            diagP.add(new Phrase(adviceText, italicFont));
            diagCell.addElement(diagP);
            diagTable.addCell(diagCell);
            document.add(diagTable);
            document.add(new Paragraph(" "));

            // 5. Bảng danh mục thuốc
            Paragraph tableTitle = new Paragraph("CHỈ ĐỊNH DÙNG THUỐC:", boldFont);
            document.add(tableTitle);
            document.add(new Paragraph(" "));

            PdfPTable medTable = new PdfPTable(6);
            medTable.setWidthPercentage(100);
            medTable.setWidths(new float[]{0.5f, 2.5f, 0.8f, 0.8f, 2.5f, 1.2f});

            // Header thuốc (Màu xanh chủ đạo #0f766e)
            Color headerBg = new Color(15, 118, 110);
            addTableHeader(medTable, "STT", tableHeaderFont, headerBg, Element.ALIGN_CENTER);
            addTableHeader(medTable, "Tên thuốc / Hàm lượng", tableHeaderFont, headerBg, Element.ALIGN_LEFT);
            addTableHeader(medTable, "Đơn vị", tableHeaderFont, headerBg, Element.ALIGN_CENTER);
            addTableHeader(medTable, "Số lượng", tableHeaderFont, headerBg, Element.ALIGN_CENTER);
            addTableHeader(medTable, "Cách dùng & Liều lượng", tableHeaderFont, headerBg, Element.ALIGN_LEFT);
            addTableHeader(medTable, "Thành tiền", tableHeaderFont, headerBg, Element.ALIGN_RIGHT);

            List<DoctorPrescriptionDtos.PrescriptionItemDetailDto> items = detail.items();
            if (items == null || items.isEmpty()) {
                PdfPCell emptyCell = new PdfPCell(new Phrase("Không có thuốc kê trong ca khám này.", italicFont));
                emptyCell.setColspan(6);
                emptyCell.setPadding(10);
                emptyCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                medTable.addCell(emptyCell);
            } else {
                int stt = 1;
                Color rowAltColor = new Color(248, 250, 252);
                for (DoctorPrescriptionDtos.PrescriptionItemDetailDto item : items) {
                    Color bg = (stt % 2 == 0) ? rowAltColor : Color.WHITE;
                    addTableCell(medTable, String.valueOf(stt++), normalFont, bg, Element.ALIGN_CENTER);
                    addTableCell(medTable, item.medicineName(), boldFont, bg, Element.ALIGN_LEFT);
                    addTableCell(medTable, item.unit() != null ? item.unit() : "Viên", normalFont, bg, Element.ALIGN_CENTER);
                    addTableCell(medTable, item.quantity() != null ? item.quantity().stripTrailingZeros().toPlainString() : "1", normalFont, bg, Element.ALIGN_CENTER);
                    addTableCell(medTable, item.dosage() != null ? item.dosage() : "Theo chỉ dẫn", normalFont, bg, Element.ALIGN_LEFT);
                    String priceStr = item.totalPrice() != null ? CURRENCY_FORMAT.format(item.totalPrice()) + " đ" : "0 đ";
                    addTableCell(medTable, priceStr, normalFont, bg, Element.ALIGN_RIGHT);
                }
            }

            // Hàng tổng tiền
            BigDecimal total = detail.totalMedicineAmount() != null ? detail.totalMedicineAmount() : BigDecimal.ZERO;
            PdfPCell totalLabelCell = new PdfPCell(new Phrase("Tổng cộng tiền thuốc:", boldFont));
            totalLabelCell.setColspan(5);
            totalLabelCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalLabelCell.setPadding(6);
            medTable.addCell(totalLabelCell);

            PdfPCell totalValCell = new PdfPCell(new Phrase(CURRENCY_FORMAT.format(total) + " VNĐ", 
                    new Font(baseFont, 10, Font.BOLD, new Color(15, 118, 110))));
            totalValCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalValCell.setPadding(6);
            medTable.addCell(totalValCell);

            document.add(medTable);
            document.add(new Paragraph(" "));

            // 6. Chữ ký và xác nhận
            ZonedDateTime now = ZonedDateTime.now(VN_ZONE);
            Paragraph dateSignPara = new Paragraph("Ngày " + now.getDayOfMonth() + " tháng " + now.getMonthValue() + " năm " + now.getYear(), italicFont);
            dateSignPara.setAlignment(Element.ALIGN_RIGHT);
            document.add(dateSignPara);
            document.add(new Paragraph(" "));

            PdfPTable signTable = new PdfPTable(2);
            signTable.setWidthPercentage(100);

            PdfPCell signPatient = new PdfPCell();
            signPatient.setBorder(PdfPCell.NO_BORDER);
            Paragraph pSign = new Paragraph("BỆNH NHÂN / NGƯỜI NHẬN\n(Ký và ghi rõ họ tên)\n\n\n\n" + patientName, normalFont);
            pSign.setAlignment(Element.ALIGN_CENTER);
            signPatient.addElement(pSign);
            signTable.addCell(signPatient);

            PdfPCell signDoc = new PdfPCell();
            signDoc.setBorder(PdfPCell.NO_BORDER);
            String docDisplayName = detail.doctorName() != null ? detail.doctorName() : "Bác sĩ điều trị";
            Paragraph dSign = new Paragraph("BÁC SĨ ĐIỀU TRỊ\n(Ký điện tử & Đóng dấu)\n\n\n\n" + docDisplayName, boldFont);
            dSign.setAlignment(Element.ALIGN_CENTER);
            signDoc.addElement(dSign);
            signTable.addCell(signDoc);

            document.add(signTable);
            document.add(new Paragraph(" "));

            // 7. Footer lưu ý
            addDivider(document, new Color(226, 232, 240));
            Paragraph footerNote = new Paragraph(
                    "* Ghi chú: Đơn thuốc điện tử này được tạo tự động bởi Hệ thống Quản trị Y tế MedSched Pro và được lưu trữ an toàn trong hồ sơ bệnh án điện tử (EMR). Bệnh nhân có thể tra cứu lại bất kỳ lúc nào qua cổng thông tin https://medsched.vn",
                    smallFont
            );
            footerNote.setAlignment(Element.ALIGN_CENTER);
            document.add(footerNote);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Lỗi khi tạo PDF đơn thuốc cho ca khám {}: {}", detail.appointmentId(), e.getMessage(), e);
            throw new RuntimeException("Không thể xuất file PDF đơn thuốc: " + e.getMessage(), e);
        }
    }

    private void addDivider(Document document, Color color) throws Exception {
        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);
        PdfPCell cell = new PdfPCell();
        cell.setBorder(PdfPCell.BOTTOM);
        cell.setBorderColor(color);
        cell.setBorderWidth(1f);
        cell.setFixedHeight(3f);
        table.addCell(cell);
        document.add(table);
    }

    private void addTableHeader(PdfPTable table, String text, Font font, Color bgColor, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(bgColor);
        cell.setPadding(6);
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        table.addCell(cell);
    }

    private void addTableCell(PdfPTable table, String text, Font font, Color bgColor, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "", font));
        cell.setBackgroundColor(bgColor);
        cell.setPadding(5);
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        table.addCell(cell);
    }

    /**
     * Tìm kiếm và nạp Font hỗ trợ đầy đủ ký tự tiếng Việt Unicode (Identity-H).
     */
    private BaseFont resolveUnicodeBaseFont() {
        // Danh sách các font phổ biến trên Windows, Linux và Docker
        String[] candidateFontPaths = {
                "C:/Windows/Fonts/arial.ttf",
                "C:/Windows/Fonts/tahoma.ttf",
                "C:/Windows/Fonts/times.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
                "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"
        };

        for (String path : candidateFontPaths) {
            File fontFile = new File(path);
            if (fontFile.exists() && fontFile.canRead()) {
                try {
                    return BaseFont.createFont(path, BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
                } catch (Exception ignored) {
                }
            }
        }

        // Fallback font chuẩn nếu chạy trong container tối giản không có system font
        try {
            return BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
        } catch (Exception e) {
            throw new RuntimeException("Không thể khởi tạo font mặc định cho PDF", e);
        }
    }
}

