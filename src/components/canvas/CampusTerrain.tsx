import React from 'react';
import { useThemeStore } from '../../stores/useThemeStore';

export const CampusTerrain: React.FC = () => {
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  // Symmetrical courtyard planter trees along the quadrangle walkways
  const courtyardTreePositions: [number, number, number][] = [
    [-7.5, 0, 7.5], [7.5, 0, 7.5],
    [-7.5, 0, -7.5], [7.5, 0, -7.5],
    [-7.5, 0, 0], [7.5, 0, 0],
    [0, 0, 7.5], [0, 0, -7.5],
  ];

  // Perimeter boundary trees (outer roads)
  const perimeterTrees: [number, number, number][] = [
    [-35, 0, 25], [-35, 0, 0], [-35, 0, -25],
    [35, 0, 25], [35, 0, 0], [35, 0, -25],
    [-20, 0, 36], [20, 0, 36],
    [-20, 0, -36], [20, 0, -36],
  ];

  // Architectural color palette depending on theme
  const groundColor = isDark ? '#0f172a' : '#f8fafc';
  const roadColor = isDark ? '#1e293b' : '#64748b';
  const roadCurbColor = isDark ? '#334155' : '#cbd5e1';
  const plinthColor = isDark ? '#1e293b' : '#e2e8f0';
  const lawnColor = isDark ? '#166534' : '#15803d';
  const walkwayColor = isDark ? '#475569' : '#cbd5e1';
  const plazaColor = isDark ? '#64748b' : '#e2e8f0';
  const borderStoneColor = isDark ? '#334155' : '#94a3b8';
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
      {/* AUTHENTIC CENTRAL OPEN COURTYARD LAWN                    */}
      {/* Blueprint verified: Quadrangle lawn with clean walkways  */}
      {/* ======================================================== */}
      {/* Lush Green Courtyard Grass Lawn (25m x 25m quadrangle) */}
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[25, 0.03, 25]} />
        <meshStandardMaterial color={lawnColor} roughness={0.7} />
      </mesh>

      {/* Cross Walkways Across Courtyard (Connecting 4 Corridors seamlessly, NO central monument/square) */}
      {/* North-South Walkway (width: 3.2m) */}
      <mesh position={[0, 0.042, 0]} receiveShadow>
        <boxGeometry args={[3.2, 0.015, 25]} />
        <meshStandardMaterial color={walkwayColor} roughness={0.6} />
      </mesh>
      {/* East-West Walkway (width: 3.2m) */}
      <mesh position={[0, 0.042, 0]} receiveShadow>
        <boxGeometry args={[25, 0.015, 3.2]} />
        <meshStandardMaterial color={walkwayColor} roughness={0.6} />
      </mesh>


      {/* Peripheral Stone Edging around Courtyard Lawn Boundary */}
      <mesh position={[0, 0.05, 12.5]}>
        <boxGeometry args={[25.4, 0.05, 0.25]} />
        <meshStandardMaterial color={borderStoneColor} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.05, -12.5]}>
        <boxGeometry args={[25.4, 0.05, 0.25]} />
        <meshStandardMaterial color={borderStoneColor} roughness={0.6} />
      </mesh>
      <mesh position={[12.5, 0.05, 0]}>
        <boxGeometry args={[0.25, 0.05, 25.4]} />
        <meshStandardMaterial color={borderStoneColor} roughness={0.6} />
      </mesh>
      <mesh position={[-12.5, 0.05, 0]}>
        <boxGeometry args={[0.25, 0.05, 25.4]} />
        <meshStandardMaterial color={borderStoneColor} roughness={0.6} />
      </mesh>

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

      {/* Courtyard Architectural Foliage (Clean stylized trees along walkways) */}
      {courtyardTreePositions.map(([x, y, z], idx) => (
        <group key={`ct-${idx}`} position={[x, y, z]}>
          {/* Tree Planter Box */}
          <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.0, 1.1, 0.3, 16]} />
            <meshStandardMaterial color={borderStoneColor} roughness={0.7} />
          </mesh>
          {/* Trunk */}
          <mesh position={[0, 0.9, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.2, 1.3, 12]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
          {/* Architectural Foliage Canopy */}
          <mesh position={[0, 2.0, 0]} castShadow>
            <sphereGeometry args={[1.1, 16, 16]} />
            <meshStandardMaterial color="#22c55e" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Perimeter Campus Trees */}
      {perimeterTrees.map(([x, y, z], idx) => (
        <group key={`pt-${idx}`} position={[x, y, z]}>
          <mesh position={[0, 0.8, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.25, 1.6, 10]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
          <mesh position={[0, 2.1, 0]} castShadow>
            <coneGeometry args={[1.4, 2.4, 12]} />
            <meshStandardMaterial color="#15803d" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
