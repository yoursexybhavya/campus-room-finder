# Project: Campus Room Finder

## Architecture
Campus Room Finder is a modern, modular web application featuring an interactive 3D digital twin of the JIET Jodhpur campus, smart timetable synchronization, a real-time peer locator, and an anti-gravity physics Easter egg.

### High-Level Components
1. **Presentation & 3D Layer (`src/components/canvas/`, `src/components/ui/`)**:
   - Built on React 18, `@react-three/fiber`, `@react-three/drei`, Three.js, and Tailwind CSS.
   - Procedural campus environment with ground floor, first floor, 14 selectable room nodes, connecting pathways, stair towers, and lighting.
   - 2D glassmorphic HUD overlays: Floor selector, search bar, active class banner, room inspection drawer, peer locator panel, time machine bar, and Zero-G HUD.
2. **State Layer (`src/stores/`)**:
   - Lightweight Zustand stores: `useCampusStore` (room selection, floor filter, camera target, navigation path), `useTimetableStore` (simulated time, active class, room schedule), `usePeerStore` (connected peers, live room check-ins), `useEasterEggStore` (Konami sequence, anti-gravity status, physics intensity).
3. **Domain Services (`src/services/`)**:
   - `database/`: Mock SQLite / in-memory SQL repository managing rooms, courses, faculty, and timetable slots.
   - `time/`: Deterministic datetime calculator computing active slot, remaining minutes, upcoming schedule, and break/weekend conditions.
   - `routing/`: 3D waypoint graph and Dijkstra shortest path solver with staircase vertical level transitions.
   - `socket/`: Real-time socket service (Socket.io client + in-memory mock bus for automated headless testing).
   - `physics/`: Procedural harmonic physics engine (buoyancy, turbulence, soft ceiling, return springs) for anti-gravity mode.
4. **Backend Server (`server/`)**:
   - Lightweight Node.js Express + Socket.io server handling live peer presence and location broadcasts.
5. **Testing & QA (`tests/`)**:
   - Vitest + jsdom test harness with pure-JS WebGL/Canvas polyfill, ResizeObserver mock, and WebSocket mock.
   - 4-Tier requirement-driven test suite verifying all acceptance criteria.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R3F 3D Canvas Rig | Canvas setup with camera, orbit controls, ambient/directional lights, resize observer | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Campus Quad & Terrain | Central lawn, perimeter grounds, paths, procedural landscaping | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Floor Separation | Clear physical & elevation distinction between Ground ($y \approx 0.1$) and First Floor ($y \approx 3.6$) | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Floor Filter System | Interactive floor filter (`all`, `ground`, `first`) with visual focus/fading | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Selectable Room Nodes | $\ge 12$ distinct 3D room nodes (Lecture Theaters, Computer Labs, Library, Admin) with hover/click states | M1 | ORIGINAL_REQUEST §R1 |
