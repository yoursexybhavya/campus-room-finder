"""
JIET Campus Digital Twin - Complete Procedural 3D Prototype Generator (v2)
========================================================================
Built for Blender 5.2.2 LTS / 4.x.
Generates an authentic, color-coded, physically accurate 3D prototype of
the JIET Jodhpur campus based on architectural blueprints, ground-truth photos,
and satellite imagery:
  1. 4 lawn quadrants with concrete curbs in the central courtyard.
  2. Central axial walkway (South seating to North stage) and transverse walkway
     (connecting West Admin to East wing), matching media_1791470686695.jpg.
  3. Admin Wing located strictly on the LEFT (West wing).
  4. Outdoor amphitheater stage at the North wall with brick-red plinth base,
     light platform deck, access steps, crimson backdrop wall, and forward-facing
     white 3D "JIET" typography facing South into the courtyard.
  5. Stepped amphitheater seating tiers at South courtyard with alternating wavy
     terracotta and cream paver bands, viewed from veranda just like media_1791470686695.jpg.
  6. 4 curved/helical corner rotunda staircases with green marble treads, white
     risers, and tubular white safety balustrades connecting Ground to First floor.
  7. Two full floors (Ground Floor + First Floor) with MazeMap-style functional
     color-coding (Amber Admin, Emerald Labs, Cyan Classrooms, Rose Library, etc.).
  8. Architectural typography on room floors for instant identification.
  9. Multi-angle cameras matching ground-truth user perspectives.
  10. STRICTLY ZERO rooftop solar panels.
  11. STRICTLY ZERO unrequested trees.
"""

import math
import os
import sys
import bpy
import bmesh
from mathutils import Vector, Matrix, Euler

# =============================================================================
# 1. CONSTANTS & SPECIFICATIONS
# =============================================================================
CAMPUS_SIZE = 72.0               # Outer footprint 72m x 72m
COURTYARD_SIZE = 36.0            # Inner courtyard 36m x 36m ([-18, 18])
WING_DEPTH = 18.0                # Depth of each wing
VERANDA_WIDTH = 3.0              # Inner covered corridor width
GF_HEIGHT = 3.6                  # Ground floor height
SLAB_THICKNESS = 0.25            # Floor slab thickness
FF_HEIGHT = 3.4                  # First floor height
WALL_THICKNESS_EXT = 0.35        # Exterior perimeter wall thickness
WALL_THICKNESS_INT = 0.20        # Interior partition wall thickness

STAGE_WIDTH = 15.0               # Stage width (X)
STAGE_DEPTH = 4.8                # Stage depth (Y)
STAGE_HEIGHT = 1.05              # Stage plinth height (Z)
STAGE_Y_CENTER = 15.6            # North courtyard wall is Y = 18.0

# System font paths for macOS
FONT_PATHS = [
    '/System/Library/Fonts/Supplemental/Arial.ttf',
    '/System/Library/Fonts/Helvetica.ttc',
    '/Library/Fonts/Arial.ttf'
]

# =============================================================================
# 2. HELPER FUNCTIONS: MATERIALS & SCENE MANAGEMENT
# =============================================================================
def clean_scene():
    """Removes all default objects, meshes, materials, and lights."""
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
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    if material:
        obj.data.materials.append(material)
    collection.objects.link(obj)
    return obj

def add_prism(bm, pts_2d, z0, z1):
    clean = []
    for p in pts_2d:
        if not clean or (math.hypot(p[0] - clean[-1][0], p[1] - clean[-1][1]) > 1e-4):
            clean.append(p)
    if len(clean) > 1 and math.hypot(clean[0][0] - clean[-1][0], clean[0][1] - clean[-1][1]) < 1e-4:
        clean.pop()
    n = len(clean)
    if n < 3:
        return
    area = 0.5 * sum(clean[i][0] * clean[(i+1)%n][1] - clean[(i+1)%n][0] * clean[i][1] for i in range(n))
    if area < 0:
        clean = clean[::-1]
    bot = [bm.verts.new((x, y, z0)) for x, y in clean]
    top = [bm.verts.new((x, y, z1)) for x, y in clean]
    try:
        bm.faces.new(top)
        bm.faces.new(bot[::-1])
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((bot[i], bot[j], top[j], top[i]))
    except Exception:
        pass

def add_box(bm, center_x, center_y, width, depth, z0, z1):
    hx, hy = width * 0.5, depth * 0.5
    pts = [
        (center_x - hx, center_y - hy),
        (center_x + hx, center_y - hy),
        (center_x + hx, center_y + hy),
        (center_x - hx, center_y + hy)
    ]
    add_prism(bm, pts, z0, z1)

def add_cylinder(bm, center_x, center_y, radius, z0, z1, segments=32):
    pts = []
    for i in range(segments):
        a = 2.0 * math.pi * i / segments
        pts.append((center_x + radius * math.cos(a), center_y + radius * math.sin(a)))
    add_prism(bm, pts, z0, z1)

def get_font():
    for p in FONT_PATHS:
        if os.path.exists(p):
            try:
                return bpy.data.fonts.load(p)
            except Exception:
                pass
    return None

