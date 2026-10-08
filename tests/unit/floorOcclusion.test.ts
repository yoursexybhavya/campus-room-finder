import { describe, it, expect } from 'vitest';
import { isPointOccludedByFirstFloor } from '../../src/utils/floorOcclusion';

describe('Architectural Floor Occlusion Utility Tests', () => {
  const slabElevation = 5.65; // 2.65m first floor slab + 3.0m exploded elevation

  it('should occlude a Ground Floor room when viewed from directly overhead', () => {
    // Camera directly above East wing at y=25
    const cameraPos: [number, number, number] = [20, 25, 0];
    const roomPos: [number, number, number] = [20, 0, 0]; // LT-9 ground floor room

    const occluded = isPointOccludedByFirstFloor(roomPos, cameraPos, slabElevation);
    expect(occluded).toBe(true);
  });

  it('should occlude Ground Floor rooms in North, South, East, and West wings from camera above each wing', () => {
    // North wing ground room (e.g. LAB-1 at z=-22) viewed from camera above North wing
    expect(isPointOccludedByFirstFloor([0, 0, -22], [0, 22, -22], slabElevation)).toBe(true);

    // South wing ground room (e.g. LT-1 at z=22) viewed from camera above South wing
    expect(isPointOccludedByFirstFloor([0, 0, 22], [0, 22, 22], slabElevation)).toBe(true);

    // East wing ground room (e.g. LT-9 at x=20) viewed from camera above East wing
    expect(isPointOccludedByFirstFloor([20, 0, 0], [20, 22, 0], slabElevation)).toBe(true);

    // West wing ground room (e.g. CHEM-LAB at x=-20) viewed from camera above West wing
    expect(isPointOccludedByFirstFloor([-20, 0, 0], [-20, 22, 0], slabElevation)).toBe(true);
  });

  it('should NOT occlude points inside the open central courtyard lawn', () => {
    const cameraPos: [number, number, number] = [0, 30, 0];
    const courtyardPoint: [number, number, number] = [0, 0, 0]; // Center of courtyard

    const occluded = isPointOccludedByFirstFloor(courtyardPoint, cameraPos, slabElevation);
    expect(occluded).toBe(false);
  });

  it('should NOT occlude when camera is tilted down below the First Floor slab level', () => {
    // Camera looking horizontally into the gap between floors (y = 4.0 <= slabElevation 5.65)
    const cameraPos: [number, number, number] = [25, 4.0, 25];
    const roomPos: [number, number, number] = [20, 0, 0];

    const occluded = isPointOccludedByFirstFloor(roomPos, cameraPos, slabElevation);
    expect(occluded).toBe(false);
  });

  it('should NOT occlude points on or above the slab (First Floor objects)', () => {
    const cameraPos: [number, number, number] = [28, 22, 32];
    const firstFloorRoomPos: [number, number, number] = [20, 6.0, 0];

    const occluded = isPointOccludedByFirstFloor(firstFloorRoomPos, cameraPos, slabElevation);
    expect(occluded).toBe(false);
  });

  it('should NOT occlude points outside the building wings outer perimeter', () => {
    const cameraPos: [number, number, number] = [0, 30, 0];
    const outsidePoint: [number, number, number] = [40, 0, 0]; // Far outside East wing

    const occluded = isPointOccludedByFirstFloor(outsidePoint, cameraPos, slabElevation);
    expect(occluded).toBe(false);
  });
});
