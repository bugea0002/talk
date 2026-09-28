@echo off
chcp 65001 > nul
echo ========================================================
echo   카톡 단톡방 CTI 성향 분석 & 팩폭 리포트 웹앱 실행기
echo ========================================================
echo.
echo 브라우저를 열고 로컬 서버(http://localhost:8080)를 실행합니다...
echo 창을 닫으면 서버가 종료됩니다.
echo.
start http://localhost:8080
python -m http.server 8080 --directory "%~dp0"
pause
