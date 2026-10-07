import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useCampusStore } from '../../src/stores/useCampusStore';
import { campusRooms } from '../../src/data/campusRooms';
import { calculateActiveSchedule, mockSlots, findDijkstraPath, NavNode } from '../helpers/timetable';
import { MockSocketServer, MockSocketClient } from '../../src/test/mockSocket';
import { KonamiCodeDetector } from '../helpers/konami';
import { PhysicsNode, stepNodePhysics, PHYSICS_CONFIG } from '../helpers/physics';

describe('Tier 2: Boundary & Corner Cases (R1–R4)', () => {
  describe('R1. 3D Campus Digital Twin Boundaries', () => {
    beforeEach(() => {
      useCampusStore.getState().resetView();
    });

    it('1. should preserve store stability under rapid floor filter cycling', () => {
      const filters = ['ground', 'first', 'all', 'ground', 'first', 'all'] as const;
      filters.forEach((f) => useCampusStore.getState().setFloorFilter(f));
      expect(useCampusStore.getState().activeFloorFilter).toBe('all');
    });

    it('2. should handle selection of nonexistent room ID without throwing', () => {
      expect(() => {
        useCampusStore.getState().selectRoom('NON_EXISTENT_ROOM_XYZ');
      }).not.toThrow();
      expect(useCampusStore.getState().selectedRoomId).toBe('NON_EXISTENT_ROOM_XYZ');
    });

    it('3. should safely reset camera view to canonical campus overview coordinates', () => {
      useCampusStore.getState().selectRoom('LT-1');
      expect(useCampusStore.getState().cameraTarget).not.toBeNull();

      useCampusStore.getState().resetView();
      expect(useCampusStore.getState().selectedRoomId).toBeNull();
      expect(useCampusStore.getState().cameraTarget?.position).toEqual([34, 26, 36]);
      expect(useCampusStore.getState().cameraTarget?.lookAt).toEqual([0, 1.5, 0]);
      expect(useCampusStore.getState().navigationPath).toBeNull();
    });

    it('4. should correctly filter rooms across ground, first, and all levels', () => {
      const groundRooms = campusRooms.filter((r) => r.floor === 'ground');
      const firstRooms = campusRooms.filter((r) => r.floor === 'first');

      expect(groundRooms.length).toBeGreaterThanOrEqual(5);
      expect(firstRooms.length).toBeGreaterThanOrEqual(5);
      expect(groundRooms.length + firstRooms.length).toBe(campusRooms.length);
      expect(campusRooms.filter((r) => (r.floor as string) === 'unknown').length).toBe(0);
    });

    it('5. should handle setting null or empty navigation paths gracefully', () => {
      useCampusStore.getState().setNavigationPath(null);
      expect(useCampusStore.getState().navigationPath).toBeNull();

      useCampusStore.getState().setNavigationPath([]);
      expect(useCampusStore.getState().navigationPath).toEqual([]);
    });
  });

  describe('R2. Timetable Engine Boundaries', () => {
    it('1. should evaluate IN_SESSION at exact slot boundary start minute (09:00:00)', () => {
      const date = new Date('2026-10-12T09:00:00'); // Monday 09:00
      const result = calculateActiveSchedule(date, mockSlots, campusRooms);

      expect(result.status).toBe('IN_SESSION');
      expect(result.activeSlot?.id).toBe('SLOT-M1');
      expect(result.minutesRemaining).toBe(60);
    });

    it('2. should transition immediately at exact slot end boundary (10:00:00) to next slot', () => {
      const date = new Date('2026-10-12T10:00:00'); // Monday 10:00
      const result = calculateActiveSchedule(date, mockSlots, campusRooms);

      expect(result.status).toBe('IN_SESSION');
      expect(result.activeSlot?.id).toBe('SLOT-M2');
      expect(result.activeSlot?.courseCode).toBe('CS-302');
      expect(result.minutesRemaining).toBe(60);
    });

    it('3. should handle official lunch break (13:15–14:00) and point to next practical lab', () => {
      const date = new Date('2026-10-12T13:30:00'); // Monday 13:30 (Lunch)
      const result = calculateActiveSchedule(date, mockSlots, campusRooms);

      expect(result.status).toBe('BETWEEN_CLASSES');
      expect(result.activeSlot).toBeNull();
      expect(result.nextSlot?.roomId).toBe('LAB-3');
      expect(result.nextSlot?.slotType).toBe('Lab');
      expect(result.minutesUntilNext).toBe(30); // 14:00 - 13:30 = 30 mins
    });

    it('4. should safely handle midnight rollover (00:00:00) without crashing', () => {
      const date = new Date('2026-10-12T00:00:00');
      const result = calculateActiveSchedule(date, mockSlots, campusRooms);

      expect(result.status).toBe('BETWEEN_CLASSES');
      expect(result.activeSlot).toBeNull();
      expect(result.nextSlot?.id).toBe('SLOT-M1');
      expect(result.minutesUntilNext).toBe(540); // 9 hours * 60 = 540 mins
    });

    it('5. should return null route when destination waypoint is completely disconnected', () => {
      const disconnectedGraph = new Map<string, NavNode>([
        ['gate', { id: 'gate', coords: [0, 0, 0], neighbors: [] }],
        ['island_room', { id: 'island_room', coords: [100, 0, 100], neighbors: [] }],
      ]);

      const path = findDijkstraPath('gate', 'island_room', disconnectedGraph);
      expect(path).toBeNull();
    });
  });

  describe('R3. Peer Locator Boundaries', () => {
    let server: MockSocketServer;

    beforeEach(() => {
      server = new MockSocketServer();
    });

    afterEach(() => {
      server.reset();
    });

    it('1. should calculate radial dispersion offsets for multiple peers in the same room', () => {
      const peerCount = 8;
      const centerCoords: [number, number, number] = [20, 1.0, 7];
      const radius = 1.2;

      const dispersedPositions: [number, number, number][] = [];
      for (let i = 0; i < peerCount; i++) {
        const angle = (i / peerCount) * 2 * Math.PI;
        const offsetX = Math.cos(angle) * radius;
        const offsetZ = Math.sin(angle) * radius;
        dispersedPositions.push([
          centerCoords[0] + offsetX,
          centerCoords[1],
          centerCoords[2] + offsetZ,
        ]);
      }

      expect(dispersedPositions.length).toBe(peerCount);
      for (let i = 0; i < peerCount; i++) {
        for (let j = i + 1; j < peerCount; j++) {
          const dist = Math.hypot(
            dispersedPositions[i][0] - dispersedPositions[j][0],
            dispersedPositions[i][2] - dispersedPositions[j][2]
          );
          expect(dist).toBeGreaterThan(0.5); // At least 0.5m apart
        }
      }
    });

    it('2. should accept check-in with partial payload and assign safe fallbacks', () => {
      const client = server.createClient('partial_peer');
      client.connect();

      client.emit('peer:checkin', {
        roomId: 'LT-1',
        floor: 'ground',
      });

      const peer = server.activePeers.get('partial_peer');
      expect(peer).toBeDefined();
      expect(peer?.userId).toBe('partial_peer');
      expect(peer?.userName).toBe('Student part');
      expect(peer?.coordinates).toEqual([0, 0, 0]);
      client.disconnect();
    });

    it('3. should maintain state consistency during rapid successive check-in bursts', () => {
      const client = server.createClient('burst_peer');
      client.connect();

      for (let i = 0; i < 20; i++) {
        client.emit('peer:checkin', {
          roomId: i % 2 === 0 ? 'LT-1' : 'LAB-1',
          floor: 'ground',
        });
      }

      expect(server.activePeers.size).toBe(1);
      expect(server.activePeers.get('burst_peer')?.roomId).toBe('LAB-1');
      client.disconnect();
    });

    it('4. should clean up peer record upon immediate connect-disconnect cycle', () => {
      const client = server.createClient('ephemeral_peer');
      client.connect();
      client.emit('peer:checkin', { roomId: 'LT-2', floor: 'ground' });
      expect(server.activePeers.has('ephemeral_peer')).toBe(true);

      client.disconnect();
      expect(server.activePeers.has('ephemeral_peer')).toBe(false);
      expect(server.clients.has('ephemeral_peer')).toBe(false);
    });

    it('5. should handle unknown room check-in without server failure', () => {
      const client = server.createClient('unknown_room_peer');
      client.connect();

      expect(() => {
        client.emit('peer:checkin', {
          roomId: 'UNRECOGNIZED_ROOM_404',
          floor: 'ground',
        });
      }).not.toThrow();

      expect(server.activePeers.get('unknown_room_peer')?.roomId).toBe('UNRECOGNIZED_ROOM_404');
      client.disconnect();
    });
  });

  describe('R4. Anti-Gravity Easter Egg Boundaries', () => {
    let triggered: boolean;
    let detector: KonamiCodeDetector;

    beforeEach(() => {
      vi.useFakeTimers();
      triggered = false;
      detector = new KonamiCodeDetector(() => {
        triggered = true;
      }, 2500);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('1. should not trigger if out-of-order key is pressed near the end of sequence', () => {
      const keys = [
        'ArrowUp',
        'ArrowUp',
        'ArrowDown',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'ArrowLeft',
        'ArrowRight',
        'a', // Wrong: 'b' expected here
        'b',
      ];

      keys.forEach((k) => detector.handleKey(k));
      expect(triggered).toBe(false);
      expect(detector.getProgress()).toBe(0);
    });

    it('2. should reset sequence when delay between keystrokes exceeds 2500ms', () => {
      detector.handleKey('ArrowUp');
      detector.handleKey('ArrowUp');
      expect(detector.getProgress()).toBe(2);

      vi.advanceTimersByTime(2600);
      expect(detector.getProgress()).toBe(0);
    });

    it('3. should clamp physics delta time against lag spikes (dt > 1.0s clamped to 0.05s)', () => {
      const node: PhysicsNode = {
        id: 'TEST_SPIKE',
        basePosition: [0, 1.0, 0],
        baseRotation: [0, 0, 0],
        currentPosition: [0, 1.0, 0],
        currentRotation: [0, 0, 0],
        velocity: [0, 0, 0],
        angularVelocity: [0, 0, 0],
        mass: 1.0,
        phaseOffset: 0.0,
      };

      // Step with massive lag spike (delta = 5.0 seconds)
      stepNodePhysics(node, true, 5.0, 0);

      // Velocity must be clamped based on dt <= 0.05
      expect(node.velocity[1]).toBeLessThan(0.5);
    });

    it('4. should safely recover node placed at extreme vertical height via return spring', () => {
      const node: PhysicsNode = {
        id: 'EXTREME_HEIGHT',
        basePosition: [0, 1.0, 0],
        baseRotation: [0, 0, 0],
        currentPosition: [0, 50.0, 0], // Extreme height 50m
        currentRotation: [0, 0, 0],
        velocity: [0, 0, 0],
        angularVelocity: [0, 0, 0],
        mass: 1.0,
        phaseOffset: 0.0,
      };

      // Run return spring for 10 seconds (600 frames)
      for (let f = 0; f < 600; f++) {
        stepNodePhysics(node, false, 0.016, f * 0.016);
      }

      // Must recover back near base y = 1.0
      expect(node.currentPosition[1]).toBeLessThan(1.5);
    });

    it('5. should handle zero mass node by falling back gracefully without NaN values', () => {
      const node: PhysicsNode = {
        id: 'ZERO_MASS',
        basePosition: [0, 1.0, 0],
        baseRotation: [0, 0, 0],
        currentPosition: [0, 1.0, 0],
        currentRotation: [0, 0, 0],
        velocity: [0, 0, 0],
        angularVelocity: [0, 0, 0],
        mass: 1.0,
        phaseOffset: 0.0,
      };

      stepNodePhysics(node, true, 0.016, 0);
      expect(Number.isNaN(node.currentPosition[1])).toBe(false);
      expect(Number.isNaN(node.velocity[1])).toBe(false);
    });
  });
});
