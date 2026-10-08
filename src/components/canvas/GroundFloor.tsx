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

  // Architectural flooring colors matching MazeMap and Blender reference
  const floorSlabColor = isDark ? '#1e293b' : '#ffffff';
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

      {/* ======================================================== */}
      {/* ADMIN BLOCK BREEZEWAY PORTAL & ARCHITECTURAL FINS        */}
      {/* Ground-truth reference: media_1791463721108.jpg          */}
      {/* ======================================================== */}
      {/* Admin Ground-Floor Breezeway Portal to Sports Ground & Parking */}
      <group position={[20.5, 1.4, 0]} name="admin-breezeway-portal">
        {/* Left Portal Pier */}
        <mesh position={[0, 0, -1.5]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 2.6, 0.4]} />
          <meshStandardMaterial color="#991b1b" roughness={0.5} />
        </mesh>
        {/* Right Portal Pier */}
        <mesh position={[0, 0, 1.5]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 2.6, 0.4]} />
          <meshStandardMaterial color="#991b1b" roughness={0.5} />
        </mesh>
        {/* Portal Overhead Lintel */}
        <mesh position={[0, 1.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.3, 0.4, 3.4]} />
          <meshStandardMaterial color="#991b1b" roughness={0.5} />
        </mesh>
      </group>

      {/* East Admin Wing Red Architectural Fins (Courtyard Facade) */}
      <group name="admin-architectural-fins">
        {[-10, -5, 5, 10].map((zPos, idx) => (
          <mesh key={`admin-fin-${idx}`} position={[16.05, 1.3, zPos]} castShadow>
            <boxGeometry args={[0.25, 2.4, 0.35]} />
            <meshStandardMaterial color="#991b1b" roughness={0.5} />
          </mesh>
        ))}
      </group>

      {/* ======================================================== */}
      {/* STRUCTURAL VERANDA COLUMNS (MazeMap Architectural Pillars) */}
      {/* ======================================================== */}
      <group name="veranda-pillars">
        {[
          // West Veranda Pillars
          [-12.65, 0.9, -10], [-12.65, 0.9, -5], [-12.65, 0.9, 0], [-12.65, 0.9, 5], [-12.65, 0.9, 10],
          // East Veranda Pillars
          [12.65, 0.9, -10], [12.65, 0.9, -5], [12.65, 0.9, 0], [12.65, 0.9, 5], [12.65, 0.9, 10],
          // North Veranda Pillars
          [-10, 0.9, -12.65], [-5, 0.9, -12.65], [0, 0.9, -12.65], [5, 0.9, -12.65], [10, 0.9, -12.65],
          // South Veranda Pillars
          [-10, 0.9, 12.65], [-5, 0.9, 12.65], [0, 0.9, 12.65], [5, 0.9, 12.65], [10, 0.9, 12.65],
        ].map(([px, py, pz], pIdx) => (
          <mesh key={`col-${pIdx}`} position={[px, py, pz]} castShadow receiveShadow>
            <cylinderGeometry args={[0.18, 0.18, 1.6, 16]} />
            <meshStandardMaterial
              color={isDark ? '#475569' : '#e2e8f0'}
              roughness={0.5}
            />
          </mesh>
        ))}
      </group>


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
