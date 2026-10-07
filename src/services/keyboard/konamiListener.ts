/**
 * Campus Room Finder - Konami Code Keyboard Listener Service
 * Milestone 4 (R4)
 */

import { useEffect, useRef } from 'react';
import {
  KONAMI_SEQUENCE,
  DEFAULT_KONAMI_TIMEOUT_MS,
  KonamiListenerOptions,
} from '../../types/antiGravity';
import { useEasterEggStore } from '../../stores/useEasterEggStore';

/**
 * Checks whether an event target is an interactive text input element
 * where keystrokes must be isolated from Konami detection.
 */
export function isInputElement(target: any): boolean {
  if (!target) return false;
  const tagName = typeof target.tagName === 'string' ? target.tagName.toLowerCase() : '';
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }
  if (target.isContentEditable === true || target.getAttribute?.('contenteditable') === 'true') {
    return true;
  }
  return false;
}

/**
 * Core detector class matching unit and integration test contracts.
 */
export class KonamiCodeDetector {
  private currentIndex = 0;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly timeoutMs: number;
  private readonly onTrigger: () => void;
  private readonly onProgress?: (progress: number, total: number) => void;

  constructor(
    onTrigger: () => void,
    timeoutMs = DEFAULT_KONAMI_TIMEOUT_MS,
    onProgress?: (progress: number, total: number) => void
  ) {
    this.onTrigger = onTrigger;
    this.timeoutMs = timeoutMs;
    this.onProgress = onProgress;
  }

  /**
   * Evaluates key stroke. Returns true if full sequence triggered.
   */
  handleKey(key: string, isInputFocused = false): boolean {
    if (isInputFocused) return false;

    const normalizedKey = key.toLowerCase();
    const expectedKey = KONAMI_SEQUENCE[this.currentIndex];

    // Reset timeout window on every considered keystroke
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      this.reset();
    }, this.timeoutMs);

    if (normalizedKey === expectedKey) {
      this.currentIndex++;
      this.onProgress?.(this.currentIndex, KONAMI_SEQUENCE.length);

      if (this.currentIndex === KONAMI_SEQUENCE.length) {
        this.reset();
        this.onTrigger();
        return true;
      }
    } else {
      // If mismatch equals sequence starter ('arrowup'), restart at 1
      this.currentIndex = normalizedKey === KONAMI_SEQUENCE[0] ? 1 : 0;
      this.onProgress?.(this.currentIndex, KONAMI_SEQUENCE.length);
    }
    return false;
  }

  getProgress(): number {
    return this.currentIndex;
  }

  reset(): void {
    this.currentIndex = 0;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.onProgress?.(0, KONAMI_SEQUENCE.length);
  }
}

/**
 * Binds global keydown event listener on window or custom target element.
 * Returns cleanup function.
 */
export function bindKonamiListener(
  detector: KonamiCodeDetector,
  target?: Window | Document | HTMLElement
): () => void {
  const targetElement = target ?? (typeof window !== 'undefined' ? window : null);
  if (!targetElement) {
    return () => {};
  }

  const handleKeyDown = (event: Event) => {
    const kbEvent = event as KeyboardEvent;

    // Ignore OS/Browser modifier shortcuts (Cmd+A, Ctrl+B, Alt+Left)
    if (kbEvent.ctrlKey || kbEvent.altKey || kbEvent.metaKey) {
      return;
    }

    // Input element isolation
    const isInput = isInputElement(kbEvent.target);

    // Process keystroke
    detector.handleKey(kbEvent.key, isInput);
  };

  targetElement.addEventListener('keydown', handleKeyDown as EventListener, { passive: true });

  return () => {
    targetElement.removeEventListener('keydown', handleKeyDown as EventListener);
    detector.reset();
  };
}

/**
 * Initializes global Konami code listener with default store bindings.
 * Returns cleanup unbind function.
 */
export function initKonamiListener(
  onTrigger?: () => void,
  options?: KonamiListenerOptions
): () => void {
  const trigger = onTrigger ?? (() => useEasterEggStore.getState().toggle());
  const progressCb =
    options?.onProgress ?? ((progress: number) => useEasterEggStore.getState().setProgress(progress));

  const detector = new KonamiCodeDetector(
    trigger,
    options?.timeoutMs ?? DEFAULT_KONAMI_TIMEOUT_MS,
    progressCb
  );

  return bindKonamiListener(detector, options?.target);
}

/**
 * React lifecycle hook for mounting the Konami listener in App.tsx or parent component.
 */
export function useKonamiListener(options?: {
  enabled?: boolean;
  onTrigger?: () => void;
  target?: Window | Document | HTMLElement;
  timeoutMs?: number;
}) {
  const { enabled = true, onTrigger, target, timeoutMs = DEFAULT_KONAMI_TIMEOUT_MS } = options ?? {};
  const setProgress = useEasterEggStore((s) => s.setProgress);
  const toggle = useEasterEggStore((s) => s.toggle);

  const triggerRef = useRef<() => void>(onTrigger ?? toggle);
  triggerRef.current = onTrigger ?? toggle;

  useEffect(() => {
    if (!enabled) return;

    const detector = new KonamiCodeDetector(
      () => {
        triggerRef.current?.();
      },
      timeoutMs,
      (progress) => setProgress(progress)
    );

    const cleanup = bindKonamiListener(detector, target);

    return () => {
      cleanup();
    };
  }, [enabled, target, timeoutMs, setProgress]);
}
