@echo off
chcp 65001 >nul
title MedSched - Giao Dien React Vite (Trang Huynh)
color 0B

echo ========================================================
echo   KHOI DONG GIAO DIEN CUA TRANG (REACT + VITE + TAILWIND)
echo ========================================================
echo.
echo [1/2] Dang khoi dong may chu Vite Dev Server (cong 5173)...
cd /d "%~dp0my-app"
start "Vite - Giao Dien Trang" cmd /k "pnpm dev || npm run dev"

echo.
echo [2/2] Dang mo trinh duyet Web...
timeout /t 3 >nul
start http://localhost:5173

echo.
echo ========================================================
echo   Giao dien cua Trang dang chay tai:
echo   👉 http://localhost:5173
echo ========================================================
echo.
echo Cua so nay se tu dong dong sau 3 giay...
timeout /t 3 >nul
exit
