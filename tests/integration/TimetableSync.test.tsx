import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { RoomDetailsDrawer } from '../../src/components/ui/RoomDetailsDrawer';
import { useCampusStore } from '../../src/stores/useCampusStore';
import { campusRooms } from '../../src/data/campusRooms';
import { calculateActiveSchedule, mockSlots } from '../helpers/timetable';

describe('Tier 1 Integration: Timetable Sync & Room Inspection (R2)', () => {
  beforeEach(() => {
    useCampusStore.getState().resetView();
  });

  it('1. should not render RoomDetailsDrawer when no room is selected', () => {
    const { container } = render(<RoomDetailsDrawer />);
    expect(container.firstChild).toBeNull();
  });

  it('2. should display room specifications, capacity, and faculty when a room is selected', () => {
    render(<RoomDetailsDrawer />);

    act(() => {
      useCampusStore.getState().selectRoom('LT-1');
    });

    expect(screen.getByTestId('room-details-drawer')).toBeInTheDocument();
    expect(screen.getByText('Lecture Theater 9 (LT-9)')).toBeInTheDocument();
    expect(screen.getByText('LT-9')).toBeInTheDocument();
    expect(screen.getByText('120 Students')).toBeInTheDocument();
    expect(screen.getByText('Dr. Rajesh Sharma')).toBeInTheDocument();
    expect(screen.getByText(/JIET Main Quadrangle/i)).toBeInTheDocument();
    expect(screen.getByText(/Ground Floor/i)).toBeInTheDocument();
  });

  it('3. should close drawer when close button is clicked', () => {
    render(<RoomDetailsDrawer />);

    act(() => {
      useCampusStore.getState().selectRoom('LT-2');
    });
    expect(screen.getByText('Lecture Theater 10 (LT-10)')).toBeInTheDocument();

    const closeBtn = screen.getByTestId('close-room-drawer-btn');
    act(() => {
      closeBtn.click();
    });

    expect(useCampusStore.getState().selectedRoomId).toBeNull();
  });

  it('4. should update camera target when "Center in 3D" button is clicked', () => {
    render(<RoomDetailsDrawer />);

    act(() => {
      useCampusStore.getState().selectRoom('LAB-1');
    });

    const centerBtn = screen.getByText('Center in 3D');
    act(() => {
      centerBtn.click();
    });

    const lab1 = campusRooms.find((r) => r.id === 'LAB-1')!;
    expect(useCampusStore.getState().cameraTarget?.lookAt).toEqual(lab1.position);
  });

  it('5. should synchronize timetable active class calculation with room selection', () => {
    // Datetime: Monday 09:15
    const mondayTime = new Date('2026-10-12T09:15:00');
    const schedule = calculateActiveSchedule(mondayTime, mockSlots, campusRooms);

    expect(schedule.status).toBe('IN_SESSION');
    expect(schedule.activeSlot?.roomId).toBe('LT-1');

    act(() => {
      useCampusStore.getState().selectRoom(schedule.activeSlot!.roomId);
    });

    render(<RoomDetailsDrawer />);
    expect(screen.getByText('Lecture Theater 9 (LT-9)')).toBeInTheDocument();
  });
});
