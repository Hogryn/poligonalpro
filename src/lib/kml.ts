export const PRO_MODE = false;
export const FREE_STEP_MIN = 10.0;
export const FREE_STEP_MAX = 15.0;
export const FREE_WATERMARK = "AVALIACAO";

export function getFactors(lat: number) {
  const rad = lat * Math.PI / 180;
  return [111132.92 - 559.82 * Math.cos(2 * rad), 111412.84 * Math.cos(rad)];
}

export function arePointsClose(p1: number[], p2: number[], epsilon = 1e-7) {
  return Math.abs(p1[0] - p2[0]) < epsilon && Math.abs(p1[1] - p2[1]) < epsilon;
}

export function crossProduct(o: number[], a: number[], b: number[]) {
  return (a[1] - o[1]) * (b[0] - o[0]) - (a[0] - o[0]) * (b[1] - o[1]);
}

export function ensureClockwise(points: number[][]) {
  let area = 0.0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    area += (p2[1] - p1[1]) * (p2[0] + p1[0]);
  }
  if (area < 0) points.reverse();
  return points;
}

export function generateSteps(p1: number[], p2: number[], stepMeters: number, wantInside: boolean) {
  const [lat1, lon1] = p1;
  const [lat2, lon2] = p2;
  const [mLat, mLon] = getFactors((lat1 + lat2) / 2);
  const dlatM = Math.abs(lat2 - lat1) * mLat;
  const dlonM = Math.abs(lon2 - lon1) * mLon;
  const totalDist = Math.hypot(dlatM, dlonM);
  const crossDist = Math.min(dlatM, dlonM);
  const mainDist = Math.max(dlatM, dlonM);

  if (crossDist < mainDist * 0.05 && totalDist > stepMeters) {
    const mainIsLat = dlatM >= dlonM;
    const numSteps = Math.max(1, Math.ceil(mainDist / stepMeters));
    const points = [p1];
    if (mainIsLat) {
      const inc = (lat2 - lat1) / numSteps;
      for (let i = 1; i <= numSteps; i++) points.push([lat1 + inc * i, lon1]);
      if (Math.abs(lon2 - lon1) > 1e-10) points.push([lat2, lon2]);
    } else {
      const inc = (lon2 - lon1) / numSteps;
      for (let i = 1; i <= numSteps; i++) points.push([lat1, lon1 + inc * i]);
      if (Math.abs(lat2 - lat1) > 1e-10) points.push([lat2, lon2]);
    }
    return points;
  }

  const numSteps = Math.max(1, Math.ceil(totalDist / stepMeters));
  const incLat = (lat2 - lat1) / numSteps;
  const incLon = (lon2 - lon1) / numSteps;
  const points = [p1];
  let currLat = lat1, currLon = lon1;

  for (let i = 0; i < numSteps; i++) {
    const tLat = currLat + incLat;
    const tLon = currLon + incLon;
    const cornerA = [tLat, currLon];
    const cp = crossProduct(p1, p2, cornerA);
    const isInside = cp < 0;
    const pickA = wantInside ? isInside : !isInside;

    if (pickA) {
      points.push(cornerA);
      points.push([tLat, tLon]);
    } else {
      points.push([currLat, tLon]);
      points.push([tLat, tLon]);
    }
    currLat = tLat;
    currLon = tLon;
  }
  return points;
}

export function fixForaCorners(points: number[][], originalCorners: number[][], epsilon = 1e-7) {
  if (points.length < 3) return points;
  const cornerSet = new Set(originalCorners.map(c => `${c[0].toFixed(7)},${c[1].toFixed(7)}`));
  const result = [...points];

  for (let i = 1; i < result.length - 1; i++) {
    const B = result[i];
    const bKey = `${B[0].toFixed(7)},${B[1].toFixed(7)}`;
    if (!cornerSet.has(bKey)) continue;

    const A = result[i - 1];
    const C = result[i + 1];

    if (Math.abs(A[1] - B[1]) < epsilon && Math.abs(B[0] - C[0]) < epsilon) {
      result[i] = [A[0], C[1]];
      continue;
    }
    if (Math.abs(A[0] - B[0]) < epsilon && Math.abs(B[1] - C[1]) < epsilon) {
      result[i] = [C[0], A[1]];
      continue;
    }
  }
  return result;
}

