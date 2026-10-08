import { describe, it, expect } from 'vitest';
import {
  CAMPUS_GPS_ORIGIN,
  gpsToSceneCoordinates,
  sceneToGpsCoordinates,
  isWithinCampusBounds,
} from '../../src/services/navigation/gpsCoordinateService';

describe('GPS Coordinate Telemetry Service (JIET Jodhpur)', () => {
  it('should map origin GPS coordinates directly to [0, 0.25, 0]', () => {
    const [x, y, z] = gpsToSceneCoordinates(
      CAMPUS_GPS_ORIGIN.latitude,
      CAMPUS_GPS_ORIGIN.longitude
    );
    expect(x).toBeCloseTo(0, 1);
    expect(z).toBeCloseTo(0, 1);
    expect(y).toBe(0.25);
  });

  it('should correctly project photo EXIF locations onto campus scene', () => {
    // IMG_3047 (Courtyard Lawn): lat=26.149352, lon=73.047080
    const [x1, , z1] = gpsToSceneCoordinates(26.149352, 73.04708);
    expect(x1).toBeLessThan(0); // West of origin
    expect(Math.abs(x1)).toBeLessThan(60); // Inside quadrangle width

    // IMG_3024 (South Entrance Gate): lat=26.148513, lon=73.047538
    const [, , z2] = gpsToSceneCoordinates(26.148513, 73.047538);
    expect(z2).toBeGreaterThan(50); // South of origin
  });

  it('should convert bidirectional scene coords back to GPS accurately', () => {
    const originalLat = 26.1491;
    const originalLon = 73.0472;

    const [x, , z] = gpsToSceneCoordinates(originalLat, originalLon);
    const roundTrip = sceneToGpsCoordinates(x, z);

    expect(roundTrip.latitude).toBeCloseTo(originalLat, 4);
    expect(roundTrip.longitude).toBeCloseTo(originalLon, 4);
  });

  it('should correctly classify coordinates inside vs outside campus boundary', () => {
    expect(isWithinCampusBounds(26.149286, 73.047455)).toBe(true);
    expect(isWithinCampusBounds(26.1485, 73.0475)).toBe(true);

    // Far away coordinate (Delhi: lat=28.6139, lon=77.2090)
    expect(isWithinCampusBounds(28.6139, 77.209)).toBe(false);
  });
});
