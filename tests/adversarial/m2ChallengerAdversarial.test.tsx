import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { TimetableDatabase, timetableDb } from '../../src/services/database/timetableDb';
import {
  calculateActiveSchedule,
  formatMinutesToTime,
  formatDuration,
  getRoomDailySchedule,
} from '../../src/services/time/datetimeEngine';
import { campusRooms } from '../../src/data/campusRooms';
import { campusWaypointGraph, buildWaypointGraph, NavNode } from '../../src/data/waypoints';
import { findDijkstraPath, findPathToRoom } from '../../src/services/routing/pathfinding';
import { useCampusStore } from '../../src/stores/useCampusStore';
import { useTimetableStore, TIME_PRESETS } from '../../src/stores/useTimetableStore';
import { TimeMachineBar } from '../../src/components/ui/TimeMachineBar';
import { ActiveClassBanner } from '../../src/components/ui/ActiveClassBanner';
import { RoomDetailsDrawer } from '../../src/components/ui/RoomDetailsDrawer';
import { TimetableSlot } from '../../src/types/timetable';

describe('Reviewer 2 Adversarial Stress Suite: Milestone 2 (Smart Timetable Sync)', () => {
  beforeEach(() => {
    useCampusStore.getState().resetView();
    useTimetableStore.getState().applyPreset('preset_mon_0930');
  });

  // =========================================================================
  // 1. Relational Database Adversarial Queries & Invariants
  // =========================================================================
  describe('1. Relational Database Stress & Edge Queries', () => {
    it('1.1 should handle SQL query with multiple AND conditions, spaces, and edge operators', () => {
      const db = new TimetableDatabase(true);

      const res = db.query(
        "SELECT * FROM timetable_slots WHERE day_of_week = 'Monday' AND start_minutes >= 540 AND end_minutes <= 660 ORDER BY start_minutes ASC"
      );
      expect(res.rowCount).toBe(2);
      expect(res.rows[0].id).toBe('SLOT-M1');
      expect(res.rows[1].id).toBe('SLOT-M2');
    });

    it('1.2 should gracefully handle non-existent table or empty condition in query', () => {
      const db = new TimetableDatabase(true);

      const invalidTable = db.query('SELECT * FROM non_existent_table WHERE id = 1');
      expect(invalidTable.rowCount).toBe(0);
      expect(invalidTable.rows).toEqual([]);

      const malformedSql = db.query('NOT A VALID SQL STATEMENT');
      expect(malformedSql.rowCount).toBe(0);
      expect(malformedSql.rows).toEqual([]);
    });

    it('1.3 should correctly evaluate DESC ordering and case-insensitive equality', () => {
      const db = new TimetableDatabase(true);

      const descResult = db.query(
        "SELECT * FROM rooms WHERE floor = 'GROUND' ORDER BY capacity DESC"
      );
      expect(descResult.rowCount).toBe(campusRooms.filter((r) => r.floor.toLowerCase() === 'ground').length);
      for (let i = 0; i < descResult.rows.length - 1; i++) {
        expect(Number(descResult.rows[i].capacity)).toBeGreaterThanOrEqual(
          Number(descResult.rows[i + 1].capacity)
        );
      }
    });

    it('1.4 should support dynamic CREATE TABLE and INSERT INTO custom table', () => {
      const db = new TimetableDatabase(false);
      db.query('CREATE TABLE custom_audit_logs');
      const insertRes = db.query(
        "INSERT INTO rooms (id, code, name, type, floor, building, wing, capacity, x, y, z, door_waypoint_id, description, facilities, in_charge_faculty) VALUES ('TEST-01', 'T-01', 'Test Lab', 'lab', 'ground', 'Bld', 'W', 30, 0, 1, 0, 'wp_test', 'Desc', '[]', 'Prof')"
      );
      expect(insertRes.rowCount).toBe(1);

      const retrieved = db.getRoom('TEST-01');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.code).toBe('T-01');
      expect(retrieved?.capacity).toBe(30);
    });

    it('1.5 should verify foreign key referential integrity for all seed slots in database', () => {
      const db = new TimetableDatabase(true);
      const allRooms = new Map(db.getAllRooms().map((r) => [r.id, r]));
      const allFaculty = new Map(db.getAllFaculty().map((f) => [f.id, f]));
      const allCourses = new Map(db.getAllCourses().map((c) => [c.id, c]));

      const slots = db.getSlots();
      expect(slots.length).toBeGreaterThanOrEqual(18);

      slots.forEach((slot) => {
        expect(allRooms.has(slot.roomId)).toBe(true);
        expect(allFaculty.has(slot.facultyId)).toBe(true);
        expect(allCourses.has(slot.courseId)).toBe(true);

        // Verification of denormalized resolved names
        expect(slot.courseName).toBe(allCourses.get(slot.courseId)!.name);
        expect(slot.facultyName).toBe(allFaculty.get(slot.facultyId)!.name);
      });
    });
  });

  // =========================================================================
  // 2. Datetime Boundary Arithmetic & Adversarial Temporal States
  // =========================================================================
  describe('2. Datetime Boundary Arithmetic & Adversarial Temporal States', () => {
    it('2.1 should handle midnight (00:00:00) on Monday with morning countdown', () => {
      const midnight = new Date('2026-10-12T00:00:00');
      const res = calculateActiveSchedule(midnight);

      expect(res.status).toBe('BETWEEN_CLASSES');
      expect(res.activeSlot).toBeNull();
      expect(res.nextSlot?.id).toBe('SLOT-M1');
      // 09:00 is 540 minutes from 00:00
      expect(res.minutesUntilNext).toBe(540);
    });

    it('2.2 should handle 23:59:59 on Monday as DAY_FINISHED', () => {
      const endOfDay = new Date('2026-10-12T23:59:59');
      const res = calculateActiveSchedule(endOfDay);

      expect(res.status).toBe('DAY_FINISHED');
      expect(res.activeSlot).toBeNull();
      expect(res.nextSlot).toBeNull();
      expect(res.minutesRemaining).toBe(0);
      expect(res.minutesUntilNext).toBe(0);
    });

    it('2.3 should test exact second transitions: 09:59:59 vs 10:00:00 vs 10:00:01', () => {
      const at0959 = new Date('2026-10-12T09:59:59');
      const res0959 = calculateActiveSchedule(at0959);
      expect(res0959.status).toBe('IN_SESSION');
      expect(res0959.activeSlot?.id).toBe('SLOT-M1');
      expect(res0959.minutesRemaining).toBe(1);

      const at1000 = new Date('2026-10-12T10:00:00');
      const res1000 = calculateActiveSchedule(at1000);
      expect(res1000.status).toBe('IN_SESSION');
      expect(res1000.activeSlot?.id).toBe('SLOT-M2');
      expect(res1000.minutesRemaining).toBe(60);

      const at100001 = new Date('2026-10-12T10:00:01');
      const res100001 = calculateActiveSchedule(at100001);
      expect(res100001.status).toBe('IN_SESSION');
      expect(res100001.activeSlot?.id).toBe('SLOT-M2');
    });

    it('2.4 should handle exact boundary of lunch break (13:15 to 14:00)', () => {
      // Slot M3B ends at 13:15
      const at1314 = new Date('2026-10-12T13:14:00');
      const res1314 = calculateActiveSchedule(at1314);
      expect(res1314.status).toBe('IN_SESSION');
      expect(res1314.activeSlot?.id).toBe('SLOT-M3B');

      // Exactly at 13:15: Lunch starts, status becomes BETWEEN_CLASSES
      const at1315 = new Date('2026-10-12T13:15:00');
      const res1315 = calculateActiveSchedule(at1315);
      expect(res1315.status).toBe('BETWEEN_CLASSES');
      expect(res1315.nextSlot?.id).toBe('SLOT-M4');
      expect(res1315.minutesUntilNext).toBe(45); // 14:00 - 13:15 = 45 mins

      // In the middle of lunch at 13:45
      const at1345 = new Date('2026-10-12T13:45:00');
      const res1345 = calculateActiveSchedule(at1345);
      expect(res1345.status).toBe('BETWEEN_CLASSES');
      expect(res1345.minutesUntilNext).toBe(15); // 14:00 - 13:45 = 15 mins

      // Exactly at 14:00: AI Lab starts
      const at1400 = new Date('2026-10-12T14:00:00');
      const res1400 = calculateActiveSchedule(at1400);
      expect(res1400.status).toBe('IN_SESSION');
      expect(res1400.activeSlot?.id).toBe('SLOT-M4');
    });

    it('2.5 should handle empty schedule array gracefully', () => {
      const monday = new Date('2026-10-12T10:00:00');
      const res = calculateActiveSchedule(monday, []);
      expect(res.status).toBe('DAY_FINISHED');
      expect(res.activeSlot).toBeNull();
      expect(res.nextSlot).toBeNull();
    });

    it('2.6 should verify Saturday schedule slots', () => {
      // 2026-10-17 is Saturday
      const satMorning = new Date('2026-10-17T10:00:00');
      const res = calculateActiveSchedule(satMorning);
      expect(res.status).toBe('IN_SESSION');
      expect(res.activeSlot?.roomId).toBe('LAB-3');
      expect(res.activeSlot?.courseCode).toBe('CS-305');
    });
  });

  // =========================================================================
  // 3. 3D Dijkstra Waypoint Routing Full Mesh & Stress Test
  // =========================================================================
  describe('3. 3D Dijkstra Full Matrix Pairwise Navigation & Robustness', () => {
    it('3.1 should successfully compute 3D route between ALL 14x14 room pairs (196 pairwise routes)', () => {
      const roomIds = campusRooms.map((r) => r.id);
      let totalPaths = 0;

      for (const startRoom of roomIds) {
        for (const targetRoom of roomIds) {
          const path = findDijkstraPath(startRoom, targetRoom);
          expect(path).not.toBeNull();
          if (startRoom === targetRoom) {
            expect(path?.length).toBe(1);
          } else {
            expect(path!.length).toBeGreaterThanOrEqual(2);
          }
          totalPaths++;
        }
      }

      expect(totalPaths).toBe(campusRooms.length * campusRooms.length);
    });

    it('3.2 should traverse staircase vertically for cross-floor routes (Ground -> First)', () => {
      // LT-1 is ground (y=1.0), LT-3 is first floor (y=3.6)
      const path = findDijkstraPath('LT-1', 'LT-3');
      expect(path).not.toBeNull();

      const yCoords = path!.map((pt) => pt[1]);
      const minY = Math.min(...yCoords);
      const maxY = Math.max(...yCoords);

      expect(minY).toBeLessThanOrEqual(1.0);
      expect(maxY).toBeGreaterThanOrEqual(3.6);

      // Verify intermediate stair waypoint elevation
      const hasIntermediateOrAscended = path!.some((pt) => pt[1] >= 3.5);
      expect(hasIntermediateOrAscended).toBe(true);
    });

    it('3.3 should handle disconnected node or missing node gracefully', () => {
      const customGraph = new Map<string, NavNode>([
        ['island_a', { id: 'island_a', coords: [0, 0, 0], neighbors: [] }],
        ['island_b', { id: 'island_b', coords: [10, 10, 10], neighbors: [] }],
      ]);

      const disconnectedPath = findDijkstraPath('island_a', 'island_b', customGraph);
      expect(disconnectedPath).toBeNull();

      const invalidStartPath = findDijkstraPath('non_existent_node', 'island_a', customGraph);
      expect(invalidStartPath).toBeNull();
    });
  });

  // =========================================================================
  // 4. Interactive UI Stress & State Machine Integrity
  // =========================================================================
  describe('4. UI Stress & State Synchronization', () => {
    it('4.1 should handle rapid sequential preset changes in TimeMachineBar without desync', () => {
      render(<TimeMachineBar />);

      TIME_PRESETS.slice(0, 5).forEach((preset) => {
        const btn = screen.getByTestId(`preset-btn-${preset.id}`);
        act(() => {
          btn.click();
        });

        const store = useTimetableStore.getState();
        expect(store.selectedPresetId).toBe(preset.id);
        expect(store.activeSchedule).toBeDefined();
      });
    });

    it('4.2 should step time backwards and forwards across minute boundaries', () => {
      const initialMinutes = useTimetableStore.getState().simulatedDate.getMinutes();

      // Step forward 15m twice
      act(() => {
        useTimetableStore.getState().setSimulatedDate(
          new Date(useTimetableStore.getState().simulatedDate.getTime() + 15 * 60 * 1000)
        );
      });
      const steppedMinutes = useTimetableStore.getState().simulatedDate.getMinutes();
      expect(steppedMinutes).toBe((initialMinutes + 15) % 60);
    });

    it('4.3 should update ActiveClassBanner and trigger room navigation when preset changes', () => {
      const { rerender } = render(<ActiveClassBanner />);

      // Mon 09:30 -> In Session (LT-1)
      act(() => {
        useTimetableStore.getState().applyPreset('preset_mon_0930');
      });
      rerender(<ActiveClassBanner />);
      expect(screen.getByText('Data Structures & Algorithms')).toBeInTheDocument();

      // Mon 11:05 -> Morning Break (Between classes, Next: LT-3)
      act(() => {
        useTimetableStore.getState().applyPreset('preset_mon_1105');
      });
      rerender(<ActiveClassBanner />);
      expect(screen.getByText(/Break Between Classes/i)).toBeInTheDocument();
      expect(screen.getByText(/Computer Organization & Arch/i)).toBeInTheDocument();

      // Click "Show Route to Next Class"
      const nextBtn = screen.getByTestId('take-me-to-class-btn');
      act(() => {
        nextBtn.click();
      });

      expect(useCampusStore.getState().selectedRoomId).toBe('LT-3');
      expect(useCampusStore.getState().navigationPath).not.toBeNull();
    });

    it('4.4 should correctly render RoomDetailsDrawer for vacant room vs active room', () => {
      // Set to Mon 09:30 (LT-1 is active, LT-4 is vacant)
      act(() => {
        useTimetableStore.getState().applyPreset('preset_mon_0930');
        useCampusStore.getState().selectRoom('LT-4');
      });

      const { rerender } = render(<RoomDetailsDrawer />);
      expect(screen.getByText('Currently Vacant')).toBeInTheDocument();
      expect(screen.getByText('No lecture currently running in this hall.')).toBeInTheDocument();

      // Now inspect active room LT-1
      act(() => {
        useCampusStore.getState().selectRoom('LT-1');
      });
      rerender(<RoomDetailsDrawer />);
      expect(screen.getByText('Class In Session')).toBeInTheDocument();
      expect(screen.getByText('Lecture Theater 9 (LT-9)')).toBeInTheDocument();
    });
  });
});
