# Graph Report - HospedaSync  (2026-10-02)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 476 nodes · 990 edges · 33 communities (17 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ecc52bfe`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- context.Context
- ReceptionistView.tsx
- db.ts
- package.json
- main
- App.tsx
- AuthService
- compilerOptions
- Repository
- compilerOptions
- CsvImportModal.tsx
- NewShiftService
- .oxlintrc.json
- 000001_init_schema.up.sql
- user_sessions
- 005_reservations.sql
- 001_initial_schema.sql
- tsconfig.json
- start-pocket.sh
- manage.sh
- 002_rooms.sql
- github.com/Arle124/HospedaSync/internal/domain.Product
- github.com/Arle124/HospedaSync/internal/domain.Shift
- github.com/Arle124/HospedaSync
- Repository
- sqlc DDL & Query Configuration

## God Nodes (most connected - your core abstractions)
1. `react` - 27 edges
2. `Room` - 24 edges
3. `framer-motion` - 23 edges
4. `lucide-react` - 23 edges
5. `mockReservationRepository` - 21 edges
6. `springTouch` - 21 edges
7. `postgresRepository` - 20 edges
8. `Shift` - 19 edges
9. `compilerOptions` - 18 edges
10. `SyncService` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Offline-First Architecture` --conceptually_related_to--> `HospedaSyncDatabase`  [INFERRED]
  README.md → frontend/src/db/db.ts
- `Offline-First Architecture` --conceptually_related_to--> `SyncService`  [INFERRED]
  README.md → frontend/src/services/syncService.ts
- `Housekeeping Mobile Role` --conceptually_related_to--> `HousekeeperView()`  [INFERRED]
  README.md → frontend/src/views/HousekeeperView.tsx
- `Admin / Owner Role` --conceptually_related_to--> `AdminView()`  [INFERRED]
  README.md → frontend/src/views/AdminView.tsx
- `Receptionist PC Role` --conceptually_related_to--> `ReceptionistView()`  [INFERRED]
  README.md → frontend/src/views/ReceptionistView.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Role-based PWA Offline Views** — frontend_src_views_receptionistview_receptionistview, frontend_src_views_housekeeperview_housekeeperview, frontend_src_views_adminview_adminview [INFERRED 0.95]

## Communities (33 total, 9 thin omitted)

### Community 0 - "context.Context"
Cohesion: 0.06
Nodes (22): ReservationSource, ShiftStatus, context.Context, time.Time, Product, Reservation, ReservationStatus, UpdateReservationInput (+14 more)

### Community 1 - "ReceptionistView.tsx"
Cohesion: 0.09
Nodes (48): ConfirmIncidentModal(), ConfirmIncidentModalProps, GerenciaPinModalProps, LocalProduct, LocalShift, PaymentMethod, Room, EventBus (+40 more)

### Community 2 - "db.ts"
Cohesion: 0.07
Nodes (34): AddTransactionPayload, CashMovement, CashMovementType, CloseShiftPayload, CreateReservationPayload, db, HospedaSyncDatabase, OpenShiftPayload (+26 more)

### Community 3 - "package.json"
Cohesion: 0.05
Nodes (39): dependencies, dexie, framer-motion, lucide-react, react, react-dom, devDependencies, oxlint (+31 more)

### Community 4 - "main"
Cohesion: 0.09
Nodes (22): main(), net/http.Request, net/http.ResponseWriter, addTransactionRequest, AuthHandler, closeShiftRequest, LoginRequest, openShiftRequest (+14 more)

### Community 5 - "App.tsx"
Cohesion: 0.10
Nodes (26): PWA HTML Application Shell, App(), AppContent(), GerenciaPinModal(), Header(), HeaderProps, ROLES, UserRole (+18 more)

### Community 6 - "AuthService"
Cohesion: 0.10
Nodes (16): net/http.Handler, time.Duration, Claims, CheckPassword(), GenerateToken(), HashToken(), ValidateToken(), AuthRequired() (+8 more)

### Community 7 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 8 - "Repository"
Cohesion: 0.17
Nodes (13): Room, RoomStatus, github.com/jackc/pgx/v5/pgxpool.Pool, NewPostgresRepository(), Repository, RoomRepository, ShiftRepository, NewDBPool() (+5 more)

### Community 9 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 10 - "CsvImportModal.tsx"
Cohesion: 0.22
Nodes (14): autoMapColumn(), CsvFieldId, CsvParseResult, detectDelimiter(), FIELD_PATTERNS, parseCsv(), parseFlexibleDate(), parseLine() (+6 more)

### Community 11 - "NewShiftService"
Cohesion: 0.53
Nodes (10): testing.T, NewShiftService(), newMockShiftRepository(), TestAddTransaction_IncomeAndExpense(), TestCloseShift_AlreadyClosed(), TestCloseShift_Calculations(), TestCloseShift_NotFound(), TestOpenShift_AlreadyOpen() (+2 more)

### Community 12 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 13 - "000001_init_schema.up.sql"
Cohesion: 0.60
Nodes (4): products, shift_transactions, shifts, users

### Community 14 - "user_sessions"
Cohesion: 0.60
Nodes (4): idx_sessions_token, idx_sessions_user, user_sessions, users

### Community 15 - "005_reservations.sql"
Cohesion: 0.70
Nodes (4): idx_reservations_dates, idx_reservations_room_id, idx_reservations_status, reservations

### Community 16 - "001_initial_schema.sql"
Cohesion: 0.60
Nodes (4): products, shift_transactions, shifts, users

## Knowledge Gaps
- **121 isolated node(s):** `GerenciaPinModalProps`, `NotificationListener`, `ExpenseModalProps`, `RoomFilterBarProps`, `OpenShiftModalProps` (+116 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 153 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `ReceptionistView.tsx` to `CsvImportModal.tsx`, `db.ts`, `package.json`, `App.tsx`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `framer-motion` connect `ReceptionistView.tsx` to `db.ts`, `CsvImportModal.tsx`, `package.json`, `App.tsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `main()` connect `main` to `Repository`, `context.Context`, `NewShiftService`, `AuthService`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `GerenciaPinModalProps`, `NotificationListener`, `ExpenseModalProps` to the rest of the system?**
  _121 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `context.Context` be split into smaller, more focused modules?**
  _Cohesion score 0.05981012658227848 - nodes in this community are weakly interconnected._
- **Should `ReceptionistView.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08651911468812877 - nodes in this community are weakly interconnected._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06845513413506013 - nodes in this community are weakly interconnected._