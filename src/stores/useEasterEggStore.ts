import { create } from 'zustand';
import {
  EasterEggStoreState,
  DEFAULT_BG_COLOR,
  COSMIC_BG_COLOR,
  STATUS_NORMAL,
  STATUS_ENGAGED,
  STATUS_RESTORED,
} from '../types/antiGravity';

export const useEasterEggStore = create<EasterEggStoreState>((set, get) => ({
  // State
  isActive: false,
  intensity: 0.0,
  backgroundColor: DEFAULT_BG_COLOR,
  isStarfieldActive: false,
  statusMessage: STATUS_NORMAL,
  progress: 0,
  triggerCount: 0,

  // Actions
  toggle: () => {
    if (get().isActive) {
      get().deactivate();
    } else {
      get().activate();
    }
  },

  activate: () => {
    set((state) => ({
      isActive: true,
      intensity: 1.0,
      backgroundColor: COSMIC_BG_COLOR,
      isStarfieldActive: true,
      statusMessage: STATUS_ENGAGED,
      triggerCount: (state.triggerCount ?? 0) + 1,
    }));
  },

  deactivate: () => {
    set({
      isActive: false,
      intensity: 0.0,
      backgroundColor: DEFAULT_BG_COLOR,
      isStarfieldActive: false,
      statusMessage: STATUS_RESTORED,
    });
  },

  setIntensity: (intensity: number) => {
    const clamped = Math.min(Math.max(intensity, 0.0), 1.0);
    set({ intensity: clamped });
  },

  setStatusMessage: (statusMessage: string) => {
    set({ statusMessage });
  },

  setProgress: (progress: number) => {
    set({ progress: Math.max(0, Math.min(progress, 10)) });
  },

  reset: () => {
    set({
      isActive: false,
      intensity: 0.0,
      backgroundColor: DEFAULT_BG_COLOR,
      isStarfieldActive: false,
      statusMessage: STATUS_NORMAL,
      progress: 0,
    });
  },
}));