function lineIntersect(p1: number[], p2: number[], p3: number[], p4: number[]) {
  const d1 = [p2[0] - p1[0], p2[1] - p1[1]];
  const d2 = [p4[0] - p3[0], p4[1] - p3[1]];
  const cross = d1[0] * d2[1] - d1[1] * d2[0];
  if (Math.abs(cross) < 1e-15) return null;
  const dp = [p3[0] - p1[0], p3[1] - p1[1]];
  const t = (dp[0] * d2[1] - dp[1] * d2[0]) / cross;
  return [p1[0] + t * d1[0], p1[1] + t * d1[1]];
}

export function offsetPolygonOutward(points: number[][], offsetMeters: number) {
  const closed = arePointsClose(points[0], points[points.length - 1], 1e-4);
  const pts = closed ? points.slice(0, -1) : [...points];
  const n = pts.length;
  if (n < 3) return points;

  const offsetLines: number[][][] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const [mLat, mLon] = getFactors((pts[i][0] + pts[j][0]) / 2);
    const dlat = pts[j][0] - pts[i][0];
    const dlon = pts[j][1] - pts[i][1];
    const dyM = dlat * mLat;
    const dxM = dlon * mLon;
    const L = Math.hypot(dxM, dyM);

    if (L < 1e-10) {
      offsetLines.push([pts[i], pts[j]]);
      continue;
    }

    const nxM = (-dyM / L) * offsetMeters;
    const nyM = (dxM / L) * offsetMeters;
    const dlatOff = nyM / mLat;
    const dlonOff = nxM / mLon;

    offsetLines.push([
      [pts[i][0] + dlatOff, pts[i][1] + dlonOff],
      [pts[j][0] + dlatOff, pts[j][1] + dlonOff]
    ]);
  }

  const newPts: number[][] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const p = lineIntersect(offsetLines[i][0], offsetLines[i][1], offsetLines[j][0], offsetLines[j][1]);
    if (p) newPts.push(p);
    else newPts.push(offsetLines[j][0]);
  }
  newPts.push(newPts[0]);
  return newPts;
}

export function pointInPolygon(point: number[], polygon: number[][]) {
  const x = point[1], y = point[0];
  const n = polygon.length;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0];
    const xj = polygon[j][1], yj = polygon[j][0];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function removeSpikes(points: number[][]) {
  let pts = [...points];
  for (let iter = 0; iter < 3; iter++) {
    if (pts.length < 4) break;
    const toRemove = new Array(pts.length).fill(false);
    let hasChange = false;
    const n = pts.length;
    for (let i = 0; i < n - 1; i++) {
      const curr = pts[i];
      const prev = pts[i === 0 ? n - 2 : i - 1];
      const nxt = pts[i + 1];
      const v1 = [curr[0] - prev[0], curr[1] - prev[1]];
      const v2 = [nxt[0] - curr[0], nxt[1] - curr[1]];
      const m1 = Math.hypot(v1[0], v1[1]);
      const m2 = Math.hypot(v2[0], v2[1]);
      if (m1 > 0 && m2 > 0) {
        if ((v1[0] * v2[0] + v1[1] * v2[1]) / (m1 * m2) < -0.99) {
          toRemove[i] = true;
          hasChange = true;
          if (i === 0) toRemove[n - 1] = true;
        }
      }
    }
    if (!hasChange) break;
    pts = pts.filter((_, i) => !toRemove[i]);
    if (pts.length > 0 && !arePointsClose(pts[0], pts[pts.length - 1])) {
      pts.push([...pts[0]]);
    }
  }
  return pts;
}

