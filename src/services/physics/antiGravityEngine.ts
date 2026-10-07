/**
 * Campus Room Finder - Anti-Gravity Harmonic Physics Engine
 * Milestone 4 (R4)
 */

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { PhysicsNode, AntiGravityConfig } from '../../types/antiGravity';
import { useEasterEggStore } from '../../stores/useEasterEggStore';

/**
 * Validated Physical Constants (Strictly synchronized with tests/helpers/physics.ts)
 */
export const PHYSICS_CONFIG: AntiGravityConfig = {
  antiGravityLift: 3.8,      // Base upward lift acceleration (m/s^2)
  linearDamping: 0.94,       // Air drag factor per frame
  angularDamping: 0.96,      // Rotational drag factor
  ceilingOffset: 8.0,        // Max ceiling height above base Y
  springConstant: 16.0,      // Return spring stiffness when grounded
  dampingConstant: 7.0,      // Return damper
  rotSpringConstant: 18.0,   // Return rotation stiffness
  rotDampingConstant: 8.0,   // Return rotation damper
};

/**
 * Pure-Logic Semi-Implicit Euler Physics Step Function
 * Guarantees zero heap allocation per frame.
 */
export function stepNodePhysics(
  node: PhysicsNode,
  isActive: boolean,
  delta: number,
  time: number
): void {
  // 1. Clamp dt against frame rate spikes / background throttling
  const safeDelta = Number.isFinite(delta) ? delta : 0.016;
  const dt = Math.min(Math.max(safeDelta, 0.001), 0.05);
  const [x0, y0, z0] = node.basePosition;
  const [rx0, ry0, rz0] = node.baseRotation;

  if (isActive) {
    node.isSettled = false;

    // A. Upward buoyancy with harmonic wobble
    const wobble = Math.sin(1.8 * time + node.phaseOffset);
    const liftForce = (PHYSICS_CONFIG.antiGravityLift + 0.6 * wobble) / node.mass;
    node.velocity[1] += liftForce * dt;

    // B. Lateral harmonic drift
    node.velocity[0] += 0.3 * Math.cos(1.1 * time + node.phaseOffset) * dt;
    node.velocity[2] += 0.3 * Math.sin(0.9 * time + node.phaseOffset) * dt;

    // C. Soft ceiling containment barrier
    const maxY = y0 + PHYSICS_CONFIG.ceilingOffset;
    if (node.currentPosition[1] > maxY) {
      const overshoot = node.currentPosition[1] - maxY;
      node.velocity[1] -= (25.0 * overshoot + 4.0 * node.velocity[1]) * dt;
    }

    // D. Lateral boundary containment (radius = 3.5m)
    const dx = node.currentPosition[0] - x0;
    const dz = node.currentPosition[2] - z0;
    if (Math.abs(dx) > 3.5) node.velocity[0] -= (8.0 * dx) * dt;
    if (Math.abs(dz) > 3.5) node.velocity[2] -= (8.0 * dz) * dt;

    // E. Angular turbulence
    node.angularVelocity[0] += 0.2 * Math.sin(0.7 * time + node.phaseOffset) * dt;
    node.angularVelocity[1] += 0.3 * Math.cos(0.8 * time + node.phaseOffset) * dt;
    node.angularVelocity[2] += 0.2 * Math.sin(1.2 * time + node.phaseOffset) * dt;

    // F. Frame damping
    node.velocity[0] *= PHYSICS_CONFIG.linearDamping;
    node.velocity[1] *= PHYSICS_CONFIG.linearDamping;
    node.velocity[2] *= PHYSICS_CONFIG.linearDamping;
    node.angularVelocity[0] *= PHYSICS_CONFIG.angularDamping;
    node.angularVelocity[1] *= PHYSICS_CONFIG.angularDamping;
    node.angularVelocity[2] *= PHYSICS_CONFIG.angularDamping;

  } else {
    // Ground restoration mode: Critically damped return spring
    for (let i = 0; i < 3; i++) {
      const posError = node.currentPosition[i] - node.basePosition[i];
      const springAcc = -PHYSICS_CONFIG.springConstant * posError - PHYSICS_CONFIG.dampingConstant * node.velocity[i];
      node.velocity[i] += springAcc * dt;

      const rotError = node.currentRotation[i] - node.baseRotation[i];
      const rotAcc = -PHYSICS_CONFIG.rotSpringConstant * rotError - PHYSICS_CONFIG.rotDampingConstant * node.angularVelocity[i];
      node.angularVelocity[i] += rotAcc * dt;
    }

    // Snap to resting base once settled within tolerance
    const posDist = Math.hypot(
      node.currentPosition[0] - x0,
      node.currentPosition[1] - y0,
      node.currentPosition[2] - z0
    );
    const speed = Math.hypot(node.velocity[0], node.velocity[1], node.velocity[2]);
    if (posDist < 0.02 && speed < 0.05) {
      node.currentPosition[0] = x0;
      node.currentPosition[1] = y0;
      node.currentPosition[2] = z0;
      node.currentRotation[0] = rx0;
      node.currentRotation[1] = ry0;
      node.currentRotation[2] = rz0;
      node.velocity[0] = 0;
      node.velocity[1] = 0;
      node.velocity[2] = 0;
      node.angularVelocity[0] = 0;
      node.angularVelocity[1] = 0;
      node.angularVelocity[2] = 0;
      node.isSettled = true;
      return;
    }
  }

  // Position & rotation integration
  for (let i = 0; i < 3; i++) {
    node.currentPosition[i] += node.velocity[i] * dt;
    node.currentRotation[i] += node.angularVelocity[i] * dt;
  }
}

