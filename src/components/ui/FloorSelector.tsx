import React, { useMemo } from 'react';
import { Layers, ArrowDown, ArrowUp, Compass, Box, Map } from 'lucide-react';
import { useCampusStore } from '../../stores/useCampusStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { campusRooms } from '../../data/campusRooms';
import { FloorFilter } from '../../types/campus';

export const FloorSelector: React.FC = () => {
  const activeFloorFilter = useCampusStore((state) => state.activeFloorFilter);
  const setFloorFilter = useCampusStore((state) => state.setFloorFilter);
  const viewMode = useCampusStore((state) => state.viewMode);
  const setViewMode = useCampusStore((state) => state.setViewMode);
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  const firstCount = useMemo(() => campusRooms.filter((r) => r.floor === 'first').length, []);
  const groundCount = useMemo(() => campusRooms.filter((r) => r.floor === 'ground').length, []);
  const allCount = campusRooms.length;

  // Architectural floor level definitions ordered vertically: First Floor (1F) -> Ground Floor (GF) -> All
  const filters: { id: FloorFilter; short: string; label: string; count: number; accent: string }[] = [
    {
      id: 'first',
      short: '1F',
      label: 'First Floor',
      count: firstCount,
      accent: 'from-purple-500 to-indigo-600',
    },
    {
      id: 'ground',
      short: 'GF',
      label: 'Ground',
      count: groundCount,
      accent: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'all',
      short: 'ALL',
      label: 'All Floors',
      count: allCount,
      accent: 'from-cyan-500 to-blue-600',
    },
  ];

  return (
    <div
      data-testid="floor-selector-dock"
      className="absolute top-36 left-4 z-20 pointer-events-auto flex flex-col gap-2 select-none animate-in fade-in slide-in-from-left duration-300"
    >
      {/* MazeMap-Inspired Vertical Floor Level Switcher Dock */}
      <div
        className={`flex flex-col p-1.5 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all duration-300 ${
          isDark
            ? 'bg-slate-900/90 border-slate-700/80 shadow-black/60'
            : 'bg-white/95 border-slate-200/90 shadow-slate-300/50'
        }`}
      >
        {/* Header label badge */}
        <div className="px-2 py-1 mb-1 flex items-center justify-between border-b border-slate-700/40">
          <span className={`text-[10px] font-extrabold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Floor
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        </div>

        {/* Vertical Floor Buttons */}
        <div className="flex flex-col gap-1">
          {filters.map((filter) => {
            const isActive = activeFloorFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setFloorFilter(filter.id)}
                data-testid={`floor-filter-${filter.id}`}
                className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 text-left ${
                  isActive
                    ? `bg-gradient-to-r ${filter.accent} text-white shadow-lg shadow-cyan-500/25 font-bold scale-[1.02]`
                    : isDark
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                }`}
                title={filter.label}
              >
                {/* Short level abbreviation (MazeMap style '1F', 'GF', 'ALL') */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-black shrink-0 transition-colors ${
                    isActive
                      ? 'bg-black/20 text-white'
                      : isDark
                      ? 'bg-slate-800 text-cyan-400 group-hover:bg-slate-700'
                      : 'bg-slate-100 text-cyan-600 group-hover:bg-slate-200'
                  }`}
                >
                  {filter.short}
                </div>

                {/* Full testable label */}
                <div className="flex flex-col min-w-0 pr-1">
                  <span className="text-xs font-bold leading-tight truncate">
                    {filter.label}
                  </span>
                  <span
                    className={`text-[9px] font-mono leading-none mt-0.5 ${
                      isActive
                        ? 'text-white/80'
                        : isDark
                        ? 'text-slate-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {filter.count} rooms
                  </span>
                </div>

                {/* Active Indicator Light */}
                {isActive && (
                  <span className="ml-auto w-1.5 h-4 rounded-full bg-white/90 shadow-sm" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2D / 3D View Mode Toggle Pill */}
      <div
        className={`flex items-center p-1 rounded-2xl backdrop-blur-xl border shadow-xl transition-all duration-300 ${
          isDark
            ? 'bg-slate-900/90 border-slate-700/80 shadow-black/50'
            : 'bg-white/95 border-slate-200/90 shadow-slate-300/40'
        }`}
      >
        <button
          onClick={() => setViewMode('3D')}
          data-testid="view-mode-3d-btn"
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            viewMode === '3D'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
              : isDark
              ? 'text-slate-400 hover:text-white'
              : 'text-slate-600 hover:text-slate-950'
          }`}
          title="3D Isometric Perspective View"
        >
          <Box className="w-3.5 h-3.5" />
          <span>3D View</span>
        </button>

        <button
          onClick={() => setViewMode('2D')}
          data-testid="view-mode-2d-btn"
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            viewMode === '2D'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
              : isDark
              ? 'text-slate-400 hover:text-white'
              : 'text-slate-600 hover:text-slate-950'
          }`}
          title="2D Top-Down Architectural Blueprint Plan View"
        >
          <Map className="w-3.5 h-3.5" />
          <span>2D Plan</span>
        </button>
      </div>
    </div>
  );
};
