/**
 * Mode Management (Edit/View)
 * Engineering Graphics Simulator
 * Created by: Alberto Felix & Aaron Mcgeo | CSE-A(I)
 */

import { getControls } from './scene.js';

let currentMode = 'edit'; // 'edit' or 'view'

// Get current mode
export function getCurrentMode() {
    return currentMode;
}

// Set mode and update controls accordingly
export function setMode(mode, updateUI = null) {
    currentMode = mode;
    const controls = getControls();
    
    if (mode === 'edit') {
        // Edit mode: disable camera controls, enable property editing
        controls.enabled = false;
        if (updateUI) updateUI('edit');
    } else {
        // View mode: enable camera controls for free navigation
        controls.enabled = true;
        if (updateUI) updateUI('view');
    }
}

// Toggle between edit and view modes
export function toggleMode(updateUI) {
    const newMode = currentMode === 'edit' ? 'view' : 'edit';
    setMode(newMode, updateUI);
    return newMode;
}

// Preset camera views
export function setCameraView(view, camera, controls) {
    switch(view) {
        case 'top':
            camera.position.set(0, 0, 12);
            controls.target.set(0, 0, 0);
            break;
        case 'front':
            camera.position.set(0, 8, 0);
            controls.target.set(0, 0, 0);
            break;
        case 'side':
            camera.position.set(8, 0, 0);
            controls.target.set(0, 0, 0);
            break;
    }
    controls.update();
}