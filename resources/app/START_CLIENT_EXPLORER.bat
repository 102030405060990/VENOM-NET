@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
title VENOM Client Explorer - DEBUG

echo ========================================
echo   VENOM Client Explorer
echo   http://192.168.0.80:8765
echo ========================================
echo.

if not exist "%~dp0tools\client-explorer.js" (
  echo [ERROR] File not found:
  echo %~dp0tools\client-explorer.js
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not available in PATH.
  echo Install Node.js or restart Windows after installing it.
  pause
  exit /b 1
)

echo [INFO] Starting Client Explorer in this window...
echo [INFO] Keep this window open while using the browser.
echo.
node "%~dp0tools\client-explorer.js"

set "EC=%ERRORLEVEL%"
echo.
echo ========================================
echo Client Explorer stopped. Code: %EC%
echo ========================================
pause
exit /b %EC%
