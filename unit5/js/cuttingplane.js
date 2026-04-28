/**
 * Cutting Plane Preview
 * Engineering Graphics Simulator
 *
 * Original: Alberto Felix & Aaron Mcgeo | CSE-A(I)
 * Fix v2.1: Plane was oriented vertically (wrong rotation axis).
 *           Now starts horizontal (rotation.x = -π/2) then tilts by cut angle.
 */

import * as THREE from '../../common/three.module.js';

let cuttingPlaneMesh = null;

export function createCuttingPlane(scene, cutHeight, cutAngleDeg, solidWidth = 4.5, solidDepth = 4.5) {
    // Remove old plane cleanly
    if (cuttingPlaneMesh) {
        scene.remove(cuttingPlaneMesh);
        cuttingPlaneMesh.geometry?.dispose();
        if (Array.isArray(cuttingPlaneMesh.material)) {
            cuttingPlaneMesh.material.forEach(m => m.dispose());
        } else {
            cuttingPlaneMesh.material?.dispose();
        }
        cuttingPlaneMesh = null;
    }

    const displayAngle = Math.max(-85, Math.min(85, cutAngleDeg));
    const cutAngleRad = (displayAngle * Math.PI) / 180;

    // Make the plane a bit larger than the solid so it visually "sticks out"
    const geo = new THREE.PlaneGeometry(solidWidth * 1.3, solidDepth * 1.3);

    // Hatched orange texture to clearly indicate the cutting plane
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(230, 126, 34, 0.85)';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(255, 200, 100, 0.6)';
    ctx.lineWidth = 2;
    for (let i = -256; i < 512; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 256, 256);
        ctx.stroke();
    }
    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 248, 248);

    const texture = new THREE.CanvasTexture(canvas);

    const mat = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,   // prevents z-fighting with the solid
    });

    const plane = new THREE.Mesh(geo, mat);

    // PlaneGeometry faces +Z by default (lies in XY plane).
    // We want it to be horizontal (lie in XZ plane like the ground),
    // so rotate -90° around X first, then add the cut angle tilt.
    plane.rotation.x = -Math.PI / 2 + cutAngleRad;
    plane.position.set(0, cutHeight, 0);

    // Orange border outline
    const edgesGeo = new THREE.EdgesGeometry(geo);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0xff8c00, linewidth: 2 });
    plane.add(new THREE.LineSegments(edgesGeo, edgesMat));

    scene.add(plane);
    cuttingPlaneMesh = plane;

    return cuttingPlaneMesh;
}

export function removeCuttingPlane(scene) {
    if (cuttingPlaneMesh) {
        scene.remove(cuttingPlaneMesh);
        cuttingPlaneMesh.geometry?.dispose();
        if (Array.isArray(cuttingPlaneMesh.material)) {
            cuttingPlaneMesh.material.forEach(m => m.dispose());
        } else {
            cuttingPlaneMesh.material?.dispose();
        }
        cuttingPlaneMesh = null;
    }
}

export function getCuttingPlane() {
    return cuttingPlaneMesh;
}
