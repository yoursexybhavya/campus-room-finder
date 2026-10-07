import React, { useState, useEffect } from 'react';
import { RotateCcw, Clock, Building2, Sun, Moon, Map, Box } from 'lucide-react';
import { useCampusStore } from '../../stores/useCampusStore';
import { useThemeStore } from '../../stores/useThemeStore';

export const Header: React.FC = () => {
  const resetView = useCampusStore((state) => state.resetView);
  const viewMode = useCampusStore((state) => state.viewMode);
  const setViewMode = useCampusStore((state) => state.setViewMode);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDark = theme === 'dark';

  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const cardBgClass = isDark
    ? 'bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 text-white shadow-xl shadow-black/40'
    : 'bg-white/95 backdrop-blur-xl border border-slate-200/90 text-slate-900 shadow-xl shadow-slate-300/40';

  const btnSecondaryClass = isDark
    ? 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 hover:text-cyan-300 border border-slate-700/80'
    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-cyan-600 border border-slate-200';

  return (
    <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none p-3 sm:p-4 flex items-center justify-between gap-3">
      {/* Brand & Campus Identity */}
      <div className={`pointer-events-auto flex items-center gap-3 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl ${cardBgClass} transition-colors duration-300`}>
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/25 shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold tracking-wide">JIET Jodhpur</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
              {viewMode === '2D' ? '2D Blueprint' : '3D Digital Twin'}
            </span>
          </div>
          <p className={`text-[11px] sm:text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Campus Room Finder & Navigation
          </p>
        </div>
      </div>

      {/* Right Controls: Theme Toggle, View Mode, Clock & Reset */}
      <div className="pointer-events-auto flex items-center gap-2 sm:gap-2.5">
        {/* Live Clock Badge */}
        <div className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${cardBgClass} transition-colors duration-300`}>
          <Clock className="w-3.5 h-3.5 text-cyan-500" />
          <span className="font-mono font-medium">{timeStr || '10:00:00 AM'}</span>
        </div>

        {/* 2D / 3D Quick View Switcher */}
        <button
          onClick={() => setViewMode(viewMode === '2D' ? '3D' : '2D')}
          data-testid="header-viewmode-toggle-btn"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all active:scale-95 ${btnSecondaryClass}`}
          title={`Switch to ${viewMode === '2D' ? '3D Isometric' : '2D Blueprint'} View`}
        >
          {viewMode === '2D' ? (
            <>
              <Box className="w-3.5 h-3.5 text-cyan-500" />
              <span className="hidden sm:inline">3D Mode</span>
            </>
          ) : (
            <>
              <Map className="w-3.5 h-3.5 text-cyan-500" />
              <span className="hidden sm:inline">2D Plan</span>
            </>
          )}
        </button>

        {/* Dark / Light Mode Theme Toggle */}
        <button
          onClick={toggleTheme}
          data-testid="theme-toggle-btn"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all active:scale-95 ${btnSecondaryClass}`}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>

        {/* Reset Camera View Button */}
        <button
          onClick={resetView}
          data-testid="reset-view-btn"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all active:scale-95 ${btnSecondaryClass}`}
          title="Reset Camera View to Default"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </header>
  );
};
