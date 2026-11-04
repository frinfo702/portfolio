# Ice katana v2: procedural model, ice textures baked per part, geometry to GLB.
# Run: blender -b --python katana.py -- <out_dir> [--fast]
#
# Model space (metres): blade along +x from the habaki (x=0) to the tip (x=L),
# edge toward -y, spine toward +y, flats facing +-z. Hilt runs along -x.
# Each part bakes three PNGs: <part>_col (sRGB colour), <part>_mat (R transmission,
# G roughness, B frost) and <part>_nrm (tangent-space normal). three.js wires them up.
import bpy, bmesh, os, sys
from math import sin, cos, pi, sqrt, radians
import numpy as np

argv = sys.argv[sys.argv.index('--') + 1:]
OUT = os.path.abspath(argv[0])
FAST = '--fast' in argv
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'; prefs.get_devices()
    for d in prefs.devices: d.use = True
    scene.cycles.device = 'GPU'
except Exception as e:
    print('GPU unavailable', e)
scene.cycles.samples = 4
scene.render.bake.margin = 8

# ---------------------------------------------------------------- dimensions
L, K = 0.76, 0.040            # blade length, kissaki length
XK = L - K                    # yokote
W0, W1 = 0.032, 0.0225        # width at the habaki / at the yokote
T0, T1 = 0.0074, 0.0052       # thickness at the shinogi, base / yokote
SORI = 0.019                  # curvature at the tip
A_S, A_M = 0.72, 0.93         # shinogi and mune shoulder, fraction of width from the edge
NIKU = 0.32                   # convexity of the hira
EDGE_T = 0.00018              # half-thickness just behind the edge: keeps a hairline highlight
RF = (K * K + W1 * W1) / (2 * W1)   # fukura: arc tangent to the edge, meeting the mune at the tip
TL = 0.31
CY = W0 * 0.5                 # hilt centreline
X_T0 = -0.019
X_T1 = X_T0 - TL


def link(ob):
    scene.collection.objects.link(ob)
    return ob


def mesh_obj(name, verts, faces, face_uvs=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    if face_uvs:
        uv = me.uv_layers.new(name='UVMap')
        for poly, uvs in zip(me.polygons, face_uvs):
            for li, t in zip(poly.loop_indices, uvs):
                uv.data[li].uv = t
    me.update()
    return link(bpy.data.objects.new(name, me))


def select(ob):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob


def cleanup(ob, smooth_angle=35):
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data); bm.free()
    select(ob)
    bpy.ops.object.shade_smooth_by_angle(angle=radians(smooth_angle))


