/**
 * Camera Controls & View Presets — Unit III & IV
 * Engineering Graphics Suite
 * Alberto Felix & Aaron Mcgeo | CSE-A(I)
 *
 * Provides:
 *   - setIsometricView()  — standard isometric camera position
 *   - setView()           — snap to front/top/side orthographic views
 *
 * FIX v2:
 *   BUG 5.4 — setView() was looking at target (0,0,0) — the floor of the HP
 *             plane — so the named views cut the top of the solid off.
 *             setIsometricView() already computed targetY = solidH/2 correctly.
 *             setView() now accepts solidH and uses solidH/2 as the look-at Y.
 */

import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════
// ISOMETRIC VIEW
// ═══════════════════════════════════════════════════════════════════

export function setIsometricView(state) {
    const camera = state.camera;
    const controls = state.scene?._controls;

    if (!camera) return;

    const dist = 260;
    const angle = Math.PI / 4;              // 45° plan rotation
    const elev = Math.atan(1 / Math.sqrt(2)); // ~35.26° standard isometric elevation

    camera.position.set(
        dist * Math.cos(elev) * Math.sin(angle),
        dist * Math.sin(elev),
        dist * Math.cos(elev) * Math.cos(angle)
    );

    const targetY = state.solidH ? state.solidH / 2 : 30;

    if (controls) {
        controls.target.set(0, targetY, 0);
        controls.update();
    }

    camera.lookAt(0, targetY, 0);

    import('./scene.js').then(m => m.setStatus('Isometric view — drag to orbit, scroll to zoom'));
}

// ═══════════════════════════════════════════════════════════════════
// NAMED VIEWS (FRONT / TOP / SIDE)
// ═══════════════════════════════════════════════════════════════════

/**
 * @param {string} view       - 'front' | 'top' | 'side'
 * @param {THREE.Camera} camera
 * @param {OrbitControls} controls
 * @param {number} solidH     - current solid height so we can look at its centre
 */
export function setView(view, camera, controls, solidH) {
    if (!camera) return;

    // FIX 5.4: Look at the vertical centre of the solid, not the floor
    const targetY = solidH ? solidH / 2 : 30;
    const target = new THREE.Vector3(0, targetY, 0);
    const d = 220; // distance from target

    switch (view) {
        case 'front':
            // Looking from +Z toward −Z (onto VP)
            camera.position.set(target.x, target.y, target.z + d);
            break;
        case 'top':
            // Looking from +Y toward −Y (onto HP)
            camera.position.set(target.x, target.y + d, target.z + 0.001);
            break;
        case 'side':
            // Looking from −X toward +X (onto SVP)
            camera.position.set(target.x - d, target.y, target.z);
            break;
        default:
            return;
    }

    if (controls) {
        controls.target.copy(target);
        controls.update();
    }

    camera.lookAt(target);

    const labels = {
        front: 'Front view (VP)',
        top:   'Plan view (HP)',
        side:  'Side view (SVP)',
    };
    import('./scene.js').then(m => m.setStatus(labels[view] || ''));
}