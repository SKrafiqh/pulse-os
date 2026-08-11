# Pulse OS Telemetry Agent 💻

The **Pulse OS Agent** is a lightweight, cross-platform background monitoring daemon that harvests CPU, RAM, Disk, and Process telemetry from host machines (macOS, Windows, Linux) and streams it to the Pulse OS backend server.

---

## ✨ Key Features

- **Auto-Registration**: Auto-registers with the backend server on first run.
- **Auto Key Generation**: Generates and persists a unique `MACHINE_KEY` in `.env` if omitted.
- **PyInstaller Ready**: Engineered with `sys.frozen` path resolution & silent logging fallback for Windows `.exe` packaging.
- **File Logging (`agent.log`)**: Automatically records background diagnostics next to the executable when running without a console window.

---

## 🪟 Windows Setup & `.exe` Build Instructions

### Step 1: Install Python on Windows (First-time Build Machine Only)
1. Download Python 3.9 or higher from [python.org/downloads](https://www.python.org/downloads/).
2. **IMPORTANT**: Check the box **"Add python.exe to PATH"** at the bottom of the installer window before clicking Install.

### Step 2: Build the Windows `.exe` Executable

#### Quick Method (Batch Builder):
Double-click `build_windows.bat` inside the `agent/` folder (or run it in Command Prompt):
```cmd
build_windows.bat
```

#### Manual PyInstaller Command:
Open Command Prompt in `agent/` and run:
```cmd
pip install -r requirements.txt
pip install pyinstaller
pyinstaller --onefile --noconsole --name "PulseOS-Agent" --clean main.py
```
> **Note on `--noconsole`**: `--noconsole` runs the agent silently in the background without opening a CMD window. If you prefer a visible terminal log window, remove `--noconsole` from the command.

The compiled binary will be placed inside `agent\dist\PulseOS-Agent.exe`.

---

## 🚀 How to Deploy & Run on a New Laptop

To install the agent on a new Windows or macOS laptop (without installing Python):

### 1. Copy the Executable & Config
Copy the contents of the `dist/` directory to the target laptop:
- `PulseOS-Agent.exe` (Executable binary)
- `.env` (Configuration file)

### 2. Configure `.env` for the Target Machine ⚠️
Open `.env` in Notepad and update the **`BACKEND_URL`**:

```env
# REQUIRED: Change this to your central Pulse OS backend server IP or domain!
# Example for local network: http://192.168.1.50:8000
# Example for public domain:  https://pulseos-backend.yourcompany.com
BACKEND_URL=http://192.168.1.50:8000

# Optional: Give this laptop a custom label (Defaults to Windows Computer Name)
MACHINE_NAME=Finance-Laptop-01

# Sampling Interval in Seconds (Default: 5)
POLL_INTERVAL=5

# Secret key will be automatically generated on first run if left blank:
# MACHINE_KEY=
```

### 3. Run the Agent
Double-click `PulseOS-Agent.exe`!

- The agent auto-registers with the backend and starts transmitting telemetry every 5 seconds.
- Background log activity is written to `agent.log` in the same directory as `PulseOS-Agent.exe`.

---

## 🔧 How `.env` Handling Works in PyInstaller (`sys.frozen`)

When packaged with PyInstaller into a standalone executable, `agent/main.py` detects `getattr(sys, 'frozen', False)` and resolves `.env` relative to the folder where `PulseOS-Agent.exe` is located (not temporary unpacking directories). This guarantees that:
- You can edit `.env` next to `PulseOS-Agent.exe` anytime without re-compiling.
- Automatically generated secret keys write back to the local `.env` file cleanly.
