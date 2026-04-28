/**
 * cutWorker.js — Cutting logic extracted from EG-Visualizer
 * Original working version (cut works, surface needs improvement)
 */

import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════
// COMPUTE SECTION POINTS
// ═══════════════════════════════════════════════════════════════════

export function computeSectionPoints(state) {
    if (!state.solidData || !state.solidGeo || !state.masterGroup) {
        state.sectionPts = [];
        return [];
    }
    
    state.masterGroup.updateMatrixWorld(true);
    const mat = state.masterGroup.matrixWorld;
    const tR = state.cutAngle * Math.PI / 180;
    const tanT = Math.tan(tR);
    const posArr = state.solidGeo.getAttribute('position').array;
    const idx = state.solidGeo.getIndex().array;
    
    const edgeSet = new Set();
    for (let i = 0; i < idx.length; i += 3) {
        const a = idx[i], b = idx[i + 1], c = idx[i + 2];
        [[a, b], [b, c], [c, a]].forEach(([p, q]) => {
            edgeSet.add(Math.min(p, q) + ',' + Math.max(p, q));
        });
    }
    
    function worldPt(rawIdx) {
        const v = new THREE.Vector3(
            posArr[rawIdx * 3],
            posArr[rawIdx * 3 + 1],
            posArr[rawIdx * 3 + 2]
        ).applyMatrix4(mat);
        return [v.x, v.y, v.z];
    }
    
    const points = [];
    edgeSet.forEach(key => {
        const [i1, i2] = key.split(',').map(Number);
        const p1 = worldPt(i1);
        const p2 = worldPt(i2);
        
        const f1 = p1[1] - state.cutPos + p1[2] * tanT;
        const f2 = p2[1] - state.cutPos + p2[2] * tanT;
        
        if (f1 * f2 < 0) {
            const t = f1 / (f1 - f2);
            points.push([
                p1[0] + t * (p2[0] - p1[0]),
                p1[1] + t * (p2[1] - p1[1]),
                p1[2] + t * (p2[2] - p1[2])
            ]);
        }
    });
    
    const unique = [];
    points.forEach(p => {
        let duplicate = false;
        for (let i = 0; i < unique.length; i++) {
            const dx = p[0] - unique[i][0];
            const dy = p[1] - unique[i][1];
            const dz = p[2] - unique[i][2];
            if (Math.hypot(dx, dy, dz) < 0.1) {
                duplicate = true;
                break;
            }
        }
        if (!duplicate) unique.push(p);
    });
    
    if (unique.length > 2) {
        const cosT = Math.cos(tR);
        const sinT = Math.sin(tR);
        const proj = unique.map(p => ({
            pt: p,
            u: p[0],
            v: -p[2] * cosT + (p[1] - state.cutPos) * sinT
        }));
        const cu = proj.reduce((s, p) => s + p.u, 0) / proj.length;
        const cv = proj.reduce((s, p) => s + p.v, 0) / proj.length;
        proj.sort((a, b) => Math.atan2(a.v - cv, a.u - cu) - Math.atan2(b.v - cv, b.u - cu));
        
        state.sectionPts = proj.map(p => p.pt);
    } else {
        state.sectionPts = unique;
    }
    
    return state.sectionPts;
}

// ═══════════════════════════════════════════════════════════════════
// CLIP TRIANGLE
// ═══════════════════════════════════════════════════════════════════

export function clipTriangle(verts, outIdx, tri, vals, keepAbove) {
    const keep = keepAbove ? (v => v > 0) : (v => v <= 0);
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
        pA[2] + t * (pB[2] - pA[2])
    ];
    
    if (ins.length === 1) {
        const a = ins[0], b = out[0], c = out[1];
        const pA = verts[tri[a]], pB = verts[tri[b]], pC = verts[tri[c]];
        const tAB = vals[a] / (vals[a] - vals[b]);
        const tAC = vals[a] / (vals[a] - vals[c]);
        const iAB = verts.length;
        const iAC = verts.length;
        verts.push(lerp3(pA, pB, tAB));
        verts.push(lerp3(pA, pC, tAC));
        outIdx.push(tri[a], iAB, iAC);
    } else {
        const a = ins[0], b = ins[1], c = out[0];
        const pA = verts[tri[a]], pB = verts[tri[b]], pC = verts[tri[c]];
        const tAC = vals[a] / (vals[a] - vals[c]);
        const tBC = vals[b] / (vals[b] - vals[c]);
        const iAC = verts.length;
        const iBC = verts.length;
        verts.push(lerp3(pA, pC, tAC));
        verts.push(lerp3(pB, pC, tBC));
        outIdx.push(tri[a], tri[b], iBC);
        outIdx.push(tri[a], iBC, iAC);
    }
}

// ═══════════════════════════════════════════════════════════════════
// CREATE SECTION FACE - Simple version that works
// ═══════════════════════════════════════════════════════════════════

