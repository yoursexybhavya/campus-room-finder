import { FloorLevel } from './campus';

/**
 * Presence status of a connected student peer
 */
export type PeerPresenceStatus = 'in_class' | 'checked_in' | 'idle' | 'offline';

/**
 * Core Peer User Model
 * Represents a connected friend or student on the campus map
 */
export interface PeerUser {
  id: string;                         // e.g. 'peer_alice', 'student_123'
  name: string;                       // e.g. 'Alice Sharma'
  batch: string;                      // e.g. 'CSE-3A', 'AI-DS-5A'
  avatarColor: string;                // Hex color code, e.g. '#3B82F6'
  currentRoomId: string | null;       // Room ID, e.g. 'LT-1', 'LAB-3', or null
  currentRoomName: string | null;     // Full room name, e.g. 'Aryabhata Lecture Hall'
  floor: FloorLevel | null;           // 'ground' | 'first' | null
  coordinates: [number, number, number] | null; // [x, y, z] in Three.js world space
  isAutoSynced: boolean;              // True if location is synchronized with timetable
  lastActive: number;                 // Epoch timestamp in milliseconds
  status?: PeerPresenceStatus;        // 'in_class' | 'checked_in' | 'idle' | 'offline'

  // Backwards compatibility / convenience getters for tests and socket interop
  userId?: string;                    // Alias for id
  roomId?: string | null;             // Alias for currentRoomId
  roomName?: string | null;           // Alias for currentRoomName
  isAutoSync?: boolean;               // Alias for isAutoSynced
}

/**
 * Outbound Check-In Event payload emitted by client
 */
export interface PeerCheckInEvent {
  roomId: string;
  floor: FloorLevel;
  isAutoSync?: boolean;
  coordinates?: [number, number, number];
  roomName?: string;
  userId?: string;
  userName?: string;
  timestamp?: number;
}

/**
 * Inbound/Outbound Socket Payload structure (matching MockPeerPayload)
 */
export interface PeerSocketPayload {
  userId: string;
  userName?: string;
  batch?: string;
  avatarColor?: string;
  roomId: string;
  roomName?: string;
  floor: FloorLevel;
  isAutoSync?: boolean;
  coordinates?: [number, number, number];
  timestamp?: number;
}

/**
 * Standard vibrant avatar palette for peers
 */
export const PEER_AVATAR_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#14B8A6', // Teal
  '#84CC16', // Lime
  '#F97316', // Orange
] as const;

/**
 * Presence status color mapping
 */
export const PRESENCE_STATUS_COLORS: Record<PeerPresenceStatus, string> = {
  in_class: '#10B981',   // Emerald (active scheduled class)
  checked_in: '#3B82F6', // Blue (manual check-in / study session)
  idle: '#F59E0B',       // Amber (connected, between rooms)
  offline: '#64748B',    // Slate / Gray
};

/**
 * Floor color coding for badges
 */
export const FLOOR_COLORS: Record<FloorLevel, string> = {
  ground: '#10B981', // Emerald
  first: '#8B5CF6',  // Purple
};

/**
 * Batch badge color mapping
 */
export const BATCH_COLORS: Record<string, string> = {
  'CSE-3A': '#3B82F6',
  'CSE-3B': '#6366F1',
  'AI-DS-5A': '#8B5CF6',
  'IT-3A': '#06B6D4',
  'ECE-3A': '#F59E0B',
  'MECH-3A': '#EF4444',
};

/**
 * Computes a deterministic avatar color from any user identifier
 */
export function getDeterministicColor(identifier: string): string {
  if (!identifier) return PEER_AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = (hash << 5) - hash + identifier.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PEER_AVATAR_COLORS.length;
  return PEER_AVATAR_COLORS[index];
}

/**
 * Calculates radial dispersion offset for multiple peers sharing the same room node
 * Formula: x = center.x + R * cos(theta), z = center.z + R * sin(theta)
 */
export function calculateRadialDispersion(
  centerCoords: [number, number, number],
  index: number,
  total: number,
  radius = 1.5
): [number, number, number] {
  if (total <= 1) {
    return [centerCoords[0], centerCoords[1], centerCoords[2]];
  }
  const angle = (index / total) * 2 * Math.PI;
  return [
    centerCoords[0] + Math.cos(angle) * radius,
    centerCoords[1],
    centerCoords[2] + Math.sin(angle) * radius,
  ];
}

/**
 * Normalizes raw socket payload or partial peer data into a canonical PeerUser
 */
export function normalizePeerPayload(
  payload: Partial<PeerSocketPayload> & {
    userId?: string;
    id?: string;
    name?: string;
    userName?: string;
    currentRoomId?: string | null;
    currentRoomName?: string | null;
    isAutoSynced?: boolean;
    lastActive?: number;
  }
): PeerUser {
  const id = payload.userId || payload.id || `peer_${Math.random().toString(36).substring(2, 7)}`;
  const roomId = payload.roomId || payload.currentRoomId || null;
  const isAutoSync = Boolean(payload.isAutoSync ?? payload.isAutoSynced);

  const status: PeerPresenceStatus = roomId
    ? isAutoSync
      ? 'in_class'
      : 'checked_in'
    : 'idle';

  const roomName = payload.roomName || payload.currentRoomName || (roomId ? roomId : null);

  return {
    id,
    userId: id,
    name: payload.userName || payload.name || `Student ${id.slice(-4)}`,
    batch: payload.batch || 'CSE-3A',
    avatarColor: payload.avatarColor || getDeterministicColor(id),
    currentRoomId: roomId,
    roomId: roomId,
    currentRoomName: roomName,
    roomName: roomName,
    floor: payload.floor || (roomId ? 'ground' : null),
    coordinates: payload.coordinates || (roomId ? [0, 0, 0] : null),
    isAutoSynced: isAutoSync,
    isAutoSync: isAutoSync,
    lastActive: payload.timestamp || payload.lastActive || Date.now(),
    status,
  };
}
