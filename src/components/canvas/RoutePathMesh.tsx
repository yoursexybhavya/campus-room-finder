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
  const p1 = useMemo(() => new THREE.Vector3(...start), [start]);
  const p2 = useMemo(() => new THREE.Vector3(...end), [end]);
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
      // Flowing glow pulse along path segments
      const t = state.clock.getElapsedTime() * 3.5 - index * 0.4;
      const pulse = 0.5 + 0.5 * Math.sin(t);
      matRef.current.emissiveIntensity = 0.6 + pulse * 0.8;
    }
  });

  return (
    <group position={midpoint.toArray()} quaternion={orientation}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.12, length, 8]} />
        <meshStandardMaterial
          ref={matRef}
          color="#38bdf8"
          emissive="#0284c7"
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.8}
          transparent={true}
          opacity={0.9}
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

  return (
    <group name="route-path-mesh" >
      {/* Waypoint Vertex Orbs */}
      {navigationPath.map((pt, idx) => (
        <mesh key={`pt-${idx}`} position={pt}>
          <sphereGeometry args={[0.22, 12, 12]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#38bdf8"
            emissiveIntensity={1.2}
            roughness={0.1}
          />
        </mesh>
      ))}

      {/* Path Cylinders between adjacent waypoints */}
      {navigationPath.slice(0, -1).map((start, idx) => {
        const end = navigationPath[idx + 1];
        return <PathSegment key={`seg-${idx}`} start={start} end={end} index={idx} />;
      })}
    </group>
  );
};
