import React, { useEffect } from 'react';
import {
  Clock,
  Play,
  Pause,
} from 'lucide-react';
import { useTimetableStore } from '../../stores/useTimetableStore';
import { useCampusStore } from '../../stores/useCampusStore';
import { useThemeStore } from '../../stores/useThemeStore';

export const TimeMachineBar: React.FC = () => {
  const simulatedDate = useTimetableStore((state) => state.simulatedDate);
  const isLiveClock = useTimetableStore((state) => state.isLiveClock);
  const presets = useTimetableStore((state) => state.presets);
  const selectedPresetId = useTimetableStore((state) => state.selectedPresetId);
  const setSimulatedDate = useTimetableStore((state) => state.setSimulatedDate);
  const toggleLiveClock = useTimetableStore((state) => state.toggleLiveClock);
  const applyPreset = useTimetableStore((state) => state.applyPreset);
  const refreshSchedule = useTimetableStore((state) => state.refreshSchedule);
  const navigateToRoom = useCampusStore((state) => state.navigateToRoom);

  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  // Live clock interval ticker
  useEffect(() => {
    if (!isLiveClock) return;
    const interval = setInterval(() => {
      refreshSchedule();
    }, 1000);
    return () => clearInterval(interval);
  }, [isLiveClock, refreshSchedule]);

  const handlePresetSelect = (presetId: string) => {
    applyPreset(presetId);
    const preset = presets.find((p) => p.id === presetId);
    if (preset?.targetRoomId) {
      navigateToRoom(preset.targetRoomId);
    }
  };

  const handleStepTime = (deltaMinutes: number) => {
    const nextDate = new Date(simulatedDate.getTime() + deltaMinutes * 60 * 1000);
    setSimulatedDate(nextDate);
  };

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayStr = days[simulatedDate.getDay()];
  const timeStr = simulatedDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const containerBgClass = isDark
    ? 'bg-slate-900/90 backdrop-blur-xl border-slate-700/80 text-white shadow-black/80'
    : 'bg-white/95 backdrop-blur-xl border-slate-200/90 text-slate-900 shadow-slate-300/50';

  const readoutBgClass = isDark
    ? 'bg-slate-950/60 border-slate-800'
    : 'bg-slate-100 border-slate-200';

  const btnStepClass = isDark
    ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border-slate-200';

  const isPanelOpen = useCampusStore((state) => state.isPanelOpen);
  const selectedRoomId = useCampusStore((state) => state.selectedRoomId);
  const isCoveredBySheet = isPanelOpen || selectedRoomId !== null;

  return (
    <div
      data-testid="time-machine-bar"
      className={`absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto max-w-4xl w-[95%] sm:w-auto border rounded-2xl p-1.5 sm:p-2.5 shadow-2xl flex items-center justify-between gap-1.5 sm:gap-3 select-none animate-in fade-in slide-in-from-bottom duration-300 ${
        isCoveredBySheet ? 'hidden md:flex' : 'flex'
      } flex-nowrap overflow-x-auto no-scrollbar ${containerBgClass}`}
    >
      {/* Clock Status & Display */}
      <div className="flex items-center gap-2.5 px-2">
        <button
          onClick={toggleLiveClock}
          data-testid="live-clock-toggle"
          title={isLiveClock ? 'Pause Live Clock' : 'Resume Live Clock'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            isLiveClock
              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/50 shadow-lg shadow-emerald-500/20'
              : isDark
              ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
          }`}
        >
          {isLiveClock ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>LIVE</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping ml-0.5" />
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>PAUSED</span>
            </>
          )}
        </button>

        {/* Current Time Readout */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono ${readoutBgClass}`}>
          <Clock className="w-3.5 h-3.5 text-cyan-500" />
          <span className="font-bold text-cyan-600 dark:text-cyan-300">{dayStr}</span>
          <span className="font-semibold">{timeStr}</span>
        </div>
      </div>

      {/* Quick Schedule Presets */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full sm:max-w-md no-scrollbar">
        {presets.slice(0, 5).map((preset) => {
          const isActive = selectedPresetId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset.id)}
              data-testid={`preset-btn-${preset.id}`}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border-cyan-400 shadow-md shadow-cyan-500/20'
                  : isDark
                  ? 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:text-white'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-950'
              }`}
              title={preset.description}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Manual Step Controls (+15m / -15m) */}
      <div className="flex items-center gap-1 px-1">
        <button
          onClick={() => handleStepTime(-15)}
          className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition-colors ${btnStepClass}`}
          title="Back 15 minutes"
        >
          -15m
        </button>
        <button
          onClick={() => handleStepTime(15)}
          className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition-colors ${btnStepClass}`}
          title="Forward 15 minutes"
        >
          +15m
        </button>
      </div>
    </div>
  );
};
