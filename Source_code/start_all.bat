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
echo [2/3] Dang khoi dong Frontend Next.js (cong 3000)...
start "MedSched - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo [3/3] Dang cho Next.js san sang de tu dong mo trinh duyet Web...
timeout /t 5 >nul
start http://localhost:3000

echo.
echo ========================================================
echo   DA KHOI DONG THANH CONG!
echo   - Backend API : http://localhost:8080
echo   - Frontend Web: http://localhost:3000
echo   - Trinh duyet da duoc tu dong mo len man hinh!
echo ========================================================
echo.
echo Cua so nay se tu dong dong sau 3 giay...
timeout /t 3 >nul
exit
