/**
 * Angled Cut Geometry for All Shapes — v2.3
 * Supports angles up to 85° with proper intersection calculation
 * Isometric Projection Visualizer
 *
 * Original: Alberto Felix & Aaron Mcgeo | CSE-A(I)
 * Fix v2.3: Flipped slope sign so cut direction matches cutting plane preview.
 */

import * as THREE from '../../common/three.module.js';
import { addEdges as addEdgesUtil } from './utils.js';
import { isOpaqueMode } from './solids.js';

// ============================================================================
// HELPERS
// ============================================================================

function safeAngle(angleDeg) {
    return Math.max(-85, Math.min(85, angleDeg));
}

function getCutMaterial() {
    const opaque = isOpaqueMode();
    return new THREE.MeshStandardMaterial({
        color: 0xe67e22,
        metalness: 0.4,
        roughness: 0.3,
        transparent: !opaque,
        opacity: opaque ? 1.0 : 0.9,
        emissive: 0x000000,
        side: THREE.DoubleSide,
    });
}

function addEdgesToMesh(mesh) {
    const edgesGeo = new THREE.EdgesGeometry(mesh.geometry, 15);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x1a2030 });
    mesh.add(new THREE.LineSegments(edgesGeo, edgesMat));
}

// ============================================================================
// PRISM — True angled cut, base at y=0
// ============================================================================

export function createAngledCutPrism(sides, size, height, cutHeightRatio, cutAngleDeg) {
    cutAngleDeg = safeAngle(cutAngleDeg);
    const radius = size / (2 * Math.sin(Math.PI / sides));
    const cutHeightWorld = height * cutHeightRatio;

    let slope = Math.tan((cutAngleDeg * Math.PI) / 180);
    if (Math.abs(slope) > 10) slope = Math.sign(slope) * 10;

    const baseVerts = [];
    for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        baseVerts.push(new THREE.Vector3(radius * Math.cos(a), 0, radius * Math.sin(a)));
    }

    const topVerts = baseVerts.map(v => {
        const cutY = Math.max(0, Math.min(height, cutHeightWorld - slope * v.z));
        return new THREE.Vector3(v.x, cutY, v.z);
    });

    const verts = [...baseVerts, ...topVerts];
    const idx = [];

    for (let i = 0; i < sides; i++) {
        const n = (i + 1) % sides;
        idx.push(i, n, i + sides, n, n + sides, i + sides);
    }

    const topCtr = topVerts.reduce((a, v) => a.add(v), new THREE.Vector3()).divideScalar(sides);
    const topCtrIdx = verts.length; verts.push(topCtr);
    for (let i = 0; i < sides; i++) idx.push(sides + i, sides + (i + 1) % sides, topCtrIdx);

    const botCtr = new THREE.Vector3(0, 0, 0);
    const botCtrIdx = verts.length; verts.push(botCtr);
    for (let i = 0; i < sides; i++) idx.push((i + 1) % sides, i, botCtrIdx);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array(verts.flatMap(v => [v.x, v.y, v.z])), 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, getCutMaterial());
    addEdgesToMesh(mesh);
    return mesh;
}

// ============================================================================
// CUBOID — True angled cut, base at y=0
// ============================================================================

export function createAngledCutCuboid(width, depth, height, cutHeightRatio, cutAngleDeg) {
    cutAngleDeg = safeAngle(cutAngleDeg);
    const cutHeightWorld = height * cutHeightRatio;

    let slope = Math.tan((cutAngleDeg * Math.PI) / 180);
    if (Math.abs(slope) > 10) slope = Math.sign(slope) * 10;

    const hw = width / 2, hd = depth / 2;

    const botVerts = [
        new THREE.Vector3(-hw, 0, -hd), new THREE.Vector3( hw, 0, -hd),
        new THREE.Vector3( hw, 0,  hd), new THREE.Vector3(-hw, 0,  hd),
    ];

    const topVerts = botVerts.map(v => {
        const cutY = Math.max(0, Math.min(height, cutHeightWorld - slope * v.z));
        return new THREE.Vector3(v.x, cutY, v.z);
    });

    const verts = [...botVerts, ...topVerts];
    const idx = [];

    for (let i = 0; i < 4; i++) {
        const n = (i + 1) % 4;
        idx.push(i, n, i + 4, n, n + 4, i + 4);
    }

    idx.push(4, 5, 6, 4, 6, 7);
    idx.push(0, 3, 2, 0, 2, 1);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array(verts.flatMap(v => [v.x, v.y, v.z])), 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, getCutMaterial());
    addEdgesToMesh(mesh);
    return mesh;
}

// ============================================================================
// PYRAMID — True angled cut, base at y=0
// ============================================================================

