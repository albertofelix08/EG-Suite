/**
 * Cut Solid Geometry — Unit III & IV
 * Engineering Graphics Suite
 * Alberto Felix & Aaron Mcgeo | CSE-A(I)
 *
 * FIXED v4:
 *   - Angular sort axes now match the 2D projection axes used in trueShape.js
 *     (u = X, v = −Z·cosθ + (Y−cutPos)·sinθ) so the point ordering is
 *     consistent with the canvas drawing, preventing self-intersecting outlines
 *     on oblique cuts through prisms and pyramids.
 *   - triangulatePolygon now picks the two axes with the greatest spread
 *     rather than always preferring X/Z, making it robust to any cut
 *     orientation including edge-on cases.
 *
 * FIXED v3: Cutting plane is transformed into LOCAL SPACE of masterGroup
 * before any clipping occurs. This ensures the cut works correctly for
 * BOTH base-on-HP and base-on-VP modes.
 *
 * Strategy:
 *   - The solid geometry always lives in masterGroup LOCAL space, built
 *     with base at Y=0 and apex/top at Y=solidH.
 *   - The cut is specified by the user in the solid's NATURAL coordinate
 *     frame (cutPos = height along Y, cutAngle = tilt in YZ plane).
 *   - Since geometry is stored in local space and we want to clip in that
 *     same space, we build a THREE.Plane directly in local space using the
 *     natural-frame plane equation: normal=(0,1,tan θ), d=cutPos.
 *   - This works identically for HP and VP because the geometry itself
 *     never changes — only masterGroup's world transform changes.
 *
 * Section points are computed in local space, then transformed to world
 * space via masterGroup.matrixWorld for trueShape display.
 */

import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════
// CLIP TRIANGLE AGAINST PLANE
// ═══════════════════════════════════════════════════════════════════

function clipTriangle(verts, outIdx, tri, vals, keepBelow) {
    const keep = keepBelow ? (v => v <= 0) : (v => v > 0);
    const ins = [], out = [];
    for (let i = 0; i < 3; i++) {
        if (keep(vals[i])) ins.push(i);
        else out.push(i);
    }

    if (ins.length === 0) return;
    if (ins.length === 3) {
        outIdx.push(tri[0], tri[1], tri[2]);
        return;
    }

    const lerp3 = (pA, pB, t) => [
        pA[0] + t * (pB[0] - pA[0]),
        pA[1] + t * (pB[1] - pA[1]),
        pA[2] + t * (pB[2] - pA[2]),
    ];

    if (ins.length === 1) {
        const a = ins[0], b = out[0], c = out[1];
        const pA = verts[tri[a]], pB = verts[tri[b]], pC = verts[tri[c]];
        const tAB = vals[a] / (vals[a] - vals[b]);
        const tAC = vals[a] / (vals[a] - vals[c]);
        const iAB = verts.length; verts.push(lerp3(pA, pB, tAB));
        const iAC = verts.length; verts.push(lerp3(pA, pC, tAC));
        outIdx.push(tri[a], iAB, iAC);
    } else {
        const a = ins[0], b = ins[1], c = out[0];
        const pA = verts[tri[a]], pB = verts[tri[b]], pC = verts[tri[c]];
        const tAC = vals[a] / (vals[a] - vals[c]);
        const tBC = vals[b] / (vals[b] - vals[c]);
        const iAC = verts.length; verts.push(lerp3(pA, pC, tAC));
        const iBC = verts.length; verts.push(lerp3(pB, pC, tBC));
        outIdx.push(tri[a], tri[b], iBC);
        outIdx.push(tri[a], iBC, iAC);
    }
}

// ═══════════════════════════════════════════════════════════════════
// LOCAL-SPACE CUTTING PLANE
//
// The solid is always built with base at Y=0, top at Y=solidH.
// The user-specified cut lives in this natural frame:
//   - cutPos  : height along Y where the plane passes
//   - cutAngle: tilt angle θ in the YZ plane (0° = horizontal)
//
// Plane equation in natural/local space:
//   Y + Z·tan(θ) = cutPos
//   → normal = normalize(0, 1, tan θ)
//   → point on plane = (0, cutPos, 0)
//
// We return a THREE.Plane in masterGroup LOCAL SPACE.
// This is correct for BOTH HP (no Stage-1 rotation applied to geometry)
// and VP (geometry is the same, only masterGroup's world matrix differs).
// ═══════════════════════════════════════════════════════════════════

function getLocalCuttingPlane(state) {
    const tR  = -(state.cutAngle * Math.PI) / 180;  // negate to match preview
    const tanT = Math.tan(tR);
    const normal = new THREE.Vector3(tanT, 1, 0).normalize();
    const point  = new THREE.Vector3(0, state.cutPos, 0);
    return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, point);
}

