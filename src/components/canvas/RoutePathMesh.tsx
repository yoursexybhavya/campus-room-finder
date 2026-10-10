import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCampusStore } from '../../stores/useCampusStore';

interface SegmentProps {
  start: [number, number, number];
  end: [number, number, number];
  index: number;
}

const PathSegment: React.FC<SegmentProps> = ({ start, end, index }) => {
  // Elevate slightly above floor tiles (+0.12m) to prevent z-fighting with slabs
  const p1 = useMemo(() => new THREE.Vector3(start[0], start[1] + 0.12, start[2]), [start]);
  const p2 = useMemo(() => new THREE.Vector3(end[0], end[1] + 0.12, end[2]), [end]);
  const length = useMemo(() => p1.distanceTo(p2), [p1, p2]);
  const midpoint = useMemo(() => p1.clone().add(p2).multiplyScalar(0.5), [p1, p2]);

  const orientation = useMemo(() => {
    const dir = p2.clone().sub(p1).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion();
    if (Math.abs(dir.y) > 0.999) {
      quat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    } else {
      quat.setFromUnitVectors(up, dir);
    }
    return quat;
  }, [p1, p2]);

  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (matRef.current) {
      // Flowing pulsating glow wave along the path in direction of walking
      const t = state.clock.getElapsedTime() * 4.0 - index * 0.45;
      const pulse = 0.5 + 0.5 * Math.sin(t);
      matRef.current.emissiveIntensity = 0.8 + pulse * 1.2;
    }
  });

  return (
    <group position={midpoint.toArray()} quaternion={orientation}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.14, 0.14, length, 12]} />
        <meshStandardMaterial
          ref={matRef}
          color="#38bdf8"
          emissive="#0284c7"
          emissiveIntensity={1.0}
          roughness={0.15}
          metalness={0.7}
          transparent={true}
          opacity={0.92}
        />
      </mesh>
    </group>
  );
};

export const RoutePathMesh: React.FC = () => {
  const navigationPath = useCampusStore((state) => state.navigationPath);

  if (!navigationPath || navigationPath.length < 2) {
    return null;
  }

  const startPt = navigationPath[0];
  const endPt = navigationPath[navigationPath.length - 1];

  return (
    <group name="route-path-mesh">
      {/* Start Waypoint Origin Ring */}
      <mesh position={[startPt[0], startPt[1] + 0.15, startPt[2]]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#10b981"
          emissiveIntensity={1.5}
          roughness={0.1}
        />
      </mesh>

      {/* Destination Target Marker Pin */}
      <mesh position={[endPt[0], endPt[1] + 0.18, endPt[2]]}>
        <sphereGeometry args={[0.42, 16, 16]} />
        <meshStandardMaterial
          color="#f43f5e"
          emissive="#f43f5e"
          emissiveIntensity={1.8}
          roughness={0.1}
        />
      </mesh>

      {/* Waypoint Vertex Orbs */}
      {navigationPath.slice(1, -1).map((pt, idx) => (
        <mesh key={`pt-${idx}`} position={[pt[0], pt[1] + 0.12, pt[2]]}>
          <sphereGeometry args={[0.2, 12, 12]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#38bdf8"
            emissiveIntensity={1.2}
            roughness={0.1}
          />
        </mesh>
      ))}

      {/* Flowing Path Cylinders between adjacent waypoints */}
      {navigationPath.slice(0, -1).map((start, idx) => {
        const end = navigationPath[idx + 1];
        return <PathSegment key={`seg-${idx}`} start={start} end={end} index={idx} />;
      })}
    </group>
  );
};
