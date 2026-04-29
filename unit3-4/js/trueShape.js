/**
 * True Shape of Section — Unit III & IV
 * Engineering Graphics Suite
 * Alberto Felix & Aaron Mcgeo | CSE-A(I)
 *
 * Renders the true shape of the cut section on a 2D canvas.
 * Uses rabatment: projects 3D section points onto the cutting plane's
 * local 2D coordinate system, preserving true distances.
 *
 * Drawing follows engineering drawing conventions:
 *   - Paper sheet with title block
 *   - Centre lines (dash-dot, red)
 *   - 45° cross-hatching on the section face
 *   - Heavy object line for the section outline
 *   - Vertex labels with leader lines
 *   - Dimension arrows (width & height)
 *
 * FIX v5:
 *   BUG 1.1 — Use _localSectionPts instead of sectionPts.
 *             sectionPts are world-space (masterGroup transform already applied).
 *             drawTrueShape() re-applies the cut-angle formula on top of those,
 *             causing a double-rotation for VP mode or any axisRot != 0.
 *             Local space is the canonical frame the formula was designed for.
 *
 *   BUG 1.2 — Paper noise texture was regenerated with Math.random() on every
 *             single render call (including every resize), causing visible flicker.
 *             Now pre-generated once on an offscreen canvas and cached.
 *
 *   BUG 1.3 — Dimension arrows were placed at bBot+28 / bL−28 with no bounds
 *             check, clipping outside the paper border for large shapes or small
 *             canvas panels. Now clamped inside drawArea.
 *
 *   BUG 1.4 — Vertex leader lines radiated from the canvas center origin, not
 *             from the polygon centroid — caused stacking/crossing on concave
 *             cuts. Now computed from the polygon's own centroid.
 *
 *   BUG 1.6 — Added inline "Apply Cut" button when no section is present, so
 *             the user doesn't have to switch back to the 3D tab.
 *
 *   BUG 1.7 — Title block now shows solidD for cuboids ("D=Xmm" appended).
 */

import { solidName } from './solids.js';

// ═══════════════════════════════════════════════════════════════════
// NOISE TEXTURE CACHE  (fixes flicker — generated once, reused)
// ═══════════════════════════════════════════════════════════════════

let _noiseCanvas = null;

