/**
 * Main Application Entry Point — v2.2
 * Engineering Graphics Simulator — Unit V: Isometric Projections
 * Alberto Felix & Aaron Mcgeo | CSE-A(I)
 *
 * v2.2 Changes:
 *  - Consolidated cut state: single `cutState` replaces three variables
 *  - Replaced alert() with status bar messages
 *  - Frustum cut support added (via cutGeometry.js)
 *  - Removed dead modes.js dependency
 */

import * as THREE from '../../common/three.module.js';
import { OrbitControls } from '../../common/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from '../../common/CSS2DRenderer.js';
import { initScene, setupLighting, setupReferencePlanes, getCamera, getControls, getRenderers, handleResize } from './scene.js';
import { getBaseSolid, createFrustum, setOpaqueMode, isOpaqueMode } from './solids.js';
import { createAngledCutSolid } from './cutGeometry.js';
import { createCuttingPlane, removeCuttingPlane } from './cuttingplane.js';
import { initConstructionGroup, updateConstructionLines } from './construction.js';
import { setView } from './cameraControls.js';
import { getIsometricScale, syncSlider, updateInfoDisplay, showGreeting } from './utils.js';

// ============================================================================
// STATE
// ============================================================================

let currentSolid = null;
let currentCutMesh = null;
let cutState = 'none'; // 'none' | 'preview' | 'applied'
let scene, camera, controls;
let dimLabels = [];
let labelRenderer;

// Multi-view renderers
let splitRenderers = {};
let splitCameras  = {};
let splitControls = {};
let animationId   = null;
let currentViewMode = 'iso';

// ============================================================================
// STATUS BAR HELPER
// ============================================================================

function setStatus(msg) {
    const el = document.getElementById('statusText');
    if (el) el.textContent = msg;
}

// ============================================================================
// DIMENSION ANNOTATIONS
// ============================================================================

function clearDimLabels() {
    dimLabels.forEach(obj => {
        if (obj.parent) obj.parent.remove(obj);
        obj.element?.parentNode?.removeChild(obj.element);
    });
    dimLabels = [];
}

function addDimLabel(position, text) {
    const div = document.createElement('div');
    div.className = 'dim-label';
    div.textContent = text;
    const label = new CSS2DObject(div);
    label.position.copy(position);
    scene.add(label);
    dimLabels.push(label);
}

function updateDimensionLabels() {
    clearDimLabels();
    const showDim = document.getElementById('showDimensions')?.checked;
    const activeSolid = currentCutMesh || currentSolid;
    if (!showDim || !activeSolid) return;

    const box    = new THREE.Box3().setFromObject(activeSolid);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const baseSize = parseFloat(document.getElementById('baseSize').value);
    const heightMM = parseFloat(document.getElementById('height').value);

    addDimLabel(
        new THREE.Vector3(box.max.x + 0.3, center.y, box.min.z),
        `H: ${heightMM}mm`
    );
    addDimLabel(
        new THREE.Vector3(center.x, box.min.y - 0.2, box.max.z + 0.3),
        `⌀: ${baseSize}mm`
    );
}

// ============================================================================
// CUTTING PLANE PREVIEW
// ============================================================================

function updateCuttingPlanePreview() {
    if (cutState !== 'preview') return;
    if (!currentSolid) return;

    const cutHeightMM  = parseFloat(document.getElementById('cutHeight').value);
    const cutAngleDeg  = parseFloat(document.getElementById('cutAngle').value);
    const fullHeightMM = parseFloat(document.getElementById('height').value);
    const scale        = getIsometricScale();

    const solidHeight = fullHeightMM * 0.035 * scale;
    const cutHeight   = (cutHeightMM / fullHeightMM) * solidHeight;

    const boundingBox = new THREE.Box3().setFromObject(currentSolid);
    const solidWidth  = boundingBox.max.x - boundingBox.min.x;
    const solidDepth  = boundingBox.max.z - boundingBox.min.z;

    createCuttingPlane(scene, cutHeight, cutAngleDeg, solidWidth + 1, solidDepth + 1);
}

// ============================================================================
// APPLY CUT
// ============================================================================

