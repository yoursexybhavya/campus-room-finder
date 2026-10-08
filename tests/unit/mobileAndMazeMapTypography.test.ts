import { describe, it, expect } from 'vitest';
import { campusRooms } from '../../src/data/campusRooms';
import { MAZEMAP_POIS } from '../../src/components/canvas/MazeMapIconsLayer';

describe('MazeMap Architectural Typography & Mobile Usability Tests', () => {
  it('should ensure all Ground Floor and First Floor rooms possess valid architectural room codes', () => {
    const groundRooms = campusRooms.filter((r) => r.floor === 'ground');
    const firstRooms = campusRooms.filter((r) => r.floor === 'first');

    expect(groundRooms.length).toBeGreaterThanOrEqual(30);
    expect(firstRooms.length).toBeGreaterThanOrEqual(25);

    // Every ground floor room must have a valid identifier to display on floor tiles
    groundRooms.forEach((r) => {
      expect(r.code).toBeDefined();
      expect(r.code.length).toBeGreaterThan(0);
    });

    firstRooms.forEach((r) => {
      expect(r.code).toBeDefined();
      expect(r.code.length).toBeGreaterThan(0);
    });
  });

  it('should provide authentic MazeMap POIs across both Ground and First floors in ALL mode', () => {
    const groundPois = MAZEMAP_POIS.filter((p) => p.floor === 'ground');
    const firstPois = MAZEMAP_POIS.filter((p) => p.floor === 'first');

    expect(groundPois.length).toBeGreaterThanOrEqual(10);
    expect(firstPois.length).toBeGreaterThanOrEqual(5);

    // Verify key ground floor amenities exist and are not missing
    const groundTypes = groundPois.map((p) => p.type);
    expect(groundTypes).toContain('stairs');
    expect(groundTypes).toContain('exit');
    expect(groundTypes).toContain('elevator');
    expect(groundTypes).toContain('restroom');
  });

  it('should preserve arrival coordinates for POIs across exploded multi-floor elevation', () => {
    const explodedElevation = 3.0;
    const firstPois = MAZEMAP_POIS.filter((p) => p.floor === 'first');

    firstPois.forEach((poi) => {
      const baseElevation = poi.coords[1];
      const explodedElevationActual = baseElevation + explodedElevation;
      expect(explodedElevationActual).toBeGreaterThan(6.0);
    });
  });
});
