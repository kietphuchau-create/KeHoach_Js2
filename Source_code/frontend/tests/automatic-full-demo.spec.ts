import { test, expect, Page } from '@playwright/test';

test.describe('DevHub/Medical Website - Comprehensive Live Demo (MedSched)', () => {

  // Helper gõ phím từ từ tự nhiên như người dùng thật
  async function typeNaturally(page: Page, selector: string, text: string) {
    const el = page.locator(selector).first();
    try {
      await el.waitFor({ state: 'visible', timeout: 10000 });
      await el.click();
      await el.fill('');
      for (const char of text) {
        await el.pressSequentially(char, { delay: 35 });
      }
    } catch {
      // Bỏ qua nếu selector phụ
    }
  }

  // Helper cuộn trang mượt mà để video ghi lại toàn cảnh giao diện
  async function smoothScrollDown(page: Page) {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 120;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
    await page.waitForTimeout(800);
  }

  // Helper cuộn lên đầu trang
  async function smoothScrollUp(page: Page) {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        const timer = setInterval(() => {
          if (window.scrollY <= 0) {
            clearInterval(timer);
            resolve();
          }
          window.scrollBy(0, -180);
        }, 80);
      });
    });
    await page.waitForTimeout(600);
  }

  // Helper đăng nhập chuẩn xác cho Playwright
  async function login(page: Page, email: string, pass: string) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    await typeNaturally(page, 'input[type="email"], input[name="email"]', email);
    await page.waitForTimeout(500);

    await typeNaturally(page, 'input[type="password"], input[name="password"]', pass);
    await page.waitForTimeout(600);

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(2000);
  }

  // ============================================================================
  // TEST 01: KHÁM BỆNH, TIẾP ĐÓN & ĐẶT LỊCH HẸN TOÀN DIỆN (>= 30 giây)
  // ============================================================================
  test('01 - Khám bệnh & Đặt lịch trực tuyến toàn diện', async ({ page }) => {
    // 1. Khám phá Trang chủ MedSched
    await test.step('1. Khám phá toàn cảnh Trang chủ MedSched', async () => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      await expect(page.locator('body')).toBeVisible();

      // Cuộn từ từ xuống xem các khối tính năng, đối tác, thống kê
      await smoothScrollDown(page);
      await page.waitForTimeout(1500);
      await smoothScrollUp(page);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/01_homepage.png' });
    });

    // 2. Đăng nhập Bệnh nhân
    await test.step('2. Đăng nhập tài khoản Bệnh nhân', async () => {
      await login(page, 'benhnhan.demo@gmail.com', 'Medsched@123');
      await page.screenshot({ path: 'test-results/01_login_patient.png' });
    });

    // 3. Mở quy trình Đặt Lịch Khám (Booking Wizard)
    await test.step('3. Mở trang Đặt lịch khám & Chọn Cơ sở y tế', async () => {
      await page.goto('/booking', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      // Thao tác chọn qua lại giữa các cơ sở y tế
      const centerCards = page.locator('div').filter({ hasText: /Cơ Sở|Bệnh Viện|Phòng Khám/i });
      const centerCount = await centerCards.count();
      if (centerCount > 1) {
        await centerCards.nth(1).click().catch(() => {});
        await page.waitForTimeout(1000);
        await centerCards.nth(0).click().catch(() => {});
        await page.waitForTimeout(1000);
      }

      // Thao tác chọn qua lại giữa các Chuyên khoa (Da Liễu, Tim Mạch, Nội Khoa...)
      const specCards = page.locator('div').filter({ hasText: /Da Liễu|Nội|Tim Mạch|Ngoại|Mắt/i });
      const specCount = await specCards.count();
      if (specCount > 1) {
        await specCards.nth(1).click().catch(() => {});
        await page.waitForTimeout(1000);
        await specCards.nth(0).click().catch(() => {});
        await page.waitForTimeout(1000);
      }

      // Bấm nút tiếp tục sang Bước 2
      const nextBtn1 = page.locator('button').filter({ hasText: /Tiếp tục chọn Bác sĩ|Tiếp tục/i }).first();
      if (await nextBtn1.isVisible() && await nextBtn1.isEnabled()) {
        await nextBtn1.click();
        await page.waitForTimeout(2000);
      }
    });

    // 4. Bước 2: Chọn Bác Sĩ & Khung Giờ Khám
    await test.step('4. Bước 2: Khám phá Bác sĩ phụ trách & Khung giờ khám (Slots)', async () => {
      // Chọn bác sĩ trong danh sách
      const docCards = page.locator('div').filter({ hasText: /BS\.|ThS\.|Bác sĩ/i });
      if (await docCards.first().isVisible()) {
        await docCards.first().click();
        await page.waitForTimeout(1000);
      }

      // Chọn khung giờ khám khả dụng
      const slotButtons = page.locator('button').filter({ hasText: /:\d{2}|Khả dụng/i });
      const slotCount = await slotButtons.count();
      for (let i = 0; i < slotCount; i++) {
        const btn = slotButtons.nth(i);
        if (await btn.isEnabled().catch(() => false)) {
          await btn.click().catch(() => {});
          await page.waitForTimeout(1000);
          break;
        }
      }

      await page.screenshot({ path: 'test-results/01_selected_doctor.png' });

      // Bấm tiếp tục sang Bước 3
      const nextBtn2 = page.locator('button').filter({ hasText: /Tiếp tục nhập Triệu chứng|Tiếp tục/i }).first();
      if (await nextBtn2.isVisible()) {
        if (!await nextBtn2.isEnabled()) {
          // Thử bấm lại vào slot đầu tiên
          const firstSlot = page.locator('button').filter({ hasText: /:\d{2}/i }).first();
          if (await firstSlot.isVisible()) {
            await firstSlot.click();
            await page.waitForTimeout(800);
          }
        }
        await nextBtn2.click().catch(() => {});
        await page.waitForTimeout(2000);
      }
    });

    // 5. Bước 3: Nhập Triệu Chứng & Trợ Lý Spring AI Phân Tích
    await test.step('5. Bước 3: Nhập triệu chứng & Khảo sát trợ lý Spring AI', async () => {
      const symptomInput = page.locator('textarea').first();
      if (await symptomInput.isVisible()) {
        await symptomInput.click();
        await symptomInput.fill('Bệnh nhân cảm thấy mệt mỏi kéo dài, đau tức ngực nhẹ khi vận động nhiều, thỉnh thoảng ho khan về đêm.');
        await page.waitForTimeout(1500);
      }

      // Thử bấm nút phân tích AI
      const aiBtn = page.locator('button').filter({ hasText: /Thử phân tích AI|Spring AI/i }).first();
      if (await aiBtn.isVisible() && await aiBtn.isEnabled()) {
        await aiBtn.click().catch(() => {});
        await page.waitForTimeout(2500);
      }

      // Bấm nút Xác Nhận & Xuất Vé Khám Điện Tử
      const confirmBtn = page.locator('button').filter({ hasText: /Xác Nhận & Xuất Vé Khám|Xác nhận|Đặt lịch/i }).first();
      if (await confirmBtn.isVisible() && await confirmBtn.isEnabled()) {
        await confirmBtn.click();
        await page.waitForTimeout(3000);
      }
      await page.screenshot({ path: 'test-results/01_booking_success.png' });
    });

    // 6. Bước 4: Kiểm tra Phiếu Khám & Mã QR Check-in
    await test.step('6. Xem Phiếu khám của tôi & Mã QR Check-in tiếp đón', async () => {
      await page.goto('/my-appointments', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Cuộn xem danh sách các phiếu khám
      await smoothScrollDown(page);
      await page.waitForTimeout(1500);
      await smoothScrollUp(page);

      // Thử chuyển đổi giữa các tab lọc trạng thái
      const tabNames = [/Tất Cả/i, /Sắp Tới/i, /Đã Tiếp Nhận/i, /Đã Hoàn Tất/i];
      for (const t of tabNames) {
        const tabBtn = page.locator('button').filter({ hasText: t }).first();
        if (await tabBtn.isVisible()) {
          await tabBtn.click().catch(() => {});
          await page.waitForTimeout(1000);
        }
      }

      // Mở modal Mã QR Check-in
      const qrBtn = page.locator('button').filter({ hasText: /Mã QR Check-in|QR/i }).first();
      if (await qrBtn.isVisible()) {
        await qrBtn.click();
        await page.waitForTimeout(2500);
        // Đóng modal
        const closeBtn = page.locator('button').filter({ hasText: /Đóng/i }).first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
        } else {
          await page.keyboard.press('Escape');
        }
        await page.waitForTimeout(1000);
      }

      await page.screenshot({ path: 'test-results/01_my_appointments.png' });
    });
  });

  // ============================================================================
  // TEST 02: HỒ SƠ / THÔNG TIN TÀI KHOẢN & TIỀN SỬ BỆNH (>= 30 giây)
  // ============================================================================
  test('02 - Hồ sơ / Thông tin tài khoản & Bệnh án chi tiết', async ({ page }) => {
    // 1. Đăng nhập
    await test.step('1. Đăng nhập Bệnh nhân', async () => {
      await login(page, 'benhnhan.demo@gmail.com', 'Medsched@123');
    });

    // 2. Mở trang Hồ Sơ Cá Nhân
    await test.step('2. Xem chi tiết thông tin định danh & CCCD/BHYT', async () => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      await expect(page.locator('body')).toBeVisible();

      await smoothScrollDown(page);
      await page.waitForTimeout(1500);
      await smoothScrollUp(page);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/02_profile_info.png' });
    });

    // 3. Chỉnh sửa thông tin cá nhân & Số điện thoại
    await test.step('3. Điền cập nhật Số điện thoại & Địa chỉ liên hệ', async () => {
      const phoneInput = page.locator('input[type="tel"], input[name="phone"]').first();
      if (await phoneInput.isVisible()) {
        await typeNaturally(page, 'input[type="tel"], input[name="phone"]', '0988776655');
        await page.waitForTimeout(1000);
      }

      const addressInput = page.locator('input[name="address"], input[placeholder*="địa chỉ"]').first();
      if (await addressInput.isVisible()) {
        await typeNaturally(page, 'input[name="address"], input[placeholder*="địa chỉ"]', 'Số 123 Nguyễn Thị Minh Khai, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh');
        await page.waitForTimeout(1000);
      }

      const saveBtn = page.getByRole('button', { name: /Lưu|Cập nhật/i }).first();
      if (await saveBtn.isVisible() && await saveBtn.isEnabled()) {
        await saveBtn.click();
        await page.waitForTimeout(2500);
      }
      await page.screenshot({ path: 'test-results/02_profile_saved.png' });
    });

    // 4. Khám phá các Tab Hồ Sơ Y Tế & Tiền Sử
    await test.step('4. Khám phá Tab Hồ Sơ Y Tế & Tiền Sử Dị Ứng', async () => {
      const tabs = [/Y Tế|Bệnh Án/i, /Bảo Hiểm|BHYT/i, /Bảo Mật|Đổi Mật Khẩu/i];
      for (const tabName of tabs) {
        const tabEl = page.getByRole('button', { name: tabName }).first();
        if (await tabEl.isVisible()) {
          await tabEl.click();
          await page.waitForTimeout(2000);
          await smoothScrollDown(page);
          await page.waitForTimeout(1000);
          await smoothScrollUp(page);
        }
      }
    });

    // 5. Thử nghiệm Tab Đổi Mật Khẩu
    await test.step('5. Điền thử nghiệm form Đổi mật khẩu tài khoản', async () => {
      const pwdTab = page.getByRole('button', { name: /Đổi mật khẩu|Bảo mật/i }).first();
      if (await pwdTab.isVisible()) {
        await pwdTab.click();
        await page.waitForTimeout(1200);

        const pwInputs = page.locator('input[type="password"]');
        if (await pwInputs.count() >= 2) {
          await pwInputs.nth(0).fill('Medsched@123');
          await page.waitForTimeout(800);
          await pwInputs.nth(1).fill('Medsched@2026New');
          await page.waitForTimeout(800);
        }
      }
      await page.screenshot({ path: 'test-results/02_password_tab.png' });
    });

    // 6. Reload kiểm tra trạng thái hoạt động
    await test.step('6. Tải lại trang và kiểm tra dữ liệu ổn định', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      await smoothScrollDown(page);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: 'test-results/02_profile_reloaded.png' });
    });
  });

  // ============================================================================
  // TEST 03: THÔNG TIN BÁC SĨ / PHÒNG KHÁM & DANH MỤC (>= 30 giây)
  // ============================================================================
  test('03 - Thông tin bác sĩ / phòng khám & Quản lý danh mục y tế', async ({ page }) => {
    // 1. Đăng nhập Quản trị viên
    await test.step('1. Đăng nhập Admin vào cổng điều hành', async () => {
      await login(page, 'admin@medsched.vn', 'Medsched@123');
    });

    // 2. Mở Quản lý Danh mục & Cơ sở
    await test.step('2. Mở trang Quản lý Danh mục & Phòng khám (/admin/catalog)', async () => {
      await page.goto('/admin/catalog', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      await expect(page.locator('body')).toBeVisible();

      // Cuộn xem toàn bộ danh mục cơ sở
      await smoothScrollDown(page);
      await page.waitForTimeout(1500);
      await smoothScrollUp(page);
      await page.screenshot({ path: 'test-results/03_catalog_centers.png' });
    });

    // 3. Tab Cơ Sở Y Tế & Thử form thêm mới
    await test.step('3. Khám phá Cơ Sở Y Tế & Thử nghiệm form tạo cơ sở', async () => {
      const centerTab = page.getByRole('button', { name: /Cơ Sở Y Tế|Phòng khám/i }).first();
      if (await centerTab.isVisible()) {
        await centerTab.click();
        await page.waitForTimeout(1500);
      }

      // Thử bấm nút Thêm Cơ Sở Mới
      const addCenterBtn = page.locator('button').filter({ hasText: /Thêm Cơ Sở|Tạo Mới/i }).first();
      if (await addCenterBtn.isVisible()) {
        await addCenterBtn.click();
        await page.waitForTimeout(1500);

        // Nhập thử thông tin cơ sở
        const nameInput = page.locator('input[placeholder*="tên cơ sở"], input[name*="name"]').first();
        if (await nameInput.isVisible()) {
          await typeNaturally(page, 'input[placeholder*="tên cơ sở"], input[name*="name"]', 'Phòng Khám Đa Khoa MedSched Chi Nhánh 2');
          await page.waitForTimeout(1000);
        }

        // Đóng form
        const cancelBtn = page.locator('button').filter({ hasText: /Hủy|Đóng/i }).first();
        if (await cancelBtn.isVisible()) {
          await cancelBtn.click();
          await page.waitForTimeout(800);
        } else {
          await page.keyboard.press('Escape');
        }
      }
    });

    // 4. Tab Chuyên Khoa Khám
    await test.step('4. Khám phá Tab Chuyên Khoa & Tìm kiếm chuyên khoa', async () => {
      const specialtyTab = page.getByRole('button', { name: /Chuyên Khoa/i }).first();
      if (await specialtyTab.isVisible()) {
        await specialtyTab.click();
        await page.waitForTimeout(1500);

        // Cuộn xem các chuyên khoa
        await smoothScrollDown(page);
        await page.waitForTimeout(1500);
        await smoothScrollUp(page);
        await page.waitForTimeout(1000);

        await page.screenshot({ path: 'test-results/03_catalog_specialties.png' });
      }
    });

    // 5. Tab Dịch Vụ & Bảng Giá Khám
    await test.step('5. Khám phá Tab Dịch Vụ & Bảng Giá Chi Tiết', async () => {
      const serviceTab = page.getByRole('button', { name: /Dịch Vụ|Bảng Giá/i }).first();
      if (await serviceTab.isVisible()) {
        await serviceTab.click();
        await page.waitForTimeout(1500);

        // Cuộn xem danh sách giá dịch vụ
        await smoothScrollDown(page);
        await page.waitForTimeout(1500);
        await smoothScrollUp(page);
        await page.waitForTimeout(1000);

        await page.screenshot({ path: 'test-results/03_catalog_services.png' });
      }
    });

    // 6. Điều hướng xem Danh bạ Bác sĩ trực thuộc
    await test.step('6. Khảo sát danh sách Bác sĩ chuyên khoa tại cơ sở', async () => {
      await page.goto('/admin', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Lọc danh sách bác sĩ
      const roleFilter = page.locator('select').first();
      if (await roleFilter.isVisible()) {
        await roleFilter.selectOption({ label: 'Bác Sĩ' }).catch(() => {});
        await page.waitForTimeout(1500);
      }

      await smoothScrollDown(page);
      await page.waitForTimeout(1500);
      await smoothScrollUp(page);
    });
  });

  // ============================================================================
  // TEST 04: QUẢN LÝ NGƯỜI DÙNG & PHÂN QUYỀN HỆ THỐNG (>= 30 giây)
  // ============================================================================
  test('04 - Quản lý người dùng, phân quyền & thêm mới nhân sự', async ({ page }) => {
    // 1. Đăng nhập Admin
    await test.step('1. Đăng nhập tài khoản Quản trị viên (Admin)', async () => {
      await login(page, 'admin@medsched.vn', 'Medsched@123');
    });

    // 2. Mở Bảng Quản Trị Người Dùng
    await test.step('2. Mở bảng danh sách người dùng toàn hệ thống (/admin)', async () => {
      await page.goto('/admin', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      await expect(page.locator('body')).toBeVisible();

      // Cuộn duyệt toàn bộ bảng
      await smoothScrollDown(page);
      await page.waitForTimeout(1500);
      await smoothScrollUp(page);
      await page.screenshot({ path: 'test-results/04_admin_user_table.png' });
    });

    // 3. Thử nghiệm tìm kiếm người dùng theo từ khóa
    await test.step('3. Thử nghiệm tìm kiếm theo Tên, Email, Số điện thoại', async () => {
      const searchKeywords = ['Minh Anh', 'letan', 'benhnhan', ''];
      for (const kw of searchKeywords) {
        const searchInput = page.getByPlaceholder(/Tìm theo tên|email|số điện thoại/i).first();
        if (await searchInput.isVisible()) {
          await searchInput.fill(kw);
          await page.waitForTimeout(1000);
        }
      }
    });

    // 4. Lọc người dùng theo từng vai trò (Roles)
    await test.step('4. Kiểm tra bộ lọc theo vai trò (Bác Sĩ, Lễ Tân, Bệnh Nhân, Admin)', async () => {
      const roleOptions = ['Bác Sĩ', 'Nhân Viên Tiếp Đón', 'Bệnh Nhân', 'Tất cả vai trò'];
      for (const opt of roleOptions) {
        const roleFilter = page.locator('select').first();
        if (await roleFilter.isVisible()) {
          await roleFilter.selectOption({ label: opt }).catch(() => {});
          await page.waitForTimeout(1000);
        }
      }
      await page.screenshot({ path: 'test-results/04_admin_filter_doctors.png' });
    });

    // 5. Mở trang Tạo Mới Tài Khoản Nhân Sự (/admin/create-user)
    await test.step('5. Điền đầy đủ form Tạo mới tài khoản Nhân sự / Bác sĩ', async () => {
      await page.goto('/admin/create-user', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      await expect(page.locator('body')).toBeVisible();

      // Điền Họ và tên
      const nameInput = page.locator('input[placeholder*="Lê Thị Hạnh"], input[placeholder*="họ và tên"], input[type="text"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.click();
        await nameInput.fill('Lê Thị Hạnh - Lễ Tân Q1');
        await page.waitForTimeout(800);
      }

      // Điền Email công vụ
      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isVisible()) {
        await emailInput.click();
        await emailInput.fill('letan02@medsched.vn');
        await page.waitForTimeout(800);
      }

      // Điền Số điện thoại
      const phoneInput = page.locator('input[type="tel"]').first();
      if (await phoneInput.isVisible()) {
        await phoneInput.click();
        await phoneInput.fill('0912345678');
        await page.waitForTimeout(800);
      }

      // Chuyển sang Tab Bác sĩ để khám phá form Bác sĩ
      const doctorTabBtn = page.locator('button').filter({ hasText: /Bác Sĩ Chuyên Khoa|Bác Sĩ/i }).first();
      if (await doctorTabBtn.isVisible()) {
        await doctorTabBtn.click();
        await page.waitForTimeout(1500);
      }

      // Cuộn xem toàn bộ form
      await smoothScrollDown(page);
      await page.waitForTimeout(1500);
      await smoothScrollUp(page);
      await page.screenshot({ path: 'test-results/04_admin_create_staff.png' });
    });

    // 6. Quay lại trang Tổng quan Dashboard
    await test.step('6. Trở về Dashboard và hoàn tất kiểm thử', async () => {
      await page.goto('/admin', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      await smoothScrollDown(page);
      await page.waitForTimeout(1500);
      await smoothScrollUp(page);
    });
  });

});
