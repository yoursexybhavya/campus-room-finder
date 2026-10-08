import { describe, it, expect } from 'vitest';
import { MAZEMAP_POIS, MazeMapPOI } from '../../src/components/canvas/MazeMapIconsLayer';

describe('MazeMap POI Iconography System Tests', () => {
  it('should define a comprehensive list of authentic MazeMap POIs', () => {
    expect(MAZEMAP_POIS.length).toBeGreaterThanOrEqual(15);
  });

  it('should include all standard MazeMap amenity and safety icon types', () => {
    const types = new Set(MAZEMAP_POIS.map((poi) => poi.type));
    expect(types.has('stairs')).toBe(true);
    expect(types.has('exit')).toBe(true);
    expect(types.has('elevator')).toBe(true);
    expect(types.has('restroom')).toBe(true);
    expect(types.has('hc_restroom')).toBe(true);
    expect(types.has('aed')).toBe(true);
    expect(types.has('accessible_entrance')).toBe(true);
    expect(types.has('lecture_podium')).toBe(true);
  });

  it('should place POIs within realistic campus bounds on Ground and First floors', () => {
    for (const poi of MAZEMAP_POIS) {
      const [x, y, z] = poi.coords;
      // Campus bounds: x within [-30, 30], z within [-40, 40]
      expect(x).toBeGreaterThanOrEqual(-30);
      expect(x).toBeLessThanOrEqual(30);
      expect(z).toBeGreaterThanOrEqual(-40);
      expect(z).toBeLessThanOrEqual(40);

      if (poi.floor === 'ground') {
        expect(y).toBeLessThanOrEqual(2.0);
      } else {
        expect(y).toBeGreaterThanOrEqual(3.0);
      }
    }
  });

  it('should have unique IDs and non-empty labels for all POIs', () => {
    const ids = new Set<string>();
    for (const poi of MAZEMAP_POIS) {
      expect(ids.has(poi.id)).toBe(false);
      ids.add(poi.id);
      expect(poi.label.length).toBeGreaterThan(0);
    }
  });

  it('should cover all 4 corner rotunda stairs on both floors (150A, 150B, 150C, 150D)', () => {
    const stairLabels = MAZEMAP_POIS.filter((p) => p.type === 'stairs').map((p) => p.label);
    expect(stairLabels).toContain('150A');
    expect(stairLabels).toContain('150B');
    expect(stairLabels).toContain('150C');
    expect(stairLabels).toContain('150D');
  });
});