# =============================================================================
# 3. COURTYARD GROUND & LAWN QUADRANTS
# =============================================================================
def build_courtyard(coll, mats):
    """
    Builds the central courtyard:
      - 4 Lawn Quadrants (NW, NE, SW, SE) with concrete curbs
      - Central Axial Walkway (South seating to North Stage)
      - Transverse Walkway (Admin on West to East wing, matching red arrow in media_1791470686695.jpg)
      - South Amphitheater Stepped Seating (5 wide tiered paver terraces)
    """
    # 1. Base courtyard sub-base
    bm_base = bmesh.new()
    add_box(bm_base, 0.0, 0.0, COURTYARD_SIZE + 4.0, COURTYARD_SIZE + 4.0, -0.30, 0.0)
    make_mesh_object("Courtyard_Base_Slab", bm_base, coll, mats["paver_ground"])

    # 2. Four Lawn Quadrants with Raised Concrete Curbs
    quadrants = [
        ("NW", -15.5, -2.2,  2.2, 13.5),
        ("NE",   2.2, 15.5,  2.2, 13.5),
        ("SW", -15.5, -2.2, -10.5, -2.2),
        ("SE",   2.2, 15.5, -10.5, -2.2),
    ]

    bm_lawn = bmesh.new()
    bm_curb = bmesh.new()
    curb_w = 0.22
    curb_h = 0.12

    for name, x0, x1, y0, y1 in quadrants:
        gx0, gx1 = x0 + curb_w, x1 - curb_w
        gy0, gy1 = y0 + curb_w, y1 - curb_w
        pts_lawn = [(gx0, gy0), (gx1, gy0), (gx1, gy1), (gx0, gy1)]
        add_prism(bm_lawn, pts_lawn, 0.0, 0.06)

        # 4 Curb segments enclosing the lawn
        add_box(bm_curb, (x0 + x1)*0.5, y0 + curb_w*0.5, (x1 - x0), curb_w, 0.0, curb_h)
        add_box(bm_curb, (x0 + x1)*0.5, y1 - curb_w*0.5, (x1 - x0), curb_w, 0.0, curb_h)
        add_box(bm_curb, x0 + curb_w*0.5, (y0 + y1)*0.5, curb_w, (y1 - y0), 0.0, curb_h)
        add_box(bm_curb, x1 - curb_w*0.5, (y0 + y1)*0.5, curb_w, (y1 - y0), 0.0, curb_h)

    make_mesh_object("Courtyard_4_Lawns", bm_lawn, coll, mats["grass"])
    make_mesh_object("Courtyard_Lawn_Curbs", bm_curb, coll, mats["curb"])

    # 3. Central Axial Walkway (N-S, connecting South seating to Stage)
    bm_axial = bmesh.new()
    add_box(bm_axial, 0.0, 1.5, 4.4, 30.0, 0.0, 0.02)
    make_mesh_object("Courtyard_Axial_Walkway", bm_axial, coll, mats["walkway_paved"])

    # 4. Transverse Walkway (E-W, connecting West Admin to East wing)
    # Exactly matching the red arrow where people walk from Admin across to the other side!
    bm_trans = bmesh.new()
    add_box(bm_trans, 0.0, 0.0, 36.0, 4.4, 0.0, 0.025)
    make_mesh_object("Courtyard_Transverse_Walkway_AdminToWing", bm_trans, coll, mats["walkway_paved"])

    # 5. South Amphitheater Stepped Seating (Bleachers)
    # 5 wide terraces rising from Z=0.0 at Y=-10.5 to Z=1.0 at Y=-18.0
    bm_bleachers_cream = bmesh.new()
    bm_bleachers_terracotta = bmesh.new()
    bm_bleacher_curbs = bmesh.new()

    num_tiers = 5
    tier_depth = 1.45
    tier_rise = 0.20
    seat_x0, seat_x1 = -16.0, 16.0

    for i in range(num_tiers):
        t_y0 = -18.0 + (i * tier_depth)
        t_y1 = t_y0 + tier_depth
        t_z0 = 0.0
        t_z1 = 1.0 - (i * tier_rise)
        
        pts = [(seat_x0, t_y0), (seat_x1, t_y0), (seat_x1, t_y1), (seat_x0, t_y1)]
        target_bm = bm_bleachers_terracotta if (i % 2 == 0) else bm_bleachers_cream
        add_prism(target_bm, pts, t_z0, t_z1)

        # Front riser curb
        add_box(bm_bleacher_curbs, 0.0, t_y1, (seat_x1 - seat_x0), 0.15, t_z1 - tier_rise, t_z1)

    make_mesh_object("Amphitheater_Seating_Terracotta", bm_bleachers_terracotta, coll, mats["paver_terracotta"])
    make_mesh_object("Amphitheater_Seating_Cream", bm_bleachers_cream, coll, mats["paver_cream"])
    make_mesh_object("Amphitheater_Seating_Curbs", bm_bleacher_curbs, coll, mats["curb_red"])

