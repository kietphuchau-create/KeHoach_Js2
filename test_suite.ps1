# ==============================================================================
# HỆ THỐNG TEST TỰ ĐỘNG WEB MEDSCHED (POWERSHELL TEST SUITE)
# Các mục kiểm thử:
#   1. Quản lý người dùng (Admin User Management)
#   2. Hồ sơ & Thông tin tài khoản (Profile & Account Info)
#   3. Thông tin bác sĩ / Phòng khám & Danh mục (Doctor/Clinic & Catalog)
#   4. Khám bệnh, Đặt lịch & Tiếp đón (Appointments, Doctor Queue, Prescription & Billing)
# ==============================================================================

param (
    [string]$BaseUrl = "http://localhost:8080"
)

$global:TotalTests = 0
$global:PassedTests = 0
$global:FailedTests = 0

function Write-Header($title) {
    Write-Host ""
    Write-Host "========================================================================" -ForegroundColor Cyan
    Write-Host "  $title" -ForegroundColor Cyan
    Write-Host "========================================================================" -ForegroundColor Cyan
}

function Write-SubHeader($title) {
    Write-Host ""
    Write-Host ">>> $title" -ForegroundColor Yellow
}

function Assert-Result($testName, $isSuccess, $detail = "") {
    $global:TotalTests++
    if ($isSuccess) {
        $global:PassedTests++
        Write-Host "  [PASS] $testName" -ForegroundColor Green
        if ($detail) { Write-Host "         -> $detail" -ForegroundColor Gray }
    } else {
        $global:FailedTests++
        Write-Host "  [FAIL] $testName" -ForegroundColor Red
        if ($detail) { Write-Host "         -> Lỗi: $detail" -ForegroundColor Magenta }
    }
}

function Invoke-ApiRequest {
    param (
        [string]$Method,
        [string]$Uri,
        [hashtable]$Headers = @{},
        $Body = $null
    )
    $allHeaders = @{
        "Content-Type" = "application/json; charset=utf-8"
        "Accept"       = "application/json"
    }
    foreach ($k in $Headers.Keys) {
        $allHeaders[$k] = $Headers[$k]
    }

    $jsonBody = $null
    if ($Body -ne $null) {
        if ($Body -is [string]) {
            $jsonBody = $Body
        } else {
            $jsonBody = $Body | ConvertTo-Json -Depth 10 -Compress
        }
    }

    try {
        if ($jsonBody -ne $null) {
            $response = Invoke-RestMethod -Method $Method -Uri "$BaseUrl$Uri" -Headers $allHeaders -Body ([System.Text.Encoding]::UTF8.GetBytes($jsonBody)) -ErrorAction Stop
        } else {
            $response = Invoke-RestMethod -Method $Method -Uri "$BaseUrl$Uri" -Headers $allHeaders -ErrorAction Stop
        }
        return @{ Success = $true; Data = $response; StatusCode = 200 }
    } catch {
        $statusCode = 0
        $errMsg = $_.Exception.Message
        if ($_.Exception.Response -ne $null) {
            $statusCode = [int]$_.Exception.Response.StatusCode
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $errMsg = $reader.ReadToEnd()
            } catch {}
        }
        return @{ Success = $false; Error = $errMsg; StatusCode = $statusCode }
    }
}

Write-Header "BẮT ĐẦU CHẠY KIỂM THỬ TỰ ĐỘNG HỆ THỐNG MEDSCHED"
Write-Host "Máy chủ backend: $BaseUrl" -ForegroundColor Gray
Write-Host "Thời gian: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray

# ------------------------------------------------------------------------------
# 0. KHỞI TẠO TOKEN ĐĂNG NHẬP CHO CÁC ROLE
# ------------------------------------------------------------------------------
Write-SubHeader "0. Đăng nhập lấy Token các vai trò (Admin, Doctor, Staff, Patient)"

