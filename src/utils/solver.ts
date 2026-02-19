import type {
    BeamConfig, Load, AnalysisResult, SolverStep, ChartInference
} from './types';
import { displayForce, displayMoment, displayLength, displayDeflection } from './types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeChartInference(
    data: { x: number; value: number }[],
    label: string,
    formatFn: (v: number) => string
): ChartInference {
    let maxVal = -Infinity, minVal = Infinity;
    let maxPos = 0, minPos = 0;
    const zeroCrossings: number[] = [];

    for (let i = 0; i < data.length; i++) {
        const { x, value } = data[i];
        if (value > maxVal) { maxVal = value; maxPos = x; }
        if (value < minVal) { minVal = value; minPos = x; }
        if (i > 0) {
            const prev = data[i - 1].value;
            if ((prev < 0 && value >= 0) || (prev > 0 && value <= 0)) {
                const frac = Math.abs(prev) / (Math.abs(prev) + Math.abs(value));
                zeroCrossings.push(data[i - 1].x + frac * (x - data[i - 1].x));
            }
        }
    }

    const summary = `Maximum ${label}: ${formatFn(maxVal)} at x = ${maxPos.toFixed(2)} m. ` +
        `Minimum: ${formatFn(minVal)} at x = ${minPos.toFixed(2)} m. ` +
        (zeroCrossings.length > 0
            ? `Zero crossings at x = ${zeroCrossings.map(z => z.toFixed(2)).join(', ')} m.`
            : 'No zero crossings.');

    return { maxValue: maxVal, maxPosition: maxPos, minValue: minVal, minPosition: minPos, zeroCrossings, summary };
}

// ─── Main Solver ─────────────────────────────────────────────────────────────

