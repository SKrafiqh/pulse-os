# Graph Report - .  (2026-08-10)

## Corpus Check
- Corpus is ~2,050 words - fits in a single context window. You may not need a graph.

## Summary
- 38 nodes · 54 edges · 7 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Agent Harvester Module
- Agent Transport & Sender
- FastAPI Metric Ingestion Endpoints
- Backend Database Integration
- Agent Daemon Loop
- Health & Status API
- Community 6

## God Nodes (most connected - your core abstractions)
1. `get_db_client()` - 7 edges
2. `collect_metrics()` - 6 edges
3. `send_metrics()` - 5 edges
4. `register_machine()` - 5 edges
5. `ingest_metrics()` - 5 edges
6. `get_machine_info()` - 4 edges
7. `main()` - 4 edges
8. `list_machines()` - 4 edges
9. `get_machine_metrics()` - 4 edges
10. `get_main_drive_path()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `collect_metrics()`  [EXTRACTED]
  agent/main.py → agent/collector.py
- `main()` --calls--> `send_metrics()`  [EXTRACTED]
  agent/main.py → agent/sender.py
- `main()` --calls--> `get_machine_info()`  [EXTRACTED]
  agent/main.py → agent/collector.py

## Import Cycles
- None detected.

## Communities (7 total, 0 thin omitted)

### Community 0 - "Agent Harvester Module"
Cohesion: 0.22
Nodes (10): get_db_client(), get_machine_metrics(), health_check(), list_machines(), Return list of registered machines with id, name, hostname, is_online, and…, Return latest metrics for specified machine (ordered by created_at desc,…, Dependency helper ensuring active Supabase database client connection., Simple health check endpoint for uptime monitors. (+2 more)

### Community 1 - "Agent Transport & Sender"
Cohesion: 0.33
Nodes (6): collect_metrics(), get_main_drive_path(), Any, Pulse OS Agent - System Metrics Collector Harvester module for CPU, RAM, Disk,…, Return the root path of the primary operating system drive., Collect current system resource usage and top active processes. Args:…

### Community 2 - "FastAPI Metric Ingestion Endpoints"
Cohesion: 0.50
Nodes (4): get_machine_info(), Return basic platform identity details., main(), Pulse OS Agent - Main Monitoring Daemon Entry point daemon process for…

### Community 3 - "Backend Database Integration"
Cohesion: 0.40
Nodes (4): Any, Pulse OS Agent - Telemetry Transport Sender Transmits system telemetry payloads…, Send metrics telemetry payload to the backend server with automatic retries.…, send_metrics()

### Community 4 - "Agent Daemon Loop"
Cohesion: 0.50
Nodes (4): MetricIngestRequest, MetricItemProcess, Pulse OS Backend Server FastAPI web service bridging agent telemetry with…, BaseModel

### Community 5 - "Health & Status API"
Cohesion: 0.67
Nodes (3): ingest_metrics(), Receive system telemetry from host monitoring agent. Updates machine heartbeat…, post

### Community 6 - "Community 6"
Cohesion: 0.67
Nodes (3): MachineRegisterRequest, Register a new machine node or update an existing machine by machine_key.…, register_machine()

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get_db_client()` connect `Agent Harvester Module` to `Agent Daemon Loop`, `Health & Status API`, `Community 6`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `collect_metrics()` connect `Agent Transport & Sender` to `FastAPI Metric Ingestion Endpoints`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `send_metrics()` connect `Backend Database Integration` to `FastAPI Metric Ingestion Endpoints`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._