$adminLogin = Invoke-ApiRequest -Method "POST" -Uri "/api/v1/auth/login" -Body @{
    email = "admin@medsched.vn"
    password = "Medsched@123"
}
Assert-Result "Đăng nhập Admin (admin@medsched.vn)" $adminLogin.Success
$adminToken = if ($adminLogin.Success) { $adminLogin.Data.accessToken } else { "" }
$adminHeaders = @{ "Authorization" = "Bearer $adminToken" }

$doctorLogin = Invoke-ApiRequest -Method "POST" -Uri "/api/v1/auth/login" -Body @{
    email = "dr.minhanh@medsched.vn"
    password = "Medsched@123"
}
Assert-Result "Đăng nhập Bác sĩ (dr.minhanh@medsched.vn)" $doctorLogin.Success
$doctorToken = if ($doctorLogin.Success) { $doctorLogin.Data.accessToken } else { "" }
$doctorHeaders = @{ "Authorization" = "Bearer $doctorToken" }

$staffLogin = Invoke-ApiRequest -Method "POST" -Uri "/api/v1/auth/login" -Body @{
    email = "letan.q1@medsched.vn"
    password = "Medsched@123"
}
Assert-Result "Đăng nhập Lễ tân (letan.q1@medsched.vn)" $staffLogin.Success
$staffToken = if ($staffLogin.Success) { $staffLogin.Data.accessToken } else { "" }
$staffHeaders = @{ "Authorization" = "Bearer $staffToken" }

$patientLogin = Invoke-ApiRequest -Method "POST" -Uri "/api/v1/auth/login" -Body @{
    email = "benhnhan.demo@gmail.com"
    password = "Medsched@123"
}
Assert-Result "Đăng nhập Bệnh nhân (benhnhan.demo@gmail.com)" $patientLogin.Success
$patientToken = if ($patientLogin.Success) { $patientLogin.Data.accessToken } else { "" }
$patientHeaders = @{ "Authorization" = "Bearer $patientToken" }

# ==============================================================================
# MỤC 1: QUẢN LÝ NGƯỜI DÙNG (ADMIN USER MANAGEMENT)
# ==============================================================================
Write-Header "MỤC 1: KIỂM THỬ QUẢN LÝ NGƯỜI DÙNG (ADMIN)"

# 1.1 Lấy danh sách người dùng
$usersRes = Invoke-ApiRequest -Method "GET" -Uri "/api/v1/admin/users?page=0&size=10" -Headers $adminHeaders
Assert-Result "1.1 Admin lấy danh sách người dùng (GET /api/v1/admin/users)" ($usersRes.Success -and $usersRes.Data.content.Count -gt 0) "Tổng số users: $($usersRes.Data.totalElements)"

# 1.2 Lấy danh sách lọc theo vai trò DOCTOR
$docListRes = Invoke-ApiRequest -Method "GET" -Uri "/api/v1/admin/users?role=ROLE_DOCTOR" -Headers $adminHeaders
Assert-Result "1.2 Admin lọc danh sách Bác sĩ (role=ROLE_DOCTOR)" $docListRes.Success "Tìm thấy $($docListRes.Data.content.Count) bác sĩ"

# 1.3 Tạo tài khoản Lễ tân mới
$randId = Get-Random -Minimum 1000 -Maximum 9999
$newStaffEmail = "staff.test$randId@medsched.vn"
$createStaffRes = Invoke-ApiRequest -Method "POST" -Uri "/api/v1/admin/users/staff" -Headers $adminHeaders -Body @{
    email = $newStaffEmail
    fullName = "Lễ Tân Tự Động $randId"
    phone = "0908$randId"
    centerId = "a1b2c3d4-0001-4000-8000-000000000001"
}
Assert-Result "1.3 Admin tạo tài khoản Lễ tân mới ($newStaffEmail)" $createStaffRes.Success
$createdStaffId = if ($createStaffRes.Success) { $createStaffRes.Data.id } else { "" }