# =============================================================================
# 4. OUTDOOR AMPHITHEATER STAGE (NORTH WALL)
# =============================================================================
def build_outdoor_stage(coll, mats):
    """
    Builds the authentic JIET Outdoor Stage:
      - Deep brick-red plinth platform (15m wide x 4.8m deep x 1.05m high)
      - Light smooth stone platform deck
      - Front access steps
      - Rich crimson backdrop wall with forward-facing extruded 3D white "JIET" text
    """
    # 1. Brick-red plinth base
    bm_plinth = bmesh.new()
    add_box(bm_plinth, 0.0, STAGE_Y_CENTER, STAGE_WIDTH, STAGE_DEPTH, 0.0, STAGE_HEIGHT)
    make_mesh_object("Stage_Brick_Plinth", bm_plinth, coll, mats["stage_brick"])

    # 2. Smooth polished stone deck slab
    bm_deck = bmesh.new()
    add_box(bm_deck, 0.0, STAGE_Y_CENTER, STAGE_WIDTH + 0.3, STAGE_DEPTH + 0.3, STAGE_HEIGHT, STAGE_HEIGHT + 0.08)
    make_mesh_object("Stage_Stone_Deck", bm_deck, coll, mats["stage_deck"])

    # 3. Front access steps (3 wide steps leading up from courtyard to stage deck)
    bm_steps = bmesh.new()
    step_width = 8.0
    for s in range(3):
        sy = STAGE_Y_CENTER - (STAGE_DEPTH * 0.5) - (0.35 * (s + 1))
        sz = STAGE_HEIGHT * (3 - s) / 4.0
        add_box(bm_steps, 0.0, sy + 0.175, step_width, 0.35, 0.0, sz)
    make_mesh_object("Stage_Front_Steps", bm_steps, coll, mats["stage_steps"])

    # 4. Crimson Backdrop Wall
    bm_back = bmesh.new()
    wall_y = 17.80
    wall_w = 8.6
    wall_h = 3.4
    add_box(bm_back, 0.0, wall_y, wall_w, 0.40, STAGE_HEIGHT, STAGE_HEIGHT + wall_h)
    make_mesh_object("Stage_Crimson_Backdrop_Wall", bm_back, coll, mats["stage_backdrop"])

    # 5. Bold 3D White "JIET" Typography
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
# 5. CORNER ROTUNDA HELICAL STAIRCASES (IMG_3052.jpeg)
# =============================================================================
def build_curved_staircase(coll, mats, name_prefix, center_x, center_y, start_angle, end_angle):
    """
    Builds an authentic curved helical staircase matching IMG_3052.jpeg:
      - Dark polished green marble treads
      - White risers
      - White tubular safety handrail with horizontal bars and vertical stanchions
      - Curved rotunda drum enclosure wall
    """
    bm_treads = bmesh.new()
    bm_risers = bmesh.new()
    bm_railings = bmesh.new()
    bm_drum = bmesh.new()

    num_steps = 22
    r_in = 1.3
    r_out = 3.6
    z_start = 0.0
    z_end = GF_HEIGHT + SLAB_THICKNESS  # 3.85m
    total_angle = end_angle - start_angle
    step_angle = total_angle / num_steps
    step_height = (z_end - z_start) / num_steps

    # 1. Helical Step Treads & Risers
    for i in range(num_steps):
        a0 = math.radians(start_angle + i * step_angle)
        a1 = math.radians(start_angle + (i + 1) * step_angle)
        z0 = z_start + i * step_height
        z1 = z0 + step_height

        p_in0 = (center_x + r_in * math.cos(a0), center_y + r_in * math.sin(a0))
        p_out0 = (center_x + r_out * math.cos(a0), center_y + r_out * math.sin(a0))
        p_out1 = (center_x + r_out * math.cos(a1), center_y + r_out * math.sin(a1))
        p_in1 = (center_x + r_in * math.cos(a1), center_y + r_in * math.sin(a1))

        # Green marble tread (top slab)
        tread_pts = [p_in0, p_out0, p_out1, p_in1]
        add_prism(bm_treads, tread_pts, z1 - 0.05, z1)

        # White riser block under tread
        add_prism(bm_risers, tread_pts, z0, z1 - 0.05)

    # 2. Outer Safety Handrail & Intermediate Bars (White tubular railing)
    r_rail = r_out - 0.15
    rail_height = 0.95
    rail_pts_top = []
    rail_pts_mid1 = []
    rail_pts_mid2 = []

    for i in range(num_steps + 1):
        a = math.radians(start_angle + i * step_angle)
        z_tread = z_start + i * step_height
        rx = center_x + r_rail * math.cos(a)
        ry = center_y + r_rail * math.sin(a)
        
        rail_pts_top.append((rx, ry, z_tread + rail_height))
        rail_pts_mid1.append((rx, ry, z_tread + rail_height * 0.66))
        rail_pts_mid2.append((rx, ry, z_tread + rail_height * 0.33))

        if i % 3 == 0:
            add_cylinder(bm_railings, rx, ry, 0.035, z_tread, z_tread + rail_height, segments=12)

    for p_list in [rail_pts_top, rail_pts_mid1, rail_pts_mid2]:
        for i in range(len(p_list) - 1):
            p1, p2 = p_list[i], p_list[i+1]
            mx, my = (p1[0] + p2[0])*0.5, (p1[1] + p2[1])*0.5
            mz0, mz1 = min(p1[2], p2[2]), max(p1[2], p2[2]) + 0.045
            add_cylinder(bm_railings, mx, my, 0.03, mz0, mz1, segments=12)

    # 3. Outer Rotunda Drum Wall (curved enclosure)
    drum_segments = 24
    drum_r_in = r_out + 0.10
    drum_r_out = drum_r_in + WALL_THICKNESS_EXT
    drum_angle_span = 270.0
    for i in range(drum_segments):
        da0 = math.radians(start_angle + i * (drum_angle_span / drum_segments))
        da1 = math.radians(start_angle + (i + 1) * (drum_angle_span / drum_segments))
        p0_in = (center_x + drum_r_in * math.cos(da0), center_y + drum_r_in * math.sin(da0))
        p1_in = (center_x + drum_r_in * math.cos(da1), center_y + drum_r_in * math.sin(da1))
        p1_out = (center_x + drum_r_out * math.cos(da1), center_y + drum_r_out * math.sin(da1))
        p0_out = (center_x + drum_r_out * math.cos(da0), center_y + drum_r_out * math.sin(da0))
        add_prism(bm_drum, [p0_in, p1_in, p1_out, p0_out], 0.0, GF_HEIGHT)
        add_prism(bm_drum, [p0_in, p1_in, p1_out, p0_out], GF_HEIGHT + SLAB_THICKNESS, GF_HEIGHT + SLAB_THICKNESS + FF_HEIGHT)

    make_mesh_object(f"{name_prefix}_Treads_GreenMarble", bm_treads, coll, mats["stair_green_marble"])
    make_mesh_object(f"{name_prefix}_Risers_White", bm_risers, coll, mats["stair_riser"])
    make_mesh_object(f"{name_prefix}_Tubular_Railings", bm_railings, coll, mats["stair_railing"])
    make_mesh_object(f"{name_prefix}_Rotunda_Drum_Wall", bm_drum, coll, mats["wall_sandstone"])

