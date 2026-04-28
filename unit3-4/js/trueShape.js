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
 * FIX v4: The 2D projection axes are now:
 *   u = x   (world X — the axis that does NOT change with cut tilt)
 *   v = −z·cosθ + (y − cutPos)·sinθ   (in-plane component along slope)
 *
 * This matches the angular sort axes in cutSolid.js so the vertex
 * ordering from computeSectionPoints() maps directly and correctly
 * onto the canvas without self-intersecting edges on oblique cuts.
 */

// ═══════════════════════════════════════════════════════════════════
// DRAWING HELPERS
// ═══════════════════════════════════════════════════════════════════

function drawDimArrow(ctx, ax, ay, bx, by, label, isVert) {
    const arrowSize = 6;
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 0.9;
    ctx.setLineDash([]);

    if (!isVert) {
        // Horizontal dimension
        ctx.beginPath(); ctx.moveTo(ax, ay - 4); ctx.lineTo(ax, ay + 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx, ay - 4); ctx.lineTo(bx, ay + 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ax, ay + 6); ctx.lineTo(bx, ay + 6); ctx.stroke();
        // Left arrowhead
        ctx.beginPath(); ctx.moveTo(ax, ay + 6);
        ctx.lineTo(ax + arrowSize, ay + 6 - arrowSize / 2);
        ctx.lineTo(ax + arrowSize, ay + 6 + arrowSize / 2);
        ctx.closePath(); ctx.fillStyle = '#1a1a2e'; ctx.fill();
        // Right arrowhead
        ctx.beginPath(); ctx.moveTo(bx, ay + 6);
        ctx.lineTo(bx - arrowSize, ay + 6 - arrowSize / 2);
        ctx.lineTo(bx - arrowSize, ay + 6 + arrowSize / 2);
        ctx.closePath(); ctx.fill();
        // Label
        ctx.fillStyle = '#1a1a2e';
        ctx.font = '9px "Courier New",monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, (ax + bx) / 2, ay + 10);
    } else {
        // Vertical dimension
        ctx.beginPath(); ctx.moveTo(bx - 4, ay); ctx.lineTo(bx + 12, ay); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx - 4, by); ctx.lineTo(bx + 12, by); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx + 6, ay); ctx.lineTo(bx + 6, by); ctx.stroke();
        // Top arrowhead
        ctx.beginPath(); ctx.moveTo(bx + 6, ay);
        ctx.lineTo(bx + 6 - arrowSize / 2, ay + arrowSize);
        ctx.lineTo(bx + 6 + arrowSize / 2, ay + arrowSize);
        ctx.closePath(); ctx.fillStyle = '#1a1a2e'; ctx.fill();
        // Bottom arrowhead
        ctx.beginPath(); ctx.moveTo(bx + 6, by);
        ctx.lineTo(bx + 6 - arrowSize / 2, by - arrowSize);
        ctx.lineTo(bx + 6 + arrowSize / 2, by - arrowSize);
        ctx.closePath(); ctx.fill();
        // Label (rotated)
        ctx.save();
        ctx.translate(bx + 18, (ay + by) / 2);
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
    // Paper background with subtle noise
    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = 'rgba(180,160,120,0.05)';
    for (let i = 0; i < 1500; i++) {
        ctx.fillRect(Math.random() * cw, Math.random() * ch, 1, 1);
    }

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
// SOLID NAME HELPER
// ═══════════════════════════════════════════════════════════════════

