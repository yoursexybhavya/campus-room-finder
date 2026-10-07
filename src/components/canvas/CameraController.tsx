import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useCampusStore } from '../../stores/useCampusStore';

export const CameraController: React.FC = () => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const cameraTarget = useCampusStore((state) => state.cameraTarget);
  const viewMode = useCampusStore((state) => state.viewMode);
  const { camera } = useThree();

  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());
  const isTransitioning = useRef<boolean>(false);
  const prevTargetKey = useRef<string>('');

  // Whenever a new cameraTarget is provided, initiate smooth lerp transition
  useEffect(() => {
    if (cameraTarget) {
      const key = `${cameraTarget.position.join(',')}_${cameraTarget.lookAt.join(',')}`;
      if (key !== prevTargetKey.current) {
        prevTargetKey.current = key;
        targetPos.current.set(...cameraTarget.position);
        targetLook.current.set(...cameraTarget.lookAt);
        isTransitioning.current = true;
      }
    }
  }, [cameraTarget]);

  useFrame((_, delta) => {
    if (!cameraTarget || !controlsRef.current || !isTransitioning.current) return;

    // Smooth lerp factor based on frame delta
    const lerpSpeed = Math.min(delta * 3.5, 0.1);

    camera.position.lerp(targetPos.current, lerpSpeed);
    controlsRef.current.target.lerp(targetLook.current, lerpSpeed);
    controlsRef.current.update();

    // Finish lerping when camera reaches target proximity
    if (
      camera.position.distanceTo(targetPos.current) < 0.1 &&
      controlsRef.current.target.distanceTo(targetLook.current) < 0.1
    ) {
      camera.position.copy(targetPos.current);
      controlsRef.current.target.copy(targetLook.current);
      controlsRef.current.update();
      isTransitioning.current = false;
    }
  });

  const handleControlsStart = () => {
    // If the user manually starts orbiting or panning, immediately yield control to user
    isTransitioning.current = false;
  };

  return (
    <OrbitControls
      ref={controlsRef}
      onStart={handleControlsStart}
      enableRotate={viewMode === '3D'}
      enablePan={true}
      enableZoom={true}
      enableDamping={true}
      dampingFactor={0.06}
      minDistance={6}
      maxDistance={140}
      maxPolarAngle={viewMode === '2D' ? Math.PI : Math.PI / 2.05} // Prevent camera clipping below ground level in 3D
    />
  );
};
