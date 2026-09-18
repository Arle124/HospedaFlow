# Graph Report - HospedaSync  (2026-09-14)

## Corpus Check
- Corpus is ~2,075 words - fits in a single context window. You may not need a graph.

## Summary
- 56 nodes · 71 edges · 12 communities (7 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Shift Service & Business Logic
- HTTP Routing & Handlers
- API Server Bootstrap & Config
- Repository & Database Access
- Database Migrations (UP)
- Database Schema Definitions
- HTTP Shift DTOs & Handlers
- Inventory Domain Models
- Module Root Definition

## God Nodes (most connected - your core abstractions)
1. `ShiftService` - 8 edges
2. `ShiftHandler` - 7 edges
3. `Shift` - 6 edges
4. `NewRouter()` - 4 edges
5. `ShiftRepository` - 4 edges
6. `main()` - 3 edges
7. `Config` - 3 edges
8. `Load()` - 3 edges
9. `NewShiftHandler()` - 3 edges
10. `Repository` - 3 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `Load()`  [EXTRACTED]
  cmd/api/main.go → internal/config/config.go
- `main()` --calls--> `NewRouter()`  [EXTRACTED]
  cmd/api/main.go → internal/handler/router.go
- `NewRouter()` --references--> `ShiftHandler`  [EXTRACTED]
  internal/handler/router.go → internal/handler/shift_handler.go
- `ShiftHandler` --references--> `ShiftService`  [EXTRACTED]
  internal/handler/shift_handler.go → internal/service/shift_service.go
- `NewShiftHandler()` --references--> `ShiftService`  [EXTRACTED]
  internal/handler/shift_handler.go → internal/service/shift_service.go

## Import Cycles
- None detected.

## Communities (12 total, 2 thin omitted)

### Community 0 - "Shift Service & Business Logic"
Cohesion: 0.33
Nodes (5): ShiftStatus, context.Context, Shift, ShiftService, NewShiftService()

### Community 1 - "HTTP Routing & Handlers"
Cohesion: 0.31
Nodes (6): net/http.Request, net/http.ResponseWriter, ShiftHandler, Error(), JSON(), StandardResponse

### Community 2 - "API Server Bootstrap & Config"
Cohesion: 0.25
Nodes (6): main(), Config, net/http.Handler, time.Duration, Load(), NewRouter()

### Community 3 - "Repository & Database Access"
Cohesion: 0.47
Nodes (5): github.com/jackc/pgx/v5/pgxpool.Pool, ShiftRepository, NewDBPool(), InventoryRepository, Repository

### Community 4 - "Database Migrations (UP)"
Cohesion: 0.60
Nodes (4): products, shift_transactions, shifts, users

### Community 5 - "Database Schema Definitions"
Cohesion: 0.60
Nodes (4): products, shift_transactions, shifts, users

### Community 6 - "HTTP Shift DTOs & Handlers"
Cohesion: 0.50
Nodes (3): closeShiftRequest, openShiftRequest, NewShiftHandler()

## Knowledge Gaps
- **6 isolated node(s):** `github.com/Arle124/HospedaSync`, `openShiftRequest`, `closeShiftRequest`, `StandardResponse`, `products` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 15 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ShiftHandler` connect `HTTP Routing & Handlers` to `Shift Service & Business Logic`, `API Server Bootstrap & Config`, `HTTP Shift DTOs & Handlers`?**
  _High betweenness centrality (0.353) - this node is a cross-community bridge._
- **Why does `ShiftService` connect `Shift Service & Business Logic` to `HTTP Routing & Handlers`, `Repository & Database Access`, `HTTP Shift DTOs & Handlers`?**
  _High betweenness centrality (0.315) - this node is a cross-community bridge._
- **Why does `NewRouter()` connect `API Server Bootstrap & Config` to `HTTP Routing & Handlers`?**
  _High betweenness centrality (0.187) - this node is a cross-community bridge._
- **What connects `github.com/Arle124/HospedaSync`, `openShiftRequest`, `closeShiftRequest` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._