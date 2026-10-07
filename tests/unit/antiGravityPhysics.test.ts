import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsNode, stepNodePhysics, PHYSICS_CONFIG } from '../helpers/physics';

describe('Tier 1: Anti-Gravity Physics Engine (R4)', () => {
  let sampleNode: PhysicsNode;

  beforeEach(() => {
    sampleNode = {
      id: 'LT-1',
      basePosition: [20, 1.0, 7],
      baseRotation: [0, 0, 0],
      currentPosition: [20, 1.0, 7],
      currentRotation: [0, 0, 0],
      velocity: [0, 0, 0],
      angularVelocity: [0, 0, 0],
      mass: 1.0,
      phaseOffset: 0.0,
    };
  });

  it('1. should apply upward buoyancy force causing positive vertical displacement when active', () => {
    // Step simulation for 60 frames
    for (let frame = 0; frame < 60; frame++) {
      stepNodePhysics(sampleNode, true, 0.016, frame * 0.016);
    }

    expect(sampleNode.currentPosition[1]).toBeGreaterThan(sampleNode.basePosition[1]);
    expect(sampleNode.velocity[1]).toBeGreaterThan(0);
  });

  it('2. should induce rotational turbulence across x, y, and z axes during Zero-G', () => {
    for (let frame = 0; frame < 60; frame++) {
      stepNodePhysics(sampleNode, true, 0.016, frame * 0.016);
    }

    const hasRotated =
      Math.abs(sampleNode.currentRotation[0]) > 0.001 ||
      Math.abs(sampleNode.currentRotation[1]) > 0.001 ||
      Math.abs(sampleNode.currentRotation[2]) > 0.001;

    expect(hasRotated).toBe(true);
  });

  it('3. should contain upward drift below ceiling offset threshold', () => {
    // Run long simulation for 20 seconds (1200 frames)
    for (let frame = 0; frame < 1200; frame++) {
      stepNodePhysics(sampleNode, true, 0.016, frame * 0.016);
    }

    const maxY = sampleNode.basePosition[1] + PHYSICS_CONFIG.ceilingOffset;
    // Allow slight soft bounce overshoot but within 1.0m
    expect(sampleNode.currentPosition[1]).toBeLessThanOrEqual(maxY + 1.0);
  });

  it('4. should contain horizontal drift within lateral bounds (|dx| <= 4.0, |dz| <= 4.0)', () => {
    for (let frame = 0; frame < 1000; frame++) {
      stepNodePhysics(sampleNode, true, 0.016, frame * 0.016);
    }

    const dx = Math.abs(sampleNode.currentPosition[0] - sampleNode.basePosition[0]);
    const dz = Math.abs(sampleNode.currentPosition[2] - sampleNode.basePosition[2]);

    expect(dx).toBeLessThanOrEqual(4.0);
    expect(dz).toBeLessThanOrEqual(4.0);
  });

  it('5. should restore node back to base position via harmonic return spring when deactivated', () => {
    // Lift node into air first (150 frames ~ 2.4s)
    for (let frame = 0; frame < 150; frame++) {
      stepNodePhysics(sampleNode, true, 0.016, frame * 0.016);
    }
    expect(sampleNode.currentPosition[1]).toBeGreaterThan(3.0);

    // Deactivate anti-gravity and run return spring
    for (let frame = 0; frame < 300; frame++) {
      stepNodePhysics(sampleNode, false, 0.016, frame * 0.016);
    }

    // Node should be back within 0.1m of base position
    const distToBase = Math.hypot(
      sampleNode.currentPosition[0] - sampleNode.basePosition[0],
      sampleNode.currentPosition[1] - sampleNode.basePosition[1],
      sampleNode.currentPosition[2] - sampleNode.basePosition[2]
    );
    expect(distToBase).toBeLessThan(0.1);
  });

  it('6. should snap to exactly base position and zero velocity once settled within threshold', () => {
    // Manually place near base position with small velocity
    sampleNode.currentPosition = [
      sampleNode.basePosition[0] + 0.01,
      sampleNode.basePosition[1] + 0.01,
      sampleNode.basePosition[2] + 0.01,
    ];
    sampleNode.velocity = [0.01, 0.01, 0.01];

    stepNodePhysics(sampleNode, false, 0.016, 0);

    expect(sampleNode.currentPosition).toEqual(sampleNode.basePosition);
    expect(sampleNode.velocity).toEqual([0, 0, 0]);
  });
});
