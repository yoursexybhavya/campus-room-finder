# TEST_INFRA.md — Campus Room Finder Automated Test Infrastructure

## 1. Executive Summary & Architecture

The Campus Room Finder automated testing infrastructure provides a robust, multi-tier testing framework designed to validate functional requirements (R1–R4), edge cases, cross-feature interactions, and complete real-world student workflows with 100% deterministic test execution and zero native C++ dependencies.

```
                             +-----------------------------------------------+
                             |    Master Acceptance Suite (E2E Verification) |
                             |        tests/e2e/acceptanceCriteria.test.ts   |
                             +-----------------------+-----------------------+
                                                     |
                 +-----------------------------------+-----------------------------------+
                 |                                                                       |
+----------------+----------------+                                     +----------------+----------------+
|  Tier 4: Student Workflows      |                                     |  Tier 3: Pairwise Interactions |
|  tests/e2e/studentScenarios...  |                                     |  tests/integration/pairwise... |
+----------------+----------------+                                     +----------------+----------------+
                 |                                                                       |
                 +-----------------------------------+-----------------------------------+
                                                     |
                 +-----------------------------------+-----------------------------------+
                 |                                                                       |
+----------------+----------------+                                     +----------------+----------------+
|  Tier 2: Boundary & Corner      |                                     |  Tier 1: Feature Coverage      |
|  tests/unit/boundaryCases...    |                                     |  tests/unit/ & integration/    |
+---------------------------------+                                     +--------------------------------+
                                                     |
                                   +-----------------+-----------------+
                                   |  Test Harness & Pure-JS Mocks     |
                                   |  - vitest.config.ts               |
                                   |  - src/test/setup.ts (WebGL/DOM)  |
                                   |  - src/test/mockSocket.ts (Bus)   |
                                   +-----------------------------------+
```

---

## 2. Test Harness & Mocking Strategy

### 2.1 Test Framework: Vitest + jsdom
- **Vitest (`vitest`)**: High-performance ESM test runner sharing plugins and path aliases with Vite.
- **Environment**: `jsdom` for browser DOM and event loop emulation.
- **Path Aliasing**: Resolves `@/*` to `<rootDir>/src/*`.

### 2.2 Pure-JS WebGL / Canvas Polyfill (`src/test/setup.ts`)
- **Challenge**: Standard `jsdom` returns `null` for `canvas.getContext('webgl')`, throwing fatal errors in Three.js `WebGLRenderer`. Installing native `canvas` with Cairo/node-gyp leads to platform instability.
- **Solution**: In `src/test/setup.ts`, `HTMLCanvasElement.prototype.getContext` is polyfilled in pure JavaScript to mock both `2d` and `webgl`/`webgl2` context APIs:
  - Stubs shader compilation, buffer allocation, viewport queries, and clear passes.
  - Polyfills `ResizeObserver` with no-op listeners.
  - Polyfills `window.matchMedia` for responsive queries.
  - Suppresses unhandled Three.js WebGL context initialization warnings while preserving test assertion fidelity.

### 2.3 In-Memory Real-Time Socket Mock (`src/test/mockSocket.ts`)
- **Challenge**: Network sockets require running a live TCP server, introducing race conditions, port collisions, and execution latency.
- **Solution**: Pure in-memory `MockSocketServer` and `MockSocketClient` based on Node's native `EventEmitter`:
  - Zero network overhead (< 1ms per event roundtrip).
  - Emulates bidirectional client-server broadcast (`peer:checkin`, `peer:location_updated`, `peer:leave`).
  - Allows deterministic assertions on connected client state tables.

---

## 3. Testing Methodology

| Methodology | Application in Campus Room Finder |
|---|---|
| **Category-Partitioning** | Partition input domains into distinct equivalence classes (e.g., timetable slots into morning, afternoon, evening, weekend, lunch break). |
| **Boundary Value Analysis (BVA)** | Test transition boundaries: exactly 09:00:00 (slot start), 09:59:59 (slot end), 13:15 (lunch start), 00:00 (midnight rollover), sequence index 9 of 10. |
| **Pairwise Combination Testing** | Test orthogonal cross-feature interactions (e.g., floor filter during active route highlight, peer check-in during Zero-G floating mode). |
| **Workload & Scenario Testing** | End-to-end student journeys simulating realistic daily multi-step sequences across time travel, spatial navigation, and social presence. |

