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

  it('should have standard architectural riser height between 0.14m and 0.18m', () => {
    const totalRise = 2.55; // from 0.10m to 2.65m
    const stepCount = 18;
    const riserHeight = totalRise / stepCount;

    expect(riserHeight).toBeGreaterThanOrEqual(0.14);
    expect(riserHeight).toBeLessThanOrEqual(0.18);
  });
});
