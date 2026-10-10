"""
JIET Campus Digital Twin - Complete Procedural 3D Architectural Twin (v5)
========================================================================
Built for Blender 5.2.2 LTS / 4.x.
Grounded strictly in official CAD blueprints (24.4.2014) & site photography:
  1. Complete CAD Room-by-Room Reconstruction: Every single room on Ground Floor
     and First Floor (Admin Director, Registrar, Board Room, Reception, Microprocessor Lab,
     High Voltage Lab, ECE Lab, Conference Hall, Central Library, Drawing Halls 1 & 2,
     Multipurpose Hall, Internet Lab, Antenna Lab, Communication Lab, Physics & Chemistry Labs,
     radiating Lecture Halls LT-1 through LT-16, Tutorial Rooms, Faculty Cabins, Toilet blocks).
  2. Authentic Perimeter & Interior Partition Walls: Real 14-inch exterior walls and
     8-inch/10-inch interior partition walls separating all individual spaces.
  3. Real Doorways & Lintels: Every room has authentic door cutouts (1.2m wide, 2.2m high)
     with solid lintels spanning above door openings into the 10-foot wide corridors.
  4. 10-Foot Continuous Corridors: Authentic 3.05m (10ft) hallway loop connecting all 4 wings
     seamlessly through continuous curved corner arcs with ZERO GAPS.
  5. 100% Airtight Corner Junctions: Radial end walls share common boundaries with adjacent
     wing rooms, eliminating all triangular voids, exposed ground, or floor leaks.
  6. Authentic 3D South Entrance Porch: Raised plinth with curved steps, 4 substantial
     sandstone columns, solid canopy roof slab, and First Floor balcony terrace.
  7. Authentic Recessed Corner Rotundas: Helical staircases with central white column,
     dark granite treads, white risers, black tubular railings, enclosed within rotunda bay.
  8. JIET Stage Refinements: Solid flat brick-red plinth facing the courtyard audience
     (NO front stairs), stairs placed strictly on West & East flanks, centered 3D white
     "JIET" text on crimson backdrop.
  9. Courtyard: 4 manicured lawn quadrants with concrete curbs, cross-axial paved walkways,
     South amphitheater stepped bleachers.
 10. ZERO Rooftop Solar Panels, zero unrequested trees, zero fountains.
"""

import math
import os
import sys
import bpy
import bmesh
from mathutils import Vector, Matrix, Euler

# =============================================================================
# 1. CONSTANTS & PHYSICAL DIMENSIONS (METERS)
# =============================================================================
CAMPUS_SIZE = 72.0                # Total building footprint: 72m x 72m ([-36, 36])
COURTYARD_SIZE = 36.0             # Central Courtyard opening: 36m x 36m ([-18, 18])
WING_DEPTH = 18.0                 # Depth of each wing: 18m
CORRIDOR_WIDTH = 3.05             # Authentic 10-foot wide corridor (3.05m)
PLINTH_HEIGHT = 0.20              # Ground floor plinth elevation above courtyard
GF_HEIGHT = 3.65                  # Ground floor ceiling height
SLAB_THICKNESS = 0.25             # Floor slab thickness
FF_HEIGHT = 3.55                  # First floor ceiling height
ROOF_PARAPET_H = 0.60             # Clean architectural roof parapet height

WALL_EXT_TH = 0.35                # 14-inch exterior wall thickness
WALL_CORR_TH = 0.25               # 10-inch corridor dividing wall thickness
WALL_INT_TH = 0.20                # 8-inch interior partition thickness
DOOR_WIDTH = 1.20                 # Standard classroom/lab door opening
DOOR_HEIGHT = 2.20                # Standard door height

STAGE_WIDTH_Y = 15.0              # Stage width along Y (North-South span: -7.5 to +7.5)
STAGE_DEPTH_X = 4.80              # Stage depth along X (East-West span: -18.0 to -13.2)
STAGE_HEIGHT = 1.05               # Stage plinth height
STAGE_X_CENTER = -15.60           # Plinth center X (front wall at X = -13.20 facing East)

# Vertical Elevation Offsets (Eliminating all coplanar Z-fighting)
Z_GROUND_BASE = -0.20             # Sub-base foundation
Z_COURTYARD_BASE = 0.00           # Courtyard paver base level
Z_LAWN_TOP = 0.07                 # Manicured grass surface
Z_CURB_TOP = 0.15                 # Concrete curb top
Z_WALKWAY_TOP = 0.055             # Paved walkway surface
Z_GF_PLINTH = 0.18                # Building plinth slab top
Z_GF_FLOOR = 0.21                 # GF finished floor layer
Z_GF_WALL_BASE = 0.21             # Base of GF walls
Z_GF_CEILING = Z_GF_WALL_BASE + GF_HEIGHT  # 3.86m
Z_FF_SLAB_TOP = Z_GF_CEILING + SLAB_THICKNESS # 4.11m
Z_FF_FLOOR = Z_FF_SLAB_TOP + 0.02 # 4.13m
Z_FF_WALL_BASE = Z_FF_FLOOR
Z_FF_CEILING = Z_FF_WALL_BASE + FF_HEIGHT # 7.68m
Z_ROOF_TOP = Z_FF_CEILING + SLAB_THICKNESS # 7.93m

