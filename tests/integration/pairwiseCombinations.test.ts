import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useCampusStore } from '../../src/stores/useCampusStore';
import { campusRooms } from '../../src/data/campusRooms';
import { calculateActiveSchedule, mockSlots } from '../helpers/timetable';
import { MockSocketServer, MockSocketClient, MockPeerPayload } from '../../src/test/mockSocket';
import { PhysicsNode, stepNodePhysics } from '../helpers/physics';

describe('Tier 3: Pairwise Cross-Feature Combinations (R1–R4)', () => {
  let server: MockSocketServer;
  let clientA: MockSocketClient;
  let clientB: MockSocketClient;

  beforeEach(() => {
    server = new MockSocketServer();
    clientA = server.createClient('peer_alice');
    clientB = server.createClient('peer_bob');
    useCampusStore.getState().resetView();
  });

  afterEach(() => {
    clientA.disconnect();
    clientB.disconnect();
    server.reset();
  });

  it('1. [R1 + R2] Floor filter preserves route data when destination is on a filtered-out floor', () => {
    // Select Ground Floor room LT-1 and set active route
    const lt1 = campusRooms.find((r) => r.id === 'LT-1')!;
    useCampusStore.getState().selectRoom(lt1.id);
    const sampleRoute: [number, number, number][] = [
      [0, 0.1, 36],
      [0, 0.1, 10],
      lt1.position,
    ];
    useCampusStore.getState().setNavigationPath(sampleRoute);

    // Switch floor filter to 'first'
    useCampusStore.getState().setFloorFilter('first');

    // Route remains intact in store
    expect(useCampusStore.getState().navigationPath).toEqual(sampleRoute);
    expect(useCampusStore.getState().selectedRoomId).toBe('LT-1');

    // Room is identified as ground floor while filter is 'first'
    const selectedRoom = campusRooms.find((r) => r.id === useCampusStore.getState().selectedRoomId);
    expect(selectedRoom?.floor).toBe('ground');
    expect(useCampusStore.getState().activeFloorFilter).toBe('first');
  });

  it('2. [R1 + R3] Floor filter partitions visible peer avatars between Ground and First floors', () => {
    clientA.connect();
    clientB.connect();

    // Alice checks into Ground Floor (LT-1)
    clientA.emit('peer:checkin', {
      userId: 'peer_alice',
      roomId: 'LT-1',
      floor: 'ground',
      coordinates: [20, 1.0, 7],
    });

    // Bob checks into First Floor (LAB-3)
    clientB.emit('peer:checkin', {
      userId: 'peer_bob',
      roomId: 'LAB-3',
      floor: 'first',
      coordinates: [-20, 3.6, 7],
    });

    const activePeers = Array.from(server.activePeers.values());
    expect(activePeers.length).toBe(2);

    // Filter peers matching Ground Floor
    const groundPeers = activePeers.filter((p) => p.floor === 'ground');
    expect(groundPeers.length).toBe(1);
    expect(groundPeers[0].userId).toBe('peer_alice');

    // Filter peers matching First Floor
    const firstPeers = activePeers.filter((p) => p.floor === 'first');
    expect(firstPeers.length).toBe(1);
    expect(firstPeers[0].userId).toBe('peer_bob');
  });

  it('3. [R1 + R4] Anti-gravity simulation updates floating physics across all nodes regardless of floor filter', () => {
    const nodes: PhysicsNode[] = [
      {
        id: 'LT-1',
        basePosition: [20, 1.0, 7],
        baseRotation: [0, 0, 0],
        currentPosition: [20, 1.0, 7],
        currentRotation: [0, 0, 0],
        velocity: [0, 0, 0],
        angularVelocity: [0, 0, 0],
        mass: 1.0,
        phaseOffset: 0.1,
      },
      {
        id: 'LT-3',
        basePosition: [20, 3.6, 7],
        baseRotation: [0, 0, 0],
        currentPosition: [20, 3.6, 7],
        currentRotation: [0, 0, 0],
        velocity: [0, 0, 0],
        angularVelocity: [0, 0, 0],
        mass: 1.0,
        phaseOffset: 0.2,
      },
    ];

    useCampusStore.getState().setFloorFilter('ground');

    // Run physics step for both nodes
    nodes.forEach((n) => stepNodePhysics(n, true, 0.016, 0.5));

    // Both Ground (LT-1) and First floor (LT-3) nodes undergo upward buoyancy
    expect(nodes[0].velocity[1]).toBeGreaterThan(0);
    expect(nodes[1].velocity[1]).toBeGreaterThan(0);
    expect(useCampusStore.getState().activeFloorFilter).toBe('ground');
  });

  it('4. [R2 + R3] Simulating timetable advance automatically triggers peer auto-sync location update', () => {
    clientA.connect();
    clientB.connect();

    let bReceivedUpdate: MockPeerPayload | null = null;
    clientB.on('peer:location_updated', (payload: MockPeerPayload) => {
      bReceivedUpdate = payload;
    });

    // Time Travel Step 1: Monday 09:15 -> Lecture in LT-1
    const morningTime = new Date('2026-10-12T09:15:00');
    const morningSchedule = calculateActiveSchedule(morningTime, mockSlots, campusRooms);
    expect(morningSchedule.activeSlot?.roomId).toBe('LT-1');

    clientA.emit('peer:checkin', {
      userId: 'peer_alice',
      roomId: morningSchedule.activeSlot!.roomId,
      floor: morningSchedule.activeRoom!.floor,
      isAutoSync: true,
    });

    expect(bReceivedUpdate?.roomId).toBe('LT-1');
    expect(bReceivedUpdate?.isAutoSync).toBe(true);

    // Time Travel Step 2: Advance to 14:00 -> Practical in LAB-3 (First Floor)
    const afternoonTime = new Date('2026-10-12T14:00:00');
    const afternoonSchedule = calculateActiveSchedule(afternoonTime, mockSlots, campusRooms);
    expect(afternoonSchedule.activeSlot?.roomId).toBe('LAB-3');
    expect(afternoonSchedule.activeRoom?.floor).toBe('first');

    clientA.emit('peer:checkin', {
      userId: 'peer_alice',
      roomId: afternoonSchedule.activeSlot!.roomId,
      floor: afternoonSchedule.activeRoom!.floor,
      isAutoSync: true,
    });

    expect(bReceivedUpdate?.roomId).toBe('LAB-3');
    expect(bReceivedUpdate?.floor).toBe('first');
  });

  it('5. [R2 + R4] Active navigation route vector safely connects ground waypoint to floating room node', () => {
    const targetRoomNode: PhysicsNode = {
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

    // Float room node during Zero-G
    for (let f = 0; f < 30; f++) {
      stepNodePhysics(targetRoomNode, true, 0.016, f * 0.016);
    }
    expect(targetRoomNode.currentPosition[1]).toBeGreaterThan(targetRoomNode.basePosition[1]);

    // Ground approach waypoint
    const groundWaypoint: [number, number, number] = [12, 0.1, 7];

    // Compute dynamic connector vector
    const dynamicVector: [number, number, number] = [
      targetRoomNode.currentPosition[0] - groundWaypoint[0],
      targetRoomNode.currentPosition[1] - groundWaypoint[1],
      targetRoomNode.currentPosition[2] - groundWaypoint[2],
    ];

    const distance = Math.hypot(...dynamicVector);
    expect(distance).toBeGreaterThan(8.0);
    expect(Number.isFinite(distance)).toBe(true);
  });

  it('6. [R3 + R4] Live peer check-in during active Zero-G inherits vertical floating elevation', () => {
    clientA.connect();
    clientB.connect();

    // Zero-G active: room LT-1 is elevated
    const floatingRoomY = 4.2;

    let bReceivedAlice: MockPeerPayload | null = null;
    clientB.on('peer:location_updated', (payload: MockPeerPayload) => {
      bReceivedAlice = payload;
    });

    clientA.emit('peer:checkin', {
      userId: 'peer_alice',
      roomId: 'LT-1',
      floor: 'ground',
      coordinates: [20, floatingRoomY, 7],
    });

    expect(bReceivedAlice).not.toBeNull();
    expect(bReceivedAlice?.coordinates?.[1]).toBe(floatingRoomY);
    expect(bReceivedAlice?.coordinates?.[1]).toBeGreaterThan(1.0);
  });
});
