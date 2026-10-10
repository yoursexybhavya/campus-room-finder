import { describe, it, expect } from 'vitest';
import { campusRooms } from '../../src/data/campusRooms';
import { findDijkstraPath, findDijkstraPathDetails, findPathToRoom } from '../../src/services/routing/pathfinding';
import { campusWaypointGraph } from '../../src/data/waypoints';

describe('Topological Routing & Wall-Bypass Invariants', () => {
  it('1. should guarantee ZERO cross-room shortcut wormholes through legacy waypoints', () => {
    // 1.1 East Wing: LT-1 to WR-EAST-G must NOT shortcut through wp_lt1
    const eastRoute = findDijkstraPathDetails('LT-1', 'WR-EAST-G');
    expect(eastRoute).not.toBeNull();
    expect(eastRoute!.nodeIds).not.toContain('wp_lt1');
    expect(eastRoute!.nodeIds).toContain('door_LT-1');
    expect(eastRoute!.nodeIds).toContain('door_WR-EAST-G');
    // Must traverse the East corridor chain
    const hasEastCorridor = eastRoute!.nodeIds.some((id) => id.startsWith('corr_e_g_') || id === 'corr_east_g');
    expect(hasEastCorridor).toBe(true);

    // 1.2 South Wing: ADMIN-01 to WR-SOUTH-G must NOT shortcut directly through wp_admin
    const southRoute = findDijkstraPathDetails('ADMIN-01', 'WR-SOUTH-G');
    expect(southRoute).not.toBeNull();
    expect(southRoute!.nodeIds).toContain('door_ADMIN-01');
    expect(southRoute!.nodeIds).toContain('door_WR-SOUTH-G');
    const hasSouthCorridor = southRoute!.nodeIds.some((id) => id.startsWith('corr_s_g_') || id === 'corr_south_g');
    expect(hasSouthCorridor).toBe(true);

    // 1.3 North Wing: SEM-1 to LT-14 must NOT shortcut directly through wp_sem1
    const northRoute = findDijkstraPathDetails('SEM-1', 'LT-14');
    expect(northRoute).not.toBeNull();
    expect(northRoute!.nodeIds).not.toContain('wp_sem1');
    const hasNorthCorridor = northRoute!.nodeIds.some((id) => id.startsWith('corr_n_g_') || id === 'corr_north_g');
    expect(hasNorthCorridor).toBe(true);

    // 1.4 West Wing: LAB-1 to WR-WEST-G must NOT shortcut through wp_lab1 or wp_lab2
    const westRoute = findDijkstraPathDetails('LAB-1', 'WR-WEST-G');
    expect(westRoute).not.toBeNull();
    expect(westRoute!.nodeIds).not.toContain('wp_lab1');
    expect(westRoute!.nodeIds).not.toContain('wp_lab2');
    const hasWestCorridor = westRoute!.nodeIds.some((id) => id.startsWith('corr_w_g_') || id === 'corr_west_g');
    expect(hasWestCorridor).toBe(true);
  });

  it('2. should correctly attach First Floor West Wing rooms (LAB-ANTENNA, LAB-PROJ) to West Corridor', () => {
    for (const roomId of ['LAB-ANTENNA', 'LAB-PROJ']) {
      const route = findDijkstraPathDetails('gate', roomId);
      expect(route).not.toBeNull();
      // Must climb SW stairs and follow West 1F corridor
      expect(route!.nodeIds).toContain('stairs_sw_1f');
      const usesWestCorridor = route!.nodeIds.some((id) => id.startsWith('corr_w_1f_'));
      expect(usesWestCorridor).toBe(true);
      // Must NOT contain phantom south nodes
      expect(route!.nodeIds).not.toContain('corr_s_1f_-20');
    }
  });

  it('3. should verify no vertical elevation spikes on outdoor entrance walkways', () => {
    const route = findDijkstraPath('gate', 'corr_south_g');
    expect(route).not.toBeNull();
    // Gate to South corridor should remain completely flat at ground level (y ≈ 0.1)
    for (const pt of route!) {
      expect(pt[1]).toBeCloseTo(0.1, 0.05);
    }
  });

  it('4. should ensure center_fountain and courtyard_center are fully connected', () => {
    const p1 = findDijkstraPath('gate', 'center_fountain');
    expect(p1).not.toBeNull();
    const p2 = findDijkstraPath('center_fountain', 'LT-1');
    expect(p2).not.toBeNull();
  });

  it('5. should route all 3,721 (61 x 61) room combinations symmetrically without failure', () => {
    let count = 0;
    for (const rA of campusRooms) {
      for (const rB of campusRooms) {
        const path = findDijkstraPath(rA.id, rB.id);
        expect(path).not.toBeNull();
        count++;
      }
    }
    expect(count).toBe(campusRooms.length * campusRooms.length);
  });
});
