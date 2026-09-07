@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
title VENOM NET - Server + Client Explorer

echo ========================================
echo   VENOM NET
echo   Server: 192.168.0.211:8081
echo   Client Explorer: 192.168.0.80:8765
echo ========================================
echo.

if not exist "%~dp0server.js" (
  echo [ERROR] server.js not found:
  echo %~dp0server.js
  pause
  exit /b 1
)

if not exist "%~dp0tools\client-explorer.js" (
  echo [ERROR] tools\client-explorer.js not found.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not available in PATH.
  pause
  exit /b 1
)

set "EXPLORER_OK=0"
curl.exe --silent --show-error --max-time 1 http://192.168.0.80:8765/health >nul 2>&1
if not errorlevel 1 set "EXPLORER_OK=1"

if "%EXPLORER_OK%"=="0" (
  echo [VENOM] Starting Client Explorer...
  start "VENOM Client Explorer" /min node "%~dp0tools\client-explorer.js"
  echo [VENOM] Waiting for 192.168.0.80:8765 ...
  for /l %%N in (1,1,15) do (
    curl.exe --silent --show-error --max-time 1 http://192.168.0.80:8765/health >nul 2>&1
    if not errorlevel 1 (
      set "EXPLORER_OK=1"
      goto :explorer_ready
    )
    timeout /t 1 /nobreak >nul
  )
)

:explorer_ready
if "%EXPLORER_OK%"=="1" (
  echo [OK] Client Explorer is ready on 192.168.0.80:8765.
) else (
  echo [WARNING] Client Explorer did not start.
  echo          Run START_CLIENT_EXPLORER.bat manually to see the exact error.
)

echo.
echo [VENOM] Starting server.js...
echo.
node "%~dp0server.js"
set "EXITCODE=%ERRORLEVEL%"

echo.
echo ========================================
echo   Server stopped. Code: %EXITCODE%
echo ========================================
pause
exit /b %EXITCODE%
