import React from 'react';
import { Html } from '@react-three/drei';
import { useCampusStore } from '../../stores/useCampusStore';
import { useThemeStore } from '../../stores/useThemeStore';

export interface MazeMapPOI {
  id: string;
  type: 'stairs' | 'exit' | 'elevator' | 'restroom' | 'hc_restroom' | 'aed' | 'accessible_entrance' | 'lecture_podium' | 'bike' | 'locker';
  label: string;
  coords: [number, number, number];
  floor: 'ground' | 'first';
  subLabel?: string;
}

// Master list of authentic MazeMap POI markers positioned across JIET Jodhpur campus
export const MAZEMAP_POIS: MazeMapPOI[] = [
  // ==========================================
  // GROUND FLOOR POIs
  // ==========================================
  // Rotunda Stairs & Emergency Egress (Green)
  { id: 'poi_stairs_ne_g', type: 'stairs', label: '150A', subLabel: 'Trapp', coords: [16, 1.3, -16], floor: 'ground' },
  { id: 'poi_stairs_nw_g', type: 'stairs', label: '150B', subLabel: 'Trapp', coords: [-16, 1.3, -16], floor: 'ground' },
  { id: 'poi_stairs_sw_g', type: 'stairs', label: '150C', subLabel: 'Trapp', coords: [-16, 1.3, 16], floor: 'ground' },
  { id: 'poi_stairs_se_g', type: 'stairs', label: '150D', subLabel: 'Trapp', coords: [16, 1.3, 16], floor: 'ground' },
  { id: 'poi_exit_south', type: 'exit', label: 'Utgang', subLabel: 'Main Exit', coords: [0, 0.4, 37], floor: 'ground' },
  { id: 'poi_hc_entrance_south', type: 'accessible_entrance', label: 'HC-inngang', subLabel: 'Ramp', coords: [-6, 0.4, 33], floor: 'ground' },
  { id: 'poi_hc_entrance_north', type: 'accessible_entrance', label: 'HC-inngang', subLabel: 'North Culvert', coords: [0, 0.4, -32], floor: 'ground' },

  // Elevators / Lifts (Green Heis)
  { id: 'poi_lift_east_g', type: 'elevator', label: 'Heis', subLabel: 'Lift 1', coords: [14.2, 1.3, 4], floor: 'ground' },
  { id: 'poi_lift_west_g', type: 'elevator', label: 'Heis', subLabel: 'Lift 2', coords: [-14.2, 1.3, 4], floor: 'ground' },

  // Restrooms / Sanitary Facilities (Blue WC)
  { id: 'poi_wc_east_g', type: 'restroom', label: 'WC', subLabel: 'Herre/Dame', coords: [20, 1.3, -24.5], floor: 'ground' },
  { id: 'poi_wc_west_g', type: 'restroom', label: 'WC', subLabel: 'Herre/Dame', coords: [-20, 1.3, -24.5], floor: 'ground' },
  { id: 'poi_hc_wc_south_g', type: 'hc_restroom', label: 'HC WC', subLabel: 'Universell', coords: [8, 1.3, 21], floor: 'ground' },

  // First Aid / AED (Red Hjertestarter)
  { id: 'poi_aed_foyer', type: 'aed', label: 'Hjertestarter', subLabel: 'Defibrillator', coords: [0, 1.3, 22], floor: 'ground' },

  // Amenities (Bicycle & Package Lockers)
  { id: 'poi_bike_south', type: 'bike', label: 'Sykkelstap', subLabel: 'Bike Hub', coords: [26, 0.2, 38], floor: 'ground' },
  { id: 'poi_locker_foyer', type: 'locker', label: 'Pakkeskap', subLabel: 'Lockers', coords: [-7, 1.3, 22], floor: 'ground' },

  // Lecture Theater Seating & Podiums
  { id: 'poi_s1_ground', type: 'lecture_podium', label: 'S1', subLabel: 'Auditorium', coords: [20, 1.3, 0], floor: 'ground' },
  { id: 'poi_s3_ground', type: 'lecture_podium', label: 'S3', subLabel: 'Seminar 1', coords: [12, 1.3, -20], floor: 'ground' },

  // ==========================================
  // FIRST FLOOR POIs
  // ==========================================
  // Rotunda Stairs (Upper landings)
  { id: 'poi_stairs_ne_1f', type: 'stairs', label: '150A', subLabel: 'Trapp 1F', coords: [16, 4.0, -16], floor: 'first' },
  { id: 'poi_stairs_nw_1f', type: 'stairs', label: '150B', subLabel: 'Trapp 1F', coords: [-16, 4.0, -16], floor: 'first' },
  { id: 'poi_stairs_sw_1f', type: 'stairs', label: '150C', subLabel: 'Trapp 1F', coords: [-16, 4.0, 16], floor: 'first' },
  { id: 'poi_stairs_se_1f', type: 'stairs', label: '150D', subLabel: 'Trapp 1F', coords: [16, 4.0, 16], floor: 'first' },

  // Elevators (Upper level)
  { id: 'poi_lift_east_1f', type: 'elevator', label: 'Heis', subLabel: 'Lift 1', coords: [14.2, 4.0, 4], floor: 'first' },
  { id: 'poi_lift_west_1f', type: 'elevator', label: 'Heis', subLabel: 'Lift 2', coords: [-14.2, 4.0, 4], floor: 'first' },

  // Restrooms First Floor
  { id: 'poi_wc_east_1f', type: 'restroom', label: 'WC', subLabel: 'East 1F', coords: [20, 4.0, -24.5], floor: 'first' },
  { id: 'poi_wc_west_1f', type: 'restroom', label: 'WC', subLabel: 'West 1F', coords: [-20, 4.0, -24.5], floor: 'first' },
  { id: 'poi_wc_north_1f', type: 'restroom', label: 'WC', subLabel: 'North 1F', coords: [-12.5, 4.0, -18.5], floor: 'first' },
  { id: 'poi_hc_wc_south_1f', type: 'hc_restroom', label: 'HC WC', subLabel: 'South 1F', coords: [-12.5, 4.0, 21], floor: 'first' },

  // Upper Lecture Theaters
  { id: 'poi_s2_upper', type: 'lecture_podium', label: 'S2', subLabel: 'LT-24', coords: [20, 4.0, 7], floor: 'first' },
  { id: 'poi_s4_upper', type: 'lecture_podium', label: 'S4', subLabel: 'Audi 1F', coords: [-6.5, 4.0, 21], floor: 'first' },
];

