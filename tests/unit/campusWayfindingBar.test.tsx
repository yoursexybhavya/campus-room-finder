import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { CampusWayfindingBar } from '../../src/components/ui/CampusWayfindingBar';
import { useCampusStore } from '../../src/stores/useCampusStore';
import { useThemeStore } from '../../src/stores/useThemeStore';

describe('CampusWayfindingBar 1-Tap Navigation & Mobile Wayfinding Tests', () => {
  beforeEach(() => {
    act(() => {
      useCampusStore.getState().resetView();
      useCampusStore.getState().selectRoom(null);
      useCampusStore.getState().setUserOriginId('gate');
      useCampusStore.getState().clearNavigationPath();
      useCampusStore.getState().setIsNavigating(false);
      useCampusStore.getState().setIsWayfindingOpen(true);
      useThemeStore.getState().setTheme('dark');
    });
  });

  it('1. should render expanded wayfinding card with Where You Are (From) and Where You Want To Go (To)', () => {
    render(<CampusWayfindingBar />);

    expect(screen.getByText(/Campus Wayfinding/i)).toBeInTheDocument();
    expect(screen.getByText(/Where You Are \(From\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Where You Want To Go \(To\)/i)).toBeInTheDocument();
  });

  it('2. should calculate 3D route in exactly 1 tap when clicking a quick destination recommendation', () => {
    render(<CampusWayfindingBar />);

    expect(useCampusStore.getState().navigationPath).toBeNull();

    // Click quick destination recommendation for LT-1
    const lt1Btn = screen.getByTestId('quick-dest-LT-1');
    act(() => {
      lt1Btn.click();
    });

    // 1 TAP: Room is selected, navigationPath is generated!
    expect(useCampusStore.getState().selectedRoomId).toBe('LT-1');
    expect(useCampusStore.getState().navigationPath).not.toBeNull();
    expect(useCampusStore.getState().navigationPath!.length).toBeGreaterThan(0);

    // Route summary should be visible
    expect(screen.getByTestId('wayfinding-route-summary')).toBeInTheDocument();
    expect(screen.getByTestId('wayfinding-start-nav-btn')).toBeInTheDocument();
  });

  it('3. should update origin and recalculate 3D route in 1 tap when clicking quick start preset', () => {
    act(() => {
      useCampusStore.getState().selectRoom('LT-1');
      useCampusStore.getState().navigateToRoom('LT-1', 'gate');
    });

    render(<CampusWayfindingBar />);

    expect(useCampusStore.getState().userOriginId).toBe('gate');

    // Click quick start preset for Central Knowledge Library
    const libPresetBtn = screen.getByTestId('origin-preset-wp_lib_main');
    act(() => {
      libPresetBtn.click();
    });

    // 1 TAP: Origin updated to Library, route recalculated!
    expect(useCampusStore.getState().userOriginId).toBe('wp_lib_main');
    expect(useCampusStore.getState().navigationPath).not.toBeNull();
  });

  it('4. should swap origin and destination in exactly 1 tap', () => {
    act(() => {
      useCampusStore.getState().setUserOriginId('LAB-1');
      useCampusStore.getState().selectRoom('LT-1');
      useCampusStore.getState().navigateToRoom('LT-1', 'LAB-1');
    });

    render(<CampusWayfindingBar />);

    const swapBtn = screen.getByTestId('wayfinding-swap-btn');
    act(() => {
      swapBtn.click();
    });

    // Origin and destination are swapped
    expect(useCampusStore.getState().userOriginId).toBe('LT-1');
    expect(useCampusStore.getState().selectedRoomId).toBe('LAB-1');
    expect(useCampusStore.getState().navigationPath).not.toBeNull();
  });

  it('5. should launch turn-by-turn navigation HUD in 1 tap from wayfinding bar', () => {
    act(() => {
      useCampusStore.getState().selectRoom('LT-1');
      useCampusStore.getState().navigateToRoom('LT-1', 'gate');
    });

    render(<CampusWayfindingBar />);

    const startBtn = screen.getByTestId('wayfinding-start-nav-btn');
    act(() => {
      startBtn.click();
    });

    expect(useCampusStore.getState().isNavigating).toBe(true);
    expect(useCampusStore.getState().currentStepIndex).toBe(0);
  });

  it('6. should clear navigation route in 1 tap', () => {
    act(() => {
      useCampusStore.getState().selectRoom('LT-1');
      useCampusStore.getState().navigateToRoom('LT-1', 'gate');
    });

    render(<CampusWayfindingBar />);

    const clearBtn = screen.getByTestId('wayfinding-clear-btn');
    act(() => {
      clearBtn.click();
    });

    expect(useCampusStore.getState().navigationPath).toBeNull();
    expect(useCampusStore.getState().selectedRoomId).toBeNull();
  });
});
