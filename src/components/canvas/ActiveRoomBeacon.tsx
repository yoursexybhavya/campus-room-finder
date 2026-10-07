import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useTimetableStore } from '../../stores/useTimetableStore';
import { useCampusStore } from '../../stores/useCampusStore';
import { campusRooms } from '../../data/campusRooms';
import { physicsRegistry } from '../../services/physics/antiGravityEngine';

export const ActiveRoomBeacon: React.FC = () => {
  const activeSchedule = useTimetableStore((state) => state.activeSchedule);
  const selectedRoomId = useCampusStore((state) => state.selectedRoomId);
  const activeFloorFilter = useCampusStore((state) => state.activeFloorFilter);

  const groupRef = useRef<THREE.Group>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const crystalRef = useRef<THREE.Mesh>(null);

  // Target either active class room or currently inspected room
  const targetRoom =
    activeSchedule.activeRoom ||
    (selectedRoomId ? campusRooms.find((r) => r.id === selectedRoomId) || null : null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (beamRef.current) {
      const pulse = 0.75 + 0.25 * Math.sin(time * 3);
      beamRef.current.scale.set(pulse, 1, pulse);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = time * 1.2;
      const ringScale = 1.0 + 0.2 * Math.sin(time * 2.5);
      ringRef.current.scale.set(ringScale, ringScale, 1);
    }
    if (crystalRef.current) {
      crystalRef.current.rotation.y = time * 2;
      crystalRef.current.position.y = 7 + Math.sin(time * 2) * 0.5;
    }

    // Dynamically track target room's floating position if Zero-G is engaged
    if (groupRef.current && targetRoom) {
      const currentFloatingPos = physicsRegistry.getCurrentPosition(targetRoom.id);
      if (currentFloatingPos) {
        groupRef.current.position.set(
          currentFloatingPos[0],
          currentFloatingPos[1],
          currentFloatingPos[2]
        );
      } else {
        groupRef.current.position.set(
          targetRoom.position[0],
          targetRoom.position[1],
          targetRoom.position[2]
        );
      }
    }
  });

  if (!targetRoom) {
    return null;
  }

  // If the target room's floor is hidden by active floor filter, do not render beacon in empty space
  const isFloorVisible =
    activeFloorFilter === 'all' ||
    (activeFloorFilter === 'ground' && targetRoom.floor === 'ground') ||
    (activeFloorFilter === 'first' && targetRoom.floor === 'first');

  if (!isFloorVisible) {
    return null;
  }

  const [rx, ry, rz] = targetRoom.position;
  const isClassActive = activeSchedule.status === 'IN_SESSION' && activeSchedule.activeSlot?.roomId === targetRoom.id;

  return (
    <group
      ref={groupRef}
      position={[rx, ry, rz]}
      name="active-room-beacon"
      
    >
      {/* Vertical Light Column */}
      <mesh ref={beamRef} position={[0, 4.5, 0]}>
        <cylinderGeometry args={[0.35, 0.65, 8, 16, 1, true]} />
        <meshBasicMaterial
          color={isClassActive ? '#00f0ff' : '#a855f7'}
          transparent={true}
          opacity={0.45}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Rotating Concentric Ground Halo Rings */}
      <mesh
        ref={ringRef}
        position={[0, 1.2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[1.5, 2.2, 32]} />
        <meshBasicMaterial
          color={isClassActive ? '#38bdf8' : '#c084fc'}
          transparent={true}
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Pulsing Crystal Top Beacon */}
      <mesh ref={crystalRef} position={[0, 7.5, 0]}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial
          color={isClassActive ? '#38bdf8' : '#e879f9'}
          emissive={isClassActive ? '#0284c7' : '#a855f7'}
          emissiveIntensity={1.5}
          roughness={0.1}
        />
      </mesh>

      {/* Beacon 3D Billboarding Tag */}
      {isClassActive && (
        <Html
          position={[0, 8.8, 0]}
          center
          distanceFactor={20}
          zIndexRange={[10, 0]}
          className="pointer-events-none select-none"
        >
          <div className="bg-slate-950/90 text-cyan-300 border border-cyan-400 px-3 py-1 rounded-xl shadow-xl shadow-cyan-500/30 flex items-center gap-1.5 whitespace-nowrap text-xs font-bold animate-pulse backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>ACTIVE: {activeSchedule.activeSlot?.courseCode}</span>
            <span className="text-slate-400">({activeSchedule.minutesRemaining}m left)</span>
          </div>
        </Html>
      )}
    </group>
  );
};