function getNoiseCanvas(w, h) {
    // Re-generate only if size changes materially (>4px difference)
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
// DRAWING HELPERS
// ═══════════════════════════════════════════════════════════════════

function drawDimArrow(ctx, ax, ay, bx, by, label, isVert, drawArea) {
    const arrowSize = 6;
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 0.9;
    ctx.setLineDash([]);

    // Clamp offset positions to stay inside the drawArea
    const daRight  = drawArea.x + drawArea.w;
    const daBottom = drawArea.y + drawArea.h;

    if (!isVert) {
        // Horizontal dimension — placed below the shape
        const dimY = Math.min(ay + 28, daBottom - 8);
        ctx.beginPath(); ctx.moveTo(ax, dimY - 8); ctx.lineTo(ax, dimY + 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx, dimY - 8); ctx.lineTo(bx, dimY + 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ax, dimY); ctx.lineTo(bx, dimY); ctx.stroke();
        // Left arrowhead
        ctx.beginPath(); ctx.moveTo(ax, dimY);
        ctx.lineTo(ax + arrowSize, dimY - arrowSize / 2);
        ctx.lineTo(ax + arrowSize, dimY + arrowSize / 2);
        ctx.closePath(); ctx.fillStyle = '#1a1a2e'; ctx.fill();
        // Right arrowhead
        ctx.beginPath(); ctx.moveTo(bx, dimY);
        ctx.lineTo(bx - arrowSize, dimY - arrowSize / 2);
        ctx.lineTo(bx - arrowSize, dimY + arrowSize / 2);
        ctx.closePath(); ctx.fill();
        // Label
        ctx.fillStyle = '#1a1a2e';
        ctx.font = '9px "Courier New",monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, (ax + bx) / 2, dimY + 4);
    } else {
        // Vertical dimension — placed to the left of the shape
        const dimX = Math.max(ax - 28, drawArea.x + 8);
        ctx.beginPath(); ctx.moveTo(dimX - 8, ay); ctx.lineTo(dimX + 8, ay); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(dimX - 8, by); ctx.lineTo(dimX + 8, by); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(dimX, ay); ctx.lineTo(dimX, by); ctx.stroke();
        // Top arrowhead
        ctx.beginPath(); ctx.moveTo(dimX, ay);
        ctx.lineTo(dimX - arrowSize / 2, ay + arrowSize);
        ctx.lineTo(dimX + arrowSize / 2, ay + arrowSize);
        ctx.closePath(); ctx.fillStyle = '#1a1a2e'; ctx.fill();
        // Bottom arrowhead
        ctx.beginPath(); ctx.moveTo(dimX, by);
        ctx.lineTo(dimX - arrowSize / 2, by - arrowSize);
        ctx.lineTo(dimX + arrowSize / 2, by - arrowSize);
        ctx.closePath(); ctx.fill();
        // Label (rotated)
        ctx.save();
        ctx.translate(dimX - 10, (ay + by) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.font = '9px "Courier New",monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, 0, 0);
        ctx.restore();
    }
    ctx.textBaseline = 'alphabetic';
}

function drawPaperSheet(ctx, cw, ch, col1Frac, col2Frac, cols) {
    // Paper background
    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, cw, ch);

    // Cached noise texture (no flicker on resize)
    ctx.drawImage(getNoiseCanvas(cw, ch), 0, 0);

    // Outer border
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 3;
    ctx.strokeRect(18, 18, cw - 36, ch - 36);
    // Inner border
    ctx.lineWidth = 1;
    ctx.strokeRect(28, 28, cw - 56, ch - 56);

    // Title block
    const tbH = 44, tbY = ch - 18 - tbH;
    ctx.fillStyle = '#f0ebe0';
    ctx.fillRect(28, tbY, cw - 56, tbH);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1;
    ctx.strokeRect(28, tbY, cw - 56, tbH);

    // Column dividers
    const dividers = [col1Frac, col2Frac].map(f => 28 + (cw - 56) * f);
    ctx.beginPath();
    dividers.forEach(x => { ctx.moveTo(x, tbY); ctx.lineTo(x, tbY + tbH); });
    ctx.stroke();

    // Column content
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

    // "NOT TO SCALE" note
    ctx.font = 'italic 9px "Courier New",monospace';
    ctx.fillStyle = '#999';
    ctx.textAlign = 'right';
    ctx.fillText('NOT TO SCALE', cw - 36, tbY - 6);

    return { tbY, tbH };
}

// ═══════════════════════════════════════════════════════════════════
// INLINE "APPLY CUT" BUTTON  (fixes bug 1.6)
// Registers a one-time click handler on the canvas element.
// ═══════════════════════════════════════════════════════════════════

let _ctaBound = false;

function drawApplyCutCTA(ctx, canvas, cw, ch, tbH) {
    const btnW = 160, btnH = 32;
    const btnX = (cw - btnW) / 2;
    const btnY = (ch - tbH) / 2 + 10;

    // Draw placeholder message
    ctx.fillStyle = '#888';
    ctx.font = 'italic 14px "Courier New",monospace';
    ctx.textAlign = 'center';
    ctx.fillText('No section — apply a cut first', cw / 2, (ch - tbH) / 2 - 10);

    // Draw button
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 6);
    ctx.fill();
    ctx.fillStyle = '#f5f0e8';
    ctx.font = 'bold 11px "Courier New",monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✂  Apply Cut', btnX + btnW / 2, btnY + btnH / 2);
    ctx.textBaseline = 'alphabetic';

    // Wire up click only once per canvas lifetime
    if (!_ctaBound) {
        _ctaBound = true;
        canvas.addEventListener('click', function handleClick(e) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const cx = (e.clientX - rect.left) * scaleX;
            const cy = (e.clientY - rect.top)  * scaleY;
            if (cx >= btnX && cx <= btnX + btnW && cy >= btnY && cy <= btnY + btnH) {
                // Trigger the main applyCutBtn if it exists
                const applyBtn = document.getElementById('applyCutBtn');
                if (applyBtn) applyBtn.click();
                canvas.removeEventListener('click', handleClick);
                _ctaBound = false;
            }
        });
    }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN DRAW FUNCTION
// ═══════════════════════════════════════════════════════════════════

