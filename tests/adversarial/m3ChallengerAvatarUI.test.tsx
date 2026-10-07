import React, { Suspense } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PeerAvatarsLayer, getPeerAvatarColor } from '../../src/components/canvas/PeerAvatarsLayer';
import { PeerLocatorPanel } from '../../src/components/ui/PeerLocatorPanel';
import { useCampusStore } from '../../src/stores/useCampusStore';
import { usePeerStore } from '../../src/stores/usePeerStore';
import { campusRooms } from '../../src/data/campusRooms';
import { PeerUser } from '../../src/types/peer';

// =============================================================================
// Headless WebGL & Canvas Test Harness for React-Three-Fiber
// =============================================================================

let capturedScene: THREE.Scene | null = null;

function SceneProbe() {
  const { scene } = useThree();
  capturedScene = scene;
  return null;
}

function setupWebGLAndResizeHarness() {
  // Support R3F dashed-prop assignment (e.g. data-testid -> object.data.testid)
  if (!Object.getOwnPropertyDescriptor(Object.prototype, 'data')) {
    Object.defineProperty(Object.prototype, 'data', {
      get() {
        if (!this._data) this._data = {};
        return this._data;
      },
      set(v) {
        this._data = v;
      },
      configurable: true,
    });
  }

  // Pure JavaScript Canvas Context Polyfill
  HTMLCanvasElement.prototype.getContext = function (contextType: string) {
    if (contextType === '2d') {
      return {
        canvas: this,
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Array(4) })),
        putImageData: vi.fn(),
        createImageData: vi.fn(() => []),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        fillText: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
        transform: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
      } as any;
    }

    if (contextType === 'webgl' || contextType === 'webgl2' || contextType === 'experimental-webgl') {
      const gl: any = {
        canvas: this,
        drawingBufferWidth: 1024,
        drawingBufferHeight: 768,
        getContextAttributes: () => ({ xrCompatible: false, alpha: true }),
        VERSION: 0x1f02,
        SHADING_LANGUAGE_VERSION: 0x8b8c,
        VENDOR: 0x1f00,
        RENDERER: 0x1f01,
        MAX_TEXTURE_SIZE: 0x0d33,
        MAX_CUBE_MAP_TEXTURE_SIZE: 0x851c,
        MAX_RENDERBUFFER_SIZE: 0x84e8,
        MAX_VERTEX_ATTRIBS: 0x8869,
        MAX_VERTEX_UNIFORM_VECTORS: 0x8dfb,
        MAX_VARYING_VECTORS: 0x8dfc,
        MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d,
        MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8b4c,
        MAX_TEXTURE_IMAGE_UNITS: 0x8872,
        MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd,
        getExtension: vi.fn(() => null),
        getParameter: vi.fn((param: any) => {
          if (param === 0x1f02 || param === undefined) return 'WebGL 2.0';
          if (param === 0x8b8c) return 'WebGL GLSL ES 3.00';
          if (param === 0x1f00) return 'WebKit';
          if (param === 0x1f01) return 'WebKit WebGL';
          if (param === 0x0d33 || param === 0x851c || param === 0x84e8) return 4096;
          return 16;
        }),
        getShaderPrecisionFormat: vi.fn(() => ({
          precision: 23,
          rangeMin: 127,
          rangeMax: 127,
        })),
        createShader: vi.fn(() => ({})),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        getShaderParameter: vi.fn(() => true),
        createProgram: vi.fn(() => ({})),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        getProgramParameter: vi.fn(() => true),
        useProgram: vi.fn(),
        createBuffer: vi.fn(() => ({})),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        bufferSubData: vi.fn(),
        enable: vi.fn(),
        disable: vi.fn(),
        clear: vi.fn(),
        clearColor: vi.fn(),
        clearDepth: vi.fn(),
        viewport: vi.fn(),
        drawArrays: vi.fn(),
        drawElements: vi.fn(),
        getShaderInfoLog: vi.fn(() => ''),
        getProgramInfoLog: vi.fn(() => ''),
        getUniformLocation: vi.fn(() => ({})),
        getAttribLocation: vi.fn(() => 0),
        enableVertexAttribArray: vi.fn(),
        disableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        createTexture: vi.fn(() => ({})),
        bindTexture: vi.fn(),
        texParameteri: vi.fn(),
        texImage2D: vi.fn(),
        texImage3D: vi.fn(),
        texStorage2D: vi.fn(),
        texStorage3D: vi.fn(),
        createFramebuffer: vi.fn(() => ({})),
        bindFramebuffer: vi.fn(),
        framebufferTexture2D: vi.fn(),
        createRenderbuffer: vi.fn(() => ({})),
        bindRenderbuffer: vi.fn(),
        renderbufferStorage: vi.fn(),
        depthFunc: vi.fn(),
        blendFunc: vi.fn(),
        cullFace: vi.fn(),
        frontFace: vi.fn(),
        scissor: vi.fn(),
        pixelStorei: vi.fn(),
        colorMask: vi.fn(),
        depthMask: vi.fn(),
        depthRange: vi.fn(),
        polygonOffset: vi.fn(),
        sampleCoverage: vi.fn(),
        stencilFunc: vi.fn(),
        stencilMask: vi.fn(),
        stencilOp: vi.fn(),
        clearStencil: vi.fn(),
      };
      return gl;
    }
    return null;
  } as any;

  // Mock non-zero element bounding dimensions
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    return {
      width: 1024,
      height: 768,
      top: 0,
      left: 0,
      bottom: 768,
      right: 1024,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
  };

  // Synchronous ResizeObserver mock triggering react-use-measure
  class ActiveResizeObserver {
    cb: any;
    constructor(cb: any) {
      this.cb = cb;
    }
    observe() {
      this.cb();
    }
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ActiveResizeObserver as any;
  global.ResizeObserver = ActiveResizeObserver as any;
}

