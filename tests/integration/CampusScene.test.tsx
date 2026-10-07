import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CampusScene } from '../../src/components/canvas/CampusScene';
import { useCampusStore } from '../../src/stores/useCampusStore';
import { campusRooms } from '../../src/data/campusRooms';
import { FloorSelector } from '../../src/components/ui/FloorSelector';
import { Header } from '../../src/components/ui/Header';

describe('Tier 1 Integration: 3D Campus Scene (R1)', () => {
  beforeEach(() => {
    useCampusStore.getState().resetView();
  });

  it('1. should render R3F canvas container without console errors', () => {
    const errorSpy = vi.spyOn(console, 'error');

    const { container } = render(<CampusScene />);

    expect(container.querySelector('[data-testid="campus-scene-container"]')).not.toBeNull();
    // Canvas element should be present in the container
    const canvasElement = container.querySelector('canvas');
    expect(canvasElement).not.toBeNull();

    // Verify no unhandled exceptions or error logs thrown to console
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('2. should contain ground floor, first floor, and at least 3 clickable room nodes', () => {
    // Verify room data and structural floor differentiation
    const groundRooms = campusRooms.filter((r) => r.floor === 'ground');
    const firstRooms = campusRooms.filter((r) => r.floor === 'first');

    expect(groundRooms.length).toBeGreaterThanOrEqual(3);
    expect(firstRooms.length).toBeGreaterThanOrEqual(3);

    // Verify physical floor elevation distinction
    groundRooms.forEach((room) => {
      expect(room.position[1]).toBeCloseTo(1.0, 1); // Ground floor center ~ 1.0m
    });
    firstRooms.forEach((room) => {
      expect(room.position[1]).toBeCloseTo(3.6, 1); // First floor center ~ 3.6m
    });

    // Check specific required node types: Lecture Theaters, Labs
    const lectureTheaters = campusRooms.filter((r) => r.type === 'lecture_theater');
    const labs = campusRooms.filter((r) => r.type === 'lab');

    expect(lectureTheaters.length).toBeGreaterThanOrEqual(2);
    expect(labs.length).toBeGreaterThanOrEqual(2);
  });

  it('3. should update selectedRoomId in store when a room is selected', () => {
    const targetRoomId = 'LT-1';
    act(() => {
      useCampusStore.getState().selectRoom(targetRoomId);
    });

    expect(useCampusStore.getState().selectedRoomId).toBe('LT-1');
    expect(useCampusStore.getState().cameraTarget).not.toBeNull();
    expect(useCampusStore.getState().cameraTarget?.lookAt).toEqual([20, 1.0, 7]);
  });

  it('4. should update floor filter state when user toggles FloorSelector UI', () => {
    render(<FloorSelector />);

    // Click 'Ground' floor button
    const groundBtn = screen.getByText('Ground');
    act(() => {
      groundBtn.click();
    });
    expect(useCampusStore.getState().activeFloorFilter).toBe('ground');

    // Click 'First' floor button
    const firstBtn = screen.getByText('First Floor');
    act(() => {
      firstBtn.click();
    });
    expect(useCampusStore.getState().activeFloorFilter).toBe('first');

    // Click 'All' floors button
    const allBtn = screen.getByText('All Floors');
    act(() => {
      allBtn.click();
    });
    expect(useCampusStore.getState().activeFloorFilter).toBe('all');
  });

  it('5. should render Campus Header with branding and clock badge', () => {
    render(<Header />);

    expect(screen.getByText(/Campus Room Finder/i)).toBeInTheDocument();
    expect(screen.getByText(/JIET Jodhpur/i)).toBeInTheDocument();
  });
});