---

## 4. Complete Feature Mapping Across Tiers 1–4

The 21 features identified in `PROJECT.md § Feature Inventory` are systematically mapped across Tiers 1 through 4:

### Tier 1: Feature Coverage (Unit & Integration Baseline)
*Criterion: $\ge 5$ test cases per feature group.*

| Feature ID | Feature Name | Test File | Test Cases & Focus |
|---|---|---|---|
| **F1, F2** | R3F Canvas Rig & Campus Terrain | `tests/integration/CampusScene.test.tsx` | - Canvas mounts without console error<br>- Central lawn & courtyard elements render<br>- Sandstone pathways initialized<br>- Lighting rigs (ambient + directional) mounted<br>- Scene graph contains terrain roots |
| **F3, F4** | Floor Separation & Floor Filter System | `tests/integration/CampusScene.test.tsx` | - Ground floor layer at $y \approx 0.1$<br>- First floor layer elevated at $y \approx 3.6$<br>- Filter `'all'` renders both floors<br>- Filter `'ground'` isolates ground floor<br>- Filter `'first'` isolates elevated floor |
| **F5, F6** | Selectable Room Nodes & Camera Director | `tests/integration/CampusScene.test.tsx` | - $\ge 12$ room nodes registered with dimensions & coordinates<br>- Hovering room triggers emissive highlight & pointer<br>- Clicking room selects room ID in store<br>- Camera target coordinates update on selection<br>- View reset restores default overview camera |
| **F7, F8** | Timetable Database & Datetime Engine | `tests/unit/timetableEngine.test.ts` | - Schema loads 14 JIET rooms, courses, & faculty<br>- Resolves active slot for Monday 09:15 (`IN_SESSION`)<br>- Resolves active faculty and room details<br>- Calculates exact minutes remaining in active lecture<br>- Identifies next upcoming slot and room |
| **F9, F10** | 3D Route Pathfinding & Visual Highlighting | `tests/unit/timetableEngine.test.ts` | - Dijkstra computes shortest path from gate to `LT-1`<br>- Computes multi-level path via staircase to `LAB-3`<br>- Generates continuous waypoint coordinates<br>- Path length calculation is positive and finite<br>- Unreachable node returns null or empty route |
| **F11, F12** | Room Tap Details & Time Machine UI | `tests/integration/TimetableSync.test.tsx` | - Tapping room displays capacity, specs, & schedule<br>- Schedule list populates daily slots for room<br>- Time machine travel shifts simulated datetime<br>- Preset selection updates active class instantly<br>- Live ticker updates simulated minute |
| **F13, F14** | Real-Time Socket Bus & Peer Check-In | `tests/unit/socketService.test.ts` | - Client connects and receives socket handshake<br>- Client broadcasts manual check-in at `LT-1`<br>- Other connected clients receive `peer:location_updated`<br>- Auto-sync flags broadcast timetable slot location<br>- Client disconnect cleans up presence state |
| **F15, F16** | 3D Peer Avatars Layer & Peer Locator HUD | `tests/integration/PeerLocator.test.tsx` | - Peer store tracks connected friends list<br>- Multi-peer avatars render at room coordinates<br>- Floor filter highlights friends on active floor<br>- Clicking friend in HUD targets room camera<br>- Offline status cleans avatar from scene |
| **F17, F18** | Konami Sequence Listener & Inverted Gravity | `tests/unit/konami.test.ts`, `tests/unit/antiGravityPhysics.test.ts` | - 10-key Konami sequence triggers anti-gravity activation<br>- Upward buoyancy lift acceleration applied ($g > 0$)<br>- Rotational velocity & turbulence induced<br>- Soft ceiling barrier ($Y_{\max}$) limits upward drift<br>- Lateral containment bounds horizontal travel |
| **F19, F20, F21** | Return Springs, Cosmic Background & Zero-G HUD | `tests/unit/antiGravityPhysics.test.ts`, `tests/integration/AntiGravityEasterEgg.test.tsx` | - Harmonic return spring pulls nodes back to base<br>- Damping settles node within tolerance threshold<br>- Cosmic starfield particles activate on Zero-G<br>- Sky color transitions to deep cosmos (`#050518`)<br>- Zero-G telemetry banner displays protocol alert |

