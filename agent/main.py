"""
Pulse OS Agent - Main Monitoring Daemon
Entry point process for node auto-registration, metrics collection, and live telemetry streaming.
Ready for PyInstaller standalone packaging across macOS, Linux, and Windows.
"""

import os
import sys
import time
import secrets
import socket
import logging
from typing import Dict, Any, Tuple
from dotenv import load_dotenv

# Ensure local module directory is in sys.path
agent_dir = os.path.dirname(os.path.abspath(__file__))
if agent_dir not in sys.path:
    sys.path.insert(0, agent_dir)


def get_base_dir() -> str:
    """Return base directory handling normal script execution and PyInstaller frozen binaries."""
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


# Configure logging safely for both console & PyInstaller --noconsole GUI modes
base_dir_path = get_base_dir()
log_handlers = []

if sys.stdout is not None:
    log_handlers.append(logging.StreamHandler(sys.stdout))

try:
    log_file_path = os.path.join(base_dir_path, "agent.log")
    log_handlers.append(logging.FileHandler(log_file_path, encoding="utf-8"))
except Exception:
    pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=log_handlers if log_handlers else [logging.NullHandler()]
)
logger: logging.Logger = logging.getLogger("PulseOSAgent")

from collector import get_machine_info, collect_metrics
from sender import register_machine, send_metrics


def load_or_initialize_config() -> Tuple[str, str, str, float, str]:
    """
    Load environment variables from .env file located next to script or .exe binary.
    Generates a unique MACHINE_KEY and saves it to .env if missing.

    Returns:
        Tuple[str, str, str, float, str]: (backend_url, machine_name, machine_key, poll_interval, env_file_path)
    """
    base_dir = get_base_dir()
    env_path = os.path.join(base_dir, ".env")

    # Load existing .env if present
    if os.path.exists(env_path):
        load_dotenv(dotenv_path=env_path, override=True)

    backend_url = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip("/")
    hostname = socket.gethostname() or "unknown-host"
    machine_name = os.getenv("MACHINE_NAME", "").strip() or hostname
    machine_key = os.getenv("MACHINE_KEY", "").strip()

    try:
        poll_interval = float(os.getenv("POLL_INTERVAL", "5"))
    except ValueError:
        poll_interval = 5.0

    # Auto-generate a persistent secret key if missing
    if not machine_key or machine_key == "your-secret-key-here":
        random_suffix = secrets.token_hex(6)
        machine_key = f"node-key-{random_suffix}"
        logger.info("No MACHINE_KEY found. Generated new key: %s", machine_key)

        # Save to .env file for persistence across restarts
        try:
            env_content = f"# Pulse OS Agent Configuration\nMACHINE_NAME={machine_name}\nMACHINE_KEY={machine_key}\nBACKEND_URL={backend_url}\nPOLL_INTERVAL={int(poll_interval)}\n"
            with open(env_path, "w", encoding="utf-8") as f:
                f.write(env_content)
            logger.info("Saved configuration to %s", env_path)
        except Exception as exc:
            logger.warning("Could not persist generated key to .env file: %s", exc)

    return backend_url, machine_name, machine_key, poll_interval, env_path


def mask_key(key: str) -> str:
    """Mask secret machine key for display in startup banners."""
    if len(key) <= 8:
        return "****"
    return f"{key[:6]}...{key[-4:]}"


def main() -> None:
    backend_url, machine_name, machine_key, poll_interval, env_path = load_or_initialize_config()
    info: Dict[str, str] = get_machine_info()
    hostname: str = info.get("hostname", socket.gethostname())

    # Print clean startup banner if console stdout is attached
    banner = f"""
============================================================
              Pulse OS Telemetry Agent v1.1              
============================================================
 Machine Name : {machine_name}
 System Host  : {hostname} ({info.get('system')} {info.get('release')} {info.get('architecture')})
 Machine Key  : {mask_key(machine_key)}
 Target Server: {backend_url}
 Poll Interval: {poll_interval:.1f} seconds
 Env Config   : {env_path}
============================================================
"""
    if sys.stdout is not None:
        print(banner)

    # Auto-register machine node on startup
    logger.info("Auto-registering machine node with backend server at %s...", backend_url)
    reg_success, reg_msg = register_machine(
        backend_url=backend_url,
        machine_name=machine_name,
        hostname=hostname,
        machine_key=machine_key
    )

    if reg_success:
        logger.info("[SUCCESS] %s", reg_msg)
    else:
        logger.warning("[NOTICE] %s", reg_msg)
        logger.warning("Agent will proceed and attempt auto-registration during metric streaming.")

    # Infinite metrics collection loop
    try:
        while True:
            logger.info("Harvesting system metrics...")
            metrics: Dict[str, Any] = collect_metrics(top_process_count=20)

            logger.info(
                "Telemetry: CPU %.1f%% | RAM %.1f%% (%.2f/%.2f GB) | Disk %.1f%% | Top Processes: %d",
                metrics["cpu_percent"],
                metrics["ram_percent"],
                metrics["ram_used_gb"],
                metrics["ram_total_gb"],
                metrics["disk_percent"],
                len(metrics["processes"])
            )

            success: bool = send_metrics(
                backend_url=backend_url,
                machine_key=machine_key,
                metrics=metrics,
                max_retries=2
            )

            if success:
                logger.info("Sample delivered. Next sample in %.1fs.", poll_interval)
            else:
                logger.warning("Delivery pending. Re-verifying registration and retrying in %.1fs...", poll_interval)
                register_machine(backend_url, machine_name, hostname, machine_key)

            time.sleep(poll_interval)

    except KeyboardInterrupt:
        logger.info("Pulse OS Agent received shutdown signal. Exiting cleanly.")
        sys.exit(0)
    except Exception as exc:
        logger.critical("Unexpected error in monitoring agent loop: %s", exc, exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
