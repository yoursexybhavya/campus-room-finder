import React, { useMemo, useEffect } from 'react';
import {
  Navigation,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  X,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Footprints,
  Compass,
} from 'lucide-react';
import { useCampusStore } from '../../stores/useCampusStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { findDetailedPathToRoom } from '../../services/routing/pathfinding';
import { campusRooms } from '../../data/campusRooms';

export const NavigationHUD: React.FC = () => {
  const isNavigating = useCampusStore((state) => state.isNavigating);
  const setIsNavigating = useCampusStore((state) => state.setIsNavigating);
  const selectedRoomId = useCampusStore((state) => state.selectedRoomId);
  const userOriginId = useCampusStore((state) => state.userOriginId);
  const currentStepIndex = useCampusStore((state) => state.currentStepIndex);
  const setCurrentStepIndex = useCampusStore((state) => state.setCurrentStepIndex);
  const setFloorFilter = useCampusStore((state) => state.setFloorFilter);
  const setCameraTarget = useCampusStore((state) => state.setCameraTarget);
  const navigationPath = useCampusStore((state) => state.navigationPath);

  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  const [isPlaying, setIsPlaying] = React.useState(false);

  // Compute detailed route steps from origin to destination
  const route = useMemo(() => {
    if (!selectedRoomId) return null;
    return findDetailedPathToRoom(selectedRoomId, userOriginId);
  }, [selectedRoomId, userOriginId]);

  const steps = route?.steps || [];
  const currentStep = steps[currentStepIndex] || steps[0];
  const nextStep = steps[currentStepIndex + 1];

  const destinationRoom = useMemo(() => {
    return selectedRoomId ? campusRooms.find((r) => r.id === selectedRoomId) : null;
  }, [selectedRoomId]);

  // Auto-play walk simulator
  useEffect(() => {
    if (!isPlaying || !isNavigating || steps.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentStepIndex((currentStepIndex + 1) % steps.length);
    }, 2400);

    return () => clearInterval(interval);
  }, [isPlaying, isNavigating, currentStepIndex, steps.length, setCurrentStepIndex]);

  // Synchronize floor filter and camera with current step
  useEffect(() => {
    if (isNavigating && currentStep && navigationPath && navigationPath[currentStepIndex]) {
      const coords = navigationPath[currentStepIndex];
      // Switch active floor filter if changing floors
      if (currentStep.floor) {
        setFloorFilter(currentStep.floor);
      }
      // Center camera on user position
      setCameraTarget(
        [coords[0] + 8, coords[1] + 7, coords[2] + 8],
        coords
      );
    }
  }, [isNavigating, currentStepIndex, currentStep, navigationPath, setFloorFilter, setCameraTarget]);

  if (!isNavigating || !route || steps.length === 0) return null;

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleExit = () => {
    setIsNavigating(false);
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  // Determine turn maneuver icon
  const getTurnIcon = (instruction: string) => {
    if (instruction.includes('right')) return <CornerUpRight className="w-6 h-6 text-emerald-400" />;
    if (instruction.includes('left')) return <CornerUpLeft className="w-6 h-6 text-emerald-400" />;
    if (instruction.includes('stairs') || instruction.includes('Floor')) return <Compass className="w-6 h-6 text-purple-400" />;
    if (instruction.includes('destination') || instruction.includes('Arrive')) return <Navigation className="w-6 h-6 text-cyan-400" />;
    return <ArrowUp className="w-6 h-6 text-emerald-400" />;
  };

  const containerBgClass = isDark
    ? 'bg-slate-900/95 backdrop-blur-2xl border-slate-700/80 text-white shadow-black/80'
    : 'bg-white/95 backdrop-blur-2xl border-slate-200/90 text-slate-900 shadow-slate-300/60';

  return (
    <div
      data-testid="navigation-hud-banner"
      className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-lg w-[94%] sm:w-auto min-w-0 sm:min-w-[420px] select-none animate-in slide-in-from-top duration-300"
    >
      <div className={`border rounded-3xl p-4 shadow-2xl ${containerBgClass}`}>
        {/* Main Turn Direction Bar */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5">
            {/* Maneuver Turn Circle */}
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-lg">
              {getTurnIcon(currentStep?.instruction || '')}
            </div>

            {/* Instruction and Distance */}
            <div className="min-w-0 pr-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-mono uppercase font-bold text-emerald-500 dark:text-emerald-400 tracking-wide">
                  {currentStepIndex === 0
                    ? 'Start'
                    : currentStepIndex === steps.length - 1
                    ? 'Arrival'
                    : `In ${currentStep?.distanceMeters || 10}m`}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 font-bold border border-cyan-500/30">
                  {currentStep?.floor === 'first' ? '1st Floor' : 'Ground Floor'}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold leading-tight text-slate-900 dark:text-white truncate">
                {currentStep?.instruction}
              </h2>
              {nextStep && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                  Then: {nextStep.instruction}
                </p>
              )}
            </div>
          </div>

          {/* Exit Navigation Button */}
          <button
            onClick={handleExit}
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
            title="Exit Navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress & Walk Simulator Bar */}
        <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={`step-dot-${idx}`}
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStepIndex
                    ? 'w-6 bg-cyan-500'
                    : idx < currentStepIndex
                    ? 'w-2 bg-emerald-500/60'
                    : 'w-2 bg-slate-300 dark:bg-slate-700'
                }`}
                title={`Jump to step ${idx + 1}`}
              />
            ))}
            <span className="text-[11px] font-mono text-slate-400 ml-1.5">
              {currentStepIndex + 1}/{steps.length}
            </span>
          </div>

          {/* Controls: Prev, Play/Pause Simulator, Next */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-colors"
              title="Previous Step"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-cyan-500 text-slate-950 border-cyan-400 hover:bg-cyan-400'
              }`}
              title={isPlaying ? 'Pause Walk' : 'Auto-Walk Along Route'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Simulate Walk'}</span>
            </button>

            <button
              onClick={handleNext}
              disabled={currentStepIndex === steps.length - 1}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-colors"
              title="Next Step"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
