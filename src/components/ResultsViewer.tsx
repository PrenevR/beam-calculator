import type { AnalysisResult, BeamConfig, ChartInference } from '../utils/types';
import { displayForce, displayMoment, displayDeflection, displayLength } from '../utils/types';
import { useState } from 'react';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Dot } from 'lucide-react';

interface Props { result: AnalysisResult; beam: BeamConfig; }

const DARK = () => document.documentElement.classList.contains('dark');

const TOOLTIP_STYLE = {
    backgroundColor: '#161b22', border: '1px solid #30363d',
    borderRadius: 8, color: '#e2e8f0',
    fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
};

/* ── Step card ── */
function StepCard({ step, index }: { step: AnalysisResult['steps'][0]; index: number }) {
    const [open, setOpen] = useState(index < 2);
    return (
        <div className="step-card">
            <div className="step-dot">{index + 1}</div>
            <div style={{
                background: DARK() ? '#161b22' : '#f6f8fa',
                border: `1px solid ${DARK() ? '#21262d' : '#e2e8f0'}`,
                borderRadius: 10, overflow: 'hidden'
            }}>
                <button
                    onClick={() => setOpen(o => !o)}
                    style={{
                        width: '100%', textAlign: 'left', padding: '10px 14px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8
                    }}>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: DARK() ? '#e2e8f0' : '#0f172a' }}>{step.title}</div>
                        {step.result && (
                            <div style={{ fontSize: 11, color: '#58a6ff', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{step.result}</div>
                        )}
                    </div>
                    {open ? <ChevronUp size={15} color="#94a3b8" /> : <ChevronDown size={15} color="#94a3b8" />}
                </button>

                {open && (
                    <div style={{ padding: '0 14px 12px', borderTop: `1px solid ${DARK() ? '#21262d' : '#e2e8f0'}` }}>
                        {/* Description as bullet points */}
                        <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 12.5, color: DARK() ? '#c9d1d9' : '#374151', lineHeight: 1.9 }}>
                            {step.description.split('\n').filter(Boolean).map((line, i) => (
                                <li key={i} style={{ listStyleType: 'disc' }}>{line.replace(/^[-•]\s*/, '')}</li>
                            ))}
                        </ul>

                        {/* Equations */}
                        {step.equations && step.equations.length > 0 && (
                            <div className="eq-box" style={{ marginTop: 10 }}>
                                {step.equations.map((eq, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
                                        <span style={{ color: '#6e7681', userSelect: 'none' }}>›</span>
                                        <span>{eq}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Inference Card ── */
function InferenceCard({ inf, title }: { inf: ChartInference; title: string }) {
    return (
        <div className="inference-card">
            <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                {title} — Key Observations
            </div>
            <p style={{ margin: '0 0 8px', lineHeight: 1.7, fontSize: 12 }}>{inf.summary}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11,
                    background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 99,
                    fontFamily: 'JetBrains Mono, monospace', fontWeight: 600
                }}>
                    <TrendingUp size={11} /> max: {inf.maxValue.toFixed(3)} @ x={inf.maxPosition.toFixed(2)}m
                </span>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11,
                    background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 99,
                    fontFamily: 'JetBrains Mono, monospace', fontWeight: 600
                }}>
                    <TrendingDown size={11} /> min: {inf.minValue.toFixed(3)} @ x={inf.minPosition.toFixed(2)}m
                </span>
                {inf.zeroCrossings.length > 0 && (
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11,
                        background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 99,
                        fontFamily: 'JetBrains Mono, monospace',
                    }}>
                        <Dot size={11} /> zeros: {inf.zeroCrossings.map(z => z.toFixed(2) + 'm').join(', ')}
                    </span>
                )}
            </div>
        </div>
    );
}

/* ── Chart Section ── */
function ChartSection({
    title, subtitle, methodPoints, relevancePoints, inference, children, color
}: {
    title: string; subtitle: string; methodPoints: string[]; relevancePoints: string[];
    inference: ChartInference; children: React.ReactNode; color: string;
}) {
    const [showMethod, setShowMethod] = useState(false);
    const [showRelevance, setShowRelevance] = useState(false);
    const isDark = DARK();
    const listStyle: React.CSSProperties = {
        marginTop: 8, paddingLeft: 18, fontSize: 12,
        color: isDark ? '#8b949e' : '#64748b',
        lineHeight: 1.9,
        background: isDark ? '#0d1117' : '#f6f8fa',
        borderRadius: 8, padding: '10px 10px 10px 26px',
        border: `1px solid ${isDark ? '#21262d' : '#e2e8f0'}`
    };
    return (
        <div className="card" style={{ padding: 20 }}>
            <div style={{ marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 6px ${color}` }} />
                    {title}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>{subtitle}</p>
            </div>

            <div style={{ height: 220 }}>{children}</div>

            <InferenceCard inf={inference} title={title} />

            {/* Derivation toggle */}
            <div style={{ marginTop: 10 }}>
                <button onClick={() => setShowMethod(o => !o)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#6366f1', fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {showMethod ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    How was this graph derived?
                </button>
                {showMethod && (
                    <ul style={listStyle}>
                        {methodPoints.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                )}
            </div>

            {/* Relevance toggle */}
            <div style={{ marginTop: 8 }}>
                <button onClick={() => setShowRelevance(o => !o)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#d97706', fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {showRelevance ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    Why does this graph matter?
                </button>
                {showRelevance && (
                    <div className="relevance-box" style={{ marginTop: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 6, opacity: 0.8 }}>🏗️ Practical Relevance</div>
                        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.95 }}>
                            {relevancePoints.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Reactions Table ── */
function ReactionsTable({ result, beam }: Props) {
    const u = beam.units;
    return (
        <div className="card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 15 }}>Support Reactions</h3>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: '#94a3b8' }}>Computed from equilibrium: ΣFy = 0, ΣMz = 0</p>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ borderBottom: `2px solid ${DARK() ? '#21262d' : '#e2e8f0'}` }}>
                            {['Support', 'Type', 'Position', 'Reaction Ry (↑ +ve)', 'Reaction Mz'].map(h => (
                                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(result.reactions).map(([id, r]) => {
                            const sup = beam.supports.find(s => s.id === id);
                            return (
                                <tr key={id} style={{ borderBottom: `1px solid ${DARK() ? '#21262d' : '#f1f5f9'}` }}>
                                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>{id}</td>
                                    <td style={{ padding: '8px 10px', textTransform: 'capitalize', color: DARK() ? '#c9d1d9' : '#374151' }}>{sup?.type ?? '—'}</td>
                                    <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', color: '#94a3b8' }}>{sup ? displayLength(sup.position, u) : '—'}</td>
                                    <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#2563eb' }}>
                                        {displayForce(r.Fy, u)}
                                        <span style={{ color: r.Fy >= 0 ? '#22c55e' : '#ef4444', marginLeft: 4 }}>{r.Fy >= 0 ? '↑' : '↓'}</span>
                                    </td>
                                    <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', color: '#a855f7' }}>
                                        {r.Mz !== undefined ? displayMoment(r.Mz, u) : '—'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Summary row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 16 }}>
                {([
                    ['Max Shear', displayForce(result.maxShearForce, u), '#3b82f6'],
                    ['Max Moment', displayMoment(result.maxBendingMoment, u), '#a855f7'],
                    ['Max Deflection', displayDeflection(result.maxDeflection, u), '#22c55e'],
                    ['Max Stress', result.maxStress > 1e6 ? (result.maxStress / 1e6).toFixed(2) + ' MPa' : result.maxStress.toFixed(1) + ' Pa', '#f59e0b'],
                ] as [string, string, string][]).map(([label, val, color]) => (
                    <div key={label} className="card-inner" style={{ textAlign: 'center', padding: 12 }}>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 13, color }}>{val}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Main ── */
export default function ResultsViewer({ result, beam }: Props) {
    const u = beam.units;
    const skip = 2;
    const sfData = result.shearForce.filter((_, i) => i % skip === 0);
    const bmData = result.bendingMoment.filter((_, i) => i % skip === 0);
    const defData = result.deflection.filter((_, i) => i % skip === 0);
    const slopeData = result.slope.filter((_, i) => i % skip === 0);
    const twistData = result.angleOfTwist.filter((_, i) => i % skip === 0);

    const isDark = DARK();
    const axisColor = isDark ? '#4b5563' : '#94a3b8';
    const gridColor = isDark ? '#21262d' : '#f1f5f9';
    const xAxisTick = { fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fill: axisColor };
    const yAxisTick = { fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fill: axisColor };

    const xAxisEl = (
        <XAxis dataKey="x" type="number" domain={[0, beam.length]} stroke={axisColor}
            tick={xAxisTick} tickFormatter={(v: number) => v.toFixed(1)} label={{ value: 'x (m)', position: 'insideBottomRight', offset: -8, fill: axisColor, fontSize: 10 }} />
    );

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* 1. Reactions */}
            <ReactionsTable result={result} beam={beam} />

            {/* 2. Step-by-step (above charts) */}
            <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 900, fontSize: 16, boxShadow: '0 3px 8px #f59e0b35'
                    }}>∑</div>
                    <div>
                        <h3 style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>Step-by-Step Solution</h3>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>Click each step to expand equations and key data</p>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {result.steps.map((step, i) => <StepCard key={i} step={step} index={i} />)}
                </div>
            </div>

            {/* 3. SFD */}
            <ChartSection title="Shear Force Diagram (SFD)" subtitle="Internal shear V(x) vs position" color="#3b82f6"
                inference={result.sfInference}
                methodPoints={[
                    'V(x) = sum of all vertical forces to the LEFT of section x',
                    'At each point load, V(x) jumps discontinuously by the load magnitude',
                    'Under UDL, V(x) varies linearly (slope = w N/m)',
                    'Under UVL, V(x) varies quadratically',
                    'V = 0 at location of maximum bending moment',
                    'Computed at 501 equally-spaced points using direct summation',
                ]}
                relevancePoints={[
                    '🔧 Shear failure (rivets, welds, connections) occurs where |V| is maximum — check peaks',
                    '✂️ In simply supported beams, max shear is at the support closest to the largest load',
                    '📐 Bolts/pins in connections must be designed to resist V at the joint cross-section',
                    '⚠️ A sudden jump in the SFD indicates a concentrated (point) force — useful for identifying load positions',
                    '🏗️ In bridge girders, shear is critical near the abutments (supports); moment governs at midspan',
                ]}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sfData} margin={{ top: 8, right: 20, bottom: 24, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        {xAxisEl}
                        <YAxis stroke={axisColor} tick={yAxisTick} tickFormatter={(v: number) => (v / 1000).toFixed(1) + 'k'} />
                        <Tooltip contentStyle={TOOLTIP_STYLE}
                            formatter={(v: number | undefined) => [v !== undefined ? displayForce(v, u) : '0', 'V(x)']}
                            labelFormatter={(v: any) => typeof v === 'number' ? `x = ${v.toFixed(3)} m` : `x = ${v}`} />
                        <ReferenceLine y={0} stroke={axisColor} strokeWidth={1.5} />
                        <Area type="stepAfter" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.18} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    </AreaChart>
                </ResponsiveContainer>
            </ChartSection>

            {/* 4. BMD */}
            <ChartSection title="Bending Moment Diagram (BMD)" subtitle="Internal moment M(x) vs position" color="#a855f7"
                inference={result.bmInference}
                methodPoints={[
                    'M(x) = sum of moments of all forces to the LEFT of section x',
                    'Derived from SFD: dM/dx = V(x) — slope of BMD equals SFD value',
                    'Under point loads, M(x) is piecewise linear',
                    'Under UDL, M(x) is parabolic (2nd-order polynomial)',
                    'Maximum moment occurs where V(x) = 0',
                    'Sign convention: positive = sagging (bottom fibre in tension)',
                ]}
                relevancePoints={[
                    '📏 Cross-section sizing is dictated by max M: larger moment → deeper or wider beam needed',
                    '💥 Flexural (bending) stress σ = M·y/I — fibres farthest from neutral axis are most stressed',
                    '🌉 In a simply supported beam under UDL, the maximum moment is always at midspan = wL²/8',
                    '🔩 Reinforcement in concrete beams is placed at the tension fibre (bottom for positive M, top for negative M)',
                    '📊 Points of zero moment (inflection points) are ideal locations for splices and joints',
                ]}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={bmData} margin={{ top: 8, right: 20, bottom: 24, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        {xAxisEl}
                        <YAxis stroke={axisColor} tick={yAxisTick} tickFormatter={(v: number) => (v / 1000).toFixed(1) + 'k'} />
                        <Tooltip contentStyle={TOOLTIP_STYLE}
                            formatter={(v: number | undefined) => [v !== undefined ? displayMoment(v, u) : '0', 'M(x)']}
                            labelFormatter={(v: any) => typeof v === 'number' ? `x = ${v.toFixed(3)} m` : `x = ${v}`} />
                        <ReferenceLine y={0} stroke={axisColor} strokeWidth={1.5} />
                        <Area type="monotone" dataKey="value" stroke="#a855f7" fill="#a855f7" fillOpacity={0.18} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    </AreaChart>
                </ResponsiveContainer>
            </ChartSection>

            {/* 5. Deflection */}
            <ChartSection title="Deflection Profile y(x)" subtitle="Transverse beam displacement vs position" color="#22c55e"
                inference={result.deflectionInference}
                methodPoints={[
                    'EI·d²y/dx² = M(x)  →  curvature = moment / flexural rigidity',
                    'First integration gives slope: θ(x) = dy/dx + C₁',
                    'Second integration gives deflection: y(x) + C₂',
                    'Constants C₁, C₂ determined from boundary conditions (y=0 at supports, θ=0 at fixed ends)',
                    'Pin/Roller: y = 0; Fixed: y = 0 AND θ = 0',
                    'Numerical integration via trapezoidal rule with 500 sub-intervals',
                ]}
                relevancePoints={[
                    '🏠 Codes limit live-load deflection to L/360 (floors) or L/240 (roofs) — check against span',
                    '👁️ Deflection > L/500 is often visible to the naked eye and affects user perception of safety',
                    '🔧 Stiffer material (higher E) or deeper section (higher I) dramatically reduces deflection',
                    '⚙️ Pre-cambering concrete or steel beams accounts for expected deflection, keeping them level under load',
                    '💧 Excessive deflection in floor beams can cause ponding of water on flat roofs — a cumulative hazard',
                ]}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={defData} margin={{ top: 8, right: 20, bottom: 24, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        {xAxisEl}
                        <YAxis stroke={axisColor} tick={yAxisTick} tickFormatter={(v: number) => (v * 1000).toFixed(2) + 'mm'} />
                        <Tooltip contentStyle={TOOLTIP_STYLE}
                            formatter={(v: number | undefined) => [v !== undefined ? displayDeflection(v, u) : '0', 'y(x)']}
                            labelFormatter={(v: any) => typeof v === 'number' ? `x = ${v.toFixed(3)} m` : `x = ${v}`} />
                        <ReferenceLine y={0} stroke={axisColor} strokeWidth={1.5} />
                        <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                </ResponsiveContainer>
            </ChartSection>

            {/* 6. Slope */}
            <ChartSection title="Slope Profile θ(x)" subtitle="Beam rotation angle dy/dx vs position" color="#f59e0b"
                inference={{
                    maxValue: Math.max(...result.slope.map(s => s.value)),
                    maxPosition: result.slope.find(s => s.value === Math.max(...result.slope.map(x => x.value)))?.x ?? 0,
                    minValue: Math.min(...result.slope.map(s => s.value)),
                    minPosition: result.slope.find(s => s.value === Math.min(...result.slope.map(x => x.value)))?.x ?? 0,
                    zeroCrossings: [],
                    summary: `Maximum slope magnitude = ${(Math.max(...result.slope.map(s => Math.abs(s.value))) * 1000).toFixed(4)} mrad. Zero slope at location of peak deflection.`
                } as ChartInference}
                methodPoints={[
                    'θ(x) = dy/dx = first integral of M(x)/EI',
                    'For simply supported beams: maximum slope at both support ends',
                    'For cantilevers: maximum slope at the free end, zero at the fixed wall',
                    'θ = 0 at the point of maximum deflection (extremum condition)',
                ]}
                relevancePoints={[
                    '🚂 Rail joints and bridge expansion joints require slope limits to prevent vehicle jolt (typically < 1/200)',
                    '🪟 Door/window frames connected to beams must not rotate too much — otherwise frames jam or crack',
                    '⚙️ Shaft and gear couplings are sensitive to angular misalignment — slope must be within tolerance',
                    '📐 At zero-slope points, the beam is locally horizontal — these are the flattest regions of the deformed beam',
                    '🔬 In experimental mechanics, slope is measured via inclinometers to verify theoretical predictions',
                ]}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={slopeData} margin={{ top: 8, right: 20, bottom: 24, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        {xAxisEl}
                        <YAxis stroke={axisColor} tick={yAxisTick} tickFormatter={(v: number) => (v * 1000).toFixed(3)} />
                        <Tooltip contentStyle={TOOLTIP_STYLE}
                            formatter={(v: number | undefined) => [v !== undefined ? (v * 1000).toFixed(6) + ' mrad' : '0', 'θ(x)']}
                            labelFormatter={(v: any) => typeof v === 'number' ? `x = ${v.toFixed(3)} m` : `x = ${v}`} />
                        <ReferenceLine y={0} stroke={axisColor} strokeWidth={1.5} />
                        <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                </ResponsiveContainer>
            </ChartSection>

            {/* 7. Angle of Twist (only when torque loads present) */}
            {result.hasTorsion && (
                <ChartSection title="Angle of Twist φ(x)" subtitle="Torsional rotation along beam axis" color="#06b6d4"
                    inference={{
                        maxValue: Math.max(...result.angleOfTwist.map(d => d.value)),
                        maxPosition: result.angleOfTwist.find(d => d.value === Math.max(...result.angleOfTwist.map(x => x.value)))?.x ?? 0,
                        minValue: Math.min(...result.angleOfTwist.map(d => d.value)),
                        minPosition: result.angleOfTwist.find(d => d.value === Math.min(...result.angleOfTwist.map(x => x.value)))?.x ?? 0,
                        zeroCrossings: [],
                        summary: `Maximum angle of twist = ${result.maxAngleOfTwist.toFixed(6)} rad = ${(result.maxAngleOfTwist * 180 / Math.PI).toFixed(3)}°. Boundary: φ=0 at torsional restraint.`
                    } as ChartInference}
                    methodPoints={[
                        'φ(x) = ∫₀ˣ T(ξ)/(GJ) dξ',
                        'T(x) = internal torque (computed from applied torques)',
                        'G = shear modulus, J = polar moment of inertia',
                        'Boundary condition: φ = 0 at torsional restraint',
                        'Analogous to beam bending: twist is to torque as deflection is to bending moment',
                    ]}
                    relevancePoints={[
                        '🔄 Torsional rigidity is critical for long-span beams with eccentric loads to prevent twisting-induced instability',
                        '⚙️ Angular precision in rotating shafts depends on limiting φ — crucial for machinery and power transmission',
                        '📐 Boundary conditions (φ=0) must be carefully modeled to reflect actual physical restraints at the supports',
                        '🏗️ In structural steel, I-beams are weak in torsion compared to box sections; φ diagrams highlight this vulnerability',
                        '🔬 Verification of G and J properties can be done by comparing measured twist angles with calculated φ(x)',
                    ]}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={twistData} margin={{ top: 8, right: 20, bottom: 24, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            {xAxisEl}
                            <YAxis stroke={axisColor} tick={yAxisTick} tickFormatter={(v: number) => (v * 180 / Math.PI).toFixed(2) + '°'} />
                            <Tooltip contentStyle={TOOLTIP_STYLE}
                                formatter={(v: number | undefined) => [v !== undefined ? `${(v * 180 / Math.PI).toFixed(4)}° (${v.toFixed(6)} rad)` : '0', 'φ(x)']}
                                labelFormatter={(v: any) => typeof v === 'number' ? `x = ${v.toFixed(3)} m` : `x = ${v}`} />
                            <ReferenceLine y={0} stroke={axisColor} strokeWidth={1.5} />
                            <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartSection>
            )}
        </div>
    );
}