def build_all_corner_staircases(coll, mats):
    build_curved_staircase(coll, mats, "Stair_NW", -18.0, 18.0, 0.0, 260.0)
    build_curved_staircase(coll, mats, "Stair_NE", 18.0, 18.0, 90.0, 350.0)
    build_curved_staircase(coll, mats, "Stair_SW", -18.0, -18.0, 270.0, 530.0)
    build_curved_staircase(coll, mats, "Stair_SE", 18.0, -18.0, 180.0, 440.0)

# =============================================================================
# 6. GROUND FLOOR ARCHITECTURE (ROOMS, VERANDAS & PILLARS)
# =============================================================================
def build_ground_floor(coll, mats):
    """
    Builds the complete Ground Floor:
      - West Wing (Admin Block): Amber gold flooring (#d97706)
      - North Wing (Labs): Emerald green flooring (#059669)
      - East Wing (Classrooms & LTs): Cyan flooring (#0284c7)
      - South Wing (Entrance Foyer & Seminar): Coral flooring (#ea580c)
      - Veranda corridors with polished floor and sandstone pillars every 4m
      - Sandstone exterior walls and crisp off-white interior partitions
    """
    bm_admin = bmesh.new()
    bm_labs = bmesh.new()
    bm_class = bmesh.new()
    bm_entrance = bmesh.new()
    bm_corridor = bmesh.new()

    # West Wing: Admin [X: -36 to -21, Y: -36 to 36]
    add_box(bm_admin, -28.5, 0.0, 15.0, 72.0, 0.0, 0.05)

    # North Wing: Engineering Labs [X: -21 to 21, Y: 21 to 36]
    add_box(bm_labs, 0.0, 28.5, 42.0, 15.0, 0.0, 0.05)

    # East Wing: Classrooms & LTs [X: 21 to 36, Y: -36 to 36]
    add_box(bm_class, 28.5, 0.0, 15.0, 72.0, 0.0, 0.05)

    # South Wing: Entrance Foyer & Seminar [X: -21 to 21, Y: -36 to -21]
    add_box(bm_entrance, 0.0, -28.5, 42.0, 15.0, 0.0, 0.05)

    # Verandas: 3m wide corridors surrounding the courtyard
    add_box(bm_corridor, -19.5, 0.0, 3.0, 36.0, 0.0, 0.04)
    add_box(bm_corridor,  19.5, 0.0, 3.0, 36.0, 0.0, 0.04)
    add_box(bm_corridor, 0.0,  19.5, 36.0, 3.0, 0.0, 0.04)
    add_box(bm_corridor, 0.0, -19.5, 36.0, 3.0, 0.0, 0.04)

    make_mesh_object("GF_Floor_Admin_West", bm_admin, coll, mats["mazemap_admin"])
    make_mesh_object("GF_Floor_Labs_North", bm_labs, coll, mats["mazemap_lab"])
    make_mesh_object("GF_Floor_Classrooms_East", bm_class, coll, mats["mazemap_lt"])
    make_mesh_object("GF_Floor_Entrance_South", bm_entrance, coll, mats["mazemap_seminar"])
    make_mesh_object("GF_Floor_Veranda_Corridors", bm_corridor, coll, mats["corridor_floor"])

    # 2. Veranda Pillars (Jodhpur Sandstone square columns along courtyard border)
    bm_pillars = bmesh.new()
    pillar_size = 0.50
    for x in range(-16, 17, 4):
        add_box(bm_pillars, x, 18.25, pillar_size, pillar_size, 0.0, GF_HEIGHT)
        add_box(bm_pillars, x, -18.25, pillar_size, pillar_size, 0.0, GF_HEIGHT)
    for y in range(-16, 17, 4):
        add_box(bm_pillars, -18.25, y, pillar_size, pillar_size, 0.0, GF_HEIGHT)
        add_box(bm_pillars, 18.25, y, pillar_size, pillar_size, 0.0, GF_HEIGHT)

    make_mesh_object("GF_Veranda_Sandstone_Pillars", bm_pillars, coll, mats["pillar_sandstone"])

    # 3. Exterior Facade Walls & Interior Partitions
    bm_ext_walls = bmesh.new()
    bm_int_walls = bmesh.new()

    # Outer perimeter facade walls
    add_box(bm_ext_walls, -36.0 + WALL_THICKNESS_EXT*0.5, 0.0, WALL_THICKNESS_EXT, 72.0, 0.0, GF_HEIGHT)
    add_box(bm_ext_walls, 36.0 - WALL_THICKNESS_EXT*0.5, 0.0, WALL_THICKNESS_EXT, 72.0, 0.0, GF_HEIGHT)
    add_box(bm_ext_walls, 0.0, 36.0 - WALL_THICKNESS_EXT*0.5, 72.0, WALL_THICKNESS_EXT, 0.0, GF_HEIGHT)
    add_box(bm_ext_walls, 0.0, -36.0 + WALL_THICKNESS_EXT*0.5, 72.0, WALL_THICKNESS_EXT, 0.0, GF_HEIGHT)

    # Veranda inner dividing wall (between corridor and rooms)
    add_box(bm_int_walls, -21.0, 0.0, WALL_THICKNESS_INT, 60.0, 0.0, GF_HEIGHT)
    add_box(bm_int_walls, 21.0, 0.0, WALL_THICKNESS_INT, 60.0, 0.0, GF_HEIGHT)
    add_box(bm_int_walls, 0.0, 21.0, 42.0, WALL_THICKNESS_INT, 0.0, GF_HEIGHT)
    add_box(bm_int_walls, 0.0, -21.0, 42.0, WALL_THICKNESS_INT, 0.0, GF_HEIGHT)

    # Room partition walls
    for y in [-24.0, -12.0, 0.0, 12.0, 24.0]:
        add_box(bm_int_walls, -28.5, y, 15.0, WALL_THICKNESS_INT, 0.0, GF_HEIGHT)
        add_box(bm_int_walls, 28.5, y, 15.0, WALL_THICKNESS_INT, 0.0, GF_HEIGHT)
    for x in [-14.0, 0.0, 14.0]:
        add_box(bm_int_walls, x, 28.5, WALL_THICKNESS_INT, 15.0, 0.0, GF_HEIGHT)

    make_mesh_object("GF_Exterior_Facade_Walls", bm_ext_walls, coll, mats["wall_sandstone"])
    make_mesh_object("GF_Interior_Partition_Walls", bm_int_walls, coll, mats["wall_interior"])