export function removeSelfIntersections(points: number[][]) {
  let pts = [...points];
  for (let iter = 0; iter < 10; iter++) {
    const n = pts.length;
    if (n < 5) break;

    const hList: any[] = [];
    const vList: any[] = [];
    for (let i = 0; i < n - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (Math.abs(a[0] - b[0]) < 1e-10 && Math.abs(a[1] - b[1]) > 1e-10) {
        const [lo, hi] = a[1] < b[1] ? [a[1], b[1]] : [b[1], a[1]];
        hList.push({ lat: a[0], lo, hi, idx: i });
      } else if (Math.abs(a[1] - b[1]) < 1e-10 && Math.abs(a[0] - b[0]) > 1e-10) {
        const [lo, hi] = a[0] < b[0] ? [a[0], b[0]] : [b[0], a[0]];
        vList.push({ lon: a[1], lo, hi, idx: i });
      }
    }

    hList.sort((a, b) => a.lat - b.lat);
    let best: any = null;

    for (const v of vList) {
      for (const h of hList) {
        if (h.lo < v.lon && v.lon < h.hi && v.lo < h.lat && h.lat < v.hi) {
          const i = Math.min(h.idx, v.idx);
          const j = Math.max(h.idx, v.idx);
          if (j - i < 2) continue;
          if (i === 0 && j === n - 2) continue;
          const span = j - i;
          if (!best || span < best.span) {
            best = { span, i, j, lat: h.lat, lon: v.lon };
          }
        }
      }
    }

    if (!best) break;
    pts = [
      ...pts.slice(0, best.i + 1),
      [best.lat, best.lon],
      ...pts.slice(best.j + 1)
    ];
    if (pts.length > 0 && !arePointsClose(pts[0], pts[pts.length - 1])) {
      pts.push([...pts[0]]);
    }
  }
  return pts;
}

export function cleanCollinear(points: number[][]) {
  if (points.length < 3) return points;
  const clean = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = clean[clean.length - 1];
    const curr = points[i];
    const nxt = points[i + 1];
    const sl = arePointsClose([prev[0], 0], [curr[0], 0]) && arePointsClose([curr[0], 0], [nxt[0], 0]);
    const slo = arePointsClose([0, prev[1]], [0, curr[1]]) && arePointsClose([0, curr[1]], [0, nxt[1]]);
    if (!(sl || slo)) clean.push(curr);
  }
  clean.push(points[points.length - 1]);
  return clean;
}

export function fixCornerIntersection(points: number[][]) {
  if (points.length < 4 || !arePointsClose(points[0], points[points.length - 1], 1e-4)) return points;
  const p0 = points[0], p1 = points[1], pL = points[points.length - 1], pLp = points[points.length - 2];
  const sv = Math.abs(p1[1] - p0[1]) < Math.abs(p1[0] - p0[0]);
  const ev = Math.abs(pL[0] - pLp[0]) > Math.abs(pL[1] - pLp[1]);
  let nl: number[];
  if (sv && !ev) nl = [pL[0], p0[1]];
  else if (!sv && ev) nl = [p0[0], pL[1]];
  else return points;
  points[0] = nl;
  points[points.length - 1] = nl;
  return points;
}

export function collapseJogs(points: number[][], threshold = 1.0) {
  if (threshold <= 0.001) return points;
  let pts = [...points];
  for (let iter = 0; iter < 5; iter++) {
    let changed = false;
    if (pts.length < 5) break;
    const currPts = [...pts];
    for (let i = 0; i < currPts.length - 1; i++) {
      const p1 = currPts[i], p2 = currPts[i + 1];
      const [mLat, mLon] = getFactors(p1[0]);
      const dist = Math.hypot((p2[0] - p1[0]) * mLat, (p2[1] - p1[1]) * mLon);
      if (dist > 0 && dist < threshold) {
        const prev = currPts[i > 0 ? i - 1 : currPts.length - 2];
        const nxt = currPts[i < currPts.length - 2 ? i + 2 : 1];
        const vPrev = [p1[0] - prev[0], p1[1] - prev[1]];
        const vNext = [nxt[0] - p2[0], nxt[1] - p2[1]];
        const prevVert = Math.abs(vPrev[0]) > Math.abs(vPrev[1]);
        const nextVert = Math.abs(vNext[0]) > Math.abs(vNext[1]);

        if (prevVert === nextVert) {
          if (prevVert) {
            currPts[i + 1] = [currPts[i + 1][0], p1[1]];
            currPts[i < currPts.length - 2 ? i + 2 : 1] = [nxt[0], p1[1]];
          } else {
            currPts[i + 1] = [p1[0], currPts[i + 1][1]];
            currPts[i < currPts.length - 2 ? i + 2 : 1] = [p1[0], nxt[1]];
          }
          if (i + 1 === currPts.length - 1) currPts[0] = currPts[currPts.length - 1];
          changed = true;
          break;
        }
      }
    }
    if (changed) pts = cleanCollinear(currPts);
    else break;
  }
  return pts;
}

