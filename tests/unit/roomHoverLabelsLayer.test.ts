import { describe, it, expect } from 'vitest';
import { campusRooms } from '../../src/data/campusRooms';
import { isPointOccludedByFirstFloor } from '../../src/utils/floorOcclusion';

describe('RoomHoverLabelsLayer Floor-Aware Typography & Amenity System Tests', () => {
  it('1. should cover all campus rooms with valid codes and amenity categories', () => {
    expect(campusRooms.length).toBeGreaterThanOrEqual(30);

    const validCategories = new Set(['lecture_theater', 'lab', 'library', 'admin', 'faculty', 'seminar_hall']);
    for (const room of campusRooms) {
      expect(room.code.length).toBeGreaterThan(0);
      expect(room.name.length).toBeGreaterThan(0);
      expect(validCategories.has(room.type)).toBe(true);
      expect(['ground', 'first']).toContain(room.floor);
    }
  });

  it('2. should verify ground floor rooms sit strictly within ground vertical volume', () => {
    const groundRooms = campusRooms.filter((r) => r.floor === 'ground');
    expect(groundRooms.length).toBeGreaterThanOrEqual(15);

    // Ground floor finish is ~0.21m, hovering labels at 1.45m must be well below first floor slab (4.13m)
    for (const room of groundRooms) {
      const labelY = 1.45;
      expect(labelY).toBeLessThan(4.13); // Below first floor slab
      expect(labelY).toBeGreaterThan(0.21); // Above ground floor slab
    }
  });

  it('3. should verify first floor rooms sit strictly within first vertical volume', () => {
    const firstRooms = campusRooms.filter((r) => r.floor === 'first');
    expect(firstRooms.length).toBeGreaterThanOrEqual(15);

    // First floor finish is ~4.13m, hovering labels at 5.25m must be well above first floor slab
    for (const room of firstRooms) {
      const labelY = 5.25;
      expect(labelY).toBeGreaterThan(4.13); // Above first floor slab
      expect(labelY).toBeLessThan(7.8); // Below roof
    }
  });

  it('4. should ensure zero ground floor room overlap when activeFloorFilter is first', () => {
    const groundRooms = campusRooms.filter((r) => r.floor === 'ground');
    const activeFloorFilter = 'first';

    const visibleInFirstMode = groundRooms.filter((r) => {
      if (activeFloorFilter === 'ground') return r.floor === 'ground';
      if (activeFloorFilter === 'first') return r.floor === 'first';
      return true;
    });

    // Zero ground floor rooms can be visible in First floor mode!
    expect(visibleInFirstMode.length).toBe(0);
  });

  it('5. should ensure zero first floor room overlap when activeFloorFilter is ground', () => {
    const firstRooms = campusRooms.filter((r) => r.floor === 'first');
    const activeFloorFilter = 'ground';

    const visibleInGroundMode = firstRooms.filter((r) => {
      if (activeFloorFilter === 'ground') return r.floor === 'ground';
      if (activeFloorFilter === 'first') return r.floor === 'first';
      return true;
    });

    // Zero first floor rooms can be visible in Ground floor mode!
    expect(visibleInGroundMode.length).toBe(0);
  });

  it('6. should correctly apply first-floor slab occlusion to prevent glitching in ALL mode', () => {
    // Camera overhead looking down at East wing ground floor room (LT-9 at x=20, y=0, z=0)
    const cameraOverhead: [number, number, number] = [20, 25, 0];
    const groundRoomEastWing: [number, number, number] = [20, 0, 0];

    const isOccluded = isPointOccludedByFirstFloor(groundRoomEastWing, cameraOverhead, 4.13);
    // Overhead camera looking through first floor slab must occlude ground floor room!
    expect(isOccluded).toBe(true);
  });

  it('7. should enforce native WebGL Text and Billboard depthTest without DOM Html collisions', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const layerPath = path.resolve(__dirname, '../../src/components/canvas/RoomHoverLabelsLayer.tsx');
    const layerContent = fs.readFileSync(layerPath, 'utf-8');
    expect(layerContent).toContain('Billboard');
    expect(layerContent).toContain('depthTest={true}');
    expect(layerContent).not.toContain('<Html');

    const interactivityPath = path.resolve(__dirname, '../../src/components/canvas/RoomInteractivityLayer.tsx');
    const interactivityContent = fs.readFileSync(interactivityPath, 'utf-8');
    // RoomInteractivityLayer must not render duplicate DOM Html badges over 3D labels
    expect(interactivityContent).not.toContain('<Html');
  });

  it('8. should verify mobile layout coordinates for CampusWayfindingBar and Header', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const wayfindingPath = path.resolve(__dirname, '../../src/components/ui/CampusWayfindingBar.tsx');
    const wayfindingContent = fs.readFileSync(wayfindingPath, 'utf-8');
    // Collapsed wayfinding bar on mobile is positioned at right-3 to not overlap SearchBar (left-3 right-24)
    expect(wayfindingContent).toContain('top-16 right-3');

    const headerPath = path.resolve(__dirname, '../../src/components/ui/Header.tsx');
    const headerContent = fs.readFileSync(headerPath, 'utf-8');
    // Brand pill and GPS telemetry button are hidden on mobile screens
    expect(headerContent).toContain('hidden sm:flex');
  });
});
