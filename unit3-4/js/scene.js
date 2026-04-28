/**
 * Scene Setup — Unit III & IV
 * Projection of Solids, Section & Development
 * Engineering Graphics Suite
 * Alberto Felix & Aaron Mcgeo | CSE-A(I)
 *
 * Manages:
 *   - Three.js scene, camera, renderer
 *   - OrbitControls
 *   - Lighting & shadows
 *   - Reference planes (HP, VP) with per-plane visibility & mode
 *   - Axis orientation (rotating object method)
 *   - Grid, axes helpers
 */

import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════
// INTERNAL STATE
// ═══════════════════════════════════════════════════════════════════

let scene, camera, renderer, orbitControls;
let masterGroup, solidGroup;

// Plane meshes
let _hpMesh = null, _vpMesh = null;
let _hpGrid = null, _vpGrid = null;
let _hpEdgeLine = null, _vpEdgeLine = null;
let _hpIntersectLine = null;
let _axesHelper = null;
let _gridHelper = null;

// Canvas-based corner axes
let _axesCanvas = null, _axesCtx = null;

// Opaque mode
let _opaqueMode = false;

// ═══════════════════════════════════════════════════════════════════
// ORBIT CONTROLS (inline, no external dependency)
// ═══════════════════════════════════════════════════════════════════

