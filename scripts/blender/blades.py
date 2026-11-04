# Twin black blades for the dark-theme backdrop: a long and a medium cleaver-style blade in
# dark polished metal, white cloth wrapped hilts. Baked and exported un-posed, in the same
# model space as katana.py (blade along +x from the hilt, spine +y, flats +-z); the crossed
# pose is set per screen shape in app/components/darkBlades.ts.
# Run: blender -b -P scripts/blender/blades.py -- <out_dir> [--fast]
#
# Per-part maps as in katana.py: <part>_col (sRGB), <part>_mat (G roughness, B metalness), <part>_nrm.
import os, sys
from math import sin, cos, pi, radians, exp
from mathutils import Vector
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import katana as K          # mesh/bake helpers; importing it also resets the scene and sets up Cycles
import bpy

EDGE_T = 0.00022


def ss(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- blade outlines (y above the hilt axis)
def long_spine(x):
    notch = 0.014 * max(0.0, 1 - abs(x - 0.118) / 0.013)           # V notch in the back near the hilt
    return 0.014 - notch + 0.018 * x ** 2.5                         # straight back with a slight sori toward the tip


def long_edge(x):
    beard = -0.032 - 0.056 * ss(0.05, 0.08, x)                      # narrow ricasso, then the full cleaver width
    body = beard - 0.006 * sin(pi * min(max((x - 0.08) / 0.9, 0), 1))
    t = min(max((x - 0.58) / 0.42, 0.0), 1.0)
    return body + (long_spine(x) - body) * t ** 2.4                 # the edge sweeps up to a point on the back line


def short_spine(x):
    return 0.010 + 0.014 * ss(0.045, 0.062, x) + 0.010 * (x / 0.64) ** 2.5   # stepped back, slight sori


def short_edge(x):
    body = -0.052 - 0.004 * sin(pi * min(x / 0.6, 1))
    t = min(max((x - 0.36) / 0.28, 0.0), 1.0)
    return body + (short_spine(x) - body) * t ** 2.2                # like the long blade: the edge sweeps up to the point


SPECS = {
    'long': dict(L=1.00, T=0.0080, spine=long_spine, edge=long_edge, bevel=0.016, slot=(0.15, 0.66, 0.79, 0.085),
                 hilt=0.30, wrap_cross=12, r=0.0175),
    'short': dict(L=0.64, T=0.0072, spine=short_spine, edge=short_edge, bevel=0.013, slot=None,
                  hilt=0.24, wrap_cross=9, r=0.0165),
}


def slot_hw(spec, x):
    """Half-width (fraction of the blade width) of the slot cut through the blade at x: it opens
    with a rounded end just past the back notch and runs out to a long point toward the tip."""
    if not spec['slot']:
        return 0.0
    x0, x1, _, hw = spec['slot']
    return hw * ss(x0, x0 + 0.03, x) ** 0.5 * (1 - ss(x0 + 0.10, x1, x)) ** 0.8


NB, N1, N2 = 8, 14, 12   # points: bevel side, flat below the slot, flat above it


def section(spec, x):
    """Facet strips, CCW in (y, z) like katana.strips: (positions, v coords) per strip.
    v bands: bevel 0.40-0.60, flats 0.06-0.40 / 0.60-0.94, chamfers and the spine outside,
    the slot walls 0.00-0.03. Each flat strip is split at the slot (the face across it is
    never built), so where the slot is open it is a real hole."""
    L, T0 = spec['L'], spec['T']
    yt, ye = spec['spine'](x), spec['edge'](x)
    W = max(yt - ye, 1e-5)
    T = T0 * (1 - 0.35 * x / L) * min(1.0, W / 0.03)
    a_b = min(spec['bevel'] / W, 0.9)
    a_s = max(1 - 0.0025 / W, a_b + 0.02)
    h = T / 2

    def flat_z(a):
        return h * (1 + 0.05 * sin(pi * (a - a_b) / max(a_s - a_b, 1e-6)))   # a little convexity: soft gradients

    def flat_v(a, lo, hi):
        return lo + (hi - lo) * (a - a_b) / max(a_s - a_b, 1e-6)

    bev = [(a_b * i / (NB - 1), EDGE_T * (1 - i / (NB - 1)) + h * (i / (NB - 1)) * (1 + 0.08 * (1 - i / (NB - 1)))) for i in range(NB)]
    c = spec['slot'][2] if spec['slot'] else (a_b + a_s) / 2
    hw = slot_hw(spec, x)
    s1, s2 = c - hw, c + hw
    flat = [a_b + (s1 - a_b) * i / (N1 - 1) for i in range(N1)] + [s2 + (a_s - s2) * i / (N2 - 1) for i in range(N2)]
    hs = 0.32 * h
    strips = [
        [(a, z, 0.5 + 0.1 * a / a_b) for a, z in reversed(bev)] + [(-0.8 * EDGE_T / W, 0.0, 0.5)]
        + [(a, -z, 0.5 - 0.1 * a / a_b) for a, z in bev],
        [(a, -flat_z(a), flat_v(a, 0.40, 0.06)) for a in flat],
        [(a_s, -flat_z(a_s), 0.06), (1.0, -hs, 0.03)],
        [(1.0, -hs, 0.98), (1.0, hs, 1.0)],
        [(1.0, hs, 0.97), (a_s, flat_z(a_s), 0.94)],
        [(a, flat_z(a), flat_v(a, 0.60, 0.94)) for a in reversed(flat)],
    ]
    return [[(x, yt - W * (1 - a), z) for a, z, _ in s] for s in strips], [[v for *_, v in s] for s in strips]


GAP = {1: N1 - 1, 5: N2 - 1}   # strip -> index of the face across the slot (bottom flat, top flat)


def make_blade(name, spec):
    L = spec['L']
    N = int(L * 900)   # dense: the bevel turns quickly where the edge sweeps up to the point
    xs = [L * i / N for i in range(N)]
    secs = [section(spec, x) for x in xs]
    verts, faces, uvs = [], [], []
    tip = (L, (spec['spine'](L) + spec['edge'](L)) / 2, 0.0)
    for k in range(len(secs[0][0])):
        rows = [s[0][k] for s in secs]
        uvr = [[(x / L, v) for v in s[1][k]] for x, s in zip(xs, secs)]
        n = len(rows[0])
        o = len(verts)
        for r in rows: verts += r
        for i in range(len(rows) - 1):
            for j in range(n - 1):
                if GAP.get(k) == j:
                    continue
                faces.append((o + i * n + j, o + i * n + j + 1, o + (i + 1) * n + j + 1, o + (i + 1) * n + j))
                uvs.append([uvr[i][j], uvr[i][j + 1], uvr[i + 1][j + 1], uvr[i + 1][j]])
        verts.append(tip); t = len(verts) - 1
        last = o + (len(rows) - 1) * n
        for j in range(n - 1):
            faces.append((last + j, last + j + 1, t))
            uvs.append([uvr[-1][j], uvr[-1][j + 1], (1.0, uvr[-1][j][1])])
    # Slot walls: polished faces from the bottom flat to the top flat along both sides of the
    # hole, facing into it. They meet at the slot's two ends, closing it.
    for side, jb, jt, up in ((0, N1 - 1, N2, 1), (1, N1, N2 - 1, -1)):   # lower wall faces +y, upper -y
        for i in range(N - 1):
            if slot_hw(spec, xs[i]) <= 0 and slot_hw(spec, xs[i + 1]) <= 0:
                continue
            q = [secs[i][0][1][jb], secs[i + 1][0][1][jb], secs[i + 1][0][5][jt], secs[i][0][5][jt]]
            u0, u1 = xs[i] / L, xs[i + 1] / L
            uv = [(u0, 0.0), (u1, 0.0), (u1, 0.03), (u0, 0.03)]
            nrm = (Vector(q[1]) - Vector(q[0])).cross(Vector(q[3]) - Vector(q[0]))
            if nrm.y * up < 0:
                q, uv = q[::-1], uv[::-1]
            o = len(verts); verts += q
            faces.append((o, o + 1, o + 2, o + 3)); uvs.append(uv)
    ob = K.mesh_obj(name, verts, faces, uvs)
    ob.data.shade_smooth()
    return ob


def loop(spec, x):
    pos, _ = section(spec, x)
    pts = pos[0] + pos[1][1:] + pos[2][1:] + pos[3][1:] + pos[4][1:] + pos[5][1:-1]
    return [(p[1], p[2]) for p in pts]


# ---------------------------------------------------------------- hilt: core, wrap, collar, pommel, guard
def hilt_y(spec):
    return (spec['spine'](0) + spec['edge'](0)) / 2


def make_wrap(name, spec, cy):
    """White cloth bands wound both ways; the crossings rise and alternate over/under."""
    x0, x1 = -0.004, -spec['hilt'] + 0.012
    span = x0 - x1
    n = spec['wrap_cross']
    hw = 0.44 * span / n
    S = 900
    prof = [(-1.0, 0.0003), (-0.8, 0.0008), (-0.4, 0.0011), (0.0, 0.0012), (0.4, 0.0011), (0.8, 0.0008), (1.0, 0.0003)]
    r0 = spec['r']
    obs = []
    for idx, s in enumerate((1, -1)):
        rows, uvr = [], []
        for i in range(S + 1):
            t = i / S
            x = x0 - span * t
            kf = n * t
            k = round(kf); d = kf - k
            on_top = ((k // 2) % 2 == 0) == (idx == 0)
            lift = 0.0005 + 0.0012 * exp(-(d / 0.24) ** 2) + (0.0010 * exp(-(d / 0.32) ** 2) if on_top else 0.0)
            th = s * pi * kf + pi / 2
            row = []
            for w, dome in prof:
                r = r0 + lift + dome
                row.append((x + w * hw, cy + r * cos(th), r * 0.82 * sin(th)))
            rows.append(row)
            uvr.append([(t, 0.5 * idx + 0.01 + 0.48 * (w + 1) / 2) for w, _ in prof])
        v, f, uv = K.grid(rows, uvr)
        obs.append(K.mesh_obj('%s%d' % (name, idx), v, f, uv))
    ob = K.join(name, obs)
    K.select(ob)
    mod = ob.modifiers.new('solid', 'SOLIDIFY'); mod.thickness = 0.0006; mod.offset = -1
    bpy.ops.object.modifier_apply(modifier='solid')
    ob.data.shade_smooth()
    return ob


def bar(name, pts, w=0.0085, t=0.0075):
    """Square-section bar along a polyline in the z=0 plane, mitred at the corners, edges softened."""
    import bmesh
    bm = bmesh.new()
    n = len(pts)
    ring = []
    for i, (x, y) in enumerate(pts):
        dirs = []
        if i > 0: dirs.append(Vector((x - pts[i - 1][0], y - pts[i - 1][1], 0)).normalized())
        if i < n - 1: dirs.append(Vector((pts[i + 1][0] - x, pts[i + 1][1] - y, 0)).normalized())
        d = sum(dirs, Vector()).normalized()
        side = Vector((-d.y, d.x, 0))
        k = 1 / max(side.dot(Vector((-dirs[0].y, dirs[0].x, 0))), 0.3)   # mitre: keep the bar width at corners
        c = Vector((x, y, 0))
        ring.append([bm.verts.new(c + side * sy * w / 2 * k + Vector((0, 0, sz * t / 2))) for sy, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
    for a, b in zip(ring, ring[1:]):
        for j in range(4):
            bm.faces.new((a[j], a[(j + 1) % 4], b[(j + 1) % 4], b[j]))
    bm.faces.new(list(reversed(ring[0]))); bm.faces.new(ring[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = K.link(bpy.data.objects.new(name, me))
    K.select(ob)
    bev = ob.modifiers.new('bev', 'BEVEL'); bev.width = 0.0015; bev.segments = 3
    bpy.ops.object.modifier_apply(modifier='bev')
    bpy.ops.object.shade_smooth_by_angle(angle=radians(40))
    return ob


def make_frame(spec, cy):
    """The short sword's knuckle frame: its back carries on past the blade as a thin bar along the
    grip, clear of the hand, then turns down into the pommel. A closed loop round the grip."""
    top = cy + spec['r'] + 0.024           # bar centreline, a hand's thickness above the grip
    x0, x1 = 0.008, -spec['hilt'] - 0.006
    return bar('short_frame', [(x0, spec['spine'](x0) - 0.004), (x0, top), (x1, top), (x1, cy)])


def make_hilt(prefix, spec):
    cy = hilt_y(spec)
    L_h, r = spec['hilt'], spec['r']
    xs = [-L_h * i / 80 for i in range(81)]
    core = K.lathe(prefix + '_core', xs, [r] * len(xs), zr=0.82, seg=64, cy=cy, smooth=60)
    wrap = make_wrap(prefix + '_wrap', spec, cy)
    parts = []
    # collar around the blade root, grown from the blade section
    rows = []
    for x, g in ((0.0, 0.0030), (0.002, 0.0034), (0.020, 0.0030), (0.024, 0.0012)):
        lp = loop(spec, x)
        yc = (spec['spine'](x) + spec['edge'](x)) / 2
        T = spec['T'] * (1 - 0.35 * x / spec['L'])
        W = spec['spine'](x) - spec['edge'](x)
        rows.append([(x, yc + (y - yc) * (W + 2 * g) / W, z * (T + 2 * g) / T) for y, z in lp])
    rows.append([(0.024, y, z) for y, z in loop(spec, 0.024)])
    v, f, _ = K.grid(rows, closed=True)
    f.append(tuple(reversed(range(len(rows[0])))))
    collar = K.mesh_obj(prefix + '_collar', v, f); K.cleanup(collar, 30); parts.append(collar)
    # ferrule where the wrap meets the collar, and a domed pommel
    parts.append(K.lathe(prefix + '_ferrule', [0.0005, 0.0005, -0.006, -0.006], [0.0, r + 0.0026, r + 0.0026, 0.0], zr=0.82, cy=cy, smooth=50))
    px, pr = [-L_h + 0.004], [r + 0.0012]
    for i in range(15):
        t = i / 14
        px.append(-L_h - 0.022 * t); pr.append((r + 0.0028) * max(cos(t * pi / 2), 0) ** 0.42)
    parts.append(K.lathe(prefix + '_pommel', px, pr, zr=0.82, cy=cy, smooth=45))
    if prefix == 'short':
        parts.append(make_frame(spec, cy))
    fit = K.join(prefix + '_fit', parts)
    return core, wrap, fit


# ---------------------------------------------------------------- materials (bake graphs)
def blade_graph(g):
    ob = g.tc.outputs['Object']
    _, v, _ = g.sep(g.tc.outputs['UV'])
    bevel = g.mul(g.ss(0.395, 0.405, v), g.inv(g.ss(0.595, 0.605, v)))
    rim = g.mx(g.inv(g.ss(0.055, 0.065, v)), g.ss(0.935, 0.945, v))
    polish = g.mx(bevel, rim)
    hair = g.noise(g.mapping(ob, (0.006, 1, 1)), 2600, 3, 0.5)                 # brushed hairlines along the blade
    flow = g.noise(g.mapping(ob, (0.3, 1, 1)), 22, 4, 0.55)                   # faint large-scale tempering clouds
    scuff = g.mul(g.ss(0.72, 0.8, g.noise(ob, 180, 3)), 0.25)
    flat_c = g.mixc(g.add(g.mul(flow, 0.6), g.mul(hair, 0.35)), (0.040, 0.043, 0.054, 1), (0.075, 0.080, 0.096, 1))
    color = g.mixc(polish, flat_c, (0.46, 0.48, 0.53, 1))
    rough_flat = g.add(0.18, g.add(g.mul(hair, 0.08), g.add(g.mul(flow, 0.05), g.mul(scuff, 0.1))))
    rough = g.clamp(g.add(g.mul(g.inv(polish), rough_flat), g.mul(polish, 0.06)))
    height = g.mul(g.inv(polish), g.add(g.mul(hair, 0.5), g.mul(scuff, 0.2)))
    return dict(color=color, trans=1.0, rough=rough, frost=1.0, height=height, bump=0.12)


def fit_graph(g):
    ob = g.tc.outputs['Object']
    hair = g.noise(ob, 1800, 3, 0.5)
    color = g.mixc(hair, (0.045, 0.048, 0.058, 1), (0.07, 0.074, 0.088, 1))
    return dict(color=color, trans=1.0, rough=g.add(0.22, g.mul(hair, 0.1)), frost=1.0, height=g.mul(hair, 0.4), bump=0.15)


def wrap_graph(g):
    ob = g.tc.outputs['Object']
    u, v, _ = g.sep(g.tc.outputs['UV'])
    along = g.mul(u, 0.55)
    w = g.clamp(g.mul(g.m('FRACT', g.mul(g.sub(v, 0.01), 2.0)), 1 / 0.96))
    twill = g.mul(g.add(g.m('SINE', g.mul(g.add(along, g.mul(w, 0.02)), 2 * pi / 0.0013)), 1.0), 0.5)
    fibres = g.noise(ob, 3000, 2)
    roll = g.mul(g.ss(0.0, 0.12, w), g.ss(0.0, 0.12, g.sub(1.0, w)))
    color = g.mixc(g.add(g.mul(roll, 0.55), g.mul(twill, 0.2)), (0.62, 0.63, 0.66, 1), (0.93, 0.93, 0.92, 1))
    rough = g.clamp(g.add(0.55, g.mul(twill, 0.12)))
    height = g.add(g.add(g.mul(twill, 0.45), g.mul(fibres, 0.25)), g.mul(roll, 0.7))
    return dict(color=color, trans=1.0, rough=rough, frost=0.0, height=height, bump=0.6)


def core_graph(g):
    ob = g.tc.outputs['Object']
    n = g.noise(ob, 900, 3)
    return dict(color=g.mixc(n, (0.012, 0.012, 0.014, 1), (0.03, 0.03, 0.034, 1)), trans=1.0,
                rough=g.add(0.35, g.mul(n, 0.1)), frost=0.0, height=n, bump=0.2)


# ---------------------------------------------------------------- build, bake, export (un-posed)
def split(ob, kind):
    """Undo the join that let both swords share one texture: back into long_<kind> / short_<kind>."""
    K.select(ob)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT')
    ob.vertex_groups.active_index = ob.vertex_groups['long'].index
    bpy.ops.object.vertex_group_select()
    bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')
    part = [o for o in bpy.context.selected_objects if o != ob][0]
    part.name, ob.name = 'long_' + kind, 'short_' + kind
    return [part, ob]


def main():
    groups = {'blade': [], 'core': [], 'wrap': [], 'fit': []}
    for name, spec in SPECS.items():
        groups['blade'].append(make_blade(name + '_blade', spec))
        for kind, ob in zip(('core', 'wrap', 'fit'), make_hilt(name, spec)):
            ob.vertex_groups.new(name=name).add(range(len(ob.data.vertices)), 1.0, 'REPLACE')
            groups[kind].append(ob)
    objs = []
    for b in groups['blade']:
        K.bake(b, blade_graph, (4096, 512) if b.name.startswith('long') else (2048, 512), b.name, ('col', 'mat', 'nrm'))
        objs.append(b)
    for kind, graph, size in (('fit', fit_graph, (1024, 1024)), ('wrap', wrap_graph, (2048, 512)), ('core', core_graph, (512, 512))):
        ob = K.join(kind, groups[kind])
        if kind == 'fit':
            K.select(ob)
            bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.uv.smart_project(angle_limit=radians(55), island_margin=0.004)
            bpy.ops.object.mode_set(mode='OBJECT')
        K.bake(ob, graph, size, kind, ('col', 'mat', 'nrm'))
        objs += split(ob, kind)
    for ob in objs:
        ob.data.materials.clear()
        print('built', ob.name, len(ob.data.vertices), 'verts')
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(K.OUT, 'blades.glb'), export_format='GLB', use_selection=True,
                              export_materials='NONE', export_texcoords=True, export_normals=True)
    print('exported', os.path.getsize(os.path.join(K.OUT, 'blades.glb')), 'bytes')


main()
