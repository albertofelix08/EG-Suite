/**
 * Cut Solid Geometry — Unit III & IV
 * Section of Solids & True Shape
 * Engineering Graphics Suite
 * Alberto Felix & Aaron Mcgeo | CSE-A(I)
 *
 * v2.1 — Consistent HP/VP plane equation in both functions.
 *
 * HP resting: solid's up axis = Y. Plane: Y - tan(angle) * Z = cutPos
 * VP resting: solid's up axis = Z. Plane: Z - tan(angle) * Y = cutPos
 *
 * Keep vertices BELOW the plane (value <= 0).
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
// SIGNED DISTANCE FROM CUTTING PLANE
// ═══════════════════════════════════════════════════════════════════

function planeValue(x, y, z, tanT, cutPos, onVP) {
    if (onVP) {
        // Resting on VP: solid's "up" is Z
        // Cutting plane: Z - tanT * Y = cutPos
        // Keep vertices where Z - tanT * Y <= cutPos
        return z - tanT * y - cutPos;
    } else {
        // Resting on HP: solid's "up" is Y
        // Cutting plane: Y - tanT * Z = cutPos
        // Keep vertices where Y - tanT * Z <= cutPos
        return y - tanT * z - cutPos;
    }
}

// ═══════════════════════════════════════════════════════════════════
// SECTION POINTS (local space → transformed to world for true shape)
// ═══════════════════════════════════════════════════════════════════

export function computeSectionPoints(state) {
    state.sectionPts = [];
    state._localSectionPts = [];

    if (!state.solidData || !state.solidGeo || !state.masterGroup) return;

    const tR = (state.cutAngle * Math.PI) / 180;
    const tanT = Math.tan(tR);
    const onVP = !state.restOnHP;
    const posArr = state.solidGeo.getAttribute('position').array;
    const idxArr = state.solidGeo.getIndex().array;

    const edgeSet = new Set();
    for (let i = 0; i < idxArr.length; i += 3) {
        const a = idxArr[i], b = idxArr[i + 1], c = idxArr[i + 2];
        [[a, b], [b, c], [c, a]].forEach(([p, q]) => {
            edgeSet.add(Math.min(p, q) + ',' + Math.max(p, q));
        });
    }

    function localPt(rawIdx) {
        return [
            posArr[rawIdx * 3],
            posArr[rawIdx * 3 + 1],
            posArr[rawIdx * 3 + 2]
        ];
    }

    const localPts = [];
    edgeSet.forEach(key => {
        const [i1, i2] = key.split(',').map(Number);
        const p1 = localPt(i1), p2 = localPt(i2);

        const f1 = planeValue(p1[0], p1[1], p1[2], tanT, state.cutPos, onVP);
        const f2 = planeValue(p2[0], p2[1], p2[2], tanT, state.cutPos, onVP);

        if (f1 * f2 < 0) {
            const t = f1 / (f1 - f2);
            localPts.push([
                p1[0] + t * (p2[0] - p1[0]),
                p1[1] + t * (p2[1] - p1[1]),
                p1[2] + t * (p2[2] - p1[2]),
            ]);
        }
    });

    const uniq = [];
    localPts.forEach(p => {
        if (!uniq.some(u => Math.hypot(p[0] - u[0], p[1] - u[1], p[2] - u[2]) < 0.1)) {
            uniq.push(p);
        }
    });

    if (uniq.length < 3) return;

    // Sort angularly — project onto cutting plane's local 2D
    const cosT = Math.cos(tR), sinT = Math.sin(tR);
    const projected = uniq.map(p => {
        let u, v;
        if (onVP) {
            u = p[0];
            v = -p[1] * cosT + (p[2] - state.cutPos) * sinT;
        } else {
            u = p[0];
            v = -p[2] * cosT + (p[1] - state.cutPos) * sinT;
        }
        return { pt: p, u, v };
    });
    const cu = projected.reduce((s, p) => s + p.u, 0) / projected.length;
    const cv = projected.reduce((s, p) => s + p.v, 0) / projected.length;
    projected.sort((a, b) =>
        Math.atan2(a.v - cv, a.u - cu) - Math.atan2(b.v - cv, b.u - cu)
    );

    state._localSectionPts = projected.map(p => p.pt);

    state.masterGroup.updateMatrixWorld(true);
    const mat = state.masterGroup.matrixWorld;
    state.sectionPts = state._localSectionPts.map(([x, y, z]) => {
        const v = new THREE.Vector3(x, y, z).applyMatrix4(mat);
        return [v.x, v.y, v.z];
    });
}

// ═══════════════════════════════════════════════════════════════════
// APPLY CUT (local space)
// ═══════════════════════════════════════════════════════════════════

export function applyCutVisual(state) {
    while (state.solidGroup.children.length) {
        state.solidGroup.remove(state.solidGroup.children[0]);
    }
    clearCutMeshes(state);

    if (!state.solidGeo) return;

    const tR = (state.cutAngle * Math.PI) / 180;
    const tanT = Math.tan(tR);
    const onVP = !state.restOnHP;
    const posArr = state.solidGeo.getAttribute('position').array;
    const idxArr = state.solidGeo.getIndex().array;

    const verts = [];
    for (let i = 0; i < posArr.length; i += 3) {
        verts.push([posArr[i], posArr[i + 1], posArr[i + 2]]);
    }

    const clippedIdx = [];
    for (let i = 0; i < idxArr.length; i += 3) {
        const tri = [idxArr[i], idxArr[i + 1], idxArr[i + 2]];
        const vals = tri.map(k => planeValue(verts[k][0], verts[k][1], verts[k][2], tanT, state.cutPos, onVP));
        clipTriangle(verts, clippedIdx, tri, vals, true);
    }

    const flatVerts = [];
    verts.forEach(v => flatVerts.push(...v));

    const cGeo = new THREE.BufferGeometry();
    cGeo.setAttribute('position', new THREE.Float32BufferAttribute(flatVerts, 3));
    cGeo.setIndex(clippedIdx);
    cGeo.computeVertexNormals();

    const meshSolid = new THREE.Mesh(cGeo, new THREE.MeshPhongMaterial({
        color: 0xf97316, flatShading: true, side: THREE.DoubleSide,
    }));
    meshSolid.castShadow = true;
    meshSolid.receiveShadow = true;

    const meshEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(cGeo, 15),
        new THREE.LineBasicMaterial({ color: 0x000000 })
    );

    state._cutMeshes = state._cutMeshes || [];
    state._cutMeshes.push(meshSolid, meshEdges);
    state.solidGroup.add(meshSolid);
    state.solidGroup.add(meshEdges);

    if (state._localSectionPts && state._localSectionPts.length >= 3) {
        const sGeo = new THREE.BufferGeometry();
        const sv = [];
        state._localSectionPts.forEach(p => sv.push(...p));
        sGeo.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3));
        const si = [];
        for (let i = 1; i < state._localSectionPts.length - 1; i++) {
            si.push(0, i, i + 1);
        }
        sGeo.setIndex(si);
        sGeo.computeVertexNormals();
        const meshSection = new THREE.Mesh(sGeo, new THREE.MeshPhongMaterial({
            color: 0xef4444, side: THREE.DoubleSide, flatShading: true,
        }));
        state._cutMeshes.push(meshSection);
        state.solidGroup.add(meshSection);
    }
}

// ═══════════════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════════════

export function clearCutMeshes(state) {
    if (state._cutMeshes) {
        state._cutMeshes.forEach(m => {
            if (m.parent) m.parent.remove(m);
            if (m.geometry) m.geometry.dispose();
            if (m.material) m.material.dispose();
        });
        state._cutMeshes = [];
    }
}