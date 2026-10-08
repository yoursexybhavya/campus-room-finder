import React, { useMemo, useState } from 'react';
import * as THREE from 'three';
import { Billboard, Text } from '@react-three/drei';
import { useCampusStore } from '../../stores/useCampusStore';
import { useThemeStore } from '../../stores/useThemeStore';

export interface MazeMapPOI {
  id: string;
  type: 'stairs' | 'exit' | 'elevator' | 'restroom' | 'hc_restroom' | 'aed' | 'accessible_entrance' | 'lecture_podium' | 'bike' | 'locker';
  label: string;
  coords: [number, number, number];
  floor: 'ground' | 'first';
  subLabel?: string;
}

// Master list of authentic MazeMap POI markers positioned across JIET Jodhpur campus
export const MAZEMAP_POIS: MazeMapPOI[] = [
  // ==========================================
  // GROUND FLOOR POIs
  // ==========================================
  // Rotunda Stairs & Emergency Egress (Green)
  { id: 'poi_stairs_ne_g', type: 'stairs', label: '150A', subLabel: 'Trapp', coords: [16, 1.1, -16], floor: 'ground' },
  { id: 'poi_stairs_nw_g', type: 'stairs', label: '150B', subLabel: 'Trapp', coords: [-16, 1.1, -16], floor: 'ground' },
  { id: 'poi_stairs_sw_g', type: 'stairs', label: '150C', subLabel: 'Trapp', coords: [-16, 1.1, 16], floor: 'ground' },
  { id: 'poi_stairs_se_g', type: 'stairs', label: '150D', subLabel: 'Trapp', coords: [16, 1.1, 16], floor: 'ground' },
  { id: 'poi_exit_south', type: 'exit', label: 'Utgang', subLabel: 'Main Exit', coords: [0, 0.9, 37], floor: 'ground' },
  { id: 'poi_hc_entrance_south', type: 'accessible_entrance', label: 'HC-inngang', subLabel: 'Ramp', coords: [-6, 0.9, 33], floor: 'ground' },
  { id: 'poi_hc_entrance_north', type: 'accessible_entrance', label: 'HC-inngang', subLabel: 'North Culvert', coords: [0, 0.9, -32], floor: 'ground' },

  // Elevators / Lifts (Green Heis)
  { id: 'poi_lift_east_g', type: 'elevator', label: 'Heis', subLabel: 'Lift 1', coords: [14.2, 1.1, 4], floor: 'ground' },
  { id: 'poi_lift_west_g', type: 'elevator', label: 'Heis', subLabel: 'Lift 2', coords: [-14.2, 1.1, 4], floor: 'ground' },

  // Restrooms / Sanitary Facilities (Blue WC)
  { id: 'poi_wc_east_g', type: 'restroom', label: 'WC', subLabel: 'Herre/Dame', coords: [17.5, 1.1, -24.5], floor: 'ground' },
  { id: 'poi_wc_west_g', type: 'restroom', label: 'WC', subLabel: 'Herre/Dame', coords: [-17.5, 1.1, -24.5], floor: 'ground' },
  { id: 'poi_hc_wc_south_g', type: 'hc_restroom', label: 'HC WC', subLabel: 'Universell', coords: [8, 1.1, 21], floor: 'ground' },

  // First Aid / AED (Red Hjertestarter)
  { id: 'poi_aed_foyer', type: 'aed', label: 'Hjertestarter', subLabel: 'Defibrillator', coords: [0, 1.1, 22], floor: 'ground' },

  // Amenities (Bicycle & Package Lockers)
  { id: 'poi_bike_south', type: 'bike', label: 'Sykkelstap', subLabel: 'Bike Hub', coords: [26, 0.9, 38], floor: 'ground' },
  { id: 'poi_locker_foyer', type: 'locker', label: 'Pakkeskap', subLabel: 'Lockers', coords: [-7, 1.1, 22], floor: 'ground' },

  // Lecture Theater Seating & Podiums
  { id: 'poi_s1_ground', type: 'lecture_podium', label: 'S1', subLabel: 'Auditorium', coords: [17.0, 1.1, 0], floor: 'ground' },
  { id: 'poi_s3_ground', type: 'lecture_podium', label: 'S3', subLabel: 'Seminar 1', coords: [14.5, 1.1, -20], floor: 'ground' },

  // ==========================================
  // FIRST FLOOR POIs
  // ==========================================
  // Rotunda Stairs (Upper landings)
  { id: 'poi_stairs_ne_1f', type: 'stairs', label: '150A', subLabel: 'Trapp 1F', coords: [16, 3.8, -16], floor: 'first' },
  { id: 'poi_stairs_nw_1f', type: 'stairs', label: '150B', subLabel: 'Trapp 1F', coords: [-16, 3.8, -16], floor: 'first' },
  { id: 'poi_stairs_sw_1f', type: 'stairs', label: '150C', subLabel: 'Trapp 1F', coords: [-16, 3.8, 16], floor: 'first' },
  { id: 'poi_stairs_se_1f', type: 'stairs', label: '150D', subLabel: 'Trapp 1F', coords: [16, 3.8, 16], floor: 'first' },

  // Elevators (Upper level)
  { id: 'poi_lift_east_1f', type: 'elevator', label: 'Heis', subLabel: 'Lift 1', coords: [14.2, 3.8, 4], floor: 'first' },
  { id: 'poi_lift_west_1f', type: 'elevator', label: 'Heis', subLabel: 'Lift 2', coords: [-14.2, 3.8, 4], floor: 'first' },

  // Restrooms First Floor (Placed at veranda doorways)
  { id: 'poi_wc_east_1f', type: 'restroom', label: 'WC', subLabel: 'East 1F', coords: [17.5, 3.8, -24.5], floor: 'first' },
  { id: 'poi_wc_west_1f', type: 'restroom', label: 'WC', subLabel: 'West 1F', coords: [-17.5, 3.8, -24.5], floor: 'first' },
  { id: 'poi_wc_north_1f', type: 'restroom', label: 'WC', subLabel: 'North 1F', coords: [-12.5, 3.8, -16.2], floor: 'first' },
  { id: 'poi_hc_wc_south_1f', type: 'hc_restroom', label: 'HC WC', subLabel: 'South 1F', coords: [-12.5, 3.8, 18.5], floor: 'first' },

  // Upper Lecture Theaters
  { id: 'poi_s2_upper', type: 'lecture_podium', label: 'S2', subLabel: 'LT-24', coords: [17.0, 3.8, 7], floor: 'first' },
  { id: 'poi_s4_upper', type: 'lecture_podium', label: 'S4', subLabel: 'Audi 1F', coords: [-10.0, 3.8, 18.5], floor: 'first' },
];

