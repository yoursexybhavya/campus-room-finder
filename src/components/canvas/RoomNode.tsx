import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Edges, Html } from '@react-three/drei';
import { CampusRoom, FloorFilter } from '../../types/campus';
import { useCampusStore } from '../../stores/useCampusStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { useNodePhysics } from '../../services/physics/antiGravityEngine';

interface RoomNodeProps {
  room: CampusRoom;
  isSelected: boolean;
  isHovered: boolean;
  floorFilter: FloorFilter;
}

// 3D MazeMap-style animated location marker pin
const MazeMapMarkerPin: React.FC<{ color?: string }> = ({ color = '#f97316' }) => {
  const pinRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (pinRef.current) {
      pinRef.current.position.y = 2.4 + Math.sin(t * 3.5) * 0.22;
      pinRef.current.rotation.y = t * 1.5;
    }
    if (ringRef.current) {
      const s = 1.0 + 0.25 * Math.sin(t * 3.0);
      ringRef.current.scale.set(s, s, 1);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Floor pulsing highlight ring */}
      <mesh ref={ringRef} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.8, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.65} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Floating 3D Teardrop Pin */}
      <group ref={pinRef} position={[0, 2.4, 0]}>
        {/* Head Sphere */}
        <mesh position={[0, 0.45, 0]} castShadow>
          <sphereGeometry args={[0.38, 20, 20]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} roughness={0.2} metalness={0.3} />
        </mesh>
        {/* White Center Eye Dot */}
        <mesh position={[0, 0.45, 0.32]}>
          <circleGeometry args={[0.13, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0.45, -0.32]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.13, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Inverted Cone Base Pointing Down */}
        <mesh position={[0, 0.05, 0]} rotation={[Math.PI, 0, 0]} castShadow>
          <coneGeometry args={[0.32, 0.6, 20]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} roughness={0.2} metalness={0.3} />
        </mesh>
      </group>
    </group>
  );
};