# =============================================================================
# 7. FIRST FLOOR ARCHITECTURE
# =============================================================================
def build_first_floor(coll, mats):
    """
    Builds the First Floor:
      - Structural floor slab between GF and FF at Z = 3.6m to 3.85m
      - West Wing: Computer Science & AI Labs (Mint #10b981)
      - North Wing: Central Library & Digital Reading Room (Rose #e11d48)
      - East Wing: Upper Lecture Theatres LT-9 to LT-14 (Sky Blue #0ea5e9)
      - South Wing: Drawing Halls & Seminar 2 (Orange #f97316)
      - Continuous Veranda Balcony with safety parapet overlooking courtyard
      - STRICTLY ZERO SOLAR PANELS ON ROOF
    """
    z_slab0 = GF_HEIGHT
    z_slab1 = GF_HEIGHT + SLAB_THICKNESS
    z_ff_top = z_slab1 + FF_HEIGHT

    # 1. Structural intermediate floor slab with open central courtyard
    bm_slab = bmesh.new()
    add_box(bm_slab, -27.0, 0.0, 18.0, 72.0, z_slab0, z_slab1)   # West
    add_box(bm_slab,  27.0, 0.0, 18.0, 72.0, z_slab0, z_slab1)   # East
    add_box(bm_slab, 0.0,  27.0, 36.0, 18.0, z_slab0, z_slab1)   # North
    add_box(bm_slab, 0.0, -27.0, 36.0, 18.0, z_slab0, z_slab1)   # South
    make_mesh_object("FF_Structural_Floor_Slab", bm_slab, coll, mats["slab_concrete"])

    # 2. First Floor Rooms Floor Finishes (MazeMap Functional Color Coding)
    bm_cs_labs = bmesh.new()
    bm_library = bmesh.new()
    bm_upper_lts = bmesh.new()
    bm_drawing = bmesh.new()
    bm_ff_corridor = bmesh.new()

    add_box(bm_cs_labs, -28.5, 0.0, 15.0, 72.0, z_slab1, z_slab1 + 0.03)
    add_box(bm_library, 0.0, 28.5, 42.0, 15.0, z_slab1, z_slab1 + 0.03)
    add_box(bm_upper_lts, 28.5, 0.0, 15.0, 72.0, z_slab1, z_slab1 + 0.03)
    add_box(bm_drawing, 0.0, -28.5, 42.0, 15.0, z_slab1, z_slab1 + 0.03)

    add_box(bm_ff_corridor, -19.5, 0.0, 3.0, 36.0, z_slab1, z_slab1 + 0.02)
    add_box(bm_ff_corridor,  19.5, 0.0, 3.0, 36.0, z_slab1, z_slab1 + 0.02)
    add_box(bm_ff_corridor, 0.0,  19.5, 36.0, 3.0, z_slab1, z_slab1 + 0.02)
    add_box(bm_ff_corridor, 0.0, -19.5, 36.0, 3.0, z_slab1, z_slab1 + 0.02)

    make_mesh_object("FF_Floor_CS_Labs_West", bm_cs_labs, coll, mats["mazemap_cs_lab"])
    make_mesh_object("FF_Floor_Library_North", bm_library, coll, mats["mazemap_library"])
    make_mesh_object("FF_Floor_LectureTheatres_East", bm_upper_lts, coll, mats["mazemap_lt_upper"])
    make_mesh_object("FF_Floor_DrawingHalls_South", bm_drawing, coll, mats["mazemap_drawing"])
    make_mesh_object("FF_Floor_Veranda_Corridors", bm_ff_corridor, coll, mats["corridor_floor"])

    # 3. First Floor Walls
    bm_ff_ext = bmesh.new()
    bm_ff_int = bmesh.new()

    add_box(bm_ff_ext, -36.0 + WALL_THICKNESS_EXT*0.5, 0.0, WALL_THICKNESS_EXT, 72.0, z_slab1, z_ff_top)
    add_box(bm_ff_ext,  36.0 - WALL_THICKNESS_EXT*0.5, 0.0, WALL_THICKNESS_EXT, 72.0, z_slab1, z_ff_top)
    add_box(bm_ff_ext, 0.0,  36.0 - WALL_THICKNESS_EXT*0.5, 72.0, WALL_THICKNESS_EXT, z_slab1, z_ff_top)
    add_box(bm_ff_ext, 0.0, -36.0 + WALL_THICKNESS_EXT*0.5, 72.0, WALL_THICKNESS_EXT, z_slab1, z_ff_top)

    add_box(bm_ff_int, -21.0, 0.0, WALL_THICKNESS_INT, 60.0, z_slab1, z_ff_top)
    add_box(bm_ff_int,  21.0, 0.0, WALL_THICKNESS_INT, 60.0, z_slab1, z_ff_top)
    add_box(bm_ff_int, 0.0,  21.0, 42.0, WALL_THICKNESS_INT, z_slab1, z_ff_top)
    add_box(bm_ff_int, 0.0, -21.0, 42.0, WALL_THICKNESS_INT, z_slab1, z_ff_top)

    for y in [-24.0, -12.0, 0.0, 12.0, 24.0]:
        add_box(bm_ff_int, -28.5, y, 15.0, WALL_THICKNESS_INT, z_slab1, z_ff_top)
        add_box(bm_ff_int,  28.5, y, 15.0, WALL_THICKNESS_INT, z_slab1, z_ff_top)
    for x in [-14.0, 0.0, 14.0]:
        add_box(bm_ff_int, x, 28.5, WALL_THICKNESS_INT, 15.0, z_slab1, z_ff_top)

    make_mesh_object("FF_Exterior_Facade_Walls", bm_ff_ext, coll, mats["wall_sandstone"])
    make_mesh_object("FF_Interior_Partition_Walls", bm_ff_int, coll, mats["wall_interior"])

    # 4. Veranda Safety Parapet / Balustrade (1.05m high overlooking courtyard)
    bm_parapet = bmesh.new()
    parapet_h = 1.05
    parapet_th = 0.20
    add_box(bm_parapet, 0.0, 18.1, 36.0, parapet_th, z_slab1, z_slab1 + parapet_h)
    add_box(bm_parapet, 0.0, -18.1, 36.0, parapet_th, z_slab1, z_slab1 + parapet_h)
    add_box(bm_parapet, -18.1, 0.0, parapet_th, 36.0, z_slab1, z_slab1 + parapet_h)
    add_box(bm_parapet,  18.1, 0.0, parapet_th, 36.0, z_slab1, z_slab1 + parapet_h)
    make_mesh_object("FF_Veranda_Safety_Balustrade", bm_parapet, coll, mats["balustrade_white"])

    # 5. Roof Cap Parapets (Clean architectural roof perimeter, NO SOLAR PANELS)
    bm_roof_edge = bmesh.new()
    roof_h = 0.60
    add_box(bm_roof_edge, -36.0 + WALL_THICKNESS_EXT*0.5, 0.0, WALL_THICKNESS_EXT, 72.0, z_ff_top, z_ff_top + roof_h)
    add_box(bm_roof_edge,  36.0 - WALL_THICKNESS_EXT*0.5, 0.0, WALL_THICKNESS_EXT, 72.0, z_ff_top, z_ff_top + roof_h)
    add_box(bm_roof_edge, 0.0,  36.0 - WALL_THICKNESS_EXT*0.5, 72.0, WALL_THICKNESS_EXT, z_ff_top, z_ff_top + roof_h)
    add_box(bm_roof_edge, 0.0, -36.0 + WALL_THICKNESS_EXT*0.5, 72.0, WALL_THICKNESS_EXT, z_ff_top, z_ff_top + roof_h)
    make_mesh_object("Roof_Perimeter_Parapet_Clean", bm_roof_edge, coll, mats["wall_sandstone"])

