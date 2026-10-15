@echo off
title MedSched - Khoi Dong Toan Bo He Thong
color 0B

echo ===================================================================
echo     MEDSCHED - HE THONG PHONG KHAM VA DAT LICH THONG MINH
echo              KHOI DONG TRON GOI [BACKEND + FRONTEND]
echo ===================================================================
echo.
echo [LUU Y QUAN TRONG]:
echo   1. Hay dam bao ban da BAT MySQL tren XAMPP Control Panel.
echo   2. Da import file CSDL: Source_code\database\medsched_db.sql
echo.
echo -------------------------------------------------------------------

set "BASE_DIR=%~dp0Source_code\"

echo [1/3] Dang khoi dong Backend Spring Boot Java 21 [Port 8080]...
start "MedSched-Backend" /D "%BASE_DIR%backend" cmd /k "gradlew.bat :app:bootRun"

echo.
echo [2/3] Dang khoi dong Frontend Next.js 15 [Port 3000]...
start "MedSched-Frontend" /D "%BASE_DIR%frontend" cmd /k "pnpm dev || npm run dev"

echo.
echo [3/3] Dang doi he thong khoi dong de mo trinh duyet Web...
ping 127.0.0.1 -n 6 >nul
start http://localhost:3000

echo.
echo ===================================================================
echo   KHOI DONG THANH CONG!
echo   -----------------------------------------------------------------
echo   * Giao dien Web (Frontend) : http://localhost:3000
echo   * Backend API Spring Boot  : http://localhost:8080
echo   * Tai lieu Swagger API     : http://localhost:8080/swagger-ui/index.html
echo ===================================================================
echo.
echo Cua so nay se tu dong dong sau 5 giay...
ping 127.0.0.1 -n 5 >nul
exit