function createSectionFaceGeometry(points) {
    if (points.length < 3) return null;
    
    const verts = points.map(p => new THREE.Vector3(p[0], p[1], p[2]));
    
    if (verts.length === 3) {
        const positions = [];
        verts.forEach(v => positions.push(v.x, v.y, v.z));
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
        geo.setIndex([0, 1, 2]);
        geo.computeVertexNormals();
        return geo;
    }
    
    const center = new THREE.Vector3();
    verts.forEach(v => center.add(v));
    center.divideScalar(verts.length);
    
    verts.sort((a, b) => {
        const angleA = Math.atan2(a.z - center.z, a.x - center.x);
        const angleB = Math.atan2(b.z - center.z, b.x - center.x);
        return angleA - angleB;
    });
    
    const allVerts = [center, ...verts];
    const indices = [];
    for (let i = 1; i < allVerts.length - 1; i++) {
        indices.push(0, i, i + 1);
    }
    
    const positions = [];
    allVerts.forEach(v => positions.push(v.x, v.y, v.z));
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    
    return geo;
}

// ═══════════════════════════════════════════════════════════════════
// APPLY CUT VISUAL
// ═══════════════════════════════════════════════════════════════════

export function applyCutVisual(state) {
    console.log('applyCutVisual called');
    
    if (!state.solidGeo || !state.masterGroup || !state.scene) {
        console.error('Missing required objects for cut');
        return false;
    }
    
    state.masterGroup.updateMatrixWorld(true);
    const mat4 = state.masterGroup.matrixWorld;
    const tR = state.cutAngle * Math.PI / 180;
    const tanT = Math.tan(tR);
    
    const posArr = state.solidGeo.getAttribute('position').array;
    const idxArr = state.solidGeo.getIndex().array;
    
    const wVerts = [];
    for (let i = 0; i < posArr.length; i += 3) {
        const v = new THREE.Vector3(posArr[i], posArr[i+1], posArr[i+2]).applyMatrix4(mat4);
        wVerts.push([v.x, v.y, v.z]);
    }
    
    const nV = wVerts.map(v => [...v]);
    const nI = [];
    
    for (let i = 0; i < idxArr.length; i += 3) {
        const t3 = [idxArr[i], idxArr[i+1], idxArr[i+2]];
        const vals = t3.map(k => nV[k][1] - state.cutPos + nV[k][2] * tanT);
        const aboveCount = vals.filter(v => v > 0).length;
        const belowCount = vals.filter(v => v <= 0).length;
        
        if (aboveCount === 0) {
            nI.push(t3[0], t3[1], t3[2]);
        } else if (belowCount > 0 && aboveCount > 0) {
            clipTriangle(nV, nI, t3, vals, false);
        }
    }
    
    if (nI.length === 0) return false;
    
    const cutGeo = new THREE.BufferGeometry();
    const flatVerts = [];
    nV.forEach(v => flatVerts.push(v[0], v[1], v[2]));
    cutGeo.setAttribute('position', new THREE.Float32BufferAttribute(flatVerts, 3));
    cutGeo.setIndex(nI);
    cutGeo.computeVertexNormals();
    
    clearCutMeshes(state);
    
    const solidMat = new THREE.MeshPhongMaterial({
        color: 0xf97316,
        flatShading: true,
        side: THREE.DoubleSide
    });
    const cutSolid = new THREE.Mesh(cutGeo, solidMat);
    cutSolid.castShadow = true;
    cutSolid.receiveShadow = true;
    
    const edgesGeo = new THREE.EdgesGeometry(cutGeo, 15);
    const wireframe = new THREE.LineSegments(edgesGeo, new THREE.LineBasicMaterial({ color: 0x000000 }));
    cutSolid.add(wireframe);
    
    state._cutMeshes = state._cutMeshes || [];
    state._cutMeshes.push(cutSolid);
    state.scene.add(cutSolid);
    
    if (state.solidGroup) {
        state.solidGroup.visible = false;
    }
    
    computeSectionPoints(state);
    
    if (state.sectionPts && state.sectionPts.length >= 3) {
        const sectionGeo = createSectionFaceGeometry(state.sectionPts);
        if (sectionGeo) {
            const sectionMat = new THREE.MeshPhongMaterial({
                color: 0xef4444,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.85
            });
            const sectionMesh = new THREE.Mesh(sectionGeo, sectionMat);
            state._cutMeshes.push(sectionMesh);
            state.scene.add(sectionMesh);
        }
    }
    
    return true;
}

export function clearCutMeshes(state) {
    if (state._cutMeshes) {
        state._cutMeshes.forEach(mesh => {
            if (mesh.parent) mesh.parent.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        });
        state._cutMeshes = [];
    }
    if (state.solidGroup) {
        state.solidGroup.visible = true;
    }
}