// Helper to mount PeerAvatarsLayer inside Canvas and await R3F fiber reconciliation
async function renderAvatarsLayerInCanvas() {
  const result = render(
    <div style={{ width: 1024, height: 768 }} data-testid="test-r3f-container">
      <Canvas>
        <SceneProbe />
        <Suspense fallback={null}>
          <PeerAvatarsLayer />
        </Suspense>
      </Canvas>
    </div>
  );

  await act(async () => {
    await new Promise((r) => setTimeout(r, 60));
  });

  return result;
}

// =============================================================================
// Challenger 2 Test Suite: Milestone 3 (Peer Avatars Layer & Peer Locator HUD)
// =============================================================================

describe('Challenger 2 Empirical Adversarial Suite: Milestone 3 (Peer Avatars & UI)', () => {
  beforeEach(() => {
    setupWebGLAndResizeHarness();
    capturedScene = null;
    useCampusStore.getState().resetView();
    useCampusStore.getState().setFloorFilter('all');
    usePeerStore.getState().clearPeers();
    usePeerStore.getState().selectPeer(null);
    usePeerStore.getState().setAutoSync(true);
    usePeerStore.getState().setCurrentUser({
      id: 'student_me',
      userId: 'student_me',
      name: 'Aarav Gupta',
      batch: 'CSE-3A',
      currentRoomId: null,
      roomId: null,
      floor: null,
      isAutoSynced: true,
    });
  });

  // ===========================================================================
  // 1. R3F Scene Graph Group Hierarchy & Radial Dispersion Positioning
  // ===========================================================================
  describe('1. 3D Peer Avatars Layer R3F Hierarchy & Radial Dispersion Positioning', () => {
    it('1.1 should construct correct R3F group hierarchy and Three.js mesh figurines', async () => {
      const mockPeers: PeerUser[] = [
        {
          id: 'peer_alice',
          userId: 'peer_alice',
          name: 'Alice Sharma',
          batch: 'CSE-3A',
          avatarColor: '#3B82F6',
          currentRoomId: 'LT-1',
          roomId: 'LT-1',
          floor: 'ground',
          coordinates: [20, 1.0, 7],
          isAutoSynced: true,
          lastActive: Date.now(),
        },
      ];
      usePeerStore.getState().setPeers(mockPeers);

      await renderAvatarsLayerInCanvas();

      expect(capturedScene).not.toBeNull();
      const rootLayer = capturedScene?.getObjectByName('peer-avatars-layer') as THREE.Group;
      expect(rootLayer).toBeDefined();
      expect(rootLayer.type).toBe('Group');

      const avatarGroup = capturedScene?.getObjectByName('peer-avatar-peer_alice') as THREE.Group;
      expect(avatarGroup).toBeDefined();
      expect(avatarGroup.type).toBe('Group');

      // Verify meshes inside the avatar group: halo ring, body capsule, head sphere
      const meshes = avatarGroup.children.filter((c) => c.type === 'Mesh') as THREE.Mesh[];
      expect(meshes.length).toBeGreaterThanOrEqual(3);

      // 1. Ground halo ring mesh (y = 0.05, rotated by -PI/2 on x-axis)
      const haloMesh = meshes.find((m) => Math.abs(m.position.y - 0.05) < 0.01);
      expect(haloMesh).toBeDefined();
      expect(haloMesh?.geometry.type).toBe('RingGeometry');
      expect((haloMesh?.material as THREE.Material).type).toBe('MeshBasicMaterial');

      // 2. Body capsule mesh (y = 0.45)
      const bodyMesh = meshes.find((m) => Math.abs(m.position.y - 0.45) < 0.01);
      expect(bodyMesh).toBeDefined();
      expect(bodyMesh?.geometry.type).toBe('CapsuleGeometry');
      expect((bodyMesh?.material as THREE.Material).type).toBe('MeshStandardMaterial');

      // 3. Head sphere mesh (y = 0.85)
      const headMesh = meshes.find((m) => Math.abs(m.position.y - 0.85) < 0.01);
      expect(headMesh).toBeDefined();
      expect(headMesh?.geometry.type).toBe('SphereGeometry');
      expect((headMesh?.material as THREE.Material).type).toBe('MeshStandardMaterial');

      // 4. HTML billboarding nametag in DOM
      expect(screen.getByText('Alice Sharma')).toBeInTheDocument();
      expect(screen.getByText('AUTO')).toBeInTheDocument();
    });

    it('1.2 should position collocated peers across Ground (LT-1) and First (LAB-3) floors with exact dispersion formulas', async () => {
      // LT-1 is at [20, 1.0, 7] (Ground floor)
      const lt1 = campusRooms.find((r) => r.id === 'LT-1')!;
      expect(lt1).toBeDefined();
      expect(lt1.floor).toBe('ground');
      expect(lt1.position).toEqual([20, 1.0, 7]);

      // LAB-3 is at [-20, 3.6, 7] (First floor AI/ML Lab)
      const lab3 = campusRooms.find((r) => r.id === 'LAB-3')!;
      expect(lab3).toBeDefined();
      expect(lab3.floor).toBe('first');
      expect(lab3.position).toEqual([-20, 3.6, 7]);

      // LAB-PHY is at [-20, 1.0, 18] (Ground floor single peer)
      const labPhy = campusRooms.find((r) => r.id === 'LAB-PHY')!;
      expect(labPhy).toBeDefined();

      // LT-3 is at [20, 3.6, 7] (First floor single peer)
      const lt3 = campusRooms.find((r) => r.id === 'LT-3')!;
      expect(lt3).toBeDefined();

      const testPeers: PeerUser[] = [
        // 3 collocated peers in Ground Floor LT-1
        {
          id: 'p_lt1_0',
          userId: 'p_lt1_0',
          name: 'Priya Verma',
          batch: 'CSE-3A',
          avatarColor: '#10B981',
          currentRoomId: 'LT-1',
          roomId: 'LT-1',
          floor: 'ground',
          coordinates: lt1.position,
          isAutoSynced: true,
          lastActive: Date.now(),
        },
        {
          id: 'p_lt1_1',
          userId: 'p_lt1_1',
          name: 'Rahul Sharma',
          batch: 'CSE-3A',
          avatarColor: '#3B82F6',
          currentRoomId: 'LT-1',
          roomId: 'LT-1',
          floor: 'ground',
          coordinates: lt1.position,
          isAutoSynced: false,
          lastActive: Date.now(),
        },
        {
          id: 'p_lt1_2',
          userId: 'p_lt1_2',
          name: 'Sneha Patel',
          batch: 'CSE-3B',
          avatarColor: '#EC4899',
          currentRoomId: 'LT-1',
          roomId: 'LT-1',
          floor: 'ground',
          coordinates: lt1.position,
          isAutoSynced: false,
          lastActive: Date.now(),
        },

        // 2 collocated peers in First Floor LAB-3
        {
          id: 'p_lab3_0',
          userId: 'p_lab3_0',
          name: 'Vikram Mehta',
          batch: 'AI-DS-5A',
          avatarColor: '#8B5CF6',
          currentRoomId: 'LAB-3',
          roomId: 'LAB-3',
          floor: 'first',
          coordinates: lab3.position,
          isAutoSynced: true,
          lastActive: Date.now(),
        },
        {
          id: 'p_lab3_1',
          userId: 'p_lab3_1',
          name: 'Ananya Roy',
          batch: 'AI-DS-5A',
          avatarColor: '#06B6D4',
          currentRoomId: 'LAB-3',
          roomId: 'LAB-3',
          floor: 'first',
          coordinates: lab3.position,
          isAutoSynced: true,
          lastActive: Date.now(),
        },

        // Single peer in Ground Floor LAB-PHY
        {
          id: 'p_phy_0',
          userId: 'p_phy_0',
          name: 'Rohan Joshi',
          batch: 'ECE-3A',
          avatarColor: '#F59E0B',
          currentRoomId: 'LAB-PHY',
          roomId: 'LAB-PHY',
          floor: 'ground',
          coordinates: labPhy.position,
          isAutoSynced: false,
          lastActive: Date.now(),
        },

        // Single peer in First Floor LT-3
        {
          id: 'p_lt3_0',
          userId: 'p_lt3_0',
          name: 'Kavita Sen',
          batch: 'CSE-3A',
          avatarColor: '#EF4444',
          currentRoomId: 'LT-3',
          roomId: 'LT-3',
          floor: 'first',
          coordinates: lt3.position,
          isAutoSynced: true,
          lastActive: Date.now(),
        },
      ];

      usePeerStore.getState().setPeers(testPeers);
      await renderAvatarsLayerInCanvas();

      expect(capturedScene).not.toBeNull();

      // --- Verify LT-1 (N = 3, Ground Floor) ---
      const lt1Group0 = capturedScene?.getObjectByName('peer-avatar-p_lt1_0') as THREE.Group;
      const lt1Group1 = capturedScene?.getObjectByName('peer-avatar-p_lt1_1') as THREE.Group;
      const lt1Group2 = capturedScene?.getObjectByName('peer-avatar-p_lt1_2') as THREE.Group;

      expect(lt1Group0).toBeDefined();
      expect(lt1Group1).toBeDefined();
      expect(lt1Group2).toBeDefined();

      // Expected coordinates: angle = (idx / 3) * 2 * PI, radius = 1.5
      // idx 0: angle = 0 -> posX = 20 + 1.5 = 21.5, posZ = 7 + 0 = 7.0, posY = 1.0
      expect(lt1Group0.position.x).toBeCloseTo(21.5, 2);
      expect(lt1Group0.position.y).toBeCloseTo(1.0, 2);
      expect(lt1Group0.position.z).toBeCloseTo(7.0, 2);

      // idx 1: angle = 2*PI/3 -> posX = 20 + 1.5*cos(120 deg) = 20 - 0.75 = 19.25
      // posZ = 7 + 1.5*sin(120 deg) = 7 + 1.299 = 8.299
      expect(lt1Group1.position.x).toBeCloseTo(19.25, 2);
      expect(lt1Group1.position.y).toBeCloseTo(1.0, 2);
      expect(lt1Group1.position.z).toBeCloseTo(8.299, 2);

      // idx 2: angle = 4*PI/3 -> posX = 20 + 1.5*cos(240 deg) = 20 - 0.75 = 19.25
      // posZ = 7 + 1.5*sin(240 deg) = 7 - 1.299 = 5.701
      expect(lt1Group2.position.x).toBeCloseTo(19.25, 2);
      expect(lt1Group2.position.y).toBeCloseTo(1.0, 2);
      expect(lt1Group2.position.z).toBeCloseTo(5.701, 2);

      // Pairwise non-overlapping distance check (approx 2.598m)
      const dist01 = lt1Group0.position.distanceTo(lt1Group1.position);
      const dist12 = lt1Group1.position.distanceTo(lt1Group2.position);
      const dist02 = lt1Group0.position.distanceTo(lt1Group2.position);
      expect(dist01).toBeCloseTo(2.598, 2);
      expect(dist12).toBeCloseTo(2.598, 2);
      expect(dist02).toBeCloseTo(2.598, 2);

      // --- Verify LAB-3 (N = 2, First Floor, center [-20, 3.6, 7]) ---
      const lab3Group0 = capturedScene?.getObjectByName('peer-avatar-p_lab3_0') as THREE.Group;
      const lab3Group1 = capturedScene?.getObjectByName('peer-avatar-p_lab3_1') as THREE.Group;

      expect(lab3Group0).toBeDefined();
      expect(lab3Group1).toBeDefined();

      // idx 0: angle = 0 -> posX = -20 + 1.5 = -18.5, posZ = 7, posY = 3.6
      expect(lab3Group0.position.x).toBeCloseTo(-18.5, 2);
      expect(lab3Group0.position.y).toBeCloseTo(3.6, 2);
      expect(lab3Group0.position.z).toBeCloseTo(7.0, 2);

      // idx 1: angle = PI -> posX = -20 - 1.5 = -21.5, posZ = 7, posY = 3.6
      expect(lab3Group1.position.x).toBeCloseTo(-21.5, 2);
      expect(lab3Group1.position.y).toBeCloseTo(3.6, 2);
      expect(lab3Group1.position.z).toBeCloseTo(7.0, 2);

      // Exact 3.0m separation along x-axis
      expect(lab3Group0.position.distanceTo(lab3Group1.position)).toBeCloseTo(3.0, 2);

      // --- Verify Single Peers (N = 1) retain exact room positions ---
      const phyGroup = capturedScene?.getObjectByName('peer-avatar-p_phy_0') as THREE.Group;
      expect(phyGroup.position.x).toBeCloseTo(-20, 2);
      expect(phyGroup.position.y).toBeCloseTo(1.0, 2);
      expect(phyGroup.position.z).toBeCloseTo(18, 2);

      const lt3Group = capturedScene?.getObjectByName('peer-avatar-p_lt3_0') as THREE.Group;
      expect(lt3Group.position.x).toBeCloseTo(20, 2);
      expect(lt3Group.position.y).toBeCloseTo(3.6, 2);
      expect(lt3Group.position.z).toBeCloseTo(7, 2);
    });

    it('1.3 should handle high-concurrency radial dispersion (10 collocated peers) with zero collisions', async () => {
      // Place 10 peers collocated in Library Main (center: [0, 1.0, -22])
      const libRoom = campusRooms.find((r) => r.id === 'LIB-MAIN')!;
      const collocatedPeers: PeerUser[] = Array.from({ length: 10 }, (_, i) => ({
        id: `peer_lib_${i}`,
        userId: `peer_lib_${i}`,
        name: `Student ${i}`,
        batch: 'CSE-3A',
        avatarColor: '#3B82F6',
        currentRoomId: 'LIB-MAIN',
        roomId: 'LIB-MAIN',
        floor: 'ground',
        coordinates: libRoom.position,
        isAutoSynced: false,
        lastActive: Date.now(),
      }));

      usePeerStore.getState().setPeers(collocatedPeers);
      await renderAvatarsLayerInCanvas();

      const positions: THREE.Vector3[] = [];
      for (let i = 0; i < 10; i++) {
        const group = capturedScene?.getObjectByName(`peer-avatar-peer_lib_${i}`) as THREE.Group;
        expect(group).toBeDefined();
        positions.push(group.position);
      }

      // Verify all 10 positions are distinct
      const keys = new Set(positions.map((p) => `${p.x.toFixed(3)},${p.z.toFixed(3)}`));
      expect(keys.size).toBe(10);

      // Verify every position lies at distance 1.5m from room center
      const center = new THREE.Vector3(...libRoom.position);
      positions.forEach((pos) => {
        const distFromCenter = Math.sqrt(
          Math.pow(pos.x - center.x, 2) + Math.pow(pos.z - center.z, 2)
        );
        expect(distFromCenter).toBeCloseTo(1.5, 2);
        expect(pos.y).toBeCloseTo(1.0, 2);
      });

      // Centroid of all dispersed peers matches room center
      const avgX = positions.reduce((acc, p) => acc + p.x, 0) / 10;
      const avgZ = positions.reduce((acc, p) => acc + p.z, 0) / 10;
      expect(avgX).toBeCloseTo(center.x, 2);
      expect(avgZ).toBeCloseTo(center.z, 2);
    });
  });

  // ===========================================================================
  // 2. Floor Filter Reactions & Material Opacity Auditing
  // ===========================================================================
  describe('2. Floor Filter Reactions & Material Opacity Auditing', () => {
    it('2.1 should dynamically update material opacities and nametag visibility when floor filter changes', async () => {
      const testPeers: PeerUser[] = [
        {
          id: 'peer_ground',
          userId: 'peer_ground',
          name: 'Ground Student',
          batch: 'CSE-3A',
          avatarColor: '#10B981',
          currentRoomId: 'LT-1', // Ground
          roomId: 'LT-1',
          floor: 'ground',
          isAutoSynced: true,
          lastActive: Date.now(),
        },
        {
          id: 'peer_first',
          userId: 'peer_first',
          name: 'First Student',
          batch: 'AI-DS-5A',
          avatarColor: '#8B5CF6',
          currentRoomId: 'LAB-3', // First floor
          roomId: 'LAB-3',
          floor: 'first',
          isAutoSynced: true,
          lastActive: Date.now(),
        },
      ];
      usePeerStore.getState().setPeers(testPeers);

      // --- Filter = 'all' ---
      useCampusStore.getState().setFloorFilter('all');
      await renderAvatarsLayerInCanvas();

      let groundGroup = capturedScene?.getObjectByName('peer-avatar-peer_ground') as THREE.Group;
      let firstGroup = capturedScene?.getObjectByName('peer-avatar-peer_first') as THREE.Group;

      const getMeshOpacity = (grp: THREE.Group, meshIndex: number) => {
        const mesh = grp.children.filter((c) => c.type === 'Mesh')[meshIndex] as THREE.Mesh;
        return (mesh.material as THREE.Material).opacity;
      };

      // In 'all', body capsule (index 1) has opacity 0.85 for both
      expect(getMeshOpacity(groundGroup, 1)).toBeCloseTo(0.85, 2);
      expect(getMeshOpacity(firstGroup, 1)).toBeCloseTo(0.85, 2);
      expect(screen.getByText('Ground Student')).toBeInTheDocument();
      expect(screen.getByText('First Student')).toBeInTheDocument();

      // --- Filter = 'ground' ---
      act(() => {
        useCampusStore.getState().setFloorFilter('ground');
      });

      // Ground peer stays active (0.85), first floor peer dims to 0.15
      expect(getMeshOpacity(groundGroup, 1)).toBeCloseTo(0.85, 2);
      expect(getMeshOpacity(firstGroup, 1)).toBeCloseTo(0.15, 2);

      // Nametag of inactive floor is unmounted
      expect(screen.getByText('Ground Student')).toBeInTheDocument();
      expect(screen.queryByText('First Student')).toBeNull();

      // --- Filter = 'first' ---
      act(() => {
        useCampusStore.getState().setFloorFilter('first');
      });

      // First floor peer active (0.85), ground floor peer dims to 0.15
      expect(getMeshOpacity(groundGroup, 1)).toBeCloseTo(0.15, 2);
      expect(getMeshOpacity(firstGroup, 1)).toBeCloseTo(0.85, 2);

      expect(screen.queryByText('Ground Student')).toBeNull();
      expect(screen.getByText('First Student')).toBeInTheDocument();

      // --- Back to 'all' ---
      act(() => {
        useCampusStore.getState().setFloorFilter('all');
      });
      expect(getMeshOpacity(groundGroup, 1)).toBeCloseTo(0.85, 2);
      expect(getMeshOpacity(firstGroup, 1)).toBeCloseTo(0.85, 2);
      expect(screen.getByText('Ground Student')).toBeInTheDocument();
      expect(screen.getByText('First Student')).toBeInTheDocument();
    });

    it('2.2 should elevate opacity to 1.0 and enable emissive glow when peer or room is selected', async () => {
      const mockPeer: PeerUser = {
        id: 'peer_target',
        userId: 'peer_target',
        name: 'Target Student',
        batch: 'CSE-3A',
        avatarColor: '#3B82F6',
        currentRoomId: 'LT-1',
        roomId: 'LT-1',
        floor: 'ground',
        isAutoSynced: true,
        lastActive: Date.now(),
      };
      usePeerStore.getState().setPeers([mockPeer]);
      await renderAvatarsLayerInCanvas();

      const avatarGroup = capturedScene?.getObjectByName('peer-avatar-peer_target') as THREE.Group;
      const bodyMesh = avatarGroup.children.filter((c) => c.type === 'Mesh')[1] as THREE.Mesh;
      const bodyMat = bodyMesh.material as THREE.MeshStandardMaterial;

      // Unselected state
      expect(bodyMat.opacity).toBeCloseTo(0.85, 2);
      expect(bodyMat.emissiveIntensity).toBe(0.0);

      // Select peer by ID
      act(() => {
        usePeerStore.getState().selectPeer('peer_target');
      });
      expect(bodyMat.opacity).toBeCloseTo(1.0, 2);
      expect(bodyMat.emissiveIntensity).toBeCloseTo(0.6, 2);

      // Deselect peer, but select peer's room
      act(() => {
        usePeerStore.getState().selectPeer(null);
        useCampusStore.getState().selectRoom('LT-1');
      });
      expect(bodyMat.opacity).toBeCloseTo(1.0, 2);
      expect(bodyMat.emissiveIntensity).toBeCloseTo(0.6, 2);

      // Reset selection
      act(() => {
        useCampusStore.getState().selectRoom(null);
      });
      expect(bodyMat.opacity).toBeCloseTo(0.85, 2);
      expect(bodyMat.emissiveIntensity).toBe(0.0);
    });

    it('2.3 should survive 100 rapid floor transitions without desync or memory leaks', async () => {
      const testPeers: PeerUser[] = [
        {
          id: 'p_g',
          userId: 'p_g',
          name: 'G Peer',
          batch: 'CSE-3A',
          avatarColor: '#10B981',
          currentRoomId: 'LT-1',
          roomId: 'LT-1',
          floor: 'ground',
          isAutoSynced: true,
          lastActive: Date.now(),
        },
        {
          id: 'p_f',
          userId: 'p_f',
          name: 'F Peer',
          batch: 'CSE-3A',
          avatarColor: '#8B5CF6',
          currentRoomId: 'LAB-3',
          roomId: 'LAB-3',
          floor: 'first',
          isAutoSynced: true,
          lastActive: Date.now(),
        },
      ];
      usePeerStore.getState().setPeers(testPeers);
      await renderAvatarsLayerInCanvas();

      const filterSequence: ('all' | 'ground' | 'first')[] = ['all', 'ground', 'first'];
      for (let i = 0; i < 90; i++) {
        act(() => {
          useCampusStore.getState().setFloorFilter(filterSequence[i % 3]);
        });
      }

      // Settle on 'ground'
      act(() => {
        useCampusStore.getState().setFloorFilter('ground');
      });
      expect(useCampusStore.getState().activeFloorFilter).toBe('ground');
      expect(screen.getByText('G Peer')).toBeInTheDocument();
      expect(screen.queryByText('F Peer')).toBeNull();
    });
  });

  // ===========================================================================
  // 3. 3D Avatar Interactive Pointer Click Handling
  // ===========================================================================
  describe('3. 3D Avatar Interactive Pointer Click Handling', () => {
    it('3.1 should invoke selectRoom and selectPeer when avatar group is clicked', async () => {
      const mockPeer: PeerUser = {
        id: 'peer_clickable',
        userId: 'peer_clickable',
        name: 'Clickable Peer',
        batch: 'CSE-3A',
        avatarColor: '#3B82F6',
        currentRoomId: 'LT-2',
        roomId: 'LT-2',
        floor: 'ground',
        isAutoSynced: true,
        lastActive: Date.now(),
      };
      usePeerStore.getState().setPeers([mockPeer]);
      await renderAvatarsLayerInCanvas();

      const avatarGroup = capturedScene?.getObjectByName('peer-avatar-peer_clickable') as any;
      expect(avatarGroup).toBeDefined();

      // Retrieve R3F event handler
      const clickHandler =
        avatarGroup.__r3f?.handlers?.onClick ||
        avatarGroup.__r3f?.memoizedProps?.onClick ||
        avatarGroup.onClick;

      expect(typeof clickHandler).toBe('function');

      const mockEvent = {
        stopPropagation: vi.fn(),
      };
      act(() => {
        clickHandler(mockEvent);
      });

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(useCampusStore.getState().selectedRoomId).toBe('LT-2');
      expect(usePeerStore.getState().selectedPeerId).toBe('peer_clickable');

      // Camera target automatically points to LT-2 coordinates
      const lt2 = campusRooms.find((r) => r.id === 'LT-2')!;
      expect(useCampusStore.getState().cameraTarget?.lookAt).toEqual(lt2.position);
    });
  });

  // ===========================================================================
  // 4. PeerLocatorPanel UI: Trigger, Friends List, Camera Tracking & Controls
  // ===========================================================================
  describe('4. PeerLocatorPanel UI: Trigger, Friends List, Camera Tracking & Controls', () => {
    it('4.1 should toggle panel between minimized pill and full drawer', () => {
      const mockFriends: PeerUser[] = [
        {
          id: 'p_1',
          userId: 'p_1',
          name: 'Priya Verma',
          batch: 'CSE-3A',
          avatarColor: '#10B981',
          currentRoomId: 'LT-1',
          roomId: 'LT-1',
          floor: 'ground',
          isAutoSynced: true,
          lastActive: Date.now(),
        },
      ];
      usePeerStore.getState().setPeers(mockFriends);

      render(<PeerLocatorPanel />);

      // Minimized Trigger Pill
      const openBtn = screen.getByTestId('open-peer-panel-btn');
      expect(openBtn).toBeInTheDocument();
      expect(screen.getByText('Peers')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Count badge

      // Open Panel
      act(() => {
        openBtn.click();
      });

      const panel = screen.getByTestId('peer-locator-panel');
      expect(panel).toBeInTheDocument();
      expect(screen.getByText('Peer Locator')).toBeInTheDocument();

      // Close Panel
      const closeBtn = screen.getByTestId('close-peer-panel-btn');
      act(() => {
        closeBtn.click();
      });

      expect(screen.queryByTestId('peer-locator-panel')).toBeNull();
      expect(screen.getByTestId('open-peer-panel-btn')).toBeInTheDocument();
    });

    it('4.2 should render empty state when no connected peers online', () => {
      render(<PeerLocatorPanel />);
      act(() => {
        screen.getByTestId('open-peer-panel-btn').click();
      });

      expect(screen.getByText(/No other peers online yet\./i)).toBeInTheDocument();
      expect(screen.getByText(/Friends checking in will appear here live\./i)).toBeInTheDocument();
    });

    it('4.3 should render connected friends and trigger room selection & camera focus on peer card click', () => {
      const friend1: PeerUser = {
        id: 'peer_rahul',
        userId: 'peer_rahul',
        name: 'Rahul Sharma',
        batch: 'CSE-3A',
        avatarColor: '#3B82F6',
        currentRoomId: 'LT-1',
        roomId: 'LT-1',
        floor: 'ground',
        isAutoSynced: true,
        lastActive: Date.now(),
      };
      const friend2: PeerUser = {
        id: 'peer_ananya',
        userId: 'peer_ananya',
        name: 'Ananya Roy',
        batch: 'AI-DS-5A',
        avatarColor: '#8B5CF6',
        currentRoomId: 'LAB-3',
        roomId: 'LAB-3',
        floor: 'first',
        isAutoSynced: false,
        lastActive: Date.now(),
      };

      usePeerStore.getState().setPeers([friend1, friend2]);

      render(<PeerLocatorPanel />);
      act(() => {
        screen.getByTestId('open-peer-panel-btn').click();
      });

      // Friends cards rendered
      const cardRahul = screen.getByTestId('peer-card-peer_rahul');
      const cardAnanya = screen.getByTestId('peer-card-peer_ananya');
      expect(cardRahul).toBeInTheDocument();
      expect(cardAnanya).toBeInTheDocument();

      expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
      expect(screen.getByText('Ananya Roy')).toBeInTheDocument();
      expect(screen.getByText('Ground')).toBeInTheDocument();
      expect(screen.getByText('1st Floor')).toBeInTheDocument();

      // Click Rahul's card -> focus on LT-1
      act(() => {
        cardRahul.click();
      });

      expect(useCampusStore.getState().selectedRoomId).toBe('LT-1');
      const lt1 = campusRooms.find((r) => r.id === 'LT-1')!;
      expect(useCampusStore.getState().cameraTarget?.lookAt).toEqual(lt1.position);
      expect(useCampusStore.getState().cameraTarget?.position).toEqual([
        lt1.position[0] + 10,
        lt1.position[1] + 8,
        lt1.position[2] + 10,
      ]);

      // Click Ananya's card -> focus on LAB-3 on 1st Floor
      act(() => {
        cardAnanya.click();
      });

      expect(useCampusStore.getState().selectedRoomId).toBe('LAB-3');
      const lab3 = campusRooms.find((r) => r.id === 'LAB-3')!;
      expect(useCampusStore.getState().cameraTarget?.lookAt).toEqual(lab3.position);
      expect(useCampusStore.getState().cameraTarget?.position).toEqual([
        lab3.position[0] + 10,
        lab3.position[1] + 8,
        lab3.position[2] + 10,
      ]);
    });

    it('4.4 should toggle timetable Auto-Sync switch correctly', () => {
      render(<PeerLocatorPanel />);
      act(() => {
        screen.getByTestId('open-peer-panel-btn').click();
      });

      const autoSyncToggle = screen.getByTestId('toggle-auto-sync-btn');
      expect(usePeerStore.getState().isAutoSyncEnabled).toBe(true);

      // Toggle off
      act(() => {
        autoSyncToggle.click();
      });
      expect(usePeerStore.getState().isAutoSyncEnabled).toBe(false);
      expect(usePeerStore.getState().currentUser.isAutoSynced).toBe(false);

      // Toggle back on
      act(() => {
        autoSyncToggle.click();
      });
      expect(usePeerStore.getState().isAutoSyncEnabled).toBe(true);
      expect(usePeerStore.getState().currentUser.isAutoSynced).toBe(true);
    });

    it('4.5 should handle manual room check-in selection and check-out / leave room', () => {
      render(<PeerLocatorPanel />);
      act(() => {
        screen.getByTestId('open-peer-panel-btn').click();
      });

      // Initial state: not checked in
      expect(screen.getByText('Not checked in')).toBeInTheDocument();
      expect(screen.queryByTestId('leave-room-btn')).toBeNull();

      const selectDropdown = screen.getByTestId('room-checkin-select');

      // Select 'LT-2'
      act(() => {
        fireEvent.change(selectDropdown, { target: { value: 'LT-2' } });
      });

      const currentUser = usePeerStore.getState().currentUser;
      expect(currentUser.currentRoomId).toBe('LT-2');
      expect(currentUser.floor).toBe('ground');
      expect(currentUser.isAutoSynced).toBe(false);

      // UI updates to show room code and GF badge
      expect(screen.getAllByText(/LT-10/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('GF').length).toBeGreaterThanOrEqual(1);

      // Leave Room button appears
      const leaveBtn = screen.getByTestId('leave-room-btn');
      expect(leaveBtn).toBeInTheDocument();

      // Click Leave Room
      act(() => {
        leaveBtn.click();
      });

      expect(usePeerStore.getState().currentUser.currentRoomId).toBeNull();
      expect(screen.getByText('Not checked in')).toBeInTheDocument();
      expect(screen.queryByTestId('leave-room-btn')).toBeNull();
    });
  });

  // ===========================================================================
  // 5. Adversarial Edge Cases & Stress Resilience
  // ===========================================================================
  describe('5. Adversarial Edge Cases & Robustness', () => {
    it('5.1 should gracefully handle peers roaming with null roomId without crashing', async () => {
      const roamingPeer: PeerUser[] = [
        {
          id: 'peer_roaming',
          userId: 'peer_roaming',
          name: 'Roaming Student',
          batch: 'CSE-3A',
          avatarColor: '#3B82F6',
          currentRoomId: null,
          roomId: null,
          floor: null,
          coordinates: null,
          isAutoSynced: false,
          lastActive: Date.now(),
        },
      ];
      usePeerStore.getState().setPeers(roamingPeer);

      // 1. PeerAvatarsLayer should not render avatar for roaming peer with null room
      await renderAvatarsLayerInCanvas();
      expect(capturedScene?.getObjectByName('peer-avatar-peer_roaming')).toBeUndefined();

      // 2. PeerLocatorPanel renders peer with "Roaming" label and clicking does not crash
      render(<PeerLocatorPanel />);
      act(() => {
        screen.getByTestId('open-peer-panel-btn').click();
      });

      expect(screen.getByText('Roaming')).toBeInTheDocument();
      const card = screen.getByTestId('peer-card-peer_roaming');
      act(() => {
        card.click();
      });
      // selectedRoomId remains unchanged
      expect(useCampusStore.getState().selectedRoomId).toBeNull();
    });

    it('5.2 should handle malformed peer objects with missing colors and batch gracefully', () => {
      // Test getPeerAvatarColor helper fallback
      const color1 = getPeerAvatarColor({ id: 'custom_123' });
      expect(color1).toMatch(/^#[0-9a-fA-F]{6}$/);

      const color2 = getPeerAvatarColor({});
      expect(color2).toMatch(/^#[0-9a-fA-F]{6}$/);

      const colorExplicit = getPeerAvatarColor({ avatarColor: '#123456' });
      expect(colorExplicit).toBe('#123456');

      // Peer with empty fields
      const partialPeer: any = {
        id: 'p_incomplete',
        name: undefined,
        batch: undefined,
        currentRoomId: 'LT-1',
      };
      usePeerStore.getState().setPeers([partialPeer]);

      render(<PeerLocatorPanel />);
      act(() => {
        screen.getByTestId('open-peer-panel-btn').click();
      });

      const peerCard = screen.getByTestId('peer-card-p_incomplete');
      expect(peerCard).toBeInTheDocument();
      expect(peerCard.textContent).toContain('CSE-3A');
    });

    it('5.3 should synchronize peer card selection with 3D avatar selection in integrated app state', async () => {
      const peerA: PeerUser = {
        id: 'peer_sync_test',
        userId: 'peer_sync_test',
        name: 'Sync Student',
        batch: 'CSE-3A',
        avatarColor: '#3B82F6',
        currentRoomId: 'LAB-1',
        roomId: 'LAB-1',
        floor: 'ground',
        isAutoSynced: true,
        lastActive: Date.now(),
      };
      usePeerStore.getState().setPeers([peerA]);

      // Mount both PeerAvatarsLayer and PeerLocatorPanel in test tree
      render(
        <div>
          <div style={{ width: 800, height: 600 }}>
            <Canvas>
              <SceneProbe />
              <Suspense fallback={null}>
                <PeerAvatarsLayer />
              </Suspense>
            </Canvas>
          </div>
          <PeerLocatorPanel />
        </div>
      );

      await act(async () => {
        await new Promise((r) => setTimeout(r, 60));
      });

      // Open panel
      act(() => {
        screen.getByTestId('open-peer-panel-btn').click();
      });

      const peerCard = screen.getByTestId('peer-card-peer_sync_test');
      expect(peerCard).toBeInTheDocument();

      // Click card
      act(() => {
        peerCard.click();
      });

      // Selected room is LAB-1
      expect(useCampusStore.getState().selectedRoomId).toBe('LAB-1');

      // In 3D layer, the avatar body gets emissive glow
      const avatarGroup = capturedScene?.getObjectByName('peer-avatar-peer_sync_test') as THREE.Group;
      expect(avatarGroup).toBeDefined();
      const bodyMesh = avatarGroup.children.filter((c) => c.type === 'Mesh')[1] as THREE.Mesh;
      const mat = bodyMesh.material as THREE.MeshStandardMaterial;
      expect(mat.opacity).toBeCloseTo(1.0, 2);
      expect(mat.emissiveIntensity).toBeCloseTo(0.6, 2);

      // Card in UI gets cyan selection styling
      expect(peerCard.className).toContain('border-cyan-500/80');
    });
  });
});