// ═══════════════════════════════════════════════════════════════════
// SECTION POINTS  (local space → world space for true shape)
//
// FIX v4: The angular sort now uses the same 2D projection axes as
// trueShape.js so the vertex ordering is identical in both files.
//
// trueShape.js draws the section using:
//   u = x  (the world/local X axis — horizontal spread)
//   v = −z·cosθ + (y − cutPos)·sinθ  (in-plane vertical component)
//
// The old sort used u=z which was inconsistent with u=x in the renderer,
// producing self-intersecting outlines for oblique cuts on non-circular
// solids. Using matching axes ensures angular sort → drawing order matches.
// ═══════════════════════════════════════════════════════════════════

export function computeSectionPoints(state) {
    state.sectionPts      = [];
    state._localSectionPts = [];

    if (!state.solidData || !state.solidGeo || !state.masterGroup) return;

    const localPlane = getLocalCuttingPlane(state);
    const posArr = state.solidGeo.getAttribute('position').array;
    const idxArr = state.solidGeo.getIndex().array;

    // Collect unique edges from the index buffer
    const edgeSet = new Set();
    for (let i = 0; i < idxArr.length; i += 3) {
        const a = idxArr[i], b = idxArr[i + 1], c = idxArr[i + 2];
        [[a, b], [b, c], [c, a]].forEach(([p, q]) => {
            edgeSet.add(Math.min(p, q) + ',' + Math.max(p, q));
        });
    }

    function localPt(idx) {
        return new THREE.Vector3(
            posArr[idx * 3],
            posArr[idx * 3 + 1],
            posArr[idx * 3 + 2]
        );
    }

    // Find intersections of each edge with the local cutting plane
    const localPts = [];
    edgeSet.forEach(key => {
        const [i1, i2] = key.split(',').map(Number);
        const p1 = localPt(i1), p2 = localPt(i2);
        const f1 = localPlane.distanceToPoint(p1);
        const f2 = localPlane.distanceToPoint(p2);

        if (f1 * f2 < 0) {
            const t = f1 / (f1 - f2);
            localPts.push(new THREE.Vector3(
                p1.x + t * (p2.x - p1.x),
                p1.y + t * (p2.y - p1.y),
                p1.z + t * (p2.z - p1.z)
            ));
        }
    });

    // Deduplicate (points closer than 0.1 mm are treated as identical)
    const uniq = [];
    localPts.forEach(p => {
        if (!uniq.some(u => p.distanceTo(u) < 0.1)) uniq.push(p);
    });

    if (uniq.length < 3) return;

    // ── Angular sort ──
    // Use the same 2D axes as trueShape.js so the point ordering produced
    // here is identical to the drawing order used when rendering the outline.
    //
    //   u = x   (matches trueShape proj2d u = x)
    //   v = −z·cosθ + (y − cutPos)·sinθ   (matches trueShape proj2d v)
    //
    // Previously u was set to p.z, which disagreed with the renderer and
    // caused self-intersecting polygons on oblique prism/pyramid cuts.
    const tR   = (state.cutAngle * Math.PI) / 180;
    const cosT = Math.cos(tR), sinT = Math.sin(tR);

    const projected = uniq.map(p => ({
        pt: [p.x, p.y, p.z],
        u:  p.x,                                            // FIX: was p.z
        v: -p.z * cosT + (p.y - state.cutPos) * sinT,      // FIX: was -p.x·cosT + …
    }));

    const cu = projected.reduce((s, p) => s + p.u, 0) / projected.length;
    const cv = projected.reduce((s, p) => s + p.v, 0) / projected.length;
    projected.sort((a, b) =>
        Math.atan2(a.v - cv, a.u - cu) - Math.atan2(b.v - cv, b.u - cu)
    );

    state._localSectionPts = projected.map(p => p.pt);

    // Transform each local-space point to world space for true-shape rendering
    state.masterGroup.updateMatrixWorld(true);
    const mat = state.masterGroup.matrixWorld;
    state.sectionPts = state._localSectionPts.map(([x, y, z]) => {
        const v = new THREE.Vector3(x, y, z).applyMatrix4(mat);
        return [v.x, v.y, v.z];
    });
}

// ═══════════════════════════════════════════════════════════════════
// APPLY CUT  (clip geometry in local space)
// ═══════════════════════════════════════════════════════════════════

