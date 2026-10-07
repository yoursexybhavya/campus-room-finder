import { create } from 'zustand';
import { FloorLevel } from '../types/campus';
import {
  PeerUser,
  PeerSocketPayload,
  normalizePeerPayload,
  getDeterministicColor,
} from '../types/peer';
import { campusRooms } from '../data/campusRooms';
import { useTimetableStore } from './useTimetableStore';
import { socketClient } from '../services/socket/socketClient';

export interface PeerStoreState {
  // State
  currentUser: PeerUser;
  peers: Map<string, PeerUser>;
  isConnected: boolean;
  activeRoomFilter: string | null;
  autoSyncEnabled: boolean;
  isAutoSyncEnabled: boolean;
  selectedPeerId: string | null;

  // Socket & Connection Lifecycle
  setSocketClient: (client: any) => void;
  connect: (customUserId?: string, customUserName?: string, customBatch?: string) => void;
  disconnect: () => void;

  // Location & Check-In Actions
  checkIn: (
    roomId: string,
    floor?: FloorLevel,
    isAutoSync?: boolean,
    coordinates?: [number, number, number]
  ) => void;
  leaveRoom: () => void;
  setAutoSync: (enabled: boolean) => void;
  toggleAutoSync: () => void;

  // Peer Map Management
  addOrUpdatePeer: (payload: PeerSocketPayload | PeerUser | any) => void;
  removePeer: (userId: string) => void;
  setPeers: (peers: (PeerSocketPayload | PeerUser | any)[]) => void;
  clearPeers: () => void;

  // Peer Selection
  selectPeer: (peerId: string | null) => void;

  // Timetable Auto-Sync Integration
  syncFromTimetable: () => void;

  // UI Filtering & User Profile
  setActiveRoomFilter: (roomId: string | null) => void;
  setCurrentUser: (user: Partial<PeerUser>) => void;

  // Selectors / Helpers
  getPeersList: () => PeerUser[];
  getPeersInRoom: (roomId: string) => PeerUser[];
  getPeersOnFloor: (floor: FloorLevel) => PeerUser[];
}

export const DEFAULT_CURRENT_USER: PeerUser = {
  id: 'student_me',
  userId: 'student_me',
  name: 'Aarav Gupta',
  batch: 'CSE-3A',
  avatarColor: '#3B82F6',
  currentRoomId: null,
  roomId: null,
  currentRoomName: null,
  roomName: null,
  floor: null,
  coordinates: null,
  isAutoSynced: true,
  isAutoSync: true,
  lastActive: Date.now(),
  status: 'idle',
};

// Singleton socket client reference
let activeSocket: any = null;
const attachedSockets = new WeakSet<object>();

// Singleton timetable subscription handle
let timetableUnsubscribe: (() => void) | null = null;

function attachSocketListeners(socket: any, get: () => PeerStoreState, set: any): void {
  if (!socket || attachedSockets.has(socket)) return;
  attachedSockets.add(socket);

  socket.on('connect', () => {
    set({ isConnected: true });
    if (get().currentUser.isAutoSynced) {
      get().syncFromTimetable();
    }
  });

  socket.on('disconnect', () => {
    set({ isConnected: false });
  });

  socket.on('peer:initial_state', (initialPeers: any[]) => {
    if (Array.isArray(initialPeers)) {
      get().setPeers(initialPeers);
    }
  });

  socket.on('peer:location_updated', (payload: any) => {
    if (payload) {
      get().addOrUpdatePeer(payload);
    }
  });

  socket.on('peer:left', (data: { userId: string }) => {
    if (data?.userId) {
      get().removePeer(data.userId);
    }
  });

  socket.on('peer:disconnected', (data: { userId: string }) => {
    if (data?.userId) {
      get().removePeer(data.userId);
    }
  });
}

