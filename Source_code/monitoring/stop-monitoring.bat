@echo off
title MedSched - Tat Giam Sat Prometheus and Grafana

echo =====================================================================
echo    MEDSCHED - TAT HE THONG GIAM SAT PROMETHEUS ^& GRAFANA
echo =====================================================================
echo.

echo [+] Dang dung va giai phong container Prometheus ^& Grafana...
docker compose -f "%~dp0docker-compose-monitoring.yml" down

echo.
echo [OK] Da tat toan bo he thong giam sat va giai phong tai nguyen RAM/CPU!
echo.
pause
