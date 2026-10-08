import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Edges } from '@react-three/drei';
import { useCampusStore } from '../../stores/useCampusStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { FloorFilter } from '../../types/campus';

interface CornerRotundaStaircaseProps {
  position: [number, number, number];
  doorwayAngle: number; // Center angle of entrance doorway opening (in radians)
  isDark: boolean;
  activeFloorFilter: FloorFilter;
}

/**
 * High-Fidelity Architectural Rotunda Staircase
 * Recreates the authentic curved helical rotunda stairs seen in:
 * - "4 muski" walkthrough photos & videos (IMG_3024 - IMG_3072, 20261007_112939.mp4)
 * - Procedural Blender model (department_of_technology_model 2.zip / preview_render_0001.png)
 * - CAD campus blueprints (CO-ED UP TO DATE 24.4.2014-Model.pdf)
 */
const CornerRotundaStaircase: React.FC<CornerRotundaStaircaseProps> = ({
  position,
  doorwayAngle,
  isDark,
  activeFloorFilter,
}) => {
  const isAllMode = activeFloorFilter === 'all';
  const isGroundOnly = activeFloorFilter === 'ground';
  const isFirstOnly = activeFloorFilter === 'first';
  const explodedElevation = isAllMode ? 7.5 : 0;

  const totalRise = isAllMode ? 2.55 + explodedElevation : 2.55; // from y=0.10m ground slab to First Floor arrival
  const stepCount = isAllMode ? 48 : 18;
  const stepHeight = totalRise / stepCount; // ~0.209m in ALL mode, ~0.142m in single-floor mode
  const rCore = 0.52; // Central stone column core radius
  const rTreadOuter = 2.22; // Outer tread radius
  const rDrumInner = 2.25; // Drum wall inner radius
  const rDrumOuter = 2.47; // Drum wall outer radius (0.22m thick solid wall)
  const drumHeight = 1.35; // 1.35m cutaway wall height matching room cutaway walls

  // Helical spiral arc span (in ALL mode, winds an extra 720 deg so ending azimuth matches single-floor arrival)
  const startAngle = doorwayAngle + (35 * Math.PI) / 180;
  const totalArc = isAllMode ? ((270 + 720) * Math.PI) / 180 : (270 * Math.PI) / 180;
  const deltaTheta = totalArc / stepCount;

  // Architectural Theme Colors matching MazeMap & Blender render
  const wallColor = isDark ? '#334155' : '#f8fafc';
  const wallEdgeColor = isDark ? '#475569' : '#cbd5e1';
  const corePillarColor = isDark ? '#1e293b' : '#e2e8f0';
  const collarColor = isDark ? '#0f172a' : '#94a3b8';
  const riserColor = isDark ? '#1e293b' : '#e2e8f0';
  const treadColor = isDark ? '#0f172a' : '#ffffff';
  const nosingColor = isDark ? '#38bdf8' : '#0284c7';
  const handrailColor = isDark ? '#38bdf8' : '#0284c7';
  const balusterColor = isDark ? '#475569' : '#94a3b8';
  const landingSlabColor = isDark ? '#1e293b' : '#ffffff';

  // 1. Solid Extruded Curved Rotunda Drum Wall with Entrance Cutout
  const drumGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const openAngle = (55 * Math.PI) / 180; // 55 degree clear entrance doorway
    const arcStart = doorwayAngle + openAngle / 2;
    const arcEnd = doorwayAngle + 2 * Math.PI - openAngle / 2;
    const segments = 36;

    // Outer circle arc
    for (let i = 0; i <= segments; i++) {
      const theta = arcStart + (i / segments) * (arcEnd - arcStart);
      const x = rDrumOuter * Math.cos(theta);
      const y = rDrumOuter * Math.sin(theta);
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }

    // Inner circle arc (reversed)
    for (let i = segments; i >= 0; i--) {
      const theta = arcStart + (i / segments) * (arcEnd - arcStart);
      const x = rDrumInner * Math.cos(theta);
      const y = rDrumInner * Math.sin(theta);
      shape.lineTo(x, y);
    }
    shape.closePath();

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: drumHeight,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    };

    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Rotate geometry from XY plane to XZ plane so depth extrudes along Y
    geom.rotateX(Math.PI / 2);
    return geom;
  }, [doorwayAngle, rDrumInner, rDrumOuter, drumHeight]);

  // 2. Monolithic Helical Steps Data
  const minStep = isFirstOnly ? 8 : 0;
  const maxStep = isGroundOnly ? 10 : stepCount - 1;

  const steps = useMemo(() => {
    const list = [];

    for (let i = minStep; i <= maxStep; i++) {
      const theta = startAngle + i * deltaTheta;
      const heightUnder = (i + 1) * stepHeight;
      const yBase = 0.10;
      const yTread = yBase + heightUnder;
      const rMid = (rCore + rTreadOuter) / 2;
      const x = rMid * Math.cos(theta);
      const z = rMid * Math.sin(theta);
      const rotY = -theta + Math.PI / 2;
      const arcWidth = rMid * deltaTheta * 1.15;
      const treadLength = rTreadOuter - rCore;

      list.push({
        index: i,
        x,
        z,
        yCenter: yBase + heightUnder / 2,
        yTread,
        rotY,
        theta,
        heightUnder,
        arcWidth,
        treadLength,
      });
    }
    return list;
  }, [minStep, maxStep, startAngle, deltaTheta, rCore, rTreadOuter, stepHeight, stepCount]);

  // 3. Continuous Curved Helical Handrail Curve
  const handrailCurve = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const rRail = rTreadOuter - 0.08;
    const segments = isAllMode ? 64 : 32;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const theta = startAngle + t * totalArc;
      const y = 0.10 + t * totalRise + 0.90; // 0.9m handrail height above treads
      points.push(new THREE.Vector3(rRail * Math.cos(theta), y, rRail * Math.sin(theta)));
    }
    return new THREE.CatmullRomCurve3(points);
  }, [startAngle, totalArc, rTreadOuter, totalRise, isAllMode]);

  const handrailGeometry = useMemo(() => {
    return new THREE.TubeGeometry(handrailCurve, isAllMode ? 64 : 32, 0.035, 12, false);
  }, [handrailCurve, isAllMode]);

  // 4. Upper Arrival Landing Platform at First Floor
  const landingGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const lastTheta = startAngle + totalArc;
    const landingSpan = (45 * Math.PI) / 180;
    const segments = 16;

    for (let i = 0; i <= segments; i++) {
      const theta = lastTheta + (i / segments) * landingSpan;
      const x = rTreadOuter * Math.cos(theta);
      const y = rTreadOuter * Math.sin(theta);
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    for (let i = segments; i >= 0; i--) {
      const theta = lastTheta + (i / segments) * landingSpan;
      const x = rCore * Math.cos(theta);
      const y = rCore * Math.sin(theta);
      shape.lineTo(x, y);
    }
    shape.closePath();

    const geom = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
    geom.rotateX(Math.PI / 2);
    return geom;
  }, [startAngle, totalArc, rCore, rTreadOuter]);

  const columnHeight = isGroundOnly ? 2.0 : isAllMode ? totalRise + 1.25 : 3.8;

  return (
    <group position={position} name="architectural-rotunda-staircase">
      {/* ======================================================== */}
      {/* 1. SOLID CURVED ROTUNDA DRUM WALL (STAIR_DRUMS)          */}
      {/* ======================================================== */}
      {!isFirstOnly && (
        <mesh
          geometry={drumGeometry}
          position={[0, 0.10 + drumHeight, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={wallColor}
            roughness={0.5}
            metalness={0.02}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
          <Edges scale={1.0} threshold={20} color={wallEdgeColor} />
        </mesh>
      )}

      {/* ======================================================== */}
      {/* 2. CENTRAL ROTUNDA STONE COLUMN CORE                     */}
      {/* ======================================================== */}
      <group name="rotunda-central-column">
        {/* Core Pillar Shaft */}
        <mesh position={[0, 0.10 + columnHeight / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[rCore, rCore, columnHeight, 32]} />
          <meshStandardMaterial
            color={corePillarColor}
            roughness={0.4}
            metalness={0.05}
          />
        </mesh>
        {/* Decorative Plinth Base */}
        {!isFirstOnly && (
          <mesh position={[0, 0.22, 0]} receiveShadow>
            <cylinderGeometry args={[rCore * 1.15, rCore * 1.25, 0.24, 32]} />
            <meshStandardMaterial color={collarColor} roughness={0.5} />
          </mesh>
        )}
        {/* Capital Collar Ring */}
        <mesh position={[0, 0.10 + columnHeight - 0.1, 0]} castShadow>
          <cylinderGeometry args={[rCore * 1.2, rCore * 1.05, 0.2, 32]} />
          <meshStandardMaterial color={collarColor} roughness={0.5} />
        </mesh>
      </group>

      {/* ======================================================== */}
      {/* 3. MONOLITHIC HELICAL SPIRAL STEPS                       */}
      {/* ======================================================== */}
      {steps.map((st) => (
        <group key={`step-${st.index}`}>
          {/* Solid Stone Riser Mass */}
          <mesh
            position={[st.x, st.yCenter, st.z]}
            rotation={[0, st.rotY, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[st.treadLength, st.heightUnder, st.arcWidth]} />
            <meshStandardMaterial
              color={riserColor}
              roughness={0.6}
              polygonOffset
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
            />
          </mesh>

          {/* Polished Marble/Granite Tread Slab */}
          <mesh
            position={[st.x, st.yTread + 0.01, st.z]}
            rotation={[0, st.rotY, 0]}
            receiveShadow
            castShadow
          >
            <boxGeometry args={[st.treadLength + 0.04, 0.02, st.arcWidth + 0.03]} />
            <meshStandardMaterial
              color={treadColor}
              roughness={0.3}
              metalness={0.05}
              polygonOffset
              polygonOffsetFactor={-2}
              polygonOffsetUnits={-2}
            />
          </mesh>

          {/* High-Contrast Non-Slip Nosing Strip */}
          <mesh
            position={[st.x, st.yTread + 0.015, st.z]}
            rotation={[0, st.rotY, 0]}
          >
            <boxGeometry args={[st.treadLength + 0.04, 0.025, 0.04]} />
            <meshStandardMaterial color={nosingColor} roughness={0.2} metalness={0.4} />
          </mesh>

          {/* Vertical Brushed Steel Baluster Rod */}
          {!isGroundOnly && (
            <mesh
              position={[
                (rTreadOuter - 0.08) * Math.cos(st.theta),
                st.yTread + 0.45,
                (rTreadOuter - 0.08) * Math.sin(st.theta),
              ]}
              castShadow
            >
              <cylinderGeometry args={[0.015, 0.015, 0.9, 8]} />
              <meshStandardMaterial color={balusterColor} metalness={0.8} roughness={0.2} />
            </mesh>
          )}
        </group>
      ))}

      {/* ======================================================== */}
      {/* 4. CURVED TUBULAR STEEL HANDRAIL                         */}
      {/* ======================================================== */}
      {!isGroundOnly && (
        <mesh geometry={handrailGeometry} castShadow>
          <meshStandardMaterial
            color={handrailColor}
            metalness={0.85}
            roughness={0.15}
          />
        </mesh>
      )}

      {/* ======================================================== */}
      {/* 5. UPPER ARRIVAL LANDING PLATFORM (Connects to 1F Slab)  */}
      {/* ======================================================== */}
      {!isGroundOnly && (
        <group
          name="upper-stair-landing"
          position={[0, isAllMode ? 2.65 + explodedElevation : 2.65, 0]}
        >
          <mesh geometry={landingGeometry} receiveShadow castShadow>
            <meshStandardMaterial
              color={landingSlabColor}
              roughness={0.4}
              polygonOffset
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
            />
          </mesh>
        </group>
      )}

      {/* In ALL mode: Upper Drum Enclosure embracing First Floor rotunda arrival */}
      {isAllMode && (
        <mesh
          geometry={drumGeometry}
          position={[0, 2.65 + explodedElevation + drumHeight, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={wallColor}
            roughness={0.5}
            metalness={0.02}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
          <Edges scale={1.0} threshold={20} color={wallEdgeColor} />
        </mesh>
      )}
    </group>
  );
};

export const ArchitecturalStairs: React.FC = () => {
  const activeFloorFilter = useCampusStore((state) => state.activeFloorFilter);
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  return (
    <group name="campus-architectural-staircases">
      {/* South-West Stair Rotunda (Entrance doorway facing north-east into courtyard veranda) */}
      <CornerRotundaStaircase
        position={[-14.25, 0, 14.25]}
        doorwayAngle={-Math.PI / 4}
        isDark={isDark}
        activeFloorFilter={activeFloorFilter}
      />

      {/* South-East Stair Rotunda (Entrance doorway facing north-west into courtyard veranda) */}
      <CornerRotundaStaircase
        position={[14.25, 0, 14.25]}
        doorwayAngle={(3 * Math.PI) / 4}
        isDark={isDark}
        activeFloorFilter={activeFloorFilter}
      />

      {/* North-West Stair Rotunda (Entrance doorway facing south-east into courtyard veranda) */}
      <CornerRotundaStaircase
        position={[-14.25, 0, -14.25]}
        doorwayAngle={Math.PI / 4}
        isDark={isDark}
        activeFloorFilter={activeFloorFilter}
      />

      {/* North-East Stair Rotunda (Entrance doorway facing south-west into courtyard veranda) */}
      <CornerRotundaStaircase
        position={[14.25, 0, -14.25]}
        doorwayAngle={-(3 * Math.PI) / 4}
        isDark={isDark}
        activeFloorFilter={activeFloorFilter}
      />
    </group>
  );
};