function applyCut() {
    if (cutState !== 'preview') return;

    const cutHeightMM  = parseFloat(document.getElementById('cutHeight').value);
    const cutAngleDeg  = parseFloat(document.getElementById('cutAngle').value);
    const fullHeightMM = parseFloat(document.getElementById('height').value);
    const scale        = getIsometricScale();

    if (cutHeightMM >= fullHeightMM) {
        setStatus('⚠ Cut height must be less than the solid height');
        return;
    }

    const cutHeightRatio = cutHeightMM / fullHeightMM;
    const scaledHeight   = fullHeightMM * 0.035 * scale;
    const scaledSize     = parseFloat(document.getElementById('baseSize').value) * 0.035 * scale;

    removeCuttingPlane(scene);

    if (currentCutMesh) {
        scene.remove(currentCutMesh);
        currentCutMesh = null;
    }

    const type  = document.querySelector('.solid-type-btn.active')?.dataset.type || 'prism';
    const sides = parseInt(document.querySelector('.poly-btn.active')?.dataset.sides || '4');

    currentCutMesh = createAngledCutSolid(
        type, sides, scaledSize, scaledHeight, cutHeightRatio, cutAngleDeg
    );

    if (currentCutMesh) {
        currentCutMesh.position.set(0, 0, 0);
        applyOpacityToMesh(currentCutMesh);
        scene.add(currentCutMesh);
        if (currentSolid) currentSolid.visible = false;
        cutState = 'applied';
        updateCutButtonVisibility();
        updateDimensionLabels();
        setStatus(`✂ Cut applied — θ=${cutAngleDeg}°, h=${cutHeightMM}mm`);
    } else {
        setStatus('⚠ Could not cut this shape — try a different angle or height');
        cutState = 'preview';
        updateCuttingPlanePreview();
    }
}

// ============================================================================
// RESET CUT
// ============================================================================

function resetCut() {
    if (currentCutMesh) {
        scene.remove(currentCutMesh);
        currentCutMesh = null;
    }
    removeCuttingPlane(scene);
    if (currentSolid) currentSolid.visible = true;

    cutState = 'none';
    const toggle = document.getElementById('truncatedMode');
    if (toggle) toggle.checked = false;
    const ctrls = document.getElementById('truncationControls');
    if (ctrls) ctrls.style.display = 'none';
    updateCutButtonVisibility();
}

function updateCutButtonVisibility() {
    const cutBtn = document.getElementById('cutBtn');
    const resetBtn = document.getElementById('resetCutBtn');
    if (cutBtn) cutBtn.style.display = cutState === 'preview' ? '' : 'none';
    if (resetBtn) resetBtn.style.display = cutState === 'applied' ? '' : 'none';
}

// ============================================================================
// MATERIAL HELPER
// ============================================================================

function applyOpacityToMesh(solid) {
    if (!solid) return;
    const opaque = isOpaqueMode();
    solid.traverse(child => {
        if (child.isMesh && child.material) {
            child.material.transparent = !opaque;
            child.material.opacity = opaque ? 1.0 : 0.85;
            child.material.needsUpdate = true;
        }
    });
}

// ============================================================================
// SOLID UPDATE
// ============================================================================

export function updateSolid() {
    if (currentSolid) scene.remove(currentSolid);
    if (currentCutMesh) { scene.remove(currentCutMesh); currentCutMesh = null; }
    removeCuttingPlane(scene);

    const solidType = document.querySelector('.solid-type-btn.active')?.dataset.type || 'prism';

    currentSolid = (solidType === 'frustum') ? createFrustumSolid() : getBaseSolid();

    const heightMM    = parseFloat(document.getElementById('height').value);
    const scale       = getIsometricScale();
    const scaledHeight = heightMM * 0.035 * scale;
    currentSolid.position.set(0, scaledHeight / 2, 0);

    applyOpacityToMesh(currentSolid);
    scene.add(currentSolid);

    // If cut was applied, re-apply automatically
    if (cutState === 'applied') {
        cutState = 'preview';
        applyCut();
    } else if (cutState === 'preview') {
        updateCuttingPlanePreview();
    } else {
        cutState = 'none';
    }

    const baseSize = parseFloat(document.getElementById('baseSize').value);
    updateInfoDisplay(baseSize, heightMM, scale);
    updateConstructionLines(scene, currentSolid);
    updateDimensionLabels();
    updateCutButtonVisibility();
}

function createFrustumSolid() {
    const baseSize = parseFloat(document.getElementById('baseSize')?.value || '40');
    const height   = parseFloat(document.getElementById('height')?.value   || '60');
    const topSize  = parseFloat(document.getElementById('frustumTop')?.value || '20');
    const scale    = getIsometricScale();
    const sb = baseSize * 0.035 * scale;
    const st = topSize  * 0.035 * scale;
    const sh = height   * 0.035 * scale;
    return createFrustum(sb / 2, st / 2, sh);
}

// ============================================================================
// SPLIT VIEW
// ============================================================================

