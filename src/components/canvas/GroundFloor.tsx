import React from 'react';
import { campusRooms } from '../../data/campusRooms';
import { useCampusStore } from '../../stores/useCampusStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { RoomNode } from './RoomNode';

export const GroundFloor: React.FC = () => {
  const selectedRoomId = useCampusStore((state) => state.selectedRoomId);
  const hoveredRoomId = useCampusStore((state) => state.hoveredRoomId);
  const activeFloorFilter = useCampusStore((state) => state.activeFloorFilter);
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  const groundRooms = campusRooms.filter((room) => room.floor === 'ground');

  // When First Floor is selected, hide Ground Floor completely to eliminate bleed-through & z-fighting
  const isVisible = activeFloorFilter !== 'first';

  // Architectural flooring colors matching MazeMap aesthetic
  const floorSlabColor = isDark ? '#1e293b' : '#f1f5f9';
  const blackBorderColor = isDark ? '#090d16' : '#cbd5e1';

  return (
    <group name="ground-floor-group" visible={isVisible}>
      {/* ======================================================== */}
      {/* CONTINUOUS QUADRANGLE CORRIDOR SLAB LOOP (Ground Floor)   */}
      {/* Authentic 3.5m-wide covered veranda connecting all rooms  */}
      {/* Clean, non-overlapping architectural walkways             */}
      {/* ======================================================== */}
      {/* West Corridor Slab (x: -16 to -12.5, z: -12.5 to 12.5) */}
      <mesh position={[-14.25, 0.08, 0]} receiveShadow>
        <boxGeometry args={[3.5, 0.1, 25]} />
        <meshStandardMaterial
          color={floorSlabColor}
          roughness={0.4}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
          depthWrite
        />
      </mesh>
      {/* West Corridor Border Inlay Strips */}
      <mesh position={[-15.85, 0.14, 0]}>
        <boxGeometry args={[0.18, 0.02, 25]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>
      <mesh position={[-12.65, 0.14, 0]}>
        <boxGeometry args={[0.18, 0.02, 25]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>

      {/* East Corridor Slab (x: 12.5 to 16, z: -12.5 to 12.5) */}
      <mesh position={[14.25, 0.08, 0]} receiveShadow>
        <boxGeometry args={[3.5, 0.1, 25]} />
        <meshStandardMaterial
          color={floorSlabColor}
          roughness={0.4}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
          depthWrite
        />
      </mesh>
      {/* East Corridor Border Inlay Strips */}
      <mesh position={[15.85, 0.14, 0]}>
        <boxGeometry args={[0.18, 0.02, 25]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>
      <mesh position={[12.65, 0.14, 0]}>
        <boxGeometry args={[0.18, 0.02, 25]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>

      {/* North Corridor Slab (x: -12.5 to 12.5, z: -16 to -12.5) */}
      <mesh position={[0, 0.08, -14.25]} receiveShadow>
        <boxGeometry args={[25, 0.1, 3.5]} />
        <meshStandardMaterial
          color={floorSlabColor}
          roughness={0.4}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
          depthWrite
        />
      </mesh>
      {/* North Corridor Border Inlay Strips */}
      <mesh position={[0, 0.14, -15.85]}>
        <boxGeometry args={[25, 0.02, 0.18]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.14, -12.65]}>
        <boxGeometry args={[25, 0.02, 0.18]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>

      {/* South Corridor Slab (x: -12.5 to 12.5, z: 12.5 to 16) */}
      <mesh position={[0, 0.08, 14.25]} receiveShadow>
        <boxGeometry args={[25, 0.1, 3.5]} />
        <meshStandardMaterial
          color={floorSlabColor}
          roughness={0.4}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
          depthWrite
        />
      </mesh>
      {/* South Corridor Border Inlay Strips */}
      <mesh position={[0, 0.14, 15.85]}>
        <boxGeometry args={[25, 0.02, 0.18]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.14, 12.65]}>
        <boxGeometry args={[25, 0.02, 0.18]} />
        <meshStandardMaterial color={blackBorderColor} roughness={0.3} />
      </mesh>

      {/* 4 Corner Junction Seamless Slabs (Connecting all 4 wings into unbroken loop) */}
      <mesh position={[-14.25, 0.08, 14.25]} receiveShadow>
        <boxGeometry args={[3.5, 0.1, 3.5]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} depthWrite />
      </mesh>
      <mesh position={[14.25, 0.08, 14.25]} receiveShadow>
        <boxGeometry args={[3.5, 0.1, 3.5]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} depthWrite />
      </mesh>
      <mesh position={[-14.25, 0.08, -14.25]} receiveShadow>
        <boxGeometry args={[3.5, 0.1, 3.5]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} depthWrite />
      </mesh>
      <mesh position={[14.25, 0.08, -14.25]} receiveShadow>
        <boxGeometry args={[3.5, 0.1, 3.5]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} depthWrite />
      </mesh>

      {/* ======================================================== */}
      {/* CROSS-CORRIDORS & BLUEPRINT PASSAGES                     */}
      {/* ======================================================== */}
      {/* South Entrance Main Arterial Passage (Connecting Porch to Courtyard) */}
      <mesh position={[0, 0.08, 20]} receiveShadow>
        <boxGeometry args={[4.2, 0.1, 8.0]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} depthWrite />
      </mesh>
      {/* North Culvert Workshop Passage */}
      <mesh position={[0, 0.08, -20]} receiveShadow>
        <boxGeometry args={[4.2, 0.1, 8.0]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} depthWrite />
      </mesh>
      {/* West Mid-Wing Cross-Passage */}
      <mesh position={[-20.5, 0.08, 0]} receiveShadow>
        <boxGeometry args={[9.0, 0.1, 2.8]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} depthWrite />
      </mesh>
      {/* East Mid-Wing Cross-Passage */}
      <mesh position={[20.5, 0.08, 0]} receiveShadow>
        <boxGeometry args={[9.0, 0.1, 2.8]} />
        <meshStandardMaterial color={floorSlabColor} roughness={0.4} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} depthWrite />
      </mesh>

      {/* Clean Architectural Doorway Threshold Strips in Room Category Colors */}
      {groundRooms.map((room) => {
        const [rx, ry, rz] = room.position;
        const [rw, rh, rd] = room.dimensions;
        let thresholdPos: [number, number, number] = [rx, 0.14, rz];
        let thresholdArgs: [number, number, number] = [1.4, 0.02, 0.22];

        if (room.wing === 'East') {
          thresholdPos = [rx - rw / 2, 0.14, rz];
          thresholdArgs = [0.22, 0.02, 1.4];
        } else if (room.wing === 'West') {
          thresholdPos = [rx + rw / 2, 0.14, rz];
          thresholdArgs = [0.22, 0.02, 1.4];
        } else if (room.wing === 'North') {
          thresholdPos = [rx, 0.14, rz + rd / 2];
          thresholdArgs = [1.4, 0.02, 0.22];
        } else {
          thresholdPos = [rx, 0.14, rz - rd / 2];
          thresholdArgs = [1.4, 0.02, 0.22];
        }

        return (
          <mesh key={`gf-threshold-${room.id}`} position={thresholdPos} receiveShadow>
            <boxGeometry args={thresholdArgs} />
            <meshStandardMaterial
              color={room.color}
              roughness={0.3}
              metalness={0.2}
              polygonOffset
              polygonOffsetFactor={-3}
              polygonOffsetUnits={-3}
            />
          </mesh>
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