# =============================================================================
# 8. MAZEMAP-STYLE 3D FLOATING PINS & ROOM LABELS
# =============================================================================
def add_floor_label(coll, mats, text, x, y, z, size=0.85):
    """Adds a flat architectural typography label resting on room floor."""
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
    obj.rotation_euler = (0.0, 0.0, 0.0)  # flat on floor, readable from top
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
    """Adds architectural labels directly on room floors."""
    # Ground Floor Labels
    gf_labels = [
        ("DIRECTOR", -28.5, 27.0, 0.08),
        ("DEAN ACADEMICS", -28.5, 18.0, 0.08),
        ("REGISTRAR", -28.5, 6.0, 0.08),
        ("ADMIN OFFICES", -28.5, -6.0, 0.08),
        ("EXAM CELL", -28.5, -18.0, 0.08),
        ("ACCOUNTS", -28.5, -27.0, 0.08),
        ("PHYSICS LAB", -7.0, 28.5, 0.08),
        ("CHEMISTRY LAB", 7.0, 28.5, 0.08),
        ("LT-1", 28.5, 18.0, 0.08),
        ("LT-2", 28.5, 0.0, 0.08),
        ("LT-3", 28.5, -18.0, 0.08),
        ("MAIN ENTRANCE", 0.0, -32.0, 0.08),
        ("SEMINAR HALL 1", 0.0, -25.0, 0.08),
    ]
    for txt, lx, ly, lz in gf_labels:
        add_floor_label(coll, mats, txt, lx, ly, lz, size=0.95)

