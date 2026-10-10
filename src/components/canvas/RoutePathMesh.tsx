import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useCampusStore } from '../../stores/useCampusStore';
import { campusRooms } from '../../data/campusRooms';

/**
 * Creates a high-fidelity animated directional chevron ribbon texture.
 * Crisp white forward chevrons (>>>) embedded in a glowing azure/cyan ribbon.
 */
function createRibbonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Translucent glowing cyan body gradient
  const grad = ctx.createLinearGradient(0, 0, 128, 0);
  grad.addColorStop(0, 'rgba(2, 132, 199, 0.35)');
  grad.addColorStop(0.12, 'rgba(14, 165, 233, 0.85)');
  grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.98)');
  grad.addColorStop(0.88, 'rgba(14, 165, 233, 0.85)');
  grad.addColorStop(1, 'rgba(2, 132, 199, 0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 256);

  // Sharp luminous outer edge border rails
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fillRect(4, 0, 5, 256);
  ctx.fillRect(119, 0, 5, 256);

  // Directional forward-pointing chevrons
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 10;

  for (let y = 32; y < 256; y += 64) {
    ctx.beginPath();
    ctx.moveTo(34, y + 16);
    ctx.lineTo(64, y - 10);
    ctx.lineTo(94, y + 16);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Rotunda corner specifications matching Blender digital twin geometry:
 * Corridors are 3.05m wide. Straight centerlines are at |X| = 19.525m and |Z| = 19.525m.
 * Rotunda staircase hubs are recessed at (±19.5, ±19.5).
 */
interface RotundaCorner {
  id: 'sw' | 'se' | 'nw' | 'ne';
  cx: number;
  cz: number;
  quadX: number;
  quadZ: number;
  baseDeg: number;
  name: string;
}

const ROTUNDA_CORNERS: RotundaCorner[] = [
  { id: 'sw', cx: -19.5, cz: 19.5, quadX: -1, quadZ: 1, baseDeg: -105, name: 'South-West Rotunda' },
  { id: 'se', cx: 19.5, cz: 19.5, quadX: 1, quadZ: 1, baseDeg: -15, name: 'South-East Rotunda' },
  { id: 'nw', cx: -19.5, cz: -19.5, quadX: -1, quadZ: -1, baseDeg: 165, name: 'North-West Rotunda' },
  { id: 'ne', cx: 19.5, cz: -19.5, quadX: 1, quadZ: -1, baseDeg: 75, name: 'North-East Rotunda' },
];

/**
 * Maps any waypoint to its true architectural corridor/room centerline and floor elevation:
 * Ground Floor: 0.21m + 0.06m = 0.27m (grounded directly on tiles, zero z-fighting)
 * First Floor: 4.13m + 0.06m = 4.19m (grounded directly on upper tiles)
 * Outdoor plaza / lawn: 0.10m + 0.06m = 0.16m
 */
function alignPointToCorridorGeometry(pt: [number, number, number]): [number, number, number] {
  const [rawX, rawY, rawZ] = pt;
  let x = rawX;
  let z = rawZ;

  // Align corridor waypoints to true 10-foot covered veranda centerlines
  // 1. South Corridor (Z in [14, 21] and X in [-18, 18], outside central gate walkway)
  if (rawZ >= 15 && rawZ <= 21 && Math.abs(rawX) > 1.2 && Math.abs(rawX) <= 18.5) {
    z = 19.525;
  }
  // 2. North Corridor (Z in [-21, -15] and X in [-18, 18], outside central exit)
  else if (rawZ <= -15 && rawZ >= -21 && Math.abs(rawX) > 1.2 && Math.abs(rawX) <= 18.5) {
    z = -19.525;
  }
  // 3. West Corridor (X in [-21, -15] and Z in [-18, 18])
  else if (rawX <= -15 && rawX >= -21 && Math.abs(rawZ) <= 18.5) {
    x = -19.525;
  }
  // 4. East Corridor (X in [15, 21] and Z in [-18, 18])
  else if (rawX >= 15 && rawX <= 21 && Math.abs(rawZ) <= 18.5) {
    x = 19.525;
  }

  // Determine physical floor elevation
  let y = 0.27; // Ground floor default
  if (rawY <= 0.12 && (Math.abs(rawX) < 1.0 && rawZ > 22 || Math.abs(rawX) < 12 && Math.abs(rawZ) < 12)) {
    y = 0.16; // Outdoor entrance walkway / courtyard lawn
  } else if (rawY >= 3.0) {
    y = 4.19; // First floor finished floor
  } else if (rawY > 0.15 && rawY < 3.0) {
    // Intermediate stair elevation
    const prog = (rawY - 0.1) / (3.6 - 0.1);
    y = 0.27 + prog * (4.19 - 0.27);
  }

  return [x, y, z];
}

/**
 * Expands raw waypoints into an authentic architectural 3D route:
 * 1. Replaces vertical air cuts with 22-step helical staircase spiral points.
 * 2. Curves corner transitions around rotunda walls (zero wall clipping).
 * 3. Applies quadratic bezier fillet corner smoothing.
 */
function buildAuthentic3DRoute(rawPath: [number, number, number][]): {
  points: THREE.Vector3[];
  stairMarkers: { position: [number, number, number]; label: string; goingUp: boolean }[];
} {
  if (rawPath.length < 2) return { points: [], stairMarkers: [] };

  const alignedPoints: [number, number, number][] = rawPath.map(alignPointToCorridorGeometry);
  const expanded: [number, number, number][] = [];
  const stairMarkers: { position: [number, number, number]; label: string; goingUp: boolean }[] = [];

  for (let i = 0; i < alignedPoints.length; i++) {
    const curr = alignedPoints[i];
    expanded.push(curr);

    if (i < alignedPoints.length - 1) {
      const next = alignedPoints[i + 1];
      const dy = next[1] - curr[1];

      // Detect vertical floor transition at staircase (dy >= 2.0m)
      if (Math.abs(dy) >= 2.0) {
        const goingUp = dy > 0;
        // Identify corner rotunda based on average position
        const midX = (curr[0] + next[0]) * 0.5;
        const midZ = (curr[2] + next[2]) * 0.5;

        const corner = ROTUNDA_CORNERS.find(
          (c) => Math.sign(c.cx) === Math.sign(midX) && Math.sign(c.cz) === Math.sign(midZ)
        ) || ROTUNDA_CORNERS[0];

        stairMarkers.push({
          position: [corner.cx + corner.quadX * 1.2, goingUp ? 0.27 + 1.2 : 4.19 + 1.2, corner.cz - corner.quadZ * 0.8],
          label: goingUp ? `Take ${corner.name} to 1st Floor` : `Take ${corner.name} to Ground Level`,
          goingUp,
        });

        // Generate 22 authentic helical steps winding 270° around central core column
        const numSteps = 22;
        const rStair = 0.85; // Center of 1.05m wide granite treads
        const startY = curr[1];
        const endY = next[1];

        // Step 0: corridor entrance archway to stair
        const archAngle = corner.baseDeg * (Math.PI / 180);
        expanded.push([
          corner.cx + (rStair + 0.4) * Math.cos(archAngle),
          startY,
          corner.cz - (rStair + 0.4) * Math.sin(archAngle),
        ]);

        for (let s = 1; s <= numSteps; s++) {
          const t = s / numSteps;
          const prog = goingUp ? t : 1.0 - t;
          const angleDeg = corner.baseDeg + prog * 270;
          const angleRad = angleDeg * (Math.PI / 180);
          const stepY = startY + t * (endY - startY);

          const stepX = corner.cx + rStair * Math.cos(angleRad);
          const stepZ = corner.cz - rStair * Math.sin(angleRad);

          expanded.push([Number(stepX.toFixed(3)), Number(stepY.toFixed(3)), Number(stepZ.toFixed(3))]);
        }

        // Top landing balustrade exit opening into corridor
        const landAngle = (corner.baseDeg + 270) * (Math.PI / 180);
        expanded.push([
          corner.cx + (rStair + 0.4) * Math.cos(landAngle),
          endY,
          corner.cz - (rStair + 0.4) * Math.sin(landAngle),
        ]);
      }
      // Detect 90° corner transitions around rotunda bays (on same floor)
      else if (Math.abs(curr[0] - next[0]) > 4 && Math.abs(curr[2] - next[2]) > 4 && Math.abs(dy) < 0.2) {
        const midX = (curr[0] + next[0]) * 0.5;
        const midZ = (curr[2] + next[2]) * 0.5;
        const corner = ROTUNDA_CORNERS.find(
          (c) => Math.sign(c.cx) === Math.sign(midX) && Math.sign(c.cz) === Math.sign(midZ)
        );

        if (corner) {
          // Route cleanly around the outside of the rotunda wall
          const cornerArcX = corner.quadX * 20.85;
          const cornerArcZ = corner.quadZ * 20.85;
          expanded.push([cornerArcX, curr[1], cornerArcZ]);
        }
      }
    }
  }

  // Apply smooth corner filleting to generate smooth polyline ribbon
  const smoothedVectors: THREE.Vector3[] = [];
  for (let i = 0; i < expanded.length; i++) {
    const P = new THREE.Vector3(...expanded[i]);

    if (i > 0 && i < expanded.length - 1) {
      const prev = new THREE.Vector3(...expanded[i - 1]);
      const next = new THREE.Vector3(...expanded[i + 1]);

      const v1 = prev.clone().sub(P);
      const v2 = next.clone().sub(P);
      const len1 = v1.length();
      const len2 = v2.length();

      // Check if this is a horizontal turn that needs filleting
      if (len1 > 0.8 && len2 > 0.8 && Math.abs(v1.y) < 0.1 && Math.abs(v2.y) < 0.1) {
        v1.normalize();
        v2.normalize();
        const angle = v1.angleTo(v2);

        // Turn angle between 30° and 160°
        if (angle > (30 * Math.PI) / 180 && angle < (160 * Math.PI) / 180) {
          const filletDist = Math.min(0.65, len1 * 0.35, len2 * 0.35);
          const pStart = P.clone().add(v1.multiplyScalar(filletDist));
          const pEnd = P.clone().add(v2.multiplyScalar(filletDist));

          // Sample quadratic bezier
          const segs = 4;
          for (let s = 0; s <= segs; s++) {
            const t = s / segs;
            const oneMinusT = 1 - t;
            const bPt = new THREE.Vector3()
              .addScaledVector(pStart, oneMinusT * oneMinusT)
              .addScaledVector(P, 2 * oneMinusT * t)
              .addScaledVector(pEnd, t * t);
            smoothedVectors.push(bPt);
          }
          continue;
        }
      }
    }

    smoothedVectors.push(P);
  }

  return { points: smoothedVectors, stairMarkers };
}

/**
 * Builds continuous flat 3D ribbon geometry hugging the floor with UV mapping.
 */
function buildRibbonGeometry(points: THREE.Vector3[], width: number = 0.46): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  if (points.length < 2) return geom;

  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  let accumDistance = 0;
  const halfW = width * 0.5;

  for (let i = 0; i < points.length; i++) {
    const P = points[i];

    // Compute forward tangent vector in horizontal plane
    let tangent = new THREE.Vector3();
    if (i === 0) {
      tangent.subVectors(points[1], P);
    } else if (i === points.length - 1) {
      tangent.subVectors(P, points[i - 1]);
    } else {
      tangent.subVectors(points[i + 1], points[i - 1]);
    }

    if (i > 0) {
      accumDistance += P.distanceTo(points[i - 1]);
    }

    // Normal perpendicular in XZ plane
    let perp = new THREE.Vector3(-tangent.z, 0, tangent.x);
    if (perp.lengthSq() < 0.00001) {
      perp.set(1, 0, 0);
    } else {
      perp.normalize();
    }

    const left = P.clone().addScaledVector(perp, halfW);
    const right = P.clone().addScaledVector(perp, -halfW);

    vertices.push(left.x, left.y, left.z);
    vertices.push(right.x, right.y, right.z);

    normals.push(0, 1, 0);
    normals.push(0, 1, 0);

    const vCoord = accumDistance / 1.5; // Repeat chevron pattern every 1.5m
    uvs.push(0, vCoord);
    uvs.push(1, vCoord);

    if (i < points.length - 1) {
      const baseIdx = i * 2;
      indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
      indices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2);
    }
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  return geom;
}

export const RoutePathMesh: React.FC = () => {
  const navigationPath = useCampusStore((state) => state.navigationPath);
  const activeFloorFilter = useCampusStore((state) => state.activeFloorFilter);
  const selectedRoomId = useCampusStore((state) => state.selectedRoomId);

  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const goalPinRef = useRef<THREE.Group>(null);
  const originPulseRef = useRef<THREE.Mesh>(null);

  // Initialize animated chevron canvas texture
  const ribbonTexture = useMemo(() => {
    const tex = createRibbonTexture();
    textureRef.current = tex;
    return tex;
  }, []);

  // Expand and smooth path into architectural 3D route
  const { points, stairMarkers } = useMemo(() => {
    if (!navigationPath || navigationPath.length < 2) return { points: [], stairMarkers: [] };
    return buildAuthentic3DRoute(navigationPath);
  }, [navigationPath]);

  // Build sleek ribbon buffer geometry
  const ribbonGeometry = useMemo(() => {
    if (points.length < 2) return null;
    return buildRibbonGeometry(points, 0.46);
  }, [points]);

  // Destination room info for badge
  const destinationRoom = useMemo(() => {
    if (!selectedRoomId) return null;
    return campusRooms.find((r) => r.id === selectedRoomId);
  }, [selectedRoomId]);

  // Animate directional flow and marker pulsations
  useFrame((state, delta) => {
    if (textureRef.current) {
      // Flow chevrons forward continuously in walking direction
      textureRef.current.offset.y -= delta * 1.6;
    }

    const t = state.clock.getElapsedTime();

    // Floating goal pin gentle bobbing and rotation
    if (goalPinRef.current) {
      goalPinRef.current.position.y = (points[points.length - 1]?.y || 0) + 0.65 + Math.sin(t * 3.5) * 0.12;
      goalPinRef.current.rotation.y = t * 1.5;
    }

    // Origin pulsing ripple ring
    if (originPulseRef.current) {
      const scale = 1.0 + (t % 1.6) * 1.8;
      originPulseRef.current.scale.set(scale, scale, 1);
      const mat = originPulseRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = Math.max(0, 0.8 - (t % 1.6) * 0.5);
      }
    }
  });

  if (!navigationPath || navigationPath.length < 2 || points.length < 2 || !ribbonGeometry) {
    return null;
  }

  const startPt = points[0];
  const endPt = points[points.length - 1];

  const isPointVisible = (y: number) => {
    if (activeFloorFilter === 'all') return true;
    if (activeFloorFilter === 'ground') return y <= 2.2;
    if (activeFloorFilter === 'first') return y >= 2.0;
    return true;
  };

  return (
    <group name="route-path-mesh">
      {/* 1. Sleek 3D Navigation Ribbon with Directional Flowing Chevrons */}
      <mesh geometry={ribbonGeometry}>
        <meshStandardMaterial
          map={ribbonTexture}
          emissiveMap={ribbonTexture}
          emissive="#00f0ff"
          emissiveIntensity={0.65}
          color="#ffffff"
          roughness={0.2}
          metalness={0.1}
          transparent={true}
          opacity={0.94}
          side={THREE.DoubleSide}
          polygonOffset={true}
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
          depthWrite={false}
        />
      </mesh>

      {/* 2. Start Waypoint Origin Pin & Pulsing Wave Ring */}
      {isPointVisible(startPt.y) && (
        <group position={[startPt.x, startPt.y, startPt.z]}>
          {/* Grounded emerald base disc */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <circleGeometry args={[0.32, 24]} />
            <meshBasicMaterial color="#10b981" />
          </mesh>
          {/* Expanding concentric ripple wave */}
          <mesh ref={originPulseRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
            <ringGeometry args={[0.28, 0.38, 24]} />
            <meshBasicMaterial color="#10b981" transparent opacity={0.7} depthWrite={false} />
          </mesh>
          {/* Origin central jewel sphere */}
          <mesh position={[0, 0.22, 0]}>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial
              color="#10b981"
              emissive="#10b981"
              emissiveIntensity={1.8}
              roughness={0.1}
            />
          </mesh>
        </group>
      )}

      {/* 3. Destination Target Marker Pin with Floating Animated 3D Pin */}
      {isPointVisible(endPt.y) && (
        <group position={[endPt.x, endPt.y, endPt.z]}>
          {/* Grounded target ripple disc */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <circleGeometry args={[0.38, 24]} />
            <meshBasicMaterial color="#f43f5e" />
          </mesh>
          {/* Outer dashed halo ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
            <ringGeometry args={[0.42, 0.54, 24]} />
            <meshBasicMaterial color="#fb7185" transparent opacity={0.65} depthWrite={false} />
          </mesh>

          {/* Floating animated 3D Goal Pin */}
          <group ref={goalPinRef} position={[0, 0.75, 0]}>
            {/* Upper glowing sphere */}
            <mesh position={[0, 0.35, 0]}>
              <sphereGeometry args={[0.26, 16, 16]} />
              <meshStandardMaterial
                color="#f43f5e"
                emissive="#f43f5e"
                emissiveIntensity={2.0}
                roughness={0.1}
              />
            </mesh>
            {/* Inverted pointer cone */}
            <mesh position={[0, 0.12, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.24, 0.38, 16]} />
              <meshStandardMaterial
                color="#f43f5e"
                emissive="#e11d48"
                emissiveIntensity={1.4}
                roughness={0.1}
              />
            </mesh>
          </group>

          {/* Destination 3D HUD Badge */}
          {destinationRoom && (
            <Html center position={[0, 1.6, 0]} distanceFactor={28} className="pointer-events-none select-none">
              <div className="bg-rose-500/90 text-white font-extrabold text-xs px-2.5 py-1 rounded-full shadow-lg border border-rose-300 backdrop-blur-md flex items-center gap-1.5 whitespace-nowrap animate-bounce">
                <span>📍</span>
                <span>{destinationRoom.code}: {destinationRoom.name}</span>
              </div>
            </Html>
          )}
        </group>
      )}

      {/* 4. Floor Transition Badges at Staircases */}
      {stairMarkers.map((marker, idx) => (
        <group key={`stair-marker-${idx}`} position={marker.position}>
          <Html center distanceFactor={24} className="pointer-events-none select-none">
            <div className="bg-purple-600/90 text-white font-bold text-xs px-3 py-1.5 rounded-2xl shadow-xl border border-purple-300/60 backdrop-blur-md flex items-center gap-2 whitespace-nowrap">
              <span className="text-base">{marker.goingUp ? '🪜' : '⬇️'}</span>
              <span>{marker.label}</span>
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
};
