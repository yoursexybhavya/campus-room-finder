import React, { useMemo } from 'react';
import {
  Navigation,
  ArrowRightLeft,
  Play,
  X,
  MapPin,
  ChevronDown,
  ChevronUp,
  Footprints,
  Sparkles,
} from 'lucide-react';
import { useCampusStore } from '../../stores/useCampusStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { campusRooms } from '../../data/campusRooms';
import { findDetailedPathToRoom } from '../../services/routing/pathfinding';
import { SearchableLocationCombobox, CAMPUS_LANDMARKS } from './SearchableLocationCombobox';

export const CampusWayfindingBar: React.FC = () => {
  const isWayfindingOpen = useCampusStore((state) => state.isWayfindingOpen);
  const setIsWayfindingOpen = useCampusStore((state) => state.setIsWayfindingOpen);
  const userOriginId = useCampusStore((state) => state.userOriginId);
  const setUserOriginId = useCampusStore((state) => state.setUserOriginId);
  const selectedRoomId = useCampusStore((state) => state.selectedRoomId);
  const selectRoom = useCampusStore((state) => state.selectRoom);
  const navigationPath = useCampusStore((state) => state.navigationPath);
  const navigateToRoom = useCampusStore((state) => state.navigateToRoom);
  const clearNavigationPath = useCampusStore((state) => state.clearNavigationPath);
  const setIsNavigating = useCampusStore((state) => state.setIsNavigating);
  const setCurrentStepIndex = useCampusStore((state) => state.setCurrentStepIndex);
  const isNavigating = useCampusStore((state) => state.isNavigating);

  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  // Key landmark starting points
  const originPresets = [
    { id: 'gate', label: '🚪 Main Gate' },
    { id: 'courtyard_center', label: '🌳 Courtyard' },
    { id: 'wp_admin', label: '🏛 Admin' },
    { id: 'wp_lib_main', label: '📚 Library' },
  ];

  // Quick destination recommendations
  const quickDestinations = [
    { id: 'LT-1', label: '🎓 LT-9 (East)' },
    { id: 'LAB-1', label: '💻 PC Lab (West)' },
    { id: 'LAB-2', label: '🧪 Idea Lab' },
    { id: 'LIB-MAIN', label: '📚 Library' },
  ];

  // Compute detailed path from origin to destination
  const detailedRoute = useMemo(() => {
    if (!selectedRoomId) return null;
    return findDetailedPathToRoom(selectedRoomId, userOriginId);
  }, [selectedRoomId, userOriginId]);

  const originName = useMemo(() => {
    const preset = originPresets.find((p) => p.id === userOriginId);
    if (preset) return preset.label;
    const landmark = CAMPUS_LANDMARKS.find((lm) => lm.id === userOriginId);
    if (landmark) return `📍 ${landmark.name}`;
    const room = campusRooms.find((r) => r.id === userOriginId);
    if (room) return `📍 ${room.code}: ${room.name}`;
    return '📍 Main Entrance Gate';
  }, [userOriginId, originPresets]);

  const destinationRoom = useMemo(() => {
    return selectedRoomId ? campusRooms.find((r) => r.id === selectedRoomId) : null;
  }, [selectedRoomId]);

  // 1-Tap instant route execution for destination
  const handleSelectDestination = (roomId: string) => {
    selectRoom(roomId);
    navigateToRoom(roomId, userOriginId);
  };

  // 1-Tap selection for origin
  const handleSelectOrigin = (originId: string) => {
    setUserOriginId(originId);
    if (selectedRoomId) {
      navigateToRoom(selectedRoomId, originId);
    }
  };

  // 1-Tap start turn-by-turn navigation
  const handleStartNav = () => {
    if (!selectedRoomId) return;
    navigateToRoom(selectedRoomId, userOriginId);
    setCurrentStepIndex(0);
    setIsNavigating(true);
  };

  // 1-Tap swap origin and destination
  const handleSwap = () => {
    if (!selectedRoomId) return;
    const oldOrigin = userOriginId;
    const oldDest = selectedRoomId;
    setUserOriginId(oldDest);

    const targetRoomObj = campusRooms.find((r) => r.id === oldOrigin);
    if (targetRoomObj) {
      selectRoom(targetRoomObj.id);
      navigateToRoom(targetRoomObj.id, oldDest);
    } else {
      selectRoom(null);
      clearNavigationPath();
    }
  };

  // Do not show floating bar if turn-by-turn navigation HUD is actively taking over the screen
  if (isNavigating) return null;

  const cardBgClass = isDark
    ? 'bg-slate-900/95 backdrop-blur-2xl border-slate-700/80 text-white shadow-2xl shadow-black/60'
    : 'bg-white/95 backdrop-blur-2xl border-slate-200/90 text-slate-900 shadow-2xl shadow-slate-300/50';

  return (
    <div
      data-testid="campus-wayfinding-container"
      className={`absolute z-40 pointer-events-auto select-none transition-all duration-200 ${
        isWayfindingOpen
          ? 'top-16 left-3 right-3 sm:top-20 sm:left-auto sm:right-48 sm:w-[410px]'
          : 'top-16 right-3 sm:top-20 sm:left-auto sm:right-48 sm:w-auto'
      }`}
    >
      {/* 1. Collapsed Pill Header (when minimized or route active) */}
      {!isWayfindingOpen ? (
        <button
          onClick={() => setIsWayfindingOpen(true)}
          data-testid="toggle-wayfinding-pill"
          className={`flex items-center justify-between gap-1.5 sm:gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${cardBgClass}`}
          title="Open Campus Wayfinding: Where You Are ➔ Where You Want To Go"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-cyan-500/20 text-cyan-500 flex items-center justify-center shrink-0">
              <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
            <div className="text-left truncate hidden sm:block">
              <div className="text-xs font-bold truncate flex items-center gap-1.5">
                <span>Where you are</span>
                <span className="text-cyan-500">➔</span>
                <span>Where to go</span>
              </div>
              {destinationRoom && detailedRoute ? (
                <div className="text-[10px] text-emerald-500 font-mono font-semibold">
                  Route active: ~{detailedRoute.estimatedWalkingMinutes} min ({detailedRoute.totalDistanceMeters}m)
                </div>
              ) : (
                <div className="text-[10px] text-slate-400">1-Tap UNIPATH directions</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 text-cyan-500 sm:text-slate-400 shrink-0 ml-1">
            <span className="text-[11px] sm:text-[10px] font-bold uppercase tracking-wider">Route</span>
            <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </button>
      ) : (
        /* 2. Expanded Interactive Wayfinding Card */
        <div className={`p-4 rounded-3xl border animate-in fade-in zoom-in-95 duration-200 space-y-3.5 ${cardBgClass}`}>
          {/* Sheet Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-700/30">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-500 flex items-center justify-center">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold tracking-wide">Campus Wayfinding</h3>
                <p className="text-[10px] text-slate-400">Navigate anywhere to anywhere with smart search</p>
              </div>
            </div>

            <button
              onClick={() => setIsWayfindingOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-800/40 text-slate-400 hover:text-white transition-colors"
              title="Minimize Wayfinding"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          {/* From & To Section */}
          <div className="space-y-3">
            {/* ROW 1: WHERE YOU ARE (From) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-1.5 text-sky-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                  <span>Where You Are (From)</span>
                </span>
                <span className="font-mono text-[10px] lowercase text-slate-400 truncate max-w-[160px] text-right">
                  {originName}
                </span>
              </div>

              {/* 1-Tap Quick Start Preset Buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                {originPresets.map((preset) => {
                  const isActive = userOriginId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectOrigin(preset.id)}
                      data-testid={`origin-preset-${preset.id}`}
                      className={`py-1.5 px-1 rounded-xl text-[10px] font-bold border truncate transition-all active:scale-95 text-center ${
                        isActive
                          ? 'bg-sky-500/20 text-sky-400 border-sky-500/50 shadow-sm'
                          : isDark
                          ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                      title={preset.label}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Searchable Combobox for ANY Origin (rooms, labs, gates) */}
              <SearchableLocationCombobox
                id="wayfinding-origin-input"
                value={userOriginId}
                onChange={handleSelectOrigin}
                accentColor="sky"
                isDark={isDark}
                placeholder="Search origin: any room, lab, or gate..."
                testIdPrefix="origin-combobox"
              />
            </div>

            {/* Swap Origin / Destination Button */}
            <div className="flex justify-center -my-1">
              <button
                onClick={handleSwap}
                data-testid="wayfinding-swap-btn"
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 border border-cyan-500/30 transition-all active:scale-95 shadow-sm"
                title="Swap Origin and Destination"
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span>Swap Start & Destination</span>
              </button>
            </div>

            {/* ROW 2: WHERE YOU WANT TO GO (To) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  <span>Where You Want To Go (To)</span>
                </span>
                {destinationRoom && (
                  <span className="font-mono text-[10px] text-cyan-400 font-bold">
                    {destinationRoom.code} ({destinationRoom.floor === 'ground' ? 'GF' : '1F'})
                  </span>
                )}
              </div>

              {/* 1-Tap Quick Destination Recommendations */}
              <div className="grid grid-cols-4 gap-1.5">
                {quickDestinations.map((dest) => {
                  const isActive = selectedRoomId === dest.id;
                  return (
                    <button
                      key={dest.id}
                      onClick={() => handleSelectDestination(dest.id)}
                      data-testid={`quick-dest-${dest.id}`}
                      className={`py-1.5 px-1 rounded-xl text-[10px] font-bold border truncate transition-all active:scale-95 text-center ${
                        isActive
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-sm'
                          : isDark
                          ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                      title={dest.label}
                    >
                      {dest.label}
                    </button>
                  );
                })}
              </div>

              {/* Searchable Combobox for ANY Destination (all 65 rooms + landmarks) */}
              <SearchableLocationCombobox
                id="wayfinding-destination-input"
                value={selectedRoomId}
                onChange={handleSelectDestination}
                excludeId={userOriginId}
                accentColor="rose"
                isDark={isDark}
                placeholder="Search destination: any room, lab, or gate..."
                testIdPrefix="destination-combobox"
              />

              {/* Fast native select fallback for quick browsing */}
              <select
                value={selectedRoomId || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    handleSelectDestination(e.target.value);
                  }
                }}
                className={`w-full mt-1 border rounded-xl px-2.5 py-1 text-[11px] focus:outline-none focus:border-cyan-500 transition-colors opacity-80 hover:opacity-100 ${
                  isDark ? 'bg-slate-950 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <option value="">🎯 Or pick directly from list...</option>
                <optgroup label="Ground Floor (GF)">
                  {campusRooms
                    .filter((r) => r.floor === 'ground')
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.code}: {r.name} ({r.wing} Wing)
                      </option>
                    ))}
                </optgroup>
                <optgroup label="First Floor (1F)">
                  {campusRooms
                    .filter((r) => r.floor === 'first')
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.code}: {r.name} ({r.wing} Wing)
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Route Summary & Primary Action Buttons */}
          {detailedRoute && destinationRoom && (
            <div data-testid="wayfinding-route-summary" className="pt-2 border-t border-slate-700/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Footprints className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-extrabold text-emerald-400">
                    ~{detailedRoute.estimatedWalkingMinutes} min
                  </span>
                  <span className="text-slate-400">({detailedRoute.totalDistanceMeters}m)</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {destinationRoom.floor === 'ground' ? 'Ground Floor' : '1st Floor'}
                </span>
              </div>

              {/* Start Navigation & Clear Actions */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleStartNav}
                  data-testid="wayfinding-start-nav-btn"
                  className="col-span-2 flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold py-2 px-3 rounded-xl text-xs shadow-md shadow-emerald-500/25 active:scale-95 transition-all"
                  title="Start step-by-step turn guidance"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Navigation</span>
                </button>

                <button
                  onClick={() => {
                    clearNavigationPath();
                    selectRoom(null);
                  }}
                  data-testid="wayfinding-clear-btn"
                  className="flex items-center justify-center gap-1 text-slate-400 hover:text-white hover:bg-slate-800 py-2 px-2 rounded-xl text-xs border border-slate-700 transition-colors"
                  title="Clear Route"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
