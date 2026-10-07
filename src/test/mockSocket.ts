import { EventEmitter } from 'events';

export interface MockPeerPayload {
  userId: string;
  userName?: string;
  roomId: string;
  roomName?: string;
  floor: 'ground' | 'first';
  isAutoSync?: boolean;
  coordinates?: [number, number, number];
  timestamp?: number;
}

export class MockSocketClient extends EventEmitter {
  id: string;
  connected = false;
  private server: MockSocketServer;

  constructor(id: string, server: MockSocketServer) {
    super();
    this.id = id;
    this.server = server;
  }

  connect(): this {
    this.connected = true;
    this.server.handleConnect(this);
    this.emit('connect');
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    if (!this.connected && event !== 'connect') {
      return false;
    }
    // Handle locally if server routing or deliver to server
    this.server.handleClientEmit(this, event, args);
    return super.emit(event, ...args);
  }

  disconnect(): this {
    if (this.connected) {
      this.connected = false;
      this.server.handleDisconnect(this);
      super.emit('disconnect');
    }
    return this;
  }
}

export class MockSocketServer extends EventEmitter {
  clients = new Map<string, MockSocketClient>();
  activePeers = new Map<string, MockPeerPayload>();

  createClient(id = `client_${Math.random().toString(36).substring(2, 9)}`): MockSocketClient {
    return new MockSocketClient(id, this);
  }

  handleConnect(client: MockSocketClient): void {
    this.clients.set(client.id, client);
    this.emit('connection', client);
    // Send currently active peers to newly joined client
    client.emit('peer:initial_state', Array.from(this.activePeers.values()));
  }

  handleDisconnect(client: MockSocketClient): void {
    this.clients.delete(client.id);
    if (this.activePeers.has(client.id)) {
      this.activePeers.delete(client.id);
      this.broadcast('peer:disconnected', { userId: client.id });
    }
    this.emit('disconnect', client);
  }

  handleClientEmit(sender: MockSocketClient, event: string, args: any[]): void {
    if (event === 'peer:checkin') {
      const payload: MockPeerPayload = args[0] || {};
      const fullPayload: MockPeerPayload = {
        userId: payload.userId || sender.id,
        userName: payload.userName || `Student ${sender.id.slice(0, 4)}`,
        roomId: payload.roomId,
        roomName: payload.roomName || payload.roomId,
        floor: payload.floor || 'ground',
        isAutoSync: !!payload.isAutoSync,
        coordinates: payload.coordinates || [0, 0, 0],
        timestamp: payload.timestamp || Date.now(),
      };
      this.activePeers.set(fullPayload.userId, fullPayload);

      // Broadcast to all other connected clients
      for (const [id, client] of this.clients.entries()) {
        if (id !== sender.id) {
          client.emit('peer:location_updated', fullPayload);
        }
      }
    } else if (event === 'peer:leave') {
      const userId = args[0]?.userId || sender.id;
      this.activePeers.delete(userId);
      for (const [id, client] of this.clients.entries()) {
        if (id !== sender.id) {
          client.emit('peer:left', { userId });
        }
      }
    }
  }

  broadcast(event: string, data: any): void {
    for (const client of this.clients.values()) {
      client.emit(event, data);
    }
  }

  reset(): void {
    this.clients.clear();
    this.activePeers.clear();
    this.removeAllListeners();
  }
}
