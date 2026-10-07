import React from 'react';
import { campusRooms } from '../../data/campusRooms';
import { useCampusStore } from '../../stores/useCampusStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { RoomNode } from './RoomNode';

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

  // Quadrangle structural pillars on First Floor
  const upperPillarPositions: [number, number, number][] = [
    // West Wing Corridors
    [-16, 4.3, 14], [-16, 4.3, 6], [-16, 4.3, -2], [-16, 4.3, -10], [-16, 4.3, -18],
    [-20, 4.3, 14], [-20, 4.3, 6], [-20, 4.3, -2], [-20, 4.3, -10], [-20, 4.3, -18],
    // East Wing Corridors
    [16, 4.3, 14], [16, 4.3, 6], [16, 4.3, -2], [16, 4.3, -10], [16, 4.3, -18],
    [20, 4.3, 14], [20, 4.3, 6], [20, 4.3, -2], [20, 4.3, -10], [20, 4.3, -18],
    // North Wing Corridors
    [-10, 4.3, -16], [0, 4.3, -16], [10, 4.3, -16],
    [-10, 4.3, -20], [0, 4.3, -20], [10, 4.3, -20],
    // South Wing Corridors
    [-10, 4.3, 16], [0, 4.3, 16], [10, 4.3, 16],
    [-10, 4.3, 20], [0, 4.3, 20], [10, 4.3, 20],
  ];

  const floorSlabColor = isDark ? '#1e293b' : '#e2e8f0';
  const blackBorderColor = isDark ? '#090d16' : '#1e293b';
  const sandstonePillarColor = '#c28d58';
  const sandstoneCapitalColor = '#b47b45';

  return (
    <group name="first-floor-group" visible={isVisible}>
      {/* ======================================================== */}
      {/* CONTINUOUS FIRST FLOOR QUADRANGLE CORRIDOR SLAB LOOP    */}
      {/* Polished stone flooring with authentic black border bands */}
      {/* ======================================================== */}
      {/* West Corridor Slab (y = 2.5, width: 5m, length: 40m) */}
      <mesh position={[-18, 2.5, 0]} receiveShadow castShadow>
        <boxGeometry args={[5, 0.15, 40]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} transparent opacity={slabOpacity} />
      </mesh>
      {/* West Corridor Black Border Bands */}
      <mesh position={[-20.35, 2.58, 0]}>
        <boxGeometry args={[0.2, 0.02, 40]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>
      <mesh position={[-15.65, 2.58, 0]}>
        <boxGeometry args={[0.2, 0.02, 40]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>

      {/* East Corridor Slab */}
      <mesh position={[18, 2.5, 0]} receiveShadow castShadow>
        <boxGeometry args={[5, 0.15, 40]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} transparent opacity={slabOpacity} />
      </mesh>
      {/* East Corridor Black Border Bands */}
      <mesh position={[20.35, 2.58, 0]}>
        <boxGeometry args={[0.2, 0.02, 40]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>
      <mesh position={[15.65, 2.58, 0]}>
        <boxGeometry args={[0.2, 0.02, 40]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>

      {/* North Corridor Slab */}
      <mesh position={[0, 2.5, -18]} receiveShadow castShadow>
        <boxGeometry args={[40, 0.15, 5]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} transparent opacity={slabOpacity} />
      </mesh>
      {/* North Corridor Black Border Bands */}
      <mesh position={[0, 2.58, -20.35]}>
        <boxGeometry args={[40, 0.02, 0.2]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.58, -15.65]}>
        <boxGeometry args={[40, 0.02, 0.2]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>

      {/* South Corridor Slab */}
      <mesh position={[0, 2.5, 18]} receiveShadow castShadow>
        <boxGeometry args={[40, 0.15, 5]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} transparent opacity={slabOpacity} />
      </mesh>
      {/* South Corridor Black Border Bands */}
      <mesh position={[0, 2.58, 20.35]}>
        <boxGeometry args={[40, 0.02, 0.2]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.58, 15.65]}>
        <boxGeometry args={[40, 0.02, 0.2]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>

      {/* South Central Library Plinth (Expansive First Floor Frontage) */}
      <mesh position={[0, 2.5, 25]} receiveShadow castShadow>
        <boxGeometry args={[28, 0.15, 9]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.5} transparent opacity={slabOpacity} />
      </mesh>

      {/* ======================================================== */}
      {/* INNER COURTYARD GLASS RAILINGS (Overlooking Courtyard)   */}
      {/* ======================================================== */}
      {/* South Edge Glass Railing */}
      <mesh position={[0, 3.1, 15.5]} castShadow>
        <boxGeometry args={[31, 0.9, 0.06]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={glassOpacity} roughness={0.1} metalness={0.8} />
      </mesh>
      {/* North Edge Glass Railing */}
      <mesh position={[0, 3.1, -15.5]} castShadow>
        <boxGeometry args={[31, 0.9, 0.06]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={glassOpacity} roughness={0.1} metalness={0.8} />
      </mesh>
      {/* West Edge Glass Railing */}
      <mesh position={[-15.5, 3.1, 0]} castShadow>
        <boxGeometry args={[0.06, 0.9, 31]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={glassOpacity} roughness={0.1} metalness={0.8} />
      </mesh>
      {/* East Edge Glass Railing */}
      <mesh position={[15.5, 3.1, 0]} castShadow>
        <boxGeometry args={[0.06, 0.9, 31]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={glassOpacity} roughness={0.1} metalness={0.8} />
      </mesh>

      {/* Railing Handrail Top Caps (Brushed Steel) */}
      <mesh position={[0, 3.58, 15.5]}>
        <boxGeometry args={[31.2, 0.06, 0.1]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 3.58, -15.5]}>
        <boxGeometry args={[31.2, 0.06, 0.1]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[-15.5, 3.58, 0]}>
        <boxGeometry args={[0.1, 0.06, 31.2]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[15.5, 3.58, 0]}>
        <boxGeometry args={[0.1, 0.06, 31.2]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* ======================================================== */}
      {/* 4 CORNER STAIRWELL LANDINGS (At y = 2.5)                 */}
      {/* ======================================================== */}
      {/* SW Landing */}
      <mesh position={[-18, 2.5, 18]} receiveShadow>
        <boxGeometry args={[5, 0.16, 5]} />
        <meshStandardMaterial color="#475569" roughness={0.6} />
      </mesh>
      {/* SE Landing */}
      <mesh position={[18, 2.5, 18]} receiveShadow>
        <boxGeometry args={[5, 0.16, 5]} />
        <meshStandardMaterial color="#475569" roughness={0.6} />
      </mesh>
      {/* NW Landing */}
      <mesh position={[-18, 2.5, -18]} receiveShadow>
        <boxGeometry args={[5, 0.16, 5]} />
        <meshStandardMaterial color="#475569" roughness={0.6} />
      </mesh>
      {/* NE Landing */}
      <mesh position={[18, 2.5, -18]} receiveShadow>
        <boxGeometry args={[5, 0.16, 5]} />
        <meshStandardMaterial color="#475569" roughness={0.6} />
      </mesh>

      {/* ======================================================== */}
      {/* JODHPUR SANDSTONE CORRIDOR PILLARS (First Floor)         */}
      {/* ======================================================== */}
      {upperPillarPositions.map(([x, y, z], index) => (
        <group key={`ff-sandstone-pillar-${index}`} position={[x, y, z]}>
          <mesh position={[0, -1.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.45, 0.18, 0.45]} />
            <meshStandardMaterial color={sandstoneCapitalColor} roughness={0.6} />
          </mesh>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.2, 0.22, 2.4, 12]} />
            <meshStandardMaterial color={sandstonePillarColor} roughness={0.5} />
          </mesh>
          <mesh position={[0, 1.2, 0]} castShadow>
            <boxGeometry args={[0.45, 0.15, 0.45]} />
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
              <meshStandardMaterial color="#2563eb" metalness={0.3} roughness={0.4} />
            </mesh>
          </group>
        );
      })}

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
