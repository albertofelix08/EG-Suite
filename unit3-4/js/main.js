/**
 * Main Entry Point — Unit III & IV
 * Projection of Solids, Section & Development of Surfaces
 * Engineering Graphics Suite
 * Alberto Felix & Aaron Mcgeo | CSE-A(I)
 *
 * Wires together:
 *   - 3D scene (Three.js, planes, orbit controls)
 *   - Solid generation & cutting
 *   - 2D canvases (True Shape, Development, Projection)
 *   - UI event handlers (tiered sidebar, tabs, about modal)
 */

import * as THREE from 'three';

// ── Imports from our modules (will be created next) ──
import { initScene, createRefPlanes, applyAxisOrientation, setStatus, updateAxesOverlay } from './scene.js';
import { buildSolidMesh } from './solids.js';
import { computeSectionPoints, applyCutVisual, clearCutMeshes } from './cutSolid.js';
import { createCuttingPlane, removeCuttingPlane, updateCuttingPlane } from './sectionPlane.js';
import { drawTrueShape } from './trueShape.js';
import { drawDevelopment, animateUnroll } from './development.js';
import { drawProjections } from './projection.js';
import { setIsometricView } from './cameraControls.js';

// ═══════════════════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════════════════

const state = {
    solidType: 'hexPrism',
    solidH: 60,
    solidR: 30,
    solidD: 30,
    cutAngle: 45,
    cutPos: 40,
    isCutApplied: false,
    cutPlaneVisible: true,
    restOnHP: true,
    axisIncHP: 90,
    axisIncVP: 90,
    perpEdge: false,
    perpEdgeIdx: 0,
    axisRotX: 0,
    axisRotY: 0,
    axisRotZ: 0,

    // 3D objects
    scene: null,
    camera: null,
    renderer: null,
    masterGroup: null,
    solidGroup: null,
    solidData: null,
    solidGeo: null,
    sectionPts: [],

    // Canvas references
    canvasTrueShape: null,
    canvasDev: null,
    canvasProj: null,
};

// ═══════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════

function init() {
    // Grab canvas elements
    const container = document.getElementById('threeContainer');
    state.canvasTrueShape = document.getElementById('canvasTrueShape');
    state.canvasDev = document.getElementById('canvasDev');
    state.canvasProj = document.getElementById('canvasProj');

    // Init 3D scene
    const sceneData = initScene(container);
    state.scene = sceneData.scene;
    state.camera = sceneData.camera;
    state.renderer = sceneData.renderer;
    state.masterGroup = sceneData.masterGroup;
    state.solidGroup = sceneData.solidGroup;

    // Setup UI listeners
    setupTabSwitching();
    setupSidebarListeners();
    setupModalListeners();

    // Generate initial solid
    generateSolid();

    // Start render loop
    renderLoop();

    // Handle resize
    window.addEventListener('resize', onResize);
    new ResizeObserver(() => {
        resize2dCanvases();
        redrawActiveTab();
    }).observe(document.querySelector('.content-area'));

    resize2dCanvases();
    setStatus('Ready — Generate a solid to begin');
    console.log('✅ Unit III & IV: Projection of Solids, Section & Development loaded.');
}

// ═══════════════════════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════════════════════

function setupTabSwitching() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.tab;

            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabContents.forEach(tc => tc.classList.remove('active'));
            const target = document.getElementById(targetId);
            if (target) target.classList.add('active');

            // Redraw the appropriate 2D canvas when switching
            setTimeout(() => {
                resize2dCanvases();
                redrawActiveTab();
            }, 60);
        });
    });
}

function redrawActiveTab() {
    const active = document.querySelector('.tab-content.active');
    if (!active) return;
    switch (active.id) {
        case 'tabTrueShape': drawTrueShape(state); break;
        case 'tabDev':       drawDevelopment(state, 1); break;
        case 'tabProj':      drawProjections(state); break;
    }
}

// ═══════════════════════════════════════════════════════════════════
// SOLID MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

