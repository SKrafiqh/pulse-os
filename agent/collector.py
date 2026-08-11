"""
Pulse OS Agent - System Metrics Collector
Harvester module for CPU, RAM, Disk, and Process telemetry using psutil.
Supports cross-platform environments (Windows, macOS, Linux).
"""

import os
import platform
import psutil
from typing import Dict, Any, List


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


def collect_metrics(top_process_count: int = 8) -> Dict[str, Any]:
    """
    Collect current system resource usage and top active processes.

    Args:
        top_process_count (int): Number of top memory-consuming processes to include.

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

    # Top processes sorted by memory percentage
    processes: List[Dict[str, Any]] = []
    for proc in sorted(
        psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']),
        key=lambda p: (p.info.get('memory_percent') or 0.0),
        reverse=True
    )[:top_process_count]:
        try:
            info: Dict[str, Any] = proc.info
            processes.append({
                "pid": int(info['pid']),
                "name": str(info['name'] or "Unknown"),
                "cpu_percent": round(float(info.get('cpu_percent') or 0.0), 2),
                "memory_percent": round(float(info.get('memory_percent') or 0.0), 2)
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue

    return {
        "cpu_percent": round(float(cpu_percent), 2),
        "ram_percent": round(float(ram_percent), 2),
        "ram_used_gb": round(float(ram_used_gb), 2),
        "ram_total_gb": round(float(ram_total_gb), 2),
        "disk_percent": round(float(disk_percent), 2),
        "processes": processes
    }