def build_floating_badge(coll, mats, name, text_label, x, y, z, hex_color):
    """Creates a sleek 3D wayfinding badge pin hovering over a POI."""
    mat_pin = get_or_create_material(f"Mat_Pin_{name}", hex_color, roughness=0.2, emission=0.35)
    
    bm_badge = bmesh.new()
    # Sleek circular disc
    add_cylinder(bm_badge, x, y, 0.95, z, z + 0.22, segments=16)
    # Thin elegant needle
    add_cylinder(bm_badge, x, y, 0.025, z - 1.4, z, segments=8)
    make_mesh_object(f"Pin_Badge_{name}", bm_badge, coll, mat_pin)

    font_loaded = get_font()
    curve = bpy.data.curves.new(name=f"TextCurve_{name}", type='FONT')
    curve.body = text_label
    if font_loaded:
        curve.font = font_loaded
    curve.size = 0.50
    curve.extrude = 0.04
    curve.align_x = 'CENTER'
    curve.align_y = 'CENTER'

    txt_obj = bpy.data.objects.new(f"Pin_Label_{name}", curve)
    txt_obj.location = (x, y, z + 0.40)
    txt_obj.rotation_euler = (math.radians(55.0), 0.0, 0.0)
    txt_obj.data.materials.append(mats["white_text"])
    coll.objects.link(txt_obj)

    bpy.context.view_layer.objects.active = txt_obj
    txt_obj.select_set(True)
    try:
        bpy.ops.object.convert(target='MESH')
    except Exception:
        pass
    txt_obj.select_set(False)

def build_all_signage_pins(coll, mats):
    """Builds prominent 3D pins for campus landmarks."""
    pins = [
        ("AdminBlock", "ADMIN BLOCK", -28.5, 0.0, 6.5, "#d97706"),
        ("JIETStage", "JIET STAGE", 0.0, STAGE_Y_CENTER, 6.2, "#991b1b"),
        ("Amphitheater", "AMPHITHEATER", 0.0, -14.0, 5.8, "#b45309"),
        ("LectureTheatres", "LECTURE THEATRES", 28.5, 0.0, 6.5, "#0284c7"),
        ("EngineeringLabs", "ENGINEERING LABS", 0.0, 28.5, 6.5, "#059669"),
        ("CentralLibrary", "CENTRAL LIBRARY (1F)", 0.0, 28.5, 9.8, "#e11d48"),
        ("MainEntrance", "MAIN ENTRANCE", 0.0, -34.0, 6.5, "#ea580c"),
        ("StairNW", "NW STAIRS", -18.0, 18.0, 6.5, "#475569"),
        ("StairNE", "NE STAIRS",  18.0, 18.0, 6.5, "#475569"),
    ]
    for key, label, px, py, pz, color in pins:
        build_floating_badge(coll, mats, key, label, px, py, pz, color)

# =============================================================================
# 9. LIGHTING & MULTI-ANGLE CAMERAS SETUP
# =============================================================================
def setup_lighting(coll):
    """Sets up high-quality studio architectural sun and sky bounce."""
    # Key Sun: Warm sunlight
    sun_data = bpy.data.lights.new(name="Sun_Key", type='SUN')
    sun_data.energy = 2.6
    sun_data.color = (1.0, 0.98, 0.95)
    sun_data.use_shadow = True
    sun_obj = bpy.data.objects.new("Sun_Key", sun_data)
    sun_obj.rotation_euler = (math.radians(52.0), math.radians(18.0), math.radians(-38.0))
    coll.objects.link(sun_obj)

    # Soft Fill Sun
    fill_data = bpy.data.lights.new(name="Sun_Fill", type='SUN')
    fill_data.energy = 1.4
    fill_data.color = (0.94, 0.97, 1.0)
    fill_data.use_shadow = False
    fill_obj = bpy.data.objects.new("Sun_Fill", fill_data)
    fill_obj.rotation_euler = (math.radians(-42.0), math.radians(-20.0), math.radians(140.0))
    coll.objects.link(fill_obj)

    # World background
    scene = bpy.context.scene
    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.95, 0.97, 1.0, 1.0)
        bg.inputs["Strength"].default_value = 1.1

def create_camera(coll, name, location, target, lens=38.0):
    cam_data = bpy.data.cameras.new(name)
    cam_data.lens = lens
    cam_obj = bpy.data.objects.new(name, cam_data)
    coll.objects.link(cam_obj)
    cam_obj.location = location

    direction = Vector(target) - Vector(location)
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam_obj.rotation_euler = rot_quat.to_euler()
    return cam_obj

