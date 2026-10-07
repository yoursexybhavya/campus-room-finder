/**
 * Milestone 4 (R4) - Challenger 2 Adversarial Stress Test Suite
 * Anti-Gravity Harmonic Physics Engine & 3D Simulation Stability
 *
 * Requirements covered:
 * 1. Extreme frame delta spikes (delta = 0.5s, delta = 5.0s, delta = 0.00001s, negative delta, NaN delta resilience).
 * 2. Long-duration simulation (10,000 frames) verifying soft ceiling containment (y <= y0 + 9.0m)
 *    and lateral containment (|dx| <= 4.0m, |dz| <= 4.0m) across all 14 campus rooms.
 * 3. High-frequency toggling: rapid activation/deactivation alternating every 1, 2, and 5 frames
 *    verifying no velocity explosions or NaN coordinates.
 * 4. Extreme mass stress (m = 0.1, m = 100.0) ensuring stable acceleration bounds.
 * 5. Critically damped return spring restitution: verify nodes settle back to exactly
 *    base coordinates ([x0, y0, z0]) with zero residual velocity and isSettled = true.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  stepNodePhysics,
  PHYSICS_CONFIG,
  computeProceduralPhaseOffset,
  physicsRegistry,
} from '../../src/services/physics/antiGravityEngine';
import { campusRooms } from '../../src/data/campusRooms';
import { PhysicsNode } from '../../src/types/antiGravity';

/**
 * Helper to construct an isolated PhysicsNode
 */
function createTestNode(overrides?: Partial<PhysicsNode>): PhysicsNode {
  return {
    id: overrides?.id ?? 'TEST-ROOM-1',
    basePosition: overrides?.basePosition ? [...overrides.basePosition] : [10.0, 1.0, 5.0],
    baseRotation: overrides?.baseRotation ? [...overrides.baseRotation] : [0, 0, 0],
    currentPosition: overrides?.currentPosition
      ? [...overrides.currentPosition]
      : overrides?.basePosition
      ? [...overrides.basePosition]
      : [10.0, 1.0, 5.0],
    currentRotation: overrides?.currentRotation
      ? [...overrides.currentRotation]
      : overrides?.baseRotation
      ? [...overrides.baseRotation]
      : [0, 0, 0],
    velocity: overrides?.velocity ? [...overrides.velocity] : [0, 0, 0],
    angularVelocity: overrides?.angularVelocity ? [...overrides.angularVelocity] : [0, 0, 0],
    mass: overrides?.mass ?? 1.0,
    phaseOffset: overrides?.phaseOffset ?? 0.0,
    isSettled: overrides?.isSettled ?? true,
  };
}

