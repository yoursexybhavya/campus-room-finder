export type FloorLevel = 'ground' | 'first';
export type FloorFilter = 'all' | 'ground' | 'first';
export type ViewMode = '2D' | '3D';

export type RoomType =
  | 'lecture_theater'
  | 'lab'
  | 'faculty'
  | 'library'
  | 'admin'
  | 'seminar_hall';

export interface CampusRoom {
  id: string;               // e.g. 'LT-1', 'LAB-1'
  name: string;             // e.g. 'Aryabhata Lecture Hall'
  code: string;             // e.g. 'LT-01'
  type: RoomType;
  floor: FloorLevel;
  position: [number, number, number]; // [x, y, z] in Three.js coordinates
  dimensions: [number, number, number]; // [width, height, depth]
  color: string;
  doorWaypointId: string;
  building?: string;
  wing?: 'East' | 'West' | 'North' | 'South' | 'Central';
  capacity?: number;
  description?: string;
  facilities?: string[];
  inChargeFaculty?: string;
}

export interface CameraTarget {
  position: [number, number, number];
  lookAt: [number, number, number];
}

export interface Waypoint {
  id: string;
  position: [number, number, number];
  floor: FloorLevel;
  neighbors: string[];
}
