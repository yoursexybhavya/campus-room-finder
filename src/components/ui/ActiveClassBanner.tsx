import React, { useState } from 'react';
import {
  MapPin,
  Clock,
  Navigation,
  CheckCircle,
  Coffee,
  Calendar,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useTimetableStore } from '../../stores/useTimetableStore';
import { useCampusStore } from '../../stores/useCampusStore';
import { useThemeStore } from '../../stores/useThemeStore';

export const ActiveClassBanner: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const activeSchedule = useTimetableStore((state) => state.activeSchedule);
  const navigateToRoom = useCampusStore((state) => state.navigateToRoom);
  const selectRoom = useCampusStore((state) => state.selectRoom);
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  const { status, activeSlot, activeRoom, activeFaculty, nextSlot, minutesRemaining, minutesUntilNext } =
    activeSchedule;

  const handleNavigateToActive = () => {
    if (activeRoom) {
      navigateToRoom(activeRoom.id);
      selectRoom(activeRoom.id);
    }
  };

  const handleNavigateToNext = () => {
    if (nextSlot) {
      navigateToRoom(nextSlot.roomId);
      selectRoom(nextSlot.roomId);
    }
  };

  const containerBgClass = isDark
    ? 'bg-slate-900/95 backdrop-blur-xl border-slate-700/80 text-white shadow-black/70'
    : 'bg-white/95 backdrop-blur-xl border-slate-200/90 text-slate-900 shadow-slate-300/50';

  const textMutedClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const borderSubtleClass = isDark ? 'border-slate-800/80' : 'border-slate-200';

  const selectedRoomId = useCampusStore((state) => state.selectedRoomId);
  const isPanelOpen = useCampusStore((state) => state.isPanelOpen);
  const isCoveredBySheet = isPanelOpen || selectedRoomId !== null;

  return (
    <div
      data-testid="active-class-banner"
      className={`absolute top-28 sm:top-[138px] left-3 sm:left-4 z-30 pointer-events-auto w-[calc(100%-80px)] sm:w-80 border rounded-2xl p-3 shadow-2xl select-none transition-all duration-300 animate-in fade-in slide-in-from-top ${
        isCoveredBySheet ? 'hidden md:block' : 'block'
      } ${containerBgClass}`}
    >
      {/* IN SESSION STATUS */}
      {status === 'IN_SESSION' && activeSlot && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              In Session
            </span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
                <Clock className="w-3 h-3" />
                <span>{minutesRemaining}m</span>
              </div>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-slate-400 hover:text-white p-0.5 rounded"
                title={isCollapsed ? 'Expand class details' : 'Collapse banner'}
              >
                {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <h3 className="text-xs sm:text-sm font-bold line-clamp-1 leading-snug">
            {activeSlot.courseName}
          </h3>
          <p className={`text-[11px] mt-0.5 ${textMutedClass}`}>
            {activeSlot.courseCode} • {activeSlot.slotType}
          </p>

          {!isCollapsed && (
            <>
              <div className={`mt-2 pt-2 border-t ${borderSubtleClass} flex items-center justify-between gap-2 text-xs`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                  <span className="truncate font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    {activeRoom?.name || activeSlot.roomId}
                  </span>
                </div>
                {activeFaculty && (
                  <span className={`text-[10px] truncate shrink-0 max-w-[100px] ${textMutedClass}`}>
                    {activeFaculty.name}
                  </span>
                )}
              </div>

              <button
                onClick={handleNavigateToActive}
                data-testid="take-me-to-class-btn"
                className="mt-2.5 w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold py-1.5 px-3 rounded-xl text-xs shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Take Me To Class</span>
                <ArrowRight className="w-3 h-3 ml-0.5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* BETWEEN CLASSES / BREAK STATUS */}
      {status === 'BETWEEN_CLASSES' && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40">
              <Coffee className="w-3 h-3" />
              Break Between Classes
            </span>
            <div className="flex items-center gap-1 text-[11px] font-mono text-amber-600 dark:text-amber-300">
              <Clock className="w-3 h-3" />
              <span>Next in {minutesUntilNext}m</span>
            </div>
          </div>

          {nextSlot ? (
            <>
              <h3 className="text-xs sm:text-sm font-bold line-clamp-1 leading-snug">
                {nextSlot.courseName}
              </h3>
              <p className={`text-[11px] mt-0.5 ${textMutedClass}`}>
                {nextSlot.courseCode} at {nextSlot.startTime} in {nextSlot.roomId}
              </p>

              <button
                onClick={handleNavigateToNext}
                data-testid="take-me-to-class-btn"
                className={`mt-2.5 w-full flex items-center justify-center gap-1.5 font-bold py-1.5 px-3 rounded-xl text-xs border transition-all ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-cyan-500/30'
                    : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-300'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Show Route to Next Class</span>
              </button>
            </>
          ) : (
            <p className={`text-xs ${textMutedClass}`}>No upcoming classes scheduled today.</p>
          )}
        </div>
      )}

      {/* DAY FINISHED STATUS */}
      {status === 'DAY_FINISHED' && (
        <div className="flex items-start gap-2 py-0.5">
          <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-xs font-bold">Classes Concluded</h4>
            <p className={`text-[10px] mt-0.5 ${textMutedClass}`}>
              All scheduled lectures & labs for today have completed.
            </p>
          </div>
        </div>
      )}

      {/* WEEKEND OFF STATUS */}
      {status === 'WEEKEND_OFF' && (
        <div className="flex items-start gap-2 py-0.5">
          <Calendar className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-xs font-bold">Weekend Off (Sunday)</h4>
            <p className={`text-[10px] mt-0.5 ${textMutedClass}`}>
              No regular timetable slots today. Library is open for self-study.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
