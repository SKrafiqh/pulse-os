"""
Pulse OS Backend Server
FastAPI web service bridging agent telemetry with Supabase Postgres database.
Includes OpenRouter AI telemetry diagnostics endpoint and machine node deletion.
"""

import os
import sys
import json
import logging
import requests
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import FastAPI, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from supabase import create_client, Client

# Configure logging format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger: logging.Logger = logging.getLogger("PulseOSBackend")

load_dotenv(override=True)

app: FastAPI = FastAPI(
    title="Pulse OS Backend API",
    description="Telemetry ingestion and machine monitoring API service backed by Supabase & OpenRouter AI",
    version="1.3.0"
)

# -----------------------------------------------------------------------------
# CORS Middleware Configuration
# -----------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Supabase & OpenRouter Initialization
# -----------------------------------------------------------------------------
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "").strip()

supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("PulseOSBackend: Supabase client initialized successfully (%s)", SUPABASE_URL)
    except Exception as exc:
        logger.error("PulseOSBackend: Failed to initialize Supabase client: %s", exc)
else:
    logger.warning("PulseOSBackend: SUPABASE_URL or SUPABASE_KEY environment variables not set.")

if OPENROUTER_API_KEY:
    logger.info("PulseOSBackend: OpenRouter AI Engine ENABLED (API Key: %s...)", OPENROUTER_API_KEY[:10])
else:
    logger.info("PulseOSBackend: OPENROUTER_API_KEY not found in env. AI endpoint will use rule engine fallback.")


def get_db_client() -> Client:
    """Dependency helper ensuring active Supabase database client connection."""
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database client is not initialized or configured."
        )
    return supabase


# -----------------------------------------------------------------------------
# Pydantic Schemas
# -----------------------------------------------------------------------------
class MachineRegisterRequest(BaseModel):
    name: str = Field(..., description="Human-readable machine label")
    hostname: str = Field(..., description="Machine system hostname")
    machine_key: str = Field(..., description="Unique secret key identifying the agent node")


class MetricItemProcess(BaseModel):
    pid: int
    name: str
    cpu_percent: float
    memory_percent: float


class MetricIngestRequest(BaseModel):
    machine_key: str = Field(..., description="Unique agent identifier key")
    cpu_percent: float = Field(..., ge=0.0, le=100.0, description="CPU usage percentage")
    ram_percent: float = Field(..., ge=0.0, le=100.0, description="RAM usage percentage")
    ram_used_gb: float = Field(..., ge=0.0, description="RAM used in Gigabytes")
    ram_total_gb: float = Field(..., ge=0.0, description="Total RAM in Gigabytes")
    disk_percent: float = Field(..., ge=0.0, le=100.0, description="Main disk usage percentage")
    processes: List[Dict[str, Any]] = Field(default_factory=list, description="Top active processes list")


class AIAnalyzeRequest(BaseModel):
    machine_id: Optional[str] = Field(None, description="Optional machine ID to query from DB")
    machine_name: Optional[str] = Field("Unknown Node", description="Human readable machine name")
    cpu_percent: Optional[float] = Field(0.0, description="CPU usage percentage")
    ram_percent: Optional[float] = Field(0.0, description="RAM usage percentage")
    ram_used_gb: Optional[float] = Field(0.0, description="RAM used in Gigabytes")
    ram_total_gb: Optional[float] = Field(0.0, description="Total RAM in Gigabytes")
    disk_percent: Optional[float] = Field(0.0, description="Disk usage percentage")
    processes: List[Dict[str, Any]] = Field(default_factory=list, description="Top active processes list")


class AIAnalyzeResponse(BaseModel):
    summary: str
    analysis: str
    recommendations: List[str]
    model_used: str


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@app.get("/health", status_code=status.HTTP_200_OK)
def health_check() -> Dict[str, Any]:
    """Simple health check endpoint for uptime monitors."""
    load_dotenv(override=True)
    openrouter_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    db_status: str = "connected" if supabase is not None else "disconnected"
    ai_status: str = "configured" if bool(openrouter_key) else "fallback_mode"
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": db_status,
        "ai_engine": ai_status
    }


