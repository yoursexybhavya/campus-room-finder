import { campusRooms } from '../../src/data/campusRooms';
import { CampusRoom } from '../../src/types/campus';

export interface Faculty {
  id: string;
  name: string;
  designation: string;
  department: string;
  email: string;
}

export interface TimetableSlot {
  id: string;
  batch: string;
  dayOfWeek: string;
  startTime: string; // 'HH:MM'
  endTime: string;   // 'HH:MM'
  startMinutes: number;
  endMinutes: number;
  courseId: string;
  courseName: string;
  courseCode: string;
  roomId: string;
  facultyId: string;
  facultyName: string;
  slotType: 'Lecture' | 'Lab' | 'Tutorial';
}

export interface ActiveScheduleResult {
  status: 'IN_SESSION' | 'BETWEEN_CLASSES' | 'DAY_FINISHED' | 'WEEKEND_OFF';
  activeSlot: TimetableSlot | null;
  activeRoom: CampusRoom | null;
  activeFaculty: Faculty | null;
  nextSlot: TimetableSlot | null;
  minutesRemaining: number;
  minutesUntilNext: number;
}

export const mockFaculty: Faculty[] = [
  { id: 'FAC-01', name: 'Dr. Rajesh Sharma', designation: 'Professor & HOD', department: 'Computer Science', email: 'rajesh.sharma@jiet.ac.in' },
  { id: 'FAC-02', name: 'Prof. Sunita Mehta', designation: 'Associate Professor', department: 'Information Tech', email: 'sunita.mehta@jiet.ac.in' },
  { id: 'FAC-03', name: 'Dr. Amit Choudhary', designation: 'Assistant Professor', department: 'Computer Science', email: 'amit.c@jiet.ac.in' },
  { id: 'FAC-04', name: 'Dr. Alok Verma', designation: 'Professor AI', department: 'AI & Data Science', email: 'alok.verma@jiet.ac.in' },
];

export const mockSlots: TimetableSlot[] = [
  // Monday Schedule
  {
    id: 'SLOT-M1',
    batch: 'CSE-3A',
    dayOfWeek: 'Monday',
    startTime: '09:00',
    endTime: '10:00',
    startMinutes: 540,
    endMinutes: 600,
    courseId: 'CS-301',
    courseName: 'Data Structures & Algorithms',
    courseCode: 'CS-301',
    roomId: 'LT-1',
    facultyId: 'FAC-01',
    facultyName: 'Dr. Rajesh Sharma',
    slotType: 'Lecture',
  },
  {
    id: 'SLOT-M2',
    batch: 'CSE-3A',
    dayOfWeek: 'Monday',
    startTime: '10:00',
    endTime: '11:00',
    startMinutes: 600,
    endMinutes: 660,
    courseId: 'CS-302',
    courseName: 'Database Management Systems',
    courseCode: 'CS-302',
    roomId: 'LT-1',
    facultyId: 'FAC-02',
    facultyName: 'Prof. Sunita Mehta',
    slotType: 'Lecture',
  },
  {
    id: 'SLOT-M3',
    batch: 'CSE-3A',
    dayOfWeek: 'Monday',
    startTime: '11:15',
    endTime: '12:15',
    startMinutes: 675,
    endMinutes: 735,
    courseId: 'CS-303',
    courseName: 'Computer Organization & Arch',
    courseCode: 'CS-303',
    roomId: 'LT-3',
    facultyId: 'FAC-03',
    facultyName: 'Dr. Amit Choudhary',
    slotType: 'Lecture',
  },
  {
    id: 'SLOT-M4',
    batch: 'CSE-3A',
    dayOfWeek: 'Monday',
    startTime: '14:00',
    endTime: '16:00',
    startMinutes: 840,
    endMinutes: 960,
    courseId: 'CS-305',
    courseName: 'Artificial Intelligence Lab',
    courseCode: 'CS-305',
    roomId: 'LAB-3',
    facultyId: 'FAC-04',
    facultyName: 'Dr. Alok Verma',
    slotType: 'Lab',
  },
];

