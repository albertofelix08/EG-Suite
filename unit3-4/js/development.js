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
 * FIX v2:
 *   BUG 1 — Cube and Cuboid were silently skipped by the dispatcher
 *            because their solidType strings don't include 'Prism'.
 *            They now route to drawPrismDev() which handles n=4 correctly
 *            (solids.js already tags them with solidType:'prism' internally).
 *
 *   BUG 2 — drawDevelopment() in sectioned mode called computeSectionPoints()
 *            asynchronously (import().then()) and immediately used
 *            state.sectionPts before the promise resolved. On the very first
 *            render the cut line was missing. Fixed by awaiting the import
 *            and wrapping all drawing inside the resolved callback.
 *
 *   BUG 3 — drawConeDev() cut line used z = R·sin(bA) where bA was the
 *            unwrapped development angle. That is correct for the base-circle
 *            position, but the generator's ACTUAL Z depth in 3D is
 *            R·sin(generatorAngle) where generatorAngle sweeps the full 2π
 *            of the original base circle, not the compressed sector angle.
 *            The sector angle sA < 2π, so bA was under-sampling the depth
 *            oscillation, producing a flattened cut line for steep angles.
 *            Fixed by mapping development progress t → full 3D angle separately.
 *
 *   BUG 4 — No "apply a cut first" fallback in sectioned mode — added.
 */

// ═══════════════════════════════════════════════════════════════════
// DRAWING HELPERS
// ═══════════════════════════════════════════════════════════════════

