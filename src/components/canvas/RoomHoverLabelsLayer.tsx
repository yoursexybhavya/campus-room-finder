import React, { useMemo, useState } from 'react';
import * as THREE from 'three';
import { Billboard, Text } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import { useCampusStore } from '../../stores/useCampusStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { campusRooms } from '../../data/campusRooms';
import { CampusRoom } from '../../types/campus';
import { isPointOccludedByFirstFloor } from '../../utils/floorOcclusion';

// Canvas texture cache for category badges
const roomTextureCache = new Map<string, THREE.CanvasTexture>();

function getRoomCategoryTexture(type: CampusRoom['type'], isDark: boolean): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const cacheKey = `${type}_${isDark ? 'dark' : 'light'}`;
  if (roomTextureCache.has(cacheKey)) {
    return roomTextureCache.get(cacheKey)!;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Category accent colors matching MazeMap & UNIPATH aesthetics
    let bgColor = '#0284c7'; // Lecture Theater: Sky / Indigo
    if (type === 'lab') bgColor = '#059669'; // Emerald Green
    else if (type === 'library') bgColor = '#d97706'; // Amber / Bronze
    else if (type === 'admin') bgColor = '#7c3aed'; // Deep Violet
    else if (type === 'faculty') bgColor = '#2563eb'; // Royal Blue

    ctx.clearRect(0, 0, 128, 128);
    const radius = 26;

    // Draw rounded badge rectangle with subtle border
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(8, 8, 112, 112, radius);
    } else {
      ctx.rect(8, 8, 112, 112);
    }
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.9)';
    ctx.stroke();

    // Draw clean vector icons inside badge
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (type === 'lecture_theater' || type === 'seminar_hall') {
      // Podium / Tiered Auditorium Rows
      ctx.lineWidth = 6;
      ctx.strokeRect(34, 28, 60, 42); // Projector screen
      ctx.beginPath();
      // Tiered lecture seats
      ctx.arc(64, 88, 30, Math.PI * 1.15, Math.PI * 1.85, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(64, 98, 42, Math.PI * 1.2, Math.PI * 1.8, false);
      ctx.stroke();
    } else if (type === 'lab') {
      // Workstation / Computer Screen
      ctx.lineWidth = 7;
      ctx.strokeRect(26, 26, 76, 54); // Monitor frame
      ctx.beginPath();
      ctx.moveTo(64, 80);
      ctx.lineTo(64, 98);
      ctx.moveTo(44, 98);
      ctx.lineTo(84, 98);
      ctx.stroke();
      // Screen power indicator / prompt
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(36, 42, 16, 6);
    } else if (type === 'library') {
      // Open Book with pages
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(64, 38);
      ctx.lineTo(64, 92);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(64, 38);
      ctx.bezierCurveTo(52, 30, 36, 32, 24, 36);
      ctx.lineTo(24, 88);
      ctx.bezierCurveTo(36, 84, 52, 82, 64, 90);
      ctx.bezierCurveTo(76, 82, 92, 84, 104, 88);
      ctx.lineTo(104, 36);
      ctx.bezierCurveTo(92, 32, 76, 30, 64, 38);
      ctx.stroke();
    } else if (type === 'admin') {
      // Classical Portico / Dean Building
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(24, 46);
      ctx.lineTo(64, 24);
      ctx.lineTo(104, 46);
      ctx.closePath();
      ctx.fill();
      // Pillars
      ctx.fillRect(32, 50, 10, 42);
      ctx.fillRect(52, 50, 10, 42);
      ctx.fillRect(66, 50, 10, 42);
      ctx.fillRect(86, 50, 10, 42);
      // Base plinth
      ctx.fillRect(20, 92, 88, 8);
    } else {
      // Faculty / Academic Cap
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(64, 30);
      ctx.lineTo(104, 50);
      ctx.lineTo(64, 70);
      ctx.lineTo(24, 50);
      ctx.closePath();
      ctx.fill();
      // Cap skullcap
      ctx.beginPath();
      ctx.arc(64, 60, 24, 0, Math.PI, false);
      ctx.stroke();
      // Tassel
      ctx.beginPath();
      ctx.moveTo(96, 54);
      ctx.lineTo(96, 86);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    roomTextureCache.set(cacheKey, texture);
    return texture;
  } catch {
    return null;
  }
}

