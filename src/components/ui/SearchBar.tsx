import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { campusRooms } from '../../data/campusRooms';
import { useCampusStore } from '../../stores/useCampusStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { CampusRoom } from '../../types/campus';

export const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const selectRoom = useCampusStore((state) => state.selectRoom);
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  const filteredRooms = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return campusRooms.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        (r.inChargeFaculty && r.inChargeFaculty.toLowerCase().includes(q)) ||
        (r.building && r.building.toLowerCase().includes(q))
    );
  }, [query]);

  const handleSelect = (room: CampusRoom) => {
    selectRoom(room.id);
    setQuery('');
    setIsOpen(false);
  };

  const inputContainerClass = isDark
    ? 'bg-slate-900/90 backdrop-blur-xl border-slate-700/80 shadow-black/40 text-white'
    : 'bg-white/95 backdrop-blur-xl border-slate-200/90 shadow-slate-300/40 text-slate-900';

  const dropdownClass = isDark
    ? 'bg-slate-900/95 backdrop-blur-2xl border-slate-700/80 text-white shadow-black/60 divide-slate-800/60'
    : 'bg-white/95 backdrop-blur-2xl border-slate-200/90 text-slate-900 shadow-slate-300/50 divide-slate-100';

  const hoverItemClass = isDark
    ? 'hover:bg-slate-800/80'
    : 'hover:bg-slate-100';

  return (
    <div className="absolute top-16 sm:top-20 left-3 right-24 sm:right-auto sm:w-80 z-40 pointer-events-auto select-none">
      <div className="relative">
        <div
          className={`flex items-center gap-2 border px-3.5 py-2.5 rounded-2xl shadow-xl focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all ${inputContainerClass}`}
        >
          <Search className="w-4 h-4 text-cyan-500 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search rooms, labs, faculty..."
            className={`w-full bg-transparent text-xs placeholder-slate-400 focus:outline-none ${
              isDark ? 'text-slate-100' : 'text-slate-900'
            }`}
            data-testid="room-search-input"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setIsOpen(false);
              }}
              className="text-slate-400 hover:text-cyan-500 p-0.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Results */}
        {isOpen && filteredRooms.length > 0 && (
          <div
            className={`absolute top-full left-0 right-0 mt-2 border rounded-2xl shadow-2xl max-h-72 overflow-y-auto divide-y z-50 animate-in fade-in zoom-in-95 duration-150 ${dropdownClass}`}
          >
            {filteredRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => handleSelect(room)}
                data-testid={`search-result-${room.id}`}
                className={`w-full text-left px-3.5 py-2.5 transition-colors flex items-center justify-between gap-3 group ${hoverItemClass}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: room.color }}
                  />
                  <div className="truncate">
                    <div className="text-xs font-semibold group-hover:text-cyan-500 transition-colors truncate">
                      {room.code}: {room.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {room.building} • {room.wing} Wing
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      room.floor === 'ground'
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                    }`}
                  >
                    {room.floor === 'ground' ? 'GF' : '1F'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {isOpen && query.trim() !== '' && filteredRooms.length === 0 && (
          <div
            className={`absolute top-full left-0 right-0 mt-2 border rounded-2xl p-4 text-center text-xs text-slate-400 z-30 shadow-xl ${dropdownClass}`}
          >
            No rooms found matching "{query}"
          </div>
        )}
      </div>
    </div>
  );
};
