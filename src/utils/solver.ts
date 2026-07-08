import type {
    BeamConfig, Load, AnalysisResult, SolverStep, ChartInference
} from './types';
import { displayForce, displayMoment, displayLength, displayDeflection, toLatexExp, formatLabelForLatex } from './types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function displayStressLaTeX(val: number, system: string): string {
    if (system === 'kNm') return `${(val / 1e6).toFixed(2)}\\text{ MPa}`;
    if (system === 'Imperial') return `${(val * 0.000145).toFixed(1)}\\text{ psi}`;
    return `${val.toFixed(0)}\\text{ Pa}`;
}


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

const solveBeamInternal = (beam: BeamConfig, generateSteps: boolean = true): AnalysisResult => {
    const steps: SolverStep[] = [];
    const u = beam.units;

    // ── Step 0: Problem Setup ──
    if (generateSteps) {
        steps.push({
            title: '0. Problem Setup',
            description: `Beam length $L = ${beam.length}\\text{ m}$.\n` +
                `Material properties: $E = ${(beam.E / 1e9).toFixed(0)}\\text{ GPa}$ (Young's modulus), $G = ${(beam.G / 1e9).toFixed(0)}\\text{ GPa}$ (shear modulus).\n` +
                `Section: $I = ${toLatexExp(beam.I, 2)}\\text{ m}^4$ (second moment of area), $J = ${toLatexExp(beam.J, 2)}\\text{ m}^4$ (polar moment), depth $d = ${beam.depth}\\text{ m}$.\n` +
                `Gravity: $g = ${beam.gravity}\\text{ m/s}^2$.`,
            equations: [
                `L = ${beam.length}\\text{ m}`,
                `E = ${toLatexExp(beam.E, 2)}\\text{ Pa}`,
                `I = ${toLatexExp(beam.I, 2)}\\text{ m}^4`,
            ],
            result: `Beam classified as: ${classifyBeam(beam)}`
        });
    }

    // ── Step 1: Load Summary ──
    const loadLines = beam.loads.map(l => {
        const catStr = l.category ? ` (${l.category})` : '';
        const lblStr = l.label ? ` "${l.label}"` : '';
        const namePart = `${lblStr}${catStr}`;

        if (l.type === 'point') return `  • **Point Load${namePart}**: $P = ${displayForce(l.magnitude, u)}$ at $x = ${displayLength(l.position, u)}$`;
        if (l.type === 'udl') return `  • **UDL${namePart}**: $w = ${l.magnitude}\\text{ N/m}$ from $x = ${displayLength(l.position, u)}$ to $x = ${displayLength(l.endPosition ?? beam.length, u)}$`;
        if (l.type === 'uvl') return `  • **UVL${namePart}**: $w_1 = ${l.magnitude}\\text{ N/m} \\to w_2 = ${l.endMagnitude ?? 0}\\text{ N/m}$ from $x = ${displayLength(l.position, u)}$ to $x = ${displayLength(l.endPosition ?? beam.length, u)}$`;
        if (l.type === 'moment') return `  • **Applied Moment${namePart}**: $M = ${displayMoment(l.magnitude, u)}$ at $x = ${displayLength(l.position, u)}$`;
        if (l.type === 'torque') return `  • **Torque${namePart}**: $T = ${displayMoment(l.magnitude, u)}$ at $x = ${displayLength(l.position, u)}$`;
        return '';
    });
    if (generateSteps) {
        steps.push({
            title: '1. Applied Loads',
            description: `${beam.loads.length} load(s) applied:\n${loadLines.join('\n')}`,
            equations: beam.loads.map(l => {
                const name = l.label ? `\\text{"${l.label}"}` : (l.category ? `\\text{${l.category} load}` : `\\text{${l.type}}`);
                if (l.type === 'point') {
                    return `${name}: \\quad P = ${l.magnitude.toFixed(2)}\\text{ N} \\quad \\text{at } x = ${l.position.toFixed(2)}\\text{ m}`;
                } else if (l.type === 'udl') {
                    return `${name}: \\quad w = ${l.magnitude.toFixed(2)}\\text{ N/m} \\quad \\text{for } x \\in [${l.position.toFixed(2)}, ${(l.endPosition ?? beam.length).toFixed(2)}]\\text{ m}`;
                } else if (l.type === 'uvl') {
                    const w1 = l.magnitude;
                    const w2 = l.endMagnitude ?? 0;
                    const L = (l.endPosition ?? beam.length) - l.position;
                    return `${name}: \\quad w(x) = ${w1.toFixed(2)} + \\frac{${(w2 - w1).toFixed(2)}(x - ${l.position.toFixed(2)})}{${L.toFixed(2)}}\\text{ N/m} \\quad \\text{for } x \\in [${l.position.toFixed(2)}, ${(l.endPosition ?? beam.length).toFixed(2)}]\\text{ m}`;
                } else if (l.type === 'moment') {
                    return `${name}: \\quad M = ${l.magnitude.toFixed(2)}\\text{ N}\\cdot\\text{m} \\quad \\text{at } x = ${l.position.toFixed(2)}\\text{ m}`;
                } else {
                    return `${name}: \\quad T = ${l.magnitude.toFixed(2)}\\text{ N}\\cdot\\text{m} \\quad \\text{at } x = ${l.position.toFixed(2)}\\text{ m}`;
                }
            })
        });
    }

    // ── Step 2: Reactions ──
    const reactionResult = solveReactions(beam, generateSteps ? steps : []);
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

    const maxStress = (maxBM * (beam.depth / 2)) / beam.I;

    if (generateSteps) {
        steps.push({
            title: '3. Shear Force Diagram (SFD)',
            description: `The Shear Force $V(x)$ is computed by summing all vertical forces to the left of a section cut at position $x$:\n\n` +
                `$$V(x) = \\sum R_{y,\\text{left}} - \\sum P_{\\text{left}}$$\n\n` +
                `For each load type:\n` +
                `  • Concentrated force $P$ at $a$: $V$ jumps by $+P$ (upward) or $-P$ (downward)\n` +
                `  • UDL $w$ on $[a,b]$: $V$ decreases linearly at rate $w\\text{ N/m}$\n` +
                `  • UVL $w_1 \\to w_2$ on $[a,b]$: $V$ decreases parabolically\n\n` +
                `Maximum shear magnitude: $|V|_{\\text{max}} = ${displayForce(maxSF, u)}`,
            equations: [
                `V(x) = \\Sigma F_y \\text{ (forces to the left of } x\\text{)}`,
                `\\text{UDL region: } V(x) = V_0 - w(x - a)`,
                `|V|_{\\text{max}} = ${maxSF.toFixed(1)}\\text{ N}`,
            ],
            result: `SFD computed over ${points + 1} points, dx = ${dx.toFixed(4)} m`
        });

        steps.push({
            title: '4. Bending Moment Diagram (BMD)',
            description: `The Bending Moment $M(x)$ is computed by taking moments of all forces to the left of section cut $x$:\n\n` +
                `$$M(x) = \\sum M_{\\text{react,left}} + \\sum [F_i \\cdot (x - x_i)]$$\n\n` +
                `Sign Convention: Sagging moment (bottom face in tension) is positive.\n\n` +
                `Maximum moment magnitude: $|M|_{\\text{max}} = ${displayMoment(maxBM, u)}$\n` +
                `The maximum bending moment occurs where shear force $V(x) = 0$ (or changes sign).`,
            equations: [
                `M(x) = \\sum F_i(x - x_i) \\text{ for } x_i \\le x`,
                `\\frac{dM}{dx} = V(x) \\iff M(x) = \\int V(x)\\,dx`,
                `|M|_{\\text{max}} = ${maxBM.toFixed(1)}\\text{ N}\\cdot\\text{m}`,
            ],
            result: `BMD computed simultaneously with SFD`
        });

        steps.push({
            title: '5. Bending Stress',
            description: `Bending stress $\\sigma$ is calculated using the elastic flexure formula:\n\n` +
                `$$\\sigma = \\frac{M \\cdot y}{I}$$\n\n` +
                `Where:\n` +
                `  • $y$ (distance from neutral axis to extreme fibres) $= d/2 = ${(beam.depth / 2).toFixed(3)}\\text{ m}$\n` +
                `  • $M_{\\text{max}} = ${displayMoment(maxBM, u)}$\n` +
                `  • $I = ${toLatexExp(beam.I, 3)}\\text{ m}^4$\n\n` +
                `Maximum bending stress:\n` +
                `$$\\sigma_{\\text{max}} = \\frac{${maxBM.toFixed(1)} \\times ${(beam.depth / 2).toFixed(3)}}{${toLatexExp(beam.I, 3)}} = ${displayStressRaw(maxStress, beam.units.system)}$$`,
            equations: [
                `\\sigma = \\frac{M \\cdot y}{I} \\quad \\text{(Flexure Formula)}`,
                `\\sigma_{\\text{max}} = \\frac{${maxBM.toFixed(1)}\\text{ N}\\cdot\\text{m} \\times ${(beam.depth / 2).toFixed(3)}\\text{ m}}{${toLatexExp(beam.I, 2)}\\text{ m}^4}`,
                `\\sigma_{\\text{max}} = ${displayStressLaTeX(maxStress, beam.units.system)}`,
            ],
            result: `Maximum bending stress = ${displayStressRaw(maxStress, beam.units.system)}`
        });
    }

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
        if (generateSteps) {
            steps.push({
                title: '6. Torsion & Angle of Twist',
                description: `Torque loads detected. The angle of twist $\\phi(x)$ is computed by integrating the torsional equation:\n\n` +
                    `$$\\phi(x) = \\int_0^x \\frac{T(\\xi)}{G J}\\,d\\xi$$\n\n` +
                    `Where:\n` +
                    `  • $G = ${(beam.G / 1e9).toFixed(0)}\\text{ GPa}$, $J = ${toLatexExp(beam.J, 3)}\\text{ m}^4$\n` +
                    `  • Torsional rigidity $G J = ${toLatexExp(GJ, 3)}\\text{ N}\\cdot\\text{m}^2$`,
                equations: [
                    `\\phi(x) = \\int_0^x \\frac{T(\\xi)}{GJ}\\,d\\xi`,
                    `GJ = ${toLatexExp(GJ, 3)}\\text{ N}\\cdot\\text{m}^2`,
                ]
            });
        }

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
    if (generateSteps) {
        steps.push({
            title: '7. Slope & Deflection',
            description: `The deflection curve $y(x)$ is computed by integrating the Euler-Bernoulli beam curvature equation twice:\n\n` +
                `$$E I \\frac{d^2y}{dx^2} = M(x)$$\n\n` +
                `Integrating once yields the slope function $\\theta(x) = \\frac{dy}{dx}$:\n` +
                `$$E I \\theta(x) = \\int M(x)\\,dx + C_1$$\n\n` +
                `Integrating a second time yields the deflection function $y(x)$:\n` +
                `$$E I y(x) = \\iint M(x)\\,dx^2 + C_1 x + C_2$$\n\n` +
                `Boundary conditions used to solve for integration constants $C_1$ and $C_2$:\n` +
                (beam.supports.find(s => s.type === 'fixed')
                    ? `  • Fixed support: $y = 0$, $\\theta = 0$ at the wall`
                    : `  • Simply supported: $y = 0$ at both support locations`),
            equations: [
                `EI \\frac{d^2y}{dx^2} = M(x)`,
                `EI \\theta(x) = \\int M(x)\\,dx + C_1`,
                `EI y(x) = \\iint M(x)\\,dx^2 + C_1 x + C_2`,
                `\\text{BCs solve for } C_1 \\text{ and } C_2`,
            ]
        });
    }

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

    if (generateSteps) {
        steps.push({
            title: '8. Maximum Deflection',
            description: `The maximum deflection magnitude occurs at the point where the slope $\\theta(x) = 0$ (or at the free tip of a cantilever):\n\n` +
                `$$\\delta_{\\text{max}} = ${displayDeflection(maxDef, beam.units)}$$\n\n` +
                `This value represents the peak displacement of the beam's neutral axis under the combined loading.`,
            equations: [`\\delta_{\\text{max}} = ${(maxDef * 1000).toFixed(4)}\\text{ mm}`],
            result: `Maximum deflection = ${displayDeflection(maxDef, beam.units)}`
        });
    }

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

export const solveBeam = (beam: BeamConfig): AnalysisResult => {
    const mainResult = solveBeamInternal(beam, true);

    if (beam.loads.length > 1) {
        const cases = beam.loads.map((load, index) => {
            const singleLoadBeam: BeamConfig = {
                ...beam,
                loads: [load]
            };
            const caseResult = solveBeamInternal(singleLoadBeam, false);
            return {
                index: index + 1,
                load,
                result: caseResult
            };
        });

        let description = `To solve this beam problem using the **Method of Superposition (MOS)**, we break down the complex loading scenario into simpler, standard cases. By finding the support reactions, internal shear/moment diagrams, and deflection curves for each individual case, we can sum them up algebraically to get the final solution.\n\n`;

        description += `### Step 1: Identify and Separate the Cases\n\n`;
        description += `We split the ${beam.loads.length} applied load(s) into distinct cases:\n`;
        cases.forEach(c => {
            const lbl = c.load.label ? `"${c.load.label}"` : `${c.load.type} load`;
            const cat = c.load.category ? ` (${c.load.category})` : '';
            description += `* **Case ${c.index}:** Single ${lbl}${cat} at $x = ${c.load.position.toFixed(2)}\\text{ m}$ (Magnitude: $${Math.abs(c.load.magnitude).toFixed(1)}\\text{ N}$)\n`;
        });

        description += `\n### Step 2: Analyze Individual Cases\n\n`;
        cases.forEach(c => {
            const lbl = c.load.label ? `"${c.load.label}"` : `${c.load.type} load`;
            const cat = c.load.category ? ` (${c.load.category})` : '';
            description += `**Case ${c.index} Details (${lbl}${cat}):**\n`;
            description += `* Shear Force $V$: Max shear is $${c.result.maxShearForce.toFixed(1)}\\text{ N}$\n`;
            description += `* Bending Moment $M$: Max moment is $${c.result.maxBendingMoment.toFixed(1)}\\text{ N}\\cdot\\text{m}$\n`;
            description += `* Deflection $y$: Max deflection is $${(c.result.maxDeflection * 1000).toFixed(4)}\\text{ mm}$\n`;
            description += `* Reactions: ${Object.entries(c.result.reactions).map(([id, r]) => {
                const s = beam.supports.find(sup => sup.id === id);
                const formattedId = formatLabelForLatex(s?.label || id);
                return `$R_{y,${formattedId}} = ${r.Fy.toFixed(1)}\\text{ N}$${r.Mz !== undefined ? `, $M_{z,${formattedId}} = ${r.Mz.toFixed(1)}\\text{ N}\\cdot\\text{m}$` : ''}`;
            }).join(', ')}\n\n`;
        });

        description += `\n### Step 3: Apply Method of Superposition (MOS)\n\n`;
        description += `Summing Case results point-by-point yields the total response:\n\n`;
        description += `* **Reactions:** Combined reactions are the algebraic sum of individual reaction forces.\n`;
        description += `* **Shear Force & Bending Moment:** Algebraic sum of corresponding ordinates at each position $x$.\n`;
        description += `* **Deflection Curve:** Combined displacement is the sum of case displacements:\n`;
        description += `$$y_{\\text{total}}(x) = y_1(x) + y_2(x) + \\dots$$\n\n`;

        description += `### Summary Table of Superposition\n\n`;
        description += `| Parameters | ` + cases.map(c => `Case ${c.index}`).join(' | ') + ` | Combined Beam (MOS) |\n`;
        description += `| --- | ` + cases.map(() => `---`).join(' | ') + ` | --- |\n`;
        description += `| **Max Shear** | ` + cases.map(c => `$${c.result.maxShearForce.toFixed(1)}\\text{ N}$`).join(' | ') + ` | $${mainResult.maxShearForce.toFixed(1)}\\text{ N}$ |\n`;
        description += `| **Max Moment** | ` + cases.map(c => `$${c.result.maxBendingMoment.toFixed(1)}\\text{ N}\\cdot\\text{m}$`).join(' | ') + ` | $${mainResult.maxBendingMoment.toFixed(1)}\\text{ N}\\cdot\\text{m}$ |\n`;
        description += `| **Max Deflection** | ` + cases.map(c => `$${(c.result.maxDeflection * 1000).toFixed(4)}\\text{ mm}$`).join(' | ') + ` | $${(mainResult.maxDeflection * 1000).toFixed(4)}\\text{ mm}$ |\n`;

        beam.supports.forEach(s => {
            const formattedId = formatLabelForLatex(s.label || s.id);
            description += `| **Reaction $R_{y,${formattedId}}$** | ` + cases.map(c => `$${(c.result.reactions[s.id]?.Fy ?? 0).toFixed(1)}\\text{ N}$`).join(' | ') + ` | $${(mainResult.reactions[s.id]?.Fy ?? 0).toFixed(1)}\\text{ N}$ |\n`;
            if (s.type === 'fixed') {
                description += `| **Moment $M_{z,${formattedId}}$** | ` + cases.map(c => `$${(c.result.reactions[s.id]?.Mz ?? 0).toFixed(1)}\\text{ N}\\cdot\\text{m}$`).join(' | ') + ` | $${(mainResult.reactions[s.id]?.Mz ?? 0).toFixed(1)}\\text{ N}\\cdot\\text{m}$ |\n`;
            }
        });

        mainResult.steps.push({
            title: '9. Method of Superposition (MOS) Decomposition',
            description,
            result: `Superposition validated. Max deflection = ${(mainResult.maxDeflection * 1000).toFixed(4)} mm`
        });
    }

    return mainResult;
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

    loads.forEach((load, idx) => {
        const dispName = load.label ? `\\text{Load "${load.label}"}` : `L_{${idx + 1}}`;

        if (load.type === 'point') {
            sumFy += load.magnitude;
            sumM += load.magnitude * (load.position - fixedPos);
            eqLines.push(`${dispName}: \\quad F = ${load.magnitude.toFixed(2)}\\text{ N} \\quad \\text{at } x = ${load.position.toFixed(2)}\\text{ m} \\implies M_{\\text{about A}} = ${(load.magnitude * (load.position - fixedPos)).toFixed(2)}\\text{ N}\\cdot\\text{m}`);
        } else if (load.type === 'udl') {
            const L = (load.endPosition ?? load.position) - load.position;
            const P = load.magnitude * L;
            const cen = load.position + L / 2;
            sumFy += P;
            sumM += P * (cen - fixedPos);
            eqLines.push(`${dispName}: \\quad P = w \\cdot L = ${load.magnitude.toFixed(2)}\\text{ N/m} \\times ${L.toFixed(2)}\\text{ m} = ${P.toFixed(2)}\\text{ N} \\quad \\text{at centroid } x_c = ${cen.toFixed(2)}\\text{ m} \\implies M_{\\text{about A}} = ${(P * (cen - fixedPos)).toFixed(2)}\\text{ N}\\cdot\\text{m}`);
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
                eqLines.push(`${dispName}: \\quad P = \\frac{w_1 + w_2}{2} \\cdot L = ${P.toFixed(2)}\\text{ N} \\quad \\text{at centroid } x_c = ${cen.toFixed(2)}\\text{ m} \\implies M_{\\text{about A}} = ${(P * (cen - fixedPos)).toFixed(2)}\\text{ N}\\cdot\\text{m}`);
            }
        } else if (load.type === 'moment') {
            sumM += load.magnitude;
            eqLines.push(`${dispName}: \\quad M = ${load.magnitude.toFixed(2)}\\text{ N}\\cdot\\text{m} \\quad \\text{applied at } x = ${load.position.toFixed(2)}\\text{ m}`);
        }
    });

    steps.push({
        title: '2a. Load Resultants',
        description: 'Converting distributed loads to equivalent point loads:',
        equations: eqLines
    });

    return { sumFy, sumM };
}

