/**
 * ==============================================================================
 * HỆ THỐNG TEST TỰ ĐỘNG WEB MEDSCHED (NODE.JS TEST RUNNER)
 * 
 * Các mục kiểm thử:
 *   1. Quản lý người dùng (Admin User Management)
 *   2. Hồ sơ & Thông tin tài khoản (Profile & Account Info)
 *   3. Thông tin bác sĩ / Phòng khám & Danh mục (Doctor/Clinic & Catalog)
 *   4. Khám bệnh, Đặt lịch & Tiếp đón (Appointments, Queue, Prescription, Billing)
 * 
 * Chạy bằng lệnh: node test_suite.js [baseUrl]
 * ==============================================================================
 */

const BASE_URL = process.argv[2] || 'http://localhost:8080';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function logHeader(title) {
  console.log(`\n${colors.cyan}========================================================================${colors.reset}`);
  console.log(`  ${colors.bright}${title}${colors.reset}`);
  console.log(`${colors.cyan}========================================================================${colors.reset}`);
}

function logSubHeader(title) {
  console.log(`\n${colors.yellow}>>> ${title}${colors.reset}`);
}

function assertResult(testName, isSuccess, detail = '') {
  totalTests++;
  if (isSuccess) {
    passedTests++;
    console.log(`  ${colors.green}[PASS]${colors.reset} ${testName}`);
    if (detail) console.log(`         ${colors.gray}-> ${detail}${colors.reset}`);
  } else {
    failedTests++;
    console.log(`  ${colors.red}[FAIL]${colors.reset} ${testName}`);
    if (detail) console.log(`         ${colors.red}-> Lỗi: ${detail}${colors.reset}`);
  }
}

async function apiRequest(method, path, headers = {}, body = null) {
  const url = `${BASE_URL}${path}`;
  const reqHeaders = {
    'Content-Type': 'application/json; charset=utf-8',
    'Accept': 'application/json',
    ...headers,
  };

  const options = {
    method,
    headers: reqHeaders,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, options);
    let data = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return {
      success: res.ok,
      status: res.status,
      data,
    };
  } catch (err) {
    return {
      success: false,
      status: 0,
      error: err.message,
    };
  }
}