export const RoomNode: React.FC<RoomNodeProps> = ({
  room,
  isSelected,
  isHovered,
  floorFilter,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const selectRoom = useCampusStore((state) => state.selectRoom);
  const setHoveredRoom = useCampusStore((state) => state.setHoveredRoom);
  const isPanelOpen = useCampusStore((state) => state.isPanelOpen);
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  // Hook into Anti-Gravity Harmonic Physics
  useNodePhysics(
    {
      id: room.id,
      basePosition: room.position,
      mass: 0.9 + ((room.capacity ?? 60) / 150) * 0.3,
    },
    groupRef
  );

  // Floor filter visibility
  const isFloorActive =
    floorFilter === 'all' ||
    (floorFilter === 'ground' && room.floor === 'ground') ||
    (floorFilter === 'first' && room.floor === 'first');

  const [w, h, d] = room.dimensions;
  const wallH = 1.2; // Architectural 1.2m cutaway wall height (matching Blender reference)
  const wallT = 0.14; // Slender, realistic architectural wall thickness
  const doorW = 1.15; // CAD standard clear entrance doorway

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (!isFloorActive) {
      useCampusStore.getState().setFloorFilter(room.floor);
    }
    selectRoom(room.id);
  };

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHoveredRoom(room.id);
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    setHoveredRoom(null);
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'auto';
    }
  };

  const scale = isHovered ? 1.02 : 1.0;

  // Architectural Colors matching preview_render_0001.png
  const wallColor = isDark ? '#334155' : '#f8fafc';
  const wallTrimColor = isDark ? '#475569' : '#cbd5e1';

  // Compute 4 extruded boundary walls with doorway opening towards corridor
  const wallSegments = useMemo(() => {
    const segments: { pos: [number, number, number]; args: [number, number, number] }[] = [];
    const yCenter = -h / 2 + wallH / 2;

    if (room.wing === 'East') {
      // East wing: Corridor is on -x face. Door opening on -x.
      segments.push({ pos: [w / 2 - wallT / 2, yCenter, 0], args: [wallT, wallH, d] });
      segments.push({ pos: [0, yCenter, -d / 2 + wallT / 2], args: [w - 2 * wallT, wallH, wallT] });
      segments.push({ pos: [0, yCenter, d / 2 - wallT / 2], args: [w - 2 * wallT, wallH, wallT] });
      const segL = Math.max(0.4, (d - doorW) / 2);
      segments.push({ pos: [-w / 2 + wallT / 2, yCenter, -d / 2 + segL / 2], args: [wallT, wallH, segL] });
      segments.push({ pos: [-w / 2 + wallT / 2, yCenter, d / 2 - segL / 2], args: [wallT, wallH, segL] });
    } else if (room.wing === 'West') {
      // West wing: Corridor is on +x face. Door opening on +x.
      segments.push({ pos: [-w / 2 + wallT / 2, yCenter, 0], args: [wallT, wallH, d] });
      segments.push({ pos: [0, yCenter, -d / 2 + wallT / 2], args: [w - 2 * wallT, wallH, wallT] });
      segments.push({ pos: [0, yCenter, d / 2 - wallT / 2], args: [w - 2 * wallT, wallH, wallT] });
      const segL = Math.max(0.4, (d - doorW) / 2);
      segments.push({ pos: [w / 2 - wallT / 2, yCenter, -d / 2 + segL / 2], args: [wallT, wallH, segL] });
      segments.push({ pos: [w / 2 - wallT / 2, yCenter, d / 2 - segL / 2], args: [wallT, wallH, segL] });
    } else if (room.wing === 'North') {
      // North wing: Corridor is on +z face. Door opening on +z.
      segments.push({ pos: [0, yCenter, -d / 2 + wallT / 2], args: [w, wallH, wallT] });
      segments.push({ pos: [-w / 2 + wallT / 2, yCenter, 0], args: [wallT, wallH, d - 2 * wallT] });
      segments.push({ pos: [w / 2 - wallT / 2, yCenter, 0], args: [wallT, wallH, d - 2 * wallT] });
      const segL = Math.max(0.4, (w - doorW) / 2);
      segments.push({ pos: [-w / 2 + segL / 2, yCenter, d / 2 - wallT / 2], args: [segL, wallH, wallT] });
      segments.push({ pos: [w / 2 - segL / 2, yCenter, d / 2 - wallT / 2], args: [segL, wallH, wallT] });
    } else {
      // South wing: Corridor is on -z face. Door opening on -z.
      segments.push({ pos: [0, yCenter, d / 2 - wallT / 2], args: [w, wallH, wallT] });
      segments.push({ pos: [-w / 2 + wallT / 2, yCenter, 0], args: [wallT, wallH, d - 2 * wallT] });
      segments.push({ pos: [w / 2 - wallT / 2, yCenter, 0], args: [wallT, wallH, d - 2 * wallT] });
      const segL = Math.max(0.4, (w - doorW) / 2);
      segments.push({ pos: [-w / 2 + segL / 2, yCenter, -d / 2 + wallT / 2], args: [segL, wallH, wallT] });
      segments.push({ pos: [w / 2 - segL / 2, yCenter, -d / 2 + wallT / 2], args: [segL, wallH, wallT] });
    }

    return segments;
  }, [w, h, d, room.wing, wallH, wallT, doorW]);

  // Wooden door threshold inlay flat on floor at doorway opening
  const threshold = useMemo(() => {
    const yTh = -h / 2 + 0.082;
    if (room.wing === 'East') {
      return { pos: [-w / 2 + wallT / 2, yTh, 0] as [number, number, number], args: [wallT + 0.04, 0.016, doorW] as [number, number, number] };
    } else if (room.wing === 'West') {
      return { pos: [w / 2 - wallT / 2, yTh, 0] as [number, number, number], args: [wallT + 0.04, 0.016, doorW] as [number, number, number] };
    } else if (room.wing === 'North') {
      return { pos: [0, yTh, d / 2 - wallT / 2] as [number, number, number], args: [doorW, 0.016, wallT + 0.04] as [number, number, number] };
    } else {
      return { pos: [0, yTh, -d / 2 + wallT / 2] as [number, number, number], args: [doorW, 0.016, wallT + 0.04] as [number, number, number] };
    }
  }, [w, h, d, room.wing, wallT, doorW]);

  // 72° CAD Door Swing Arc and swung timber door leaf
  const doorSwing = useMemo(() => {
    const yArc = -h / 2 + 0.085;
    const leafL = 0.82;
    const angleRad = (72 * Math.PI) / 180;

    let hingePos: [number, number, number] = [0, yArc, 0];
    let arcRot: [number, number, number] = [-Math.PI / 2, 0, 0];
    let leafPos: [number, number, number] = [0, yArc, 0];
    let leafRot: [number, number, number] = [0, 0, 0];

    if (room.wing === 'East') {
      hingePos = [-w / 2 + wallT, yArc, -doorW / 2 + 0.08];
      arcRot = [-Math.PI / 2, 0, 0];
      leafPos = [-w / 2 + wallT + (leafL / 2) * Math.sin(angleRad), yArc, -doorW / 2 + 0.08 + (leafL / 2) * Math.cos(angleRad)];
      leafRot = [0, -angleRad + Math.PI / 2, 0];
    } else if (room.wing === 'West') {
      hingePos = [w / 2 - wallT, yArc, -doorW / 2 + 0.08];
      arcRot = [-Math.PI / 2, 0, Math.PI / 2];
      leafPos = [w / 2 - wallT - (leafL / 2) * Math.sin(angleRad), yArc, -doorW / 2 + 0.08 + (leafL / 2) * Math.cos(angleRad)];
      leafRot = [0, angleRad - Math.PI / 2, 0];
    } else if (room.wing === 'North') {
      hingePos = [-doorW / 2 + 0.08, yArc, d / 2 - wallT];
      arcRot = [-Math.PI / 2, 0, Math.PI];
      leafPos = [-doorW / 2 + 0.08 + (leafL / 2) * Math.cos(angleRad), yArc, d / 2 - wallT - (leafL / 2) * Math.sin(angleRad)];
      leafRot = [0, -angleRad, 0];
    } else {
      hingePos = [-doorW / 2 + 0.08, yArc, -d / 2 + wallT];
      arcRot = [-Math.PI / 2, 0, -Math.PI / 2];
      leafPos = [-doorW / 2 + 0.08 + (leafL / 2) * Math.cos(angleRad), yArc, -d / 2 + wallT + (leafL / 2) * Math.sin(angleRad)];
      leafRot = [0, angleRad, 0];
    }

    return { hingePos, arcRot, leafPos, leafRot, leafL };
  }, [w, h, d, room.wing, wallT, doorW]);

  // Exterior architectural window glass panes
  const windowPane = useMemo(() => {
    const yWin = -h / 2 + 0.60;
    const hWin = 0.50;
    if (room.wing === 'East') {
      return { pos: [w / 2 - wallT / 2, yWin, 0] as [number, number, number], args: [wallT * 1.05, hWin, Math.min(d * 0.6, 3.6)] as [number, number, number] };
    } else if (room.wing === 'West') {
      return { pos: [-w / 2 + wallT / 2, yWin, 0] as [number, number, number], args: [wallT * 1.05, hWin, Math.min(d * 0.6, 3.6)] as [number, number, number] };
    } else if (room.wing === 'North') {
      return { pos: [0, yWin, -d / 2 + wallT / 2] as [number, number, number], args: [Math.min(w * 0.6, 3.6), hWin, wallT * 1.05] as [number, number, number] };
    } else {
      return { pos: [0, yWin, d / 2 - wallT / 2] as [number, number, number], args: [Math.min(w * 0.6, 3.6), hWin, wallT * 1.05] as [number, number, number] };
    }
  }, [w, h, d, room.wing, wallT]);

  const isAllMode = floorFilter === 'all';

  // Key anchor rooms to prioritize in All Floors overview to prevent 61 overlapping labels
  const isMajorAnchor =
    room.type === 'lecture_theater' ||
    room.type === 'library' ||
    room.id.startsWith('LT-') ||
    room.id === 'LIB-1' ||
    room.id.includes('LAB');

  // Determine whether to display the 3D label
  // In 'ALL' mode: display key anchors, selected, or hovered rooms to prevent unreadable label collision
  // In single floor mode ('ground' / 'first'): display all rooms on that floor
  const shouldRenderLabel =
    isFloorActive &&
    (!isPanelOpen || isSelected || isHovered) &&
    (!isAllMode || isMajorAnchor || isSelected || isHovered);

  return (
    <group
      ref={groupRef}
      position={room.position}
      scale={[scale, scale, scale]}
      userData={{ roomId: room.id, roomCode: room.code, roomName: room.name, floor: room.floor }}
    >
      {/* 1. ROOM FLOOR TILE (Clickable interactive surface) */}
      <mesh
        ref={meshRef}
        name={`room-${room.id}`}
        position={[0, -h / 2 + 0.06, 0]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[w - 0.06, 0.1, d - 0.06]} />
        <meshStandardMaterial
          color={isSelected ? '#f97316' : isHovered ? '#38bdf8' : room.color}
          roughness={0.4}
          metalness={0.08}
          polygonOffset={true}
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
          depthWrite={true}
          transparent={!isFloorActive}
          opacity={isFloorActive ? 0.98 : 0.15}
          emissive={isSelected ? '#ea580c' : isHovered ? '#0284c7' : room.color}
          emissiveIntensity={isSelected ? 0.45 : isHovered ? 0.25 : (isDark ? 0.18 : 0.06)}
        />
        {/* Crisp perimeter outline in category color */}
        <Edges
          scale={1.0}
          threshold={15}
          color={isSelected ? '#f97316' : isHovered ? '#38bdf8' : (isDark ? '#e2e8f0' : '#475569')}
        />
      </mesh>

      {/* 2. EXTRUDED ARCHITECTURAL CUTAWAY WALLS (1.2m with doorway openings) */}
      {wallSegments.map((seg, idx) => (
        <mesh
          key={`wall-${idx}`}
          position={seg.pos}
          castShadow
          receiveShadow
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <boxGeometry args={seg.args} />
          <meshStandardMaterial
            color={isSelected ? (isDark ? '#431407' : '#ffedd5') : wallColor}
            roughness={0.45}
            metalness={0.02}
            transparent={!isFloorActive}
            opacity={isFloorActive ? 0.98 : 0.15}
            polygonOffset={true}
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
            depthWrite={true}
          />
          <Edges
            scale={1.0}
            threshold={25}
            color={isSelected ? '#f97316' : isHovered ? '#38bdf8' : (isDark ? '#475569' : wallTrimColor)}
          />
        </mesh>
      ))}

      {/* 3. WOODEN DOOR THRESHOLD INLAY (Matching Blender model timber inlay) */}
      <mesh position={threshold.pos} receiveShadow>
        <boxGeometry args={threshold.args} />
        <meshStandardMaterial
          color={isDark ? '#78350f' : '#92400e'}
          roughness={0.4}
        />
      </mesh>

      {/* 4. 72° CAD DOOR SWING ARC & OPEN TIMBER DOOR LEAF */}
      {isFloorActive && (
        <group name="cad-door-swing">
          {/* Swung door leaf */}
          <mesh position={doorSwing.leafPos} rotation={doorSwing.leafRot} castShadow>
            <boxGeometry args={[doorSwing.leafL, 0.012, 0.035]} />
            <meshStandardMaterial
              color={isDark ? '#92400e' : '#b45309'}
              roughness={0.4}
            />
          </mesh>
          {/* 72° CAD Arc line on floor */}
          <mesh position={doorSwing.hingePos} rotation={doorSwing.arcRot}>
            <ringGeometry args={[0.78, 0.82, 16, 1, 0, (72 * Math.PI) / 180]} />
            <meshBasicMaterial
              color="#f97316"
              transparent
              opacity={0.85}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}

      {/* 5. EXTERIOR ARCHITECTURAL WINDOW GLASS PANE */}
      <mesh position={windowPane.pos}>
        <boxGeometry args={windowPane.args} />
        <meshStandardMaterial
          color="#38bdf8"
          transparent
          opacity={0.45}
          roughness={0.15}
          metalness={0.1}
          depthWrite={false}
        />
      </mesh>

      {/* 6. FLAT ARCHITECTURAL ROOM LABEL (Printed directly on floor tiles) */}
      {isFloorActive && !isSelected && (
        <group position={[0, -h / 2 + 0.082, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <Html transform center distanceFactor={28} className="pointer-events-none select-none">
            <div className="flex flex-col items-center justify-center text-center opacity-85">
              <span className="font-mono font-black text-[10px] leading-tight tracking-wider text-slate-800 dark:text-slate-100">
                {room.code}
              </span>
              <span className="font-sans font-medium text-[7.5px] leading-tight text-slate-600 dark:text-slate-300 max-w-[80px] truncate mt-0.5">
                {room.name.replace(/\(.*?\)/g, '').trim()}
              </span>
            </div>
          </Html>
        </group>
      )}

      {/* 7. MAZEMAP ICONIC ORANGE LOCATION PIN (Appears on Selected Room) */}
      {isSelected && isFloorActive && (
        <MazeMapMarkerPin color="#f97316" />
      )}

      {/* 4. BILLBOARDING ARCHITECTURAL ROOM LABEL */}
      {shouldRenderLabel && (
        <Html
          position={[0, -h / 2 + wallH + (room.floor === 'first' && isAllMode ? 0.6 : 0.35), 0]}
          center
          distanceFactor={24}
          zIndexRange={isSelected ? [100, 50] : isHovered ? [50, 20] : [10, 0]}
          className="pointer-events-none select-none transition-all duration-200"
        >
          <div
            className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap shadow-md flex items-center gap-1.5 border backdrop-blur-md transition-all ${
              isSelected
                ? 'bg-orange-500 text-white border-orange-300 scale-110 shadow-orange-500/50'
                : isHovered
                ? isDark
                  ? 'bg-slate-800 text-cyan-300 border-cyan-400 scale-105'
                  : 'bg-white text-cyan-700 border-cyan-400 scale-105 shadow-md shadow-cyan-500/20'
                : isDark
                ? 'bg-slate-900/90 text-slate-300 border-slate-700/80'
                : 'bg-white/95 text-slate-800 border-slate-200/90 shadow-slate-300/40'
            }`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full inline-block shrink-0 shadow-sm"
              style={{ backgroundColor: isSelected ? '#ffffff' : room.color }}
            />
            {floorFilter === 'all' && (
              <span className={`text-[9px] font-mono font-black px-1 rounded ${
                room.floor === 'ground'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
              }`}>
                {room.floor === 'ground' ? 'GF' : '1F'}
              </span>
            )}
            <span className="tracking-tight">{room.code}</span>
            {isHovered && (
              <span
                className={`text-[10px] font-sans font-medium pl-1.5 border-l ${
                  isDark ? 'text-cyan-200 border-slate-600' : 'text-cyan-800 border-slate-200'
                }`}
              >
                {room.name}
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
