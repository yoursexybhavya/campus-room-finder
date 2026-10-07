import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { SearchBar } from '../../src/components/ui/SearchBar';
import { RoomDetailsDrawer } from '../../src/components/ui/RoomDetailsDrawer';
import { useCampusStore } from '../../src/stores/useCampusStore';
import { campusRooms } from '../../src/data/campusRooms';

describe('Challenger 2 Adversarial Stress Suite: Milestone 1 UI & Data Integrity', () => {
  beforeEach(() => {
    act(() => {
      useCampusStore.getState().resetView();
    });
  });

  describe('1. SearchBar Adversarial & Fuzzing Stress Tests', () => {
    it('1.1 should handle empty string and whitespace variations without errors or rendering dropdown', () => {
      const { container } = render(<SearchBar />);
      const input = screen.getByTestId('room-search-input');

      const blankInputs = ['', ' ', '   ', '        '];
      for (const val of blankInputs) {
        act(() => {
          fireEvent.change(input, { target: { value: val } });
        });
        expect(input).toHaveValue(val);
        // Neither search results dropdown nor 'No rooms found' should appear
        expect(container.querySelector('[data-testid^="search-result-"]')).toBeNull();
        expect(screen.queryByText(/No rooms found/i)).toBeNull();
      }

      // Newlines and tabs in input
      act(() => {
        fireEvent.change(input, { target: { value: '\t' } });
      });
      expect(container.querySelector('[data-testid^="search-result-"]')).toBeNull();
      expect(screen.queryByText(/No rooms found/i)).toBeNull();
    });

    it('1.2 should not crash on malformed regex and special character attack payloads', () => {
      const errorSpy = vi.spyOn(console, 'error');
      render(<SearchBar />);
      const input = screen.getByTestId('room-search-input');

      const adversarialPayloads = [
        '[',
        ']',
        '(',
        ')',
        '{',
        '}',
        '\\',
        '/',
        '^',
        '$',
        '.*',
        '+',
        '?',
        '|',
        '[a-z]+',
        '([a-zA-Z0-9]+)*',
        '\\u0000',
        '\\x00',
        '!@#$%^&*()_+~`|}{[]:;?><,./-=',
        "'; DROP TABLE campusRooms; --",
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
      ];

      for (const payload of adversarialPayloads) {
        act(() => {
          fireEvent.change(input, { target: { value: payload } });
        });
        expect(input).toHaveValue(payload);
        // Must execute cleanly without uncaught SyntaxErrors
        expect(errorSpy).not.toHaveBeenCalled();
      }
      errorSpy.mockRestore();
    });

    it('1.3 should handle international unicode, emojis, and extreme length strings without freezing', () => {
      render(<SearchBar />);
      const input = screen.getByTestId('room-search-input');

      const unicodePayloads = [
        '🚀',
        '📚🏫💻',
        'العربية',
        'русский',
        'हिन्दी आर्यभट',
        '日本語の部屋',
        '👾'.repeat(50),
        'A'.repeat(5000), // Stress 5,000 characters
      ];

      for (const payload of unicodePayloads) {
        act(() => {
          fireEvent.change(input, { target: { value: payload } });
        });
        expect(input).toHaveValue(payload);
        expect(screen.getByText(new RegExp(`No rooms found matching "${payload.slice(0, 20)}`, 'i'))).toBeInTheDocument();
      }
    });

    it('1.4 should match all 14 room codes case-insensitively (lower, upper, mixed, padded)', () => {
      render(<SearchBar />);
      const input = screen.getByTestId('room-search-input');

      for (const room of campusRooms) {
        const testQueries = [
          room.id.toLowerCase(),
          room.id.toUpperCase(),
          room.code.toLowerCase(),
          room.code.toUpperCase(),
          `  ${room.id.toLowerCase()}  `,
        ];

        for (const query of testQueries) {
          act(() => {
            fireEvent.change(input, { target: { value: query } });
          });

          const resultItem = screen.getByTestId(`search-result-${room.id}`);
          expect(resultItem).toBeInTheDocument();
          expect(resultItem).toHaveTextContent(room.name);
          expect(resultItem).toHaveTextContent(room.code);
        }
      }
    });

    it('1.5 should accurately filter by faculty in-charge names across all rooms', () => {
      render(<SearchBar />);
      const input = screen.getByTestId('room-search-input');

      for (const room of campusRooms) {
        if (!room.inChargeFaculty) continue;
        const facultyTokens = room.inChargeFaculty
          .replace(/^(Dr\.|Prof\.)\s*/, '')
          .split(' ')
          .filter((t) => t.length > 2);

        for (const token of facultyTokens) {
          act(() => {
            fireEvent.change(input, { target: { value: token.toLowerCase() } });
          });

          const resultItem = screen.queryByTestId(`search-result-${room.id}`);
          expect(resultItem).not.toBeNull();
          expect(resultItem).toHaveTextContent(room.name);
        }
      }
    });

    it('1.6 should filter rooms by room type category (lab, library, admin, lecture)', () => {
      render(<SearchBar />);
      const input = screen.getByTestId('room-search-input');

      // Test searching 'lab'
      act(() => {
        fireEvent.change(input, { target: { value: 'lab' } });
      });
      const labRooms = campusRooms.filter((r) => r.type === 'lab');
      for (const lab of labRooms) {
        expect(screen.getByTestId(`search-result-${lab.id}`)).toBeInTheDocument();
      }

      // Test searching 'library'
      act(() => {
        fireEvent.change(input, { target: { value: 'library' } });
      });
      expect(screen.getByTestId('search-result-LIB-MAIN')).toBeInTheDocument();

      // Test searching 'admin'
      act(() => {
        fireEvent.change(input, { target: { value: 'admin' } });
      });
      expect(screen.getByTestId('search-result-ADMIN-01')).toBeInTheDocument();
    });

    it('1.7 should update store and clear search input when a result item is selected', () => {
      render(<SearchBar />);
      const input = screen.getByTestId('room-search-input');

      act(() => {
        fireEvent.change(input, { target: { value: 'LT-3' } });
      });

      const resultBtn = screen.getByTestId('search-result-LT-3');
      act(() => {
        resultBtn.click();
      });

      expect(useCampusStore.getState().selectedRoomId).toBe('LT-3');
      expect(input).toHaveValue('');
      expect(screen.queryByTestId('search-result-LT-3')).toBeNull();
    });

    it('1.8 should clear input when the clear (X) button is clicked', () => {
      const { container } = render(<SearchBar />);
      const input = screen.getByTestId('room-search-input');

      act(() => {
        fireEvent.change(input, { target: { value: 'Ramanujan' } });
      });
      expect(input).toHaveValue('Ramanujan');

      // Find clear button
      const clearBtn = container.querySelector('button.text-slate-400');
      expect(clearBtn).not.toBeNull();
      act(() => {
        clearBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(input).toHaveValue('');
      expect(screen.queryByTestId('search-result-LT-3')).toBeNull();
    });
  });

  describe('2. RoomDetailsDrawer Adversarial & Transition Stress Tests', () => {
    it('2.1 should verify strict data integrity contract across all 14 rooms', () => {
      expect(campusRooms.length).toBeGreaterThanOrEqual(14);

      const ids = new Set<string>();
      const codes = new Set<string>();

      for (const room of campusRooms) {
        // ID & Code uniqueness
        expect(ids.has(room.id)).toBe(false);
        ids.add(room.id);
        expect(codes.has(room.code)).toBe(false);
        codes.add(room.code);

        // Core fields non-empty
        expect(room.name.trim().length).toBeGreaterThan(3);
        expect(room.capacity).toBeGreaterThan(0);
        expect(['ground', 'first']).toContain(room.floor);
        expect(['lecture_theater', 'lab', 'library', 'admin', 'seminar_hall', 'faculty']).toContain(room.type);

        // Coordinate elevation invariants
        expect(room.position).toHaveLength(3);
        if (room.floor === 'ground') {
          expect(room.position[1]).toBeCloseTo(1.0, 1);
        } else {
          expect(room.position[1]).toBeCloseTo(3.6, 1);
        }

        // Details metadata
        expect(room.doorWaypointId.trim().length).toBeGreaterThan(0);
        expect(room.building.trim().length).toBeGreaterThan(0);
        expect(room.wing.trim().length).toBeGreaterThan(0);
        expect(room.facilities.length).toBeGreaterThan(0);
        expect(room.inChargeFaculty.trim().length).toBeGreaterThan(0);
      }
    });

    it('2.2 should render specifications accurately for all 14 rooms in sequential rapid transitions', () => {
      const { rerender } = render(<RoomDetailsDrawer />);

      for (const room of campusRooms) {
        act(() => {
          useCampusStore.getState().selectRoom(room.id);
        });
        rerender(<RoomDetailsDrawer />);

        const drawer = screen.getByTestId('room-details-drawer');
        expect(drawer).toBeInTheDocument();
        expect(screen.getByText(room.name)).toBeInTheDocument();
        expect(screen.getByText(room.code)).toBeInTheDocument();
        expect(screen.getByText(`${room.capacity} Students`)).toBeInTheDocument();
        expect(screen.getByText(room.inChargeFaculty)).toBeInTheDocument();
        expect(screen.getByText(new RegExp(`${room.building} • ${room.wing} Wing`, 'i'))).toBeInTheDocument();
        expect(
          screen.getByText(room.floor === 'ground' ? 'Ground Floor' : '1st Floor')
        ).toBeInTheDocument();
      }
    });

    it('2.3 should withstand rapid 14-cycle open and close transitions', () => {
      const { rerender } = render(<RoomDetailsDrawer />);

      for (const room of campusRooms) {
        // Open
        act(() => {
          useCampusStore.getState().selectRoom(room.id);
        });
        rerender(<RoomDetailsDrawer />);
        expect(screen.getByTestId('room-details-drawer')).toBeInTheDocument();

        // Close
        const closeBtn = screen.getByTestId('close-room-drawer-btn');
        act(() => {
          closeBtn.click();
        });
        rerender(<RoomDetailsDrawer />);

        expect(useCampusStore.getState().selectedRoomId).toBeNull();
        expect(screen.queryByTestId('room-details-drawer')).toBeNull();
      }
    });

    it('2.4 should update cameraTarget precisely when "Center in 3D" is triggered for each room', () => {
      const { rerender } = render(<RoomDetailsDrawer />);

      for (const room of campusRooms) {
        act(() => {
          useCampusStore.getState().selectRoom(room.id);
        });
        rerender(<RoomDetailsDrawer />);

        const centerBtn = screen.getByText('Center in 3D');
        act(() => {
          centerBtn.click();
        });

        const target = useCampusStore.getState().cameraTarget;
        expect(target).not.toBeNull();
        expect(target?.lookAt).toEqual(room.position);
        expect(target?.position).toEqual([
          room.position[0] + 10,
          room.position[1] + 8,
          room.position[2] + 10,
        ]);
      }
    });

    it('2.5 should gracefully return null without crashing when invalid room ID is selected', () => {
      const { container, rerender } = render(<RoomDetailsDrawer />);

      const invalidRoomIds = ['NON_EXISTENT_ROOM_XYZ', '', '   ', 'NULL_ROOM', 'LT-999'];

      for (const id of invalidRoomIds) {
        act(() => {
          useCampusStore.getState().selectRoom(id);
        });
        rerender(<RoomDetailsDrawer />);
        expect(container.firstChild).toBeNull();
        expect(screen.queryByTestId('room-details-drawer')).toBeNull();
      }

      // Reset to null
      act(() => {
        useCampusStore.getState().selectRoom(null);
      });
      rerender(<RoomDetailsDrawer />);
      expect(container.firstChild).toBeNull();
    });

    it('2.6 should smoothly synchronize SearchBar and RoomDetailsDrawer in full user interaction loop', () => {
      render(
        <div>
          <SearchBar />
          <RoomDetailsDrawer />
        </div>
      );

      const input = screen.getByTestId('room-search-input');

      // 1. Search for robotics lab
      act(() => {
        fireEvent.change(input, { target: { value: 'robotics' } });
      });

      const lab4Result = screen.getByTestId('search-result-LAB-4');
      expect(lab4Result).toHaveTextContent(/Robotics & IoT Innovation Studio/i);

      // 2. Click result
      act(() => {
        lab4Result.click();
      });

      // 3. Drawer opens with LAB-4
      expect(screen.getByTestId('room-details-drawer')).toBeInTheDocument();
      expect(screen.getByText(/Robotics & IoT Innovation Studio/i)).toBeInTheDocument();
      expect(screen.getByText('CF-7')).toBeInTheDocument();
      expect(screen.getByText('1st Floor')).toBeInTheDocument();
      expect(screen.getByText('Prof. Divya Rathore')).toBeInTheDocument();

      // 4. Close drawer
      const closeBtn = screen.getByTestId('close-room-drawer-btn');
      act(() => {
        closeBtn.click();
      });
      expect(screen.queryByTestId('room-details-drawer')).toBeNull();

      // 5. Search by code 'adm-01'
      act(() => {
        fireEvent.change(input, { target: { value: 'adm-01' } });
      });
      const adminResult = screen.getByTestId('search-result-ADMIN-01');
      act(() => {
        adminResult.click();
      });

      // 6. Drawer opens with Admin
      expect(screen.getByTestId('room-details-drawer')).toBeInTheDocument();
      expect(screen.getByText(/Administrative Secretariat/i)).toBeInTheDocument();
      expect(screen.getByText('Ground Floor')).toBeInTheDocument();
    });
  });
});
