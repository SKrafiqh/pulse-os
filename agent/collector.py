"""
Pulse OS Agent - System Metrics Collector
Harvester module for CPU, RAM, Disk, and Process telemetry using psutil.
Supports process name mapping, process grouping, and cross-platform environments.
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


def normalize_process_name(raw_name: str) -> str:
    """
    Map raw process or executable names to clean, user-friendly labels.
    If no mapping exists, returns the original process name.
    """
    if not raw_name:
        return "Unknown"

    cleaned: str = raw_name.strip()
    lower_name: str = cleaned.lower()

    if lower_name in PROCESS_NAME_MAP:
        return PROCESS_NAME_MAP[lower_name]

    if lower_name.startswith("code helper"):
        return "Visual Studio Code"

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


def collect_metrics(top_process_count: int = 15) -> Dict[str, Any]:
    """
    Collect current system resource usage and top active processes.
    Groups multiple process instances with the same normalized name,
    sums CPU & RAM load, and returns the top N grouped entries (default 15).

    Args:
        top_process_count (int): Number of top grouped processes to return.

    Returns:
        Dict[str, Any]: Clean metrics dictionary.
    """
    # CPU usage percentage
    cpu_percent: float = psutil.cpu_percent(interval=1.0)

    # RAM statistics
    ram = psutil.virtual_memory()
    ram_percent: float = ram.percent
    ram_used_gb: float = ram.used / (1024 ** 3)
    ram_total_gb: float = ram.total / (1024 ** 3)

    # Main disk partition usage
    main_drive: str = get_main_drive_path()
    try:
        disk = psutil.disk_usage(main_drive)
        disk_percent: float = disk.percent
    except Exception:
        disk = psutil.disk_usage("/")
        disk_percent: float = disk.percent

    # Aggregate processes by clean normalized name
    grouped: Dict[str, Dict[str, Any]] = {}

    for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
        try:
            info = proc.info
            pid = int(info['pid'])
            raw_name = str(info['name'] or "Unknown")
            clean_name = normalize_process_name(raw_name)

            cpu_val = float(info.get('cpu_percent') or 0.0)
            ram_val = float(info.get('memory_percent') or 0.0)

            if clean_name in grouped:
                grouped[clean_name]["count"] += 1
                grouped[clean_name]["cpu_sum"] += cpu_val
                grouped[clean_name]["memory_sum"] += ram_val
                if pid < grouped[clean_name]["pid"]:
                    grouped[clean_name]["pid"] = pid
            else:
                grouped[clean_name] = {
                    "pid": pid,
                    "base_name": clean_name,
                    "count": 1,
                    "cpu_sum": cpu_val,
                    "memory_sum": ram_val
                }
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue

    # Format entries with process counts (e.g. "Google Chrome (4 processes)")
    formatted_processes: List[Dict[str, Any]] = []
    for item in grouped.values():
        count = item["count"]
        display_name = f"{item['base_name']} ({count} processes)" if count > 1 else item["base_name"]
        cpu_total = round(item["cpu_sum"], 2)
        mem_total = round(item["memory_sum"], 2)

        formatted_processes.append({
            "pid": item["pid"],
            "name": display_name,
            "cpu_percent": cpu_total,
            "memory_percent": mem_total,
            "_total_load": cpu_total + mem_total
        })

    # Sort descending by combined CPU + Memory load (highest resource consumers first)
    formatted_processes.sort(key=lambda p: p["_total_load"], reverse=True)

    # Clean up transient load key and return top 15
    final_processes: List[Dict[str, Any]] = []
    for proc_data in formatted_processes[:top_process_count]:
        proc_data.pop("_total_load", None)
        final_processes.append(proc_data)

    return {
        "cpu_percent": round(float(cpu_percent), 2),
        "ram_percent": round(float(ram_percent), 2),
        "ram_used_gb": round(float(ram_used_gb), 2),
        "ram_total_gb": round(float(ram_total_gb), 2),
        "disk_percent": round(float(disk_percent), 2),
        "processes": final_processes
    }