export function applyCutVisual(state) {
    // Clear previous cut meshes
    while (state.solidGroup.children.length) {
        state.solidGroup.remove(state.solidGroup.children[0]);
    }
    clearCutMeshes(state);

    if (!state.solidGeo) return;

    const localPlane = getLocalCuttingPlane(state);
    const posArr = state.solidGeo.getAttribute('position').array;
    const idxArr = state.solidGeo.getIndex().array;

    // Copy local-space vertices into a mutable array for clipping
    const verts = [];
    for (let i = 0; i < posArr.length; i += 3) {
        verts.push([posArr[i], posArr[i + 1], posArr[i + 2]]);
    }

    // Evaluate each vertex: distanceToPoint < 0 means "below" the plane
    // (on the base side). We keep the "below" half.
    const clippedIdx = [];
    const tmpV = new THREE.Vector3();
    for (let i = 0; i < idxArr.length; i += 3) {
        const tri  = [idxArr[i], idxArr[i + 1], idxArr[i + 2]];
        const vals = tri.map(k => {
            tmpV.set(verts[k][0], verts[k][1], verts[k][2]);
            return localPlane.distanceToPoint(tmpV);
        });
        clipTriangle(verts, clippedIdx, tri, vals, true);
    }

    if (clippedIdx.length === 0) {
        console.warn('[cutSolid] Cut produced no geometry — cutPos may be outside the solid.');
        return;
    }

    // Build clipped BufferGeometry
    const flatVerts = [];
    verts.forEach(v => flatVerts.push(...v));

    const cGeo = new THREE.BufferGeometry();
    cGeo.setAttribute('position', new THREE.Float32BufferAttribute(flatVerts, 3));
    cGeo.setIndex(clippedIdx);
    cGeo.computeVertexNormals();

    // ── Solid mesh ──
    const meshSolid = new THREE.Mesh(
        cGeo,
        new THREE.MeshPhongMaterial({
            color: 0xf97316,
            flatShading: true,
            side: THREE.DoubleSide,
        })
    );
    meshSolid.castShadow    = true;
    meshSolid.receiveShadow = true;

    // ── Wireframe ──
    const meshEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(cGeo, 15),
        new THREE.LineBasicMaterial({ color: 0x000000 })
    );

    state._cutMeshes = state._cutMeshes || [];
    state._cutMeshes.push(meshSolid, meshEdges);
    state.solidGroup.add(meshSolid);
    state.solidGroup.add(meshEdges);

    // ── Section face cap (red) ──
    // Uses ear-clipping triangulation so concave polygons (e.g. oblique
    // cuts through prisms) are filled correctly, not just a fan from v0.
    if (state._localSectionPts && state._localSectionPts.length >= 3) {
        const capIndices = triangulatePolygon(state._localSectionPts);
        if (capIndices.length >= 3) {
            const sGeo = new THREE.BufferGeometry();
            const sv   = [];
            state._localSectionPts.forEach(p => sv.push(...p));
            sGeo.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3));
            sGeo.setIndex(capIndices);
            sGeo.computeVertexNormals();

            const meshSection = new THREE.Mesh(
                sGeo,
                new THREE.MeshPhongMaterial({
                    color:       0xef4444,
                    side:        THREE.DoubleSide,
                    flatShading: true,
                })
            );
            state._cutMeshes.push(meshSection);
            state.solidGroup.add(meshSection);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════════════

export function clearCutMeshes(state) {
    if (state._cutMeshes) {
        state._cutMeshes.forEach(m => {
            if (m.parent)    m.parent.remove(m);
            if (m.geometry)  m.geometry.dispose();
            if (m.material)  m.material.dispose();
        });
        state._cutMeshes = [];
    }
    // NOTE: _localSectionPts is intentionally NOT cleared here.
    // It is owned by computeSectionPoints() and must survive the
    // applyCutVisual() call that follows in applyCut(). Clearing
    // it here was causing True Shape to see an empty section right
    // after Apply Cut (because applyCutVisual calls clearCutMeshes
    // internally, nuking the points that computeSectionPoints just set).
    // _localSectionPts is now reset only at the top of computeSectionPoints().
}

// ═══════════════════════════════════════════════════════════════════
// EAR-CLIPPING POLYGON TRIANGULATION
//
// Takes an ordered array of 3D points that all lie on the same plane
// (our sorted section polygon) and returns a flat index array suitable
// for BufferGeometry.setIndex().
//
// Algorithm:
//   1. Project points onto the plane's dominant 2D axes (the two axes
//      with the greatest coordinate spread — robust to any orientation).
//   2. Ensure the winding is counter-clockwise (required by ear test).
//   3. Repeatedly find and clip "ears" until only one triangle remains.
//
// An "ear" is a vertex whose triangle with its two neighbours:
//   - Has no other polygon vertices inside it, AND
//   - Is convex (same winding as the overall polygon).
//
// This handles all convex AND concave section polygons correctly, and
// is robust to horizontal cuts (θ=0), VP orientation, and any case
// where the old X/Z-first heuristic would have chosen a degenerate axis.
// ═══════════════════════════════════════════════════════════════════

