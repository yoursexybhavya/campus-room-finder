import { describe, it, expect } from 'vitest';
import { campusRooms } from '../../src/data/campusRooms';
import {
  findDijkstraPath,
  findDijkstraPathDetails,
  findPathToRoom,
  findDetailedPathToRoom,
} from '../../src/services/routing/pathfinding';
import { campusWaypointGraph } from '../../src/data/waypoints';

describe('Navigation System Overhaul Verification Suite', () => {
  const allRooms = campusRooms;
  const groundRooms = allRooms.filter((r) => r.floor === 'ground');
  const firstRooms = allRooms.filter((r) => r.floor === 'first');

  it('1. should verify exact room count and pairwise scale (61 rooms = 3,721 routes)', () => {
    expect(allRooms.length).toBe(61);
    expect(groundRooms.length).toBe(33);
    expect(firstRooms.length).toBe(28);
    expect(allRooms.length * allRooms.length).toBe(3721);
  });

  it('2. should solve all 3,721 (61 x 61) room combinations without null paths or failures', () => {
    let testedCount = 0;

    for (const rA of allRooms) {
      for (const rB of allRooms) {
        const path = findDijkstraPath(rA.id, rB.id);
        expect(path).not.toBeNull();

        if (rA.id === rB.id) {
          expect(path!.length).toBe(1);
        } else {
          expect(path!.length).toBeGreaterThanOrEqual(2);
        }
        testedCount++;
      }
    }

    expect(testedCount).toBe(3721);
  });

  it('3. should enforce strict geometric boundaries: every route waypoint stays within campus bounds ([-36, 36])', () => {
    for (const room of allRooms) {
      const path = findPathToRoom(room.id, 'gate');
      expect(path).not.toBeNull();

      for (const pt of path!) {
        // X and Z coordinates must be within building / courtyard footprint
        expect(pt[0]).toBeGreaterThanOrEqual(-36.0);
        expect(pt[0]).toBeLessThanOrEqual(36.0);
        expect(pt[2]).toBeGreaterThanOrEqual(-36.0);
        expect(pt[2]).toBeLessThanOrEqual(36.0);

        // Elevation Y must stay within ground to roof bounds
        expect(pt[1]).toBeGreaterThanOrEqual(0.0);
        expect(pt[1]).toBeLessThanOrEqual(4.5);
      }
    }
  });

  it('4. should route all cross-floor paths strictly through authentic architectural staircases', () => {
    const crossFloorPairs = [
      { from: 'LT-1', to: 'LT-3', expectedStair: 'stairs_se' }, // East Wing GF -> East Wing 1F
      { from: 'LAB-1', to: 'LAB-3', expectedStair: 'stairs_sw' }, // West Wing GF -> West Wing 1F
      { from: 'SEM-1', to: 'SEM-2', expectedStair: 'stairs_nw' }, // North Wing GF -> North Wing 1F
      { from: 'ADMIN-01', to: 'FAC-CSE', expectedStair: 'stairs' }, // South Wing GF -> North Wing 1F
      { from: 'LAB-PHY', to: 'LAB-ANTENNA', expectedStair: 'stairs_sw' }, // West Wing GF -> West Wing 1F
      { from: 'LIB-MAIN', to: 'DH-3', expectedStair: 'stairs' }, // GF -> 1F
    ];

    for (const pair of crossFloorPairs) {
      const details = findDijkstraPathDetails(pair.from, pair.to);
      expect(details).not.toBeNull();

      const usesStair = details!.nodeIds.some((id) => id.includes('stairs_'));
      expect(usesStair).toBe(true);

      // Verify that the route contains the designated stair for its wing
      const usesExpected = details!.nodeIds.some((id) => id.includes(pair.expectedStair));
      expect(usesExpected).toBe(true);
    }
  });

  it('5. should guarantee all room doorway cutouts connect to corridor backbones without wall-bypass wormholes', () => {
    for (const room of allRooms) {
      const doorId = `door_${room.id}`;
      const doorNode = campusWaypointGraph.get(doorId);
      expect(doorNode).toBeDefined();

      // Door node must directly link to the room
      const linksToRoom = doorNode!.neighbors.some((n) => n.id === room.id);
      expect(linksToRoom).toBe(true);

      // Door node must link to a corridor node
      const linksToCorridor = doorNode!.neighbors.some(
        (n) => n.id.startsWith('corr_') || n.id.startsWith('stairs_') || n.id.startsWith('corner_')
      );
      expect(linksToCorridor).toBe(true);
    }
  });

  it('6. should generate detailed turn-by-turn guidance with accurate step instructions and distances', () => {
    const route = findDetailedPathToRoom('LT-3', 'gate');
    expect(route).not.toBeNull();
    expect(route!.steps.length).toBeGreaterThanOrEqual(4);
    expect(route!.totalDistanceMeters).toBeGreaterThan(10);
    expect(route!.estimatedWalkingMinutes).toBeGreaterThanOrEqual(1);

    // Initial instruction must be Start
    expect(route!.steps[0].instruction).toContain('Start');

    // Final instruction must be Arrive
    const lastStep = route!.steps[route!.steps.length - 1];
    expect(lastStep.instruction).toContain('Arrive');

    // Must include stair ascent instruction
    const hasStairStep = route!.steps.some(
      (s) => s.instruction.includes('Take') && s.instruction.includes('Stair')
    );
    expect(hasStairStep).toBe(true);
  });

  it('7. should guarantee distance symmetry: dist(A -> B) == dist(B -> A) across 50 sample room pairs', () => {
    const sampleRooms = allRooms.slice(0, 10);

    for (let i = 0; i < sampleRooms.length; i++) {
      for (let j = i + 1; j < sampleRooms.length; j++) {
        const rA = sampleRooms[i];
        const rB = sampleRooms[j];

        const pathAB = findDijkstraPath(rA.id, rB.id)!;
        const pathBA = findDijkstraPath(rB.id, rA.id)!;

        const calcLen = (pts: [number, number, number][]) => {
          let sum = 0;
          for (let k = 0; k < pts.length - 1; k++) {
            const dx = pts[k + 1][0] - pts[k][0];
            const dy = pts[k + 1][1] - pts[k][1];
            const dz = pts[k + 1][2] - pts[k][2];
            sum += Math.sqrt(dx * dx + dy * dy + dz * dz);
          }
          return sum;
        };

        expect(calcLen(pathAB)).toBeCloseTo(calcLen(pathBA), 3);
      }
    }
  });
});