function generateSolid() {
    // Read UI values into state
    state.solidType = document.getElementById('solidType').value;
    state.solidH = parseFloat(document.getElementById('solidH').value) || 60;
    state.solidR = parseFloat(document.getElementById('solidR').value) || 30;
    const dEl = document.getElementById('solidD');
    if (dEl) state.solidD = parseFloat(dEl.value) || 30;

    // Update cuboid depth visibility
    const isCuboid = state.solidType === 'cuboid';
    document.getElementById('cuboidExtra').style.display = isCuboid ? 'block' : 'none';

    // Update base label text
    updateBaseLabel();

    // Clear previous cut state
    state.isCutApplied = false;
    clearCutMeshes(state);
    removeCuttingPlane(state);

    // Build solid geometry
    const { geo, data } = buildSolidMesh(state);
    state.solidGeo = geo;
    state.solidData = data;

    // Clear and rebuild solid group
    while (state.solidGroup.children.length) {
        state.solidGroup.remove(state.solidGroup.children[0]);
    }

    const mat = new THREE.MeshPhongMaterial({
        color: 0xf97316,
        flatShading: true,
        side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    state.solidGroup.add(mesh);

    // Wireframe using boundary edges (no diagonals)
    if (data.boundaryEdges && data.boundaryEdges.length) {
        const edgeVerts = [];
        data.boundaryEdges.forEach(([i1, i2]) => {
            const p1 = data.all[i1], p2 = data.all[i2];
            if (p1 && p2) {
                edgeVerts.push(new THREE.Vector3(p1[0], p1[1], p1[2]));
                edgeVerts.push(new THREE.Vector3(p2[0], p2[1], p2[2]));
            }
        });
        const edgeGeo = new THREE.BufferGeometry().setFromPoints(edgeVerts);
        state.solidGroup.add(new THREE.LineSegments(
            edgeGeo,
            new THREE.LineBasicMaterial({ color: 0x000000 })
        ));
    } else {
        state.solidGroup.add(new THREE.LineSegments(
            new THREE.EdgesGeometry(geo, 15),
            new THREE.LineBasicMaterial({ color: 0x000000 })
        ));
    }

    // Add axis line
    if (state._axisLine) state.masterGroup.remove(state._axisLine);
    state._axisLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -8, 0),
            new THREE.Vector3(0, state.solidH + 18, 0),
        ]),
        new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 })
    );
    state.masterGroup.add(state._axisLine);

    // Rebuild reference planes
    createRefPlanes(state);

    // Update cutting plane preview if present
    if (state.cutPlaneVisible && !state.isCutApplied) {
        updateCuttingPlane(state);
    }

    // Apply axis orientation
    applyAxisOrientation(state);

    // Update info display
    updateInfoChips();

    // Update perp edge dropdown
    populatePerpEdgeDropdown();

    // Redraw any active 2D tab
    redrawActiveTab();

    // Update status
    const nameMap = {
        hexPrism: 'Hexagonal Prism', pentPrism: 'Pentagonal Prism',
        cylinder: 'Cylinder', cube: 'Cube', cuboid: 'Cuboid',
        hexPyramid: 'Hexagonal Pyramid', pentPyramid: 'Pentagonal Pyramid',
        cone: 'Cone',
    };
    setStatus(`Generated: ${nameMap[state.solidType]} — H=${state.solidH}mm  R=${state.solidR}mm`);
}

function updateBaseLabel() {
    const type = state.solidType;
    const lbl = document.getElementById('lblBase');
    if (!lbl) return;
    if (type === 'cube') lbl.innerHTML = 'Side <span class="unit">mm</span>';
    else if (type === 'cuboid') lbl.innerHTML = 'Width <span class="unit">mm</span>';
    else if (type === 'cylinder' || type === 'cone') lbl.innerHTML = 'Radius <span class="unit">mm</span>';
    else lbl.innerHTML = 'Base Size <span class="unit">mm</span>';
}

