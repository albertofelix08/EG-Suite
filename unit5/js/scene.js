/**
 * Scene Setup and Management — v2.0
 * Engineering Graphics Simulator
 *
 * Original: Alberto Felix & Aaron Mcgeo | CSE-A(I)
 * Fix: labelRenderer now exported correctly; blueprint-style background grid.
 */

import * as THREE from '../../common/three.module.js';
import { OrbitControls } from '../../common/OrbitControls.js';
import { CSS2DRenderer } from '../../common/CSS2DRenderer.js';

let scene, camera, renderer, labelRenderer, controls;

export function initScene(canvas) {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe8ecf0);
    scene.fog = new THREE.FogExp2(0xe8ecf0, 0.018);

    // Camera — standard perspective for isometric-like view
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 300);
    camera.position.set(8, 6, 8);
    camera.lookAt(0, 2, 0);

    // WebGL Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(canvas.width || canvas.clientWidth || 800, canvas.height || canvas.clientHeight || 600);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // CSS2D label renderer
    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(canvas.clientWidth || 800, canvas.clientHeight || 600);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.left = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';
    canvas.parentNode.appendChild(labelRenderer.domElement);

    // Orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.target.set(0, 2, 0);
    controls.update();

    return { scene, camera, renderer, labelRenderer, controls };
}

export function setupLighting() {
    // Ambient — soft fill
    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambient);

    // Key light — main directional (top-right-front)
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(6, 12, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    keyLight.shadow.camera.left = -10;
    keyLight.shadow.camera.right = 10;
    keyLight.shadow.camera.top = 10;
    keyLight.shadow.camera.bottom = -10;
    scene.add(keyLight);

    // Fill light — slightly blue, opposite side
    const fillLight = new THREE.DirectionalLight(0xd0e8ff, 0.3);
    fillLight.position.set(-4, 4, -6);
    scene.add(fillLight);

    // Rim light — warm accent from behind
    const rimLight = new THREE.PointLight(0xffe8cc, 0.25, 30);
    rimLight.position.set(-3, 8, -5);
    scene.add(rimLight);
}

export function setupReferencePlanes() {
    // HP (Horizontal Plane) grid — main floor
    const hpGrid = new THREE.GridHelper(24, 24, 0x94a3b8, 0xc8d4e0);
    hpGrid.position.set(0, -0.01, 0);
    hpGrid.material.transparent = true;
    hpGrid.material.opacity = 0.5;
    scene.add(hpGrid);

    // Minor grid (finer subdivisions)
    const hpGridFine = new THREE.GridHelper(24, 96, 0xdde3ea, 0xdde3ea);
    hpGridFine.position.set(0, -0.005, 0);
    hpGridFine.material.transparent = true;
    hpGridFine.material.opacity = 0.25;
    scene.add(hpGridFine);

    // VP (Vertical Plane) — light translucent plane
    const vpGeo = new THREE.PlaneGeometry(24, 16);
    const vpMat = new THREE.MeshBasicMaterial({
        color: 0xbfcfdf,
        transparent: true,
        opacity: 0.07,
        side: THREE.DoubleSide,
    });
    const vpPlane = new THREE.Mesh(vpGeo, vpMat);
    vpPlane.rotation.x = Math.PI / 2; // vertical
    vpPlane.position.set(0, 8, -0.1);
    vpPlane.rotation.set(0, 0, 0); // XZ plane
    scene.add(vpPlane);

    // Color-coded axes helper
    const axesHelper = new THREE.AxesHelper(10);
    axesHelper.material.transparent = true;
    axesHelper.material.opacity = 0.2;
    scene.add(axesHelper);
}

export function getCamera() { return camera; }
export function getControls() { return controls; }
export function getRenderers() { return { renderer, labelRenderer }; }

export function handleResize(canvas) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    if (camera) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
    if (renderer) renderer.setSize(width, height);
    if (labelRenderer) labelRenderer.setSize(width, height);
}
