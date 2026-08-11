@echo off
TITLE Pulse OS Agent - Windows Executable Builder
echo ============================================================
echo          Pulse OS Agent - Windows PyInstaller Builder
echo ============================================================
echo.

REM Verify Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.9+ from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

echo [1/3] Installing / Updating required Python dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install pyinstaller
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install required packages!
    pause
    exit /b 1
)

echo.
echo [2/3] Compiling Pulse OS Agent into standalone Windows executable...
REM Flag --noconsole runs silently in background. Remove --noconsole if you want a visible CMD log window.
pyinstaller --onefile --noconsole --name "PulseOS-Agent" --clean main.py

if %errorlevel% neq 0 (
    echo [ERROR] PyInstaller build failed! Check errors above.
    pause
    exit /b 1
)

echo.
echo [3/3] Preparing distribution folder...
if not exist "dist\.env" (
    echo BACKEND_URL=http://localhost:8000> dist\.env
    echo POLL_INTERVAL=5>> dist\.env
    echo # MACHINE_NAME=My Windows Laptop>> dist\.env
    echo # MACHINE_KEY=>> dist\.env
)

echo.
echo ============================================================
echo [SUCCESS] Build Completed Successfully!
echo Executable Location : agent\dist\PulseOS-Agent.exe
echo Config File Location: agent\dist\.env
echo.
echo To deploy on another Windows laptop:
echo 1. Copy the 'dist\' folder (containing PulseOS-Agent.exe & .env)
echo 2. Edit .env on the new laptop to set BACKEND_URL (e.g. http://192.168.1.100:8000)
echo 3. Double-click PulseOS-Agent.exe to start monitoring!
echo ============================================================
echo.
pause