export function createAngledCutPyramid(sides, size, height, cutHeightRatio, cutAngleDeg) {
    if (cutHeightRatio <= 0.001) return null;
    cutAngleDeg = safeAngle(cutAngleDeg);
    const radius = size / (2 * Math.sin(Math.PI / sides));
    const cutHeightWorld = height * cutHeightRatio;

    let slope = Math.tan((cutAngleDeg * Math.PI) / 180);
    if (Math.abs(slope) > 10) slope = Math.sign(slope) * 10;

    const baseVerts = [];
    for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        baseVerts.push(new THREE.Vector3(radius * Math.cos(a), 0, radius * Math.sin(a)));
    }

    const topVerts = baseVerts.map(bv => {
        const denom = height - slope * bv.z;
        const t = Math.abs(denom) < 1e-9
            ? cutHeightWorld / height
            : (cutHeightWorld - slope * bv.z) / denom;
        const tc = Math.max(0.001, Math.min(0.999, t));
        return new THREE.Vector3(bv.x * (1 - tc), tc * height, bv.z * (1 - tc));
    });

    const verts = [...baseVerts, ...topVerts];
    const idx = [];

    for (let i = 0; i < sides; i++) {
        const n = (i + 1) % sides;
        idx.push(i, n, i + sides, n, n + sides, i + sides);
    }

    const topCtr = topVerts.reduce((a, v) => a.add(v), new THREE.Vector3()).divideScalar(sides);
    const topCtrIdx = verts.length; verts.push(topCtr);
    for (let i = 0; i < sides; i++) idx.push(sides + i, sides + (i + 1) % sides, topCtrIdx);

    const botCtr = new THREE.Vector3(0, 0, 0);
    const botCtrIdx = verts.length; verts.push(botCtr);
    for (let i = 0; i < sides; i++) idx.push((i + 1) % sides, i, botCtrIdx);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array(verts.flatMap(v => [v.x, v.y, v.z])), 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, getCutMaterial());
    addEdgesToMesh(mesh);
    return mesh;
}

// ============================================================================
// CYLINDER — True angled cut ellipse, base at y=0
// ============================================================================

export function createAngledCutCylinder(radius, height, cutHeightRatio, cutAngleDeg) {
    cutAngleDeg = safeAngle(cutAngleDeg);
    const cutHeightWorld = height * cutHeightRatio;

    let slope = Math.tan((cutAngleDeg * Math.PI) / 180);
    if (Math.abs(slope) > 8) slope = Math.sign(slope) * 8;

    const segments = 64;
    const botPts = [], topPts = [];

    for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        const x = radius * Math.cos(a), z = radius * Math.sin(a);
        botPts.push(new THREE.Vector3(x, 0, z));
        const cutY = Math.max(0, Math.min(height, cutHeightWorld - slope * z));
        topPts.push(new THREE.Vector3(x, cutY, z));
    }

    const verts = [...botPts, ...topPts];
    const idx = [];

    for (let i = 0; i < segments; i++) {
        const n = i + 1;
        idx.push(i, n, i + segments + 1, n, n + segments + 1, i + segments + 1);
    }

    const topCtr = topPts.reduce((a, v) => a.add(v.clone()), new THREE.Vector3()).divideScalar(topPts.length);
    const topCtrIdx = verts.length; verts.push(topCtr);
    for (let i = 0; i < segments; i++) idx.push(segments + 1 + i, segments + 1 + i + 1, topCtrIdx);

    const botCtr = new THREE.Vector3(0, 0, 0);
    const botCtrIdx = verts.length; verts.push(botCtr);
    for (let i = 0; i < segments; i++) idx.push(i + 1, i, botCtrIdx);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array(verts.flatMap(v => [v.x, v.y, v.z])), 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, getCutMaterial());
    addEdgesToMesh(mesh);
    return mesh;
}

// ============================================================================
// CONE — True angled cut, base at y=0
// ============================================================================