function OrbitControls(object, domElement) {
    this.object = object;
    this.domElement = domElement || document;
    this.enabled = true;
    this.target = new THREE.Vector3();
    this.minDistance = 0;
    this.maxDistance = Infinity;
    this.enableDamping = true;
    this.dampingFactor = 0.08;
    this.enableZoom = true;
    this.zoomSpeed = 1;
    this.enableRotate = true;
    this.rotateSpeed = 0.8;
    this.enablePan = true;
    this.panSpeed = 1;
    this.autoRotate = false;
    this.autoRotateSpeed = 2;

    const self = this;
    const STATE = { NONE: -1, ROTATE: 0, DOLLY: 1, PAN: 2 };
    let state = STATE.NONE;
    const spherical = new THREE.Spherical();
    const sphericalDelta = new THREE.Spherical();
    let scale = 1;
    const panOffset = new THREE.Vector3();
    const rotateStart = new THREE.Vector2();
    const rotateEnd = new THREE.Vector2();
    const rotateDelta = new THREE.Vector2();
    const panStart = new THREE.Vector2();
    const panEnd = new THREE.Vector2();
    const panDelta = new THREE.Vector2();
    const dollyStart = new THREE.Vector2();
    const dollyEnd = new THREE.Vector2();
    const dollyDelta = new THREE.Vector2();
    const offset = new THREE.Vector3();
    const quat = new THREE.Quaternion().setFromUnitVectors(object.up, new THREE.Vector3(0, 1, 0));
    const quatInverse = quat.clone().invert();
    const lastPosition = new THREE.Vector3();

    this.update = function() {
        const position = self.object.position;
        offset.copy(position).sub(self.target);
        offset.applyQuaternion(quat);
        spherical.setFromVector3(offset);

        if (self.autoRotate && state === STATE.NONE) {
            sphericalDelta.theta -= (2 * Math.PI / 60 / 60) * self.autoRotateSpeed;
        }
        if (self.enableDamping) {
            spherical.theta += sphericalDelta.theta * self.dampingFactor;
            spherical.phi += sphericalDelta.phi * self.dampingFactor;
        } else {
            spherical.theta += sphericalDelta.theta;
            spherical.phi += sphericalDelta.phi;
        }
        spherical.phi = Math.max(0.001, Math.min(Math.PI - 0.001, spherical.phi));
        spherical.radius *= scale;
        spherical.radius = Math.max(self.minDistance, Math.min(self.maxDistance, spherical.radius));

        if (self.enableDamping) self.target.addScaledVector(panOffset, self.dampingFactor);
        else self.target.add(panOffset);

        offset.setFromSpherical(spherical);
        offset.applyQuaternion(quatInverse);
        position.copy(self.target).add(offset);
        self.object.lookAt(self.target);

        if (self.enableDamping) {
            sphericalDelta.theta *= (1 - self.dampingFactor);
            sphericalDelta.phi *= (1 - self.dampingFactor);
            panOffset.multiplyScalar(1 - self.dampingFactor);
        } else {
            sphericalDelta.set(0, 0, 0);
            panOffset.set(0, 0, 0);
        }
        scale = 1;

        if (lastPosition.distanceToSquared(self.object.position) > 1e-6) {
            lastPosition.copy(self.object.position);
            return true;
        }
        return false;
    };

    function zoomScale() { return Math.pow(0.95, self.zoomSpeed); }
    function rotateLeft(angle) { sphericalDelta.theta -= angle; }
    function rotateUp(angle) { sphericalDelta.phi -= angle; }
    function panLeft(distance, matrix) {
        const v = new THREE.Vector3();
        v.setFromMatrixColumn(matrix, 0);
        v.multiplyScalar(-distance);
        panOffset.add(v);
    }
    function panUp(distance, matrix) {
        const v = new THREE.Vector3();
        v.setFromMatrixColumn(matrix, 1);
        v.multiplyScalar(distance);
        panOffset.add(v);
    }
    function pan(dx, dy) {
        const el = self.domElement === document ? self.domElement.body : self.domElement;
        if (self.object.isPerspectiveCamera) {
            const pos = self.object.position;
            const tO = pos.clone().sub(self.target);
            let tDist = tO.length();
            tDist *= Math.tan((self.object.fov / 2) * Math.PI / 180);
            panLeft((2 * dx * tDist) / el.clientHeight, self.object.matrix);
            panUp((2 * dy * tDist) / el.clientHeight, self.object.matrix);
        }
    }

    function onMouseDown(e) {
        if (!self.enabled) return;
        e.preventDefault();
        if (e.button === 0) { state = STATE.ROTATE; rotateStart.set(e.clientX, e.clientY); }
        else if (e.button === 1) { state = STATE.DOLLY; dollyStart.set(e.clientX, e.clientY); }
        else if (e.button === 2) { state = STATE.PAN; panStart.set(e.clientX, e.clientY); }
        if (state !== STATE.NONE) {
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }
    }
    function onMouseMove(e) {
        if (!self.enabled) return;
        e.preventDefault();
        const el = self.domElement === document ? self.domElement.body : self.domElement;
        if (state === STATE.ROTATE) {
            rotateEnd.set(e.clientX, e.clientY);
            rotateDelta.subVectors(rotateEnd, rotateStart);
            rotateLeft((2 * Math.PI * rotateDelta.x) / el.clientHeight * self.rotateSpeed);
            rotateUp((2 * Math.PI * rotateDelta.y) / el.clientHeight * self.rotateSpeed);
            rotateStart.copy(rotateEnd);
        } else if (state === STATE.DOLLY) {
            dollyEnd.set(e.clientX, e.clientY);
            dollyDelta.subVectors(dollyEnd, dollyStart);
            if (dollyDelta.y > 0) scale /= zoomScale();
            else if (dollyDelta.y < 0) scale *= zoomScale();
            dollyStart.copy(dollyEnd);
        } else if (state === STATE.PAN) {
            panEnd.set(e.clientX, e.clientY);
            panDelta.subVectors(panEnd, panStart);
            pan(panDelta.x, panDelta.y);
            panStart.copy(panEnd);
        }
    }
    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        state = STATE.NONE;
    }
    function onWheel(e) {
        if (!self.enabled || !self.enableZoom) return;
        e.preventDefault();
        if (e.deltaY < 0) scale /= zoomScale();
        else if (e.deltaY > 0) scale *= zoomScale();
    }

    const preventContext = e => e.preventDefault();
    const el = domElement || document;
    el.addEventListener('contextmenu', preventContext);
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('wheel', onWheel, { passive: false });

    this.dispose = function() {
        el.removeEventListener('contextmenu', preventContext);
        el.removeEventListener('mousedown', onMouseDown);
        el.removeEventListener('wheel', onWheel);
    };
};

// ═══════════════════════════════════════════════════════════════════
// INIT SCENE
// ═══════════════════════════════════════════════════════════════════

