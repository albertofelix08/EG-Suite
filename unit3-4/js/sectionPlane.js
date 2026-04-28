/**
 * Section Plane Preview — Unit III & IV
 * Engineering Graphics Suite
 * Alberto Felix & Aaron Mcgeo | CSE-A(I)
 *
 * Manages the orange translucent cutting plane preview in the 3D view.
 * Plane starts horizontal (XZ plane) and tilts by the cut angle around X.
 * Hatched texture with orange border for clear visibility.
 */

import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════
// CREATE CUTTING PLANE PREVIEW
// ═══════════════════════════════════════════════════════════════════

export function createCuttingPlane(state) {
    // Remove any existing plane first
    removeCuttingPlane(state);

    const angleRad = (state.cutAngle * Math.PI) / 180;
    const size = Math.max(state.solidR, state.solidD || state.solidR) * 3.5;

    // Hatched orange canvas texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Base fill
    ctx.fillStyle = 'rgba(168, 85, 247, 0.85)';
    ctx.fillRect(0, 0, 256, 256);

    // Diagonal hatching lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    for (let i = -256; i < 512; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 256, 256);
        ctx.stroke();
    }

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 248, 248);

    const texture = new THREE.CanvasTexture(canvas);

    const planeGeo = new THREE.PlaneGeometry(size, size);
    const planeMat = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
    });

    const plane = new THREE.Mesh(planeGeo, planeMat);

    // PlaneGeometry faces +Z. Rotate to horizontal (XZ), then tilt by cut angle.
    plane.rotation.x = -Math.PI / 2 + angleRad;
    plane.position.set(0, state.cutPos, 0);

    // Orange border edges
    const edgesGeo = new THREE.EdgesGeometry(planeGeo);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0xa855f7, linewidth: 1 });
    plane.add(new THREE.LineSegments(edgesGeo, edgesMat));

    state.scene.add(plane);
    state._cuttingPlane = plane;

    return plane;
}

// ═══════════════════════════════════════════════════════════════════
// UPDATE EXISTING PLANE (when sliders change, no cut applied yet)
// ═══════════════════════════════════════════════════════════════════

export function updateCuttingPlane(state) {
    if (state._cuttingPlane) {
        removeCuttingPlane(state);
    }
    if (state.cutPlaneVisible && !state.isCutApplied) {
        createCuttingPlane(state);
    }
}

// ═══════════════════════════════════════════════════════════════════
// REMOVE
// ═══════════════════════════════════════════════════════════════════

export function removeCuttingPlane(state) {
    if (state._cuttingPlane) {
        state.scene.remove(state._cuttingPlane);
        if (state._cuttingPlane.geometry) state._cuttingPlane.geometry.dispose();
        if (state._cuttingPlane.material) {
            if (state._cuttingPlane.material.map) state._cuttingPlane.material.map.dispose();
            state._cuttingPlane.material.dispose();
        }
        // Dispose children (edge lines)
        state._cuttingPlane.children.forEach(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
        state._cuttingPlane = null;
    }
}