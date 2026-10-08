import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Ground-Truth JIET Courtyard, Stage & Architectural Facade Invariants', () => {
  const terrainPath = path.resolve(__dirname, '../../src/components/canvas/CampusTerrain.tsx');
  const groundFloorPath = path.resolve(__dirname, '../../src/components/canvas/GroundFloor.tsx');

  it('should verify CampusTerrain source file contains the authentic JIET outdoor stage and 3D typography', () => {
    const terrainSource = fs.readFileSync(terrainPath, 'utf-8');

    // 1. Stage group and platform
    expect(terrainSource).toContain('jiet-outdoor-stage-group');
    expect(terrainSource).toContain('Raised Stage Platform Base');
    expect(terrainSource).toContain('Polished Stage Surface Slab');
    expect(terrainSource).toContain('stagePlinthRed');

    // 2. Red backdrop wall & "JIET" 3D text
    expect(terrainSource).toContain('stageBackdropRed');
    expect(terrainSource).toContain('Crimson Red Backdrop Wall');
    expect(terrainSource).toMatch(/<Text[^>]*>[\s\S]*?JIET[\s\S]*?<\/Text>/);

    // 3. Stage access steps from central walkway
    expect(terrainSource).toContain('Front Access Steps');
  });

  it('should verify the North Assembly Plaza, Central Axial Walkway, and Dual Symmetrical Lawns in CampusTerrain', () => {
    const terrainSource = fs.readFileSync(terrainPath, 'utf-8');

    // North Assembly Plaza (paved with interlocking block styling)
    expect(terrainSource).toContain('NORTH ASSEMBLY PLAZA');
    expect(terrainSource).toContain('paverColor');
    expect(terrainSource).toContain('paverLineColor');

    // Transverse East-West Walkway & Central Axial Walkway
    expect(terrainSource).toContain('TRANSVERSE EAST-WEST WALKWAY');
    expect(terrainSource).toContain('CENTRAL AXIAL WALKWAY');

    // Dual Green Lawns with concrete curb borders
    expect(terrainSource).toContain('DUAL MANICURED GREEN LAWNS');
    expect(terrainSource).toContain('West Green Lawn');
    expect(terrainSource).toContain('East Green Lawn');
    expect(terrainSource).toContain('borderStoneColor');
  });

  it('should verify rooftop solar panel arrays and East Admin veranda palm trees in CampusTerrain', () => {
    const terrainSource = fs.readFileSync(terrainPath, 'utf-8');

    // Rooftop Photovoltaic Solar Arrays
    expect(terrainSource).toContain('SolarPanelArray');
    expect(terrainSource).toContain('ROOFTOP PHOTOVOLTAIC SOLAR PANEL ARRAYS');
    expect(terrainSource).toContain('#1e3a8a'); // Photovoltaic silicon blue

    // Fan Palm Trees along East Admin curb
    expect(terrainSource).toContain('FanPalmTree');
    expect(terrainSource).toContain('EAST ADMIN VERANDA FAN PALM TREES');
    expect(terrainSource).toContain('fan-palm-tree');
    expect(terrainSource).toContain('#78350f'); // Palm trunk
    expect(terrainSource).toContain('#15803d'); // Palm fronds
  });

  it('should verify Admin Wing breezeway portal and red architectural fins in GroundFloor', () => {
    const groundSource = fs.readFileSync(groundFloorPath, 'utf-8');

    // Admin Breezeway Portal to sports ground & parking
    expect(groundSource).toContain('admin-breezeway-portal');
    expect(groundSource).toContain('Admin Ground-Floor Breezeway Portal');

    // Red architectural fins along East courtyard facade
    expect(groundSource).toContain('admin-architectural-fins');
    expect(groundSource).toContain('#991b1b');
  });
});
