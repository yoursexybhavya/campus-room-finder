import { describe, it, expect } from 'vitest';
import { campusRooms } from '../../src/data/campusRooms';
import {
  calculateActiveSchedule,
  mockSlots,
  mockFaculty,
  findDijkstraPath,
  NavNode,
} from '../helpers/timetable';

describe('Tier 1: Smart Timetable Sync & Datetime Engine (R2)', () => {
  it('1. should identify active lecture in LT-1 on Monday 09:15', () => {
    // 2026-10-12 is a Monday
    const date = new Date('2026-10-12T09:15:00');
    const result = calculateActiveSchedule(date, mockSlots, campusRooms, mockFaculty);

    expect(result.status).toBe('IN_SESSION');
    expect(result.activeSlot?.courseName).toBe('Data Structures & Algorithms');
    expect(result.activeSlot?.roomId).toBe('LT-1');
    expect(result.activeRoom?.name).toBe('Lecture Theater 9 (LT-9)');
    expect(result.activeRoom?.floor).toBe('ground');
    expect(result.activeFaculty?.name).toBe('Dr. Rajesh Sharma');
    expect(result.minutesRemaining).toBe(45); // 10:00 - 09:15 = 45 mins
  });

  it('2. should accurately retrieve active room details and capacity', () => {
    const date = new Date('2026-10-12T09:30:00');
    const result = calculateActiveSchedule(date, mockSlots, campusRooms, mockFaculty);

    expect(result.activeRoom).not.toBeNull();
    expect(result.activeRoom?.id).toBe('LT-1');
    expect(result.activeRoom?.capacity).toBe(120);
    expect(result.activeRoom?.building).toBe('JIET Main Quadrangle');
    expect(result.activeRoom?.wing).toBe('East');
  });

  it('3. should identify upcoming class and minutes until next during tea break (11:05)', () => {
    const date = new Date('2026-10-12T11:05:00');
    const result = calculateActiveSchedule(date, mockSlots, campusRooms, mockFaculty);

    expect(result.status).toBe('BETWEEN_CLASSES');
    expect(result.activeSlot).toBeNull();
    expect(result.nextSlot?.roomId).toBe('LT-3');
    expect(result.nextSlot?.startTime).toBe('11:15');
    expect(result.minutesUntilNext).toBe(10); // 11:15 - 11:05 = 10 mins
  });

  it('4. should return WEEKEND_OFF status on Sunday with zero active classes', () => {
    // 2026-10-18 is a Sunday
    const date = new Date('2026-10-18T10:00:00');
    const result = calculateActiveSchedule(date, mockSlots, campusRooms, mockFaculty);

    expect(result.status).toBe('WEEKEND_OFF');
    expect(result.activeSlot).toBeNull();
    expect(result.activeRoom).toBeNull();
  });

  it('5. should identify DAY_FINISHED status after all classes have concluded for the day', () => {
    const date = new Date('2026-10-12T17:30:00');
    const result = calculateActiveSchedule(date, mockSlots, campusRooms, mockFaculty);

    expect(result.status).toBe('DAY_FINISHED');
    expect(result.activeSlot).toBeNull();
    expect(result.nextSlot).toBeNull();
  });

  it('6. should solve 3D shortest path from campus gate to ground room LT-1 and multi-floor LAB-3', () => {
    const graph = new Map<string, NavNode>([
      ['gate', { id: 'gate', coords: [0, 0.1, 36], neighbors: [{ id: 'courtyard', weight: 26 }] }],
      ['courtyard', { id: 'courtyard', coords: [0, 0.1, 10], neighbors: [{ id: 'gate', weight: 26 }, { id: 'lt1', weight: 20 }, { id: 'stair_west', weight: 20 }] }],
      ['lt1', { id: 'lt1', coords: [20, 1.0, 7], neighbors: [{ id: 'courtyard', weight: 20 }] }],
      ['stair_west', { id: 'stair_west', coords: [-14, 0.1, 0], neighbors: [{ id: 'courtyard', weight: 20 }, { id: 'stair_west_1st', weight: 3.5 }] }],
      ['stair_west_1st', { id: 'stair_west_1st', coords: [-14, 3.6, 0], neighbors: [{ id: 'stair_west', weight: 3.5 }, { id: 'lab3', weight: 10 }] }],
      ['lab3', { id: 'lab3', coords: [-20, 3.6, 7], neighbors: [{ id: 'stair_west_1st', weight: 10 }] }],
    ]);

    // Ground floor route to LT-1
    const groundPath = findDijkstraPath('gate', 'lt1', graph);
    expect(groundPath).not.toBeNull();
    expect(groundPath?.length).toBe(3);
    expect(groundPath?.[0]).toEqual([0, 0.1, 36]);
    expect(groundPath?.[2]).toEqual([20, 1.0, 7]);

    // Multi-floor route to First Floor LAB-3
    const multiFloorPath = findDijkstraPath('gate', 'lab3', graph);
    expect(multiFloorPath).not.toBeNull();
    expect(multiFloorPath?.length).toBe(5);
    // Verifies vertical transition through staircase at index 3
    expect(multiFloorPath?.[3][1]).toBe(3.6);
  });
});