describe('Milestone 4 Challenger Adversarial Stress Suite (Physics Engine Stability)', () => {
  beforeEach(() => {
    physicsRegistry.resetAll();
  });

  // =========================================================================
  // SUITE 1: Extreme Frame Delta Spikes & Delta Clamping Resilience
  // =========================================================================
  describe('1. Extreme Frame Delta Spikes & Delta Clamping Resilience', () => {
    it('1.1 should clamp extreme delta spike of 0.5s to 0.05s avoiding catastrophic teleportation', () => {
      const node = createTestNode();
      const initialY = node.currentPosition[1];

      // A single un-clamped 0.5s step would accelerate velocity[1] massively.
      // Clamped to 0.05s, displacement in 1 step must remain strictly below 0.05m.
      stepNodePhysics(node, true, 0.5, 0.0);

      const deltaY = node.currentPosition[1] - initialY;
      expect(deltaY).toBeGreaterThan(0);
      expect(deltaY).toBeLessThan(0.05); // dt=0.05 => v ~ 0.22, pos ~ 0.011m
      expect(node.velocity[1]).toBeLessThan(1.0);
    });

    it('1.2 should clamp massive delta spike of 5.0s (background tab resumption) to safe 0.05s limit', () => {
      const node = createTestNode();
      const initialY = node.currentPosition[1];

      // Simulate a tab returning from 5 seconds of background pause
      stepNodePhysics(node, true, 5.0, 5.0);

      const deltaY = node.currentPosition[1] - initialY;
      expect(deltaY).toBeLessThan(0.05);
      expect(node.velocity[1]).toBeLessThan(1.0);
      expect(Number.isFinite(node.currentPosition[0])).toBe(true);
      expect(Number.isFinite(node.currentPosition[1])).toBe(true);
      expect(Number.isFinite(node.currentPosition[2])).toBe(true);
    });

    it('1.3 should clamp microsecond delta of 0.00001s to minimum 0.001s to prevent precision stall', () => {
      const node = createTestNode();
      const initialY = node.currentPosition[1];

      // Step with 10 microseconds
      stepNodePhysics(node, true, 0.00001, 0.1);

      // Should advance using dt = 0.001s
      expect(node.velocity[1]).toBeGreaterThan(0);
      expect(node.currentPosition[1]).toBeGreaterThanOrEqual(initialY);
      expect(node.velocity[1]).toBeCloseTo(PHYSICS_CONFIG.antiGravityLift * 0.001, 3);
    });

    it('1.4 should clamp negative delta (-1.0s / clock reversal / NTP sync) to 0.001s positive step', () => {
      const node = createTestNode();
      const initialY = node.currentPosition[1];

      // Simulate negative delta from system clock adjustment
      stepNodePhysics(node, true, -1.0, 0.0);

      // Time must not flow backward; velocity and displacement must remain non-negative
      expect(node.currentPosition[1]).toBeGreaterThanOrEqual(initialY);
      expect(node.velocity[1]).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(node.currentPosition[1])).toBe(true);
    });

    it('1.5a should sanitize non-finite NaN delta to safe 0.016s default preventing NaN coordinate corruption', () => {
      const node = createTestNode();

      // Pass NaN delta directly to stepNodePhysics
      stepNodePhysics(node, true, NaN, 0.0);

      // With safe delta guard (Number.isFinite(delta) ? delta : 0.016), coordinates remain strictly finite
      const hasNaN =
        Number.isNaN(node.currentPosition[0]) ||
        Number.isNaN(node.currentPosition[1]) ||
        Number.isNaN(node.currentPosition[2]) ||
        Number.isNaN(node.velocity[1]);

      expect(hasNaN).toBe(false);
      expect(Number.isFinite(node.currentPosition[0])).toBe(true);
      expect(Number.isFinite(node.currentPosition[1])).toBe(true);
      expect(Number.isFinite(node.currentPosition[2])).toBe(true);
      expect(Number.isFinite(node.velocity[1])).toBe(true);
    });

    it('1.5b should demonstrate that applying a finite guard (Number.isFinite(delta) ? delta : 0.016) guarantees non-NaN simulation stability', () => {
      const node = createTestNode();
      const malformedDeltas = [NaN, Infinity, -Infinity, undefined as any, null as any];

      malformedDeltas.forEach((badDelta, idx) => {
        stepNodePhysics(node, true, badDelta, idx * 0.016);

        expect(Number.isFinite(node.currentPosition[0])).toBe(true);
        expect(Number.isFinite(node.currentPosition[1])).toBe(true);
        expect(Number.isFinite(node.currentPosition[2])).toBe(true);
        expect(Number.isFinite(node.velocity[1])).toBe(true);
      });
    });
  });

  // =========================================================================
  // SUITE 2: Long-Duration 10,000-Frame Simulation & Multi-Room Containment
  // =========================================================================
  describe('2. Long-Duration 10,000-Frame Simulation & Multi-Room Containment Bounds (All 14 Campus Rooms)', () => {
    it('2.1 should maintain soft ceiling containment (y <= y0 + 9.0m) across 10,000 frames for a standard room', () => {
      const node = createTestNode({ id: 'LT-1', basePosition: [20, 1.0, 7] });
      const dt = 0.016;
      const maxYAllowed = node.basePosition[1] + 9.0;
      let peakY = -Infinity;

      for (let frame = 0; frame < 10000; frame++) {
        const time = frame * dt;
        stepNodePhysics(node, true, dt, time);
        if (node.currentPosition[1] > peakY) {
          peakY = node.currentPosition[1];
        }
      }

      // Ceiling offset is 8.0m with soft spring boundary; peak must stay under 9.0m
      expect(peakY).toBeLessThanOrEqual(maxYAllowed);
      expect(peakY).toBeGreaterThan(node.basePosition[1] + 7.0); // Must float high near ceiling
      expect(node.currentPosition[1]).toBeLessThanOrEqual(maxYAllowed);
    });

    it('2.2 should maintain lateral containment (|dx| <= 4.0m, |dz| <= 4.0m) across 10,000 frames', () => {
      const node = createTestNode({ id: 'LT-1', basePosition: [20, 1.0, 7] });
      const dt = 0.016;
      let maxAbsDx = 0;
      let maxAbsDz = 0;

      for (let frame = 0; frame < 10000; frame++) {
        const time = frame * dt;
        stepNodePhysics(node, true, dt, time);

        const dx = Math.abs(node.currentPosition[0] - node.basePosition[0]);
        const dz = Math.abs(node.currentPosition[2] - node.basePosition[2]);

        if (dx > maxAbsDx) maxAbsDx = dx;
        if (dz > maxAbsDz) maxAbsDz = dz;
      }

      expect(maxAbsDx).toBeLessThanOrEqual(4.0);
      expect(maxAbsDz).toBeLessThanOrEqual(4.0);
      expect(maxAbsDx).toBeGreaterThan(0.01); // Verify actual non-zero lateral drift occurred
      expect(maxAbsDz).toBeGreaterThan(0.01);
    });

    it('2.3 should enforce containment bounds across all 14 campus rooms simultaneously over 10,000 frames', () => {
      expect(campusRooms.length).toBeGreaterThanOrEqual(14);

      // Create nodes for all campus rooms with room-specific position, mass, phaseOffset
      const nodes: PhysicsNode[] = campusRooms.map((room) => ({
        id: room.id,
        basePosition: [...room.position],
        baseRotation: [0, 0, 0],
        currentPosition: [...room.position],
        currentRotation: [0, 0, 0],
        velocity: [0, 0, 0],
        angularVelocity: [0, 0, 0],
        mass: 0.9 + ((room.capacity ?? 60) / 150) * 0.3,
        phaseOffset: computeProceduralPhaseOffset(room.id, room.position),
        isSettled: true,
      }));

      const dt = 0.016;
      const FRAMES = 10000;

      for (let frame = 0; frame < FRAMES; frame++) {
        const time = frame * dt;
        for (let i = 0; i < nodes.length; i++) {
          stepNodePhysics(nodes[i], true, dt, time);
        }
      }

      // Verify containment for each of the rooms
      nodes.forEach((node) => {
        const [x0, y0, z0] = node.basePosition;
        const [x, y, z] = node.currentPosition;
        const dx = Math.abs(x - x0);
        const dz = Math.abs(z - z0);
        const dy = y - y0;

        // Soft ceiling containment: y <= y0 + 9.0m
        expect(y).toBeLessThanOrEqual(y0 + 9.0);
        expect(dy).toBeGreaterThan(5.0); // Has elevated significantly near ceiling

        // Lateral containment: |dx| <= 4.0m, |dz| <= 4.0m
        expect(dx).toBeLessThanOrEqual(4.0);
        expect(dz).toBeLessThanOrEqual(4.0);

        // Coordinates must all remain finite
        expect(Number.isFinite(x)).toBe(true);
        expect(Number.isFinite(y)).toBe(true);
        expect(Number.isFinite(z)).toBe(true);
      });
    });

    it('2.4 should confirm unique phase offsets generate asynchronous decorrelated floating trajectories across rooms', () => {
      const roomA = campusRooms[0]; // LT-1
      const roomB = campusRooms[1]; // LT-2

      const nodeA = createTestNode({
        id: roomA.id,
        basePosition: roomA.position,
        phaseOffset: computeProceduralPhaseOffset(roomA.id, roomA.position),
      });

      const nodeB = createTestNode({
        id: roomB.id,
        basePosition: roomB.position,
        phaseOffset: computeProceduralPhaseOffset(roomB.id, roomB.position),
      });

      expect(nodeA.phaseOffset).not.toEqual(nodeB.phaseOffset);

      // Run 300 frames
      for (let frame = 0; frame < 300; frame++) {
        const time = frame * 0.016;
        stepNodePhysics(nodeA, true, 0.016, time);
        stepNodePhysics(nodeB, true, 0.016, time);
      }

      // Check elevation difference (they should not be in lockstep)
      const dyA = nodeA.currentPosition[1] - nodeA.basePosition[1];
      const dyB = nodeB.currentPosition[1] - nodeB.basePosition[1];
      expect(Math.abs(dyA - dyB)).toBeGreaterThan(0.01);
    });

    it('2.5 should preserve vertical floor differentiation between Ground and First floor rooms in Zero-G', () => {
      const groundRooms = campusRooms.filter((r) => r.floor === 'ground');
      const firstFloorRooms = campusRooms.filter((r) => r.floor === 'first');

      expect(groundRooms.length).toBeGreaterThanOrEqual(8);
      expect(firstFloorRooms.length).toBeGreaterThanOrEqual(6);

      const groundNodes = groundRooms.map((r) => createTestNode({ id: r.id, basePosition: r.position }));
      const firstNodes = firstFloorRooms.map((r) => createTestNode({ id: r.id, basePosition: r.position }));

      // Run 1,000 frames of Zero-G
      for (let frame = 0; frame < 1000; frame++) {
        const time = frame * 0.016;
        groundNodes.forEach((n) => stepNodePhysics(n, true, 0.016, time));
        firstNodes.forEach((n) => stepNodePhysics(n, true, 0.016, time));
      }

      // Average ground floating elevation vs average 1st floor floating elevation
      const avgGroundY = groundNodes.reduce((acc, n) => acc + n.currentPosition[1], 0) / groundNodes.length;
      const avgFirstY = firstNodes.reduce((acc, n) => acc + n.currentPosition[1], 0) / firstNodes.length;

      // Ground base was 1.0, 1st floor base was 3.6 (delta = 2.6m)
      // Floating elevations must maintain positive separation
      expect(avgFirstY).toBeGreaterThan(avgGroundY + 2.0);
    });
  });

  // =========================================================================
  // SUITE 3: High-Frequency Anti-Gravity Toggling
  // =========================================================================
  describe('3. High-Frequency Anti-Gravity Toggling (Rapid Alternating Cycles)', () => {
    it('3.1 should survive 1-frame alternating toggle (chatter stress) without velocity explosion or NaN coordinates', () => {
      const node = createTestNode();
      const dt = 0.016;

      for (let frame = 0; frame < 300; frame++) {
        const isActive = frame % 2 === 0;
        stepNodePhysics(node, isActive, dt, frame * dt);

        // Velocity bounds check: velocity must never explode beyond 20 m/s
        const speed = Math.hypot(...node.velocity);
        expect(speed).toBeLessThan(20.0);

        // Non-NaN assertions
        expect(Number.isNaN(node.currentPosition[0])).toBe(false);
        expect(Number.isNaN(node.currentPosition[1])).toBe(false);
        expect(Number.isNaN(node.currentPosition[2])).toBe(false);
      }
    });

    it('3.2 should survive 2-frame alternating toggle without resonant amplification', () => {
      const node = createTestNode();
      const dt = 0.016;

      for (let frame = 0; frame < 400; frame++) {
        const isActive = Math.floor(frame / 2) % 2 === 0;
        stepNodePhysics(node, isActive, dt, frame * dt);

        const speed = Math.hypot(...node.velocity);
        expect(speed).toBeLessThan(20.0);
        expect(Number.isFinite(node.currentPosition[1])).toBe(true);
      }
    });

    it('3.3 should survive 5-frame alternating toggle without kinetic energy runaway', () => {
      const node = createTestNode();
      const dt = 0.016;

      for (let frame = 0; frame < 500; frame++) {
        const isActive = Math.floor(frame / 5) % 2 === 0;
        stepNodePhysics(node, isActive, dt, frame * dt);

        const speed = Math.hypot(...node.velocity);
        const angSpeed = Math.hypot(...node.angularVelocity);

        expect(speed).toBeLessThan(25.0);
        expect(angSpeed).toBeLessThan(25.0);
        expect(Number.isFinite(node.currentPosition[1])).toBe(true);
      }
    });

    it('3.4 should survive stochastic toggle intervals without state corruption', () => {
      const node = createTestNode();
      const dt = 0.016;
      let isActive = false;

      // Seeded toggle schedule
      const toggleSchedule = [1, 3, 2, 5, 1, 4, 2, 7, 3, 1, 6, 2, 4];
      let scheduleIdx = 0;
      let countdown = toggleSchedule[0];

      for (let frame = 0; frame < 600; frame++) {
        countdown--;
        if (countdown <= 0) {
          isActive = !isActive;
          scheduleIdx = (scheduleIdx + 1) % toggleSchedule.length;
          countdown = toggleSchedule[scheduleIdx];
        }

        stepNodePhysics(node, isActive, dt, frame * dt);

        const speed = Math.hypot(...node.velocity);
        expect(speed).toBeLessThan(25.0);
        expect(Number.isFinite(node.currentPosition[0])).toBe(true);
        expect(Number.isFinite(node.currentPosition[1])).toBe(true);
        expect(Number.isFinite(node.currentPosition[2])).toBe(true);
      }
    });
  });

  // =========================================================================
  // SUITE 4: Extreme Mass Stress & Acceleration Bounds (m = 0.1 to m = 100.0)
  // =========================================================================
  describe('4. Extreme Mass Stress & Acceleration Bounds (m = 0.1 to m = 100.0)', () => {
    it('4.1 should handle ultra-light mass (m = 0.1) with bounded vertical velocity and ceiling containment', () => {
      // Very light node accelerates 10x faster due to (liftForce / m)
      const lightNode = createTestNode({ mass: 0.1 });
      const dt = 0.016;

      for (let frame = 0; frame < 600; frame++) {
        stepNodePhysics(lightNode, true, dt, frame * dt);
      }

      // Check that despite 10x acceleration, ceiling containment barrier throttles upward velocity
      const [x0, y0, z0] = lightNode.basePosition;
      expect(lightNode.currentPosition[1]).toBeLessThanOrEqual(y0 + 12.0);
      expect(Number.isFinite(lightNode.currentPosition[1])).toBe(true);
      expect(Number.isFinite(lightNode.velocity[1])).toBe(true);
    });

    it('4.2 should handle ultra-heavy mass (m = 100.0) with stable sluggish lift and zero numerical underflow', () => {
      const heavyNode = createTestNode({ mass: 100.0 });
      const dt = 0.016;

      for (let frame = 0; frame < 300; frame++) {
        stepNodePhysics(heavyNode, true, dt, frame * dt);
      }

      // Heavy node should experience small positive lift without crashing or underflowing to 0/NaN
      expect(heavyNode.currentPosition[1]).toBeGreaterThan(heavyNode.basePosition[1]);
      expect(heavyNode.velocity[1]).toBeGreaterThan(0);
      expect(heavyNode.velocity[1]).toBeLessThan(0.5); // Very sluggish
      expect(Number.isFinite(heavyNode.currentPosition[1])).toBe(true);
    });

    it('4.3 should verify acceleration scale inversely with mass across test spectrum', () => {
      const light = createTestNode({ mass: 0.5 });
      const medium = createTestNode({ mass: 1.0 });
      const heavy = createTestNode({ mass: 2.0 });

      // Single step from rest at time 0
      stepNodePhysics(light, true, 0.016, 0.0);
      stepNodePhysics(medium, true, 0.016, 0.0);
      stepNodePhysics(heavy, true, 0.016, 0.0);

      expect(light.velocity[1]).toBeGreaterThan(medium.velocity[1]);
      expect(medium.velocity[1]).toBeGreaterThan(heavy.velocity[1]);
      expect(light.velocity[1] / medium.velocity[1]).toBeCloseTo(2.0, 1);
    });
  });

  // =========================================================================
  // SUITE 5: Critically Damped Return Spring Restitution & Settling Guarantees
  // =========================================================================
  describe('5. Critically Damped Return Spring Restitution & Settling Guarantees', () => {
    it('5.1 should settle floating node back to exactly base coordinates with zero residual velocity and isSettled = true', () => {
      const node = createTestNode({ id: 'LAB-1', basePosition: [-20, 1.0, 7] });
      const dt = 0.016;

      // 1. Float node into zero-g for 150 frames (~2.4s)
      for (let frame = 0; frame < 150; frame++) {
        stepNodePhysics(node, true, dt, frame * dt);
      }

      expect(node.currentPosition[1]).toBeGreaterThan(node.basePosition[1] + 2.0);
      expect(node.isSettled).toBe(false);

      // 2. Deactivate and run return spring restitution
      for (let frame = 0; frame < 300; frame++) {
        stepNodePhysics(node, false, dt, frame * dt);
      }

      // 3. Verify exact snap to resting base coordinates
      expect(node.currentPosition[0]).toBe(node.basePosition[0]);
      expect(node.currentPosition[1]).toBe(node.basePosition[1]);
      expect(node.currentPosition[2]).toBe(node.basePosition[2]);

      // 4. Verify zero residual linear and angular velocity
      expect(node.velocity[0]).toBe(0);
      expect(node.velocity[1]).toBe(0);
      expect(node.velocity[2]).toBe(0);
      expect(node.angularVelocity[0]).toBe(0);
      expect(node.angularVelocity[1]).toBe(0);
      expect(node.angularVelocity[2]).toBe(0);

      // 5. Verify exact base rotation restored
      expect(node.currentRotation[0]).toBe(node.baseRotation[0]);
      expect(node.currentRotation[1]).toBe(node.baseRotation[1]);
      expect(node.currentRotation[2]).toBe(node.baseRotation[2]);

      // 6. Verify settled flag
      expect(node.isSettled).toBe(true);
    });

    it('5.2 should verify return spring settling across all 14 campus rooms after prolonged flight', () => {
      const nodes: PhysicsNode[] = campusRooms.map((room) => ({
        id: room.id,
        basePosition: [...room.position],
        baseRotation: [0, 0, 0],
        currentPosition: [...room.position],
        currentRotation: [0, 0, 0],
        velocity: [0, 0, 0],
        angularVelocity: [0, 0, 0],
        mass: 0.9 + ((room.capacity ?? 60) / 150) * 0.3,
        phaseOffset: computeProceduralPhaseOffset(room.id, room.position),
        isSettled: true,
      }));

      const dt = 0.016;

      // Float all 14 rooms for 100 frames
      for (let frame = 0; frame < 100; frame++) {
        for (const node of nodes) {
          stepNodePhysics(node, true, dt, frame * dt);
        }
      }

      // Restitution phase: 350 frames
      for (let frame = 0; frame < 350; frame++) {
        for (const node of nodes) {
          stepNodePhysics(node, false, dt, frame * dt);
        }
      }

      // Verify all 14 rooms have cleanly settled
      nodes.forEach((node) => {
        expect(node.isSettled).toBe(true);
        expect(node.currentPosition).toEqual(node.basePosition);
        expect(node.velocity).toEqual([0, 0, 0]);
        expect(node.angularVelocity).toEqual([0, 0, 0]);
      });
    });

    it('5.3 should remain completely idle with zero position deviation when inactive and already settled', () => {
      const node = createTestNode();
      node.isSettled = true;

      // Step physics when inactive
      stepNodePhysics(node, false, 0.016, 1.0);

      expect(node.isSettled).toBe(true);
      expect(node.currentPosition).toEqual(node.basePosition);
      expect(node.velocity).toEqual([0, 0, 0]);
    });

    it('5.4 should register and query real-time transforms via PhysicsEngineRegistry without data corruption', () => {
      const node = createTestNode({ id: 'REGISTRY-TEST-1', basePosition: [10, 2, 3] });
      physicsRegistry.register(node);

      expect(physicsRegistry.getNode('REGISTRY-TEST-1')).toBe(node);
      expect(physicsRegistry.getCurrentPosition('REGISTRY-TEST-1')).toEqual([10, 2, 3]);

      // Float node
      stepNodePhysics(node, true, 0.016, 0.1);
      const pos = physicsRegistry.getCurrentPosition('REGISTRY-TEST-1');
      expect(pos).not.toBeNull();
      expect(pos![1]).toBeGreaterThan(2.0);

      // Reset registry
      physicsRegistry.resetAll();
      expect(physicsRegistry.getCurrentPosition('REGISTRY-TEST-1')).toEqual([10, 2, 3]);
      expect(node.isSettled).toBe(true);

      physicsRegistry.unregister('REGISTRY-TEST-1');
      expect(physicsRegistry.getNode('REGISTRY-TEST-1')).toBeUndefined();
      expect(physicsRegistry.getCurrentPosition('REGISTRY-TEST-1')).toBeNull();
    });
  });
});