export const solveBeam = (beam: BeamConfig): AnalysisResult => {
    const steps: SolverStep[] = [];
    const u = beam.units;

    // ── Step 0: Problem Setup ──
    steps.push({
        title: '0. Problem Setup',
        description: `Beam length L = ${beam.length} m.\n` +
            `Material: E = ${(beam.E / 1e9).toFixed(0)} GPa, G = ${(beam.G / 1e9).toFixed(0)} GPa.\n` +
            `Section: I = ${beam.I.toExponential(2)} m⁴, J = ${beam.J.toExponential(2)} m⁴, depth = ${beam.depth} m.\n` +
            `Gravity: g = ${beam.gravity} m/s².`,
        equations: [
            `L = ${beam.length} m`,
            `E = ${beam.E.toExponential(2)} Pa`,
            `I = ${beam.I.toExponential(2)} m⁴`,
        ],
        result: `Beam classified as: ${classifyBeam(beam)}`
    });

    // ── Step 1: Load Summary ──
    const loadLines = beam.loads.map(l => {
        if (l.type === 'point') return `  • Point Load: P = ${displayForce(l.magnitude, u)} at x = ${displayLength(l.position, u)}`;
        if (l.type === 'udl') return `  • UDL: w = ${l.magnitude} N/m from x = ${displayLength(l.position, u)} to ${displayLength(l.endPosition ?? beam.length, u)}`;
        if (l.type === 'uvl') return `  • UVL: w₁ = ${l.magnitude} N/m → w₂ = ${l.endMagnitude ?? 0} N/m from x = ${displayLength(l.position, u)} to ${displayLength(l.endPosition ?? beam.length, u)}`;
        if (l.type === 'moment') return `  • Applied Moment: M = ${displayMoment(l.magnitude, u)} at x = ${displayLength(l.position, u)}`;
        if (l.type === 'torque') return `  • Torque: T = ${displayMoment(l.magnitude, u)} at x = ${displayLength(l.position, u)}`;
        return '';
    });
    steps.push({
        title: '1. Applied Loads',
        description: `${beam.loads.length} load(s) applied:\n${loadLines.join('\n')}`,
        equations: beam.loads.map(l => l.type === 'point'
            ? `P = ${l.magnitude.toFixed(2)} N @ x=${l.position.toFixed(2)} m`
            : l.type === 'udl'
                ? `w = ${l.magnitude.toFixed(2)} N/m [${l.position.toFixed(2)} → ${(l.endPosition ?? beam.length).toFixed(2)} m]`
                : l.type === 'uvl'
                    ? `w(x) = ${l.magnitude.toFixed(2)} + ${((l.endMagnitude ?? 0) - l.magnitude).toFixed(2)}·(x−${l.position.toFixed(2)})/${((l.endPosition ?? beam.length) - l.position).toFixed(2)} N/m`
                    : `M = ${l.magnitude.toFixed(2)} N·m @ x=${l.position.toFixed(2)} m`
        )
    });

    // ── Step 2: Reactions ──
    const reactionResult = solveReactions(beam, steps);
    const { reactions } = reactionResult;

    // ── Build effective load list (reactions added as upward point loads) ──
    const allLoads: Load[] = [...beam.loads];
    Object.entries(reactions).forEach(([supId, reac]) => {
        const sup = beam.supports.find(s => s.id === supId);
        if (!sup) return;
        if (Math.abs(reac.Fy) > 1e-10) {
            allLoads.push({ id: `reac-${supId}-y`, type: 'point', position: sup.position, magnitude: -reac.Fy });
        }
        if (reac.Mz && Math.abs(reac.Mz) > 1e-10) {
            allLoads.push({ id: `reac-${supId}-m`, type: 'moment', position: sup.position, magnitude: -(reac.Mz) });
        }
    });

    // ── Step 3: Shear Force & Bending Moment ──
    const points = 500;
    const dx = beam.length / points;
    const shearForce: { x: number; value: number }[] = [];
    const bendingMoment: { x: number; value: number }[] = [];
    let maxSF = 0, maxBM = 0;

    for (let i = 0; i <= points; i++) {
        const x = i * dx;
        let V = 0, M_val = 0;

        allLoads.forEach(load => {
            if (load.type === 'point') {
                if (x >= load.position) {
                    const F = -load.magnitude;
                    V += F;
                    M_val += F * (x - load.position);
                }
            } else if (load.type === 'moment') {
                if (x >= load.position) {
                    M_val += -load.magnitude;
                }
            } else if (load.type === 'udl') {
                const a = load.position, b = load.endPosition ?? beam.length;
                if (x >= a) {
                    const x_eff = Math.min(x, b);
                    const eff_len = x_eff - a;
                    const P = load.magnitude * eff_len;
                    V += -P;
                    M_val += -P * (x - (a + eff_len / 2));
                }
            } else if (load.type === 'uvl') {
                const a = load.position, b = load.endPosition ?? beam.length;
                const w1 = load.magnitude, w2 = load.endMagnitude ?? 0;
                const L_load = b - a;
                if (x >= a && L_load > 0) {
                    const x_eff = Math.min(x, b);
                    const u_loc = x_eff - a;
                    const w_x = w1 + (w2 - w1) * (u_loc / L_load);
                    const P = ((w1 + w_x) / 2) * u_loc;
                    const denom = w1 + w_x;
                    const x_c_from_a = denom > 1e-12 ? (u_loc / 3) * ((w1 + 2 * w_x) / denom) : u_loc / 2;
                    V += -P;
                    M_val += -P * (x - (a + x_c_from_a));
                }
            }
        });

        shearForce.push({ x, value: V });
        bendingMoment.push({ x, value: M_val });
        if (Math.abs(V) > maxSF) maxSF = Math.abs(V);
        if (Math.abs(M_val) > maxBM) maxBM = Math.abs(M_val);
    }

    steps.push({
        title: '3. Shear Force Diagram (SFD)',
        description: `The Shear Force V(x) is computed by summing all vertical forces to the LEFT of a section cut at position x:\n\n` +
            `  V(x) = Σ [Reaction forces to left of x] − Σ [Applied loads to left of x]\n\n` +
            `For each load type:\n` +
            `  • Point Load P at a: V jumps by +P (upward) or −P (downward)\n` +
            `  • UDL w [a,b]: V decreases linearly at rate w N/m\n` +
            `  • UVL w₁→w₂ [a,b]: V decreases parabolically\n\n` +
            `Maximum |V| = ${displayForce(maxSF, u)}`,
        equations: [
            `V(x) = ΣFᵧ(left of x)`,
            `For UDL: V(x) = V₀ − w·(x−a)`,
            `|V|_max = ${maxSF.toFixed(2)} N`,
        ],
        result: `SFD computed over ${points + 1} points, dx = ${dx.toFixed(4)} m`
    });

    steps.push({
        title: '4. Bending Moment Diagram (BMD)',
        description: `The Bending Moment M(x) is computed by taking moments of all forces to the LEFT of section cut x:\n\n` +
            `  M(x) = Σ [Reaction moments] + Σ [Force × lever arm]\n\n` +
            `Convention: Sagging moment (bottom tension) = Positive.\n\n` +
            `Maximum |M| = ${displayMoment(maxBM, u)}\n` +
            `Location of max moment is at x where V = 0 (shear changes sign).`,
        equations: [
            `M(x) = Σ Fᵢ·(x − xᵢ)  [for all forces left of x]`,
            `dM/dx = V(x)  ←→  M = ∫V dx`,
            `|M|_max = ${maxBM.toFixed(2)} N·m`,
        ],
        result: `BMD computed simultaneously with SFD`
    });

    // ── Bending Stress ──
    const maxStress = (maxBM * (beam.depth / 2)) / beam.I;

    steps.push({
        title: '5. Bending Stress',
        description: `Using the flexure formula σ = M·y / I:\n\n` +
            `  y (distance from neutral axis) = depth/2 = ${(beam.depth / 2).toFixed(3)} m\n` +
            `  M_max = ${displayMoment(maxBM, u)}\n` +
            `  I = ${beam.I.toExponential(3)} m⁴\n\n` +
            `  σ_max = M_max × y / I\n` +
            `  σ_max = ${maxBM.toFixed(2)} × ${(beam.depth / 2).toFixed(3)} / ${beam.I.toExponential(3)}`,
        equations: [
            `σ = M·y / I  (Flexure Formula)`,
            `σ_max = ${maxBM.toFixed(2)} × ${(beam.depth / 2).toFixed(3)} / ${beam.I.toExponential(2)}`,
            `σ_max = ${displayStressRaw(maxStress, beam.units.system)}`,
        ],
        result: `Maximum bending stress = ${displayStressRaw(maxStress, beam.units.system)}`
    });

    // ── Torsion ──
    const torqueLoads = beam.loads.filter(l => l.type === 'torque');
    const hasTorsion = torqueLoads.length > 0;
    const angleOfTwist: { x: number; value: number }[] = [];
    let maxAngleOfTwist = 0;

    if (hasTorsion) {
        let Tx_react = 0;
        const fixedAtStart = beam.supports.find(s => s.type === 'fixed' && s.position === 0);
        if (fixedAtStart) {
            Tx_react = -torqueLoads.reduce((acc, l) => acc + l.magnitude, 0);
        }

        let phi = 0;
        const GJ = beam.G * beam.J;
        steps.push({
            title: '6. Torsion & Angle of Twist',
            description: `Torque loads detected. Angle of twist φ(x) computed by integrating T(x)/(GJ):\n\n` +
                `  G = ${(beam.G / 1e9).toFixed(0)} GPa, J = ${beam.J.toExponential(3)} m⁴\n` +
                `  GJ = ${GJ.toExponential(3)} N·m²\n\n` +
                `  φ(x) = ∫₀ˣ T(ξ)/(GJ) dξ`,
            equations: [
                `φ(x) = ∫₀ˣ T/(GJ) dξ`,
                `GJ = ${GJ.toExponential(3)} N·m²`,
            ]
        });

        for (let i = 0; i <= points; i++) {
            const x = i * dx;
            let T = Tx_react;
            torqueLoads.forEach(l => { if (x >= l.position) T += l.magnitude; });
            if (i > 0) phi += (T / GJ) * dx;
            angleOfTwist.push({ x, value: phi });
            if (Math.abs(phi) > maxAngleOfTwist) maxAngleOfTwist = Math.abs(phi);
        }
    } else {
        for (let i = 0; i <= points; i++) angleOfTwist.push({ x: i * dx, value: 0 });
    }

    // ── Step: Deflection ──
    steps.push({
        title: '7. Slope & Deflection',
        description: `Deflection y(x) is computed by double integration of the curvature equation:\n\n` +
            `  EI·d²y/dx² = M(x)   → First integration → Slope θ(x) = dy/dx\n` +
            `                       → Second integration → Deflection y(x)\n\n` +
            `Boundary conditions applied:\n` +
            (beam.supports.find(s => s.type === 'fixed')
                ? `  • Fixed support: y = 0, θ = 0 at fixed end`
                : `  • Simply supported: y = 0 at both support positions`),
        equations: [
            `EI·d²y/dx² = M(x)`,
            `EI·θ(x) = ∫M(x)dx + C₁`,
            `EI·y(x) = ∫∫M(x)dx² + C₁·x + C₂`,
            `BCs determine C₁ and C₂`,
        ]
    });

    // Double integration
    let slopeEI: number[] = [0];
    for (let i = 0; i < points; i++) {
        const mAvg = (bendingMoment[i].value + bendingMoment[i + 1].value) / 2;
        slopeEI.push(slopeEI[i] + mAvg * dx);
    }

    const slope: { x: number; value: number }[] = [];
    const deflection: { x: number; value: number }[] = [];
    let maxDef = 0;

    const fixedSupport = beam.supports.find(s => s.type === 'fixed');
    const sortedSupports = [...beam.supports].sort((a, b) => a.position - b.position);
    const EI = beam.E * beam.I;

    if (fixedSupport) {
        const fixedIndex = Math.round((fixedSupport.position / beam.length) * points);
        const C1 = -slopeEI[fixedIndex];
        const D_partial: number[] = [0];
        for (let i = 0; i < points; i++) {
            const sAvg = (slopeEI[i] + slopeEI[i + 1]) / 2;
            D_partial.push(D_partial[i] + sAvg * dx);
        }
        const C2 = -D_partial[fixedIndex] - C1 * fixedSupport.position;
        for (let i = 0; i <= points; i++) {
            const x = i * dx;
            slope.push({ x, value: (slopeEI[i] + C1) / EI });
            const defVal = (D_partial[i] + C1 * x + C2) / EI;
            deflection.push({ x, value: defVal });
            if (Math.abs(defVal) > maxDef) maxDef = Math.abs(defVal);
        }
    } else if (sortedSupports.length >= 2) {
        const D_partial: number[] = [0];
        for (let i = 0; i < points; i++) {
            const sAvg = (slopeEI[i] + slopeEI[i + 1]) / 2;
            D_partial.push(D_partial[i] + sAvg * dx);
        }
        const idxA = Math.round((sortedSupports[0].position / beam.length) * points);
        const idxB = Math.round((sortedSupports[1].position / beam.length) * points);
        const posA = sortedSupports[0].position, posB = sortedSupports[1].position;
        const C1 = -(D_partial[idxB] - D_partial[idxA]) / (posB - posA);
        const C2 = -D_partial[idxA] - C1 * posA;
        for (let i = 0; i <= points; i++) {
            const x = i * dx;
            slope.push({ x, value: (slopeEI[i] + C1) / EI });
            const defVal = (D_partial[i] + C1 * x + C2) / EI;
            deflection.push({ x, value: defVal });
            if (Math.abs(defVal) > maxDef) maxDef = Math.abs(defVal);
        }
    } else {
        for (let i = 0; i <= points; i++) {
            slope.push({ x: i * dx, value: 0 });
            deflection.push({ x: i * dx, value: 0 });
        }
    }

    steps.push({
        title: '8. Maximum Deflection',
        description: `The maximum deflection occurs where slope θ(x) = 0 (or at beam end for cantilever).\n\n` +
            `  δ_max = ${displayDeflection(maxDef, beam.units)}\n\n` +
            `This is the greatest transverse displacement of the beam's neutral axis.`,
        equations: [`δ_max = ${(maxDef * 1000).toFixed(4)} mm`],
        result: `Maximum deflection = ${displayDeflection(maxDef, beam.units)}`
    });

    // ── Inferences ──
    const sfInference = computeChartInference(shearForce, 'Shear Force', v => displayForce(v, beam.units));
    const bmInference = computeChartInference(bendingMoment, 'Bending Moment', v => displayMoment(v, beam.units));
    const deflInference = computeChartInference(deflection, 'Deflection', v => displayDeflection(v, beam.units));

    return {
        reactions,
        shearForce,
        bendingMoment,
        slope,
        deflection,
        angleOfTwist,
        maxShearForce: maxSF,
        maxBendingMoment: maxBM,
        maxDeflection: maxDef,
        maxStress,
        maxAngleOfTwist,
        hasTorsion,
        steps,
        sfInference,
        bmInference,
        deflectionInference: deflInference,
    };
};

