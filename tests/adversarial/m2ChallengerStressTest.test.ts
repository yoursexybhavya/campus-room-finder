import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  calculateActiveSchedule,
  formatMinutesToTime,
  formatDuration,
  getRoomDailySchedule,
  DAYS_OF_WEEK,
} from '../../src/services/time/datetimeEngine';
import { campusRooms } from '../../src/data/campusRooms';
import { campusWaypointGraph, buildWaypointGraph, NavNode } from '../../src/data/waypoints';
import { findDijkstraPath, findPathToRoom } from '../../src/services/routing/pathfinding';
import { timetableDb, TimetableDatabase } from '../../src/services/database/timetableDb';

describe('Milestone 2 Challenger Adversarial Stress Suite', () => {
  // =========================================================================
  // SUITE 1: Datetime Math, Leap Boundaries & Month Transitions
  // =========================================================================
  describe('1. Datetime Math & Leap Boundary Stress Testing', () => {
    it('1.1 should correctly resolve Leap Day 2024 (Feb 29, 2024 = Thursday)', () => {
      // 2024 is a leap year; Feb 29 was a Thursday
      const date = new Date('2024-02-29T10:00:00');
      const res = calculateActiveSchedule(date);

      expect(res.status).toBe('IN_SESSION');
      // Thursday 09:00-11:00 is Full Stack Web (CS-306 in LAB-1)
      expect(res.activeSlot?.courseCode).toBe('CS-306');
      expect(res.activeSlot?.roomId).toBe('LAB-1');
      expect(res.minutesRemaining).toBe(60); // 11:00 - 10:00
    });

    it('1.2 should correctly resolve Leap Day 2028 (Feb 29, 2028 = Tuesday)', () => {
      // 2028 is a leap year; Feb 29 is a Tuesday
      const date = new Date('2028-02-29T14:30:00');
      const res = calculateActiveSchedule(date);

      expect(res.status).toBe('IN_SESSION');
      // Tuesday 14:00-16:00 is Robotics (CS-308 in LAB-4)
      expect(res.activeSlot?.courseCode).toBe('CS-308');
      expect(res.activeSlot?.roomId).toBe('LAB-4');
      expect(res.minutesRemaining).toBe(90);
    });

    it('1.3 should handle Non-Leap year end of Feb boundary (2025-02-28 -> 2025-03-01)', () => {
      // 2025-02-28 is Friday
      const friday = new Date('2025-02-28T09:30:00');
      const friRes = calculateActiveSchedule(friday);
      expect(friRes.status).toBe('IN_SESSION');
      expect(friRes.activeSlot?.courseCode).toBe('CS-304'); // OS in LT-2

      // 2025-03-01 is Saturday
      const saturday = new Date('2025-03-01T10:00:00');
      const satRes = calculateActiveSchedule(saturday);
      expect(satRes.status).toBe('IN_SESSION');
      expect(satRes.activeSlot?.courseCode).toBe('CS-305'); // AI Lab in LAB-3
    });

    it('1.4 should handle Year rollover (2026-12-31 Thursday -> 2027-01-01 Friday)', () => {
      // 2026-12-31 is Thursday
      const thurs = new Date('2026-12-31T11:45:00');
      const thursRes = calculateActiveSchedule(thurs);
      expect(thursRes.status).toBe('IN_SESSION');
      expect(thursRes.activeSlot?.courseCode).toBe('CS-301'); // DSA in LT-1

      // 2027-01-01 is Friday
      const fri = new Date('2027-01-01T10:30:00');
      const friRes = calculateActiveSchedule(fri);
      expect(friRes.status).toBe('IN_SESSION');
      expect(friRes.activeSlot?.courseCode).toBe('CS-303'); // COA in LT-3
    });

    it('1.5 should handle Midnight (00:00:00) as BETWEEN_CLASSES countdown to first class', () => {
      const midnightMon = new Date('2026-10-12T00:00:00');
      const res = calculateActiveSchedule(midnightMon);

      expect(res.status).toBe('BETWEEN_CLASSES');
      expect(res.activeSlot).toBeNull();
      expect(res.nextSlot?.courseCode).toBe('CS-301');
      expect(res.minutesUntilNext).toBe(540); // 9 hours until 09:00
    });
  });

  // =========================================================================
  // SUITE 2: Exact Minute & Second Boundary Transitions
  // =========================================================================
  describe('2. Exact Minute & Second Boundary Transitions', () => {
    const monday = '2026-10-12';

    it('2.1 should verify 08:59:59 (pre-class) vs 09:00:00 (exact start)', () => {
      const preStart = new Date(`${monday}T08:59:59`);
      const resPre = calculateActiveSchedule(preStart);
      expect(resPre.status).toBe('BETWEEN_CLASSES');
      expect(resPre.activeSlot).toBeNull();
      expect(resPre.nextSlot?.courseCode).toBe('CS-301');
      expect(resPre.minutesUntilNext).toBe(1);

      const exactStart = new Date(`${monday}T09:00:00`);
      const resStart = calculateActiveSchedule(exactStart);
      expect(resStart.status).toBe('IN_SESSION');
      expect(resStart.activeSlot?.courseCode).toBe('CS-301');
      expect(resStart.activeSlot?.roomId).toBe('LT-1');
      expect(resStart.minutesRemaining).toBe(60);
      expect(resStart.minutesUntilNext).toBe(60); // until 10:00
    });

    it('2.2 should verify 09:59:59 vs 10:00:00 slot handover', () => {
      const endSlot1 = new Date(`${monday}T09:59:59`);
      const res1 = calculateActiveSchedule(endSlot1);
      expect(res1.status).toBe('IN_SESSION');
      expect(res1.activeSlot?.courseCode).toBe('CS-301');
      expect(res1.minutesRemaining).toBe(1);

      const startSlot2 = new Date(`${monday}T10:00:00`);
      const res2 = calculateActiveSchedule(startSlot2);
      expect(res2.status).toBe('IN_SESSION');
      expect(res2.activeSlot?.courseCode).toBe('CS-302');
      expect(res2.activeSlot?.roomId).toBe('LT-1');
      expect(res2.minutesRemaining).toBe(60);
    });

    it('2.3 should verify Morning Tea Break transitions (11:00:00 to 11:14:59 to 11:15:00)', () => {
      // 10:59:59 is inside Slot 2
      const inSlot2 = new Date(`${monday}T10:59:59`);
      expect(calculateActiveSchedule(inSlot2).status).toBe('IN_SESSION');

      // 11:00:00 starts tea break
      const teaStart = new Date(`${monday}T11:00:00`);
      const resTea = calculateActiveSchedule(teaStart);
      expect(resTea.status).toBe('BETWEEN_CLASSES');
      expect(resTea.activeSlot).toBeNull();
      expect(resTea.nextSlot?.courseCode).toBe('CS-303');
      expect(resTea.nextSlot?.roomId).toBe('LT-3');
      expect(resTea.minutesUntilNext).toBe(15);

      // 11:14:59 last second of tea break
      const teaEnd = new Date(`${monday}T11:14:59`);
      const resTeaEnd = calculateActiveSchedule(teaEnd);
      expect(resTeaEnd.status).toBe('BETWEEN_CLASSES');
      expect(resTeaEnd.minutesUntilNext).toBe(1);

      // 11:15:00 exact start of Slot 3 (LT-3, 1st floor)
      const slot3Start = new Date(`${monday}T11:15:00`);
      const resSlot3 = calculateActiveSchedule(slot3Start);
      expect(resSlot3.status).toBe('IN_SESSION');
      expect(resSlot3.activeSlot?.courseCode).toBe('CS-303');
      expect(resSlot3.activeRoom?.floor).toBe('first');
      expect(resSlot3.minutesRemaining).toBe(60);
    });

    it('2.4 should verify Lunch Break transitions (13:15:00 to 13:59:59 to 14:00:00)', () => {
      // 13:14:59 is end of Slot M3B (CS-304 in LT-2)
      const beforeLunch = new Date(`${monday}T13:14:59`);
      const resBefore = calculateActiveSchedule(beforeLunch);
      expect(resBefore.status).toBe('IN_SESSION');
      expect(resBefore.activeSlot?.courseCode).toBe('CS-304');
      expect(resBefore.minutesRemaining).toBe(1);

      // 13:15:00 starts lunch break
      const lunchStart = new Date(`${monday}T13:15:00`);
      const resLunch = calculateActiveSchedule(lunchStart);
      expect(resLunch.status).toBe('BETWEEN_CLASSES');
      expect(resLunch.activeSlot).toBeNull();
      expect(resLunch.nextSlot?.courseCode).toBe('CS-305');
      expect(resLunch.nextSlot?.roomId).toBe('LAB-3');
      expect(resLunch.minutesUntilNext).toBe(45);

      // 13:59:59 last second of lunch break
      const lunchEnd = new Date(`${monday}T13:59:59`);
      const resLunchEnd = calculateActiveSchedule(lunchEnd);
      expect(resLunchEnd.status).toBe('BETWEEN_CLASSES');
      expect(resLunchEnd.minutesUntilNext).toBe(1);

      // 14:00:00 exact start of afternoon lab (CS-305 in LAB-3)
      const labStart = new Date(`${monday}T14:00:00`);
      const resLab = calculateActiveSchedule(labStart);
      expect(resLab.status).toBe('IN_SESSION');
      expect(resLab.activeSlot?.courseCode).toBe('CS-305');
      expect(resLab.activeSlot?.slotType).toBe('Lab');
      expect(resLab.minutesRemaining).toBe(120); // 2 hours
    });

    it('2.5 should verify end of academic day (17:00:00) transitions to DAY_FINISHED', () => {
      // 16:59:59 is inside last slot (CS-306 in LAB-1)
      const lastSlot = new Date(`${monday}T16:59:59`);
      const resLast = calculateActiveSchedule(lastSlot);
      expect(resLast.status).toBe('IN_SESSION');
      expect(resLast.minutesRemaining).toBe(1);
      expect(resLast.nextSlot).toBeNull();
      expect(resLast.minutesUntilNext).toBe(0);

      // 17:00:00 classes are done
      const dayEnd = new Date(`${monday}T17:00:00`);
      const resEnd = calculateActiveSchedule(dayEnd);
      expect(resEnd.status).toBe('DAY_FINISHED');
      expect(resEnd.activeSlot).toBeNull();
      expect(resEnd.nextSlot).toBeNull();
      expect(resEnd.minutesRemaining).toBe(0);

      // 23:59:59 remains DAY_FINISHED
      const lateNight = new Date(`${monday}T23:59:59`);
      expect(calculateActiveSchedule(lateNight).status).toBe('DAY_FINISHED');
    });
  });

  // =========================================================================
  // SUITE 3: Weekend State Transitions (Saturday vs Sunday)
  // =========================================================================
  describe('3. Weekend State Transitions (Saturday vs Sunday)', () => {
    it('3.1 should track Saturday classes, break, afternoon completion, and evening', () => {
      const sat = '2026-10-17';

      // 08:00 before classes
      const morning = new Date(`${sat}T08:00:00`);
      const resMorn = calculateActiveSchedule(morning);
      expect(resMorn.status).toBe('BETWEEN_CLASSES');
      expect(resMorn.nextSlot?.courseCode).toBe('CS-305');
      expect(resMorn.minutesUntilNext).toBe(90); // 09:30 start

      // 09:30 - 11:30 Slot 1
      const slot1 = new Date(`${sat}T10:00:00`);
      const res1 = calculateActiveSchedule(slot1);
      expect(res1.status).toBe('IN_SESSION');
      expect(res1.activeSlot?.courseCode).toBe('CS-305');
      expect(res1.minutesRemaining).toBe(90);

      // 11:30 - 12:00 Saturday Break
      const breakSat = new Date(`${sat}T11:45:00`);
      const resBreak = calculateActiveSchedule(breakSat);
      expect(resBreak.status).toBe('BETWEEN_CLASSES');
      expect(resBreak.nextSlot?.courseCode).toBe('CS-308');
      expect(resBreak.minutesUntilNext).toBe(15);

      // 12:00 - 14:00 Slot 2
      const slot2 = new Date(`${sat}T13:00:00`);
      const res2 = calculateActiveSchedule(slot2);
      expect(res2.status).toBe('IN_SESSION');
      expect(res2.activeSlot?.courseCode).toBe('CS-308');
      expect(res2.minutesRemaining).toBe(60);

      // 14:00:00 Saturday afternoon finish
      const satEnd = new Date(`${sat}T14:00:00`);
      const resEnd = calculateActiveSchedule(satEnd);
      expect(resEnd.status).toBe('DAY_FINISHED');

      // Saturday 23:59:59
      const satLate = new Date(`${sat}T23:59:59`);
      expect(calculateActiveSchedule(satLate).status).toBe('DAY_FINISHED');
    });

    it('3.2 should strictly report WEEKEND_OFF across all 24 hours of Sunday', () => {
      const sun = '2026-10-18';
      const testTimes = ['00:00:00', '06:00:00', '09:00:00', '13:00:00', '18:00:00', '23:59:59'];

      for (const time of testTimes) {
        const date = new Date(`${sun}T${time}`);
        const res = calculateActiveSchedule(date);
        expect(res.status).toBe('WEEKEND_OFF');
        expect(res.activeSlot).toBeNull();
        expect(res.activeRoom).toBeNull();
        expect(res.activeFaculty).toBeNull();
        expect(res.nextSlot).toBeNull();
        expect(res.minutesRemaining).toBe(0);
        expect(res.minutesUntilNext).toBe(0);
      }
    });
  });

  // =========================================================================
  // SUITE 4: 3D Dijkstra Routing Across All 14 Rooms & Staircase Transitions
  // =========================================================================
  describe('4. 3D Dijkstra Routing Across All 14 Rooms', () => {
    it('4.1 should route to all 14 rooms from campus entrance gate', () => {
      expect(campusRooms.length).toBeGreaterThanOrEqual(14);

      for (const room of campusRooms) {
        const path = findPathToRoom(room.id);
        expect(path).not.toBeNull();
        expect(path!.length).toBeGreaterThanOrEqual(3);

        // First point is the gate at [0, 0.1, 36]
        expect(path![0]).toEqual([0, 0.1, 36]);

        // Last point is the room door
        const lastPt = path![path!.length - 1];
        if (room.floor === 'ground') {
          expect(lastPt[1]).toBeCloseTo(1.0, 0.1);
        } else {
          expect(lastPt[1]).toBeCloseTo(3.6, 0.1);
        }
      }
    });

    it('4.2 should enforce zero vertical elevation changes for all 8 Ground Floor rooms', () => {
      const groundRooms = campusRooms.filter((r) => r.floor === 'ground');
      expect(groundRooms.length).toBeGreaterThanOrEqual(8);

      for (const room of groundRooms) {
        const path = findPathToRoom(room.id)!;
        expect(path).not.toBeNull();

        // Check maximum elevation along the entire path never exceeds doorway elevation (1.0)
        for (const pt of path) {
          expect(pt[1]).toBeLessThanOrEqual(1.01);
          expect(pt[1]).toBeGreaterThanOrEqual(0.09);
        }
      }
    });

    it('4.3 should enforce positive vertical staircase transition (delta >= +3.4) for all 6 First Floor rooms', () => {
      const firstFloorRooms = campusRooms.filter((r) => r.floor === 'first');
      expect(firstFloorRooms.length).toBeGreaterThanOrEqual(6);

      for (const room of firstFloorRooms) {
        const path = findPathToRoom(room.id)!;
        expect(path).not.toBeNull();

        // 1. Must start at ground elevation (0.1)
        expect(path[0][1]).toBeCloseTo(0.1, 0.1);

        // 2. Must finish at 1st floor elevation (3.6)
        expect(path[path.length - 1][1]).toBeCloseTo(3.6, 0.1);

        // 3. Find step where elevation transition occurs
        let stairTransitionFound = false;
        let deltaY = 0;
        for (let i = 0; i < path.length - 1; i++) {
          const dy = path[i + 1][1] - path[i][1];
          if (dy >= 3.0) {
            stairTransitionFound = true;
            deltaY = dy;
            break;
          }
        }

        expect(stairTransitionFound).toBe(true);
        expect(deltaY).toBeCloseTo(3.5, 0.1); // 3.6 - 0.1 = 3.5m vertical climb
      }
    });

    it('4.4 should verify each 1st-floor wing uses the optimal physical staircase', () => {
      // East Wing: LT-3 & LT-4 should use East Stairs (x === 16)
      for (const roomId of ['LT-3', 'LT-4']) {
        const path = findPathToRoom(roomId)!;
        const usesEastStairs = path.some((pt) => pt[0] === 16 && Math.abs(pt[2]) === 16);
        expect(usesEastStairs).toBe(true);
      }

      // West Wing: LAB-3 & LAB-4 should use West Stairs (x === -16)
      for (const roomId of ['LAB-3', 'LAB-4']) {
        const path = findPathToRoom(roomId)!;
        const usesWestStairs = path.some((pt) => pt[0] === -16 && Math.abs(pt[2]) === 16);
        expect(usesWestStairs).toBe(true);
      }

      // North Wing: SEM-2 & FAC-CSE should use North Stairs (z === -16)
      for (const roomId of ['SEM-2', 'FAC-CSE']) {
        const path = findPathToRoom(roomId)!;
        const usesNorthStairs = path.some((pt) => pt[2] === -16);
        expect(usesNorthStairs).toBe(true);
      }
    });

    it('4.5 should route between all 196 (14 x 14) pairwise room combinations without failure', () => {
      let totalRoutesTested = 0;

      for (const startRoom of campusRooms) {
        for (const targetRoom of campusRooms) {
          const path = findDijkstraPath(startRoom.id, targetRoom.id);
          expect(path).not.toBeNull();

          if (startRoom.id === targetRoom.id) {
            expect(path!.length).toBe(1);
          } else {
            expect(path!.length).toBeGreaterThanOrEqual(2);
            // Verify path length symmetry: dist(A -> B) == dist(B -> A)
            const reversePath = findDijkstraPath(targetRoom.id, startRoom.id)!;
            expect(reversePath).not.toBeNull();

            const calcLen = (pts: [number, number, number][]) => {
              let len = 0;
              for (let i = 0; i < pts.length - 1; i++) {
                const dx = pts[i + 1][0] - pts[i][0];
                const dy = pts[i + 1][1] - pts[i][1];
                const dz = pts[i + 1][2] - pts[i][2];
                len += Math.sqrt(dx * dx + dy * dy + dz * dz);
              }
              return len;
            };

            expect(calcLen(path!)).toBeCloseTo(calcLen(reversePath), 4);
          }
          totalRoutesTested++;
        }
      }

      expect(totalRoutesTested).toBe(campusRooms.length * campusRooms.length);
    });

    it('4.6 should safely return null on invalid, disconnected, or malformed inputs', () => {
      expect(findDijkstraPath('', 'LT-1')).toBeNull();
      expect(findDijkstraPath('LT-1', '')).toBeNull();
      expect(findDijkstraPath('GHOST_NODE_1', 'GHOST_NODE_2')).toBeNull();
      expect(findPathToRoom('NON_EXISTENT_ROOM')).toBeNull();

      // Test with artificially disconnected graph node
      const customGraph = new Map<string, NavNode>(campusWaypointGraph);
      customGraph.set('isolated_island', {
        id: 'isolated_island',
        coords: [100, 100, 100],
        neighbors: [],
      });

      expect(findDijkstraPath('gate', 'isolated_island', customGraph)).toBeNull();
      expect(findDijkstraPath('isolated_island', 'LT-1', customGraph)).toBeNull();
    });
  });

  // =========================================================================
  // SUITE 5: 3D Cylinder Orientation Geometry Audit
  // =========================================================================
  describe('5. RoutePathMesh Geometry & Staircase Cylinder Orientation Audit', () => {
    it('5.1 should detect horizontal cylinder misalignment on vertical staircase segments', () => {
      // Test the orientation logic used in RoutePathMesh:
      // When connecting stairs_west_g [-14, 0.1, 8] to stairs_west_1f [-14, 3.6, 8]
      const p1 = new THREE.Vector3(-14, 0.1, 8);
      const p2 = new THREE.Vector3(-14, 3.6, 8);
      const dir = p2.clone().sub(p1).normalize();

      expect(dir.x).toBe(0);
      expect(dir.y).toBe(1);
      expect(dir.z).toBe(0);

      // In RoutePathMesh.tsx:
      // if (Math.abs(dir.y) > 0.999) {
      //   quat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      // } else {
      //   quat.setFromUnitVectors(up, dir);
      // }
      const quat = new THREE.Quaternion();
      if (Math.abs(dir.y) > 0.999) {
        quat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      } else {
        quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      }

      // CylinderGeometry in Three.js has its central axis along the Y axis (0, 1, 0).
      // Let's transform the initial cylinder axis (0, 1, 0) by this quaternion:
      const transformedCylinderAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);

      // EMPIRICAL OBSERVATION:
      // Because setFromUnitVectors used (0, 0, 1) instead of (0, 1, 0), the initial (0, 1, 0) axis
      // rotates to (0, 0, -1), which is perpendicular to the vertical path direction (0, 1, 0)!
      expect(Math.abs(transformedCylinderAxis.y)).toBeLessThan(0.001);
      expect(Math.abs(transformedCylinderAxis.z)).toBeCloseTo(1.0, 4);

      // If the code had used identity or handled vertical without switching reference from Y to Z:
      // The expected vertical cylinder axis should have had transformedCylinderAxis.y == 1.0!
    });
  });
});