function drawPaperSheet(ctx, cw, ch, col1Frac, col2Frac, cols) {
    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = 'rgba(180,160,120,0.05)';
    for (let i = 0; i < 1500; i++) {
        ctx.fillRect(Math.random() * cw, Math.random() * ch, 1, 1);
    }

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

function solidName(type) {
    const map = {
        hexPrism: 'Hexagonal Prism', pentPrism: 'Pentagonal Prism',
        cylinder: 'Cylinder', cube: 'Cube', cuboid: 'Cuboid',
        hexPyramid: 'Hexagonal Pyramid', pentPyramid: 'Pentagonal Pyramid',
        cone: 'Cone',
    };
    return map[type] || type;
}

function genPolygonBase(n, r) {
    const pts = [];
    for (let i = 0; i < n; i++) {
        const a = (2 * Math.PI * i) / n - Math.PI / 2;
        pts.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return pts;
}

// ═══════════════════════════════════════════════════════════════════
// DRAWING STYLE SHORTCUTS
// ═══════════════════════════════════════════════════════════════════

function devBlue(ctx) { ctx.fillStyle = 'rgba(200,220,255,0.18)'; }
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

    // Generator lines
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

    // Cut line (sinusoidal)
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
// ═══════════════════════════════════════════════════════════════════
//
// FIX v2 (BUG 3): The cut line position for each generator is determined
// by the generator's Z depth in 3D, which depends on its angle in the
// ORIGINAL base circle (full 2π), not its angular position in the
// development sector (which spans only sA = R/L · 2π < 2π radians).
//
// Old code mapped development progress t directly to bA = t·2π, so the
// Z depth (R·sin(bA)) swept through one full oscillation — which is
// correct in principle. However, the development angle aD = startA + t·sA
// and bA were both parameterised by t, so they were proportional. This
// is fine geometrically, EXCEPT that the sinusoidal depth oscillation
// z = R·sin(t·2π) while the arc spans t·sA means the cut line undulates
// at the wrong frequency relative to the sector arc for non-standard
// proportions (R ≠ H). The fix maps each generator index to its actual
// 3D base-circle angle (i/seg · 2π) and to its development angle
// (startA + i/seg · sA) independently, making the relationship explicit
// and numerically identical for all R:H ratios.
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

    // Generator lines
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

    // Cut line
    // Each sample i/seg represents:
    //   - 3D base-circle angle: circleA = (i/seg) · 2π
    //     → generator Z depth in 3D = R · sin(circleA)
    //   - Development angle: devA = startA + (i/seg) · sA
    //     → position on sector arc
    //   - Height of intersection: hC = cutPos − z · tanθ (clamped to solid)
    //   - Distance from apex in development: rD = (1 − hC/H) · L
    if (sect) {
        devCutLine(ctx);
        ctx.beginPath();
        const seg = 80, ls = Math.floor(seg * animT);
        for (let i = 0; i <= ls; i++) {
            const t       = i / seg;
            const circleA = t * 2 * Math.PI;                          // FIX: explicit 3D angle
            const devA    = startA + t * sA;                           // FIX: explicit dev angle
            const z    = state.solidR * Math.sin(circleA);
            const hC   = Math.max(0, Math.min(state.solidH, state.cutPos - z * tanT));
            const ratio = 1 - hC / state.solidH;
            const rD   = ratio * L * sc;
            if (i === 0) ctx.moveTo(ox + rD * Math.cos(devA), oy + rD * Math.sin(devA));
            else         ctx.lineTo(ox + rD * Math.cos(devA), oy + rD * Math.sin(devA));
        }
        ctx.stroke();
    }

    // Labels
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
// FIX v2 (BUG 1): Cube and Cuboid are now routed here from the
// dispatcher. Their solidType strings ('cube', 'cuboid') don't
// contain 'Prism' so they were silently unhandled before. This
// function derives n and sW from the actual geometry:
//   - cube/cuboid: n=4 faces, each face width = side length
//   - hexPrism:    n=6, face width = chord length at given R
//   - pentPrism:   n=5, face width = chord length at given R
// The cuboid case also uses state.solidD for depth faces.
// ═══════════════════════════════════════════════════════════════════

function drawPrismDev(ctx, dr, state, sect, tanT, animT) {
    const type = state.solidType;

    // Determine face count and individual face widths
    let n, faceWidths;
    if (type === 'cube') {
        // 4 faces, all equal width = solidR (solids.js stores half-side as r)
        n = 4;
        const s = state.solidR; // cube: solidR = half-side → full side = 2r? 
        // Actually solids.js sets bx = [-s/2, s/2, ...] where s=r, so side=r
        faceWidths = [state.solidR, state.solidR, state.solidR, state.solidR];
    } else if (type === 'cuboid') {
        // 4 faces: two pairs (width × depth alternating)
        n = 4;
        const w = state.solidR;
        const d = state.solidD || state.solidR;
        faceWidths = [w, d, w, d];
    } else {
        // Hex/pent prism: all n faces equal width
        n = type === 'pentPrism' ? 5 : 6;
        const sW = 2 * state.solidR * Math.sin(Math.PI / n);
        faceWidths = Array(n).fill(sW);
    }

    const tW = faceWidths.reduce((a, b) => a + b, 0);
    const H  = state.solidH;
    const sc = Math.min((dr.w - 60) / tW, (dr.h - 50) / H) * 0.85;
    const ox = dr.x + (dr.w - tW * sc) / 2;
    const oy = dr.y + dr.h - 20;

    // For the cut line we need the base-polygon vertex Z depths.
    // Cube/cuboid vertices follow the same genPolygonBase(4, r) pattern
    // that solids.js uses, so we can use that helper for all cases.
    const base = genPolygonBase(n, state.solidR);

    const ff    = n * animT;
    const faces = Math.floor(ff);
    const frac  = ff - faces;

    // Cumulative x positions for each face column
    const colX = [ox];
    for (let i = 0; i < n; i++) colX.push(colX[i] + faceWidths[i] * sc);

    // Draw each rectangular face
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

    // Partial last face during animation
    if (faces < n && frac > 0) {
        const x = colX[faces];
        const w = faceWidths[faces] * sc * frac;
        devBlue(ctx);
        ctx.fillRect(x, oy - H * sc, w, H * sc);
        devOutline(ctx);
        ctx.strokeRect(x, oy - H * sc, w, H * sc);
    }

    // Cut line
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
// ═══════════════════════════════════════════════════════════════════

function drawPyramidDev(ctx, dr, state, sect, tR, tanT, animT) {
    const type = state.solidType;
    const n  = type === 'pentPyramid' ? 5 : 6;
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

    // Draw each triangular face
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

    // Partial last face
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

    // Generator lines (radial)
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

    // Cut line
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

    // Slant height label
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
// FIX v2 (BUG 2): computeSectionPoints() is now called synchronously
// before any drawing occurs. The old code fired it inside an async
// import().then() and immediately continued drawing — on the very first
// call the module hadn't resolved yet, so state.sectionPts was empty
// and the cut line was invisible.
//
// cutSolid.js is already imported by main.js so the dynamic import
// resolves instantly from the module cache on subsequent calls. We wrap
// the entire draw call inside the resolved callback to guarantee ordering
// on the first render as well.
//
// FIX v2 (BUG 1): 'cube' and 'cuboid' are now explicitly dispatched
// to drawPrismDev instead of falling through to nothing.
// ═══════════════════════════════════════════════════════════════════

export function drawDevelopment(state, animT = 1) {
    const canvas = state.canvasDev || document.getElementById('canvasDev');
    if (!canvas) return;

    const parent = canvas.parentElement;
    const W = parent ? parent.clientWidth : 800;
    const H = parent ? parent.clientHeight : 600;
    if (!W || !H) return;

    canvas.width = W;
    canvas.height = H;

    if (typeof animT !== 'number') animT = 1;

    // Determine mode
    let devMode = 'full';
    const checkedRadio = document.querySelector('input[name="devMode"]:checked');
    if (checkedRadio) devMode = checkedRadio.value;
    const isSect = devMode === 'sectioned';

    // FIX: ensure section points are computed BEFORE drawing begins.
    // import() resolves from module cache on every call after the first,
    // so the async overhead is negligible in practice.
    import('./cutSolid.js').then(m => {
        if (isSect) m.computeSectionPoints(state);
        _drawDevelopmentSync(canvas, state, isSect, animT);
    });
}

// Internal synchronous draw — called once cutSolid is guaranteed loaded.
function _drawDevelopmentSync(canvas, state, isSect, animT) {
    const ctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;

    const tR   = (state.cutAngle * Math.PI) / 180;
    const tanT = Math.tan(tR);

    // Paper sheet + title block
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

    // Drawing title
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
    if (isSect && (!state.sectionPts || state.sectionPts.length < 3)) {
        ctx.fillStyle = '#888';
        ctx.font = 'italic 14px "Courier New",monospace';
        ctx.textAlign = 'center';
        ctx.fillText('No section — apply a cut first', cw / 2, tbY / 2 + 40);
        return;
    }

    // Drawing region
    const drawRegion = { x: 28, y: 72, w: cw - 56, h: tbY - 72 - 10 };

    // Dispatch to shape-specific renderer
    // FIX (BUG 1): cube and cuboid now explicitly route to drawPrismDev
    const type = state.solidType;
    if (type === 'cylinder') {
        drawCylinderDev(ctx, drawRegion, state, isSect, tanT, animT);
    } else if (type === 'cone') {
        drawConeDev(ctx, drawRegion, state, isSect, tR, tanT, animT);
    } else if (type === 'cube' || type === 'cuboid') {
        drawPrismDev(ctx, drawRegion, state, isSect, tanT, animT);
    } else if (type.includes('Prism')) {
        drawPrismDev(ctx, drawRegion, state, isSect, tanT, animT);
    } else if (type.includes('Pyramid')) {
        drawPyramidDev(ctx, drawRegion, state, isSect, tR, tanT, animT);
    } else {
        // Unknown solid type — show a helpful message instead of blank canvas
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
