import React, { useState } from 'react';
import {
  Sparkles,
  RotateCcw,
  Zap,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useEasterEggStore } from '../../stores/useEasterEggStore';
import { useThemeStore } from '../../stores/useThemeStore';

export const AntiGravityBanner: React.FC = () => {
  const isActive = useEasterEggStore((state) => state.isActive);
  const statusMessage = useEasterEggStore((state) => state.statusMessage);
  const toggle = useEasterEggStore((state) => state.toggle);
  const deactivate = useEasterEggStore((state) => state.deactivate);
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Inactive state: Discreet trigger and Konami hint
  if (!isActive) {
    return (
      <div
        data-testid="antigravity-mobile-trigger-container"
        className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-auto"
      >
        <button
          onClick={toggle}
          data-testid="antigravity-mobile-trigger"
          title="Engage Anti-Gravity Protocol (or press Konami Code: ↑↑↓↓←→←→BA)"
          className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-full border backdrop-blur-md shadow-lg transition-all duration-300 active:scale-95 text-xs font-medium ${
            isDark
              ? 'bg-slate-900/70 hover:bg-slate-900/90 text-slate-400 hover:text-cyan-300 border-slate-700/60 hover:border-cyan-500/50 shadow-black/40'
              : 'bg-white/90 hover:bg-white text-slate-600 hover:text-cyan-600 border-slate-200/90 hover:border-cyan-400 shadow-slate-300/40'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-500 group-hover:rotate-12 transition-transform" />
          <span className="font-mono text-[11px] tracking-wider group-hover:text-cyan-500 font-bold">
            ZERO-G
          </span>
          <span className="hidden sm:inline text-[10px] text-slate-400 font-mono">
            [↑↑↓↓←→←→BA]
          </span>
        </button>
      </div>
    );
  }

  // Active state: Full Glassmorphic HUD Telemetry Banner
  return (
    <div
      data-testid="anti-gravity-banner"
      className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto w-[92%] sm:w-auto max-w-xl animate-in fade-in slide-in-from-top-4 duration-500"
    >
      <div className="bg-slate-950/85 backdrop-blur-2xl border border-cyan-500/50 rounded-2xl p-3 sm:p-4 shadow-[0_0_35px_rgba(6,182,212,0.25)] select-none text-white">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-purple-600 text-white shadow-md shadow-cyan-500/30 shrink-0">
              <Zap className="w-4 h-4 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  ORBITAL PROTOCOL
                </span>
                <span
                  data-testid="antigravity-status-message"
                  className="font-mono text-xs font-bold text-cyan-300 truncate"
                >
                  {statusMessage || 'ZERO-G PROTOCOL ENGAGED // GRAVITY: -9.81 m/s²'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                <Activity className="w-3 h-3 text-purple-400 shrink-0" />
                <span>JIET Campus Digital Twin Floating in Deep Space</span>
              </p>
            </div>
          </div>

          {/* Action Button: Restore Gravity */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={deactivate}
              data-testid="restore-gravity-btn"
              title="Disengage Zero-G and Restore Gravity"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold shadow-lg shadow-rose-950/50 hover:shadow-rose-500/20 transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restore Gravity</span>
              <span className="sm:hidden">Restore</span>
            </button>

            {/* Toggle Telemetry expansion */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid="toggle-telemetry-btn"
              className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-700/60 transition-colors"
              title={isExpanded ? 'Collapse Telemetry' : 'Expand Telemetry'}
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Telemetry Metrics Grid */}
        <div
          data-testid="antigravity-telemetry-panel"
          className={`grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-mono transition-all duration-300 ${
            isExpanded ? 'opacity-100' : 'hidden sm:grid'
          }`}
        >
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Gravity</span>
            <span className="text-cyan-400 font-bold">-9.81 m/s²</span>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Lift Force</span>
            <span className="text-purple-300 font-bold">+3.80 m/s²</span>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Max Ceiling</span>
            <span className="text-emerald-400 font-bold">+8.0 m</span>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Nodes In Orbit</span>
            <span className="text-amber-300 font-bold">14 / 14</span>
          </div>
        </div>
      </div>
    </div>
  );
};