export function initScene(container) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe8ecf0);
    scene.fog = new THREE.FogExp2(0xe8ecf0, 0.0018);

    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;

    camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 2000);
    camera.position.set(160, 120, 200);

    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.07;
    orbitControls.target.set(0, 30, 0);

    // Lighting
    const amb = new THREE.AmbientLight(0xffffff, 0.40);
    scene.add(amb);

    const key = new THREE.DirectionalLight(0xfff5e0, 1.0);
    key.position.set(120, 180, 120);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 600;
    key.shadow.camera.left = key.shadow.camera.bottom = -200;
    key.shadow.camera.right = key.shadow.camera.top = 200;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xcce4ff, 0.4);
    fill.position.set(-80, 100, -60);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0x334466, 0.2);
    rim.position.set(0, -80, 0);
    scene.add(rim);

    // Master group
    masterGroup = new THREE.Group();
    scene.add(masterGroup);
    solidGroup = new THREE.Group();
    masterGroup.add(solidGroup);

    // Default grid
    _gridHelper = new THREE.GridHelper(160, 32, 0x94a3b8, 0xc8d4e0);
    _gridHelper.position.y = 0.5;
    _gridHelper.material.transparent = true;
    _gridHelper.material.opacity = 0.45;
    scene.add(_gridHelper);

    // Axes helper
    _axesHelper = new THREE.AxesHelper(80);
    _axesHelper.material.transparent = true;
    _axesHelper.material.opacity = 0.25;
    scene.add(_axesHelper);

    // Corner axes widget
    _buildAxesOverlay(container);

    // Expose controls for main.js
    scene._controls = orbitControls;

    return { scene, camera, renderer, masterGroup, solidGroup };
}

// ═══════════════════════════════════════════════════════════════════
// CORNER AXES WIDGET
// ═══════════════════════════════════════════════════════════════════

function _buildAxesOverlay(container) {
    _axesCanvas = document.createElement('canvas');
    _axesCanvas.width = 90;
    _axesCanvas.height = 90;
    Object.assign(_axesCanvas.style, {
        position: 'absolute',
        left: '12px',
        bottom: '50px',
        width: '90px',
        height: '90px',
        pointerEvents: 'none',
        zIndex: '10',
    });
    container.appendChild(_axesCanvas);
    _axesCtx = _axesCanvas.getContext('2d');
}

function _updateAxesOverlay() {
    if (!_axesCtx) return;
    const ctx = _axesCtx;
    const W = 90, cx = 45, cy = 45, R = 32;
    ctx.clearRect(0, 0, W, W);

    const mat = new THREE.Matrix4().extractRotation(camera.matrixWorldInverse);
    const axes = [
        { dir: new THREE.Vector3(1, 0, 0), col: '#ff5555', neg: '#7a2222', lbl: 'X' },
        { dir: new THREE.Vector3(0, 1, 0), col: '#55dd55', neg: '#267a26', lbl: 'Y' },
        { dir: new THREE.Vector3(0, 0, 1), col: '#4499ff', neg: '#1a3f7a', lbl: 'Z' },
    ];
    const projected = axes.map(a => {
        const v = a.dir.clone().applyMatrix4(mat);
        return { ...a, sx: cx + v.x * R, sy: cy - v.y * R, z: v.z };
    });
    const all = [
        ...projected.map(p => ({ ...p, positive: false, sx: cx - (p.sx - cx), sy: cy - (p.sy - cy), col: p.neg })),
        ...projected.map(p => ({ ...p, positive: true })),
    ].sort((a, b) => a.z - b.z);

    ctx.beginPath();
    ctx.arc(cx, cy, R + 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,14,28,0.72)';
    ctx.fill();

    all.forEach(({ sx, sy, col, lbl, positive }) => {
        if (!positive) {
            ctx.beginPath();
            ctx.setLineDash([2, 3]);
            ctx.moveTo(cx, cy);
            ctx.lineTo(sx, sy);
            ctx.strokeStyle = col;
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.setLineDash([]);
            return;
        }
        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.moveTo(cx, cy);
        ctx.lineTo(sx, sy);
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(sx, sy, 5, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px "JetBrains Mono",monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lbl, sx + (sx - cx) * 0.28, sy + (sy - cy) * 0.28);
    });
}

