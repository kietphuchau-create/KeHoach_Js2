@echo off
chcp 65001 >nul
title MedSched - Bật Giám Sát Prometheus ^& Grafana

echo =====================================================================
echo    MEDSCHED - HỆ THỐNG GIÁM SÁT HẠ TẦNG (PROMETHEUS ^& GRAFANA)
echo =====================================================================
echo.

:: 1. Kiểm tra Docker
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] CẢNH BÁO: Docker Desktop chưa được mở hoặc chưa khởi động xong!
    echo [!] Vui lòng mở ứng dụng Docker Desktop trên máy tính rồi chạy lại file này.
    echo.
    pause
    exit /b 1
)

echo [+] Đang khởi chạy cụm Prometheus (Port 9090) và Grafana (Port 3100)...
docker compose -f "%~dp0docker-compose-monitoring.yml" up -d

if %errorlevel% neq 0 (
    echo [X] Khởi chạy thất bại. Vui lòng kiểm tra Docker Desktop.
    pause
    exit /b 1
)

echo.
echo [✓] Khởi chạy thành công!
echo.
echo ---------------------------------------------------------------------
echo 1. Prometheus Server:  http://localhost:9090
echo 2. Grafana Dashboard:  http://localhost:3100 (Tự động đăng nhập Admin)
echo 3. Cloud Backend (Thật): https://medsched-zu15.onrender.com/actuator/prometheus
echo 4. Local Backend (Dev):  http://localhost:8080/actuator/prometheus
echo ---------------------------------------------------------------------
echo.
echo Đang mở trình duyệt tới trang Grafana và Prometheus...
timeout /t 2 >nul

start http://localhost:3100
start http://localhost:9090/targets

echo.
echo [!] Bạn có thể thu nhỏ cửa sổ này. Để tắt hệ thống, bấm chạy file stop-monitoring.bat.
pause
