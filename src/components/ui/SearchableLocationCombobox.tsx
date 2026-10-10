import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, MapPin, ChevronDown, ChevronUp, X, Check, Building2, Book, Landmark } from 'lucide-react';
import { campusRooms } from '../../data/campusRooms';
import { CampusRoom } from '../../types/campus';

export interface LocationItem {
  id: string;
  code: string;
  name: string;
  subtext: string;
  floor: 'ground' | 'first';
  wing?: string;
  category: 'landmark' | 'ground' | 'first';
  color?: string;
  inChargeFaculty?: string;
}

export const CAMPUS_LANDMARKS: LocationItem[] = [
  {
    id: 'gate',
    code: 'GATE',
    name: 'Main Entrance Gate',
    subtext: 'South Campus Security Checkpoint',
    floor: 'ground',
    wing: 'South',
    category: 'landmark',
    color: '#38bdf8',
  },
  {
    id: 'courtyard_center',
    code: 'COURTYARD',
    name: 'Courtyard Lawn Plaza',
    subtext: 'Central Quadrangle Crossroads',
    floor: 'ground',
    wing: 'Central',
    category: 'landmark',
    color: '#34d399',
  },
  {
    id: 'wp_admin',
    code: 'ADMIN',
    name: 'Administrative Block',
    subtext: 'Dean Office, Secretariat & Conf Hall',
    floor: 'ground',
    wing: 'South',
    category: 'landmark',
    color: '#fbbf24',
  },
  {
    id: 'wp_lib_main',
    code: 'LIBRARY',
    name: 'Central Knowledge Library',
    subtext: 'Academic Reference & Reading Veranda',
    floor: 'ground',
    wing: 'North',
    category: 'landmark',
    color: '#a855f7',
  },
];

export function getAllCampusLocations(): LocationItem[] {
  const roomItems: LocationItem[] = campusRooms.map((r: CampusRoom) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    subtext: `${r.building} • ${r.wing || 'Main'} Wing${r.inChargeFaculty ? ` • ${r.inChargeFaculty}` : ''}`,
    floor: r.floor,
    wing: r.wing || 'Main',
    category: r.floor === 'ground' ? 'ground' : 'first',
    color: r.color,
    inChargeFaculty: r.inChargeFaculty,
  }));

  return [...CAMPUS_LANDMARKS, ...roomItems];
}

interface SearchableLocationComboboxProps {
  id?: string;
  label?: string;
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
  excludeId?: string | null;
  accentColor?: 'sky' | 'rose' | 'cyan';
  isDark: boolean;
  testIdPrefix?: string;
}