export function calculateActiveSchedule(
  date: Date,
  slots: TimetableSlot[] = mockSlots,
  rooms: CampusRoom[] = campusRooms,
  faculty: Faculty[] = mockFaculty
): ActiveScheduleResult {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[date.getDay()];

  if (dayName === 'Sunday') {
    return {
      status: 'WEEKEND_OFF',
      activeSlot: null,
      activeRoom: null,
      activeFaculty: null,
      nextSlot: null,
      minutesRemaining: 0,
      minutesUntilNext: 0,
    };
  }

  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const daySlots = slots
    .filter((s) => s.dayOfWeek === dayName)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  if (daySlots.length === 0) {
    return {
      status: 'DAY_FINISHED',
      activeSlot: null,
      activeRoom: null,
      activeFaculty: null,
      nextSlot: null,
      minutesRemaining: 0,
      minutesUntilNext: 0,
    };
  }

  const activeSlot = daySlots.find(
    (s) => s.startMinutes <= currentMinutes && currentMinutes < s.endMinutes
  );

  if (activeSlot) {
    const activeRoom = rooms.find((r) => r.id === activeSlot.roomId) || null;
    const activeFac = faculty.find((f) => f.id === activeSlot.facultyId) || null;
    const nextSlot = daySlots.find((s) => s.startMinutes >= activeSlot.endMinutes) || null;

    return {
      status: 'IN_SESSION',
      activeSlot,
      activeRoom,
      activeFaculty: activeFac,
      nextSlot,
      minutesRemaining: activeSlot.endMinutes - currentMinutes,
      minutesUntilNext: nextSlot ? nextSlot.startMinutes - currentMinutes : 0,
    };
  }

  const upcomingSlots = daySlots.filter((s) => s.startMinutes > currentMinutes);
  if (upcomingSlots.length > 0) {
    const nextSlot = upcomingSlots[0];
    const nextRoom = rooms.find((r) => r.id === nextSlot.roomId) || null;
    const nextFac = faculty.find((f) => f.id === nextSlot.facultyId) || null;

    return {
      status: 'BETWEEN_CLASSES',
      activeSlot: null,
      activeRoom: nextRoom,
      activeFaculty: nextFac,
      nextSlot,
      minutesRemaining: 0,
      minutesUntilNext: nextSlot.startMinutes - currentMinutes,
    };
  }

  return {
    status: 'DAY_FINISHED',
    activeSlot: null,
    activeRoom: null,
    activeFaculty: null,
    nextSlot: null,
    minutesRemaining: 0,
    minutesUntilNext: 0,
  };
}

export interface NavNode {
  id: string;
  coords: [number, number, number];
  neighbors: { id: string; weight: number }[];
}

export function findDijkstraPath(
  startId: string,
  targetId: string,
  nodes: Map<string, NavNode>
): [number, number, number][] | null {
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();

  for (const id of nodes.keys()) {
    distances.set(id, Infinity);
    previous.set(id, null);
    unvisited.add(id);
  }

  distances.set(startId, 0);

  while (unvisited.size > 0) {
    let closestNodeId: string | null = null;
    let minDistance = Infinity;

    for (const id of unvisited) {
      const dist = distances.get(id)!;
      if (dist < minDistance) {
        minDistance = dist;
        closestNodeId = id;
      }
    }

    if (!closestNodeId || minDistance === Infinity) break;
    if (closestNodeId === targetId) break;

    unvisited.delete(closestNodeId);
    const currentNode = nodes.get(closestNodeId)!;

    for (const neighbor of currentNode.neighbors) {
      if (!unvisited.has(neighbor.id)) continue;
      const alt = minDistance + neighbor.weight;
      if (alt < distances.get(neighbor.id)!) {
        distances.set(neighbor.id, alt);
        previous.set(neighbor.id, closestNodeId);
      }
    }
  }

  if (distances.get(targetId) === Infinity) return null;

  const pathCoords: [number, number, number][] = [];
  let curr: string | null = targetId;
  while (curr) {
    const node = nodes.get(curr);
    if (node) pathCoords.unshift(node.coords);
    curr = previous.get(curr) || null;
  }
  return pathCoords;
}