---

### Tier 2: Boundary & Corner Cases (Robustness & Edge Conditions)
*Criterion: $\ge 5$ test cases per feature group.*

| Feature Group | Boundary / Corner Case | Test File | Expected Behavior |
|---|---|---|---|
| **R1. 3D Twin** | 1. Rapid floor filter cycling<br>2. Window resize to 0px / negative<br>3. Selection of non-existent room ID<br>4. Rapid camera focus switching<br>5. Raycast click on empty canvas void | `tests/unit/boundaryCases.test.ts` | - State maintains consistency without crashing<br>- Aspect ratio math guards against division by zero<br>- Gracefully resets selection without unhandled error<br>- Camera lerp director smoothly re-anchors<br>- Clears active selection without side effects |
| **R2. Timetable** | 1. Exact start second (09:00:00)<br>2. Exact end second (09:59:59)<br>3. Official lunch break (13:15–14:00)<br>4. Sunday / weekend schedule<br>5. Midnight rollover (00:00) & empty search | `tests/unit/boundaryCases.test.ts` | - Evaluates `IN_SESSION` precisely at boundary<br>- Evaluates `BETWEEN_CLASSES` or next slot<br>- Returns `BETWEEN_CLASSES` / `isBreak: true`<br>- Returns `WEEKEND_OFF` with no active class<br>- Returns `DAY_FINISHED` / empty result gracefully |
| **R3. Peer Locator** | 1. Multi-peer collision in same room (10 peers)<br>2. Check-in to unknown room ID<br>3. Rapid successive check-in broadcasts (spam)<br>4. Immediate connect-disconnect-reconnect<br>5. Auto-sync trigger during break period | `tests/unit/boundaryCases.test.ts` | - Radial dispersion offsets prevent visual z-fighting<br>- Invalid room check-in rejected or defaults to campus<br>- Event throttling / debounce maintains socket queue<br>- Presence table cleans dead sessions cleanly<br>- Omits broadcast when student has no active class |
| **R4. Anti-Gravity** | 1. Partial Konami sequence interrupted by wrong key<br>2. Typing Konami keys while inside text `<input>`<br>3. Keystroke timeout (> 2500ms delay between keys)<br>4. Anti-gravity toggle while physics in mid-air<br>5. Extreme simulation delta time ($\Delta t > 1.0\text{s}$) | `tests/unit/boundaryCases.test.ts` | - Sequence resets cleanly (or resets to 1 if `ArrowUp`)<br>- Ignored: input typing does not trigger Easter egg<br>- Buffer clears, requiring fresh sequence entry<br>- Return springs catch node safely from mid-air<br>- Delta time clamped to 0.05s to prevent explosion |

---

### Tier 3: Pairwise Cross-Feature Combinations

| Pairwise Interaction | Features | Test File | Verification Criteria |
|---|---|---|---|
| **Anti-Gravity + Active Route** | R4 + R2 | `tests/integration/pairwiseCombinations.test.ts` | Path highlight line remains mathematically valid and visible even while target room node floats in Zero-G. |
| **Peer Check-In + Zero-G Mode** | R3 + R4 | `tests/integration/pairwiseCombinations.test.ts` | Live peer avatar arriving during Zero-G inherits buoyancy or renders gracefully at floating room coordinates. |
| **Floor Filter + Active Route** | R1 + R2 | `tests/integration/pairwiseCombinations.test.ts` | If floor filter is toggled to 'first' while active route targets Ground Floor, route line indicators reflect floor visibility transition. |
| **Peer Selection + Camera Focus** | R3 + R1 | `tests/integration/pairwiseCombinations.test.ts` | Selecting friend in Peer Locator HUD triggers camera director to focus on friend's current room location. |
| **Time Travel + Peer Auto-Sync** | R2 + R3 | `tests/integration/pairwiseCombinations.test.ts` | Advancing time machine updates local active class and automatically updates peer's published location if auto-sync is enabled. |
| **Floor Filter + Zero-G Mode** | R1 + R4 | `tests/integration/pairwiseCombinations.test.ts` | Toggling floor filter during anti-gravity respects elevation masking without disrupting harmonic physics trajectories. |

---

