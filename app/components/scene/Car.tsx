/*
 * Original rear-view silhouette drawn for this site (no brand, no real model).
 * Right half is authored as points (x >= 500) and mirrored around x = 500.
 */

type Point = readonly [number, number];

const W = 1000;

const BODY_RIGHT: Point[] = [
  [500, 70],
  [560, 72],
  [604, 82],
  [640, 118],
  [668, 162],
  [702, 180],
  [770, 168],
  [836, 160],
  [886, 172],
  [922, 200],
  [944, 236],
  [948, 268],
  [938, 296],
  [912, 316],
  [860, 326],
  [700, 330],
  [500, 332],
];

const GLASS_RIGHT: Point[] = [
  [500, 84],
  [584, 87],
  [614, 106],
  [640, 152],
  [500, 154],
];

const LIGHT_RIGHT: Point[] = [
  [500, 236],
  [650, 237],
  [800, 242],
  [890, 252],
  [930, 266],
];

const mirror = (points: Point[]): Point[] =>
  points.map(([x, y]) => [W - x, y] as const).reverse();

/** Closed outline: right half top→bottom, then the mirrored left half bottom→top. */
const closed = (right: Point[]) => [...right, ...mirror(right).slice(1, -1)];

/** Open polyline left→right through the centre. */
const across = (right: Point[]) => [...mirror(right), ...right.slice(1)];

/** Catmull-Rom spline through `points`, as cubic Béziers. */
function smoothPath(points: Point[], close: boolean): string {
  const n = points.length;
  const at = (i: number) =>
    close ? points[(i + n) % n] : points[Math.min(Math.max(i, 0), n - 1)];
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(points[0][0])} ${f(points[0][1])}`;
  const segments = close ? n : n - 1;
  for (let i = 0; i < segments; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return close ? `${d} Z` : d;
}

const BODY = smoothPath(closed(BODY_RIGHT), true);
const GLASS = smoothPath(closed(GLASS_RIGHT), true);
const LIGHT = smoothPath(across(LIGHT_RIGHT), false);
// Rim light: the upper contour from haunch to haunch.
const RIM = smoothPath(across(BODY_RIGHT.slice(0, 12)), false);
const TIRES = [92, 794];
const SLATS = Array.from({ length: 6 }, (_, i) => 100 + i * 9);
const FINS = Array.from({ length: 9 }, (_, i) => 420 + i * 20);

export default function Car() {
  return (
    <svg className="car" viewBox="0 0 1000 400" aria-hidden="true">
      <defs>
        <linearGradient id="car-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a1b1e" />
          <stop offset="0.45" stopColor="#0d0d0f" />
          <stop offset="1" stopColor="#040405" />
        </linearGradient>
        <linearGradient id="car-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2c30" />
          <stop offset="1" stopColor="#08080a" />
        </linearGradient>
        <linearGradient id="car-rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.15" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.15" />
        </linearGradient>
        <radialGradient id="car-red" cx="0.5" cy="0.56" r="0.5">
          <stop offset="0" stopColor="#ff2d2d" stopOpacity="0.4" />
          <stop offset="1" stopColor="#ff2d2d" stopOpacity="0" />
        </radialGradient>
        <filter id="car-blur-s" x="-10%" y="-50%" width="120%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id="car-blur-l" x="-20%" y="-300%" width="140%" height="700%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <clipPath id="car-clip">
          <path d={BODY} />
        </clipPath>
        <clipPath id="car-glass-clip">
          <path d={GLASS} />
        </clipPath>
      </defs>

      <ellipse cx="500" cy="392" rx="470" ry="12" fill="#000" filter="url(#car-blur-s)" />
      {TIRES.map((x) => (
        <rect key={x} x={x} y="286" width="114" height="106" rx="22" fill="#050506" />
      ))}

      <path d={BODY} fill="url(#car-body)" />
      <g clipPath="url(#car-clip)">
        <rect className="car-red-wash" x="0" y="120" width="1000" height="230" fill="url(#car-red)" />
        <path d="M150 300 H850" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1.5" />
        <rect x="380" y="300" width="240" height="40" rx="4" fill="#030303" />
        {FINS.map((x) => (
          <path key={x} d={`M${x} 302 V338`} stroke="#ffffff" strokeOpacity="0.07" />
        ))}
      </g>

      <path d={GLASS} fill="url(#car-glass)" />
      <g clipPath="url(#car-glass-clip)" stroke="#000" strokeWidth="4">
        {SLATS.map((y) => (
          <path key={y} d={`M380 ${y} H620`} />
        ))}
      </g>

      <path d={RIM} fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="8" filter="url(#car-blur-s)" />
      <path d={RIM} fill="none" stroke="url(#car-rim)" strokeWidth="1.6" />

      <g className="car-light">
        <path d={LIGHT} fill="none" stroke="#ff2d2d" strokeWidth="26" strokeOpacity="0.35" filter="url(#car-blur-l)" />
        <path d={LIGHT} fill="none" stroke="#ff3b3b" strokeWidth="7" strokeOpacity="0.8" filter="url(#car-blur-s)" />
        <path d={LIGHT} fill="none" stroke="#ffd7d2" strokeWidth="2.2" strokeLinecap="round" />
      </g>
    </svg>
  );
}
