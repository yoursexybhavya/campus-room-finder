import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { TimetableDatabase, timetableDb } from '../../src/services/database/timetableDb';
import {
  calculateActiveSchedule,
  formatMinutesToTime,
  formatDuration,
  getRoomDailySchedule,
} from '../../src/services/time/datetimeEngine';
import { campusWaypointGraph } from '../../src/data/waypoints';
import { findDijkstraPath, findPathToRoom } from '../../src/services/routing/pathfinding';
import { campusRooms } from '../../src/data/campusRooms';
import { useTimetableStore, TIME_PRESETS } from '../../src/stores/useTimetableStore';
import { useCampusStore } from '../../src/stores/useCampusStore';
import { TimeMachineBar } from '../../src/components/ui/TimeMachineBar';
import { ActiveClassBanner } from '../../src/components/ui/ActiveClassBanner';
import { RoomDetailsDrawer } from '../../src/components/ui/RoomDetailsDrawer';

describe('Milestone 2 Empirical & Adversarial Verification Suite', () => {
  beforeEach(() => {
    useCampusStore.getState().resetView();
    useTimetableStore.getState().applyPreset('preset_mon_0930');
  });

  // =========================================================================
  // 1. Relational SQL Database & Schema Integrity
  // =========================================================================
  describe('1. Relational SQL Timetable Database', () => {
    it('1.1 should create and populate all 4 tables with correct record counts', () => {
      const db = new TimetableDatabase(true);

      const allRooms = db.getAllRooms();
      expect(allRooms.length).toBeGreaterThanOrEqual(14);

      const allFaculty = db.getAllFaculty();
      expect(allFaculty.length).toBeGreaterThanOrEqual(10);

      const allCourses = db.getAllCourses();
      expect(allCourses.length).toBeGreaterThanOrEqual(8);

      const allSlots = db.getSlots();
      expect(allSlots.length).toBeGreaterThanOrEqual(15);
    });

    it('1.2 should execute SQL SELECT queries with WHERE and ORDER BY clauses', () => {
      const db = new TimetableDatabase(true);

      // Select ground floor rooms
      const groundResult = db.query("SELECT * FROM rooms WHERE floor = 'ground'");
      expect(groundResult.rowCount).toBeGreaterThanOrEqual(8);
      groundResult.rows.forEach((r) => expect(r.floor).toBe('ground'));

      // Select Monday slots ordered by start_minutes
      const monResult = db.query(
        "SELECT * FROM timetable_slots WHERE day_of_week = 'Monday' ORDER BY start_minutes ASC"
      );
      expect(monResult.rowCount).toBeGreaterThanOrEqual(4);
      for (let i = 0; i < monResult.rows.length - 1; i++) {
        expect(Number(monResult.rows[i].start_minutes)).toBeLessThanOrEqual(
          Number(monResult.rows[i + 1].start_minutes)
        );
      }
    });

    it('1.3 should enforce relational integrity across rooms, faculty, and slots', () => {
      const db = new TimetableDatabase(true);
      const rooms = new Set(db.getAllRooms().map((r) => r.id));
      const faculty = new Set(db.getAllFaculty().map((f) => f.id));
      const courses = new Set(db.getAllCourses().map((c) => c.id));

      for (const slot of db.getSlots()) {
        expect(rooms.has(slot.roomId)).toBe(true);
        expect(faculty.has(slot.facultyId)).toBe(true);
        expect(courses.has(slot.courseId)).toBe(true);
      }
    });

    it('1.4 should support INSERT statements and subsequent query retrieval', () => {
      const db = new TimetableDatabase(true);
      db.query(
        "INSERT INTO courses (id, code, name, department, semester, credits) VALUES ('CS-999', 'CS-999', 'Quantum Computing', 'Computer Science', 8, 4)"
      );

      const course = db.getCourse('CS-999');
      expect(course).not.toBeNull();
      expect(course?.name).toBe('Quantum Computing');
      expect(course?.credits).toBe(4);
    });
  });

  // =========================================================================
  // 2. Deterministic Datetime Calculation Engine
  // =========================================================================
  describe('2. Datetime Calculation Engine Boundary & Stress Tests', () => {
    it('2.1 should detect exact start minute (09:00) as active class', () => {
      const date = new Date('2026-10-12T09:00:00');
      const res = calculateActiveSchedule(date);

      expect(res.status).toBe('IN_SESSION');
      expect(res.activeSlot?.courseCode).toBe('CS-301');
      expect(res.activeSlot?.roomId).toBe('LT-1');
      expect(res.minutesRemaining).toBe(60);
    });

    it('2.2 should transition to next slot at exact 10:00 boundary', () => {
      const date = new Date('2026-10-12T10:00:00');
      const res = calculateActiveSchedule(date);

      expect(res.status).toBe('IN_SESSION');
      expect(res.activeSlot?.courseCode).toBe('CS-302');
      expect(res.activeSlot?.roomId).toBe('LT-1');
      expect(res.minutesRemaining).toBe(60);
    });

    it('2.3 should correctly resolve morning break (11:00 - 11:15)', () => {
      const date = new Date('2026-10-12T11:05:00');
      const res = calculateActiveSchedule(date);

      expect(res.status).toBe('BETWEEN_CLASSES');
      expect(res.activeSlot).toBeNull();
      expect(res.nextSlot?.courseCode).toBe('CS-303');
      expect(res.nextSlot?.roomId).toBe('LT-3');
      expect(res.minutesUntilNext).toBe(10);
    });

    it('2.4 should identify multi-floor practical afternoon session (14:00 - 16:00)', () => {
      const date = new Date('2026-10-12T14:30:00');
      const res = calculateActiveSchedule(date);

      expect(res.status).toBe('IN_SESSION');
      expect(res.activeSlot?.courseCode).toBe('CS-305');
      expect(res.activeSlot?.roomId).toBe('LAB-3');
      expect(res.activeRoom?.floor).toBe('first');
      expect(res.minutesRemaining).toBe(90);
    });

    it('2.5 should correctly return WEEKEND_OFF for Sunday and DAY_FINISHED for late evening', () => {
      const sunday = new Date('2026-10-18T11:00:00');
      const sunRes = calculateActiveSchedule(sunday);
      expect(sunRes.status).toBe('WEEKEND_OFF');

      const lateMonday = new Date('2026-10-12T18:00:00');
      const monRes = calculateActiveSchedule(lateMonday);
      expect(monRes.status).toBe('DAY_FINISHED');
    });

    it('2.6 should format minutes and durations accurately', () => {
      expect(formatMinutesToTime(540)).toBe('09:00');
      expect(formatMinutesToTime(675)).toBe('11:15');
      expect(formatDuration(45)).toBe('45m');
      expect(formatDuration(90)).toBe('1h 30m');
    });
  });

  // =========================================================================
  // 3. 3D Waypoint Graph & Dijkstra Routing
  // =========================================================================
  describe('3. 3D Waypoint Graph & Dijkstra Pathfinding', () => {
    it('3.1 should find valid navigation path from entrance to every single one of the 14 rooms', () => {
      for (const room of campusRooms) {
        const path = findPathToRoom(room.id);
        expect(path).not.toBeNull();
        expect(path!.length).toBeGreaterThanOrEqual(2);

        // First point should be near gate [0, 0.1, 36]
        expect(path![0][2]).toBeCloseTo(36, 0);

        // Last point should match room door waypoint elevation
        const lastPt = path![path!.length - 1];
        if (room.floor === 'ground') {
          expect(lastPt[1]).toBeCloseTo(1.0, 0.5);
        } else {
          expect(lastPt[1]).toBeCloseTo(3.6, 0.5);
        }
      }
    });

    it('3.2 should route through staircase with ascending elevation for 1st floor rooms', () => {
      const path = findPathToRoom('LT-3');
      expect(path).not.toBeNull();

      // Check elevation starts near ground and ends at first floor
      expect(path![0][1]).toBeCloseTo(0.1, 1);
      const finalY = path![path!.length - 1][1];
      expect(finalY).toBeCloseTo(3.6, 1);

      // Verify at least one point has intermediate or elevated staircase height
      const hasElevatedStair = path!.some((pt) => pt[1] >= 3.5);
      expect(hasElevatedStair).toBe(true);
    });

    it('3.3 should return null for non-existent room target', () => {
      const path = findPathToRoom('NON_EXISTENT_ROOM_XYZ');
      expect(path).toBeNull();
    });
  });

  // =========================================================================
  // 4. UI Overlays (TimeMachineBar, ActiveClassBanner, RoomDetailsDrawer)
  // =========================================================================
  describe('4. Interactive UI Overlays', () => {
    it('4.1 should render TimeMachineBar and allow selecting schedule presets', () => {
      render(<TimeMachineBar />);

      expect(screen.getByTestId('time-machine-bar')).toBeInTheDocument();
      expect(screen.getByTestId('live-clock-toggle')).toBeInTheDocument();

      const presetBtn = screen.getByTestId('preset-btn-preset_mon_1130');
      act(() => {
        presetBtn.click();
      });

      const store = useTimetableStore.getState();
      expect(store.selectedPresetId).toBe('preset_mon_1130');
      expect(store.activeSchedule.activeSlot?.courseCode).toBe('CS-303');
    });

    it('4.2 should render ActiveClassBanner with current course and trigger route navigation', () => {
      // Set to Monday 09:30
      act(() => {
        useTimetableStore.getState().applyPreset('preset_mon_0930');
      });

      render(<ActiveClassBanner />);

      expect(screen.getByTestId('active-class-banner')).toBeInTheDocument();
      expect(screen.getByText('Data Structures & Algorithms')).toBeInTheDocument();
      expect(screen.getByText(/CS-301/i)).toBeInTheDocument();

      const routeBtn = screen.getByTestId('take-me-to-class-btn');
      act(() => {
        routeBtn.click();
      });

      expect(useCampusStore.getState().selectedRoomId).toBe('LT-1');
      expect(useCampusStore.getState().navigationPath).not.toBeNull();
    });

    it('4.3 should display live status and schedule timeline in RoomDetailsDrawer', () => {
      act(() => {
        useTimetableStore.getState().applyPreset('preset_mon_0930');
        useCampusStore.getState().selectRoom('LT-1');
      });

      render(<RoomDetailsDrawer />);

      expect(screen.getByTestId('room-details-drawer')).toBeInTheDocument();
      expect(screen.getByTestId('room-live-status-card')).toBeInTheDocument();
      expect(screen.getByText(/Class In Session/i)).toBeInTheDocument();
      expect(screen.getAllByText('Data Structures & Algorithms').length).toBeGreaterThanOrEqual(1);

      // Verify route highlight toggle
      const navBtn = screen.getByTestId('navigate-to-room-btn');
      act(() => {
        navBtn.click();
      });
      expect(useCampusStore.getState().navigationPath).not.toBeNull();

      act(() => {
        navBtn.click();
      });
      expect(useCampusStore.getState().navigationPath).toBeNull();
    });
  });
});
