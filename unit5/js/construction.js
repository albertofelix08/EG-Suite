/**
 * Construction Lines and Axes
 * Isometric Projection Visualizer
 * Created by: Alberto Felix & Aaron Mcgeo | CSE-A(I)
 */

import * as THREE from '../../common/three.module.js';

let constructionGroup = null;

export function initConstructionGroup(scene) {
    constructionGroup = new THREE.Group();
    scene.add(constructionGroup);
    return constructionGroup;
}

export function updateConstructionLines(scene, currentSolid) {
    if (!constructionGroup) return;
    
    // Clear existing
    while(constructionGroup.children.length > 0) {
        constructionGroup.remove(constructionGroup.children[0]);
    }
    
    const showConstruction = document.getElementById('showConstruction')?.checked;
    if (!showConstruction) return;
    
    const showAxes = document.getElementById('showAxes')?.checked;
    
    // ========== ISOMETRIC AXES (30° lines) ==========
    if (showAxes) {
        const axisMaterial = new THREE.LineBasicMaterial({ color: 0xff6b6b, linewidth: 2 });
        
        // X-axis (right, 30° down)
        const xPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(5, -2.5, 0)];
        const xLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(xPoints), axisMaterial);
        constructionGroup.add(xLine);
        
        // Z-axis (left, 30° down)
        const zPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(-5, -2.5, 0)];
        const zLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(zPoints), axisMaterial);
        constructionGroup.add(zLine);
        
        // Y-axis (vertical)
        const yPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 5, 0)];
        const yLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(yPoints), axisMaterial);
        constructionGroup.add(yLine);
        
        // Add axis labels
        const labelDiv = (text, color, pos) => {
            const div = document.createElement('div');
            div.textContent = text;
            div.style.color = color;
            div.style.fontSize = '12px';
            div.style.fontWeight = 'bold';
            div.style.background = 'rgba(0,0,0,0.5)';
            div.style.padding = '2px 4px';
            div.style.borderRadius = '4px';
            const label = new THREE.CSS2DObject(div);
            label.position.copy(pos);
            constructionGroup.add(label);
        };
        
        // We'll add CSS2D labels later if needed
    }
    
    // ========== BASE CONSTRUCTION ==========
    if (currentSolid) {
        const baseMaterial = new THREE.LineBasicMaterial({ color: 0x4ecdc4 });
        
        // Get the bounding box of the solid
        const boundingBox = new THREE.Box3().setFromObject(currentSolid);
        const minX = boundingBox.min.x;
        const maxX = boundingBox.max.x;
        const minZ = boundingBox.min.z;
        const maxZ = boundingBox.max.z;
        const centerY = boundingBox.min.y;
        
        // Draw base rectangle
        const baseCorners = [
            new THREE.Vector3(minX, centerY, minZ),
            new THREE.Vector3(maxX, centerY, minZ),
            new THREE.Vector3(maxX, centerY, maxZ),
            new THREE.Vector3(minX, centerY, maxZ),
            new THREE.Vector3(minX, centerY, minZ) // Close the loop
        ];
        
        const baseLineGeo = new THREE.BufferGeometry().setFromPoints(baseCorners);
        const baseLine = new THREE.Line(baseLineGeo, baseMaterial);
        constructionGroup.add(baseLine);
        
        // Draw center cross
        const centerX = (minX + maxX) / 2;
        const centerZ = (minZ + maxZ) / 2;
        
        const crossPointsX = [
            new THREE.Vector3(minX, centerY, centerZ),
            new THREE.Vector3(maxX, centerY, centerZ)
        ];
        const crossXGeo = new THREE.BufferGeometry().setFromPoints(crossPointsX);
        const crossXLine = new THREE.Line(crossXGeo, baseMaterial);
        constructionGroup.add(crossXLine);
        
        const crossPointsZ = [
            new THREE.Vector3(centerX, centerY, minZ),
            new THREE.Vector3(centerX, centerY, maxZ)
        ];
        const crossZGeo = new THREE.BufferGeometry().setFromPoints(crossPointsZ);
        const crossZLine = new THREE.Line(crossZGeo, baseMaterial);
        constructionGroup.add(crossZLine);
        
        // ========== HEIGHT LINES ==========
        const heightMaterial = new THREE.LineBasicMaterial({ color: 0xffe66d });
        
        // Draw vertical lines from each corner
        const corners = [
            new THREE.Vector3(minX, centerY, minZ),
            new THREE.Vector3(maxX, centerY, minZ),
            new THREE.Vector3(maxX, centerY, maxZ),
            new THREE.Vector3(minX, centerY, maxZ)
        ];
        
        corners.forEach(corner => {
            const topPoint = new THREE.Vector3(corner.x, boundingBox.max.y, corner.z);
            const linePoints = [corner, topPoint];
            const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
            const line = new THREE.Line(lineGeo, heightMaterial);
            constructionGroup.add(line);
        });
        
        // ========== DIAGONAL CONSTRUCTION LINES ==========
        const diagMaterial = new THREE.LineBasicMaterial({ color: 0x95e77e, transparent: true, opacity: 0.5 });
        
        // Draw diagonals on top face
        const topCorners = corners.map(c => new THREE.Vector3(c.x, boundingBox.max.y, c.z));
        if (topCorners.length >= 4) {
            const diag1 = [topCorners[0], topCorners[2]];
            const diag2 = [topCorners[1], topCorners[3]];
            
            const diag1Geo = new THREE.BufferGeometry().setFromPoints(diag1);
            const diag1Line = new THREE.Line(diag1Geo, diagMaterial);
            constructionGroup.add(diag1Line);
            
            const diag2Geo = new THREE.BufferGeometry().setFromPoints(diag2);
            const diag2Line = new THREE.Line(diag2Geo, diagMaterial);
            constructionGroup.add(diag2Line);
        }
    }
    
    console.log("Construction lines updated!");
}