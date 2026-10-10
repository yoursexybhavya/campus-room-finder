import { campusWaypointGraph, NavNode } from '../../data/waypoints';
import { campusRooms } from '../../data/campusRooms';

export interface RouteStep {
  id: string;
  instruction: string;
  landmark: string;
  floor: 'ground' | 'first';
  distanceMeters: number;
}

export interface DetailedRoute {
  path: [number, number, number][];
  nodeIds: string[];
  steps: RouteStep[];
  totalDistanceMeters: number;
  estimatedWalkingMinutes: number;
}

export const WAYPOINT_LABELS: Record<string, { label: string; floor: 'ground' | 'first'; detail: string }> = {
  gate: { label: 'Main Entrance Gate', floor: 'ground', detail: 'South campus entry security checkpoint' },
  south_walkway: { label: 'South Walkway', floor: 'ground', detail: 'Main paved walkway approaching Central Quadrangle' },
  wp_admin: { label: 'Administrative Block', floor: 'ground', detail: 'Secretariat, Dean Office & Tech Conf Hall' },
  courtyard: { label: 'Courtyard South Walkway', floor: 'ground', detail: 'Entering central open lawn perimeter' },
  courtyard_center: { label: 'Courtyard Lawn Cross-Path', floor: 'ground', detail: 'Central quadrangle crossroads' },
  center_fountain: { label: 'Courtyard Lawn Cross-Path', floor: 'ground', detail: 'Central quadrangle crossroads' },
  north_walkway: { label: 'North Walkway', floor: 'ground', detail: 'Northern quadrangle connector to Central Library' },
  corr_south_g: { label: 'South Ground Corridor', floor: 'ground', detail: 'Covered ground floor veranda with sandstone pillars' },
  stairs_sw_g: { label: 'South-West Stairwell (GF)', floor: 'ground', detail: 'Corner helical staircase to First Floor' },
  stairs_sw_1f: { label: 'South-West Stairwell (1F)', floor: 'first', detail: 'First floor landing at South-West wing' },
  corr_west_g: { label: 'West Ground Corridor', floor: 'ground', detail: 'Computing Labs & Applied Physics wing' },
  wp_lab1: { label: 'PC Programming Lab Doorway', floor: 'ground', detail: 'Entrance to PC-LAB' },
  wp_lab2: { label: 'Idea Lab / GF-16 Doorway', floor: 'ground', detail: 'Entrance to AICTE Idea Lab & Computer Center' },
  wp_lab_phy: { label: 'Chemistry Lab Doorway', floor: 'ground', detail: 'Entrance to Engineering Chemistry Lab' },
  stairs_nw_g: { label: 'North-West Stairwell (GF)', floor: 'ground', detail: 'Corner helical staircase to First Floor' },
  stairs_nw_1f: { label: 'North-West Stairwell (1F)', floor: 'first', detail: 'First floor landing at North-West wing' },
  corr_north_g: { label: 'North Ground Corridor', floor: 'ground', detail: 'Central Library & Drawing Hall veranda' },
  wp_sem1: { label: 'Drawing Hall 1 Doorway', floor: 'ground', detail: 'Entrance to DH-1 Drafting Hall' },
  wp_lib_main: { label: 'Central Library Entrance', floor: 'ground', detail: 'Entrance to Central Knowledge Library' },
  stairs_ne_g: { label: 'North-East Stairwell (GF)', floor: 'ground', detail: 'Corner helical staircase to First Floor' },
  stairs_ne_1f: { label: 'North-East Stairwell (1F)', floor: 'first', detail: 'First floor landing at North-East wing' },
  corr_east_g: { label: 'East Ground Corridor', floor: 'ground', detail: 'Lecture Theaters wing (LT-9, LT-10, LT-11, LT-12)' },
  wp_lt1: { label: 'LT-9 / LT-11 Doorway', floor: 'ground', detail: 'Entrance to Lecture Theater 9 & 11' },
  wp_lt2: { label: 'LT-10 / LT-12 Doorway', floor: 'ground', detail: 'Entrance to Lecture Theater 10 & 12' },
  stairs_se_g: { label: 'South-East Stairwell (GF)', floor: 'ground', detail: 'Corner helical staircase to First Floor' },
  stairs_se_1f: { label: 'South-East Stairwell (1F)', floor: 'first', detail: 'First floor landing at South-East wing' },
  corr_south_1f: { label: 'South 1st Floor Corridor', floor: 'first', detail: 'Upper corridor overlooking quadrangle courtyard' },
  corr_west_1f: { label: 'West 1st Floor Corridor', floor: 'first', detail: 'AI/ML & Advanced Computing Labs wing' },
  wp_lab3: { label: 'AI/ML Lab Doorway', floor: 'first', detail: 'Entrance to AI/ML & Data Engineering Lab' },
  wp_lab4: { label: 'IoT & Robotics Lab Doorway', floor: 'first', detail: 'Entrance to IoT & Embedded Systems Lab' },
  corr_north_1f: { label: 'North 1st Floor Corridor', floor: 'first', detail: 'Faculty Chambers & Drawing Hall 3' },
  wp_sem2: { label: 'Drawing Hall 3 Doorway', floor: 'first', detail: 'Entrance to DH-3 Seminar Hall' },
  wp_fac_cse: { label: 'CSE Faculty Chamber Doorway', floor: 'first', detail: 'Entrance to Computer Science Faculty Suite' },
  corr_east_1f: { label: 'East 1st Floor Corridor', floor: 'first', detail: 'Upper Lecture Theaters (LT-24, LT-29, LT-33, LT-36)' },
  wp_lt3: { label: 'LT-24 / LT-33 Doorway', floor: 'first', detail: 'Entrance to Lecture Theaters 24 & 33' },
  wp_lt4: { label: 'LT-29 / LT-36 Doorway', floor: 'first', detail: 'Entrance to Lecture Theaters 29 & 36' },
};