async function runTests() {
  logHeader('BẮT ĐẦU CHẠY KIỂM THỬ TỰ ĐỘNG HỆ THỐNG MEDSCHED');
  console.log(`Máy chủ backend: ${BASE_URL}`);
  console.log(`Thời gian: ${new Date().toLocaleString('vi-VN')}`);

  // ----------------------------------------------------------------------------
  // 0. ĐĂNG NHẬP LẤY TOKEN
  // ----------------------------------------------------------------------------
  logSubHeader('0. Đăng nhập lấy Token các vai trò');

  const adminLogin = await apiRequest('POST', '/api/v1/auth/login', {}, {
    email: 'admin@medsched.vn',
    password: 'Medsched@123',
  });
  assertResult('Đăng nhập Admin (admin@medsched.vn)', adminLogin.success);
  const adminToken = adminLogin.data?.accessToken;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  const doctorLogin = await apiRequest('POST', '/api/v1/auth/login', {}, {
    email: 'dr.minhanh@medsched.vn',
    password: 'Medsched@123',
  });
  assertResult('Đăng nhập Bác sĩ (dr.minhanh@medsched.vn)', doctorLogin.success);
  const doctorToken = doctorLogin.data?.accessToken;
  const doctorHeaders = { Authorization: `Bearer ${doctorToken}` };

  const staffLogin = await apiRequest('POST', '/api/v1/auth/login', {}, {
    email: 'letan.q1@medsched.vn',
    password: 'Medsched@123',
  });
  assertResult('Đăng nhập Lễ tân (letan.q1@medsched.vn)', staffLogin.success);
  const staffToken = staffLogin.data?.accessToken;
  const staffHeaders = { Authorization: `Bearer ${staffToken}` };

  const patientLogin = await apiRequest('POST', '/api/v1/auth/login', {}, {
    email: 'benhnhan.demo@gmail.com',
    password: 'Medsched@123',
  });
  assertResult('Đăng nhập Bệnh nhân (benhnhan.demo@gmail.com)', patientLogin.success);
  const patientToken = patientLogin.data?.accessToken;
  const patientHeaders = { Authorization: `Bearer ${patientToken}` };

  // ============================================================================
  // MỤC 1: QUẢN LÝ NGƯỜI DÙNG (ADMIN)
  // ============================================================================
  logHeader('MỤC 1: KIỂM THỬ QUẢN LÝ NGƯỜI DÙNG (ADMIN)');

  const usersRes = await apiRequest('GET', '/api/v1/admin/users?page=0&size=10', adminHeaders);
  assertResult('1.1 Admin lấy danh sách người dùng (GET /api/v1/admin/users)', usersRes.success && usersRes.data?.content?.length > 0, `Tổng số users: ${usersRes.data?.totalElements}`);

  const docListRes = await apiRequest('GET', '/api/v1/admin/users?role=ROLE_DOCTOR', adminHeaders);
  assertResult('1.2 Admin lọc danh sách Bác sĩ (role=ROLE_DOCTOR)', docListRes.success, `Tìm thấy ${docListRes.data?.content?.length} bác sĩ`);

  const randId = Math.floor(1000 + Math.random() * 9000);
  const createStaffRes = await apiRequest('POST', '/api/v1/admin/users/staff', adminHeaders, {
    email: `staff.test${randId}@medsched.vn`,
    fullName: `Lễ Tân Tự Động ${randId}`,
    phone: `0908${randId}`,
    centerId: 'a1b2c3d4-0001-4000-8000-000000000001',
  });
  assertResult(`1.3 Admin tạo tài khoản Lễ tân mới (staff.test${randId}@medsched.vn)`, createStaffRes.success);
  const createdStaffId = createStaffRes.data?.id;

  const createDocRes = await apiRequest('POST', '/api/v1/admin/users/doctors', adminHeaders, {
    email: `doctor.test${randId}@medsched.vn`,
    fullName: `BS. Test Tự Động ${randId}`,
    phone: `0907${randId}`,
    specialtyId: 'b1c2d3e4-0001-4000-8000-000000000001',
    academicTitle: 'ThS.BS',
    experienceYears: 5,
    biography: 'Bác sĩ kiểm thử tự động',
    consultationFee: 350000,
    roomNumber: 'P.303',
  });
  assertResult(`1.4 Admin tạo tài khoản Bác sĩ mới (doctor.test${randId}@medsched.vn)`, createDocRes.success);

  if (createdStaffId) {
    const lockRes = await apiRequest('PATCH', `/api/v1/admin/users/${createdStaffId}/status`, adminHeaders, { active: false });
    assertResult('1.5 Admin khóa tài khoản (active=false)', lockRes.success && lockRes.data?.active === false);

    const unlockRes = await apiRequest('PATCH', `/api/v1/admin/users/${createdStaffId}/status`, adminHeaders, { active: true });
    assertResult('1.6 Admin mở khóa tài khoản (active=true)', unlockRes.success && unlockRes.data?.active === true);
  }

  // ============================================================================
  // MỤC 2: HỒ SƠ & THÔNG TIN TÀI KHOẢN (PROFILE)
  // ============================================================================
  logHeader('MỤC 2: KIỂM THỬ HỒ SƠ & THÔNG TIN TÀI KHOẢN');

  const meRes = await apiRequest('GET', '/api/v1/me', patientHeaders);
  assertResult('2.1 Bệnh nhân xem hồ sơ cá nhân (GET /api/v1/me)', meRes.success && meRes.data?.user?.email === 'benhnhan.demo@gmail.com', `Họ tên: ${meRes.data?.user?.fullName}`);
  const patientProfileId = meRes.data?.patientProfile?.id;

  const updateProfileRes = await apiRequest('PUT', '/api/v1/me', patientHeaders, {
    fullName: 'Bệnh Nhân Demo Cập Nhật',
    phone: '0988776655',
  });
  assertResult('2.2 Bệnh nhân sửa Họ tên & SĐT (PUT /api/v1/me)', updateProfileRes.success && updateProfileRes.data?.user?.fullName === 'Bệnh Nhân Demo Cập Nhật');

  const updateMedicalRes = await apiRequest('PUT', '/api/v1/me/patient-profile', patientHeaders, {
    cccdNumber: '079200012345',
    insuranceCode: 'DN4790012345678',
    gender: 'MALE',
    dateOfBirth: '1995-05-20',
    address: '123 Nguyễn Thị Minh Khai, Quận 1, TP.HCM',
    medicalHistory: 'Dị ứng penicillin nhẹ',
  });
  assertResult('2.3 Cập nhật hồ sơ y tế bệnh nhân (CCCD, BHYT, Địa chỉ, Tiền sử)', updateMedicalRes.success);

  const updateDocProfileRes = await apiRequest('PUT', '/api/v1/me/doctor-profile', doctorHeaders, {
    academicTitle: 'BS.CKII',
    experienceYears: 12,
    biography: 'Chuyên gia khám da liễu & thẩm mỹ da hơn 12 năm kinh nghiệm',
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d',
  });
  assertResult('2.4 Bác sĩ cập nhật hồ sơ chuyên môn (PUT /api/v1/me/doctor-profile)', updateDocProfileRes.success);

  // ============================================================================
  // MỤC 3: THÔNG TIN BÁC SĨ / PHÒNG KHÁM & DANH MỤC
  // ============================================================================
  logHeader('MỤC 3: KIỂM THỬ THÔNG TIN BÁC SĨ, PHÒNG KHÁM & DANH MỤC');

  const centersRes = await apiRequest('GET', '/api/v1/medical-centers', patientHeaders);
  assertResult('3.1 Lấy danh sách Cơ sở y tế (GET /api/v1/medical-centers)', centersRes.success && centersRes.data?.length > 0, `Số cơ sở: ${centersRes.data?.length}`);
  const centerId = centersRes.data?.[0]?.id;

  const specsRes = await apiRequest('GET', '/api/v1/specialties', patientHeaders);
  assertResult('3.2 Lấy danh sách Chuyên khoa (GET /api/v1/specialties)', specsRes.success && specsRes.data?.length > 0, `Số chuyên khoa: ${specsRes.data?.length}`);

  const servicesRes = await apiRequest('GET', '/api/v1/services', patientHeaders);
  assertResult('3.3 Lấy bảng giá Dịch vụ khám (GET /api/v1/services)', servicesRes.success && servicesRes.data?.length > 0, `Số dịch vụ: ${servicesRes.data?.length}`);

  const doctorsRes = await apiRequest('GET', '/api/v1/doctors', patientHeaders);
  assertResult('3.4 Lấy danh sách Bác sĩ công khai (GET /api/v1/doctors)', doctorsRes.success && doctorsRes.data?.length > 0, `Số bác sĩ: ${doctorsRes.data?.length}`);
  const targetDoctorId = doctorsRes.data?.[0]?.id || '10b2c3d4-0001-4000-8000-000000000001';

  // ============================================================================
  // MỤC 4: KHÁM BỆNH, ĐẶT LỊCH & TIẾP ĐÓN
  // ============================================================================
  logHeader('MỤC 4: KIỂM THỬ KHÁM BỆNH, ĐẶT LỊCH & TIẾP ĐÓN');

  const slotsRes = await apiRequest('GET', `/api/appointments/doctors/${targetDoctorId}/slots`, patientHeaders);
  assertResult('4.1 Lấy khung giờ khám trống của Bác sĩ', slotsRes.success && slotsRes.data?.length > 0, `Số slots: ${slotsRes.data?.length}`);

  const availableSlot = slotsRes.data?.find(s => s.status === 'available') || slotsRes.data?.[0];
  const slotId = availableSlot?.id;

  let bookingCode = '';
  let appointmentId = '';
  if (slotId && patientProfileId) {
    const bookRes = await apiRequest('POST', '/api/appointments', patientHeaders, {
      medicalCenterId: centerId,
      patientProfileId: patientProfileId,
      doctorId: targetDoctorId,
      slotId: slotId,
      symptoms: 'Đau đầu và sốt nhẹ về chiều',
      medicalHistory: 'Không có tiền sử dị ứng',
    });
    assertResult('4.2 Bệnh nhân đặt lịch khám trực tuyến (POST /api/appointments)', bookRes.success, `Mã hẹn: ${bookRes.data?.bookingCode}`);
    bookingCode = bookRes.data?.bookingCode;
    appointmentId = bookRes.data?.id;
  }

  if (patientProfileId) {
    const myAppsRes = await apiRequest('GET', `/api/appointments/patient/${patientProfileId}`, patientHeaders);
    assertResult('4.3 Xem danh sách lịch hẹn của bệnh nhân', myAppsRes.success && myAppsRes.data?.length > 0, `Số ca: ${myAppsRes.data?.length}`);
  }

  if (bookingCode) {
    const checkinQrRes = await apiRequest('POST', '/api/reception/checkin/qr', staffHeaders, { bookingCode });
    assertResult(`4.4 Lễ tân Check-in mã QR / Vé hẹn (${bookingCode})`, checkinQrRes.success, `STT: ${checkinQrRes.data?.queueNumber}`);
  }

  const walkinPhone = `0912${Math.floor(100000 + Math.random() * 900000)}`;
  const walkinRes = await apiRequest('POST', '/api/reception/walkin', staffHeaders, {
    fullName: 'Bệnh Nhân Vãng Lai Tự Động',
    phone: walkinPhone,
    cccdNumber: '079200889911',
    doctorId: targetDoctorId,
    specialty: 'Khám Nội tổng quát',
  });
  assertResult('4.5 Tiếp đón bệnh nhân Vãng lai tại quầy (POST /api/reception/walkin)', walkinRes.success, `STT: ${walkinRes.data?.queueNumber} - Phòng: ${walkinRes.data?.roomNumber}`);

  const queueRes = await apiRequest('GET', '/api/doctor/queue', doctorHeaders);
  assertResult('4.6 Bác sĩ xem danh sách hàng đợi khám hôm nay (GET /api/doctor/queue)', queueRes.success, `Hàng đợi: ${queueRes.data?.length} bệnh nhân`);

  const activeAppId = appointmentId || walkinRes.data?.appointmentId;
  if (activeAppId) {
    const callRes = await apiRequest('POST', `/api/doctor/appointments/${activeAppId}/call`, doctorHeaders);
    assertResult('4.7 Bác sĩ gọi bệnh nhân vào phòng khám (POST .../call)', callRes.success);

    const prescriptRes = await apiRequest('POST', `/api/doctor/appointments/${activeAppId}/prescriptions`, doctorHeaders, {
      diagnosis: 'Viêm mũi xoang cấp',
      notes: 'Uống thuốc đúng liều lượng, tái khám sau 7 ngày',
      followUpDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      items: [
        {
          medicationName: 'Amoxicillin 500mg',
          dosage: '1 viên x 3 lần/ngày',
          durationDays: 5,
          unit: 'Viên',
          quantity: 15,
          unitPrice: 5000,
          usageInstruction: 'Uống sau bữa ăn',
        },
      ],
    });
    assertResult('4.8 Bác sĩ hoàn tất khám & kê đơn thuốc điện tử', prescriptRes.success, `Mã đơn: ${prescriptRes.data?.prescriptionCode} - Tổng tiền: ${prescriptRes.data?.totalMedicationAmount} VNĐ`);

    const billRes = await apiRequest('GET', `/api/reception/appointments/${activeAppId}/bill`, staffHeaders);
    assertResult('4.9 Lễ tân lấy chi tiết hóa đơn thanh toán', billRes.success, `Tổng tiền: ${billRes.data?.totalAmount} VNĐ`);

    if (billRes.success && billRes.data?.invoiceId) {
      const payRes = await apiRequest('POST', `/api/reception/invoices/${billRes.data.invoiceId}/pay`, staffHeaders, {
        paymentMethod: 'CASH',
        receivedAmount: billRes.data.totalAmount,
      });
      assertResult('4.10 Lễ tân xác nhận thu tiền & hoàn tất quy trình', payRes.success, `Mã biên lai: ${payRes.data?.receiptNumber}`);
    }
  }

  // ============================================================================
  // TỔNG KẾT
  // ============================================================================
  logHeader('TỔNG KẾT KẾT QUẢ KIỂM THỬ TỰ ĐỘNG');
  console.log(`Tổng số ca kiểm thử : ${totalTests}`);
  console.log(`  ${colors.green}-> THÀNH CÔNG (PASS) : ${passedTests}${colors.reset}`);
  console.log(`  ${failedTests === 0 ? colors.green : colors.red}-> THẤT BẠI (FAIL)  : ${failedTests}${colors.reset}`);

  if (failedTests === 0) {
    console.log(`\n${colors.green}${colors.bright}>>> TẤT CẢ 4 MỤC CHỨC NĂNG ĐÃ VƯỢT QUA TEST TỰ ĐỘNG 100%! <<<${colors.reset}\n`);
  } else {
    console.log(`\n${colors.yellow}>>> CÓ ${failedTests} TEST CHƯA ĐẠT. VUI LÒNG KIỂM TRA LOG Ở TRÊN! <<<${colors.reset}\n`);
  }
}

runTests();
