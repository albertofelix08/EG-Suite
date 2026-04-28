/**
 * Problem Presets — Unit III & IV
 * Engineering Graphics Suite
 * Alberto Felix & Aaron Mcgeo | CSE-A(I)
 *
 * Each preset matches a problem from the ME22201 syllabus.
 * Clicking a preset sets all sliders/dropdowns and regenerates the solid.
 * Values marked null are left at the user's current setting.
 */

export const presets = [
    // ═══════════════════════════════════════════════════════════════
    // UNIT III — Projection of Solids
    // ═══════════════════════════════════════════════════════════════

    {
        id: 'u3-q1',
        label: 'Square pyramid suspended from base corner, axis ∥ VP',
        unit: 'III',
        solidType: 'squarePyramid',
        solidH: 60,
        solidR: 30,
        solidD: null,
        restOnHP: true,
        axisIncHP: 90,
        axisIncVP: 90,
        perpEdge: false,
        perpEdgeIdx: 0,
        axisRotX: 0,
        axisRotY: 0,
        axisRotZ: 0,
        cutAngle: null,
        cutPos: null,
    },
    {
        id: 'u3-q2',
        label: 'Pentagonal prism on base corner, axis 40° to HP, ∥ VP',
        unit: 'III',
        solidType: 'pentPrism',
        solidH: 60,
        solidR: 30,
        solidD: null,
        restOnHP: true,
        axisIncHP: 50,
        axisIncVP: 90,
        perpEdge: false,
        perpEdgeIdx: 0,
        axisRotX: 0,
        axisRotY: 0,
        axisRotZ: 0,
        cutAngle: null,
        cutPos: null,
    },
    {
        id: 'u3-q3',
        label: 'Cube on corner, solid diagonal vertical',
        unit: 'III',
        solidType: 'cube',
        solidH: 40,
        solidR: 40,
        solidD: null,
        restOnHP: true,
        axisIncHP: 55,
        axisIncVP: 45,
        perpEdge: false,
        perpEdgeIdx: 0,
        axisRotX: 0,
        axisRotY: 0,
        axisRotZ: 0,
        cutAngle: null,
        cutPos: null,
    },
    {
        id: 'u3-q4',
        label: 'Cylinder on generator, axis 50° to VP',
        unit: 'III',
        solidType: 'cylinder',
        solidH: 70,
        solidR: 25,
        solidD: null,
        restOnHP: true,
        axisIncHP: 90,
        axisIncVP: 40,
        perpEdge: false,
        perpEdgeIdx: 0,
        axisRotX: 0,
        axisRotY: 0,
        axisRotZ: 0,
        cutAngle: null,
        cutPos: null,
    },
    {
        id: 'u3-q5',
        label: 'Pentagonal pyramid on base corner, slant edge vertical',
        unit: 'III',
        solidType: 'pentPyramid',
        solidH: 60,
        solidR: 30,
        solidD: null,
        restOnHP: true,
        axisIncHP: 55,
        axisIncVP: 90,
        perpEdge: true,
        perpEdgeIdx: 2,
        axisRotX: 0,
        axisRotY: 0,
        axisRotZ: 0,
        cutAngle: null,
        cutPos: null,
    },
    {
        id: 'u3-q6',
        label: 'Cone on circumference point, base 50° to HP, ⟂ VP',
        unit: 'III',
        solidType: 'cone',
        solidH: 60,
        solidR: 25,
        solidD: null,
        restOnHP: true,
        axisIncHP: 40,
        axisIncVP: 90,
        perpEdge: false,
        perpEdgeIdx: 0,
        axisRotX: 0,
        axisRotY: 0,
        axisRotZ: 0,
        cutAngle: null,
        cutPos: null,
    },
    {
        id: 'u3-q7',
        label: 'Pentagonal prism on rectangular face, axis 40° to VP',
        unit: 'III',
        solidType: 'pentPrism',
        solidH: 60,
        solidR: 30,
        solidD: null,
        restOnHP: false,
        axisIncHP: 90,
        axisIncVP: 50,
        perpEdge: false,
        perpEdgeIdx: 0,
        axisRotX: 0,
        axisRotY: 0,
        axisRotZ: 0,
        cutAngle: null,
        cutPos: null,
    },

    // ═══════════════════════════════════════════════════════════════
    // UNIT IV — Section of Solids
    // ═══════════════════════════════════════════════════════════════

    {
        id: 'u4-q1',
        label: 'Square prism on base, side 25° to VP, cut 40° to HP bisecting axis',
        unit: 'IV',
        solidType: 'cube',
        solidH: 60,
        solidR: 30,
        solidD: 30,
        restOnHP: true,
        axisIncHP: 90,
        axisIncVP: 90,
        perpEdge: false,
        perpEdgeIdx: 0,
        axisRotX: 0,
        axisRotY: 25,
        axisRotZ: 0,
        cutAngle: 40,
        cutPos: 30,
    },
    {
        id: 'u4-q2',
        label: 'Pentagonal pyramid on base, side ∥ VP, cut 35° to HP bisecting axis',
        unit: 'IV',
        solidType: 'pentPyramid',
        solidH: 75,
        solidR: 40,
        solidD: null,
        restOnHP: true,
        axisIncHP: 90,
        axisIncVP: 90,
        perpEdge: false,
        perpEdgeIdx: 0,
        axisRotX: 0,
        axisRotY: 0,
        axisRotZ: 0,
        cutAngle: 35,
        cutPos: 37.5,
    },
    {
        id: 'u4-q3',
        label: 'Cone on base, cut ∥ to contour generator, 10mm from it',
        unit: 'IV',
        solidType: 'cone',
        solidH: 70,
        solidR: 30,
        solidD: null,
        restOnHP: true,
        axisIncHP: 90,
        axisIncVP: 90,
        perpEdge: false,
        perpEdgeIdx: 0,
        axisRotX: 0,
        axisRotY: 0,
        axisRotZ: 0,
        cutAngle: 48,
        cutPos: 50,
    },
    {
        id: 'u4-q4',
        label: 'Cube, base edges equally inclined to VP, cut for regular hexagon',
        unit: 'IV',
        solidType: 'cube',
        solidH: 60,
        solidR: 60,
        solidD: null,
        restOnHP: true,
        axisIncHP: 90,
        axisIncVP: 90,
        perpEdge: false,
        perpEdgeIdx: 0,
        axisRotX: 0,
        axisRotY: 45,
        axisRotZ: 0,
        cutAngle: 55,
        cutPos: 30,
    },
    {
        id: 'u4-q5',
        label: 'Hexagonal pyramid on base, 2 sides ⟂ VP, cut 30° bisecting axis',
        unit: 'IV',
        solidType: 'hexPyramid',
        solidH: 60,
        solidR: 30,
        solidD: null,
        restOnHP: true,
        axisIncHP: 90,
        axisIncVP: 90,
        perpEdge: false,
        perpEdgeIdx: 0,
        axisRotX: 0,
        axisRotY: 0,
        axisRotZ: 0,
        cutAngle: 30,
        cutPos: 30,
    },
    {
        id: 'u4-q6',
        label: 'Pentagonal prism on base, side ∥ VP, cut 50° at 35mm from base',
        unit: 'IV',
        solidType: 'pentPrism',
        solidH: 60,
        solidR: 30,
        solidD: null,
        restOnHP: true,
        axisIncHP: 90,
        axisIncVP: 90,
        perpEdge: false,
        perpEdgeIdx: 0,
        axisRotX: 0,
        axisRotY: 0,
        axisRotZ: 0,
        cutAngle: 50,
        cutPos: 35,
    },
    {
        id: 'u4-q7',
        label: 'Cylinder cut by plane 55° to HP bisecting axis',
        unit: 'IV',
        solidType: 'cylinder',
        solidH: 75,
        solidR: 30,
        solidD: null,
        restOnHP: true,
        axisIncHP: 90,
        axisIncVP: 90,
        perpEdge: false,
        perpEdgeIdx: 0,
        axisRotX: 0,
        axisRotY: 0,
        axisRotZ: 0,
        cutAngle: 55,
        cutPos: 37.5,
    },
    {
        id: 'u4-q8',
        label: 'Square pyramid on base, side 25° to VP, cut 35° bisecting axis',
        unit: 'IV',
        solidType: 'squarePyramid',
        solidH: 65,
        solidR: 30,
        solidD: null,
        restOnHP: true,
        axisIncHP: 90,
        axisIncVP: 90,
        perpEdge: false,
        perpEdgeIdx: 0,
        axisRotX: 0,
        axisRotY: 25,
        axisRotZ: 0,
        cutAngle: 35,
        cutPos: 32.5,
    },
];

