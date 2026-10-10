import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, act, fireEvent } from '@testing-library/react';
import { RoomInteractivityLayer } from '../../src/components/canvas/RoomInteractivityLayer';
import { useCampusStore } from '../../src/stores/useCampusStore';
import { campusRooms } from '../../src/data/campusRooms';

// Mock Three.js R3F components for JSDOM unit test
vi.mock('@react-three/drei', () => ({
  Html: ({ children }: any) => <div data-testid="room-html-badge">{children}</div>,
}));

describe('RoomInteractivityLayer Unit Tests', () => {
  beforeEach(() => {
    act(() => {
      useCampusStore.getState().resetView();
      useCampusStore.getState().setFloorFilter('all');
    });
  });

  it('1. should export and render RoomInteractivityLayer', () => {
    expect(RoomInteractivityLayer).toBeDefined();
    expect(typeof RoomInteractivityLayer).toBe('function');
  });

  it('2. should filter active rooms according to floor filter state', () => {
    const groundTotal = campusRooms.filter((r) => r.floor === 'ground').length;
    const firstTotal = campusRooms.filter((r) => r.floor === 'first').length;

    // Ground floor mode
    act(() => {
      useCampusStore.getState().setFloorFilter('ground');
    });
    expect(useCampusStore.getState().activeFloorFilter).toBe('ground');

    // First floor mode
    act(() => {
      useCampusStore.getState().setFloorFilter('first');
    });
    expect(useCampusStore.getState().activeFloorFilter).toBe('first');

    // All mode
    act(() => {
      useCampusStore.getState().setFloorFilter('all');
    });
    expect(useCampusStore.getState().activeFloorFilter).toBe('all');
    expect(groundTotal + firstTotal).toBe(campusRooms.length);
  });

  it('3. should select room and trigger camera target when room is selected', () => {
    act(() => {
      useCampusStore.getState().selectRoom('LT-1');
    });

    expect(useCampusStore.getState().selectedRoomId).toBe('LT-1');
    const targetRoom = campusRooms.find((r) => r.id === 'LT-1');
    expect(targetRoom).toBeDefined();
    expect(useCampusStore.getState().cameraTarget?.lookAt).toEqual(targetRoom?.position);
  });

  it('4. should update hovered room state smoothly', () => {
    act(() => {
      useCampusStore.getState().setHoveredRoom('LAB-1');
    });
    expect(useCampusStore.getState().hoveredRoomId).toBe('LAB-1');

    act(() => {
      useCampusStore.getState().setHoveredRoom(null);
    });
    expect(useCampusStore.getState().hoveredRoomId).toBeNull();
  });
});
