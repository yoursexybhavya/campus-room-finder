import { CampusRoom } from '../../types/campus';
import { ActiveScheduleResult, Faculty, TimetableSlot } from '../../types/timetable';
import { timetableDb } from '../database/timetableDb';

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/**
 * Calculates current active class, room, faculty, time remaining, and upcoming classes
 * for any given Date deterministically.
 */
export function calculateActiveSchedule(
  date: Date,
  slots?: TimetableSlot[],
  rooms?: CampusRoom[],
  faculty?: Faculty[]
): ActiveScheduleResult {
  const allSlots = slots || timetableDb.getSlots();
  const allRooms = rooms || timetableDb.getAllRooms();
  const allFaculty = faculty || timetableDb.getAllFaculty();

  const dayName = DAYS_OF_WEEK[date.getDay()];

  // Sunday is a designated weekend day with no scheduled classes
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
  const daySlots = allSlots
    .filter((s) => s.dayOfWeek.toLowerCase() === dayName.toLowerCase())
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

  // Check if an ongoing class is currently in session
  const activeSlot = daySlots.find(
    (s) => s.startMinutes <= currentMinutes && currentMinutes < s.endMinutes
  );

  if (activeSlot) {
    const activeRoom = allRooms.find((r) => r.id === activeSlot.roomId) || null;
    const activeFac = allFaculty.find((f) => f.id === activeSlot.facultyId) || null;
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

  // Check upcoming classes today (breaks, pre-class morning)
  const upcomingSlots = daySlots.filter((s) => s.startMinutes > currentMinutes);
  if (upcomingSlots.length > 0) {
    const nextSlot = upcomingSlots[0];
    const nextRoom = allRooms.find((r) => r.id === nextSlot.roomId) || null;
    const nextFac = allFaculty.find((f) => f.id === nextSlot.facultyId) || null;

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

  // If currentMinutes is after all slots have concluded
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

/**
 * Returns formatted time string HH:MM from minutes after midnight.
 */
export function formatMinutesToTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const mins = (minutes % 60).toString().padStart(2, '0');
  return `${hrs}:${mins}`;
}

/**
 * Formats a duration in minutes into a user-friendly string (e.g., '45m' or '1h 15m').
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
}

/**
 * Retrieves the daily timetable schedule for a specific room on a given date.
 */
export function getRoomDailySchedule(
  roomId: string,
  date: Date,
  slots?: TimetableSlot[]
): TimetableSlot[] {
  const allSlots = slots || timetableDb.getSlots();
  const dayName = DAYS_OF_WEEK[date.getDay()];
  return allSlots
    .filter(
      (s) => s.roomId === roomId && s.dayOfWeek.toLowerCase() === dayName.toLowerCase()
    )
    .sort((a, b) => a.startMinutes - b.startMinutes);
}