export function drawTrueShape(state) {
    const canvas = state.canvasTrueShape || document.getElementById('canvasTrueShape');
    if (!canvas) return;

    // Walk up the DOM to find real dimensions — the immediate parent may be
    // a tab-content with display:none (0×0) if the tab hasn't been visited yet.
    let W = 0, H = 0;
    let el = canvas.parentElement;
    while (el) {
        W = el.clientWidth;
        H = el.clientHeight;
        if (W && H) break;
        el = el.parentElement;
    }
    // Last-resort fallback so the drawing is never silently skipped
    if (!W) W = canvas.offsetParent ? canvas.offsetParent.clientWidth : 800;
    if (!H) H = canvas.offsetParent ? canvas.offsetParent.clientHeight : 600;
    if (!W) W = 800;
    if (!H) H = 600;

    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;

    // ── Build dimension line for title block ──
    // Show W×D×H for cuboids so solidD appears (fixes bug 1.7)
    const isCuboid = state.solidType === 'cuboid';
    const dimLine = isCuboid
        ? `W=${state.solidR}mm  D=${state.solidD}mm  H=${state.solidH}mm`
        : `H=${state.solidH}mm  R=${state.solidR}mm`;

    // ── Paper sheet + title block ──
    const { tbY, tbH } = drawPaperSheet(ctx, cw, ch, 0.45, 0.70, [
        {
            title: 'TRUE SHAPE OF SECTION',
            lines: [solidName(state.solidType).toUpperCase(), dimLine]
        },
        {
            title: 'CUT PARAMETERS',
            lines: [`θ = ${state.cutAngle}°`, `z₀ = ${state.cutPos}mm`]
        },
        {
            title: 'EG-VISUALIZER',
            lines: ['Engineering Graphics', `Vertices: ${state._localSectionPts ? state._localSectionPts.length : 0}`]
        }
    ]);

    // ── Drawing title ──
    ctx.fillStyle = '#1a1a2e';
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px "Courier New",monospace';
    ctx.fillText('TRUE SHAPE OF SECTION', cw / 2, 48);
    ctx.font = '10px "Courier New",monospace';
    ctx.fillStyle = '#555';
    ctx.fillText(
        `${solidName(state.solidType)}  |  θ = ${state.cutAngle}°  |  z₀ = ${state.cutPos}mm`,
        cw / 2, 64
    );

    // ── No section fallback with inline CTA button ──
    // FIX 1.1: use _localSectionPts (local space) not sectionPts (world space)
    const localPts = state._localSectionPts;
    if (!localPts || localPts.length < 3) {
        drawApplyCutCTA(ctx, canvas, cw, ch, tbH);
        return;
    }

    // ── Rabatment: project LOCAL-SPACE section points onto cutting plane 2D ──
    //
    // The cutting plane in cutSolid.js is defined with:
    //   tR = -(cutAngle * PI/180)   [negated]
    //   tanT = tan(tR) = -tanθ
    //   normal = normalize(tanT, 1, 0) = normalize(-tanθ, 1, 0) = (-sinθ, cosθ, 0)
    //   passes through origin point (0, cutPos, 0)
    //
    // Plane equation: -sinθ·x + cosθ·y = cosθ·cutPos → y = cutPos + x·tanθ
    //
    // Orthonormal in-plane basis (derived via cross-product with normal):
    //   u-hat = (0, 0, 1)                ← Z axis lies in the plane (N·Z = 0)
    //   v-hat = N × u-hat = (cosθ, sinθ, 0)  ← in-plane "up" direction
    //
    // 2D coords of point P=(x,y,z) relative to plane origin (0, cutPos, 0):
    //   u = (P - P0) · u-hat = z
    //   v = (P - P0) · v-hat = x·cosθ + (y - cutPos)·sinθ
    //
    // This is a true orthonormal rabatment — all pairwise distances on the
    // cutting plane are exactly preserved in 2D (verified analytically).
    //
    const thetaRad = state.cutAngle * Math.PI / 180;
    const cosT = Math.cos(thetaRad), sinT = Math.sin(thetaRad);

    const proj2d = localPts.map(([x, y, z]) => [
        z,                                          // u = Z (in-plane horizontal axis)
        x * cosT + (y - state.cutPos) * sinT,      // v = in-plane vertical axis
    ]);

    // Bounding box
    let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
    proj2d.forEach(([u, v]) => {
        mnx = Math.min(mnx, u); mxx = Math.max(mxx, u);
        mny = Math.min(mny, v); mxy = Math.max(mxy, v);
    });
    const pw = mxx - mnx || 1, ph = mxy - mny || 1;

    // Drawing area — occupies the full paper space between header text and title block.
    // tbY is the top of the title block; usable zone is from y=74 down to tbY-8.
    const daTop    = 74;
    const daBottom = tbY - 8;
    const daLeft   = 44;
    const daRight  = cw - 44;
    const drawArea = { x: daLeft, y: daTop, w: daRight - daLeft, h: daBottom - daTop };

    // Scale to fit with a comfortable margin, centred within drawing area
    const margin = 60;
    const sc = Math.min((drawArea.w - margin * 2) / pw, (drawArea.h - margin * 2) / ph);
    const cx2 = (mnx + mxx) / 2, cy2 = (mny + mxy) / 2;
    const originX = drawArea.x + drawArea.w / 2;
    const originY = drawArea.y + drawArea.h / 2;
    const toSc = (u, v) => [originX + (u - cx2) * sc, originY - (v - cy2) * sc];
    const pts = proj2d.map(([u, v]) => toSc(u, v));

    // ── Centre lines (dash-dot, red) ──
    ctx.setLineDash([8, 4, 2, 4]);
    ctx.strokeStyle = '#cc3333';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(drawArea.x + 12, originY);
    ctx.lineTo(drawArea.x + drawArea.w - 12, originY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(originX, drawArea.y + 12);
    ctx.lineTo(originX, drawArea.y + drawArea.h - 12);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── 45° cross-hatching ──
    ctx.save();
    ctx.beginPath();
    pts.forEach(([sx, sy], i) => {
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
    });
    ctx.closePath();
    ctx.clip();

    ctx.strokeStyle = 'rgba(100,60,20,0.17)';
    ctx.lineWidth = 0.7;
    const hs = 10;
    const hxMin = Math.min(...pts.map(p => p[0])) - hs;
    const hxMax = Math.max(...pts.map(p => p[0])) + hs;
    const hyMin = Math.min(...pts.map(p => p[1])) - hs;
    const hyMax = Math.max(...pts.map(p => p[1])) + hs;

    for (let d = hxMin - (hyMax - hyMin); d < hxMax + (hyMax - hyMin); d += hs) {
        ctx.beginPath();
        ctx.moveTo(d, hyMin);
        ctx.lineTo(d + (hyMax - hyMin), hyMax);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(d + (hyMax - hyMin), hyMin);
        ctx.lineTo(d, hyMax);
        ctx.stroke();
    }
    ctx.restore();

    // ── Section outline (heavy object line) ──
    ctx.beginPath();
    pts.forEach(([sx, sy], i) => {
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
    });
    ctx.closePath();
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.stroke();

    // ── Vertex dots + labels with leader lines from CENTROID (fixes bug 1.4) ──
    // Use the polygon's own centroid so leaders point outward from the shape,
    // not from the canvas center — prevents crossing/stacking on concave cuts.
    const centX = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const centY = pts.reduce((s, p) => s + p[1], 0) / pts.length;

    pts.forEach(([sx, sy], i) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();

        // Direction from polygon centroid outward to this vertex
        const dx = sx - centX, dy = sy - centY;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = dx / len, ny = dy / len;

        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(sx + nx * 5, sy + ny * 5);
        ctx.lineTo(sx + nx * 24, sy + ny * 24);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#1a1a2e';
        ctx.font = 'bold 11px "Courier New",monospace';
        ctx.textAlign = nx >= 0 ? 'left' : 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(`P${i + 1}`, sx + nx * 27, sy + ny * 24);
    });
    ctx.textBaseline = 'alphabetic';

    // ── Dimension arrows (clamped inside drawArea — fixes bug 1.3) ──
    const allX = pts.map(p => p[0]), allY = pts.map(p => p[1]);
    const bL = Math.min(...allX), bR = Math.max(...allX);
    const bT = Math.min(...allY), bBot = Math.max(...allY);

    drawDimArrow(
        ctx, bL, bBot, bR, bBot,
        `↔ ${((bR - bL) / sc).toFixed(1)}mm`, false, drawArea
    );
    drawDimArrow(
        ctx, bL, bT, bL, bBot,
        `↕ ${((bBot - bT) / sc).toFixed(1)}mm`, true, drawArea
    );
}