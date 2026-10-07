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

export class KonamiCodeDetector {
  private currentIndex = 0;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly timeoutMs: number;
  private readonly onTrigger: () => void;

  constructor(onTrigger: () => void, timeoutMs = 2500) {
    this.onTrigger = onTrigger;
    this.timeoutMs = timeoutMs;
  }

  handleKey(key: string, isInputFocused = false): boolean {
    if (isInputFocused) return false;

    const normalizedKey = key.toLowerCase();
    const expectedKey = KONAMI_SEQUENCE[this.currentIndex];

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      this.reset();
    }, this.timeoutMs);

    if (normalizedKey === expectedKey) {
      this.currentIndex++;
      if (this.currentIndex === KONAMI_SEQUENCE.length) {
        this.reset();
        this.onTrigger();
        return true;
      }
    } else {
      // If mismatch matches starting key ('arrowup'), restart at 1
      this.currentIndex = normalizedKey === KONAMI_SEQUENCE[0] ? 1 : 0;
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
  }
}
