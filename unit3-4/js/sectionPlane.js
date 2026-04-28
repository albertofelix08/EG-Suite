/**
 * Section Plane Preview — Unit III & IV
 * Engineering Graphics Suite
 * Alberto Felix & Aaron Mcgeo | CSE-A(I)
 *
 * FIXED v2: The cutting plane preview is now placed in the solid's
 * NATURAL LOCAL SPACE (attached to solidGroup's parent = masterGroup),
 * so it correctly follows the solid regardless of HP or VP mode.
 *
 * Previously the plane was placed in world space at Y=cutPos, which
 * only matched the geometry for base-on-HP. For base-on-VP the solid
 * is rotated 90° around X, so the "height" axis is world Z — the
 * preview appeared in the completely wrong position.
 *
 * Fix: Add the preview plane as a child of masterGroup (local space).
 * In local space the solid's axis is always Y (base=0, top=solidH),
 * so positioning the plane at localY=cutPos and tilting by cutAngle
 * around the local X-axis always lines up with the actual clip.
 */

import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════
// CREATE CUTTING PLANE PREVIEW
// ═══════════════════════════════════════════════════════════════════

export function createCuttingPlane(state) {
    removeCuttingPlane(state);

    if (!state.masterGroup) return null;

    const angleRad = (state.cutAngle * Math.PI) / 180;
    const size     = Math.max(state.solidR, state.solidD || state.solidR) * 3.5;

    // ── Hatched canvas texture ──
    const canvas  = document.createElement('canvas');
    canvas.width  = 256;
    canvas.height = 256;
    const ctx     = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(168, 85, 247, 0.85)';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth   = 2;
    for (let i = -256; i < 512; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 256, 256);
        ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth   = 4;
    ctx.strokeRect(4, 4, 248, 248);

    const texture = new THREE.CanvasTexture(canvas);

    // ── Plane mesh ──
    const planeGeo = new THREE.PlaneGeometry(size, size);
    const planeMat = new THREE.MeshBasicMaterial({
        map:         texture,
        side:        THREE.DoubleSide,
        transparent: true,
        opacity:     0.55,
        depthWrite:  false,
    });

    const plane = new THREE.Mesh(planeGeo, planeMat);

    // PlaneGeometry faces +Z by default.
    // We want the plane to be horizontal (XZ) in local space, then tilt
    // by cutAngle around the local X-axis.
    //   Step 1: rotate -90° around X  →  plane faces up (+Y normal)
    //   Step 2: rotate by +angleRad around X  →  tilt from horizontal
    plane.rotation.x = -Math.PI / 2 + angleRad;

    // Position at local Y = cutPos (the "height" along the solid's axis)
    plane.position.set(0, state.cutPos, 0);

    // ── Border edges ──
    const edgesGeo = new THREE.EdgesGeometry(planeGeo);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0xa855f7, linewidth: 1 });
    plane.add(new THREE.LineSegments(edgesGeo, edgesMat));

    // ── Attach to masterGroup (LOCAL space) so it follows HP/VP rotation ──
    state.masterGroup.add(plane);
    state._cuttingPlane = plane;

    return plane;
}

// ═══════════════════════════════════════════════════════════════════
// UPDATE  (called when sliders change before cut is applied)
// ═══════════════════════════════════════════════════════════════════

export function updateCuttingPlane(state) {
    if (state._cuttingPlane) removeCuttingPlane(state);
    if (state.cutPlaneVisible && !state.isCutApplied) createCuttingPlane(state);
}

// ═══════════════════════════════════════════════════════════════════
// REMOVE
// ═══════════════════════════════════════════════════════════════════

export function removeCuttingPlane(state) {
    if (state._cuttingPlane) {
        // Remove from whatever parent it was added to
        if (state._cuttingPlane.parent) {
            state._cuttingPlane.parent.remove(state._cuttingPlane);
        }
        // Dispose geometry & material (including the canvas texture)
        if (state._cuttingPlane.geometry) state._cuttingPlane.geometry.dispose();
        if (state._cuttingPlane.material) {
            if (state._cuttingPlane.material.map) state._cuttingPlane.material.map.dispose();
            state._cuttingPlane.material.dispose();
        }
        // Dispose edge line children
        state._cuttingPlane.children.forEach(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
        state._cuttingPlane = null;
    }
}
