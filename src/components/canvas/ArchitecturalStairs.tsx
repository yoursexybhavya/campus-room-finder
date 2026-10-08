import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useCampusStore } from '../../stores/useCampusStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { FloorFilter } from '../../types/campus';

interface CornerRotundaStaircaseProps {
  position: [number, number, number];
  startAngle: number;
  isDark: boolean;
  activeFloorFilter: FloorFilter;
}

const CornerRotundaStaircase: React.FC<CornerRotundaStaircaseProps> = ({
  position,
  startAngle,
  isDark,
  activeFloorFilter,
}) => {
  const stepCount = 16;
  const totalRise = 2.55; // from y=0.10 to y=2.65
  const stepHeight = totalRise / stepCount; // 0.159m per step
  const rInner = 0.65;
  const rOuter = 2.15;
  const rMid = (rInner + rOuter) / 2; // 1.4m
  const radialLength = rOuter - rInner; // 1.5m
  const arcSpan = Math.PI * 0.85; // ~153 degrees curved fan
  const deltaTheta = arcSpan / stepCount;

  // Colors
  const columnColor = isDark ? '#334155' : '#cbd5e1';
  const collarColor = isDark ? '#1e293b' : '#94a3b8';
  const concreteColor = isDark ? '#1e293b' : '#e2e8f0';
  const treadColor = isDark ? '#0f172a' : '#cbd5e1';
  const nosingColor = isDark ? '#38bdf8' : '#0284c7';
  const balustradeColor = isDark ? '#334155' : '#94a3b8';
  const handrailColor = isDark ? '#38bdf8' : '#0284c7';

  // Determine which steps to show based on floor filter
  const isGroundOnly = activeFloorFilter === 'ground';
  const isFirstOnly = activeFloorFilter === 'first';

  // Ground view: show lower flight up to ground ceiling (steps 0 to 9)
  // First floor view: show upper arrival flight (steps 7 to 15)
  // All view: show all 16 steps
  const minStep = isFirstOnly ? 7 : 0;
  const maxStep = isGroundOnly ? 9 : 15;

  const steps = useMemo(() => {
    const list = [];
    for (let i = minStep; i <= maxStep; i++) {
      const theta = startAngle + i * deltaTheta;
      const heightUnder = (i + 1) * stepHeight;
      const yCenter = 0.10 + heightUnder / 2;
      const x = rMid * Math.cos(theta);
      const z = rMid * Math.sin(theta);
      const rotY = -theta + Math.PI / 2;

      // Arc step width at mid-radius
      const arcWidth = rMid * deltaTheta * 1.15;

      list.push({
        index: i,
        x,
        z,
        yCenter,
        treadY: 0.10 + heightUnder,
        rotY,
        theta,
        heightUnder,
        arcWidth,
      });
    }
    return list;
  }, [minStep, maxStep, startAngle, deltaTheta, rMid, stepHeight]);

  const columnHeight = isGroundOnly ? 1.8 : 3.6;
  const columnCenterY = isGroundOnly ? 0.98 : 1.88;

  return (
    <group position={position} name="architectural-rotunda-staircase">
      {/* 1. Central Rotunda Core Column (Rajasthan Architectural Pillar) */}
      <mesh position={[0, columnCenterY, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[rInner * 0.9, rInner * 0.9, columnHeight, 24]} />
        <meshStandardMaterial
          color={columnColor}
          roughness={0.5}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
      {/* Base Plinth Collar */}
      {!isFirstOnly && (
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[rInner * 1.1, rInner * 1.15, 0.2, 24]} />
          <meshStandardMaterial color={collarColor} roughness={0.4} />
        </mesh>
      )}
      {/* Capital Top Collar */}
      <mesh position={[0, isGroundOnly ? 1.8 : 3.55, 0]}>
        <cylinderGeometry args={[rInner * 1.15, rInner * 1.05, 0.16, 24]} />
        <meshStandardMaterial color={collarColor} roughness={0.4} />
      </mesh>

      {/* 2. Solid Monolithic Radial Steps */}
      {steps.map((st) => (
        <group key={`step-${st.index}`}>
          {/* Solid Concrete Riser Block extending to ground */}
          <mesh
            position={[st.x, st.yCenter, st.z]}
            rotation={[0, st.rotY, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[radialLength, st.heightUnder, st.arcWidth]} />
            <meshStandardMaterial
              color={concreteColor}
              roughness={0.6}
              polygonOffset
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
              depthWrite
            />
          </mesh>

          {/* Polished Stone Tread Surface */}
          <mesh
            position={[st.x, st.treadY + 0.01, st.z]}
            rotation={[0, st.rotY, 0]}
            receiveShadow
          >
            <boxGeometry args={[radialLength + 0.04, 0.02, st.arcWidth + 0.03]} />
            <meshStandardMaterial
              color={treadColor}
              roughness={0.35}
              polygonOffset
              polygonOffsetFactor={-2}
              polygonOffsetUnits={-2}
              depthWrite
            />
          </mesh>

          {/* High-Contrast Non-Slip Nosing Strip */}
          <mesh
            position={[st.x, st.treadY + 0.015, st.z]}
            rotation={[0, st.rotY, 0]}
          >
            <boxGeometry args={[radialLength + 0.04, 0.025, 0.04]} />
            <meshStandardMaterial color={nosingColor} roughness={0.25} metalness={0.5} />
          </mesh>
        </group>
      ))}

      {/* 3. Outer Swept Curved Balustrade Wall & Steel Handrails */}
      {steps.map((st) => {
        const balustradeR = rOuter + 0.06;
        const bx = balustradeR * Math.cos(st.theta);
        const bz = balustradeR * Math.sin(st.theta);

        return (
          <group key={`balustrade-${st.index}`}>
            {/* Parapet Balustrade Segment */}
            <mesh
              position={[bx, st.treadY + 0.42, bz]}
              rotation={[0, st.rotY, 0]}
              castShadow
            >
              <boxGeometry args={[0.1, 0.82, st.arcWidth * 1.05]} />
              <meshStandardMaterial
                color={balustradeColor}
                roughness={0.5}
                depthWrite
              />
            </mesh>

            {/* Brushed Handrail Top Segment */}
            <mesh
              position={[bx, st.treadY + 0.86, bz]}
              rotation={[0, st.rotY, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.035, 0.035, st.arcWidth * 1.1, 10]} />
              <meshStandardMaterial
                color={handrailColor}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

export const ArchitecturalStairs: React.FC = () => {
  const activeFloorFilter = useCampusStore((state) => state.activeFloorFilter);
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  return (
    <group name="campus-architectural-staircases">
      {/* South-West Stair Rotunda Core */}
      <CornerRotundaStaircase
        position={[-14.25, 0, 14.25]}
        startAngle={-Math.PI / 2}
        isDark={isDark}
        activeFloorFilter={activeFloorFilter}
      />

      {/* South-East Stair Rotunda Core */}
      <CornerRotundaStaircase
        position={[14.25, 0, 14.25]}
        startAngle={Math.PI}
        isDark={isDark}
        activeFloorFilter={activeFloorFilter}
      />

      {/* North-West Stair Rotunda Core */}
      <CornerRotundaStaircase
        position={[-14.25, 0, -14.25]}
        startAngle={0}
        isDark={isDark}
        activeFloorFilter={activeFloorFilter}
      />

      {/* North-East Stair Rotunda Core */}
      <CornerRotundaStaircase
        position={[14.25, 0, -14.25]}
        startAngle={Math.PI / 2}
        isDark={isDark}
        activeFloorFilter={activeFloorFilter}
      />
    </group>
  );
};
