/**
 * Projection of Solids — First-Angle Orthographic Projection with Isometric
 * Unit III & IV: Projection of Solids, Section & Development
 * Engineering Graphics Suite
 * Alberto Felix & Aaron Mcgeo | CSE-A(I)
 */

import * as THREE from 'three';
import { getWorldGeometry, buildEdgeVisibility, solidName } from './solids.js';

// solidName is now imported from solids.js — the single source of truth.
// This means triPrism, triPyramid, squarePyramid (and any future types)
// are automatically covered here without any per-file maintenance.

function drawPaperSheet(ctx, cw, ch, col1Frac, col2Frac, cols) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, cw, ch);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, cw - 24, ch - 24);
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, cw - 32, ch - 32);

    const tbH = 44, tbY = ch - 12 - tbH;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(16, tbY, cw - 32, tbH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(16, tbY, cw - 32, tbH);

    const dividers = [col1Frac, col2Frac].map(f => 16 + (cw - 32) * f);
    ctx.beginPath();
    dividers.forEach(x => { ctx.moveTo(x, tbY); ctx.lineTo(x, tbY + tbH); });
    ctx.stroke();

    const cellX = [16, ...dividers, cw - 16];
    cols.forEach((col, ci) => {
        const x = (cellX[ci] + cellX[ci + 1]) / 2;
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.font = 'bold 9px "JetBrains Mono",monospace';
        ctx.fillText(col.title, x, tbY + 14);
        col.lines.forEach((line, li) => {
            ctx.font = '8px "JetBrains Mono",monospace';
            ctx.fillStyle = '#64748b';
            ctx.fillText(line, x, tbY + 25 + li * 10);
        });
    });

    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 7px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('NOT TO SCALE', cw - 30, tbY - 6);

    return { tbY, tbH };
}

// ═══════════════════════════════════════════════════════════════════
// SINGLE VIEW DRAWER
// ═══════════════════════════════════════════════════════════════════

function drawOrthoView(ctx, verts, edges, project2d, visibility, label, sectionPtsWorld, x, y, w, h, isIsometric = false) {
    const pts2d = verts.map(v => project2d(v));

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    pts2d.forEach(([u, v]) => {
        minX = Math.min(minX, u);
        maxX = Math.max(maxX, u);
        minY = Math.min(minY, v);
        maxY = Math.max(maxY, v);
    });

    const bw = maxX - minX || 1;
    const bh = maxY - minY || 1;
    const scale = Math.min((w - 40) / bw, (h - 50) / bh) * 0.85;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const midU = (minX + maxX) / 2;
    const midV = (minY + maxY) / 2;

    const toCanvas = ([u, v]) => [
        cx + (u - midU) * scale,
        cy - (v - midV) * scale
    ];

    // Panel border
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    // Label
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 10px "JetBrains Mono",monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + 16);

    // Centre lines (orthographic only)
    if (!isIsometric) {
        ctx.setLineDash([8, 4, 2, 4]);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(x + 8, cy);
        ctx.lineTo(x + w - 8, cy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, y + 20);
        ctx.lineTo(cx, y + h - 5);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Hidden edges (dashed)
    ctx.setLineDash([5, 3]);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 0.7;
    edges.forEach(([i1, i2]) => {
        const key = Math.min(i1, i2) + ',' + Math.max(i1, i2);
        if (visibility.get(key)) return;
        const [ax, ay] = toCanvas(pts2d[i1]);
        const [bx, by] = toCanvas(pts2d[i2]);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
    });

    // Visible edges (solid)
    ctx.setLineDash([]);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.6;
    edges.forEach(([i1, i2]) => {
        const key = Math.min(i1, i2) + ',' + Math.max(i1, i2);
        if (!visibility.get(key)) return;
        const [ax, ay] = toCanvas(pts2d[i1]);
        const [bx, by] = toCanvas(pts2d[i2]);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
    });
    ctx.setLineDash([]);

    // Section polygon overlay
    if (sectionPtsWorld && sectionPtsWorld.length >= 3) {
        const secPts2d = sectionPtsWorld.map(p => project2d(p));
        const secSc = secPts2d.map(p => toCanvas(p));

        ctx.save();
        ctx.beginPath();
        secSc.forEach(([sx, sy], i) => {
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
        ctx.fill();

        ctx.clip();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.30)';
        ctx.lineWidth = 0.5;
        const span = w + h;
        for (let d = -span; d < span; d += 6) {
            ctx.beginPath();
            ctx.moveTo(x + d, y);
            ctx.lineTo(x + d + h, y + h);
            ctx.stroke();
        }
        ctx.restore();

        ctx.beginPath();
        secSc.forEach(([sx, sy], i) => {
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        });
        ctx.closePath();
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.stroke();
    }
}

// ═══════════════════════════════════════════════════════════════════
// ISOMETRIC VIEW
// ═══════════════════════════════════════════════════════════════════

function drawIsometricView(state, ctx, verts, edges, sectionPtsWorld, px, py, pw, ph) {
    if (!verts.length || !edges.length) {
        ctx.fillStyle = '#64748b';
        ctx.font = 'italic 11px "JetBrains Mono",monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Generate a solid first', px + pw / 2, py + ph / 2);
        return;
    }

    const angle = Math.PI / 6;
    const scale = 0.816;
    const project2d = ([x, y, z]) => [
        (x - z) * Math.cos(angle) * scale,
        (y + (x + z) * Math.sin(angle)) * scale
    ];

    const visibility = new Map();
    edges.forEach(([i1, i2]) => {
        visibility.set(Math.min(i1, i2) + ',' + Math.max(i1, i2), true);
    });

    drawOrthoView(ctx, verts, edges, project2d, visibility, 'ISOMETRIC VIEW',
        sectionPtsWorld, px, py, pw, ph, true);
}