// Single Room Hover Label with Billboard, Icon Badge, and Crisp Room Code
const SingleRoomHoverLabel: React.FC<{
  room: CampusRoom;
  actualY: number;
  isSelected: boolean;
  isHovered: boolean;
  isDark: boolean;
  activeFloorFilter: string;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}> = ({ room, actualY, isSelected, isHovered, isDark, activeFloorFilter, onSelect, onHover }) => {
  const groupRef = React.useRef<THREE.Group>(null);
  const [rx, , rz] = room.position;
  const texture = useMemo(() => getRoomCategoryTexture(room.type, isDark), [room.type, isDark]);

  useFrame(({ camera }) => {
    if (!groupRef.current) return;
    if (activeFloorFilter === 'ground') {
      groupRef.current.visible = room.floor === 'ground';
      return;
    }
    if (activeFloorFilter === 'first') {
      groupRef.current.visible = room.floor === 'first';
      return;
    }
    // 'all' mode:
    if (room.floor === 'ground') {
      if (isSelected || isHovered) {
        groupRef.current.visible = true;
      } else {
        const camY = camera.position.y;
        if (camY > 4.13) {
          const occluded = isPointOccludedByFirstFloor(
            room.position,
            [camera.position.x, camY, camera.position.z],
            4.13
          );
          groupRef.current.visible = !occluded;
        } else {
          groupRef.current.visible = true;
        }
      }
    } else {
      groupRef.current.visible = true;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    onSelect(room.id);
  };

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    onHover(room.id);
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    onHover(null);
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'auto';
    }
  };

  const scale = isSelected ? 1.25 : isHovered ? 1.15 : 1.0;

  return (
    <group
      ref={groupRef}
      position={[rx, actualY, rz]}
      scale={[scale, scale, scale]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <Billboard follow={true}>
        {/* 1. Category / Amenity Icon Badge */}
        {texture && (
          <mesh position={[0, 0.45, 0]}>
            <planeGeometry args={[0.85, 0.85]} />
            <meshBasicMaterial
              map={texture}
              transparent
              depthTest={true}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {/* Selected glowing ring halo */}
        {isSelected && (
          <mesh position={[0, 0.45, -0.02]}>
            <planeGeometry args={[1.1, 1.1]} />
            <meshBasicMaterial
              color="#00f0ff"
              transparent
              opacity={0.8}
              depthTest={true}
              depthWrite={false}
            />
          </mesh>
        )}

        {/* 2. Room Code Text (MazeMap style e.g. "LT-9", "PC-LAB", "110") */}
        <Text
          position={[0, -0.16, 0]}
          fontSize={0.34}
          color={isSelected ? '#00f0ff' : isDark ? '#f8fafc' : '#0f172a'}
          outlineWidth={0.045}
          outlineColor={isSelected ? '#082f49' : isDark ? '#020617' : '#ffffff'}
          anchorX="center"
          anchorY="top"
        >
          {room.code || room.id}
        </Text>

        {/* 3. Sub-Label (Room Name on hover or when selected) */}
        {(isSelected || isHovered) && (
          <Text
            position={[0, -0.56, 0]}
            fontSize={0.22}
            color={isSelected ? '#38bdf8' : isDark ? '#cbd5e1' : '#334155'}
            outlineWidth={0.035}
            outlineColor={isDark ? '#020617' : '#ffffff'}
            anchorX="center"
            anchorY="top"
          >
            {room.name}
          </Text>
        )}
      </Billboard>
    </group>
  );
};

export const RoomHoverLabelsLayer: React.FC = () => {
  const activeFloorFilter = useCampusStore((state) => state.activeFloorFilter);
  const selectedRoomId = useCampusStore((state) => state.selectedRoomId);
  const hoveredRoomId = useCampusStore((state) => state.hoveredRoomId);
  const selectRoom = useCampusStore((state) => state.selectRoom);
  const setHoveredRoom = useCampusStore((state) => state.setHoveredRoom);
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  // Filter rooms strictly floor-aware to guarantee ZERO overlap or collapse through first-floor slabs
  const visibleRooms = useMemo(() => {
    return campusRooms.filter((room) => {
      // 1. Strict floor isolation
      if (activeFloorFilter === 'ground') return room.floor === 'ground';
      if (activeFloorFilter === 'first') return room.floor === 'first';
      return true; // 'all' mode: all rooms mounted, per-frame ray-slab occlusion dynamically handled
    });
  }, [activeFloorFilter]);

  return (
    <group name="room-hover-labels-layer">
      {visibleRooms.map((room) => {
        // Ground floor rooms sit inside GF volume (1.45m), First floor rooms sit inside FF volume (5.25m)
        const actualY = room.floor === 'first' ? 5.25 : 1.45;
        const isSelected = selectedRoomId === room.id;
        const isHovered = hoveredRoomId === room.id;

        return (
          <SingleRoomHoverLabel
            key={`hover-label-${room.id}`}
            room={room}
            actualY={actualY}
            isSelected={isSelected}
            isHovered={isHovered}
            isDark={isDark}
            activeFloorFilter={activeFloorFilter}
            onSelect={selectRoom}
            onHover={setHoveredRoom}
          />
        );
      })}
    </group>
  );
};