@app.post("/api/v1/machines/register", status_code=status.HTTP_200_OK)
def register_machine(payload: MachineRegisterRequest) -> Dict[str, Any]:
    """
    Register a new machine node or update an existing machine by machine_key.
    Returns the complete updated machine record data.
    """
    db: Client = get_db_client()
    now_iso: str = datetime.now(timezone.utc).isoformat()

    try:
        existing = db.table("machines").select("*").eq("machine_key", payload.machine_key).execute()

        if existing.data:
            machine_id: str = existing.data[0]["id"]
            updated = db.table("machines").update({
                "name": payload.name,
                "hostname": payload.hostname,
                "last_seen": now_iso,
                "is_online": True
            }).eq("id", machine_id).execute()

            logger.info("Updated existing machine record ID %s", machine_id)
            return {"status": "updated", "machine": updated.data[0] if updated.data else existing.data[0]}
        else:
            inserted = db.table("machines").insert({
                "name": payload.name,
                "hostname": payload.hostname,
                "machine_key": payload.machine_key,
                "last_seen": now_iso,
                "is_online": True
            }).execute()

            if not inserted.data:
                raise HTTPException(status_code=500, detail="Failed to insert machine record.")

            logger.info("Registered new machine record ID %s", inserted.data[0]["id"])
            return {"status": "registered", "machine": inserted.data[0]}

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error during machine registration: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to register machine: {str(exc)}"
        )


@app.post("/api/v1/metrics", status_code=status.HTTP_201_CREATED)
def ingest_metrics(payload: MetricIngestRequest) -> Dict[str, Any]:
    """
    Receive system telemetry from host monitoring agent.
    Updates machine heartbeat and inserts new telemetry metric row.
    """
    db: Client = get_db_client()
    now_iso: str = datetime.now(timezone.utc).isoformat()

    try:
        machine_res = db.table("machines").select("id").eq("machine_key", payload.machine_key).execute()

        if not machine_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Machine with key '{payload.machine_key}' not found. Please register machine first."
            )

        machine_id: str = machine_res.data[0]["id"]

        db.table("machines").update({
            "last_seen": now_iso,
            "is_online": True
        }).eq("id", machine_id).execute()

        metric_res = db.table("metrics").insert({
            "machine_id": machine_id,
            "cpu_percent": payload.cpu_percent,
            "ram_percent": payload.ram_percent,
            "ram_used_gb": payload.ram_used_gb,
            "ram_total_gb": payload.ram_total_gb,
            "disk_percent": payload.disk_percent,
            "processes": payload.processes,
            "created_at": now_iso
        }).execute()

        if not metric_res.data:
            raise HTTPException(status_code=500, detail="Failed to record metrics into database.")

        metric_id: Any = metric_res.data[0]["id"]
        logger.info("Ingested metrics (ID: %s) for machine %s", metric_id, machine_id)

        return {
            "message": "Metrics ingested successfully",
            "metric_id": metric_id,
            "machine_id": machine_id
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error during metrics ingestion: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to ingest metrics: {str(exc)}"
        )


@app.get("/api/v1/machines", status_code=status.HTTP_200_OK)
def list_machines() -> Dict[str, Any]:
    """Return list of registered machines with id, name, hostname, is_online, and last_seen."""
    db: Client = get_db_client()
    try:
        res = db.table("machines").select("id, name, hostname, is_online, last_seen").order("created_at", desc=True).execute()
        return {"machines": res.data if res.data else []}
    except Exception as exc:
        logger.error("Error listing machines: %s", exc)
        raise HTTPException(status_code=500, detail=f"Database query error: {str(exc)}")


@app.get("/api/v1/machines/{machine_id}/metrics", status_code=status.HTTP_200_OK)
def get_machine_metrics(machine_id: str, limit: int = Query(default=50, ge=1, le=500)) -> Dict[str, Any]:
    """Return latest metrics for specified machine (ordered by created_at desc, default 50)."""
    db: Client = get_db_client()
    try:
        res = db.table("metrics").select("*").eq("machine_id", machine_id).order("created_at", desc=True).limit(limit).execute()
        return {
            "machine_id": machine_id,
            "count": len(res.data) if res.data else 0,
            "metrics": res.data if res.data else []
        }
    except Exception as exc:
        logger.error("Error retrieving metrics for machine %s: %s", machine_id, exc)
        raise HTTPException(status_code=500, detail=f"Database query error: {str(exc)}")


