import { create } from 'zustand';
import { campusRooms } from '../data/campusRooms';
import { CameraTarget, FloorFilter, ViewMode } from '../types/campus';
import { findPathToRoom } from '../services/routing/pathfinding';

export interface CampusStoreState {
  selectedRoomId: string | null;
  hoveredRoomId: string | null;
  activeFloorFilter: FloorFilter;
  viewMode: ViewMode;
  cameraTarget: CameraTarget | null;
  navigationPath: [number, number, number][] | null;

  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;

  userOriginId: string;
  setUserOriginId: (id: string) => void;
  isWayfindingOpen: boolean;
  setIsWayfindingOpen: (open: boolean) => void;
  swapOriginAndDestination: () => void;
  isNavigating: boolean;
  setIsNavigating: (active: boolean) => void;
  currentStepIndex: number;
  setCurrentStepIndex: (idx: number) => void;
  userPosition: [number, number, number];
  setUserPosition: (pos: [number, number, number]) => void;
  liveGpsCoords: [number, number, number] | null;
  setLiveGpsCoords: (coords: [number, number, number] | null) => void;
  isGpsActive: boolean;
  setIsGpsActive: (active: boolean) => void;

  selectRoom: (roomId: string | null) => void;
  setHoveredRoom: (roomId: string | null) => void;
  setFloorFilter: (filter: FloorFilter) => void;
  setViewMode: (mode: ViewMode) => void;
  setCameraTarget: (position: [number, number, number], lookAt: [number, number, number]) => void;
  setNavigationPath: (path: [number, number, number][] | null) => void;
  navigateToRoom: (roomId: string, originId?: string) => void;
  clearNavigationPath: () => void;
  resetView: () => void;
}

export const useCampusStore = create<CampusStoreState>((set, get) => ({
  selectedRoomId: null,
  hoveredRoomId: null,
  activeFloorFilter: 'all',
  viewMode: '3D',
  cameraTarget: null,
  navigationPath: null,
  isPanelOpen: false,

  userOriginId: 'gate',
  isNavigating: false,
  currentStepIndex: 0,
  userPosition: [0, 0.2, 36],
  liveGpsCoords: null,
  isGpsActive: false,

  isWayfindingOpen: false,
  setIsWayfindingOpen: (open) => set({ isWayfindingOpen: open }),
  setUserOriginId: (id) => set({ userOriginId: id }),
  swapOriginAndDestination: () => {
    const state = get();
    const currentOrigin = state.userOriginId;
    const currentDest = state.selectedRoomId;
    if (currentDest) {
      set({ userOriginId: currentDest });
      const targetRoom = campusRooms.find((r) => r.id === currentOrigin);
      if (targetRoom) {
        state.navigateToRoom(targetRoom.id, currentDest);
      } else {
        // If origin was a waypoint like 'gate', keep origin as dest and clear navigation path
        state.clearNavigationPath();
        set({ selectedRoomId: null });
      }
    }
  },
  setIsNavigating: (active) => set({ isNavigating: active }),
  setCurrentStepIndex: (idx) => set({ currentStepIndex: idx }),
  setUserPosition: (pos) => set({ userPosition: pos }),
  setLiveGpsCoords: (coords) => set({ liveGpsCoords: coords }),
  setIsGpsActive: (active) => set({ isGpsActive: active }),

  setIsPanelOpen: (open) => set({ isPanelOpen: open }),

  zoomIn: () =>
    set((state) => {
      const currentPos = state.cameraTarget?.position || (state.viewMode === '2D' ? [0, 52, 0.05] : [34, 26, 36]);
      const currentLook = state.cameraTarget?.lookAt || (state.viewMode === '2D' ? [0, 0, 0] : [0, 1.5, 0]);
      return {
        cameraTarget: {
          position: [
            currentLook[0] + (currentPos[0] - currentLook[0]) * 0.8,
            Math.max(6, currentLook[1] + (currentPos[1] - currentLook[1]) * 0.8),
            currentLook[2] + (currentPos[2] - currentLook[2]) * 0.8,
          ],
          lookAt: currentLook,
        },
      };
    }),

  zoomOut: () =>
    set((state) => {
      const currentPos = state.cameraTarget?.position || (state.viewMode === '2D' ? [0, 52, 0.05] : [34, 26, 36]);
      const currentLook = state.cameraTarget?.lookAt || (state.viewMode === '2D' ? [0, 0, 0] : [0, 1.5, 0]);
      return {
        cameraTarget: {
          position: [
            currentLook[0] + (currentPos[0] - currentLook[0]) * 1.25,
            Math.min(130, currentLook[1] + (currentPos[1] - currentLook[1]) * 1.25),
            currentLook[2] + (currentPos[2] - currentLook[2]) * 1.25,
          ],
          lookAt: currentLook,
        },
      };
    }),

  selectRoom: (roomId) => {
    set({ selectedRoomId: roomId });
    if (roomId) {
      const room = campusRooms.find((r) => r.id === roomId);
      if (room) {
        const currentFilter = get().activeFloorFilter;
        const updates: Partial<CampusStoreState> = {
          cameraTarget: {
            position: [room.position[0] + 10, room.position[1] + 8, room.position[2] + 10],
            lookAt: room.position,
          },
        };
        // Auto-switch floor filter if the selected room would be hidden by the current floor filter
        if (currentFilter !== 'all' && currentFilter !== room.floor) {
          updates.activeFloorFilter = room.floor;
        }
        set(updates);
      }
    }
  },

  setHoveredRoom: (roomId) => set({ hoveredRoomId: roomId }),

  setFloorFilter: (filter) => set({ activeFloorFilter: filter }),

  setViewMode: (mode) => {
    set({ viewMode: mode });
    if (mode === '2D') {
      // Top-down 2D architectural blueprint plan view (looking at [0, 0, 0])
      set({
        cameraTarget: {
          position: [0, 52, 0.05],
          lookAt: [0, 0, 0],
        },
      });
    } else {
      // 3D Isometric perspective view
      set({
        cameraTarget: {
          position: [34, 26, 36],
          lookAt: [0, 1.5, 0],
        },
      });
    }
  },

  setCameraTarget: (position, lookAt) => set({ cameraTarget: { position, lookAt } }),

  setNavigationPath: (path) => set({ navigationPath: path }),

  navigateToRoom: (roomId: string, originId?: string) => {
    const origin = originId || get().userOriginId || 'gate';
    const path = findPathToRoom(roomId, origin);
    const room = campusRooms.find((r) => r.id === roomId);
    const currentFilter = get().activeFloorFilter;
    const updates: Partial<CampusStoreState> = {
      navigationPath: path,
      selectedRoomId: roomId,
    };
    if (room) {
      updates.cameraTarget = {
        position: [room.position[0] + 10, room.position[1] + 8, room.position[2] + 10],
        lookAt: room.position,
      };
      if (currentFilter !== 'all' && currentFilter !== room.floor) {
        updates.activeFloorFilter = room.floor;
      }
    }
    set(updates);
  },

  clearNavigationPath: () => set({ navigationPath: null }),

  resetView: () =>
    set((state) => ({
      selectedRoomId: null,
      cameraTarget:
        state.viewMode === '2D'
          ? { position: [0, 52, 0.05], lookAt: [0, 0, 0] }
          : { position: [34, 26, 36], lookAt: [0, 1.5, 0] },
      navigationPath: null,
    })),
}));