# 1.4 Tạo tài khoản Bác sĩ mới
$newDocEmail = "doctor.test$randId@medsched.vn"
$createDocRes = Invoke-ApiRequest -Method "POST" -Uri "/api/v1/admin/users/doctors" -Headers $adminHeaders -Body @{
    email = $newDocEmail
    fullName = "BS. Test Tự Động $randId"
    phone = "0907$randId"
    specialtyId = "b1c2d3e4-0001-4000-8000-000000000001"
    academicTitle = "ThS.BS"
    experienceYears = 5
    biography = "Bác sĩ thử nghiệm tự động"
    consultationFee = 350000
    roomNumber = "P.303"
}
Assert-Result "1.4 Admin tạo tài khoản Bác sĩ mới ($newDocEmail)" $createDocRes.Success

# 1.5 Khóa và Mở khóa tài khoản
if ($createdStaffId) {
    $lockRes = Invoke-ApiRequest -Method "PATCH" -Uri "/api/v1/admin/users/$createdStaffId/status" -Headers $adminHeaders -Body @{ active = $false }
    Assert-Result "1.5 Admin khóa tài khoản vừa tạo (active=false)" ($lockRes.Success -and $lockRes.Data.active -eq $false)

    $unlockRes = Invoke-ApiRequest -Method "PATCH" -Uri "/api/v1/admin/users/$createdStaffId/status" -Headers $adminHeaders -Body @{ active = $true }
    Assert-Result "1.6 Admin mở khóa tài khoản (active=true)" ($unlockRes.Success -and $unlockRes.Data.active -eq $true)
}

# ==============================================================================
# MỤC 2: HỒ SƠ & THÔNG TIN TÀI KHOẢN (PROFILE & ACCOUNT INFO)
# ==============================================================================
Write-Header "MỤC 2: KIỂM THỬ HỒ SƠ & THÔNG TIN TÀI KHOẢN"

# 2.1 Xem thông tin bản thân (GET /api/v1/me)
$meRes = Invoke-ApiRequest -Method "GET" -Uri "/api/v1/me" -Headers $patientHeaders
Assert-Result "2.1 Bệnh nhân xem hồ sơ cá nhân (GET /api/v1/me)" ($meRes.Success -and $meRes.Data.user.email -eq "benhnhan.demo@gmail.com") "Họ tên: $($meRes.Data.user.fullName)"
$patientProfileId = if ($meRes.Success -and $meRes.Data.patientProfile) { $meRes.Data.patientProfile.id } else { "" }

# 2.2 Cập nhật Profile cá nhân (PUT /api/v1/me)
$updateProfileRes = Invoke-ApiRequest -Method "PUT" -Uri "/api/v1/me" -Headers $patientHeaders -Body @{
    fullName = "Bệnh Nhân Demo Cập Nhật"
    phone = "0988776655"
}
Assert-Result "2.2 Bệnh nhân cập nhật Họ tên & SĐT (PUT /api/v1/me)" ($updateProfileRes.Success -and $updateProfileRes.Data.user.fullName -eq "Bệnh Nhân Demo Cập Nhật")

# 2.3 Cập nhật hồ sơ y tế bệnh nhân (PUT /api/v1/me/patient-profile)
$updateMedicalRes = Invoke-ApiRequest -Method "PUT" -Uri "/api/v1/me/patient-profile" -Headers $patientHeaders -Body @{
    cccdNumber = "079200012345"
    insuranceCode = "DN4790012345678"
    gender = "MALE"
    dateOfBirth = "1995-05-20"
    address = "123 Nguyễn Thị Minh Khai, Quận 1, TP.HCM"
    medicalHistory = "Dị ứng penicillin nhẹ"
}
Assert-Result "2.3 Cập nhật hồ sơ y tế (CCCD, BHYT, Địa chỉ, Tiền sử bệnh)" $updateMedicalRes.Success