function initSplitView() {
    const views = [
        { id: 'canvasIso',   view: 'isometric' },
        { id: 'canvasFront', view: 'front'     },
        { id: 'canvasTop',   view: 'top'       },
        { id: 'canvasSide',  view: 'side'      },
    ];

    views.forEach(({ id, view }) => {
        const canvas = document.getElementById(id);
        if (!canvas || splitRenderers[view]) return;

        const w = canvas.clientWidth  || canvas.parentElement?.clientWidth  || 400;
        const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 300;
        canvas.width  = w;
        canvas.height = h;

        const rend = new THREE.WebGLRenderer({ canvas, antialias: true });
        rend.setPixelRatio(window.devicePixelRatio);
        rend.setSize(w, h);
        rend.shadowMap.enabled = true;

        const cam = new THREE.PerspectiveCamera(45, w / h, 0.1, 300);
        const target = new THREE.Vector3(0, 2, 0);
        setView(view, cam, { update: () => {}, target }, target);
        cam.lookAt(target);

        const oc = new OrbitControls(cam, canvas);
        oc.enableDamping = true;
        oc.dampingFactor = 0.06;
        oc.target.copy(target);
        oc.update();

        splitRenderers[view] = rend;
        splitCameras[view]   = cam;
        splitControls[view]  = oc;
    });
}

function renderSplitViews() {
    if (currentViewMode !== 'split') return;
    Object.keys(splitRenderers).forEach(view => {
        const oc = splitControls[view];
        if (oc) oc.update();
        splitRenderers[view]?.render(scene, splitCameras[view]);
    });
}

function resizeSplitViews() {
    Object.keys(splitRenderers).forEach(view => {
        const rend = splitRenderers[view];
        const cam  = splitCameras[view];
        const id   = { isometric: 'canvasIso', front: 'canvasFront', top: 'canvasTop', side: 'canvasSide' }[view];
        const canvas = document.getElementById(id);
        if (!canvas || !rend || !cam) return;
        const w = canvas.clientWidth  || canvas.parentElement?.clientWidth  || 400;
        const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 300;
        if (w > 0 && h > 0) {
            rend.setSize(w, h);
            cam.aspect = w / h;
            cam.updateProjectionMatrix();
        }
    });
}

// ============================================================================
// VIEW MODE SWITCHER
// ============================================================================

