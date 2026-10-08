import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useCampusStore } from '../../stores/useCampusStore';
import { WAYPOINTS_MAP } from '../../data/waypoints';
import { campusRooms } from '../../data/campusRooms';

export const UserLocationDot: React.FC = () => {
  const userOriginId = useCampusStore((state) => state.userOriginId);
  const isNavigating = useCampusStore((state) => state.isNavigating);
  const currentStepIndex = useCampusStore((state) => state.currentStepIndex);
  const navigationPath = useCampusStore((state) => state.navigationPath);
  const activeFloorFilter = useCampusStore((state) => state.activeFloorFilter);
  const liveGpsCoords = useCampusStore((state) => state.liveGpsCoords);
  const isGpsActive = useCampusStore((state) => state.isGpsActive);

  const groupRef = useRef<THREE.Group>(null);
  const pulseRingRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Group>(null);

  // Compute base coordinates of origin waypoint or room
  const basePosition = useMemo((): [number, number, number] => {
    // If live GPS tracking is enabled, use real device coordinates
    if (isGpsActive && liveGpsCoords) {
      return liveGpsCoords;
    }

    // If actively navigating and following path steps
    if (isNavigating && navigationPath && navigationPath.length > 0) {
      const idx = Math.min(currentStepIndex, navigationPath.length - 1);
      return navigationPath[idx];
    }
    // Otherwise, use userOriginId
    const wp = WAYPOINTS_MAP.get(userOriginId);
    if (wp) return [wp.coords[0], wp.coords[1] + 0.15, wp.coords[2]];
    const room = campusRooms.find((r) => r.id === userOriginId);
    if (room) return [room.position[0], room.position[1] + 0.15, room.position[2]];
    return [0, 0.25, 36]; // Default to Main Entrance Gate
  }, [userOriginId, isNavigating, navigationPath, currentStepIndex, isGpsActive, liveGpsCoords]);

  // Determine floor of current position
  const isGround = basePosition[1] < 2.2;

  const isVisible =
    activeFloorFilter === 'all' ||
    (activeFloorFilter === 'ground' && isGround) ||
    (activeFloorFilter === 'first' && !isGround);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Concentric expanding pulse ring
    if (pulseRingRef.current) {
      const scale = 1.0 + (t % 1.5) * 1.6;
      pulseRingRef.current.scale.set(scale, scale, 1);
      const mat = pulseRingRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = Math.max(0, 0.75 - (t % 1.5) * 0.5);
      }
    }

    // Gentle vertical breathing
    if (beamRef.current) {
      beamRef.current.position.y = 0.4 + Math.sin(t * 3) * 0.05;
    }

    // Smooth position lerp if moving along path
    if (groupRef.current) {
      groupRef.current.position.lerp(new THREE.Vector3(...basePosition), 0.15);
    }
  });

  if (!isVisible) return null;

  return (
    <group ref={groupRef} position={basePosition} name="user-location-marker">
      {/* 1. Pulsing Ground Accuracy Ring (Google Maps Style) */}
      <mesh
        ref={pulseRingRef}
        position={[0, 0.04, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.5, 0.9, 32]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 2. Inner Solid Disc */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.42, 32]} />
        <meshBasicMaterial color="#0284c7" transparent opacity={0.35} depthWrite={false} />
      </mesh>

      {/* 3. Raised Blue Location Sphere with White Outer Ring */}
      <group ref={beamRef} position={[0, 0.4, 0]}>
        {/* White Border Sphere */}
        <mesh castShadow>
          <sphereGeometry args={[0.3, 24, 24]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} />
        </mesh>
        {/* Core Glowing Blue Dot */}
        <mesh>
          <sphereGeometry args={[0.24, 24, 24]} />
          <meshStandardMaterial
            color="#0284c7"
            emissive="#38bdf8"
            emissiveIntensity={1.2}
            roughness={0.1}
          />
        </mesh>
      </group>

      {/* 4. Billboarding "You are here" tag */}
      <Html
        position={[0, 1.1, 0]}
        center
        distanceFactor={22}
        zIndexRange={[10, 0]}
        className="pointer-events-none select-none transition-all duration-200"
      >
        <div className="flex flex-col items-center">
          <div className="bg-sky-500 text-white font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-lg border border-sky-300 flex items-center gap-1 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            <span>You are here</span>
          </div>
          <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-sky-500 -mt-px" />
        </div>
      </Html>
    </group>
  );
};
