/**
 * Development of Lateral Surfaces — Unit III & IV
 * Engineering Graphics Suite
 * Alberto Felix & Aaron Mcgeo | CSE-A(I)
 *
 * Renders the unfolded lateral surface on a 2D canvas.
 * Supports:
 *   - Full solid development
 *   - Sectioned development (cut line shown in red)
 *   - Animated unroll (0 → 100% over 60 frames)
 *
 * Shape-specific layouts:
 *   Prisms/Cube/Cuboid → N rectangles side-by-side
 *   Pyramids           → N isosceles triangles fanned from apex
 *   Cylinder           → Single rectangle (2πr × h)
 *   Cone               → Circular sector
 *
 * FIX v3:
 *   BUG 1.2 — Paper noise texture regenerated with Math.random() on every
 *             render (including every resize). Flicker is visible. Now pre-
 *             generated once on an offscreen canvas and cached (same fix
 *             as trueShape.js).
 *
 *   BUG 2.1 — Dispatcher used string.includes('Prism') / includes('Pyramid')
 *             which is a case-sensitive partial match. New types triPrism,
 *             triPyramid, squarePyramid all use camelCase and none of them
 *             matched. All solids now dispatched with explicit type keys.
 *
 *   BUG 4.1 — drawPrismDev() only handled hexPrism/pentPrism explicitly;
 *             triPrism (n=3) was not covered. Now n is derived for all
 *             N-sided prism types from a shared lookup table.
 *
 *   BUG 4.2 — drawPyramidDev() hard-coded n=5 or n=6. squarePyramid (n=4)
 *             and triPyramid (n=3) were silently unhandled. Same lookup
 *             table approach used.
 *
 *   Previous fixes (v2, kept):
 *   BUG 1 — Cube and Cuboid were silently skipped by the dispatcher.
 *   BUG 2 — computeSectionPoints() called async before drawing.
 *   BUG 3 — Cone cut line z-depth computed with wrong angle parameterisation.
 *   BUG 4 — No "apply a cut first" fallback in sectioned mode.
 */

import { solidName } from './solids.js';
import { computeSectionPoints } from './cutSolid.js';

// ═══════════════════════════════════════════════════════════════════
// NOISE TEXTURE CACHE  (same cache as trueShape.js — no flicker)
// ═══════════════════════════════════════════════════════════════════

let _noiseCanvas = null;

