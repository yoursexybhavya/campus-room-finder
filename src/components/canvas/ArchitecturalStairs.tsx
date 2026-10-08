import React from 'react';
import * as THREE from 'three';
import { useCampusStore } from '../../stores/useCampusStore';
import { useThemeStore } from '../../stores/useThemeStore';

interface StairFlightProps {
  position: [number, number, number];
  rotationY: number;
  isDark: boolean;
}

const StairFlight: React.FC<StairFlightProps> = ({ position, rotationY, isDark }) => {
  const stepCount = 15;
  const totalRise = 2.55; // from y=0.10 to y=2.65
  const stepHeight = totalRise / stepCount; // 0.17m per step
  const stepDepth = 0.22; // 0.22m per step
  const stepWidth = 2.2; // comfortable wide architectural flight
  const flightLength = stepCount * stepDepth; // 3.3m total run

  const concreteColor = isDark ? '#334155' : '#e2e8f0';
  const treadColor = isDark ? '#1e293b' : '#cbd5e1';
  const nosingColor = isDark ? '#0f172a' : '#475569';
  const wallColor = isDark ? '#1e293b' : '#94a3b8';
  const handrailColor = isDark ? '#38bdf8' : '#0284c7';

  // Incline angle for handrails and stringers
  const inclineAngle = Math.atan2(totalRise, flightLength);
  const hypotenuseLength = Math.hypot(totalRise, flightLength);

  return (
    <group position={position} rotation={[0, rotationY, 0]} name="architectural-stair-flight">
      {/* 1. Solid monolithic steps (each step rises from ground y=0.10 to step height) */}
      {Array.from({ length: stepCount }).map((_, i) => {
        const heightFromGround = (i + 1) * stepHeight;
        const centerY = 0.10 + heightFromGround / 2;
        const centerZ = (i + 0.5) * stepDepth;

        return (
          <group key={`step-${i}`}>
            {/* Solid concrete riser block underneath */}
            <mesh position={[0, centerY, centerZ]} castShadow receiveShadow>
              <boxGeometry args={[stepWidth, heightFromGround, stepDepth]} />
              <meshStandardMaterial
                color={concreteColor}
                roughness={0.6}
                polygonOffset
                polygonOffsetFactor={-1}
                polygonOffsetUnits={-1}
              />
            </mesh>

            {/* Dark stone tread surface with non-slip bullnose */}
            <mesh position={[0, 0.10 + heightFromGround + 0.01, centerZ]} receiveShadow>
              <boxGeometry args={[stepWidth + 0.02, 0.02, stepDepth + 0.02]} />
              <meshStandardMaterial
                color={treadColor}
                roughness={0.4}
                polygonOffset
                polygonOffsetFactor={-2}
                polygonOffsetUnits={-2}
              />
            </mesh>

            {/* Contrast nosing strip at step edge */}
            <mesh position={[0, 0.10 + heightFromGround + 0.015, centerZ + stepDepth / 2 - 0.015]}>
              <boxGeometry args={[stepWidth + 0.02, 0.025, 0.03]} />
              <meshStandardMaterial color={nosingColor} roughness={0.3} />
            </mesh>
          </group>
        );
      })}

      {/* 2. Solid Architectural Stringer / Parapet Walls on left & right */}
      {/* Left Stringer Wall */}
      <mesh
        position={[-stepWidth / 2 - 0.08, 0.10 + totalRise / 2 + 0.4, flightLength / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.16, totalRise + 0.8, flightLength + 0.4]} />
        <meshStandardMaterial color={wallColor} roughness={0.6} />
      </mesh>

      {/* Right Stringer Wall */}
      <mesh
        position={[stepWidth / 2 + 0.08, 0.10 + totalRise / 2 + 0.4, flightLength / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.16, totalRise + 0.8, flightLength + 0.4]} />
        <meshStandardMaterial color={wallColor} roughness={0.6} />
      </mesh>

      {/* 3. Sleek Architectural Handrails on top of stringers */}
      {/* Left Handrail */}
      <mesh
        position={[-stepWidth / 2 - 0.08, 0.10 + totalRise / 2 + 0.85, flightLength / 2]}
        rotation={[inclineAngle, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.04, 0.04, hypotenuseLength + 0.3, 12]} />
        <meshStandardMaterial color={handrailColor} metalness={0.7} roughness={0.2} />
      </mesh>

      {/* Right Handrail */}
      <mesh
        position={[stepWidth / 2 + 0.08, 0.10 + totalRise / 2 + 0.85, flightLength / 2]}
        rotation={[inclineAngle, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.04, 0.04, hypotenuseLength + 0.3, 12]} />
        <meshStandardMaterial color={handrailColor} metalness={0.7} roughness={0.2} />
      </mesh>
    </group>
  );
};

export const ArchitecturalStairs: React.FC = () => {
  const activeFloorFilter = useCampusStore((state) => state.activeFloorFilter);
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  // Staircases are solid permanent architectural structures at the 4 corner cores
  return (
    <group name="campus-architectural-staircases">
      {/* South-West Staircase: rises from z = 10.95 to z = 14.25 towards SW corner */}
      <StairFlight
        position={[-14.25, 0, 10.95]}
        rotationY={0}
        isDark={isDark}
      />

      {/* South-East Staircase: rises from z = 10.95 to z = 14.25 towards SE corner */}
      <StairFlight
        position={[14.25, 0, 10.95]}
        rotationY={0}
        isDark={isDark}
      />

      {/* North-West Staircase: rises from z = -10.95 to z = -14.25 towards NW corner */}
      <StairFlight
        position={[-14.25, 0, -10.95]}
        rotationY={Math.PI}
        isDark={isDark}
      />

      {/* North-East Staircase: rises from z = -10.95 to z = -14.25 towards NE corner */}
      <StairFlight
        position={[14.25, 0, -10.95]}
        rotationY={Math.PI}
        isDark={isDark}
      />
    </group>
  );
};
