/**
 * Camera Controls and View Presets — v2.0
 * Engineering Graphics Simulator
 *
 * Original: Alberto Felix & Aaron Mcgeo | CSE-A(I)
 * Fix: Import THREE properly; add orthographic-style positioning for front/top/side.
 */

import * as THREE from '../../common/three.module.js';

/**
 * Snap camera to a named view.
 * @param {'isometric'|'front'|'top'|'side'} view
 * @param {THREE.Camera} camera
 * @param {OrbitControls} controls
 * @param {THREE.Vector3|undefined} solidPosition
 */
export function setView(view, camera, controls, solidPosition) {
    const target = solidPosition
        ? solidPosition.clone()
        : new THREE.Vector3(0, 2, 0);

    const d = 14; // Distance from target

    switch (view) {
        case 'front':
            // Looking straight at VP (from +Z toward -Z)
            camera.position.set(target.x, target.y, target.z + d);
            break;
        case 'top':
            // Looking straight down at HP (from +Y)
            camera.position.set(target.x, target.y + d, target.z + 0.001);
            break;
        case 'side':
            // Looking from +X (right profile, PP)
            camera.position.set(target.x + d, target.y, target.z);
            break;
        case 'isometric':
        default:
            // Classic isometric: equal parts X, Y, Z
            camera.position.set(target.x + 8, target.y + 7, target.z + 8);
            break;
    }

    if (controls.target) controls.target.copy(target);
    controls.update();
    camera.lookAt(target);
}
