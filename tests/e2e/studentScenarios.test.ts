import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useCampusStore } from '../../src/stores/useCampusStore';
import { campusRooms } from '../../src/data/campusRooms';
import { calculateActiveSchedule, mockSlots, findDijkstraPath, NavNode } from '../helpers/timetable';
import { MockSocketServer, MockSocketClient, MockPeerPayload } from '../../src/test/mockSocket';
import { KonamiCodeDetector } from '../helpers/konami';
import { PhysicsNode, stepNodePhysics } from '../helpers/physics';

describe('Tier 4: Real-World Student Application Workflows (R1–R4)', () => {
  let server: MockSocketServer;
  let studentClient: MockSocketClient;
  let friendClient: MockSocketClient;

  beforeEach(() => {
    server = new MockSocketServer();
    studentClient = server.createClient('student_rahul');
    friendClient = server.createClient('student_priya');
    studentClient.connect();
    friendClient.connect();
    useCampusStore.getState().resetView();
  });

  afterEach(() => {
    studentClient.disconnect();
    friendClient.disconnect();
    server.reset();
  });

  it('Scenario 1: "The Late Arrival" — Monday 09:15 arrival, route to LT-1, inspect details & check-in', () => {
    // 1. Student arrives on campus at 09:15 on Monday
    const arrivalTime = new Date('2026-10-12T09:15:00');
    const schedule = calculateActiveSchedule(arrivalTime, mockSlots, campusRooms);

    expect(schedule.status).toBe('IN_SESSION');
    expect(schedule.activeSlot?.courseName).toBe('Data Structures & Algorithms');
    expect(schedule.activeSlot?.roomId).toBe('LT-1');
    expect(schedule.minutesRemaining).toBe(45);

    // 2. Selects active room and computes 3D route from Main Gate
    const targetRoom = campusRooms.find((r) => r.id === schedule.activeSlot?.roomId)!;
    useCampusStore.getState().selectRoom(targetRoom.id);

    const walkingRoute: [number, number, number][] = [
      [0, 0.1, 36], // Campus Gate
      [0, 0.1, 20], // South Plaza
      [10, 0.1, 10], // East Quad Arterial
      targetRoom.position, // LT-1
    ];
    useCampusStore.getState().setNavigationPath(walkingRoute);

    // 3. Verifies room specifications from details
    expect(useCampusStore.getState().selectedRoomId).toBe('LT-1');
    expect(useCampusStore.getState().cameraTarget?.lookAt).toEqual(targetRoom.position);
    expect(targetRoom.capacity).toBe(120);
    expect(targetRoom.inChargeFaculty).toBe('Dr. Rajesh Sharma');

    // 4. Student checks in upon entering room
    let friendReceivedNotification: MockPeerPayload | null = null;
    friendClient.on('peer:location_updated', (payload) => {
      friendReceivedNotification = payload;
    });

    studentClient.emit('peer:checkin', {
      userId: 'student_rahul',
      userName: 'Rahul Verma',
      roomId: targetRoom.id,
      roomName: targetRoom.name,
      floor: targetRoom.floor,
      coordinates: targetRoom.position,
    });

    expect(friendReceivedNotification?.userId).toBe('student_rahul');
    expect(friendReceivedNotification?.roomId).toBe('LT-1');
    expect(friendReceivedNotification?.floor).toBe('ground');
  });

  it('Scenario 2: "The Cross-Floor Lab Dash" — Lunch break to 14:00 AI Lab on First Floor via Staircase', () => {
    // 1. Time is 13:30 (Lunch break)
    const lunchTime = new Date('2026-10-12T13:30:00');
    const lunchSchedule = calculateActiveSchedule(lunchTime, mockSlots, campusRooms);

    expect(lunchSchedule.status).toBe('BETWEEN_CLASSES');
    expect(lunchSchedule.nextSlot?.roomId).toBe('LAB-3');
    expect(lunchSchedule.minutesUntilNext).toBe(30);

    // 2. Time advances to 14:00 (AI Lab in session)
    const labTime = new Date('2026-10-12T14:00:00');
    const labSchedule = calculateActiveSchedule(labTime, mockSlots, campusRooms);

    expect(labSchedule.status).toBe('IN_SESSION');
    expect(labSchedule.activeSlot?.roomId).toBe('LAB-3');
    expect(labSchedule.activeRoom?.floor).toBe('first');

    // 3. Pathfinding creates staircase route transitioning from y=0.1 to y=3.6
    const graph = new Map<string, NavNode>([
      ['ground_plaza', { id: 'ground_plaza', coords: [0, 0.1, 10], neighbors: [{ id: 'stair_west_base', weight: 15 }] }],
      ['stair_west_base', { id: 'stair_west_base', coords: [-14, 0.1, 0], neighbors: [{ id: 'ground_plaza', weight: 15 }, { id: 'stair_west_top', weight: 3.5 }] }],
      ['stair_west_top', { id: 'stair_west_top', coords: [-14, 3.6, 0], neighbors: [{ id: 'stair_west_base', weight: 3.5 }, { id: 'lab3_door', weight: 9 }] }],
      ['lab3_door', { id: 'lab3_door', coords: [-20, 3.6, 7], neighbors: [{ id: 'stair_west_top', weight: 9 }] }],
    ]);

    const route = findDijkstraPath('ground_plaza', 'lab3_door', graph)!;
    expect(route).not.toBeNull();
    expect(route.length).toBe(4);
    expect(route[0][1]).toBe(0.1); // Starts on ground
    expect(route[2][1]).toBe(3.6); // Climbs to first floor
    expect(route[3][1]).toBe(3.6); // Reaches Lab-3 on first floor

    // 4. Sets floor filter to 'first' to inspect elevated floor
    useCampusStore.getState().setFloorFilter('first');
    expect(useCampusStore.getState().activeFloorFilter).toBe('first');
  });

  it('Scenario 3: "Study Group Peer Discovery" — Locating friend in Library and joining check-in', () => {
    // 1. Priya checks in to Central Knowledge Library
    const libRoom = campusRooms.find((r) => r.id === 'LIB-MAIN')!;
    friendClient.emit('peer:checkin', {
      userId: 'student_priya',
      userName: 'Priya Sharma',
      roomId: libRoom.id,
      roomName: libRoom.name,
      floor: libRoom.floor,
      coordinates: libRoom.position,
    });

    // 2. Rahul views active peers on campus
    const activePeers = Array.from(server.activePeers.values());
    const priyaPresence = activePeers.find((p) => p.userId === 'student_priya');
    expect(priyaPresence).toBeDefined();
    expect(priyaPresence?.roomId).toBe('LIB-MAIN');

    // 3. Rahul taps friend card -> camera targets Library
    useCampusStore.getState().selectRoom('LIB-MAIN');
    expect(useCampusStore.getState().selectedRoomId).toBe('LIB-MAIN');
    expect(useCampusStore.getState().cameraTarget?.lookAt).toEqual(libRoom.position);

    // 4. Rahul checks in to Library with Priya
    let priyaReceivedJoin: MockPeerPayload | null = null;
    friendClient.on('peer:location_updated', (p) => {
      priyaReceivedJoin = p;
    });

    studentClient.emit('peer:checkin', {
      userId: 'student_rahul',
      userName: 'Rahul Verma',
      roomId: 'LIB-MAIN',
      floor: 'ground',
      coordinates: libRoom.position,
    });

    expect(priyaReceivedJoin?.userId).toBe('student_rahul');
    expect(priyaReceivedJoin?.roomId).toBe('LIB-MAIN');
  });

  it('Scenario 4: "Exam Celebration Zero-G" — Post-class Konami trigger, floating physics, return spring reset', () => {
    // 1. Friday 17:05 (Classes completed)
    const fridayEvening = new Date('2026-10-16T17:05:00');
    const schedule = calculateActiveSchedule(fridayEvening, mockSlots, campusRooms);
    expect(schedule.status).toBe('DAY_FINISHED');

    // 2. Student enters Konami code sequence
    let isZeroGActive = false;
    const detector = new KonamiCodeDetector(() => {
      isZeroGActive = !isZeroGActive;
    });

    const konamiKeys = [
      'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
      'b', 'a'
    ];
    konamiKeys.forEach((k) => detector.handleKey(k));
    expect(isZeroGActive).toBe(true);

    // 3. Physics nodes float and rotate
    const node: PhysicsNode = {
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

    // Float node for 150 frames to rise above 3.0m
    for (let f = 0; f < 150; f++) {
      stepNodePhysics(node, isZeroGActive, 0.016, f * 0.016);
    }
    expect(node.currentPosition[1]).toBeGreaterThan(3.0);
    expect(Math.abs(node.currentRotation[1])).toBeGreaterThan(0.001);

    // 4. Student toggles Easter egg off
    konamiKeys.forEach((k) => detector.handleKey(k));
    expect(isZeroGActive).toBe(false);

    // 5. Harmonic return springs safely restore node to ground resting position
    for (let f = 0; f < 300; f++) {
      stepNodePhysics(node, isZeroGActive, 0.016, f * 0.016);
    }
    expect(node.currentPosition).toEqual(node.basePosition);
    expect(node.velocity).toEqual([0, 0, 0]);
  });

  it('Scenario 5: "Full-Day Schedule Ticker" — Step through daily timeline from morning to evening', () => {
    const timeline = [
      { time: '2026-10-12T08:30:00', expectedStatus: 'BETWEEN_CLASSES', expectedRoom: 'LT-1' },
      { time: '2026-10-12T09:15:00', expectedStatus: 'IN_SESSION', expectedRoom: 'LT-1' },
      { time: '2026-10-12T10:30:00', expectedStatus: 'IN_SESSION', expectedRoom: 'LT-1' },
      { time: '2026-10-12T11:05:00', expectedStatus: 'BETWEEN_CLASSES', expectedRoom: 'LT-3' },
      { time: '2026-10-12T11:30:00', expectedStatus: 'IN_SESSION', expectedRoom: 'LT-3' },
      { time: '2026-10-12T13:30:00', expectedStatus: 'BETWEEN_CLASSES', expectedRoom: 'LAB-3' },
      { time: '2026-10-12T14:30:00', expectedStatus: 'IN_SESSION', expectedRoom: 'LAB-3' },
      { time: '2026-10-12T17:30:00', expectedStatus: 'DAY_FINISHED', expectedRoom: null },
    ];

    for (const step of timeline) {
      const result = calculateActiveSchedule(new Date(step.time), mockSlots, campusRooms);
      expect(result.status).toBe(step.expectedStatus);
      if (result.status === 'IN_SESSION') {
        expect(result.activeSlot?.roomId).toBe(step.expectedRoom);
      } else if (result.status === 'BETWEEN_CLASSES') {
        expect(result.nextSlot?.roomId).toBe(step.expectedRoom);
      }
    }
  });
});
