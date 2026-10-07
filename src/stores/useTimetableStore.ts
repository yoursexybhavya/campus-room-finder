import { create } from 'zustand';
import { ActiveScheduleResult, TimePreset } from '../types/timetable';
import { calculateActiveSchedule } from '../services/time/datetimeEngine';

export const TIME_PRESETS: TimePreset[] = [
  {
    id: 'preset_mon_0930',
    label: 'Mon 09:30',
    description: 'Data Structures (LT-1, Ground)',
    date: new Date('2026-10-12T09:30:00'),
    targetRoomId: 'LT-1',
  },
  {
    id: 'preset_mon_1105',
    label: 'Mon 11:05',
    description: 'Morning Break (Next: LT-3)',
    date: new Date('2026-10-12T11:05:00'),
    targetRoomId: 'LT-3',
  },
  {
    id: 'preset_mon_1130',
    label: 'Mon 11:30',
    description: 'Computer Org (LT-3, 1st Floor)',
    date: new Date('2026-10-12T11:30:00'),
    targetRoomId: 'LT-3',
  },
  {
    id: 'preset_mon_1330',
    label: 'Mon 13:30',
    description: 'Lunch Break (Next: LAB-3)',
    date: new Date('2026-10-12T13:30:00'),
    targetRoomId: 'LAB-3',
  },
  {
    id: 'preset_mon_1430',
    label: 'Mon 14:30',
    description: 'AI Lab (LAB-3, 1st Floor)',
    date: new Date('2026-10-12T14:30:00'),
    targetRoomId: 'LAB-3',
  },
  {
    id: 'preset_mon_1730',
    label: 'Mon 17:30',
    description: 'Day Concluded (Day Finished)',
    date: new Date('2026-10-12T17:30:00'),
  },
  {
    id: 'preset_sun_1000',
    label: 'Sun 10:00',
    description: 'Weekend Off (Library Self-Study)',
    date: new Date('2026-10-18T10:00:00'),
  },
];

export interface TimetableStoreState {
  simulatedDate: Date;
  isLiveClock: boolean;
  activeSchedule: ActiveScheduleResult;
  presets: TimePreset[];
  selectedPresetId: string | null;

  setSimulatedDate: (date: Date) => void;
  toggleLiveClock: () => void;
  setLiveClock: (enabled: boolean) => void;
  applyPreset: (presetId: string) => void;
  refreshSchedule: () => void;
}

// Initial simulation state defaults to Monday 09:15
const initialDate = new Date('2026-10-12T09:15:00');

export const useTimetableStore = create<TimetableStoreState>((set, get) => ({
  simulatedDate: initialDate,
  isLiveClock: false,
  activeSchedule: calculateActiveSchedule(initialDate),
  presets: TIME_PRESETS,
  selectedPresetId: null,

  setSimulatedDate: (date: Date) => {
    const activeSchedule = calculateActiveSchedule(date);
    set({
      simulatedDate: date,
      isLiveClock: false,
      activeSchedule,
    });
  },

  toggleLiveClock: () => {
    const nextLive = !get().isLiveClock;
    set({ isLiveClock: nextLive });
    if (nextLive) {
      const now = new Date();
      set({
        simulatedDate: now,
        activeSchedule: calculateActiveSchedule(now),
        selectedPresetId: null,
      });
    }
  },

  setLiveClock: (enabled: boolean) => {
    set({ isLiveClock: enabled });
    if (enabled) {
      const now = new Date();
      set({
        simulatedDate: now,
        activeSchedule: calculateActiveSchedule(now),
        selectedPresetId: null,
      });
    }
  },

  applyPreset: (presetId: string) => {
    const preset = TIME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const activeSchedule = calculateActiveSchedule(preset.date);
    set({
      simulatedDate: preset.date,
      isLiveClock: false,
      selectedPresetId: presetId,
      activeSchedule,
    });
  },

  refreshSchedule: () => {
    const date = get().isLiveClock ? new Date() : get().simulatedDate;
    set({
      simulatedDate: date,
      activeSchedule: calculateActiveSchedule(date),
    });
  },
}));