export const usePeerStore = create<PeerStoreState>((set, get) => ({
  currentUser: { ...DEFAULT_CURRENT_USER },
  peers: new Map<string, PeerUser>(),
  isConnected: false,
  activeRoomFilter: null,
  autoSyncEnabled: true,
  isAutoSyncEnabled: true,
  selectedPeerId: null,

  setSocketClient: (client: any) => {
    activeSocket = client;
    if (client) {
      attachSocketListeners(client, get, set);
    }
  },

  connect: (customUserId?: string, customUserName?: string, customBatch?: string) => {
    // 1. Update identity if custom credentials passed
    if (customUserId || customUserName || customBatch) {
      const id = customUserId || get().currentUser.id;
      set((state) => ({
        currentUser: {
          ...state.currentUser,
          id,
          userId: id,
          name: customUserName || state.currentUser.name,
          batch: customBatch || state.currentUser.batch,
          avatarColor: getDeterministicColor(id),
        },
      }));
    }

    if (!activeSocket) {
      activeSocket = socketClient;
    }

    if (activeSocket) {
      attachSocketListeners(activeSocket, get, set);

      // Initiate connection if not connected
      if (!activeSocket.connected && typeof activeSocket.connect === 'function') {
        activeSocket.connect();
      } else if (activeSocket.connected) {
        set({ isConnected: true });
        if (get().currentUser.isAutoSynced) {
          get().syncFromTimetable();
        }
      }
    } else {
      set({ isConnected: true });
      if (get().currentUser.isAutoSynced) {
        get().syncFromTimetable();
      }
    }
  },

  disconnect: () => {
    if (activeSocket && typeof activeSocket.disconnect === 'function') {
      activeSocket.disconnect();
    }
    set({ isConnected: false });
  },

  checkIn: (roomId: string, floor?: FloorLevel, isAutoSync?: boolean, coordinates?: [number, number, number]) => {
    const room = campusRooms.find((r) => r.id === roomId);
    const resolvedFloor: FloorLevel = floor || room?.floor || 'ground';
    const resolvedCoords: [number, number, number] = coordinates || room?.position || [0, 0, 0];
    const resolvedRoomName = room?.name || roomId;
    const isAuto = isAutoSync !== undefined ? isAutoSync : get().currentUser.isAutoSynced;

    const updatedUser: PeerUser = {
      ...get().currentUser,
      currentRoomId: roomId,
      roomId,
      currentRoomName: resolvedRoomName,
      roomName: resolvedRoomName,
      floor: resolvedFloor,
      coordinates: resolvedCoords,
      isAutoSynced: isAuto,
      isAutoSync: isAuto,
      lastActive: Date.now(),
      status: isAuto ? 'in_class' : 'checked_in',
    };

    set({
      currentUser: updatedUser,
      autoSyncEnabled: isAuto,
      isAutoSyncEnabled: isAuto,
    });

    // Broadcast check-in event over socket
    if (activeSocket && typeof activeSocket.emit === 'function') {
      const payload: PeerSocketPayload = {
        userId: updatedUser.id,
        userName: updatedUser.name,
        batch: updatedUser.batch,
        avatarColor: updatedUser.avatarColor,
        roomId: updatedUser.currentRoomId!,
        roomName: updatedUser.currentRoomName || undefined,
        floor: updatedUser.floor || 'ground',
        coordinates: updatedUser.coordinates || [0, 0, 0],
        isAutoSync: updatedUser.isAutoSynced,
        timestamp: updatedUser.lastActive,
      };
      activeSocket.emit('peer:checkin', payload);
    }
  },

  leaveRoom: () => {
    const updatedUser: PeerUser = {
      ...get().currentUser,
      currentRoomId: null,
      roomId: null,
      currentRoomName: null,
      roomName: null,
      floor: null,
      coordinates: null,
      status: 'idle',
      lastActive: Date.now(),
    };

    set({ currentUser: updatedUser });

    if (activeSocket && typeof activeSocket.emit === 'function') {
      activeSocket.emit('peer:leave', { userId: updatedUser.id });
    }
  },

  setAutoSync: (enabled: boolean) => {
    set((state) => ({
      autoSyncEnabled: enabled,
      isAutoSyncEnabled: enabled,
      currentUser: {
        ...state.currentUser,
        isAutoSynced: enabled,
        isAutoSync: enabled,
      },
    }));

    if (enabled) {
      get().syncFromTimetable();
    }
  },

  toggleAutoSync: () => {
    const nextState = !get().autoSyncEnabled;
    get().setAutoSync(nextState);
  },

  addOrUpdatePeer: (payload: PeerSocketPayload | PeerUser | any) => {
    const peer = normalizePeerPayload(payload);
    // Do not add current user to peers map
    const myId = get().currentUser.id;
    if (peer.id === myId || peer.userId === myId) return;

    set((state) => {
      const nextPeers = new Map(state.peers);
      nextPeers.set(peer.id, peer);
      return { peers: nextPeers };
    });
  },

  removePeer: (userId: string) => {
    set((state) => {
      const nextPeers = new Map(state.peers);
      nextPeers.delete(userId);
      return { peers: nextPeers };
    });
  },

  setPeers: (rawPeers: (PeerSocketPayload | PeerUser | any)[]) => {
    const currentUserId = get().currentUser.id;
    const nextPeers = new Map<string, PeerUser>();
    for (const raw of rawPeers) {
      const peer = normalizePeerPayload(raw);
      if (peer.id !== currentUserId && peer.userId !== currentUserId) {
        nextPeers.set(peer.id, peer);
      }
    }
    set({ peers: nextPeers });
  },

  clearPeers: () => {
    set({ peers: new Map<string, PeerUser>() });
  },

  selectPeer: (peerId: string | null) => {
    set({ selectedPeerId: peerId });
  },

  syncFromTimetable: () => {
    const { currentUser, checkIn, leaveRoom } = get();
    if (!currentUser.isAutoSynced) return;

    const timetableState = useTimetableStore.getState();
    const { activeSchedule } = timetableState;

    if (activeSchedule?.status === 'IN_SESSION' && activeSchedule.activeRoom) {
      const room = activeSchedule.activeRoom;
      if (currentUser.currentRoomId !== room.id || currentUser.floor !== room.floor) {
        checkIn(room.id, room.floor, true, room.position);
      }
    } else {
      // Off-hours, weekend or break periods: leave room if currently in an auto-synced class
      if (currentUser.currentRoomId && currentUser.isAutoSynced) {
        leaveRoom();
      }
    }
  },

  setActiveRoomFilter: (roomId: string | null) => {
    set({ activeRoomFilter: roomId });
  },

  setCurrentUser: (userData: Partial<PeerUser>) => {
    set((state) => {
      const id = userData.id || userData.userId || state.currentUser.id;
      return {
        currentUser: {
          ...state.currentUser,
          ...userData,
          id,
          userId: id,
        },
      };
    });
  },

  getPeersList: () => {
    return Array.from(get().peers.values());
  },

  getPeersInRoom: (roomId: string) => {
    return Array.from(get().peers.values()).filter(
      (p) => p.currentRoomId === roomId || p.roomId === roomId
    );
  },

  getPeersOnFloor: (floor: FloorLevel) => {
    return Array.from(get().peers.values()).filter((p) => p.floor === floor);
  },
}));

/**
 * Initializes synchronization with useTimetableStore changes
 */
export function initTimetableAutoSync(): () => void {
  if (timetableUnsubscribe) {
    return timetableUnsubscribe;
  }

  timetableUnsubscribe = useTimetableStore.subscribe((state, prevState) => {
    const peerStore = usePeerStore.getState();
    if (!peerStore.currentUser.isAutoSynced) return;

    const prevRoomId = prevState?.activeSchedule?.activeRoom?.id;
    const currentRoomId = state.activeSchedule?.activeRoom?.id;
    const prevStatus = prevState?.activeSchedule?.status;
    const currentStatus = state.activeSchedule?.status;

    if (prevRoomId !== currentRoomId || prevStatus !== currentStatus) {
      peerStore.syncFromTimetable();
    }
  });

  return timetableUnsubscribe;
}

/**
 * Stops auto-sync subscription (used in testing and cleanup)
 */
export function stopTimetableAutoSync(): void {
  if (timetableUnsubscribe) {
    timetableUnsubscribe();
    timetableUnsubscribe = null;
  }
}

// Automatically engage timetable auto-sync on module import
initTimetableAutoSync();