def join(name, obs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    ob.name = name
    return ob


def grid(rows, uv_rows=None, closed=False):
    """Quads between consecutive rows of equal length (rows run along the blade)."""
    verts, faces, uvs = [], [], []
    n = len(rows[0])
    for r in rows: verts += r
    m = n if closed else n - 1
    for i in range(len(rows) - 1):
        for j in range(m):
            j1 = (j + 1) % n
            faces.append((i * n + j, i * n + j1, (i + 1) * n + j1, (i + 1) * n + j))
            if uv_rows:
                a, b = uv_rows[i], uv_rows[i + 1]
                uvs.append([a[j], a[j1] if j1 else (a[j1][0], 1.0) if closed else a[j1], b[j1] if j1 else (b[j1][0], 1.0) if closed else b[j1], b[j]])
    return verts, faces, uvs


# ---------------------------------------------------------------- blade (shinogi-zukuri, iori-mune)
def frame(x):
    """(spine y, width, thickness at the shinogi, shinogi frac, mune-shoulder frac, edge factor) at x."""
    c = SORI * (x / L) ** 2
    if x <= XK:
        t = x / XK
        return c + W0 + (W1 - W0) * t, W0 + (W1 - W0) * t, T0 + (T1 - T0) * t, A_S, A_M, 1.0
    u = min((x - XK) / K, 1.0)
    W = max(W1 - (RF - sqrt(max(RF * RF - (u * K) ** 2, 0.0))), 1e-6)
    a_s = min(1 - (1 - A_S) * W1 * (1 - u) ** 1.1 / W, 0.92)   # ko-shinogi curving to the tip
    a_m = min(1 - (1 - A_M) * W1 * (1 - u) / W, 0.975)
    return c + W1, W, T1 * (1 - u) ** 0.85, a_s, a_m, (1 - u) ** 0.5


def strips(x):
    """Cross-section as facet strips, each listed counter-clockwise in (y, z) so quads face out.
    Separate strips -> hard creases at the shinogi, mune shoulders and mune ridge."""
    spine, W, T, a_s, a_m, ef = frame(x)
    Tm = 0.82 * T
    NH = 12
    top = []
    for i in range(NH):
        s = (i / (NH - 1)) ** 1.25
        top.append((a_s * s, EDGE_T * ef * (1 - s) + 0.5 * T * (s + NIKU * s * (1 - s))))
    apex = (-0.8 * EDGE_T * ef / W, 0.0)
    out = [
        [(a, z, 1) for a, z in reversed(top)] + [(apex[0], 0.0, 0)] + [(a, -z, -1) for a, z in top],   # hira + ha
        [(a_s, -T / 2, -1), ((a_s + a_m) / 2, -(T + Tm) / 4, -1), (a_m, -Tm / 2, -1)],              # shinogi-ji
        [(a_m, -Tm / 2, -1), (1.0, 0.0, -1)],                                                         # mune
        [(1.0, 0.0, 1), (a_m, Tm / 2, 1)],
        [(a_m, Tm / 2, 1), ((a_s + a_m) / 2, (T + Tm) / 4, 1), (a_s, T / 2, 1)],
    ]
    pos = [[(x, spine - W * (1 - a), z) for a, z, _ in s] for s in out]
    vs = [[0.5 + 0.5 * max(0.0, min(a, 1.0)) * side for a, _, side in s] for s in out]
    return pos, vs


def blade_rows():
    xs = [XK * i / 300 for i in range(301)]
    ks = [XK + K * sin(pi / 2 * j / 72) for j in range(72)]   # denser toward the tip
    return xs, [k for k in ks if k < L - 2e-4]


def make_blade():
    body, kiss = blade_rows()
    verts, faces, uvs = [], [], []
    tip = (L, SORI + W1, 0.0)
    for xs, is_tip in ((body, False), (kiss, True)):       # yokote = separate verts -> visible crease
        secs = [strips(x) for x in xs]
        for k in range(5):
            rows = [s[0][k] for s in secs]
            uvr = [[(x / L, v) for v in s[1][k]] for x, s in zip(xs, secs)]
            v, f, uv = grid(rows, uvr)
            o = len(verts)
            verts += v; faces += [tuple(i + o for i in fc) for fc in f]; uvs += uv
            if is_tip:
                verts.append(tip); t = len(verts) - 1
                last = o + (len(rows) - 1) * len(rows[0])
                for j in range(len(rows[0]) - 1):
                    faces.append((last + j, last + j + 1, t))
                    uvs.append([uvr[-1][j], uvr[-1][j + 1], (1.0, uvr[-1][j][1])])
    ob = mesh_obj('blade', verts, faces, uvs)
    ob.data.shade_smooth()
    return ob


def section_loop(x):
    pos, _ = strips(x)
    loop = pos[0] + pos[1][1:] + pos[2][1:] + pos[3][1:] + pos[4][1:-1]
    return [(p[1], p[2]) for p in loop]


def make_core():
    """Cloudy inner core: frozen-in frost seen through the clear outer blade."""
    x0, x1 = 0.036, L - 0.010
    N, rows, uvr = 260, [], []
    for i in range(N + 1):
        x = x0 + (x1 - x0) * i / N
        spine, W, T, *_ = frame(x)
        mid = spine - W * 0.52
        grow = min(1.0, (x - x0) / 0.05) ** 0.6 * min(1.0, (x1 - x) / 0.03) ** 0.5
        wob = 1 + 0.08 * sin(x * 37) + 0.05 * sin(x * 91 + 1.3)
        loop = section_loop(x)
        rows.append([(x, mid + (y - mid) * 0.80 * grow * wob, z * 0.40 * grow) for y, z in loop])
        n = len(loop)
        uvr.append([((x - x0) / (x1 - x0), j / n) for j in range(n)])
    v, f, uv = grid(rows, uvr, closed=True)
    ob = mesh_obj('core', v, f, uv)
    ob.data.shade_smooth()
    return ob


# ---------------------------------------------------------------- lathe helper for oval hilt parts
def lathe(name, xs, rs, zr=0.78, seg=64, cy=CY, smooth=40):
    verts, faces, uvs = [], [], []
    for x, r in zip(xs, rs):
        for k in range(seg):
            a = 2 * pi * k / seg
            verts.append((x, cy + r * cos(a), r * zr * sin(a)))
    n = len(xs)
    for i in range(n - 1):
        for k in range(seg):
            k1 = (k + 1) % seg
            faces.append((i * seg + k, i * seg + k1, (i + 1) * seg + k1, (i + 1) * seg + k))
            u0, u1 = i / (n - 1), (i + 1) / (n - 1)
            uvs.append([(u0, k / seg), (u0, (k + 1) / seg), (u1, (k + 1) / seg), (u1, k / seg)])
    ob = mesh_obj(name, verts, faces, uvs)
    cleanup(ob, smooth)
    return ob


def tsuka_r(x):
    t = (X_T0 - x) / TL                 # 0 at the fuchi, 1 at the kashira
    return 0.0150 * (1 - 0.06 * sin(pi * t)) + 0.0006 * t   # slight waist


def make_same():
    xs = [X_T0 - TL * i / 120 for i in range(121)]
    return lathe('same', xs, [tsuka_r(x) for x in xs], seg=96, smooth=60)


# ---------------------------------------------------------------- tsuka-ito
N_CROSS = 16                  # crossings, alternating omote / ura
ITO_X0, ITO_X1 = X_T0 - 0.003, X_T1 + 0.005
ITO_LEN = []


def make_ito():
    """Two counter-wound flat silk ribbons. Each crossing rises over a folded-paper
    hishigami and the ribbon on top alternates, so the diamonds read as woven."""
    span = ITO_X0 - ITO_X1
    hw = 0.31 * span / N_CROSS
    S = 1400
    prof = [(-1.0, 0.00030), (-0.85, 0.00075), (-0.5, 0.00105), (0.0, 0.00115), (0.5, 0.00105), (0.85, 0.00075), (1.0, 0.00030)]
    obs = []
    for idx, s in enumerate((1, -1)):
        rows, uvr, centre = [], [], []
        for i in range(S + 1):
            t = i / S
            x = ITO_X0 - span * t
            kf = N_CROSS * t
            k = round(kf); d = kf - k
            on_top = ((k // 2) % 2 == 0) == (idx == 0)
            lift = 0.0005 + 0.0017 * np.exp(-(d / 0.24) ** 2) + (0.0011 * np.exp(-(d / 0.32) ** 2) if on_top else 0.0)
            th = s * pi * kf + pi / 2
            row = []
            for w, dome in prof:
                xx = x + w * hw
                r = tsuka_r(xx) + lift + dome
                row.append((xx, CY + r * cos(th), r * 0.78 * sin(th)))
            rows.append(row)
            centre.append(row[3])
            uvr.append([(t, 0.5 * idx + 0.01 + 0.48 * (w + 1) / 2) for w, _ in prof])
        ITO_LEN.append(sum((np.subtract(centre[i + 1], centre[i]) ** 2).sum() ** 0.5 for i in range(S)))
        v, f, uv = grid(rows, uvr)
        obs.append(mesh_obj('ito%d' % idx, v, f, uv))
    ob = join('ito', obs)
    select(ob)
    mod = ob.modifiers.new('solid', 'SOLIDIFY'); mod.thickness = 0.0005; mod.offset = -1
    bpy.ops.object.modifier_apply(modifier='solid')
    ob.data.shade_smooth()
    return ob


# ---------------------------------------------------------------- fittings
XT = -0.0036                  # tsuba centre plane


def make_tsuba():
    """Round sukashi tsuba: raised mimi rim, recessed plate, eight pierced windows."""
    R, zr = 0.0395, 0.965
    hp, hr, hs = 0.00140, 0.00215, 0.00195     # half-thickness of plate, rim, seppa-dai
    path = [(hs, 0.0), (hs, 0.0166), (hp, 0.0181), (hp, R - 0.0036)]
    for i in range(15):
        ph = pi / 2 - pi * i / 14
        path.append((hr * sin(ph), R - 0.0024 + 0.0024 * cos(ph)))
    path += [(-hp, R - 0.0036), (-hp, 0.0181), (-hs, 0.0166), (-hs, 0.0)]
    tsuba = lathe('tsuba', [XT + p[0] for p in path], [p[1] for p in path], zr=zr, seg=256, smooth=30)

    # window cutters: rounded trapezoids between straight spokes
    bm = bmesh.new()
    r_in, r_out, spoke = 0.0207, 0.0337, 0.0046
    for k in range(8):
        tc = (k + 0.5) * pi / 4
        half = lambda r: pi / 8 - spoke / 2 / r
        pts = []
        for i in range(10):
            a = tc - half(r_out) + 2 * half(r_out) * i / 9
            pts.append((r_out * cos(a), r_out * sin(a)))
        for i in range(8):
            a = tc + half(r_in) - 2 * half(r_in) * i / 7
            pts.append((r_in * cos(a), r_in * sin(a)))
        vs = [bm.verts.new((XT - 0.01, CY + py, pz * zr)) for py, pz in pts]
        face = bm.faces.new(vs)
        corners = [vs[0], vs[9], vs[10], vs[17]]
        bmesh.ops.bevel(bm, geom=corners, offset=0.0014, segments=5, affect='VERTICES', profile=0.5)
        bm.faces.ensure_lookup_table()
        face = [f for f in bm.faces if f.is_valid and len(f.verts) > 4][-1]
        ext = bmesh.ops.extrude_face_region(bm, geom=[face])
        bmesh.ops.translate(bm, vec=(0.02, 0, 0), verts=[e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('cut'); bm.to_mesh(me); bm.free()
    cutter = link(bpy.data.objects.new('cut', me))
    select(tsuba)
    mod = tsuba.modifiers.new('cut', 'BOOLEAN'); mod.operation = 'DIFFERENCE'; mod.solver = 'EXACT'; mod.object = cutter
    bpy.ops.object.modifier_apply(modifier='cut')
    bpy.data.objects.remove(cutter)
    bev = tsuba.modifiers.new('bev', 'BEVEL'); bev.limit_method = 'ANGLE'; bev.angle_limit = radians(50)
    bev.width = 0.00045; bev.segments = 3
    bpy.ops.object.modifier_apply(modifier='bev')
    bpy.ops.object.shade_smooth_by_angle(angle=radians(32))
    return tsuba


def make_habaki():
    xs = [0.0, 0.0016, 0.0265, 0.0306]
    grow = [(0.0017, 0.0019), (0.0018, 0.0021), (0.0014, 0.0017), (0.0007, 0.0009)]   # (width, thickness) added
    rows = []
    for x, (gw, gt) in zip(xs, grow):
        spine, W, T, *_ = frame(x)
        mid = spine - W / 2
        loop = section_loop(x)
        rows.append([(x, mid + (y - mid) * (W + 2 * gw) / W, z * (T + 2 * gt) / T) for y, z in loop])
    blade_front = [(xs[-1], y, z) for y, z in section_loop(xs[-1])]
    rows.append(blade_front)            # front face: a ring down onto the blade
    v, f, _ = grid(rows, closed=True)
    n = len(rows[0])
    f.append(tuple(reversed(range(n))))
    ob = mesh_obj('habaki', v, f)
    cleanup(ob, 30)
    return ob


def make_fittings():
    parts = [make_habaki(), make_tsuba()]
    parts.append(lathe('seppa1', [-0.0001, -0.0001, -0.0016, -0.0016], [0.0, 0.0186, 0.0186, 0.0], zr=0.7, smooth=50))
    parts.append(lathe('seppa2', [-0.0056, -0.0056, -0.0071, -0.0071], [0.0, 0.0183, 0.0183, 0.0], zr=0.7, smooth=50))
    fx = [-0.0071, -0.0071, -0.0076] + [-0.0076 - 0.0114 * i / 8 for i in range(1, 9)]
    fr = [0.0, 0.0172, 0.0172] + [0.0169 - 0.0012 * (i / 8) ** 2 for i in range(1, 9)]
    parts.append(lathe('fuchi', fx, fr, smooth=45))
    kx, kr = [X_T1 + 0.002], [tsuka_r(X_T1) + 0.0004]
    for i in range(17):
        t = i / 16
        kx.append(X_T1 - 0.017 * t)
        kr.append((tsuka_r(X_T1) + 0.0013) * max(cos(t * pi / 2), 0) ** 0.38)
    parts.append(lathe('kashira', kx, kr, smooth=45))
    # menuki: six-petal ornaments under the wrap, one on each face
    for side, xm in ((1, X_T0 - TL * 0.40), (-1, X_T0 - TL * 0.60)):
        z = side * (tsuka_r(xm) * 0.78 + 0.0003)
        for k in range(6):
            a = k * pi / 3
            bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=14, ring_count=7,
                                                 location=(xm + 0.0045 * cos(a), CY + 0.0045 * sin(a), z),
                                                 scale=(0.0034, 0.0017, 0.0013), rotation=(0, 0, a))
            parts.append(bpy.context.active_object)
    ob = join('fittings', parts)
    select(ob)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=radians(55), island_margin=0.004)
    bpy.ops.object.mode_set(mode='OBJECT')
    return ob


# ---------------------------------------------------------------- shader-node helpers for the bakes
class NG:
    def __init__(self, mat):
        self.N = mat.node_tree.nodes; self.Lk = mat.node_tree.links
        self.tc = self.N.new('ShaderNodeTexCoord')

    def put(self, sock, v):
        if isinstance(v, (int, float, tuple)): sock.default_value = v
        else: self.Lk.new(v, sock)

    def m(self, op, a, b=0.0, clamp=False):
        n = self.N.new('ShaderNodeMath'); n.operation = op; n.use_clamp = clamp
        self.put(n.inputs[0], a); self.put(n.inputs[1], b)
        return n.outputs[0]

    def add(self, a, b): return self.m('ADD', a, b)
    def sub(self, a, b): return self.m('SUBTRACT', a, b)
    def mul(self, a, b): return self.m('MULTIPLY', a, b)
    def mx(self, a, b): return self.m('MAXIMUM', a, b)
    def clamp(self, a): return self.m('ADD', a, 0.0, clamp=True)
    def inv(self, a): return self.m('SUBTRACT', 1.0, a, clamp=True)

    def ss(self, e0, e1, x):
        n = self.N.new('ShaderNodeMapRange'); n.interpolation_type = 'SMOOTHSTEP'; n.clamp = True
        self.put(n.inputs['Value'], x)
        n.inputs['From Min'].default_value = e0; n.inputs['From Max'].default_value = e1
        return n.outputs['Result']

    def gauss(self, x, w):
        return self.m('EXPONENT', self.mul(self.mul(x, x), -1.0 / (w * w)))

    def noise(self, vec, scale, detail=4.0, rough=0.55, w=None):
        n = self.N.new('ShaderNodeTexNoise')
        if w is not None:
            n.noise_dimensions = '1D'; self.put(n.inputs['W'], w)
        else:
            self.put(n.inputs['Vector'], vec)
        n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = detail
        n.inputs['Roughness'].default_value = rough
        return n.outputs['Fac']

    def vor(self, vec, scale, feature='F1'):
        n = self.N.new('ShaderNodeTexVoronoi'); n.feature = feature
        self.put(n.inputs['Vector'], vec); n.inputs['Scale'].default_value = scale
        return n

    def mapping(self, vec, scale):
        n = self.N.new('ShaderNodeMapping'); self.put(n.inputs['Vector'], vec)
        n.inputs['Scale'].default_value = scale
        return n.outputs['Vector']

    def sep(self, vec):
        n = self.N.new('ShaderNodeSeparateXYZ'); self.put(n.inputs[0], vec)
        return n.outputs['X'], n.outputs['Y'], n.outputs['Z']

    def xyz(self, x, y, z=0.0):
        n = self.N.new('ShaderNodeCombineXYZ')
        for i, c in enumerate((x, y, z)): self.put(n.inputs[i], c)
        return n.outputs[0]

    def ramp(self, fac, stops):
        n = self.N.new('ShaderNodeValToRGB'); self.put(n.inputs['Fac'], fac)
        el = n.color_ramp.elements
        while len(el) < len(stops): el.new(0.5)
        for e, (pos, col) in zip(el, stops): e.position = pos; e.color = col
        return n.outputs['Color']

    def mixc(self, fac, a, b):
        n = self.N.new('ShaderNodeMix'); n.data_type = 'RGBA'; n.clamp_factor = True
        self.put(n.inputs[0], fac)
        self.put([s for s in n.inputs if s.name == 'A' and s.type == 'RGBA'][0], a)
        self.put([s for s in n.inputs if s.name == 'B' and s.type == 'RGBA'][0], b)
        return [s for s in n.outputs if s.type == 'RGBA'][0]


WHITE = (0.92, 0.955, 1.0, 1)


def ice_common(g, ob, frost_fn, stops, crack_scale, crack_amt):
    """Shared ice look: mottled cloudy frost, longitudinal grain, sparse cracks, fine frost crystals."""
    hada = g.noise(g.mapping(ob, (0.05, 1, 1)), 700, 5, 0.6)
    m1 = g.noise(ob, 45, 7, 0.66)
    m2 = g.noise(g.mapping(ob, (0.25, 1, 1)), 140, 5, 0.6)
    mottle = g.ss(0.36, 0.72, g.add(g.mul(m1, 0.65), g.mul(m2, 0.35)))
    grain = g.noise(ob, 2200, 3, 0.6)
    facets = g.vor(ob, 420, 'DISTANCE_TO_EDGE').outputs['Distance']
    cv = g.vor(g.mapping(ob, (0.55, 1, 1)), crack_scale, 'DISTANCE_TO_EDGE').outputs['Distance']
    crack = g.mul(g.mul(g.inv(g.ss(0.0, 0.035, cv)), g.ss(0.5, 0.62, g.noise(ob, 14, 3))), crack_amt)
    frost = g.clamp(g.add(frost_fn(mottle), g.mul(g.sub(hada, 0.5), 0.18)))
    color = g.ramp(frost, stops)
    color = g.mixc(g.mul(crack, 0.7), color, (0.86, 0.93, 1.0, 1))
    height = g.add(g.mul(frost, g.add(g.mul(grain, 0.6), g.mul(g.ss(0.0, 0.12, facets), 0.4))),
                   g.add(g.mul(crack, -0.6), g.mul(hada, 0.12)))
    return dict(frost=frost, crack=crack, color=color, height=height)


ICE_STOPS = [(0.0, (0.20, 0.40, 0.84, 1)), (0.38, (0.48, 0.68, 0.96, 1)), (0.86, (0.92, 0.96, 1.0, 1))]


def blade_graph(g):
    ob = g.tc.outputs['Object']
    u, v, _ = g.sep(g.tc.outputs['UV'])
    x = g.mul(u, L)
    across = g.m('ABSOLUTE', g.mul(g.sub(v, 0.5), 2.0))
    # hamon: irregular notare with clustered gunome, straight yakidashi at the habaki, wide boshi in the kissaki
    notare = g.noise(None, 1.0, 3.0, 0.55, w=g.mul(x, 7.0))
    jit = g.noise(None, 1.0, 2.0, 0.5, w=g.mul(x, 29.0))
    amp = g.noise(None, 1.0, 2.0, 0.5, w=g.add(g.mul(x, 23.0), 40.0))
    gun = g.m('POWER', g.mul(g.add(g.m('SINE', g.add(g.mul(x, 2 * pi / 0.019), g.mul(jit, 9.0))), 1.0), 0.5), 2.2)
    gun = g.mul(gun, g.clamp(g.sub(g.mul(amp, 1.8), 0.45)))
    wave = g.mul(g.add(g.mul(g.sub(notare, 0.5), 0.20), g.mul(gun, 0.09)), g.ss(0.0, 0.06, x))
    hb = g.add(g.add(0.17, wave), g.mul(g.ss(XK - 0.01, L - 0.004, x), 0.22))
    d = g.sub(across, hb)
    ha = g.inv(g.ss(-0.015, 0.015, d))
    nioi = g.gauss(d, 0.03)
    # ashi: fine frost streaks running from the hamon down toward the edge
    ashi = g.mul(g.ss(0.6, 0.74, g.noise(g.xyz(g.mul(x, 900.0), g.mul(across, 5.0)), 1.0, 2, 0.5)), g.gauss(g.add(d, 0.05), 0.05))
    nv = g.vor(ob, 2600)
    nie = g.mul(g.mul(g.ss(0.90, 0.97, nv.outputs['Color']), g.inv(g.ss(0.05, 0.35, nv.outputs['Distance']))),
                g.add(g.gauss(d, 0.05), g.mul(ha, 0.35)))
    clouds2 = g.noise(ob, 90, 5, 0.6)

    def frost_fn(mottle):
        f = g.add(0.08, g.mul(mottle, 0.40))
        f = g.add(f, g.mul(ha, g.add(0.36, g.mul(clouds2, 0.16))))
        f = g.add(f, g.add(g.mul(ashi, 0.3), g.mul(nioi, 0.26)))
        habaki = g.clamp(g.add(g.mul(g.sub(0.10, x), 9.0), g.mul(g.sub(g.noise(ob, 120, 4), 0.5), 1.4)))
        f = g.mx(f, g.mx(habaki, g.mul(g.ss(0.93, 0.995, across), 0.7)))
        return g.mul(f, g.add(0.45, g.mul(g.ss(0.004, 0.035, across), 0.55)))   # the very edge stays clear

    c = ice_common(g, ob, frost_fn, ICE_STOPS, 24, 1.0)
    color = g.mixc(nie, c['color'], (1, 1, 1, 1))
    trans = g.clamp(g.sub(0.92, g.add(g.mul(c['frost'], 0.74), g.mul(c['crack'], 0.2))))
    rough = g.clamp(g.sub(g.add(0.05, g.add(g.mul(c['frost'], 0.34), g.mul(c['crack'], 0.12))), g.mul(nie, 0.3)))
    return dict(color=color, trans=trans, rough=rough, frost=c['frost'], height=c['height'], bump=0.28)


def fittings_graph(g):
    ob = g.tc.outputs['Object']
    c = ice_common(g, ob, lambda mo: g.add(0.50, g.mul(mo, 0.42)), ICE_STOPS, 300, 0.8)
    trans = g.clamp(g.sub(0.72, g.mul(c['frost'], 0.62)))
    rough = g.clamp(g.add(0.05, g.add(g.mul(c['frost'], 0.4), g.mul(c['crack'], 0.1))))
    return dict(color=c['color'], trans=trans, rough=rough, frost=c['frost'], height=c['height'], bump=0.35)


def same_graph(g):
    ob = g.tc.outputs['Object']
    nv = g.vor(ob, 1500)
    nod = g.inv(g.ss(0.12, 0.5, nv.outputs['Distance']))
    big = g.mul(g.ss(0.93, 0.99, nv.outputs['Color']), nod)
    grain = g.noise(ob, 2600, 3)
    color = g.mixc(g.add(g.mul(nod, 0.85), 0.05), (0.16, 0.27, 0.52, 1), (0.74, 0.83, 0.96, 1))
    rough = g.clamp(g.sub(0.5, g.mul(nod, 0.18)))
    height = g.add(g.add(g.mul(nod, 0.75), g.mul(big, 0.4)), g.mul(grain, 0.15))
    return dict(color=color, trans=0.0, rough=rough, frost=nod, height=height, bump=0.9)


def ito_graph(g):
    ob = g.tc.outputs['Object']
    u, v, _ = g.sep(g.tc.outputs['UV'])
    along = g.mul(u, sum(ITO_LEN) / 2)
    w = g.m('FRACT', g.mul(g.sub(v, 0.01), 2.0))
    w = g.clamp(g.mul(w, 1 / 0.96))
    across_m = g.mul(w, 0.011)
    twill = g.mul(g.add(g.m('SINE', g.mul(g.add(along, across_m), 2 * pi / 0.0011)), 1.0), 0.5)
    fibres = g.noise(g.mapping(ob, (1, 1, 1)), 3000, 2)
    roll = g.mul(g.ss(0.0, 0.14, w), g.ss(0.0, 0.14, g.sub(1.0, w)))
    frost = g.clamp(g.mul(g.ss(0.5, 0.75, g.noise(ob, 160, 5)), 0.8))
    base = g.mixc(g.add(g.mul(roll, 0.6), g.mul(twill, 0.25)), (0.58, 0.64, 0.74, 1), (0.90, 0.93, 0.97, 1))
    color = g.mixc(frost, base, (0.97, 0.99, 1.0, 1))
    rough = g.clamp(g.add(0.5, g.sub(g.mul(twill, 0.12), g.mul(frost, 0.15))))
    height = g.add(g.add(g.mul(twill, 0.45), g.mul(fibres, 0.25)), g.mul(roll, 0.7))
    return dict(color=color, trans=0.0, rough=rough, frost=frost, height=height, bump=0.6)


def core_graph(g):
    ob = g.tc.outputs['Object']
    wisps = g.ss(0.46, 0.64, g.noise(g.mapping(ob, (0.3, 1, 1)), 70, 7, 0.66))
    wisps = g.mx(wisps, g.mul(g.ss(0.5, 0.7, g.noise(ob, 22, 5, 0.6)), 0.6))     # broad milky clouds
    cv = g.vor(ob, 20, 'DISTANCE_TO_EDGE').outputs['Distance']
    sheets = g.mul(g.inv(g.ss(0.0, 0.05, cv)), g.ss(0.45, 0.6, g.noise(ob, 9, 3)))
    bv = g.vor(g.mapping(ob, (0.14, 1, 1)), 700)
    bubbles = g.mul(g.ss(0.86, 0.9, bv.outputs['Color']), g.inv(g.ss(0.1, 0.25, bv.outputs['Distance'])))
    mask = g.clamp(g.add(g.add(g.mul(wisps, 0.9), sheets), bubbles))
    color = g.mixc(mask, (0, 0, 0, 1), (0.82, 0.9, 1.0, 1))
    return dict(color=color, trans=1.0, rough=0.0, frost=mask, height=0.0, bump=0.0)


# ---------------------------------------------------------------- bake
def to_srgb(c):
    return np.where(c <= 0.0031308, 12.92 * c, 1.055 * np.power(np.clip(c, 0, None), 1 / 2.4) - 0.055)


def save_png(name, rgb):
    h, w = rgb.shape[:2]
    im = bpy.data.images.new(name, w, h, alpha=False)
    im.colorspace_settings.name = 'Non-Color'
    a = np.ones((h, w, 4), np.float32); a[..., :3] = np.clip(rgb, 0, 1)
    im.pixels.foreach_set(a.ravel())
    im.filepath_raw = os.path.join(OUT, name + '.png'); im.file_format = 'PNG'; im.save()


def bake(ob, graph, size, name, maps=('col', 'mat', 'nrm')):
    if FAST: size = (size[0] // 2, size[1] // 2)
    mat = bpy.data.materials.new(name + '_bake')
    try: mat.use_nodes = True
    except Exception: pass
    N = mat.node_tree.nodes; Lk = mat.node_tree.links
    N.clear()
    out = N.new('ShaderNodeOutputMaterial')
    g = NG(mat)
    socks = graph(g)
    emit = N.new('ShaderNodeEmission'); bsdf = N.new('ShaderNodeBsdfPrincipled')
    img_node = N.new('ShaderNodeTexImage'); N.active = img_node
    ob.data.materials.clear(); ob.data.materials.append(mat)
    select(ob)
    w, h = size

    def run(kind, sock):
        img = bpy.data.images.new('%s_%s' % (name, kind), w, h, alpha=False, float_buffer=True)
        img.colorspace_settings.name = 'Non-Color'
        img_node.image = img
        for l in list(out.inputs['Surface'].links): Lk.remove(l)
        if kind == 'nrm':
            if socks['bump']:
                bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = socks['bump']
                bump.inputs['Distance'].default_value = 0.0004
                g.put(bump.inputs['Height'], socks['height'])
                Lk.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
            Lk.new(bsdf.outputs[0], out.inputs['Surface'])
            bpy.ops.object.bake(type='NORMAL', normal_space='TANGENT')
        else:
            g.put(emit.inputs['Color'], sock if not isinstance(sock, (int, float)) else (sock, sock, sock, 1))
            Lk.new(emit.outputs[0], out.inputs['Surface'])
            bpy.ops.object.bake(type='EMIT')
        a = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(a)
        return a.reshape(h, w, 4)[..., :3]

    col = run('c', socks['color'])
    save_png(name + '_col', to_srgb(col))
    if 'mat' in maps:
        r = run('t', socks['trans'])[..., 0]; gch = run('r', socks['rough'])[..., 0]; b = run('f', socks['frost'])[..., 0]
        save_png(name + '_mat', np.stack([r, gch, b], -1))
    if 'nrm' in maps:
        save_png(name + '_nrm', run('nrm', None))
    print('baked', name, size)


# ---------------------------------------------------------------- build, bake, export
parts = [
    (make_blade, blade_graph, (4096, 512), ('col', 'mat', 'nrm')),
    (make_core, core_graph, (2048, 256), ('col',)),
    (make_fittings, fittings_graph, (1536, 1536), ('col', 'mat', 'nrm')),
    (make_same, same_graph, (1024, 512), ('col', 'mat', 'nrm')),
    (make_ito, ito_graph, (2048, 256), ('col', 'mat', 'nrm')),
]
objs = []
for build, graph, size, maps in parts:
    ob = build()
    print('built', ob.name, len(ob.data.vertices), 'verts')
    bake(ob, graph, size, ob.name, maps)
    ob.data.materials.clear()
    objs.append(ob)

bpy.ops.object.select_all(action='DESELECT')
for o in objs: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'katana.glb'), export_format='GLB', use_selection=True,
                          export_materials='NONE', export_texcoords=True, export_normals=True)
print('exported', os.path.getsize(os.path.join(OUT, 'katana.glb')), 'bytes')
