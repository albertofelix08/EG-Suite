/**
 * UI Control Panel Logic
 * Engineering Graphics Simulator
 * Created by: Alberto Felix & Aaron Mcgeo | CSE-A(I)
 */

import { AppState, updateSolid } from './main.js';

// Update dimension controls based on solid type
export function updateDimensionControls() {
    const type = AppState.solidType;
    const container = document.getElementById('dimension-controls');
    const sidesContainer = document.getElementById('sides-control');
    
    let html = '';
    
    if (type === 'cuboid') {
        html = `
            <div class="coord-input">
                <label>Width (X):</label>
                <div class="slider-container">
                    <input type="range" id="width" min="0.5" max="4" step="0.1" value="${AppState.dimensions.width}">
                    <input type="number" id="widthValue" min="0.5" max="4" step="0.1" value="${AppState.dimensions.width}">
                </div>
            </div>
            <div class="coord-input">
                <label>Depth (Y):</label>
                <div class="slider-container">
                    <input type="range" id="depth" min="0.5" max="4" step="0.1" value="${AppState.dimensions.depth}">
                    <input type="number" id="depthValue" min="0.5" max="4" step="0.1" value="${AppState.dimensions.depth}">
                </div>
            </div>
            <div class="coord-input">
                <label>Height (Z):</label>
                <div class="slider-container">
                    <input type="range" id="height" min="0.5" max="4" step="0.1" value="${AppState.dimensions.height}">
                    <input type="number" id="heightValue" min="0.5" max="4" step="0.1" value="${AppState.dimensions.height}">
                </div>
            </div>
        `;
        sidesContainer.style.display = 'none';
    } else if (type === 'cube') {
        html = `
            <div class="coord-input">
                <label>Size:</label>
                <div class="slider-container">
                    <input type="range" id="size" min="0.5" max="4" step="0.1" value="${AppState.dimensions.width}">
                    <input type="number" id="sizeValue" min="0.5" max="4" step="0.1" value="${AppState.dimensions.width}">
                </div>
            </div>
        `;
        sidesContainer.style.display = 'none';
    } else if (type === 'cylinder' || type === 'cone') {
        html = `
            <div class="coord-input">
                <label>Radius:</label>
                <div class="slider-container">
                    <input type="range" id="radius" min="0.5" max="3" step="0.1" value="${AppState.dimensions.radius}">
                    <input type="number" id="radiusValue" min="0.5" max="3" step="0.1" value="${AppState.dimensions.radius}">
                </div>
            </div>
            <div class="coord-input">
                <label>Height (Z):</label>
                <div class="slider-container">
                    <input type="range" id="height" min="0.5" max="4" step="0.1" value="${AppState.dimensions.height}">
                    <input type="number" id="heightValue" min="0.5" max="4" step="0.1" value="${AppState.dimensions.height}">
                </div>
            </div>
        `;
        sidesContainer.style.display = 'none';
    } else if (type === 'pyramid' || type === 'prism') {
        html = `
            <div class="coord-input">
                <label>Radius:</label>
                <div class="slider-container">
                    <input type="range" id="radius" min="0.5" max="3" step="0.1" value="${AppState.dimensions.radius}">
                    <input type="number" id="radiusValue" min="0.5" max="3" step="0.1" value="${AppState.dimensions.radius}">
                </div>
            </div>
            <div class="coord-input">
                <label>Height (Z):</label>
                <div class="slider-container">
                    <input type="range" id="height" min="0.5" max="4" step="0.1" value="${AppState.dimensions.height}">
                    <input type="number" id="heightValue" min="0.5" max="4" step="0.1" value="${AppState.dimensions.height}">
                </div>
            </div>
        `;
        sidesContainer.style.display = 'block';
        document.getElementById('sides').value = AppState.dimensions.sides;
        document.getElementById('sidesValue').value = AppState.dimensions.sides;
    }
    
    container.innerHTML = html;
    attachDimensionEvents();
}

// Attach event listeners to dimension controls
export function attachDimensionEvents() {
    const type = AppState.solidType;
    
    if (type === 'cuboid') {
        attachSliderEvent('width', 'widthValue', (val) => AppState.dimensions.width = val);
        attachSliderEvent('depth', 'depthValue', (val) => AppState.dimensions.depth = val);
        attachSliderEvent('height', 'heightValue', (val) => AppState.dimensions.height = val);
    } else if (type === 'cube') {
        attachSliderEvent('size', 'sizeValue', (val) => AppState.dimensions.width = val);
    } else if (type === 'cylinder' || type === 'cone') {
        attachSliderEvent('radius', 'radiusValue', (val) => AppState.dimensions.radius = val);
        attachSliderEvent('height', 'heightValue', (val) => AppState.dimensions.height = val);
    } else if (type === 'pyramid' || type === 'prism') {
        attachSliderEvent('radius', 'radiusValue', (val) => AppState.dimensions.radius = val);
        attachSliderEvent('height', 'heightValue', (val) => AppState.dimensions.height = val);
    }
}

// Helper to attach slider and number input events
function attachSliderEvent(sliderId, valueId, updateCallback) {
    const slider = document.getElementById(sliderId);
    const valueInput = document.getElementById(valueId);
    
    if (slider && valueInput) {
        slider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            updateCallback(val);
            valueInput.value = val;
            updateSolid();
        });
        
        valueInput.addEventListener('change', (e) => {
            const val = parseFloat(e.target.value);
            updateCallback(val);
            slider.value = val;
            updateSolid();
        });
    }
}

// Attach position control events
export function attachPositionEvents() {
    attachSliderEvent('posX', 'posXValue', (val) => AppState.position.x = val);
    attachSliderEvent('posY', 'posYValue', (val) => AppState.position.y = val);
    attachSliderEvent('posZ', 'posZValue', (val) => AppState.position.z = val);
    
    document.getElementById('hpPosition').addEventListener('change', (e) => {
        AppState.position.hp = e.target.value;
        updateSolid();
    });
    
    document.getElementById('vpPosition').addEventListener('change', (e) => {
        AppState.position.vp = e.target.value;
        updateSolid();
    });
}

// Attach rotation control events
export function attachRotationEvents() {
    attachSliderEvent('inclination', 'inclinationValue', (val) => AppState.rotation.inclination = val);
    attachSliderEvent('spin', 'spinValue', (val) => AppState.rotation.spin = val);
    attachSliderEvent('rotation', 'rotationValue', (val) => AppState.rotation.rotation = val);
}

// Attach sides control events
export function attachSidesEvents() {
    const sidesSlider = document.getElementById('sides');
    const sidesValue = document.getElementById('sidesValue');
    
    if (sidesSlider && sidesValue) {
        sidesSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            AppState.dimensions.sides = val;
            sidesValue.value = val;
            updateSolid();
        });
        
        sidesValue.addEventListener('change', (e) => {
            const val = parseInt(e.target.value);
            AppState.dimensions.sides = val;
            sidesSlider.value = val;
            updateSolid();
        });
    }
}