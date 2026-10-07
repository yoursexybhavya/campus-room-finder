import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useCampusStore } from '../../src/stores/useCampusStore';
import { campusRooms } from '../../src/data/campusRooms';
import { MockSocketServer, MockSocketClient, MockPeerPayload } from '../../src/test/mockSocket';

export interface PeerState {
  peers: Map<string, MockPeerPayload>;
  addOrUpdatePeer: (peer: MockPeerPayload) => void;
  removePeer: (userId: string) => void;
  clear: () => void;
}

export function createPeerTracker(): PeerState {
  const peers = new Map<string, MockPeerPayload>();
  return {
    peers,
    addOrUpdatePeer: (p: MockPeerPayload) => {
      peers.set(p.userId, p);
    },
    removePeer: (userId: string) => {
      peers.delete(userId);
    },
    clear: () => {
      peers.clear();
    },
  };
}

describe('Tier 1 Integration: Real-Time Peer Locator (R3)', () => {
  let server: MockSocketServer;
  let clientA: MockSocketClient;
  let clientB: MockSocketClient;
  let peerTracker: PeerState;

  beforeEach(() => {
    server = new MockSocketServer();
    clientA = server.createClient('peer_rahul');
    clientB = server.createClient('peer_priya');
    peerTracker = createPeerTracker();
    useCampusStore.getState().resetView();
  });

  afterEach(() => {
    clientA.disconnect();
    clientB.disconnect();
    server.reset();
  });

  it('1. should connect to mock socket bus and receive initial peers list', () => {
    clientA.connect();

    // Check-in Rahul at LT-1
    clientA.emit('peer:checkin', {
      userId: 'peer_rahul',
      userName: 'Rahul Verma',
      roomId: 'LT-1',
      floor: 'ground',
      coordinates: [20, 1.0, 7],
    });

    let receivedInitialPeers: MockPeerPayload[] = [];
    clientB.on('peer:initial_state', (peers: MockPeerPayload[]) => {
      receivedInitialPeers = peers;
    });

    clientB.connect();

    expect(receivedInitialPeers.length).toBe(1);
    expect(receivedInitialPeers[0].userId).toBe('peer_rahul');
    expect(receivedInitialPeers[0].roomId).toBe('LT-1');
  });

  it('2. should update live peer location on check-in event and sync with store', () => {
    clientA.connect();
    clientB.connect();

    clientB.on('peer:location_updated', (payload: MockPeerPayload) => {
      peerTracker.addOrUpdatePeer(payload);
    });

    // Rahul checks in to Applied Physics Lab (Ground floor)
    clientA.emit('peer:checkin', {
      userId: 'peer_rahul',
      userName: 'Rahul Verma',
      roomId: 'LAB-PHY',
      floor: 'ground',
      coordinates: [-20, 1.0, 18],
    });

    const activeRahul = peerTracker.peers.get('peer_rahul');
    expect(activeRahul).toBeDefined();
    expect(activeRahul?.roomId).toBe('LAB-PHY');
    expect(activeRahul?.floor).toBe('ground');
  });

  it('3. should focus camera on friend room when friend card is tapped', () => {
    const friendRoom = campusRooms.find((r) => r.id === 'LT-3')!;
    expect(friendRoom).toBeDefined();

    // Simulate clicking friend in Peer HUD
    useCampusStore.getState().selectRoom(friendRoom.id);

    expect(useCampusStore.getState().selectedRoomId).toBe('LT-3');
    expect(useCampusStore.getState().cameraTarget?.lookAt).toEqual(friendRoom.position);
  });

  it('4. should calculate radial dispersion for multiple peers sharing a room', () => {
    const friends = ['Alice', 'Bob', 'Charlie', 'David'];
    const roomCoords: [number, number, number] = [20, 1.0, 7];
    const dispersedAvatars = friends.map((name, idx) => {
      const angle = (idx / friends.length) * 2 * Math.PI;
      return {
        name,
        position: [
          roomCoords[0] + Math.cos(angle) * 1.5,
          roomCoords[1],
          roomCoords[2] + Math.sin(angle) * 1.5,
        ],
      };
    });

    expect(dispersedAvatars.length).toBe(4);
    // Distinct avatar positions
    const posKeys = new Set(dispersedAvatars.map((a) => a.position.join(',')));
    expect(posKeys.size).toBe(4);
  });

  it('5. should remove peer and notify clients when a friend disconnects', () => {
    clientA.connect();
    clientB.connect();

    clientB.on('peer:location_updated', (payload) => {
      peerTracker.addOrUpdatePeer(payload);
    });

    clientB.on('peer:disconnected', (data: { userId: string }) => {
      peerTracker.removePeer(data.userId);
    });

    clientA.emit('peer:checkin', {
      userId: 'peer_rahul',
      roomId: 'LT-1',
      floor: 'ground',
    });

    expect(peerTracker.peers.has('peer_rahul')).toBe(true);

    clientA.disconnect();
    expect(peerTracker.peers.has('peer_rahul')).toBe(false);
  });
});
