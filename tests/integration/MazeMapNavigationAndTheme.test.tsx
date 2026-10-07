import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useCampusStore } from '../../src/stores/useCampusStore';
import { useThemeStore } from '../../src/stores/useThemeStore';
import { useEasterEggStore } from '../../src/stores/useEasterEggStore';
import { campusRooms } from '../../src/data/campusRooms';
import { FloorSelector } from '../../src/components/ui/FloorSelector';
import { Header } from '../../src/components/ui/Header';
import { RoomDetailsDrawer } from '../../src/components/ui/RoomDetailsDrawer';
import { findDetailedPathToRoom } from '../../src/services/routing/pathfinding';
import { WAYPOINTS_MAP } from '../../src/data/waypoints';

describe('MazeMap Navigation, Authentic Architecture & Theme Integration', () => {
  beforeEach(() => {
    useCampusStore.getState().resetView();
    useCampusStore.getState().selectRoom(null);
    useCampusStore.getState().setFloorFilter('all');
    useCampusStore.getState().setViewMode('3D');
    useThemeStore.getState().setTheme('dark');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. MazeMap-Inspired Floor Selection & View Modes', () => {
    it('1.1 should render vertical Z-level indicators (1F, GF, ALL) and floor counts', () => {
      render(<FloorSelector />);

      expect(screen.getByText('1F')).toBeInTheDocument();
      expect(screen.getByText('GF')).toBeInTheDocument();
      expect(screen.getByText('ALL')).toBeInTheDocument();

      expect(screen.getByText('First Floor')).toBeInTheDocument();
      expect(screen.getByText('Ground')).toBeInTheDocument();
      expect(screen.getByText('All Floors')).toBeInTheDocument();

      expect(screen.getByTestId('floor-filter-first')).toBeInTheDocument();
      expect(screen.getByTestId('floor-filter-ground')).toBeInTheDocument();
      expect(screen.getByTestId('floor-filter-all')).toBeInTheDocument();
    });

    it('1.2 should toggle 2D and 3D view modes with accurate camera coordinates', () => {
      render(<FloorSelector />);

      const btn2D = screen.getByTestId('view-mode-2d-btn');
      act(() => {
        btn2D.click();
      });

      expect(useCampusStore.getState().viewMode).toBe('2D');
      expect(useCampusStore.getState().cameraTarget?.position[1]).toBeCloseTo(52, 0);
      expect(useCampusStore.getState().cameraTarget?.lookAt).toEqual([0, 0, 0]);

      const btn3D = screen.getByTestId('view-mode-3d-btn');
      act(() => {
        btn3D.click();
      });

      expect(useCampusStore.getState().viewMode).toBe('3D');
      expect(useCampusStore.getState().cameraTarget?.position).toEqual([34, 26, 36]);
      expect(useCampusStore.getState().cameraTarget?.lookAt).toEqual([0, 1.5, 0]);
    });

    it('1.3 should update store state when selecting ground and first floors', () => {
      render(<FloorSelector />);

      act(() => {
        screen.getByTestId('floor-filter-ground').click();
      });
      expect(useCampusStore.getState().activeFloorFilter).toBe('ground');

      act(() => {
        screen.getByTestId('floor-filter-first').click();
      });
      expect(useCampusStore.getState().activeFloorFilter).toBe('first');
    });
  });

  describe('2. Turn-by-Turn Wayfinding in RoomDetailsDrawer', () => {
    it('2.1 should compute detailed route with steps, distance, and walking time', () => {
      const detailed = findDetailedPathToRoom('LT-1');
      expect(detailed).not.toBeNull();
      expect(detailed!.steps.length).toBeGreaterThanOrEqual(3);
      expect(detailed!.totalDistanceMeters).toBeGreaterThan(0);
      expect(detailed!.estimatedWalkingMinutes).toBeGreaterThanOrEqual(1);

      // First step should start at Main Entrance Gate
      expect(detailed!.steps[0].instruction).toContain('Main Entrance Gate');

      // Final step should arrive at destination code
      expect(detailed!.steps[detailed!.steps.length - 1].instruction).toContain('LT-9');
    });

    it('2.2 should render turn-by-turn wayfinding instructions in RoomDetailsDrawer', () => {
      act(() => {
        useCampusStore.getState().selectRoom('LT-1');
      });

      render(<RoomDetailsDrawer />);

      expect(screen.getByTestId('turn-by-turn-wayfinding')).toBeInTheDocument();
      expect(screen.getByText(/Turn-by-Turn Wayfinding/i)).toBeInTheDocument();
      expect(screen.getByText(/Start at Main Entrance Gate/i)).toBeInTheDocument();
      expect(screen.getByText(/Arrive at destination: LT-9/i)).toBeInTheDocument();
    });

    it('2.3 should toggle 3D route navigation path when Show Route is clicked', () => {
      act(() => {
        useCampusStore.getState().selectRoom('LT-1');
      });

      render(<RoomDetailsDrawer />);

      const routeBtn = screen.getByTestId('navigate-to-room-btn');
      expect(routeBtn).toHaveTextContent('Show Route');

      act(() => {
        routeBtn.click();
      });

      expect(useCampusStore.getState().navigationPath).not.toBeNull();
      expect(routeBtn).toHaveTextContent('Clear Route');

      act(() => {
        routeBtn.click();
      });

      expect(useCampusStore.getState().navigationPath).toBeNull();
      expect(routeBtn).toHaveTextContent('Show Route');
    });
  });

  describe('3. Courtyard Authenticity (Strictly No Fountain)', () => {
    it('3.1 should confirm center_fountain waypoint is replaced with courtyard_center', () => {
      expect(WAYPOINTS_MAP.has('courtyard_center')).toBe(true);

      const center = WAYPOINTS_MAP.get('courtyard_center')!;
      expect(center.coords).toEqual([0, 0.1, 0]);

      // Backward compatibility alias should still resolve
      expect(WAYPOINTS_MAP.has('center_fountain')).toBe(true);
    });

    it('3.2 should compute valid paths passing through central courtyard crossroads', () => {
      const detailed = findDetailedPathToRoom('LIB-MAIN');
      expect(detailed).not.toBeNull();
      expect(detailed!.path.length).toBeGreaterThan(0);
    });
  });

  describe('4. Theme Switching (Light & Dark Mode)', () => {
    it('4.1 should toggle theme between dark and light modes via Header', () => {
      render(<Header />);

      const themeToggle = screen.getByTestId('theme-toggle-btn');
      expect(useThemeStore.getState().theme).toBe('dark');

      act(() => {
        themeToggle.click();
      });

      expect(useThemeStore.getState().theme).toBe('light');

      act(() => {
        themeToggle.click();
      });

      expect(useThemeStore.getState().theme).toBe('dark');
    });

    it('4.2 should support 2D/3D toggle from Header as well', () => {
      render(<Header />);

      const headerViewToggle = screen.getByTestId('header-viewmode-toggle-btn');

      act(() => {
        headerViewToggle.click();
      });

      expect(useCampusStore.getState().viewMode).toBe('2D');

      act(() => {
        headerViewToggle.click();
      });

      expect(useCampusStore.getState().viewMode).toBe('3D');
    });
  });

  describe('5. Robustness & Boundary Verification (Anti-Slop Hardening)', () => {
    it('5.1 should activate Zero-G starfield even when theme is in Light Mode', () => {
      useThemeStore.getState().setTheme('light');
      expect(useThemeStore.getState().theme).toBe('light');

      act(() => {
        useEasterEggStore.getState().activate();
      });

      expect(useEasterEggStore.getState().isActive).toBe(true);
      expect(useEasterEggStore.getState().isStarfieldActive).toBe(true);
      expect(useEasterEggStore.getState().backgroundColor).toBe('#050518');

      act(() => {
        useEasterEggStore.getState().deactivate();
      });
      expect(useEasterEggStore.getState().isActive).toBe(false);
      expect(useEasterEggStore.getState().isStarfieldActive).toBe(false);
    });

    it('5.2 should retain top-down camera lookAt [0, 0, 0] in 2D mode for architectural alignment', () => {
      useCampusStore.getState().setViewMode('2D');
      const target = useCampusStore.getState().cameraTarget;
      expect(target).not.toBeNull();
      expect(target?.lookAt).toEqual([0, 0, 0]);
      expect(target?.position[0]).toBe(0);
      expect(target?.position[1]).toBeGreaterThanOrEqual(50);
      expect(target?.position[2]).toBeLessThanOrEqual(0.1);
      expect(target?.position[2]).toBeGreaterThanOrEqual(0);
    });

    it('5.3 should correctly determine floor levels for all authentic JIET rooms', () => {
      expect(campusRooms.length).toBeGreaterThanOrEqual(24);
      const groundRooms = campusRooms.filter((r) => r.floor === 'ground');
      const firstRooms = campusRooms.filter((r) => r.floor === 'first');
      expect(groundRooms.length).toBeGreaterThanOrEqual(13);
      expect(firstRooms.length).toBeGreaterThanOrEqual(11);
    });
  });
});