// ─── Reaction Solver ─────────────────────────────────────────────────────────

function classifyBeam(beam: BeamConfig): string {
    const fixed = beam.supports.find(s => s.type === 'fixed');
    if (fixed) return 'Cantilever Beam';
    if (beam.supports.length === 2) return 'Simply Supported Beam';
    return 'Beam (unsupported / indeterminate)';
}

function displayStressRaw(val: number, system: string): string {
    if (system === 'kNm') return (val / 1e6).toFixed(3) + ' MPa';
    if (system === 'Imperial') return (val * 0.000145).toFixed(3) + ' psi';
    return val.toFixed(2) + ' Pa';
}

function getTotalLoads(loads: Load[], fixedPos: number, steps: SolverStep[]): { sumFy: number; sumM: number } {
    let sumFy = 0, sumM = 0;
    const eqLines: string[] = [];

    loads.forEach(load => {
        if (load.type === 'point') {
            sumFy += load.magnitude;
            sumM += load.magnitude * (load.position - fixedPos);
            eqLines.push(`Point: F=${load.magnitude.toFixed(2)}N @ x=${load.position.toFixed(2)}m → M about A = ${(load.magnitude * (load.position - fixedPos)).toFixed(2)} N·m`);
        } else if (load.type === 'udl') {
            const L = (load.endPosition ?? load.position) - load.position;
            const P = load.magnitude * L;
            const cen = load.position + L / 2;
            sumFy += P;
            sumM += P * (cen - fixedPos);
            eqLines.push(`UDL: P=${P.toFixed(2)}N (centroid @ ${cen.toFixed(2)}m) → M = ${(P * (cen - fixedPos)).toFixed(2)} N·m`);
        } else if (load.type === 'uvl') {
            const L = (load.endPosition ?? load.position) - load.position;
            const w1 = load.magnitude, w2 = load.endMagnitude ?? 0;
            if (L > 0) {
                const P = ((w1 + w2) / 2) * L;
                const denom = w1 + w2;
                const xc_local = denom > 1e-12 ? (L / 3) * ((w1 + 2 * w2) / denom) : L / 2;
                const cen = load.position + xc_local;
                sumFy += P;
                sumM += P * (cen - fixedPos);
                eqLines.push(`UVL: P=${P.toFixed(2)}N (centroid @ ${cen.toFixed(2)}m) → M = ${(P * (cen - fixedPos)).toFixed(2)} N·m`);
            }
        } else if (load.type === 'moment') {
            sumM += load.magnitude;
            eqLines.push(`Moment: M=${load.magnitude.toFixed(2)} N·m applied`);
        }
    });

    steps.push({
        title: '2a. Load Resultants',
        description: `Converting distributed loads to equivalent point loads:\n${eqLines.join('\n')}`,
        equations: eqLines
    });

    return { sumFy, sumM };
}

