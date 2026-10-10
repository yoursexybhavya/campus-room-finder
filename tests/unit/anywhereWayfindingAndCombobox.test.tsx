import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { CampusWayfindingBar } from '../../src/components/ui/CampusWayfindingBar';
import { RoomDetailsDrawer } from '../../src/components/ui/RoomDetailsDrawer';
import { SearchableLocationCombobox } from '../../src/components/ui/SearchableLocationCombobox';
import { useCampusStore } from '../../src/stores/useCampusStore';
import { useThemeStore } from '../../src/stores/useThemeStore';
import { campusRooms } from '../../src/data/campusRooms';

describe('Anywhere-to-Anywhere Wayfinding & Searchable Combobox Tests', () => {
  beforeEach(() => {
    act(() => {
      useCampusStore.getState().resetView();
      useCampusStore.getState().selectRoom(null);
      useCampusStore.getState().setUserOriginId('gate');
      useCampusStore.getState().clearNavigationPath();
      useCampusStore.getState().setIsNavigating(false);
      useCampusStore.getState().setIsWayfindingOpen(true);
      useThemeStore.getState().setTheme('dark');
    });
  });

  it('1. SearchableLocationCombobox filters matching rooms by typing queries (LT, Idea, Chem, Admin, 36, Gate)', () => {
    let selectedId = '';
    const handleChange = (id: string) => {
      selectedId = id;
    };

    const { rerender } = render(
      <SearchableLocationCombobox
        id="test-combobox"
        value={null}
        onChange={handleChange}
        placeholder="Search rooms..."
        isDark={true}
        testIdPrefix="test-combo"
      />
    );

    const input = screen.getByTestId('test-combo-input');

    // 1.1 Test typing "LT"
    fireEvent.change(input, { target: { value: 'LT' } });
    expect(screen.getByTestId('test-combo-dropdown')).toBeInTheDocument();
    expect(screen.getByTestId('test-combo-option-LT-1')).toBeInTheDocument();
    expect(screen.getByTestId('test-combo-option-LT-2')).toBeInTheDocument();

    // 1.2 Test typing "Idea"
    fireEvent.change(input, { target: { value: 'Idea' } });
    expect(screen.getByTestId('test-combo-option-LAB-2')).toBeInTheDocument();

    // 1.3 Test typing "Chem"
    fireEvent.change(input, { target: { value: 'Chem' } });
    expect(screen.getByTestId('test-combo-option-LAB-PHY')).toBeInTheDocument();

    // 1.4 Test typing "Admin"
    fireEvent.change(input, { target: { value: 'Admin' } });
    expect(screen.getByTestId('test-combo-option-wp_admin')).toBeInTheDocument();

    // 1.5 Test typing "36" (matches LT-36)
    fireEvent.change(input, { target: { value: '36' } });
    expect(screen.getByTestId('test-combo-option-LT-36')).toBeInTheDocument();

    // 1.6 Test typing "Gate"
    fireEvent.change(input, { target: { value: 'Gate' } });
    expect(screen.getByTestId('test-combo-option-gate')).toBeInTheDocument();

    // 1.7 Click selection
    fireEvent.click(screen.getByTestId('test-combo-option-gate'));
    expect(selectedId).toBe('gate');
  });

  it('2. CampusWayfindingBar allows selecting ANY origin room via searchable combobox', () => {
    render(<CampusWayfindingBar />);

    const originInput = screen.getByTestId('origin-combobox-input');
    fireEvent.focus(originInput);
    fireEvent.change(originInput, { target: { value: 'PC-LAB' } });

    const pcLabOption = screen.getByTestId('origin-combobox-option-LAB-1');
    expect(pcLabOption).toBeInTheDocument();

    act(() => {
      fireEvent.click(pcLabOption);
    });

    // Origin updated to LAB-1
    expect(useCampusStore.getState().userOriginId).toBe('LAB-1');
  });

  it('3. CampusWayfindingBar calculates multi-hop route when navigating anywhere to anywhere (e.g. LAB-1 to LT-36)', () => {
    render(<CampusWayfindingBar />);

    // Select Origin: LAB-1
    const originInput = screen.getByTestId('origin-combobox-input');
    fireEvent.focus(originInput);
    fireEvent.change(originInput, { target: { value: 'LAB-1' } });
    act(() => {
      fireEvent.click(screen.getByTestId('origin-combobox-option-LAB-1'));
    });

    // Select Destination: LT-36
    const destInput = screen.getByTestId('destination-combobox-input');
    fireEvent.focus(destInput);
    fireEvent.change(destInput, { target: { value: '36' } });
    act(() => {
      fireEvent.click(screen.getByTestId('destination-combobox-option-LT-36'));
    });

    // Check store state
    expect(useCampusStore.getState().userOriginId).toBe('LAB-1');
    expect(useCampusStore.getState().selectedRoomId).toBe('LT-36');
    expect(useCampusStore.getState().navigationPath).not.toBeNull();
    expect(useCampusStore.getState().navigationPath!.length).toBeGreaterThan(1);

    // Summary displayed
    expect(screen.getByTestId('wayfinding-route-summary')).toBeInTheDocument();
  });

  it('4. RoomDetailsDrawer renders quick buttons: 📍 Set as Start and 🎯 Navigate Here', () => {
    const room = campusRooms.find((r) => r.id === 'LAB-2')!;

    act(() => {
      useCampusStore.getState().selectRoom(room.id);
      useCampusStore.getState().setUserOriginId('gate');
    });

    render(<RoomDetailsDrawer />);

    const setStartBtn = screen.getByTestId('set-as-start-btn');
    const navHereBtn = screen.getByTestId('instant-navigate-here-btn');

    expect(setStartBtn).toBeInTheDocument();
    expect(setStartBtn).toHaveTextContent(/Set as Start/i);
    expect(navHereBtn).toBeInTheDocument();
    expect(navHereBtn).toHaveTextContent(/Navigate Here/i);

    // Test clicking "📍 Set as Start"
    act(() => {
      setStartBtn.click();
    });
    expect(useCampusStore.getState().userOriginId).toBe('LAB-2');

    // Test clicking "🎯 Navigate Here"
    act(() => {
      navHereBtn.click();
    });
    expect(useCampusStore.getState().isNavigating).toBe(true);
    expect(useCampusStore.getState().currentStepIndex).toBe(0);
  });
});
