/**
 * Campus Room Finder - Anti-Gravity Easter Egg Type Definitions
 * Milestone 4 (R4) Contract
 */

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
  isSettled?: boolean;
}

export interface PhysicsConfig {
  antiGravityLift: number;      // Base upward lift acceleration (m/s^2)
  linearDamping: number;       // Air drag factor per frame
  angularDamping: number;      // Rotational drag factor
  ceilingOffset: number;       // Max ceiling height above base Y
  springConstant: number;      // Return spring stiffness when grounded
  dampingConstant: number;     // Return damper
  rotSpringConstant: number;   // Return rotation stiffness
  rotDampingConstant: number;  // Return rotation damper
}

export type AntiGravityConfig = PhysicsConfig;

export interface EasterEggState {
  isActive: boolean;
  intensity: number; // 0.0 to 1.0
  backgroundColor: string;
  isStarfieldActive: boolean;
  statusMessage: string;
  progress: number; // 0 to 10
  triggerCount: number;
}

export interface EasterEggActions {
  toggle: () => void;
  activate: () => void;
  deactivate: () => void;
  setIntensity: (intensity: number) => void;
  setStatusMessage: (message: string) => void;
  setProgress: (progress: number) => void;
  reset: () => void;
}

export type EasterEggStoreState = EasterEggState & EasterEggActions;

// Backward-compatible alias matching PROJECT.md §4 contract
export type AntiGravityState = EasterEggStoreState;

export type KonamiKey =
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'b'
  | 'a'
  | 'B'
  | 'A'
  | string;

export interface KonamiListenerOptions {
  timeoutMs?: number;
  ignoreInputs?: boolean;
  target?: Window | Document | HTMLElement;
  onTrigger?: () => void;
  onProgress?: (progress: number, total: number) => void;
  onReset?: () => void;
}

// UI Color & Message Constants
export const DEFAULT_BG_COLOR = '#090d16';
export const COSMIC_BG_COLOR = '#050518';

export const STATUS_NORMAL = 'SYSTEMS NORMAL';
export const STATUS_ENGAGED = 'ZERO-G PROTOCOL ENGAGED // GRAVITY: -9.81 m/s²';
export const STATUS_RESTORED = 'GRAVITY RESTORED // SYSTEMS NORMAL';

export const KONAMI_SEQUENCE = [
  'arrowup',
  'arrowup',
  'arrowdown',
  'arrowdown',
  'arrowleft',
  'arrowright',
  'arrowleft',
  'arrowright',
  'b',
  'a',
] as const;

export const DEFAULT_KONAMI_TIMEOUT_MS = 2500;
