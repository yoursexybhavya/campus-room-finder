import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useCampusStore } from '../../stores/useCampusStore';
import { usePeerStore } from '../../stores/usePeerStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { campusRooms } from '../../data/campusRooms';
import { PeerUser, getDeterministicColor } from '../../types/peer';

export function getPeerAvatarColor(peer: { id?: string; userId?: string; avatarColor?: string }): string {
  if (peer.avatarColor) return peer.avatarColor;
  const key = peer.id || peer.userId || 'peer';
  return getDeterministicColor(key);
}

interface ComputedPeerAvatar {
  peer: PeerUser;
  position: [number, number, number];
  roomName: string;
  roomCode: string;
  floor: 'ground' | 'first';
}

export const PeerAvatarsLayer: React.FC = () => {
  const rawPeers = usePeerStore((state) => state.peers);
  const selectedPeerId = usePeerStore((state) => state.selectedPeerId);
  const selectPeer = usePeerStore((state) => state.selectPeer);

  const activeFloorFilter = useCampusStore((state) => state.activeFloorFilter);
  const selectedRoomId = useCampusStore((state) => state.selectedRoomId);
  const selectRoom = useCampusStore((state) => state.selectRoom);
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  // Normalize peers from Map, Array, or Object
  const peerList: PeerUser[] = useMemo(() => {
    if (!rawPeers) return [];
    if (Array.isArray(rawPeers)) return rawPeers;
    if (rawPeers instanceof Map) return Array.from(rawPeers.values());
    return Object.values(rawPeers);
  }, [rawPeers]);

  // Compute radial dispersion per room
  const dispersedAvatars: ComputedPeerAvatar[] = useMemo(() => {
    const roomGroups = new Map<string, PeerUser[]>();

    peerList.forEach((peer) => {
      const roomId = peer.currentRoomId || peer.roomId;
      if (!roomId) return;
      const group = roomGroups.get(roomId) || [];
      group.push(peer);
      roomGroups.set(roomId, group);
    });

    const results: ComputedPeerAvatar[] = [];

    roomGroups.forEach((peersInRoom, roomId) => {
      const room = campusRooms.find((r) => r.id === roomId);
      const centerCoords: [number, number, number] = room
        ? room.position
        : peersInRoom[0].coordinates || [0, 1.0, 0];
      const floor: 'ground' | 'first' = room
        ? room.floor
        : (peersInRoom[0].floor as 'ground' | 'first') || 'ground';
      const roomName = room ? room.name : roomId;
      const roomCode = room ? room.code : roomId;

      const N = peersInRoom.length;
      const radius = 1.5; // Radial dispersion radius per PeerLocator.test.tsx

      peersInRoom.forEach((peer, idx) => {
        let posX = centerCoords[0];
        let posZ = centerCoords[2];
        const posY = peer.coordinates?.[1] ?? centerCoords[1];

        if (N > 1) {
          const angle = (idx / N) * 2 * Math.PI;
          posX = centerCoords[0] + Math.cos(angle) * radius;
          posZ = centerCoords[2] + Math.sin(angle) * radius;
        }

        results.push({
          peer,
          position: [posX, posY, posZ],
          roomName,
          roomCode,
          floor,
        });
      });
    });

    return results;
  }, [peerList]);

  return (
    <group name="peer-avatars-layer" >
      {dispersedAvatars.map(({ peer, position, floor }) => {
        const peerId = peer.id || peer.userId || 'peer';
        const peerName = peer.name || (peer as any).userName || peerId;
        const avatarColor = getPeerAvatarColor(peer);

        // Floor filtering: respect 'all' | 'ground' | 'first'
        const isFloorActive =
          activeFloorFilter === 'all' ||
          (activeFloorFilter === 'ground' && floor === 'ground') ||
          (activeFloorFilter === 'first' && floor === 'first');

        const isSelected =
          selectedPeerId === peerId ||
          selectedRoomId === (peer.currentRoomId || peer.roomId);
        const opacity = isFloorActive ? (isSelected ? 1.0 : 0.85) : 0.15;

        const handleAvatarClick = (e: any) => {
          e.stopPropagation();
          const targetRoomId = peer.currentRoomId || peer.roomId;
          if (targetRoomId) {
            selectRoom(targetRoomId);
          }
          if (selectPeer) {
            selectPeer(peerId);
          }
        };

        return (
          <group
            key={peerId}
            position={position}
            name={`peer-avatar-${peerId}`}
            
            onClick={handleAvatarClick}
            onPointerOver={(e) => {
              e.stopPropagation();
              if (typeof document !== 'undefined') {
                document.body.style.cursor = 'pointer';
              }
            }}
            onPointerOut={() => {
              if (typeof document !== 'undefined') {
                document.body.style.cursor = 'auto';
              }
            }}
          >
            {/* Ground Pulsing Halo */}
            <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.35, 0.5, 24]} />
              <meshBasicMaterial
                color={avatarColor}
                transparent
                opacity={opacity * 0.7}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Figurine Body (Capsule) */}
            <mesh position={[0, 0.45, 0]} castShadow>
              <capsuleGeometry args={[0.22, 0.45, 8, 16]} />
              <meshStandardMaterial
                color={avatarColor}
                roughness={0.25}
                metalness={0.2}
                transparent
                opacity={opacity}
                emissive={isSelected ? avatarColor : '#000000'}
                emissiveIntensity={isSelected ? 0.6 : 0.0}
              />
            </mesh>

            {/* Figurine Head Sphere */}
            <mesh position={[0, 0.85, 0]} castShadow>
              <sphereGeometry args={[0.22, 16, 16]} />
              <meshStandardMaterial
                color={avatarColor}
                roughness={0.25}
                metalness={0.2}
                transparent
                opacity={opacity}
                emissive={isSelected ? avatarColor : '#000000'}
                emissiveIntensity={isSelected ? 0.6 : 0.0}
              />
            </mesh>

            {/* Billboarding Nametag (Only rendered when floor is active) */}
            {isFloorActive && (
              <Html
                position={[0, 1.35, 0]}
                center
                distanceFactor={25}
                className="pointer-events-none select-none transition-all duration-200"
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap shadow-lg flex items-center gap-1.5 border backdrop-blur-md transition-all ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300 scale-110 shadow-cyan-500/50'
                        : isDark
                        ? 'bg-slate-900/90 text-slate-100 border-slate-700/80 shadow-black/60'
                        : 'bg-white/95 text-slate-800 border-slate-200 shadow-slate-300/50'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: avatarColor }}
                    />
                    <span>{peerName}</span>
                    {peer.isAutoSynced && (
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded border ${
                          isDark
                            ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/50'
                            : 'bg-cyan-100 text-cyan-800 border-cyan-300'
                        }`}
                      >
                        AUTO
                      </span>
                    )}
                  </div>
                  <div
                    className={`w-0 h-0 border-x-4 border-x-transparent border-t-4 -mt-px ${
                      isDark ? 'border-t-slate-700/80' : 'border-t-slate-200'
                    }`}
                  />
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
};
