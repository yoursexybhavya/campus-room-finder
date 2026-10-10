import React, { useMemo } from 'react';
import { Layers, ArrowDown, ArrowUp, Compass, Box, Map, Plus, Minus } from 'lucide-react';
import { useCampusStore } from '../../stores/useCampusStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { campusRooms } from '../../data/campusRooms';
import { FloorFilter } from '../../types/campus';

export const FloorSelector: React.FC = () => {
  const activeFloorFilter = useCampusStore((state) => state.activeFloorFilter);
  const setFloorFilter = useCampusStore((state) => state.setFloorFilter);
  const viewMode = useCampusStore((state) => state.viewMode);
  const setViewMode = useCampusStore((state) => state.setViewMode);
  const zoomIn = useCampusStore((state) => state.zoomIn);
  const zoomOut = useCampusStore((state) => state.zoomOut);
  const isPanelOpen = useCampusStore((state) => state.isPanelOpen);
  const selectedRoomId = useCampusStore((state) => state.selectedRoomId);

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

  const isWayfindingOpen = useCampusStore((state) => state.isWayfindingOpen);

  // If a right-side drawer is open on desktop, shift dock left so it never overlaps. On mobile, hide when drawer or wayfinding is open.
  const isDrawerOpen = selectedRoomId !== null || isPanelOpen;
  const isMobileHidden = isDrawerOpen || isWayfindingOpen;

  return (
    <div
      data-testid="floor-selector-dock"
      className={`absolute top-28 sm:top-32 ${
        isDrawerOpen ? 'hidden md:flex md:right-[410px]' : isMobileHidden ? 'hidden md:flex md:right-4' : 'flex right-3 sm:right-4'
      } z-40 pointer-events-auto flex-col gap-2 select-none animate-in fade-in slide-in-from-right duration-300`}
    >
      {/* 1. 2D / 3D View Mode Toggle Pill (MazeMap Style - hidden on mobile as Header has switcher) */}
      <div
        className={`hidden sm:flex items-center p-1 rounded-2xl backdrop-blur-xl border shadow-xl transition-all duration-300 ${
          isDark
            ? 'bg-slate-900/95 border-slate-700/80 shadow-black/50'
            : 'bg-white/95 border-slate-200/90 shadow-slate-300/40'
        }`}
      >
        <button
          onClick={() => setViewMode('3D')}
          data-testid="view-mode-3d-btn"
          className={`flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            viewMode === '3D'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
              : isDark
              ? 'text-slate-400 hover:text-white'
              : 'text-slate-600 hover:text-slate-950'
          }`}
          title="3D Isometric Perspective View"
        >
          <Box className="w-3.5 h-3.5" />
          <span>3D</span>
        </button>

        <button
          onClick={() => setViewMode('2D')}
          data-testid="view-mode-2d-btn"
          className={`flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            viewMode === '2D'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
              : isDark
              ? 'text-slate-400 hover:text-white'
              : 'text-slate-600 hover:text-slate-950'
          }`}
          title="2D Top-Down Architectural Blueprint Plan View"
        >
          <Map className="w-3.5 h-3.5" />
          <span>2D</span>
        </button>
      </div>

      {/* 2. MazeMap-Inspired Vertical Floor Level Switcher Dock */}
      <div
        className={`flex flex-col p-1.5 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all duration-300 ${
          isDark
            ? 'bg-slate-900/95 border-slate-700/80 shadow-black/60'
            : 'bg-white/95 border-slate-200/90 shadow-slate-300/50'
        }`}
      >
        {/* Header label badge */}
        <div className="px-1.5 sm:px-2 py-1 mb-1 flex items-center justify-between border-b border-slate-700/30">
          <span className={`hidden sm:inline text-[10px] font-extrabold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Floor
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mx-auto sm:mx-0" />
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
                className={`group relative flex items-center justify-center sm:justify-start gap-1 sm:gap-2 p-1.5 sm:px-2.5 sm:py-2 rounded-xl transition-all duration-200 text-left ${
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
                <div className="hidden sm:flex flex-col min-w-0 pr-1">
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
                  <span className="hidden sm:inline-block ml-auto w-1.5 h-3.5 rounded-full bg-white/90 shadow-sm" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Zoom Controls (+ / -) (MazeMap Style) */}
      <div
        className={`flex flex-col p-1 rounded-2xl backdrop-blur-xl border shadow-lg transition-all ${
          isDark
            ? 'bg-slate-900/95 border-slate-700/80 text-slate-300'
            : 'bg-white/95 border-slate-200/90 text-slate-700 shadow-slate-300/40'
        }`}
      >
        <button
          onClick={zoomIn}
          data-testid="zoom-in-btn"
          className="p-2 hover:text-cyan-500 hover:bg-slate-800/40 rounded-xl transition-colors flex items-center justify-center"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <div className={`h-px my-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
        <button
          onClick={zoomOut}
          data-testid="zoom-out-btn"
          className="p-2 hover:text-cyan-500 hover:bg-slate-800/40 rounded-xl transition-colors flex items-center justify-center"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
