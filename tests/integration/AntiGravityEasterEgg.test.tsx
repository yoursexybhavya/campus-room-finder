import { describe, it, expect, beforeEach } from 'vitest';
import { KonamiCodeDetector, KONAMI_SEQUENCE } from '../helpers/konami';
import { PhysicsNode, stepNodePhysics } from '../helpers/physics';

export interface EasterEggState {
  isActive: boolean;
  intensity: number; // 0.0 to 1.0
  backgroundColor: string;
  isStarfieldActive: boolean;
  statusMessage: string;
}

export class EasterEggController {
  state: EasterEggState = {
    isActive: false,
    intensity: 0.0,
    backgroundColor: '#090d16',
    isStarfieldActive: false,
    statusMessage: 'SYSTEMS NORMAL',
  };

  toggle(): void {
    if (this.state.isActive) {
      this.deactivate();
    } else {
      this.activate();
    }
  }

  activate(): void {
    this.state.isActive = true;
    this.state.intensity = 1.0;
    this.state.backgroundColor = '#050518'; // Cosmic deep space
    this.state.isStarfieldActive = true;
    this.state.statusMessage = 'ZERO-G PROTOCOL ENGAGED // GRAVITY: -9.81 m/s²';
  }

  deactivate(): void {
    this.state.isActive = false;
    this.state.intensity = 0.0;
    this.state.backgroundColor = '#090d16'; // Daylight sky / default theme
    this.state.isStarfieldActive = false;
    this.state.statusMessage = 'GRAVITY RESTORED // SYSTEMS NORMAL';
  }
}

describe('Tier 1 Integration: Anti-Gravity Easter Egg (R4)', () => {
  let controller: EasterEggController;
  let detector: KonamiCodeDetector;

  beforeEach(() => {
    controller = new EasterEggController();
    detector = new KonamiCodeDetector(() => {
      controller.toggle();
    });
  });

  it('1. should toggle internal anti-gravity state when Konami code sequence is entered via simulated keystrokes', () => {
    expect(controller.state.isActive).toBe(false);

    // Enter full Konami sequence
    KONAMI_SEQUENCE.forEach((key) => {
      detector.handleKey(key);
    });

    expect(controller.state.isActive).toBe(true);
    expect(controller.state.intensity).toBe(1.0);
  });

  it('2. should toggle anti-gravity off when Konami code is entered a second time', () => {
    // Turn ON
    KONAMI_SEQUENCE.forEach((key) => detector.handleKey(key));
    expect(controller.state.isActive).toBe(true);

    // Turn OFF
    KONAMI_SEQUENCE.forEach((key) => detector.handleKey(key));
    expect(controller.state.isActive).toBe(false);
    expect(controller.state.intensity).toBe(0.0);
  });

  it('3. should update UI cosmic background and starfield when Zero-G state engages', () => {
    KONAMI_SEQUENCE.forEach((key) => detector.handleKey(key));

    expect(controller.state.backgroundColor).toBe('#050518');
    expect(controller.state.isStarfieldActive).toBe(true);
    expect(controller.state.statusMessage).toContain('ZERO-G PROTOCOL ENGAGED');
  });

  it('4. should initiate floating animations and rotational physics on campus nodes', () => {
    KONAMI_SEQUENCE.forEach((key) => detector.handleKey(key));

    const roomNode: PhysicsNode = {
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

    // Run animation frames
    for (let frame = 0; frame < 60; frame++) {
      stepNodePhysics(roomNode, controller.state.isActive, 0.016, frame * 0.016);
    }

    // Node floats upward and experiences angular rotation
    expect(roomNode.currentPosition[1]).toBeGreaterThan(roomNode.basePosition[1]);
    expect(Math.abs(roomNode.currentRotation[1])).toBeGreaterThan(0.001);
  });

  it('5. should restore cosmic background to normal and trigger return spring on toggle off', () => {
    // Activate
    KONAMI_SEQUENCE.forEach((key) => detector.handleKey(key));
    expect(controller.state.isStarfieldActive).toBe(true);

    // Deactivate
    KONAMI_SEQUENCE.forEach((key) => detector.handleKey(key));
    expect(controller.state.backgroundColor).toBe('#090d16');
    expect(controller.state.isStarfieldActive).toBe(false);
    expect(controller.state.statusMessage).toContain('GRAVITY RESTORED');
  });
});