def setup_cameras(coll):
    """
    Sets up multi-angle cameras matching ground-truth user perspectives:
      1. Courtyard View: From South veranda looking down across amphitheater bleachers
         and 4 lawn quadrants to stage, Admin on LEFT (media_1791470686695.jpg & IMG_3030.jpeg).
      2. Top-Down: Satellite overview matching Google Maps (media_1791470363143.jpg).
      3. Isometric: 2.5D architectural isometric matching MazeMap.
      4. Stage Close-Up: Looking at stage, JIET text, brick plinth.
      5. Corner Staircase Close-Up: Looking at curved helical green marble stairs (IMG_3052.jpeg).
    """
    cameras = {}
    # 1. Courtyard View (Standing on top bleacher tier, looking down across all tiers, 4 lawns, and to stage)
    # Perfectly captures media_1791470686695.jpg & IMG_3030.jpeg
    cam_courtyard = create_camera(
        coll, "Camera_Courtyard_Admin_To_Stage",
        location=(0.0, -17.0, 3.0),
        target=(0.0, 13.5, 1.1),
        lens=22.0
    )
    cameras["courtyard_view_admin_to_stage"] = cam_courtyard

    # 2. Top-Down Satellite Overview (Matches media_1791470363143.jpg)
    cam_topdown = create_camera(
        coll, "Camera_TopDown_Overview",
        location=(0.0, 0.0, 92.0),
        target=(0.0, 0.0, 0.0),
        lens=35.0
    )
    cameras["topdown_overview"] = cam_topdown

    # 3. Isometric Campus View (Matches MazeMap 2.5D angle)
    cam_iso = create_camera(
        coll, "Camera_Isometric_Campus",
        location=(58.0, -58.0, 52.0),
        target=(0.0, 0.0, 2.5),
        lens=50.0
    )
    cameras["isometric_campus_view"] = cam_iso

    # 4. Stage Close-Up (Eye-level shot looking at stage platform, steps, and JIET text)
    cam_stage = create_camera(
        coll, "Camera_Stage_CloseUp",
        location=(0.0, 7.5, 1.8),
        target=(0.0, 16.5, 1.8),
        lens=30.0
    )
    cameras["stage_close_up"] = cam_stage

    # 5. Corner Staircase Close-Up (Matches IMG_3052.jpeg)
    cam_stairs = create_camera(
        coll, "Camera_Corner_Staircase_CloseUp",
        location=(-13.8, 14.5, 1.8),
        target=(-18.0, 18.0, 2.2),
        lens=28.0
    )
    cameras["corner_staircase_close_up"] = cam_stairs

    return cameras

# =============================================================================
# 10. MAIN EXECUTION & EXPORT PIPELINE
# =============================================================================
def main():
    print("=" * 70)
    print("JIET JODHPUR CAMPUS DIGITAL TWIN - BLENDER 3D PROTOTYPE GENERATOR (v2)")
    print("=" * 70)

    # 1. Initialize Scene
    scene = clean_scene()
    root_coll = bpy.context.scene.collection

    coll_ground = get_collection("01_Courtyard_Ground", root_coll)
    coll_stage = get_collection("02_Outdoor_Stage", root_coll)
    coll_stairs = get_collection("03_Corner_Staircases", root_coll)
    coll_gf = get_collection("04_Ground_Floor_Architecture", root_coll)
    coll_ff = get_collection("05_First_Floor_Architecture", root_coll)
    coll_labels = get_collection("06_Floor_Typography", root_coll)
    coll_signs = get_collection("07_Signage_Pins", root_coll)
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
        "stair_railing": get_or_create_material("Mat_Stair_Tubular_Railing", "#e2e8f0", roughness=0.25, metallic=0.2),
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

    print("-> Building Outdoor Stage & 3D JIET Typography...")
    build_outdoor_stage(coll_stage, mats)

    print("-> Building Corner Rotunda Helical Staircases (NW, NE, SW, SE)...")
    build_all_corner_staircases(coll_stairs, mats)

    print("-> Building Ground Floor Architecture & Colonnades...")
    build_ground_floor(coll_gf, mats)

    print("-> Building First Floor Architecture & Balustrades...")
    build_first_floor(coll_ff, mats)

    print("-> Adding Architectural Floor Typography Labels...")
    build_floor_typography(coll_labels, mats)

    print("-> Building MazeMap 3D Floating Wayfinding Pins...")
    build_all_signage_pins(coll_signs, mats)

    # 4. Setup Lighting and Cameras
    print("-> Setting up Lighting & Multi-Angle Cameras...")
    setup_lighting(coll_env)
    cameras = setup_cameras(coll_env)

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
        if view_name in ["courtyard_view_admin_to_stage", "stage_close_up", "corner_staircase_close_up"]:
            coll_signs.hide_render = True
        else:
            coll_signs.hide_render = False
        scene.camera = cam_obj
        scene.render.filepath = render_output
        bpy.ops.render.render(write_still=True)
    coll_signs.hide_render = False

    print("=" * 70)
    print("BLENDER PROTOTYPE GENERATION & RENDERING COMPLETE!")
    print(f"Saved .blend: {blend_path}")
    print(f"Saved .glb:   {glb_path}")
    print(f"Renders in:   {renders_dir}")
    print("=" * 70)

if __name__ == "__main__":
    main()
