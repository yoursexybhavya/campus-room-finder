"""
JIET Campus Digital Twin - Complete Procedural 3D Architectural Twin (v3)
========================================================================
Built for Blender 5.2.2 LTS / 4.x.
Grounded strictly in official CAD blueprints (24.4.2014) & site photography:
  1. ZERO Viewport Glitch / Z-Fighting: Staggered elevations and clip_start = 0.1m.
  2. Unblocked Corridors & Authentic Staircases: 10-foot continuous curved hallway
     around all 4 corners; 4 radiating outer Lecture Halls; inner rotunda helical
     staircases with central white column, dark granite treads, black tubular railings,
     completely recessed in dedicated bays with zero corridor obstruction.
  3. JIET Stage Refinements: Front face of red-brick plinth is completely flat and
     unbroken facing courtyard audience (NO front stairs); stairs placed strictly on
     the sides (West and East flanks); centered 3D white "JIET" text on crimson backdrop.
  4. Room-by-Room Blueprint Extraction: All individual rooms on Ground and First Floor
     (Admin Director, Registrar, Board Room, Reception, Microprocessor Lab, High Voltage
     Lab, ECE Lab, Conference Hall, Library, Drawing Halls, LTs) with real walls, door
     openings into corridors, and MazeMap functional colors.
  5. Courtyard: 4 manicured lawn quadrants with concrete curbs, cross-axial paved
     walkways, and South stepped amphitheater seating tiers with alternating wavy pavers.
  6. STRICTLY ZERO rooftop solar panels, zero unrequested trees, zero fountains.
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
CAMPUS_SIZE = 72.0                # Total building footprint: 72m x 72m
COURTYARD_SIZE = 36.0             # Courtyard opening: 36m x 36m ([-18, 18])
WING_DEPTH = 18.0                 # Depth of each quadrangle wing: 18m
CORRIDOR_WIDTH = 3.05             # Authentic 10-foot wide corridor (3.05m)
PLINTH_HEIGHT = 0.20              # Ground floor plinth elevation above courtyard
GF_HEIGHT = 3.65                  # Ground floor ceiling height
SLAB_THICKNESS = 0.25             # Floor slab thickness
FF_HEIGHT = 3.55                  # First floor ceiling height
ROOF_PARAPET_H = 0.60             # Clean architectural roof parapet height

WALL_EXT_TH = 0.35                # 14-inch exterior wall thickness
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
    """Extrudes a 2D polygon from z0 to z1 with guaranteed outward-pointing normals."""
    if len(pts_2d) < 3:
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

        # Non-overlapping concrete curbs (shorten horizontal curbs by 2*curb_w)
        add_box(bm_curb, (x0 + x1)*0.5, y0 + curb_w*0.5, (x1 - x0) - 2*curb_w, curb_w, Z_COURTYARD_BASE, Z_CURB_TOP)
        add_box(bm_curb, (x0 + x1)*0.5, y1 - curb_w*0.5, (x1 - x0) - 2*curb_w, curb_w, Z_COURTYARD_BASE, Z_CURB_TOP)
        add_box(bm_curb, x0 + curb_w*0.5, (y0 + y1)*0.5, curb_w, (y1 - y0), Z_COURTYARD_BASE, Z_CURB_TOP)
        add_box(bm_curb, x1 - curb_w*0.5, (y0 + y1)*0.5, curb_w, (y1 - y0), Z_COURTYARD_BASE, Z_CURB_TOP)

    make_mesh_object("Courtyard_4_Lawns", bm_lawn, coll, mats["grass"])
    make_mesh_object("Courtyard_Lawn_Curbs", bm_curb, coll, mats["curb"])

    # 3. Cross-Axial Paved Walkways (Unified non-overlapping pieces: ZERO coplanar artifacts)
    bm_walkway = bmesh.new()
    walk_w = 4.4
    half_w = walk_w * 0.5
    # Central intersection square
    add_box(bm_walkway, 0.0, 0.0, walk_w, walk_w, Z_COURTYARD_BASE, Z_WALKWAY_TOP)
    # North arm (center to Stage front plinth at Y=16.25)
    add_box(bm_walkway, 0.0, (half_w + 16.25)*0.5, walk_w, 16.25 - half_w, Z_COURTYARD_BASE, Z_WALKWAY_TOP)
    # South arm (center to South veranda at Y=-18.0)
    add_box(bm_walkway, 0.0, (-half_w - 18.0)*0.5, walk_w, 18.0 - half_w, Z_COURTYARD_BASE, Z_WALKWAY_TOP)
    # West arm (West veranda at X=-17.9 to center)
    add_box(bm_walkway, (-17.9 - half_w)*0.5, 0.0, 17.9 - half_w, walk_w, Z_COURTYARD_BASE, Z_WALKWAY_TOP)
    # East arm (center to East veranda at X=17.9)
    add_box(bm_walkway, (17.9 + half_w)*0.5, 0.0, 17.9 - half_w, walk_w, Z_COURTYARD_BASE, Z_WALKWAY_TOP)
    make_mesh_object("Courtyard_Paved_Cross_Walkways", bm_walkway, coll, mats["walkway_paved"])

    # 4. South Amphitheater Stepped Seating (Split West & East to keep central walkway completely clear)
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
# 5. UNBLOCKED CORRIDORS & AUTHENTIC ROTUNDA HELICAL STAIRCASES
# =============================================================================
def build_authentic_corner(coll, mats, corner_name, quad_sign_x, quad_sign_y):
    """
    Builds the authentic CAD blueprint corner configuration (24.4.2014):
      - Corner origin is at (cx, cy) = (quad_sign_x * 18.0, quad_sign_y * 18.0).
      - Inner Rotunda Staircase Bay: r in [0, 2.3m], recessed with central white pillar, green marble helical treads, tubular railings.
      - Continuous 10-foot Curved Corridor: r in [2.4m, 5.45m] (width = 3.05m = 10 ft), sweeping 90 degrees, completely open and unobstructed!
      - Radiating Wedge Lecture Halls (LTs): r in [5.60m, 17.60m] (depth = 12m), divided into radiating lecture halls with radial walls and doors.
      - Outer Curved Perimeter Sandstone Facade: r in [17.60m, 18.00m], connecting exterior facades smoothly.
    """
    bm_lts = bmesh.new()
    bm_corridor = bmesh.new()
    bm_walls = bmesh.new()
    bm_stair_treads = bmesh.new()
    bm_stair_risers = bmesh.new()
    bm_stair_rails = bmesh.new()
    bm_rotunda_wall = bmesh.new()

    cx = quad_sign_x * 18.0
    cy = quad_sign_y * 18.0

    r_stair_in = 0.38
    r_stair_out = 2.10
    r_stair_col = 0.35
    r_rot_wall = 2.25

    r_corr_in = 2.40
    r_corr_out = 5.45

    r_rooms_in = 5.60
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
        add_prism(bm_corridor, [p0_in, p1_in, p1_out, p0_out], Z_GF_PLINTH, Z_GF_FLOOR)

    # 2. Four Radiating Lecture Halls (Outer Quadrant Arc)
    num_rooms = 4
    for r_idx in range(num_rooms):
        p0 = (r_idx / num_rooms) * (math.pi * 0.5)
        p1 = ((r_idx + 1) / num_rooms) * (math.pi * 0.5)
        pts_room = []
        seg_sub = 6
        for s in range(seg_sub + 1):
            sa = p0 + (s / seg_sub) * (p1 - p0)
            pts_room.append(get_pt(r_rooms_in, sa))
        for s in range(seg_sub, -1, -1):
            sa = p0 + (s / seg_sub) * (p1 - p0)
            pts_room.append(get_pt(r_rooms_out, sa))
        add_prism(bm_lts, pts_room, Z_GF_PLINTH, Z_GF_FLOOR)

        # Radial partition wall
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
            add_prism(bm_walls, pts_wall, Z_GF_WALL_BASE, Z_GF_CEILING)

        # Inner corridor wall with door gap
        door_ang_width = math.radians(4.0)
        p_mid = (p0 + p1) * 0.5
        d0 = p_mid - door_ang_width * 0.5
        d1 = p_mid + door_ang_width * 0.5

        for a_start, a_end in [(p0, d0), (d1, p1)]:
            pts_cw = []
            for s in range(4):
                ca = a_start + (s / 3.0) * (a_end - a_start)
                pts_cw.append(get_pt(r_rooms_in - WALL_INT_TH, ca))
            for s in range(3, -1, -1):
                ca = a_start + (s / 3.0) * (a_end - a_start)
                pts_cw.append(get_pt(r_rooms_in, ca))
            add_prism(bm_walls, pts_cw, Z_GF_WALL_BASE, Z_GF_CEILING)

        # Door lintel
        pts_lintel = []
        for s in range(4):
            ca = d0 + (s / 3.0) * (d1 - d0)
            pts_lintel.append(get_pt(r_rooms_in - WALL_INT_TH, ca))
        for s in range(3, -1, -1):
            ca = d0 + (s / 3.0) * (d1 - d0)
            pts_lintel.append(get_pt(r_rooms_in, ca))
        add_prism(bm_walls, pts_lintel, Z_GF_WALL_BASE + DOOR_HEIGHT, Z_GF_CEILING)

    # 3. Outer Curved Perimeter Sandstone Facade Wall
    pts_ext = []
    ext_segs = 16
    for s in range(ext_segs + 1):
        ca = (s / ext_segs) * (math.pi * 0.5)
        pts_ext.append(get_pt(r_rooms_out, ca))
    for s in range(ext_segs, -1, -1):
        ca = (s / ext_segs) * (math.pi * 0.5)
        pts_ext.append(get_pt(r_facade_out, ca))
    add_prism(bm_walls, pts_ext, Z_GF_WALL_BASE, Z_GF_CEILING)

    # 4. Central Column & Helical Staircase (IMG_3068 - IMG_3070)
    add_cylinder(bm_walls, cx, cy, r_stair_col, Z_GF_WALL_BASE, Z_FF_CEILING, segments=16)

    num_helical_steps = 22
    stair_dz = (Z_FF_FLOOR - Z_GF_FLOOR) / num_helical_steps
    step_ang_span = 270.0

    # Direction from rotunda center towards courtyard / corridor
    dir_to_courtyard = math.degrees(math.atan2(-quad_sign_y, -quad_sign_x))
    # Direction towards outer building corner
    dir_to_outer = math.degrees(math.atan2(quad_sign_y, quad_sign_x))

    # Bottom stair step starts at the corridor entrance archway
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

    # Rotunda Enclosure Wall: encloses the outer 200 degrees, leaving a wide 160-degree archway open directly to the corridor
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

    make_mesh_object(f"{corner_name}_Radiating_LTs_Floor", bm_lts, coll, mats["mazemap_lt"])
    make_mesh_object(f"{corner_name}_Unblocked_Curved_Corridor", bm_corridor, coll, mats["corridor_floor"])
    make_mesh_object(f"{corner_name}_Corridor_Partition_Walls", bm_walls, coll, mats["wall_sandstone"])
    make_mesh_object(f"{corner_name}_Stair_Treads_Granite", bm_stair_treads, coll, mats["stair_green_marble"])
    make_mesh_object(f"{corner_name}_Stair_Risers_White", bm_stair_risers, coll, mats["stair_riser"])
    make_mesh_object(f"{corner_name}_Stair_Tubular_Railings", bm_stair_rails, coll, mats["stair_railing"])
    make_mesh_object(f"{corner_name}_Rotunda_Bay_Wall", bm_rotunda_wall, coll, mats["wall_sandstone"])

def build_all_corners(coll, mats):
    """Builds all 4 corners matching authentic blueprint geometry."""
    build_authentic_corner(coll, mats, "Corner_NW", -1.0,  1.0)
    build_authentic_corner(coll, mats, "Corner_NE",  1.0,  1.0)
    build_authentic_corner(coll, mats, "Corner_SW", -1.0, -1.0)
    build_authentic_corner(coll, mats, "Corner_SE",  1.0, -1.0)

# =============================================================================
# 6. GROUND FLOOR ARCHITECTURE (BLUEPRINT ROOM EXTRACTION)
# =============================================================================
def build_ground_floor(coll, mats):
    """
    Builds the authentic Ground Floor from blueprint CO-ED UP TO DATE 24.4.2014-Model.pdf 2.pdf:
      - Continuous 10-foot inner veranda corridor with square sandstone pillars every 4m.
      - South Wing: Entrance Porch, Portico, Lobby, Board Room, Admin Director,
        Registrar, ECE Lab, Microprocessor Lab.
      - West Wing: Electronic Lab, Computer Labs 1 & 2, Tutorial Rooms, Faculty Rooms, Toilets.
      - North Wing: High Voltage Lab, 47' Lecture Hall, Computer Lab, Bridge to Workshop.
      - East Wing: Conference Hall, Language Lab, Machine Lab, EMI Lab.
    """
    bm_corridor = bmesh.new()
    bm_pillars = bmesh.new()
    bm_ext_walls = bmesh.new()
    bm_int_walls = bmesh.new()

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
    add_box(bm_ext_walls, 0.0, -36.0 + WALL_EXT_TH*0.5, 36.0, WALL_EXT_TH, Z_GF_WALL_BASE, Z_GF_CEILING) # South
    add_box(bm_ext_walls, 0.0,  36.0 - WALL_EXT_TH*0.5, 36.0, WALL_EXT_TH, Z_GF_WALL_BASE, Z_GF_CEILING) # North
    add_box(bm_ext_walls, -36.0 + WALL_EXT_TH*0.5, 0.0, WALL_EXT_TH, 36.0, Z_GF_WALL_BASE, Z_GF_CEILING) # West
    add_box(bm_ext_walls,  36.0 - WALL_EXT_TH*0.5, 0.0, WALL_EXT_TH, 36.0, Z_GF_WALL_BASE, Z_GF_CEILING) # East

    # Corridor inner dividing walls with door cutouts
    # South Corridor Wall (Y = -21.0)
    add_box(bm_int_walls, -14.0, -21.0, 10.0, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_box(bm_int_walls,  14.0, -21.0, 10.0, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_box(bm_int_walls,   0.0, -21.0,  8.0, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    # North Corridor Wall (Y = 21.0)
    add_box(bm_int_walls, -14.0, 21.0, 10.0, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_box(bm_int_walls,  14.0, 21.0, 10.0, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_box(bm_int_walls,   0.0, 21.0,  8.0, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    # West Corridor Wall (X = -21.0)
    add_box(bm_int_walls, -21.0, -14.0, WALL_INT_TH, 10.0, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_box(bm_int_walls, -21.0,  14.0, WALL_INT_TH, 10.0, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_box(bm_int_walls, -21.0,   0.0, WALL_INT_TH,  8.0, Z_GF_WALL_BASE, Z_GF_CEILING)
    # East Corridor Wall (X = 21.0)
    add_box(bm_int_walls,  21.0, -14.0, WALL_INT_TH, 10.0, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_box(bm_int_walls,  21.0,  14.0, WALL_INT_TH, 10.0, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_box(bm_int_walls,  21.0,   0.0, WALL_INT_TH,  8.0, Z_GF_WALL_BASE, Z_GF_CEILING)

    make_mesh_object("GF_Exterior_Facade_Walls", bm_ext_walls, coll, mats["wall_sandstone"])
    make_mesh_object("GF_Corridor_Dividing_Walls", bm_int_walls, coll, mats["wall_interior"])

    # 4. INDIVIDUAL ROOM FLOORS & PARTITIONS (GROUND FLOOR BLUEPRINT)
    gf_rooms_spec = [
        # South Wing (Admin & Entrance) - strictly within X in [-17.5, 17.5], Y in [-35.7, -21.2]
        ("Room_GF_Main_Entrance_Porch", 0.0, -38.5, 9.0, 5.0, mats["mazemap_admin"], "ENTRANCE PORCH"),
        ("Room_GF_Lobby_Reception", 0.0, -28.5, 10.1, 14.4, mats["mazemap_admin"], "RECEPTION & LOBBY"),
        ("Room_GF_Board_Room", -9.35, -31.9, 8.1, 7.6, mats["mazemap_admin"], "BOARD ROOM"),
        ("Room_GF_Admin_Director", -9.35, -24.5, 8.1, 6.4, mats["mazemap_admin"], "ACAD. DIRECTOR"),
        ("Room_GF_Registrar_Office", 9.35, -31.9, 8.1, 7.6, mats["mazemap_admin"], "REGISTRAR CELL"),
        ("Room_GF_Campus_Director", 9.35, -24.5, 8.1, 6.4, mats["mazemap_admin"], "CAMPUS DIRECTOR"),
        ("Room_GF_ECE_Lab", -15.65, -28.5, 4.1, 14.4, mats["mazemap_lab"], "ECE LAB"),
        ("Room_GF_Microprocessor_Lab", 15.65, -28.5, 4.1, 14.4, mats["mazemap_lab"], "MICROPROCESSOR LAB"),

        # West Wing (Academic & Labs) - strictly within X in [-35.7, -21.2], Y in [-17.5, 17.5]
        ("Room_GF_Electronic_Lab", -28.5, -11.75, 14.4, 11.5, mats["mazemap_lab"], "ELECTRONIC LAB"),
        ("Room_GF_Computer_Lab_1", -28.5, 0.0, 14.4, 11.1, mats["mazemap_cs_lab"], "COMPUTER LAB 1"),
        ("Room_GF_Computer_Lab_2", -28.5, 11.75, 14.4, 11.5, mats["mazemap_cs_lab"], "COMPUTER LAB 2"),

        # North Wing (Engineering Labs & Passage) - strictly within X in [-17.5, 17.5], Y in [21.2, 35.7]
        ("Room_GF_Computer_Lab_North", -11.75, 28.5, 11.5, 14.4, mats["mazemap_cs_lab"], "COMPUTER LAB N"),
        ("Room_GF_Lecture_Hall_47", 0.0, 28.5, 11.1, 14.4, mats["mazemap_lt"], "LECTURE HALL 47'"),
        ("Room_GF_High_Voltage_Lab", 11.75, 28.5, 11.5, 14.4, mats["mazemap_lab"], "HIGH VOLTAGE LAB"),
        ("Room_GF_Workshop_Bridge", 0.0, 39.0, 4.5, 6.5, mats["walkway_paved"], "WORKSHOP BRIDGE"),

        # East Wing (Conference & Machine Labs) - strictly within X in [21.2, 35.7], Y in [-17.5, 17.5]
        ("Room_GF_EMI_Lab", 28.5, -11.75, 14.4, 11.5, mats["mazemap_lab"], "EMI LAB"),
        ("Room_GF_Electronic_Machine_Lab", 28.5, 0.0, 14.4, 11.1, mats["mazemap_lab"], "MACHINE LAB"),
        ("Room_GF_Conference_Hall", 28.5, 11.75, 14.4, 11.5, mats["mazemap_seminar"], "CONFERENCE HALL"),
    ]

    for obj_name, cx, cy, sx, sy, room_mat, label in gf_rooms_spec:
        bm_room = bmesh.new()
        add_box(bm_room, cx, cy, sx, sy, Z_GF_PLINTH, Z_GF_FLOOR)
        make_mesh_object(obj_name, bm_room, coll, room_mat)

    # Clean Ground Floor Interior Partition Walls (Non-overlapping)
    bm_partitions = bmesh.new()
    # West Wing partition walls (along X)
    add_box(bm_partitions, -28.5, -5.85, 14.4, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_box(bm_partitions, -28.5,  5.85, 14.4, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)

    # East Wing partition walls (along X)
    add_box(bm_partitions,  28.5, -5.85, 14.4, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_box(bm_partitions,  28.5,  5.85, 14.4, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)

    # North Wing partition walls (along Y)
    add_box(bm_partitions, -5.85, 28.5, WALL_INT_TH, 14.4, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_box(bm_partitions,  5.85, 28.5, WALL_INT_TH, 14.4, Z_GF_WALL_BASE, Z_GF_CEILING)

    # South Wing partition walls
    add_box(bm_partitions,  -5.20, -28.5, WALL_INT_TH, 14.4, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_box(bm_partitions,   5.20, -28.5, WALL_INT_TH, 14.4, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_box(bm_partitions, -13.55, -28.5, WALL_INT_TH, 14.4, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_box(bm_partitions,  13.55, -28.5, WALL_INT_TH, 14.4, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_box(bm_partitions,  -9.35, -27.8, 8.1, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)
    add_box(bm_partitions,   9.35, -27.8, 8.1, WALL_INT_TH, Z_GF_WALL_BASE, Z_GF_CEILING)

    make_mesh_object("GF_Room_Partition_Walls", bm_partitions, coll, mats["wall_interior"])

# =============================================================================
# 7. FIRST FLOOR ARCHITECTURE (BLUEPRINT ROOM EXTRACTION)
# =============================================================================
def build_first_floor(coll, mats):
    """
    Builds the First Floor from blueprint CO-ED UP TO DATE 24.4.2014-Model.pdf:
      - Structural floor slab at Z = 3.86m to 4.11m with central courtyard opening.
      - Veranda balustrade (1.05m high white railing) overlooking courtyard.
      - South Wing: Central Library & Digital Reading Room, Faculty Rooms.
      - West Wing: Antenna Lab, Communication Lab, Computer Labs.
      - North Wing: Multipurpose Hall, Upper Lecture Theatres, Back Canteen Annex.
      - East Wing: Drawing Halls 1 & 2, Physics Lab, Chemistry Lab.
      - Clean architectural roof parapet (STRICTLY ZERO SOLAR PANELS).
    """
    # 1. Structural Floor Slab with Open Courtyard and Rounded Corners
    bm_slab = bmesh.new()
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

    # 2. First Floor 10-foot Veranda Corridors (Straight wings + 4 curved corner arcs)
    bm_ff_corr = bmesh.new()
    add_box(bm_ff_corr, 0.0, -19.5, 36.0, CORRIDOR_WIDTH, Z_FF_SLAB_TOP, Z_FF_FLOOR)
    add_box(bm_ff_corr, 0.0,  19.5, 36.0, CORRIDOR_WIDTH, Z_FF_SLAB_TOP, Z_FF_FLOOR)
    add_box(bm_ff_corr, -19.5, 0.0, CORRIDOR_WIDTH, 36.0, Z_FF_SLAB_TOP, Z_FF_FLOOR)
    add_box(bm_ff_corr,  19.5, 0.0, CORRIDOR_WIDTH, 36.0, Z_FF_SLAB_TOP, Z_FF_FLOOR)

    # 4 curved corner corridor arcs on First Floor
    for qx, qy in [(-1.0, 1.0), (1.0, 1.0), (-1.0, -1.0), (1.0, -1.0)]:
        ccx, ccy = qx * 18.0, qy * 18.0
        corr_segs = 12
        for i in range(corr_segs):
            p0 = (i / corr_segs) * (math.pi * 0.5)
            p1 = ((i + 1) / corr_segs) * (math.pi * 0.5)
            p0_in = (ccx + qx * 2.40 * math.sin(p0), ccy + qy * 2.40 * math.cos(p0))
            p1_in = (ccx + qx * 2.40 * math.sin(p1), ccy + qy * 2.40 * math.cos(p1))
            p1_out = (ccx + qx * 5.45 * math.sin(p1), ccy + qy * 5.45 * math.cos(p1))
            p0_out = (ccx + qx * 5.45 * math.sin(p0), ccy + qy * 5.45 * math.cos(p0))
            add_prism(bm_ff_corr, [p0_in, p1_in, p1_out, p0_out], Z_FF_SLAB_TOP, Z_FF_FLOOR)

    make_mesh_object("FF_Veranda_10ft_Corridors", bm_ff_corr, coll, mats["corridor_floor"])

    # 3. Veranda Safety Balustrade (1.05m high overlooking courtyard)
    bm_balustrade = bmesh.new()
    bal_h = 1.05
    bal_th = 0.20
    add_box(bm_balustrade, 0.0, -18.1, 36.0, bal_th, Z_FF_SLAB_TOP, Z_FF_SLAB_TOP + bal_h)
    add_box(bm_balustrade, 0.0,  18.1, 36.0, bal_th, Z_FF_SLAB_TOP, Z_FF_SLAB_TOP + bal_h)
    add_box(bm_balustrade, -18.1, 0.0, bal_th, 36.0, Z_FF_SLAB_TOP, Z_FF_SLAB_TOP + bal_h)
    add_box(bm_balustrade,  18.1, 0.0, bal_th, 36.0, Z_FF_SLAB_TOP, Z_FF_SLAB_TOP + bal_h)
    make_mesh_object("FF_Veranda_Safety_Balustrade", bm_balustrade, coll, mats["balustrade_white"])

    # 4. First Floor Rooms (Floor Finishes & Partition Layouts)
    ff_rooms_spec = [
        # South Wing: Central Library & Reading Hall - strictly within X in [-17.5, 17.5], Y in [-35.7, -21.2]
        ("Room_FF_Faculty_South", -13.85, -28.5, 7.3, 14.4, mats["mazemap_admin"], "FACULTY CABINS"),
        ("Room_FF_Central_Library", 0.0, -28.5, 19.6, 14.4, mats["mazemap_library"], "CENTRAL LIBRARY"),
        ("Room_FF_Tutorial_South", 13.85, -28.5, 7.3, 14.4, mats["mazemap_lt"], "TUTORIAL HALL"),

        # West Wing: Communication & Advanced Labs - strictly within X in [-35.7, -21.2], Y in [-17.5, 17.5]
        ("Room_FF_Antenna_Lab", -28.5, -11.75, 14.4, 11.5, mats["mazemap_lab"], "ANTENNA LAB"),
        ("Room_FF_Communication_Lab", -28.5, 0.0, 14.4, 11.1, mats["mazemap_lab"], "COMMUNICATION LAB"),
        ("Room_FF_CS_Lab_Upper", -28.5, 11.75, 14.4, 11.5, mats["mazemap_cs_lab"], "CS LAB UPPER"),

        # North Wing: Multipurpose Hall & Canteen Annex - strictly within X in [-17.5, 17.5], Y in [21.2, 35.7]
        ("Room_FF_Lecture_Hall_North_Upper", -13.85, 28.5, 7.3, 14.4, mats["mazemap_lt_upper"], "LECTURE HALL 11"),
        ("Room_FF_Multipurpose_Hall", 0.0, 28.5, 19.6, 14.4, mats["mazemap_seminar"], "MULTIPURPOSE HALL"),
        ("Room_FF_Seminar_North_Upper", 13.85, 28.5, 7.3, 14.4, mats["mazemap_lt"], "SEMINAR HALL"),
        ("Room_FF_Canteen_Annex", 0.0, 42.0, 16.0, 11.0, mats["mazemap_admin"], "CANTEEN & KITCHEN"),

        # East Wing: Drawing Halls & Science Labs - strictly within X in [21.2, 35.7], Y in [-17.5, 17.5]
        ("Room_FF_Chemistry_Lab", 28.5, -11.75, 14.4, 11.5, mats["mazemap_lab"], "CHEMISTRY LAB"),
        ("Room_FF_Physics_Lab", 28.5, 0.0, 14.4, 11.1, mats["mazemap_lab"], "PHYSICS LAB"),
        ("Room_FF_Drawing_Hall_1", 28.5, 11.75, 14.4, 11.5, mats["mazemap_drawing"], "DRAWING HALL 1"),
    ]

    for obj_name, cx, cy, sx, sy, room_mat, label in ff_rooms_spec:
        bm_room = bmesh.new()
        add_box(bm_room, cx, cy, sx, sy, Z_FF_SLAB_TOP, Z_FF_FLOOR)
        make_mesh_object(obj_name, bm_room, coll, room_mat)

    # Clean First Floor Interior Partition Walls (Non-overlapping)
    bm_ff_partitions = bmesh.new()
    # West Wing partition walls (along X)
    add_box(bm_ff_partitions, -28.5, -5.85, 14.4, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)
    add_box(bm_ff_partitions, -28.5,  5.85, 14.4, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)

    # East Wing partition walls (along X)
    add_box(bm_ff_partitions,  28.5, -5.85, 14.4, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)
    add_box(bm_ff_partitions,  28.5,  5.85, 14.4, WALL_INT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)

    # North Wing partition walls (along Y)
    add_box(bm_ff_partitions, -10.0, 28.5, WALL_INT_TH, 14.4, Z_FF_WALL_BASE, Z_FF_CEILING)
    add_box(bm_ff_partitions,  10.0, 28.5, WALL_INT_TH, 14.4, Z_FF_WALL_BASE, Z_FF_CEILING)

    # South Wing partition walls (along Y)
    add_box(bm_ff_partitions, -10.0, -28.5, WALL_INT_TH, 14.4, Z_FF_WALL_BASE, Z_FF_CEILING)
    add_box(bm_ff_partitions,  10.0, -28.5, WALL_INT_TH, 14.4, Z_FF_WALL_BASE, Z_FF_CEILING)

    make_mesh_object("FF_Room_Partition_Walls", bm_ff_partitions, coll, mats["wall_interior"])

    # First Floor Corner Radiating Rooms
    bm_ff_corner_rooms = bmesh.new()
    for qx, qy, cname in [(-1.0, 1.0, "NW"), (1.0, 1.0, "NE"), (-1.0, -1.0, "SW"), (1.0, -1.0, "SE")]:
        ccx, ccy = qx * 18.0, qy * 18.0
        for r_idx in range(4):
            p0 = (r_idx / 4.0) * (math.pi * 0.5)
            p1 = ((r_idx + 1) / 4.0) * (math.pi * 0.5)
            pts_r = []
            for s in range(5):
                sa = p0 + (s / 4.0) * (p1 - p0)
                pts_r.append((ccx + qx * 5.60 * math.sin(sa), ccy + qy * 5.60 * math.cos(sa)))
            for s in range(4, -1, -1):
                sa = p0 + (s / 4.0) * (p1 - p0)
                pts_r.append((ccx + qx * 17.60 * math.sin(sa), ccy + qy * 17.60 * math.cos(sa)))
            add_prism(bm_ff_corner_rooms, pts_r, Z_FF_SLAB_TOP, Z_FF_FLOOR)
    make_mesh_object("FF_Corner_Radiating_LTs_Floor", bm_ff_corner_rooms, coll, mats["mazemap_lt_upper"])

    # 5. First Floor Exterior Walls (Straight wings, 36m length)
    bm_ff_ext = bmesh.new()
    add_box(bm_ff_ext, 0.0, -36.0 + WALL_EXT_TH*0.5, 36.0, WALL_EXT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)
    add_box(bm_ff_ext, 0.0,  36.0 - WALL_EXT_TH*0.5, 36.0, WALL_EXT_TH, Z_FF_WALL_BASE, Z_FF_CEILING)
    add_box(bm_ff_ext, -36.0 + WALL_EXT_TH*0.5, 0.0, WALL_EXT_TH, 36.0, Z_FF_WALL_BASE, Z_FF_CEILING)
    add_box(bm_ff_ext,  36.0 - WALL_EXT_TH*0.5, 0.0, WALL_EXT_TH, 36.0, Z_FF_WALL_BASE, Z_FF_CEILING)
    # 4 curved corner exterior walls
    for qx, qy in [(-1.0, 1.0), (1.0, 1.0), (-1.0, -1.0), (1.0, -1.0)]:
        ccx, ccy = qx * 18.0, qy * 18.0
        pts_ext_ff = []
        for s in range(9):
            sa = (s / 8.0) * (math.pi * 0.5)
            pts_ext_ff.append((ccx + qx * 17.60 * math.sin(sa), ccy + qy * 17.60 * math.cos(sa)))
        for s in range(8, -1, -1):
            sa = (s / 8.0) * (math.pi * 0.5)
            pts_ext_ff.append((ccx + qx * 18.00 * math.sin(sa), ccy + qy * 18.00 * math.cos(sa)))
        add_prism(bm_ff_ext, pts_ext_ff, Z_FF_WALL_BASE, Z_FF_CEILING)
    make_mesh_object("FF_Exterior_Facade_Walls", bm_ff_ext, coll, mats["wall_sandstone"])

    # 6. Roof Parapet Cap (Clean Architecture, Rounded Corners, ZERO Solar Panels)
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
def add_floor_label(coll, mats, text, x, y, z, size=0.85):
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
        ("BOARD ROOM", -9.35, -31.9, Z_GF_FLOOR + 0.01),
        ("RECEPTION", 0.0, -28.5, Z_GF_FLOOR + 0.01),
        ("REGISTRAR", 9.35, -31.9, Z_GF_FLOOR + 0.01),
        ("ACAD. DIRECTOR", -9.35, -24.5, Z_GF_FLOOR + 0.01),
        ("CAMPUS DIRECTOR", 9.35, -24.5, Z_GF_FLOOR + 0.01),
        ("ECE LAB", -15.65, -28.5, Z_GF_FLOOR + 0.01),
        ("MICROPROCESSOR", 15.65, -28.5, Z_GF_FLOOR + 0.01),

        # Ground Floor West Wing
        ("ELECTRONIC LAB", -28.5, -11.75, Z_GF_FLOOR + 0.01),
        ("COMPUTER LAB 1", -28.5, 0.0, Z_GF_FLOOR + 0.01),
        ("COMPUTER LAB 2", -28.5, 11.75, Z_GF_FLOOR + 0.01),

        # Ground Floor North Wing
        ("COMPUTER LAB N", -11.75, 28.5, Z_GF_FLOOR + 0.01),
        ("LECTURE HALL 47'", 0.0, 28.5, Z_GF_FLOOR + 0.01),
        ("HIGH VOLTAGE LAB", 11.75, 28.5, Z_GF_FLOOR + 0.01),

        # Ground Floor East Wing
        ("EMI LAB", 28.5, -11.75, Z_GF_FLOOR + 0.01),
        ("MACHINE LAB", 28.5, 0.0, Z_GF_FLOOR + 0.01),
        ("CONFERENCE HALL", 28.5, 11.75, Z_GF_FLOOR + 0.01),

        # First Floor
        ("CENTRAL LIBRARY", 0.0, -28.5, Z_FF_FLOOR + 0.01),
        ("FACULTY CABINS", -13.85, -28.5, Z_FF_FLOOR + 0.01),
        ("TUTORIAL HALL", 13.85, -28.5, Z_FF_FLOOR + 0.01),
        ("ANTENNA LAB", -28.5, -11.75, Z_FF_FLOOR + 0.01),
        ("COMMUNICATION LAB", -28.5, 0.0, Z_FF_FLOOR + 0.01),
        ("CS LAB UPPER", -28.5, 11.75, Z_FF_FLOOR + 0.01),
        ("LECTURE HALL 11", -13.85, 28.5, Z_FF_FLOOR + 0.01),
        ("MULTIPURPOSE HALL", 0.0, 28.5, Z_FF_FLOOR + 0.01),
        ("SEMINAR HALL", 13.85, 28.5, Z_FF_FLOOR + 0.01),
        ("CHEMISTRY LAB", 28.5, -11.75, Z_FF_FLOOR + 0.01),
        ("PHYSICS LAB", 28.5, 0.0, Z_FF_FLOOR + 0.01),
        ("DRAWING HALL 1", 28.5, 11.75, Z_FF_FLOOR + 0.01),
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

    # 1. Courtyard View (standing elevated on amphitheater bleachers, looking down across courtyard to stage)
    cam_courtyard = create_targeted_camera(
        coll, "courtyard_view_admin_to_stage",
        location=(0.0, -16.5, 2.8),
        target=(0.0, 15.6, 1.2),
        lens=24.0
    )
    cameras["courtyard_view_admin_to_stage"] = cam_courtyard

    # 2. Stage Close-Up (eye level, centered facing flat front brick plinth and 3D JIET lettering)
    cam_stage = create_targeted_camera(
        coll, "stage_close_up",
        location=(0.0, 5.0, 2.0),
        target=(0.0, 15.6, 1.5),
        lens=32.0
    )
    cameras["stage_close_up"] = cam_stage

    # 3. Corner Staircase Close-Up (standing in corridor looking directly into NW helical rotunda bay)
    cam_stairs = create_targeted_camera(
        coll, "corner_staircase_close_up",
        location=(-14.5, 14.5, 1.8),
        target=(-18.0, 18.0, 1.6),
        lens=24.0
    )
    cameras["corner_staircase_close_up"] = cam_stairs

    # 4. Unblocked Corridor View (looking straight North down the 10ft wide sandstone colonnade)
    cam_corridor = create_targeted_camera(
        coll, "corridor_unblocked_view",
        location=(-19.5, -8.0, 1.7),
        target=(-19.5, 12.0, 1.7),
        lens=26.0
    )
    cameras["corridor_unblocked_view"] = cam_corridor

    # 5. Top-Down Overview (wide architectural lens, entire 72m squircle framed within 1920x1080)
    cam_topdown = create_targeted_camera(
        coll, "topdown_overview",
        location=(0.0, 0.0, 115.0),
        target=(0.0, 0.0, 0.0),
        lens=24.0
    )
    cam_topdown.rotation_euler = Euler((0.0, 0.0, 0.0), 'XYZ')
    cameras["topdown_overview"] = cam_topdown

    # 6. Isometric Campus View (2.5D architectural isometric matching MazeMap)
    cam_iso = create_targeted_camera(
        coll, "isometric_campus_view",
        location=(62.0, -62.0, 52.0),
        target=(0.0, 0.0, 2.0),
        lens=45.0
    )
    cameras["isometric_campus_view"] = cam_iso

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
    print("JIET JODHPUR CAMPUS DIGITAL TWIN - ARCHITECTURAL TWIN GENERATOR (v3)")
    print("=" * 70)

    # 1. Clean Scene & Initialize Collections
    scene = clean_scene()
    root_coll = scene.collection

    coll_ground = get_collection("01_Courtyard_Ground", root_coll)
    coll_stage = get_collection("02_Outdoor_Stage", root_coll)
    coll_stairs = get_collection("03_Corner_Staircases", root_coll)
    coll_gf = get_collection("04_Ground_Floor_Architecture", root_coll)
    coll_ff = get_collection("05_First_Floor_Architecture", root_coll)
    coll_labels = get_collection("06_Floor_Typography", root_coll)
    coll_env = get_collection("07_Lighting_and_Cameras", root_coll)

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

    print("-> Building Unblocked Corridors, Radiating LTs & Rotunda Staircases...")
    build_all_corners(coll_stairs, mats)

    print("-> Building Ground Floor Blueprint Rooms & Veranda Colonnades...")
    build_ground_floor(coll_gf, mats)

    print("-> Building First Floor Blueprint Architecture & Balustrades...")
    build_first_floor(coll_ff, mats)

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
