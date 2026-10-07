export interface PhysicsNode {
  id: string;
  basePosition: [number, number, number];
  baseRotation: [number, number, number];
  currentPosition: [number, number, number];
  currentRotation: [number, number, number];
  velocity: [number, number, number];
  angularVelocity: [number, number, number];
  mass: number;
  phaseOffset: number;
}

export const PHYSICS_CONFIG = {
  antiGravityLift: 3.8,      // Base upward lift acceleration (m/s^2)
  linearDamping: 0.94,       // Air drag factor per frame
  angularDamping: 0.96,      // Rotational drag factor
  ceilingOffset: 8.0,        // Max ceiling height above base Y
  springConstant: 16.0,      // Return spring stiffness when grounded
  dampingConstant: 7.0,      // Return damper
  rotSpringConstant: 18.0,   // Return rotation stiffness
  rotDampingConstant: 8.0,
};

export function stepNodePhysics(
  node: PhysicsNode,
  isActive: boolean,
  delta: number,
  time: number
): void {
  const safeDelta = Number.isFinite(delta) ? delta : 0.016;
  const dt = Math.min(Math.max(safeDelta, 0.001), 0.05); // Clamp dt against frame lag
  const [x0, y0, z0] = node.basePosition;
  const [rx0, ry0, rz0] = node.baseRotation;

  if (isActive) {
    // 1. Upward buoyancy with harmonic wobble
    const wobble = Math.sin(1.8 * time + node.phaseOffset);
    const liftForce = (PHYSICS_CONFIG.antiGravityLift + 0.6 * wobble) / node.mass;
    node.velocity[1] += liftForce * dt;

    // Lateral drift
    node.velocity[0] += 0.3 * Math.cos(1.1 * time + node.phaseOffset) * dt;
    node.velocity[2] += 0.3 * Math.sin(0.9 * time + node.phaseOffset) * dt;

    // Ceiling containment barrier
    const maxY = y0 + PHYSICS_CONFIG.ceilingOffset;
    if (node.currentPosition[1] > maxY) {
      const overshoot = node.currentPosition[1] - maxY;
      node.velocity[1] -= (25.0 * overshoot + 4.0 * node.velocity[1]) * dt;
    }

    // Lateral boundary containment (radius = 3.5)
    const dx = node.currentPosition[0] - x0;
    const dz = node.currentPosition[2] - z0;
    if (Math.abs(dx) > 3.5) node.velocity[0] -= (8.0 * dx) * dt;
    if (Math.abs(dz) > 3.5) node.velocity[2] -= (8.0 * dz) * dt;

    // Angular turbulence
    node.angularVelocity[0] += 0.2 * Math.sin(0.7 * time + node.phaseOffset) * dt;
    node.angularVelocity[1] += 0.3 * Math.cos(0.8 * time + node.phaseOffset) * dt;
    node.angularVelocity[2] += 0.2 * Math.sin(1.2 * time + node.phaseOffset) * dt;

    // Apply damping
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
    const speed = Math.hypot(...node.velocity);
    if (posDist < 0.02 && speed < 0.05) {
      node.currentPosition = [x0, y0, z0];
      node.currentRotation = [rx0, ry0, rz0];
      node.velocity = [0, 0, 0];
      node.angularVelocity = [0, 0, 0];
      return;
    }
  }

  // Position & rotation integration
  for (let i = 0; i < 3; i++) {
    node.currentPosition[i] += node.velocity[i] * dt;
    node.currentRotation[i] += node.angularVelocity[i] * dt;
  }
}
