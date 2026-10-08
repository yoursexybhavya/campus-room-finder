import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Ground-Truth JIET Courtyard & Stage Invariants (Strict Ground-Only)', () => {
  const terrainPath = path.resolve(__dirname, '../../src/components/canvas/CampusTerrain.tsx');
  const groundFloorPath = path.resolve(__dirname, '../../src/components/canvas/GroundFloor.tsx');

  it('should verify CampusTerrain contains the authentic JIET outdoor stage with forward-facing 3D text', () => {
    const terrainSource = fs.readFileSync(terrainPath, 'utf-8');

    // 1. Stage group and platform
    expect(terrainSource).toContain('jiet-outdoor-stage-group');
    expect(terrainSource).toContain('Raised Stage Platform Base');
    expect(terrainSource).toContain('Polished Stage Surface Slab');
    expect(terrainSource).toContain('stagePlinthRed');

    // 2. Red backdrop wall & "JIET" 3D text with forward rotation facing courtyard
    expect(terrainSource).toContain('stageBackdropRed');
    expect(terrainSource).toContain('Crimson Red Backdrop Wall');
    expect(terrainSource).toMatch(/<Text[^>]*rotation=\{.*?Math\.PI.*?\}[\s\S]*?JIET[\s\S]*?<\/Text>/);

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

  it('should enforce STRICT GROUND-ONLY invariants (NO rooftop solar panels, NO unrequested trees)', () => {
    const terrainSource = fs.readFileSync(terrainPath, 'utf-8');

    // Strictly NO solar panels on roofs
    expect(terrainSource).not.toContain('SolarPanelArray');
    expect(terrainSource).not.toContain('ROOFTOP PHOTOVOLTAIC SOLAR PANEL ARRAYS');

    // Strictly NO unrequested trees on curb
    expect(terrainSource).not.toContain('FanPalmTree');
    expect(terrainSource).not.toContain('EAST ADMIN VERANDA FAN PALM TREES');
  });

  it('should enforce NO erroneous East wing admin breezeway portal in GroundFloor', () => {
    const groundSource = fs.readFileSync(groundFloorPath, 'utf-8');

    // Admin Breezeway Portal must NOT be on East wing
    expect(groundSource).not.toContain('admin-breezeway-portal');
    expect(groundSource).not.toContain('admin-architectural-fins');
  });
});
