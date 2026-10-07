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
import { useTimetableStore, TIME_PRESETS } from '../../src/stores/useTimetableStore';
import { useCampusStore } from '../../src/stores/useCampusStore';
import { TimeMachineBar } from '../../src/components/ui/TimeMachineBar';
import { ActiveClassBanner } from '../../src/components/ui/ActiveClassBanner';
import { RoomDetailsDrawer } from '../../src/components/ui/RoomDetailsDrawer';

describe('Challenger 2 Empirical Adversarial Suite: Milestone 2', () => {
  beforeEach(() => {
    useCampusStore.getState().resetView();
    useTimetableStore.getState().applyPreset('preset_mon_0930');
  });

  // =========================================================================
  // 1. Relational Database Resilience & Adversarial SQL Queries
  // =========================================================================
  describe('1. Relational Database SQL Resilience & Edge Cases', () => {
    it('1.1 should safely handle malformed SQL queries without throwing unhandled exceptions', () => {
      const db = new TimetableDatabase(true);
      const malformedQueries = [
        '',
        '   ',
        ';;;;',
        'SELECT',
        'SELECT FROM',
        'SELECT * FROM',
        'SELECT FROM rooms',
        'INSERT INTO',
        'INSERT INTO rooms',
        'INSERT INTO rooms () VALUES ()',
        'UPDATE rooms SET name = "foo"',
        'DELETE FROM rooms',
        'DROP TABLE rooms',
        'WHERE = = =',
        'INVALID TOKEN COMMAND RANDOM 12345',
        'SELECT * FROM rooms WHERE',
        'SELECT * FROM rooms WHERE =',
        'SELECT * FROM rooms WHERE ???',
      ];

      for (const query of malformedQueries) {
        expect(() => {
          const res = db.query(query);
          expect(res).toBeDefined();
          expect(Array.isArray(res.rows)).toBe(true);
          expect(typeof res.rowCount).toBe('number');
        }).not.toThrow();
      }
    });

    it('1.2 should resist SQL injection attempts and preserve database records', () => {
      const db = new TimetableDatabase(true);
      const initialRooms = db.getAllRooms().length;
      expect(initialRooms).toBeGreaterThanOrEqual(14);

      const injectionQueries = [
        "SELECT * FROM rooms WHERE id = 'LT-1' OR 1=1 --",
        "SELECT * FROM rooms WHERE id = 'LT-1'; DROP TABLE rooms; --",
        "SELECT * FROM rooms WHERE id = 'admin' OR '1'='1'",
        "SELECT * FROM rooms WHERE name = '\" OR \"\"=\"'",
        "SELECT * FROM timetable_slots WHERE start_minutes >= 0 OR 1=1",
        "SELECT * FROM courses WHERE code = '' UNION SELECT * FROM faculty --",
      ];

      for (const sql of injectionQueries) {
        expect(() => {
          const res = db.query(sql);
          expect(res).toBeDefined();
        }).not.toThrow();
      }

      // Verify records and schema survived intact
      expect(db.getAllRooms().length).toBe(initialRooms);
      expect(db.getAllFaculty().length).toBeGreaterThanOrEqual(10);
      expect(db.getAllCourses().length).toBeGreaterThanOrEqual(8);
      expect(db.getSlots().length).toBeGreaterThanOrEqual(15);
    });

    it('1.3 should safely return empty result sets for unknown tables without crashing', () => {
      const db = new TimetableDatabase(true);
      const unknownQueries = [
        'SELECT * FROM secret_passwords',
        'SELECT * FROM users',
        'SELECT * FROM system_logs',
        'SELECT * FROM non_existent_table_xyz',
      ];

      for (const sql of unknownQueries) {
        const res = db.query(sql);
        expect(res.rows).toEqual([]);
        expect(res.rowCount).toBe(0);
        expect(res.columns).toEqual([]);
      }
    });

    it('1.4 should handle duplicate ID insertions gracefully in in-memory Map tables', () => {
      const db = new TimetableDatabase(true);
      const initialRooms = db.getAllRooms().length;

      // Duplicate Room Insertion
      const duplicateRoom = {
        id: 'LT-1',
        code: 'LT-01-DUP',
        name: 'Overwritten Hall Name',
        type: 'lecture_theater',
        floor: 'ground',
        building: 'Block A',
        wing: 'East',
        capacity: 999,
        x: 20,
        y: 1.0,
        z: 7,
        door_waypoint_id: 'wp_lt1',
        description: 'Updated hall description',
        facilities: JSON.stringify(['High Tech']),
        in_charge_faculty: 'Dr. Overwrite',
      };

      db.insertRoom(duplicateRoom);
      const retrieved = db.getRoom('LT-1');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Overwritten Hall Name');
      expect(retrieved?.capacity).toBe(999);
      // Room count remains unchanged (key overwritten, no duplicates added)
      expect(db.getAllRooms().length).toBe(initialRooms);

      // Duplicate Course Insertion
      db.insertCourse({
        id: 'CS-301',
        code: 'CS-301-X',
        name: 'Advanced DSA Replacement',
        department: 'Computer Science',
        semester: 3,
        credits: 5,
      });
      expect(db.getCourse('CS-301')?.name).toBe('Advanced DSA Replacement');
      expect(db.getCourse('CS-301')?.credits).toBe(5);

      // Duplicate Faculty Insertion
      db.insertFaculty({
        id: 'FAC-01',
        name: 'Dr. Overwrite Faculty',
        designation: 'Chair Professor',
        department: 'CSE',
        email: 'overwrite@jiet.ac.in',
        office_room_id: 'FAC-CSE',
      });
      expect(db.getFaculty('FAC-01')?.name).toBe('Dr. Overwrite Faculty');
    });

    it('1.5 should query rooms with no scheduled classes correctly without errors', () => {
      const db = new TimetableDatabase(true);

      // ADMIN-01 has no scheduled classes
      const adminSlots = db.getSlotsByRoom('ADMIN-01');
      expect(adminSlots).toEqual([]);

      // FAC-CSE has no scheduled classes
      const facSlots = db.getSlotsByRoom('FAC-CSE');
      expect(facSlots).toEqual([]);

      // Arbitrary non-existent room ID
      const nonExistentSlots = db.getSlotsByRoom('RANDOM_ROOM_999');
      expect(nonExistentSlots).toEqual([]);

      // Daily schedule check for date
      const mondayDate = new Date('2026-10-12T10:00:00');
      const adminDaily = getRoomDailySchedule('ADMIN-01', mondayDate);
      expect(adminDaily).toEqual([]);
      const facDaily = getRoomDailySchedule('FAC-CSE', mondayDate);
      expect(facDaily).toEqual([]);
    });

    it('1.6 should safely return null for non-existent room, faculty, and course lookups', () => {
      const db = new TimetableDatabase(true);
      expect(db.getRoom('NON_EXISTENT_ROOM')).toBeNull();
      expect(db.getFaculty('NON_EXISTENT_FACULTY')).toBeNull();
      expect(db.getCourse('NON_EXISTENT_COURSE')).toBeNull();
    });
  });

  // =========================================================================
  // 2. Time Machine Overlay Stress & Controls Resilience
  // =========================================================================
  describe('2. Time Machine Overlay Stress & Preset Rapid Toggling', () => {
    it('2.1 should survive rapid clicking across all schedule presets without store corruption', () => {
      render(<TimeMachineBar />);

      const presetIds = [
        'preset_mon_0930',
        'preset_mon_1105',
        'preset_mon_1130',
        'preset_mon_1330',
        'preset_mon_1430',
      ];

      // Rapidly trigger 50 preset clicks
      for (let i = 0; i < 50; i++) {
        const id = presetIds[i % presetIds.length];
        const btn = screen.getByTestId(`preset-btn-${id}`);
        act(() => {
          btn.click();
        });

        const store = useTimetableStore.getState();
        expect(store.selectedPresetId).toBe(id);
        expect(store.isLiveClock).toBe(false);
      }

      // Verify final preset is stable
      const lastPreset = useTimetableStore.getState().presets.find((p) => p.id === 'preset_mon_1430');
      expect(lastPreset).toBeDefined();
      expect(useTimetableStore.getState().simulatedDate.getTime()).toBe(lastPreset!.date.getTime());
    });

    it('2.2 should step time (+/- 15 min) sequentially across class and break boundaries', () => {
      render(<TimeMachineBar />);

      const forwardBtn = screen.getByTitle('Forward 15 minutes');
      const backBtn = screen.getByTitle('Back 15 minutes');

      // Start at Mon 09:30 (CS-301 active in LT-1)
      act(() => {
        useTimetableStore.getState().applyPreset('preset_mon_0930');
      });
      expect(useTimetableStore.getState().activeSchedule.status).toBe('IN_SESSION');
      expect(useTimetableStore.getState().activeSchedule.activeSlot?.roomId).toBe('LT-1');

      // Step forward 1: 09:30 -> 09:45
      act(() => {
        forwardBtn.click();
      });
      expect(useTimetableStore.getState().simulatedDate.getMinutes()).toBe(45);
      expect(useTimetableStore.getState().activeSchedule.status).toBe('IN_SESSION');
      expect(useTimetableStore.getState().activeSchedule.activeSlot?.courseCode).toBe('CS-301');

      // Step forward 2: 09:45 -> 10:00 (CS-302 starts in LT-1)
      act(() => {
        forwardBtn.click();
      });
      expect(useTimetableStore.getState().simulatedDate.getMinutes()).toBe(0);
      expect(useTimetableStore.getState().simulatedDate.getHours()).toBe(10);
      expect(useTimetableStore.getState().activeSchedule.status).toBe('IN_SESSION');
      expect(useTimetableStore.getState().activeSchedule.activeSlot?.courseCode).toBe('CS-302');

      // Step forward 4 times (+60m -> 11:00 -> Morning Tea Break)
      act(() => { forwardBtn.click(); }); // 10:15
      act(() => { forwardBtn.click(); }); // 10:30
      act(() => { forwardBtn.click(); }); // 10:45
      act(() => { forwardBtn.click(); }); // 11:00

      // At 11:00, classes end for morning break until 11:15
      expect(useTimetableStore.getState().activeSchedule.status).toBe('BETWEEN_CLASSES');
      expect(useTimetableStore.getState().activeSchedule.nextSlot?.courseCode).toBe('CS-303');
      expect(useTimetableStore.getState().activeSchedule.minutesUntilNext).toBe(15);

      // Step back 2 times (-30m -> 10:30 -> CS-302 in session)
      act(() => { backBtn.click(); });
      act(() => { backBtn.click(); });
      expect(useTimetableStore.getState().activeSchedule.status).toBe('IN_SESSION');
      expect(useTimetableStore.getState().activeSchedule.activeSlot?.courseCode).toBe('CS-302');
    });

    it('2.3 should toggle between live clock and manual simulation without race conditions', () => {
      render(<TimeMachineBar />);
      const toggleBtn = screen.getByTestId('live-clock-toggle');

      // Rapidly toggle live clock 30 times
      for (let i = 0; i < 30; i++) {
        act(() => {
          toggleBtn.click();
        });
        const isLive = useTimetableStore.getState().isLiveClock;
        expect(isLive).toBe((i % 2) === 0);
      }

      // Ensure that selecting a preset automatically pauses live clock
      act(() => {
        useTimetableStore.getState().setLiveClock(true);
      });
      expect(useTimetableStore.getState().isLiveClock).toBe(true);

      const presetBtn = screen.getByTestId('preset-btn-preset_mon_0930');
      act(() => {
        presetBtn.click();
      });
      expect(useTimetableStore.getState().isLiveClock).toBe(false);
      expect(useTimetableStore.getState().selectedPresetId).toBe('preset_mon_0930');
    });
  });

  // =========================================================================
  // 3. Exhaustive Verification Across ALL 14 Campus Rooms
  // =========================================================================
  describe('3. Exhaustive Verification Across ALL 14 Campus Rooms in RoomDetailsDrawer', () => {
    it('3.1 should query and correctly render room specifications, faculty, and status for all 14 rooms', () => {
      // Set to Monday 09:30 (LT-1 is active with CS-301 Dr. Rajesh Sharma)
      act(() => {
        useTimetableStore.getState().applyPreset('preset_mon_0930');
      });

      expect(campusRooms.length).toBeGreaterThanOrEqual(14);

      for (const room of campusRooms) {
        // Select room in store
        act(() => {
          useCampusStore.getState().selectRoom(room.id);
        });

        const { unmount } = render(<RoomDetailsDrawer />);

        // 1. Drawer Container presence
        const drawer = screen.getByTestId('room-details-drawer');
        expect(drawer).toBeInTheDocument();

        // 2. Room Code & Name
        expect(screen.getByText(room.code)).toBeInTheDocument();
        expect(screen.getByText(room.name)).toBeInTheDocument();

        // 3. Floor Badge
        const expectedFloorText = room.floor === 'ground' ? 'Ground Floor' : '1st Floor';
        expect(screen.getByText(expectedFloorText)).toBeInTheDocument();

        // 4. Capacity
        expect(screen.getByText(`${room.capacity} Students`)).toBeInTheDocument();

        // 5. Faculty In-Charge
        if (room.inChargeFaculty) {
          expect(screen.getByText(room.inChargeFaculty)).toBeInTheDocument();
        }

        // 6. Live Status Card
        const statusCard = screen.getByTestId('room-live-status-card');
        expect(statusCard).toBeInTheDocument();

        if (room.id === 'LT-1') {
          // LT-1 is actively hosting CS-301 at 09:30 Monday
          expect(screen.getByText(/Class In Session/i)).toBeInTheDocument();
          expect(screen.getAllByText('Data Structures & Algorithms').length).toBeGreaterThanOrEqual(1);
          expect(screen.getAllByText(/Dr\. Rajesh Sharma/i).length).toBeGreaterThanOrEqual(1);
        } else {
          // Other rooms are vacant at this exact time
          expect(screen.getByText(/Currently Vacant/i)).toBeInTheDocument();
          expect(screen.getByText(/No lecture currently running in this hall\./i)).toBeInTheDocument();
        }

        // 7. Test Route Navigation Toggle
        const routeBtn = screen.getByTestId('navigate-to-room-btn');
        expect(routeBtn).toBeInTheDocument();
        expect(screen.getByText('Show Route')).toBeInTheDocument();

        act(() => {
          routeBtn.click();
        });
        expect(useCampusStore.getState().navigationPath).not.toBeNull();
        expect(useCampusStore.getState().navigationPath!.length).toBeGreaterThanOrEqual(2);
        expect(screen.getByText('Clear Route')).toBeInTheDocument();

        // Clear route
        act(() => {
          routeBtn.click();
        });
        expect(useCampusStore.getState().navigationPath).toBeNull();

        // 8. Test Center in 3D button
        const centerBtn = screen.getByText('Center in 3D');
        act(() => {
          centerBtn.click();
        });
        const target = useCampusStore.getState().cameraTarget;
        expect(target).not.toBeNull();
        expect(target?.lookAt).toEqual(room.position);

        // 9. Close Drawer
        const closeBtn = screen.getByTestId('close-room-drawer-btn');
        act(() => {
          closeBtn.click();
        });
        expect(useCampusStore.getState().selectedRoomId).toBeNull();

        unmount();
      }
    });

    it('3.2 should correctly query and render non-teaching administrative rooms (ADMIN-01, FAC-CSE)', () => {
      act(() => {
        useTimetableStore.getState().applyPreset('preset_mon_0930');
      });

      // Test ADMIN-01
      act(() => {
        useCampusStore.getState().selectRoom('ADMIN-01');
      });
      const { unmount: unmountAdmin } = render(<RoomDetailsDrawer />);
      expect(screen.getByText(/Administrative Secretariat/i)).toBeInTheDocument();
      expect(screen.getByText('ADM-01')).toBeInTheDocument();
      expect(screen.getByText('50 Students')).toBeInTheDocument();
      expect(screen.getByText('Dr. S. K. Purohit (Registrar)')).toBeInTheDocument();
      expect(screen.getByText(/Currently Vacant/i)).toBeInTheDocument();
      unmountAdmin();

      // Test FAC-CSE
      act(() => {
        useCampusStore.getState().selectRoom('FAC-CSE');
      });
      const { unmount: unmountFac } = render(<RoomDetailsDrawer />);
      expect(screen.getByText(/Faculty of Computing Suites/i)).toBeInTheDocument();
      expect(screen.getByText('FAC-01')).toBeInTheDocument();
      expect(screen.getByText('30 Students')).toBeInTheDocument();
      expect(screen.getByText('Prof. Narendra Bishnoi (HOD CSE)')).toBeInTheDocument();
      expect(screen.getByText('1st Floor')).toBeInTheDocument();
      unmountFac();
    });

    it('3.3 should display multi-slot schedule timeline when inspecting rooms with several slots', () => {
      // Test LT-1 on Monday (has SLOT-M1 09:00-10:00 and SLOT-M2 10:00-11:00)
      act(() => {
        useTimetableStore.getState().applyPreset('preset_mon_0930');
        useCampusStore.getState().selectRoom('LT-1');
      });

      render(<RoomDetailsDrawer />);
      expect(screen.getByText(/Today's Schedule \(2 Slots\)/i)).toBeInTheDocument();
      expect(screen.getAllByText('Data Structures & Algorithms').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Database Management Systems')).toBeInTheDocument();
      expect(screen.getByText('09:00–10:00')).toBeInTheDocument();
      expect(screen.getByText('10:00–11:00')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 4. ActiveClassBanner Statuses & Navigation Actions
  // =========================================================================
  describe('4. ActiveClassBanner Statuses & Navigation Actions', () => {
    it('4.1 should correctly handle BETWEEN_CLASSES and trigger route to upcoming room', () => {
      // Set to Monday 11:05 (Break, next class is CS-303 in LT-3)
      act(() => {
        useTimetableStore.getState().applyPreset('preset_mon_1105');
      });

      render(<ActiveClassBanner />);
      expect(screen.getByTestId('active-class-banner')).toBeInTheDocument();
      expect(screen.getByText(/Break Between Classes/i)).toBeInTheDocument();
      expect(screen.getByText(/Next in 10m/i)).toBeInTheDocument();
      expect(screen.getByText('Computer Organization & Arch')).toBeInTheDocument();

      const routeBtn = screen.getByTestId('take-me-to-class-btn');
      act(() => {
        routeBtn.click();
      });

      expect(useCampusStore.getState().selectedRoomId).toBe('LT-3');
      expect(useCampusStore.getState().navigationPath).not.toBeNull();
    });

    it('4.2 should render DAY_FINISHED when classes have concluded', () => {
      act(() => {
        useTimetableStore.getState().applyPreset('preset_mon_1730');
      });

      render(<ActiveClassBanner />);
      expect(screen.getByText('Classes Concluded')).toBeInTheDocument();
      expect(
        screen.getByText('All scheduled lectures & labs for today have completed.')
      ).toBeInTheDocument();
    });

    it('4.3 should render WEEKEND_OFF for Sunday preset', () => {
      act(() => {
        useTimetableStore.getState().applyPreset('preset_sun_1000');
      });

      render(<ActiveClassBanner />);
      expect(screen.getByText('Weekend Off (Sunday)')).toBeInTheDocument();
      expect(
        screen.getByText(/No regular timetable slots today\. Library is open for self-study\./i)
      ).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 5. End-to-End Integrated State Coordination Stress
  // =========================================================================
  describe('5. End-to-End Integrated State Coordination Stress', () => {
    it('5.1 should smoothly synchronize time changes across ActiveClassBanner and RoomDetailsDrawer', () => {
      // Select LT-3
      act(() => {
        useCampusStore.getState().selectRoom('LT-3');
        useTimetableStore.getState().applyPreset('preset_mon_0930');
      });

      const { rerender } = render(
        <div>
          <ActiveClassBanner />
          <RoomDetailsDrawer />
        </div>
      );

      // At 09:30, LT-3 is vacant (CS-301 in LT-1)
      expect(screen.getByText(/Currently Vacant/i)).toBeInTheDocument();
      expect(screen.getByText(/In Session/i)).toBeInTheDocument();

      // Change time to Mon 11:30 (CS-303 active in LT-3)
      act(() => {
        useTimetableStore.getState().applyPreset('preset_mon_1130');
      });

      rerender(
        <div>
          <ActiveClassBanner />
          <RoomDetailsDrawer />
        </div>
      );

      // Both banner and drawer should now show class in session in LT-3
      expect(screen.getAllByText(/Class In Session/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Computer Organization & Arch').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Dr\. Amit Choudhary/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});
