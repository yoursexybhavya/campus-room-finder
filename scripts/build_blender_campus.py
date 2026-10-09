"""
JIET Campus Digital Twin - Complete Procedural 3D Architectural Twin (v4)
========================================================================
Built for Blender 5.2.2 LTS / 4.x.
Grounded strictly in official CAD blueprints (24.4.2014) & site photography:
  1. Complete CAD Room-by-Room Reconstruction: Every single room on Ground Floor
     and First Floor (Admin Director, Registrar, Board Room, Reception, Microprocessor Lab,
     High Voltage Lab, ECE Lab, Conference Hall, Central Library, Drawing Halls 1 & 2,
     Multipurpose Hall, Internet Lab, Antenna Lab, Communication Lab, Physics & Chemistry Labs,
     radiating Lecture Halls LT-1 through LT-14, Tutorial Rooms, Faculty Cabins, Toilet blocks).
  2. Authentic Perimeter & Interior Partition Walls: Real 14-inch exterior walls and
     8-inch/10-inch interior partition walls separating all individual spaces.
  3. Real Doorways & Lintels: Every room has authentic door cutouts (1.2m wide, 2.2m high)
     with solid lintels spanning above door openings into the 10-foot wide corridors.
  4. 10-Foot Continuous Corridors: Authentic 3.05m (10ft) hallway loop connecting all 4 wings
     seamlessly through continuous curved corner arcs.
  5. Authentic Recessed Corner Rotundas: Helical staircases with central white column,
     dark granite treads, white risers, black tubular railings, and flanking toilet blocks.
  6. JIET Stage Refinements: Solid flat brick-red plinth facing the courtyard audience
     (NO front stairs), stairs placed strictly on West & East flanks, centered 3D white
     "JIET" text on crimson backdrop.
  7. Courtyard: 4 manicured lawn quadrants with concrete curbs, cross-axial paved walkways,
     South amphitheater stepped bleachers.
  8. ZERO Rooftop Solar Panels, zero unrequested trees, zero fountains.
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

STAGE_WIDTH = 15.0                # Stage width along X
STAGE_DEPTH = 4.80                # Stage depth along Y
STAGE_HEIGHT = 1.05               # Stage plinth height
STAGE_Y_CENTER = 15.60            # Plinth center Y (front wall at Y = 13.20)

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
    # Ensure Counter-Clockwise winding (positive signed 2D area)
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
    """
    Builds a wall along the X axis from x0 to x1 centered at y with thickness th.
    doors: list of (center_x, door_width, door_height)
    Creates solid wall segments up to z1, and door lintels above door openings from (z0 + dh) to z1.
    """
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
    """
    Builds a wall along the Y axis from y0 to y1 centered at x with thickness th.
    doors: list of (center_y, door_width, door_height)
    Creates solid wall segments up to z1, and door lintels above door openings from (z0 + dh) to z1.
    """
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
      - 4 distinct green lawn quadrants bounded by raised curbs
      - Cross-axial paved walkways (N-S axial and E-W transverse)
      - South stepped amphitheater seating tiers with alternating wavy paver colors
    """
    # 1. Base campus ground sub-foundation (84m x 84m, underlying full quadrangle)
    bm_base = bmesh.new()
    add_box(bm_base, 0.0, 0.0, 84.0, 84.0, Z_GROUND_BASE, Z_COURTYARD_BASE)
    make_mesh_object("Courtyard_Base_Foundation", bm_base, coll, mats["paver_ground"])

    # 2. Four Lawn Quadrants with Raised Curbs
    quadrants = [
        ("NW", -15.2, -2.4,  2.4, 13.2),
        ("NE",   2.4, 15.2,  2.4, 13.2),
        ("SW", -15.2, -2.4, -10.2, -2.4),
        ("SE",   2.4, 15.2, -10.2, -2.4),
    ]

    bm_lawn = bmesh.new()
    bm_curb = bmesh.new()
    curb_w = 0.22

    for name, x0, x1, y0, y1 in quadrants:
        gx0, gx1 = x0 + curb_w, x1 - curb_w
        gy0, gy1 = y0 + curb_w, y1 - curb_w
        pts_lawn = [(gx0, gy0), (gx1, gy0), (gx1, gy1), (gx0, gy1)]
        add_prism(bm_lawn, pts_lawn, Z_COURTYARD_BASE, Z_LAWN_TOP)

        # Non-overlapping concrete curbs
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
    # North arm (center to Stage front plinth at Y=13.20)
    add_box(bm_walkway, 0.0, (half_w + 13.20)*0.5, walk_w, 13.20 - half_w, Z_COURTYARD_BASE, Z_WALKWAY_TOP)
    # South arm (center to South veranda at Y=-18.0)
    add_box(bm_walkway, 0.0, (-half_w - 18.0)*0.5, walk_w, 18.0 - half_w, Z_COURTYARD_BASE, Z_WALKWAY_TOP)
    # West arm (West veranda at X=-17.9 to center)
    add_box(bm_walkway, (-17.9 - half_w)*0.5, 0.0, 17.9 - half_w, walk_w, Z_COURTYARD_BASE, Z_WALKWAY_TOP)
    # East arm (center to East veranda at X=17.9)
    add_box(bm_walkway, (17.9 + half_w)*0.5, 0.0, 17.9 - half_w, walk_w, Z_COURTYARD_BASE, Z_WALKWAY_TOP)
    make_mesh_object("Courtyard_Paved_Cross_Walkways", bm_walkway, coll, mats["walkway_paved"])

    # 4. South Amphitheater Stepped Seating
    bm_bleachers_cream = bmesh.new()
    bm_bleachers_terracotta = bmesh.new()
    bm_bleacher_curbs = bmesh.new()

    num_tiers = 5
    tier_depth = 1.45
    tier_rise = 0.20
    seat_flanks = [(-16.0, -2.6), (2.6, 16.0)]

    for seat_x0, seat_x1 in seat_flanks:
        for i in range(num_tiers):
            t_y0 = -18.0 + (i * tier_depth)
            t_y1 = t_y0 + tier_depth
            t_z0 = Z_COURTYARD_BASE
            t_z1 = Z_COURTYARD_BASE + 1.05 - (i * tier_rise)
            
            pts = [(seat_x0, t_y0), (seat_x1, t_y0), (seat_x1, t_y1), (seat_x0, t_y1)]
            target_bm = bm_bleachers_terracotta if (i % 2 == 0) else bm_bleachers_cream
            add_prism(target_bm, pts, t_z0, t_z1)

            # Front riser curb
            add_box(bm_bleacher_curbs, (seat_x0 + seat_x1)*0.5, t_y1, (seat_x1 - seat_x0), 0.15, t_z1 - tier_rise, t_z1)

    make_mesh_object("Amphitheater_Seating_Terracotta", bm_bleachers_terracotta, coll, mats["paver_terracotta"])
    make_mesh_object("Amphitheater_Seating_Cream", bm_bleachers_cream, coll, mats["paver_cream"])
    make_mesh_object("Amphitheater_Seating_Curbs", bm_bleacher_curbs, coll, mats["curb_red"])