| 6 | Camera Director | Smooth camera gliding and focus lerping when rooms or presets are selected | M1 | ORIGINAL_REQUEST §R1 |
| 7 | Timetable Database | Mock SQLite schema with rooms, courses, faculty, and weekly slot data for JIET Jodhpur | M2 | ORIGINAL_REQUEST §R2 |
| 8 | Datetime Active Class Engine | Automatically calculates current active class, faculty, and room based on given/current datetime | M2 | ORIGINAL_REQUEST §R2 |
| 9 | 3D Route Pathfinding | Dijkstra pathfinding from entrance along pathways and staircases to target room | M2 | ORIGINAL_REQUEST §R2 |
| 10 | Route & Room Highlighting | Glowing animated dashed polyline and pulsing light beacon over target room | M2 | ORIGINAL_REQUEST §R2 |
| 11 | Room Tap Details Inspection | Slide-over drawer displaying room capacity, current active class, faculty details, and daily schedule | M2 | ORIGINAL_REQUEST §R2 |
| 12 | Time Machine UI | Live clock ticker + datetime simulation controls and quick schedule presets | M2 | ORIGINAL_REQUEST §R2 |
| 13 | Real-Time Socket Architecture | Socket.io server and client with mock test bus supporting join, leave, and check-in | M3 | ORIGINAL_REQUEST §R3 |
| 14 | Peer Check-In & Auto-Sync | Live peer location broadcast via manual check-in or auto-sync from active timetable slot | M3 | ORIGINAL_REQUEST §R3 |
| 15 | 3D Peer Avatars Layer | 3D avatar capsules at room coordinates with radial dispersion and floating nameplates | M3 | ORIGINAL_REQUEST §R3 |
| 16 | Peer Locator HUD | Friends list panel showing active locations, floor badges, and room filters | M3 | ORIGINAL_REQUEST §R3 |
| 17 | Konami Sequence Listener | Global keyboard listener for `↑ ↑ ↓ ↓ ← → ← → b a` with normalization and input isolation | M4 | ORIGINAL_REQUEST §R4 |
| 18 | Inverted Gravity Physics | Procedural physics engine applying buoyancy force, rotational turbulence, and soft ceiling containment | M4 | ORIGINAL_REQUEST §R4 |
| 19 | Return Spring Physics | Critically damped harmonic return springs restoring nodes to resting positions on toggle-off | M4 | ORIGINAL_REQUEST §R4 |
| 20 | Cosmic Background Transition | Sky-to-deep-space color lerping, particle starfield, cosmic nebulae fog, and emissive node pulse | M4 | ORIGINAL_REQUEST §R4 |
| 21 | Zero-G HUD Telemetry | Floating status alert indicating zero-g protocol engagement and gravity telemetry | M4 | ORIGINAL_REQUEST §R4 |
| 22 | 4-Tier E2E Test Suite | Automated test suite verifying 100% of acceptance criteria across all 4 requirements | M5 | ORIGINAL_REQUEST §Acceptance |
| 23 | Adversarial Coverage Hardening | Tier 5 adversarial testing for edge cases, error conditions, and resilience | M5 | System Directive |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | 3D Campus Digital Twin | Features 1–6: Project scaffolding, R3F canvas, JIET terrain, ground vs 1st floor differentiation, floor filter, selectable room nodes, camera director | none | DONE |
| M2 | Smart Timetable Sync | Features 7–12: SQLite schema, timetable seed data, datetime calculator, 3D waypoint Dijkstra route, glowing route line, room inspection drawer, time machine | M1 | DONE |
| M3 | Real-Time Peer Locator | Features 13–16: Socket.io server & client, mock socket harness, check-in & auto-sync protocol, 3D avatar layer with radial dispersion, peer HUD | M1, M2 | DONE |
| M4 | Anti-Gravity Easter Egg | Features 17–21: Konami code listener, harmonic physics loop (buoyancy, turbulence, ceiling, return spring), cosmic starfield & nebulae transition, Zero-G HUD | M1 | DONE |
| M5 | Final Milestone: E2E Verification & Hardening | Features 22–23: Verify 100% passing E2E tests (Tiers 1–4) against TEST_READY.md, followed by Tier 5 adversarial coverage hardening and forensic audit | M1, M2, M3, M4 | DONE |

---

## Interface Contracts

### 1. Campus Data ↔ 3D Visualizer
```typescript
export interface CampusRoom {
  id: string;               // e.g. 'LT-1', 'LAB-1'
  name: string;             // e.g. 'Aryabhata Lecture Hall'
  code: string;             // e.g. 'LT-01'
  type: 'lecture_theater' | 'lab' | 'faculty' | 'library' | 'admin';
  floor: 'ground' | 'first';
  position: [number, number, number]; // [x, y, z] in Three.js coordinates
  dimensions: [number, number, number]; // [width, height, depth]
  color: string;
  doorWaypointId: string;
}
```

### 2. Timetable Database ↔ Active Class Calculator & UI
```typescript
export interface ActiveScheduleResult {
  status: 'IN_SESSION' | 'BETWEEN_CLASSES' | 'DAY_FINISHED' | 'WEEKEND_OFF';
  activeSlot: TimetableSlot | null;
  activeRoom: CampusRoom | null;
  activeFaculty: Faculty | null;
  nextSlot: TimetableSlot | null;
  minutesRemaining: number;
  minutesUntilNext: number;
}

export interface TimetableSlot {
  id: string;
  batch: string;
  dayOfWeek: string;
  startTime: string; // 'HH:MM'
  endTime: string;   // 'HH:MM'
  startMinutes: number;
  endMinutes: number;
  courseId: string;
  courseName: string;
  courseCode: string;
  roomId: string;
  facultyId: string;
  facultyName: string;
  slotType: 'Lecture' | 'Lab' | 'Tutorial';
}
```

### 3. Peer Locator Socket Contracts
```typescript
export interface PeerUser {
  id: string;
  name: string;
  batch: string;
  avatarColor: string;
  currentRoomId: string | null;
  currentRoomName: string | null;
  floor: 'ground' | 'first' | null;
  coordinates: [number, number, number] | null;
  isAutoSynced: boolean;
  lastActive: number;
}

export interface PeerCheckInEvent {
  roomId: string;
  floor: 'ground' | 'first';
  isAutoSync?: boolean;
}
```

