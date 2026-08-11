"""
Pulse OS - End-to-End API Test Script
Tests machine registration, metric ingestion, machine listing, and metrics retrieval.
"""

import sys
import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:8000"
MACHINE_KEY = "test-node-key-999"


def make_request(url: str, method: str = "GET", data: dict = None) -> dict:
    """Helper to send HTTP JSON requests using standard library urllib."""
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8") if data else None

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            res_body = response.read().decode("utf-8")
            return json.loads(res_body)
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8")
        print(f"❌ HTTP Error {exc.code} for {method} {url}: {error_body}")
        sys.exit(1)
    except urllib.error.URLError as exc:
        print(f"❌ Connection Error for {method} {url}: {exc.reason}")
        print("💡 Make sure the backend server is running on http://localhost:8000")
        sys.exit(1)


def main():
    print("==================================================")
    print("  🚀 Testing Pulse OS API Flow")
    print("==================================================\n")

    # 1. Health Check
    print("1️⃣ Testing GET /health ...")
    health = make_request(f"{BASE_URL}/health")
    print(f"   Status: {health.get('status')} | DB: {health.get('database')}")
    print("   ✅ Health check passed!\n")

    # 2. Machine Registration
    print("2️⃣ Registering machine (POST /api/v1/machines/register) ...")
    reg_payload = {
        "name": "Test Workstation 01",
        "hostname": "test-workstation-mac",
        "machine_key": MACHINE_KEY
    }
    reg_res = make_request(f"{BASE_URL}/api/v1/machines/register", method="POST", data=reg_payload)
    machine_id = reg_res["machine"]["id"]
    print(f"   Status: {reg_res.get('status')} | Machine ID: {machine_id}")
    print("   ✅ Machine registration passed!\n")

    # 3. Metric Ingestion
    print("3️⃣ Sending sample metrics (POST /api/v1/metrics) ...")
    metric_payload = {
        "machine_key": MACHINE_KEY,
        "cpu_percent": 14.5,
        "ram_percent": 58.2,
        "ram_used_gb": 9.31,
        "ram_total_gb": 16.0,
        "disk_percent": 42.8,
        "processes": [
            {"pid": 101, "name": "python3", "cpu_percent": 4.2, "memory_percent": 2.1},
            {"pid": 204, "name": "code", "cpu_percent": 8.1, "memory_percent": 5.4}
        ]
    }
    metric_res = make_request(f"{BASE_URL}/api/v1/metrics", method="POST", data=metric_payload)
    print(f"   Message: {metric_res.get('message')} | Metric ID: {metric_res.get('metric_id')}")
    print("   ✅ Metric ingestion passed!\n")

    # 4. List Machines
    print("4️⃣ Listing all registered machines (GET /api/v1/machines) ...")
    machines_res = make_request(f"{BASE_URL}/api/v1/machines")
    machines_list = machines_res.get("machines", [])
    print(f"   Total Machines Found: {len(machines_list)}")
    for m in machines_list:
        print(f"   - Machine: {m['name']} ({m['hostname']}) | Online: {m['is_online']} | ID: {m['id']}")
    print("   ✅ Machine listing passed!\n")

    # 5. Fetch Machine Metrics
    print(f"5️⃣ Fetching metrics history for Machine ID: {machine_id} ...")
    hist_res = make_request(f"{BASE_URL}/api/v1/machines/{machine_id}/metrics")
    metrics_list = hist_res.get("metrics", [])
    print(f"   Retrieved {len(metrics_list)} metric records.")
    if metrics_list:
        latest = metrics_list[0]
        print(f"   Latest Record -> CPU: {latest['cpu_percent']}% | RAM: {latest['ram_percent']}% | Recorded At: {latest['created_at']}")
    print("   ✅ Machine metrics retrieval passed!\n")

    print("==================================================")
    print("  🎉 All Pulse OS flow tests completed successfully!")
    print("==================================================")


if __name__ == "__main__":
    main()