function updateInfoChips() {
    const nameMap = {
        hexPrism: 'Hexagonal Prism', pentPrism: 'Pentagonal Prism',
        cylinder: 'Cylinder', cube: 'Cube', cuboid: 'Cuboid',
        hexPyramid: 'Hexagonal Pyramid', pentPyramid: 'Pentagonal Pyramid',
        cone: 'Cone',
    };
    const chip1 = document.getElementById('infoSolidType');
    const chip2 = document.getElementById('infoDims');
    if (chip1) chip1.textContent = nameMap[state.solidType] || state.solidType;
    if (chip2) {
        const isCuboid = state.solidType === 'cuboid';
        chip2.textContent = isCuboid
            ? `${state.solidR}×${state.solidD}×${state.solidH}mm`
            : `${state.solidR}mm × ${state.solidH}mm`;
    }
}

// ═══════════════════════════════════════════════════════════════════
// CUTTING
// ═══════════════════════════════════════════════════════════════════

function applyCut() {
    state.cutAngle = parseFloat(document.getElementById('cutAngle').value) || 45;
    state.cutPos = parseFloat(document.getElementById('cutPos').value) || 40;

    clearCutMeshes(state);
    computeSectionPoints(state);
    applyCutVisual(state);

    // Hide preview plane
    removeCuttingPlane(state);
    state.cutPlaneVisible = false;
    document.getElementById('showCutPreview').checked = false;

    // Toggle buttons
    document.getElementById('applyCutBtn').style.display = 'none';
    document.getElementById('restoreCutBtn').style.display = '';

    state.isCutApplied = true;
    redrawActiveTab();
    setStatus(`Cut applied — θ=${state.cutAngle}°, z₀=${state.cutPos} | ${state.sectionPts.length} section vertices`);
}

function restoreSolid() {
    clearCutMeshes(state);
    removeCuttingPlane(state);
    state.isCutApplied = false;
    state.cutPlaneVisible = true;

    document.getElementById('showCutPreview').checked = true;
    document.getElementById('applyCutBtn').style.display = '';
    document.getElementById('restoreCutBtn').style.display = 'none';

    generateSolid();
    setStatus('Solid restored');
}

// ═══════════════════════════════════════════════════════════════════
// PERP EDGE DROPDOWN
// ═══════════════════════════════════════════════════════════════════

function populatePerpEdgeDropdown() {
    const sel = document.getElementById('perpEdgeSel');
    if (!sel) return;
    sel.innerHTML = '';
    let n = 0, label = 'Edge';
    const t = state.solidType;
    if (t === 'pentPrism' || t === 'pentPyramid') { n = 5; label = 'Edge/Face'; }
    else if (t === 'hexPrism' || t === 'hexPyramid') { n = 6; label = 'Edge/Face'; }
    else if (t === 'cube' || t === 'cuboid') { n = 4; label = 'Face'; }
    else if (t === 'cylinder' || t === 'cone') { n = 8; label = 'Generator'; }
    for (let i = 0; i < n; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `${label} ${i + 1}`;
        sel.appendChild(opt);
    }
}

// ═══════════════════════════════════════════════════════════════════
// SIDEBAR EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════

