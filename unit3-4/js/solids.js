/**
 * Solid Geometry Builders — Unit III & IV
 * Engineering Graphics Suite
 * Alberto Felix & Aaron Mcgeo | CSE-A(I)
 *
 * Generates BufferGeometry for all 8 solid types.
 * Every solid is built with base at Y=0 and top at Y=height in local space.
 * Boundary edges stored for clean wireframes (no diagonals).
 */

import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════
// POLYGON BASE GENERATOR
// ═══════════════════════════════════════════════════════════════════

function genPolygonBase(n, r) {
    const pts = [];
    for (let i = 0; i < n; i++) {
        const a = (2 * Math.PI * i) / n - Math.PI / 2;
        pts.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return pts;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN BUILDER
// ═══════════════════════════════════════════════════════════════════

export function buildSolidMesh(state) {
    const { solidType: type, solidH: h, solidR: r, solidD: d } = state;
    const vertices = [];
    const indices = [];
    let data;
    let boundaryEdges = [];

    if (type === 'hexPrism' || type === 'pentPrism') {
        const n = type === 'hexPrism' ? 6 : 5;
        const base = genPolygonBase(n, r);
        const bot = base.map(([x, z]) => [x, 0, z]);
        const top = base.map(([x, z]) => [x, h, z]);
        data = { all: [...bot, ...top], n, solidType: 'prism' };
        data.all.forEach(v => vertices.push(...v));

        for (let i = 1; i < n - 1; i++) indices.push(0, i + 1, i);
        for (let i = 1; i < n - 1; i++) indices.push(n, n + i, n + i + 1);
        for (let i = 0; i < n; i++) {
            const i2 = (i + 1) % n;
            indices.push(i, i2, n + i2);
            indices.push(i, n + i2, n + i);
            boundaryEdges.push([i, i2]);
            boundaryEdges.push([n + i, n + i2]);
            boundaryEdges.push([i, n + i]);
            boundaryEdges.push([i2, n + i2]);
        }
    }

    else if (type === 'hexPyramid' || type === 'pentPyramid') {
        const n = type === 'hexPyramid' ? 6 : 5;
        const base = genPolygonBase(n, r);
        const bot = base.map(([x, z]) => [x, 0, z]);
        const apexIdx = n;
        data = { all: [...bot, [0, h, 0]], n, solidType: 'pyramid' };
        data.all.forEach(v => vertices.push(...v));

        for (let i = 1; i < n - 1; i++) indices.push(0, i + 1, i);
        for (let i = 0; i < n; i++) {
            const i2 = (i + 1) % n;
            indices.push(i, i2, apexIdx);
            boundaryEdges.push([i, i2]);
            boundaryEdges.push([i, apexIdx]);
            boundaryEdges.push([i2, apexIdx]);
        }
    }

    else if (type === 'cylinder') {
        const seg = 48;
        const bot = [], top = [];
        for (let i = 0; i < seg; i++) {
            const a = (2 * Math.PI * i) / seg;
            bot.push([r * Math.cos(a), 0, r * Math.sin(a)]);
            top.push([r * Math.cos(a), h, r * Math.sin(a)]);
        }
        data = { all: [...bot, ...top], n: seg, solidType: 'prism' };
        data.all.forEach(v => vertices.push(...v));

        for (let i = 1; i < seg - 1; i++) indices.push(0, i + 1, i);
        for (let i = 1; i < seg - 1; i++) indices.push(seg, seg + i, seg + i + 1);
        for (let i = 0; i < seg; i++) {
            const i2 = (i + 1) % seg;
            indices.push(i, i2, seg + i2);
            indices.push(i, seg + i2, seg + i);
            boundaryEdges.push([i, i2]);
            boundaryEdges.push([seg + i, seg + i2]);
            boundaryEdges.push([i, seg + i]);
        }
    }

    else if (type === 'cone') {
        const seg = 48;
        const bot = [];
        for (let i = 0; i < seg; i++) {
            const a = (2 * Math.PI * i) / seg;
            bot.push([r * Math.cos(a), 0, r * Math.sin(a)]);
        }
        const apexIdx = seg;
        data = { all: [...bot, [0, h, 0]], n: seg, solidType: 'pyramid' };
        data.all.forEach(v => vertices.push(...v));

        for (let i = 1; i < seg - 1; i++) indices.push(0, i + 1, i);
        for (let i = 0; i < seg; i++) {
            const i2 = (i + 1) % seg;
            indices.push(i, i2, apexIdx);
            boundaryEdges.push([i, i2]);
            boundaryEdges.push([i, apexIdx]);
            boundaryEdges.push([i2, apexIdx]);
        }
    }

    else if (type === 'cube') {
        const s = r;
        const bx = [-s / 2, s / 2, s / 2, -s / 2];
        const bz = [-s / 2, -s / 2, s / 2, s / 2];
        const bot = bx.map((x, i) => [x, 0, bz[i]]);
        const top = bx.map((x, i) => [x, s, bz[i]]);
        data = { all: [...bot, ...top], n: 4, solidType: 'prism', isCuboid: true, w: s, d: s };
        data.all.forEach(v => vertices.push(...v));

        indices.push(0, 1, 2); indices.push(0, 2, 3);
        indices.push(4, 6, 5); indices.push(4, 7, 6);
        for (let i = 0; i < 4; i++) {
            const i2 = (i + 1) % 4;
            indices.push(i, i2, 4 + i2);
            indices.push(i, 4 + i2, 4 + i);
            boundaryEdges.push([i, i2]);
            boundaryEdges.push([4 + i, 4 + i2]);
            boundaryEdges.push([i, 4 + i]);
        }
    }

    else if (type === 'cuboid') {
        const hw = r / 2;
        const hd = d / 2;
        const bx = [-hw, hw, hw, -hw];
        const bz = [-hd, -hd, hd, hd];
        const bot = bx.map((x, i) => [x, 0, bz[i]]);
        const top = bx.map((x, i) => [x, h, bz[i]]);
        data = { all: [...bot, ...top], n: 4, solidType: 'prism', isCuboid: true, w: r, d };
        data.all.forEach(v => vertices.push(...v));

        indices.push(0, 1, 2); indices.push(0, 2, 3);
        indices.push(4, 6, 5); indices.push(4, 7, 6);
        for (let i = 0; i < 4; i++) {
            const i2 = (i + 1) % 4;
            indices.push(i, i2, 4 + i2);
            indices.push(i, 4 + i2, 4 + i);
            boundaryEdges.push([i, i2]);
            boundaryEdges.push([4 + i, 4 + i2]);
            boundaryEdges.push([i, 4 + i]);
        }
    }

    // ── Deduplicate boundary edges ──
    const edgeSet = new Set();
    boundaryEdges = boundaryEdges.filter(([a, b]) => {
        const key = Math.min(a, b) + ',' + Math.max(a, b);
        if (edgeSet.has(key)) return false;
        edgeSet.add(key);
        return true;
    });
    data.boundaryEdges = boundaryEdges;

    // ── Build BufferGeometry ──
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return { geo, data };
}

// ═══════════════════════════════════════════════════════════════════
// WORLD-SPACE VERTICES & EDGES (for projection 2D views)
// ═══════════════════════════════════════════════════════════════════

export function getWorldGeometry(state) {
    if (!state.solidGeo || !state.solidData || !state.solidData.boundaryEdges) {
        return { verts: [], edges: [] };
    }

    const mat = state.masterGroup.matrixWorld.clone();
    const posArr = state.solidGeo.getAttribute('position').array;

    const verts = [];
    for (let i = 0; i < posArr.length; i += 3) {
        const v = new THREE.Vector3(posArr[i], posArr[i + 1], posArr[i + 2]).applyMatrix4(mat);
        verts.push([v.x, v.y, v.z]);
    }

    return { verts, edges: state.solidData.boundaryEdges };
}

// ═══════════════════════════════════════════════════════════════════
// EDGE VISIBILITY (for hidden-line rendering in projections)
// ═══════════════════════════════════════════════════════════════════

export function buildEdgeVisibility(state, viewDir) {
    if (!state.solidGeo || !state.solidData) return new Map();

    const mat = state.masterGroup.matrixWorld.clone();
    const posArr = state.solidGeo.getAttribute('position').array;
    const idxArr = state.solidGeo.getIndex().array;
    const vd = viewDir.clone().normalize();

    function wp(i) {
        return new THREE.Vector3(posArr[i * 3], posArr[i * 3 + 1], posArr[i * 3 + 2]).applyMatrix4(mat);
    }

    const edgeFacings = new Map();
    for (let i = 0; i < idxArr.length; i += 3) {
        const a = idxArr[i], b = idxArr[i + 1], c = idxArr[i + 2];
        const pA = wp(a), pB = wp(b), pC = wp(c);
        const n = new THREE.Vector3()
            .crossVectors(
                new THREE.Vector3().subVectors(pB, pA),
                new THREE.Vector3().subVectors(pC, pA)
            )
            .normalize();
        const front = n.dot(vd) > 0;
        [[a, b], [b, c], [c, a]].forEach(([p, q]) => {
            const key = Math.min(p, q) + ',' + Math.max(p, q);
            if (!edgeFacings.has(key)) edgeFacings.set(key, []);
            edgeFacings.get(key).push(front);
        });
    }

    const vis = new Map();
    edgeFacings.forEach((arr, key) => vis.set(key, arr.some(f => f)));
    return vis;
}