function solidName(type) {
    const map = {
        hexPrism: 'Hexagonal Prism', pentPrism: 'Pentagonal Prism',
        cylinder: 'Cylinder', cube: 'Cube', cuboid: 'Cuboid',
        hexPyramid: 'Hexagonal Pyramid', pentPyramid: 'Pentagonal Pyramid',
        cone: 'Cone',
    };
    return map[type] || type;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN DRAW FUNCTION
// ═══════════════════════════════════════════════════════════════════

export function drawTrueShape(state) {
    const canvas = state.canvasTrueShape || document.getElementById('canvasTrueShape');
    if (!canvas) return;

    const parent = canvas.parentElement;
    const W = parent ? parent.clientWidth : 800;
    const H = parent ? parent.clientHeight : 600;
    if (!W || !H) return;

    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;

    // ── Paper sheet + title block ──
    const { tbY, tbH } = drawPaperSheet(ctx, cw, ch, 0.45, 0.70, [
        {
            title: 'TRUE SHAPE OF SECTION',
            lines: [solidName(state.solidType).toUpperCase(), `H=${state.solidH}mm  R=${state.solidR}mm`]
        },
        {
            title: 'CUT PARAMETERS',
            lines: [`θ = ${state.cutAngle}°`, `z₀ = ${state.cutPos}mm`]
        },
        {
            title: 'EG-VISUALIZER',
            lines: ['Engineering Graphics', `Vertices: ${state.sectionPts ? state.sectionPts.length : 0}`]
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

    // ── No section fallback ──
    if (!state.sectionPts || state.sectionPts.length < 3) {
        ctx.fillStyle = '#888';
        ctx.font = 'italic 14px "Courier New",monospace';
        ctx.textAlign = 'center';
        ctx.fillText('No section — apply a cut first', cw / 2, (ch - tbH) / 2);
        return;
    }

    // ── Rabatment: project 3D section points onto cutting plane 2D ──
    //
    // The cutting plane's local frame is:
    //   u-axis: world X  (lies in the plane, perpendicular to both the
    //           tilt axis and the plane normal — purely horizontal)
    //   v-axis: in-plane vertical component
    //           v = −z·cosθ + (y − cutPos)·sinθ
    //
    // This matches the angular sort axes in cutSolid.js (FIX v4).
    // The old projection used u=x, v = −z·cosθ + (y−cutPos)·sinθ which
    // was already correct for the drawing but the sort used u=z — now
    // both files agree so the polygon winds without self-intersection.
    const tR = (state.cutAngle * Math.PI) / 180;
    const cosT = Math.cos(tR), sinT = Math.sin(tR);

    const proj2d = state.sectionPts.map(([x, y, z]) => [
        x,                                          // u = X (unchanged)
        -z * cosT + (y - state.cutPos) * sinT,      // v = in-plane vertical
    ]);

    // Bounding box
    let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
    proj2d.forEach(([u, v]) => {
        mnx = Math.min(mnx, u); mxx = Math.max(mxx, u);
        mny = Math.min(mny, v); mxy = Math.max(mxy, v);
    });
    const pw = mxx - mnx || 1, ph = mxy - mny || 1;

    // Drawing area
    const drawArea = { x: 38, y: 72, w: cw - 76, h: ch - 76 - tbH - 10 - 72 };
    const sc = Math.min((drawArea.w - 80) / pw, (drawArea.h - 80) / ph) * 0.82;
    const cx2 = (mnx + mxx) / 2, cy2 = (mny + mxy) / 2;
    const originX = drawArea.x + drawArea.w / 2, originY = drawArea.y + drawArea.h / 2;
    const toSc = (u, v) => [originX + (u - cx2) * sc, originY - (v - cy2) * sc];
    const pts = proj2d.map(([u, v]) => toSc(u, v));

    // ── Centre lines (dash-dot, red) ──
    ctx.setLineDash([8, 4, 2, 4]);
    ctx.strokeStyle = '#cc3333';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(originX - drawArea.w / 2 + 12, originY);
    ctx.lineTo(originX + drawArea.w / 2 - 12, originY);
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

    // ── Vertex dots + labels with leader lines ──
    pts.forEach(([sx, sy], i) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();

        const dx = sx - originX, dy = sy - originY;
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

    // ── Dimension arrows ──
    const allX = pts.map(p => p[0]), allY = pts.map(p => p[1]);
    const bL = Math.min(...allX), bR = Math.max(...allX);
    const bT = Math.min(...allY), bBot = Math.max(...allY);

    drawDimArrow(ctx, bL, bBot + 28, bR, bBot + 28,
        `↔ ${((bR - bL) / sc).toFixed(1)}mm`, false);
    drawDimArrow(ctx, bL, bT, bL - 28, bBot,
        `↕ ${((bBot - bT) / sc).toFixed(1)}mm`, true);
}
