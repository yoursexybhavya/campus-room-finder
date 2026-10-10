import React, { useMemo } from 'react';
import * as THREE from 'three';
import { campusRooms } from '../../data/campusRooms';
import { useCampusStore } from '../../stores/useCampusStore';
import { Html } from '@react-three/drei';

export const RoomInteractivityLayer: React.FC = () => {
  const selectedRoomId = useCampusStore((state) => state.selectedRoomId);
  const hoveredRoomId = useCampusStore((state) => state.hoveredRoomId);
  const activeFloorFilter = useCampusStore((state) => state.activeFloorFilter);
  const selectRoom = useCampusStore((state) => state.selectRoom);
  const setHoveredRoom = useCampusStore((state) => state.setHoveredRoom);

  // Filter rooms based on active floor filter
  const visibleRooms = useMemo(() => {
    return campusRooms.filter((room) => {
      if (activeFloorFilter === 'ground') return room.floor === 'ground';
      if (activeFloorFilter === 'first') return room.floor === 'first';
      return true; // 'all'
    });
  }, [activeFloorFilter]);

  return (
    <group name="room-interactivity-layer">
      {visibleRooms.map((room) => {
        const isSelected = selectedRoomId === room.id;
        const isHovered = hoveredRoomId === room.id;
        const [w, , d] = room.dimensions;
        const [rx, , rz] = room.position;
        // Floor elevation matching Blender GLB finished floors (GF: 0.22m, FF: 4.15m)
        const floorY = room.floor === 'ground' ? 0.22 : 4.15;

        return (
          <group key={room.id} position={[rx, floorY, rz]}>
            {/* Invisible raycasting hit-box for clean, responsive click & hover detection */}
            <mesh
              position={[0, 0.15, 0]}
              onClick={(e) => {
                e.stopPropagation();
                selectRoom(room.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredRoom(room.id);
                if (typeof document !== 'undefined') {
                  document.body.style.cursor = 'pointer';
                }
              }}
              onPointerOut={() => {
                setHoveredRoom(null);
                if (typeof document !== 'undefined') {
                  document.body.style.cursor = 'auto';
                }
              }}
            >
              <boxGeometry args={[w, 0.3, d]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {/* Glowing floor slab highlight overlay when hovered or selected */}
            {(isSelected || isHovered) && (
              <group position={[0, 0.02, 0]}>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[w * 0.98, d * 0.98]} />
                  <meshBasicMaterial
                    color={isSelected ? '#00f0ff' : '#a855f7'}
                    transparent
                    opacity={isSelected ? 0.45 : 0.22}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                  />
                </mesh>

                {/* Sharp edge highlight outline when selected */}
                {isSelected && (
                  <lineSegments position={[0, 0.01, 0]}>
                    <edgesGeometry args={[new THREE.BoxGeometry(w * 0.98, 0.04, d * 0.98)]} />
                    <lineBasicMaterial color="#00f0ff" linewidth={2} />
                  </lineSegments>
                )}

                {/* Sleek billboard room code badge for hovered / selected room */}
                <Html
                  position={[0, room.floor === 'ground' ? 1.2 : 1.4, 0]}
                  center
                  distanceFactor={18}
                  className="pointer-events-none select-none"
                >
                  <div className="bg-slate-950/90 text-cyan-300 border border-cyan-400/50 px-2 py-0.5 rounded shadow-lg text-[11px] font-mono whitespace-nowrap backdrop-blur-sm">
                    {room.code || room.id}: {room.name}
                  </div>
                </Html>
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
};
