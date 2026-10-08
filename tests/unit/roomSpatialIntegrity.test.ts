import { describe, it, expect } from 'vitest';
import { campusRooms } from '../../src/data/campusRooms';

describe('Room Spatial Integrity & Zero-Overlap Invariant', () => {
  it('should have all 61 rooms present in inventory', () => {
    expect(campusRooms.length).toBe(61);
  });

  it('should guarantee zero 3D bounding box overlaps between any rooms on the same floor', () => {
    const overlaps: string[] = [];

    for (let i = 0; i < campusRooms.length; i++) {
      for (let j = i + 1; j < campusRooms.length; j++) {
        const a = campusRooms[i];
        const b = campusRooms[j];
        if (a.floor !== b.floor) continue;

        const [ax, , az] = a.position;
        const [aw, , ad] = a.dimensions;
        const aMinX = ax - aw / 2;
        const aMaxX = ax + aw / 2;
        const aMinZ = az - ad / 2;
        const aMaxZ = az + ad / 2;

        const [bx, , bz] = b.position;
        const [bw, , bd] = b.dimensions;
        const bMinX = bx - bw / 2;
        const bMaxX = bx + bw / 2;
        const bMinZ = bz - bd / 2;
        const bMaxZ = bz + bd / 2;

        const overlapX = Math.max(0, Math.min(aMaxX, bMaxX) - Math.max(aMinX, bMinX));
        const overlapZ = Math.max(0, Math.min(aMaxZ, bMaxZ) - Math.max(aMinZ, bMinZ));

        // Allow up to 0.05m tolerance for abutting walls, but no interior volumetric overlap
        if (overlapX > 0.05 && overlapZ > 0.05) {
          overlaps.push(
            `Floor ${a.floor}: ${a.code} (${a.id}) overlaps with ${b.code} (${b.id}) by ${overlapX.toFixed(2)}m x ${overlapZ.toFixed(2)}m`
          );
        }
      }
    }

    expect(overlaps).toEqual([]);
  });

  it('should have valid non-empty room codes, names, and categories', () => {
    campusRooms.forEach((room) => {
      expect(room.code.trim().length).toBeGreaterThan(0);
      expect(room.name.trim().length).toBeGreaterThan(0);
      expect(room.doorWaypointId.startsWith('wp_')).toBe(true);
      expect(['ground', 'first']).toContain(room.floor);
      expect(['East', 'West', 'North', 'South']).toContain(room.wing);
    });
  });
});