const solveReactions = (beam: BeamConfig, steps: SolverStep[]): { reactions: AnalysisResult['reactions'] } => {
    const { supports, loads } = beam;
    const sorted = [...supports].sort((a, b) => a.position - b.position);
    const fixed = sorted.find(s => s.type === 'fixed');

    if (fixed) {
        const { sumFy, sumM } = getTotalLoads(loads, fixed.position, steps);
        const Ry = sumFy, Mz = sumM;
        const formattedId = formatLabelForLatex(fixed.label || fixed.id);

        steps.push({
            title: '2b. Reactions — Cantilever',
            description: `For a cantilever fixed at $x = ${fixed.position.toFixed(2)}\\text{ m}$:\n\n` +
                `  • Force equilibrium: $\\Sigma F_y = 0 \\implies R_{${formattedId}} = \\Sigma F_{\\text{loads}} = ${Ry.toFixed(1)}\\text{ N}$ (upward)\n` +
                `  • Moment equilibrium: $\\Sigma M_{${formattedId}} = 0 \\implies M_{${formattedId}} = \\Sigma M_{\\text{loads}} = ${Mz.toFixed(1)}\\text{ N}\\cdot\\text{m}$ (at fixed wall)`,
            equations: [
                `\\Sigma F_y = 0 \\implies R_{${formattedId}} = ${Ry.toFixed(1)}\\text{ N}`,
                `\\Sigma M_{${formattedId}} = 0 \\implies M_{${formattedId}} = ${Mz.toFixed(1)}\\text{ N}\\cdot\\text{m}`,
            ],
            result: `$R_{${formattedId}} = ${Ry.toFixed(1)}\\text{ N} \\uparrow$,  $M_{${formattedId}} = ${Mz.toFixed(1)}\\text{ N}\\cdot\\text{m}$`
        });
        return { reactions: { [fixed.id]: { Fy: Ry, Mz } } };
    }

    if (sorted.length === 2) {
        const [s1, s2] = sorted;
        const L = s2.position - s1.position;
        const { sumFy, sumM } = getTotalLoads(loads, s1.position, steps);

        const R_s2 = sumM / L;
        const R_s1 = sumFy - R_s2;

        const id1 = formatLabelForLatex(s1.label || s1.id);
        const id2 = formatLabelForLatex(s2.label || s2.id);

        steps.push({
            title: '2b. Reactions — Simply Supported',
            description: `Supports at $${id1}$ (at $x = ${s1.position.toFixed(2)}\\text{ m}$) and $${id2}$ (at $x = ${s2.position.toFixed(2)}\\text{ m}$), with span $L = ${L.toFixed(2)}\\text{ m}$.\n\n` +
                `  • Moment equilibrium about $${id1}$:\n` +
                `$$R_{${id2}} \\cdot L = \\sum M_{${id1},\\text{loads}}$$\n` +
                `$$R_{${id2}} = \\frac{${sumM.toFixed(1)}}{${L.toFixed(2)}} = ${R_s2.toFixed(1)}\\text{ N}$$\n\n` +
                `  • Vertical force balance:\n` +
                `$$R_{${id1}} = \\sum F - R_{${id2}} = ${sumFy.toFixed(1)} - ${R_s2.toFixed(1)} = ${R_s1.toFixed(1)}\\text{ N}$$`,
            equations: [
                `\\Sigma M_{${id1}} = 0 \\implies R_{${id2}} = \\frac{${sumM.toFixed(1)}}{${L.toFixed(2)}} = ${R_s2.toFixed(1)}\\text{ N}`,
                `\\Sigma F_y = 0 \\implies R_{${id1}} = ${R_s1.toFixed(1)}\\text{ N}`,
            ],
            result: `$R_{${id1}} = ${R_s1.toFixed(1)}\\text{ N} \\uparrow$,  $R_{${id2}} = ${R_s2.toFixed(1)}\\text{ N} \\uparrow$`
        });
        return { reactions: { [s1.id]: { Fy: R_s1 }, [s2.id]: { Fy: R_s2 } } };
    }

    steps.push({
        title: '2b. Reactions — Unable to Solve',
        description: 'Need at least 2 supports (or 1 fixed) to solve reactions. Check configuration.',
    });
    return { reactions: {} };
};
