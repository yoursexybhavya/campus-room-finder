import React, { useMemo, useState } from 'react';
import {
  X,
  Users,
  GraduationCap,
  Sparkles,
  Info,
  Layers,
  Compass,
  Navigation,
  Calendar,
  Clock,
  CheckCircle,
  Footprints,
  ChevronRight,
  ArrowUpRight,
  ArrowRightLeft,
  MapPin,
  Play,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { campusRooms } from '../../data/campusRooms';
import { useCampusStore } from '../../stores/useCampusStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { useTimetableStore } from '../../stores/useTimetableStore';
import { getRoomDailySchedule } from '../../services/time/datetimeEngine';
import { findDetailedPathToRoom } from '../../services/routing/pathfinding';

export const RoomDetailsDrawer: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const selectedRoomId = useCampusStore((state) => state.selectedRoomId);
  const selectRoom = useCampusStore((state) => state.selectRoom);
  const setCameraTarget = useCampusStore((state) => state.setCameraTarget);
  const navigationPath = useCampusStore((state) => state.navigationPath);
  const navigateToRoom = useCampusStore((state) => state.navigateToRoom);
  const clearNavigationPath = useCampusStore((state) => state.clearNavigationPath);

  const userOriginId = useCampusStore((state) => state.userOriginId);
  const setUserOriginId = useCampusStore((state) => state.setUserOriginId);
  const isNavigating = useCampusStore((state) => state.isNavigating);
  const setIsNavigating = useCampusStore((state) => state.setIsNavigating);
  const setCurrentStepIndex = useCampusStore((state) => state.setCurrentStepIndex);

  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';
  const isPanelOpen = useCampusStore((state) => state.isPanelOpen);

  const simulatedDate = useTimetableStore((state) => state.simulatedDate);
  const activeSchedule = useTimetableStore((state) => state.activeSchedule);

  // Compute Turn-by-Turn Wayfinding data from origin to selected room
  const detailedRoute = useMemo(() => {
    return selectedRoomId ? findDetailedPathToRoom(selectedRoomId, userOriginId) : null;
  }, [selectedRoomId, userOriginId]);

  if (!selectedRoomId || isPanelOpen) return null;

  const room = campusRooms.find((r) => r.id === selectedRoomId);
  if (!room) return null;

  const handleClose = () => {
    selectRoom(null);
  };

  const handleFocus = () => {
    setCameraTarget(
      [room.position[0] + 10, room.position[1] + 8, room.position[2] + 10],
      room.position
    );
  };

  const handleToggleRoute = () => {
    if (navigationPath) {
      clearNavigationPath();
    } else {
      navigateToRoom(room.id, userOriginId);
    }
  };

  const handleStartNavigation = () => {
    navigateToRoom(room.id, userOriginId);
    setCurrentStepIndex(0);
    setIsNavigating(true);
  };

  const formattedType = room.type.replace('_', ' ').toUpperCase();

  // Query live schedule for this room on simulated date
  const roomSchedule = getRoomDailySchedule(room.id, simulatedDate);
  const isClassActive =
    activeSchedule.status === 'IN_SESSION' && activeSchedule.activeSlot?.roomId === room.id;
  const currentSlot = isClassActive ? activeSchedule.activeSlot : null;

  // Solid theme-aware styles to prevent any 3D elements from bleeding through
  const containerBgClass = isDark
    ? 'bg-slate-900 border-slate-700 text-white shadow-2xl'
    : 'bg-white border-slate-200 text-slate-900 shadow-2xl';

  const headerBgClass = isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200';
  const cardBgClass = isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200';
  const textMutedClass = isDark ? 'text-slate-400' : 'text-slate-500';

  // Common landmarks for the "Where you are at" origin selector
  const originLandmarks = [
    { id: 'gate', label: '📍 My Location: Main Entrance Gate (South)' },
    { id: 'courtyard_center', label: '🌳 Courtyard Lawn Crossroad Plaza' },
    { id: 'wp_admin', label: '🏛 Admin Block / Dean Office' },
    { id: 'wp_lib_main', label: '📚 Central Knowledge Library' },
  ];

  return (
    <div
      data-testid="room-details-drawer"
      className={`fixed inset-x-0 bottom-0 ${
        isExpanded ? 'max-h-[75vh]' : 'max-h-[46vh]'
      } md:max-h-[82vh] md:inset-auto md:top-20 md:right-4 md:bottom-24 w-full md:w-96 z-50 pointer-events-auto border rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-right duration-300 ${containerBgClass}`}
    >
      {/* Mobile drag handle & expand toggle bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="md:hidden w-full py-2 flex flex-col items-center justify-center shrink-0 cursor-pointer active:opacity-60"
        title={isExpanded ? 'Collapse peek sheet' : 'Expand full details'}
      >
        <div className="w-12 h-1.5 rounded-full bg-slate-400/40" />
      </button>

      {/* Drawer Header */}
      <div className={`p-4 sm:p-5 border-b flex items-start justify-between gap-3 ${headerBgClass}`}>
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${room.color}25`,
                color: room.color,
                border: `1px solid ${room.color}50`,
              }}
            >
              {room.code}
            </span>
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                room.floor === 'ground'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
              }`}
            >
              {room.floor === 'ground' ? 'Ground Floor' : '1st Floor'}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {formattedType}
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight leading-snug">
            {room.name}
          </h2>
          <p className={`text-xs mt-0.5 font-mono ${textMutedClass}`}>
            {room.building} • {room.wing} Wing
          </p>
        </div>

        <button
          onClick={handleClose}
          data-testid="close-room-drawer-btn"
          className={`p-1.5 rounded-xl transition-colors ${
            isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
          }`}
          title="Close details"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {/* ======================================================== */}
        {/* GOOGLE MAPS STYLE "WHERE YOU ARE AT -> WHERE YOU ARE GOING" */}
        {/* ======================================================== */}
        <div className={`p-3.5 rounded-2xl border ${cardBgClass} space-y-3`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
              <Navigation className="w-3.5 h-3.5" />
              <span>Google Maps Campus Directions</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
              WALKING
            </span>
          </div>

          {/* From / To Input Stack */}
          <div className="space-y-2 text-xs">
            {/* Origin (Where you are at) */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                <span>From (Where You Are)</span>
              </label>
              <select
                value={userOriginId}
                onChange={(e) => setUserOriginId(e.target.value)}
                className={`w-full border rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyan-500 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <optgroup label="Campus Arterial Hubs">
                  {originLandmarks.map((lm) => (
                    <option key={lm.id} value={lm.id}>
                      {lm.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="All Classrooms & Labs">
                  {campusRooms
                    .filter((r) => r.id !== room.id)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.code} ({r.floor === 'ground' ? 'GF' : '1F'}) - {r.wing} Wing
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            {/* Reverse Origin/Destination Direction */}
            <div className="flex justify-end -my-0.5">
              <button
                type="button"
                onClick={() => {
                  const targetRoomObj = campusRooms.find((r) => r.id === userOriginId);
                  if (targetRoomObj) {
                    setUserOriginId(room.id);
                    selectRoom(targetRoomObj.id);
                  }
                }}
                className="flex items-center gap-1 text-[10px] text-cyan-500 hover:text-cyan-400 font-semibold px-2 py-0.5 rounded-lg border border-cyan-500/30 hover:bg-cyan-500/10 transition-colors"
                title="Swap From and To locations"
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span>Swap Origin & Destination</span>
              </button>
            </div>

            {/* Destination (Where you are going) */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                <span>To (Destination)</span>
              </label>
              <div
                className={`p-2 rounded-xl border font-semibold flex items-center justify-between ${
                  isDark ? 'bg-slate-900/60 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <span className="truncate">🎯 Target: Room {room.code} ({room.wing} Wing)</span>
                <span className="text-[10px] font-mono text-cyan-500 font-bold shrink-0 ml-1">
                  {room.floor === 'ground' ? 'GF' : '1F'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Route Summary & Start Navigation Button */}
          {detailedRoute && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="text-xs">
                <span className="font-extrabold text-slate-900 dark:text-white">
                  ~{detailedRoute.estimatedWalkingMinutes} min
                </span>
                <span className="text-[11px] text-slate-400 ml-1.5">
                  ({detailedRoute.totalDistanceMeters}m)
                </span>
              </div>

              <button
                onClick={handleStartNavigation}
                className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold py-1.5 px-3 rounded-xl text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                title="Start turn-by-turn navigation"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Navigation</span>
              </button>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* TURN-BY-TURN WAYFINDING & ROUTE ESTIMATES                */}
        {/* ======================================================== */}
        {detailedRoute && (
          <div
            data-testid="turn-by-turn-wayfinding"
            className={`p-3.5 rounded-2xl border transition-all ${
              navigationPath
                ? isDark
                  ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-950/40'
                  : 'bg-cyan-50/80 border-cyan-300 shadow-md shadow-cyan-100'
                : cardBgClass
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
                <Footprints className="w-4 h-4" />
                <span>Turn-by-Turn Wayfinding</span>
              </span>
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 font-bold">
                  {detailedRoute.totalDistanceMeters}m
                </span>
                <span className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
                  ~{detailedRoute.estimatedWalkingMinutes} min
                </span>
              </div>
            </div>

            {/* Step-by-Step Wayfinding Timeline */}
            <div className="space-y-1.5 mt-2.5">
              {detailedRoute.steps.map((step, idx) => (
                <div
                  key={step.id + idx}
                  className={`flex items-start gap-2.5 p-2 rounded-xl text-xs transition-colors ${
                    idx === detailedRoute.steps.length - 1
                      ? 'bg-cyan-500/15 border border-cyan-500/30 font-semibold'
                      : isDark
                      ? 'bg-slate-900/60'
                      : 'bg-white border border-slate-100'
                  }`}
                >
                  {/* Step Sequence Badge */}
                  <div className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="leading-snug text-slate-800 dark:text-slate-200">
                      {step.instruction}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                      <span>{step.distanceMeters}m</span>
                      <span>•</span>
                      <span className="uppercase font-mono">{step.floor === 'ground' ? 'GF' : '1F'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Class Schedule Status Card */}
        <div
          data-testid="room-live-status-card"
          className={`p-3.5 rounded-2xl border ${
            isClassActive
              ? isDark
                ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200'
                : 'bg-cyan-50 border-cyan-300 text-cyan-900'
              : cardBgClass
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              {isClassActive ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-cyan-600 dark:text-cyan-400">Class In Session</span>
                </>
              ) : (
                <>
                  <CheckCircle className={`w-3.5 h-3.5 ${textMutedClass}`} />
                  <span className={textMutedClass}>Currently Vacant</span>
                </>
              )}
            </span>
            {isClassActive && (
              <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full">
                {activeSchedule.minutesRemaining}m remaining
              </span>
            )}
          </div>

          {currentSlot ? (
            <div>
              <div className="text-sm font-bold leading-tight">
                {currentSlot.courseName}
              </div>
              <p className={`text-xs mt-0.5 ${textMutedClass}`}>
                {currentSlot.courseCode} • {currentSlot.facultyName || (currentSlot as any).faculty}
              </p>
              <div className="flex items-center gap-3 mt-2 text-[11px] font-mono">
                <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
                  <Clock className="w-3 h-3" />
                  {currentSlot.startTime} - {currentSlot.endTime}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-400">{currentSlot.slotType}</span>
              </div>
            </div>
          ) : (
            <div className={`text-xs ${textMutedClass}`}>
              No lecture currently running in this hall.
            </div>
          )}
        </div>

        {/* Full Day Schedule Timeline */}
        {roomSchedule.length > 0 && (
          <div className={`p-3.5 rounded-2xl border ${cardBgClass}`}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-2.5 text-sky-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>Today's Schedule ({roomSchedule.length} Slots)</span>
            </div>
            <div className="space-y-2">
              {roomSchedule.map((slot) => (
                <div
                  key={slot.id}
                  className={`p-2 rounded-xl border flex items-start justify-between gap-2 text-xs ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div>
                    <div className="font-semibold">{slot.courseName}</div>
                    <div className={`text-[11px] ${textMutedClass}`}>
                      {slot.courseCode} • {slot.facultyName || (slot as any).faculty}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-[10px] text-cyan-600 dark:text-cyan-400 bg-cyan-500/15 px-1.5 py-0.5 rounded border border-cyan-500/30">
                      {slot.startTime}–{slot.endTime}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Capacity & Faculty In-Charge */}
        <div className={`p-3.5 rounded-2xl border ${cardBgClass} space-y-2.5`}>
          <div className="flex items-center justify-between text-xs">
            <span className={`flex items-center gap-1.5 ${textMutedClass}`}>
              <Users className="w-3.5 h-3.5" />
              <span>Seating Capacity:</span>
            </span>
            <span className="font-bold">{room.capacity ?? 60} Students</span>
          </div>

          {room.inChargeFaculty && (
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className={`flex items-center gap-1.5 ${textMutedClass}`}>
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Faculty In-Charge:</span>
              </span>
              <span className="font-semibold text-cyan-600 dark:text-cyan-400">{room.inChargeFaculty}</span>
            </div>
          )}
        </div>

        {/* Description & Overview */}
        {room.description && (
          <div className={`p-3.5 rounded-2xl border ${cardBgClass}`}>
            <h4 className="text-xs font-bold mb-1 flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
              <Info className="w-3.5 h-3.5 text-cyan-500" />
              <span>Room Overview</span>
            </h4>
            <p className={`text-xs leading-relaxed ${textMutedClass}`}>{room.description}</p>
          </div>
        )}

        {/* Facilities Badges */}
        {room.facilities && room.facilities.length > 0 && (
          <div className={`p-3.5 rounded-2xl border ${cardBgClass}`}>
            <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Room Features & Equipment</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {room.facilities.map((fac, idx) => (
                <span
                  key={idx}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border ${
                    isDark
                      ? 'bg-slate-900 text-slate-300 border-slate-800'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {fac}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 3D Coordinates Inspection */}
        <div className={`text-[11px] font-mono p-2.5 rounded-xl border ${cardBgClass} ${textMutedClass}`}>
          <div>Door Waypoint: {room.doorWaypointId}</div>
          <div>Position: [{room.position.join(', ')}]</div>
        </div>
      </div>

      {/* Drawer Footer Actions */}
      <div className={`p-4 border-t flex items-center gap-2 ${headerBgClass}`}>
        <button
          onClick={handleFocus}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Center in 3D</span>
        </button>

        <button
          onClick={handleToggleRoute}
          data-testid="navigate-to-room-btn"
          className={`flex-1 flex items-center justify-center gap-1.5 font-bold py-2.5 px-3 rounded-xl text-xs border active:scale-95 transition-all ${
            navigationPath
              ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 border-rose-500/40'
              : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-600 dark:text-cyan-300 border-cyan-500/40'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>{navigationPath ? 'Clear Route' : 'Show Route'}</span>
        </button>
      </div>
    </div>
  );
};
