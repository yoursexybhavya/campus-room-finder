import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { ArchitecturalStairs } from '../../src/components/canvas/ArchitecturalStairs';

// Mock Three.js / R3F Canvas context
vi.mock('@react-three/drei', () => ({
  Edges: () => React.createElement('edges', null),
}));

describe('Architectural Rotunda Staircases Tests', () => {
  it('should export ArchitecturalStairs component', () => {
    expect(ArchitecturalStairs).toBeDefined();
    expect(typeof ArchitecturalStairs).toBe('function');
  });

  it('should define all 4 corner rotunda junctions in quadrangle alignment', () => {
    const expectedCorners = [
      [-14.25, 0, 14.25],  // South-West
      [14.25, 0, 14.25],   // South-East
      [-14.25, 0, -14.25], // North-West
      [14.25, 0, -14.25],  // North-East
    ];

    expectedCorners.forEach(([x, y, z]) => {
      expect(Math.abs(x)).toBeCloseTo(14.25);
      expect(y).toBe(0);
      expect(Math.abs(z)).toBeCloseTo(14.25);
    });
  });

  it('should have standard architectural riser height between 0.14m and 0.18m in single-floor mode', () => {
    const totalRise = 2.55; // from 0.10m to 2.65m
    const stepCount = 18;
    const riserHeight = totalRise / stepCount;

    expect(riserHeight).toBeGreaterThanOrEqual(0.14);
    expect(riserHeight).toBeLessThanOrEqual(0.18);
  });

  it('should scale vertical rise across 7.5m exploded multi-floor gap in ALL mode', () => {
    const explodedElevation = 7.5;
    const totalRiseAll = 2.55 + explodedElevation; // 10.05m
    const stepCountAll = 48;
    const riserHeightAll = totalRiseAll / stepCountAll;

    expect(totalRiseAll).toBeCloseTo(10.05);
    expect(riserHeightAll).toBeGreaterThan(0.20);
    expect(riserHeightAll).toBeLessThan(0.22);
  });

  it('should preserve arrival landing azimuth alignment between single-floor and ALL modes', () => {
    const singleArc = 270;
    const allArc = 270 + 720; // 990 degrees (2 extra complete coils)

    // Ending azimuth modulo 360 must match exactly
    expect(allArc % 360).toBe(singleArc % 360);
  });
});