const solveReactions = (beam: BeamConfig, steps: SolverStep[]) => {
    const { supports, loads } = beam;
    const sorted = [...supports].sort((a, b) => a.position - b.position);
    const fixed = sorted.find(s => s.type === 'fixed');

    if (fixed) {
        const { sumFy, sumM } = getTotalLoads(loads, fixed.position, steps);
        const Ry = sumFy, Mz = sumM;

        steps.push({
            title: '2b. Reactions — Cantilever',
            description: `For a cantilever fixed at x = ${fixed.position.toFixed(2)} m:\n\n` +
                `  ΣFᵧ = 0  →  R_y = ΣF_loads = ${Ry.toFixed(2)} N (upward)\n` +
                `  ΣM_A = 0 →  M_z = ΣM_loads = ${Mz.toFixed(2)} N·m (at fixed end)`,
            equations: [
                `ΣFᵧ = 0: R_A = ${Ry.toFixed(2)} N`,
                `ΣM_A = 0: M_A = ${Mz.toFixed(2)} N·m`,
            ],
            result: `R_A = ${Ry.toFixed(2)} N ↑,  M_A = ${Mz.toFixed(2)} N·m`
        });
        return { reactions: { [fixed.id]: { Fy: Ry, Mz } } };
    }

    if (sorted.length === 2) {
        const [s1, s2] = sorted;
        const L = s2.position - s1.position;
        const { sumFy, sumM } = getTotalLoads(loads, s1.position, steps);

        const R_s2 = sumM / L;
        const R_s1 = sumFy - R_s2;

        steps.push({
            title: '2b. Reactions — Simply Supported',
            description: `Supports at A (x=${s1.position.toFixed(2)} m) and B (x=${s2.position.toFixed(2)} m), span L = ${L.toFixed(2)} m.\n\n` +
                `  ΣM_A = 0:\n` +
                `    R_B × L = ΣM_about_A\n` +
                `    R_B = ${sumM.toFixed(2)} / ${L.toFixed(2)} = ${R_s2.toFixed(2)} N\n\n` +
                `  ΣFᵧ = 0:\n` +
                `    R_A = ΣF − R_B = ${sumFy.toFixed(2)} − ${R_s2.toFixed(2)} = ${R_s1.toFixed(2)} N`,
            equations: [
                `ΣM_A = 0: R_B = ${sumM.toFixed(2)} / ${L.toFixed(2)} = ${R_s2.toFixed(2)} N`,
                `ΣFᵧ = 0: R_A = ${R_s1.toFixed(2)} N`,
            ],
            result: `R_A = ${R_s1.toFixed(2)} N ↑,  R_B = ${R_s2.toFixed(2)} N ↑`
        });
        return { reactions: { [s1.id]: { Fy: R_s1 }, [s2.id]: { Fy: R_s2 } } };
    }

    steps.push({
        title: '2b. Reactions — Unable to Solve',
        description: 'Need at least 2 supports (or 1 fixed) to solve reactions. Check configuration.',
    });
    return { reactions: {} };
};
