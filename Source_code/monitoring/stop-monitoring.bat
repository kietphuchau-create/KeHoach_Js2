@echo off
chcp 65001 >nul
title MedSched - Tắt Giám Sát Prometheus ^& Grafana

echo =====================================================================
echo    MEDSCHED - TẮT HỆ THỐNG GIÁM SÁT PROMETHEUS ^& GRAFANA
echo =====================================================================
echo.

echo [+] Đang dừng và giải phóng container Prometheus ^& Grafana...
docker compose -f "%~dp0docker-compose-monitoring.yml" down

echo.
echo [✓] Đã tắt toàn bộ hệ thống giám sát và giải phóng tài nguyên RAM/CPU!
echo.
pause