// ═══════════════════════════════════════════════════════════════════
// REFERENCE PLANES
// ═══════════════════════════════════════════════════════════════════

export function createRefPlanes(state) {
    // Clean old plane objects
    [_hpMesh, _vpMesh, _hpGrid, _vpGrid, _hpEdgeLine, _vpEdgeLine, _hpIntersectLine].forEach(m => {
        if (m) scene.remove(m);
    });
    if (state._hpLabel) scene.remove(state._hpLabel);
    if (state._vpLabel) scene.remove(state._vpLabel);
    if (state._xyLabel) scene.remove(state._xyLabel);

    const effectiveR = Math.max(state.solidR, state.solidD || state.solidR);
    const BUFFER_AMOUNT = 15; // Must match the buffer in applyAxisOrientation
    const spread = effectiveR + 70;
    const vpZ = -(effectiveR + BUFFER_AMOUNT + 8);
    const vpH = state.solidH + 55;

    // ── HP (Horizontal Plane at Y=0) ──
    const hpGeo = new THREE.PlaneGeometry(spread * 2, spread * 2);
    const hpMat = new THREE.MeshPhongMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
        emissive: new THREE.Color(0x1e3a8a),
        emissiveIntensity: 0.12,
    });
    _hpMesh = new THREE.Mesh(hpGeo, hpMat);
    _hpMesh.rotation.x = -Math.PI / 2;
    _hpMesh.receiveShadow = true;
    scene.add(_hpMesh);

    // HP grid
    _hpGrid = new THREE.GridHelper(spread * 2, Math.round(spread / 5) * 2, 0x1d4ed8, 0x1e3a5f);
    _hpGrid.position.y = 0.5;
    scene.add(_hpGrid);

    // HP border
    const hpPts = [
        new THREE.Vector3(-spread, 0, -spread), new THREE.Vector3(spread, 0, -spread),
        new THREE.Vector3(spread, 0, spread), new THREE.Vector3(-spread, 0, spread),
        new THREE.Vector3(-spread, 0, -spread),
    ];
    _hpEdgeLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(hpPts),
        new THREE.LineBasicMaterial({ color: 0x60a5fa, opacity: 0.6, transparent: true })
    );
    scene.add(_hpEdgeLine);

    // ── VP (Vertical Plane at Z=vpZ) ──
    const vpGeo = new THREE.PlaneGeometry(spread * 2, vpH);
    const vpMat = new THREE.MeshPhongMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.20,
        side: THREE.DoubleSide,
        depthWrite: false,
        emissive: new THREE.Color(0x064e3b),
        emissiveIntensity: 0.18,
    });
    _vpMesh = new THREE.Mesh(vpGeo, vpMat);
    _vpMesh.position.set(0, vpH / 2, vpZ);
    scene.add(_vpMesh);

    // VP grid
    const vpCellSize = 10;
    const vpGridCols = Math.round((spread * 2) / vpCellSize);
    const vpGridRows = Math.round(vpH / vpCellSize);
    const vpGridPts = [];
    for (let c = 0; c <= vpGridCols; c++) {
        const x = -spread + c * vpCellSize;
        vpGridPts.push(new THREE.Vector3(x, 0, vpZ), new THREE.Vector3(x, vpH, vpZ));
    }
    for (let r = 0; r <= vpGridRows; r++) {
        const y = r * vpCellSize;
        vpGridPts.push(new THREE.Vector3(-spread, y, vpZ), new THREE.Vector3(spread, y, vpZ));
    }
    _vpGrid = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(vpGridPts),
        new THREE.LineBasicMaterial({ color: 0x065f46, opacity: 0.55, transparent: true })
    );
    scene.add(_vpGrid);

    // VP border
    const vpPts = [
        new THREE.Vector3(-spread, 0, vpZ), new THREE.Vector3(spread, 0, vpZ),
        new THREE.Vector3(spread, vpH, vpZ), new THREE.Vector3(-spread, vpH, vpZ),
        new THREE.Vector3(-spread, 0, vpZ),
    ];
    _vpEdgeLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(vpPts),
        new THREE.LineBasicMaterial({ color: 0x34d399, opacity: 0.7, transparent: true })
    );
    scene.add(_vpEdgeLine);

    // ── XY intersection line ──
    _hpIntersectLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-spread, 0, vpZ),
            new THREE.Vector3(spread, 0, vpZ),
        ]),
        new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.55, transparent: true })
    );
    scene.add(_hpIntersectLine);

    // ── Sprites for HP/VP/XY labels ──
    state._hpLabel = _makeSprite('HP', -spread + 10, 5, -spread + 10, 0x60a5fa);
    state._vpLabel = _makeSprite('VP', -spread + 10, vpH - 8, vpZ - 2, 0x34d399);
    state._xyLabel = _makeSprite('xy', spread - 8, 5, vpZ + 2, 0xffffff);

    applyPlaneMode();
}

