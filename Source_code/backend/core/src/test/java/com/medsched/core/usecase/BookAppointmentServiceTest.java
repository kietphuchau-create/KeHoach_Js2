package com.medsched.core.usecase;

import com.medsched.core.domain.exception.DomainException;
import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.core.domain.exception.SlotNotAvailableException;
import com.medsched.core.domain.model.Appointment;
import com.medsched.core.domain.model.TimeSlot;
import com.medsched.core.port.in.BookAppointmentUseCase;
import com.medsched.core.port.out.AiTriagePort;
import com.medsched.core.port.out.AppointmentRepositoryPort;
import com.medsched.core.port.out.TimeSlotRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.*;

class BookAppointmentServiceTest {

    private InMemoryAppointmentRepository appointmentRepo;
    private InMemoryTimeSlotRepository timeSlotRepo;
    private StubAiTriagePort aiPort;
    private BookAppointmentService service;

    @BeforeEach
    void setUp() {
        appointmentRepo = new InMemoryAppointmentRepository();
        timeSlotRepo = new InMemoryTimeSlotRepository();
        aiPort = new StubAiTriagePort();
        service = new BookAppointmentService(appointmentRepo, timeSlotRepo, aiPort);
    }

    @Test
    @DisplayName("Đặt lịch thành công khi khung giờ còn trống (AVAILABLE)")
    void testBookSuccess() {
        String slotId = "slot-1";
        timeSlotRepo.save(new TimeSlot(slotId, "sch-1", Instant.now(), Instant.now().plusSeconds(1800), "AVAILABLE", 0));

        BookAppointmentUseCase.Command command = new BookAppointmentUseCase.Command(
                "center-1", "pat-1", "doc-1", slotId, "Đau đầu, chóng mặt", "Không có"
        );

        Appointment result = service.book(command);

        assertThat(result).isNotNull();
        assertThat(result.slotId()).isEqualTo(slotId);
        assertThat(result.bookingCode()).startsWith("MED");
        assertThat(result.queueNumber()).startsWith("APP-");
        assertThat(result.status()).isEqualTo("CONFIRMED");
        assertThat(result.aiSummary()).isEqualTo("Tóm tắt: Đau đầu, chóng mặt");

        // Kiểm tra slot đã được khóa
        assertThat(timeSlotRepo.findById(slotId).get().isAvailable()).isFalse();
    }

    @Test
    @DisplayName("Ném ResourceNotFoundException khi slotId không tồn tại")
    void testSlotNotFound() {
        BookAppointmentUseCase.Command command = new BookAppointmentUseCase.Command(
                "center-1", "pat-1", "doc-1", "non-existent-slot", "Sốt cao", null
        );

        assertThatThrownBy(() -> service.book(command))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("non-existent-slot");
    }

    @Test
    @DisplayName("Ném SlotNotAvailableException khi slot đã bị đặt trước (BOOKED)")
    void testSlotAlreadyBooked() {
        String slotId = "slot-booked";
        timeSlotRepo.save(new TimeSlot(slotId, "sch-1", Instant.now(), Instant.now().plusSeconds(1800), "BOOKED", 1));

        BookAppointmentUseCase.Command command = new BookAppointmentUseCase.Command(
                "center-1", "pat-1", "doc-1", slotId, "Đau bụng", null
        );

        assertThatThrownBy(() -> service.book(command))
                .isInstanceOf(SlotNotAvailableException.class)
                .hasMessageContaining("đã có người đặt trước hoặc tạm khóa");
    }

    @Test
    @DisplayName("Xử lý Concurrency: 10 luồng cùng tranh chấp 1 slot, chỉ 1 luồng thành công, 9 luồng nhận 409")
    void testConcurrencyBooking() throws InterruptedException {
        String slotId = "slot-hot";
        timeSlotRepo.save(new TimeSlot(slotId, "sch-1", Instant.now(), Instant.now().plusSeconds(1800), "AVAILABLE", 0));

        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch endLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final String patientId = "patient-" + i;
            executor.submit(() -> {
                try {
                    startLatch.await(); // Đợi cả 10 luồng cùng xuất phát 1 thời điểm
                    service.book(new BookAppointmentUseCase.Command(
                            "center-1", patientId, "doc-1", slotId, "Triệu chứng", null
                    ));
                    successCount.incrementAndGet();
                } catch (SlotNotAvailableException e) {
                    conflictCount.incrementAndGet();
                } catch (Exception e) {
                    // unexpected
                } finally {
                    endLatch.countDown();
                }
            });
        }

        startLatch.countDown(); // Phát lệnh bắn đồng thời
        boolean finished = endLatch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(finished).isTrue();
        assertThat(successCount.get()).isEqualTo(1); // Đúng 1 người đặt được
        assertThat(conflictCount.get()).isEqualTo(9); // 9 người còn lại bị chặn
        assertThat(appointmentRepo.count()).isEqualTo(1); // Chỉ 1 lịch hẹn duy nhất được ghi vào DB
    }

    // --- In-Memory Test Stubs ---
    static class InMemoryTimeSlotRepository implements TimeSlotRepositoryPort {
        private final ConcurrentHashMap<String, TimeSlot> storage = new ConcurrentHashMap<>();

        void save(TimeSlot slot) {
            storage.put(slot.id(), slot);
        }

        @Override
        public Optional<TimeSlot> findById(String id) {
            return Optional.ofNullable(storage.get(id));
        }

        @Override
        public synchronized boolean lockSlot(String slotId) {
            TimeSlot current = storage.get(slotId);
            if (current != null && current.isAvailable()) {
                storage.put(slotId, new TimeSlot(
                        current.id(), current.doctorScheduleId(), current.startTime(),
                        current.endTime(), "BOOKED", current.version() + 1
                ));
                return true;
            }
            return false;
        }
    }

    static class InMemoryAppointmentRepository implements AppointmentRepositoryPort {
        private final List<Appointment> list = new CopyOnWriteArrayList<>();

        @Override
        public Appointment save(Appointment a) {
            list.removeIf(item -> item.id().equals(a.id()));
            list.add(a);
            return a;
        }

        @Override
        public Optional<Appointment> findById(String id) {
            return list.stream().filter(a -> a.id().equals(id)).findFirst();
        }

        @Override
        public Optional<Appointment> findByBookingCode(String bookingCode) {
            return list.stream().filter(a -> a.bookingCode().equalsIgnoreCase(bookingCode)).findFirst();
        }

        @Override
        public List<Appointment> findByPatientProfileId(String patientProfileId) {
            return list.stream().filter(a -> a.patientProfileId().equals(patientProfileId)).toList();
        }

        int count() {
            return list.size();
        }
    }

    static class StubAiTriagePort implements AiTriagePort {
        @Override
        public String suggestSpecialty(String symptoms) {
            return "GENERAL_MEDICINE";
        }

        @Override
        public String generateClinicalSummary(String symptoms, String medicalHistory) {
            return "Tóm tắt: " + symptoms;
        }
    }
}
