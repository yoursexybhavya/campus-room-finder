import { campusRooms } from './campusRooms';

export interface NavNode {
  id: string;
  coords: [number, number, number];
  neighbors: { id: string; weight: number }[];
}

function dist3D(a: [number, number, number], b: [number, number, number]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Master Waypoint Graph definition for the JIET Jodhpur digital twin
const rawWaypoints: { id: string; coords: [number, number, number]; links: string[] }[] = [
  // ==========================================
  // CAMPUS ENTRANCE & MAIN ARTERIALS (SOUTH)
  // ==========================================
  { id: 'gate', coords: [0, 0.1, 36], links: ['south_walkway'] },
  { id: 'south_walkway', coords: [0, 0.1, 24], links: ['gate', 'wp_admin', 'courtyard', 'corr_south_g'] },
  { id: 'wp_admin', coords: [0, 1.0, 20], links: ['south_walkway', 'corr_south_g'] },

  // ==========================================
  // CENTRAL COURTYARD RING & ARTERIALS
  // ==========================================
  { id: 'courtyard', coords: [0, 0.1, 10], links: ['south_walkway', 'courtyard_center', 'corr_west_g', 'corr_east_g'] },
  { id: 'courtyard_center', coords: [0, 0.1, 0], links: ['courtyard', 'north_walkway', 'corr_west_g', 'corr_east_g'] },
  { id: 'north_walkway', coords: [0, 0.1, -12], links: ['courtyard_center', 'corr_north_g'] },

  // ==========================================
  // GROUND FLOOR QUADRANGLE CORRIDOR LOOP
  // ==========================================
  // South Corridor
  { id: 'corr_south_g', coords: [0, 0.1, 18], links: ['south_walkway', 'stairs_sw_g', 'stairs_se_g', 'wp_admin'] },

  // South-West Corner & Stairs
  { id: 'stairs_sw_g', coords: [-16, 0.1, 16], links: ['corr_south_g', 'corr_west_g', 'stairs_sw_1f'] },
  { id: 'stairs_sw_1f', coords: [-16, 3.6, 16], links: ['stairs_sw_g', 'corr_south_1f', 'corr_west_1f'] },

  // West Corridor (Computing Labs & Applied Physics)
  { id: 'corr_west_g', coords: [-16, 0.1, 0], links: ['stairs_sw_g', 'stairs_nw_g', 'courtyard', 'courtyard_center', 'wp_lab1', 'wp_lab2', 'wp_lab_phy'] },
  { id: 'wp_lab1', coords: [-20, 1.0, 7], links: ['corr_west_g'] },
  { id: 'wp_lab2', coords: [-20, 1.0, -7], links: ['corr_west_g'] },
  { id: 'wp_lab_phy', coords: [-20, 1.0, 18], links: ['corr_west_g', 'stairs_sw_g'] },

  // North-West Corner & Stairs
  { id: 'stairs_nw_g', coords: [-16, 0.1, -16], links: ['corr_west_g', 'corr_north_g', 'stairs_nw_1f'] },
  { id: 'stairs_nw_1f', coords: [-16, 3.6, -16], links: ['stairs_nw_g', 'corr_west_1f', 'corr_north_1f'] },

  // North Corridor (Seminar Halls & Central Library)
  { id: 'corr_north_g', coords: [0, 0.1, -16], links: ['stairs_nw_g', 'stairs_ne_g', 'north_walkway', 'wp_sem1', 'wp_lib_main'] },
  { id: 'wp_sem1', coords: [12, 1.0, -20], links: ['corr_north_g'] },
  { id: 'wp_lib_main', coords: [0, 1.0, -22], links: ['corr_north_g'] },

  // North-East Corner & Stairs
  { id: 'stairs_ne_g', coords: [16, 0.1, -16], links: ['corr_north_g', 'corr_east_g', 'stairs_ne_1f'] },
  { id: 'stairs_ne_1f', coords: [16, 3.6, -16], links: ['stairs_ne_g', 'corr_north_1f', 'corr_east_1f'] },

  // East Corridor (Lecture Theaters LT-9, LT-10, LT-11, LT-12)
  { id: 'corr_east_g', coords: [16, 0.1, 0], links: ['stairs_ne_g', 'stairs_se_g', 'courtyard', 'courtyard_center', 'wp_lt1', 'wp_lt2'] },
  { id: 'wp_lt1', coords: [20, 1.0, 7], links: ['corr_east_g'] },
  { id: 'wp_lt2', coords: [20, 1.0, -7], links: ['corr_east_g'] },

  // South-East Corner & Stairs
  { id: 'stairs_se_g', coords: [16, 0.1, 16], links: ['corr_east_g', 'corr_south_g', 'stairs_se_1f'] },
  { id: 'stairs_se_1f', coords: [16, 3.6, 16], links: ['stairs_se_g', 'corr_east_1f', 'corr_south_1f'] },

  // ==========================================
  // FIRST FLOOR QUADRANGLE CORRIDOR LOOP
  // ==========================================
  // South Corridor
  { id: 'corr_south_1f', coords: [0, 3.6, 16], links: ['stairs_sw_1f', 'stairs_se_1f', 'wp_south_1f'] },
  { id: 'wp_south_1f', coords: [0, 3.6, 18], links: ['corr_south_1f'] },

  // West Corridor (AI/ML & Robotics Labs)
  { id: 'corr_west_1f', coords: [-16, 3.6, 0], links: ['stairs_sw_1f', 'stairs_nw_1f', 'wp_lab3', 'wp_lab4'] },
  { id: 'wp_lab3', coords: [-20, 3.6, 7], links: ['corr_west_1f'] },
  { id: 'wp_lab4', coords: [-20, 3.6, -7], links: ['corr_west_1f'] },

  // North Corridor (Upper Halls & Faculty Suites)
  { id: 'corr_north_1f', coords: [0, 3.6, -16], links: ['stairs_nw_1f', 'stairs_ne_1f', 'wp_sem2', 'wp_fac_cse'] },
  { id: 'wp_sem2', coords: [12, 3.6, -20], links: ['corr_north_1f'] },
  { id: 'wp_fac_cse', coords: [0, 3.6, -22], links: ['corr_north_1f'] },

  // East Corridor (Upper Lecture Theaters LT-24, LT-29)
  { id: 'corr_east_1f', coords: [16, 3.6, 0], links: ['stairs_ne_1f', 'stairs_se_1f', 'wp_lt3', 'wp_lt4'] },
  { id: 'wp_lt3', coords: [20, 3.6, 7], links: ['corr_east_1f'] },
  { id: 'wp_lt4', coords: [20, 3.6, -7], links: ['corr_east_1f'] },
];

export function buildWaypointGraph(): Map<string, NavNode> {
  const map = new Map<string, NavNode>();

  // Pass 1: Initialize all nodes
  for (const item of rawWaypoints) {
    map.set(item.id, {
      id: item.id,
      coords: item.coords,
      neighbors: [],
    });
  }

  // Pass 2: Calculate neighbor edge weights bidirectionally
  for (const item of rawWaypoints) {
    const node = map.get(item.id)!;
    for (const linkedId of item.links) {
      const neighborNode = map.get(linkedId);
      if (neighborNode) {
        const weight = dist3D(node.coords, neighborNode.coords);
        if (!node.neighbors.some((n) => n.id === linkedId)) {
          node.neighbors.push({ id: linkedId, weight });
        }
        if (!neighborNode.neighbors.some((n) => n.id === item.id)) {
          neighborNode.neighbors.push({ id: item.id, weight });
        }
      }
    }
  }

  // Direct room aliases
  const roomAliases: Record<string, string> = {
    'LT-1': 'wp_lt1',
    'lt1': 'wp_lt1',
    'LT-9': 'wp_lt1',
    'LT-2': 'wp_lt2',
    'lt2': 'wp_lt2',
    'LT-10': 'wp_lt2',
    'LT-3': 'wp_lt3',
    'lt3': 'wp_lt3',
    'LT-24': 'wp_lt3',
    'LT-4': 'wp_lt4',
    'lt4': 'wp_lt4',
    'LT-29': 'wp_lt4',
    'LT-11': 'wp_lt1',
    'LT-12': 'wp_lt2',
    'LT-14': 'wp_sem1',
    'LT-33': 'wp_lt3',
    'LT-36': 'wp_lt4',
    'LAB-1': 'wp_lab1',
    'lab1': 'wp_lab1',
    'PC-LAB': 'wp_lab1',
    'LAB-2': 'wp_lab2',
    'lab2': 'wp_lab2',
    'IDEA-LAB': 'wp_lab2',
    'LAB-3': 'wp_lab3',
    'lab3': 'wp_lab3',
    'EF-3': 'wp_lab3',
    'LAB-4': 'wp_lab4',
    'lab4': 'wp_lab4',
    'CF-7': 'wp_lab4',
    'CF-8': 'wp_lab3',
    'GF-16': 'wp_lab2',
    'DH-1': 'wp_sem1',
    'DH-3': 'wp_sem2',
    'TUT-7': 'wp_lib_main',
    'LIB-MAIN': 'wp_lib_main',
    'LIB-01': 'wp_lib_main',
    'CENTRAL-LIB': 'wp_lib_main',
    'ADMIN-01': 'wp_admin',
    'ADM-01': 'wp_admin',
    'TECH-CONF': 'wp_admin',
    'SEM-1': 'wp_sem1',
    'SEM-2': 'wp_sem2',
    'FAC-CSE': 'wp_fac_cse',
    'LAB-PHY': 'wp_lab_phy',
    'CHEM-LAB': 'wp_lab_phy',
    'center_fountain': 'courtyard_center',
  };

  for (const [alias, targetId] of Object.entries(roomAliases)) {
    const target = map.get(targetId);
    if (target && !map.has(alias)) {
      map.set(alias, {
        id: alias,
        coords: target.coords,
        neighbors: [{ id: targetId, weight: 0.01 }],
      });
      target.neighbors.push({ id: alias, weight: 0.01 });
    }
  }

  // Ensure every room in campusRooms has a direct navigable waypoint node
  for (const room of campusRooms) {
    if (!map.has(room.id)) {
      const target = map.get(room.doorWaypointId);
      if (target) {
        map.set(room.id, {
          id: room.id,
          coords: room.position,
          neighbors: [{ id: room.doorWaypointId, weight: 0.01 }],
        });
        target.neighbors.push({ id: room.id, weight: 0.01 });
      }
    }
  }

  return map;
}

export const WAYPOINTS_MAP = buildWaypointGraph();
export const campusWaypointGraph = WAYPOINTS_MAP;
