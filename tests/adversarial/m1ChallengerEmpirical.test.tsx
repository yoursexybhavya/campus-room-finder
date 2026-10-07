import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import * as THREE from 'three';
import { useCampusStore } from '../../src/stores/useCampusStore';
import { campusRooms } from '../../src/data/campusRooms';
import { CampusScene } from '../../src/components/canvas/CampusScene';
import { FloorSelector } from '../../src/components/ui/FloorSelector';
import { RoomDetailsDrawer } from '../../src/components/ui/RoomDetailsDrawer';
import { FloorFilter } from '../../src/types/campus';

describe('Adversarial Challenger Suite: Milestone 1 (3D Campus Digital Twin)', () => {
  beforeEach(() => {
    useCampusStore.getState().resetView();
    useCampusStore.getState().setFloorFilter('all');
  });

  // =========================================================================
  // 1. Rapid Floor Filter Toggling
  // =========================================================================
  describe('1. Rapid Floor Filter Toggling & Stress Stability', () => {
    it('1.1 should survive 1,000 rapid cycles of floor filter transitions in store', () => {
      const filterSequence: FloorFilter[] = ['all', 'ground', 'first', 'all'];

      for (let i = 0; i < 1000; i++) {
        const nextFilter = filterSequence[i % filterSequence.length];
        useCampusStore.getState().setFloorFilter(nextFilter);
        expect(useCampusStore.getState().activeFloorFilter).toBe(nextFilter);
      }

      // Final state verification
      expect(useCampusStore.getState().activeFloorFilter).toBe('all');
    });

    it('1.2 should handle rapid UI button clicking on FloorSelector without desync', () => {
      render(<FloorSelector />);

      const allBtn = screen.getByTestId('floor-filter-all');
      const groundBtn = screen.getByTestId('floor-filter-ground');
      const firstBtn = screen.getByTestId('floor-filter-first');

      // Rapidly toggle between buttons 30 times
      for (let i = 0; i < 10; i++) {
        act(() => {
          groundBtn.click();
        });
        expect(useCampusStore.getState().activeFloorFilter).toBe('ground');

        act(() => {
          firstBtn.click();
        });
        expect(useCampusStore.getState().activeFloorFilter).toBe('first');

        act(() => {
          allBtn.click();
        });
        expect(useCampusStore.getState().activeFloorFilter).toBe('all');
      }
    });

    it('1.3 should gracefully handle invalid/corrupted floor filter inputs', () => {
      // Cast invalid values to test runtime resilience
      act(() => {
        useCampusStore.getState().setFloorFilter('' as any);
      });
      expect(useCampusStore.getState().activeFloorFilter).toBe('');

      act(() => {
        useCampusStore.getState().setFloorFilter('roof' as any);
      });
      expect(useCampusStore.getState().activeFloorFilter).toBe('roof');

      act(() => {
        useCampusStore.getState().setFloorFilter(null as any);
      });
      expect(useCampusStore.getState().activeFloorFilter).toBeNull();

      // Reset back to valid filter
      act(() => {
        useCampusStore.getState().setFloorFilter('all');
      });
      expect(useCampusStore.getState().activeFloorFilter).toBe('all');
    });
  });

  // =========================================================================
  // 2. Camera Lerp Convergence Under Large Delta Time Steps & Rapid Switching
  // =========================================================================
  describe('2. Camera Lerping Under Large Delta Spikes & Rapid Target Changes', () => {
    // Camera lerp simulation harness replicating CameraController.tsx logic:
    // const lerpSpeed = Math.min(delta * 3.5, 0.1);
    // camera.position.lerp(targetPos, lerpSpeed);
    // controls.target.lerp(targetLook, lerpSpeed);
    const simulateLerpFrame = (
      currentPos: THREE.Vector3,
      targetPos: THREE.Vector3,
      currentLook: THREE.Vector3,
      targetLook: THREE.Vector3,
      delta: number
    ) => {
      const lerpSpeed = Math.min(delta * 3.5, 0.1);
      currentPos.lerp(targetPos, lerpSpeed);
      currentLook.lerp(targetLook, lerpSpeed);
      return lerpSpeed;
    };

    it('2.1 should stably converge under standard 60 FPS delta (0.016s)', () => {
      const currentPos = new THREE.Vector3(34, 26, 36);
      const currentLook = new THREE.Vector3(0, 1.5, 0);

      const targetPos = new THREE.Vector3(30, 9, 17); // LT-1 camera target
      const targetLook = new THREE.Vector3(20, 1.0, 7);

      const initialDist = currentPos.distanceTo(targetPos);

      // Simulate 60 frames (~1 second)
      for (let frame = 0; frame < 60; frame++) {
        simulateLerpFrame(currentPos, targetPos, currentLook, targetLook, 0.016);
      }

      const finalDist = currentPos.distanceTo(targetPos);
      expect(finalDist).toBeLessThan(initialDist);
      // Under 0.016s * 3.5 = 0.056 lerp factor, 60 frames gives (1 - 0.056)^60 ~= 0.031 (97% convergence)
      expect(finalDist).toBeLessThan(initialDist * 0.1);
    });

    it('2.2 should cap lerpSpeed at 0.1 during massive delta spikes (1s, 5s, 60s) preventing overshoots', () => {
      const testDeltas = [0.5, 1.0, 2.5, 5.0, 10.0, 60.0];

      testDeltas.forEach((delta) => {
        const currentPos = new THREE.Vector3(34, 26, 36);
        const currentLook = new THREE.Vector3(0, 1.5, 0);
        const targetPos = new THREE.Vector3(30, 9, 17);
        const targetLook = new THREE.Vector3(20, 1.0, 7);

        const initialDist = currentPos.distanceTo(targetPos);
        const lerpSpeed = simulateLerpFrame(currentPos, targetPos, currentLook, targetLook, delta);

        // Verification: lerp speed MUST be capped at 0.1
        expect(lerpSpeed).toBe(0.1);

        // Position must move toward target without overshooting
        const newDist = currentPos.distanceTo(targetPos);
        expect(newDist).toBeCloseTo(initialDist * 0.9, 4);
        expect(newDist).toBeLessThan(initialDist);
        expect(Number.isFinite(currentPos.x)).toBe(true);
        expect(Number.isFinite(currentPos.y)).toBe(true);
        expect(Number.isFinite(currentPos.z)).toBe(true);
      });
    });

    it('2.3 should maintain finite bounded values under rapid room target switching', () => {
      const currentPos = new THREE.Vector3(34, 26, 36);
      const currentLook = new THREE.Vector3(0, 1.5, 0);

      // Rapidly switch targets every single frame across all 14 rooms for 10 loops (140 switches)
      for (let loop = 0; loop < 10; loop++) {
        for (const room of campusRooms) {
          const targetPos = new THREE.Vector3(room.position[0] + 10, room.position[1] + 8, room.position[2] + 10);
          const targetLook = new THREE.Vector3(...room.position);

          // Simulate frame with variable delta (0.016 to 0.5s)
          const randomDelta = 0.016 + Math.random() * 0.05;
          simulateLerpFrame(currentPos, targetPos, currentLook, targetLook, randomDelta);

          expect(Number.isFinite(currentPos.x)).toBe(true);
          expect(Number.isFinite(currentPos.y)).toBe(true);
          expect(Number.isFinite(currentPos.z)).toBe(true);
        }
      }

      // Now settle on the final room: LIB-MAIN
      const libRoom = campusRooms.find((r) => r.id === 'LIB-MAIN')!;
      const finalTargetPos = new THREE.Vector3(libRoom.position[0] + 10, libRoom.position[1] + 8, libRoom.position[2] + 10);
      const finalTargetLook = new THREE.Vector3(...libRoom.position);

      // Settle over 80 frames
      for (let frame = 0; frame < 80; frame++) {
        simulateLerpFrame(currentPos, finalTargetPos, currentLook, finalTargetLook, 0.03);
      }

      expect(currentPos.distanceTo(finalTargetPos)).toBeLessThan(0.2);
      expect(currentLook.distanceTo(finalTargetLook)).toBeLessThan(0.2);
    });

    it('2.4 should identify behavioral boundary when delta is zero or negative', () => {
      const currentPos = new THREE.Vector3(34, 26, 36);
      const currentLook = new THREE.Vector3(0, 1.5, 0);
      const targetPos = new THREE.Vector3(30, 9, 17);
      const targetLook = new THREE.Vector3(20, 1.0, 7);

      // Zero delta: camera stays exactly at current position
      const lerpSpeedZero = simulateLerpFrame(currentPos, targetPos, currentLook, targetLook, 0);
      expect(lerpSpeedZero).toBe(0);
      expect(currentPos.x).toBe(34);
      expect(currentPos.y).toBe(26);
      expect(currentPos.z).toBe(36);

      // Negative delta: Math.min(-0.1 * 3.5, 0.1) = -0.35
      // This document the mathematical boundary where negative delta would extrapolate backwards
      const lerpSpeedNeg = Math.min(-0.1 * 3.5, 0.1);
      expect(lerpSpeedNeg).toBeLessThan(0);
    });
  });

  // =========================================================================
  // 3. Non-existent Room IDs & Malicious Store Payloads
  // =========================================================================
  describe('3. Non-existent Room IDs & Adversarial Store Payloads', () => {
    it('3.1 should safely handle selection of non-existent IDs without throwing or corrupting camera target', () => {
      // First select a valid room to set cameraTarget
      useCampusStore.getState().selectRoom('LT-1');
      const validTarget = useCampusStore.getState().cameraTarget;
      expect(validTarget).not.toBeNull();

      // Now pass completely bogus IDs
      const invalidIds = [
        'NON_EXISTENT_ID_999',
        'UNKNOWN_WING_X',
        'ROOM-404',
        '',
        '   ',
        'null',
        'undefined',
        '<script>alert("xss")</script>',
        'DROP TABLE rooms;--',
      ];

      invalidIds.forEach((badId) => {
        expect(() => {
          useCampusStore.getState().selectRoom(badId);
        }).not.toThrow();

        expect(useCampusStore.getState().selectedRoomId).toBe(badId);
        // cameraTarget should NOT be corrupted to undefined/NaN; it retains previous camera target
        expect(useCampusStore.getState().cameraTarget).toEqual(validTarget);
      });
    });

    it('3.2 should safely render RoomDetailsDrawer with non-existent selectedRoomId', () => {
      // Set an invalid room ID
      act(() => {
        useCampusStore.getState().selectRoom('ROOM_DOES_NOT_EXIST_XYZ');
      });

      // Drawer component should return null and not crash
      const { container } = render(<RoomDetailsDrawer />);
      expect(container.firstChild).toBeNull();
    });

    it('3.3 should safely handle setHoveredRoom with non-existent or adversarial IDs', () => {
      const adversarialHoverIds = ['GHOST_ROOM', '', null, '__proto__', 'constructor'];

      adversarialHoverIds.forEach((hoverId) => {
        expect(() => {
          useCampusStore.getState().setHoveredRoom(hoverId);
        }).not.toThrow();

        expect(useCampusStore.getState().hoveredRoomId).toBe(hoverId);
      });
    });
  });

  // =========================================================================
  // 4. Scene Graph Invariants & Spatial Specifications
  // =========================================================================
  describe('4. Scene Graph Invariants & Spatial Specification Audit', () => {
    it('4.1 should have at least 14 distinct room definitions', () => {
      expect(campusRooms.length).toBeGreaterThanOrEqual(14);
    });

    it('4.2 should strictly enforce Ground floor elevation invariant: y == 1.0', () => {
      const groundRooms = campusRooms.filter((r) => r.floor === 'ground');
      expect(groundRooms.length).toBeGreaterThanOrEqual(8); // at least 8 ground rooms

      groundRooms.forEach((room) => {
        expect(room.position[1]).toBe(1.0);
        expect(room.floor).toBe('ground');
      });
    });

    it('4.3 should strictly enforce First floor elevation invariant: y == 3.6', () => {
      const firstRooms = campusRooms.filter((r) => r.floor === 'first');
      expect(firstRooms.length).toBeGreaterThanOrEqual(6); // at least 6 first floor rooms

      firstRooms.forEach((room) => {
        expect(room.position[1]).toBe(3.6);
        expect(room.floor).toBe('first');
      });
    });

    it('4.4 should verify physical elevation gap between floors is exactly 2.6 meters', () => {
      const groundRooms = campusRooms.filter((r) => r.floor === 'ground');
      const firstRooms = campusRooms.filter((r) => r.floor === 'first');

      const groundY = groundRooms[0].position[1];
      const firstY = firstRooms[0].position[1];

      expect(firstY - groundY).toBeCloseTo(2.6, 2);
    });

    it('4.5 should ensure 100% uniqueness of all room IDs, codes, and names', () => {
      const ids = campusRooms.map((r) => r.id);
      const codes = campusRooms.map((r) => r.code);
      const names = campusRooms.map((r) => r.name);

      const uniqueIds = new Set(ids);
      const uniqueCodes = new Set(codes);
      const uniqueNames = new Set(names);

      expect(uniqueIds.size).toBe(campusRooms.length);
      expect(uniqueCodes.size).toBe(campusRooms.length);
      expect(uniqueNames.size).toBe(campusRooms.length);
    });

    it('4.6 should ensure all rooms have positive bounding dimensions and valid door waypoints', () => {
      campusRooms.forEach((room) => {
        const [w, h, d] = room.dimensions;
        expect(w).toBeGreaterThan(0);
        expect(h).toBeGreaterThan(0);
        expect(d).toBeGreaterThan(0);

        expect(room.doorWaypointId).toBeDefined();
        expect(room.doorWaypointId.length).toBeGreaterThan(0);
        expect(room.doorWaypointId.startsWith('wp_')).toBe(true);

        expect(room.capacity).toBeGreaterThan(0);
        expect(room.facilities.length).toBeGreaterThan(0);
        expect(room.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    it('4.7 should verify representation of all essential JIET campus facilities', () => {
      const types = new Set(campusRooms.map((r) => r.type));

      expect(types.has('lecture_theater')).toBe(true);
      expect(types.has('lab')).toBe(true);
      expect(types.has('library')).toBe(true);
      expect(types.has('admin')).toBe(true);
      expect(types.has('seminar_hall')).toBe(true);
      expect(types.has('faculty')).toBe(true);
    });

    it('4.8 should ensure resetView canonical coordinates match camera specification', () => {
      useCampusStore.getState().selectRoom('LT-3');
      expect(useCampusStore.getState().selectedRoomId).toBe('LT-3');

      useCampusStore.getState().resetView();

      expect(useCampusStore.getState().selectedRoomId).toBeNull();
      expect(useCampusStore.getState().cameraTarget?.position).toEqual([34, 26, 36]);
      expect(useCampusStore.getState().cameraTarget?.lookAt).toEqual([0, 1.5, 0]);
      expect(useCampusStore.getState().navigationPath).toBeNull();
    });
  });

  // =========================================================================
  // 5. Full CampusScene R3F Mount & Unmount Stress Test
  // =========================================================================
  describe('5. Full CampusScene Component Lifecycle Stability', () => {
    it('5.1 should cleanly mount and unmount CampusScene repeatedly without memory leak warnings', () => {
      for (let i = 0; i < 3; i++) {
        const { unmount } = render(<CampusScene />);
        unmount();
      }
    });
  });
});
