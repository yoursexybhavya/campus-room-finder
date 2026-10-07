import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KonamiCodeDetector, KONAMI_SEQUENCE } from '../helpers/konami';

describe('Tier 1: Konami Sequence Listener (R4)', () => {
  let triggerCount = 0;
  let detector: KonamiCodeDetector;

  beforeEach(() => {
    vi.useFakeTimers();
    triggerCount = 0;
    detector = new KonamiCodeDetector(() => {
      triggerCount++;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. should trigger anti-gravity when standard 10-key Konami sequence is entered in order', () => {
    const keys = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'b',
      'a',
    ];

    keys.forEach((k) => detector.handleKey(k));
    expect(triggerCount).toBe(1);
    expect(detector.getProgress()).toBe(0); // auto-reset after success
  });

  it('2. should be case-insensitive for letters (e.g. B, A when Shift or CapsLock is engaged)', () => {
    const keys = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'B',
      'A',
    ];

    keys.forEach((k) => detector.handleKey(k));
    expect(triggerCount).toBe(1);
  });

  it('3. should reset progress on invalid intermediate keystroke and not trigger', () => {
    detector.handleKey('ArrowUp');
    detector.handleKey('ArrowUp');
    detector.handleKey('ArrowDown');
    detector.handleKey('x'); // Invalid key
    expect(detector.getProgress()).toBe(0);

    const remaining = [
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'b',
      'a',
    ];
    remaining.forEach((k) => detector.handleKey(k));
    expect(triggerCount).toBe(0);
  });

  it('4. should reset sequence progress if delay between keys exceeds timeout (2500ms)', () => {
    detector.handleKey('ArrowUp');
    detector.handleKey('ArrowUp');
    detector.handleKey('ArrowDown');
    expect(detector.getProgress()).toBe(3);

    vi.advanceTimersByTime(2600);
    expect(detector.getProgress()).toBe(0);

    const remaining = [
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'b',
      'a',
    ];
    remaining.forEach((k) => detector.handleKey(k));
    expect(triggerCount).toBe(0);
  });

  it('5. should ignore keystrokes when typing inside text inputs or textareas', () => {
    const keys = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'b',
      'a',
    ];

    keys.forEach((k) => detector.handleKey(k, true));
    expect(triggerCount).toBe(0);
    expect(detector.getProgress()).toBe(0);
  });

  it('6. should allow multiple successive triggers when full sequence is entered repeatedly', () => {
    const enterSequence = () => {
      [
        'ArrowUp',
        'ArrowUp',
        'ArrowDown',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'ArrowLeft',
        'ArrowRight',
        'b',
        'a',
      ].forEach((k) => detector.handleKey(k));
    };

    enterSequence(); // First activation
    expect(triggerCount).toBe(1);

    enterSequence(); // Second activation
    expect(triggerCount).toBe(2);
  });
});