# 2.4 Bác sĩ cập nhật thông tin học vị & tiểu sử (PUT /api/v1/me/doctor-profile)
$updateDocProfileRes = Invoke-ApiRequest -Method "PUT" -Uri "/api/v1/me/doctor-profile" -Headers $doctorHeaders -Body @{
    academicTitle = "BS.CKII"
    experienceYears = 12
    biography = "Chuyên gia khám da liễu & thẩm mỹ da hơn 12 năm kinh nghiệm"
    avatarUrl = "https://images.unsplash.com/photo-1622253692010-333f2da6031d"
}
Assert-Result "2.4 Bác sĩ cập nhật hồ sơ chuyên môn (PUT /api/v1/me/doctor-profile)" $updateDocProfileRes.Success

# ==============================================================================
# MỤC 3: THÔNG TIN BÁC SĨ / PHÒNG KHÁM & DANH MỤC (CATALOG & CLINIC)
# ==============================================================================
Write-Header "MỤC 3: KIỂM THỬ THÔNG TIN BÁC SĨ, PHÒNG KHÁM & DANH MỤC"

# 3.1 Danh sách cơ sở y tế / phòng khám
$centersRes = Invoke-ApiRequest -Method "GET" -Uri "/api/v1/medical-centers" -Headers $patientHeaders
Assert-Result "3.1 Lấy danh sách Cơ sở y tế (GET /api/v1/medical-centers)" ($centersRes.Success -and $centersRes.Data.Count -gt 0) "Số cơ sở: $($centersRes.Data.Count)"
$centerId = if ($centersRes.Success -and $centersRes.Data.Count -gt 0) { $centersRes.Data[0].id } else { "" }

# 3.2 Danh sách Chuyên khoa
$specsRes = Invoke-ApiRequest -Method "GET" -Uri "/api/v1/specialties" -Headers $patientHeaders
Assert-Result "3.2 Lấy danh sách Chuyên khoa khám (GET /api/v1/specialties)" ($specsRes.Success -and $specsRes.Data.Count -gt 0) "Số chuyên khoa: $($specsRes.Data.Count)"
$specId = if ($specsRes.Success -and $specsRes.Data.Count -gt 0) { $specsRes.Data[0].id } else { "" }

# 3.3 Danh sách Dịch vụ & Bảng giá
$servicesRes = Invoke-ApiRequest -Method "GET" -Uri "/api/v1/services" -Headers $patientHeaders
Assert-Result "3.3 Lấy danh mục Dịch vụ khám & Bảng giá (GET /api/v1/services)" ($servicesRes.Success -and $servicesRes.Data.Count -gt 0) "Số dịch vụ: $($servicesRes.Data.Count)"

# 3.4 Danh sách Bác sĩ khám
$doctorsRes = Invoke-ApiRequest -Method "GET" -Uri "/api/v1/doctors" -Headers $patientHeaders
Assert-Result "3.4 Lấy danh sách Bác sĩ công khai (GET /api/v1/doctors)" ($doctorsRes.Success -and $doctorsRes.Data.Count -gt 0) "Số bác sĩ: $($doctorsRes.Data.Count)"
$targetDoctorId = if ($doctorsRes.Success -and $doctorsRes.Data.Count -gt 0) { $doctorsRes.Data[0].id } else { "10b2c3d4-0001-4000-8000-000000000001" }

# ==============================================================================
# MỤC 4: KHÁM BỆNH, ĐẶT LỊCH & TIẾP ĐÓN (APPOINTMENTS, DOCTOR QUEUE & BILLING)
# ==============================================================================
Write-Header "MỤC 4: KIỂM THỬ KHÁM BỆNH, ĐẶT LỊCH & TIẾP ĐÓN"

# 4.1 Lấy danh sách khung giờ (TimeSlots) của bác sĩ
$slotsRes = Invoke-ApiRequest -Method "GET" -Uri "/api/appointments/doctors/$targetDoctorId/slots" -Headers $patientHeaders
Assert-Result "4.1 Lấy khung giờ khám trống của Bác sĩ (GET .../slots)" ($slotsRes.Success -and $slotsRes.Data.Count -gt 0) "Số slot: $($slotsRes.Data.Count)"

