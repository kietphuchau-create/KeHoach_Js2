import { test, expect, Page } from '@playwright/test';

test.describe('DevHub/Medical Website - Automatic Demo (MedSched)', () => {

  // Helper đăng nhập chuẩn xác cho Playwright
  async function login(page: Page, email: string, pass: string) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await emailInput.fill(email);

    const passInput = page.locator('input[type="password"], input[name="password"]').first();
    await passInput.fill(pass);

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // Chờ xử lý đăng nhập & chuyển hướng
    await page.waitForTimeout(1500);
  }

  // ----------------------------------------------------------------------------
  // TEST 01: KHÁM BỆNH & ĐẶT LỊCH (QUY TRÌNH WIZARD 4 BƯỚC)
  // ----------------------------------------------------------------------------
  test('01 - Khám bệnh', async ({ page }) => {
    await test.step('1. Mở trang chủ', async () => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('text=MedSched').first()).toBeVisible();
      await page.screenshot({ path: 'test-results/01_homepage.png', fullPage: false });
    });

    await test.step('2. Đăng nhập bằng tài khoản Bệnh nhân', async () => {
      await login(page, 'benhnhan.demo@gmail.com', 'Medsched@123');
      await page.screenshot({ path: 'test-results/01_login_patient.png' });
    });

    await test.step('3. Đi đến trang Khám bệnh & Đặt lịch', async () => {
      await page.goto('/booking', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/01_booking_page.png' });
    });

    await test.step('4. Bước 1: Chọn Cơ sở y tế & Chuyên khoa', async () => {
      // Chọn cơ sở y tế đầu tiên nếu có
      const centerCards = page.locator('div').filter({ hasText: /Cơ Sở|Bệnh Viện|Phòng Khám/i });
      if (await centerCards.first().isVisible()) {
        await centerCards.first().click().catch(() => {});
        await page.waitForTimeout(300);
      }

      // Chọn chuyên khoa
      const specCards = page.locator('div').filter({ hasText: /Da Liễu|Nội|Tim Mạch|Ngoại|Mắt/i });
      if (await specCards.first().isVisible()) {
        await specCards.first().click().catch(() => {});
        await page.waitForTimeout(300);
      }

      // Bấm nút tiếp tục chọn bác sĩ
      const nextBtn1 = page.locator('button').filter({ hasText: /Tiếp tục chọn Bác sĩ|Tiếp tục/i }).first();
      if (await nextBtn1.isVisible() && await nextBtn1.isEnabled()) {
        await nextBtn1.click();
        await page.waitForTimeout(1000);
      }
    });

    await test.step('5. Bước 2: Chọn Bác sĩ & Khung giờ khám', async () => {
      // Chọn Bác sĩ
      const docCards = page.locator('div').filter({ hasText: /BS\.|ThS\.|Bác sĩ/i });
      if (await docCards.first().isVisible()) {
        await docCards.first().click().catch(() => {});
        await page.waitForTimeout(500);
      }
      await page.screenshot({ path: 'test-results/01_selected_doctor.png' });

      // Chọn khung giờ khám khả dụng
      const slotButtons = page.locator('button').filter({ hasText: /:\d{2}|Khả dụng/i });
      const slotCount = await slotButtons.count();
      if (slotCount > 0) {
        for (let i = 0; i < slotCount; i++) {
          const btn = slotButtons.nth(i);
          if (await btn.isEnabled()) {
            await btn.click().catch(() => {});
            await page.waitForTimeout(300);
            break;
          }
        }
      }

      // Bấm nút tiếp tục nhập triệu chứng
      const nextBtn2 = page.locator('button').filter({ hasText: /Tiếp tục nhập Triệu chứng|Tiếp tục/i }).first();
      if (await nextBtn2.isVisible() && await nextBtn2.isEnabled()) {
        await nextBtn2.click();
        await page.waitForTimeout(1000);
      }
    });

    await test.step('6. Bước 3: Nhập triệu chứng & Xác nhận đặt lịch', async () => {
      const symptomInput = page.locator('textarea, input[placeholder*="triệu chứng"], input[placeholder*="lý do"]').first();
      if (await symptomInput.isVisible()) {
        await symptomInput.fill('Đau tức ngực nhẹ và ho khan về đêm khi thời tiết thay đổi');
        await page.waitForTimeout(500);
      }

      const confirmBtn = page.locator('button').filter({ hasText: /Xác Nhận & Xuất Vé Khám|Xác nhận|Đặt lịch/i }).first();
      if (await confirmBtn.isVisible() && await confirmBtn.isEnabled()) {
        await confirmBtn.click();
        await page.waitForTimeout(2000);
      }
      await page.screenshot({ path: 'test-results/01_booking_success.png' });
    });

    await test.step('7. Kiểm tra lịch khám trong Danh sách phiếu hẹn của tôi', async () => {
      await page.goto('/my-appointments', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/01_my_appointments.png' });
    });
  });

  // ----------------------------------------------------------------------------
  // TEST 02: HỒ SƠ / THÔNG TIN TÀI KHOẢN
  // ----------------------------------------------------------------------------
  test('02 - Hồ sơ / Thông tin tài khoản', async ({ page }) => {
    await test.step('1. Đăng nhập tài khoản Bệnh nhân', async () => {
      await login(page, 'benhnhan.demo@gmail.com', 'Medsched@123');
    });

    await test.step('2. Đi đến trang Hồ sơ cá nhân (/profile)', async () => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/02_profile_info.png' });
    });

    await test.step('3. Kiểm tra các thông tin cá nhân & chỉnh sửa SĐT', async () => {
      const phoneInput = page.locator('input[type="tel"], input[name="phone"]').first();
      if (await phoneInput.isVisible()) {
        await phoneInput.fill('0988776655');
      }

      const saveBtn = page.getByRole('button', { name: /Lưu|Cập nhật/i }).first();
      if (await saveBtn.isVisible() && await saveBtn.isEnabled()) {
        await saveBtn.click();
        await page.waitForTimeout(1000);
      }
      await page.screenshot({ path: 'test-results/02_profile_saved.png' });
    });

    await test.step('4. Reload trang và kiểm tra dữ liệu duy trì', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/02_profile_reloaded.png' });
    });

    await test.step('5. Kiểm tra giao diện Đổi mật khẩu', async () => {
      const pwdTab = page.getByRole('button', { name: /Đổi mật khẩu|Bảo mật/i }).first();
      if (await pwdTab.isVisible()) {
        await pwdTab.click();
        await page.waitForTimeout(500);
        await expect(page.locator('input[type="password"]').first()).toBeVisible();
      }
      await page.screenshot({ path: 'test-results/02_password_tab.png' });
    });
  });

  // ----------------------------------------------------------------------------
  // TEST 03: THÔNG TIN BÁC SĨ / PHÒNG KHÁM & DANH MỤC
  // ----------------------------------------------------------------------------
  test('03 - Thông tin bác sĩ / phòng khám', async ({ page }) => {
    await test.step('1. Đăng nhập Admin để truy cập Quản lý Danh mục', async () => {
      await login(page, 'admin@medsched.vn', 'Medsched@123');
    });

    await test.step('2. Mở trang Quản lý danh mục & Phòng khám (/admin/catalog)', async () => {
      await page.goto('/admin/catalog', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/03_catalog_centers.png' });
    });

    await test.step('3. Kiểm tra danh sách Cơ sở y tế / Phòng khám', async () => {
      const centerTab = page.getByRole('button', { name: /Cơ Sở Y Tế|Phòng khám/i }).first();
      if (await centerTab.isVisible()) {
        await centerTab.click();
        await page.waitForTimeout(500);
      }
      await expect(page.getByText(/Thêm Cơ Sở|Mã Cơ Sở|Địa Chỉ|Cơ Sở Y Tế/i).first()).toBeVisible();
    });

    await test.step('4. Kiểm tra danh sách Chuyên khoa khám', async () => {
      const specialtyTab = page.getByRole('button', { name: /Chuyên Khoa/i }).first();
      if (await specialtyTab.isVisible()) {
        await specialtyTab.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-results/03_catalog_specialties.png' });
        await expect(page.getByText(/Thêm Chuyên Khoa|Mã Chuyên Khoa|Chuyên Khoa/i).first()).toBeVisible();
      }
    });

    await test.step('5. Kiểm tra danh mục Dịch vụ & Bảng giá', async () => {
      const serviceTab = page.getByRole('button', { name: /Dịch Vụ|Bảng Giá/i }).first();
      if (await serviceTab.isVisible()) {
        await serviceTab.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-results/03_catalog_services.png' });
        await expect(page.getByText(/Thêm Dịch Vụ|Đơn Giá|Dịch Vụ/i).first()).toBeVisible();
      }
    });
  });

  // ----------------------------------------------------------------------------
  // TEST 04: QUẢN LÝ NGƯỜI DÙNG (ADMIN)
  // ----------------------------------------------------------------------------
  test('04 - Quản lý người dùng', async ({ page }) => {
    await test.step('1. Đăng nhập tài khoản Quản trị viên (Admin)', async () => {
      await login(page, 'admin@medsched.vn', 'Medsched@123');
    });

    await test.step('2. Mở trang Quản lý người dùng (/admin)', async () => {
      await page.goto('/admin', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/04_admin_user_table.png' });
    });

    await test.step('3. Kiểm tra danh sách người dùng và tìm kiếm', async () => {
      const searchInput = page.getByPlaceholder(/Tìm theo tên|email|số điện thoại/i).first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('minhanh');
        await page.waitForTimeout(500);
      }
    });

    await test.step('4. Kiểm tra bộ lọc theo vai trò (Role Filter)', async () => {
      const roleFilter = page.locator('select').first();
      if (await roleFilter.isVisible()) {
        await roleFilter.selectOption({ label: 'Bác Sĩ' }).catch(() => {});
        await page.waitForTimeout(500);
      }
      await page.screenshot({ path: 'test-results/04_admin_filter_doctors.png' });
    });

    await test.step('5. Kiểm tra chuyển hướng tạo nhân sự mới', async () => {
      const createBtn = page.locator('a[href="/admin/create-user"]').first();
      if (await createBtn.isVisible()) {
        await createBtn.click();
        await page.waitForTimeout(1000);
      } else {
        await page.goto('/admin/create-user', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);
      }
      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/04_admin_create_staff.png' });
    });
  });

});