/**
 * Solves the 3D shortest path between two waypoints in the campus graph using Dijkstra's algorithm.
 * Returns the ordered array of 3D coordinates [x, y, z] from start to target.
 */
export function findDijkstraPath(
  startId: string,
  targetId: string,
  nodes: Map<string, NavNode> = campusWaypointGraph
): [number, number, number][] | null {
  const result = findDijkstraPathDetails(startId, targetId, nodes);
  return result ? result.path : null;
}

/**
 * Solves shortest path and returns node ID sequence, coordinates, and distances.
 */
export function findDijkstraPathDetails(
  startId: string,
  targetId: string,
  nodes: Map<string, NavNode> = campusWaypointGraph
): { path: [number, number, number][]; nodeIds: string[] } | null {
  if (!startId || !targetId || !nodes.has(startId) || !nodes.has(targetId)) {
    return null;
  }

  if (startId === targetId) {
    const node = nodes.get(startId);
    return node ? { path: [node.coords], nodeIds: [startId] } : null;
  }

  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();

  for (const id of nodes.keys()) {
    distances.set(id, Infinity);
    previous.set(id, null);
    unvisited.add(id);
  }

  distances.set(startId, 0);

  while (unvisited.size > 0) {
    let closestNodeId: string | null = null;
    let minDistance = Infinity;

    for (const id of unvisited) {
      const dist = distances.get(id)!;
      if (dist < minDistance) {
        minDistance = dist;
        closestNodeId = id;
      }
    }

    if (!closestNodeId || minDistance === Infinity) break;
    if (closestNodeId === targetId) break;

    unvisited.delete(closestNodeId);
    const currentNode = nodes.get(closestNodeId)!;

    for (const neighbor of currentNode.neighbors) {
      if (!unvisited.has(neighbor.id)) continue;
      const alt = minDistance + neighbor.weight;
      if (alt < distances.get(neighbor.id)!) {
        distances.set(neighbor.id, alt);
        previous.set(neighbor.id, closestNodeId);
      }
    }
  }

  if (distances.get(targetId) === Infinity) return null;

  const pathCoords: [number, number, number][] = [];
  const nodeIds: string[] = [];
  let curr: string | null = targetId;
  while (curr) {
    const node = nodes.get(curr);
    if (node) {
      pathCoords.unshift(node.coords);
      nodeIds.unshift(curr);
    }
    curr = previous.get(curr) || null;
  }

  return { path: pathCoords, nodeIds };
}