function _makeSprite(text, x, y, z, colorHex) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 64;
    const ctx = c.getContext('2d');
    ctx.font = 'bold 36px sans-serif';
    const hex = colorHex.toString(16).padStart(6, '0');
    ctx.fillStyle = '#' + hex;
    ctx.globalAlpha = 0.9;
    ctx.textAlign = 'center';
    ctx.fillText(text, 64, 46);
    const spr = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true })
    );
    spr.position.set(x, y, z);
    spr.scale.set(22, 11, 1);
    scene.add(spr);
    return spr;
}

// ═══════════════════════════════════════════════════════════════════
// PER-PLANE MODE APPLICATION
// ═══════════════════════════════════════════════════════════════════

export function applyPlaneMode() {
    const hpModeEl = document.querySelector('input[name="hpMode"]:checked');
    const vpModeEl = document.querySelector('input[name="vpMode"]:checked');
    const hpMode = hpModeEl ? hpModeEl.value : 'trans';
    const vpMode = vpModeEl ? vpModeEl.value : 'trans';
    const hpVis = document.getElementById('hpVisibleCB')?.checked !== false;
    const vpVis = document.getElementById('vpVisibleCB')?.checked !== false;

    _applyOnePlane(_hpMesh, _hpEdgeLine, _hpGrid, hpMode, hpVis, 0.22, 0.90);
    _applyOnePlane(_vpMesh, _vpEdgeLine, _vpGrid, vpMode, vpVis, 0.20, 0.85);

    const xyShow = (hpVis && hpMode !== 'hide') || (vpVis && vpMode !== 'hide');
    if (_hpIntersectLine) _hpIntersectLine.visible = xyShow;
}

function _applyOnePlane(mesh, edgeLine, grid, mode, visible, transOp, solidOp) {
    if (!mesh) return;
    const show = visible && mode !== 'hide';
    mesh.visible = show;
    if (edgeLine) edgeLine.visible = show;
    if (grid) grid.visible = show;

    if (!show) return;

    if (mode === 'solid') {
        mesh.material.opacity = solidOp;
        mesh.material.transparent = false;
        mesh.material.depthWrite = true;
    } else {
        mesh.material.opacity = transOp;
        mesh.material.transparent = true;
        mesh.material.depthWrite = false;
    }
    mesh.material.needsUpdate = true;
}

// ═══════════════════════════════════════════════════════════════════
// AXIS ORIENTATION (Rotating Object Method)
// ═══════════════════════════════════════════════════════════════════

