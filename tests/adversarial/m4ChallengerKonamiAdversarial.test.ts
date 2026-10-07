import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  KonamiCodeDetector,
  bindKonamiListener,
  initKonamiListener,
  isInputElement,
} from '../../src/services/keyboard/konamiListener';
import { useEasterEggStore } from '../../src/stores/useEasterEggStore';
import {
  KONAMI_SEQUENCE,
  DEFAULT_KONAMI_TIMEOUT_MS,
  DEFAULT_BG_COLOR,
  COSMIC_BG_COLOR,
  STATUS_NORMAL,
  STATUS_ENGAGED,
  STATUS_RESTORED,
} from '../../src/types/antiGravity';

describe('Milestone 4 Challenger Adversarial Stress Suite (Konami & Easter Egg)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useEasterEggStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    useEasterEggStore.getState().reset();
  });

  // =========================================================================
  // SUITE 1: Rapid Keystroke Fuzzing & Anomaly Resistance
  // =========================================================================
  describe('1. Rapid Keystroke Fuzzing & Anomaly Resistance', () => {
    it('1.1 should withstand 2,000 pseudo-random keystrokes without any false trigger', () => {
      let triggered = false;
      const detector = new KonamiCodeDetector(() => {
        triggered = true;
      });

      const noiseKeys = [
        'a', 'b', 'c', 'd', 'x', 'y', 'z', '1', '2', '9',
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'Enter', 'Escape', 'Backspace', 'Tab', 'Space', 'Shift',
      ];

      // PRNG generator with fixed seed for deterministic reproducibility
      let seed = 42;
      const nextRandom = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };

      for (let i = 0; i < 2000; i++) {
        // Pick random key from noiseKeys (avoiding exact 10-key Konami sequence)
        const randKey = noiseKeys[Math.floor(nextRandom() * noiseKeys.length)];
        detector.handleKey(randKey);
      }

      // Even if randomly an ArrowUp/ArrowDown happened, the full 10-key sequence
      // has probability (1/20)^10 = ~9.7e-14 of appearing randomly
      expect(triggered).toBe(false);
    });

    it('1.2 should reject interleaved noise and reset progress when garbage keys interrupt sequence', () => {
      let triggered = false;
      const detector = new KonamiCodeDetector(() => {
        triggered = true;
      });

      // Interleave valid Konami keys with garbage keys
      for (let i = 0; i < KONAMI_SEQUENCE.length; i++) {
        detector.handleKey(KONAMI_SEQUENCE[i]);
        // After an invalid key 'x', progress must be reset to 0
        detector.handleKey('x'); // garbage key
        expect(detector.getProgress()).toBe(0);
      }

      expect(triggered).toBe(false);
    });

    it('1.3 should recover cleanly when repetitive sequence starter keys are fuzzed before full sequence', () => {
      let triggered = false;
      const detector = new KonamiCodeDetector(() => {
        triggered = true;
      });

      // User spams ArrowUp an even number of times (10 times)
      for (let i = 0; i < 10; i++) {
        detector.handleKey('ArrowUp');
      }
      // Since Konami starts with [ArrowUp, ArrowUp], an even count lands on progress = 2
      expect(detector.getProgress()).toBe(2);

      // Now complete the remaining 8 keys
      const remainingKeys = [
        'ArrowDown',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'ArrowLeft',
        'ArrowRight',
        'b',
        'a',
      ];

      remainingKeys.forEach((key) => detector.handleKey(key));

      expect(triggered).toBe(true);
      expect(detector.getProgress()).toBe(0); // Auto-resets on trigger
    });

    it('1.3b should recover cleanly when an odd number of starter keys are fuzzed (11 times)', () => {
      let triggered = false;
      const detector = new KonamiCodeDetector(() => {
        triggered = true;
      });

      // User spams ArrowUp an odd number of times (11 times)
      // 11th ArrowUp acts as the 1st key of a new sequence -> progress = 1
      for (let i = 0; i < 11; i++) {
        detector.handleKey('ArrowUp');
      }
      expect(detector.getProgress()).toBe(1);

      // Supply the 2nd key (ArrowUp) + remaining 8 keys
      detector.handleKey('ArrowUp');
      expect(detector.getProgress()).toBe(2);

      const remainingKeys = [
        'ArrowDown',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'ArrowLeft',
        'ArrowRight',
        'b',
        'a',
      ];

      remainingKeys.forEach((key) => detector.handleKey(key));

      expect(triggered).toBe(true);
      expect(detector.getProgress()).toBe(0);
    });

    it('1.4 should reject every single 1-key mutation across all 10 positions of the Konami code', () => {
      for (let mutatePos = 0; mutatePos < KONAMI_SEQUENCE.length; mutatePos++) {
        let triggered = false;
        const detector = new KonamiCodeDetector(() => {
          triggered = true;
        });

        for (let pos = 0; pos < KONAMI_SEQUENCE.length; pos++) {
          if (pos === mutatePos) {
            // Replace with a guaranteed incorrect key
            const wrongKey = KONAMI_SEQUENCE[pos] === 'b' ? 'q' : 'z';
            detector.handleKey(wrongKey);
          } else {
            detector.handleKey(KONAMI_SEQUENCE[pos]);
          }
        }

        expect(triggered).toBe(false);
      }
    });

    it('1.5 should detect an authentic 10-key sequence embedded within a noisy keystroke stream', () => {
      let triggerCount = 0;
      const detector = new KonamiCodeDetector(() => {
        triggerCount++;
      });

      // 100 noise keys (excluding ArrowUp to prevent partial matches)
      for (let i = 0; i < 100; i++) {
        detector.handleKey('c');
      }
      expect(triggerCount).toBe(0);

      // Exactly the 10 Konami keys
      KONAMI_SEQUENCE.forEach((k) => detector.handleKey(k));
      expect(triggerCount).toBe(1);

      // 100 more noise keys
      for (let i = 0; i < 100; i++) {
        detector.handleKey('e');
      }
      expect(triggerCount).toBe(1);
    });
  });

  // =========================================================================
  // SUITE 2: Input Element & Form Context Isolation Edge Cases
  // =========================================================================
  describe('2. Input Element & Form Context Isolation Edge Cases', () => {
    it('2.1 should isolate all standard HTML input element types from triggering Konami code', () => {
      const inputTypes = ['text', 'search', 'password', 'email', 'number', 'tel', 'url'];

      inputTypes.forEach((type) => {
        const input = document.createElement('input');
        input.type = type;
        expect(isInputElement(input)).toBe(true);

        let triggered = false;
        const detector = new KonamiCodeDetector(() => {
          triggered = true;
        });

        KONAMI_SEQUENCE.forEach((k) => detector.handleKey(k, isInputElement(input)));
        expect(triggered).toBe(false);
        expect(detector.getProgress()).toBe(0);
      });
    });

    it('2.2 should isolate textarea elements from triggering Konami code', () => {
      const textarea = document.createElement('textarea');
      expect(isInputElement(textarea)).toBe(true);

      let triggered = false;
      const detector = new KonamiCodeDetector(() => {
        triggered = true;
      });

      KONAMI_SEQUENCE.forEach((k) => detector.handleKey(k, isInputElement(textarea)));
      expect(triggered).toBe(false);
      expect(detector.getProgress()).toBe(0);
    });

    it('2.3 should isolate select dropdown elements from triggering Konami code', () => {
      const select = document.createElement('select');
      const opt = document.createElement('option');
      opt.value = 'opt1';
      select.appendChild(opt);
      expect(isInputElement(select)).toBe(true);

      let triggered = false;
      const detector = new KonamiCodeDetector(() => {
        triggered = true;
      });

      KONAMI_SEQUENCE.forEach((k) => detector.handleKey(k, isInputElement(select)));
      expect(triggered).toBe(false);
    });

    it('2.4 should isolate contenteditable elements (both attribute and property)', () => {
      const editableDiv = document.createElement('div');
      editableDiv.setAttribute('contenteditable', 'true');
      expect(isInputElement(editableDiv)).toBe(true);

      const editableSpan = document.createElement('span');
      (editableSpan as any).isContentEditable = true;
      expect(isInputElement(editableSpan)).toBe(true);

      let triggered = false;
      const detector = new KonamiCodeDetector(() => {
        triggered = true;
      });

      KONAMI_SEQUENCE.forEach((k) => detector.handleKey(k, isInputElement(editableDiv)));
      expect(triggered).toBe(false);
    });

    it('2.4b should isolate child elements within contenteditable host when isContentEditable evaluates to true', () => {
      const container = document.createElement('div');
      container.setAttribute('contenteditable', 'true');
      const paragraph = document.createElement('p');
      const innerSpan = document.createElement('span');
      innerSpan.textContent = 'Rich text';
      // In real browser engines, HTMLElement.prototype.isContentEditable returns true for descendants
      Object.defineProperty(innerSpan, 'isContentEditable', { value: true, configurable: true });

      paragraph.appendChild(innerSpan);
      container.appendChild(paragraph);
      document.body.appendChild(container);

      expect(isInputElement(innerSpan)).toBe(true);

      let triggered = false;
      const detector = new KonamiCodeDetector(() => {
        triggered = true;
      });
      const cleanup = bindKonamiListener(detector, window);

      KONAMI_SEQUENCE.forEach((k) => {
        innerSpan.dispatchEvent(
          new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })
        );
      });

      expect(triggered).toBe(false);

      cleanup();
      document.body.removeChild(container);
    });

    it('2.5 should isolate input elements nested inside forms, fieldsets, and labels', () => {
      const form = document.createElement('form');
      const fieldset = document.createElement('fieldset');
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'text';

      label.appendChild(input);
      fieldset.appendChild(label);
      form.appendChild(fieldset);
      document.body.appendChild(form);

      expect(isInputElement(input)).toBe(true);

      let triggered = false;
      const detector = new KonamiCodeDetector(() => {
        triggered = true;
      });
      const cleanup = bindKonamiListener(detector, window);

      KONAMI_SEQUENCE.forEach((k) => {
        input.dispatchEvent(
          new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })
        );
      });

      expect(triggered).toBe(false);
      expect(detector.getProgress()).toBe(0);

      cleanup();
      document.body.removeChild(form);
    });

    it('2.6 should isolate nested textarea and select controls inside form hierarchies', () => {
      const form = document.createElement('form');
      const textarea = document.createElement('textarea');
      const select = document.createElement('select');
      form.appendChild(textarea);
      form.appendChild(select);
      document.body.appendChild(form);

      let triggered = false;
      const detector = new KonamiCodeDetector(() => {
        triggered = true;
      });
      const cleanup = bindKonamiListener(detector, window);

      // Dispatch on nested textarea
      KONAMI_SEQUENCE.forEach((k) => {
        textarea.dispatchEvent(
          new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })
        );
      });
      expect(triggered).toBe(false);

      // Dispatch on nested select
      KONAMI_SEQUENCE.forEach((k) => {
        select.dispatchEvent(
          new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })
        );
      });
      expect(triggered).toBe(false);

      cleanup();
      document.body.removeChild(form);
    });

    it('2.7 should allow Konami code to trigger when active element is a non-input element (e.g. button, div, body)', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);
      expect(isInputElement(button)).toBe(false);

      let triggered = false;
      const detector = new KonamiCodeDetector(() => {
        triggered = true;
      });
      const cleanup = bindKonamiListener(detector, window);

      KONAMI_SEQUENCE.forEach((k) => {
        button.dispatchEvent(
          new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })
        );
      });

      expect(triggered).toBe(true);

      cleanup();
      document.body.removeChild(button);
    });

    it('2.8 should handle null, undefined, and primitive non-element targets gracefully in isInputElement', () => {
      expect(isInputElement(null)).toBe(false);
      expect(isInputElement(undefined)).toBe(false);
      expect(isInputElement({})).toBe(false);
      expect(isInputElement('string')).toBe(false);
      expect(isInputElement(123)).toBe(false);
    });
  });

  // =========================================================================
  // SUITE 3: Timing Stress & Boundary Threshold Verification
  // =========================================================================
  describe('3. Timing Stress & Boundary Threshold Verification', () => {
    it('3.1 should keep sequence alive and trigger when key interval is 2490ms (sub-threshold)', () => {
      let triggered = false;
      const detector = new KonamiCodeDetector(() => {
        triggered = true;
      }, 2500);

      // Feed keys one by one with 2490ms delay between each keystroke
      for (let i = 0; i < KONAMI_SEQUENCE.length; i++) {
        detector.handleKey(KONAMI_SEQUENCE[i]);
        if (i < KONAMI_SEQUENCE.length - 1) {
          vi.advanceTimersByTime(2490);
        }
      }

      // Total time elapsed: 9 * 2490ms = 22,410ms (~22.4 seconds)
      expect(triggered).toBe(true);
      expect(detector.getProgress()).toBe(0);
    });

    it('3.2 should reset sequence and fail to trigger when key interval is 2510ms (supra-threshold)', () => {
      let triggered = false;
      const detector = new KonamiCodeDetector(() => {
        triggered = true;
      }, 2500);

      for (let i = 0; i < KONAMI_SEQUENCE.length; i++) {
        detector.handleKey(KONAMI_SEQUENCE[i]);
        // Delay 2510ms before next key, which exceeds the 2500ms timeout
        vi.advanceTimersByTime(2510);
      }

      expect(triggered).toBe(false);
    });

    it('3.3 should verify the sharp boundary cliff between 2499ms and 2501ms', () => {
      // 2499ms test (must keep progress)
      const detectorAlive = new KonamiCodeDetector(() => {});
      detectorAlive.handleKey('ArrowUp');
      expect(detectorAlive.getProgress()).toBe(1);
      vi.advanceTimersByTime(2499);
      expect(detectorAlive.getProgress()).toBe(1); // Still alive!

      // 2501ms test (must reset progress)
      const detectorDead = new KonamiCodeDetector(() => {});
      detectorDead.handleKey('ArrowUp');
      expect(detectorDead.getProgress()).toBe(1);
      vi.advanceTimersByTime(2501);
      expect(detectorDead.getProgress()).toBe(0); // Timed out!
    });

    it('3.4 should reset progress to 0 on mid-sequence abandonment and reject second half', () => {
      let triggered = false;
      const detector = new KonamiCodeDetector(() => {
        triggered = true;
      });

      // Enter first 5 keys
      for (let i = 0; i < 5; i++) {
        detector.handleKey(KONAMI_SEQUENCE[i]);
      }
      expect(detector.getProgress()).toBe(5);

      // Wait past timeout
      vi.advanceTimersByTime(2550);
      expect(detector.getProgress()).toBe(0);

      // Enter remaining 5 keys
      for (let i = 5; i < 10; i++) {
        detector.handleKey(KONAMI_SEQUENCE[i]);
      }

      // Must not trigger since sequence was broken
      expect(triggered).toBe(false);
    });

    it('3.5 should honor custom timeoutMs parameter configuration', () => {
      let triggeredFast = false;
      const detectorFast = new KonamiCodeDetector(() => {
        triggeredFast = true;
      }, 500); // 500ms timeout

      detectorFast.handleKey('ArrowUp');
      vi.advanceTimersByTime(490);
      detectorFast.handleKey('ArrowUp');
      expect(detectorFast.getProgress()).toBe(2);

      vi.advanceTimersByTime(510);
      expect(detectorFast.getProgress()).toBe(0); // Timed out at 500ms
      expect(triggeredFast).toBe(false);
    });
  });

  // =========================================================================
  // SUITE 4: Modifier Combinations & Keyboard Shortcut Immunity
  // =========================================================================
  describe('4. Modifier Combinations & Keyboard Shortcut Immunity', () => {
    it('4.1 should ignore Cmd+A, Ctrl+B, Alt+ArrowLeft shortcuts without disrupting in-progress Konami sequence', () => {
      let triggerCount = 0;
      let progressObserved = 0;

      const detector = new KonamiCodeDetector(
        () => {
          triggerCount++;
        },
        DEFAULT_KONAMI_TIMEOUT_MS,
        (progress) => {
          progressObserved = progress;
        }
      );

      const cleanup = bindKonamiListener(detector, window);

      // 1. Enter partial sequence: ArrowUp, ArrowUp, ArrowDown (progress: 3)
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      expect(detector.getProgress()).toBe(3);
      expect(progressObserved).toBe(3);

      // 2. Fire modifier shortcuts (OS shortcuts: Cmd+A, Ctrl+B, Alt+ArrowLeft)
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', metaKey: true })); // Cmd+A
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true })); // Ctrl+B
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true })); // Alt+ArrowLeft

      // Sequence progress MUST remain untouched at 3
      expect(detector.getProgress()).toBe(3);
      expect(progressObserved).toBe(3);
      expect(triggerCount).toBe(0);

      // 3. Continue and complete remaining 7 keys
      const remaining = [
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'ArrowLeft',
        'ArrowRight',
        'b',
        'a',
      ];
      remaining.forEach((k) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: k }));
      });

      // Verification: full sequence successfully completed and triggered
      expect(triggerCount).toBe(1);
      expect(detector.getProgress()).toBe(0);

      cleanup();
    });

    it('4.2 should never trigger or advance when user spams modifier key combinations', () => {
      let triggered = false;
      const detector = new KonamiCodeDetector(() => {
        triggered = true;
      });

      const cleanup = bindKonamiListener(detector, window);

      const modifierEvents = [
        { key: 'ArrowUp', metaKey: true },
        { key: 'ArrowUp', ctrlKey: true },
        { key: 'ArrowDown', altKey: true },
        { key: 'b', ctrlKey: true, altKey: true },
        { key: 'a', metaKey: true, shiftKey: true },
        { key: 'Tab', altKey: true },
        { key: 'c', metaKey: true },
        { key: 'v', metaKey: true },
      ];

      for (let i = 0; i < 50; i++) {
        const ev = modifierEvents[i % modifierEvents.length];
        window.dispatchEvent(new KeyboardEvent('keydown', ev));
      }

      expect(detector.getProgress()).toBe(0);
      expect(triggered).toBe(false);

      cleanup();
    });

    it('4.3 should block each modifier type individually across all Konami keys', () => {
      const modifiers = [
        { ctrlKey: true },
        { altKey: true },
        { metaKey: true },
      ];

      modifiers.forEach((mod) => {
        let triggered = false;
        const detector = new KonamiCodeDetector(() => {
          triggered = true;
        });
        const cleanup = bindKonamiListener(detector, window);

        KONAMI_SEQUENCE.forEach((k) => {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: k, ...mod }));
        });

        expect(triggered).toBe(false);
        expect(detector.getProgress()).toBe(0);

        cleanup();
      });
    });
  });

  // =========================================================================
  // SUITE 5: Successive Rapid Cycles & Store Integrity Stress
  // =========================================================================
  describe('5. Successive Rapid Cycles & Store Integrity Stress', () => {
    it('5.1 should survive 100 consecutive rapid activate/deactivate store cycles with strict state parity', () => {
      const store = useEasterEggStore.getState();

      for (let cycle = 1; cycle <= 100; cycle++) {
        // Activate
        useEasterEggStore.getState().activate();
        const activeState = useEasterEggStore.getState();
        expect(activeState.isActive).toBe(true);
        expect(activeState.intensity).toBe(1.0);
        expect(activeState.backgroundColor).toBe(COSMIC_BG_COLOR);
        expect(activeState.isStarfieldActive).toBe(true);
        expect(activeState.statusMessage).toBe(STATUS_ENGAGED);
        expect(activeState.triggerCount).toBe(cycle);

        // Deactivate
        useEasterEggStore.getState().deactivate();
        const inactiveState = useEasterEggStore.getState();
        expect(inactiveState.isActive).toBe(false);
        expect(inactiveState.intensity).toBe(0.0);
        expect(inactiveState.backgroundColor).toBe(DEFAULT_BG_COLOR);
        expect(inactiveState.isStarfieldActive).toBe(false);
        expect(inactiveState.statusMessage).toBe(STATUS_RESTORED);
        expect(inactiveState.triggerCount).toBe(cycle); // Preserves activation count
      }
    });

    it('5.2 should execute 100 full 10-key Konami sequences in rapid succession toggling store without desync', () => {
      // Connect detector directly to store toggle
      const detector = new KonamiCodeDetector(() => {
        useEasterEggStore.getState().toggle();
      });

      const initialCount = useEasterEggStore.getState().triggerCount ?? 0;

      for (let seq = 1; seq <= 100; seq++) {
        KONAMI_SEQUENCE.forEach((k) => detector.handleKey(k));

        const state = useEasterEggStore.getState();
        // Odd sequence -> active, Even sequence -> inactive
        const shouldBeActive = seq % 2 === 1;
        expect(state.isActive).toBe(shouldBeActive);
        expect(state.intensity).toBe(shouldBeActive ? 1.0 : 0.0);
        expect(state.isStarfieldActive).toBe(shouldBeActive);
        expect(state.backgroundColor).toBe(shouldBeActive ? COSMIC_BG_COLOR : DEFAULT_BG_COLOR);
        expect(detector.getProgress()).toBe(0);
      }

      // After 100 toggles, state should be inactive
      expect(useEasterEggStore.getState().isActive).toBe(false);
      // And total new activations is exactly 50
      expect(useEasterEggStore.getState().triggerCount).toBe(initialCount + 50);
    });

    it('5.3 should enforce boundary clamping on setIntensity (0.0 to 1.0)', () => {
      const { setIntensity } = useEasterEggStore.getState();

      setIntensity(-10.0);
      expect(useEasterEggStore.getState().intensity).toBe(0.0);

      setIntensity(999.0);
      expect(useEasterEggStore.getState().intensity).toBe(1.0);

      setIntensity(0.42);
      expect(useEasterEggStore.getState().intensity).toBeCloseTo(0.42);
    });

    it('5.4 should enforce boundary clamping on setProgress (0 to 10)', () => {
      const { setProgress } = useEasterEggStore.getState();

      setProgress(-5);
      expect(useEasterEggStore.getState().progress).toBe(0);

      setProgress(100);
      expect(useEasterEggStore.getState().progress).toBe(10);

      setProgress(7);
      expect(useEasterEggStore.getState().progress).toBe(7);
    });

    it('5.5 should reset store completely back to initial baseline on reset()', () => {
      useEasterEggStore.getState().activate();
      useEasterEggStore.getState().setProgress(8);
      expect(useEasterEggStore.getState().isActive).toBe(true);

      useEasterEggStore.getState().reset();
      const state = useEasterEggStore.getState();
      expect(state.isActive).toBe(false);
      expect(state.intensity).toBe(0.0);
      expect(state.backgroundColor).toBe(DEFAULT_BG_COLOR);
      expect(state.isStarfieldActive).toBe(false);
      expect(state.statusMessage).toBe(STATUS_NORMAL);
      expect(state.progress).toBe(0);
    });
  });

  // =========================================================================
  // SUITE 6: Lifecycle, Event Binding, & Listener Teardown Robustness
  // =========================================================================
  describe('6. Lifecycle, Event Binding, & Listener Teardown Robustness', () => {
    it('6.1 should unbind cleanly and prevent orphaned listeners from firing after cleanup', () => {
      let triggered = false;
      const detector = new KonamiCodeDetector(() => {
        triggered = true;
      });

      const unbind = bindKonamiListener(detector, window);

      // Enter 5 keys
      for (let i = 0; i < 5; i++) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: KONAMI_SEQUENCE[i] }));
      }
      expect(detector.getProgress()).toBe(5);

      // Unbind
      unbind();
      expect(detector.getProgress()).toBe(0); // Cleanup resets detector

      // Dispatch full sequence on window after unbind
      KONAMI_SEQUENCE.forEach((k) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: k }));
      });

      expect(triggered).toBe(false);
    });

    it('6.2 should support initKonamiListener helper with automated store bindings', () => {
      const unbind = initKonamiListener();

      // Enter full Konami sequence
      KONAMI_SEQUENCE.forEach((k) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: k }));
      });

      expect(useEasterEggStore.getState().isActive).toBe(true);
      expect(useEasterEggStore.getState().intensity).toBe(1.0);

      // Second sequence deactivates
      KONAMI_SEQUENCE.forEach((k) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: k }));
      });
      expect(useEasterEggStore.getState().isActive).toBe(false);

      unbind();
    });

    it('6.3 should safely handle calling detector.reset() when no active timer is pending', () => {
      const detector = new KonamiCodeDetector(() => {});
      expect(() => detector.reset()).not.toThrow();
      expect(() => detector.reset()).not.toThrow();
      expect(detector.getProgress()).toBe(0);
    });
  });
});