export const SearchableLocationCombobox: React.FC<SearchableLocationComboboxProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder = 'Search room, lab, or gate (e.g. LT, Idea, Chem)...',
  excludeId,
  accentColor = 'cyan',
  isDark,
  testIdPrefix = 'combobox',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allLocations = useMemo(() => getAllCampusLocations(), []);

  // Selected item object
  const selectedLocation = useMemo(() => {
    if (!value) return null;
    return allLocations.find((loc) => loc.id === value) || null;
  }, [value, allLocations]);

  // Filtered list based on search query
  const filteredLocations = useMemo(() => {
    let list = allLocations;
    if (excludeId) {
      list = list.filter((loc) => loc.id !== excludeId);
    }

    if (!searchQuery.trim()) {
      return list;
    }

    const q = searchQuery.toLowerCase().trim();
    // Support stripping hyphens and spaces for fuzzy searching e.g. "lt9" or "lt 9" -> "lt-9"
    const qClean = q.replace(/[\s-_]/g, '');

    return list.filter((loc) => {
      const codeClean = loc.code.toLowerCase().replace(/[\s-_]/g, '');
      const idClean = loc.id.toLowerCase().replace(/[\s-_]/g, '');
      const name = loc.name.toLowerCase();
      const wing = (loc.wing || '').toLowerCase();
      const faculty = (loc.inChargeFaculty || '').toLowerCase();

      return (
        codeClean.includes(qClean) ||
        idClean.includes(qClean) ||
        name.includes(q) ||
        wing.includes(q) ||
        faculty.includes(q) ||
        loc.subtext.toLowerCase().includes(q)
      );
    });
  }, [allLocations, searchQuery, excludeId]);

  // Group filtered locations by category
  const groupedLocations = useMemo(() => {
    const landmarks = filteredLocations.filter((l) => l.category === 'landmark');
    const groundFloor = filteredLocations.filter((l) => l.category === 'ground');
    const firstFloor = filteredLocations.filter((l) => l.category === 'first');

    return { landmarks, groundFloor, firstFloor };
  }, [filteredLocations]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: LocationItem) => {
    onChange(item.id);
    setSearchQuery('');
    setIsOpen(false);
  };

  const borderFocusClass =
    accentColor === 'sky'
      ? 'focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20'
      : accentColor === 'rose'
      ? 'focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20'
      : 'focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20';

  const accentBadgeClass =
    accentColor === 'sky'
      ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
      : accentColor === 'rose'
      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
      : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';

  return (
    <div ref={containerRef} className="relative w-full text-left" data-testid={`${testIdPrefix}-container`}>
      {/* Search & Selection Trigger Input */}
      <div
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs transition-all ${borderFocusClass} ${
          isDark
            ? 'bg-slate-950/90 border-slate-700/80 text-white shadow-inner'
            : 'bg-slate-50 border-slate-200 text-slate-900 shadow-inner'
        }`}
      >
        <MapPin
          className={`w-3.5 h-3.5 shrink-0 ${
            accentColor === 'sky'
              ? 'text-sky-400'
              : accentColor === 'rose'
              ? 'text-rose-400'
              : 'text-cyan-400'
          }`}
        />

        <input
          id={id}
          ref={inputRef}
          type="text"
          value={isOpen ? searchQuery : selectedLocation ? `${selectedLocation.code}: ${selectedLocation.name}` : ''}
          placeholder={placeholder}
          onFocus={() => {
            setIsOpen(true);
            setSearchQuery('');
          }}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          data-testid={`${testIdPrefix}-input`}
          className={`w-full bg-transparent text-xs font-semibold placeholder-slate-400 focus:outline-none truncate ${
            isDark ? 'text-slate-100' : 'text-slate-900'
          }`}
        />

        {searchQuery ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSearchQuery('');
              if (inputRef.current) inputRef.current.focus();
            }}
            className="p-0.5 rounded text-slate-400 hover:text-white transition-colors"
            title="Clear search query"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen && inputRef.current) {
              inputRef.current.focus();
            }
          }}
          data-testid={`${testIdPrefix}-dropdown-toggle`}
          className="p-0.5 text-slate-400 hover:text-slate-200 transition-colors"
          title={isOpen ? 'Close suggestions' : 'Browse all campus rooms'}
        >
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Floating Suggestions Combobox Dropdown */}
      {isOpen && (
        <div
          data-testid={`${testIdPrefix}-dropdown`}
          className={`absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border shadow-2xl max-h-64 sm:max-h-72 overflow-y-auto divide-y animate-in fade-in zoom-in-95 duration-150 ${
            isDark
              ? 'bg-slate-900/98 backdrop-blur-2xl border-slate-700 text-slate-100 divide-slate-800 shadow-black/80'
              : 'bg-white/98 backdrop-blur-2xl border-slate-200 text-slate-900 divide-slate-100 shadow-slate-300/60'
          }`}
        >
          {filteredLocations.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No campus rooms or gates found matching &quot;{searchQuery}&quot;
            </div>
          ) : (
            <>
              {/* CATEGORY 1: Campus Landmarks & Gates */}
              {groupedLocations.landmarks.length > 0 && (
                <div className="p-1.5">
                  <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Landmark className="w-3 h-3 text-sky-400" />
                      <span>Landmarks & Gates</span>
                    </span>
                    <span className="font-mono text-[9px]">{groupedLocations.landmarks.length} hubs</span>
                  </div>

                  <div className="space-y-0.5 mt-0.5">
                    {groupedLocations.landmarks.map((loc) => {
                      const isSelected = value === loc.id;
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => handleSelect(loc)}
                          data-testid={`${testIdPrefix}-option-${loc.id}`}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-all group ${
                            isSelected
                              ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40 shadow-sm'
                              : isDark
                              ? 'hover:bg-slate-800/80 text-slate-200'
                              : 'hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                            <div className="truncate">
                              <div className="font-bold flex items-center gap-1.5">
                                <span>{loc.code}</span>
                                <span className="opacity-75 font-normal">• {loc.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">{loc.subtext}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 font-bold">
                              {loc.wing}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CATEGORY 2: Ground Floor Rooms */}
              {groupedLocations.groundFloor.length > 0 && (
                <div className="p-1.5">
                  <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Ground Floor (GF)</span>
                    </span>
                    <span className="font-mono text-[9px]">{groupedLocations.groundFloor.length} rooms</span>
                  </div>

                  <div className="space-y-0.5 mt-0.5">
                    {groupedLocations.groundFloor.map((loc) => {
                      const isSelected = value === loc.id;
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => handleSelect(loc)}
                          data-testid={`${testIdPrefix}-option-${loc.id}`}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-all group ${
                            isSelected
                              ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm'
                              : isDark
                              ? 'hover:bg-slate-800/80 text-slate-200'
                              : 'hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: loc.color || '#10b981' }}
                            />
                            <div className="truncate">
                              <div className="font-bold flex items-center gap-1.5">
                                <span>{loc.code}</span>
                                <span className="opacity-75 font-normal truncate">• {loc.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">{loc.subtext}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              GF
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono hidden sm:inline">
                              {loc.wing}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CATEGORY 3: First Floor Rooms */}
              {groupedLocations.firstFloor.length > 0 && (
                <div className="p-1.5">
                  <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-purple-400 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      <span>First Floor (1F)</span>
                    </span>
                    <span className="font-mono text-[9px]">{groupedLocations.firstFloor.length} rooms</span>
                  </div>

                  <div className="space-y-0.5 mt-0.5">
                    {groupedLocations.firstFloor.map((loc) => {
                      const isSelected = value === loc.id;
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => handleSelect(loc)}
                          data-testid={`${testIdPrefix}-option-${loc.id}`}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-all group ${
                            isSelected
                              ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40 shadow-sm'
                              : isDark
                              ? 'hover:bg-slate-800/80 text-slate-200'
                              : 'hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: loc.color || '#a855f7' }}
                            />
                            <div className="truncate">
                              <div className="font-bold flex items-center gap-1.5">
                                <span>{loc.code}</span>
                                <span className="opacity-75 font-normal truncate">• {loc.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">{loc.subtext}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                              1F
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono hidden sm:inline">
                              {loc.wing}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
