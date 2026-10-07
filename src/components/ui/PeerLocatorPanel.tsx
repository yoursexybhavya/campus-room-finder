import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  X,
  MapPin,
  Compass,
  Radio,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { usePeerStore } from '../../stores/usePeerStore';
import { useCampusStore } from '../../stores/useCampusStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { campusRooms } from '../../data/campusRooms';
import { PeerUser } from '../../types/peer';
import { getPeerAvatarColor } from '../canvas/PeerAvatarsLayer';

export const PeerLocatorPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [manualRoomSelection, setManualRoomSelection] = useState<string>('');

  const rawPeers = usePeerStore((state) => state.peers);
  const currentUser = usePeerStore((state) => state.currentUser);
  const isConnected = usePeerStore((state) => state.isConnected);
  const isAutoSyncEnabled = usePeerStore((state) => state.isAutoSyncEnabled);
  const checkIn = usePeerStore((state) => state.checkIn);
  const leaveRoom = usePeerStore((state) => state.leaveRoom);
  const toggleAutoSync = usePeerStore((state) => state.toggleAutoSync);

  const selectRoom = useCampusStore((state) => state.selectRoom);
  const selectedRoomId = useCampusStore((state) => state.selectedRoomId);
  const setIsPanelOpen = useCampusStore((state) => state.setIsPanelOpen);

  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  // Sync isPanelOpen to global campus store to suppress 3D background labels
  useEffect(() => {
    setIsPanelOpen(isOpen);
  }, [isOpen, setIsPanelOpen]);

  const peerList: PeerUser[] = useMemo(() => {
    if (!rawPeers) return [];
    if (Array.isArray(rawPeers)) return rawPeers;
    if (rawPeers instanceof Map) return Array.from(rawPeers.values());
    return Object.values(rawPeers);
  }, [rawPeers]);

  // Exclude current user from friends list if present
  const connectedFriends = useMemo(() => {
    const currentId = currentUser?.id || 'student_me';
    return peerList.filter((p) => {
      const pId = p.id || p.userId;
      return pId !== currentId && pId !== currentUser?.userId;
    });
  }, [peerList, currentUser]);

  const currentRoom = useMemo(() => {
    const rId = currentUser?.currentRoomId || currentUser?.roomId;
    return rId ? campusRooms.find((r) => r.id === rId) : null;
  }, [currentUser]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleManualCheckIn = (roomId: string) => {
    if (!roomId) return;
    const room = campusRooms.find((r) => r.id === roomId);
    if (room) {
      checkIn(room.id, room.floor, false);
      setManualRoomSelection('');
    }
  };

  const handlePeerCardClick = (roomId: string | null | undefined) => {
    if (!roomId) return;
    selectRoom(roomId);
  };

  // Solid, non-transparent background to prevent any 3D elements from bleeding through
  const panelBgClass = isDark
    ? 'bg-slate-900 border-slate-700 text-white shadow-2xl'
    : 'bg-white border-slate-200 text-slate-900 shadow-2xl';

  const headerBgClass = isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200';
  const cardBgClass = isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200';
  const textMutedClass = isDark ? 'text-slate-400' : 'text-slate-500';

  // Minimized Trigger Pill (Docked neatly at top-16/top-20 above FloorSelector, shifted left if room drawer is open on desktop)
  const isRoomDrawerOpen = selectedRoomId !== null;

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        data-testid="open-peer-panel-btn"
        className={`absolute top-16 sm:top-20 ${
          isRoomDrawerOpen ? 'right-3 sm:right-4 md:right-[410px]' : 'right-3 sm:right-4'
        } z-40 pointer-events-auto border px-3 py-1.5 rounded-2xl shadow-xl flex items-center gap-2 transition-all active:scale-95 group select-none ${
          isDark
            ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
        }`}
        title="Open Peer Locator Panel"
      >
        <div className="relative">
          <Users className="w-4 h-4 text-cyan-500" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </div>
        <span className="text-xs font-bold">Peers</span>
        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 font-bold">
          {connectedFriends.length}
        </span>
      </button>
    );
  }

  return (
    <div
      data-testid="peer-locator-panel"
      className={`fixed inset-x-0 bottom-0 max-h-[75vh] md:inset-auto md:top-20 md:right-4 md:bottom-24 w-full md:w-96 z-50 pointer-events-auto border rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-right duration-300 select-none ${panelBgClass}`}
    >
      {/* Mobile drag handle bar */}
      <div className="md:hidden w-12 h-1.5 rounded-full bg-slate-400/40 mx-auto mt-2.5 mb-1 shrink-0" />

      {/* Header */}
      <div className={`p-4 border-b flex items-center justify-between ${headerBgClass}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/25 shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold leading-tight">Peer Locator</h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isConnected ? 'LIVE' : 'SYNCED'}
              </span>
            </div>
            <p className={`text-[11px] ${textMutedClass}`}>Classmates & Friends on Campus</p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(false)}
          data-testid="close-peer-panel-btn"
          className={`p-1.5 rounded-xl transition-colors ${
            isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
          }`}
          title="Minimize Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Current User Check-In Card */}
        <div className={`rounded-2xl p-3.5 space-y-3 border ${cardBgClass}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span className="text-xs font-bold">
                {currentUser?.name || 'You (Student)'}
              </span>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
            }`}>
              {currentUser?.batch || 'B.Tech CSE'}
            </span>
          </div>

          {/* Current Status Readout */}
          <div className={`flex items-center justify-between text-xs p-2.5 rounded-xl border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <span className="font-semibold truncate">
                {currentRoom ? `${currentRoom.code}: ${currentRoom.name}` : 'Not checked in'}
              </span>
            </div>
            {currentRoom && (
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  currentRoom.floor === 'ground'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                }`}
              >
                {currentRoom.floor === 'ground' ? 'GF' : '1F'}
              </span>
            )}
          </div>

          {/* Auto-Sync Toggle Switch */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 text-[11px] font-medium">
              <RefreshCw className={`w-3 h-3 ${isAutoSyncEnabled ? 'text-cyan-500 animate-spin' : textMutedClass}`} />
              <span>Auto-Sync with Timetable</span>
            </div>
            <button
              onClick={toggleAutoSync}
              data-testid="toggle-auto-sync-btn"
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                isAutoSyncEnabled ? 'bg-cyan-500' : isDark ? 'bg-slate-700' : 'bg-slate-300'
              }`}
              title="Toggle timetable auto-sync"
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  isAutoSyncEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Manual Check-in Dropdown */}
          <div className="flex items-center gap-2 pt-1">
            <select
              value={manualRoomSelection}
              onChange={(e) => {
                setManualRoomSelection(e.target.value);
                handleManualCheckIn(e.target.value);
              }}
              data-testid="room-checkin-select"
              className={`flex-1 border rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyan-500 ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <option value="">Quick Check-in to Room...</option>
              {campusRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} - {r.name} ({r.floor === 'ground' ? 'GF' : '1F'})
                </option>
              ))}
            </select>

            {currentRoom && (
              <button
                onClick={leaveRoom}
                data-testid="leave-room-btn"
                title="Check Out / Leave Room"
                className={`p-1.5 border rounded-xl transition-colors ${
                  isDark
                    ? 'bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border-slate-700 hover:border-rose-500/40'
                    : 'bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-200 hover:border-rose-300'
                }`}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Connected Friends List */}
        <div className="space-y-2">
          <div className={`flex items-center justify-between text-xs font-semibold px-1 ${textMutedClass}`}>
            <span>Connected Classmates ({connectedFriends.length})</span>
            <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">Click to locate</span>
          </div>

          {connectedFriends.length === 0 ? (
            <div className={`border rounded-2xl p-6 text-center text-xs ${cardBgClass} ${textMutedClass}`}>
              <Radio className="w-6 h-6 mx-auto mb-2 animate-pulse text-cyan-500" />
              <p>No other peers online yet.</p>
              <p className="text-[11px] mt-1 opacity-75">Friends checking in will appear here live.</p>
            </div>
          ) : (
            connectedFriends.map((peer) => {
              const peerId = peer.id || peer.userId || 'peer';
              const peerName = peer.name || (peer as any).userName || peerId;
              const roomId = peer.currentRoomId || peer.roomId;
              const room = roomId ? campusRooms.find((r) => r.id === roomId) : null;
              const floor = room ? room.floor : peer.floor || 'ground';
              const avatarColor = getPeerAvatarColor(peer);
              const isSelected = selectedRoomId === roomId;

              return (
                <div
                  key={peerId}
                  data-testid={`peer-card-${peerId}`}
                  onClick={() => handlePeerCardClick(roomId)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500/80 shadow-lg shadow-cyan-500/20'
                      : isDark
                      ? 'bg-slate-950/90 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-md"
                        style={{ backgroundColor: avatarColor }}
                      >
                        {peerName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate group-hover:text-cyan-500 transition-colors">
                          {peerName}
                        </div>
                        <div className={`text-[10px] truncate ${textMutedClass}`}>
                          {peer.batch || 'Classmate'}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          floor === 'ground'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                        }`}
                      >
                        {floor === 'ground' ? 'Ground' : '1st Floor'}
                      </span>
                      {peer.isAutoSynced && (
                        <span className="text-[8px] font-mono uppercase px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/40">
                          Auto-Sync
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Room Location Badge */}
                  <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[11px] ${
                    isDark ? 'border-slate-800' : 'border-slate-200'
                  }`}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin className="w-3 h-3 text-cyan-500 shrink-0" />
                      <span className="truncate font-medium">
                        {room ? `${room.code}: ${room.name}` : roomId || 'Roaming'}
                      </span>
                    </div>
                    <Compass className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:text-cyan-500 shrink-0 ml-1 transition-all" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
