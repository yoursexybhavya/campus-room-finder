import React from 'react';
import { Text } from '@react-three/drei';
import { useThemeStore } from '../../stores/useThemeStore';

export const CampusTerrain: React.FC = () => {
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  // Architectural color palette depending on theme
  const groundColor = isDark ? '#0f172a' : '#f8fafc';
  const roadColor = isDark ? '#1e293b' : '#64748b';
  const roadCurbColor = isDark ? '#334155' : '#cbd5e1';
  const plinthColor = isDark ? '#1e293b' : '#e2e8f0';

  // Courtyard Ground-Truth Palette (media_1791464704375.jpg & media_1791464704340.jpg)
  const paverColor = isDark ? '#334155' : '#f5ede6'; // Warm pinkish/cream interlocking pavers
  const paverLineColor = isDark ? '#1e293b' : '#e2d9d2';
  const walkwayColor = isDark ? '#475569' : '#e2e8f0';
  const lawnColor = isDark ? '#166534' : '#15803d'; // Lush green lawn
  const borderStoneColor = isDark ? '#334155' : '#94a3b8';
  const stagePlinthRed = '#b91c1c'; // Red fascia plinth apron
  const stageBackdropRed = '#991b1b'; // Crimson backdrop wall
  const stageFloorColor = isDark ? '#334155' : '#f8fafc';

  const porchColor = isDark ? '#334155' : '#cbd5e1';
  const porchPillars = isDark ? '#94a3b8' : '#e2e8f0';
  const canopyColor = isDark ? '#0284c7' : '#0ea5e9';

  return (
    <group name="campus-terrain-group">
      {/* Outer Ground Base Baseplate */}
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <boxGeometry args={[110, 0.1, 110]} />
        <meshStandardMaterial color={groundColor} roughness={0.95} />
      </mesh>

      {/* East & West Access Roads (from blueprint: Road 15' Wide West, Road 20' Wide East) */}
      {/* West Road */}
      <mesh position={[-36, -0.01, 0]} receiveShadow>
        <boxGeometry args={[6, 0.02, 90]} />
        <meshStandardMaterial color={roadColor} roughness={0.9} />
      </mesh>
      {/* West Road Curbs */}
      <mesh position={[-39.1, 0.01, 0]}>
        <boxGeometry args={[0.2, 0.04, 90]} />
        <meshStandardMaterial color={roadCurbColor} roughness={0.8} />
      </mesh>
      <mesh position={[-32.9, 0.01, 0]}>
        <boxGeometry args={[0.2, 0.04, 90]} />
        <meshStandardMaterial color={roadCurbColor} roughness={0.8} />
      </mesh>

      {/* East Road */}
      <mesh position={[36, -0.01, 0]} receiveShadow>
        <boxGeometry args={[8, 0.02, 90]} />
        <meshStandardMaterial color={roadColor} roughness={0.9} />
      </mesh>
      {/* East Road Curbs */}
      <mesh position={[31.9, 0.01, 0]}>
        <boxGeometry args={[0.2, 0.04, 90]} />
        <meshStandardMaterial color={roadCurbColor} roughness={0.8} />
      </mesh>
      <mesh position={[40.1, 0.01, 0]}>
        <boxGeometry args={[0.2, 0.04, 90]} />
        <meshStandardMaterial color={roadCurbColor} roughness={0.8} />
      </mesh>

      {/* South Main Entrance Driveway */}
      <mesh position={[0, -0.01, 38]} receiveShadow>
        <boxGeometry args={[50, 0.02, 10]} />
        <meshStandardMaterial color={roadColor} roughness={0.9} />
      </mesh>

      {/* Campus Main Building Plinth / Base Foundation Platform */}
      <mesh position={[0, 0.01, 0]} receiveShadow>
        <boxGeometry args={[72, 0.04, 72]} />
        <meshStandardMaterial color={plinthColor} roughness={0.8} />
      </mesh>

      {/* ======================================================== */}
      {/* AUTHENTIC JIET QUADRANGLE COURTYARD GROUND               */}
      {/* Ground-truth references:                                 */}
      │ media_1791464691868.jpg (Satellite overview & Stage tag) │
      │ media_1791464704375.jpg (1st floor view: plaza + lawns)  │
      │ media_1791464704340.jpg (Elevated Stage & JIET backdrop) │
      {/* ======================================================== */}

      {/* 1. NORTH ASSEMBLY PLAZA (z: -12.5m to -2.0m, width 25m) */}
      {/* Paved interlocking block floor for assemblies & student gatherings */}
      <mesh position={[0, 0.03, -7.25]} receiveShadow>
        <boxGeometry args={[25, 0.03, 10.5]} />
        <meshStandardMaterial color={paverColor} roughness={0.85} />
      </mesh>
      {/* Paver Interlocking Band Accent Inlays */}
      {[-11.5, -9.0, -6.5, -4.0].map((zPos, idx) => (
        <mesh key={`paver-accent-${idx}`} position={[0, 0.046, zPos]}>
          <boxGeometry args={[24.8, 0.005, 0.08]} />
          <meshStandardMaterial color={paverLineColor} roughness={0.7} />
        </mesh>
      ))}

      {/* 2. TRANSVERSE EAST-WEST WALKWAY (z: -2.0m, connects East & West verandas) */}
      <mesh position={[0, 0.04, -2.0]} receiveShadow>
        <boxGeometry args={[25, 0.02, 3.2]} />
        <meshStandardMaterial color={walkwayColor} roughness={0.65} />
      </mesh>

      {/* 3. CENTRAL AXIAL WALKWAY (x: 0, z: -0.4m to 8.5m, width 3.4m) */}
      {/* Runs straight between dual lawns directly to the JIET Stage */}
      <mesh position={[0, 0.04, 3.8]} receiveShadow>
        <boxGeometry args={[3.4, 0.02, 8.8]} />
        <meshStandardMaterial color={walkwayColor} roughness={0.65} />
      </mesh>

      {/* 4. DUAL MANICURED GREEN LAWNS */}
      {/* West Green Lawn (x: -7.95, z: 3.8, size 9.1m x 8.8m) */}
      <mesh position={[-7.95, 0.038, 3.8]} receiveShadow>
        <boxGeometry args={[9.1, 0.03, 8.8]} />
        <meshStandardMaterial color={lawnColor} roughness={0.7} />
      </mesh>
      {/* West Lawn Concrete Curbs */}
      <mesh position={[-7.95, 0.055, -0.6]}>
        <boxGeometry args={[9.3, 0.05, 0.18]} />
        <meshStandardMaterial color={borderStoneColor} roughness={0.6} />
      </mesh>
      <mesh position={[-7.95, 0.055, 8.2]}>
        <boxGeometry args={[9.3, 0.05, 0.18]} />
        <meshStandardMaterial color={borderStoneColor} roughness={0.6} />
      </mesh>
      <mesh position={[-12.5, 0.055, 3.8]}>
        <boxGeometry args={[0.18, 0.05, 9.0]} />
        <meshStandardMaterial color={borderStoneColor} roughness={0.6} />
      </mesh>
      <mesh position={[-3.4, 0.055, 3.8]}>
        <boxGeometry args={[0.18, 0.05, 9.0]} />
        <meshStandardMaterial color={borderStoneColor} roughness={0.6} />
      </mesh>

      {/* East Green Lawn (x: +7.95, z: 3.8, size 9.1m x 8.8m) */}
      <mesh position={[7.95, 0.038, 3.8]} receiveShadow>
        <boxGeometry args={[9.1, 0.03, 8.8]} />
        <meshStandardMaterial color={lawnColor} roughness={0.7} />
      </mesh>
      {/* East Lawn Concrete Curbs */}
      <mesh position={[7.95, 0.055, -0.6]}>
        <boxGeometry args={[9.3, 0.05, 0.18]} />
        <meshStandardMaterial color={borderStoneColor} roughness={0.6} />
      </mesh>
      <mesh position={[7.95, 0.055, 8.2]}>
        <boxGeometry args={[9.3, 0.05, 0.18]} />
        <meshStandardMaterial color={borderStoneColor} roughness={0.6} />
      </mesh>
      <mesh position={[12.5, 0.055, 3.8]}>
        <boxGeometry args={[0.18, 0.05, 9.0]} />
        <meshStandardMaterial color={borderStoneColor} roughness={0.6} />
      </mesh>
      <mesh position={[3.4, 0.055, 3.8]}>
        <boxGeometry args={[0.18, 0.05, 9.0]} />
        <meshStandardMaterial color={borderStoneColor} roughness={0.6} />
      </mesh>

      {/* ======================================================== */}
      {/* 5. THE ICONIC JIET OUTDOOR AMPHITHEATER STAGE            */}
      {/* Ground-truth reference: media_1791464704340.jpg          */}
      {/* ======================================================== */}
      <group position={[0, 0, 10.4]} name="jiet-outdoor-stage-group">
        {/* Raised Stage Platform Base (15m wide x 3.8m deep x 1.05m high) */}
        <mesh position={[0, 0.525, 0]} receiveShadow castShadow>
          <boxGeometry args={[15.2, 1.05, 3.8]} />
          <meshStandardMaterial color={plinthColor} roughness={0.8} />
        </mesh>

        {/* Polished Stage Surface Slab */}
        <mesh position={[0, 1.06, 0]} receiveShadow>
          <boxGeometry args={[15.0, 0.04, 3.6]} />
          <meshStandardMaterial color={stageFloorColor} roughness={0.4} />
        </mesh>

        {/* Brick Red Painted Plinth Fascia Apron */}
        {/* Front Skirt */}
        <mesh position={[0, 0.525, -1.91]}>
          <boxGeometry args={[15.22, 1.05, 0.04]} />
          <meshStandardMaterial color={stagePlinthRed} roughness={0.5} />
        </mesh>
        {/* Left Side Skirt */}
        <mesh position={[-7.61, 0.525, 0]}>
          <boxGeometry args={[0.04, 1.05, 3.82]} />
          <meshStandardMaterial color={stagePlinthRed} roughness={0.5} />
        </mesh>
        {/* Right Side Skirt */}
        <mesh position={[7.61, 0.525, 0]}>
          <boxGeometry args={[0.04, 1.05, 3.82]} />
          <meshStandardMaterial color={stagePlinthRed} roughness={0.5} />
        </mesh>

        {/* Front Access Steps (Connecting Central Axial Walkway to Stage) */}
        <mesh position={[0, 0.35, -2.25]} receiveShadow>
          <boxGeometry args={[3.8, 0.35, 0.65]} />
          <meshStandardMaterial color={stageFloorColor} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.72, -2.0]}>
          <boxGeometry args={[3.8, 0.38, 0.45]} />
          <meshStandardMaterial color={stageFloorColor} roughness={0.6} />
        </mesh>
        {/* Step Red Trim */}
        <mesh position={[0, 0.35, -2.58]}>
          <boxGeometry args={[3.82, 0.35, 0.02]} />
          <meshStandardMaterial color={stagePlinthRed} roughness={0.5} />
        </mesh>

        {/* Prominent Crimson Red Backdrop Wall (6.6m wide x 3.2m high) */}
        <mesh position={[0, 2.65, 1.65]} receiveShadow castShadow>
          <boxGeometry args={[6.6, 3.2, 0.35]} />
          <meshStandardMaterial color={stageBackdropRed} roughness={0.45} />
        </mesh>

        {/* White 3D Sans-Serif "JIET" Typography on Backdrop Wall */}
        {/* Rotated 180° around Y (Math.PI) to face forward into the courtyard towards the audience */}
        <Text
          position={[0, 2.75, 1.46]}
          rotation={[0, Math.PI, 0]}
          fontSize={1.05}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.12}
        >
          JIET
        </Text>

        {/* Decorative Green Planter Pots on Stage Sides */}
        <group position={[-6.8, 1.18, -1.2]}>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.3, 0.22, 0.4, 12]} />
            <meshStandardMaterial color="#b91c1c" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <sphereGeometry args={[0.32, 10, 10]} />
            <meshStandardMaterial color="#15803d" roughness={0.7} />
          </mesh>
        </group>
        <group position={[6.8, 1.18, -1.2]}>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.3, 0.22, 0.4, 12]} />
            <meshStandardMaterial color="#b91c1c" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <sphereGeometry args={[0.32, 10, 10]} />
            <meshStandardMaterial color="#15803d" roughness={0.7} />
          </mesh>
        </group>
      </group>

      {/* South Entrance Porch & Steps (Main Reception Approach) */}
      <group position={[0, 0, 31]}>
        {/* Porch Platform Slab */}
        <mesh position={[0, 0.2, 0]} receiveShadow castShadow>
          <boxGeometry args={[14, 0.4, 8]} />
          <meshStandardMaterial color={porchColor} roughness={0.7} />
        </mesh>
        {/* Porch Steps */}
        <mesh position={[0, 0.1, 4.6]} receiveShadow>
          <boxGeometry args={[10, 0.2, 1.2]} />
          <meshStandardMaterial color={borderStoneColor} roughness={0.7} />
        </mesh>
        {/* Porch Entrance Pillars */}
        <mesh position={[-5.5, 1.6, 2.5]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 2.8, 16]} />
          <meshStandardMaterial color={porchPillars} roughness={0.4} />
        </mesh>
        <mesh position={[5.5, 1.6, 2.5]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 2.8, 16]} />
          <meshStandardMaterial color={porchPillars} roughness={0.4} />
        </mesh>
        {/* Porch Roof Canopy */}
        <mesh position={[0, 3.1, 1]} castShadow receiveShadow>
          <boxGeometry args={[14.4, 0.3, 9]} />
          <meshStandardMaterial color={canopyColor} roughness={0.5} />
        </mesh>
      </group>

      {/* North Culvert Bridge to Workshops (Per Blueprint) */}
      <mesh position={[0, 0.1, -34]} receiveShadow castShadow>
        <boxGeometry args={[8, 0.2, 8]} />
        <meshStandardMaterial color={porchColor} roughness={0.8} />
      </mesh>
    </group>
  );
};