export function processKmlLogic(
  kmlText: string,
  outputName: string,
  positionMode: string,
  stepVal: number,
  useRobustFora: boolean,
  robustOffset: number,
  thresholdVal: number
) {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlText, "text/xml");
    const coordinatesNodes = xmlDoc.getElementsByTagName("coordinates");

    if (coordinatesNodes.length === 0) {
      return { error: "KML sem coordenadas." };
    }

    let finalPointsTotal: number[][] = [];
    let violationsTotal = -1;
    const wantInside = positionMode.includes("DENTRO");

    for (let i = 0; i < coordinatesNodes.length; i++) {
      const node = coordinatesNodes[i];
      const raw = node.textContent?.trim();
      if (!raw) continue;

      const inPts: number[][] = [];
      const pairs = raw.split(/\s+/);
      for (const p of pairs) {
        const parts = p.split(',');
        if (parts.length >= 2) {
          inPts.push([parseFloat(parts[1]), parseFloat(parts[0])]);
        }
      }
      if (inPts.length < 2) continue;

      const normPts = ensureClockwise(inPts);
      let violations = -1;
      let p: number[][] = [];

      if (useRobustFora && !wantInside) {
        let expanded = offsetPolygonOutward(normPts, robustOffset);
        expanded = ensureClockwise(expanded);

        const fullPath = [expanded[0]];
        for (let j = 0; j < expanded.length - 1; j++) {
          const chunk = generateSteps(expanded[j], expanded[j + 1], stepVal, true);
          fullPath.push(...chunk.slice(1));
        }

        if (arePointsClose(expanded[0], expanded[expanded.length - 1], 1e-4) &&
            !arePointsClose(fullPath[fullPath.length - 1], fullPath[0])) {
          fullPath.push(fullPath[0]);
        }

        p = removeSpikes(fullPath);
        p = fixCornerIntersection(p);
        p = cleanCollinear(p);
        p = collapseJogs(p, thresholdVal);
        p = removeSpikes(p);
        p = removeSelfIntersections(p);

        const origClosed = arePointsClose(normPts[0], normPts[normPts.length - 1], 1e-4)
          ? normPts : [...normPts, normPts[0]];
        violations = p.filter(pt => pointInPolygon(pt, origClosed)).length;

      } else {
        const fullPath = [normPts[0]];
        for (let j = 0; j < normPts.length - 1; j++) {
          const chunk = generateSteps(normPts[j], normPts[j + 1], stepVal, wantInside);
          fullPath.push(...chunk.slice(1));
        }

        if (arePointsClose(normPts[0], normPts[normPts.length - 1], 1e-4) &&
            !arePointsClose(fullPath[fullPath.length - 1], fullPath[0])) {
          fullPath.push(fullPath[0]);
        }

        p = removeSpikes(fullPath);
        p = fixCornerIntersection(p);
        p = cleanCollinear(p);
        p = collapseJogs(p, thresholdVal);
        p = removeSpikes(p);

        if (!wantInside) {
          p = fixForaCorners(p, normPts);
        }

        p = removeSpikes(p);
        p = removeSelfIntersections(p);
      }

      finalPointsTotal = p;
      violationsTotal = violations;

      node.textContent = p.map(pt => `${pt[1].toFixed(10)},${pt[0].toFixed(10)},0`).join(" ");
    }

    const nameNodes = xmlDoc.getElementsByTagName("name");
    for (let i = 0; i < nameNodes.length; i++) {
      nameNodes[i].textContent = outputName;
    }

    const serializer = new XMLSerializer();
    const kmlOutput = serializer.serializeToString(xmlDoc);

    const csvData = "Longitude,Latitude\n" + finalPointsTotal.map(pt => `${pt[1].toFixed(12)},${pt[0].toFixed(12)}`).join("\n");

    return {
      kml: kmlOutput,
      csv: csvData,
      count: finalPointsTotal.length,
      violations: violationsTotal
    };

  } catch (e: any) {
    return { error: e.message };
  }
}