### Tier 4: Real-World Student Application Scenarios

| Scenario Name | Student Persona & Workflow | Test File | Expected Progression |
|---|---|---|---|
| **Scenario 1: The Late Arrival** | Student arrives at campus at 09:15 on Monday morning. | `tests/e2e/studentScenarios.test.ts` | 1. App loads with Monday 09:15 simulated time.<br>2. Identifies active Data Structures class in `LT-1`.<br>3. Computes 3D walking route from Campus Gate.<br>4. Follows route, inspects room capacity & faculty.<br>5. Broadcasts arrival check-in to connected peers. |
| **Scenario 2: The Cross-Floor Lab Dash** | Student attends morning lecture in `LT-1` (Ground), finishes at 13:15, travels to 14:00 Lab in `LAB-3` (First Floor). | `tests/e2e/studentScenarios.test.ts` | 1. Time machine advances to 13:30 (Lunch break).<br>2. Verifies `BETWEEN_CLASSES` status.<br>3. Advances to 14:00 (AI Lab in `LAB-3`).<br>4. Shortest path finds stair tower navigation.<br>5. 3D scene highlights First Floor elevation. |
| **Scenario 3: Peer Study Group Discovery** | Student searches for friends on campus during free period. | `tests/e2e/studentScenarios.test.ts` | 1. Opens Peer Locator panel.<br>2. Discovers Bob in `LIB-G01` and Alice in `LAB-1`.<br>3. Clicks Bob's card -> camera glides to Library.<br>4. Manually checks in to `LIB-G01`.<br>5. Verifies Bob's client receives updated peer list. |
| **Scenario 4: Exam Celebration (Zero-G)** | Student finishes last Friday class at 17:05 and triggers Easter egg. | `tests/e2e/studentScenarios.test.ts` | 1. Active class status shows `DAY_FINISHED`.<br>2. Enters Konami code sequence.<br>3. Anti-gravity activates: buoyancy lifts nodes, cosmic starfield appears.<br>4. Verifies HUD telemetry badge.<br>5. Toggles Easter egg off: spring physics safely restore nodes. |
| **Scenario 5: Full Day Time Machine Explorer** | Student steps through entire Monday schedule using presets. | `tests/e2e/studentScenarios.test.ts` | 1. 08:30 (Before classes) -> `BETWEEN_CLASSES`.<br>2. 09:15 (Lecture 1) -> `LT-1`.<br>3. 11:05 (Tea break) -> `BETWEEN_CLASSES`.<br>4. 11:30 (Lecture 2) -> `LT-3`.<br>5. 13:30 (Lunch) -> `BETWEEN_CLASSES`.<br>6. 14:30 (Lab) -> `LAB-1`.<br>7. 17:30 (Evening) -> `DAY_FINISHED`. |

---

### Master Acceptance Suite (`tests/e2e/acceptanceCriteria.test.ts`)
The single definitive compliance suite directly mapping to the 4 acceptance blocks in `ORIGINAL_REQUEST.md`:
1. **3D Map Rendering**: Verifies R3F canvas render without console errors, ground floor ($y \approx 0$), first floor ($y > 0$), and $\ge 3$ clickable room nodes.
2. **Timetable Logic**: Verifies mocked datetime identifies active class/room, and room node tap retrieves class and faculty data.
3. **Peer Locator**: Verifies mocked WebSocket connects, broadcasts check-in, and peer client receives payload.
4. **Anti-Gravity Easter Egg**: Verifies Konami code keystrokes toggle anti-gravity state, and UI responds with cosmic background and floating animation forces.

---

## 5. Execution Commands & Reporting

### Test Execution Commands
- **Full Test Suite**: `npx vitest run`
- **Master Acceptance Suite**: `npx vitest run tests/e2e/acceptanceCriteria.test.ts`
- **Unit Tests (Tier 1 & Tier 2)**: `npx vitest run tests/unit/`
- **Integration Tests (Tier 1 & Tier 3)**: `npx vitest run tests/integration/`
- **Scenario Tests (Tier 4)**: `npx vitest run tests/e2e/studentScenarios.test.ts`
- **With Coverage**: `npx vitest run --coverage`

### Verification Criteria
- Zero test failures (100% pass rate).
- Zero console errors during standard execution.
- Process exits with code `0`.