@app.delete("/api/v1/machines/{machine_id}", status_code=status.HTTP_200_OK)
def delete_machine(machine_id: str) -> Dict[str, Any]:
    """
    Delete a registered machine and all associated historical metrics telemetry.
    """
    db: Client = get_db_client()
    try:
        check = db.table("machines").select("id, name").eq("id", machine_id).execute()
        if not check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Machine record ID '{machine_id}' not found."
            )

        machine_name = check.data[0].get("name", "Unknown Node")

        # Delete metrics associated with machine first
        db.table("metrics").delete().eq("machine_id", machine_id).execute()

        # Delete machine record
        db.table("machines").delete().eq("id", machine_id).execute()

        logger.info("Deleted machine ID '%s' (%s) and associated metrics.", machine_id, machine_name)

        return {
            "status": "success",
            "message": f"Machine '{machine_name}' and all associated telemetry metrics were deleted.",
            "machine_id": machine_id
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error deleting machine ID %s: %s", machine_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete machine: {str(exc)}"
        )


@app.post("/api/v1/ai/analyze", response_model=AIAnalyzeResponse, status_code=status.HTTP_200_OK)
def analyze_telemetry_with_ai(payload: AIAnalyzeRequest) -> AIAnalyzeResponse:
    """
    Analyze system telemetry using OpenRouter free LLM models.
    If OPENROUTER_API_KEY is present, ALWAYS calls OpenRouter.
    If OPENROUTER_API_KEY is absent, uses telemetry rule engine fallback.
    """
    load_dotenv(override=True)
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()

    machine_name = payload.machine_name or "Unknown Machine"
    cpu = payload.cpu_percent or 0.0
    ram = payload.ram_percent or 0.0
    ram_used = payload.ram_used_gb or 0.0
    ram_total = payload.ram_total_gb or 0.0
    disk = payload.disk_percent or 0.0
    processes = payload.processes or []

    if payload.machine_id and supabase:
        try:
            m_res = supabase.table("machines").select("name").eq("id", payload.machine_id).execute()
            if m_res.data:
                machine_name = m_res.data[0].get("name", machine_name)

            metrics_res = supabase.table("metrics").select("*").eq("machine_id", payload.machine_id).order("created_at", desc=True).limit(1).execute()
            if metrics_res.data:
                latest = metrics_res.data[0]
                cpu = latest.get("cpu_percent", cpu)
                ram = latest.get("ram_percent", ram)
                ram_used = latest.get("ram_used_gb", ram_used)
                ram_total = latest.get("ram_total_gb", ram_total)
                disk = latest.get("disk_percent", disk)
                processes = latest.get("processes", processes)
        except Exception as exc:
            logger.warning("Could not populate AI request from DB for machine %s: %s", payload.machine_id, exc)

    # -------------------------------------------------------------------------
    # OpenRouter API Integration
    # -------------------------------------------------------------------------
    if api_key:
        logger.info("Calling OpenRouter AI for machine '%s'...", machine_name)

        OPENROUTER_MODELS = [
            "openrouter/auto",
            "meta-llama/llama-3.3-70b-instruct:free",
            "meta-llama/llama-3.1-8b-instruct:free",
            "google/gemini-2.0-flash-exp:free",
            "qwen/qwen-2.5-coder-32b-instruct:free",
        ]

        prompt_content = f"""
Analyze this machine telemetry data:
- Machine Name: {machine_name}
- CPU Usage: {cpu:.1f}%
- RAM Usage: {ram:.1f}% ({ram_used:.1f} GB used out of {ram_total:.1f} GB)
- Disk Usage: {disk:.1f}%
- Active Top Processes: {json.dumps(processes)}

Return ONLY a valid JSON object matching exact keys:
{{
  "summary": "<1-2 sentence overall system health summary>",
  "analysis": "<2-3 sentence technical diagnosis detailing CPU, RAM, or Process bottlenecks>",
  "recommendations": ["<Practical suggestion 1>", "<Practical suggestion 2>", "<Practical suggestion 3>"]
}}
Do NOT include markdown formatting or wrapping code blocks like ```json.
"""

        last_error_detail = ""

        for model in OPENROUTER_MODELS:
            try:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "HTTP-Referer": "https://pulseos.io",
                    "X-Title": "Pulse OS Telemetry",
                    "Content-Type": "application/json",
                }
                body = {
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are an expert DevOps & Systems Performance Diagnostics AI. Analyze system metrics and return strictly clean valid JSON without markdown wrapping."
                        },
                        {
                            "role": "user",
                            "content": prompt_content
                        }
                    ]
                }

                logger.info("Sending request to OpenRouter model: %s", model)
                resp = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=body,
                    timeout=15
                )

                if resp.status_code == 200:
                    resp_json = resp.json()
                    choices = resp_json.get("choices", [])
                    if choices:
                        raw_text = choices[0]["message"]["content"].strip()
                        if raw_text.startswith("```json"):
                            raw_text = raw_text[7:]
                        if raw_text.startswith("```"):
                            raw_text = raw_text[3:]
                        if raw_text.endswith("```"):
                            raw_text = raw_text[:-3]
                        raw_text = raw_text.strip()

                        parsed = json.loads(raw_text)
                        logger.info("Successfully analyzed telemetry with OpenRouter model '%s'", model)
                        return AIAnalyzeResponse(
                            summary=parsed.get("summary", f"{machine_name} telemetry analysis complete."),
                            analysis=parsed.get("analysis", "Telemetries indicate normal operating bounds."),
                            recommendations=parsed.get("recommendations", ["Continue regular metric monitoring."]),
                            model_used=model
                        )
                else:
                    last_error_detail = f"OpenRouter HTTP {resp.status_code}: {resp.text}"
                    logger.warning("OpenRouter model %s returned error: %s", model, last_error_detail)
            except Exception as err:
                last_error_detail = str(err)
                logger.warning("Exception calling OpenRouter model %s: %s", model, err)

        logger.error("OpenRouter API calls failed for machine '%s': %s", machine_name, last_error_detail)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"OpenRouter API Request Failed: {last_error_detail}"
        )

    # -------------------------------------------------------------------------
    # Rule Engine Fallback (Used strictly when OPENROUTER_API_KEY is not set)
    # -------------------------------------------------------------------------
    logger.info("Using rule engine fallback for machine '%s' (No OPENROUTER_API_KEY set)...", machine_name)

    status_summary = f"{machine_name} is operating within normal boundaries (CPU: {cpu:.1f}%, RAM: {ram:.1f}%)."
    analysis_points = []
    recs = []

    if cpu >= 80.0:
        status_summary = f"High CPU pressure detected on {machine_name} ({cpu:.1f}% load)."
        analysis_points.append(f"CPU usage is elevated at {cpu:.1f}%, which may cause processing latency or delayed thread execution.")
        recs.append("Identify and throttle top CPU-consuming processes.")
    elif cpu >= 50.0:
        analysis_points.append(f"Moderate CPU utilization recorded at {cpu:.1f}%.")

    if ram >= 85.0:
        status_summary = f"Critical memory saturation on {machine_name} ({ram:.1f}% RAM used)."
        analysis_points.append(f"Memory load is near capacity at {ram:.1f}% ({ram_used:.1f}/{ram_total:.1f} GB), increasing risk of OOM termination.")
        recs.append("Consider restarting memory-heavy worker processes or expanding system RAM.")
    elif ram >= 70.0:
        analysis_points.append(f"RAM usage is elevated at {ram:.1f}% ({ram_used:.1f}/{ram_total:.1f} GB).")
        recs.append("Monitor memory allocation trends to prevent potential out-of-memory bottlenecks.")

    if disk >= 85.0:
        analysis_points.append(f"Primary storage volume is at {disk:.1f}% capacity.")
        recs.append("Clean up temporary files or archive log directories to free disk space.")

    if not analysis_points:
        analysis_points.append(f"All core system metrics (CPU {cpu:.1f}%, RAM {ram:.1f}%, Disk {disk:.1f}%) demonstrate stable headroom and balanced resource utilization.")

    if not recs:
        recs = [
            "Maintain active telemetry monitoring via Pulse OS host agent.",
            "Verify process list for unexpected background tasks.",
            "Configure proactive alerting rules for CPU and RAM spikes."
        ]

    return AIAnalyzeResponse(
        summary=status_summary,
        analysis=" ".join(analysis_points),
        recommendations=recs,
        model_used="rule-engine-fallback"
    )


if __name__ == "__main__":
    import uvicorn
    port: int = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
