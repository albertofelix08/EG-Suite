/**
 * Solid Geometry Generation — v2.0
 * Engineering Graphics Simulator
 *
 * Original: Alberto Felix & Aaron Mcgeo | CSE-A(I)
 * Added: Frustum solid, better material handling, edge visibility fix
 */

import * as THREE from '../../common/three.module.js';
import { addEdges, mmToSceneUnits, getIsometricScale } from './utils.js';

let currentOpacity = 0.85;
let currentOpaqueMode = false;

export function setOpaqueMode(enabled) {
    currentOpaqueMode = enabled;
    currentOpacity = enabled ? 1.0 : 0.85;
    return currentOpacity;
}

export function getCurrentOpacity() { return currentOpacity; }
export function isOpaqueMode() { return currentOpaqueMode; }

// ============================================================================
// MATERIAL FACTORY
// ============================================================================

function createSolidMaterial(color = 0x5a7d9a) {
    return new THREE.MeshStandardMaterial({
        color,
        metalness: 0.15,
        roughness: 0.55,
        transparent: !currentOpaqueMode,
        opacity: currentOpacity,
        side: currentOpaqueMode ? THREE.FrontSide : THREE.DoubleSide,
        emissive: 0x000000,
    });
}

// ============================================================================
// SOLID GENERATORS
// ============================================================================

export function createPrism(sides, size, height, color = 0x5a7d9a) {
    const radius = size / (2 * Math.sin(Math.PI / sides));
    const geometry = new THREE.CylinderGeometry(radius, radius, height, sides);
    const mesh = new THREE.Mesh(geometry, createSolidMaterial(color));
    addEdges(mesh);
    return mesh;
}

export function createPyramid(sides, size, height, color = 0x5a7d9a) {
    const radius = size / (2 * Math.sin(Math.PI / sides));
    const geometry = new THREE.ConeGeometry(radius, height, sides);
    const mesh = new THREE.Mesh(geometry, createSolidMaterial(color));
    addEdges(mesh);
    return mesh;
}

export function createCylinder(radius, height, color = 0x5a7d9a) {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 48);
    const mesh = new THREE.Mesh(geometry, createSolidMaterial(color));
    addEdges(mesh);
    return mesh;
}

export function createCone(radius, height, color = 0x5a7d9a) {
    const geometry = new THREE.ConeGeometry(radius, height, 48);
    const mesh = new THREE.Mesh(geometry, createSolidMaterial(color));
    addEdges(mesh);
    return mesh;
}

export function createCuboid(width, depth, height, color = 0x5a7d9a) {
    const geometry = new THREE.BoxGeometry(width, depth, height);
    const mesh = new THREE.Mesh(geometry, createSolidMaterial(color));
    addEdges(mesh);
    return mesh;
}

/**
 * Frustum — truncated cone or truncated pyramid.
 * This is a VERY common solid in engineering graphics syllabus.
 * 
 * @param {number} radiusBottom - Base radius in scene units
 * @param {number} radiusTop    - Top radius in scene units (smaller than base)
 * @param {number} height       - Height in scene units
 * @param {number} sides        - Number of sides (48 = cylinder frustum, 3-6 = polyhedral)
 * @param {string} color        - Hex color
 */
export function createFrustum(radiusBottom, radiusTop, height, sides = 48, color = 0x5a7d9a) {
    const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, sides);
    const mesh = new THREE.Mesh(geometry, createSolidMaterial(color));
    addEdges(mesh);
    return mesh;
}

// ============================================================================
// GET BASE SOLID FROM UI STATE
// ============================================================================

export function getBaseSolid() {
    // Support both old select and new button-based UI
    const type = document.querySelector('.solid-type-btn.active')?.dataset.type
        || document.getElementById('solidType')?.value
        || 'prism';
    const sides = parseInt(document.querySelector('.poly-btn.active')?.dataset.sides || '4');
    const baseSize = parseFloat(document.getElementById('baseSize')?.value || '40');
    const height = parseFloat(document.getElementById('height')?.value || '60');
    const scale = getIsometricScale();

    const scaledSize = mmToSceneUnits(baseSize, scale);
    const scaledHeight = mmToSceneUnits(height, scale);

    switch (type) {
        case 'prism':
            return createPrism(sides, scaledSize, scaledHeight);
        case 'pyramid':
            return createPyramid(sides, scaledSize, scaledHeight);
        case 'cylinder':
            return createCylinder(scaledSize / 2, scaledHeight);
        case 'cone':
            return createCone(scaledSize / 2, scaledHeight);
        case 'cuboid':
            return createCuboid(scaledSize, scaledSize, scaledHeight);
        case 'frustum': {
            // Frustum uses a separate top-size slider if available
            const topSize = parseFloat(document.getElementById('frustumTop')?.value || '20');
            const scaledTop = mmToSceneUnits(topSize, scale);
            return createFrustum(scaledSize / 2, scaledTop / 2, scaledHeight, 48);
        }
        default:
            return createPrism(4, scaledSize, scaledHeight);
    }
}
