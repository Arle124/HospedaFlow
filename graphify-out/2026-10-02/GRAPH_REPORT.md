# Graph Report - HospedaSync  (2026-09-22)

## Corpus Check
- 27 files · ~11,396 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 203 nodes · 267 edges · 21 communities (14 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Frontend Role Views & Header UI
- Frontend Runtime Dependencies
- TypeScript App Compiler Config
- Backend Main & Postgres Repository
- TypeScript Node Compiler Config
- HTTP API Handlers & Routing
- Backend Domain Entities & Services
- Offline-First Storage & Sync Service
- PWA Web Manifest & Metadata
- Frontend Dev & Build Tooling
- Oxlint Linter Configuration
- Database Migrations (UP DDL)
- Database Canonical Schema
- Backend Server Configuration
- PWA Service Worker & App Shell
- TypeScript Project References
- Go Module Root
- sqlc Compiler Specification

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `compilerOptions` - 15 edges
3. `SyncService` - 13 edges
4. `ShiftService` - 8 edges
5. `postgresRepository` - 8 edges
6. `ShiftHandler` - 7 edges
7. `react` - 7 edges
8. `Shift` - 6 edges
9. `scripts` - 5 edges
10. `lucide-react` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Offline-First Architecture` --conceptually_related_to--> `HospedaSyncDatabase`  [INFERRED]
  README.md → frontend/src/db/db.ts
- `Offline-First Architecture` --conceptually_related_to--> `SyncService`  [INFERRED]
  README.md → frontend/src/services/syncService.ts
- `Admin / Owner Role` --conceptually_related_to--> `AdminView()`  [INFERRED]
  README.md → frontend/src/views/AdminView.tsx
- `Housekeeping Mobile Role` --conceptually_related_to--> `HousekeeperView()`  [INFERRED]
  README.md → frontend/src/views/HousekeeperView.tsx
- `Receptionist PC Role` --conceptually_related_to--> `ReceptionistView()`  [INFERRED]
  README.md → frontend/src/views/ReceptionistView.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Role-based PWA Offline Views** — frontend_src_views_receptionistview_receptionistview, frontend_src_views_housekeeperview_housekeeperview, frontend_src_views_adminview_adminview [INFERRED 0.95]

## Communities (21 total, 4 thin omitted)

### Community 0 - "Frontend Role Views & Header UI"
Cohesion: 0.16
Nodes (20): App(), Header(), HeaderProps, UserRole, db, LocalProduct, LocalShift, Room (+12 more)

### Community 1 - "Frontend Runtime Dependencies"
Cohesion: 0.08
Nodes (23): dependencies, dexie, lucide-react, react, react-dom, name, private, scripts (+15 more)

### Community 2 - "TypeScript App Compiler Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 3 - "Backend Main & Postgres Repository"
Cohesion: 0.19
Nodes (9): main(), context.Context, github.com/Arle124/HospedaSync/internal/domain.Product, github.com/Arle124/HospedaSync/internal/domain.Shift, github.com/jackc/pgx/v5/pgxpool.Pool, NewPostgresRepository(), NewDBPool(), Repository (+1 more)

### Community 4 - "TypeScript Node Compiler Config"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 5 - "HTTP API Handlers & Routing"
Cohesion: 0.16
Nodes (11): net/http.Handler, net/http.Request, net/http.ResponseWriter, closeShiftRequest, openShiftRequest, ShiftHandler, NewRouter(), NewShiftHandler() (+3 more)

### Community 6 - "Backend Domain Entities & Services"
Cohesion: 0.18
Nodes (9): Product, ShiftStatus, time.Time, Shift, ShiftRepository, ShiftService, NewShiftService(), InventoryRepository (+1 more)

### Community 7 - "Offline-First Storage & Sync Service"
Cohesion: 0.20
Nodes (5): HospedaSyncDatabase, SyncQueueItem, SyncService, Offline-First Architecture, HospedaSync PMS Overview

### Community 8 - "PWA Web Manifest & Metadata"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 9 - "Frontend Dev & Build Tooling"
Cohesion: 0.25
Nodes (8): devDependencies, oxlint, @types/node, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react

### Community 10 - "Oxlint Linter Configuration"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 11 - "Database Migrations (UP DDL)"
Cohesion: 0.60
Nodes (4): products, shift_transactions, shifts, users

### Community 12 - "Database Canonical Schema"
Cohesion: 0.60
Nodes (4): products, shift_transactions, shifts, users

### Community 13 - "Backend Server Configuration"
Cohesion: 0.67
Nodes (3): Config, time.Duration, Load()

## Knowledge Gaps
- **88 isolated node(s):** `StandardResponse`, `products`, `products`, `closeShiftRequest`, `openShiftRequest` (+83 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 102 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Frontend Role Views & Header UI` to `Frontend Runtime Dependencies`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `SyncService` connect `Offline-First Storage & Sync Service` to `Frontend Role Views & Header UI`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `ShiftService` connect `Backend Domain Entities & Services` to `HTTP API Handlers & Routing`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `StandardResponse`, `products`, `products` to the rest of the system?**
  _88 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend Runtime Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `TypeScript App Compiler Config` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `TypeScript Node Compiler Config` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._