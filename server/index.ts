import express, { Express, Request, Response } from 'express';
import { createServer, Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { campusRooms } from '../src/data/campusRooms';

export interface PeerPayload {
  userId: string;
  userName?: string;
  batch?: string;
  avatarColor?: string;
  roomId: string;
  roomName?: string;
  floor: 'ground' | 'first';
  isAutoSync?: boolean;
  coordinates?: [number, number, number];
  timestamp?: number;
}

export interface PeerServerInstance {
  app: Express;
  httpServer: HttpServer;
  io: Server;
  activePeers: Map<string, PeerPayload>;
  start: (port?: number) => Promise<number>;
  stop: () => Promise<void>;
}

export function createPeerServer(defaultPort = 3001): PeerServerInstance {
  const app = express();
  app.use(cors({ origin: '*', credentials: true }));
  app.use(express.json());

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const activePeers = new Map<string, PeerPayload>();
  const socketToUser = new Map<string, string>();

  // REST endpoints
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Campus Room Finder Peer Socket',
      activePeers: activePeers.size,
      timestamp: Date.now(),
    });
  });

  app.get('/api/peers', (_req: Request, res: Response) => {
    res.json(Array.from(activePeers.values()));
  });

  // Socket.io Connection & Event Handling
  io.on('connection', (socket: Socket) => {
    // 1. Initial State Delivery on Connection
    socket.emit('peer:initial_state', Array.from(activePeers.values()));

    // 2. Peer Join / Profile Registration
    socket.on('peer:join', (data: { userId?: string; userName?: string; batch?: string; avatarColor?: string }) => {
      const userId = data?.userId || socket.id;
      socketToUser.set(socket.id, userId);
      socket.emit('peer:initial_state', Array.from(activePeers.values()));
    });

    // 3. Peer Check-In Broadcast
    socket.on('peer:checkin', (payload: Partial<PeerPayload>) => {
      if (!payload || !payload.roomId) return;

      const userId = payload.userId || socketToUser.get(socket.id) || socket.id;
      socketToUser.set(socket.id, userId);

      // Resolve room metadata fallback
      const room = campusRooms.find((r) => r.id === payload.roomId);
      const floor = payload.floor || (room ? room.floor : 'ground');
      const coordinates = payload.coordinates || (room ? room.position : [0, 0, 0]);
      const roomName = payload.roomName || (room ? room.name : payload.roomId);

      const fullPayload: PeerPayload = {
        userId,
        userName: payload.userName || `Student ${userId.slice(0, 4)}`,
        batch: payload.batch || 'CSE-2026',
        avatarColor: payload.avatarColor || '#38bdf8',
        roomId: payload.roomId,
        roomName,
        floor,
        isAutoSync: !!payload.isAutoSync,
        coordinates,
        timestamp: payload.timestamp || Date.now(),
      };

      activePeers.set(userId, fullPayload);

      // Broadcast to ALL other clients (NO echo back to sender)
      socket.broadcast.emit('peer:location_updated', fullPayload);
    });

    // 4. Explicit Peer Leave
    socket.on('peer:leave', (data?: { userId?: string }) => {
      const userId = data?.userId || socketToUser.get(socket.id) || socket.id;
      if (activePeers.has(userId)) {
        activePeers.delete(userId);
        socket.broadcast.emit('peer:left', { userId });
        socket.broadcast.emit('peer:disconnected', { userId });
      }
    });

    // 5. Disconnect Cleanup
    socket.on('disconnect', () => {
      const userId = socketToUser.get(socket.id) || socket.id;
      socketToUser.delete(socket.id);

      if (activePeers.has(userId)) {
        activePeers.delete(userId);
        socket.broadcast.emit('peer:disconnected', { userId });
        socket.broadcast.emit('peer:left', { userId });
      }
    });
  });

  const start = (port = defaultPort): Promise<number> => {
    return new Promise((resolve) => {
      httpServer.listen(port, () => {
        console.log(`[Socket.io Server] Listening on http://localhost:${port}`);
        resolve(port);
      });
    });
  };

  const stop = (): Promise<void> => {
    return new Promise((resolve) => {
      io.close(() => {
        httpServer.close(() => resolve());
      });
    });
  };

  return { app, httpServer, io, activePeers, start, stop };
}

// Self-run when executed directly via vite-node or node
const isDirectRun =
  process.argv.some((arg) => arg.includes('server/index') || arg.endsWith('server')) ||
  import.meta.url.endsWith('server/index.ts');

if (isDirectRun) {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  const instance = createPeerServer(port);
  instance.start();
}
