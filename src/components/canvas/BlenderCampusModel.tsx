import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useCampusStore } from '../../stores/useCampusStore';
import { useThemeStore } from '../../stores/useThemeStore';

export const BLENDER_MODEL_PATH = '/models/department_of_technology_floor1.glb';

export const BlenderCampusModelContent: React.FC = () => {
  const activeFloorFilter = useCampusStore((state) => state.activeFloorFilter);
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  // Load procedural GLB container extracted from department_of_technology_model 2.zip
  const { scene } = useGLTF(BLENDER_MODEL_PATH);

  // Clone scene so materials can be safely tuned without mutating cached asset
  const clonedScene = useMemo(() => {
    const cloned = scene.clone(true);

    cloned.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const name = child.name || '';
        // Enhance cutaway walls with soft architectural materials
        if (name.includes('Walls_3D') || name.includes('Wall')) {
          child.material = new THREE.MeshStandardMaterial({
            color: isDark ? '#334155' : '#f8fafc',
            roughness: 0.5,
            metalness: 0.05,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
          });
        } else if (name.includes('Door_Swing_Arcs')) {
          // Vibrant CAD swing arc color matching preview_render_0001.png
          child.material = new THREE.MeshBasicMaterial({
            color: '#f97316',
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
          });
        } else if (name.includes('Door_Thresholds')) {
          // Warm timber threshold
          child.material = new THREE.MeshStandardMaterial({
            color: isDark ? '#78350f' : '#b45309',
            roughness: 0.4,
          });
        } else if (name.includes('Window_Glass_Panes')) {
          // Architectural double glazing
          child.material = new THREE.MeshPhysicalMaterial({
            color: '#38bdf8',
            transparent: true,
            opacity: 0.45,
            roughness: 0.1,
            transmission: 0.6,
            thickness: 0.5,
          });
        }
      }
    });

    return cloned;
  }, [scene, isDark]);

  const isVisible = activeFloorFilter !== 'ground';
  const isAllMode = activeFloorFilter === 'all';
  const yOffset = isAllMode ? 7.5 : 0;

  if (!isVisible) return null;

  return (
    <group
      name="blender-campus-model"
      position={[0, yOffset, 0]}
      scale={[0.42, 0.42, 0.42]}
      rotation={[0, 0, 0]}
    >
      <primitive object={clonedScene} />
    </group>
  );
};

// Safe wrapper with error fallback
export const BlenderCampusModel: React.FC = () => {
  return (
    <React.Suspense fallback={null}>
      <BlenderCampusModelContent />
    </React.Suspense>
  );
};

// Preload GLB for instant rendering
if (typeof window !== 'undefined') {
  try {
    useGLTF.preload(BLENDER_MODEL_PATH);
  } catch {
    // Ignore preload in test environments
  }
}
