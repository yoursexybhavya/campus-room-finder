import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraController } from './CameraController';
import { CampusTerrain } from './CampusTerrain';
import { GroundFloor } from './GroundFloor';
import { FirstFloor } from './FirstFloor';
import { RoutePathMesh } from './RoutePathMesh';
import { ActiveRoomBeacon } from './ActiveRoomBeacon';
import { PeerAvatarsLayer } from './PeerAvatarsLayer';
import { CosmicBackground } from './CosmicBackground';
import { useThemeStore } from '../../stores/useThemeStore';

interface CampusSceneProps {
  className?: string;
}

export const CampusScene: React.FC<CampusSceneProps> = ({ className = 'w-full h-full' }) => {
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  const bgColor = isDark ? '#090d16' : '#f1f5f9';
  const ambientIntensity = isDark ? 0.7 : 0.85;
  const directionalIntensity = isDark ? 1.3 : 1.45;
  const hemiSkyColor = isDark ? '#93c5fd' : '#ffffff';
  const hemiGroundColor = isDark ? '#1e293b' : '#cbd5e1';

  return (
    <div className={className} data-testid="campus-scene-container">
      <Canvas
        camera={{ position: [34, 26, 36], fov: 48, near: 0.1, far: 300 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        className="w-full h-full"
      >
        <color attach="background" args={[bgColor]} />
        <fog attach="fog" args={[bgColor, 50, 180]} />

        {/* Ambient & Directional Lighting Rig */}
        <ambientLight intensity={ambientIntensity} />
        <directionalLight
          position={[25, 45, 20]}
          intensity={directionalIntensity}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={120}
          shadow-camera-left={-40}
          shadow-camera-right={40}
          shadow-camera-top={40}
          shadow-camera-bottom={-40}
        />
        <hemisphereLight args={[hemiSkyColor, hemiGroundColor, 0.5]} />

        <Suspense fallback={null}>
          <CosmicBackground />
          <CameraController />
          <CampusTerrain />
          <GroundFloor />
          <FirstFloor />
          <RoutePathMesh />
          <ActiveRoomBeacon />
          <PeerAvatarsLayer />
        </Suspense>
      </Canvas>
    </div>
  );
};
