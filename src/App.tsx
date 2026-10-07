import React, { useEffect } from 'react';
import { CampusScene } from './components/canvas/CampusScene';
import { Header } from './components/ui/Header';
import { FloorSelector } from './components/ui/FloorSelector';
import { SearchBar } from './components/ui/SearchBar';
import { RoomDetailsDrawer } from './components/ui/RoomDetailsDrawer';
import { TimeMachineBar } from './components/ui/TimeMachineBar';
import { ActiveClassBanner } from './components/ui/ActiveClassBanner';
import { PeerLocatorPanel } from './components/ui/PeerLocatorPanel';
import { AntiGravityBanner } from './components/ui/AntiGravityBanner';
import { initKonamiListener } from './services/keyboard/konamiListener';
import { useThemeStore } from './stores/useThemeStore';
import { ErrorBoundary } from './components/ErrorBoundary';

export const App: React.FC = () => {
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  useEffect(() => {
    const cleanup = initKonamiListener();
    return cleanup;
  }, []);

  // Sync dark class on document element
  useEffect(() => {
    if (typeof document !== 'undefined' && document.documentElement) {
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [isDark]);

  return (
    <ErrorBoundary>
      <div
        className={`w-screen h-screen relative ${
          isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'
        } overflow-hidden font-sans select-none transition-colors duration-300`}
      >
        {/* 3D WebGL Canvas Layer */}
        <CampusScene className="w-full h-full absolute inset-0" />

        {/* 2D Interactive UI Overlays */}
        <Header />
        <SearchBar />
        <FloorSelector />
        <ActiveClassBanner />
        <RoomDetailsDrawer />
        <TimeMachineBar />
        <PeerLocatorPanel />
        <AntiGravityBanner />
      </div>
    </ErrorBoundary>
  );
};

export default App;
