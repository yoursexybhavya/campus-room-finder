import { io, Socket } from 'socket.io-client';
import { MockSocketClient, MockPeerPayload, getSharedMockServer } from './mockSocket';

export type SocketMode = 'real' | 'mock' | 'auto';

export interface SocketClientConfig {
  url?: string;
  mode?: SocketMode;
  userId?: string;
}

export class SocketClientService {
  private mode: SocketMode = 'auto';
  private realSocket: Socket | null = null;
  private mockClient: MockSocketClient | null = null;
  private serverUrl: string;
  private userId: string;
  private listeners = new Map<string, Set<(...args: any[]) => void>>();

  constructor(config: SocketClientConfig = {}) {
    const defaultUrl =
      (typeof window !== 'undefined' && (window as any).__SOCKET_URL__) ||
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SOCKET_URL) ||
      'http://localhost:3001';
    this.serverUrl = config.url || defaultUrl;
    this.mode = config.mode || 'auto';
    this.userId = config.userId || `user_${Math.random().toString(36).substring(2, 9)}`;
  }

  public isTestOrHeadless(): boolean {
    if (this.mode === 'mock') return true;
    if (this.mode === 'real') return false;
    // Auto-detect test or headless environment (Vitest / Node / jsdom)
    const isVitest = typeof process !== 'undefined' && (!!process.env?.VITEST || process.env?.NODE_ENV === 'test');
    const isNode = typeof window === 'undefined';
    return isVitest || isNode;
  }

  public get connected(): boolean {
    if (this.mockClient) return this.mockClient.connected;
    if (this.realSocket) return this.realSocket.connected;
    return false;
  }

  public get isConnected(): boolean {
    return this.connected;
  }

  public get id(): string {
    if (this.mockClient) return this.mockClient.id;
    if (this.realSocket) return this.realSocket.id || this.userId;
    return this.userId;
  }

  public get socketId(): string {
    return this.id;
  }

  public setUserId(id: string): void {
    this.userId = id;
    if (this.mockClient) {
      this.mockClient.id = id;
    }
  }

  public connect(): this {
    if (this.isTestOrHeadless()) {
      if (!this.mockClient) {
        const mockServer = getSharedMockServer();
        this.mockClient = mockServer.createClient(this.userId);
        this.replayListeners(this.mockClient);
      }
      this.mockClient.connect();
      return this;
    }

    // Browser environment: Connect to real Socket.io server
    if (!this.realSocket) {
      this.realSocket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        reconnectionAttempts: 3,
      });

      this.replayListeners(this.realSocket);

      // Graceful fallback to mock bus if server is not reachable
      this.realSocket.on('connect_error', (err) => {
        console.warn(`[SocketClient] Real socket server connection failed at ${this.serverUrl}:`, err.message);
        console.info('[SocketClient] Falling back to in-memory mock socket bus.');
        this.fallbackToMock();
      });
    } else if (!this.realSocket.connected) {
      this.realSocket.connect();
    }

    return this;
  }

  public disconnect(): this {
    if (this.mockClient) {
      this.mockClient.disconnect();
    }
    if (this.realSocket) {
      this.realSocket.disconnect();
    }
    return this;
  }

  public on(event: string, callback: (...args: any[]) => void): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    if (this.mockClient) {
      this.mockClient.on(event, callback);
    }
    if (this.realSocket) {
      this.realSocket.on(event, callback);
    }
    return this;
  }

  public off(event: string, callback?: (...args: any[]) => void): this {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
      if (this.mockClient) this.mockClient.off(event, callback);
      if (this.realSocket) this.realSocket.off(event, callback);
    } else {
      this.listeners.delete(event);
      if (this.mockClient) this.mockClient.removeAllListeners(event);
      if (this.realSocket) this.realSocket.off(event);
    }
    return this;
  }

  public removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event);
      if (this.mockClient) this.mockClient.removeAllListeners(event);
      if (this.realSocket) this.realSocket.off(event);
    } else {
      this.listeners.clear();
      if (this.mockClient) this.mockClient.removeAllListeners();
      if (this.realSocket) this.realSocket.removeAllListeners();
    }
    return this;
  }

  public emit(event: string, ...args: any[]): boolean {
    if (this.mockClient && this.mockClient.connected) {
      return this.mockClient.emit(event, ...args);
    }
    if (this.realSocket && this.realSocket.connected) {
      this.realSocket.emit(event, ...args);
      return true;
    }
    return false;
  }

  public checkIn(payload: Partial<MockPeerPayload> & { roomId: string; floor?: 'ground' | 'first' }): void {
    const fullPayload: MockPeerPayload = {
      userId: payload.userId || this.socketId,
      userName: payload.userName,
      roomId: payload.roomId,
      roomName: payload.roomName,
      floor: payload.floor || 'ground',
      isAutoSync: payload.isAutoSync,
      coordinates: payload.coordinates,
      timestamp: payload.timestamp || Date.now(),
    };
    this.emit('peer:checkin', fullPayload);
  }

  public leave(userId?: string): void {
    this.emit('peer:leave', { userId: userId || this.socketId });
  }

  public setMockClient(client: MockSocketClient): void {
    this.mockClient = client;
    this.mode = 'mock';
    this.replayListeners(this.mockClient);
  }

  public getMockClient(): MockSocketClient | null {
    return this.mockClient;
  }

  public setMode(mode: SocketMode): void {
    this.mode = mode;
  }

  private fallbackToMock(): void {
    if (this.mockClient) return;
    const mockServer = getSharedMockServer();
    this.mockClient = mockServer.createClient(this.userId);
    this.replayListeners(this.mockClient);
    this.mockClient.connect();
  }

  private replayListeners(target: { on: (event: string, fn: (...args: any[]) => void) => any }): void {
    for (const [event, callbacks] of this.listeners.entries()) {
      for (const cb of callbacks) {
        target.on(event, cb);
      }
    }
  }
}

// Default application singleton instance
export const socketClient = new SocketClientService();
