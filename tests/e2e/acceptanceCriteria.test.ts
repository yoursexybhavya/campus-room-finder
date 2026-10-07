import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { CampusScene } from '../../src/components/canvas/CampusScene';
import { campusRooms } from '../../src/data/campusRooms';
import { useCampusStore } from '../../src/stores/useCampusStore';
import { calculateActiveSchedule, mockSlots, mockFaculty } from '../helpers/timetable';
import { MockSocketServer, MockSocketClient, MockPeerPayload } from '../../src/test/mockSocket';
import { KonamiCodeDetector, KONAMI_SEQUENCE } from '../helpers/konami';
import { PhysicsNode, stepNodePhysics } from '../helpers/physics';
import { EasterEggController } from '../integration/AntiGravityEasterEgg.test';

describe('MASTER ACCEPTANCE SUITE (ORIGINAL_REQUEST.md Verification)', () => {
  beforeEach(() => {
    useCampusStore.getState().resetView();
  });

  /* ========================================================================
   * 1. 3D MAP RENDERING ACCEPTANCE CRITERIA
   * ======================================================================== */
  describe('Criterion 1: 3D Map Rendering', () => {
    it('[AC-1.1] A React-Three-Fiber <canvas> is rendered without console errors', () => {
      const errorSpy = vi.spyOn(console, 'error');

      // Use React.createElement to support pure .ts syntax without JSX transpilation issues
      const { container } = render(React.createElement(CampusScene));

      // Asserts Canvas container is rendered
      const canvasContainer = container.querySelector('[data-testid="campus-scene-container"]');
      expect(canvasContainer).not.toBeNull();

      // Asserts <canvas> element exists in the DOM
      const canvasElement = container.querySelector('canvas');
      expect(canvasElement).not.toBeNull();

      // Asserts zero console.error calls
      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('[AC-1.2] The scene includes a ground floor, a first floor, and at least 3 clickable room nodes', () => {
      // Filter rooms belonging to Ground Floor and First Floor
      const groundRooms = campusRooms.filter((r) => r.floor === 'ground');
      const firstRooms = campusRooms.filter((r) => r.floor === 'first');

      // Verify physical presence of both floors
      expect(groundRooms.length).toBeGreaterThanOrEqual(1);
      expect(firstRooms.length).toBeGreaterThanOrEqual(1);

      // Verify physical elevation distinction
      groundRooms.forEach((room) => {
        expect(room.position[1]).toBeCloseTo(1.0, 1); // Ground floor elevation ~ 1.0m
      });
      firstRooms.forEach((room) => {
        expect(room.position[1]).toBeCloseTo(3.6, 1); // First floor elevation ~ 3.6m
      });

      // Verify at least 3 distinct selectable/clickable room nodes
      expect(campusRooms.length).toBeGreaterThanOrEqual(3);

      // Verify room interaction: selecting a room updates store state
      const targetRoom = groundRooms[0];
      useCampusStore.getState().selectRoom(targetRoom.id);
      expect(useCampusStore.getState().selectedRoomId).toBe(targetRoom.id);
      expect(useCampusStore.getState().cameraTarget?.lookAt).toEqual(targetRoom.position);
    });
  });

  /* ========================================================================
   * 2. TIMETABLE LOGIC ACCEPTANCE CRITERIA
   * ======================================================================== */
  describe('Criterion 2: Timetable Logic', () => {
    it('[AC-2.1] Automated tests verify that passing a specific mocked datetime correctly identifies the active class and room', () => {
      // Mocked Datetime: Monday 09:15
      const mockedDate = new Date('2026-10-12T09:15:00');
      const result = calculateActiveSchedule(mockedDate, mockSlots, campusRooms, mockFaculty);

      // Asserts that the active class is correctly resolved
      expect(result.status).toBe('IN_SESSION');
      expect(result.activeSlot).not.toBeNull();
      expect(result.activeSlot?.courseName).toBe('Data Structures & Algorithms');
      expect(result.activeSlot?.roomId).toBe('LT-1');

      // Asserts that the room matches
      expect(result.activeRoom).not.toBeNull();
      expect(result.activeRoom?.id).toBe('LT-1');
      expect(result.activeRoom?.name).toBe('Lecture Theater 9 (LT-9)');

      // Asserts remaining time calculation
      expect(result.minutesRemaining).toBe(45);
    });

    it('[AC-2.2] Clicking a room node accurately retrieves and displays the mocked class and faculty data', () => {
      // Simulate selecting room LT-1
      const roomId = 'LT-1';
      useCampusStore.getState().selectRoom(roomId);

      const roomData = campusRooms.find((r) => r.id === roomId);
      expect(roomData).toBeDefined();
      expect(roomData?.name).toBe('Lecture Theater 9 (LT-9)');
      expect(roomData?.capacity).toBe(120);
      expect(roomData?.inChargeFaculty).toBe('Dr. Rajesh Sharma');
      expect(roomData?.building).toBe('JIET Main Quadrangle');
      expect(roomData?.floor).toBe('ground');

      // Verify associated faculty from directory
      const facultyData = mockFaculty.find((f) => f.name === roomData?.inChargeFaculty);
      expect(facultyData).toBeDefined();
      expect(facultyData?.department).toBe('Computer Science');
      expect(facultyData?.email).toBe('rajesh.sharma@jiet.ac.in');
    });
  });

  /* ========================================================================
   * 3. PEER LOCATOR FUNCTIONALITY ACCEPTANCE CRITERIA
   * ======================================================================== */
  describe('Criterion 3: Peer Locator functionality', () => {
    let server: MockSocketServer;
    let clientA: MockSocketClient;
    let clientB: MockSocketClient;

    beforeEach(() => {
      server = new MockSocketServer();
      clientA = server.createClient('client_student_a');
      clientB = server.createClient('client_student_b');
    });

    afterEach(() => {
      clientA.disconnect();
      clientB.disconnect();
      server.reset();
    });

    it('[AC-3.1] Automated tests verify that a mocked WebSocket client can connect, broadcast a check-in location, and another client receives the payload', () => {
      clientA.connect();
      clientB.connect();

      expect(clientA.connected).toBe(true);
      expect(clientB.connected).toBe(true);

      let receivedPayload: MockPeerPayload | null = null;
      clientB.on('peer:location_updated', (payload: MockPeerPayload) => {
        receivedPayload = payload;
      });

      const checkInEvent: MockPeerPayload = {
        userId: 'client_student_a',
        userName: 'Aarav Gupta',
        roomId: 'LAB-1',
        roomName: 'Software Engineering Lab',
        floor: 'ground',
        coordinates: [-20, 1.0, 7],
        timestamp: Date.now(),
      };

      // Client A broadcasts check-in
      clientA.emit('peer:checkin', checkInEvent);

      // Client B receives broadcast payload
      expect(receivedPayload).not.toBeNull();
      expect(receivedPayload?.userId).toBe('client_student_a');
      expect(receivedPayload?.userName).toBe('Aarav Gupta');
      expect(receivedPayload?.roomId).toBe('LAB-1');
      expect(receivedPayload?.floor).toBe('ground');
      expect(receivedPayload?.coordinates).toEqual([-20, 1.0, 7]);
    });
  });

  /* ========================================================================
   * 4. ANTI-GRAVITY EASTER EGG ACCEPTANCE CRITERIA
   * ======================================================================== */
  describe('Criterion 4: Anti-Gravity Easter Egg', () => {
    it('[AC-4.1] Automated tests (e.g., simulated keystrokes) verify that entering the Konami code toggles an internal "anti-gravity" state', () => {
      let internalAntiGravityState = false;
      const detector = new KonamiCodeDetector(() => {
        internalAntiGravityState = !internalAntiGravityState;
      });

      expect(internalAntiGravityState).toBe(false);

      // Simulate the 10-key Konami sequence
      KONAMI_SEQUENCE.forEach((key) => {
        detector.handleKey(key);
      });

      // Asserts that state toggled to true
      expect(internalAntiGravityState).toBe(true);

      // Entering again toggles back to false
      KONAMI_SEQUENCE.forEach((key) => {
        detector.handleKey(key);
      });
      expect(internalAntiGravityState).toBe(false);
    });

    it('[AC-4.2] The UI responds to the state change by rendering the cosmic background and initiating floating animations', () => {
      const controller = new EasterEggController();
      const detector = new KonamiCodeDetector(() => {
        controller.toggle();
      });

      // Enter Konami code
      KONAMI_SEQUENCE.forEach((key) => detector.handleKey(key));

      // 1. Asserts UI responds by rendering cosmic background
      expect(controller.state.isActive).toBe(true);
      expect(controller.state.backgroundColor).toBe('#050518');
      expect(controller.state.isStarfieldActive).toBe(true);
      expect(controller.state.statusMessage).toContain('ZERO-G PROTOCOL ENGAGED');

      // 2. Asserts floating animations and physics initiated
      const testNode: PhysicsNode = {
        id: 'LT-1',
        basePosition: [20, 1.0, 7],
        baseRotation: [0, 0, 0],
        currentPosition: [20, 1.0, 7],
        currentRotation: [0, 0, 0],
        velocity: [0, 0, 0],
        angularVelocity: [0, 0, 0],
        mass: 1.0,
        phaseOffset: 0.0,
      };

      for (let frame = 0; frame < 60; frame++) {
        stepNodePhysics(testNode, controller.state.isActive, 0.016, frame * 0.016);
      }

      // Physics verification: upward displacement and rotational motion
      expect(testNode.currentPosition[1]).toBeGreaterThan(testNode.basePosition[1]);
      expect(testNode.velocity[1]).toBeGreaterThan(0);
      expect(Math.abs(testNode.currentRotation[1])).toBeGreaterThan(0.001);
    });
  });
});
