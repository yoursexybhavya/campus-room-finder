import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useEasterEggStore } from '../../stores/useEasterEggStore';
import { useThemeStore } from '../../stores/useThemeStore';

export interface CosmicBackgroundProps {
  forceActive?: boolean;
  starCount?: number;
}

export const CosmicBackground: React.FC<CosmicBackgroundProps> = ({
  forceActive,
  starCount = 1200,
}) => {
  const storeIsActive = useEasterEggStore((state) => state.isActive);
  const storeStarfieldActive = useEasterEggStore((state) => state.isStarfieldActive);
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  const isActive = forceActive !== undefined ? forceActive : storeIsActive;
  const isStarfieldActive = forceActive !== undefined ? forceActive : storeStarfieldActive;

  const { scene } = useThree();

  const starPointsRef = useRef<THREE.Points>(null);
  const starMaterialRef = useRef<THREE.PointsMaterial>(null);
  const nebulaPointsRef = useRef<THREE.Points>(null);
  const nebulaMaterialRef = useRef<THREE.PointsMaterial>(null);
  const starGroupRef = useRef<THREE.Group>(null);
  const nebulaLight1Ref = useRef<THREE.PointLight>(null);
  const nebulaLight2Ref = useRef<THREE.PointLight>(null);

  // Cached color vectors for smooth lerping
  const defaultBg = useMemo(() => new THREE.Color(isDark ? '#090d16' : '#f1f5f9'), [isDark]);
  const cosmicBg = useMemo(() => new THREE.Color('#050518'), []);
  const defaultFog = useMemo(() => new THREE.Color(isDark ? '#090d16' : '#f1f5f9'), [isDark]);
  const cosmicFog = useMemo(() => new THREE.Color('#08061e'), []);

  const currentOpacity = useRef<number>(0);
  const currentNebulaIntensity = useRef<number>(0);

  // 1. Procedural Spherical Starfield Geometry
  const starGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = starCount;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const palette = [
      new THREE.Color('#ffffff'), // 60% diamond white
      new THREE.Color('#93c5fd'), // 20% starlight cyan
      new THREE.Color('#c084fc'), // 15% cosmic violet
      new THREE.Color('#fde047'), // 5% stellar gold
    ];

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 90.0 + Math.random() * 120.0; // Shell radius 90m to 210m

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = Math.max(r * Math.cos(phi), -20.0); // Bias sky hemisphere
      const z = r * Math.sin(phi) * Math.sin(theta);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const randColor = Math.random();
      let picked = palette[0];
      if (randColor > 0.95) picked = palette[3];
      else if (randColor > 0.8) picked = palette[2];
      else if (randColor > 0.6) picked = palette[1];

      colors[i * 3] = picked.r;
      colors[i * 3 + 1] = picked.g;
      colors[i * 3 + 2] = picked.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [starCount]);

  // 2. Procedural Nebulae Dust Cloud Geometry
  const nebulaGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 180;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const nebulaColors = [
      new THREE.Color('#8b5cf6'), // Violet nebula
      new THREE.Color('#06b6d4'), // Cyan glow
      new THREE.Color('#ec4899'), // Magenta stardust
    ];

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * 2.0 * Math.PI;
      const r = 65.0 + Math.random() * 85.0;
      const x = r * Math.cos(theta);
      const y = 30.0 + (Math.random() - 0.5) * 50.0;
      const z = r * Math.sin(theta);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const picked = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
      colors[i * 3] = picked.r;
      colors[i * 3 + 1] = picked.g;
      colors[i * 3 + 2] = picked.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  // Memory cleanup
  useEffect(() => {
    return () => {
      starGeometry.dispose();
      nebulaGeometry.dispose();
    };
  }, [starGeometry, nebulaGeometry]);

  useFrame((state, delta) => {
    const dt = Math.min(Math.max(delta, 0.001), 0.1);
    const time = state.clock?.getElapsedTime ? state.clock.getElapsedTime() : 0;

    // 1. Scene Background Color Lerp
    const targetBg = isActive ? cosmicBg : defaultBg;
    if (scene && scene.background && scene.background instanceof THREE.Color) {
      scene.background.lerp(targetBg, dt * 3.5);
    }

    // 2. Scene Fog Color Lerp
    const targetFog = isActive ? cosmicFog : defaultFog;
    if (scene && scene.fog && scene.fog instanceof THREE.Fog) {
      scene.fog.color.lerp(targetFog, dt * 3.5);
    }

    // 3. Starfield & Nebula Particles Opacity Lerp
    const targetOpacity = isStarfieldActive ? (isActive ? 1.0 : 0.7) : 0.0;
    currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, targetOpacity, dt * 3.5);

    if (starMaterialRef.current) {
      starMaterialRef.current.opacity = currentOpacity.current;
      starMaterialRef.current.visible = currentOpacity.current > 0.005;
    }

    if (nebulaMaterialRef.current) {
      nebulaMaterialRef.current.opacity = currentOpacity.current * 0.45;
      nebulaMaterialRef.current.visible = currentOpacity.current > 0.005;
    }

    // 4. Subtle Celestial Rotation
    if (starGroupRef.current && currentOpacity.current > 0.005) {
      starGroupRef.current.rotation.y += dt * 0.015;
      starGroupRef.current.rotation.x += dt * 0.005;
    }

    // 5. Dynamic Cosmic Point Lights Modulation
    const targetLightIntensity = isActive ? 1.4 : 0.0;
    currentNebulaIntensity.current = THREE.MathUtils.lerp(
      currentNebulaIntensity.current,
      targetLightIntensity,
      dt * 3.0
    );

    if (nebulaLight1Ref.current) {
      const pulse1 = 1.0 + 0.25 * Math.sin(time * 1.8);
      nebulaLight1Ref.current.intensity = currentNebulaIntensity.current * pulse1;
    }
    if (nebulaLight2Ref.current) {
      const pulse2 = 1.0 + 0.25 * Math.cos(time * 2.2);
      nebulaLight2Ref.current.intensity = currentNebulaIntensity.current * pulse2;
    }
  });

  return (
    <group name="cosmic-background" >
      {/* Nebulae Point Lighting Rig */}
      <pointLight
        ref={nebulaLight1Ref}
        position={[-40, 50, -40]}
        color="#8b5cf6"
        intensity={0}
        distance={180}
        decay={2}
      />
      <pointLight
        ref={nebulaLight2Ref}
        position={[40, 60, 40]}
        color="#06b6d4"
        intensity={0}
        distance={180}
        decay={2}
      />

      {/* Rotating Celestial Starfield & Nebulae Particles */}
      <group ref={starGroupRef}>
        <points ref={starPointsRef} geometry={starGeometry}>
          <pointsMaterial
            ref={starMaterialRef}
            size={1.1}
            vertexColors
            transparent
            opacity={0}
            depthWrite={false}
            sizeAttenuation
          />
        </points>

        <points ref={nebulaPointsRef} geometry={nebulaGeometry}>
          <pointsMaterial
            ref={nebulaMaterialRef}
            size={4.0}
            vertexColors
            transparent
            opacity={0}
            depthWrite={false}
            sizeAttenuation
          />
        </points>
      </group>
    </group>
  );
};