/**
 * Calculates navigation path from the main entrance gate to a specified room.
 */
export function findPathToRoom(
  roomId: string,
  startId: string = 'gate',
  nodes: Map<string, NavNode> = campusWaypointGraph
): [number, number, number][] | null {
  return findDijkstraPath(startId, roomId, nodes);
}

export function getLandmarkInfo(nodeId: string, targetRoom?: any): { label: string; floor: 'ground' | 'first' } {
  if (WAYPOINT_LABELS[nodeId]) {
    return WAYPOINT_LABELS[nodeId];
  }
  if (targetRoom && (nodeId === targetRoom.id || nodeId === targetRoom.code)) {
    return { label: `${targetRoom.code}: ${targetRoom.name}`, floor: targetRoom.floor };
  }
  if (nodeId.startsWith('door_')) {
    const rId = nodeId.replace('door_', '');
    const rm = campusRooms.find((r) => r.id === rId);
    return { label: rm ? `Doorway of ${rm.code}` : 'Doorway', floor: rm?.floor || 'ground' };
  }
  if (nodeId.includes('stairs_sw')) return { label: 'South-West Rotunda Stairs', floor: nodeId.includes('1f') ? 'first' : 'ground' };
  if (nodeId.includes('stairs_se')) return { label: 'South-East Rotunda Stairs', floor: nodeId.includes('1f') ? 'first' : 'ground' };
  if (nodeId.includes('stairs_nw')) return { label: 'North-West Rotunda Stairs', floor: nodeId.includes('1f') ? 'first' : 'ground' };
  if (nodeId.includes('stairs_ne')) return { label: 'North-East Rotunda Stairs', floor: nodeId.includes('1f') ? 'first' : 'ground' };
  if (nodeId.includes('stairs_lib')) return { label: 'Central Library Grand Stairs', floor: nodeId.includes('1f') ? 'first' : 'ground' };
  if (nodeId.includes('corner_sw')) return { label: 'South-West Rotunda Walkway', floor: nodeId.includes('1f') ? 'first' : 'ground' };
  if (nodeId.includes('corner_se')) return { label: 'South-East Rotunda Walkway', floor: nodeId.includes('1f') ? 'first' : 'ground' };
  if (nodeId.includes('corner_nw')) return { label: 'North-West Rotunda Walkway', floor: nodeId.includes('1f') ? 'first' : 'ground' };
  if (nodeId.includes('corner_ne')) return { label: 'North-East Rotunda Walkway', floor: nodeId.includes('1f') ? 'first' : 'ground' };
  if (nodeId.includes('corr_s')) return { label: nodeId.includes('1f') ? 'South 1st Floor Corridor' : 'South Ground Corridor', floor: nodeId.includes('1f') ? 'first' : 'ground' };
  if (nodeId.includes('corr_n')) return { label: nodeId.includes('1f') ? 'North 1st Floor Corridor' : 'North Ground Corridor', floor: nodeId.includes('1f') ? 'first' : 'ground' };
  if (nodeId.includes('corr_w')) return { label: nodeId.includes('1f') ? 'West 1st Floor Corridor' : 'West Ground Corridor', floor: nodeId.includes('1f') ? 'first' : 'ground' };
  if (nodeId.includes('corr_e')) return { label: nodeId.includes('1f') ? 'East 1st Floor Corridor' : 'East Ground Corridor', floor: nodeId.includes('1f') ? 'first' : 'ground' };
  return { label: nodeId, floor: 'ground' };
}

