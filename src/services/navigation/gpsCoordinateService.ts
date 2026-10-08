/**
 * JIET Jodhpur - Real-World WGS84 GPS Telemetry & 3D Coordinate Projection Service
 * Derived from 49 photo EXIF GPS captures across campus (IMG_3024.heic to IMG_3072.heic)
 */

import { useState, useEffect, useCallback } from 'react';

// Official Reference Origin: JIET Jodhpur Mogra Quadrangle Corner Rotunda
export const CAMPUS_GPS_ORIGIN = {
  latitude: 26.149286,
  longitude: 73.047455,
  altitude: 201.5, // Meters above sea level
  name: 'JIET Main Quadrangle (Mogra, Jodhpur)',
};

// Equirectangular Projection Constants at Latitude 26.15° N
const METERS_PER_LAT_DEG = 111320.0;
const METERS_PER_LON_DEG = 111320.0 * Math.cos((CAMPUS_GPS_ORIGIN.latitude * Math.PI) / 180.0);

/**
 * Projects real-world WGS84 GPS (lat, lon) to 3D campus twin coordinates [x, y, z] in meters.
 * - +X: East
 * - -X: West
 * - -Z: North
 * - +Z: South
 */
export function gpsToSceneCoordinates(
  latitude: number,
  longitude: number,
  altitude?: number
): [number, number, number] {
  const dLon = longitude - CAMPUS_GPS_ORIGIN.longitude;
  const dLat = latitude - CAMPUS_GPS_ORIGIN.latitude;

  const x = dLon * METERS_PER_LON_DEG;
  const z = -dLat * METERS_PER_LAT_DEG;

  // Ground level y = 0.25m, or floor height estimate from altitude
  let y = 0.25;
  if (altitude !== undefined) {
    const deltaAlt = altitude - CAMPUS_GPS_ORIGIN.altitude;
    if (deltaAlt > 2.5) {
      y = 3.6; // First floor elevation
    }
  }

  return [Number(x.toFixed(2)), y, Number(z.toFixed(2))];
}

/**
 * Converts 3D scene coordinates [x, z] back into real-world WGS84 GPS latitude and longitude.
 */
export function sceneToGpsCoordinates(
  x: number,
  z: number
): { latitude: number; longitude: number } {
  const dLon = x / METERS_PER_LON_DEG;
  const dLat = -z / METERS_PER_LAT_DEG;

  return {
    latitude: Number((CAMPUS_GPS_ORIGIN.latitude + dLat).toFixed(6)),
    longitude: Number((CAMPUS_GPS_ORIGIN.longitude + dLon).toFixed(6)),
  };
}

/**
 * Validates whether GPS coordinates fall within the JIET Jodhpur campus perimeter (radius ~ 350m).
 */
export function isWithinCampusBounds(latitude: number, longitude: number): boolean {
  const [x, , z] = gpsToSceneCoordinates(latitude, longitude);
  const dist = Math.hypot(x, z);
  return dist <= 350.0;
}

export interface GeolocationState {
  coords: [number, number, number] | null;
  gpsRaw: { latitude: number; longitude: number } | null;
  accuracy: number | null;
  isTracking: boolean;
  error: string | null;
  isInsideCampus: boolean;
  startTracking: () => void;
  stopTracking: () => void;
}

/**
 * React Hook for Real-Time HTML5 Device Geolocation Tracking
 */
export function useLiveGeolocation(): GeolocationState {
  const [coords, setCoords] = useState<[number, number, number] | null>(null);
  const [gpsRaw, setGpsRaw] = useState<{ latitude: number; longitude: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isInsideCampus, setIsInsideCampus] = useState<boolean>(true);

  const startTracking = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setIsTracking(true);
    setError(null);
  }, []);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  useEffect(() => {
    if (!isTracking || typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, altitude, accuracy: acc } = pos.coords;
        const sceneCoords = gpsToSceneCoordinates(latitude, longitude, altitude ?? undefined);
        const inside = isWithinCampusBounds(latitude, longitude);

        setGpsRaw({ latitude, longitude });
        setCoords(sceneCoords);
        setAccuracy(acc);
        setIsInsideCampus(inside);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isTracking]);

  return {
    coords,
    gpsRaw,
    accuracy,
    isTracking,
    error,
    isInsideCampus,
    startTracking,
    stopTracking,
  };
}
