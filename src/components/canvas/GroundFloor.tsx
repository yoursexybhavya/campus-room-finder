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

export const GroundFloor: React.FC = () => {
  const selectedRoomId = useCampusStore((state) => state.selectedRoomId);
  const hoveredRoomId = useCampusStore((state) => state.hoveredRoomId);
  const activeFloorFilter = useCampusStore((state) => state.activeFloorFilter);
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  const groundRooms = campusRooms.filter((room) => room.floor === 'ground');

  const isDimmed = activeFloorFilter === 'first';
  const slabOpacity = isDimmed ? 0.2 : 0.98;

  // Quadrangle structural pillars supporting First Floor corridors
  const pillarPositions: [number, number, number][] = [
    // West Wing Corridors
    [-16, 1.8, 14], [-16, 1.8, 6], [-16, 1.8, -2], [-16, 1.8, -10], [-16, 1.8, -18],
    [-20, 1.8, 14], [-20, 1.8, 6], [-20, 1.8, -2], [-20, 1.8, -10], [-20, 1.8, -18],
    // East Wing Corridors
    [16, 1.8, 14], [16, 1.8, 6], [16, 1.8, -2], [16, 1.8, -10], [16, 1.8, -18],
    [20, 1.8, 14], [20, 1.8, 6], [20, 1.8, -2], [20, 1.8, -10], [20, 1.8, -18],
    // North Wing Corridors
    [-10, 1.8, -16], [0, 1.8, -16], [10, 1.8, -16],
    [-10, 1.8, -20], [0, 1.8, -20], [10, 1.8, -20],
    // South Wing Corridors
    [-10, 1.8, 16], [0, 1.8, 16], [10, 1.8, 16],
    [-10, 1.8, 20], [0, 1.8, 20], [10, 1.8, 20],
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
      {/* Polished stone flooring with authentic black border bands */}
      {/* ======================================================== */}
      {/* West Corridor Slab (width: 5m, length: 40m) */}
      <mesh position={[-18, 0.08, 0]} receiveShadow>
        <boxGeometry args={[5, 0.1, 40]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} transparent opacity={slabOpacity} />
      </mesh>
      {/* West Corridor Black Border Bands */}
      <mesh position={[-20.35, 0.14, 0]}>
        <boxGeometry args={[0.2, 0.02, 40]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} transparent opacity={slabOpacity} />
      </mesh>
      <mesh position={[-15.65, 0.14, 0]}>
        <boxGeometry args={[0.2, 0.02, 40]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} transparent opacity={slabOpacity} />
      </mesh>

      {/* East Corridor Slab */}
      <mesh position={[18, 0.08, 0]} receiveShadow>
        <boxGeometry args={[5, 0.1, 40]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} transparent opacity={slabOpacity} />
      </mesh>
      {/* East Corridor Black Border Bands */}
      <mesh position={[20.35, 0.14, 0]}>
        <boxGeometry args={[0.2, 0.02, 40]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} transparent opacity={slabOpacity} />
      </mesh>
      <mesh position={[15.65, 0.14, 0]}>
        <boxGeometry args={[0.2, 0.02, 40]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} transparent opacity={slabOpacity} />
      </mesh>

      {/* North Corridor Slab */}
      <mesh position={[0, 0.08, -18]} receiveShadow>
        <boxGeometry args={[40, 0.1, 5]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} transparent opacity={slabOpacity} />
      </mesh>
      {/* North Corridor Black Border Bands */}
      <mesh position={[0, 0.14, -20.35]}>
        <boxGeometry args={[40, 0.02, 0.2]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} transparent opacity={slabOpacity} />
      </mesh>
      <mesh position={[0, 0.14, -15.65]}>
        <boxGeometry args={[40, 0.02, 0.2]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} transparent opacity={slabOpacity} />
      </mesh>

      {/* South Corridor Slab */}
      <mesh position={[0, 0.08, 18]} receiveShadow>
        <boxGeometry args={[40, 0.1, 5]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} transparent opacity={slabOpacity} />
      </mesh>
      {/* South Corridor Black Border Bands */}
      <mesh position={[0, 0.14, 20.35]}>
        <boxGeometry args={[40, 0.02, 0.2]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} transparent opacity={slabOpacity} />
      </mesh>
      <mesh position={[0, 0.14, 15.65]}>
        <boxGeometry args={[40, 0.02, 0.2]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} transparent opacity={slabOpacity} />
      </mesh>

      {/* Courtyard Inner Veranda Railing / Curb (Ground Level) */}
      <mesh position={[0, 0.2, 15.5]} receiveShadow>
        <boxGeometry args={[31, 0.25, 0.2]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.2, -15.5]} receiveShadow>
        <boxGeometry args={[31, 0.25, 0.2]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} />
      </mesh>
      <mesh position={[15.5, 0.2, 0]} receiveShadow>
        <boxGeometry args={[0.2, 0.25, 31]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} />
      </mesh>
      <mesh position={[-15.5, 0.2, 0]} receiveShadow>
        <boxGeometry args={[0.2, 0.25, 31]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} />
      </mesh>

      {/* ======================================================== */}
      {/* 4 AUTHENTIC CORNER CURVED STAIRCASES (Connecting GF to FF) */}
      {/* ======================================================== */}
      {/* South-West Staircase */}
      <CornerStaircase position={[-18, 0.08, 18]} rotation={Math.PI / 2} />
      {/* South-East Staircase */}
      <CornerStaircase position={[18, 0.08, 18]} rotation={-Math.PI / 2} />
      {/* North-West Staircase */}
      <CornerStaircase position={[-18, 0.08, -18]} rotation={Math.PI / 2} />
      {/* North-East Staircase */}
      <CornerStaircase position={[18, 0.08, -18]} rotation={-Math.PI / 2} />

      {/* ======================================================== */}
      {/* JODHPUR SANDSTONE CORRIDOR PILLARS                       */}
      {/* Classical sandstone columns with plinths & capitals      */}
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
            <cylinderGeometry args={[0.22, 0.25, 3.1, 14]} />
            <meshStandardMaterial color={sandstonePillarColor} roughness={0.5} transparent opacity={slabOpacity} />
          </mesh>
          {/* Capital Top Moulding */}
          <mesh position={[0, 1.6, 0]} castShadow>
            <boxGeometry args={[0.5, 0.15, 0.5]} />
            <meshStandardMaterial color={sandstoneCapitalColor} roughness={0.6} transparent opacity={slabOpacity} />
          </mesh>
        </group>
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
