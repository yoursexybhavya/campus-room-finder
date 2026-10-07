import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockSocketServer, MockSocketClient, MockPeerPayload } from '../../src/test/mockSocket';

describe('Tier 1: Peer Locator Real-Time Socket Service (R3)', () => {
  let server: MockSocketServer;
  let clientA: MockSocketClient;
  let clientB: MockSocketClient;

  beforeEach(() => {
    server = new MockSocketServer();
    clientA = server.createClient('student_alice');
    clientB = server.createClient('student_bob');
  });

  afterEach(() => {
    clientA.disconnect();
    clientB.disconnect();
    server.reset();
  });

  it('1. should connect clients and fire connect events', () => {
    let connectedA = false;
    let connectedB = false;

    clientA.on('connect', () => {
      connectedA = true;
    });
    clientB.on('connect', () => {
      connectedB = true;
    });

    clientA.connect();
    clientB.connect();

    expect(connectedA).toBe(true);
    expect(connectedB).toBe(true);
    expect(clientA.connected).toBe(true);
    expect(clientB.connected).toBe(true);
    expect(server.clients.size).toBe(2);
  });

  it('2. should broadcast check-in from Client A and deliver to Client B', () => {
    clientA.connect();
    clientB.connect();

    let receivedPayload: MockPeerPayload | null = null;
    clientB.on('peer:location_updated', (payload: MockPeerPayload) => {
      receivedPayload = payload;
    });

    const checkInPayload: MockPeerPayload = {
      userId: 'student_alice',
      userName: 'Alice Sharma',
      roomId: 'LT-1',
      roomName: 'Aryabhata Lecture Hall',
      floor: 'ground',
      coordinates: [20, 1.0, 7],
      isAutoSync: false,
    };

    clientA.emit('peer:checkin', checkInPayload);

    expect(receivedPayload).not.toBeNull();
    expect(receivedPayload?.userId).toBe('student_alice');
    expect(receivedPayload?.roomId).toBe('LT-1');
    expect(receivedPayload?.floor).toBe('ground');
    expect(receivedPayload?.roomName).toBe('Aryabhata Lecture Hall');
  });

  it('3. should not echo broadcast back to the sender client', () => {
    clientA.connect();
    clientB.connect();

    let senderReceivedEcho = false;
    clientA.on('peer:location_updated', () => {
      senderReceivedEcho = true;
    });

    clientA.emit('peer:checkin', {
      roomId: 'LAB-1',
      floor: 'ground',
    });

    expect(senderReceivedEcho).toBe(false);
  });

  it('4. should send initial state of active peers to newly connecting client', () => {
    clientA.connect();
    clientA.emit('peer:checkin', {
      userId: 'student_alice',
      roomId: 'LT-2',
      floor: 'ground',
    });

    // Client C connects after Alice has already checked in
    const clientC = server.createClient('student_carol');
    let initialState: MockPeerPayload[] = [];

    clientC.on('peer:initial_state', (peers: MockPeerPayload[]) => {
      initialState = peers;
    });

    clientC.connect();

    expect(initialState.length).toBe(1);
    expect(initialState[0].userId).toBe('student_alice');
    expect(initialState[0].roomId).toBe('LT-2');

    clientC.disconnect();
  });

  it('5. should notify peers when a client explicitly leaves or disconnects', () => {
    clientA.connect();
    clientB.connect();

    clientA.emit('peer:checkin', {
      userId: 'student_alice',
      roomId: 'LT-1',
      floor: 'ground',
    });

    let disconnectedUser: string | null = null;
    clientB.on('peer:disconnected', (data: { userId: string }) => {
      disconnectedUser = data.userId;
    });

    clientA.disconnect();

    expect(disconnectedUser).toBe('student_alice');
    expect(server.activePeers.has('student_alice')).toBe(false);
  });

  it('6. should broadcast to all multiple connected peers simultaneously', () => {
    const clientC = server.createClient('student_carol');
    const clientD = server.createClient('student_david');

    clientA.connect();
    clientB.connect();
    clientC.connect();
    clientD.connect();

    const receivedClients: string[] = [];
    clientB.on('peer:location_updated', () => receivedClients.push('B'));
    clientC.on('peer:location_updated', () => receivedClients.push('C'));
    clientD.on('peer:location_updated', () => receivedClients.push('D'));

    clientA.emit('peer:checkin', {
      roomId: 'LAB-3',
      floor: 'first',
    });

    expect(receivedClients).toEqual(['B', 'C', 'D']);

    clientC.disconnect();
    clientD.disconnect();
  });
});