/**
 * Deterministic Procedural Phase Offset Generator
 * Produces organic, asynchronous floating per room without synchronization artifacts.
 */
export function computeProceduralPhaseOffset(
  id: string,
  basePosition?: [number, number, number]
): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  if (basePosition) {
    const [x, y, z] = basePosition;
    hash ^= Math.floor(x * 73 + y * 137 + z * 283);
  }
  const normalized = Math.abs(hash % 10000) / 10000;
  return normalized * Math.PI * 2;
}

/**
 * Central Node Registry for Cross-Component Telemetry (Beacons, Avatars, QA)
 */
class PhysicsEngineRegistry {
  private nodes = new Map<string, PhysicsNode>();

  register(node: PhysicsNode): void {
    this.nodes.set(node.id, node);
  }

  unregister(id: string): void {
    this.nodes.delete(id);
  }

  getNode(id: string): PhysicsNode | undefined {
    return this.nodes.get(id);
  }

  getCurrentPosition(id: string): [number, number, number] | null {
    const node = this.nodes.get(id);
    return node ? node.currentPosition : null;
  }

  getAllNodes(): PhysicsNode[] {
    return Array.from(this.nodes.values());
  }

  resetAll(): void {
    this.nodes.forEach((node) => {
      node.currentPosition = [node.basePosition[0], node.basePosition[1], node.basePosition[2]];
      node.currentRotation = [node.baseRotation[0], node.baseRotation[1], node.baseRotation[2]];
      node.velocity = [0, 0, 0];
      node.angularVelocity = [0, 0, 0];
      node.isSettled = true;
    });
  }
}

export const physicsRegistry = new PhysicsEngineRegistry();

/**
 * Custom React-Three-Fiber Hook for Node Physics
 * Directly mutates Three.js Object3D matrices inside useFrame without triggering React re-renders.
 */
export interface UseNodePhysicsOptions {
  id: string;
  basePosition: [number, number, number];
  baseRotation?: [number, number, number];
  mass?: number;
  phaseOffset?: number;
}

export function useNodePhysics(
  options: UseNodePhysicsOptions,
  targetRef: React.RefObject<THREE.Object3D>
) {
  const nodeRef = useRef<PhysicsNode | null>(null);

  if (!nodeRef.current) {
    const phase =
      options.phaseOffset ??
      computeProceduralPhaseOffset(options.id, options.basePosition);

    nodeRef.current = {
      id: options.id,
      basePosition: [options.basePosition[0], options.basePosition[1], options.basePosition[2]],
      baseRotation: options.baseRotation
        ? [options.baseRotation[0], options.baseRotation[1], options.baseRotation[2]]
        : [0, 0, 0],
      currentPosition: [options.basePosition[0], options.basePosition[1], options.basePosition[2]],
      currentRotation: options.baseRotation
        ? [options.baseRotation[0], options.baseRotation[1], options.baseRotation[2]]
        : [0, 0, 0],
      velocity: [0, 0, 0],
      angularVelocity: [0, 0, 0],
      mass: options.mass ?? 1.0,
      phaseOffset: phase,
      isSettled: true,
    };
  }

  useEffect(() => {
    const node = nodeRef.current!;
    physicsRegistry.register(node);
    return () => {
      physicsRegistry.unregister(node.id);
    };
  }, [options.id]);

  useFrame((state, delta) => {
    const isActive = useEasterEggStore.getState().isActive;
    const node = nodeRef.current;
    if (!node) return;

    // Early exit: 0 CPU operations when grounded and inactive
    if (!isActive && node.isSettled) return;

    const time = state.clock.getElapsedTime();
    stepNodePhysics(node, isActive, delta, time);

    if (targetRef.current) {
      targetRef.current.position.set(
        node.currentPosition[0],
        node.currentPosition[1],
        node.currentPosition[2]
      );
      targetRef.current.rotation.set(
        node.currentRotation[0],
        node.currentRotation[1],
        node.currentRotation[2]
      );
    }
  });

  return nodeRef;
}
