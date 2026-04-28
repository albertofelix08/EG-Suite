/**
 * Utility Functions — v2.0
 * Engineering Graphics Simulator
 *
 * Original: Alberto Felix & Aaron Mcgeo | CSE-A(I)
 */

import * as THREE from '../../common/three.module.js';

// ============================================================================
// SCALE HELPERS
// ============================================================================

/** Returns the current isometric scale multiplier (0.816 or 1.0) */
export function getIsometricScale() {
    const applyScale = document.getElementById('isometricScale')?.checked;
    return applyScale ? 0.816 : 1.0;
}

/** Convert mm to Three.js scene units, applying isometric scale */
export function mmToSceneUnits(mm, scale = null) {
    const s = scale !== null ? scale : getIsometricScale();
    return mm * 0.035 * s;
}

// ============================================================================
// SYNC SLIDER ↔ NUMBER INPUT
// ============================================================================

/**
 * Bi-directionally sync a range slider with a number input.
 * @param {string} sliderId
 * @param {string} valueId
 * @param {Function|null} onChange - Called when either changes
 */
export function syncSlider(sliderId, valueId, onChange = null) {
    const slider = document.getElementById(sliderId);
    const value = document.getElementById(valueId);
    if (!slider || !value) return;

    slider.addEventListener('input', () => {
        value.value = slider.value;
        if (onChange) onChange();
    });
    value.addEventListener('change', () => {
        // Clamp to slider bounds
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        let v = parseFloat(value.value);
        v = Math.max(min, Math.min(max, v));
        value.value = v;
        slider.value = v;
        if (onChange) onChange();
    });
}

// ============================================================================
// UI INFO DISPLAY
// ============================================================================

export function updateInfoDisplay(baseSize, height, scale) {
    const scaleChip = document.getElementById('scaleChip');
    const dimChip = document.getElementById('dimChip');

    if (scaleChip) {
        scaleChip.textContent = `Scale: ${scale === 0.816 ? 'Isometric (0.816:1)' : 'True (1:1)'}`;
    }
    if (dimChip) {
        dimChip.textContent = `⌀ ${baseSize}mm × H ${height}mm`;
    }
}

// ============================================================================
// EDGE HELPER
// ============================================================================

/** Add black edge wireframe as a child of a mesh */
export function addEdges(mesh) {
    const edgesGeo = new THREE.EdgesGeometry(mesh.geometry, 15); // 15° threshold = cleaner edges
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x1a2030, linewidth: 1 });
    const wireframe = new THREE.LineSegments(edgesGeo, edgesMat);
    mesh.add(wireframe);
}

// ============================================================================
// CONSOLE GREETING
// ============================================================================

export function showGreeting() {
    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║   ENGINEERING GRAPHICS SIMULATOR  v2.0                              ║
║   Unit V: Isometric Projections & Orthographic Views                ║
║                                                                      ║
║   Original: Alberto Felix & Aaron Mcgeo | CSE-A(I)                  ║
║                                                                      ║
║   v2.0 Features:                                                     ║
║   ✦ Frustum (truncated cone) as first-class solid                    ║
║   ✦ Dimension annotations (live mm labels on object)                 ║
║   ✦ Split 4-view layout (Iso + Front + Top + Side simultaneously)    ║
║   ✦ PNG Export                                                       ║
║   ✦ Improved opaque/transparent material system                      ║
║   ✦ Redesigned UI (Space Mono + DM Sans)                             ║
║   ✦ Shadows & improved lighting                                      ║
╚══════════════════════════════════════════════════════════════════════╝
    `);
}
