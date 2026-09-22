@echo off
title Leads Outreach Engine
color 0A

echo ============================================
echo  Leads Outreach Engine - Starting up...
echo ============================================
echo.

:: Step 1: Build the React frontend
echo [1/3] Building React client...
cd /d "%~dp0client"
call npm run build
if errorlevel 1 (
  echo.
  echo ERROR: Client build failed! Check errors above.
  pause
  exit /b 1
)

:: Step 2: Build the TypeScript server
echo.
echo [2/3] Building server...
cd /d "%~dp0server"
call npm run build
if errorlevel 1 (
  echo.
  echo ERROR: Server build failed! Check errors above.
  pause
  exit /b 1
)

:: Step 3: Start the server (serves both API + frontend)
echo.
echo [3/3] Starting server...
echo.
echo ============================================
echo  App will be available at:
echo  http://localhost:3001
echo ============================================
echo.
node dist/index.js
pause