export const MazeMapIconsLayer: React.FC = () => {
  const activeFloorFilter = useCampusStore((state) => state.activeFloorFilter);
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  const isAllMode = activeFloorFilter === 'all';
  const explodedElevation = isAllMode ? 7.5 : 0;

  // Filter POIs according to active floor
  const visiblePois = MAZEMAP_POIS.filter((poi) => {
    if (activeFloorFilter === 'ground') return poi.floor === 'ground';
    if (activeFloorFilter === 'first') return poi.floor === 'first';
    return true; // 'all' mode shows both floors
  });

  return (
    <group name="mazemap-poi-icons-layer">
      {visiblePois.map((poi) => {
        const [x, y, z] = poi.coords;
        // In all floors exploded mode, first floor POIs are elevated by +7.5m
        const actualY = poi.floor === 'first' && isAllMode ? y + explodedElevation : y;

        return (
          <group key={poi.id} position={[x, actualY, z]}>
            <Html
              center
              distanceFactor={32}
              zIndexRange={[60, 10]}
              className="pointer-events-auto select-none cursor-pointer"
            >
              <div
                className="flex flex-col items-center group transition-transform duration-200 hover:scale-125"
                title={`${poi.label} (${poi.subLabel || ''})`}
              >
                {/* Authentic MazeMap Icon Badges */}
                {poi.type === 'stairs' && (
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-sm bg-emerald-600/90 text-white flex items-center justify-center shadow-md border border-white/80 dark:border-slate-800">
                      {/* Stairs icon with walking person */}
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                        <path d="M19 3H16V7H12V11H8V15H4V21H21V3H19ZM19 19H6V17H10V13H14V9H18V5H19V19Z" />
                      </svg>
                    </div>
                    <span className="mt-0.5 px-1 py-0.2 rounded bg-white/90 dark:bg-slate-900/90 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-[8.5px] shadow-sm leading-tight border border-emerald-200 dark:border-emerald-800">
                      {poi.label}
                    </span>
                  </div>
                )}

                {poi.type === 'exit' && (
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-sm bg-emerald-600 text-white flex items-center justify-center shadow-md border border-white/80 dark:border-slate-800">
                      {/* Running Exit figure */}
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8.5 14h-2v-4h2v4zm0-6h-2V7h2v4zm5 6h-3V7h3v10z" />
                      </svg>
                    </div>
                    <span className="mt-0.5 px-1 py-0.2 rounded bg-white/90 dark:bg-slate-900/90 text-emerald-800 dark:text-emerald-300 font-sans font-semibold text-[8px] shadow-sm leading-tight border border-emerald-200 dark:border-emerald-800">
                      {poi.label}
                    </span>
                  </div>
                )}

                {poi.type === 'elevator' && (
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-sm bg-emerald-700 text-white flex items-center justify-center shadow-md border border-white/80 dark:border-slate-800">
                      {/* Heis / Lift icon with cabin & arrows */}
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                        <path d="M7 2h10c1.1 0 2 .9 2 2v16c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zm1 4v12h8V6H8zm2 3h4v1.5h-4V9zm0 3.5h4V14h-4v-1.5z" />
                      </svg>
                    </div>
                    <span className="mt-0.5 px-1 py-0.2 rounded bg-white/90 dark:bg-slate-900/90 text-emerald-900 dark:text-emerald-200 font-sans font-bold text-[8px] shadow-sm leading-tight border border-emerald-200 dark:border-emerald-800">
                      {poi.label}
                    </span>
                  </div>
                )}

                {poi.type === 'restroom' && (
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-sm bg-sky-600 text-white flex items-center justify-center shadow-md border border-white/80 dark:border-slate-800">
                      {/* Restroom WC icon */}
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                        <path d="M9 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm6 0c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-8.5 7h5v5h-1.5v6H8v-6H6.5V9zm6 0h5l1.5 5h-1.5v6H16v-6h-1.5l1.5-5z" />
                      </svg>
                    </div>
                    <span className="mt-0.5 px-1 py-0.2 rounded bg-white/90 dark:bg-slate-900/90 text-sky-800 dark:text-sky-300 font-mono font-bold text-[8px] shadow-sm leading-tight border border-sky-200 dark:border-sky-800">
                      {poi.label}
                    </span>
                  </div>
                )}

                {poi.type === 'hc_restroom' && (
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-sm bg-sky-600 text-white flex items-center justify-center shadow-md border border-white/80 dark:border-slate-800">
                      {/* Wheelchair accessible HC WC */}
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                        <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm4.5 10.5c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zM19 13v-2h-3.2l-.7-2.3C14.7 7.6 13.6 7 12.3 7H9v2h3.3l.5 1.8c-1.7.5-3 2-3 3.9 0 2.2 1.8 4 4 4 1.8 0 3.3-1.2 3.8-2.8l2.4.1V18h2v-5h-3z" />
                      </svg>
                    </div>
                    <span className="mt-0.5 px-1 py-0.2 rounded bg-white/90 dark:bg-slate-900/90 text-sky-800 dark:text-sky-300 font-mono font-bold text-[8px] shadow-sm leading-tight border border-sky-200 dark:border-sky-800">
                      {poi.label}
                    </span>
                  </div>
                )}

                {poi.type === 'accessible_entrance' && (
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-sm bg-teal-600 text-white flex items-center justify-center shadow-md border border-white/80 dark:border-slate-800">
                      {/* Wheelchair accessible Entrance */}
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                        <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm4.5 10.5c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zM19 13v-2h-3.2l-.7-2.3C14.7 7.6 13.6 7 12.3 7H9v2h3.3l.5 1.8c-1.7.5-3 2-3 3.9 0 2.2 1.8 4 4 4 1.8 0 3.3-1.2 3.8-2.8l2.4.1V18h2v-5h-3z" />
                      </svg>
                    </div>
                    <span className="mt-0.5 px-1 py-0.2 rounded bg-white/90 dark:bg-slate-900/90 text-teal-800 dark:text-teal-300 font-sans font-semibold text-[7.5px] shadow-sm leading-tight border border-teal-200 dark:border-teal-800">
                      {poi.label}
                    </span>
                  </div>
                )}

                {poi.type === 'aed' && (
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-sm bg-rose-600 text-white flex items-center justify-center shadow-md border border-white/80 dark:border-slate-800">
                      {/* Heart Pulse Hjertestarter */}
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </div>
                    <span className="mt-0.5 px-1 py-0.2 rounded bg-white/90 dark:bg-slate-900/90 text-rose-800 dark:text-rose-300 font-sans font-bold text-[7.5px] shadow-sm leading-tight border border-rose-200 dark:border-rose-800">
                      {poi.label}
                    </span>
                  </div>
                )}

                {poi.type === 'lecture_podium' && (
                  <div className="flex flex-col items-center">
                    <div className="w-4.5 h-4.5 rounded bg-slate-700/80 text-white flex items-center justify-center shadow-sm border border-white/60">
                      {/* Podium / Seating chairs icon */}
                      <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
                        <path d="M4 18v3h3v-3h10v3h3v-3h1v-5H3v5h1zm15-7V5c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v6h14z" />
                      </svg>
                    </div>
                    <span className="mt-0.5 px-1 py-0.2 rounded bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 font-mono font-bold text-[8.5px] shadow-sm leading-tight">
                      {poi.label}
                    </span>
                  </div>
                )}

                {poi.type === 'bike' && (
                  <div className="flex flex-col items-center">
                    <div className="w-4.5 h-4.5 rounded-full bg-slate-600 text-white flex items-center justify-center shadow-sm">
                      {/* Bike */}
                      <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
                        <path d="M5 20.5A3.5 3.5 0 0 1 1.5 17 3.5 3.5 0 0 1 5 13.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m14 0a3.5 3.5 0 0 1-3.5-3.5 3.5 3.5 0 0 1 3.5-3.5 3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5M6 10h3l1.5 3H16v-2h-4.3l-1-2H13V7H9.2l-.7-1.4A1.5 1.5 0 0 0 7.1 4.5H4v2h2.2l1.6 3.5H6z" />
                      </svg>
                    </div>
                    <span className="mt-0.5 px-1 py-0.2 rounded bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 font-sans font-medium text-[7px]">
                      {poi.label}
                    </span>
                  </div>
                )}

                {poi.type === 'locker' && (
                  <div className="flex flex-col items-center">
                    <div className="w-4.5 h-4.5 rounded bg-slate-600 text-white flex items-center justify-center shadow-sm">
                      {/* Box / Locker */}
                      <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm6 12H6v-1.4c0-2 4-3.1 6-3.1s6 1.1 6 3.1V18z" />
                      </svg>
                    </div>
                    <span className="mt-0.5 px-1 py-0.2 rounded bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 font-sans font-medium text-[7px]">
                      {poi.label}
                    </span>
                  </div>
                )}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
};