/**
 * Turn-by-Turn Wayfinding generator that outputs step instructions, distances, and walking times.
 */
export function findDetailedPathToRoom(
  roomId: string,
  startId: string = 'gate',
  nodes: Map<string, NavNode> = campusWaypointGraph
): DetailedRoute | null {
  const result = findDijkstraPathDetails(startId, roomId, nodes);
  if (!result || result.nodeIds.length === 0) return null;

  const targetRoom = campusRooms.find((r) => r.id === roomId);
  const steps: RouteStep[] = [];
  let totalDistanceMeters = 0;

  for (let i = 0; i < result.nodeIds.length; i++) {
    const nodeId = result.nodeIds[i];
    const prevCoords = i > 0 ? result.path[i - 1] : result.path[i];
    const currCoords = result.path[i];

    // Compute segment distance in meters (1 3D unit ≈ 1.4 meters on campus scale)
    const dx = currCoords[0] - prevCoords[0];
    const dy = currCoords[1] - prevCoords[1];
    const dz = currCoords[2] - prevCoords[2];
    const segDist = Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz) * 1.4);
    totalDistanceMeters += segDist;

    const info = getLandmarkInfo(nodeId, targetRoom);
    const landmark = info.label;
    const floor = info.floor || (currCoords[1] > 2.0 ? 'first' : 'ground');

    let instruction = '';
    if (i === 0) {
      instruction = `Start at ${landmark}`;
    } else if (i === result.nodeIds.length - 1) {
      instruction = `Arrive at destination: ${targetRoom ? targetRoom.code : landmark}`;
    } else if (nodeId.startsWith('door_')) {
      const roomKey = nodeId.replace('door_', '');
      const rm = campusRooms.find((r) => r.id === roomKey);
      instruction = rm ? `Step through doorway of ${rm.code}` : `Enter through doorway`;
    } else if (nodeId.includes('stairs')) {
      instruction = currCoords[1] > prevCoords[1]
        ? `Take ${landmark} up to 1st Floor`
        : `Take ${landmark} down to Ground Level`;
    } else {
      // Check turn angle relative to previous segment
      if (i > 0 && i < result.nodeIds.length - 1) {
        const nextCoords = result.path[i + 1];
        const v1x = currCoords[0] - prevCoords[0];
        const v1z = currCoords[2] - prevCoords[2];
        const v2x = nextCoords[0] - currCoords[0];
        const v2z = nextCoords[2] - currCoords[2];
        const cross = v1x * v2z - v1z * v2x;
        const dot = v1x * v2x + v1z * v2z;
        const angle = Math.atan2(cross, dot) * (180 / Math.PI);

        if (angle > 35) {
          instruction = `Turn right into ${landmark}`;
        } else if (angle < -35) {
          instruction = `Turn left into ${landmark}`;
        } else if (nodeId.includes('corr') || nodeId.includes('corner')) {
          instruction = `Follow ${landmark}`;
        } else {
          instruction = `Head along ${landmark}`;
        }
      } else if (nodeId.includes('corr')) {
        instruction = `Follow ${landmark}`;
      } else {
        instruction = `Head along ${landmark}`;
      }
    }

    steps.push({
      id: nodeId,
      instruction,
      landmark,
      floor,
      distanceMeters: segDist,
    });
  }

  // Estimated walking speed: ~1.2 m/s (~70m / min)
  const estimatedWalkingMinutes = Math.max(1, Math.ceil(totalDistanceMeters / 70));

  return {
    path: result.path,
    nodeIds: result.nodeIds,
    steps,
    totalDistanceMeters,
    estimatedWalkingMinutes,
  };
}
