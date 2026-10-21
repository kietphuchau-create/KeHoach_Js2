@echo off
title MedSched - Giam Sat Prometheus and Grafana

echo =====================================================================
echo    MEDSCHED - HE THONG GIAM SAT HA TANG (PROMETHEUS ^& GRAFANA)
echo =====================================================================
echo.

:: 1. Kiem tra Docker Desktop
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] CANH BAO: Docker Desktop chua duoc bat hoac chua khoi dong xong!
    echo [!] Vui long mo Docker Desktop tren may tinh roi chay lai file nay.
    echo.
    pause
    exit /b 1
)

echo [+] Dang khoi chay cum Prometheus (Port 9090) va Grafana (Port 3100)...
docker compose -f "%~dp0docker-compose-monitoring.yml" up -d
docker compose -f "%~dp0docker-compose-monitoring.yml" restart prometheus >nul 2>&1

if %errorlevel% neq 0 (
    echo [X] Khoi chay that bai. Vui long kiem tra Docker Desktop.
    pause
    exit /b 1
)

echo.
echo [OK] Khoi chay he thong giam sat thanh cong!
echo.
echo ---------------------------------------------------------------------
echo 1. Prometheus Server:    http://localhost:9090
echo 2. Grafana Dashboard:    http://localhost:3100 (Tu dong dang nhap Admin)
echo 3. Cloud Backend (That): https://medsched-zu15.onrender.com/actuator/prometheus
echo 4. Local Backend (Dev):  http://localhost:8080/actuator/prometheus
echo ---------------------------------------------------------------------
echo.
echo Dang mo trinh duyet toi Grafana va Prometheus...
ping 127.0.0.1 -n 3 >nul

start http://localhost:3100/d/medsched-cloud/medsched-cloud-production-realtime-monitoring
start http://localhost:9090/targets

echo.
echo [!] Ban co the thu nho cua so nay. De tat giam sat, hay chay file stop-monitoring.bat.
pause