function triangulatePolygon(pts3d) {
    const n = pts3d.length;
    if (n < 3) return [];
    if (n === 3) return [0, 1, 2];

    // ── 1. Project onto 2D using the two axes with the greatest spread ──
    // Compute per-axis spread and pick the two largest. This avoids the
    // old fragile heuristic that always preferred X/Z and failed when the
    // polygon was edge-on to that plane (e.g. pure YZ slice, or VP mode
    // with a steep cut angle).
    const spreadX = Math.max(...pts3d.map(p => p[0])) - Math.min(...pts3d.map(p => p[0]));
    const spreadY = Math.max(...pts3d.map(p => p[1])) - Math.min(...pts3d.map(p => p[1]));
    const spreadZ = Math.max(...pts3d.map(p => p[2])) - Math.min(...pts3d.map(p => p[2]));

    // Sort axes by descending spread and pick the top two
    const axes = [
        { idx: 0, spread: spreadX },
        { idx: 1, spread: spreadY },
        { idx: 2, spread: spreadZ },
    ].sort((a, b) => b.spread - a.spread);

    const ax0 = axes[0].idx; // dominant axis (most spread)
    const ax1 = axes[1].idx; // second axis

    const pts2d = pts3d.map(p => [p[ax0], p[ax1]]);

    // ── 2. Ensure CCW winding via signed area ──
    function signedArea(poly) {
        let a = 0;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
        }
        return a / 2;
    }
    const area = signedArea(pts2d);
    // Build index list in the correct winding order
    const indices = area > 0
        ? Array.from({ length: n }, (_, i) => i)           // already CCW
        : Array.from({ length: n }, (_, i) => n - 1 - i);  // reverse to CCW

    // ── 3. Helpers ──
    function cross2(ax, ay, bx, by) { return ax * by - ay * bx; }

    function isConvex(prev, curr, next) {
        const ax = pts2d[curr][0] - pts2d[prev][0];
        const ay = pts2d[curr][1] - pts2d[prev][1];
        const bx = pts2d[next][0] - pts2d[curr][0];
        const by = pts2d[next][1] - pts2d[curr][1];
        return cross2(ax, ay, bx, by) >= 0; // >= 0 includes collinear (safe to clip)
    }

    function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
        // Returns true if (px,py) is strictly inside triangle ABC
        const d1 = cross2(bx - ax, by - ay, px - ax, py - ay);
        const d2 = cross2(cx - bx, cy - by, px - bx, py - by);
        const d3 = cross2(ax - cx, ay - cy, px - cx, py - cy);
        const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
        return !(hasNeg && hasPos);
    }

    function isEar(loop, i) {
        const len  = loop.length;
        const prev = loop[(i - 1 + len) % len];
        const curr = loop[i];
        const next = loop[(i + 1) % len];
        if (!isConvex(prev, curr, next)) return false;
        const ax = pts2d[prev][0], ay = pts2d[prev][1];
        const bx = pts2d[curr][0], by = pts2d[curr][1];
        const cx = pts2d[next][0], cy = pts2d[next][1];
        for (let j = 0; j < loop.length; j++) {
            const v = loop[j];
            if (v === prev || v === curr || v === next) continue;
            if (pointInTriangle(pts2d[v][0], pts2d[v][1], ax, ay, bx, by, cx, cy)) return false;
        }
        return true;
    }

    // ── 4. Ear-clipping loop ──
    const result = [];
    let loop = [...indices];
    let safety = loop.length * loop.length + 10; // prevent infinite loop on degenerate input

    while (loop.length > 3 && safety-- > 0) {
        let clipped = false;
        for (let i = 0; i < loop.length; i++) {
            if (isEar(loop, i)) {
                const len  = loop.length;
                const prev = loop[(i - 1 + len) % len];
                const curr = loop[i];
                const next = loop[(i + 1) % len];
                result.push(prev, curr, next);
                loop.splice(i, 1);
                clipped = true;
                break;
            }
        }
        // Safety fallback: if no ear found (degenerate polygon), do a fan
        if (!clipped) {
            for (let i = 1; i < loop.length - 1; i++) result.push(loop[0], loop[i], loop[i + 1]);
            return result;
        }
    }
    if (loop.length === 3) result.push(loop[0], loop[1], loop[2]);

    return result;
}