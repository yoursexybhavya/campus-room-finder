<div align="center">

# 🏛️ UNIPATH — JIET Jodhpur 3D Digital Twin

### *Interactive 3D Campus Map • Turn-by-Turn Indoor Wayfinding • Smart Timetable • Live Peer Radar*

[![Live Demo](https://img.shields.io/badge/🚀_LAUNCH_LIVE_3D_CAMPUS-campusroomfinder.vercel.app-06b6d4?style=for-the-badge&logo=vercel&logoColor=white)](https://campusroomfinder.vercel.app)
[![Tests](https://img.shields.io/badge/TESTS-359%2F359_PASSING-10b981?style=for-the-badge&logo=vitest&logoColor=white)](#%EF%B8%8F-quick-start--commands)
[![3D Model](https://img.shields.io/badge/BLENDER_5.2-61_ROOMS_%2B_4_HUBS-f59e0b?style=for-the-badge&logo=blender&logoColor=white)](#-3d-architectural-gallery)

<p align="center">
  <img src="https://skillicons.dev/icons?i=react,ts,threejs,blender,vite,tailwind,nodejs,vercel&perline=8" alt="Tech Stack Icons" />
</p>

<img src="./blender/renders/isometric_campus_view.png" alt="JIET Jodhpur 3D Digital Twin Isometric Render" width="100%" style="border-radius: 16px;" />

</div>

---

## 📊 Campus Twin at a Glance

<div align="center">

| 🏫 **61 + 4** | 🧭 **3,721** | 🪜 **6** | ⚡ **359 / 359** |
| :---: | :---: | :---: | :---: |
| **Rooms, Labs & Gates**<br/><sub>33 Ground • 28 First • 4 Hubs</sub> | **Verified Route Pairs**<br/><sub>$61 \times 61$ Collision-Free Paths</sub> | **3D Staircase Transitions**<br/><sub>4 Corner Helical + 2 Library</sub> | **Automated Tests**<br/><sub>Unit • Integration • Stress</sub> |

</div>

---

## 🖼️ 3D Architectural Gallery

<table>
  <tr>
    <td width="50%" align="center">
      <img src="./blender/renders/isometric_campus_view.png" alt="3D Isometric View" width="100%" />
      <br /><b>🌐 3D Isometric Digital Twin</b><br /><sub>Full two-story quadrangle, central lawn & sandstone colonnades</sub>
    </td>
    <td width="50%" align="center">
      <img src="./blender/renders/topdown_overview.png" alt="2D Blueprint Ortho Plan" width="100%" />
      <br /><b>🗺️ 2D Top-Down Blueprint Mode</b><br /><sub>Color-coded Lecture Theaters, Labs, Library & Admin wings</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <img src="./blender/renders/twin_library_staircases_detail.png" alt="Twin Library Staircases" width="100%" />
      <br /><b>🪜 Twin Central Library Staircases</b><br /><sub>Porthole landings & elevated bridge into Central Library (F-36)</sub>
    </td>
    <td width="50%" align="center">
      <img src="./blender/renders/courtyard_view_admin_to_stage.png" alt="Courtyard & Stage" width="100%" />
      <br /><b>🎭 Central Quadrangle & JIET Stage</b><br /><sub>Cross-walkways, amphitheater bleachers & covered verandas</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <img src="./blender/renders/first_floor_rooms_detail.png" alt="First Floor Rooms Cutaway" width="100%" />
      <br /><b>🟣 First Floor (1F) Cutaway</b><br /><sub>28 Upper-level LTs, Computer Labs & HOD cabins</sub>
    </td>
    <td width="50%" align="center">
      <img src="./blender/renders/ground_floor_rooms_cutaway.png" alt="Ground Floor Rooms Cutaway" width="100%" />
      <br /><b>🟢 Ground Floor (GF) Cutaway</b><br /><sub>33 Ground-level Labs, Idea Lab, Drawing Halls & Admin</sub>
    </td>
  </tr>
</table>

---

## 🧠 How It Works (Visual Architecture)

### 1. System Pipeline

```mermaid
flowchart LR
    subgraph Assets["🎨 3D Pipeline"]
        CAD["📐 JIET CAD Plans\n+ 540 Walkthrough Frames"] --> BL["🧊 Blender 5.2\nProcedural Builder"]
        BL --> GLB["📦 jiet_campus_prototype.glb"]
    end

    subgraph Engine["⚡ WebGL & State Engine"]
        GLB --> R3F["🎮 React Three Fiber\n+ Three.js r169"]
        ZUS["🗂️ Zustand Store"] <--> R3F
        SQL["📅 SQL.js WASM\nTimetable DB"] --> ZUS
        WS["📡 Socket.io\nPeer Radar"] --> ZUS
    end

    subgraph UX["🧭 Student Interface"]
        R3F --> NAV["🛣️ 3D Route Ribbon\n+ Helical Stair Interpolation"]
        R3F --> POI["🏷️ MazeMap 3D Labels\n+ Slab Occlusion"]
        ZUS --> COMBO["🔍 Searchable Combobox\nAnywhere ➔ Anywhere"]
    end

    style Assets fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#fff
    style Engine fill:#0f172a,stroke:#10b981,stroke-width:2px,color:#fff
    style UX fill:#0f172a,stroke:#a855f7,stroke-width:2px,color:#fff
```

### 2. Topological "Anywhere-to-Anywhere" Routing Engine

```mermaid
flowchart TD
    A(["📍 Origin Selected\n(Any Room / Lab / Gate)"]) --> B["🚪 Snap to Room Doorway Node"]
    B --> C["🏛️ Enter Covered Veranda Centerline\n(|X| = 19.525m, |Z| = 19.525m)"]
    C --> D{"Same Floor?"}
    D -- "✅ Yes (GF ➔ GF or 1F ➔ 1F)" --> E["🔄 Traverse Corner Rotunda Walkways"]
    D -- "🪜 No (GF ⇄ 1F)" --> F["🌀 Route via Nearest Helical Staircase\n(22-Step Spiral Elevation Interpolation)"]
    F --> E
    E --> G["🎯 Arrive at Destination Doorway"]
    G --> H(["🏁 Render Glowing 3D Ribbon + Turn-by-Turn HUD"])

    style A fill:#0284c7,stroke:#38bdf8,color:#fff
    style D fill:#d97706,stroke:#fbbf24,color:#fff
    style F fill:#7c3aed,stroke:#a855f7,color:#fff
    style H fill:#059669,stroke:#34d399,color:#fff
```

### 3. Spatial Distribution Across Campus

```mermaid
pie showData
    title 65 Navigable Campus Locations
    "Ground Floor Rooms & Labs (GF)" : 33
    "First Floor Classrooms & Labs (1F)" : 28
    "Arterial Gates & Hubs" : 4
```

---

## ⚡ Feature Matrix

| Module | What It Does | Visual Highlight |
| :--- | :--- | :--- |
| **🧭 Anywhere ➔ Anywhere** | Route from **any** room/lab/gate to **any** destination in 1 tap | Glowing floor-grounded 3D ribbon + animated chevrons |
| **🔍 Smart Combobox** | Type-to-search (`LT-9`, `Idea`, `Chem`) + categorized dropdown | Grouped by **Landmarks**, **GF (33)**, and **1F (28)** |
| **🏢 Z-Level Switcher** | Switch between `1F`, `GF`, and `ALL` + `2D` / `3D` camera views | Instant slab isolation & top-down blueprint snap |
| **🏷️ 3D Hovering POIs** | Floating room codes & amenity badges (WC, Stairs, Labs, Library) | Automatic floor-slab occlusion (zero bleed-through) |
| **📅 Timetable Sync** | Detects active class from SQLite schedule & highlights room | 1-tap **"Take Me To Class"** instant routing |
| **👥 Live Peer Radar** | Real-time Socket.io check-ins showing classmates on campus | Live 3D avatars hovering over active rooms |
| **🚀 Anti-Gravity Mode** | Type Konami Code (`↑ ↑ ↓ ↓ ← → ← → B A`) | Zero-G floating physics + cosmic starfield |

---

## 🗺️ Repository Blueprint

```text
campus-room-finder/
├── 🧊 blender/
│   ├── jiet_campus_prototype.blend      # Master Blender 5.2 CAD twin
│   └── renders/                         # 22 Cycles architectural renders
├── 📦 public/models/
│   └── jiet_campus_prototype.glb        # WebGL-optimized 3D campus model
├── ⚛️ src/
│   ├── components/canvas/               # 3D WebGL Scene, Ribbon, Stairs & POIs
│   ├── components/ui/                   # Wayfinding HUD, Combobox, Floor Dock
│   ├── data/                            # 61 rooms + topological waypoint graph
│   ├── services/                        # A* pathfinding, SQL.js & Socket.io
│   └── stores/                          # Zustand state (Campus, Theme, Peers)
└── 🧪 tests/                            # 36 test suites (359 automated checks)
```

---

## 🛠️ Quick Start & Commands

```bash
# 1. Clone & install
git clone https://github.com/yoursexybhavya/campus-room-finder.git
cd campus-room-finder && npm install

# 2. Launch 3D dev server (http://localhost:3000)
npm run dev

# 3. Run all 359 automated tests
npm test

# 4. Build & deploy to production
npm run build && npx vercel --prod --yes
```

---

## 👥 Core Team — The 4 Musketeers

<div align="center">

| <a href="https://github.com/yoursexybhavya"><img src="https://github.com/yoursexybhavya.png" width="90" height="90" style="border-radius:50%;" alt="yoursexybhavya"/><br/><b>Bhavya Jangid</b></a> | <a href="https://github.com/babooshki"><img src="https://github.com/babooshki.png" width="90" height="90" style="border-radius:50%;" alt="babooshki"/><br/><b>Babooshki</b></a> | <a href="https://github.com/Aditya69-xr"><img src="https://github.com/Aditya69-xr.png" width="90" height="90" style="border-radius:50%;" alt="Aditya69-xr"/><br/><b>Aditya Jain</b></a> | <a href="https://github.com/Dev-Harry-Code"><img src="https://github.com/Dev-Harry-Code.png" width="90" height="90" style="border-radius:50%;" alt="Dev-Harry-Code"/><br/><b>Harshal Sharma</b></a> |
| :---: | :---: | :---: | :---: |
| [![GitHub](https://img.shields.io/badge/@yoursexybhavya-181717?style=flat-square&logo=github)](https://github.com/yoursexybhavya) | [![GitHub](https://img.shields.io/badge/@babooshki-181717?style=flat-square&logo=github)](https://github.com/babooshki) | [![GitHub](https://img.shields.io/badge/@Aditya69--xr-181717?style=flat-square&logo=github)](https://github.com/Aditya69-xr) | [![GitHub](https://img.shields.io/badge/@Dev--Harry--Code-181717?style=flat-square&logo=github)](https://github.com/Dev-Harry-Code) |
| <sub>Jodhpur, India</sub> | <sub>Jodhpur, India</sub> | <sub>Jodhpur, India</sub> | <sub>Jodhpur, India</sub> |

</div>

---

<div align="center">

> 📌 **Auto-Sync Rule**: *This `README.md` is continuously updated alongside every architectural, UI, or routing update.*

**Built with ❤️ at JIET Jodhpur • [Live App](https://campusroomfinder.vercel.app)**

</div>