export function applyAxisOrientation(state) {
    if (!masterGroup) return;

    masterGroup.rotation.set(0, 0, 0);
    masterGroup.position.set(0, 0, 0);
    masterGroup.updateMatrix();

    // Stage 1: Resting plane
    if (!state.restOnHP) {
        // Resting on VP - rotate so base faces VP
        masterGroup.rotateX(-Math.PI / 2);
    }

    // Stage 2: Plan rotation for VP angle
    const planRotate = (90 - state.axisIncVP) * Math.PI / 180;
    masterGroup.rotateY(planRotate);

    // Stage 3: Tilt axis relative to HP
    const tiltAngle = (90 - state.axisIncHP) * Math.PI / 180;
    masterGroup.rotateX(-tiltAngle);

    // Stage 4: Perpendicular edge snap
    if (state.perpEdge && state.solidData) {
        const n = state.solidData.n || 6;
        const eIdx = state.perpEdgeIdx % n;
        const a1 = (2 * Math.PI * eIdx) / n - Math.PI / 2;
        const a2 = (2 * Math.PI * (eIdx + 1)) / n - Math.PI / 2;
        masterGroup.rotateY(-(a1 + a2) / 2);
    }

    // Stage 5: Free rotation overrides
    const rx = Math.max(-90, Math.min(90, state.axisRotX)) * Math.PI / 180;
    const ry = Math.max(-180, Math.min(180, state.axisRotY)) * Math.PI / 180;
    const rz = Math.max(-90, Math.min(90, state.axisRotZ)) * Math.PI / 180;
    masterGroup.rotateX(rx);
    masterGroup.rotateY(ry);
    masterGroup.rotateZ(rz);

    // Stage 6: Position adjustment with BUFFER ZONE
    masterGroup.updateMatrixWorld(true);
    
    if (solidGroup && solidGroup.children.length > 0) {
        const box = new THREE.Box3().setFromObject(masterGroup);
        
        if (state.restOnHP) {
            // Rest on HP: bottom at Y=0
            if (box.min.y < 0) masterGroup.position.y = -box.min.y;
        } else {
            // Rest on VP: object should be ABOVE HP and IN FRONT OF VP with BUFFER
            
            // First, ensure object is above HP (Y ≥ 0)
            if (box.min.y < 0) masterGroup.position.y = -box.min.y;
            
            // Recalculate bounding box after Y adjustment
            masterGroup.updateMatrixWorld(true);
            const updatedBox = new THREE.Box3().setFromObject(masterGroup);
            
            // BUFFER ZONE: Position object IN FRONT of VP (positive Z direction from VP)
            // VP is at Z = vpZ (negative value)
            // We want the object's FRONT face to be offset from VP by BUFFER_AMOUNT
            const effectiveR = Math.max(state.solidR, state.solidD || state.solidR);
            const BUFFER_AMOUNT = 15; // Extra space to prevent clipping during rotation
            const vpZ = -(effectiveR + BUFFER_AMOUNT + 8);
            
            // Find the object's minimum Z after Y adjustment
            // Align the BACK face of the object with the VP plane
            // (or slightly offset so it never penetrates)
            const objMinZ = updatedBox.min.z;
            
            // Position so that the back face is exactly at VP plane (no penetration)
            masterGroup.position.z += vpZ - objMinZ;
        }
    }
    masterGroup.updateMatrixWorld(true);
}

// ═══════════════════════════════════════════════════════════════════
// DISPLAY TOGGLES
// ═══════════════════════════════════════════════════════════════════

export function toggleGrid(visible) {
    if (_gridHelper) _gridHelper.visible = visible;
}

export function toggleAxes(visible) {
    if (_axesHelper) _axesHelper.visible = visible;
}

export function setOpaqueMode(enabled) {
    _opaqueMode = enabled;
    // Apply to all solid meshes
    if (solidGroup) {
        solidGroup.traverse(child => {
            if (child.isMesh && child.material && child.material.color) {
                child.material.transparent = !enabled;
                child.material.opacity = enabled ? 1.0 : 0.85;
                child.material.needsUpdate = true;
            }
        });
    }
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getControls() { return orbitControls; }
export function getRenderers() { return { renderer }; }
export function getMasterGroup() { return masterGroup; }
export function getSolidGroup() { return solidGroup; }
export function isOpaqueMode() { return _opaqueMode; }
export function updateAxesOverlay() { _updateAxesOverlay(); }  // ← ADD THIS

export function setStatus(msg) {
    const el = document.getElementById('statusText');
    if (el) el.textContent = msg;
}

export function renderLoop() {
    _updateAxesOverlay();
}