# 🏫 JIET Jodhpur 3D Campus Room Finder & Indoor Navigation

[![Live Demo](https://img.shields.io/badge/Live%20Demo-campusroomfinder.vercel.app-06b6d4?style=for-the-badge&logo=vercel&logoColor=white)](https://campusroomfinder.vercel.app)
[![Tests](https://img.shields.io/badge/Tests-359%2F359%20Passing-10b981?style=for-the-badge&logo=vitest&logoColor=white)](#testing)
[![React](https://img.shields.io/badge/React-18.3.1-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r169-black?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

> **A production-grade, interactive 3D digital twin and intelligent indoor wayfinding system for the JIET Jodhpur engineering campus.**  
> Effortlessly navigate from **any room, lab, or gate to any destination** across all floors, explore classrooms with MazeMap-style 3D hovering POI labels, sync class schedules in real-time, and locate classmates on campus.

🌐 **Production URL:** [https://campusroomfinder.vercel.app](https://campusroomfinder.vercel.app)  
📦 **Repository:** [https://github.com/yoursexybhavya/campus-room-finder](https://github.com/yoursexybhavya/campus-room-finder)

---

## 📸 Overview

JIET Jodhpur's engineering campus is a distinctive multi-story quadrangle surrounding an expansive central open lawn, covered verandas, corner helical rotundas, and sandstone colonnades. Finding lecture halls, engineering laboratories, and faculty offices across two levels can be challenging for new students, faculty, and campus visitors.

**Campus Room Finder** digitizes the entire academic quadrangle into a high-fidelity WebGL 3D twin with topological indoor navigation, smart schedule sync, and collaborative peer awareness.

---

## ✨ Key Features

### 1. 🧭 True "Anywhere-to-Anywhere" Indoor Navigation
- **Universal Routing**: Navigate seamlessly between **all 61 rooms** (Lecture Theaters LT-1 through LT-36, Idea Lab, PC Programming Lab, Chemistry Lab, Electrical Machines, Hardware Design, Seminar Halls, Library, Admin Block) and campus entrance gates.
- **Topological Collision-Free Pathfinding**: Waypoint graph strictly follows covered veranda centerlines ($|X| = 19.525\text{m}$, $|Z| = 19.525\text{m}$) and open corner walkways. **Zero cutting through walls or mid-air flight**.
- **Realistic Helical Staircase Traversal**: Inter-floor transitions route through authentic corner spiral staircases and central library bridges, interpolating step-by-step elevations rather than slicing diagonally through floor slabs.
- **Visual 3D Ribbon**: Floor-grounded glowing pathway with animated directional chevrons, step-by-step walking directions, distance metrics (meters), and walking time estimates (minutes).
- **1-Tap Route Controls**: Instant start/destination reversal ($\rightleftarrows$ Swap) and quick preset hubs (*Main Gate*, *Courtyard*, *Admin Block*, *Library*).

### 2. 🔍 Searchable Location Combobox & Room Finder
- **Instant Type-to-Search**: Real-time fuzzy query filtering matching room codes (`LT-9`, `LT9`), room titles (`Idea Lab`, `Chemistry`), wings (`East`, `West`), and faculty in charge.
- **Categorized Dropdown**: Clean, scrollable popover grouped into:
  - 🏛 **Landmarks & Campus Hubs** (Sky Blue)
  - 🟢 **Ground Floor (GF)** (Emerald Green — 33 rooms)
  - 🟣 **First Floor (1F)** (Purple — 28 rooms)
- **Anti-Clutter UX**: Completely replaces bulky native browser select dropdowns with a responsive, constrained viewport combobox that never overflows the screen.

### 3. 🏢 MazeMap-Inspired Floor Selection & View Modes
- **Vertical Z-Level Switcher**:
  - `1F` (First Floor): Isolates first-floor rooms and corridors.
  - `GF` (Ground Floor): Isolates ground-floor classrooms, labs, and courtyards.
  - `ALL` (All Floors): Full building stack isometric overview.
- **2D Blueprint / 3D Isometric Toggle**:
  - **3D Mode**: Immersive isometric camera navigation with smooth orbital panning, pitch, and zoom.
  - **2D Plan Mode**: Top-down architectural orthographic blueprint view for fast architectural navigation.

### 4. 🏷️ Dynamic 3D Room Hover Labels & POI Amenities
- **Floating Spatial Badges**: 3D labels with room codes, names, and category icons (Restrooms/WC, Helical Stairs, Labs, Lecture Theaters, Knowledge Library).
- **Slab Occlusion & Distance LOD**: Ground-floor labels dynamically occlude when First Floor slabs are active, eliminating visual bleed-through and z-fighting.

### 5. 📅 Smart Timetable Synchronization
- **Live Class Detection**: Local SQLite/WASM database parses student course schedules and highlights the currently active lecture or lab.
- **"Take Me To Class" Button**: Automatically routes from the student's current location to their scheduled lecture theater with a single click.

### 6. 👥 Real-Time Peer Locator
- **Classmate Radar**: WebSocket-powered live peer locator displaying connected friends' active campus locations and check-in statuses on the 3D map.

### 7. 🚀 Anti-Gravity Physics Easter Egg
- **Konami Code Listener**: Entering `↑ ↑ ↓ ↓ ← → ← → B A` activates zero-gravity mode: campus room nodes float and rotate with particle physics over an animated cosmic background.

---

## 🛠️ Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend Framework** | [React 18.3](https://react.dev/), [TypeScript 5.6](https://www.typescriptlang.org/) |
| **3D & WebGL Graphics** | [Three.js r169](https://threejs.org/), [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber), [@react-three/drei](https://github.com/pmndrs/drei) |
| **Styling & Icons** | [Tailwind CSS 3.4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) |
| **State Management** | [Zustand 5.0](https://github.com/pmndrs/zustand) |
| **Pathfinding & Routing** | Custom A* / Dijkstra Topological Waypoint Graph |
| **Embedded Database** | [SQL.js](https://sql.js.org/) (SQLite WebAssembly engine) |
| **Real-time Networking** | [Socket.io](https://socket.io/) client and Express WebSocket server |
| **Testing Suite** | [Vitest 2.1](https://vitest.dev/), [@testing-library/react](https://testing-library.com/), jsdom (359 automated tests) |
| **Build & Deployment** | [Vite 5.4](https://vitejs.dev/), [Vercel](https://vercel.com/) |

---

## 📂 Project Architecture

```
campus-room-finder/
├── public/
│   └── models/
│       └── jiet_campus_prototype.glb   # Authentic 3D Blender architectural model
├── src/
│   ├── components/
│   │   ├── canvas/                     # Three.js / React Three Fiber 3D Scene
│   │   │   ├── CampusScene.tsx         # Root WebGL Canvas & Lighting
│   │   │   ├── BlenderCampusModel.tsx  # 3D GLTF Campus Mesh loader & materials
│   │   │   ├── RoutePathMesh.tsx       # Animated 3D floor navigation ribbon
│   │   │   ├── RoomHoverLabelsLayer.tsx# Dynamic 3D hovering room tags & POIs
│   │   │   ├── ArchitecturalStairs.tsx # Helical staircases & bridge connections
│   │   │   └── CameraController.tsx    # Smooth 2D/3D camera transitions
│   │   └── ui/                         # Clean Tailwind UI Overlays
│   │       ├── CampusWayfindingBar.tsx # Anywhere-to-Anywhere navigation HUD
│   │       ├── SearchableLocationCombobox.tsx # Searchable input with floor grouping
│   │       ├── FloorSelector.tsx       # Vertical 1F / GF / ALL level switcher
│   │       ├── SearchBar.tsx           # Global campus room & faculty search
│   │       ├── RoomDetailsDrawer.tsx   # Detailed room sheet & faculty info
│   │       ├── ActiveClassBanner.tsx   # Current timetable slot alert banner
│   │       └── PeerLocatorPanel.tsx    # Live classmate radar panel
│   ├── data/
│   │   ├── campusRooms.ts              # 61 campus rooms, coordinates & metadata
│   │   ├── waypoints.ts                # Corridor & staircase waypoint graph
│   │   └── timetableSeed.ts            # Mock semester class schedules
│   ├── services/
│   │   ├── routing/pathfinding.ts      # A* / Dijkstra indoor navigation engine
│   │   ├── database/timetableDb.ts     # SQL.js SQLite engine
│   │   └── socket/socketClient.ts      # Real-time peer locator networking
│   ├── stores/                         # Zustand state stores
│   │   ├── useCampusStore.ts           # Selected room, floor filter, active route
│   │   ├── useThemeStore.ts            # Light / Dark mode state
│   │   └── usePeerStore.ts             # Live connected peers state
│   ├── types/                          # TypeScript definitions
│   ├── App.tsx                         # Root Application Layout
│   └── main.tsx                        # React Entrypoint
├── tests/                              # Comprehensive test suite (359 tests)
│   ├── adversarial/                    # Stress & fuzz tests
│   ├── integration/                    # Scene, wayfinding & theme integration tests
│   └── unit/                           # Route algorithms, occlusion & UI tests
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yoursexybhavya/campus-room-finder.git
   cd campus-room-finder
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) (or the displayed port) in your browser.

4. **(Optional) Start the Peer Locator WebSocket server:**
   ```bash
   npm run server
   ```

---

## 🧪 Testing

The codebase includes an extensive automated testing suite covering unit algorithms, integration flows, and adversarial stress tests:

```bash
# Run all automated tests once
npm test

# Run tests in watch mode
npm run test:watch
```

**Test Coverage Highlights:**
- **36 Test Files, 359 / 359 Tests Passing (100% Green)**
- Topological pathfinding non-collision audits across all 3,721 room combinations ($61 \times 61$)
- Helical staircase multi-step floor transitions
- Searchable combobox fuzzy queries and category filtering
- Floor occlusion and distance-based label visibility
- Anti-gravity Konami code keyboard listener
- Dark / Light mode theme synchronization

---

## 📦 Production Build & Deployment

To create an optimized production build:

```bash
npm run build
```

This runs TypeScript type checking (`tsc`) followed by Vite's minified production bundling.

To deploy on [Vercel](https://vercel.com):
```bash
npx vercel --prod --yes
```

---

## 📜 Continuous Documentation Policy

> 📌 **Project Rule**: Whenever features, UI components, 3D assets, route waypoints, or APIs are added, updated, or refactored in this repository, **this `README.md` must be updated immediately** to reflect the latest changes.

---

## 📄 License

This project is licensed under the MIT License. Developed for the JIET Jodhpur academic community.