// ═══════════════════════════════════════════════════════════════════
// MAIN DRAW
// ═══════════════════════════════════════════════════════════════════

export function drawProjections(state) {
    const canvas = state.canvasProj || document.getElementById('canvasProj');
    if (!canvas) return;

    const parent = canvas.parentElement;
    const W = parent ? parent.clientWidth : 800;
    const H = parent ? parent.clientHeight : 600;
    if (!W || !H) return;

    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;

    // Projection mode
    const projModeEl = document.querySelector('input[name="projMode"]:checked');
    const sectioned = projModeEl ? projModeEl.value === 'sectioned' : false;

    const cutInfo = document.getElementById('projCutInfo');
    if (cutInfo) {
        const hasCut = state.isCutApplied && state.sectionPts && state.sectionPts.length >= 3;
        cutInfo.style.display = (sectioned && hasCut) ? '' : 'none';
    }

    if (state.masterGroup) state.masterGroup.updateMatrixWorld(true);

    const titleMode = sectioned ? 'SECTIONED VIEWS' : 'PROJECTION OF SOLIDS';

    const isCuboidProj = state.solidType === 'cuboid';
    const dimLineProj  = isCuboidProj
        ? `W=${state.solidR}mm  D=${state.solidD}mm  H=${state.solidH}mm`
        : `H=${state.solidH}mm  R=${state.solidR}mm`;

    const { tbY, tbH } = drawPaperSheet(ctx, cw, ch, 0.5, 0.75, [
        {
            title: titleMode,
            lines: [solidName(state.solidType).toUpperCase(), dimLineProj]
        },
        {
            title: 'AXIS ORIENTATION',
            lines: [
                `∠HP:${state.axisIncHP}°  ∠VP:${state.axisIncVP}°`,
                `RX:${state.axisRotX}°  RY:${state.axisRotY}°  RZ:${state.axisRotZ}°`
            ]
        },
        {
            title: 'EG-VISUALIZER',
            lines: ['Aaron Mcgeo & Alberto Felix', 'CSE-A | First-Angle']
        }
    ]);

    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px "JetBrains Mono",monospace';
    ctx.fillText(titleMode + ' — ROTATING OBJECT METHOD', cw / 2, 46);
    ctx.font = '9px "JetBrains Mono",monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(
        `${solidName(state.solidType)}  | ∠HP:${state.axisIncHP}°  | ∠VP:${state.axisIncVP}°` +
        (state.perpEdge ? `  | Edge ${state.perpEdgeIdx + 1} ⊥ HP` : ''),
        cw / 2, 60
    );

    if (!state.solidData) {
        ctx.fillStyle = '#64748b';
        ctx.font = 'italic 13px "JetBrains Mono",monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Generate a solid first', cw / 2, ch / 2);
        return;
    }

    const { verts, edges } = getWorldGeometry(state);

    let sectionPts2d = null;
    if (sectioned && state.isCutApplied && state.sectionPts && state.sectionPts.length >= 3) {
        sectionPts2d = state.sectionPts;
    }

    const mg = 36, gap = 8;
    const drawW = cw - 2 * mg;
    const drawH = ch - 2 * mg - tbH - 10 - 20;
    const vW = Math.floor((drawW - gap) / 2);
    const vH = Math.floor((drawH - gap) / 2);
    const x0 = mg, y0 = 68;

    // Isometric (top-left)
    drawIsometricView(state, ctx, verts, edges, sectionPts2d, x0, y0, vW, vH);

    // Side view (top-right)
    const sideVis = buildEdgeVisibility(state, new THREE.Vector3(-1, 0, 0));
    drawOrthoView(ctx, verts, edges, v => [-v[2], v[1]], sideVis, 'SIDE VIEW (SVP)',
        sectionPts2d ? sectionPts2d.map(p => [-p[2], p[1]]) : null,
        x0 + vW + gap, y0, vW, vH);

    // Front view (bottom-left)
    const frontVis = buildEdgeVisibility(state, new THREE.Vector3(0, 0, 1));
    drawOrthoView(ctx, verts, edges, v => [v[0], v[1]], frontVis, 'FRONT VIEW (VP)',
        sectionPts2d ? sectionPts2d.map(p => [p[0], p[1]]) : null,
        x0, y0 + vH + gap, vW, vH);

    // Top view (bottom-right)
    const topVis = buildEdgeVisibility(state, new THREE.Vector3(0, 1, 0));
    drawOrthoView(ctx, verts, edges, v => [v[0], -v[2]], topVis, 'TOP VIEW (HP)',
        sectionPts2d ? sectionPts2d.map(p => [p[0], -p[2]]) : null,
        x0 + vW + gap, y0 + vH + gap, vW, vH);

    // Alignment lines
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.20)';
    ctx.lineWidth = 0.7;

    ctx.beginPath();
    ctx.moveTo(x0 + vW / 2, y0 + vH + gap);
    ctx.lineTo(x0 + vW / 2, y0 + vH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x0 + vW, y0 + vH / 2);
    ctx.lineTo(x0 + vW + gap, y0 + vH / 2);
    ctx.stroke();

    const mx = x0 + vW + gap, my = y0 + vH + gap;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx + vW, my + vH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.font = 'italic 8px "JetBrains Mono",monospace';
    ctx.textAlign = 'center';
    ctx.fillText('First-Angle Projection', mx + vW / 2, my + vH / 2);
}