$availableSlot = $null
if ($slotsRes.Success) {
    $availableSlot = $slotsRes.Data | Where-Object { $_.status -eq "available" } | Select-Object -First 1
}
$slotId = if ($availableSlot) { $availableSlot.id } else { if ($slotsRes.Success -and $slotsRes.Data.Count -gt 0) { $slotsRes.Data[0].id } else { "" } }

# 4.2 Bệnh nhân đặt lịch khám trực tuyến
$bookingCode = ""
$appointmentId = ""
if ($slotId -and $patientProfileId) {
    $bookRes = Invoke-ApiRequest -Method "POST" -Uri "/api/appointments" -Headers $patientHeaders -Body @{
        medicalCenterId = $centerId
        patientProfileId = $patientProfileId
        doctorId = $targetDoctorId
        slotId = $slotId
        symptoms = "Đau tức ngực và ho khan về đêm"
        medicalHistory = "Không có tiền sử dị ứng thuốc"
    }
    Assert-Result "4.2 Bệnh nhân đặt lịch khám trực tuyến (POST /api/appointments)" $bookRes.Success "Mã hẹn: $($bookRes.Data.bookingCode)"
    $bookingCode = if ($bookRes.Success) { $bookRes.Data.bookingCode } else { "" }
    $appointmentId = if ($bookRes.Success) { $bookRes.Data.id } else { "" }
}

# 4.3 Tra cứu lịch sử khám của Bệnh nhân
if ($patientProfileId) {
    $myAppsRes = Invoke-ApiRequest -Method "GET" -Uri "/api/appointments/patient/$patientProfileId" -Headers $patientHeaders
    Assert-Result "4.3 Xem lịch sử đặt khám của Bệnh nhân (GET /api/appointments/patient/...)" ($myAppsRes.Success -and $myAppsRes.Data.Count -gt 0) "Số ca đã đặt: $($myAppsRes.Data.Count)"
}

# 4.4 Tiếp đón: Check-in bằng mã hẹn / QR tại quầy Lễ tân
if ($bookingCode) {
    $checkinQrRes = Invoke-ApiRequest -Method "POST" -Uri "/api/reception/checkin/qr" -Headers $staffHeaders -Body @{
        bookingCode = $bookingCode
    }
    Assert-Result "4.4 Lễ tân Check-in mã QR / Mã đặt hẹn ($bookingCode)" $checkinQrRes.Success "STT cấp: $($checkinQrRes.Data.queueNumber)"
}

# 4.5 Tiếp đón: Đăng ký khám vãng lai tại quầy (Walk-in)
$walkinPhone = "0912" + (Get-Random -Minimum 100000 -Maximum 999999)
$walkinRes = Invoke-ApiRequest -Method "POST" -Uri "/api/reception/walkin" -Headers $staffHeaders -Body @{
    fullName = "Bệnh Nhân Vãng Lai Tự Động"
    phone = $walkinPhone
    cccdNumber = "079200998877"
    doctorId = $targetDoctorId
    specialty = "Khám Nội tổng quát"
}
Assert-Result "4.5 Tiếp nhận bệnh nhân Vãng lai tại quầy (POST /api/reception/walkin)" $walkinRes.Success "STT: $($walkinRes.Data.queueNumber) - Phòng: $($walkinRes.Data.roomNumber)"

# 4.6 Bác sĩ: Xem danh sách hàng đợi khám hôm nay
$queueRes = Invoke-ApiRequest -Method "GET" -Uri "/api/doctor/queue" -Headers $doctorHeaders
Assert-Result "4.6 Bác sĩ xem hàng đợi bệnh nhân chờ khám (GET /api/doctor/queue)" $queueRes.Success "Bệnh nhân trong hàng đợi: $($queueRes.Data.Count)"

# 4.7 Bác sĩ: Gọi bệnh nhân vào phòng khám
$activeAppId = if ($appointmentId) { $appointmentId } else { if ($walkinRes.Success) { $walkinRes.Data.appointmentId } else { "" } }
if ($activeAppId) {
    $callRes = Invoke-ApiRequest -Method "POST" -Uri "/api/doctor/appointments/$activeAppId/call" -Headers $doctorHeaders
    Assert-Result "4.7 Bác sĩ gọi bệnh nhân vào phòng (POST .../call)" $callRes.Success
}

