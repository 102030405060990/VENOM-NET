@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
title VENOM NET - Development Server

echo ========================================
echo   VENOM NET - Development Server
echo   http://localhost:8081
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not available in PATH.
  pause
  exit /b 1
)

if not exist "%~dp0resources\app\node_modules\express" (
  echo [ERROR] Dependencies are not installed.
  echo Run: npm install --prefix resources\app
  pause
  exit /b 1
)

echo [INFO] Starting in watch mode. Errors stay visible in this window.
echo [INFO] Press Ctrl+C to stop.
echo.
npm run dev
set "EXITCODE=%ERRORLEVEL%"

echo.
echo Development server stopped. Code: %EXITCODE%
pause
exit /b %EXITCODE%