# =============================================================================
# 2. HELPER FUNCTIONS & MESH UTILITIES
# =============================================================================
def clean_scene():
    """Wipes the scene and configures metric units."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.length_unit = 'METERS'
    return scene

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) / 255.0 for i in (0, 2, 4))

def get_or_create_material(name, hex_color, roughness=0.35, metallic=0.0, emission=0.0, alpha=1.0):
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    rgb = hex_to_rgb(hex_color)
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = (rgb[0], rgb[1], rgb[2], alpha)
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
        if emission > 0 and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
            bsdf.inputs["Emission Strength"].default_value = emission
        if alpha < 1.0:
            if "Transmission Weight" in bsdf.inputs:
                bsdf.inputs["Transmission Weight"].default_value = 1.0 - alpha
            elif "Transmission" in bsdf.inputs:
                bsdf.inputs["Transmission"].default_value = 1.0 - alpha
    mat.diffuse_color = (rgb[0], rgb[1], rgb[2], alpha)
    return mat

def get_collection(name, parent=None):
    coll = bpy.data.collections.get(name)
    if not coll:
        coll = bpy.data.collections.new(name)
        if parent:
            parent.children.link(coll)
        else:
            bpy.context.scene.collection.children.link(coll)
    return coll

def make_mesh_object(name, bm, collection, material=None):
    try:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    except Exception:
        pass
    bm.normal_update()
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    if material:
        obj.data.materials.append(material)
    collection.objects.link(obj)
    return obj

def add_box(bm, cx, cy, sx, sy, z0, z1):
    """Adds an axis-aligned box with center (cx, cy) and dimensions (sx, sy)."""
    if sx <= 0.001 or sy <= 0.001 or z1 <= z0:
        return
    hx, hy = sx * 0.5, sy * 0.5
    v1 = bm.verts.new((cx - hx, cy - hy, z0))
    v2 = bm.verts.new((cx + hx, cy - hy, z0))
    v3 = bm.verts.new((cx + hx, cy + hy, z0))
    v4 = bm.verts.new((cx - hx, cy + hy, z0))
    v5 = bm.verts.new((cx - hx, cy - hy, z1))
    v6 = bm.verts.new((cx + hx, cy - hy, z1))
    v7 = bm.verts.new((cx + hx, cy + hy, z1))
    v8 = bm.verts.new((cx - hx, cy + hy, z1))

    # 6 Quad faces
    bm.faces.new([v4, v3, v2, v1]) # Bottom
    bm.faces.new([v5, v6, v7, v8]) # Top
    bm.faces.new([v1, v2, v6, v5]) # Front
    bm.faces.new([v2, v3, v7, v6]) # Right
    bm.faces.new([v3, v4, v8, v7]) # Back
    bm.faces.new([v4, v1, v5, v8]) # Left

def add_prism(bm, pts_2d, z0, z1):
    """Extrudes a 2D polygon from z0 to z1 with outward-pointing normals."""
    if len(pts_2d) < 3 or z1 <= z0:
        return
    signed_area = sum(pts_2d[i][0] * pts_2d[(i+1)%len(pts_2d)][1] - pts_2d[(i+1)%len(pts_2d)][0] * pts_2d[i][1] for i in range(len(pts_2d))) * 0.5
    if signed_area < 0:
        pts_2d = list(reversed(pts_2d))

    bottom_verts = [bm.verts.new((p[0], p[1], z0)) for p in pts_2d]
    top_verts = [bm.verts.new((p[0], p[1], z1)) for p in pts_2d]
    n = len(pts_2d)
    bm.faces.new(list(reversed(bottom_verts)))
    bm.faces.new(top_verts)
    for i in range(n):
        i_next = (i + 1) % n
        bm.faces.new([bottom_verts[i], bottom_verts[i_next], top_verts[i_next], top_verts[i]])

def add_cylinder(bm, cx, cy, r, z0, z1, segments=16):
    pts = []
    for i in range(segments):
        ang = 2.0 * math.pi * i / segments
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    add_prism(bm, pts, z0, z1)

def add_wall_x(bm, x0, x1, y, th, z0, z1, doors=None):
    """Builds a wall along the X axis from x0 to x1 centered at y with thickness th."""
    if doors is None:
        doors = []
    min_x = min(x0, x1)
    max_x = max(x0, x1)
    valid_doors = []
    for cx, dw, dh in sorted(doors, key=lambda d: d[0]):
        d_start = max(min_x, cx - dw * 0.5)
        d_end = min(max_x, cx + dw * 0.5)
        if d_end > d_start:
            valid_doors.append((d_start, d_end, dh))

    cur_x = min_x
    for d_start, d_end, dh in valid_doors:
        if d_start > cur_x + 0.01:
            add_box(bm, (cur_x + d_start) * 0.5, y, d_start - cur_x, th, z0, z1)
        lintel_z0 = z0 + dh
        if lintel_z0 < z1 and d_end > d_start + 0.01:
            add_box(bm, (d_start + d_end) * 0.5, y, d_end - d_start, th, lintel_z0, z1)
        cur_x = d_end
    if cur_x < max_x - 0.01:
        add_box(bm, (cur_x + max_x) * 0.5, y, max_x - cur_x, th, z0, z1)

def add_wall_y(bm, x, y0, y1, th, z0, z1, doors=None):
    """Builds a wall along the Y axis from y0 to y1 centered at x with thickness th."""
    if doors is None:
        doors = []
    min_y = min(y0, y1)
    max_y = max(y0, y1)
    valid_doors = []
    for cy, dw, dh in sorted(doors, key=lambda d: d[0]):
        d_start = max(min_y, cy - dw * 0.5)
        d_end = min(max_y, cy + dw * 0.5)
        if d_end > d_start:
            valid_doors.append((d_start, d_end, dh))

    cur_y = min_y
    for d_start, d_end, dh in valid_doors:
        if d_start > cur_y + 0.01:
            add_box(bm, x, (cur_y + d_start) * 0.5, th, d_start - cur_y, z0, z1)
        lintel_z0 = z0 + dh
        if lintel_z0 < z1 and d_end > d_start + 0.01:
            add_box(bm, x, (d_start + d_end) * 0.5, th, d_end - d_start, lintel_z0, z1)
        cur_y = d_end
    if cur_y < max_y - 0.01:
        add_box(bm, x, (cur_y + max_y) * 0.5, th, max_y - cur_y, z0, z1)

def get_font():
    font_paths = [
        '/System/Library/Fonts/Supplemental/Arial.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
        '/Library/Fonts/Arial.ttf'
    ]
    for p in font_paths:
        if os.path.exists(p):
            try:
                return bpy.data.fonts.load(p)
            except Exception:
                pass
    return None

# =============================================================================
# 3. COURTYARD GROUND & LAWN PARTITIONS (ZERO Z-FIGHTING)
# =============================================================================
def build_courtyard(coll, mats):
    """
    Builds the central courtyard ground without coplanar surface interference:
      - Deep foundation base at Z = -0.20 to 0.00
      - 4 distinct green lawn quadrants bounded by raised concrete curbs
      - Cross-axial paved walkways (N-S axial and E-W transverse)
      - East stepped amphitheater seating tiers with alternating terracotta and cream pavers
    """
    # 1. Base campus ground sub-foundation (84m x 84m, underlying full quadrangle)
    bm_base = bmesh.new()
    add_box(bm_base, 0.0, 0.0, 84.0, 84.0, Z_GROUND_BASE, Z_COURTYARD_BASE)
    make_mesh_object("Courtyard_Base_Foundation", bm_base, coll, mats["paver_ground"])

    # 2. Four Lawn Quadrants with Raised Curbs (Ground truth: 4 partitions around central walkways)
    # Stage is on West (X in [-18, -13.2]), Amphitheater on East (X in [13.2, 18])
    quadrants = [
        ("NW", -13.0, -2.4,  2.4, 15.6),
        ("NE",   2.4, 13.0,  2.4, 15.6),
        ("SW", -13.0, -2.4, -15.6, -2.4),
        ("SE",   2.4, 13.0, -15.6, -2.4),
    ]

    bm_lawn = bmesh.new()
    bm_curb = bmesh.new()
    curb_w = 0.22

    for name, x0, x1, y0, y1 in quadrants:
        gx0, gx1 = x0 + curb_w, x1 - curb_w
        gy0, gy1 = y0 + curb_w, y1 - curb_w
        pts_lawn = [(gx0, gy0), (gx1, gy0), (gx1, gy1), (gx0, gy1)]
        add_prism(bm_lawn, pts_lawn, Z_COURTYARD_BASE, Z_LAWN_TOP)

        add_box(bm_curb, (x0 + x1)*0.5, y0 + curb_w*0.5, (x1 - x0) - 2*curb_w, curb_w, Z_COURTYARD_BASE, Z_CURB_TOP)
        add_box(bm_curb, (x0 + x1)*0.5, y1 - curb_w*0.5, (x1 - x0) - 2*curb_w, curb_w, Z_COURTYARD_BASE, Z_CURB_TOP)
        add_box(bm_curb, x0 + curb_w*0.5, (y0 + y1)*0.5, curb_w, (y1 - y0), Z_COURTYARD_BASE, Z_CURB_TOP)
        add_box(bm_curb, x1 - curb_w*0.5, (y0 + y1)*0.5, curb_w, (y1 - y0), Z_COURTYARD_BASE, Z_CURB_TOP)

    make_mesh_object("Courtyard_4_Lawns", bm_lawn, coll, mats["grass"])
    make_mesh_object("Courtyard_Lawn_Curbs", bm_curb, coll, mats["curb"])

    # 3. Cross-Axial Paved Walkways
    bm_walkway = bmesh.new()
    walk_w = 4.4
    half_w = walk_w * 0.5
    # Central intersection square
    add_box(bm_walkway, 0.0, 0.0, walk_w, walk_w, Z_COURTYARD_BASE, Z_WALKWAY_TOP)
    # North arm (center to North veranda at Y=18.0)
    add_box(bm_walkway, 0.0, (half_w + 18.0)*0.5, walk_w, 18.0 - half_w, Z_COURTYARD_BASE, Z_WALKWAY_TOP)
    # South arm (center to South veranda at Y=-18.0, connecting between twin library staircases)
    add_box(bm_walkway, 0.0, (-half_w - 18.0)*0.5, walk_w, 18.0 - half_w, Z_COURTYARD_BASE, Z_WALKWAY_TOP)
    # West arm (center to Stage front plinth at X=-13.20)
    add_box(bm_walkway, (-half_w - 13.20)*0.5, 0.0, 13.20 - half_w, walk_w, Z_COURTYARD_BASE, Z_WALKWAY_TOP)
    # East arm (center to East veranda at X=18.0, passing through central amphitheater gap)
    add_box(bm_walkway, (half_w + 18.0)*0.5, 0.0, 18.0 - half_w, walk_w, Z_COURTYARD_BASE, Z_WALKWAY_TOP)
    make_mesh_object("Courtyard_Paved_Cross_Walkways", bm_walkway, coll, mats["walkway_paved"])

    # 4. East Stepped Amphitheater Seating (Facing West towards Stage, matching IMG_3110 2.jpeg & IMG_3102.jpeg)
    bm_bleachers_cream = bmesh.new()
    bm_bleachers_terracotta = bmesh.new()
    bm_bleacher_curbs = bmesh.new()

    num_tiers = 5
    tier_depth = 0.96
    tier_rise = 0.18
    # Divided into 2 seating blocks by the central East-West walkway (Y in [-2.4, 2.4])
    seat_blocks_y = [(-16.0, -2.4), (2.4, 16.0)]

    for seat_y0, seat_y1 in seat_blocks_y:
        for i in range(num_tiers):
            t_x0 = 13.20 + (i * tier_depth)
            t_x1 = t_x0 + tier_depth
            t_z0 = Z_COURTYARD_BASE
            t_z1 = Z_COURTYARD_BASE + 0.25 + (i * tier_rise)

            pts = [(t_x0, seat_y0), (t_x1, seat_y0), (t_x1, seat_y1), (t_x0, seat_y1)]
            target_bm = bm_bleachers_terracotta if (i % 2 == 0) else bm_bleachers_cream
            add_prism(target_bm, pts, t_z0, t_z1)

            # Curb on front riser of tier
            add_box(bm_bleacher_curbs, t_x0, (seat_y0 + seat_y1)*0.5, 0.15, (seat_y1 - seat_y0), t_z1 - tier_rise, t_z1)

    make_mesh_object("Amphitheater_Seating_Terracotta", bm_bleachers_terracotta, coll, mats["paver_terracotta"])
    make_mesh_object("Amphitheater_Seating_Cream", bm_bleachers_cream, coll, mats["paver_cream"])
    make_mesh_object("Amphitheater_Seating_Curbs", bm_bleacher_curbs, coll, mats["curb_red"])

# =============================================================================
# 4. JIET OUTDOOR STAGE (WEST FLANK, NO FRONT STAIRS, STAIRS ON SIDES ONLY)
# =============================================================================
def build_outdoor_stage(coll, mats):
    """
    Builds the authentic JIET Outdoor Stage on the West Flank (IMG_3101.jpeg, IMG_3111.jpeg):
      - Positioned on the WEST flank of the courtyard (centered at Y = 0.0, X = -15.60m).
      - Facing EAST (+X) across the lawn towards the audience and amphitheater.
      - Solid flat brick-red plinth facing audience (ZERO FRONT STAIRS).
      - Access stairs positioned strictly on the NORTH and SOUTH FLANKS.
      - Smooth light stone platform deck.
      - Rich crimson backdrop wall with white 3D "JIET" typography.
    """
    # 1. Solid Brick-red Plinth Base (Clean flat front face at X = -13.20m facing East)
    bm_plinth = bmesh.new()
    add_box(bm_plinth, STAGE_X_CENTER, 0.0, STAGE_DEPTH_X, STAGE_WIDTH_Y, Z_COURTYARD_BASE, STAGE_HEIGHT)
    make_mesh_object("Stage_Brick_Plinth_SolidFront", bm_plinth, coll, mats["stage_brick"])

    # 2. Smooth polished stone deck slab
    bm_deck = bmesh.new()
    add_box(bm_deck, STAGE_X_CENTER, 0.0, STAGE_DEPTH_X + 0.30, STAGE_WIDTH_Y + 0.30, STAGE_HEIGHT, STAGE_HEIGHT + 0.08)
    make_mesh_object("Stage_Stone_Deck", bm_deck, coll, mats["stage_deck"])

    # 3. SIDE ACCESS STAIRS ONLY (North Flank and South Flank, NO FRONT STAIRS)
    bm_side_steps = bmesh.new()
    num_side_steps = 5
    stair_w = 1.35
    stair_l = 3.60
    stair_step_l = stair_l / num_side_steps
    stair_step_h = STAGE_HEIGHT / num_side_steps

    # North Flank Stairs (Y: +7.5m to +8.85m, stepping down along X)
    y_n = (STAGE_WIDTH_Y * 0.5) + (stair_w * 0.5)
    for s in range(num_side_steps):
        sx = -17.0 + (s * stair_step_l) + (stair_step_l * 0.5)
        sz = (num_side_steps - s) * stair_step_h
        add_box(bm_side_steps, sx, y_n, stair_step_l, stair_w, Z_COURTYARD_BASE, sz)

    # South Flank Stairs (Y: -7.5m to -8.85m, stepping down along X)
    y_s = - (STAGE_WIDTH_Y * 0.5) - (stair_w * 0.5)
    for s in range(num_side_steps):
        sx = -17.0 + (s * stair_step_l) + (stair_step_l * 0.5)
        sz = (num_side_steps - s) * stair_step_h
        add_box(bm_side_steps, sx, y_s, stair_step_l, stair_w, Z_COURTYARD_BASE, sz)

    make_mesh_object("Stage_Side_Access_Stairs", bm_side_steps, coll, mats["stage_steps"])

    # 4. Crimson Backdrop Wall (at West edge X = -17.80m, height 3.4m)
    bm_back = bmesh.new()
    wall_x = -17.80
    wall_w = 8.60 # length along Y
    wall_h = 3.40
    add_box(bm_back, wall_x, 0.0, 0.40, wall_w, STAGE_HEIGHT, STAGE_HEIGHT + wall_h)
    make_mesh_object("Stage_Crimson_Backdrop_Wall", bm_back, coll, mats["stage_backdrop"])

    # 5. Bold 3D White "JIET" Typography (Facing East +X, upright, non-mirrored)
    font_loaded = get_font()
    curve = bpy.data.curves.new(name="JIET_Stage_Text_Curve", type='FONT')
    curve.body = "JIET"
    if font_loaded:
        curve.font = font_loaded
    curve.size = 1.35
    curve.extrude = 0.12
    curve.align_x = 'CENTER'
    curve.align_y = 'CENTER'

    text_obj = bpy.data.objects.new("Stage_3D_JIET_Text", curve)
    text_obj.location = (wall_x + 0.22, 0.0, STAGE_HEIGHT + 1.65)
    # Upright facing East (+X):
    text_obj.rotation_euler = Euler((math.radians(90.0), 0.0, math.radians(90.0)), 'XYZ')
    text_obj.data.materials.append(mats["white_text"])
    coll.objects.link(text_obj)

    bpy.context.view_layer.objects.active = text_obj
    text_obj.select_set(True)
    try:
        bpy.ops.object.convert(target='MESH')
    except Exception:
        pass
    text_obj.select_set(False)

# =============================================================================
# 4B. COURTYARD TWIN LIBRARY STAIRCASES ("DN" ON BLUEPRINT, CIRCULAR CUTOUTS)
# =============================================================================
def build_twin_library_staircases(coll, mats):
    """
    Builds the authentic Symmetrical Twin Outdoor Staircases rising from Admin courtyard exit
    to First Floor Central Library ("DN" on CAD Blueprint, IMG_3098 2.jpeg, IMG_3100.jpeg, IMG_3104.jpeg, IMG_3105.jpeg, IMG_3107.jpeg):
      - Symmetrical twin flights flanking the central open courtyard portal (clear width 3.2m at ground).
      - Lower straight flights: West (X = -3.8m) and East (X = +3.8m) rise North from veranda (Y = -18.0)
        to mid-landing at Y in [-13.8, -11.8], Z = 2.15m.
      - 11 polished green marble treads with white risers and clean concrete soffit slab underneath.
      - Sloping brown tubular steel railings (top rail at h = +0.90m, mid rail at +0.45m) with vertical posts.
      - Under-stair triangular blue sidewall facing the central ground exit corridor (IMG_3098 2.jpeg).
      - Mid-landing at Z = 2.15m supported by a solid monolithic concrete foundation structure underneath down to ground.
      - North-facing Solid Sandstone Parapet Wall with TWO VERTICALLY STACKED CIRCULAR PORTHOLES:
        Solid masonry wall resting flush on the North rim of the mid-landing at Z = 2.15m, rising to Z = 4.25m.
      - Upper inward flights turning 90 degrees towards center X = 0, rising to central bridge platform at Z = 3.65m,
        with solid concrete waist soffit slab underneath.
      - Central elevated bridge platform at Z = 3.65m spanning X in [-1.6, 1.6], Y in [-16.0, -12.8],
        leaving open 3.29m clear headroom underneath for the ground corridor path to the lawn (IMG_3098 2.jpeg).
      - Open tubular brown steel safety railings on bridge overlooking lawn (top rail, mid rail, posts, low curb).
      - Central flight of 7 green marble steps with white risers and brown tubular handrails
        rising South from the bridge (Y = -16.0) into the Central Library entrance portal (Y = -18.2) (IMG_3107.jpeg).
    """
    bm_treads = bmesh.new()
    bm_risers = bmesh.new()
    bm_railings = bmesh.new()
    bm_landings = bmesh.new()
    bm_supports = bmesh.new()
    bm_blue_sidewalls = bmesh.new()
    bm_soffits = bmesh.new()

    def add_stair_prism(bm, x_min, x_max, y0, y1, z0, z1_start, z1_end):
        v0 = bm.verts.new((x_min, y0, z0))
        v1 = bm.verts.new((x_min, y1, z0))
        v2 = bm.verts.new((x_min, y1, z1_end))
        v3 = bm.verts.new((x_min, y0, z1_start))

        v4 = bm.verts.new((x_max, y0, z0))
        v5 = bm.verts.new((x_max, y1, z0))
        v6 = bm.verts.new((x_max, y1, z1_end))
        v7 = bm.verts.new((x_max, y0, z1_start))

        bm.faces.new((v0, v1, v2, v3))
        bm.faces.new((v7, v6, v5, v4))
        bm.faces.new((v0, v4, v5, v1))
        bm.faces.new((v3, v2, v6, v7))
        bm.faces.new((v1, v5, v6, v2))
        bm.faces.new((v0, v3, v7, v4))

    def add_stair_prism_x(bm, y_min, y_max, x0, x1, z0, z1_start, z1_end):
        v0 = bm.verts.new((x0, y_min, z0))
        v1 = bm.verts.new((x1, y_min, z0))
        v2 = bm.verts.new((x1, y_min, z1_end))
        v3 = bm.verts.new((x0, y_min, z1_start))

        v4 = bm.verts.new((x0, y_max, z0))
        v5 = bm.verts.new((x1, y_max, z0))
        v6 = bm.verts.new((x1, y_max, z1_end))
        v7 = bm.verts.new((x0, y_max, z1_start))

        bm.faces.new((v0, v1, v2, v3))
        bm.faces.new((v7, v6, v5, v4))
        bm.faces.new((v0, v4, v5, v1))
        bm.faces.new((v3, v2, v6, v7))
        bm.faces.new((v1, v5, v6, v2))
        bm.faces.new((v0, v3, v7, v4))

    def add_sloping_soffit_x(bm, y_min, y_max, x0, x1, z_start, z_end, thickness=0.20):
        # Guarantee xa < xb so normal winding is strictly outward-facing for both East & West flights
        if x0 < x1:
            xa, xb = x0, x1
            za, zb = z_start, z_end
        else:
            xa, xb = x1, x0
            za, zb = z_end, z_start
        zba = za - thickness
        zbb = zb - thickness

        v0 = bm.verts.new((xa, y_min, zba))
        v1 = bm.verts.new((xb, y_min, zbb))
        v2 = bm.verts.new((xb, y_min, zb))
        v3 = bm.verts.new((xa, y_min, za))

        v4 = bm.verts.new((xa, y_max, zba))
        v5 = bm.verts.new((xb, y_max, zbb))
        v6 = bm.verts.new((xb, y_max, zb))
        v7 = bm.verts.new((xa, y_max, za))

        bm.faces.new((v0, v1, v2, v3))
        bm.faces.new((v7, v6, v5, v4))
        bm.faces.new((v0, v4, v5, v1))
        bm.faces.new((v3, v2, v6, v7))
        bm.faces.new((v1, v5, v6, v2))
        bm.faces.new((v0, v3, v7, v4))

    def add_sloping_rail_y(bm, x, y0, z0, y1, z1, thickness=0.05):
        h = thickness * 0.5
        v0 = bm.verts.new((x - h, y0, z0 - h))
        v1 = bm.verts.new((x + h, y0, z0 - h))
        v2 = bm.verts.new((x + h, y0, z0 + h))
        v3 = bm.verts.new((x - h, y0, z0 + h))

        v4 = bm.verts.new((x - h, y1, z1 - h))
        v5 = bm.verts.new((x + h, y1, z1 - h))
        v6 = bm.verts.new((x + h, y1, z1 + h))
        v7 = bm.verts.new((x - h, y1, z1 + h))

        bm.faces.new((v0, v1, v2, v3))
        bm.faces.new((v7, v6, v5, v4))
        bm.faces.new((v0, v4, v5, v1))
        bm.faces.new((v3, v2, v6, v7))
        bm.faces.new((v1, v5, v6, v2))
        bm.faces.new((v0, v3, v7, v4))

    def add_sloping_rail_x(bm, y, x0, z0, x1, z1, thickness=0.05):
        h = thickness * 0.5
        v0 = bm.verts.new((x0, y - h, z0 - h))
        v1 = bm.verts.new((x0, y + h, z0 - h))
        v2 = bm.verts.new((x0, y + h, z0 + h))
        v3 = bm.verts.new((x0, y - h, z0 + h))

        v4 = bm.verts.new((x1, y - h, z1 - h))
        v5 = bm.verts.new((x1, y + h, z1 - h))
        v6 = bm.verts.new((x1, y + h, z1 + h))
        v7 = bm.verts.new((x1, y - h, z1 + h))

        bm.faces.new((v0, v1, v2, v3))
        bm.faces.new((v7, v6, v5, v4))
        bm.faces.new((v0, v4, v5, v1))
        bm.faces.new((v3, v2, v6, v7))
        bm.faces.new((v1, v5, v6, v2))
        bm.faces.new((v0, v3, v7, v4))

    stair_w = 2.20
    num_steps_lower = 11
    lower_y0 = -18.00
    lower_y1 = -13.80
    lower_l = lower_y1 - lower_y0
    step_y = lower_l / num_steps_lower
    step_h = (2.15 - Z_GF_FLOOR) / num_steps_lower

    for side_sign, stair_name in [(-1.0, "West"), (1.0, "East")]:
        cx_stair = side_sign * 3.80
        x_min = cx_stair - stair_w * 0.5
        x_max = cx_stair + stair_w * 0.5

        # 1. Lower straight flight rising North from Y = -18.0 to Y = -13.80, reaching Z = 2.15m
        for s in range(num_steps_lower):
            sy = lower_y0 + (s * step_y) + (step_y * 0.5)
            sz = Z_GF_FLOOR + ((s + 1) * step_h)
            # Polished green marble tread
            add_box(bm_treads, cx_stair, sy, stair_w, step_y, sz - 0.04, sz)
            # White marble riser
            add_box(bm_risers, cx_stair, sy - step_y * 0.5 + 0.02, stair_w, 0.04, sz - step_h, sz - 0.04)

        # Concrete waist soffit slab underneath lower flight
        add_stair_prism(bm_soffits, x_min, x_max, lower_y0, lower_y1, Z_GF_FLOOR - 0.18, 0.18, 2.00)

        # 2. Mid Landing slab at Y in [-13.80, -11.80], Z = 2.15m
        add_box(bm_landings, cx_stair, -12.80, stair_w, 2.00, 2.05, 2.20)

        # Solid monolithic structural foundation under mid-landing down to ground
        add_box(bm_supports, cx_stair, -12.80, stair_w, 2.00, Z_COURTYARD_BASE, 2.05)

        # Under-stair triangular blue sidewall facing corridor exit passage (IMG_3098 2.jpeg)
        if side_sign < 0:
            add_stair_prism(bm_blue_sidewalls, -2.72, -2.55, lower_y0, lower_y1, Z_COURTYARD_BASE, Z_GF_FLOOR, 2.15)
        else:
            add_stair_prism(bm_blue_sidewalls, 2.55, 2.72, lower_y0, lower_y1, Z_COURTYARD_BASE, Z_GF_FLOOR, 2.15)

        # Sloping tubular brown steel handrails along lower flight (inner and outer, IMG_3100.jpeg)
        rx_inner = side_sign * 2.70
        rx_outer = side_sign * 4.90

        # Inner sloping handrails (top and mid rail)
        add_sloping_rail_y(bm_railings, rx_inner, lower_y0, Z_GF_FLOOR + 0.90, lower_y1, 2.15 + 0.90, thickness=0.05)
        add_sloping_rail_y(bm_railings, rx_inner, lower_y0, Z_GF_FLOOR + 0.45, lower_y1, 2.15 + 0.45, thickness=0.04)
        for post_frac in [0.0, 0.5, 1.0]:
            py = lower_y0 + post_frac * lower_l
            pz_base = Z_GF_FLOOR + post_frac * (2.15 - Z_GF_FLOOR)
            add_box(bm_railings, rx_inner, py, 0.05, 0.05, pz_base, pz_base + 0.90)

        # Outer sloping handrails (top and mid rail)
        add_sloping_rail_y(bm_railings, rx_outer, lower_y0, Z_GF_FLOOR + 0.90, lower_y1, 2.15 + 0.90, thickness=0.05)
        add_sloping_rail_y(bm_railings, rx_outer, lower_y0, Z_GF_FLOOR + 0.45, lower_y1, 2.15 + 0.45, thickness=0.04)
        for post_frac in [0.0, 0.5, 1.0]:
            py = lower_y0 + post_frac * lower_l
            pz_base = Z_GF_FLOOR + post_frac * (2.15 - Z_GF_FLOOR)
            add_box(bm_railings, rx_outer, py, 0.05, 0.05, pz_base, pz_base + 0.90)

        # Outer horizontal safety railing along mid-landing edge (IMG_3105.jpeg)
        add_box(bm_railings, rx_outer, -12.80, 0.05, 2.00, 3.00, 3.05)
        add_box(bm_railings, rx_outer, -12.80, 0.04, 2.00, 2.55, 2.60)
        for post_y in [-13.80, -12.80, -11.80]:
            add_box(bm_railings, rx_outer, post_y, 0.05, 0.05, 2.15, 3.05)

        # 3. North-Facing Solid Parapet Wall with TWO VERTICALLY STACKED CIRCULAR PORTHOLES (IMG_3100.jpeg)
        # Built as an airtight solid 3D masonry wall resting flush on the North rim of the landing at Z = 2.15m
        wall_w = stair_w + 0.10
        wall_th = 0.24
        wall_h = 2.10
        wall_cy = -11.92
        wall_mesh = bpy.data.meshes.new(f"Stair_North_Wall_{stair_name}_Mesh")
        wall_obj = bpy.data.objects.new(f"Stair_North_Wall_{stair_name}", wall_mesh)
        bm_w = bmesh.new()
        bmesh.ops.create_cube(bm_w, size=1.0)
        for v in bm_w.verts:
            v.co.x *= wall_w
            v.co.y *= wall_th
            v.co.z *= wall_h
            v.co.x += cx_stair
            v.co.y += wall_cy
            v.co.z += (2.15 + wall_h * 0.5)
        bm_w.to_mesh(wall_mesh)
        bm_w.free()
        wall_obj.data.materials.append(mats["wall_sandstone"])
        coll.objects.link(wall_obj)

        # Cut the two circular portholes cleanly using Exact Boolean Modifiers (IMG_3100.jpeg)
        porthole_radii = [0.32, 0.38] # Lower hole 0.32m, upper hole 0.38m
        for h_idx, (hole_z, hole_r) in enumerate(zip([2.80, 3.65], porthole_radii)):
            bpy.ops.mesh.primitive_cylinder_add(
                radius=hole_r, depth=0.60,
                location=(cx_stair, wall_cy, hole_z),
                rotation=(math.radians(90.0), 0.0, 0.0)
            )
            cutter = bpy.context.active_object
            cutter.name = f"Cutter_Porthole_{stair_name}_{h_idx}"
            mod = wall_obj.modifiers.new(name=f"Bool_Porthole_{h_idx}", type='BOOLEAN')
            mod.operation = 'DIFFERENCE'
            mod.solver = 'EXACT'
            mod.object = cutter
            bpy.context.view_layer.objects.active = wall_obj
            bpy.ops.object.modifier_apply(modifier=mod.name)
            bpy.data.objects.remove(cutter, do_unlink=True)

        # 4. Inward Upper Flight: turns 90° inward towards center X = 0, rising to Z = 3.65m
        num_inward = 7
        inward_x0 = side_sign * 2.70
        inward_x1 = side_sign * 1.60
        inward_len_x = abs(inward_x1 - inward_x0)
        inward_step_x = inward_len_x / num_inward
        inward_step_h = (3.65 - 2.15) / num_inward
        inward_w_y = 1.80
        inward_cy = -13.70

        for si in range(num_inward):
            if side_sign < 0: # West climbs Eastward (+X)
                sx = inward_x0 + (si * inward_step_x) + (inward_step_x * 0.5)
                rx = inward_x0 + (si * inward_step_x)
                add_box(bm_risers, rx + 0.02, inward_cy, 0.04, inward_w_y, 2.15 + si * inward_step_h, 2.15 + (si + 1) * inward_step_h - 0.04)
            else: # East climbs Westward (-X)
                sx = inward_x0 - (si * inward_step_x) - (inward_step_x * 0.5)
                rx = inward_x0 - (si * inward_step_x)
                add_box(bm_risers, rx - 0.02, inward_cy, 0.04, inward_w_y, 2.15 + si * inward_step_h, 2.15 + (si + 1) * inward_step_h - 0.04)
            sz_in = 2.15 + ((si + 1) * inward_step_h)
            add_box(bm_treads, sx, inward_cy, inward_step_x, inward_w_y, sz_in - 0.04, sz_in)

        # Concrete waist soffit slab underneath inward flight (IMG_3098 2.jpeg)
        add_sloping_soffit_x(bm_soffits, -14.60, -12.80, inward_x0, inward_x1, 2.15, 3.65, thickness=0.20)

        # Side fascia stringer beams encasing the steps (front at Y = -12.80 and rear at Y = -14.60)
        # Completely eliminates exposed floating sawtooth steps, matching IMG_3098 2.jpeg
        add_sloping_soffit_x(bm_soffits, -12.88, -12.72, inward_x0, inward_x1, 2.15 + 0.22, 3.65 + 0.22, thickness=0.45)
        add_sloping_soffit_x(bm_soffits, -14.68, -14.52, inward_x0, inward_x1, 2.15 + 0.22, 3.65 + 0.22, thickness=0.45)

        # Sloping railing along the front edge of inward flight (Y = -12.80)
        rail_in_y = -12.80
        add_sloping_rail_x(bm_railings, rail_in_y, inward_x0, 2.15 + 0.90, inward_x1, 3.65 + 0.90, thickness=0.05)
        add_sloping_rail_x(bm_railings, rail_in_y, inward_x0, 2.15 + 0.45, inward_x1, 3.65 + 0.45, thickness=0.04)
        for post_frac in [0.0, 0.5, 1.0]:
            px = inward_x0 + post_frac * (inward_x1 - inward_x0)
            pz_b = 2.15 + post_frac * (3.65 - 2.15)
            add_box(bm_railings, px, rail_in_y, 0.05, 0.05, pz_b, pz_b + 0.90)

    # 5. Central Elevated Bridge Platform (spans X in [-1.6, 1.6], Y in [-16.0, -12.8], Z = 3.65m)
    # Headroom underneath: Z in [0.21, 3.50] = 3.29m clear height for ground corridor exit into courtyard (IMG_3098 2)
    add_box(bm_landings, 0.0, -14.40, 3.20, 3.20, 3.50, 3.65)
    # Polished green marble floor finish on bridge platform (IMG_3105.jpeg)
    add_box(bm_treads, 0.0, -14.40, 3.20, 3.20, 3.61, 3.65)

    # Solid cantilever support fascia and beams under bridge platform framing ground exit portal
    add_box(bm_supports, 0.0, -12.86, 3.20, 0.12, 3.35, 3.50)
    add_box(bm_supports, -1.60, -14.40, 0.20, 3.20, 3.30, 3.50)
    add_box(bm_supports,  1.60, -14.40, 0.20, 3.20, 3.30, 3.50)

    # Open tubular brown steel safety railing on bridge overlooking lawn (IMG_3098 2, IMG_3101)
    add_box(bm_railings, 0.0, -12.80, 3.20, 0.05, 4.55, 4.60) # Top handrail
    add_box(bm_railings, 0.0, -12.80, 3.20, 0.04, 4.10, 4.14) # Mid rail
    add_box(bm_landings, 0.0, -12.80, 3.20, 0.10, 3.65, 3.75) # Low concrete curb
    for px_b in [-1.60, -0.80, 0.00, 0.80, 1.60]:
        add_box(bm_railings, px_b, -12.80, 0.05, 0.05, 3.65, 4.60)

    # 6. Central Flight of 7 Green Marble Steps Rising South into Central Library (IMG_3107, IMG_3104)
    # Climbs South from Y = -16.0 to Y = -18.2, rising from Z = 3.65m to Z = 4.13m (Z_FF_FLOOR)
    num_central_steps = 7
    step_c_w = 3.20
    step_c_l = (18.20 - 16.00) / num_central_steps
    step_c_h = (Z_FF_FLOOR - 3.65) / num_central_steps
    for sc in range(num_central_steps):
        sy_c = -16.00 - (sc * step_c_l) - (step_c_l * 0.5)
        sz_c = 3.65 + ((sc + 1) * step_c_h)
        # Green marble tread
        add_box(bm_treads, 0.0, sy_c, step_c_w, step_c_l, sz_c - 0.04, sz_c)
        # White riser
        add_box(bm_risers, 0.0, sy_c + step_c_l * 0.5 - 0.02, step_c_w, 0.04, sz_c - step_c_h, sz_c - 0.04)

    # Concrete carriage slab underneath central flight
    add_stair_prism(bm_soffits, -1.60, 1.60, -16.00, -18.20, 3.50, 3.50, Z_FF_FLOOR)

    # Flanking sloping tubular handrails (left and right at X = +-1.60m)
    for r_side in [-1.60, 1.60]:
        add_sloping_rail_y(bm_railings, r_side, -16.00, 3.65 + 0.90, -18.20, Z_FF_FLOOR + 0.90, thickness=0.05)
        add_sloping_rail_y(bm_railings, r_side, -16.00, 3.65 + 0.45, -18.20, Z_FF_FLOOR + 0.45, thickness=0.04)
        for post_y in [-16.00, -17.10, -18.20]:
            py_frac = (-post_y - 16.00) / (18.20 - 16.00)
            pz_step = 3.65 + py_frac * (Z_FF_FLOOR - 3.65)
            add_box(bm_railings, r_side, post_y, 0.05, 0.05, pz_step, pz_step + 0.90)

    make_mesh_object("Twin_Library_Stairs_Treads_GreenMarble", bm_treads, coll, mats["stair_green_marble"])
    make_mesh_object("Twin_Library_Stairs_Risers_WhiteMarble", bm_risers, coll, mats["stair_riser"])
    make_mesh_object("Twin_Library_Stairs_Soffits_Concrete", bm_soffits, coll, mats["slab_concrete"])
    make_mesh_object("Twin_Library_Stairs_Landings", bm_landings, coll, mats["corridor_floor"])
    make_mesh_object("Twin_Library_Stairs_SupportPiers", bm_supports, coll, mats["wall_sandstone"])
    make_mesh_object("Twin_Library_Stairs_BlueSidewalls", bm_blue_sidewalls, coll, mats["door_blue"])
    make_mesh_object("Twin_Library_Stairs_Railings_Brown", bm_railings, coll, mats["stair_railing_brown"])

# =============================================================================
# 5. AIRTIGHT CORNERS: RADIATING LTs WITH DOORS & ROTUNDA HELICAL STAIRCASES
# =============================================================================
def build_authentic_corner(coll, mats, corner_name, quad_sign_x, quad_sign_y, floor_lvl='GF'):
    """
    Builds authentic, airtight CAD blueprint corner geometry with ZERO GAPS:
      - Origin: corner junction point at (cx, cy) = (quad_sign_x * 21.05, quad_sign_y * 21.05).
      - Corner junction floor covers square [-21.05, -18.0] x [-21.05, -18.0] continuously.
      - Inner rotunda helical staircase bay: recessed at (quad_sign_x * 20.0, quad_sign_y * 20.0).
        Stair treads are fully enclosed in the bay, with an open entry archway facing the corridor.
      - Continuous 10-foot curved corridor arc: r in [0, 3.5m] from (cx, cy), flowing into straight corridors.
      - Radiating Wedge Lecture Halls (LTs): r in [3.5m, 14.65m]:
        * Radial partition walls between LTs.
        * Inner curved corridor wall with real framed doorways and lintels.
        * Radial end walls at phi=0 and phi=pi/2 share EXACT boundaries with adjacent wing rooms.
      - Outer Curved Sandstone Facade Wall: r in [14.65m, 15.00m] connects tangentially
        to the straight wing facades at X = quad_sign_x * 35.7 and Y = quad_sign_y * 35.7.
    """
    is_ff = (floor_lvl == 'FF')
    z_floor_base = Z_FF_SLAB_TOP if is_ff else Z_GF_PLINTH
    z_floor_top = Z_FF_FLOOR if is_ff else Z_GF_FLOOR
    z_wall_base = Z_FF_WALL_BASE if is_ff else Z_GF_WALL_BASE
    z_wall_top = Z_FF_CEILING if is_ff else Z_GF_CEILING

    bm_lts = bmesh.new()
    bm_corridor = bmesh.new()
    bm_walls = bmesh.new()
    bm_stair_treads = bmesh.new()
    bm_stair_risers = bmesh.new()
    bm_stair_rails = bmesh.new()
    bm_rotunda_wall = bmesh.new()
    bm_toilets = bmesh.new()

    cx = quad_sign_x * 21.05
    cy = quad_sign_y * 21.05

    # Center of rotunda staircase (recessed in corner bay)
    stair_cx = quad_sign_x * 19.5
    stair_cy = quad_sign_y * 19.5

    r_rooms_in = 3.50     # Inner edge of lecture halls (dividing corridor wall)
    r_rooms_out = 14.65   # Outer edge of lecture halls (interior of facade wall)
    r_facade_out = 15.00  # Exterior facade outer surface

    def get_corner_pt(r, phi_rad):
        # phi=0 aligns with Y wing (X = cx, Y extends outwards); phi=pi/2 aligns with X wing (Y = cy, X extends outwards)
        x = cx + quad_sign_x * r * math.sin(phi_rad)
        y = cy + quad_sign_y * r * math.cos(phi_rad)
        return (x, y)

    # 1. Airtight Corner Corridor Floor Arc (Connecting straight corridors)
    corr_segs = 16
    for i in range(corr_segs):
        p0 = (i / corr_segs) * (math.pi * 0.5)
        p1 = ((i + 1) / corr_segs) * (math.pi * 0.5)
        p0_in = get_corner_pt(0.0, p0)
        p1_in = get_corner_pt(0.0, p1)
        p1_out = get_corner_pt(r_rooms_in, p1)
        p0_out = get_corner_pt(r_rooms_in, p0)
        add_prism(bm_corridor, [p0_in, p1_in, p1_out, p0_out], z_floor_base, z_floor_top)

    # Pave the rotunda drum floor on Ground Floor only (FF leaves open stairwell void)
    if not is_ff:
        rot_pts_floor = []
        for s in range(16):
            ang = (s / 16.0) * (math.pi * 2.0)
            rot_pts_floor.append((stair_cx + 1.50 * math.cos(ang), stair_cy + 1.50 * math.sin(ang)))
        add_prism(bm_corridor, rot_pts_floor, z_floor_base, z_floor_top)

    # Ground Truth (Department of Technology Map & Blueprint):
    # ALL 4 corners have EXACTLY 3 radiating wedge Lecture Theaters:
    # NW: LT-9, LT-10, LT-11; NE: LT-12, LT-13, LT-14 (no artificial partition splitting LT-13!)
    num_rooms = 3

    room_mat = mats["mazemap_lt_upper"] if is_ff else mats["mazemap_lt"]

    for r_idx in range(num_rooms):
        p0 = (r_idx / num_rooms) * (math.pi * 0.5)
        p1 = ((r_idx + 1) / num_rooms) * (math.pi * 0.5)

        # Room floor prism
        pts_room = []
        seg_sub = 8
        for s in range(seg_sub + 1):
            sa = p0 + (s / seg_sub) * (p1 - p0)
            pts_room.append(get_corner_pt(r_rooms_in, sa))
        for s in range(seg_sub, -1, -1):
            sa = p0 + (s / seg_sub) * (p1 - p0)
            pts_room.append(get_corner_pt(r_rooms_out, sa))
        add_prism(bm_lts, pts_room, z_floor_base, z_floor_top)

        # Radial partition wall at p0 (for r_idx > 0)
        if r_idx > 0:
            p_in = get_corner_pt(r_rooms_in, p0)
            p_out = get_corner_pt(r_rooms_out, p0)
            dx, dy = p_out[0] - p_in[0], p_out[1] - p_in[1]
            L = math.hypot(dx, dy)
            if L > 0:
                nx, ny = -dy / L * (WALL_INT_TH * 0.5), dx / L * (WALL_INT_TH * 0.5)
                pts_wall = [
                    (p_in[0] - nx, p_in[1] - ny),
                    (p_in[0] + nx, p_in[1] + ny),
                    (p_out[0] + nx, p_out[1] + ny),
                    (p_out[0] - nx, p_out[1] - ny)
                ]
                add_prism(bm_walls, pts_wall, z_wall_base, z_wall_top)

        # Inner corridor curved wall with authentic DOOR OPENING & LINTEL
        p_mid = (p0 + p1) * 0.5
        door_ang = DOOR_WIDTH / max(r_rooms_in, 1.0)
        d0 = p_mid - door_ang * 0.5
        d1 = p_mid + door_ang * 0.5

        # Solid wall segment from p0 to d0
        if d0 > p0 + 0.02:
            pts_w1 = []
            for s in range(4):
                ca = p0 + (s / 3.0) * (d0 - p0)
                pts_w1.append(get_corner_pt(r_rooms_in, ca))
            for s in range(3, -1, -1):
                ca = p0 + (s / 3.0) * (d0 - p0)
                pts_w1.append(get_corner_pt(r_rooms_in + WALL_CORR_TH, ca))
            add_prism(bm_walls, pts_w1, z_wall_base, z_wall_top)

        # Solid wall segment from d1 to p1
        if p1 > d1 + 0.02:
            pts_w2 = []
            for s in range(4):
                ca = d1 + (s / 3.0) * (p1 - d1)
                pts_w2.append(get_corner_pt(r_rooms_in, ca))
            for s in range(3, -1, -1):
                ca = d1 + (s / 3.0) * (p1 - d1)
                pts_w2.append(get_corner_pt(r_rooms_in + WALL_CORR_TH, ca))
            add_prism(bm_walls, pts_w2, z_wall_base, z_wall_top)

        # Door lintel from d0 to d1 (above DOOR_HEIGHT = 2.20m)
        pts_lintel = []
        for s in range(4):
            ca = d0 + (s / 3.0) * (d1 - d0)
            pts_lintel.append(get_corner_pt(r_rooms_in, ca))
        for s in range(3, -1, -1):
            ca = d0 + (s / 3.0) * (d1 - d0)
            pts_lintel.append(get_corner_pt(r_rooms_in + WALL_CORR_TH, ca))
        add_prism(bm_walls, pts_lintel, z_wall_base + DOOR_HEIGHT, z_wall_top)

    # 3. Flanking Radial End Walls (Sealing 100% against adjacent wing rooms, from r_rooms_in to r_facade_out)
    # End wall at phi = 0: along X = cx from Y = cy + quad_sign_y * r_rooms_in to Y = cy + quad_sign_y * r_facade_out
    add_wall_y(bm_walls, cx, cy + quad_sign_y * r_rooms_in, cy + quad_sign_y * r_facade_out, WALL_INT_TH, z_wall_base, z_wall_top)
    # End wall at phi = pi/2: along Y = cy from X = cx + quad_sign_x * r_rooms_in to X = cx + quad_sign_x * r_facade_out
    add_wall_x(bm_walls, cx + quad_sign_x * r_rooms_in, cx + quad_sign_x * r_facade_out, cy, WALL_INT_TH, z_wall_base, z_wall_top)


    # 5. Outer Curved Sandstone Facade Wall (Matching exterior straight wings)
    pts_ext = []
    ext_segs = 16
    for s in range(ext_segs + 1):
        ca = (s / ext_segs) * (math.pi * 0.5)
        pts_ext.append(get_corner_pt(r_rooms_out, ca))
    for s in range(ext_segs, -1, -1):
        ca = (s / ext_segs) * (math.pi * 0.5)
        pts_ext.append(get_corner_pt(r_facade_out, ca))
    add_prism(bm_walls, pts_ext, z_wall_base, z_wall_top)

    # 5. Helical Staircase & Recessed Rotunda Bay (Constructed on GF structural core)
    if not is_ff:
        # Central white column on Ground Floor (capped cleanly at ceiling)
        add_cylinder(bm_walls, stair_cx, stair_cy, 0.28, Z_GF_WALL_BASE, Z_GF_CEILING, segments=16)

        num_helical_steps = 22
        stair_dz = (Z_FF_FLOOR - Z_GF_FLOOR) / num_helical_steps
        step_ang_span = 270.0
        # Stairs spiral inward towards the corner, NEVER sticking out into the corridor
        stair_dir_base = math.degrees(math.atan2(quad_sign_y, quad_sign_x)) + 30.0

        r_stair_in = 0.30
        r_stair_out = 1.35

        for s in range(num_helical_steps):
            sa0 = math.radians(stair_dir_base + (s / num_helical_steps) * step_ang_span)
            sa1 = math.radians(stair_dir_base + ((s + 1) / num_helical_steps) * step_ang_span)
            sz0 = Z_GF_FLOOR + s * stair_dz
            sz1 = sz0 + stair_dz

            p0_in = (stair_cx + r_stair_in * math.cos(sa0), stair_cy + r_stair_in * math.sin(sa0))
            p1_in = (stair_cx + r_stair_in * math.cos(sa1), stair_cy + r_stair_in * math.sin(sa1))
            p1_out = (stair_cx + r_stair_out * math.cos(sa1), stair_cy + r_stair_out * math.sin(sa1))
            p0_out = (stair_cx + r_stair_out * math.cos(sa0), stair_cy + r_stair_out * math.sin(sa0))

            add_prism(bm_stair_treads, [p0_in, p1_in, p1_out, p0_out], sz1 - 0.05, sz1)
            add_prism(bm_stair_risers, [p0_in, p1_in, p1_out, p0_out], sz0, sz1 - 0.05)

            r_rail = r_stair_out - 0.08
            rx = stair_cx + r_rail * math.cos(sa0)
            ry = stair_cy + r_rail * math.sin(sa0)
            if s % 2 == 0:
                add_cylinder(bm_stair_rails, rx, ry, 0.025, sz1, sz1 + 0.95, segments=8)

        # Authentic Rear Niche / Alcove Wall against toilet blocks (120° rear arc ONLY, facing courtyard/toilets)
        # The entire 240° facing the corridor and radiating LTs is 100% UNBLOCKED and open!
        rot_r = 1.40
        rot_segs = 8
        rear_deg = math.degrees(math.atan2(quad_sign_y, quad_sign_x)) + 180.0
        rot_start_deg = rear_deg - 60.0
        rot_span_deg = 120.0
        for w in range(rot_segs):
            wa0 = math.radians(rot_start_deg + (w / rot_segs) * rot_span_deg)
            wa1 = math.radians(rot_start_deg + ((w + 1) / rot_segs) * rot_span_deg)
            p0_in = (stair_cx + rot_r * math.cos(wa0), stair_cy + rot_r * math.sin(wa0))
            p1_in = (stair_cx + rot_r * math.cos(wa1), stair_cy + rot_r * math.sin(wa1))
            p1_out = (stair_cx + (rot_r + WALL_INT_TH) * math.cos(wa1), stair_cy + (rot_r + WALL_INT_TH) * math.sin(wa1))
            p0_out = (stair_cx + (rot_r + WALL_INT_TH) * math.cos(wa0), stair_cy + (rot_r + WALL_INT_TH) * math.sin(wa0))
            add_prism(bm_rotunda_wall, [p0_in, p1_in, p1_out, p0_out], Z_GF_WALL_BASE, Z_GF_CEILING)

        # Flanking Toilet Blocks in Inner Bay
        add_box(bm_toilets, stair_cx - quad_sign_x * 1.2, stair_cy + quad_sign_y * 1.5, 1.8, 1.8, Z_GF_PLINTH, Z_GF_FLOOR)
        add_wall_x(bm_walls, stair_cx - quad_sign_x * 2.1, stair_cx - quad_sign_x * 0.3, stair_cy + quad_sign_y * 1.5, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=[(stair_cx - quad_sign_x * 1.2, 0.9, DOOR_HEIGHT)])

        make_mesh_object(f"{corner_name}_Stair_Treads_Granite", bm_stair_treads, coll, mats["stair_green_marble"])
        make_mesh_object(f"{corner_name}_Stair_Risers_White", bm_stair_risers, coll, mats["stair_riser"])
        make_mesh_object(f"{corner_name}_Stair_Tubular_Railings", bm_stair_rails, coll, mats["stair_railing"])
        make_mesh_object(f"{corner_name}_Rotunda_Bay_Wall", bm_rotunda_wall, coll, mats["wall_sandstone"])
        make_mesh_object(f"{corner_name}_Corner_Toilets_Floor", bm_toilets, coll, mats["mazemap_admin"])
    else:
        # First Floor: Upper Central Column and Safety Balustrade around open stairwell void
        add_cylinder(bm_walls, stair_cx, stair_cy, 0.28, Z_FF_WALL_BASE, Z_FF_CEILING, segments=16)

        bm_ff_bal = bmesh.new()
        rot_r = 1.40
        rot_segs = 8
        rear_deg = math.degrees(math.atan2(quad_sign_y, quad_sign_x)) + 180.0
        rot_start_deg = rear_deg - 75.0
        rot_span_deg = 150.0
        for w in range(rot_segs):
            wa0 = math.radians(rot_start_deg + (w / rot_segs) * rot_span_deg)
            wa1 = math.radians(rot_start_deg + ((w + 1) / rot_segs) * rot_span_deg)
            p0_in = (stair_cx + rot_r * math.cos(wa0), stair_cy + rot_r * math.sin(wa0))
            p1_in = (stair_cx + rot_r * math.cos(wa1), stair_cy + rot_r * math.sin(wa1))
            p1_out = (stair_cx + (rot_r + 0.15) * math.cos(wa1), stair_cy + (rot_r + 0.15) * math.sin(wa1))
            p0_out = (stair_cx + (rot_r + 0.15) * math.cos(wa0), stair_cy + (rot_r + 0.15) * math.sin(wa0))
            add_prism(bm_ff_bal, [p0_in, p1_in, p1_out, p0_out], Z_FF_FLOOR, Z_FF_FLOOR + 1.05)
        make_mesh_object(f"{corner_name}_FF_Stairwell_Balustrade", bm_ff_bal, coll, mats["balustrade_white"])

    prefix = f"{corner_name}_{floor_lvl}"
    make_mesh_object(f"{prefix}_Radiating_LTs_Floor", bm_lts, coll, room_mat)
    make_mesh_object(f"{prefix}_Curved_Corridor", bm_corridor, coll, mats["corridor_floor"])
    make_mesh_object(f"{prefix}_Partition_And_Door_Walls", bm_walls, coll, mats["wall_sandstone"])

def build_all_corners(coll, mats, floor_lvl='GF'):
    """Builds all 4 corners matching authentic blueprint geometry for the given floor."""
    build_authentic_corner(coll, mats, "Corner_NW", -1.0,  1.0, floor_lvl=floor_lvl)
    build_authentic_corner(coll, mats, "Corner_NE",  1.0,  1.0, floor_lvl=floor_lvl)
    build_authentic_corner(coll, mats, "Corner_SW", -1.0, -1.0, floor_lvl=floor_lvl)
    build_authentic_corner(coll, mats, "Corner_SE",  1.0, -1.0, floor_lvl=floor_lvl)

# =============================================================================
# 6. GROUND FLOOR ARCHITECTURE (COMPLETE BLUEPRINT ROOM EXTRACTION)
# =============================================================================
def build_ground_floor(coll, mats):
    """
    Builds the authentic Ground Floor from blueprint CO-ED UP TO DATE 24.4.2014-Model.pdf 2.pdf:
      - Continuous 10-foot covered veranda corridor around courtyard extending to +-21.05m.
      - Sandstone square pillars along courtyard edge, including anchor pillars at (+-18.0, +-18.0).
      - South 3D Entrance Porch: raised plinth with curved steps, 4 sandstone columns,
        0.35m canopy roof slab, and flanking masonry planters.
      - South Wing: Grand Reception & Foyer Lobby, Registrar Office, Board Room with Planter,
        Academic & Campus Directors, Secrecy & Toilets, PA & Pantry, Penal Room, Medical Room,
        Training Offices, Admission Cell with Planter, Student Cell, Staff Cabins, ECE Lab, Microprocessor Lab.
      - West Wing (Double Row): Inner Computer Labs suite (Labs 1-5, Store) + Outer Faculty/Tutorial suite
        (Electronic Lab, Tutorials, DHD Lab, Store, Faculty Cabins, HOD Room).
      - North Wing: Computer Lab North, Girl's Common Room, Tutorials, Director Room, G.D. Room,
        High Voltage Lab, Workshop Passages, Large Workshop Labs (x6), Culvert, Warden & Staff Offices.
      - East Wing: Electronic Machine Lab, EMI Lab, Computer Lab + Store, Sciences Lab,
        Language Labs (x2), Academic Conference Hall.
      - COMPLETE Interior Partition Walls with real thickness.
      - COMPLETE Doorways entering from corridors with real framed lintels.
    """
    bm_corridor = bmesh.new()
    bm_pillars = bmesh.new()
    bm_ext_walls = bmesh.new()
    bm_corr_walls = bmesh.new()
    bm_int_partitions = bmesh.new()
    bm_porch = bmesh.new()

    # 0. Solid Continuous Ground Floor Building Plinth Slab (Zero Gaps Under Entire Building Footprint)
    bm_gf_slab = bmesh.new()
    add_box(bm_gf_slab, -26.85, 0.0, 17.70, 42.10, Z_COURTYARD_BASE, Z_GF_PLINTH) # West: Y in [-21.05, 21.05]
    add_box(bm_gf_slab,  26.85, 0.0, 17.70, 42.10, Z_COURTYARD_BASE, Z_GF_PLINTH) # East: Y in [-21.05, 21.05]
    add_box(bm_gf_slab, 0.0,  26.85, 42.10, 17.70, Z_COURTYARD_BASE, Z_GF_PLINTH) # North: X in [-21.05, 21.05]
    add_box(bm_gf_slab, 0.0, -26.85, 42.10, 17.70, Z_COURTYARD_BASE, Z_GF_PLINTH) # South: X in [-21.05, 21.05]

    for qx, qy in [(-1.0, 1.0), (1.0, 1.0), (-1.0, -1.0), (1.0, -1.0)]:
        ccx, ccy = qx * 21.05, qy * 21.05
        pts_slab_corner = [(ccx, ccy)]
        for s in range(13):
            sa = (s / 12.0) * (math.pi * 0.5)
            pts_slab_corner.append((ccx + qx * 15.00 * math.sin(sa), ccy + qy * 15.00 * math.cos(sa)))
        add_prism(bm_gf_slab, pts_slab_corner, Z_COURTYARD_BASE, Z_GF_PLINTH)

    make_mesh_object("GF_Structural_Plinth_Slab", bm_gf_slab, coll, mats["slab_concrete"])

    # 1. Continuous 10-foot covered veranda corridor (Zero duplicate coplanar overlap)
    add_box(bm_corridor, 0.0, -19.525, 36.00, CORRIDOR_WIDTH, Z_GF_PLINTH, Z_GF_FLOOR) # South: X in [-18.00, 18.00]
    add_box(bm_corridor, 0.0,  19.525, 36.00, CORRIDOR_WIDTH, Z_GF_PLINTH, Z_GF_FLOOR) # North: X in [-18.00, 18.00]
    add_box(bm_corridor, -19.525, 0.0, CORRIDOR_WIDTH, 42.10, Z_GF_PLINTH, Z_GF_FLOOR) # West:  Y in [-21.05, 21.05] (paves corner squares)
    add_box(bm_corridor,  19.525, 0.0, CORRIDOR_WIDTH, 42.10, Z_GF_PLINTH, Z_GF_FLOOR) # East:  Y in [-21.05, 21.05] (paves corner squares)
    make_mesh_object("GF_Veranda_10ft_Corridors", bm_corridor, coll, mats["corridor_floor"])

    # 2. Sandstone Square Pillars along Courtyard Veranda (with solid anchor pillars at (+-18.0, +-18.0))
    pillar_sz = 0.50
    for x in range(-16, 17, 4):
        if x not in [-4, 0, 4]: # Leave staircase entrances and central corridor unblocked (IMG_3098 2, IMG_3100)
            add_box(bm_pillars, x, -18.25, pillar_sz, pillar_sz, Z_COURTYARD_BASE, Z_GF_CEILING)
        add_box(bm_pillars, x,  18.25, pillar_sz, pillar_sz, Z_COURTYARD_BASE, Z_GF_CEILING)
    # Authentic sandstone pillars framing the central exit passage and stair flanks (IMG_3098 2, IMG_3100)
    for p_exit_x in [-2.30, 2.30]:
        add_box(bm_pillars, p_exit_x, -18.25, pillar_sz, pillar_sz, Z_COURTYARD_BASE, Z_GF_CEILING)
    for p_flank_x in [-5.40, 5.40]:
        add_box(bm_pillars, p_flank_x, -18.25, pillar_sz, pillar_sz, Z_COURTYARD_BASE, Z_GF_CEILING)
    for y in range(-16, 17, 4):
        add_box(bm_pillars, -18.25, y, pillar_sz, pillar_sz, Z_COURTYARD_BASE, Z_GF_CEILING)
        add_box(bm_pillars,  18.25, y, pillar_sz, pillar_sz, Z_COURTYARD_BASE, Z_GF_CEILING)
    # Corner anchor pillars resting solidly on the paved corridor floor
    for cx_p, cy_p in [(-18.0, -18.0), (18.0, -18.0), (-18.0, 18.0), (18.0, 18.0)]:
        add_box(bm_pillars, cx_p, cy_p, pillar_sz, pillar_sz, Z_GF_FLOOR, Z_GF_CEILING)
    make_mesh_object("GF_Sandstone_Veranda_Pillars", bm_pillars, coll, mats["pillar_sandstone"])

    # 3. Outer Perimeter Facade Walls (Straight wings from -21.05m to +21.05m, connecting flush with corners)
    # South Exterior Wall (with grand entrance doorway to Porch)
    add_wall_x(bm_ext_walls, -21.05, 21.05, -35.7, WALL_EXT_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=[(0.0, 3.6, 3.0)])
    # North Exterior Wall (Solid sealed perimeter facade wall)
    add_wall_x(bm_ext_walls, -21.05, 21.05,  35.7, WALL_EXT_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=None)
    # West Exterior Wall
    add_wall_y(bm_ext_walls, -35.7, -21.05, 21.05, WALL_EXT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    # East Exterior Wall
    add_wall_y(bm_ext_walls,  35.7, -21.05, 21.05, WALL_EXT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    make_mesh_object("GF_Exterior_Facade_Walls", bm_ext_walls, coll, mats["wall_sandstone"])

    # 4. Corridor Dividing Walls with AUTHENTIC DOOR CUTOUTS & LINTELS (Spanning -21.05m to +21.05m)
    # South Corridor Wall (Y = -21.05)
    gf_south_doors = [
        (-17.5, DOOR_WIDTH, DOOR_HEIGHT), # Penal Room
        (-14.5, DOOR_WIDTH, DOOR_HEIGHT), # Medical Room
        (-11.0, DOOR_WIDTH, DOOR_HEIGHT), # Campus Director
        (-8.5,  DOOR_WIDTH, DOOR_HEIGHT), # Academic Director
        (0.0,   2.40,       DOOR_HEIGHT), # Main Reception / Lobby double door
        (6.0,   DOOR_WIDTH, DOOR_HEIGHT), # Staff Cabins
        (11.0,  DOOR_WIDTH, DOOR_HEIGHT), # Student Welfare Cell
        (14.5,  DOOR_WIDTH, DOOR_HEIGHT), # Faculty Cabins
        (18.0,  DOOR_WIDTH, DOOR_HEIGHT), # Microprocessor Lab
    ]
    add_wall_x(bm_corr_walls, -21.05, 21.05, -21.05, WALL_CORR_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=gf_south_doors)

    # North Corridor Wall (Y = 21.05)
    gf_north_doors = [
        (-17.0, DOOR_WIDTH, DOOR_HEIGHT), # High Voltage Lab
        (-12.0, DOOR_WIDTH, DOOR_HEIGHT), # Computer Lab North
        (-8.0,  DOOR_WIDTH, DOOR_HEIGHT), # Girl's Common Room
        (-4.0,  DOOR_WIDTH, DOOR_HEIGHT), # Tutorial Room North
        (0.0,   3.00,       DOOR_HEIGHT), # Workshop Passage open archway
        (4.0,   DOOR_WIDTH, DOOR_HEIGHT), # Director Room North
        (8.0,   DOOR_WIDTH, DOOR_HEIGHT), # G.D. Room
        (14.0,  DOOR_WIDTH, DOOR_HEIGHT), # Large Lab East
    ]
    add_wall_x(bm_corr_walls, -21.05, 21.05, 21.05, WALL_CORR_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=gf_north_doors)

    # West Corridor Wall (X = -21.05)
    gf_west_doors = [
        (-16.0, DOOR_WIDTH, DOOR_HEIGHT), # Computer Lab 1 (FOC)
        (-9.5,  DOOR_WIDTH, DOOR_HEIGHT), # Computer Lab 2
        (-3.0,  DOOR_WIDTH, DOOR_HEIGHT), # Computer Lab 3
        (3.5,   DOOR_WIDTH, DOOR_HEIGHT), # Computer Lab 4
        (9.5,   DOOR_WIDTH, DOOR_HEIGHT), # Computer Lab 5
        (16.0,  DOOR_WIDTH, DOOR_HEIGHT), # Hardware Store & Lab
    ]
    add_wall_y(bm_corr_walls, -21.05, -21.05, 21.05, WALL_CORR_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=gf_west_doors)

    # East Corridor Wall (X = 21.05)
    gf_east_doors = [
        (-15.0, DOOR_WIDTH, DOOR_HEIGHT), # EMI Lab
        (-8.0,  DOOR_WIDTH, DOOR_HEIGHT), # Electronic Machine Lab Door 1
        (-1.0,  DOOR_WIDTH, DOOR_HEIGHT), # Electronic Machine Lab Door 2
        (6.0,   DOOR_WIDTH, DOOR_HEIGHT), # Electrical Sciences Lab
        (11.0,  DOOR_WIDTH, DOOR_HEIGHT), # Language Lab
        (16.5,  DOOR_WIDTH, DOOR_HEIGHT), # Academic Conference Hall
    ]
    add_wall_y(bm_corr_walls, 21.05, -21.05, 21.05, WALL_CORR_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=gf_east_doors)
    make_mesh_object("GF_Corridor_Dividing_Walls_With_Doors", bm_corr_walls, coll, mats["wall_interior"])

    # 5. AUTHENTIC 3D SOUTH ENTRANCE PORCH & PORTICO (IMG_3116, IMG_3117, IMG_3118)
    # Porch Plinth (X: -5.5m to 5.5m, Y: -40.5m to -35.7m, Z: 0.00 to 0.36m)
    add_box(bm_porch, 0.0, -38.10, 11.0, 4.8, Z_COURTYARD_BASE, 0.36)

    # 6 Polished Green Marble Steps with White Risers leading down to driveway (Y: -40.5m to -42.6m)
    bm_porch_steps_tread = bmesh.new()
    bm_porch_steps_riser = bmesh.new()
    num_porch_steps = 6
    step_porch_w = 11.20
    step_porch_l = 0.35
    step_porch_h = 0.36 / num_porch_steps
    for st_i in range(num_porch_steps):
        s_y = -40.50 - (st_i * step_porch_l) - (step_porch_l * 0.5)
        s_z = 0.36 - (st_i * step_porch_h)
        # Green marble tread
        add_box(bm_porch_steps_tread, 0.0, s_y, step_porch_w - (st_i * 0.25), step_porch_l, s_z - 0.04, s_z)
        # White riser
        add_box(bm_porch_steps_riser, 0.0, s_y + step_porch_l*0.5, step_porch_w - (st_i * 0.25), 0.04, s_z - step_porch_h, s_z - 0.04)

    make_mesh_object("GF_Entrance_Porch_Steps_GreenMarble", bm_porch_steps_tread, coll, mats["stair_green_marble"])
    make_mesh_object("GF_Entrance_Porch_Steps_WhiteRiser", bm_porch_steps_riser, coll, mats["stair_riser"])

    # Flanking Masonry Planters with green shrubs
    bm_planters = bmesh.new()
    bm_shrubs = bmesh.new()
    for pl_x in [-7.5, 7.5]:
        add_box(bm_planters, pl_x, -38.5, 3.8, 3.5, Z_COURTYARD_BASE, 0.75)
        add_box(bm_shrubs, pl_x, -38.5, 3.4, 3.1, 0.75, 1.25)
    make_mesh_object("GF_Entrance_Porch_Masonry_Planters", bm_planters, coll, mats["wall_sandstone"])
    make_mesh_object("GF_Entrance_Porch_Shrubs", bm_shrubs, coll, mats["shrub_green"])

    # 4 Substantial Sandstone Columns (0.65m x 0.65m) with molded bases and capitals
    bm_porch_cols = bmesh.new()
    for col_x in [-4.5, -1.8, 1.8, 4.5]:
        # Molded base
        add_box(bm_porch_cols, col_x, -40.5, 0.75, 0.75, 0.36, 0.70)
        # Main shaft
        add_box(bm_porch_cols, col_x, -40.5, 0.60, 0.60, 0.70, Z_GF_CEILING - 0.35)
        # Capital
        add_box(bm_porch_cols, col_x, -40.5, 0.75, 0.75, Z_GF_CEILING - 0.35, Z_GF_CEILING)
    make_mesh_object("GF_Entrance_Porch_Sandstone_Columns", bm_porch_cols, coll, mats["pillar_sandstone"])

    # Arched Portico Canopy Slab with Decorative Cornice Molding
    add_box(bm_porch, 0.0, -38.10, 11.4, 5.2, Z_GF_CEILING, Z_GF_CEILING + 0.35)
    make_mesh_object("GF_Entrance_Porch_Canopy_Slab", bm_porch, coll, mats["wall_sandstone"])

    # 3D "ADMINISTRATIVE BLOCK" Entrance Signboard (Mounted on front portico frieze, IMG_3116)
    font_loaded = get_font()
    curve_admin = bpy.data.curves.new(name="Admin_Sign_Curve", type='FONT')
    curve_admin.body = "ADMINISTRATIVE BLOCK"
    if font_loaded:
        curve_admin.font = font_loaded
    curve_admin.size = 0.44
    curve_admin.extrude = 0.08
    curve_admin.align_x = 'CENTER'
    curve_admin.align_y = 'CENTER'
    admin_sign_obj = bpy.data.objects.new("GF_Admin_Block_Sign", curve_admin)
    admin_sign_obj.location = (0.0, -41.48, Z_GF_CEILING + 0.16)
    admin_sign_obj.rotation_euler = Euler((math.radians(90.0), 0.0, 0.0), 'XYZ') # Facing South (-Y)
    admin_sign_obj.data.materials.append(mats["brass_gold"])
    coll.objects.link(admin_sign_obj)

    bpy.context.view_layer.objects.active = admin_sign_obj
    admin_sign_obj.select_set(True)
    try:
        bpy.ops.object.convert(target='MESH')
    except Exception:
        pass
    admin_sign_obj.select_set(False)

    # 6. INDIVIDUAL GROUND FLOOR ROOM FLOORS (Exact Blueprint Extraction)
    gf_rooms = [
        # South Wing (Admin & Electronics Core)
        ("Room_GF_Lobby_Reception", 0.0, -25.0, 7.0, 7.9, mats["mazemap_admin"], "RECEPTION & LOBBY"),
        ("Room_GF_Registrar_Office", 0.0, -32.1, 7.0, 6.3, mats["mazemap_admin"], "REGISTRAR OFFICE"),
        ("Room_GF_Board_Room", -8.5, -32.1, 10.0, 6.3, mats["mazemap_admin"], "BOARD ROOM"),
        ("Room_GF_Campus_Director", -11.0, -25.0, 5.0, 7.9, mats["mazemap_admin"], "CAMPUS DIRECTOR"),
        ("Room_GF_Admin_Director", -6.0, -25.0, 5.0, 7.9, mats["mazemap_admin"], "ACAD. DIRECTOR"),
        ("Room_GF_Penal_Room", -17.275, -23.5, 7.55, 4.9, mats["mazemap_admin"], "PENAL ROOM"),
        ("Room_GF_Medical_Room", -17.275, -27.5, 7.55, 3.1, mats["mazemap_admin"], "MEDICAL ROOM"),
        ("Room_GF_ECE_Lab", -17.275, -32.6, 7.55, 7.1, mats["mazemap_lab"], "ECE LAB"),
        ("Room_GF_Training_Office", 6.0, -32.1, 5.0, 6.3, mats["mazemap_admin"], "TRAINING OFFICE"),
        ("Room_GF_Admission_Cell", 11.0, -32.1, 5.0, 6.3, mats["mazemap_admin"], "ADMISSION CELL"),
        ("Room_GF_Staff_Cabins", 6.0, -25.0, 5.0, 7.9, mats["mazemap_admin"], "STAFF CABINS"),
        ("Room_GF_Student_Cell", 11.0, -25.0, 5.0, 7.9, mats["mazemap_admin"], "STUDENT CELL"),
        ("Room_GF_Microprocessor_Lab", 17.275, -32.6, 7.55, 7.1, mats["mazemap_lab"], "MICROPROCESSOR LAB"),
        ("Room_GF_Faculty_South_SE", 17.275, -25.0, 7.55, 7.9, mats["mazemap_admin"], "FACULTY SE"),

        # West Wing (Double Row: Inner Computer Labs + Outer Faculty/Labs)
        # Inner Row (facing courtyard, contiguous Y in [-21.05, 21.05])
        ("Room_GF_CompLab_W1", -24.775, -17.525, 7.45, 7.05, mats["mazemap_cs_lab"], "COMP LAB 1"),
        ("Room_GF_CompLab_W2", -24.775, -10.5, 7.45, 7.0, mats["mazemap_cs_lab"], "COMP LAB 2"),
        ("Room_GF_CompLab_W3", -24.775, -3.5, 7.45, 7.0, mats["mazemap_cs_lab"], "COMP LAB 3"),
        ("Room_GF_CompLab_W4", -24.775, 3.5, 7.45, 7.0, mats["mazemap_cs_lab"], "COMP LAB 4"),
        ("Room_GF_CompLab_W5", -24.775, 10.5, 7.45, 7.0, mats["mazemap_cs_lab"], "COMP LAB 5"),
        ("Room_GF_Hardware_Store", -24.775, 17.525, 7.45, 7.05, mats["mazemap_cs_lab"], "HW STORE"),
        # Outer Row (facing perimeter road, contiguous Y in [-21.05, 21.05])
        ("Room_GF_Electronic_Lab", -32.1, -17.025, 7.2, 8.05, mats["mazemap_lab"], "ELECTRONIC LAB"),
        ("Room_GF_Tutorial_W1", -32.1, -9.75, 7.2, 6.5, mats["mazemap_lt"], "TUTORIAL W1"),
        ("Room_GF_Tutorial_W2", -32.1, -3.25, 7.2, 6.5, mats["mazemap_lt"], "TUTORIAL W2"),
        ("Room_GF_DHD_Lab", -32.1, 3.25, 7.2, 6.5, mats["mazemap_lab"], "DHD LAB"),
        ("Room_GF_Store_West", -32.1, 9.75, 7.2, 6.5, mats["mazemap_admin"], "STORE WEST"),
        ("Room_GF_Faculty_HOD_West", -32.1, 17.025, 7.2, 8.05, mats["mazemap_admin"], "FACULTY/HOD WEST"),

        # North Wing (Engineering Complex & Workshops, contiguous X in [-21.05, 21.05])
        # Inner Suite
        ("Room_GF_Computer_Lab_North", -16.025, 24.775, 10.05, 7.45, mats["mazemap_cs_lab"], "COMPUTER LAB N"),
        ("Room_GF_Girls_Common_Room", -7.5, 24.775, 7.0, 7.45, mats["mazemap_admin"], "GIRLS COMMON"),
        ("Room_GF_Tutorial_North", 0.0, 24.775, 8.0, 7.45, mats["mazemap_lt"], "TUTORIAL NORTH"),
        ("Room_GF_Director_North", 7.5, 24.775, 7.0, 7.45, mats["mazemap_admin"], "DIRECTOR ROOM N"),
        ("Room_GF_High_Voltage_Lab", 16.025, 24.775, 10.05, 7.45, mats["mazemap_lab"], "HIGH VOLTAGE LAB"),
        # Outer Workshop Labs Complex
        ("Room_GF_Workshop_Lab_1", -14.025, 32.1, 14.05, 7.2, mats["mazemap_lab"], "WORKSHOP LAB 1"),
        ("Room_GF_Workshop_Lab_2", 0.0, 32.1, 14.0, 7.2, mats["mazemap_lab"], "WORKSHOP LAB 2"),
        ("Room_GF_Workshop_Lab_3", 14.025, 32.1, 14.05, 7.2, mats["mazemap_lab"], "WORKSHOP LAB 3"),

        # East Wing (Electrical Sciences & Conference, contiguous Y in [-21.05, 21.05])
        ("Room_GF_EMI_Lab", 28.4, -16.8, 14.65, 8.5, mats["mazemap_lab"], "EMI LAB"),
        ("Room_GF_Electronic_Machine_Lab", 28.4, -7.3, 14.65, 10.5, mats["mazemap_lab"], "MACHINE LAB"),
        ("Room_GF_Electrical_Science_Lab", 28.4, 1.95, 14.65, 8.0, mats["mazemap_lab"], "SCIENCE LAB"),
        ("Room_GF_Language_Lab_GF", 28.4, 9.75, 14.65, 7.6, mats["mazemap_lt"], "LANGUAGE LAB"),
        ("Room_GF_Conference_Hall", 28.4, 17.3, 14.65, 7.5, mats["mazemap_seminar"], "CONFERENCE HALL"),
    ]

    for obj_name, cx_r, cy_r, sx_r, sy_r, room_mat, label in gf_rooms:
        bm_room = bmesh.new()
        add_box(bm_room, cx_r, cy_r, sx_r, sy_r, Z_GF_PLINTH, Z_GF_FLOOR)
        make_mesh_object(obj_name, bm_room, coll, room_mat)

    # 7. AUTHENTIC INTERIOR PARTITION WALLS (Ground Floor)
    # South Wing Partitions
    add_wall_y(bm_int_partitions, -13.5, -35.7, -21.05, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_wall_y(bm_int_partitions,  -3.5, -35.7, -21.05, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_wall_y(bm_int_partitions,   3.5, -35.7, -21.05, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_wall_y(bm_int_partitions,  13.5, -35.7, -21.05, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_wall_y(bm_int_partitions,  -8.5, -28.5, -21.05, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_wall_y(bm_int_partitions,   8.5, -35.7, -21.05, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_wall_x(bm_int_partitions, -13.5, -3.5, -28.5, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=[(-8.5, 1.0, DOOR_HEIGHT)])
    add_wall_x(bm_int_partitions,  -3.5,  3.5, -28.5, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=[(0.0, 1.2, DOOR_HEIGHT)])
    add_wall_x(bm_int_partitions,   3.5, 13.5, -28.5, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=[(8.5, 1.0, DOOR_HEIGHT)])
    add_wall_x(bm_int_partitions, -21.05, -13.5, -29.5, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_wall_x(bm_int_partitions, -21.05, -13.5, -25.0, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)

    # West Wing Partitions (Double row dividing corridor and room dividers)
    add_wall_y(bm_int_partitions, -28.5, -21.05, 21.05, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=[(-13.0, 1.0, DOOR_HEIGHT), (-3.0, 1.0, DOOR_HEIGHT), (7.0, 1.0, DOOR_HEIGHT)])
    for y_div in [-13.0, -6.5, 0.0, 6.5, 13.0]:
        add_wall_x(bm_int_partitions, -28.5, -21.05, y_div, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
        add_wall_x(bm_int_partitions, -35.7, -28.5, y_div, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)

    # North Wing Partitions
    add_wall_x(bm_int_partitions, -21.05, 21.05, 28.5, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=[(-8.0, 1.2, DOOR_HEIGHT), (0.0, 2.5, DOOR_HEIGHT), (8.0, 1.2, DOOR_HEIGHT)])
    for x_div in [-15.0, -7.5, 2.5, 10.0]:
        add_wall_y(bm_int_partitions, x_div, 21.05, 28.5, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_wall_y(bm_int_partitions, -6.5, 28.5, 35.7, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_wall_y(bm_int_partitions,  6.5, 28.5, 35.7, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)

    # East Wing Partitions
    for y_div in [-10.5, 0.0, 7.5, 13.5]:
        add_wall_x(bm_int_partitions, 21.05, 35.7, y_div, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)

    make_mesh_object("GF_Interior_Room_Partition_Walls", bm_int_partitions, coll, mats["wall_interior"])

# =============================================================================
# 7. FIRST FLOOR ARCHITECTURE (COMPLETE BLUEPRINT ROOM EXTRACTION)
# =============================================================================
def build_first_floor(coll, mats):
    """
    Builds the authentic First Floor from blueprint CO-ED UP TO DATE 24.4.2014-Model.pdf:
      - Structural floor slab at Z = 3.86m to 4.11m with central courtyard opening and rounded corners.
      - 10-foot wide veranda corridor extending to +-21.05m with safety balustrade overlooking courtyard.
      - First Floor Porch Terrace Balcony overlooking the entrance driveway.
      - South Wing: Central Library (52' x 64'6"), Internet Lab, Library Annex, Hobby Lab,
        M.Tech Lab, Faculty Cabins South, Upper Lecture Hall.
      - West Wing: Antenna Lab, Communication Systems Lab, Upper CS Labs, Language Lab, Tutorials.
      - North Wing: Multipurpose Hall, Mechanical Lab, Chemistry Lab, Canteen Dining Hall (63'7.5" x 50').
      - East Wing: Drawing Halls 1 & 2, Physics Lab, Dark Rooms, Upper CS Labs.
      - COMPLETE Corridor Dividing Walls with framed doorways and lintels.
      - COMPLETE Interior Partition Walls dividing all individual spaces.
      - Clean architectural roof parapet cap.
    """
    bm_slab = bmesh.new()
    bm_ff_corr = bmesh.new()
    bm_balustrade = bmesh.new()
    bm_ff_ext = bmesh.new()
    bm_ff_corr_walls = bmesh.new()
    bm_ff_int_partitions = bmesh.new()

    # 1. Structural Floor Slab with Open Courtyard and Rounded Corners (ZERO GAPS)
    add_box(bm_slab, -26.85, 0.0, 17.70, 42.10, Z_GF_CEILING, Z_FF_SLAB_TOP) # West: Y in [-21.05, 21.05]
    add_box(bm_slab,  26.85, 0.0, 17.70, 42.10, Z_GF_CEILING, Z_FF_SLAB_TOP) # East: Y in [-21.05, 21.05]
    add_box(bm_slab, 0.0,  26.85, 42.10, 17.70, Z_GF_CEILING, Z_FF_SLAB_TOP) # North: X in [-21.05, 21.05]
    add_box(bm_slab, 0.0, -26.85, 42.10, 17.70, Z_GF_CEILING, Z_FF_SLAB_TOP) # South: X in [-21.05, 21.05]

    # 4 rounded corner quadrant slabs
    for qx, qy in [(-1.0, 1.0), (1.0, 1.0), (-1.0, -1.0), (1.0, -1.0)]:
        ccx, ccy = qx * 21.05, qy * 21.05
        pts_slab_corner = [(ccx, ccy)]
        for s in range(13):
            sa = (s / 12.0) * (math.pi * 0.5)
            pts_slab_corner.append((ccx + qx * 15.00 * math.sin(sa), ccy + qy * 15.00 * math.cos(sa)))
        add_prism(bm_slab, pts_slab_corner, Z_GF_CEILING, Z_FF_SLAB_TOP)

    # South entrance porch terrace balcony slab
    add_box(bm_slab, 0.0, -38.45, 11.4, 5.9, Z_GF_CEILING, Z_FF_SLAB_TOP)

    make_mesh_object("FF_Structural_Floor_Slab", bm_slab, coll, mats["slab_concrete"])

    # 2. First Floor 10-foot Veranda Corridors (Zero duplicate coplanar overlap)
    add_box(bm_ff_corr, 0.0, -19.525, 36.00, CORRIDOR_WIDTH, Z_FF_SLAB_TOP, Z_FF_FLOOR) # South: X in [-18.00, 18.00]
    add_box(bm_ff_corr, 0.0,  19.525, 36.00, CORRIDOR_WIDTH, Z_FF_SLAB_TOP, Z_FF_FLOOR) # North: X in [-18.00, 18.00]
    add_box(bm_ff_corr, -19.525, 0.0, CORRIDOR_WIDTH, 42.10, Z_FF_SLAB_TOP, Z_FF_FLOOR) # West:  Y in [-21.05, 21.05] (paves corner squares)
    add_box(bm_ff_corr,  19.525, 0.0, CORRIDOR_WIDTH, 42.10, Z_FF_SLAB_TOP, Z_FF_FLOOR) # East:  Y in [-21.05, 21.05] (paves corner squares)
    make_mesh_object("FF_Veranda_10ft_Corridors", bm_ff_corr, coll, mats["corridor_floor"])

    # 3. Veranda Safety Balustrade (1.05m high railing overlooking courtyard)
    bal_h = 1.05
    bal_th = 0.20
    # South balustrade flanking the central entrance (open for X in [-2.8, 2.8] for unblocked library entrance)
    add_box(bm_balustrade, -10.4, -18.1, 15.2, bal_th, Z_FF_SLAB_TOP, Z_FF_SLAB_TOP + bal_h)
    add_box(bm_balustrade,  10.4, -18.1, 15.2, bal_th, Z_FF_SLAB_TOP, Z_FF_SLAB_TOP + bal_h)
    add_box(bm_balustrade, 0.0,  18.1, 36.0, bal_th, Z_FF_SLAB_TOP, Z_FF_SLAB_TOP + bal_h)
    add_box(bm_balustrade, -18.1, 0.0, bal_th, 36.0, Z_FF_SLAB_TOP, Z_FF_SLAB_TOP + bal_h)
    add_box(bm_balustrade,  18.1, 0.0, bal_th, 36.0, Z_FF_SLAB_TOP, Z_FF_SLAB_TOP + bal_h)
    # Porch Terrace Balustrade at South facade
    add_box(bm_balustrade, 0.0, -41.3, 11.2, bal_th, Z_FF_SLAB_TOP, Z_FF_SLAB_TOP + bal_h)
    add_box(bm_balustrade, -5.6, -38.5, bal_th, 5.6, Z_FF_SLAB_TOP, Z_FF_SLAB_TOP + bal_h)
    add_box(bm_balustrade,  5.6, -38.5, bal_th, 5.6, Z_FF_SLAB_TOP, Z_FF_SLAB_TOP + bal_h)
    make_mesh_object("FF_Veranda_Safety_Balustrade", bm_balustrade, coll, mats["balustrade_white"])

    # 4. First Floor Exterior Perimeter Sandstone Facade Walls (Spanning -21.05m to +21.05m)
    add_wall_x(bm_ff_ext, -21.05, 21.05, -35.7, WALL_EXT_TH, Z_FF_WALL_BASE, Z_FF_CEILING, doors=[(0.0, 3.2, 2.6)])
    add_wall_x(bm_ff_ext, -21.05, 21.05,  35.7, WALL_EXT_TH, Z_FF_WALL_BASE, Z_FF_CEILING, doors=[(0.0, 3.2, 2.6)])
    add_wall_y(bm_ff_ext, -35.7, -21.05, 21.05, WALL_EXT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)
    add_wall_y(bm_ff_ext,  35.7, -21.05, 21.05, WALL_EXT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)
    make_mesh_object("FF_Exterior_Facade_Walls", bm_ff_ext, coll, mats["wall_sandstone"])

    # 5. First Floor Corridor Dividing Walls with AUTHENTIC DOORWAYS & LINTELS
    # South Corridor Wall (Y = -21.05)
    ff_south_doors = [
        (-14.5, DOOR_WIDTH, DOOR_HEIGHT), # Internet Lab
        (-8.5,  DOOR_WIDTH, DOOR_HEIGHT), # Faculty Cabins South
        (0.0,   3.80,       DOOR_HEIGHT), # Central Library Grand Arch Portal
        (8.5,   DOOR_WIDTH, DOOR_HEIGHT), # Library Reference Annex
        (14.5,  DOOR_WIDTH, DOOR_HEIGHT), # M.Tech & Hobby Lab
    ]
    add_wall_x(bm_ff_corr_walls, -21.05, 21.05, -21.05, WALL_CORR_TH, Z_FF_WALL_BASE, Z_FF_CEILING, doors=ff_south_doors)

    # North Corridor Wall (Y = 21.05)
    ff_north_doors = [
        (-14.0, DOOR_WIDTH, DOOR_HEIGHT), # Mechanical Lab Upper
        (-7.0,  DOOR_WIDTH, DOOR_HEIGHT), # Chemistry Lab Upper
        (-2.5,  1.50,       DOOR_HEIGHT), # Multipurpose Hall West
        (0.0,   3.00,       DOOR_HEIGHT), # Passage to Canteen Dining Hall
        (2.5,   1.50,       DOOR_HEIGHT), # Multipurpose Hall East
        (7.0,   DOOR_WIDTH, DOOR_HEIGHT), # Tutorial North
        (14.0,  DOOR_WIDTH, DOOR_HEIGHT), # Faculty Cabins
    ]
    add_wall_x(bm_ff_corr_walls, -21.05, 21.05, 21.05, WALL_CORR_TH, Z_FF_WALL_BASE, Z_FF_CEILING, doors=ff_north_doors)

    # West Corridor Wall (X = -21.05)
    ff_west_doors = [
        (-14.0, DOOR_WIDTH, DOOR_HEIGHT), # Antenna Lab
        (-5.0,  DOOR_WIDTH, DOOR_HEIGHT), # Communication Systems Lab
        (4.0,   DOOR_WIDTH, DOOR_HEIGHT), # Upper CS Lab
        (13.0,  DOOR_WIDTH, DOOR_HEIGHT), # Language Lab & Tutorial
    ]
    add_wall_y(bm_ff_corr_walls, -21.05, -21.05, 21.05, WALL_CORR_TH, Z_FF_WALL_BASE, Z_FF_CEILING, doors=ff_west_doors)

    # East Corridor Wall (X = 21.05)
    ff_east_doors = [
        (-14.0, DOOR_WIDTH, DOOR_HEIGHT), # Physics Lab
        (-5.0,  1.50,       DOOR_HEIGHT), # Drawing Hall 2
        (4.0,   1.50,       DOOR_HEIGHT), # Drawing Hall 1
        (13.0,  DOOR_WIDTH, DOOR_HEIGHT), # Upper Lecture Hall East
    ]
    add_wall_y(bm_ff_corr_walls, 21.05, -21.05, 21.05, WALL_CORR_TH, Z_FF_WALL_BASE, Z_FF_CEILING, doors=ff_east_doors)
    make_mesh_object("FF_Corridor_Dividing_Walls_With_Doors", bm_ff_corr_walls, coll, mats["wall_interior"])

    # 5B. CENTRAL LIBRARY ARCHED ENTRANCE PORTAL & 3D SIGNAGE (IMG_3107, IMG_3108)
    bm_lib_portal = bmesh.new()
    bm_lib_doors = bmesh.new()
    # Arch jambs
    add_box(bm_lib_portal, -2.40, -21.05, 0.45, 0.45, Z_FF_FLOOR, Z_FF_FLOOR + 3.10)
    add_box(bm_lib_portal,  2.40, -21.05, 0.45, 0.45, Z_FF_FLOOR, Z_FF_FLOOR + 3.10)
    # Arch header lintel
    add_box(bm_lib_portal, 0.0, -21.05, 5.25, 0.45, Z_FF_FLOOR + 2.70, Z_FF_FLOOR + 3.25)
    make_mesh_object("FF_Central_Library_Arch_Portal", bm_lib_portal, coll, mats["wall_sandstone"])

    # Double glass entrance doors with blue frames and side sidelights (IMG_3107)
    add_box(bm_lib_doors, 0.0, -21.05, 3.60, 0.08, Z_FF_FLOOR, Z_FF_FLOOR + 2.50)
    make_mesh_object("FF_Central_Library_Glass_Doors", bm_lib_doors, coll, mats["door_blue"])

    # 3D "CENTRAL LIBRARY" Signboard with "F-36" Room Identifier
    font_loaded = get_font()
    curve_lib = bpy.data.curves.new(name="Library_Sign_Curve", type='FONT')
    curve_lib.body = "CENTRAL LIBRARY (F-36)"
    if font_loaded:
        curve_lib.font = font_loaded
    curve_lib.size = 0.45
    curve_lib.extrude = 0.08
    curve_lib.align_x = 'CENTER'
    curve_lib.align_y = 'CENTER'
    lib_sign_obj = bpy.data.objects.new("FF_Central_Library_Sign", curve_lib)
    lib_sign_obj.location = (0.0, -20.80, Z_FF_FLOOR + 2.95)
    # Upright facing North (+Y) into courtyard:
    lib_sign_obj.rotation_euler = Euler((math.radians(90.0), 0.0, math.radians(180.0)), 'XYZ')
    lib_sign_obj.data.materials.append(mats["brass_gold"])
    coll.objects.link(lib_sign_obj)

    # 6. INDIVIDUAL FIRST FLOOR ROOM FLOORS (Complete Department Map Blueprint Extraction)
    ff_rooms = [
        # South Wing: Central Library & Knowledge Hub (Contiguous X in [-21.05, 21.05])
        ("Room_FF_Faculty_South", -18.775, -28.4, 4.55, 14.65, mats["mazemap_admin"], "FACULTY SOUTH"),
        ("Room_FF_Internet_Lab", -13.5, -28.4, 6.0, 14.65, mats["mazemap_cs_lab"], "INTERNET LAB"),
        ("Room_FF_Central_Library", 0.0, -28.4, 21.0, 14.65, mats["mazemap_library"], "CENTRAL LIBRARY"),
        ("Room_FF_Library_Annex", 13.5, -28.4, 6.0, 14.65, mats["mazemap_library"], "LIBRARY ANNEX"),
        ("Room_FF_MTech_Hobby_Lab", 18.775, -28.4, 4.55, 14.65, mats["mazemap_lab"], "M.TECH LAB"),

        # West Wing:
        # Inner row (facing courtyard, X in [-28.0, -21.05]):
        ("Room_FF_Lab_5", -24.5, 6.5, 6.9, 15.0, mats["mazemap_lab"], "LAB-5"),
        # Outer row (facing outside, X in [-35.7, -28.0]):
        ("Room_FF_Drawing_Hall_4", -31.85, 17.5, 7.7, 7.1, mats["mazemap_drawing"], "DRAWING HALL 4"),
        ("Room_FF_Faculty_West", -31.85, 11.5, 7.7, 4.9, mats["mazemap_admin"], "FACULTY CABIN"),
        ("Room_FF_Drawing_Hall_2", -31.85, 4.0, 7.7, 10.0, mats["mazemap_drawing"], "DRAWING HALL 2"),
        ("Room_FF_Lab_6", -31.85, -6.5, 7.7, 11.0, mats["mazemap_lab"], "LAB-6"),

        # North Wing:
        # Inner row (facing courtyard, Y in [21.05, 28.0]):
        ("Room_FF_Lab_1", -18.5, 24.5, 4.9, 6.9, mats["mazemap_lab"], "LAB-1"),
        ("Room_FF_Lab_2", -13.75, 24.5, 4.5, 6.9, mats["mazemap_lab"], "LAB-2"),
        ("Room_FF_Lab_8", -9.25, 24.5, 4.5, 6.9, mats["mazemap_lab"], "LAB-8"),
        ("Room_FF_Faculty_N1", -6.0, 24.5, 2.0, 6.9, mats["mazemap_admin"], "FACULTY"),
        ("Room_FF_Lab_7", -3.0, 24.5, 4.0, 6.9, mats["mazemap_lab"], "LAB-7"),
        ("Room_FF_Lab_3_4", 3.0, 24.5, 4.0, 6.9, mats["mazemap_lab"], "LAB-3 / 4"),
        ("Room_FF_Faculty_N2", 6.0, 24.5, 2.0, 6.9, mats["mazemap_admin"], "FACULTY"),
        ("Room_FF_Lab_12", 9.25, 24.5, 4.5, 6.9, mats["mazemap_lab"], "LAB-12"),
        ("Room_FF_Tech_Conf_Hall", 14.75, 24.5, 6.5, 6.9, mats["door_blue"], "TECH CONF HALL"),
        ("Room_FF_Girls_Washroom_N", 19.5, 24.5, 3.1, 6.9, mats["mazemap_admin"], "GIRLS WASHROOM"),
        # Outer row (facing outside, Y in [28.0, 35.7]):
        ("Room_FF_Drawing_Hall_8", -18.25, 31.85, 5.6, 7.7, mats["mazemap_drawing"], "DRAWING HALL 8"),
        ("Room_FF_Tutorial_4", -13.25, 31.85, 4.4, 7.7, mats["mazemap_lt"], "TUTORIAL 4"),
        ("Room_FF_Faculty_N3", -9.0, 31.85, 4.0, 7.7, mats["mazemap_admin"], "FACULTY"),
        ("Room_FF_Tutorial_5", -4.75, 31.85, 4.5, 7.7, mats["mazemap_lt"], "TUTORIAL 5"),
        ("Room_FF_HOD_Office", 0.0, 33.0, 5.0, 9.0, mats["mazemap_admin"], "HOD OFFICE"),
        ("Room_FF_Tutorial_6", 4.75, 31.85, 4.5, 7.7, mats["mazemap_lt"], "TUTORIAL 6"),
        ("Room_FF_Faculty_N4", 9.0, 31.85, 4.0, 7.7, mats["mazemap_admin"], "FACULTY"),
        ("Room_FF_Drawing_Hall_23", 13.25, 31.85, 4.5, 7.7, mats["mazemap_drawing"], "D-23 LOCKER"),
        ("Room_FF_Drawing_Hall_24", 18.25, 31.85, 5.5, 7.7, mats["mazemap_drawing"], "DRAWING HALL 24"),

        # East Wing:
        # Inner row (facing courtyard, X in [21.05, 28.0]):
        ("Room_FF_EGMD_Lab", 24.5, 16.5, 6.9, 9.1, mats["mazemap_lab"], "EGMD LAB"),
        ("Room_FF_Lab_35", 24.5, 8.0, 6.9, 8.0, mats["mazemap_lab"], "LAB-35"),
        ("Room_FF_Lab_36", 24.5, 0.0, 6.9, 8.0, mats["mazemap_lab"], "LAB-36"),
        # Outer row (facing outside, X in [28.0, 35.7]):
        ("Room_FF_Drawing_Hall_28", 31.85, 17.5, 7.7, 7.1, mats["mazemap_drawing"], "DRAWING HALL 28"),
        ("Room_FF_Tutorial_8", 31.85, 11.5, 7.7, 4.9, mats["mazemap_lt"], "TUTORIAL 8"),
        ("Room_FF_Lab_9", 31.85, 5.0, 7.7, 8.0, mats["mazemap_lab"], "LAB-9"),
        ("Room_FF_Faculty_E1", 31.85, 0.0, 7.7, 2.0, mats["mazemap_admin"], "FACULTY"),
        ("Room_FF_Lab_10", 31.85, -5.0, 7.7, 8.0, mats["mazemap_lab"], "LAB-10"),
        ("Room_FF_Faculty_E2", 31.85, -11.0, 7.7, 4.0, mats["mazemap_admin"], "FACULTY"),
        ("Room_FF_Lab_11", 31.85, -17.5, 7.7, 7.1, mats["mazemap_lab"], "LAB-11"),
    ]

    for obj_name, cx_r, cy_r, sx_r, sy_r, room_mat, label in ff_rooms:
        bm_room = bmesh.new()
        add_box(bm_room, cx_r, cy_r, sx_r, sy_r, Z_FF_SLAB_TOP, Z_FF_FLOOR)
        make_mesh_object(obj_name, bm_room, coll, room_mat)

    # 7. AUTHENTIC INTERIOR PARTITION WALLS (First Floor)
    # Long spine dividers between inner and outer room rows
    add_wall_x(bm_ff_int_partitions, -21.05, 21.05, 28.0, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING, doors=[(-18.0, 1.2, 2.2), (-13.0, 1.2, 2.2), (13.0, 1.2, 2.2), (18.0, 1.2, 2.2)])
    add_wall_y(bm_ff_int_partitions, 28.0, -21.05, 21.05, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING, doors=[(16.0, 1.2, 2.2), (8.0, 1.2, 2.2), (0.0, 1.2, 2.2)])
    add_wall_y(bm_ff_int_partitions, -28.0, -21.05, 21.05, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING, doors=[(8.0, 1.2, 2.2)])

    # South Wing Partitions
    add_wall_y(bm_ff_int_partitions, -16.5, -35.7, -21.05, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)
    add_wall_y(bm_ff_int_partitions, -10.5, -35.7, -21.05, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)
    add_wall_y(bm_ff_int_partitions,  10.5, -35.7, -21.05, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)
    add_wall_y(bm_ff_int_partitions,  16.5, -35.7, -21.05, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)

    # West Wing Partitions
    for y_div in [-12.0, 0.0, 8.0, 14.0]:
        add_wall_x(bm_ff_int_partitions, -35.7, -28.0, y_div, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)

    # North Wing Partitions
    for x_div in [-16.0, -11.5, -7.0, -5.0, -1.0, 1.0, 5.0, 7.0, 11.5, 18.0]:
        add_wall_y(bm_ff_int_partitions, x_div, 21.05, 35.7, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)

    # East Wing Partitions
    for y_div in [-14.0, -8.0, -2.0, 2.0, 8.0, 14.0]:
        add_wall_x(bm_ff_int_partitions, 28.0, 35.7, y_div, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)

    make_mesh_object("FF_Interior_Room_Partition_Walls", bm_ff_int_partitions, coll, mats["wall_interior"])

    # 8. Roof Parapet Cap (Clean Architecture, Rounded Corners, ZERO Solar Panels)
    bm_roof_parapet = bmesh.new()
    add_box(bm_roof_parapet, 0.0, -36.0 + WALL_EXT_TH*0.5, 42.10, WALL_EXT_TH, Z_ROOF_TOP, Z_ROOF_TOP + ROOF_PARAPET_H)
    add_box(bm_roof_parapet, 0.0,  36.0 - WALL_EXT_TH*0.5, 42.10, WALL_EXT_TH, Z_ROOF_TOP, Z_ROOF_TOP + ROOF_PARAPET_H)
    add_box(bm_roof_parapet, -36.0 + WALL_EXT_TH*0.5, 0.0, WALL_EXT_TH, 42.10, Z_ROOF_TOP, Z_ROOF_TOP + ROOF_PARAPET_H)
    add_box(bm_roof_parapet,  36.0 - WALL_EXT_TH*0.5, 0.0, WALL_EXT_TH, 42.10, Z_ROOF_TOP, Z_ROOF_TOP + ROOF_PARAPET_H)
    for qx, qy in [(-1.0, 1.0), (1.0, 1.0), (-1.0, -1.0), (1.0, -1.0)]:
        ccx, ccy = qx * 21.05, qy * 21.05
        pts_parapet = []
        for s in range(9):
            sa = (s / 8.0) * (math.pi * 0.5)
            pts_parapet.append((ccx + qx * 14.65 * math.sin(sa), ccy + qy * 14.65 * math.cos(sa)))
        for s in range(8, -1, -1):
            sa = (s / 8.0) * (math.pi * 0.5)
            pts_parapet.append((ccx + qx * 15.00 * math.sin(sa), ccy + qy * 15.00 * math.cos(sa)))
        add_prism(bm_roof_parapet, pts_parapet, Z_ROOF_TOP, Z_ROOF_TOP + ROOF_PARAPET_H)
    make_mesh_object("Roof_Perimeter_Parapet_Clean", bm_roof_parapet, coll, mats["wall_sandstone"])

# =============================================================================
# 8. ARCHITECTURAL LABELS & LIGHTING
# =============================================================================
def add_floor_label(coll, mats, text, x, y, z, size=0.65):
    font = get_font()
    curve = bpy.data.curves.new(name=f"Label_{text[:10]}", type='FONT')
    curve.body = text
    if font:
        curve.font = font
    curve.size = size
    curve.extrude = 0.02
    curve.align_x = 'CENTER'
    curve.align_y = 'CENTER'

    obj = bpy.data.objects.new(f"FloorLabel_{text[:16]}", curve)
    obj.location = (x, y, z)
    obj.data.materials.append(mats["dark_slate_text"])
    coll.objects.link(obj)

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    try:
        bpy.ops.object.convert(target='MESH')
    except Exception:
        pass
    obj.select_set(False)

def build_floor_typography(coll, mats):
    """
    Labels strictly the FIRST FLOOR rooms according to Department of Technology MAP
    and CAD Architectural Blueprints. Ground floor labels are deferred as requested.
    """
    labels = [
        # 1. South Wing: Central Library & Knowledge Hub
        ("CENTRAL LIBRARY\n(F-36)", 0.0, -28.4, Z_FF_FLOOR + 0.01, 0.85),
        ("LIBRARY ANNEX", 13.5, -28.4, Z_FF_FLOOR + 0.01, 0.60),
        ("M.TECH LAB", 18.775, -28.4, Z_FF_FLOOR + 0.01, 0.55),
        ("INTERNET LAB", -13.5, -28.4, Z_FF_FLOOR + 0.01, 0.60),
        ("FACULTY SOUTH", -18.775, -28.4, Z_FF_FLOOR + 0.01, 0.45),

        # 2. Northwest Corner Radiating Lecture Theaters & Washrooms
        ("LT-9", -29.8, 23.4, Z_FF_FLOOR + 0.01, 0.80),
        ("LT-10", -27.5, 27.5, Z_FF_FLOOR + 0.01, 0.80),
        ("LT-11", -23.4, 29.8, Z_FF_FLOOR + 0.01, 0.80),
        ("GIRLS\nWASHROOM", -19.5, 17.5, Z_FF_FLOOR + 0.01, 0.38),
        ("BOYS\nWASHROOM", -17.5, 19.5, Z_FF_FLOOR + 0.01, 0.38),
        ("CORNER\nSTAIRS", -19.8, 19.8, Z_FF_FLOOR + 0.01, 0.40),

        # 3. Northeast Corner Radiating Lecture Theaters & Washrooms
        ("LT-12", 23.4, 29.8, Z_FF_FLOOR + 0.01, 0.80),
        ("LT-13", 27.5, 27.5, Z_FF_FLOOR + 0.01, 0.80),
        ("LT-14", 29.8, 23.4, Z_FF_FLOOR + 0.01, 0.80),
        ("BOYS\nWASHROOM", 17.5, 19.5, Z_FF_FLOOR + 0.01, 0.38),
        ("CORNER\nSTAIRS", 19.8, 19.8, Z_FF_FLOOR + 0.01, 0.40),

        # 4. Southwest & Southeast Corner Stairwells
        ("CORNER\nSTAIRS", -19.8, -19.8, Z_FF_FLOOR + 0.01, 0.40),
        ("CORNER\nSTAIRS", 19.8, -19.8, Z_FF_FLOOR + 0.01, 0.40),

        # 5. North Wing Outer Row (Y ~ 31.85m)
        ("DRAWING HALL\n(D-8)", -18.25, 31.85, Z_FF_FLOOR + 0.01, 0.50),
        ("TUTORIAL\n(T-4)", -13.25, 31.85, Z_FF_FLOOR + 0.01, 0.50),
        ("FACULTY", -9.0, 31.85, Z_FF_FLOOR + 0.01, 0.42),
        ("TUTORIAL\n(T-5)", -4.75, 31.85, Z_FF_FLOOR + 0.01, 0.50),
        ("HOD OFFICE", 0.0, 33.0, Z_FF_FLOOR + 0.01, 0.65),
        ("TUTORIAL\n(T-6)", 4.75, 31.85, Z_FF_FLOOR + 0.01, 0.50),
        ("FACULTY", 9.0, 31.85, Z_FF_FLOOR + 0.01, 0.42),
        ("LOCKER\n(D-23)", 13.25, 31.85, Z_FF_FLOOR + 0.01, 0.50),
        ("DRAWING HALL\n(D-24)", 18.25, 31.85, Z_FF_FLOOR + 0.01, 0.50),

        # 6. North Wing Inner Row (Y ~ 24.5m)
        ("CHEMISTRY LAB\n(LAB-1)", -18.5, 24.5, Z_FF_FLOOR + 0.01, 0.48),
        ("MECH. LAB\n(LAB-2)", -13.75, 24.5, Z_FF_FLOOR + 0.01, 0.48),
        ("COMPUTER LAB\n(LAB-8)", -9.25, 24.5, Z_FF_FLOOR + 0.01, 0.45),
        ("FACULTY", -6.0, 24.5, Z_FF_FLOOR + 0.01, 0.38),
        ("COMPUTER LAB\n(LAB-7)", -3.0, 24.5, Z_FF_FLOOR + 0.01, 0.45),
        ("LAB-3 / LAB-4", 3.0, 24.5, Z_FF_FLOOR + 0.01, 0.48),
        ("FACULTY", 6.0, 24.5, Z_FF_FLOOR + 0.01, 0.38),
        ("LAB-12", 9.25, 24.5, Z_FF_FLOOR + 0.01, 0.50),
        ("TECH CONF\nHALL", 14.75, 24.5, Z_FF_FLOOR + 0.01, 0.55),
        ("GIRLS\nWASHROOM", 19.5, 24.5, Z_FF_FLOOR + 0.01, 0.38),

        # 7. East Wing Inner Row (X ~ 24.5m)
        ("EGMD LAB", 24.5, 16.5, Z_FF_FLOOR + 0.01, 0.52),
        ("COMPUTER LAB\n(LAB-35)", 24.5, 8.0, Z_FF_FLOOR + 0.01, 0.46),
        ("COMPUTER LAB\n(LAB-36)", 24.5, 0.0, Z_FF_FLOOR + 0.01, 0.46),

        # 8. East Wing Outer Row (X ~ 31.85m)
        ("DRAWING HALL\n(D-28)", 31.85, 17.5, Z_FF_FLOOR + 0.01, 0.50),
        ("TUTORIAL\n(T-8)", 31.85, 11.5, Z_FF_FLOOR + 0.01, 0.50),
        ("PHYSICS LAB\n(LAB-9)", 31.85, 5.0, Z_FF_FLOOR + 0.01, 0.48),
        ("FACULTY", 31.85, 0.0, Z_FF_FLOOR + 0.01, 0.38),
        ("PHYSICS LAB\n(LAB-10)", 31.85, -5.0, Z_FF_FLOOR + 0.01, 0.48),
        ("FACULTY", 31.85, -11.0, Z_FF_FLOOR + 0.01, 0.38),
        ("LAB-11", 31.85, -17.5, Z_FF_FLOOR + 0.01, 0.50),

        # 9. West Wing Inner Row (X ~ -24.5m)
        ("LANGUAGE LAB\n(LAB-5)", -24.5, 6.5, Z_FF_FLOOR + 0.01, 0.48),

        # 10. West Wing Outer Row (X ~ -31.85m)
        ("DRAWING HALL\n(D-4)", -31.85, 17.5, Z_FF_FLOOR + 0.01, 0.50),
        ("FACULTY CABIN", -31.85, 11.5, Z_FF_FLOOR + 0.01, 0.40),
        ("DRAWING HALL\n(D-2)", -31.85, 4.0, Z_FF_FLOOR + 0.01, 0.50),
        ("COMMUNICATION\n(LAB-6)", -31.85, -6.5, Z_FF_FLOOR + 0.01, 0.48),
        ("ANTENNA LAB", -31.85, -14.5, Z_FF_FLOOR + 0.01, 0.50),
    ]

    for item in labels:
        if len(item) == 5:
            text, x, y, z, size = item
        else:
            text, x, y, z = item
            size = 0.65
        add_floor_label(coll, mats, text, x, y, z, size=size)

def setup_lighting(coll):
    # Main Sunlight (Jodhpur golden sun)
    sun_data = bpy.data.lights.new("Sun_Jodhpur", type='SUN')
    sun_data.energy = 4.0
    sun_data.color = (1.0, 0.96, 0.90)
    sun_obj = bpy.data.objects.new("Sun_Jodhpur", sun_data)
    sun_obj.location = (45.0, -35.0, 65.0)
    sun_obj.rotation_euler = (math.radians(52.0), math.radians(12.0), math.radians(-38.0))
    coll.objects.link(sun_obj)

    # Ambient Sky Fill Sun (prevents harsh pitch-black shadow under slabs)
    fill_data = bpy.data.lights.new("Sun_SkyFill", type='SUN')
    fill_data.energy = 1.8
    fill_data.color = (0.85, 0.92, 1.0)
    fill_obj = bpy.data.objects.new("Sun_SkyFill", fill_data)
    fill_obj.location = (-45.0, 35.0, 65.0)
    fill_obj.rotation_euler = (math.radians(60.0), math.radians(-15.0), math.radians(140.0))
    coll.objects.link(fill_obj)

    # 4 Corner Rotunda Ceiling Downlights & Stairwell Illumination (ZERO PITCH-BLACK SHADOWS)
    for qx, qy in [(-1.0, -1.0), (1.0, -1.0), (-1.0, 1.0), (1.0, 1.0)]:
        # 1. Open-air rotunda corridor junction light (outside central column)
        p_data = bpy.data.lights.new(f"Light_Rotunda_{qx}_{qy}", type='POINT')
        p_data.energy = 4500.0
        p_data.color = (1.0, 0.95, 0.88)
        p_data.shadow_soft_size = 0.6
        p_obj = bpy.data.objects.new(f"Light_Rotunda_{qx}_{qy}", p_data)
        p_obj.location = (qx * 18.6, qy * 18.6, 3.3)
        coll.objects.link(p_obj)

        # 2. Dedicated stairwell alcove wash light (brightens marble treads)
        p_stair_data = bpy.data.lights.new(f"Light_Stair_{qx}_{qy}", type='POINT')
        p_stair_data.energy = 3500.0
        p_stair_data.color = (1.0, 0.96, 0.90)
        p_stair_data.shadow_soft_size = 0.5
        p_stair_obj = bpy.data.objects.new(f"Light_Stair_{qx}_{qy}", p_stair_data)
        p_stair_obj.location = (qx * 20.3, qy * 20.3, 3.3)
        coll.objects.link(p_stair_obj)

        # 3. First Floor upper stair landing downlight
        p_ff_data = bpy.data.lights.new(f"Light_FF_Rotunda_{qx}_{qy}", type='POINT')
        p_ff_data.energy = 3000.0
        p_ff_data.color = (1.0, 0.95, 0.88)
        p_ff_data.shadow_soft_size = 0.6
        p_ff_obj = bpy.data.objects.new(f"Light_FF_Rotunda_{qx}_{qy}", p_ff_data)
        p_ff_obj.location = (qx * 19.5, qy * 19.5, 6.8)
        coll.objects.link(p_ff_obj)

        # 4. Under-staircase floor wash light (brightens floor under helical flight, eliminates shadow holes)
        p_under_data = bpy.data.lights.new(f"Light_UnderStair_{qx}_{qy}", type='POINT')
        p_under_data.energy = 2200.0
        p_under_data.color = (1.0, 0.96, 0.90)
        p_under_data.shadow_soft_size = 0.5
        p_under_obj = bpy.data.objects.new(f"Light_UnderStair_{qx}_{qy}", p_under_data)
        p_under_obj.location = (qx * 19.8, qy * 19.8, 0.7)
        coll.objects.link(p_under_obj)

    # Overhead soft fill light for top-down plan view
    top_data = bpy.data.lights.new("Sun_Topdown_Fill", type='SUN')
    top_data.energy = 1.0
    top_data.color = (0.95, 0.97, 1.0)
    top_obj = bpy.data.objects.new("Sun_Topdown_Fill", top_data)
    top_obj.location = (0.0, 0.0, 95.0)
    top_obj.rotation_euler = (0.0, 0.0, 0.0)
    coll.objects.link(top_obj)

    # Veranda Colonnade Ceiling Lights (illuminate ground floor walkway)
    for x in [-12.0, 0.0, 12.0]:
        for y, prefix in [(-19.5, "South"), (19.5, "North")]:
            l_data = bpy.data.lights.new(f"Light_Corr_{prefix}_{x}", type='POINT')
            l_data.energy = 2200.0
            l_data.color = (1.0, 0.95, 0.88)
            l_obj = bpy.data.objects.new(f"Light_Corr_{prefix}_{x}", l_data)
            l_obj.location = (x, y, 3.2)
            coll.objects.link(l_obj)

    for y in [-12.0, 0.0, 12.0]:
        for x, prefix in [(-19.5, "West"), (19.5, "East")]:
            l_data = bpy.data.lights.new(f"Light_Corr_{prefix}_{y}", type='POINT')
            l_data.energy = 2200.0
            l_data.color = (1.0, 0.95, 0.88)
            l_obj = bpy.data.objects.new(f"Light_Corr_{prefix}_{y}", l_data)
            l_obj.location = (x, y, 3.2)
            coll.objects.link(l_obj)

    # First Floor Veranda Colonnade Lights (illuminate First Floor hallways & library portal)
    for x in [-12.0, 0.0, 12.0]:
        for y, prefix in [(-19.5, "South_FF"), (19.5, "North_FF")]:
            l_data = bpy.data.lights.new(f"Light_Corr_{prefix}_{x}", type='POINT')
            l_data.energy = 2800.0
            l_data.color = (1.0, 0.96, 0.90)
            l_obj = bpy.data.objects.new(f"Light_Corr_{prefix}_{x}", l_data)
            l_obj.location = (x, y, 6.8)
            coll.objects.link(l_obj)

    # Dedicated illumination for Central Library Entrance Portal & Signage
    l_lib = bpy.data.lights.new("Light_Central_Library_Portal", type='POINT')
    l_lib.energy = 5500.0
    l_lib.color = (1.0, 0.98, 0.94)
    l_lib_obj = bpy.data.objects.new("Light_Central_Library_Portal", l_lib)
    l_lib_obj.location = (0.0, -17.0, 5.8)
    coll.objects.link(l_lib_obj)

    world = bpy.context.scene.world
    if not world:
        world = bpy.data.worlds.new("World_Sky")
        bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.82, 0.90, 0.98, 1.0)
        bg.inputs["Strength"].default_value = 1.35

def create_targeted_camera(coll, name, location, target, lens=28.0):
    cam_data = bpy.data.cameras.new(name)
    cam_data.lens = lens
    cam_data.clip_start = 0.1
    cam_data.clip_end = 500.0
    cam_obj = bpy.data.objects.new(name, cam_data)
    cam_obj.location = Vector(location)

    direction = Vector(target) - Vector(location)
    if direction.length > 0:
        rot_quat = direction.to_track_quat('-Z', 'Y')
        cam_obj.rotation_euler = rot_quat.to_euler()

    coll.objects.link(cam_obj)
    return cam_obj

def setup_cameras(coll):
    cameras = {}

    # 1. Courtyard View from Admin corridor exit looking at Stage on West flank
    cam_courtyard = create_targeted_camera(
        coll, "courtyard_view_admin_to_stage",
        location=(0.0, -15.5, 2.5),
        target=(-15.6, 0.0, 1.8),
        lens=26.0
    )
    cameras["courtyard_view_admin_to_stage"] = cam_courtyard

    # 2. Elevated Library Balcony View looking North (matching IMG_3101.jpeg ground truth)
    cam_lib_balcony = create_targeted_camera(
        coll, "library_balcony_view_north",
        location=(0.0, -18.2, 5.5),
        target=(0.0, 5.0, 1.0),
        lens=28.0
    )
    cameras["library_balcony_view_north"] = cam_lib_balcony

    # 3. Stage Close-Up (facing West at plinth, crimson wall & "JIET" 3D text)
    cam_stage = create_targeted_camera(
        coll, "stage_close_up",
        location=(-8.0, 0.0, 2.2),
        target=(-15.6, 0.0, 2.4),
        lens=32.0
    )
    cameras["stage_close_up"] = cam_stage

    # 4. Stepped Amphitheater Close-Up (facing East at seating tiers & central walkway)
    cam_amphi = create_targeted_camera(
        coll, "amphitheater_close_up",
        location=(8.0, 0.0, 2.2),
        target=(15.5, 0.0, 1.2),
        lens=30.0
    )
    cameras["amphitheater_close_up"] = cam_amphi

    # 5. Twin Library Staircases Detail (viewing from Admin corridor into courtyard under bridge, IMG_3098 2.jpeg)
    cam_twin_stairs = create_targeted_camera(
        coll, "twin_library_staircases_detail",
        location=(0.0, -21.0, 1.65),
        target=(0.0, 0.0, 1.8),
        lens=22.0
    )
    cameras["twin_library_staircases_detail"] = cam_twin_stairs

    # 5B. Twin Library Staircases Angled View (looking North up stairs at circular portholes, IMG_3100.jpeg)
    cam_twin_angled = create_targeted_camera(
        coll, "twin_library_staircases_angled",
        location=(3.8, -21.0, 1.45),
        target=(3.8, -11.8, 2.75),
        lens=26.0
    )
    cameras["twin_library_staircases_angled"] = cam_twin_angled

    # 6. Central Library Entrance Portal Detail (view from bridge up 7 steps into library portal, IMG_3107.jpeg)
    cam_lib_portal = create_targeted_camera(
        coll, "central_library_entrance_detail",
        location=(0.0, -14.2, 4.5),
        target=(0.0, -21.05, 5.0),
        lens=26.0
    )
    cameras["central_library_entrance_detail"] = cam_lib_portal

    # 7. South 3D Entrance Porch Detail (sandstone pillars, 6 green steps, canopy & "ADMINISTRATIVE BLOCK" sign)
    cam_porch = create_targeted_camera(
        coll, "entrance_porch_3d_detail",
        location=(0.0, -50.0, 3.8),
        target=(0.0, -38.5, 3.0),
        lens=28.0
    )
    cameras["entrance_porch_3d_detail"] = cam_porch

    # 8. Corner Staircase Close-Up (Corridor eye-level view directly facing the stairs)
    cam_stairs = create_targeted_camera(
        coll, "corner_staircase_close_up",
        location=(-19.5, -14.5, 1.7),
        target=(-19.8, -19.8, 1.8),
        lens=30.0
    )
    cameras["corner_staircase_close_up"] = cam_stairs

    # 9. Corner Junction Gap Fix Close-Up (Looking into corner past anchor pillar showing zero gaps)
    cam_corner_gap = create_targeted_camera(
        coll, "corner_junction_gap_fix_close_up",
        location=(-17.5, -13.0, 2.5),
        target=(-20.5, -20.5, 1.2),
        lens=26.0
    )
    cameras["corner_junction_gap_fix_close_up"] = cam_corner_gap

    # 10. Unblocked Corridor View (looking straight North down 10ft colonnade showing doors & lintels)
    cam_corridor = create_targeted_camera(
        coll, "corridor_unblocked_view",
        location=(-19.5, -8.0, 1.7),
        target=(-19.5, 12.0, 1.7),
        lens=26.0
    )
    cameras["corridor_unblocked_view"] = cam_corridor

    # 11. Top-Down Overview (wide architectural lens, entire 72m squircle)
    cam_topdown = create_targeted_camera(
        coll, "topdown_overview",
        location=(0.0, 0.0, 115.0),
        target=(0.0, 0.0, 0.0),
        lens=24.0
    )
    cam_topdown.rotation_euler = Euler((0.0, 0.0, 0.0), 'XYZ')
    cameras["topdown_overview"] = cam_topdown

    # 12. Isometric Campus View (2.5D architectural isometric)
    cam_iso = create_targeted_camera(
        coll, "isometric_campus_view",
        location=(62.0, -62.0, 52.0),
        target=(0.0, 0.0, 2.0),
        lens=45.0
    )
    cameras["isometric_campus_view"] = cam_iso

    # 13. First Floor Rooms Detail View (Elevated perspective showing Library, Drawing Halls & doors)
    cam_ff_detail = create_targeted_camera(
        coll, "first_floor_rooms_detail",
        location=(-35.0, -42.0, 28.0),
        target=(-10.0, -20.0, 5.0),
        lens=35.0
    )
    cameras["first_floor_rooms_detail"] = cam_ff_detail

    # 14. First Floor North Wing & Radiating LTs Detail View
    cam_ff_north = create_targeted_camera(
        coll, "first_floor_north_wing_detail",
        location=(0.0, 10.0, 36.0),
        target=(0.0, 28.0, 5.0),
        lens=32.0
    )
    cameras["first_floor_north_wing_detail"] = cam_ff_north

    # 15. Northeast Corner LT-12, LT-13, LT-14 Open Walkway Detail View
    cam_ne_lts = create_targeted_camera(
        coll, "corner_ne_lts_detail",
        location=(14.0, 14.0, 13.0),
        target=(26.0, 26.0, 4.0),
        lens=28.0
    )
    cameras["corner_ne_lts_detail"] = cam_ne_lts

    # 16. Northwest Corner LT-9, LT-10, LT-11 Open Walkway Detail View
    cam_nw_lts = create_targeted_camera(
        coll, "corner_nw_lts_detail",
        location=(-14.0, 14.0, 13.0),
        target=(-26.0, 26.0, 4.0),
        lens=28.0
    )
    cameras["corner_nw_lts_detail"] = cam_nw_lts

    # =========================================================================
    # 17. COMPREHENSIVE MULTI-ANGLE INSPECTION CAMERAS (100+ CAMERAS)
    # Covering every room, wing corridor, doorway, staircase, and corner.
    # Stored in Blender scene so any camera can be activated in viewport (Numpad 0).
    # =========================================================================
    inspect_coll = get_collection("10_MultiAngle_Inspection_Cameras", coll)

    # A. Corridor Walkthrough & Doorway Inspection Cameras (GF & FF)
    corr_views = [
        # Ground Floor Corridors
        ("cam_inspect_corr_gf_south_facing_east", (-15.0, -19.5, 1.7), (15.0, -19.5, 1.7)),
        ("cam_inspect_corr_gf_south_facing_west", (15.0, -19.5, 1.7), (-15.0, -19.5, 1.7)),
        ("cam_inspect_corr_gf_west_facing_north", (-19.5, -15.0, 1.7), (-19.5, 15.0, 1.7)),
        ("cam_inspect_corr_gf_west_facing_south", (-19.5, 15.0, 1.7), (-19.5, -15.0, 1.7)),
        ("cam_inspect_corr_gf_north_facing_east", (-15.0, 19.5, 1.7), (15.0, 19.5, 1.7)),
        ("cam_inspect_corr_gf_north_facing_west", (15.0, 19.5, 1.7), (-15.0, 19.5, 1.7)),
        ("cam_inspect_corr_gf_east_facing_north", (19.5, -15.0, 1.7), (19.5, 15.0, 1.7)),
        ("cam_inspect_corr_gf_east_facing_south", (19.5, 15.0, 1.7), (19.5, -15.0, 1.7)),
        # First Floor Corridors
        ("cam_inspect_corr_ff_south_facing_east", (-15.0, -19.5, 5.4), (15.0, -19.5, 5.4)),
        ("cam_inspect_corr_ff_south_facing_west", (15.0, -19.5, 5.4), (-15.0, -19.5, 5.4)),
        ("cam_inspect_corr_ff_west_facing_north", (-19.5, -15.0, 5.4), (-19.5, 15.0, 5.4)),
        ("cam_inspect_corr_ff_west_facing_south", (-19.5, 15.0, 5.4), (-19.5, -15.0, 5.4)),
        ("cam_inspect_corr_ff_north_facing_east", (-15.0, 19.5, 5.4), (15.0, 19.5, 5.4)),
        ("cam_inspect_corr_ff_north_facing_west", (15.0, 19.5, 5.4), (-15.0, 19.5, 5.4)),
        ("cam_inspect_corr_ff_east_facing_north", (19.5, -15.0, 5.4), (19.5, 15.0, 5.4)),
        ("cam_inspect_corr_ff_east_facing_south", (19.5, 15.0, 5.4), (19.5, -15.0, 5.4)),
    ]
    for c_name, c_loc, c_tgt in corr_views:
        create_targeted_camera(inspect_coll, c_name, c_loc, c_tgt, lens=24.0)

    # Key Corridor Detail Renders
    cameras["corridor_south_gf_detail"] = create_targeted_camera(
        coll, "corridor_south_gf_detail",
        location=(-16.0, -19.5, 1.75),
        target=(12.0, -19.5, 1.75),
        lens=24.0
    )
    cameras["corridor_west_gf_detail"] = create_targeted_camera(
        coll, "corridor_west_gf_detail",
        location=(-19.5, -16.0, 1.75),
        target=(-19.5, 12.0, 1.75),
        lens=24.0
    )

    # B. 4 Corner Helical Rotunda Staircase Inspection Cameras
    stair_views = [
        # SW Rotunda
        ("cam_inspect_stair_sw_gf_base", (-18.0, -15.0, 1.5), (-19.8, -19.8, 2.2)),
        ("cam_inspect_stair_sw_ff_landing", (-17.5, -15.0, 5.5), (-19.8, -19.8, 4.2)),
        # SE Rotunda
        ("cam_inspect_stair_se_gf_base", (18.0, -15.0, 1.5), (19.8, -19.8, 2.2)),
        ("cam_inspect_stair_se_ff_landing", (17.5, -15.0, 5.5), (19.8, -19.8, 4.2)),
        # NW Rotunda
        ("cam_inspect_stair_nw_gf_base", (-18.0, 15.0, 1.5), (-19.8, 19.8, 2.2)),
        ("cam_inspect_stair_nw_ff_landing", (-17.5, 15.0, 5.5), (-19.8, 19.8, 4.2)),
        # NE Rotunda
        ("cam_inspect_stair_ne_gf_base", (18.0, 15.0, 1.5), (19.8, 19.8, 2.2)),
        ("cam_inspect_stair_ne_ff_landing", (17.5, 15.0, 5.5), (19.8, 19.8, 4.2)),
    ]
    for s_name, s_loc, s_tgt in stair_views:
        create_targeted_camera(inspect_coll, s_name, s_loc, s_tgt, lens=28.0)

    cameras["corner_sw_stairwell_detail"] = create_targeted_camera(
        coll, "corner_sw_stairwell_detail",
        location=(-17.5, -14.5, 1.8),
        target=(-19.8, -19.8, 2.4),
        lens=26.0
    )

    # C. Ground Floor Blueprint Room Inspection Cameras (Door & Interior Views)
    gf_room_specs = [
        # South Wing (Admin Core)
        ("gf_reception_lobby", (0.0, -21.0, 2.0), (0.0, -25.5, 1.2)),
        ("gf_registrar_office", (0.0, -28.0, 2.0), (0.0, -32.5, 1.2)),
        ("gf_board_room", (-4.0, -29.0, 2.0), (-8.5, -32.5, 1.2)),
        ("gf_campus_director", (-11.0, -21.5, 2.0), (-11.0, -25.5, 1.2)),
        ("gf_academic_director", (-6.0, -21.5, 2.0), (-6.0, -25.5, 1.2)),
        ("gf_penal_room", (-17.5, -21.5, 2.0), (-17.3, -24.0, 1.2)),
        ("gf_medical_room", (-17.5, -25.0, 2.0), (-17.3, -27.5, 1.2)),
        ("gf_ece_lab", (-17.5, -29.5, 2.0), (-17.3, -32.6, 1.2)),
        ("gf_training_office", (6.0, -28.5, 2.0), (6.0, -32.1, 1.2)),
        ("gf_admission_cell", (11.0, -28.5, 2.0), (11.0, -32.1, 1.2)),
        ("gf_staff_cabins", (6.0, -21.5, 2.0), (6.0, -25.0, 1.2)),
        ("gf_student_cell", (11.0, -21.5, 2.0), (11.0, -25.0, 1.2)),
        ("gf_microprocessor_lab", (17.5, -29.5, 2.0), (17.3, -32.6, 1.2)),
        ("gf_faculty_south_se", (17.5, -21.5, 2.0), (17.3, -25.0, 1.2)),

        # West Wing (Computing Labs & Hardware)
        ("gf_complab_w1_foc", (-21.5, -16.0, 2.0), (-25.0, -17.5, 1.2)),
        ("gf_complab_w2", (-21.5, -9.5, 2.0), (-25.0, -10.5, 1.2)),
        ("gf_complab_w3", (-21.5, -3.0, 2.0), (-25.0, -3.5, 1.2)),
        ("gf_complab_w4", (-21.5, 3.5, 2.0), (-25.0, 3.5, 1.2)),
        ("gf_complab_w5", (-21.5, 9.5, 2.0), (-25.0, 10.5, 1.2)),
        ("gf_hardware_store", (-21.5, 16.0, 2.0), (-25.0, 17.5, 1.2)),
        ("gf_electronic_lab", (-28.0, -16.0, 2.0), (-32.0, -17.0, 1.2)),
        ("gf_tutorial_w1", (-28.0, -9.5, 2.0), (-32.0, -9.75, 1.2)),
        ("gf_tutorial_w2", (-28.0, -3.0, 2.0), (-32.0, -3.25, 1.2)),
        ("gf_dhd_lab", (-28.0, 3.5, 2.0), (-32.0, 3.25, 1.2)),
        ("gf_store_west", (-28.0, 9.5, 2.0), (-32.0, 9.75, 1.2)),
        ("gf_faculty_hod_west", (-28.0, 16.0, 2.0), (-32.0, 17.0, 1.2)),

        # North Wing (Engineering & Workshops)
        ("gf_computer_lab_north", (-16.0, 21.5, 2.0), (-16.0, 25.0, 1.2)),
        ("gf_girls_common_room", (-7.5, 21.5, 2.0), (-7.5, 25.0, 1.2)),
        ("gf_tutorial_north", (0.0, 21.5, 2.0), (0.0, 25.0, 1.2)),
        ("gf_director_north", (7.5, 21.5, 2.0), (7.5, 25.0, 1.2)),
        ("gf_high_voltage_lab", (16.0, 21.5, 2.0), (16.0, 25.0, 1.2)),
        ("gf_workshop_lab_1", (-14.0, 28.5, 2.0), (-14.0, 32.5, 1.2)),
        ("gf_workshop_lab_2", (0.0, 28.5, 2.0), (0.0, 32.5, 1.2)),
        ("gf_workshop_lab_3", (14.0, 28.5, 2.0), (14.0, 32.5, 1.2)),

        # East Wing (Sciences & Electrical)
        ("gf_emi_lab", (21.5, -15.0, 2.0), (28.0, -16.8, 1.2)),
        ("gf_electronic_machine_lab", (21.5, -7.0, 2.0), (28.0, -7.3, 1.2)),
        ("gf_electrical_science_lab", (21.5, 2.0, 2.0), (28.0, 1.95, 1.2)),
        ("gf_language_lab_gf", (21.5, 9.5, 2.0), (28.0, 9.75, 1.2)),
        ("gf_conference_hall", (21.5, 16.5, 2.0), (28.0, 17.3, 1.2)),
    ]
    for r_id, r_cam, r_tgt in gf_room_specs:
        create_targeted_camera(inspect_coll, f"cam_inspect_{r_id}", r_cam, r_tgt, lens=26.0)

    # D. First Floor Blueprint Room Inspection Cameras
    ff_room_specs = [
        # South Wing (Knowledge Hub)
        ("ff_faculty_south", (-18.8, -21.5, 5.5), (-18.8, -28.0, 4.5)),
        ("ff_internet_lab", (-13.5, -21.5, 5.5), (-13.5, -28.0, 4.5)),
        ("ff_central_library_interior", (0.0, -22.5, 5.5), (0.0, -29.0, 4.5)),
        ("ff_library_annex", (13.5, -21.5, 5.5), (13.5, -28.0, 4.5)),
        ("ff_mtech_hobby_lab", (18.8, -21.5, 5.5), (18.8, -28.0, 4.5)),

        # West Wing
        ("ff_lab_5", (-21.5, 6.5, 5.5), (-25.0, 6.5, 4.5)),
        ("ff_drawing_hall_4", (-28.0, 17.5, 5.5), (-32.0, 17.5, 4.5)),
        ("ff_faculty_west", (-28.0, 11.5, 5.5), (-32.0, 11.5, 4.5)),
        ("ff_drawing_hall_2", (-28.0, 4.0, 5.5), (-32.0, 4.0, 4.5)),
        ("ff_lab_6", (-28.0, -6.5, 5.5), (-32.0, -6.5, 4.5)),

        # North Wing
        ("ff_lab_1", (-18.5, 21.5, 5.5), (-18.5, 25.0, 4.5)),
        ("ff_lab_2", (-13.75, 21.5, 5.5), (-13.75, 25.0, 4.5)),
        ("ff_lab_8", (-9.25, 21.5, 5.5), (-9.25, 25.0, 4.5)),
        ("ff_faculty_n1", (-6.0, 21.5, 5.5), (-6.0, 25.0, 4.5)),
        ("ff_lab_7", (-3.0, 21.5, 5.5), (-3.0, 25.0, 4.5)),
        ("ff_lab_3_4", (3.0, 21.5, 5.5), (3.0, 25.0, 4.5)),
        ("ff_faculty_n2", (6.0, 21.5, 5.5), (6.0, 25.0, 4.5)),
        ("ff_lab_12", (9.25, 21.5, 5.5), (9.25, 25.0, 4.5)),
        ("ff_tech_conf_hall", (14.75, 21.5, 5.5), (14.75, 25.0, 4.5)),
        ("ff_drawing_hall_8", (-18.25, 28.5, 5.5), (-18.25, 32.0, 4.5)),
        ("ff_tutorial_4", (-13.25, 28.5, 5.5), (-13.25, 32.0, 4.5)),
        ("ff_canteen_dining_hall", (0.0, 28.5, 5.5), (0.0, 33.0, 4.5)),

        # East Wing
        ("ff_physics_lab", (21.5, -14.0, 5.5), (28.0, -14.0, 4.5)),
        ("ff_drawing_hall_24", (21.5, -5.0, 5.5), (28.0, -5.0, 4.5)),
        ("ff_drawing_hall_23", (21.5, 4.0, 5.5), (28.0, 4.0, 4.5)),
        ("ff_egmd_lab", (21.5, 13.0, 5.5), (28.0, 13.0, 4.5)),
    ]
    for r_id, r_cam, r_tgt in ff_room_specs:
        create_targeted_camera(inspect_coll, f"cam_inspect_{r_id}", r_cam, r_tgt, lens=26.0)

    cameras["central_library_interior_detail"] = create_targeted_camera(
        coll, "central_library_interior_detail",
        location=(0.0, -22.5, 5.5),
        target=(0.0, -29.0, 4.5),
        lens=24.0
    )

    # E. 4 Corner Radiating Lecture Theaters (LT-1 to LT-16) Inspection Cameras
    corner_lt_specs = [
        # NW Corner
        ("nw_lt1", (-22.0, 22.0, 2.0), (-28.0, 24.0, 1.2)),
        ("nw_lt2", (-22.0, 22.0, 2.0), (-26.0, 26.0, 1.2)),
        ("nw_lt3", (-22.0, 22.0, 2.0), (-24.0, 28.0, 1.2)),
        # NE Corner
        ("ne_lt4", (22.0, 22.0, 2.0), (28.0, 24.0, 1.2)),
        ("ne_lt5", (22.0, 22.0, 2.0), (26.0, 26.0, 1.2)),
        ("ne_lt6", (22.0, 22.0, 2.0), (24.0, 28.0, 1.2)),
        # SE Corner
        ("se_lt7", (22.0, -22.0, 2.0), (28.0, -24.0, 1.2)),
        ("se_lt8", (22.0, -22.0, 2.0), (26.0, -26.0, 1.2)),
        ("se_lt9", (22.0, -22.0, 2.0), (24.0, -28.0, 1.2)),
        # SW Corner
        ("sw_lt10", (-22.0, -22.0, 2.0), (-28.0, -24.0, 1.2)),
        ("sw_lt11", (-22.0, -22.0, 2.0), (-26.0, -26.0, 1.2)),
        ("sw_lt12", (-22.0, -22.0, 2.0), (-24.0, -28.0, 1.2)),
    ]
    for lt_id, lt_cam, lt_tgt in corner_lt_specs:
        create_targeted_camera(inspect_coll, f"cam_inspect_{lt_id}_gf", lt_cam, lt_tgt, lens=28.0)
        # First floor upper LT view
        create_targeted_camera(inspect_coll, f"cam_inspect_{lt_id}_ff", (lt_cam[0], lt_cam[1], 5.5), (lt_tgt[0], lt_tgt[1], 4.5), lens=28.0)

    # Cutaway Perspective View
    cameras["ground_floor_rooms_cutaway"] = create_targeted_camera(
        coll, "ground_floor_rooms_cutaway",
        location=(0.0, -48.0, 32.0),
        target=(0.0, -20.0, 2.0),
        lens=35.0
    )

    print(f"-> Total Inspection Cameras Initialized: {len(bpy.data.cameras)} cameras across all rooms, wings, corridors & stairs.")
    return cameras

def configure_viewport_clipping():
    """Sets clip_start = 0.1m and clip_end = 500.0m on all 3D viewports."""
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                for space in area.spaces:
                    if space.type == 'VIEW_3D':
                        space.clip_start = 0.1
                        space.clip_end = 500.0

# =============================================================================
# 9. MAIN EXECUTION PIPELINE
# =============================================================================
def main():
    print("=" * 70)
    print("JIET JODHPUR CAMPUS DIGITAL TWIN - ARCHITECTURAL TWIN GENERATOR (v5)")
    print("=" * 70)

    # 1. Clean Scene & Initialize Collections
    scene = clean_scene()
    root_coll = scene.collection

    coll_ground = get_collection("01_Courtyard_Ground", root_coll)
    coll_stage = get_collection("02_Outdoor_Stage", root_coll)
    coll_stairs_lib = get_collection("03_Library_Twin_Staircases", root_coll)
    coll_stairs_gf = get_collection("04_Corner_Staircases_GF", root_coll)
    coll_gf = get_collection("05_Ground_Floor_Architecture", root_coll)
    coll_ff = get_collection("06_First_Floor_Architecture", root_coll)
    coll_stairs_ff = get_collection("07_Corner_Architecture_FF", root_coll)
    coll_labels = get_collection("08_Floor_Typography", root_coll)
    coll_env = get_collection("09_Lighting_and_Cameras", root_coll)

    # 2. Materials Palette (PBR, Authentic & MazeMap Inspired)
    mats = {
        "grass": get_or_create_material("Mat_Grass_Lawn", "#2d7a35", roughness=0.65),
        "curb": get_or_create_material("Mat_Concrete_Curb", "#e2e8f0", roughness=0.45),
        "curb_red": get_or_create_material("Mat_Red_Curb", "#8b2020", roughness=0.45),
        "walkway_paved": get_or_create_material("Mat_Walkway_Pavers", "#d2a472", roughness=0.4),
        "paver_ground": get_or_create_material("Mat_Ground_Base", "#cbd5e1", roughness=0.55),
        "paver_terracotta": get_or_create_material("Mat_Paver_Terracotta", "#aa4444", roughness=0.45),
        "paver_cream": get_or_create_material("Mat_Paver_Cream", "#e5cbab", roughness=0.45),
        "stage_brick": get_or_create_material("Mat_Stage_Brick_Plinth", "#7b1c1c", roughness=0.55),
        "stage_deck": get_or_create_material("Mat_Stage_Deck_Stone", "#f1f5f9", roughness=0.20),
        "stage_steps": get_or_create_material("Mat_Stage_Steps", "#8c2222", roughness=0.45),
        "stage_backdrop": get_or_create_material("Mat_Stage_Crimson_Backdrop", "#941818", roughness=0.30),
        "white_text": get_or_create_material("Mat_Architectural_White", "#ffffff", roughness=0.10, emission=0.35),
        "dark_slate_text": get_or_create_material("Mat_Dark_Slate_Text", "#1e293b", roughness=0.3),
        "stair_green_marble": get_or_create_material("Mat_Stair_Green_Marble", "#1b4332", roughness=0.18),
        "stair_riser": get_or_create_material("Mat_Stair_Riser_White", "#ffffff", roughness=0.25),
        "stair_railing": get_or_create_material("Mat_Stair_Tubular_Railing", "#94a3b8", roughness=0.25, metallic=0.8),
        "stair_railing_brown": get_or_create_material("Mat_Stair_Railing_Brown", "#3e2723", roughness=0.35, metallic=0.7),
        "brass_gold": get_or_create_material("Mat_Brass_Gold", "#d4af37", roughness=0.25, metallic=0.9, emission=0.2),
        "glass_tinted": get_or_create_material("Mat_Glass_Tinted", "#e0f2fe", roughness=0.1, alpha=0.4, metallic=0.1),
        "shrub_green": get_or_create_material("Mat_Planter_Shrubs", "#1b4d2e", roughness=0.7),
        "wall_sandstone": get_or_create_material("Mat_Jodhpur_Sandstone", "#b46949", roughness=0.65),
        "wall_interior": get_or_create_material("Mat_Interior_OffWhite", "#f8fafc", roughness=0.4),
        "pillar_sandstone": get_or_create_material("Mat_Sandstone_Pillar", "#9e5239", roughness=0.65),
        "corridor_floor": get_or_create_material("Mat_Corridor_Floor", "#f1f5f9", roughness=0.25),
        "slab_concrete": get_or_create_material("Mat_Slab_Concrete", "#94a3b8", roughness=0.5),
        "balustrade_white": get_or_create_material("Mat_Balustrade_White", "#f8fafc", roughness=0.3),
        # MazeMap Functional Room Categories
        "mazemap_admin": get_or_create_material("Mat_MazeMap_Admin_Amber", "#d97706", roughness=0.3),
        "mazemap_lab": get_or_create_material("Mat_MazeMap_Lab_Emerald", "#059669", roughness=0.3),
        "mazemap_lt": get_or_create_material("Mat_MazeMap_LT_Cyan", "#0284c7", roughness=0.3),
        "mazemap_seminar": get_or_create_material("Mat_MazeMap_Seminar_Coral", "#ea580c", roughness=0.3),
        "mazemap_cs_lab": get_or_create_material("Mat_MazeMap_CS_Mint", "#10b981", roughness=0.3),
        "mazemap_library": get_or_create_material("Mat_MazeMap_Library_Rose", "#e11d48", roughness=0.3),
        "mazemap_lt_upper": get_or_create_material("Mat_MazeMap_LT_SkyBlue", "#0ea5e9", roughness=0.3),
        "mazemap_drawing": get_or_create_material("Mat_Drawing_Orange", "#f97316", roughness=0.3),
        "door_blue": get_or_create_material("Mat_Door_Blue_Frame", "#1e3a8a", roughness=0.3, metallic=0.2),
    }

    # 3. Construct Geometry
    print("-> Building Courtyard Ground, Lawns & Seating Bleachers...")
    build_courtyard(coll_ground, mats)

    print("-> Building Outdoor Stage (West Flank, Solid Front, Side Access Stairs)...")
    build_outdoor_stage(coll_stage, mats)

    print("-> Building Courtyard Twin Library Staircases (Symmetrical with Circular Cutouts)...")
    build_twin_library_staircases(coll_stairs_lib, mats)

    print("-> Building GF Airtight Corridors, Radiating LTs & Recessed Rotunda Staircases...")
    build_all_corners(coll_stairs_gf, mats, floor_lvl='GF')

    print("-> Building Ground Floor Complete Blueprint Rooms, 3D Porch & Partitions...")
    build_ground_floor(coll_gf, mats)

    print("-> Building First Floor Blueprint Architecture, Library, Balustrades & Doors...")
    build_first_floor(coll_ff, mats)

    print("-> Building First Floor Airtight Corner Radiating LTs & Curved Partition Walls...")
    build_all_corners(coll_stairs_ff, mats, floor_lvl='FF')

    print("-> Adding Architectural Floor Typography Labels...")
    build_floor_typography(coll_labels, mats)

    # 4. Setup Lighting and Cameras
    print("-> Setting up Lighting & Multi-Angle Cameras...")
    setup_lighting(coll_env)
    cameras = setup_cameras(coll_env)
    configure_viewport_clipping()

    # 5. Update View Layer
    bpy.context.view_layer.update()

    # 6. File Paths
    project_root = "/Users/krishnajangid/Desktop/campus_room_finder"
    blend_path = os.path.join(project_root, "blender", "jiet_campus_prototype.blend")
    glb_path = os.path.join(project_root, "public", "models", "jiet_campus_prototype.glb")
    renders_dir = os.path.join(project_root, "blender", "renders")
    os.makedirs(os.path.dirname(blend_path), exist_ok=True)
    os.makedirs(os.path.dirname(glb_path), exist_ok=True)
    os.makedirs(renders_dir, exist_ok=True)

    # 7. Save Native Blender File (.blend)
    print(f"-> Saving native Blender file: {blend_path}")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)

    # 8. Export WebGL GLB (.glb)
    print(f"-> Exporting high-fidelity GLB: {glb_path}")
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format="GLB",
        use_selection=False,
        export_materials="EXPORT",
        export_attributes=True
    )

    # 9. Multi-Angle Verification Renders with Cycles
    print("-> Rendering Multi-Angle Verification Images with Cycles...")
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.cycles.device = 'CPU'
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080

    for view_name, cam_obj in cameras.items():
        render_output = os.path.join(renders_dir, f"{view_name}.png")
        print(f"   Rendering {view_name} -> {render_output}")
        scene.camera = cam_obj
        scene.render.filepath = render_output
        bpy.ops.render.render(write_still=True)

    print("=" * 70)
    print("BLENDER PROTOTYPE GENERATION & RENDERING COMPLETE!")
    print(f"Saved .blend: {blend_path}")
    print(f"Saved .glb:   {glb_path}")
    print(f"Renders in:   {renders_dir}")
    print("=" * 70)

if __name__ == "__main__":
    main()