function setupSidebarListeners() {
    // ── Solid type change ──
    document.getElementById('solidType').addEventListener('change', () => {
        const v = document.getElementById('solidType').value;
        state.solidType = v;
        updateBaseLabel();
        document.getElementById('cuboidExtra').style.display = v === 'cuboid' ? 'block' : 'none';
        populatePerpEdgeDropdown();
        generateSolid();
    });

    // ── Generate button ──
    document.getElementById('generateBtn').addEventListener('click', generateSolid);

    // ── Dimension sliders ──
    syncSlider('solidR', 'solidRVal', (v) => { state.solidR = v; });
    syncSlider('solidH', 'solidHVal', (v) => {
        state.solidH = v;
        document.getElementById('cutPos').max = v * 2;
    });
    syncSlider('solidD', 'solidDVal', (v) => { state.solidD = v; });

    // Slider change → regenerate on release
    ['solidR', 'solidH', 'solidD'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', generateSolid);
    });

    // ── Resting position ──
    document.querySelectorAll('input[name="restPos"]').forEach(radio => {
        radio.addEventListener('change', () => {
            state.restOnHP = document.querySelector('input[name="restPos"]:checked').value === 'HP';
            applyAxisOrientation(state);
            redrawActiveTab();
        });
    });

    // ── Cutting plane sliders ──
    syncSlider('cutAngle', 'cutAngleVal', (v) => {
        state.cutAngle = v;
        if (!state.isCutApplied && state.cutPlaneVisible) updateCuttingPlane(state);
    });
    syncSlider('cutPos', 'cutPosVal', (v) => {
        state.cutPos = v;
        if (!state.isCutApplied && state.cutPlaneVisible) updateCuttingPlane(state);
    });

    document.getElementById('showCutPreview').addEventListener('change', (e) => {
        state.cutPlaneVisible = e.target.checked;
        if (e.target.checked && !state.isCutApplied) updateCuttingPlane(state);
        else removeCuttingPlane(state);
    });

    document.getElementById('applyCutBtn').addEventListener('click', applyCut);
    document.getElementById('restoreCutBtn').addEventListener('click', restoreSolid);

    // ── Quick views ──
    document.getElementById('viewIsoBtn').addEventListener('click', () => setIsometricView(state));
        document.getElementById('viewFrontBtn').addEventListener('click', () => {
        import('./scene.js').then(sceneMod => {
            import('./cameraControls.js').then(m =>
                m.setView('front', sceneMod.getCamera(), sceneMod.getControls())
            );
        });
    });
    document.getElementById('viewTopBtn').addEventListener('click', () => {
        import('./scene.js').then(sceneMod => {
            import('./cameraControls.js').then(m =>
                m.setView('top', sceneMod.getCamera(), sceneMod.getControls())
            );
        });
    });
    document.getElementById('viewSideBtn').addEventListener('click', () => {
        import('./scene.js').then(sceneMod => {
            import('./cameraControls.js').then(m =>
                m.setView('side', sceneMod.getCamera(), sceneMod.getControls())
            );
        });
    });
    document.getElementById('resetViewBtn').addEventListener('click', () => setIsometricView(state));

    // ── Display toggles ──
    document.getElementById('showGridToggle').addEventListener('change', (e) => {
        import('./scene.js').then(m => m.toggleGrid(e.target.checked));
    });
    document.getElementById('showAxesToggle').addEventListener('change', (e) => {
        import('./scene.js').then(m => m.toggleAxes(e.target.checked));
    });
    document.getElementById('opaqueModeToggle').addEventListener('change', (e) => {
        import('./scene.js').then(m => m.setOpaqueMode(e.target.checked));
    });

    // ── Axis orientation ──
    ['incHP', 'incVP', 'rotX', 'rotY', 'rotZ'].forEach(id => {
        const slider = document.getElementById(id);
        const num = document.getElementById(id + 'Val');
        if (slider && num) {
            syncSlider(id, id + 'Val', (v) => {
                const key = id === 'incHP' ? 'axisIncHP'
                    : id === 'incVP' ? 'axisIncVP'
                    : id === 'rotX' ? 'axisRotX'
                    : id === 'rotY' ? 'axisRotY'
                    : 'axisRotZ';
                state[key] = v;
            });
            slider.addEventListener('change', () => {
                applyAxisOrientation(state);
                redrawActiveTab();
            });
        }
    });

    document.getElementById('perpEdgeCB').addEventListener('change', (e) => {
        state.perpEdge = e.target.checked;
        document.getElementById('perpEdgeSel').disabled = !e.target.checked;
        state.perpEdgeIdx = parseInt(document.getElementById('perpEdgeSel').value) || 0;
        applyAxisOrientation(state);
        redrawActiveTab();
    });
    document.getElementById('perpEdgeSel').addEventListener('change', (e) => {
        state.perpEdgeIdx = parseInt(e.target.value);
        if (state.perpEdge) {
            applyAxisOrientation(state);
            redrawActiveTab();
        }
    });

    // ── Reference plane controls ──
    document.getElementById('hpVisibleCB').addEventListener('change', () => {
        import('./scene.js').then(m => m.applyPlaneMode());
    });
    document.getElementById('vpVisibleCB').addEventListener('change', () => {
        import('./scene.js').then(m => m.applyPlaneMode());
    });
    document.querySelectorAll('input[name="hpMode"], input[name="vpMode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            import('./scene.js').then(m => m.applyPlaneMode());
        });
    });

    // ── Collapsible sections ──
    document.querySelectorAll('.collapse-trigger').forEach(trigger => {
        trigger.addEventListener('click', () => {
            const targetId = trigger.dataset.target;
            const content = document.getElementById(targetId);
            if (!content) return;

            const isOpen = content.style.display !== 'none';
            content.style.display = isOpen ? 'none' : 'block';
            trigger.classList.toggle('open', !isOpen);
        });
    });

    // ── Quick load buttons ──
    document.querySelectorAll('.quick-load-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const solidType = btn.dataset.solid;
            document.getElementById('solidType').value = solidType;
            state.solidType = solidType;
            updateBaseLabel();
            document.getElementById('cuboidExtra').style.display = solidType === 'cuboid' ? 'block' : 'none';
            populatePerpEdgeDropdown();
            generateSolid();
        });
    });

    // ── Development tab toolbar ──
    document.querySelectorAll('input[name="devMode"]').forEach(radio => {
        radio.addEventListener('change', () => redrawActiveTab());
    });
    document.getElementById('unrollBtn').addEventListener('click', () => animateUnroll(state));
        // ── Projection mode ──
    document.querySelectorAll('input[name="projMode"]').forEach(radio => {
        radio.addEventListener('change', () => redrawActiveTab());
    });

    // ── Export PNG ──
    document.getElementById('exportBtn').addEventListener('click', () => {
        if (state.renderer && state.scene && state.camera) {
            state.renderer.render(state.scene, state.camera);
            const link = document.createElement('a');
            link.download = `unit3-4-${Date.now()}.png`;
            link.href = state.renderer.domElement.toDataURL('image/png');
            link.click();
            setStatus('Screenshot saved');
        }
    });
}