# =============================================================================
# 4. JIET OUTDOOR STAGE (NO FRONT STAIRS, STAIRS ON SIDES ONLY)
# =============================================================================
def build_outdoor_stage(coll, mats):
    """
    Builds the authentic JIET Outdoor Stage against North Wall (IMG_3030.jpeg):
      - Solid flat brick-red plinth facing audience (NO FRONT STAIRS).
      - Access stairs positioned strictly on the East and West FLANKS.
      - Smooth light platform deck.
      - Rich crimson backdrop wall with white 3D "JIET" typography.
    """
    # 1. Solid Brick-red Plinth Base (Clean flat front face at Y = 13.20)
    bm_plinth = bmesh.new()
    add_box(bm_plinth, 0.0, STAGE_Y_CENTER, STAGE_WIDTH, STAGE_DEPTH, Z_COURTYARD_BASE, STAGE_HEIGHT)
    make_mesh_object("Stage_Brick_Plinth_SolidFront", bm_plinth, coll, mats["stage_brick"])

    # 2. Smooth polished stone deck slab
    bm_deck = bmesh.new()
    add_box(bm_deck, 0.0, STAGE_Y_CENTER, STAGE_WIDTH + 0.3, STAGE_DEPTH + 0.3, STAGE_HEIGHT, STAGE_HEIGHT + 0.08)
    make_mesh_object("Stage_Stone_Deck", bm_deck, coll, mats["stage_deck"])

    # 3. SIDE ACCESS STAIRS ONLY (West Flank and East Flank)
    bm_side_steps = bmesh.new()
    num_side_steps = 5
    stair_w = 1.35
    stair_l = 3.60
    stair_step_l = stair_l / num_side_steps
    stair_step_h = STAGE_HEIGHT / num_side_steps

    # West Flank Stairs (X: -7.5m to -8.85m, rising from front South to North)
    x_w = - (STAGE_WIDTH * 0.5) - (stair_w * 0.5)
    for s in range(num_side_steps):
        sy = (STAGE_Y_CENTER - STAGE_DEPTH*0.5) + (s * stair_step_l) + (stair_step_l * 0.5)
        sz = (s + 1) * stair_step_h
        add_box(bm_side_steps, x_w, sy, stair_w, stair_step_l, Z_COURTYARD_BASE, sz)

    # East Flank Stairs (X: +7.5m to +8.85m, rising from front South to North)
    x_e = (STAGE_WIDTH * 0.5) + (stair_w * 0.5)
    for s in range(num_side_steps):
        sy = (STAGE_Y_CENTER - STAGE_DEPTH*0.5) + (s * stair_step_l) + (stair_step_l * 0.5)
        sz = (s + 1) * stair_step_h
        add_box(bm_side_steps, x_e, sy, stair_w, stair_step_l, Z_COURTYARD_BASE, sz)

    make_mesh_object("Stage_Side_Access_Stairs", bm_side_steps, coll, mats["stage_steps"])

    # 4. Crimson Backdrop Wall
    bm_back = bmesh.new()
    wall_y = 17.80
    wall_w = 8.60
    wall_h = 3.40
    add_box(bm_back, 0.0, wall_y, wall_w, 0.40, STAGE_HEIGHT, STAGE_HEIGHT + wall_h)
    make_mesh_object("Stage_Crimson_Backdrop_Wall", bm_back, coll, mats["stage_backdrop"])

    # 5. Bold 3D White "JIET" Typography (centered on backdrop wall)
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
    text_obj.location = (0.0, wall_y - 0.22, STAGE_HEIGHT + 1.65)
    text_obj.rotation_euler = (math.radians(90.0), 0.0, 0.0)
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
# 5. UNBLOCKED CORRIDORS, RADIATING LTs WITH DOORS & ROTUNDA HELICAL STAIRCASES
# =============================================================================
def build_authentic_corner(coll, mats, corner_name, quad_sign_x, quad_sign_y, floor_lvl='GF'):
    """
    Builds the authentic CAD blueprint corner configuration (24.4.2014):
      - Corner origin is at (cx, cy) = (quad_sign_x * 18.0, quad_sign_y * 18.0).
      - Inner Rotunda Staircase Bay: r in [0, 2.4m], recessed with central white pillar, helical treads.
      - Flanking toilet blocks as shown in CAD plans.
      - Continuous 10-foot Curved Corridor: r in [2.4m, 5.45m] (width = 3.05m = 10 ft), sweeping 90 degrees.
      - Radiating Wedge Lecture Halls (LTs): r in [5.45m, 17.60m] (depth = 12m = ~39.5 ft):
        * SW & NW corners: 3 radiating LTs (29'-6" x 35'-0" each)
        * SE & NE corners: 4 radiating LTs (21'-3" x 35'-0" each)
        * Every LT has full radial partition walls and an inner curved corridor wall WITH A DOORWAY & LINTEL!
      - Outer Curved Perimeter Sandstone Facade: r in [17.60m, 18.00m].
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

    cx = quad_sign_x * 18.0
    cy = quad_sign_y * 18.0

    r_stair_in = 0.38
    r_stair_out = 2.10
    r_stair_col = 0.35
    r_rot_wall = 2.25

    r_corr_in = 2.40
    r_corr_out = 5.45

    r_rooms_in = 5.45
    r_rooms_out = 17.60
    r_facade_out = 18.00

    def get_pt(r, phi_rad):
        # phi=0 aligns with Y wing; phi=pi/2 aligns with X wing
        x = cx + quad_sign_x * r * math.sin(phi_rad)
        y = cy + quad_sign_y * r * math.cos(phi_rad)
        return (x, y)

    # 1. 10-Foot Wide Curved Corridor Floor Arc (Unobstructed continuous passage)
    corr_segments = 16
    for i in range(corr_segments):
        p0 = (i / corr_segments) * (math.pi * 0.5)
        p1 = ((i + 1) / corr_segments) * (math.pi * 0.5)
        p0_in = get_pt(r_corr_in, p0)
        p1_in = get_pt(r_corr_in, p1)
        p1_out = get_pt(r_corr_out, p1)
        p0_out = get_pt(r_corr_out, p0)
        add_prism(bm_corridor, [p0_in, p1_in, p1_out, p0_out], z_floor_base, z_floor_top)

    # 2. Radiating Lecture Halls (Outer Quadrant Arc)
    # SW & NW have 3 rooms (29'-6" x 35'-0"); SE & NE have 4 rooms (21'-3" x 35'-0")
    is_3_rooms = (quad_sign_x < 0)
    num_rooms = 3 if is_3_rooms else 4
    room_mat = mats["mazemap_lt_upper"] if is_ff else mats["mazemap_lt"]

    for r_idx in range(num_rooms):
        p0 = (r_idx / num_rooms) * (math.pi * 0.5)
        p1 = ((r_idx + 1) / num_rooms) * (math.pi * 0.5)

        # Room floor prism
        pts_room = []
        seg_sub = 8
        for s in range(seg_sub + 1):
            sa = p0 + (s / seg_sub) * (p1 - p0)
            pts_room.append(get_pt(r_rooms_in, sa))
        for s in range(seg_sub, -1, -1):
            sa = p0 + (s / seg_sub) * (p1 - p0)
            pts_room.append(get_pt(r_rooms_out, sa))
        add_prism(bm_lts, pts_room, z_floor_base, z_floor_top)

        # Radial partition wall at p0 (for r_idx > 0)
        if r_idx > 0:
            p_in = get_pt(r_rooms_in, p0)
            p_out = get_pt(r_rooms_out, p0)
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
        door_ang = DOOR_WIDTH / r_rooms_in
        d0 = p_mid - door_ang * 0.5
        d1 = p_mid + door_ang * 0.5

        # Solid wall segment from p0 to d0
        if d0 > p0 + 0.02:
            pts_w1 = []
            for s in range(4):
                ca = p0 + (s / 3.0) * (d0 - p0)
                pts_w1.append(get_pt(r_rooms_in, ca))
            for s in range(3, -1, -1):
                ca = p0 + (s / 3.0) * (d0 - p0)
                pts_w1.append(get_pt(r_rooms_in + WALL_CORR_TH, ca))
            add_prism(bm_walls, pts_w1, z_wall_base, z_wall_top)

        # Solid wall segment from d1 to p1
        if p1 > d1 + 0.02:
            pts_w2 = []
            for s in range(4):
                ca = d1 + (s / 3.0) * (p1 - d1)
                pts_w2.append(get_pt(r_rooms_in, ca))
            for s in range(3, -1, -1):
                ca = d1 + (s / 3.0) * (p1 - d1)
                pts_w2.append(get_pt(r_rooms_in + WALL_CORR_TH, ca))
            add_prism(bm_walls, pts_w2, z_wall_base, z_wall_top)

        # Door lintel from d0 to d1 (above DOOR_HEIGHT = 2.20m)
        pts_lintel = []
        for s in range(4):
            ca = d0 + (s / 3.0) * (d1 - d0)
            pts_lintel.append(get_pt(r_rooms_in, ca))
        for s in range(3, -1, -1):
            ca = d0 + (s / 3.0) * (d1 - d0)
            pts_lintel.append(get_pt(r_rooms_in + WALL_CORR_TH, ca))
        add_prism(bm_walls, pts_lintel, z_wall_base + DOOR_HEIGHT, z_wall_top)

    # Flanking radial end walls at p = 0 and p = pi/2
    for p_end in [0.0, math.pi * 0.5]:
        p_in = get_pt(r_rooms_in, p_end)
        p_out = get_pt(r_rooms_out, p_end)
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

    # 3. Outer Curved Perimeter Sandstone Facade Wall
    pts_ext = []
    ext_segs = 16
    for s in range(ext_segs + 1):
        ca = (s / ext_segs) * (math.pi * 0.5)
        pts_ext.append(get_pt(r_rooms_out, ca))
    for s in range(ext_segs, -1, -1):
        ca = (s / ext_segs) * (math.pi * 0.5)
        pts_ext.append(get_pt(r_facade_out, ca))
    add_prism(bm_walls, pts_ext, z_wall_base, z_wall_top)

    # 4. Central Column & Helical Staircase (Only constructed once on GF/Structural core)
    if not is_ff:
        add_cylinder(bm_walls, cx, cy, r_stair_col, Z_GF_WALL_BASE, Z_FF_CEILING, segments=16)

        num_helical_steps = 22
        stair_dz = (Z_FF_FLOOR - Z_GF_FLOOR) / num_helical_steps
        step_ang_span = 270.0
        dir_to_courtyard = math.degrees(math.atan2(-quad_sign_y, -quad_sign_x))
        dir_to_outer = math.degrees(math.atan2(quad_sign_y, quad_sign_x))
        stair_base_rot = dir_to_courtyard - 35.0

        for s in range(num_helical_steps):
            sa0 = math.radians(stair_base_rot + (s / num_helical_steps) * step_ang_span)
            sa1 = math.radians(stair_base_rot + ((s + 1) / num_helical_steps) * step_ang_span)
            sz0 = Z_GF_FLOOR + s * stair_dz
            sz1 = sz0 + stair_dz

            p0_in = (cx + r_stair_in * math.cos(sa0), cy + r_stair_in * math.sin(sa0))
            p1_in = (cx + r_stair_in * math.cos(sa1), cy + r_stair_in * math.sin(sa1))
            p1_out = (cx + r_stair_out * math.cos(sa1), cy + r_stair_out * math.sin(sa1))
            p0_out = (cx + r_stair_out * math.cos(sa0), cy + r_stair_out * math.sin(sa0))

            add_prism(bm_stair_treads, [p0_in, p1_in, p1_out, p0_out], sz1 - 0.05, sz1)
            add_prism(bm_stair_risers, [p0_in, p1_in, p1_out, p0_out], sz0, sz1 - 0.05)

            r_rail = r_stair_out - 0.10
            rx = cx + r_rail * math.cos(sa0)
            ry = cy + r_rail * math.sin(sa0)
            if s % 2 == 0:
                add_cylinder(bm_stair_rails, rx, ry, 0.03, sz1, sz1 + 0.95, segments=8)

        # Rotunda Enclosure Wall
        rot_segs = 14
        wall_span = 200.0
        wall_start = dir_to_outer - wall_span * 0.5
        for w in range(rot_segs):
            wa0 = math.radians(wall_start + (w / rot_segs) * wall_span)
            wa1 = math.radians(wall_start + ((w + 1) / rot_segs) * wall_span)
            p0_in = (cx + r_rot_wall * math.cos(wa0), cy + r_rot_wall * math.sin(wa0))
            p1_in = (cx + r_rot_wall * math.cos(wa1), cy + r_rot_wall * math.sin(wa1))
            p1_out = (cx + (r_rot_wall + WALL_INT_TH) * math.cos(wa1), cy + (r_rot_wall + WALL_INT_TH) * math.sin(wa1))
            p0_out = (cx + (r_rot_wall + WALL_INT_TH) * math.cos(wa0), cy + (r_rot_wall + WALL_INT_TH) * math.sin(wa0))
            add_prism(bm_rotunda_wall, [p0_in, p1_in, p1_out, p0_out], Z_GF_WALL_BASE, Z_GF_CEILING)

        # Flanking Toilet Partitions in Inner Bay (FR. Toilet & Restroom blocks)
        add_box(bm_toilets, cx + quad_sign_x * 1.5, cy - quad_sign_y * 1.8, 1.6, 1.8, Z_GF_PLINTH, Z_GF_FLOOR)
        add_box(bm_walls, cx + quad_sign_x * 1.5, cy - quad_sign_y * 1.8, 0.15, 1.8, Z_GF_WALL_BASE, Z_GF_CEILING)

        make_mesh_object(f"{corner_name}_Stair_Treads_Granite", bm_stair_treads, coll, mats["stair_green_marble"])
        make_mesh_object(f"{corner_name}_Stair_Risers_White", bm_stair_risers, coll, mats["stair_riser"])
        make_mesh_object(f"{corner_name}_Stair_Tubular_Railings", bm_stair_rails, coll, mats["stair_railing"])
        make_mesh_object(f"{corner_name}_Rotunda_Bay_Wall", bm_rotunda_wall, coll, mats["wall_sandstone"])
        make_mesh_object(f"{corner_name}_Corner_Toilets_Floor", bm_toilets, coll, mats["mazemap_admin"])

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
      - Continuous 10-foot covered veranda corridor around courtyard with square sandstone pillars.
      - South Wing: Entrance Porch, Portico, Lobby, Board Room, Admin Director,
        Registrar, ECE Lab, Microprocessor Lab, Medical Room, Penal Room, Admission Cell.
      - West Wing: Electronic Lab, Computer Labs 1 & 2, DHD Lab, Tutorial Rooms, Faculty Rooms.
      - North Wing: High Voltage Lab, 47' Lecture Hall, Computer Lab North, Tutorial Rooms,
        Workshop Bridge & Culvert.
      - East Wing: Conference Hall, Language Lab, Machine Lab, EMI Lab, Faculty Cabins, Stores.
      - ALL interior partition walls with real thickness.
      - ALL doorways entering from corridors with real framed lintels.
    """
    bm_corridor = bmesh.new()
    bm_pillars = bmesh.new()
    bm_ext_walls = bmesh.new()
    bm_corr_walls = bmesh.new()
    bm_int_partitions = bmesh.new()

    # 1. Continuous 10-foot covered veranda corridor around courtyard
    add_box(bm_corridor, 0.0, -19.5, 36.0, CORRIDOR_WIDTH, Z_GF_PLINTH, Z_GF_FLOOR) # South
    add_box(bm_corridor, 0.0,  19.5, 36.0, CORRIDOR_WIDTH, Z_GF_PLINTH, Z_GF_FLOOR) # North
    add_box(bm_corridor, -19.5, 0.0, CORRIDOR_WIDTH, 36.0, Z_GF_PLINTH, Z_GF_FLOOR) # West
    add_box(bm_corridor,  19.5, 0.0, CORRIDOR_WIDTH, 36.0, Z_GF_PLINTH, Z_GF_FLOOR) # East
    make_mesh_object("GF_Veranda_10ft_Corridors", bm_corridor, coll, mats["corridor_floor"])

    # 2. Sandstone Square Pillars along Courtyard Veranda (IMG_3051.jpeg)
    pillar_sz = 0.50
    for x in range(-16, 17, 4):
        add_box(bm_pillars, x, -18.25, pillar_sz, pillar_sz, Z_COURTYARD_BASE, Z_GF_CEILING)
        add_box(bm_pillars, x,  18.25, pillar_sz, pillar_sz, Z_COURTYARD_BASE, Z_GF_CEILING)
    for y in range(-16, 17, 4):
        add_box(bm_pillars, -18.25, y, pillar_sz, pillar_sz, Z_COURTYARD_BASE, Z_GF_CEILING)
        add_box(bm_pillars,  18.25, y, pillar_sz, pillar_sz, Z_COURTYARD_BASE, Z_GF_CEILING)
    make_mesh_object("GF_Sandstone_Veranda_Pillars", bm_pillars, coll, mats["pillar_sandstone"])

    # 3. Outer Perimeter Facade Walls (Straight wings, 36m length)
    # South Exterior Wall (with Entrance Porch opening)
    add_wall_x(bm_ext_walls, -18.0, 18.0, -35.7, WALL_EXT_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=[(0.0, 4.0, 3.0)])
    # North Exterior Wall (with Workshop Bridge opening)
    add_wall_x(bm_ext_walls, -18.0, 18.0,  35.7, WALL_EXT_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=[(0.0, 3.2, 3.0)])
    # West Exterior Wall
    add_wall_y(bm_ext_walls, -35.7, -18.0, 18.0, WALL_EXT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    # East Exterior Wall
    add_wall_y(bm_ext_walls,  35.7, -18.0, 18.0, WALL_EXT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    make_mesh_object("GF_Exterior_Facade_Walls", bm_ext_walls, coll, mats["wall_sandstone"])

    # 4. Corridor Dividing Walls with AUTHENTIC DOOR CUTOUTS & LINTELS
    # South Corridor Wall (Y = -21.05)
    gf_south_doors = [
        (-15.5, DOOR_WIDTH, DOOR_HEIGHT), # ECE Lab
        (-11.0, DOOR_WIDTH, DOOR_HEIGHT), # Campus Director
        (-9.0,  DOOR_WIDTH, DOOR_HEIGHT), # Board Room
        (-6.5,  DOOR_WIDTH, DOOR_HEIGHT), # Academic Director
        (0.0,   2.40,       DOOR_HEIGHT), # Main Reception / Lobby double door
        (6.5,   DOOR_WIDTH, DOOR_HEIGHT), # Training Office
        (11.0,  DOOR_WIDTH, DOOR_HEIGHT), # Admission Cell
        (15.5,  DOOR_WIDTH, DOOR_HEIGHT), # Microprocessor Lab
    ]
    add_wall_x(bm_corr_walls, -18.0, 18.0, -21.05, WALL_CORR_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=gf_south_doors)

    # North Corridor Wall (Y = 21.05)
    gf_north_doors = [
        (-12.0, DOOR_WIDTH, DOOR_HEIGHT), # Computer Lab North
        (-8.0,  DOOR_WIDTH, DOOR_HEIGHT), # Tutorial / Director Room
        (-3.5,  DOOR_WIDTH, DOOR_HEIGHT), # Lecture Hall 47' West
        (0.0,   3.00,       DOOR_HEIGHT), # Workshop Passage open archway
        (3.5,   DOOR_WIDTH, DOOR_HEIGHT), # Lecture Hall 47' East
        (8.0,   DOOR_WIDTH, DOOR_HEIGHT), # Tutorial Room
        (12.0,  DOOR_WIDTH, DOOR_HEIGHT), # High Voltage Lab
    ]
    add_wall_x(bm_corr_walls, -18.0, 18.0, 21.05, WALL_CORR_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=gf_north_doors)

    # West Corridor Wall (X = -21.05)
    gf_west_doors = [
        (-12.0, DOOR_WIDTH, DOOR_HEIGHT), # Electronic Lab
        (-8.0,  DOOR_WIDTH, DOOR_HEIGHT), # Electronic Lab Door 2
        (-1.5,  DOOR_WIDTH, DOOR_HEIGHT), # Computer Lab 1 (FOC)
        (7.5,   DOOR_WIDTH, DOOR_HEIGHT), # Computer Lab 2 (Software)
        (14.5,  DOOR_WIDTH, DOOR_HEIGHT), # DHD Lab & Tutorial Block
    ]
    add_wall_y(bm_corr_walls, -21.05, -18.0, 18.0, WALL_CORR_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=gf_west_doors)

    # East Corridor Wall (X = 21.05)
    gf_east_doors = [
        (-12.0, DOOR_WIDTH, DOOR_HEIGHT), # EMI Lab
        (-2.0,  DOOR_WIDTH, DOOR_HEIGHT), # Electronic Machine Lab Door 1
        (3.0,   DOOR_WIDTH, DOOR_HEIGHT), # Electronic Machine Lab Door 2
        (9.0,   DOOR_WIDTH, DOOR_HEIGHT), # Conference Hall Door 1
        (14.0,  DOOR_WIDTH, DOOR_HEIGHT), # Conference Hall Door 2
    ]
    add_wall_y(bm_corr_walls, 21.05, -18.0, 18.0, WALL_CORR_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=gf_east_doors)
    make_mesh_object("GF_Corridor_Dividing_Walls_With_Doors", bm_corr_walls, coll, mats["wall_interior"])

    # 5. INDIVIDUAL GROUND FLOOR ROOM FLOORS (Exact Blueprint Extraction)
    gf_rooms = [
        # South Wing (Admin, Labs & Suites)
        ("Room_GF_Main_Entrance_Porch", 0.0, -38.5, 9.0, 5.0, mats["mazemap_admin"], "ENTRANCE PORCH"),
        ("Room_GF_Lobby_Reception", 0.0, -25.5, 9.0, 8.8, mats["mazemap_admin"], "RECEPTION & LOBBY"),
        ("Room_GF_Registrar_Office", 0.0, -32.6, 9.0, 5.8, mats["mazemap_admin"], "REGISTRAR OFFICE"),
        ("Room_GF_Board_Room", -9.0, -32.6, 9.0, 5.8, mats["mazemap_admin"], "BOARD ROOM"),
        ("Room_GF_Admin_Director", -6.5, -27.5, 4.0, 4.4, mats["mazemap_admin"], "ACAD. DIRECTOR"),
        ("Room_GF_Campus_Director", -11.0, -23.5, 5.0, 4.6, mats["mazemap_admin"], "CAMPUS DIRECTOR"),
        ("Room_GF_Secrecy_Toilets", -6.5, -23.5, 4.0, 4.6, mats["mazemap_admin"], "SECRECY & TOILETS"),
        ("Room_GF_Pantry_PA", -11.0, -27.5, 5.0, 4.4, mats["mazemap_admin"], "PANTRY & P.A."),
        ("Room_GF_Training_Office", 6.5, -32.6, 4.0, 5.8, mats["mazemap_admin"], "TRAINING OFFICE"),
        ("Room_GF_Admission_Cell", 11.0, -31.1, 5.0, 8.8, mats["mazemap_admin"], "ADMISSION CELL"),
        ("Room_GF_Student_Cell", 11.0, -24.1, 5.0, 5.2, mats["mazemap_admin"], "STUDENT CELL"),
        ("Room_GF_Staff_Cabins_Toilets", 6.5, -25.5, 4.0, 8.0, mats["mazemap_admin"], "STAFF CABINS"),
        ("Room_GF_ECE_Lab", -15.75, -28.4, 4.5, 14.2, mats["mazemap_lab"], "ECE LAB"),
        ("Room_GF_Microprocessor_Lab", 15.75, -28.4, 4.5, 14.2, mats["mazemap_lab"], "MICROPROCESSOR LAB"),

        # West Wing (Academic, Computer Labs & Electronic)
        ("Room_GF_Electronic_Lab", -28.4, -11.75, 14.2, 11.5, mats["mazemap_lab"], "ELECTRONIC LAB"),
        ("Room_GF_Computer_Lab_1", -28.4, -1.5, 14.2, 8.8, mats["mazemap_cs_lab"], "COMPUTER LAB 1"),
        ("Room_GF_Computer_Lab_2", -28.4, 7.25, 14.2, 8.5, mats["mazemap_cs_lab"], "COMPUTER LAB 2"),
        ("Room_GF_DHD_Lab_Store", -32.0, 14.75, 7.0, 6.2, mats["mazemap_lab"], "DHD LAB & STORE"),
        ("Room_GF_Tutorial_West", -24.8, 14.75, 7.0, 6.2, mats["mazemap_lt"], "TUTORIAL WEST"),

        # North Wing (Engineering Labs & Workshops)
        ("Room_GF_Computer_Lab_North", -12.0, 28.4, 11.5, 14.2, mats["mazemap_cs_lab"], "COMPUTER LAB N"),
        ("Room_GF_Lecture_Hall_47", 0.0, 28.4, 12.0, 14.2, mats["mazemap_lt"], "LECTURE HALL 47'"),
        ("Room_GF_High_Voltage_Lab", 12.0, 28.4, 11.5, 14.2, mats["mazemap_lab"], "HIGH VOLTAGE LAB"),
        ("Room_GF_Workshop_Bridge", 0.0, 39.0, 4.5, 6.5, mats["walkway_paved"], "WORKSHOP BRIDGE"),
        ("Room_GF_Warden_Staff_Office", -4.0, 39.0, 3.5, 6.5, mats["mazemap_admin"], "WARDEN OFFICE"),

        # East Wing (Conference & Machine Labs)
        ("Room_GF_EMI_Lab", 28.4, -11.75, 14.2, 11.5, mats["mazemap_lab"], "EMI LAB"),
        ("Room_GF_Electronic_Machine_Lab", 28.4, 0.0, 14.2, 11.8, mats["mazemap_lab"], "MACHINE LAB"),
        ("Room_GF_Conference_Hall", 28.4, 11.75, 14.2, 11.5, mats["mazemap_seminar"], "CONFERENCE HALL"),
    ]

    for obj_name, cx, cy, sx, sy, room_mat, label in gf_rooms:
        bm_room = bmesh.new()
        add_box(bm_room, cx, cy, sx, sy, Z_GF_PLINTH, Z_GF_FLOOR)
        make_mesh_object(obj_name, bm_room, coll, room_mat)

    # 6. AUTHENTIC INTERIOR PARTITION WALLS (Ground Floor)
    # South Wing Partitions
    add_wall_y(bm_int_partitions, -13.5, -35.7, -21.05, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_wall_y(bm_int_partitions,  -4.5, -35.7, -21.05, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_wall_y(bm_int_partitions,   4.5, -35.7, -21.05, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_wall_y(bm_int_partitions,  13.5, -35.7, -21.05, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_wall_y(bm_int_partitions,  -8.5, -35.7, -21.05, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_wall_y(bm_int_partitions,   8.5, -35.7, -21.05, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)

    add_wall_x(bm_int_partitions, -13.5, -4.5, -29.7, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=[(-9.0, 1.0, DOOR_HEIGHT)])
    add_wall_x(bm_int_partitions, -13.5, -4.5, -25.5, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=[(-6.5, 1.0, DOOR_HEIGHT)])
    add_wall_x(bm_int_partitions,  -4.5,  4.5, -29.5, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=[(0.0, 1.2, DOOR_HEIGHT)])
    add_wall_x(bm_int_partitions,   4.5, 13.5, -29.7, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=[(6.5, 1.0, DOOR_HEIGHT)])
    add_wall_x(bm_int_partitions,   4.5, 13.5, -26.5, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=[(11.0, 1.0, DOOR_HEIGHT)])

    # West Wing Partitions
    add_wall_x(bm_int_partitions, -35.7, -21.05, -6.0, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_wall_x(bm_int_partitions, -35.7, -21.05,  3.0, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_wall_x(bm_int_partitions, -35.7, -21.05, 11.5, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_wall_y(bm_int_partitions, -28.5, 11.5, 17.8, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=[(14.5, 1.0, DOOR_HEIGHT)])

    # North Wing Partitions
    add_wall_y(bm_int_partitions, -6.5, 21.05, 35.7, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_wall_y(bm_int_partitions,  6.5, 21.05, 35.7, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_wall_x(bm_int_partitions, -17.8, -6.5, 28.5, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=[(-12.0, 1.0, DOOR_HEIGHT)])
    add_wall_x(bm_int_partitions,   6.5, 17.8, 28.5, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=[(12.0, 1.0, DOOR_HEIGHT)])

    # East Wing Partitions
    add_wall_x(bm_int_partitions, 21.05, 35.7, -6.5, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_wall_x(bm_int_partitions, 21.05, 35.7,  6.5, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_wall_y(bm_int_partitions, 28.5, 6.5, 17.8, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING, doors=[(11.5, 1.0, DOOR_HEIGHT)])

    make_mesh_object("GF_Interior_Room_Partition_Walls", bm_int_partitions, coll, mats["wall_interior"])

# =============================================================================
# 7. FIRST FLOOR ARCHITECTURE (COMPLETE BLUEPRINT ROOM EXTRACTION)
# =============================================================================
def build_first_floor(coll, mats):
    """
    Builds the authentic First Floor from blueprint CO-ED UP TO DATE 24.4.2014-Model.pdf:
      - Structural floor slab at Z = 3.86m to 4.11m with central courtyard opening.
      - 10-foot wide veranda corridor with continuous safety balustrade railing overlooking courtyard.
      - South Wing: Central Library (52' x 64'6"), Internet Lab, Digital Reference Annex, Faculty Rooms.
      - West Wing: Antenna Lab, Communication Systems Lab, Upper CS Lab, Language Lab, Tutorial.
      - North Wing: Multipurpose Hall (38' x 50'), Chemistry Lab, Mechanical Lab, Canteen Annex.
      - East Wing: Drawing Halls 1 & 2, Physics Lab, Dark Room, Faculty Rooms.
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

    # 1. Structural Floor Slab with Open Courtyard and Rounded Corners
    add_box(bm_slab, -27.0, 0.0, 18.0, 36.0, Z_GF_CEILING, Z_FF_SLAB_TOP) # West
    add_box(bm_slab,  27.0, 0.0, 18.0, 36.0, Z_GF_CEILING, Z_FF_SLAB_TOP) # East
    add_box(bm_slab, 0.0,  27.0, 36.0, 18.0, Z_GF_CEILING, Z_FF_SLAB_TOP) # North
    add_box(bm_slab, 0.0, -27.0, 36.0, 18.0, Z_GF_CEILING, Z_FF_SLAB_TOP) # South

    # 4 rounded corner quadrant slabs
    for qx, qy in [(-1.0, 1.0), (1.0, 1.0), (-1.0, -1.0), (1.0, -1.0)]:
        ccx, ccy = qx * 18.0, qy * 18.0
        pts_slab_corner = [(ccx, ccy)]
        for s in range(13):
            sa = (s / 12.0) * (math.pi * 0.5)
            pts_slab_corner.append((ccx + qx * 18.0 * math.sin(sa), ccy + qy * 18.0 * math.cos(sa)))
        add_prism(bm_slab, pts_slab_corner, Z_GF_CEILING, Z_FF_SLAB_TOP)

    make_mesh_object("FF_Structural_Floor_Slab", bm_slab, coll, mats["slab_concrete"])

    # 2. First Floor 10-foot Veranda Corridors
    add_box(bm_ff_corr, 0.0, -19.5, 36.0, CORRIDOR_WIDTH, Z_FF_SLAB_TOP, Z_FF_FLOOR)
    add_box(bm_ff_corr, 0.0,  19.5, 36.0, CORRIDOR_WIDTH, Z_FF_SLAB_TOP, Z_FF_FLOOR)
    add_box(bm_ff_corr, -19.5, 0.0, CORRIDOR_WIDTH, 36.0, Z_FF_SLAB_TOP, Z_FF_FLOOR)
    add_box(bm_ff_corr,  19.5, 0.0, CORRIDOR_WIDTH, 36.0, Z_FF_SLAB_TOP, Z_FF_FLOOR)
    make_mesh_object("FF_Veranda_10ft_Corridors", bm_ff_corr, coll, mats["corridor_floor"])

    # 3. Veranda Safety Balustrade (1.05m high railing overlooking courtyard)
    bal_h = 1.05
    bal_th = 0.20
    add_box(bm_balustrade, 0.0, -18.1, 36.0, bal_th, Z_FF_SLAB_TOP, Z_FF_SLAB_TOP + bal_h)
    add_box(bm_balustrade, 0.0,  18.1, 36.0, bal_th, Z_FF_SLAB_TOP, Z_FF_SLAB_TOP + bal_h)
    add_box(bm_balustrade, -18.1, 0.0, bal_th, 36.0, Z_FF_SLAB_TOP, Z_FF_SLAB_TOP + bal_h)
    add_box(bm_balustrade,  18.1, 0.0, bal_th, 36.0, Z_FF_SLAB_TOP, Z_FF_SLAB_TOP + bal_h)
    make_mesh_object("FF_Veranda_Safety_Balustrade", bm_balustrade, coll, mats["balustrade_white"])

    # 4. First Floor Exterior Perimeter Sandstone Facade Walls
    add_wall_x(bm_ff_ext, -18.0, 18.0, -35.7, WALL_EXT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)
    add_wall_x(bm_ff_ext, -18.0, 18.0,  35.7, WALL_EXT_TH, Z_FF_WALL_BASE, Z_FF_CEILING, doors=[(0.0, 3.2, 3.0)])
    add_wall_y(bm_ff_ext, -35.7, -18.0, 18.0, WALL_EXT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)
    add_wall_y(bm_ff_ext,  35.7, -18.0, 18.0, WALL_EXT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)
    make_mesh_object("FF_Exterior_Facade_Walls", bm_ff_ext, coll, mats["wall_sandstone"])

    # 5. First Floor Corridor Dividing Walls with AUTHENTIC DOORWAYS & LINTELS
    # South Corridor Wall (Y = -21.05)
    ff_south_doors = [
        (-13.5, DOOR_WIDTH, DOOR_HEIGHT), # Internet Lab
        (-8.0,  DOOR_WIDTH, DOOR_HEIGHT), # Faculty Cabins South
        (0.0,   2.40,       DOOR_HEIGHT), # Central Library Grand Double Door
        (8.0,   DOOR_WIDTH, DOOR_HEIGHT), # M.Tech Lab
        (13.5,  DOOR_WIDTH, DOOR_HEIGHT), # Digital Library Reference Annex
    ]
    add_wall_x(bm_ff_corr_walls, -18.0, 18.0, -21.05, WALL_CORR_TH, Z_FF_WALL_BASE, Z_FF_CEILING, doors=ff_south_doors)

    # North Corridor Wall (Y = 21.05)
    ff_north_doors = [
        (-13.5, DOOR_WIDTH, DOOR_HEIGHT), # Upper Mechanical Lab
        (-7.5,  DOOR_WIDTH, DOOR_HEIGHT), # Tutorial Room North
        (-3.0,  1.50,       DOOR_HEIGHT), # Multipurpose Hall West
        (0.0,   3.00,       DOOR_HEIGHT), # Passage to Canteen Annex
        (3.0,   1.50,       DOOR_HEIGHT), # Multipurpose Hall East
        (7.5,   DOOR_WIDTH, DOOR_HEIGHT), # Faculty Cabins
        (13.5,  DOOR_WIDTH, DOOR_HEIGHT), # Upper Chemistry Lab
    ]
    add_wall_x(bm_ff_corr_walls, -18.0, 18.0, 21.05, WALL_CORR_TH, Z_FF_WALL_BASE, Z_FF_CEILING, doors=ff_north_doors)

    # West Corridor Wall (X = -21.05)
    ff_west_doors = [
        (-12.0, DOOR_WIDTH, DOOR_HEIGHT), # Antenna Lab
        (-1.0,  DOOR_WIDTH, DOOR_HEIGHT), # Communication Systems Lab
        (8.0,   DOOR_WIDTH, DOOR_HEIGHT), # Upper CS Lab
        (14.0,  DOOR_WIDTH, DOOR_HEIGHT), # Language Lab & Tutorial
    ]
    add_wall_y(bm_ff_corr_walls, -21.05, -18.0, 18.0, WALL_CORR_TH, Z_FF_WALL_BASE, Z_FF_CEILING, doors=ff_west_doors)

    # East Corridor Wall (X = 21.05)
    ff_east_doors = [
        (-12.0, DOOR_WIDTH, DOOR_HEIGHT), # Physics Lab
        (-0.5,  1.50,       DOOR_HEIGHT), # Drawing Hall 2
        (11.5,  1.50,       DOOR_HEIGHT), # Drawing Hall 1
        (-6.0,  DOOR_WIDTH, DOOR_HEIGHT), # Dark Room
        (6.0,   DOOR_WIDTH, DOOR_HEIGHT), # Faculty Cabins
    ]
    add_wall_y(bm_ff_corr_walls, 21.05, -18.0, 18.0, WALL_CORR_TH, Z_FF_WALL_BASE, Z_FF_CEILING, doors=ff_east_doors)
    make_mesh_object("FF_Corridor_Dividing_Walls_With_Doors", bm_ff_corr_walls, coll, mats["wall_interior"])

    # 6. INDIVIDUAL FIRST FLOOR ROOM FLOORS (Blueprint Extraction)
    ff_rooms = [
        # South Wing: Central Library & Advanced Computing
        ("Room_FF_Central_Library", 0.0, -28.4, 19.6, 14.2, mats["mazemap_library"], "CENTRAL LIBRARY"),
        ("Room_FF_Internet_Lab", -13.75, -31.1, 7.5, 8.8, mats["mazemap_cs_lab"], "INTERNET LAB"),
        ("Room_FF_Faculty_South", -13.75, -24.1, 7.5, 5.2, mats["mazemap_admin"], "FACULTY CABINS"),
        ("Room_FF_Digital_Library_Annex", 13.75, -31.1, 7.5, 8.8, mats["mazemap_library"], "DIGITAL ANNEX"),
        ("Room_FF_MTech_Lab", 13.75, -24.1, 7.5, 5.2, mats["mazemap_lab"], "M.TECH LAB"),

        # West Wing: Communication, Antenna & Upper Labs
        ("Room_FF_Antenna_Lab", -28.4, -12.0, 14.2, 11.5, mats["mazemap_lab"], "ANTENNA LAB"),
        ("Room_FF_Communication_Lab", -28.4, -1.0, 14.2, 10.5, mats["mazemap_lab"], "COMMUNICATION LAB"),
        ("Room_FF_CS_Lab_Upper", -28.4, 8.0, 14.2, 7.5, mats["mazemap_cs_lab"], "CS LAB UPPER"),
        ("Room_FF_Language_Lab_Tutorial", -28.4, 14.75, 14.2, 6.0, mats["mazemap_lt"], "LANGUAGE & TUTORIAL"),

        # North Wing: Multipurpose Hall, Science Labs & Canteen
        ("Room_FF_Multipurpose_Hall", 0.0, 28.4, 18.8, 14.2, mats["mazemap_seminar"], "MULTIPURPOSE HALL"),
        ("Room_FF_Mechanical_Lab", -13.5, 28.4, 8.2, 14.2, mats["mazemap_lab"], "MECH. LAB"),
        ("Room_FF_Chemistry_Lab", 13.5, 28.4, 8.2, 14.2, mats["mazemap_lab"], "CHEMISTRY LAB"),
        ("Room_FF_Canteen_Annex", 0.0, 41.0, 16.0, 10.0, mats["mazemap_admin"], "CANTEEN & KITCHEN"),

        # East Wing: Drawing Halls & Physics Lab
        ("Room_FF_Physics_Lab", 28.4, -12.0, 14.2, 11.5, mats["mazemap_lab"], "PHYSICS LAB"),
        ("Room_FF_Drawing_Hall_2", 28.4, -0.5, 14.2, 11.5, mats["mazemap_drawing"], "DRAWING HALL 2"),
        ("Room_FF_Drawing_Hall_1", 28.4, 11.75, 14.2, 11.5, mats["mazemap_drawing"], "DRAWING HALL 1"),
    ]

    for obj_name, cx, cy, sx, sy, room_mat, label in ff_rooms:
        bm_room = bmesh.new()
        add_box(bm_room, cx, cy, sx, sy, Z_FF_SLAB_TOP, Z_FF_FLOOR)
        make_mesh_object(obj_name, bm_room, coll, room_mat)

    # 7. AUTHENTIC INTERIOR PARTITION WALLS (First Floor)
    # South Wing Partitions
    add_wall_y(bm_ff_int_partitions, -10.0, -35.7, -21.05, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)
    add_wall_y(bm_ff_int_partitions,  10.0, -35.7, -21.05, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)
    add_wall_x(bm_ff_int_partitions, -17.8, -10.0, -26.5, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING, doors=[(-13.5, 1.0, DOOR_HEIGHT)])
    add_wall_x(bm_ff_int_partitions,  10.0,  17.8, -26.5, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING, doors=[(13.5, 1.0, DOOR_HEIGHT)])

    # West Wing Partitions
    add_wall_x(bm_ff_int_partitions, -35.7, -21.05, -6.5, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)
    add_wall_x(bm_ff_int_partitions, -35.7, -21.05,  4.5, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)
    add_wall_x(bm_ff_int_partitions, -35.7, -21.05, 11.5, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)

    # North Wing Partitions
    add_wall_y(bm_ff_int_partitions, -9.5, 21.05, 35.7, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)
    add_wall_y(bm_ff_int_partitions,  9.5, 21.05, 35.7, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)
    add_wall_x(bm_ff_int_partitions, -17.8, -9.5, 28.5, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING, doors=[(-13.5, 1.0, DOOR_HEIGHT)])
    add_wall_x(bm_ff_int_partitions,   9.5, 17.8, 28.5, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING, doors=[(13.5, 1.0, DOOR_HEIGHT)])

    # East Wing Partitions
    add_wall_x(bm_ff_int_partitions, 21.05, 35.7, -6.5, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)
    add_wall_x(bm_ff_int_partitions, 21.05, 35.7,  5.5, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)
    add_wall_y(bm_ff_int_partitions, 28.5, -17.8, -6.5, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING, doors=[(-12.0, 1.0, DOOR_HEIGHT)])

    make_mesh_object("FF_Interior_Room_Partition_Walls", bm_ff_int_partitions, coll, mats["wall_interior"])

    # 8. Roof Parapet Cap (Clean Architecture, Rounded Corners, ZERO Solar Panels)
    bm_roof_parapet = bmesh.new()
    add_box(bm_roof_parapet, 0.0, -36.0 + WALL_EXT_TH*0.5, 36.0, WALL_EXT_TH, Z_ROOF_TOP, Z_ROOF_TOP + ROOF_PARAPET_H)
    add_box(bm_roof_parapet, 0.0,  36.0 - WALL_EXT_TH*0.5, 36.0, WALL_EXT_TH, Z_ROOF_TOP, Z_ROOF_TOP + ROOF_PARAPET_H)
    add_box(bm_roof_parapet, -36.0 + WALL_EXT_TH*0.5, 0.0, WALL_EXT_TH, 36.0, Z_ROOF_TOP, Z_ROOF_TOP + ROOF_PARAPET_H)
    add_box(bm_roof_parapet,  36.0 - WALL_EXT_TH*0.5, 0.0, WALL_EXT_TH, 36.0, Z_ROOF_TOP, Z_ROOF_TOP + ROOF_PARAPET_H)
    for qx, qy in [(-1.0, 1.0), (1.0, 1.0), (-1.0, -1.0), (1.0, -1.0)]:
        ccx, ccy = qx * 18.0, qy * 18.0
        pts_parapet = []
        for s in range(9):
            sa = (s / 8.0) * (math.pi * 0.5)
            pts_parapet.append((ccx + qx * 17.60 * math.sin(sa), ccy + qy * 17.60 * math.cos(sa)))
        for s in range(8, -1, -1):
            sa = (s / 8.0) * (math.pi * 0.5)
            pts_parapet.append((ccx + qx * 18.00 * math.sin(sa), ccy + qy * 18.00 * math.cos(sa)))
        add_prism(bm_roof_parapet, pts_parapet, Z_ROOF_TOP, Z_ROOF_TOP + ROOF_PARAPET_H)
    make_mesh_object("Roof_Perimeter_Parapet_Clean", bm_roof_parapet, coll, mats["wall_sandstone"])

# =============================================================================
# 8. ARCHITECTURAL LABELS & LIGHTING
# =============================================================================
def add_floor_label(coll, mats, text, x, y, z, size=0.65):
    font = get_font()
    curve = bpy.data.curves.new(name=f"Label_{text[:8]}", type='FONT')
    curve.body = text
    if font:
        curve.font = font
    curve.size = size
    curve.extrude = 0.02
    curve.align_x = 'CENTER'
    curve.align_y = 'CENTER'

    obj = bpy.data.objects.new(f"FloorLabel_{text}", curve)
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
    labels = [
        # Ground Floor South Wing
        ("BOARD ROOM", -9.0, -32.6, Z_GF_FLOOR + 0.01),
        ("RECEPTION", 0.0, -25.5, Z_GF_FLOOR + 0.01),
        ("REGISTRAR", 0.0, -32.6, Z_GF_FLOOR + 0.01),
        ("ACAD. DIRECTOR", -6.5, -27.5, Z_GF_FLOOR + 0.01),
        ("CAMPUS DIRECTOR", -11.0, -23.5, Z_GF_FLOOR + 0.01),
        ("ECE LAB", -15.75, -28.4, Z_GF_FLOOR + 0.01),
        ("MICROPROCESSOR", 15.75, -28.4, Z_GF_FLOOR + 0.01),
        ("ADMISSION CELL", 11.0, -31.1, Z_GF_FLOOR + 0.01),
        ("TRAINING OFFICE", 6.5, -32.6, Z_GF_FLOOR + 0.01),

        # Ground Floor West Wing
        ("ELECTRONIC LAB", -28.4, -11.75, Z_GF_FLOOR + 0.01),
        ("COMPUTER LAB 1", -28.4, -1.5, Z_GF_FLOOR + 0.01),
        ("COMPUTER LAB 2", -28.4, 7.25, Z_GF_FLOOR + 0.01),
        ("DHD LAB & STORE", -32.0, 14.75, Z_GF_FLOOR + 0.01),
        ("TUTORIAL WEST", -24.8, 14.75, Z_GF_FLOOR + 0.01),

        # Ground Floor North Wing
        ("COMPUTER LAB N", -12.0, 28.4, Z_GF_FLOOR + 0.01),
        ("LECTURE HALL 47'", 0.0, 28.4, Z_GF_FLOOR + 0.01),
        ("HIGH VOLTAGE LAB", 12.0, 28.4, Z_GF_FLOOR + 0.01),

        # Ground Floor East Wing
        ("EMI LAB", 28.4, -11.75, Z_GF_FLOOR + 0.01),
        ("MACHINE LAB", 28.4, 0.0, Z_GF_FLOOR + 0.01),
        ("CONFERENCE HALL", 28.4, 11.75, Z_GF_FLOOR + 0.01),

        # First Floor South Wing
        ("CENTRAL LIBRARY", 0.0, -28.4, Z_FF_FLOOR + 0.01),
        ("INTERNET LAB", -13.75, -31.1, Z_FF_FLOOR + 0.01),
        ("DIGITAL ANNEX", 13.75, -31.1, Z_FF_FLOOR + 0.01),
        ("M.TECH LAB", 13.75, -24.1, Z_FF_FLOOR + 0.01),

        # First Floor West Wing
        ("ANTENNA LAB", -28.4, -12.0, Z_FF_FLOOR + 0.01),
        ("COMMUNICATION LAB", -28.4, -1.0, Z_FF_FLOOR + 0.01),
        ("CS LAB UPPER", -28.4, 8.0, Z_FF_FLOOR + 0.01),
        ("LANGUAGE LAB", -28.4, 14.75, Z_FF_FLOOR + 0.01),

        # First Floor North Wing
        ("MULTIPURPOSE HALL", 0.0, 28.4, Z_FF_FLOOR + 0.01),
        ("MECH. LAB", -13.5, 28.4, Z_FF_FLOOR + 0.01),
        ("CHEMISTRY LAB", 13.5, 28.4, Z_FF_FLOOR + 0.01),

        # First Floor East Wing
        ("PHYSICS LAB", 28.4, -12.0, Z_FF_FLOOR + 0.01),
        ("DRAWING HALL 2", 28.4, -0.5, Z_FF_FLOOR + 0.01),
        ("DRAWING HALL 1", 28.4, 11.75, Z_FF_FLOOR + 0.01),
    ]
    for text, x, y, z in labels:
        add_floor_label(coll, mats, text, x, y, z, size=0.65)

def setup_lighting(coll):
    # Sun light (warm sunlight)
    sun_data = bpy.data.lights.new("Sun_Jodhpur", type='SUN')
    sun_data.energy = 4.5
    sun_data.color = (1.0, 0.96, 0.90)
    sun_obj = bpy.data.objects.new("Sun_Jodhpur", sun_data)
    sun_obj.location = (45.0, -35.0, 65.0)
    sun_obj.rotation_euler = (math.radians(52.0), math.radians(12.0), math.radians(-38.0))
    coll.objects.link(sun_obj)

    # Ambient sky fill
    world = bpy.context.scene.world
    if not world:
        world = bpy.data.worlds.new("World_Sky")
        bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.78, 0.88, 0.98, 1.0)
        bg.inputs["Strength"].default_value = 1.15

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

    # 1. Courtyard View
    cam_courtyard = create_targeted_camera(
        coll, "courtyard_view_admin_to_stage",
        location=(0.0, -16.5, 2.8),
        target=(0.0, 15.6, 1.2),
        lens=24.0
    )
    cameras["courtyard_view_admin_to_stage"] = cam_courtyard

    # 2. Stage Close-Up
    cam_stage = create_targeted_camera(
        coll, "stage_close_up",
        location=(0.0, 5.0, 2.0),
        target=(0.0, 15.6, 1.5),
        lens=32.0
    )
    cameras["stage_close_up"] = cam_stage

    # 3. Corner Staircase Close-Up
    cam_stairs = create_targeted_camera(
        coll, "corner_staircase_close_up",
        location=(-14.5, 14.5, 1.8),
        target=(-18.0, 18.0, 1.6),
        lens=24.0
    )
    cameras["corner_staircase_close_up"] = cam_stairs

    # 4. Unblocked Corridor View (looking straight North down 10ft colonnade showing doors & lintels)
    cam_corridor = create_targeted_camera(
        coll, "corridor_unblocked_view",
        location=(-19.5, -8.0, 1.7),
        target=(-19.5, 12.0, 1.7),
        lens=26.0
    )
    cameras["corridor_unblocked_view"] = cam_corridor

    # 5. Top-Down Overview (wide architectural lens, entire 72m squircle)
    cam_topdown = create_targeted_camera(
        coll, "topdown_overview",
        location=(0.0, 0.0, 115.0),
        target=(0.0, 0.0, 0.0),
        lens=24.0
    )
    cam_topdown.rotation_euler = Euler((0.0, 0.0, 0.0), 'XYZ')
    cameras["topdown_overview"] = cam_topdown

    # 6. Isometric Campus View (2.5D architectural isometric)
    cam_iso = create_targeted_camera(
        coll, "isometric_campus_view",
        location=(62.0, -62.0, 52.0),
        target=(0.0, 0.0, 2.0),
        lens=45.0
    )
    cameras["isometric_campus_view"] = cam_iso

    # 7. First Floor Rooms Detail View (Elevated perspective showing Library, Drawing Halls & doors)
    cam_ff_detail = create_targeted_camera(
        coll, "first_floor_rooms_detail",
        location=(-35.0, -42.0, 28.0),
        target=(-10.0, -20.0, 5.0),
        lens=35.0
    )
    cameras["first_floor_rooms_detail"] = cam_ff_detail

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
    print("JIET JODHPUR CAMPUS DIGITAL TWIN - ARCHITECTURAL TWIN GENERATOR (v4)")
    print("=" * 70)

    # 1. Clean Scene & Initialize Collections
    scene = clean_scene()
    root_coll = scene.collection

    coll_ground = get_collection("01_Courtyard_Ground", root_coll)
    coll_stage = get_collection("02_Outdoor_Stage", root_coll)
    coll_stairs_gf = get_collection("03_Corner_Staircases_GF", root_coll)
    coll_gf = get_collection("04_Ground_Floor_Architecture", root_coll)
    coll_ff = get_collection("05_First_Floor_Architecture", root_coll)
    coll_stairs_ff = get_collection("06_Corner_Architecture_FF", root_coll)
    coll_labels = get_collection("07_Floor_Typography", root_coll)
    coll_env = get_collection("08_Lighting_and_Cameras", root_coll)

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
        "stair_green_marble": get_or_create_material("Mat_Stair_Green_Marble", "#143828", roughness=0.20),
        "stair_riser": get_or_create_material("Mat_Stair_Riser_White", "#f8fafc", roughness=0.35),
        "stair_railing": get_or_create_material("Mat_Stair_Tubular_Railing", "#111827", roughness=0.25, metallic=0.7),
        "wall_sandstone": get_or_create_material("Mat_Jodhpur_Sandstone", "#d49b6a", roughness=0.60),
        "wall_interior": get_or_create_material("Mat_Interior_OffWhite", "#f8fafc", roughness=0.4),
        "pillar_sandstone": get_or_create_material("Mat_Sandstone_Pillar", "#c69263", roughness=0.55),
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
        "mazemap_drawing": get_or_create_material("Mat_MazeMap_Drawing_Orange", "#f97316", roughness=0.3),
    }

    # 3. Construct Geometry
    print("-> Building Courtyard Ground, Lawns & Seating Bleachers...")
    build_courtyard(coll_ground, mats)

    print("-> Building Outdoor Stage (Solid Front, Side Access Stairs)...")
    build_outdoor_stage(coll_stage, mats)

    print("-> Building GF Unblocked Corridors, Radiating LTs & Rotunda Staircases...")
    build_all_corners(coll_stairs_gf, mats, floor_lvl='GF')

    print("-> Building Ground Floor Blueprint Rooms, Partition Walls & Doorways...")
    build_ground_floor(coll_gf, mats)

    print("-> Building First Floor Blueprint Architecture, Library, Balustrades & Doors...")
    build_first_floor(coll_ff, mats)

    print("-> Building First Floor Corner Radiating LTs & Curved Partition Walls...")
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
    scene.cycles.samples = 32
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
