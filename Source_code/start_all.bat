@echo off
chcp 65001 >nul
title MedSched - Khoi Dong Toan Bo He Thong
color 0E

echo ========================================================
echo   MEDSCHED - KHOI DONG TRON GOI (BACKEND + FRONTEND)
echo ========================================================
echo.
echo [Luu y]: Hay chac chan rang ban da BAT MYSQL tren XAMPP Control Panel!
echo.
echo [1/3] Dang khoi dong Backend Spring Boot (cong 8080)...
start "MedSched - Backend" cmd /k "cd /d "%~dp0backend" && gradlew.bat :app:bootRun"

echo.
echo [2/3] Dang khoi dong Giao dien cua Trang (React Vite - cong 5173)...
start "MedSched - Frontend" cmd /k "cd /d "%~dp0Giao_DienCuaTrang\my-app" && pnpm dev"

echo.
echo [3/3] Dang mo trinh duyet Web vao thang trang Dang Nhap...
timeout /t 3 >nul
start http://localhost:5173

echo.
echo ========================================================
echo   DA KHOI DONG THANH CONG!
echo   - Backend API  : http://localhost:8080
echo   - Giao dien Web: http://localhost:5173 (Trang Dang Nhap)
echo   - Trinh duyet da tu dong mo trang Dang Nhap len man hinh!
echo ========================================================
echo.
echo Cua so nay se tu dong dong sau 3 giay...
timeout /t 3 >nul
exit