export function createAngledCutCone(radius, height, cutHeightRatio, cutAngleDeg) {
    if (cutHeightRatio <= 0.001) return null;
    cutAngleDeg = safeAngle(cutAngleDeg);
    const cutHeightWorld = height * cutHeightRatio;

    let slope = Math.tan((cutAngleDeg * Math.PI) / 180);
    if (Math.abs(slope) > 8) slope = Math.sign(slope) * 8;

    const segments = 64;
    const baseVerts = [];
    for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        baseVerts.push(new THREE.Vector3(radius * Math.cos(a), 0, radius * Math.sin(a)));
    }

    const topVerts = baseVerts.map(bv => {
        const denom = height - slope * bv.z;
        const t = Math.abs(denom) < 1e-9
            ? cutHeightWorld / height
            : (cutHeightWorld - slope * bv.z) / denom;
        const tc = Math.max(0.001, Math.min(0.999, t));
        return new THREE.Vector3(bv.x * (1 - tc), tc * height, bv.z * (1 - tc));
    });

    const verts = [...baseVerts, ...topVerts];
    const idx = [];

    for (let i = 0; i < segments; i++) {
        const n = i + 1;
        idx.push(i, n, i + segments + 1, n, n + segments + 1, i + segments + 1);
    }

    const topCtr = topVerts.reduce((a, v) => a.add(v.clone()), new THREE.Vector3()).divideScalar(topVerts.length);
    const topCtrIdx = verts.length; verts.push(topCtr);
    for (let i = 0; i < segments; i++) idx.push(segments + 1 + i, segments + 1 + i + 1, topCtrIdx);

    const botCtr = new THREE.Vector3(0, 0, 0);
    const botCtrIdx = verts.length; verts.push(botCtr);
    for (let i = 0; i < segments; i++) idx.push(i + 1, i, botCtrIdx);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array(verts.flatMap(v => [v.x, v.y, v.z])), 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, getCutMaterial());
    addEdgesToMesh(mesh);
    return mesh;
}
// ============================================================================
// FRUSTUM — True angled cut
// ============================================================================

export function createAngledCutFrustum(bottomRadius, topRadius, height, cutHeightRatio, cutAngleDeg) {
    if (cutHeightRatio <= 0.001) return null;
    cutAngleDeg = safeAngle(cutAngleDeg);
    const cutHeightWorld = height * cutHeightRatio;

    let slope = Math.tan((cutAngleDeg * Math.PI) / 180);
    if (Math.abs(slope) > 8) slope = Math.sign(slope) * 8;

    const segments = 64;
    const baseVerts = [];
    for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        baseVerts.push(new THREE.Vector3(bottomRadius * Math.cos(a), 0, bottomRadius * Math.sin(a)));
    }

    const topVerts = baseVerts.map(bv => {
        const angle = Math.atan2(bv.z, bv.x);
        const topZ = topRadius * Math.sin(angle);
        const topX = topRadius * Math.cos(angle);
        const denom = height - slope * (bv.z - topZ);
        const t = Math.abs(denom) < 1e-9
            ? cutHeightWorld / height
            : (cutHeightWorld - slope * bv.z) / denom;
        const tc = Math.max(0.001, Math.min(0.999, t));
        return new THREE.Vector3(
            bv.x * (1 - tc) + topX * tc,
            tc * height,
            bv.z * (1 - tc) + topZ * tc
        );
    });

    const verts = [...baseVerts, ...topVerts];
    const idx = [];

    for (let i = 0; i < segments; i++) {
        const n = i + 1;
        idx.push(i, n, i + segments + 1, n, n + segments + 1, i + segments + 1);
    }

    const topCtr = topVerts.reduce((a, v) => a.add(v.clone()), new THREE.Vector3()).divideScalar(topVerts.length);
    const topCtrIdx = verts.length; verts.push(topCtr);
    for (let i = 0; i < segments; i++) idx.push(segments + 1 + i, segments + 1 + i + 1, topCtrIdx);

    const botCtr = new THREE.Vector3(0, 0, 0);
    const botCtrIdx = verts.length; verts.push(botCtr);
    for (let i = 0; i < segments; i++) idx.push(i + 1, i, botCtrIdx);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array(verts.flatMap(v => [v.x, v.y, v.z])), 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, getCutMaterial());
    addEdgesToMesh(mesh);
    return mesh;
}

// ============================================================================
// MAIN DISPATCHER
// ============================================================================

export function createAngledCutSolid(type, sides, size, height, cutHeightRatio, cutAngleDeg) {
    try {
        switch (type) {
            case 'prism':
                return createAngledCutPrism(sides, size, height, cutHeightRatio, cutAngleDeg);
            case 'pyramid':
                return createAngledCutPyramid(sides, size, height, cutHeightRatio, cutAngleDeg);
            case 'cuboid':
                return createAngledCutCuboid(size, size, height, cutHeightRatio, cutAngleDeg);
            case 'cylinder':
                return createAngledCutCylinder(size / 2, height, cutHeightRatio, cutAngleDeg);
            case 'cone':
                return createAngledCutCone(size / 2, height, cutHeightRatio, cutAngleDeg);
            case 'frustum': {
                const topSize = parseFloat(document.getElementById('frustumTop')?.value || '20');
                const scale = document.getElementById('isometricScale')?.checked ? 0.816 : 1.0;
                const sb = size * 0.035 * scale;
                const st = topSize * 0.035 * scale;
                return createAngledCutFrustum(sb / 2, st / 2, height, cutHeightRatio, cutAngleDeg);
            }
            default:
                console.warn(`[cut] Unsupported type: ${type}`);
                return null;
        }
    } catch (err) {
        console.error('[cut] Error:', err);
        return null;
    }
}