// ═══════════════════════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════════════════════

function setupModalListeners() {
    document.getElementById('aboutBtn').addEventListener('click', () => {
        document.getElementById('aboutModal').classList.add('open');
    });
    document.getElementById('modalCloseBtn').addEventListener('click', () => {
        document.getElementById('aboutModal').classList.remove('open');
    });
    document.getElementById('aboutModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('aboutModal')) {
            document.getElementById('aboutModal').classList.remove('open');
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') document.getElementById('aboutModal').classList.remove('open');
    });
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function syncSlider(sliderId, numId, onChange) {
    const slider = document.getElementById(sliderId);
    const num = document.getElementById(numId);
    if (!slider || !num) return;
    slider.addEventListener('input', () => {
        num.value = slider.value;
        if (onChange) onChange(parseFloat(slider.value));
    });
    num.addEventListener('change', () => {
        const v = parseFloat(num.value);
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        const clamped = Math.max(min, Math.min(max, v));
        num.value = clamped;
        slider.value = clamped;
        if (onChange) onChange(clamped);
    });
}


function resize2dCanvases() {
    ['canvasTrueShape', 'canvasDev', 'canvasProj'].forEach(canvasId => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const parent = canvas.parentElement;
        if (parent) {
            canvas.width = parent.clientWidth || 800;
            canvas.height = parent.clientHeight || 600;
        }
    });
}

function onResize() {
    const container = document.getElementById('threeContainer');
    if (!container || !state.renderer) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w && h) {
        state.camera.aspect = w / h;
        state.camera.updateProjectionMatrix();
        state.renderer.setSize(w, h);
    }
    resize2dCanvases();
    redrawActiveTab();
}

function renderLoop() {
    requestAnimationFrame(renderLoop);
    import('./scene.js').then(m => {
        if (m.getControls()) m.getControls().update();
        updateAxesOverlay();  // ← Use the imported function, not _updateAxesOverlay
    });
    if (state.renderer && state.scene && state.camera) {
        state.renderer.render(state.scene, state.camera);
    }
}

// ═══════════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════════
requestAnimationFrame(() => requestAnimationFrame(init));