/**
 * Apply a preset to the state and update all UI controls.
 * @param {Object} preset - One preset object from the array above.
 * @param {Object} state  - The global state object.
 */
export function applyPreset(preset, state) {
    // Solid type
    if (preset.solidType) {
        state.solidType = preset.solidType;
        document.getElementById('solidType').value = preset.solidType;
    }

    // Dimensions
    if (preset.solidH != null) {
        state.solidH = preset.solidH;
        document.getElementById('solidH').value = preset.solidH;
        document.getElementById('solidHVal').value = preset.solidH;
    }
    if (preset.solidR != null) {
        state.solidR = preset.solidR;
        document.getElementById('solidR').value = preset.solidR;
        document.getElementById('solidRVal').value = preset.solidR;
    }
    if (preset.solidD != null) {
        state.solidD = preset.solidD;
        document.getElementById('solidD').value = preset.solidD;
        document.getElementById('solidDVal').value = preset.solidD;
    }

    // Resting position
    if (preset.restOnHP != null) {
        state.restOnHP = preset.restOnHP;
        const radioName = preset.restOnHP ? 'HP' : 'VP';
        document.querySelector(`input[name="restPos"][value="${radioName}"]`).checked = true;
    }

    // Axis orientation
    if (preset.axisIncHP != null) {
        state.axisIncHP = preset.axisIncHP;
        document.getElementById('incHP').value = preset.axisIncHP;
        document.getElementById('incHPVal').value = preset.axisIncHP;
    }
    if (preset.axisIncVP != null) {
        state.axisIncVP = preset.axisIncVP;
        document.getElementById('incVP').value = preset.axisIncVP;
        document.getElementById('incVPVal').value = preset.axisIncVP;
    }
    if (preset.perpEdge != null) {
        state.perpEdge = preset.perpEdge;
        document.getElementById('perpEdgeCB').checked = preset.perpEdge;
        document.getElementById('perpEdgeSel').disabled = !preset.perpEdge;
    }
    if (preset.perpEdgeIdx != null) {
        state.perpEdgeIdx = preset.perpEdgeIdx;
        document.getElementById('perpEdgeSel').value = preset.perpEdgeIdx;
    }
    if (preset.axisRotX != null) {
        state.axisRotX = preset.axisRotX;
        document.getElementById('rotX').value = preset.axisRotX;
        document.getElementById('rotXVal').value = preset.axisRotX;
    }
    if (preset.axisRotY != null) {
        state.axisRotY = preset.axisRotY;
        document.getElementById('rotY').value = preset.axisRotY;
        document.getElementById('rotYVal').value = preset.axisRotY;
    }
    if (preset.axisRotZ != null) {
        state.axisRotZ = preset.axisRotZ;
        document.getElementById('rotZ').value = preset.axisRotZ;
        document.getElementById('rotZVal').value = preset.axisRotZ;
    }

    // Cutting plane
    if (preset.cutAngle != null) {
        state.cutAngle = preset.cutAngle;
        document.getElementById('cutAngle').value = preset.cutAngle;
        document.getElementById('cutAngleVal').value = preset.cutAngle;
    }
    if (preset.cutPos != null) {
        state.cutPos = preset.cutPos;
        document.getElementById('cutPos').value = preset.cutPos;
        document.getElementById('cutPosVal').value = preset.cutPos;
    }
}