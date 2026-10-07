import React, { useRef } from 'react';
import * as THREE from 'three';
import { Edges, Html } from '@react-three/drei';
import { CampusRoom, FloorFilter } from '../../types/campus';
import { useCampusStore } from '../../stores/useCampusStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { useNodePhysics } from '../../services/physics/antiGravityEngine';

interface RoomNodeProps {
  room: CampusRoom;
  isSelected: boolean;
  isHovered: boolean;
  floorFilter: FloorFilter;
}

export const RoomNode: React.FC<RoomNodeProps> = ({
  room,
  isSelected,
  isHovered,
  floorFilter,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const selectRoom = useCampusStore((state) => state.selectRoom);
  const setHoveredRoom = useCampusStore((state) => state.setHoveredRoom);
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  // Hook into Anti-Gravity Harmonic Physics
  useNodePhysics(
    {
      id: room.id,
      basePosition: room.position,
      mass: 0.9 + ((room.capacity ?? 60) / 150) * 0.3, // Capacity-weighted mass (0.9 to 1.2kg)
    },
    groupRef
  );

  // Determine visibility / opacity based on floor filter
  const isFloorActive =
    floorFilter === 'all' ||
    (floorFilter === 'ground' && room.floor === 'ground') ||
    (floorFilter === 'first' && room.floor === 'first');

  const opacity = isFloorActive ? (isSelected ? 0.95 : 0.8) : 0.15;
  const isDimmed = !isFloorActive;

  const handleClick = (e: any) => {
    e.stopPropagation();
    // If clicking a dimmed room on an inactive floor, activate that floor
    if (!isFloorActive) {
      useCampusStore.getState().setFloorFilter(room.floor);
    }
    selectRoom(room.id);
  };

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHoveredRoom(room.id);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setHoveredRoom(null);
    document.body.style.cursor = 'auto';
  };

  // Base dimensions and color
  const [w, h, d] = room.dimensions;
  const scale = isHovered ? 1.03 : 1.0;

  return (
    <group
      ref={groupRef}
      position={room.position}
      scale={[scale, scale, scale]}
      userData={{ roomId: room.id, roomCode: room.code, roomName: room.name, floor: room.floor }}
    >
      <mesh
        ref={meshRef}
        name={`room-${room.id}`}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={room.color}
          roughness={0.3}
          metalness={0.2}
          transparent={true}
          opacity={opacity}
          emissive={isSelected ? room.color : isHovered ? '#38bdf8' : '#000000'}
          emissiveIntensity={isSelected ? 0.6 : isHovered ? 0.35 : 0.0}
        />
        {/* Outlines for high visibility */}
        <Edges
          scale={1.0}
          threshold={15}
          color={isSelected ? '#38bdf8' : isHovered ? (isDark ? '#ffffff' : '#0284c7') : (isDark ? '#1e293b' : '#94a3b8')}
        />
      </mesh>

      {/* Floating 2D badge label above the room */}
      {isFloorActive && (
        <Html
          position={[0, h / 2 + 0.4, 0]}
          center
          distanceFactor={22}
          className="pointer-events-none select-none transition-all duration-200"
        >
          <div
            className={`px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap shadow-lg flex items-center gap-1 border backdrop-blur-md transition-all ${
              isSelected
                ? 'bg-cyan-500 text-slate-950 border-cyan-300 scale-110 shadow-cyan-500/50'
                : isHovered
                ? isDark
                  ? 'bg-slate-800 text-cyan-300 border-cyan-400 scale-105'
                  : 'bg-white text-cyan-600 border-cyan-400 scale-105 shadow-md shadow-cyan-500/10'
                : isDark
                ? 'bg-slate-900/90 text-slate-200 border-slate-700/80'
                : 'bg-white/95 text-slate-800 border-slate-200/90 shadow-slate-300/50'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full inline-block shadow-sm"
              style={{ backgroundColor: room.color }}
            />
            <span className="tracking-wide">{room.code}</span>
            {isHovered && (
              <span
                className={`text-[10px] font-normal pl-1 border-l ${
                  isDark ? 'text-cyan-200 border-slate-600' : 'text-cyan-700 border-slate-200'
                }`}
              >
                {room.name}
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