// In-memory cache for generated WebGL canvas textures
const textureCache = new Map<string, THREE.CanvasTexture>();

function getPoiCanvasTexture(type: MazeMapPOI['type'], isDark: boolean): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const cacheKey = `${type}_${isDark ? 'dark' : 'light'}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background color matching MazeMap palette
    let bgColor = '#059669'; // Emerald default for stairs/exit
    if (type === 'elevator') bgColor = '#047857'; // Deep emerald
    else if (type === 'restroom' || type === 'hc_restroom') bgColor = '#0284c7'; // Sky blue
    else if (type === 'aed') bgColor = '#e11d48'; // Rose red
    else if (type === 'accessible_entrance') bgColor = '#0d9488'; // Teal
    else if (type === 'bike' || type === 'locker') bgColor = '#475569'; // Slate
    else if (type === 'lecture_podium') bgColor = isDark ? '#334155' : '#1e293b';

    // Draw rounded badge rectangle
    ctx.clearRect(0, 0, 128, 128);
    const radius = 24;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(8, 8, 112, 112, radius);
    } else {
      ctx.rect(8, 8, 112, 112);
    }
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.85)';
    ctx.stroke();

    // Draw white vector icons
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (type === 'stairs') {
      // Stepped stairs outline
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(28, 96);
      ctx.lineTo(52, 96);
      ctx.lineTo(52, 74);
      ctx.lineTo(76, 74);
      ctx.lineTo(76, 52);
      ctx.lineTo(100, 52);
      ctx.lineTo(100, 30);
      ctx.stroke();
    } else if (type === 'exit') {
      // Exit door + running arrow
      ctx.lineWidth = 6;
      ctx.strokeRect(68, 28, 32, 72);
      ctx.beginPath();
      ctx.arc(44, 40, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(44, 52);
      ctx.lineTo(44, 76);
      ctx.lineTo(32, 94);
      ctx.moveTo(44, 70);
      ctx.lineTo(58, 86);
      ctx.moveTo(34, 60);
      ctx.lineTo(54, 62);
      ctx.stroke();
    } else if (type === 'elevator') {
      // Elevator cabin frame + up/down arrows
      ctx.lineWidth = 6;
      ctx.strokeRect(28, 24, 72, 80);
      ctx.beginPath();
      // Up triangle
      ctx.moveTo(48, 48);
      ctx.lineTo(40, 62);
      ctx.lineTo(56, 62);
      ctx.closePath();
      ctx.fill();
      // Down triangle
      ctx.moveTo(80, 80);
      ctx.lineTo(72, 66);
      ctx.lineTo(88, 66);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'restroom') {
      // Male & Female silhouettes
      // Male (left)
      ctx.beginPath();
      ctx.arc(44, 34, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(44, 46);
      ctx.lineTo(44, 76);
      ctx.moveTo(36, 96);
      ctx.lineTo(44, 76);
      ctx.lineTo(52, 96);
      ctx.moveTo(32, 54);
      ctx.lineTo(56, 54);
      ctx.stroke();

      // Female (right)
      ctx.beginPath();
      ctx.arc(84, 34, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(84, 46);
      ctx.lineTo(70, 80);
      ctx.lineTo(98, 80);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(78, 80);
      ctx.lineTo(78, 96);
      ctx.moveTo(90, 80);
      ctx.lineTo(90, 96);
      ctx.stroke();
    } else if (type === 'hc_restroom' || type === 'accessible_entrance') {
      // Wheelchair
      ctx.beginPath();
      ctx.arc(68, 34, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(58, 74, 20, 0, Math.PI * 1.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(68, 46);
      ctx.lineTo(68, 70);
      ctx.lineTo(84, 70);
      ctx.lineTo(84, 88);
      ctx.moveTo(56, 60);
      ctx.lineTo(76, 60);
      ctx.stroke();
    } else if (type === 'aed') {
      // Heart with pulse
      ctx.beginPath();
      ctx.moveTo(64, 44);
      ctx.bezierCurveTo(64, 30, 40, 24, 34, 44);
      ctx.bezierCurveTo(28, 64, 52, 80, 64, 98);
      ctx.bezierCurveTo(76, 80, 100, 64, 94, 44);
      ctx.bezierCurveTo(88, 24, 64, 30, 64, 44);
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(30, 60);
      ctx.lineTo(50, 60);
      ctx.lineTo(58, 46);
      ctx.lineTo(66, 76);
      ctx.lineTo(74, 60);
      ctx.lineTo(98, 60);
      ctx.stroke();
    } else if (type === 'bike') {
      // Bike wheels and frame
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(38, 78, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(90, 78, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(38, 78);
      ctx.lineTo(56, 56);
      ctx.lineTo(76, 56);
      ctx.lineTo(90, 78);
      ctx.moveTo(56, 56);
      ctx.lineTo(70, 78);
      ctx.lineTo(52, 78);
      ctx.moveTo(76, 56);
      ctx.lineTo(82, 44);
      ctx.stroke();
    } else {
      // Lecture podium / locker / default
      ctx.lineWidth = 6;
      ctx.strokeRect(32, 34, 64, 42);
      ctx.beginPath();
      ctx.moveTo(64, 76);
      ctx.lineTo(64, 96);
      ctx.moveTo(48, 96);
      ctx.lineTo(80, 96);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    textureCache.set(cacheKey, texture);
    return texture;
  } catch {
    return null;
  }
}

// Single Native WebGL POI Marker with Billboard, Texture & Text
const SinglePoiMarker: React.FC<{
  poi: MazeMapPOI;
  actualY: number;
  isDark: boolean;
}> = ({ poi, actualY, isDark }) => {
  const [hovered, setHovered] = useState(false);
  const setCameraTarget = useCampusStore((state) => state.setCameraTarget);
  const texture = useMemo(() => getPoiCanvasTexture(poi.type, isDark), [poi.type, isDark]);

  const [x, , z] = poi.coords;

  const handleClick = (e: any) => {
    e.stopPropagation();
    // Center camera on POI when clicked
    setCameraTarget(
      [x + 10, actualY + 8, z + 10],
      [x, actualY, z]
    );
  };

  return (
    <group
      position={[x, actualY, z]}
      scale={hovered ? [1.2, 1.2, 1.2] : [1, 1, 1]}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <Billboard follow={true}>
        {/* Native WebGL 2.5D Badge Mesh */}
        {texture ? (
          <mesh position={[0, 0.45, 0]}>
            <planeGeometry args={[0.95, 0.95]} />
            <meshBasicMaterial
              map={texture}
              transparent
              depthTest={true}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        ) : (
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[0.9, 0.9, 0.04]} />
            <meshStandardMaterial
              color={poi.type === 'restroom' || poi.type === 'hc_restroom' ? '#0284c7' : '#059669'}
              depthTest={true}
              depthWrite={false}
            />
          </mesh>
        )}

        {/* Crisp Native WebGL POI Text Label */}
        <Text
          position={[0, -0.16, 0]}
          fontSize={0.34}
          color={isDark ? '#f8fafc' : '#0f172a'}
          outlineWidth={0.04}
          outlineColor={isDark ? '#020617' : '#ffffff'}
          anchorX="center"
          anchorY="top"
        >
          {poi.label}
        </Text>

        {/* Sub-label for enhanced context */}
        {poi.subLabel && (
          <Text
            position={[0, -0.56, 0]}
            fontSize={0.22}
            color={isDark ? '#94a3b8' : '#64748b'}
            outlineWidth={0.03}
            outlineColor={isDark ? '#020617' : '#ffffff'}
            anchorX="center"
            anchorY="top"
          >
            {poi.subLabel}
          </Text>
        )}
      </Billboard>
    </group>
  );
};

export const MazeMapIconsLayer: React.FC = () => {
  const activeFloorFilter = useCampusStore((state) => state.activeFloorFilter);
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  const isAllMode = activeFloorFilter === 'all';
  const explodedElevation = isAllMode ? 3.0 : 0;

  // Filter POIs according to active floor
  const visiblePois = MAZEMAP_POIS.filter((poi) => {
    if (activeFloorFilter === 'ground') return poi.floor === 'ground';
    if (activeFloorFilter === 'first') return poi.floor === 'first';
    return true; // 'all' mode keeps BOTH Ground and First Floor POIs active in 3D WebGL
  });

  return (
    <group name="mazemap-poi-icons-layer">
      {visiblePois.map((poi) => {
        const [, y] = poi.coords;
        // In all floors exploded mode, first floor POIs are elevated by explodedElevation (+3.0m)
        const actualY = poi.floor === 'first' && isAllMode ? y + explodedElevation : y;

        return (
          <SinglePoiMarker
            key={poi.id}
            poi={poi}
            actualY={actualY}
            isDark={isDark}
          />
        );
      })}
    </group>
  );
};