# 4.8 Bác sĩ: Hoàn tất khám & Kê đơn thuốc điện tử
if ($activeAppId) {
    $prescriptRes = Invoke-ApiRequest -Method "POST" -Uri "/api/doctor/appointments/$activeAppId/prescriptions" -Headers $doctorHeaders -Body @{
        diagnosis = "Viêm phế quản cấp thể nhẹ"
        notes = "Uống nhiều nước ấm, nghỉ ngơi hợp lý"
        followUpDate = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
        items = @(
            @{
                medicationName = "Augmentin 1g"
                dosage = "1 viên x 2 lần/ngày"
                durationDays = 5
                unit = "Viên"
                quantity = 10
                unitPrice = 18000
                usageInstruction = "Uống sau ăn no sáng - chiều"
            },
            @{
                medicationName = "Paracetamol 500mg"
                dosage = "1 viên khi sốt trên 38.5 độ"
                durationDays = 3
                unit = "Viên"
                quantity = 6
                unitPrice = 3000
                usageInstruction = "Uống cách nhau 4-6 tiếng khi sốt"
            }
        )
    }
    Assert-Result "4.8 Bác sĩ chẩn đoán & kê đơn thuốc điện tử (POST .../prescriptions)" $prescriptRes.Success "Mã đơn thuốc: $($prescriptRes.Data.prescriptionCode) - Tổng tiền: $($prescriptRes.Data.totalMedicationAmount) VNĐ"
}

# 4.9 Quầy tiếp đón: Xem hóa đơn thanh toán
if ($activeAppId) {
    $billRes = Invoke-ApiRequest -Method "GET" -Uri "/api/reception/appointments/$activeAppId/bill" -Headers $staffHeaders
    Assert-Result "4.9 Quầy Lễ tân xuất phiếu thu & bảng kê chi phí (GET .../bill)" $billRes.Success "Tổng tiền hóa đơn: $($billRes.Data.totalAmount) VNĐ"

    if ($billRes.Success -and $billRes.Data.invoiceId) {
        $invoiceId = $billRes.Data.invoiceId
        $payRes = Invoke-ApiRequest -Method "POST" -Uri "/api/reception/invoices/$invoiceId/pay" -Headers $staffHeaders -Body @{
            paymentMethod = "CASH"
            receivedAmount = $billRes.Data.totalAmount
        }
        Assert-Result "4.10 Xác nhận thu tiền & đóng bệnh án (POST .../pay)" $payRes.Success "Biên lai thanh toán: $($payRes.Data.receiptNumber)"
    }
}

# ==============================================================================
# TỔNG KẾT KẾT QUẢ KIỂM THỬ
# ==============================================================================
Write-Header "TỔNG KẾT KẾT QUẢ KIỂM THỬ TỰ ĐỘNG"
Write-Host "Tổng số ca kiểm thử: $global:TotalTests" -ForegroundColor White
Write-Host "  -> THÀNH CÔNG (PASS): $global:PassedTests" -ForegroundColor Green
Write-Host "  -> THẤT BẠI (FAIL) : $global:FailedTests" -ForegroundColor $(if ($global:FailedTests -eq 0) { "Green" } else { "Red" })

if ($global:FailedTests -eq 0) {
    Write-Host "`n>>> TẤT CẢ CÁC TÍNH NĂNG ĐÃ VƯỢT QUA BÀI TEST TỰ ĐỘNG THÀNH CÔNG 100%! <<<" -ForegroundColor Green
} else {
    Write-Host "`n>>> CÓ $global:FailedTests BÀI TEST CHƯA ĐẠT. VUI LÒNG KIỂM TRA LOG Ở TRÊN! <<<" -ForegroundColor Yellow
}
Write-Host ""
