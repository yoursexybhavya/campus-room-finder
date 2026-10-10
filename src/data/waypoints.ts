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

/**
 * Builds the comprehensive topological navigation graph for the JIET campus digital twin.
 * Guarantees collision-free routing through:
 *  1. Covered veranda corridor centerlines (no diagonal shortcuts across walls or rooms)
 *  2. Real architectural door cutouts and thresholds for every single classroom, lab, and office
 *  3. Dedicated helical corner rotunda staircases for vertical transitions between floors
 *  4. Paved courtyard cross-axial walkways connecting to arterial entrance routes
 */
export function buildWaypointGraph(): Map<string, NavNode> {
  const map = new Map<string, NavNode>();

  const addNode = (id: string, coords: [number, number, number]) => {
    if (!map.has(id)) {
      map.set(id, { id, coords, neighbors: [] });
    }
  };

  const link = (idA: string, idB: string) => {
    const a = map.get(idA);
    const b = map.get(idB);
    if (!a || !b) return;
    const w = dist3D(a.coords, b.coords);
    if (!a.neighbors.some((n) => n.id === idB)) a.neighbors.push({ id: idB, weight: w });
    if (!b.neighbors.some((n) => n.id === idA)) b.neighbors.push({ id: idA, weight: w });
  };

  // =========================================================================
  // 1. CAMPUS MAIN ENTRANCE & CENTRAL ARTERIAL WALKWAYS (All at ground level y = 0.1)
  // =========================================================================
  addNode('gate', [0, 0.1, 36]);
  addNode('south_walkway', [0, 0.1, 24]);
  addNode('wp_admin', [0, 0.1, 20]);
  addNode('courtyard', [0, 0.1, 10]);
  addNode('courtyard_center', [0, 0.1, 0]);
  addNode('center_fountain', [0, 0.1, 0]);
  addNode('north_walkway', [0, 0.1, -10]);

  // =========================================================================
  // 2. CORNER HELICAL ROTUNDA STAIRCASES (GROUND & 1ST FLOOR)
  // =========================================================================
  // Ground Floor Rotunda Stairwells
  addNode('stairs_sw_g', [-16, 0.1, 16]);
  addNode('stairs_se_g', [16, 0.1, 16]);
  addNode('stairs_nw_g', [-16, 0.1, -16]);
  addNode('stairs_ne_g', [16, 0.1, -16]);

  // First Floor Rotunda Landings
  addNode('stairs_sw_1f', [-16, 3.6, 16]);
  addNode('stairs_se_1f', [16, 3.6, 16]);
  addNode('stairs_nw_1f', [-16, 3.6, -16]);
  addNode('stairs_ne_1f', [16, 3.6, -16]);

  // Direct vertical climbing connections via authentic corner stairwells
  link('stairs_sw_g', 'stairs_sw_1f');
  link('stairs_se_g', 'stairs_se_1f');
  link('stairs_nw_g', 'stairs_nw_1f');
  link('stairs_ne_g', 'stairs_ne_1f');

  // Twin Library Stairs (South courtyard grade to First Floor Central Library)
  addNode('stairs_lib_w_g', [-3.8, 0.1, 18.0]);
  addNode('stairs_lib_w_mid', [-3.8, 1.85, 12.8]);
  addNode('stairs_lib_w_bridge', [-1.6, 3.1, 13.7]);
  addNode('stairs_lib_bridge', [0.0, 3.1, 14.4]);
  addNode('stairs_lib_1f', [0.0, 3.6, 18.2]);

  addNode('stairs_lib_e_g', [3.8, 0.1, 18.0]);
  addNode('stairs_lib_e_mid', [3.8, 1.85, 12.8]);
  addNode('stairs_lib_e_bridge', [1.6, 3.1, 13.7]);

  link('stairs_lib_w_g', 'stairs_lib_w_mid');
  link('stairs_lib_w_mid', 'stairs_lib_w_bridge');
  link('stairs_lib_w_bridge', 'stairs_lib_bridge');

  link('stairs_lib_e_g', 'stairs_lib_e_mid');
  link('stairs_lib_e_mid', 'stairs_lib_e_bridge');
  link('stairs_lib_e_bridge', 'stairs_lib_bridge');

  link('stairs_lib_bridge', 'stairs_lib_1f');

  // =========================================================================
  // 3. CENTRAL QUADRANGLE CORRIDOR ANCHORS
  // =========================================================================
  addNode('corr_south_g', [0, 0.1, 16]);
  addNode('corr_north_g', [0, 0.1, -16]);
  addNode('corr_west_g', [-16, 0.1, 0]);
  addNode('corr_east_g', [16, 0.1, 0]);

  addNode('corr_south_1f', [0, 3.6, 16]);
  addNode('corr_north_1f', [0, 3.6, -16]);
  addNode('corr_west_1f', [-16, 3.6, 0]);
  addNode('corr_east_1f', [16, 3.6, 0]);

  link('gate', 'south_walkway');
  link('south_walkway', 'wp_admin');
  link('wp_admin', 'corr_south_g');
  link('south_walkway', 'corr_south_g');
  link('courtyard', 'corr_south_g');
  link('courtyard', 'courtyard_center');
  link('courtyard_center', 'north_walkway');
  link('center_fountain', 'courtyard_center');
  link('north_walkway', 'corr_north_g');

  // =========================================================================
  // 4. FLOOR-BY-FLOOR CORRIDOR BACKBONES & ROOM DOORWAYS
  // =========================================================================
  const floors: ('ground' | 'first')[] = ['ground', 'first'];

  for (const fl of floors) {
    const yFloor = fl === 'ground' ? 0.1 : 3.6;
    const yDoor = fl === 'ground' ? 0.5 : 3.6;
    const sfx = fl === 'ground' ? '_g' : '_1f';
    const flRooms = campusRooms.filter((r) => r.floor === fl);

    // Group rooms by physical architectural corridor wing
    const sRooms: typeof flRooms = [];
    const nRooms: typeof flRooms = [];
    const wRooms: typeof flRooms = [];
    const eRooms: typeof flRooms = [];

    for (const r of flRooms) {
      if (r.position[0] <= -16) {
        wRooms.push(r);
      } else if (r.position[0] >= 16) {
        eRooms.push(r);
      } else if (r.position[2] > 0) {
        sRooms.push(r);
      } else {
        nRooms.push(r);
      }
    }

    // -----------------------------------------------------------------------
    // A. South Wing Corridor Chain (along Z = 16)
    // -----------------------------------------------------------------------
    const sCoords = [-16, ...sRooms.map((r) => r.position[0]), 0, 16]
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => a - b);

    for (let i = 0; i < sCoords.length; i++) {
      const x = sCoords[i];
      const cid =
        x === -16 ? `stairs_sw${sfx}` : x === 16 ? `stairs_se${sfx}` : x === 0 ? `corr_south${sfx}` : `corr_s${sfx}_${x}`;
      addNode(cid, [x, yFloor, 16]);
      if (i > 0) {
        const prevX = sCoords[i - 1];
        const prevId =
          prevX === -16 ? `stairs_sw${sfx}` : prevX === 16 ? `stairs_se${sfx}` : prevX === 0 ? `corr_south${sfx}` : `corr_s${sfx}_${prevX}`;
        link(prevId, cid);
      }
    }

    // -----------------------------------------------------------------------
    // B. North Wing Corridor Chain (along Z = -16)
    // -----------------------------------------------------------------------
    const nCoords = [-16, ...nRooms.map((r) => r.position[0]), 0, 16]
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => a - b);

    for (let i = 0; i < nCoords.length; i++) {
      const x = nCoords[i];
      const cid =
        x === -16 ? `stairs_nw${sfx}` : x === 16 ? `stairs_ne${sfx}` : x === 0 ? `corr_north${sfx}` : `corr_n${sfx}_${x}`;
      addNode(cid, [x, yFloor, -16]);
      if (i > 0) {
        const prevX = nCoords[i - 1];
        const prevId =
          prevX === -16 ? `stairs_nw${sfx}` : prevX === 16 ? `stairs_ne${sfx}` : prevX === 0 ? `corr_north${sfx}` : `corr_n${sfx}_${prevX}`;
        link(prevId, cid);
      }
    }

    // -----------------------------------------------------------------------
    // C. West Wing Corridor Chain (along X = -16)
    // -----------------------------------------------------------------------
    const wCoords = [-25.5, ...wRooms.map((r) => r.position[2]), -16, 0, 16, 25.5]
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => a - b);

    for (let i = 0; i < wCoords.length; i++) {
      const z = wCoords[i];
      const cid =
        z === 16 ? `stairs_sw${sfx}` : z === -16 ? `stairs_nw${sfx}` : z === 0 ? `corr_west${sfx}` : `corr_w${sfx}_${z}`;
      addNode(cid, [-16, yFloor, z]);
      if (i > 0) {
        const prevZ = wCoords[i - 1];
        const prevId =
          prevZ === 16 ? `stairs_sw${sfx}` : prevZ === -16 ? `stairs_nw${sfx}` : prevZ === 0 ? `corr_west${sfx}` : `corr_w${sfx}_${prevZ}`;
        link(prevId, cid);
      }
    }

    // -----------------------------------------------------------------------
    // D. East Wing Corridor Chain (along X = 16)
    // -----------------------------------------------------------------------
    const eCoords = [-25.5, ...eRooms.map((r) => r.position[2]), -16, 0, 16, 25.5]
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => a - b);

    for (let i = 0; i < eCoords.length; i++) {
      const z = eCoords[i];
      const cid =
        z === 16 ? `stairs_se${sfx}` : z === -16 ? `stairs_ne${sfx}` : z === 0 ? `corr_east${sfx}` : `corr_e${sfx}_${z}`;
      addNode(cid, [16, yFloor, z]);
      if (i > 0) {
        const prevZ = eCoords[i - 1];
        const prevId =
          prevZ === 16 ? `stairs_se${sfx}` : prevZ === -16 ? `stairs_ne${sfx}` : prevZ === 0 ? `corr_east${sfx}` : `corr_e${sfx}_${prevZ}`;
        link(prevId, cid);
      }
    }

    // -----------------------------------------------------------------------
    // E. Link Each Room to Corridor via Authentic Doorway Waypoint
    // -----------------------------------------------------------------------
    for (const r of flRooms) {
      addNode(r.id, r.position);
      const doorId = `door_${r.id}`;
      let doorCoords: [number, number, number];
      let corrId: string;

      if (r.position[0] <= -16) {
        // West Wing: doorway faces corridor at X = -18
        doorCoords = [-18, yDoor, r.position[2]];
        corrId =
          r.position[2] === 16 ? `stairs_sw${sfx}` : r.position[2] === -16 ? `stairs_nw${sfx}` : r.position[2] === 0 ? `corr_west${sfx}` : `corr_w${sfx}_${r.position[2]}`;
      } else if (r.position[0] >= 16) {
        // East Wing: doorway faces corridor at X = 18
        doorCoords = [18, yDoor, r.position[2]];
        corrId =
          r.position[2] === 16 ? `stairs_se${sfx}` : r.position[2] === -16 ? `stairs_ne${sfx}` : r.position[2] === 0 ? `corr_east${sfx}` : `corr_e${sfx}_${r.position[2]}`;
      } else if (r.position[2] > 0) {
        // South Wing: doorway faces corridor at Z = 18.5
        doorCoords = [r.position[0], yDoor, 18.5];
        corrId =
          r.position[0] === -16 ? `stairs_sw${sfx}` : r.position[0] === 16 ? `stairs_se${sfx}` : r.position[0] === 0 ? `corr_south${sfx}` : `corr_s${sfx}_${r.position[0]}`;
      } else {
        // North Wing: doorway faces corridor at Z = -17.5
        doorCoords = [r.position[0], yDoor, -17.5];
        corrId =
          r.position[0] === -16 ? `stairs_nw${sfx}` : r.position[0] === 16 ? `stairs_ne${sfx}` : r.position[0] === 0 ? `corr_north${sfx}` : `corr_n${sfx}_${r.position[0]}`;
      }

      addNode(doorId, doorCoords);
      link(corrId, doorId);
      link(doorId, r.id);
    }
  }

  // =========================================================================
  // 5. CANONICAL LEGACY WAYPOINTS COMPATIBILITY MAPPINGS
  // =========================================================================
  const legacyToRoom: Record<string, string> = {
    wp_lt1: 'LT-1',
    wp_lt2: 'LT-2',
    wp_lt3: 'LT-3',
    wp_lt4: 'LT-4',
    wp_lab1: 'LAB-1',
    wp_lab2: 'LAB-2',
    wp_lab3: 'LAB-3',
    wp_lab4: 'LAB-4',
    wp_lab_phy: 'LAB-PHY',
    wp_sem1: 'SEM-1',
    wp_sem2: 'SEM-2',
    wp_lib_main: 'LIB-MAIN',
    wp_fac_cse: 'FAC-CSE',
  };

  for (const [wpId, roomId] of Object.entries(legacyToRoom)) {
    const door = map.get(`door_${roomId}`);
    if (door) {
      addNode(wpId, door.coords);
      link(wpId, `door_${roomId}`);
    }
  }

  // Connect wp_admin to its doorway and south corridor
  const adminDoor = map.get('door_ADMIN-01');
  if (adminDoor) {
    link('wp_admin', 'door_ADMIN-01');
  }

  // Connect wp_south_1f to South 1F corridor
  addNode('wp_south_1f', [0, 3.6, 16]);
  link('wp_south_1f', 'corr_south_1f');

  // Legacy room aliases mapped to their canonical IDs
  const legacyAliases: Record<string, string> = {
    lt1: 'LT-1',
    'LT-9': 'LT-1',
    lt2: 'LT-2',
    'LT-10': 'LT-2',
    lt3: 'LT-3',
    'LT-24': 'LT-3',
    lt4: 'LT-4',
    'LT-29': 'LT-4',
    lab1: 'LAB-1',
    'PC-LAB': 'LAB-1',
    lab2: 'LAB-2',
    'IDEA-LAB': 'LAB-2',
    lab3: 'LAB-3',
    'EF-3': 'LAB-3',
    lab4: 'LAB-4',
    'CF-7': 'LAB-4',
    'CF-8': 'LAB-3',
    'GF-16': 'LAB-2',
    'CHEM-LAB': 'LAB-PHY',
    'DH-1': 'SEM-1',
    'DH-3': 'SEM-2',
    'LIB-01': 'LIB-MAIN',
    'CENTRAL-LIB': 'LIB-MAIN',
    'ADM-01': 'ADMIN-01',
    'TECH-CONF': 'ADMIN-01',
    center_fountain: 'courtyard_center',
  };

  for (const [alias, targetId] of Object.entries(legacyAliases)) {
    const target = map.get(targetId);
    if (target && !map.has(alias)) {
      addNode(alias, target.coords);
      link(alias, targetId);
    }
  }

  return map;
}

export const WAYPOINTS_MAP = buildWaypointGraph();
export const campusWaypointGraph = WAYPOINTS_MAP;