function switchViewMode(mode) {
    currentViewMode = mode;
    const single = document.getElementById('viewSingle');
    const split  = document.getElementById('viewSplit');

    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-mode="${mode}"]`)?.classList.add('active');

    if (mode === 'iso' || mode === 'ortho') {
        single.style.display = '';
        split.style.display  = 'none';
        setView(mode === 'ortho' ? 'front' : 'isometric', camera, controls, currentSolid?.position);
    } else if (mode === 'split') {
        single.style.display = 'none';
        split.style.display  = '';
        setTimeout(() => {
            initSplitView();
            resizeSplitViews();
        }, 60);
    }
}

// ============================================================================
// UI HELPERS
// ============================================================================

function updateSidebarForType(type) {
    const baseShapeSection = document.getElementById('baseShapeSection');
    const frustumRow       = document.getElementById('frustumTopRow');

    const needsSides = (type === 'prism' || type === 'pyramid');
    const isFrustum  = (type === 'frustum');

    if (baseShapeSection) baseShapeSection.style.display = needsSides ? '' : 'none';
    if (frustumRow)       frustumRow.style.display       = isFrustum  ? '' : 'none';
}

// ============================================================================
// EXPORT
// ============================================================================

function exportPNG() {
    const { renderer } = getRenderers();
    if (!renderer) return;
    renderer.render(scene, camera);
    const link = document.createElement('a');
    link.download = `unit5-isometric-${Date.now()}.png`;
    link.href = renderer.domElement.toDataURL('image/png');
    link.click();
    setStatus('📸 Screenshot saved');
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {

    // ── Solid type buttons ──
    document.querySelectorAll('.solid-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.solid-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateSidebarForType(btn.dataset.type);
            resetCut();
            updateSolid();
        });
    });

    // ── Polygon side buttons ──
    document.querySelectorAll('.poly-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.poly-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            resetCut();
            updateSolid();
        });
    });

    // ── Dimension sliders ──
    syncSlider('baseSize', 'baseSizeVal', () => {
        if (cutState === 'preview') updateCuttingPlanePreview();
        else updateSolid();
    });

    syncSlider('height', 'heightVal', () => {
        const h = parseFloat(document.getElementById('height').value);
        const cutSlider = document.getElementById('cutHeight');
        const cutNum    = document.getElementById('cutHeightVal');
        if (cutSlider) {
            cutSlider.max = h - 1;
            if (parseFloat(cutSlider.value) >= h) {
                cutSlider.value = Math.floor(h * 0.5);
                if (cutNum) cutNum.value = cutSlider.value;
            }
        }
        if (cutState === 'preview') updateCuttingPlanePreview();
        else updateSolid();
    });

    syncSlider('frustumTop', 'frustumTopVal', () => updateSolid());

    // ── Truncation toggle ──
    document.getElementById('truncatedMode').addEventListener('change', (e) => {
        const ctrls = document.getElementById('truncationControls');
        if (e.target.checked) {
            ctrls.style.display = '';
            cutState = 'preview';
            updateCuttingPlanePreview();
        } else {
            ctrls.style.display = 'none';
            resetCut();
        }
        updateCutButtonVisibility();
    });

    syncSlider('cutHeight', 'cutHeightVal', () => {
        if (cutState === 'preview') updateCuttingPlanePreview();
    });

    syncSlider('cutAngle', 'cutAngleVal', () => {
        if (cutState === 'preview') updateCuttingPlanePreview();
    });

    document.getElementById('cutBtn').addEventListener('click', () => applyCut());
    document.getElementById('resetCutBtn').addEventListener('click', () => resetCut());

    // ── Projection settings ──
    document.getElementById('isometricScale').addEventListener('change', () => {
        resetCut();
        updateSolid();
    });

    document.getElementById('opaqueMode').addEventListener('change', (e) => {
        setOpaqueMode(e.target.checked);
        applyOpacityToMesh(currentSolid);
        applyOpacityToMesh(currentCutMesh);
    });

    document.getElementById('showConstruction').addEventListener('change', () => {
        updateConstructionLines(scene, currentCutMesh || currentSolid);
    });

    document.getElementById('showAxes').addEventListener('change', () => {
        updateConstructionLines(scene, currentCutMesh || currentSolid);
    });

    document.getElementById('showDimensions').addEventListener('change', () => {
        updateDimensionLabels();
    });

    // ── Quick view buttons ──
    const activePosition = () => (currentCutMesh || currentSolid)?.position;
    document.getElementById('viewFrontBtn').addEventListener('click', () =>
        setView('front', camera, controls, activePosition()));
    document.getElementById('viewTopBtn').addEventListener('click', () =>
        setView('top', camera, controls, activePosition()));
    document.getElementById('viewSideBtn').addEventListener('click', () =>
        setView('side', camera, controls, activePosition()));
    document.getElementById('viewIsoBtn').addEventListener('click', () =>
        setView('isometric', camera, controls, activePosition()));
    document.getElementById('resetViewBtn').addEventListener('click', () =>
        setView('isometric', camera, controls, activePosition()));

    // ── View mode switcher ──
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => switchViewMode(btn.dataset.mode));
    });

    // ── Export ──
    document.getElementById('exportBtn').addEventListener('click', exportPNG);
}

// ============================================================================
// ANIMATION LOOP
// ============================================================================

function animate() {
    animationId = requestAnimationFrame(animate);

    if (controls) controls.update();

    const { renderer: rend, labelRenderer: lr } = getRenderers();
    if (rend) {
        rend.render(scene, camera);
        if (lr) lr.render(scene, camera);
    }

    renderSplitViews();
}

// ============================================================================
// INIT
// ============================================================================

const canvas      = document.getElementById('canvas');
const viewportWrap = document.getElementById('viewSingle');

if (viewportWrap) {
    canvas.width  = viewportWrap.clientWidth  || 800;
    canvas.height = viewportWrap.clientHeight || 600;
}

const sceneData   = initScene(canvas);
scene             = sceneData.scene;
camera            = sceneData.camera;
controls          = sceneData.controls;
labelRenderer     = sceneData.labelRenderer;

setupLighting();
setupReferencePlanes();
initConstructionGroup(scene);
setupEventListeners();

updateSidebarForType('prism');
updateCutButtonVisibility();

if (viewportWrap) new ResizeObserver(() => {
    handleResize(canvas);
    resizeSplitViews();
}).observe(viewportWrap);

window.addEventListener('resize', () => {
    handleResize(canvas);
    resizeSplitViews();
});

updateSolid();
animate();
showGreeting();

export const AppState = {
    get solidType() {
        return document.querySelector('.solid-type-btn.active')?.dataset.type || 'prism';
    },
    get cutState() { return cutState; }
};
export function updateSolidExternal() { updateSolid(); }