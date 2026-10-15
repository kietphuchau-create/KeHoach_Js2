@echo off
chcp 65001 >nul
title MedSched - Khoi Dong He Thong Phong Kham Thong Minh
color 0B

:START_SYSTEM
cls
echo ===================================================================
echo     MEDSCHED - HE THONG PHONG KHAM VA DAT LICH THONG MINH
echo              KHOI DONG TRON GOI [BACKEND + FRONTEND]
echo ===================================================================
echo.

set "BASE_DIR=%~dp0"

echo [1/5] Kiem tra ket noi CSDL MySQL (Port 3306)...
netstat -ano | findstr :3306 | findstr LISTENING >nul 2>&1
if errorlevel 1 (
    echo   * CANH BAO: Chua thay MySQL chay tren port 3306!
    echo   * Vui long mo XAMPP Control Panel va Start MySQL.
    echo   * File CSDL mau tai: Source_code\database\medsched_db.sql
) else (
    echo   * [OK] MySQL dang hoat dong binh thuong tren port 3306.
)
echo.

echo [2/5] Kiem tra va giai phong port 3000 va port 8080 neu bi treo...
powershell -NoProfile -Command "3000, 8080 | ForEach-Object { $p = $_; Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }" >nul 2>&1
echo   * [OK] Cac port 3000 va 8080 da san sang.
echo.

echo [3/5] Dang khoi dong Backend Spring Boot Java 21 [Port 8080]...
start "MedSched - Backend API (Port 8080)" /D "%BASE_DIR%backend" cmd /k "gradlew.bat :app:bootRun"

echo.
echo [4/5] Dang khoi dong Frontend Next.js 15 [Port 3000]...
if not exist "%BASE_DIR%frontend\node_modules" (
    echo   * Thu vien Frontend chua duoc cai dat. Dang tu dong cai dat...
    cd /d "%BASE_DIR%frontend"
    call pnpm install || call npm install
    cd /d "%BASE_DIR%"
)
start "MedSched - Frontend Web (Port 3000)" /D "%BASE_DIR%frontend" cmd /k "pnpm dev || npm run dev"

echo.
echo [5/5] Dang doi giao dien Web khoi dong de tu dong mo trinh duyet...
echo       (Next.js dang khoi tao va bien dich cac trang...)
echo.

set attempts=0
set max_attempts=30
set web_ok=0

:WAIT_LOOP
set /a attempts+=1
echo   -> Dang kiem tra ket noi toi http://localhost:3000 (Lan %attempts%/%max_attempts%)...

curl.exe -s -o NUL http://localhost:3000
if not errorlevel 1 (
    set web_ok=1
    goto OPEN_BROWSER
)

ping 127.0.0.1 -n 3 >nul
if %attempts% lss %max_attempts% goto WAIT_LOOP

:OPEN_BROWSER
echo.
echo -------------------------------------------------------------------
if "%web_ok%"=="1" (
    echo [THANH CONG] Giao dien Web da san sang! Dang mo tren trinh duyet...
) else (
    echo [THONG BAO] Da het thoi gian cho mac dinh, dang thu mo trinh duyet...
)
start "" "http://localhost:3000"

:DASHBOARD
cls
echo ===================================================================
echo     MEDSCHED - HE THONG DA DUOC KHOI DONG THANH CONG!
echo ===================================================================
echo.
echo   * Giao dien Web (Frontend) : http://localhost:3000
echo   * Backend API Spring Boot  : http://localhost:8080
echo   * Tai lieu Swagger API     : http://localhost:8080/swagger-ui/index.html
echo.
echo -------------------------------------------------------------------
echo   CAC PHIM TAT THAO TAC NHANH:
echo   [1] Mo lai Giao dien Web tren trinh duyet (http://localhost:3000)
echo   [2] Mo Tai lieu Swagger API (http://localhost:8080/swagger-ui/index.html)
echo   [3] Khoi dong lai toan bo he thong (Restart)
echo   [4] Tat toan bo Backend va Frontend (Stop All)
echo   [0] Thoat cua so nay (Backend va Frontend van tiep tuc chay)
echo -------------------------------------------------------------------
echo.
set "choice="
set /p choice="Nhap lua chon cua ban [1, 2, 3, 4, 0]: "

if "%choice%"=="1" (
    start "" "http://localhost:3000"
    goto DASHBOARD
)
if "%choice%"=="2" (
    start "" "http://localhost:8080/swagger-ui/index.html"
    goto DASHBOARD
)
if "%choice%"=="3" (
    goto RESTART_SYSTEM
)
if "%choice%"=="4" (
    goto STOP_ALL_SYSTEM
)
if "%choice%"=="0" (
    exit
)
goto DASHBOARD

:RESTART_SYSTEM
echo.
echo Dang tat cac tien trinh cu de khoi dong lai...
powershell -NoProfile -Command "3000, 8080 | ForEach-Object { $p = $_; Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }" >nul 2>&1
ping 127.0.0.1 -n 2 >nul
goto START_SYSTEM

:STOP_ALL_SYSTEM
echo.
echo Dang tat Backend (Port 8080) va Frontend (Port 3000)...
powershell -NoProfile -Command "3000, 8080 | ForEach-Object { $p = $_; Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }" >nul 2>&1
echo [OK] Da tat toan bo he thong MedSched thanh cong.
echo.
pause
exit