### 4. Anti-Gravity Physics Contracts
```typescript
export interface AntiGravityState {
  isActive: boolean;
  intensity: number; // 0.0 to 1.0
  toggle: () => void;
  activate: () => void;
  deactivate: () => void;
}

export interface PhysicsNode {
  id: string;
  basePosition: [number, number, number];
  baseRotation: [number, number, number];
  currentPosition: [number, number, number];
  currentRotation: [number, number, number];
  velocity: [number, number, number];
  angularVelocity: [number, number, number];
  mass: number;
  phaseOffset: number;
}
```

---

## Code Layout
```
/Users/krishnajangid/teamwork_projects/campus_room_finder/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── server/
│   └── index.ts                 # Real-time Socket.io server
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types/
│   │   ├── campus.ts
│   │   ├── timetable.ts
│   │   ├── peer.ts
│   │   └── antiGravity.ts
│   ├── data/
│   │   ├── campusRooms.ts       # 14 JIET rooms with coordinates
│   │   ├── waypoints.ts         # Dijkstra waypoints and stair edges
│   │   └── timetableSeed.ts     # Master courses, faculty, and weekly schedules
│   ├── stores/
│   │   ├── useCampusStore.ts    # Room selection, floor filter, active route
│   │   ├── useTimetableStore.ts # Datetime state & active class
│   │   ├── usePeerStore.ts      # Real-time peers & local check-in
│   │   └── useEasterEggStore.ts # Konami sequence & anti-gravity state
│   ├── services/
│   │   ├── database/
│   │   │   └── timetableDb.ts   # SQLite / in-memory SQL repository
│   │   ├── time/
│   │   │   └── datetimeEngine.ts # Active slot resolution
│   │   ├── routing/
│   │   │   └── pathfinding.ts   # Dijkstra 3D shortest path solver
│   │   ├── socket/
│   │   │   ├── socketClient.ts  # Socket.io client
│   │   │   └── mockSocket.ts    # In-memory test bus
│   │   ├── physics/
│   │   │   └── antiGravityEngine.ts # Buoyancy, turbulence & return springs
│   │   └── keyboard/
│   │       └── konamiListener.ts # Global Konami code listener
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── CampusScene.tsx        # Master R3F canvas wrapper
│   │   │   ├── CameraController.tsx   # OrbitControls & lerp director
│   │   │   ├── CampusTerrain.tsx      # Ground lawn, fountain, pathways
│   │   │   ├── GroundFloor.tsx        # Ground slabs & ground room nodes
│   │   │   ├── FirstFloor.tsx         # Elevated slabs, skywalks & 1st floor nodes
│   │   │   ├── RoomNode.tsx           # Interactive 3D room node mesh
│   │   │   ├── RoutePathMesh.tsx      # Glowing dashed path line
│   │   │   ├── ActiveRoomBeacon.tsx   # Vertical pulsing light beam
│   │   │   ├── PeerAvatarsLayer.tsx   # 3D avatar capsules with radial dispersion
│   │   │   └── CosmicBackground.tsx   # Starfield particles & nebula fog
│   │   └── ui/
│   │       ├── Header.tsx             # Campus branding & clock
│   │       ├── FloorSelector.tsx      # All / Ground / First toggle
│   │       ├── SearchBar.tsx          # Quick room & professor search
│   │       ├── TimeMachineBar.tsx     # Datetime travel & presets
│   │       ├── ActiveClassBanner.tsx  # Current class banner & "Take Me" CTA
│   │       ├── RoomDetailsDrawer.tsx  # Tap-to-inspect room specs & schedule
│   │       ├── PeerLocatorPanel.tsx   # Connected friends list & check-in
│   │       └── AntiGravityBanner.tsx  # Cosmic Zero-G alert & mobile trigger
│   └── test/
│       └── setup.ts                   # Pure-JS WebGL & Canvas mock, ResizeObserver
└── tests/
    ├── unit/
    │   ├── konami.test.ts
    │   ├── antiGravityPhysics.test.ts
    │   ├── timetableEngine.test.ts
    │   └── socketService.test.ts
    ├── integration/
    │   ├── CampusScene.test.tsx
    │   ├── TimetableSync.test.tsx
    │   ├── PeerLocator.test.tsx
    │   └── AntiGravityEasterEgg.test.tsx
    └── e2e/
        └── acceptanceCriteria.test.ts # Unified acceptance runner
```
