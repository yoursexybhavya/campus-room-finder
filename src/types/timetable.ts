import { CampusRoom } from './campus';

export interface Faculty {
  id: string;
  name: string;
  designation: string;
  department: string;
  email: string;
  officeRoomId?: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
}

export type SlotType = 'Lecture' | 'Lab' | 'Tutorial' | 'Seminar';

export interface TimetableSlot {
  id: string;
  batch: string;
  dayOfWeek: string;
  startTime: string; // 'HH:MM' (24-hr)
  endTime: string;   // 'HH:MM' (24-hr)
  startMinutes: number;
  endMinutes: number;
  courseId: string;
  courseName: string;
  courseCode: string;
  roomId: string;
  facultyId: string;
  facultyName: string;
  slotType: SlotType;
}

export type ActiveScheduleStatus =
  | 'IN_SESSION'
  | 'BETWEEN_CLASSES'
  | 'DAY_FINISHED'
  | 'WEEKEND_OFF';

export interface ActiveScheduleResult {
  status: ActiveScheduleStatus;
  activeSlot: TimetableSlot | null;
  activeRoom: CampusRoom | null;
  activeFaculty: Faculty | null;
  nextSlot: TimetableSlot | null;
  minutesRemaining: number;
  minutesUntilNext: number;
}

export interface TimePreset {
  id: string;
  label: string;
  description: string;
  date: Date;
  targetRoomId?: string;
}
