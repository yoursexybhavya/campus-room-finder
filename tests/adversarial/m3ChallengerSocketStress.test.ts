import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockSocketServer, MockSocketClient, MockPeerPayload } from '../../src/test/mockSocket';
import { SocketClientService } from '../../src/services/socket/socketClient';
import {
  usePeerStore,
  initTimetableAutoSync,
  stopTimetableAutoSync,
  DEFAULT_CURRENT_USER,
} from '../../src/stores/usePeerStore';
import { useTimetableStore, TIME_PRESETS } from '../../src/stores/useTimetableStore';
import { campusRooms } from '../../src/data/campusRooms';
import {
  calculateRadialDispersion,
  normalizePeerPayload,
  getDeterministicColor,
  PeerUser,
} from '../../src/types/peer';

describe('Milestone 3 Challenger Adversarial Stress Suite (Socket & Peer Locator)', () => {
  let server: MockSocketServer;

  beforeEach(() => {
    server = new MockSocketServer();
    usePeerStore.getState().clearPeers();
    usePeerStore.getState().setCurrentUser({ ...DEFAULT_CURRENT_USER });
    usePeerStore.getState().setAutoSync(true);
    initTimetableAutoSync();
  });

  afterEach(() => {
    stopTimetableAutoSync();
    server.reset();
    usePeerStore.getState().clearPeers();
  });

  // =========================================================================
  // SUITE 1: High Concurrency Peer Check-In (50+ Simulated Clients)
  // =========================================================================
  describe('1. High Concurrency Peer Check-In (50+ Simulated Clients)', () => {
    it('1.1 should broadcast and track check-ins concurrently across 60 simulated clients', () => {
      const CLIENT_COUNT = 60;
      const clients: MockSocketClient[] = [];
      const rooms = ['LT-1', 'LT-2', 'LT-3', 'LAB-1', 'LAB-2', 'LAB-3', 'LIB-1', 'ADMIN-1'];

      // Connect 60 clients
      for (let i = 0; i < CLIENT_COUNT; i++) {
        const client = server.createClient(`student_${i}`);
        client.connect();
        clients.push(client);
      }

      expect(server.clients.size).toBe(CLIENT_COUNT);

      // Concurrent check-in broadcast from all 60 clients
      clients.forEach((client, idx) => {
        const assignedRoomId = rooms[idx % rooms.length];
        const room = campusRooms.find((r) => r.id === assignedRoomId);
        client.emit('peer:checkin', {
          userId: client.id,
          userName: `Student ${idx}`,
          roomId: assignedRoomId,
          roomName: room?.name || assignedRoomId,
          floor: room?.floor || 'ground',
          coordinates: room?.position || [0, 0, 0],
          isAutoSync: idx % 2 === 0,
          timestamp: Date.now() + idx,
        });
      });

      // Verify all 60 active peers registered on server
      expect(server.activePeers.size).toBe(CLIENT_COUNT);

      // Verify each peer has valid metadata preserved
      clients.forEach((client, idx) => {
        const peer = server.activePeers.get(client.id);
        expect(peer).toBeDefined();
        expect(peer?.userId).toBe(`student_${idx}`);
        expect(peer?.roomId).toBe(rooms[idx % rooms.length]);
        expect(peer?.floor).toBeDefined();
        expect(peer?.coordinates).toBeDefined();
      });

      // Cleanup
      clients.forEach((c) => c.disconnect());
      expect(server.clients.size).toBe(0);
      expect(server.activePeers.size).toBe(0);
    });

    it('1.2 should deliver complete state of 60 active peers to a late-joining 61st client', () => {
      const CLIENT_COUNT = 60;
      const clients: MockSocketClient[] = [];

      for (let i = 0; i < CLIENT_COUNT; i++) {
        const client = server.createClient(`batch_peer_${i}`);
        client.connect();
        client.emit('peer:checkin', {
          userId: client.id,
          userName: `Batch Student ${i}`,
          roomId: i % 2 === 0 ? 'LT-1' : 'LAB-PHY',
          floor: 'ground',
          coordinates: [10, 1.0, 10],
        });
        clients.push(client);
      }

      expect(server.activePeers.size).toBe(CLIENT_COUNT);

      // 61st client connects after all 60 have checked in
      const lateClient = server.createClient('student_latecomer');
      let initialStateReceived: MockPeerPayload[] = [];
      lateClient.on('peer:initial_state', (peers: MockPeerPayload[]) => {
        initialStateReceived = peers;
      });

      lateClient.connect();

      expect(initialStateReceived.length).toBe(CLIENT_COUNT);
      const userIds = new Set(initialStateReceived.map((p) => p.userId));
      expect(userIds.size).toBe(CLIENT_COUNT);

      // Cleanup
      clients.forEach((c) => c.disconnect());
      lateClient.disconnect();
    });

    it('1.3 should populate and aggregate 60 peers into usePeerStore without data corruption', () => {
      const peerList: MockPeerPayload[] = Array.from({ length: 60 }, (_, i) => ({
        userId: `peer_store_${i}`,
        userName: `Student Store ${i}`,
        roomId: i < 30 ? 'LT-1' : 'LAB-3',
        roomName: i < 30 ? 'Lecture Theater 9 (LT-9)' : 'Artificial Intelligence Lab',
        floor: i < 30 ? 'ground' : 'first',
        coordinates: i < 30 ? [20, 1.0, 7] : [20, 3.6, 22],
        isAutoSync: true,
        timestamp: Date.now(),
      }));

      usePeerStore.getState().setPeers(peerList);

      const storePeers = usePeerStore.getState().getPeersList();
      expect(storePeers.length).toBe(60);

      // Verify room filtering
      const lt1Peers = usePeerStore.getState().getPeersInRoom('LT-1');
      expect(lt1Peers.length).toBe(30);

      const lab3Peers = usePeerStore.getState().getPeersInRoom('LAB-3');
      expect(lab3Peers.length).toBe(30);

      // Verify floor filtering
      const groundPeers = usePeerStore.getState().getPeersOnFloor('ground');
      expect(groundPeers.length).toBe(30);

      const firstFloorPeers = usePeerStore.getState().getPeersOnFloor('first');
      expect(firstFloorPeers.length).toBe(30);

      // Ensure current user is never accidentally added to peers map
      expect(usePeerStore.getState().peers.has(DEFAULT_CURRENT_USER.id)).toBe(false);
    });

    it('1.4 should survive 100 rapid successive check-in bursts from a single client without duplicating state', () => {
      const client = server.createClient('spam_client');
      client.connect();

      const rooms = ['LT-1', 'LT-2', 'LAB-1', 'LAB-2', 'LIB-1'];
      for (let i = 0; i < 100; i++) {
        const targetRoom = rooms[i % rooms.length];
        client.emit('peer:checkin', {
          userId: 'spam_client',
          roomId: targetRoom,
          floor: 'ground',
        });
      }

      // activePeers map must still contain strictly 1 record for this user
      expect(server.activePeers.size).toBe(1);
      const finalState = server.activePeers.get('spam_client');
      expect(finalState).toBeDefined();
      expect(finalState?.roomId).toBe(rooms[99 % rooms.length]);

      client.disconnect();
      expect(server.activePeers.size).toBe(0);
    });
  });

  // =========================================================================
  // SUITE 2: Radial Dispersion Geometry Assertions & Stress
  // =========================================================================
  describe('2. Radial Dispersion Geometry Assertions & Separation Stress', () => {
    it('2.1 should verify pairwise Euclidean distances between all peers in a moderately crowded room (12 peers) are strictly > 0.5m', () => {
      const centerCoords: [number, number, number] = [20, 1.0, 7];
      const N = 12;
      const positions: [number, number, number][] = [];

      for (let i = 0; i < N; i++) {
        positions.push(calculateRadialDispersion(centerCoords, i, N));
      }

      expect(positions.length).toBe(N);

      // Verify all pairwise Euclidean distances in XZ plane
      let minPairwiseDistance = Infinity;
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dist = Math.hypot(
            positions[i][0] - positions[j][0],
            positions[i][2] - positions[j][2]
          );
          if (dist < minPairwiseDistance) {
            minPairwiseDistance = dist;
          }
          expect(dist).toBeGreaterThan(0.5); // Strictly > 0.5m separation
        }
      }

      // Theoretical minimum for N=12 with R=1.5 is 2 * 1.5 * sin(pi / 12) ≈ 0.776m
      expect(minPairwiseDistance).toBeCloseTo(0.776, 2);
    });

    it('2.2 should verify pairwise distances for maximum standard occupancy (16 peers) remain strictly > 0.5m', () => {
      const centerCoords: [number, number, number] = [20, 1.0, 7];
      const N = 16;
      const positions: [number, number, number][] = [];

      for (let i = 0; i < N; i++) {
        positions.push(calculateRadialDispersion(centerCoords, i, N));
      }

      let minDistance = Infinity;
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dist = Math.hypot(
            positions[i][0] - positions[j][0],
            positions[i][2] - positions[j][2]
          );
          if (dist < minDistance) {
            minDistance = dist;
          }
          expect(dist).toBeGreaterThan(0.5);
        }
      }

      // Theoretical minimum for N=16 with R=1.5 is 2 * 1.5 * sin(pi / 16) ≈ 0.585m
      expect(minDistance).toBeGreaterThan(0.5);
      expect(minDistance).toBeCloseTo(0.585, 2);
    });

    it('2.3 should verify that 50 peers in a crowded lecture hall maintain > 0.5m separation when adaptive radius (R=4.0m) is used', () => {
      const centerCoords: [number, number, number] = [20, 1.0, 7];
      const N = 50;
      // Formula for minimum radius ensuring >0.5m: R >= 0.5 / (2 * sin(pi / N)) ≈ 3.98m
      const adaptiveRadius = 4.0;
      const positions: [number, number, number][] = [];

      for (let i = 0; i < N; i++) {
        positions.push(calculateRadialDispersion(centerCoords, i, N, adaptiveRadius));
      }

      let minDistance = Infinity;
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dist = Math.hypot(
            positions[i][0] - positions[j][0],
            positions[i][2] - positions[j][2]
          );
          if (dist < minDistance) {
            minDistance = dist;
          }
          expect(dist).toBeGreaterThan(0.5);
        }
      }

      // For R=4.0 and N=50, adjacent chord distance is 2 * 4.0 * sin(pi / 50) ≈ 0.502m > 0.5m
      expect(minDistance).toBeGreaterThan(0.5);
      expect(minDistance).toBeCloseTo(0.502, 2);
    });

    it('2.4 should empirically document the static radius compression boundary (N=50 on fixed R=1.5m drops to 0.188m)', () => {
      const centerCoords: [number, number, number] = [20, 1.0, 7];
      const N = 50;
      const defaultPositions: [number, number, number][] = [];

      for (let i = 0; i < N; i++) {
        defaultPositions.push(calculateRadialDispersion(centerCoords, i, N, 1.5));
      }

      let minStaticDist = Infinity;
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dist = Math.hypot(
            defaultPositions[i][0] - defaultPositions[j][0],
            defaultPositions[i][2] - defaultPositions[j][2]
          );
          if (dist < minStaticDist) {
            minStaticDist = dist;
          }
        }
      }

      // Empirical observation: On fixed R=1.5m, 50 peers have adjacent spacing of only 0.188m.
      // This is less than avatar capsule width (0.44m), proving that crowded rooms >18 peers
      // require adaptive radius expansion or concentric rings.
      expect(minStaticDist).toBeLessThan(0.5);
      expect(minStaticDist).toBeCloseTo(0.188, 2);
    });

    it('2.5 should handle edge case of single peer (N=1) centering at room coordinates without NaN or offset', () => {
      const centerCoords: [number, number, number] = [20, 1.0, 7];
      const pos = calculateRadialDispersion(centerCoords, 0, 1);
      expect(pos).toEqual(centerCoords);
    });
  });

  // =========================================================================
  // SUITE 3: Rapid Timetable Time-Travel Cycling & Auto-Sync
  // =========================================================================
  describe('3. Rapid Timetable Time-Travel Cycling & Auto-Sync', () => {
    it('3.1 should auto-sync peer check-in and checkout across 50 rapid simulated time transitions', () => {
      const customClient = server.createClient('synced_user');
      customClient.connect();
      usePeerStore.getState().setSocketClient(customClient);

      // 7 distinct schedule phases on Monday:
      // 09:15 -> BETWEEN_CLASSES (idle)
      // 09:30 -> IN_SESSION (LT-1)
      // 11:05 -> BETWEEN_CLASSES (idle)
      // 11:30 -> IN_SESSION (LT-3)
      // 13:30 -> BETWEEN_CLASSES (idle)
      // 14:30 -> IN_SESSION (LAB-3)
      // 17:30 -> DAY_FINISHED (idle)
      const testDates = [
        new Date('2026-10-12T09:15:00'),
        new Date('2026-10-12T09:30:00'),
        new Date('2026-10-12T11:05:00'),
        new Date('2026-10-12T11:30:00'),
        new Date('2026-10-12T13:30:00'),
        new Date('2026-10-12T14:30:00'),
        new Date('2026-10-12T17:30:00'),
      ];

      // Rapidly cycle 50 times
      for (let i = 0; i < 50; i++) {
        const targetDate = testDates[i % testDates.length];
        useTimetableStore.getState().setSimulatedDate(targetDate);

        const currentActive = useTimetableStore.getState().activeSchedule;
        const currentPeer = usePeerStore.getState().currentUser;

        if (currentActive?.status === 'IN_SESSION' && currentActive.activeRoom) {
          expect(currentPeer.currentRoomId).toBe(currentActive.activeRoom.id);
          expect(currentPeer.status).toBe('in_class');
          expect(currentPeer.isAutoSynced).toBe(true);
        } else {
          expect(currentPeer.currentRoomId).toBeNull();
          expect(currentPeer.status).toBe('idle');
        }
      }

      // Final state check: Monday 09:30 must be in LT-1
      useTimetableStore.getState().setSimulatedDate(new Date('2026-10-12T09:30:00'));
      expect(usePeerStore.getState().currentUser.currentRoomId).toBe('LT-1');
      expect(usePeerStore.getState().currentUser.floor).toBe('ground');

      customClient.disconnect();
    });

    it('3.2 should preserve manual check-in when autoSyncEnabled is toggled to false during time travel', () => {
      // User manually checks in to Library (LIB-1)
      usePeerStore.getState().setAutoSync(false);
      usePeerStore.getState().checkIn('LIB-1', 'first', false, [-10, 3.6, -15]);

      expect(usePeerStore.getState().currentUser.currentRoomId).toBe('LIB-1');
      expect(usePeerStore.getState().currentUser.isAutoSynced).toBe(false);

      // Rapidly cycle time travel across multiple active classes
      for (const preset of TIME_PRESETS) {
        useTimetableStore.getState().applyPreset(preset.id);
        // Manual location MUST remain locked to LIB-1 regardless of timetable
        expect(usePeerStore.getState().currentUser.currentRoomId).toBe('LIB-1');
        expect(usePeerStore.getState().currentUser.status).toBe('checked_in');
      }

      // Re-enable auto-sync: should immediately snap to active timetable room
      useTimetableStore.getState().applyPreset('preset_mon_0930');
      usePeerStore.getState().setAutoSync(true);
      expect(usePeerStore.getState().currentUser.currentRoomId).toBe('LT-1');
    });

    it('3.3 should handle rapid switching between live clock and simulation presets without desync', () => {
      for (let i = 0; i < 20; i++) {
        useTimetableStore.getState().setLiveClock(true);
        expect(useTimetableStore.getState().isLiveClock).toBe(true);

        useTimetableStore.getState().applyPreset('preset_mon_1130');
        expect(useTimetableStore.getState().isLiveClock).toBe(false);
        expect(usePeerStore.getState().currentUser.currentRoomId).toBe('LT-3');
      }
    });
  });

  // =========================================================================
  // SUITE 4: In-Memory Socket Event Ordering & Disconnect Cleanup Guarantees
  // =========================================================================
  describe('4. In-Memory Socket Event Ordering & Disconnect Cleanup Guarantees', () => {
    it('4.1 should guarantee strict FIFO event ordering for rapid room transitions', () => {
      const clientA = server.createClient('peer_sender');
      const clientB = server.createClient('peer_receiver');
      clientA.connect();
      clientB.connect();

      const receivedSequence: string[] = [];
      clientB.on('peer:location_updated', (payload: MockPeerPayload) => {
        receivedSequence.push(payload.roomId);
      });

      const emittedRooms = ['LT-1', 'LT-2', 'LAB-1', 'LAB-PHY', 'LT-3', 'ADMIN-1'];
      for (const room of emittedRooms) {
        clientA.emit('peer:checkin', {
          userId: 'peer_sender',
          roomId: room,
          floor: 'ground',
        });
      }

      // Verify exact sequential delivery order
      expect(receivedSequence).toEqual(emittedRooms);
      expect(server.activePeers.get('peer_sender')?.roomId).toBe('ADMIN-1');

      clientA.disconnect();
      clientB.disconnect();
    });

    it('4.2 should guarantee 100% clean disconnect cleanup with zero zombie peers', () => {
      const CLIENT_COUNT = 50;
      const clients: MockSocketClient[] = [];

      for (let i = 0; i < CLIENT_COUNT; i++) {
        const client = server.createClient(`student_dc_${i}`);
        client.connect();
        client.emit('peer:checkin', {
          userId: client.id,
          roomId: 'LT-1',
          floor: 'ground',
        });
        clients.push(client);
      }

      expect(server.clients.size).toBe(CLIENT_COUNT);
      expect(server.activePeers.size).toBe(CLIENT_COUNT);

      // Disconnect first 25 clients
      for (let i = 0; i < 25; i++) {
        clients[i].disconnect();
      }

      expect(server.clients.size).toBe(25);
      expect(server.activePeers.size).toBe(25);

      // Disconnect remaining 25 clients
      for (let i = 25; i < CLIENT_COUNT; i++) {
        clients[i].disconnect();
      }

      expect(server.clients.size).toBe(0);
      expect(server.activePeers.size).toBe(0);
    });

    it('4.3 should reject emits from disconnected clients and prevent stale socket leaks', () => {
      const client = server.createClient('stale_client');
      client.connect();
      client.disconnect();

      expect(client.connected).toBe(false);

      // Emit attempt on disconnected client must return false
      const emitResult = client.emit('peer:checkin', {
        userId: 'stale_client',
        roomId: 'LT-1',
        floor: 'ground',
      });

      expect(emitResult).toBe(false);
      expect(server.activePeers.has('stale_client')).toBe(false);
    });

    it('4.4 should be idempotent against multiple disconnect() calls on the same client', () => {
      const client = server.createClient('multi_dc_client');
      client.connect();

      let disconnectCount = 0;
      server.on('disconnect', () => {
        disconnectCount++;
      });

      // Rapidly call disconnect 5 times
      client.disconnect();
      client.disconnect();
      client.disconnect();
      client.disconnect();
      client.disconnect();

      expect(disconnectCount).toBe(1);
      expect(server.clients.has('multi_dc_client')).toBe(false);
    });

    it('4.5 should handle malformed or partial payloads without throwing or crashing the server bus', () => {
      const client = server.createClient('malformed_tester');
      client.connect();

      const malformedPayloads = [
        {},
        { roomId: '' },
        { roomId: 'UNKNOWN_ROOM_999' },
        { roomId: 'LT-1', coordinates: undefined },
        { roomId: 'LT-1', floor: undefined },
        { userId: undefined, roomId: 'LT-1' },
      ];

      for (const payload of malformedPayloads) {
        expect(() => {
          client.emit('peer:checkin', payload);
        }).not.toThrow();
      }

      // Verify server normalizes with safe fallbacks
      const lastPeer = server.activePeers.get('malformed_tester');
      expect(lastPeer).toBeDefined();
      expect(Array.isArray(lastPeer?.coordinates)).toBe(true);
      expect(lastPeer?.floor).toBe('ground');

      client.disconnect();
    });

    it('4.6 should test server reset() wipes all clients, activePeers, and listeners', () => {
      const c1 = server.createClient('c1').connect();
      const c2 = server.createClient('c2').connect();
      c1.emit('peer:checkin', { roomId: 'LT-1', floor: 'ground' });
      c2.emit('peer:checkin', { roomId: 'LT-2', floor: 'ground' });

      expect(server.clients.size).toBe(2);
      expect(server.activePeers.size).toBe(2);

      server.reset();

      expect(server.clients.size).toBe(0);
      expect(server.activePeers.size).toBe(0);
      expect(server.listenerCount('connection')).toBe(0);
    });
  });
});
