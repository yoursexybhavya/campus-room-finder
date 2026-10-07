import React from 'react';
import { campusRooms } from '../../data/campusRooms';
import { useCampusStore } from '../../stores/useCampusStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { RoomNode } from './RoomNode';

// Subcomponent: 3D Architectural Curved / Helical Corner Staircase
const CornerStaircase: React.FC<{ position: [number, number, number]; rotation?: number }> = ({
  position,
  rotation = 0,
}) => {
  const stepCount = 12;
  const stepHeight = 3.5 / stepCount;
  const stepDepth = 2.4 / stepCount;
  const stepWidth = 3.2;

  return (
    <group position={position} rotation={[0, rotation, 0]} name="corner-helical-staircase">
      {/* Stairwell Curved Boundary Wall / Shaft */}
      <mesh position={[-stepWidth / 2 - 0.15, 1.8, 1.2]} castShadow>
        <boxGeometry args={[0.25, 3.6, 3.4]} />
        <meshStandardMaterial color="#c28d58" roughness={0.7} />
      </mesh>
      <mesh position={[stepWidth / 2 + 0.15, 1.8, 1.2]} castShadow>
        <boxGeometry args={[0.25, 3.6, 3.4]} />
        <meshStandardMaterial color="#c28d58" roughness={0.7} />
      </mesh>

      {/* Individual Helical Swept Steps (Rajasthan Sandstone Treads) */}
      {Array.from({ length: stepCount }).map((_, i) => (
        <group key={`step-${i}`} position={[0, (i + 0.5) * stepHeight, (i + 0.5) * stepDepth]}>
          {/* Stone Tread */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[stepWidth, stepHeight * 0.95, stepDepth * 1.15]} />
            <meshStandardMaterial color="#d4a373" roughness={0.5} />
          </mesh>
          {/* Black Riser Strip */}
          <mesh position={[0, -stepHeight * 0.45, stepDepth * 0.55]}>
            <boxGeometry args={[stepWidth + 0.02, 0.04, 0.04]} />
            <meshStandardMaterial color="#0f172a" roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* Modern Brushed Steel / Cyan Accent Handrails */}
      <mesh position={[-stepWidth / 2 + 0.08, 2.0, 1.2]} rotation={[0.48, 0, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 4.0, 10]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[stepWidth / 2 - 0.08, 2.0, 1.2]} rotation={[0.48, 0, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 4.0, 10]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
};

// Subcomponent: Architectural Rajasthan Teakwood & Sandstone Conversation Bench
const VerandaBench: React.FC<{
  position: [number, number, number];
  rotation?: number;
}> = ({ position, rotation = 0 }) => (
  <group position={position} rotation={[0, rotation, 0]} name="veranda-discussion-bench">
    {/* Sandstone Base Supports */}
    <mesh position={[-0.7, 0.16, 0]} castShadow>
      <boxGeometry args={[0.2, 0.32, 0.45]} />
      <meshStandardMaterial color="#c28d58" roughness={0.6} />
    </mesh>
    <mesh position={[0.7, 0.16, 0]} castShadow>
      <boxGeometry args={[0.2, 0.32, 0.45]} />
      <meshStandardMaterial color="#c28d58" roughness={0.6} />
    </mesh>
    {/* Teakwood Polished Seat Slat */}
    <mesh position={[0, 0.34, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.7, 0.06, 0.5]} />
      <meshStandardMaterial color="#78350f" roughness={0.4} />
    </mesh>
    {/* Teakwood Ergonomic Backrest */}
    <mesh position={[0, 0.62, -0.22]} rotation={[0.1, 0, 0]} castShadow>
      <boxGeometry args={[1.7, 0.28, 0.05]} />
      <meshStandardMaterial color="#78350f" roughness={0.4} />
    </mesh>
  </group>
);

export const GroundFloor: React.FC = () => {
  const selectedRoomId = useCampusStore((state) => state.selectedRoomId);
  const hoveredRoomId = useCampusStore((state) => state.hoveredRoomId);
  const activeFloorFilter = useCampusStore((state) => state.activeFloorFilter);
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  const groundRooms = campusRooms.filter((room) => room.floor === 'ground');

  const isDimmed = activeFloorFilter === 'first';
  const slabOpacity = isDimmed ? 0.2 : 0.98;

  // Courtyard Colonnade Pillars along the inner veranda edge (x = ±12.5, z = ±12.5)
  // Evenly spaced at 3.5m intervals, leaving x = 0 and z = 0 open for lawn walkways
  const pillarPositions: [number, number, number][] = [
    // West Wing Veranda Colonnade (facing courtyard at x = -12.5)
    [-12.5, 1.8, -14], [-12.5, 1.8, -10.5], [-12.5, 1.8, -7], [-12.5, 1.8, -3.5],
    [-12.5, 1.8, 3.5], [-12.5, 1.8, 7], [-12.5, 1.8, 10.5], [-12.5, 1.8, 14],
    // East Wing Veranda Colonnade (facing courtyard at x = 12.5)
    [12.5, 1.8, -14], [12.5, 1.8, -10.5], [12.5, 1.8, -7], [12.5, 1.8, -3.5],
    [12.5, 1.8, 3.5], [12.5, 1.8, 7], [12.5, 1.8, 10.5], [12.5, 1.8, 14],
    // North Wing Veranda Colonnade (facing courtyard at z = -12.5)
    [-14, 1.8, -12.5], [-10.5, 1.8, -12.5], [-7, 1.8, -12.5], [-3.5, 1.8, -12.5],
    [3.5, 1.8, -12.5], [7, 1.8, -12.5], [10.5, 1.8, -12.5], [14, 1.8, -12.5],
    // South Wing Veranda Colonnade (facing courtyard at z = 12.5)
    [-14, 1.8, 12.5], [-10.5, 1.8, 12.5], [-7, 1.8, 12.5], [-3.5, 1.8, 12.5],
    [3.5, 1.8, 12.5], [7, 1.8, 12.5], [10.5, 1.8, 12.5], [14, 1.8, 12.5],
  ];

  // Overhead transverse veranda ceiling beams spanning room wall to pillars
  const ceilingBeamSpans: { pos: [number, number, number]; args: [number, number, number] }[] = [
    // West Wing Beams (x: -16 to -12.5, center: -14.25, width: 3.5)
    ...[-14, -10.5, -7, -3.5, 3.5, 7, 10.5, 14].map((z) => ({
      pos: [-14.25, 3.3, z] as [number, number, number],
      args: [3.5, 0.25, 0.4] as [number, number, number],
    })),
    // East Wing Beams (x: 12.5 to 16, center: 14.25, width: 3.5)
    ...[-14, -10.5, -7, -3.5, 3.5, 7, 10.5, 14].map((z) => ({
      pos: [14.25, 3.3, z] as [number, number, number],
      args: [3.5, 0.25, 0.4] as [number, number, number],
    })),
    // North Wing Beams (z: -16 to -12.5, center: -14.25, depth: 3.5)
    ...[-14, -10.5, -7, -3.5, 3.5, 7, 10.5, 14].map((x) => ({
      pos: [x, 3.3, -14.25] as [number, number, number],
      args: [0.4, 0.25, 3.5] as [number, number, number],
    })),
    // South Wing Beams (z: 12.5 to 16, center: 14.25, depth: 3.5)
    ...[-14, -10.5, -7, -3.5, 3.5, 7, 10.5, 14].map((x) => ({
      pos: [x, 3.3, 14.25] as [number, number, number],
      args: [0.4, 0.25, 3.5] as [number, number, number],
    })),
  ];

  // Covered Veranda Discussion & Conversation Benches ("where people talk")
  const groundBenches: { pos: [number, number, number]; rot: number }[] = [
    // West Veranda
    { pos: [-14.25, 0.08, -8.75], rot: Math.PI / 2 },
    { pos: [-14.25, 0.08, 0], rot: Math.PI / 2 },
    { pos: [-14.25, 0.08, 8.75], rot: Math.PI / 2 },
    // East Veranda
    { pos: [14.25, 0.08, -8.75], rot: -Math.PI / 2 },
    { pos: [14.25, 0.08, 0], rot: -Math.PI / 2 },
    { pos: [14.25, 0.08, 8.75], rot: -Math.PI / 2 },
    // North Veranda
    { pos: [-8.75, 0.08, -14.25], rot: 0 },
    { pos: [8.75, 0.08, -14.25], rot: 0 },
    // South Veranda
    { pos: [-8.75, 0.08, 14.25], rot: Math.PI },
    { pos: [8.75, 0.08, 14.25], rot: Math.PI },
    // South Main Reception Lobby Conversation Lounge
    { pos: [-2.5, 0.08, 22], rot: Math.PI / 2 },
    { pos: [2.5, 0.08, 22], rot: -Math.PI / 2 },
  ];

  // Colors for polished flooring with black border bands
  const floorSlabColor = isDark ? '#1e293b' : '#e2e8f0';
  const blackBorderColor = isDark ? '#090d16' : '#1e293b';
  const sandstonePillarColor = '#c28d58';
  const sandstoneCapitalColor = '#b47b45';

  return (
    <group name="ground-floor-group">
      {/* ======================================================== */}
      {/* CONTINUOUS QUADRANGLE CORRIDOR SLAB LOOP (Ground Floor)   */}
      {/* Authentic 3.5m-wide covered veranda connecting all rooms  */}
      {/* ======================================================== */}
      {/* West Corridor Slab (width: 3.5m, x: -16 to -12.5, length: 32m) */}
      <mesh position={[-14.25, 0.08, 0]} receiveShadow>
        <boxGeometry args={[3.5, 0.1, 32]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.35} transparent opacity={slabOpacity} />
      </mesh>
      {/* West Corridor Black Border Inlay Strips */}
      <mesh position={[-15.85, 0.14, 0]}>
        <boxGeometry args={[0.18, 0.02, 32]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} transparent opacity={slabOpacity} />
      </mesh>
      <mesh position={[-12.65, 0.14, 0]}>
        <boxGeometry args={[0.18, 0.02, 32]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} transparent opacity={slabOpacity} />
      </mesh>

      {/* East Corridor Slab (width: 3.5m, x: 12.5 to 16, length: 32m) */}
      <mesh position={[14.25, 0.08, 0]} receiveShadow>
        <boxGeometry args={[3.5, 0.1, 32]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.35} transparent opacity={slabOpacity} />
      </mesh>
      {/* East Corridor Black Border Inlay Strips */}
      <mesh position={[15.85, 0.14, 0]}>
        <boxGeometry args={[0.18, 0.02, 32]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} transparent opacity={slabOpacity} />
      </mesh>
      <mesh position={[12.65, 0.14, 0]}>
        <boxGeometry args={[0.18, 0.02, 32]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} transparent opacity={slabOpacity} />
      </mesh>

      {/* North Corridor Slab (length: 32m, depth: 3.5m, z: -16 to -12.5) */}
      <mesh position={[0, 0.08, -14.25]} receiveShadow>
        <boxGeometry args={[32, 0.1, 3.5]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.35} transparent opacity={slabOpacity} />
      </mesh>
      {/* North Corridor Black Border Inlay Strips */}
      <mesh position={[0, 0.14, -15.85]}>
        <boxGeometry args={[32, 0.02, 0.18]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} transparent opacity={slabOpacity} />
      </mesh>
      <mesh position={[0, 0.14, -12.65]}>
        <boxGeometry args={[32, 0.02, 0.18]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} transparent opacity={slabOpacity} />
      </mesh>

      {/* South Corridor Slab (length: 32m, depth: 3.5m, z: 12.5 to 16) */}
      <mesh position={[0, 0.08, 14.25]} receiveShadow>
        <boxGeometry args={[32, 0.1, 3.5]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.35} transparent opacity={slabOpacity} />
      </mesh>
      {/* South Corridor Black Border Inlay Strips */}
      <mesh position={[0, 0.14, 15.85]}>
        <boxGeometry args={[32, 0.02, 0.18]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} transparent opacity={slabOpacity} />
      </mesh>
      <mesh position={[0, 0.14, 12.65]}>
        <boxGeometry args={[32, 0.02, 0.18]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} transparent opacity={slabOpacity} />
      </mesh>

      {/* 4 Corner Junction Seamless Slabs (Connecting all 4 wings into unbroken loop) */}
      <mesh position={[-14.25, 0.08, 14.25]} receiveShadow>
        <boxGeometry args={[3.5, 0.1, 3.5]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.35} transparent opacity={slabOpacity} />
      </mesh>
      <mesh position={[14.25, 0.08, 14.25]} receiveShadow>
        <boxGeometry args={[3.5, 0.1, 3.5]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.35} transparent opacity={slabOpacity} />
      </mesh>
      <mesh position={[-14.25, 0.08, -14.25]} receiveShadow>
        <boxGeometry args={[3.5, 0.1, 3.5]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.35} transparent opacity={slabOpacity} />
      </mesh>
      <mesh position={[14.25, 0.08, -14.25]} receiveShadow>
        <boxGeometry args={[3.5, 0.1, 3.5]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.35} transparent opacity={slabOpacity} />
      </mesh>

      {/* ======================================================== */}
      {/* CROSS-CORRIDORS & BLUEPRINT PASSAGES                     */}
      {/* Verifiable CAD blueprints: Passages connecting to exits   */}
      {/* ======================================================== */}
      {/* South Entrance Main Arterial Passage (Connecting Porch to Courtyard) */}
      <mesh position={[0, 0.08, 20]} receiveShadow>
        <boxGeometry args={[4.2, 0.1, 8.2]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} transparent opacity={slabOpacity} />
      </mesh>
      {/* North Culvert Workshop Passage (Connecting North Veranda to Workshop Bridge) */}
      <mesh position={[0, 0.08, -20]} receiveShadow>
        <boxGeometry args={[4.2, 0.1, 8.2]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} transparent opacity={slabOpacity} />
      </mesh>
      {/* West Mid-Wing Cross-Passage (Between PC-Lab and AICTE Idea Lab) */}
      <mesh position={[-20, 0.08, 0]} receiveShadow>
        <boxGeometry args={[8.0, 0.1, 2.8]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} transparent opacity={slabOpacity} />
      </mesh>
      {/* East Mid-Wing Cross-Passage (Between LT-9 and LT-10) */}
      <mesh position={[20, 0.08, 0]} receiveShadow>
        <boxGeometry args={[8.0, 0.1, 2.8]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} transparent opacity={slabOpacity} />
      </mesh>

      {/* Courtyard Low Balustrade / Veranda Curbing with Entrance Portals */}
      {/* West Edge Balustrades */}
      <mesh position={[-12.5, 0.18, 7.5]} receiveShadow>
        <boxGeometry args={[0.22, 0.22, 13]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} />
      </mesh>
      <mesh position={[-12.5, 0.18, -7.5]} receiveShadow>
        <boxGeometry args={[0.22, 0.22, 13]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} />
      </mesh>
      {/* East Edge Balustrades */}
      <mesh position={[12.5, 0.18, 7.5]} receiveShadow>
        <boxGeometry args={[0.22, 0.22, 13]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} />
      </mesh>
      <mesh position={[12.5, 0.18, -7.5]} receiveShadow>
        <boxGeometry args={[0.22, 0.22, 13]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} />
      </mesh>
      {/* North Edge Balustrades */}
      <mesh position={[7.5, 0.18, -12.5]} receiveShadow>
        <boxGeometry args={[13, 0.22, 0.22]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} />
      </mesh>
      <mesh position={[-7.5, 0.18, -12.5]} receiveShadow>
        <boxGeometry args={[13, 0.22, 0.22]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} />
      </mesh>
      {/* South Edge Balustrades */}
      <mesh position={[7.5, 0.18, 12.5]} receiveShadow>
        <boxGeometry args={[13, 0.22, 0.22]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} />
      </mesh>
      <mesh position={[-7.5, 0.18, 12.5]} receiveShadow>
        <boxGeometry args={[13, 0.22, 0.22]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} />
      </mesh>

      {/* ======================================================== */}
      {/* 4 AUTHENTIC CORNER CURVED STAIRCASES (Connecting GF to FF) */}
      {/* ======================================================== */}
      {/* South-West Staircase */}
      <CornerStaircase position={[-14.25, 0.08, 14.25]} rotation={Math.PI / 2} />
      {/* South-East Staircase */}
      <CornerStaircase position={[14.25, 0.08, 14.25]} rotation={-Math.PI / 2} />
      {/* North-West Staircase */}
      <CornerStaircase position={[-14.25, 0.08, -14.25]} rotation={Math.PI / 2} />
      {/* North-East Staircase */}
      <CornerStaircase position={[14.25, 0.08, -14.25]} rotation={-Math.PI / 2} />

      {/* ======================================================== */}
      {/* JODHPUR SANDSTONE CORRIDOR COLONNADE                     */}
      {/* Classical sandstone columns lining the central courtyard  */}
      {/* ======================================================== */}
      {pillarPositions.map(([x, y, z], index) => (
        <group key={`sandstone-pillar-${index}`} position={[x, y, z]}>
          {/* Base Plinth */}
          <mesh position={[0, -1.6, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.2, 0.5]} />
            <meshStandardMaterial color={sandstoneCapitalColor} roughness={0.6} transparent opacity={slabOpacity} />
          </mesh>
          {/* Main Column Shaft */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.2, 0.23, 3.1, 14]} />
            <meshStandardMaterial color={sandstonePillarColor} roughness={0.5} transparent opacity={slabOpacity} />
          </mesh>
          {/* Capital Top Moulding */}
          <mesh position={[0, 1.6, 0]} castShadow>
            <boxGeometry args={[0.5, 0.15, 0.5]} />
            <meshStandardMaterial color={sandstoneCapitalColor} roughness={0.6} transparent opacity={slabOpacity} />
          </mesh>
        </group>
      ))}

      {/* Overhead Transverse Veranda Ceiling Beams (Covered Walkway) */}
      {ceilingBeamSpans.map((beam, index) => (
        <mesh key={`ceiling-beam-${index}`} position={beam.pos} castShadow receiveShadow>
          <boxGeometry args={beam.args} />
          <meshStandardMaterial color={floorSlabColor} roughness={0.5} transparent opacity={slabOpacity} />
        </mesh>
      ))}

      {/* Blue Classroom Door Frames (Video Walkthrough Signature Feature) */}
      {groundRooms.map((room) => {
        // Position door frame on the corridor side of each room
        const [rx, ry, rz] = room.position;
        const [rw, rh, rd] = room.dimensions;
        let doorPos: [number, number, number] = [rx, ry, rz];
        let doorRot: [number, number, number] = [0, 0, 0];
        let frameArgs: [number, number, number] = [1.2, 2.1, 0.15];

        if (room.wing === 'East') {
          doorPos = [rx - rw / 2 + 0.1, ry - rh / 2 + 1.05, rz];
          frameArgs = [0.15, 2.1, 1.2];
        } else if (room.wing === 'West') {
          doorPos = [rx + rw / 2 - 0.1, ry - rh / 2 + 1.05, rz];
          frameArgs = [0.15, 2.1, 1.2];
        } else if (room.wing === 'North') {
          doorPos = [rx, ry - rh / 2 + 1.05, rz + rd / 2 - 0.1];
          frameArgs = [1.2, 2.1, 0.15];
        } else {
          doorPos = [rx, ry - rh / 2 + 1.05, rz - rd / 2 + 0.1];
          frameArgs = [1.2, 2.1, 0.15];
        }

        return (
          <group key={`door-frame-${room.id}`} position={doorPos}>
            {/* Institutional Door Frame in Room Category Color */}
            <mesh castShadow>
              <boxGeometry args={frameArgs} />
              <meshStandardMaterial color={room.color} metalness={0.3} roughness={0.4} />
            </mesh>
          </group>
        );
      })}

      {/* Veranda & Lobby Discussion Benches ("where people talk") */}
      {groundBenches.map((bench, idx) => (
        <VerandaBench
          key={`gf-veranda-bench-${idx}`}
          position={bench.pos}
          rotation={bench.rot}
        />
      ))}

      {/* ======================================================== */}
      {/* GROUND FLOOR ROOM NODES (Authentic JIET Inventory)        */}
      {/* ======================================================== */}
      {groundRooms.map((room) => (
        <RoomNode
          key={room.id}
          room={room}
          isSelected={selectedRoomId === room.id}
          isHovered={hoveredRoomId === room.id}
          floorFilter={activeFloorFilter}
        />
      ))}
    </group>
  );
};
