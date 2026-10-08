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

  // When 'ground' is selected, First Floor is completely hidden
  const isVisible = activeFloorFilter !== 'ground';
  const glassOpacity = 0.45;

  const floorSlabColor = isDark ? '#1e293b' : '#f1f5f9';
  const blackBorderColor = isDark ? '#090d16' : '#cbd5e1';

  return (
    <group name="first-floor-group" visible={isVisible}>
      {/* ======================================================== */}
      {/* STRUCTURAL SOLID FIRST FLOOR FOUNDATION SLABS            */}
      {/* Provides solid floor foundation beneath each wing         */}
      {/* Completely prevents void gaps and lower floor clipping   */}
      {/* ======================================================== */}
      {/* North Wing Structural Floor Slab (Under LIB-02, INET-01, EF-4, DH-3) */}
      <mesh position={[0, 2.65, -22]} receiveShadow castShadow>
        <boxGeometry args={[44, 0.1, 14]} />
        <meshStandardMaterial
          color={floorSlabColor}
          roughness={0.4}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
          depthWrite
        />
      </mesh>

      {/* South Wing Structural Floor Slab (Under First Floor South Wings) */}
      <mesh position={[0, 2.65, 22]} receiveShadow castShadow>
        <boxGeometry args={[44, 0.1, 14]} />
        <meshStandardMaterial
          color={floorSlabColor}
          roughness={0.4}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
          depthWrite
        />
      </mesh>

      {/* East Wing Structural Floor Slab (Under LT-24, LT-29, LT-33, LT-34) */}
      <mesh position={[20, 2.65, 0]} receiveShadow castShadow>
        <boxGeometry args={[10, 0.1, 44]} />
        <meshStandardMaterial
          color={floorSlabColor}
          roughness={0.4}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
          depthWrite
        />
      </mesh>

      {/* West Wing Structural Floor Slab (Under LAB-3, LAB-4, AICTE Labs) */}
      <mesh position={[-20, 2.65, 0]} receiveShadow castShadow>
        <boxGeometry args={[10, 0.1, 44]} />
        <meshStandardMaterial
          color={floorSlabColor}
          roughness={0.4}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
          depthWrite
        />
      </mesh>

      {/* ======================================================== */}
      {/* CONTINUOUS FIRST FLOOR QUADRANGLE CORRIDOR SLAB LOOP    */}
      {/* Polished stone flooring with authentic border bands      */}
      {/* Clean, unobstructed architectural walkways matching MazeMap */}
      {/* ======================================================== */}
      {/* West Corridor Slab (width: 3.5m, x: -16 to -12.5, length: 32m) */}
      <mesh position={[-14.25, 2.65, 0]} receiveShadow castShadow>
        <boxGeometry args={[3.5, 0.1, 32]} />
        <meshStandardMaterial
          color={floorSlabColor}
          roughness={0.4}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
          depthWrite
        />
      </mesh>
      {/* West Corridor Border Bands */}
      <mesh position={[-15.85, 2.71, 0]}>
        <boxGeometry args={[0.18, 0.02, 32]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>
      <mesh position={[-12.65, 2.71, 0]}>
        <boxGeometry args={[0.18, 0.02, 32]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>

      {/* East Corridor Slab (width: 3.5m, x: 12.5 to 16, length: 32m) */}
      <mesh position={[14.25, 2.65, 0]} receiveShadow castShadow>
        <boxGeometry args={[3.5, 0.1, 32]} />
        <meshStandardMaterial
          color={floorSlabColor}
          roughness={0.4}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
          depthWrite
        />
      </mesh>
      {/* East Corridor Border Bands */}
      <mesh position={[15.85, 2.71, 0]}>
        <boxGeometry args={[0.18, 0.02, 32]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>
      <mesh position={[12.65, 2.71, 0]}>
        <boxGeometry args={[0.18, 0.02, 32]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>

      {/* North Corridor Slab (length: 32m, depth: 3.5m, z: -16 to -12.5) */}
      <mesh position={[0, 2.65, -14.25]} receiveShadow castShadow>
        <boxGeometry args={[32, 0.1, 3.5]} />
        <meshStandardMaterial
          color={floorSlabColor}
          roughness={0.4}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
          depthWrite
        />
      </mesh>
      {/* North Corridor Border Bands */}
      <mesh position={[0, 2.71, -15.85]}>
        <boxGeometry args={[32, 0.02, 0.18]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.71, -12.65]}>
        <boxGeometry args={[32, 0.02, 0.18]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>

      {/* South Corridor Slab (length: 32m, depth: 3.5m, z: 12.5 to 16) */}
      <mesh position={[0, 2.65, 14.25]} receiveShadow castShadow>
        <boxGeometry args={[32, 0.1, 3.5]} />
        <meshStandardMaterial
          color={floorSlabColor}
          roughness={0.4}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
          depthWrite
        />
      </mesh>
      {/* South Corridor Border Bands */}
      <mesh position={[0, 2.71, 15.85]}>
        <boxGeometry args={[32, 0.02, 0.18]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.71, 12.65]}>
        <boxGeometry args={[32, 0.02, 0.18]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>

      {/* 4 Corner Stairwell Landings (At y = 2.65) */}
      <mesh position={[-14.25, 2.65, 14.25]} receiveShadow>
        <boxGeometry args={[3.5, 0.1, 3.5]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} depthWrite />
      </mesh>
      <mesh position={[14.25, 2.65, 14.25]} receiveShadow>
        <boxGeometry args={[3.5, 0.1, 3.5]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} depthWrite />
      </mesh>
      <mesh position={[-14.25, 2.65, -14.25]} receiveShadow>
        <boxGeometry args={[3.5, 0.1, 3.5]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} depthWrite />
      </mesh>
      <mesh position={[14.25, 2.65, -14.25]} receiveShadow>
        <boxGeometry args={[3.5, 0.1, 3.5]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} depthWrite />
      </mesh>

      {/* ======================================================== */}
      {/* INNER COURTYARD GLASS RAILINGS (Overlooking Courtyard)   */}
      {/* ======================================================== */}
      {/* South Edge Glass Railing (along inner courtyard edge z = 12.5) */}
      <mesh position={[0, 3.125, 12.5]} castShadow>
        <boxGeometry args={[25.4, 0.85, 0.06]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={glassOpacity} roughness={0.1} metalness={0.8} />
      </mesh>
      {/* North Edge Glass Railing (along inner courtyard edge z = -12.5) */}
      <mesh position={[0, 3.125, -12.5]} castShadow>
        <boxGeometry args={[25.4, 0.85, 0.06]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={glassOpacity} roughness={0.1} metalness={0.8} />
      </mesh>
      {/* West Edge Glass Railing (along inner courtyard edge x = -12.5) */}
      <mesh position={[-12.5, 3.125, 0]} castShadow>
        <boxGeometry args={[0.06, 0.85, 25.4]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={glassOpacity} roughness={0.1} metalness={0.8} />
      </mesh>
      {/* East Edge Glass Railing (along inner courtyard edge x = 12.5) */}
      <mesh position={[12.5, 3.125, 0]} castShadow>
        <boxGeometry args={[0.06, 0.85, 25.4]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={glassOpacity} roughness={0.1} metalness={0.8} />
      </mesh>

      {/* Railing Handrail Top Caps (Brushed Steel) */}
      <mesh position={[0, 3.56, 12.5]}>
        <boxGeometry args={[25.6, 0.04, 0.08]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 3.56, -12.5]}>
        <boxGeometry args={[25.6, 0.04, 0.08]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[-12.5, 3.56, 0]}>
        <boxGeometry args={[0.08, 0.04, 25.6]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[12.5, 3.56, 0]}>
        <boxGeometry args={[0.08, 0.04, 25.6]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Clean Architectural Doorway Threshold Strips in Room Category Colors */}
      {firstRooms.map((room) => {
        const [rx, ry, rz] = room.position;
        const [rw, rh, rd] = room.dimensions;
        let thresholdPos: [number, number, number] = [rx, 2.66, rz];
        let thresholdArgs: [number, number, number] = [1.4, 0.02, 0.2];

        if (room.wing === 'East') {
          thresholdPos = [rx - rw / 2, 2.66, rz];
          thresholdArgs = [0.2, 0.02, 1.4];
        } else if (room.wing === 'West') {
          thresholdPos = [rx + rw / 2, 2.66, rz];
          thresholdArgs = [0.2, 0.02, 1.4];
        } else if (room.wing === 'North') {
          thresholdPos = [rx, 2.66, rz + rd / 2];
          thresholdArgs = [1.4, 0.02, 0.2];
        } else {
          thresholdPos = [rx, 2.66, rz - rd / 2];
          thresholdArgs = [1.4, 0.02, 0.2];
        }

        return (
          <mesh key={`ff-threshold-${room.id}`} position={thresholdPos} receiveShadow>
            <boxGeometry args={thresholdArgs} />
            <meshStandardMaterial color={room.color} roughness={0.3} metalness={0.2} />
          </mesh>
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