function getNoiseCanvas(w, h) {
    if (
        _noiseCanvas &&
        Math.abs(_noiseCanvas.width - w) <= 4 &&
        Math.abs(_noiseCanvas.height - h) <= 4
    ) {
        return _noiseCanvas;
    }
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(180,160,120,0.05)';
    for (let i = 0; i < 1500; i++) {
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
    _noiseCanvas = c;
    return c;
}

// ═══════════════════════════════════════════════════════════════════
// N-SIDED POLYGON HELPERS
// ═══════════════════════════════════════════════════════════════════

/** Number of lateral faces for each solid type */
const FACE_COUNT = {
    triPrism:     3,
    triPyramid:   3,
    cube:         4,
    squarePyramid:4,
    cuboid:       4,
    pentPrism:    5,
    pentPyramid:  5,
    hexPrism:     6,
    hexPyramid:   6,
    cylinder:     null,  // handled separately
    cone:         null,
};

function genPolygonBase(n, r) {
    const pts = [];
    for (let i = 0; i < n; i++) {
        const a = (2 * Math.PI * i) / n - Math.PI / 2;
        pts.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return pts;
}

/** True if the solid type is a prism-family shape (flat-top with uniform height edges) */
function isPrismType(t) {
    return t === 'triPrism' || t === 'pentPrism' || t === 'hexPrism' ||
           t === 'cube' || t === 'cuboid' || t === 'cylinder';
}

/** True if the solid type is a pyramid-family shape (apex-topped) */
function isPyramidType(t) {
    return t === 'triPyramid' || t === 'pentPyramid' || t === 'hexPyramid' ||
           t === 'squarePyramid' || t === 'cone';
}

// ═══════════════════════════════════════════════════════════════════
// DRAWING HELPERS
// ═══════════════════════════════════════════════════════════════════

function drawPaperSheet(ctx, cw, ch, col1Frac, col2Frac, cols) {
    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, cw, ch);

    // FIX 1.2: use cached noise instead of re-randomising on every render
    ctx.drawImage(getNoiseCanvas(cw, ch), 0, 0);

    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 3;
    ctx.strokeRect(18, 18, cw - 36, ch - 36);
    ctx.lineWidth = 1;
    ctx.strokeRect(28, 28, cw - 56, ch - 56);

    const tbH = 44, tbY = ch - 18 - tbH;
    ctx.fillStyle = '#f0ebe0';
    ctx.fillRect(28, tbY, cw - 56, tbH);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1;
    ctx.strokeRect(28, tbY, cw - 56, tbH);

    const dividers = [col1Frac, col2Frac].map(f => 28 + (cw - 56) * f);
    ctx.beginPath();
    dividers.forEach(x => { ctx.moveTo(x, tbY); ctx.lineTo(x, tbY + tbH); });
    ctx.stroke();

    const cellX = [28, ...dividers, cw - 28];
    cols.forEach((col, ci) => {
        const x = (cellX[ci] + cellX[ci + 1]) / 2;
        ctx.fillStyle = '#1a1a2e';
        ctx.textAlign = 'center';
        ctx.font = 'bold 10px "Courier New",monospace';
        ctx.fillText(col.title, x, tbY + 13);
        col.lines.forEach((line, li) => {
            ctx.font = '9px "Courier New",monospace';
            ctx.fillStyle = '#555';
            ctx.fillText(line, x, tbY + 24 + li * 11);
        });
    });

    ctx.font = 'italic 9px "Courier New",monospace';
    ctx.fillStyle = '#999';
    ctx.textAlign = 'right';
    ctx.fillText('NOT TO SCALE', cw - 36, tbY - 6);

    return { tbY, tbH };
}

// ═══════════════════════════════════════════════════════════════════
// DRAWING STYLE SHORTCUTS
// ═══════════════════════════════════════════════════════════════════

function devBlue(ctx)    { ctx.fillStyle = 'rgba(200,220,255,0.18)'; }
function devOutline(ctx) { ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 1.8; ctx.setLineDash([]); }
function devCutLine(ctx) { ctx.strokeStyle = '#cc2222'; ctx.lineWidth = 2; ctx.setLineDash([]); }
function devGenLine(ctx) { ctx.setLineDash([4, 4]); ctx.strokeStyle = '#aaa'; ctx.lineWidth = 0.7; }

// ═══════════════════════════════════════════════════════════════════
// CYLINDER DEVELOPMENT
// ═══════════════════════════════════════════════════════════════════

function drawCylinderDev(ctx, dr, state, sect, tanT, animT) {
    const W = 2 * Math.PI * state.solidR;
    const H = state.solidH;
    const sc = Math.min((dr.w - 60) / W, (dr.h - 50) / H) * 0.85;
    const ox = dr.x + (dr.w - W * sc) / 2;
    const oy = dr.y + dr.h - 20;

    devBlue(ctx);
    ctx.fillRect(ox, oy - H * sc, W * sc * animT, H * sc);

    const lim = Math.floor(12 * animT);
    for (let i = 0; i <= lim; i++) {
        const x = ox + (i / 12) * W * sc;
        devGenLine(ctx);
        ctx.beginPath(); ctx.moveTo(x, oy); ctx.lineTo(x, oy - H * sc); ctx.stroke();
        ctx.setLineDash([]);
        if (animT > 0.99) {
            ctx.fillStyle = '#555';
            ctx.font = '9px "Courier New",monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.round(i * 30)}°`, x, oy + 14);
        }
    }
    devOutline(ctx);
    ctx.strokeRect(ox, oy - H * sc, W * sc * animT, H * sc);

    if (sect) {
        devCutLine(ctx);
        ctx.beginPath();
        const seg = 100, ls = Math.floor(seg * animT);
        for (let i = 0; i <= ls; i++) {
            const a = (i / seg) * 2 * Math.PI;
            const z = state.solidR * Math.sin(a);
            const hC = Math.max(0, Math.min(H, state.cutPos - z * tanT));
            const x = ox + (i / seg) * W * sc;
            const y = oy - hC * sc;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
}

// ═══════════════════════════════════════════════════════════════════
// CONE DEVELOPMENT
// FIX v2 (BUG 3): 3D base-circle angle and development angle are now
// parameterised independently so the cut line oscillation frequency
// is correct for all R:H ratios.
// ═══════════════════════════════════════════════════════════════════

function drawConeDev(ctx, dr, state, sect, tR, tanT, animT) {
    const L = Math.sqrt(state.solidR * state.solidR + state.solidH * state.solidH);
    const sA = (state.solidR / L) * 2 * Math.PI;
    const sc = Math.min((dr.w - 60) / (2 * L), (dr.h - 50) / (L * 1.2)) * 0.85;
    const ox = dr.x + dr.w / 2;
    const oy = dr.y + dr.h - 20;
    const startA = -sA / 2 - Math.PI / 2;
    const endA = startA + sA * Math.max(0.001, animT);

    devBlue(ctx);
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.arc(ox, oy, L * sc, startA, endA);
    ctx.closePath();
    ctx.fill();
    devOutline(ctx);
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.arc(ox, oy, L * sc, startA, endA);
    ctx.closePath();
    ctx.stroke();

    if (animT > 0.99) {
        const nG = 8;
        devGenLine(ctx);
        for (let i = 1; i < nG; i++) {
            const a = startA + (i / nG) * sA;
            ctx.beginPath();
            ctx.moveTo(ox, oy);
            ctx.lineTo(ox + L * sc * Math.cos(a), oy + L * sc * Math.sin(a));
            ctx.stroke();
        }
        ctx.setLineDash([]);
    }

    if (sect) {
        devCutLine(ctx);
        ctx.beginPath();
        const seg = 80, ls = Math.floor(seg * animT);
        for (let i = 0; i <= ls; i++) {
            const t       = i / seg;
            const circleA = t * 2 * Math.PI;           // actual 3D base angle
            const devA    = startA + t * sA;            // angle in development sector
            const z    = state.solidR * Math.sin(circleA);
            const hC   = Math.max(0, Math.min(state.solidH, state.cutPos - z * tanT));
            const ratio = 1 - hC / state.solidH;
            const rD   = ratio * L * sc;
            if (i === 0) ctx.moveTo(ox + rD * Math.cos(devA), oy + rD * Math.sin(devA));
            else         ctx.lineTo(ox + rD * Math.cos(devA), oy + rD * Math.sin(devA));
        }
        ctx.stroke();
    }

    if (animT > 0.99) {
        ctx.fillStyle = '#1a1a2e';
        ctx.font = '10px "Courier New",monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`L=${L.toFixed(1)}`, ox + L * sc * Math.cos(endA) + 6, oy + L * sc * Math.sin(endA));
        ctx.fillText(
            `θs=${(sA * 180 / Math.PI).toFixed(1)}°`,
            ox + L * sc * 0.4 * Math.cos((startA + endA) / 2) - 16,
            oy + L * sc * 0.4 * Math.sin((startA + endA) / 2) + 14
        );
        ctx.textBaseline = 'alphabetic';
    }
}

// ═══════════════════════════════════════════════════════════════════
// PRISM / CUBE / CUBOID DEVELOPMENT
//
// FIX 4.1: triPrism (n=3) now handled via FACE_COUNT lookup table.
// FIX v2 (BUG 1): cube and cuboid routed here from the dispatcher.
// ═══════════════════════════════════════════════════════════════════

function drawPrismDev(ctx, dr, state, sect, tanT, animT) {
    const type = state.solidType;
    const n = FACE_COUNT[type];
    let faceWidths;

    if (type === 'cube') {
        faceWidths = [state.solidR, state.solidR, state.solidR, state.solidR];
    } else if (type === 'cuboid') {
        const w = state.solidR;
        const d = state.solidD || state.solidR;
        faceWidths = [w, d, w, d];
    } else {
        // triPrism (n=3), pentPrism (n=5), hexPrism (n=6)
        const sW = 2 * state.solidR * Math.sin(Math.PI / n);
        faceWidths = Array(n).fill(sW);
    }

    const tW = faceWidths.reduce((a, b) => a + b, 0);
    const H  = state.solidH;
    const sc = Math.min((dr.w - 60) / tW, (dr.h - 50) / H) * 0.85;
    const ox = dr.x + (dr.w - tW * sc) / 2;
    const oy = dr.y + dr.h - 20;

    const base = genPolygonBase(n, state.solidR);

    const ff    = n * animT;
    const faces = Math.floor(ff);
    const frac  = ff - faces;

    const colX = [ox];
    for (let i = 0; i < n; i++) colX.push(colX[i] + faceWidths[i] * sc);

    for (let i = 0; i < faces; i++) {
        const x = colX[i];
        const w = faceWidths[i] * sc;
        devBlue(ctx);
        ctx.fillRect(x, oy - H * sc, w, H * sc);
        devOutline(ctx);
        ctx.strokeRect(x, oy - H * sc, w, H * sc);
        if (animT > 0.99) {
            ctx.fillStyle = '#888';
            ctx.font = '9px "Courier New",monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`F${i + 1}`, x + w / 2, oy + 14);
        }
    }

    if (faces < n && frac > 0) {
        const x = colX[faces];
        const w = faceWidths[faces] * sc * frac;
        devBlue(ctx);
        ctx.fillRect(x, oy - H * sc, w, H * sc);
        devOutline(ctx);
        ctx.strokeRect(x, oy - H * sc, w, H * sc);
    }

    if (sect && animT > 0.01) {
        devCutLine(ctx);
        ctx.beginPath();
        for (let i = 0; i <= faces; i++) {
            const z  = base[i % n][1];
            const hC = Math.max(0, Math.min(H, state.cutPos - z * tanT));
            const x  = colX[i];
            const y  = oy - hC * sc;
            if (i === 0) ctx.moveTo(x, y);
            else         ctx.lineTo(x, y);
        }
        if (faces < n && frac > 0) {
            const z1 = base[faces % n][1];
            const z2 = base[(faces + 1) % n][1];
            const z  = z1 + frac * (z2 - z1);
            const hC = Math.max(0, Math.min(H, state.cutPos - z * tanT));
            ctx.lineTo(colX[faces] + faceWidths[faces] * sc * frac, oy - hC * sc);
        }
        ctx.stroke();
    }
}

// ═══════════════════════════════════════════════════════════════════
// PYRAMID DEVELOPMENT
//
// FIX 4.2: n is now derived from FACE_COUNT, covering triPyramid (n=3)
// and squarePyramid (n=4) in addition to pent (n=5) and hex (n=6).
// ═══════════════════════════════════════════════════════════════════

function drawPyramidDev(ctx, dr, state, sect, tR, tanT, animT) {
    const type = state.solidType;
    // FIX 4.2: use shared FACE_COUNT lookup, not hard-coded n=5/6
    const n  = FACE_COUNT[type] || 4;
    const sW = 2 * state.solidR * Math.sin(Math.PI / n);
    const L  = Math.sqrt(state.solidR * state.solidR + state.solidH * state.solidH);
    const sA = sW / L;
    const tA = n * sA;
    const sc = Math.min((dr.w - 60) / (2 * L), (dr.h - 50) / (L * 1.1)) * 0.85;
    const ox = dr.x + dr.w / 2;
    const oy = dr.y + dr.h - 20;
    const startA = -tA / 2 - Math.PI / 2;

    const ff    = n * animT;
    const faces = Math.floor(ff);
    const frac  = ff - faces;

    for (let i = 0; i < faces; i++) {
        const a1 = startA + i * sA;
        const a2 = a1 + sA;
        devBlue(ctx);
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.arc(ox, oy, L * sc, a1, a2);
        ctx.closePath();
        ctx.fill();
        devOutline(ctx);
        ctx.stroke();
        if (animT > 0.99) {
            const am = (a1 + a2) / 2;
            ctx.fillStyle = '#888';
            ctx.font = '9px "Courier New",monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`F${i + 1}`, ox + L * sc * 0.62 * Math.cos(am), oy + L * sc * 0.62 * Math.sin(am));
        }
    }

    if (faces < n && frac > 0) {
        const a1 = startA + faces * sA;
        const a2 = a1 + frac * sA;
        devBlue(ctx);
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.arc(ox, oy, L * sc, a1, a2);
        ctx.closePath();
        ctx.fill();
        devOutline(ctx);
        ctx.stroke();
    }

    if (animT > 0.99) {
        devGenLine(ctx);
        for (let i = 0; i <= n; i++) {
            const a = startA + i * sA;
            ctx.beginPath();
            ctx.moveTo(ox, oy);
            ctx.lineTo(ox + L * sc * Math.cos(a), oy + L * sc * Math.sin(a));
            ctx.stroke();
        }
        ctx.setLineDash([]);
    }

    if (sect && animT > 0.01) {
        devCutLine(ctx);
        ctx.beginPath();
        const base = genPolygonBase(n, state.solidR);
        for (let i = 0; i <= faces; i++) {
            const z  = base[i % n][1];
            const hC = Math.max(0, Math.min(state.solidH, state.cutPos - z * tanT));
            const ratio = 1 - hC / state.solidH;
            const rD = ratio * L * sc;
            const aD = startA + (i / n) * tA;
            if (i === 0) ctx.moveTo(ox + rD * Math.cos(aD), oy + rD * Math.sin(aD));
            else         ctx.lineTo(ox + rD * Math.cos(aD), oy + rD * Math.sin(aD));
        }
        if (faces < n && frac > 0) {
            const z1 = base[faces % n][1];
            const z2 = base[(faces + 1) % n][1];
            const z  = z1 + frac * (z2 - z1);
            const hC = Math.max(0, Math.min(state.solidH, state.cutPos - z * tanT));
            const ratio = 1 - hC / state.solidH;
            const rD = ratio * L * sc;
            const aD = startA + ((faces + frac) / n) * tA;
            ctx.lineTo(ox + rD * Math.cos(aD), oy + rD * Math.sin(aD));
        }
        ctx.stroke();
    }

    if (animT > 0.99) {
        const tipA = startA + tA;
        ctx.fillStyle = '#1a1a2e';
        ctx.font = '10px "Courier New",monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`L=${L.toFixed(1)}`, ox + L * sc * Math.cos(tipA) + 6, oy + L * sc * Math.sin(tipA));
        ctx.textBaseline = 'alphabetic';
    }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN DISPATCHER
//
// FIX 2.1: Dispatcher now uses isPrismType() and isPyramidType() helper
// functions with explicit key lists instead of case-sensitive .includes()
// string matching. Previously triPrism, triPyramid, squarePyramid all
// failed silently because none of them matched 'Prism' or 'Pyramid'
// (wrong case — the types are camelCase, not PascalCase).
//
// FIX v2 (BUG 2) kept: computeSectionPoints() called synchronously via
// dynamic import (resolves from module cache after first call).
// FIX v2 (BUG 4) kept: "apply a cut first" fallback in sectioned mode.
// ═══════════════════════════════════════════════════════════════════

export function drawDevelopment(state, animT = 1) {
    const canvas = state.canvasDev || document.getElementById('canvasDev');
    if (!canvas) return;

    // Walk up the DOM to find real dimensions — the immediate parent may be
    // a tab-content with display:none (0x0) if the tab hasn't been visited yet.
    // This mirrors the same fix already applied in trueShape.js.
    let W = 0, H = 0;
    let el = canvas.parentElement;
    while (el) {
        W = el.clientWidth;
        H = el.clientHeight;
        if (W && H) break;
        el = el.parentElement;
    }
    if (!W) W = canvas.offsetParent ? canvas.offsetParent.clientWidth : 800;
    if (!H) H = canvas.offsetParent ? canvas.offsetParent.clientHeight : 600;
    if (!W) W = 800;
    if (!H) H = 600;

    canvas.width = W;
    canvas.height = H;

    if (typeof animT !== 'number') animT = 1;

    let devMode = 'full';
    const checkedRadio = document.querySelector('input[name="devMode"]:checked');
    if (checkedRadio) devMode = checkedRadio.value;
    const isSect = devMode === 'sectioned';

    // Synchronous now that cutSolid.js is a static import.
    // Previously used import().then() which broke the unroll animation: each
    // rAF frame launched a new async promise, frames resolved out-of-order,
    // and canvas dimensions were reset between frames — animation appeared frozen.
    if (isSect) computeSectionPoints(state);
    _drawDevelopmentSync(canvas, state, isSect, animT);
}

function _drawDevelopmentSync(canvas, state, isSect, animT) {
    const ctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;

    const tR   = (state.cutAngle * Math.PI) / 180;
    const tanT = Math.tan(tR);

    const { tbY, tbH } = drawPaperSheet(ctx, cw, ch, 0.5, 0.75, [
        {
            title: 'DEVELOPMENT OF LATERAL SURFACE',
            lines: [solidName(state.solidType).toUpperCase()]
        },
        {
            title: 'PARAMETERS',
            lines: [`θ=${state.cutAngle}°  z₀=${state.cutPos}mm`, isSect ? 'SECTIONED' : 'FULL SOLID']
        },
        {
            title: 'EG-VISUALIZER',
            lines: ['Engineering Graphics']
        }
    ]);

    ctx.fillStyle = '#1a1a2e';
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px "Courier New",monospace';
    ctx.fillText('DEVELOPMENT OF LATERAL SURFACE', cw / 2, 46);
    ctx.font = '10px "Courier New",monospace';
    ctx.fillStyle = '#555';
    ctx.fillText(
        solidName(state.solidType).toUpperCase() + (isSect ? ' — SECTIONED' : ' — FULL SOLID'),
        cw / 2, 62
    );

    // FIX (BUG 4): No-cut fallback for sectioned mode
    if (isSect && (!state._localSectionPts || state._localSectionPts.length < 3)) {
        ctx.fillStyle = '#888';
        ctx.font = 'italic 14px "Courier New",monospace';
        ctx.textAlign = 'center';
        ctx.fillText('No section — apply a cut first', cw / 2, tbY / 2 + 40);
        return;
    }

    const drawRegion = { x: 28, y: 72, w: cw - 56, h: tbY - 72 - 10 };

    const type = state.solidType;

    // FIX 2.1: explicit type dispatch instead of fragile .includes() string match
    if (type === 'cylinder') {
        drawCylinderDev(ctx, drawRegion, state, isSect, tanT, animT);
    } else if (type === 'cone') {
        drawConeDev(ctx, drawRegion, state, isSect, tR, tanT, animT);
    } else if (isPrismType(type)) {
        drawPrismDev(ctx, drawRegion, state, isSect, tanT, animT);
    } else if (isPyramidType(type)) {
        drawPyramidDev(ctx, drawRegion, state, isSect, tR, tanT, animT);
    } else {
        ctx.fillStyle = '#888';
        ctx.font = 'italic 13px "Courier New",monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`Development not available for: ${type}`, cw / 2, tbY / 2 + 40);
    }
}

// ═══════════════════════════════════════════════════════════════════
// ANIMATED UNROLL
// ═══════════════════════════════════════════════════════════════════

export function animateUnroll(state) {
    import('./scene.js').then(m => m.setStatus('Unrolling...'));

    let frame = 0;
    const total = 60;

    function easeInOut(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function step() {
        frame++;
        const t = easeInOut(Math.min(1, frame / total));
        drawDevelopment(state, t);
        if (frame < total) {
            requestAnimationFrame(step);
        } else {
            import('./scene.js').then(m => m.setStatus('Unroll complete'));
        }
    }

    step();
}