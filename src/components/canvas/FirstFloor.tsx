import React from 'react';
import { campusRooms } from '../../data/campusRooms';
import { useCampusStore } from '../../stores/useCampusStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { RoomNode } from './RoomNode';

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

export const FirstFloor: React.FC = () => {
  const selectedRoomId = useCampusStore((state) => state.selectedRoomId);
  const hoveredRoomId = useCampusStore((state) => state.hoveredRoomId);
  const activeFloorFilter = useCampusStore((state) => state.activeFloorFilter);
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  const firstRooms = campusRooms.filter((room) => room.floor === 'first');

  // When 'ground' is selected, First Floor is completely hidden so ground floor is 100% visible & clickable
  const isVisible = activeFloorFilter !== 'ground';
  const slabOpacity = 0.98;
  const glassOpacity = 0.45;

  // Quadrangle structural pillars on First Floor (aligned along courtyard colonnade at x = ±12.5, z = ±12.5)
  const upperPillarPositions: [number, number, number][] = [
    // West Wing Veranda Colonnade
    [-12.5, 3.8, -14], [-12.5, 3.8, -10.5], [-12.5, 3.8, -7], [-12.5, 3.8, -3.5],
    [-12.5, 3.8, 3.5], [-12.5, 3.8, 7], [-12.5, 3.8, 10.5], [-12.5, 3.8, 14],
    // East Wing Veranda Colonnade
    [12.5, 3.8, -14], [12.5, 3.8, -10.5], [12.5, 3.8, -7], [12.5, 3.8, -3.5],
    [12.5, 3.8, 3.5], [12.5, 3.8, 7], [12.5, 3.8, 10.5], [12.5, 3.8, 14],
    // North Wing Veranda Colonnade
    [-14, 3.8, -12.5], [-10.5, 3.8, -12.5], [-7, 3.8, -12.5], [-3.5, 3.8, -12.5],
    [3.5, 3.8, -12.5], [7, 3.8, -12.5], [10.5, 3.8, -12.5], [14, 3.8, -12.5],
    // South Wing Veranda Colonnade
    [-14, 3.8, 12.5], [-10.5, 3.8, 12.5], [-7, 3.8, 12.5], [-3.5, 3.8, 12.5],
    [3.5, 3.8, 12.5], [7, 3.8, 12.5], [10.5, 3.8, 12.5], [14, 3.8, 12.5],
  ];

  const floorSlabColor = isDark ? '#1e293b' : '#e2e8f0';
  const blackBorderColor = isDark ? '#090d16' : '#1e293b';
  const sandstonePillarColor = '#c28d58';
  const sandstoneCapitalColor = '#b47b45';

  // In 'ALL' mode, set slab opacity to translucent architectural glass (0.38) so ground floor shows through cleanly
  const isAllMode = activeFloorFilter === 'all';
  const slabRenderOpacity = isAllMode ? 0.38 : slabOpacity;

  // Upper Veranda Discussion & Conversation Benches ("where people talk")
  const upperBenches: { pos: [number, number, number]; rot: number }[] = [
    // West Upper Veranda
    { pos: [-14.25, 2.5, -7], rot: Math.PI / 2 },
    { pos: [-14.25, 2.5, 7], rot: Math.PI / 2 },
    // East Upper Veranda
    { pos: [14.25, 2.5, -7], rot: -Math.PI / 2 },
    { pos: [14.25, 2.5, 7], rot: -Math.PI / 2 },
    // North Upper Veranda
    { pos: [-7, 2.5, -14.25], rot: 0 },
    { pos: [7, 2.5, -14.25], rot: 0 },
    // South Upper Veranda
    { pos: [-7, 2.5, 14.25], rot: Math.PI },
    { pos: [7, 2.5, 14.25], rot: Math.PI },
    // Central Library Balcony Terrace Lounge
    { pos: [-6, 2.5, 23], rot: Math.PI },
    { pos: [6, 2.5, 23], rot: Math.PI },
  ];

  return (
    <group
      name="first-floor-group"
      visible={isVisible}
    >
      {/* ======================================================== */}
      {/* CONTINUOUS FIRST FLOOR QUADRANGLE CORRIDOR SLAB LOOP    */}
      {/* Polished stone flooring with authentic black border bands */}
      {/* ======================================================== */}
      {/* West Corridor Slab (width: 3.5m, x: -16 to -12.5, length: 32m) */}
      <mesh position={[-14.25, 2.5, 0]} receiveShadow castShadow>
        <boxGeometry args={[3.5, 0.15, 32]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.35} transparent opacity={slabRenderOpacity} />
      </mesh>
      {/* West Corridor Black Border Bands */}
      <mesh position={[-15.85, 2.58, 0]}>
        <boxGeometry args={[0.18, 0.02, 32]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>
      <mesh position={[-12.65, 2.58, 0]}>
        <boxGeometry args={[0.18, 0.02, 32]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>

      {/* East Corridor Slab (width: 3.5m, x: 12.5 to 16, length: 32m) */}
      <mesh position={[14.25, 2.5, 0]} receiveShadow castShadow>
        <boxGeometry args={[3.5, 0.15, 32]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.35} transparent opacity={slabRenderOpacity} />
      </mesh>
      {/* East Corridor Black Border Bands */}
      <mesh position={[15.85, 2.58, 0]}>
        <boxGeometry args={[0.18, 0.02, 32]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>
      <mesh position={[12.65, 2.58, 0]}>
        <boxGeometry args={[0.18, 0.02, 32]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>

      {/* North Corridor Slab (length: 32m, depth: 3.5m, z: -16 to -12.5) */}
      <mesh position={[0, 2.5, -14.25]} receiveShadow castShadow>
        <boxGeometry args={[32, 0.15, 3.5]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.35} transparent opacity={slabRenderOpacity} />
      </mesh>
      {/* North Corridor Black Border Bands */}
      <mesh position={[0, 2.58, -15.85]}>
        <boxGeometry args={[32, 0.02, 0.18]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.58, -12.65]}>
        <boxGeometry args={[32, 0.02, 0.18]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>

      {/* South Corridor Slab (length: 32m, depth: 3.5m, z: 12.5 to 16) */}
      <mesh position={[0, 2.5, 14.25]} receiveShadow castShadow>
        <boxGeometry args={[32, 0.15, 3.5]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.35} transparent opacity={slabRenderOpacity} />
      </mesh>
      {/* South Corridor Black Border Bands */}
      <mesh position={[0, 2.58, 15.85]}>
        <boxGeometry args={[32, 0.02, 0.18]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.58, 12.65]}>
        <boxGeometry args={[32, 0.02, 0.18]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>

      {/* 4 Corner Stairwell Landings (At y = 2.5) */}
      <mesh position={[-14.25, 2.5, 14.25]} receiveShadow>
        <boxGeometry args={[3.5, 0.16, 3.5]} />
        <meshStandardMaterial color="#475569" roughness={0.6} />
      </mesh>
      <mesh position={[14.25, 2.5, 14.25]} receiveShadow>
        <boxGeometry args={[3.5, 0.16, 3.5]} />
        <meshStandardMaterial color="#475569" roughness={0.6} />
      </mesh>
      <mesh position={[-14.25, 2.5, -14.25]} receiveShadow>
        <boxGeometry args={[3.5, 0.16, 3.5]} />
        <meshStandardMaterial color="#475569" roughness={0.6} />
      </mesh>
      <mesh position={[14.25, 2.5, -14.25]} receiveShadow>
        <boxGeometry args={[3.5, 0.16, 3.5]} />
        <meshStandardMaterial color="#475569" roughness={0.6} />
      </mesh>

      {/* South Central Library Plinth (Expansive First Floor Frontage) */}
      <mesh position={[0, 2.5, 24]} receiveShadow castShadow>
        <boxGeometry args={[26, 0.15, 8]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.5} transparent opacity={slabRenderOpacity} />
      </mesh>

      {/* ======================================================== */}
      {/* INNER COURTYARD GLASS RAILINGS (Overlooking Courtyard)   */}
      {/* ======================================================== */}
      {/* South Edge Glass Railing (along inner courtyard edge z = 12.5) */}
      <mesh position={[0, 3.05, 12.5]} castShadow>
        <boxGeometry args={[25.4, 0.9, 0.06]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={glassOpacity} roughness={0.1} metalness={0.8} />
      </mesh>
      {/* North Edge Glass Railing (along inner courtyard edge z = -12.5) */}
      <mesh position={[0, 3.05, -12.5]} castShadow>
        <boxGeometry args={[25.4, 0.9, 0.06]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={glassOpacity} roughness={0.1} metalness={0.8} />
      </mesh>
      {/* West Edge Glass Railing (along inner courtyard edge x = -12.5) */}
      <mesh position={[-12.5, 3.05, 0]} castShadow>
        <boxGeometry args={[0.06, 0.9, 25.4]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={glassOpacity} roughness={0.1} metalness={0.8} />
      </mesh>
      {/* East Edge Glass Railing (along inner courtyard edge x = 12.5) */}
      <mesh position={[12.5, 3.05, 0]} castShadow>
        <boxGeometry args={[0.06, 0.9, 25.4]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={glassOpacity} roughness={0.1} metalness={0.8} />
      </mesh>

      {/* Railing Handrail Top Caps (Brushed Steel) */}
      <mesh position={[0, 3.52, 12.5]}>
        <boxGeometry args={[25.6, 0.05, 0.08]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 3.52, -12.5]}>
        <boxGeometry args={[25.6, 0.05, 0.08]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[-12.5, 3.52, 0]}>
        <boxGeometry args={[0.08, 0.05, 25.6]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[12.5, 3.52, 0]}>
        <boxGeometry args={[0.08, 0.05, 25.6]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* ======================================================== */}
      {/* JODHPUR SANDSTONE CORRIDOR PILLARS (First Floor)         */}
      {/* ======================================================== */}
      {upperPillarPositions.map(([x, y, z], index) => (
        <group key={`ff-sandstone-pillar-${index}`} position={[x, y, z]}>
          <mesh position={[0, -0.9, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.42, 0.16, 0.42]} />
            <meshStandardMaterial color={sandstoneCapitalColor} roughness={0.6} />
          </mesh>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.18, 0.2, 2.0, 12]} />
            <meshStandardMaterial color={sandstonePillarColor} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.9, 0]} castShadow>
            <boxGeometry args={[0.42, 0.14, 0.42]} />
            <meshStandardMaterial color={sandstoneCapitalColor} roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Blue Classroom Door Frames for First Floor Rooms */}
      {firstRooms.map((room) => {
        const [rx, ry, rz] = room.position;
        const [rw, rh, rd] = room.dimensions;
        let doorPos: [number, number, number] = [rx, ry, rz];
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
          <group key={`ff-door-frame-${room.id}`} position={doorPos}>
            <mesh castShadow>
              <boxGeometry args={frameArgs} />
              <meshStandardMaterial color={room.color} metalness={0.3} roughness={0.4} />
            </mesh>
          </group>
        );
      })}

      {/* Veranda & Terrace Discussion Benches ("where people talk") */}
      {upperBenches.map((bench, idx) => (
        <VerandaBench
          key={`ff-veranda-bench-${idx}`}
          position={bench.pos}
          rotation={bench.rot}
        />
      ))}

      {/* ======================================================== */}
      {/* FIRST FLOOR ROOM NODES (Authentic JIET Inventory)        */}
      {/* ======================================================== */}
      {firstRooms.map((room) => (
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
