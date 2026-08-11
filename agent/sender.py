"""
Pulse OS Agent - Telemetry Transport Sender & Registration
Handles node auto-registration and metric transmission with backend retry logic.
"""

import time
import logging
import requests
from typing import Dict, Any, Tuple

logger: logging.Logger = logging.getLogger("PulseOSAgent.Sender")


def register_machine(backend_url: str, machine_name: str, hostname: str, machine_key: str) -> Tuple[bool, str]:
    """
    Auto-register or heartbeat update machine identity with the backend server.

    Args:
        backend_url (str): Base URL of the Pulse OS backend server.
        machine_name (str): Human-readable node label.
        hostname (str): System hostname.
        machine_key (str): Unique secret key identifying this agent node.

    Returns:
        Tuple[bool, str]: (Success status, Result message or error description)
    """
    endpoint: str = f"{backend_url.rstrip('/')}/api/v1/machines/register"
    payload: Dict[str, str] = {
        "name": machine_name,
        "hostname": hostname,
        "machine_key": machine_key
    }

    try:
        response: requests.Response = requests.post(
            endpoint,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=5.0
        )

        if response.status_code in (200, 201):
            data = response.json()
            status = data.get("status", "registered")
            return True, f"Machine successfully {status} with backend."
        else:
            return False, f"Backend returned HTTP {response.status_code}: {response.text}"

    except requests.exceptions.ConnectionError:
        return False, f"Connection refused. Could not connect to Pulse OS Backend at '{backend_url}'."
    except requests.exceptions.Timeout:
        return False, f"Timeout after 5.0s connecting to backend at '{backend_url}'."
    except requests.exceptions.RequestException as exc:
        return False, f"Network error during machine registration: {exc}"


def send_metrics(backend_url: str, machine_key: str, metrics: Dict[str, Any], max_retries: int = 2) -> bool:
    """
    Send metrics telemetry payload to the backend server with automatic retries.

    Args:
        backend_url (str): Base URL of the Pulse OS backend server.
        machine_key (str): Unique node key identifying this machine agent.
        metrics (Dict[str, Any]): Telemetry dictionary collected from system.
        max_retries (int): Maximum number of retry attempts on network failure.

    Returns:
        bool: True if metrics were delivered successfully, False otherwise.
    """
    endpoint: str = f"{backend_url.rstrip('/')}/api/v1/metrics"
    headers: Dict[str, str] = {
        "Content-Type": "application/json",
        "X-Machine-Key": machine_key
    }
    payload: Dict[str, Any] = {
        "machine_key": machine_key,
        **metrics
    }

    total_attempts: int = 1 + max_retries

    for attempt in range(1, total_attempts + 1):
        try:
            response: requests.Response = requests.post(
                endpoint,
                json=payload,
                headers=headers,
                timeout=5.0
            )

            if response.status_code in (200, 201):
                logger.info("Metrics delivered to backend successfully (Attempt %d/%d)", attempt, total_attempts)
                return True
            elif response.status_code == 404:
                logger.warning("Backend returned 404: Machine key not registered yet.")
                return False
            else:
                logger.warning(
                    "Backend error HTTP %d (Attempt %d/%d): %s",
                    response.status_code, attempt, total_attempts, response.text
                )

        except requests.exceptions.ConnectionError:
            if attempt < total_attempts:
                logger.warning(
                    "Connection refused to %s (Attempt %d/%d). Ensure backend server is running. Retrying in 1s...",
                    backend_url, attempt, total_attempts
                )
                time.sleep(1.0)
            else:
                logger.error("Failed to connect to backend at '%s' after %d attempts.", backend_url, total_attempts)

        except requests.exceptions.Timeout:
            if attempt < total_attempts:
                logger.warning("Request timeout (Attempt %d/%d). Retrying in 1s...", attempt, total_attempts)
                time.sleep(1.0)
            else:
                logger.error("Backend request timed out after %d attempts.", total_attempts)

        except requests.exceptions.RequestException as exc:
            if attempt < total_attempts:
                logger.warning("Network error (Attempt %d/%d): %s. Retrying...", attempt, total_attempts, exc)
                time.sleep(1.0)
            else:
                logger.error("Telemetry transport failed after %d attempts: %s", total_attempts, exc)

    return False
