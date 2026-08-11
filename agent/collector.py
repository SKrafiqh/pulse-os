"""
Pulse OS Agent - System Metrics Collector
Harvester module for CPU, RAM, Disk, and individual process telemetry using psutil.
Supports accurate process name mapping and cross-platform environments (Windows, macOS, Linux).
"""

import os
import platform
import psutil
from typing import Dict, Any, List


# Clean mapping dictionary for common raw process names
PROCESS_NAME_MAP: Dict[str, str] = {
    # IDEs & Editors
    "code.exe": "Visual Studio Code",
    "code": "Visual Studio Code",
    "code helper": "Visual Studio Code",
    "code helper (renderer)": "Visual Studio Code",
    "code helper (plugin)": "Visual Studio Code",
    "code helper (gpu)": "Visual Studio Code",
    "cursor.exe": "Cursor IDE",
    "cursor": "Cursor IDE",
    "sublime_text.exe": "Sublime Text",
    "notepad.exe": "Notepad",
    "notepad++.exe": "Notepad++",
    "pycharm.exe": "PyCharm",
    "idea64.exe": "IntelliJ IDEA",

    # Browsers
    "chrome.exe": "Google Chrome",
    "chrome": "Google Chrome",
    "google chrome": "Google Chrome",
    "msedge.exe": "Microsoft Edge",
    "msedge": "Microsoft Edge",
    "msedgewebview2.exe": "Microsoft Edge",
    "firefox.exe": "Mozilla Firefox",
    "firefox": "Mozilla Firefox",
    "brave.exe": "Brave Browser",
    "brave": "Brave Browser",
    "safari": "Safari Browser",
    "arc.exe": "Arc Browser",
    "arc": "Arc Browser",
    "opera.exe": "Opera Browser",

    # Communication & Social
    "whatsapp.root.exe": "WhatsApp",
    "whatsapp.exe": "WhatsApp",
    "whatsapp": "WhatsApp",
    "slack.exe": "Slack",
    "slack": "Slack",
    "discord.exe": "Discord",
    "discord": "Discord",
    "telegram.exe": "Telegram",
    "telegram": "Telegram",
    "teams.exe": "Microsoft Teams",
    "ms-teams.exe": "Microsoft Teams",
    "zoom.exe": "Zoom",

    # Media & Entertainment
    "spotify.exe": "Spotify",
    "spotify": "Spotify",
    "vlc.exe": "VLC Media Player",

    # System & Tools
    "explorer.exe": "Windows Explorer",
    "taskmgr.exe": "Task Manager",
    "cmd.exe": "Command Prompt",
    "powershell.exe": "PowerShell",
    "terminal.exe": "Windows Terminal",
    "windowsterminal.exe": "Windows Terminal",
    "docker desktop.exe": "Docker Desktop",
    "docker": "Docker Engine",
    "python.exe": "Python",
    "python3": "Python 3",
    "node.exe": "Node.js",
    "node": "Node.js",
}


def normalize_process_name(raw_name: str, exe_path: str = "") -> str:
    """
    Map raw process or executable names to clean, user-friendly labels.
    Uses process name and executable path inspection for maximum accuracy.
    """
    if not raw_name:
        return "Unknown Process"

    cleaned: str = raw_name.strip()
    lower_name: str = cleaned.lower()
    exe_lower: str = (exe_path or "").lower()

    # Exact dictionary lookup
    if lower_name in PROCESS_NAME_MAP:
        return PROCESS_NAME_MAP[lower_name]

    # Pattern & executable path inspection
    if "chrome" in lower_name or "chrome" in exe_lower:
        return "Google Chrome"
    if "msedge" in lower_name or "msedge" in exe_lower:
        return "Microsoft Edge"
    if "code" in lower_name or "code" in exe_lower:
        return "Visual Studio Code"
    if "whatsapp" in lower_name or "whatsapp" in exe_lower:
        return "WhatsApp"
    if "slack" in lower_name or "slack" in exe_lower:
        return "Slack"
    if "discord" in lower_name or "discord" in exe_lower:
        return "Discord"
    if "spotify" in lower_name or "spotify" in exe_lower:
        return "Spotify"
    if "docker" in lower_name or "docker" in exe_lower:
        return "Docker Engine"

    return cleaned


def get_main_drive_path() -> str:
    """Return the root path of the primary operating system drive."""
    if platform.system() == "Windows":
        system_drive = os.getenv("SystemDrive", "C:")
        return f"{system_drive}\\"
    return "/"


def get_machine_info() -> Dict[str, str]:
    """Return basic platform identity details."""
    return {
        "hostname": platform.node(),
        "system": platform.system(),
        "release": platform.release(),
        "architecture": platform.machine()
    }


def collect_metrics(top_process_count: int = 20) -> Dict[str, Any]:
    """
    Collect current system resource usage and top 20 individual active processes.
    Filters out zero-load idle noise and sorts processes by total resource load.

    Args:
        top_process_count (int): Number of top active individual processes to return (default: 20).

    Returns:
        Dict[str, Any]: Accurate metrics dictionary with top individual processes.
    """
    # System-wide CPU sampling
    cpu_percent: float = psutil.cpu_percent(interval=1.0)

    # System-wide RAM statistics
    ram = psutil.virtual_memory()
    ram_percent: float = ram.percent
    ram_used_gb: float = ram.used / (1024 ** 3)
    ram_total_gb: float = ram.total / (1024 ** 3)

    # System-wide Disk partition usage
    main_drive: str = get_main_drive_path()
    try:
        disk = psutil.disk_usage(main_drive)
        disk_percent: float = disk.percent
    except Exception:
        disk = psutil.disk_usage("/")
        disk_percent: float = disk.percent

    # Harvest individual process telemetry
    processes_list: List[Dict[str, Any]] = []

    for proc in psutil.process_iter(['pid', 'name', 'exe', 'cpu_percent', 'memory_percent']):
        try:
            info = proc.info
            pid = int(info['pid'])
            raw_name = str(info['name'] or "Unknown")
            exe_path = str(info.get('exe') or "")
            clean_name = normalize_process_name(raw_name, exe_path=exe_path)

            cpu_val = round(float(info.get('cpu_percent') or 0.0), 2)
            ram_val = round(float(info.get('memory_percent') or 0.0), 2)

            # Filter out idle system noise (0% CPU and negligible memory)
            if cpu_val == 0.0 and ram_val < 0.05:
                continue

            total_load = cpu_val + ram_val

            processes_list.append({
                "pid": pid,
                "name": clean_name,
                "cpu_percent": cpu_val,
                "memory_percent": ram_val,
                "_total_load": total_load
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue

    # Sort descending by combined resource usage (CPU + Memory)
    processes_list.sort(key=lambda p: p["_total_load"], reverse=True)

    # Format final list of top 20 processes
    final_processes: List[Dict[str, Any]] = []
    for item in processes_list[:top_process_count]:
        item.pop("_total_load", None)
        final_processes.append(item)

    return {
        "cpu_percent": round(float(cpu_percent), 2),
        "ram_percent": round(float(ram_percent), 2),
        "ram_used_gb": round(float(ram_used_gb), 2),
        "ram_total_gb": round(float(ram_total_gb), 2),
        "disk_percent": round(float(disk_percent), 2),
        "processes": final_processes
    }
