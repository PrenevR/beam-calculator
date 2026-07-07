import type { AnalysisResult, BeamConfig, ChartInference } from '../utils/types';
import { displayForce, displayMoment, displayDeflection, displayLength, toLatexExp } from '../utils/types';
import React, { useState } from 'react';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Dot, Printer } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import katex from 'katex';

function MathText({ text }: { text: string }) {
    if (!text) return null;
    const blockParts = text.split(/(\$\$.*?\$\$)/gs);
    
    return (
        <>
            {blockParts.map((blockPart, bIdx) => {
                if (blockPart.startsWith('$$') && blockPart.endsWith('$$')) {
                    const formula = blockPart.slice(2, -2).trim();
                    return <BlockMath key={bIdx} math={formula} />;
                }
                
                const inlineParts = blockPart.split(/(\$.*?\$)/g);
                return (
                    <React.Fragment key={bIdx}>
                        {inlineParts.map((inlinePart, iIdx) => {
                            if (inlinePart.startsWith('$') && inlinePart.endsWith('$')) {
                                const formula = inlinePart.slice(1, -1).trim();
                                return <InlineMath key={iIdx} math={formula} />;
                            }
                            
                            const tokens = inlinePart.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
                            return (
                                <React.Fragment key={iIdx}>
                                    {tokens.map((token, tIdx) => {
                                        if (token.startsWith('**') && token.endsWith('**')) {
                                            return <strong key={tIdx} style={{ fontWeight: 700 }}>{token.slice(2, -2)}</strong>;
                                        }
                                        if (token.startsWith('*') && token.endsWith('*')) {
                                            return <em key={tIdx}>{token.slice(1, -1)}</em>;
                                        }
                                        if (token.startsWith('`') && token.endsWith('`')) {
                                            return <code key={tIdx} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', opacity: 0.8, background: 'rgba(0,0,0,0.06)', padding: '2px 4px', borderRadius: 4 }}>{token.slice(1, -1)}</code>;
                                        }
                                        return token;
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </React.Fragment>
                );
            })}
        </>
    );
}

interface Props { result: AnalysisResult; beam: BeamConfig; }

const DARK = () => document.documentElement.classList.contains('dark');

const TOOLTIP_STYLE = {
    backgroundColor: '#161b22', border: '1px solid #30363d',
    borderRadius: 8, color: '#e2e8f0',
    fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
};

/* ── Step card ── */
function renderDescription(desc: string) {
    const lines = desc.split('\n');
    let inTable = false;
    let tableRows: string[][] = [];
    const elements: React.ReactNode[] = [];

    lines.forEach((line, lineIdx) => {
        const trimmed = line.trim();
        
        // Handle Table rows
        if (trimmed.startsWith('|')) {
            inTable = true;
            const cells = line.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
            // Skip the divider row |---|---|
            if (cells.every(c => c.startsWith('-'))) {
                return;
            }
            tableRows.push(cells);
            return;
        } else if (inTable) {
            inTable = false;
            if (tableRows.length > 0) {
                const rows = [...tableRows];
                tableRows = [];
                elements.push(
                    <div key={`table-${lineIdx}`} style={{ overflowX: 'auto', margin: '12px 0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ borderBottom: `2px solid ${DARK() ? '#30363d' : '#e2e8f0'}`, background: DARK() ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                                    {rows[0].map((cell, cIdx) => (
                                        <th key={cIdx} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 'bold', border: `1px solid ${DARK() ? '#30363d' : '#cbd5e1'}` }}>
                                            <MathText text={cell} />
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.slice(1).map((row, rIdx) => (
                                    <tr key={rIdx} style={{ borderBottom: `1px solid ${DARK() ? '#21262d' : '#f1f5f9'}` }}>
                                        {row.map((cell, cIdx) => (
                                            <td key={cIdx} style={{ padding: '6px 8px', border: `1px solid ${DARK() ? '#21262d' : '#e2e8f0'}` }}>
                                                <MathText text={cell} />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            }
        }

        if (trimmed === '') return;

        if (trimmed.startsWith('###')) {
            elements.push(
                <h4 key={lineIdx} style={{ margin: '14px 0 6px', fontSize: '13px', fontWeight: 'bold', borderBottom: `1px dashed ${DARK() ? '#30363d' : '#cbd5e1'}`, paddingBottom: 2 }}>
                    <MathText text={trimmed.replace(/^###\s*/, '')} />
                </h4>
            );
        } else if (trimmed.startsWith('##')) {
            elements.push(
                <h3 key={lineIdx} style={{ margin: '16px 0 8px', fontSize: '14px', fontWeight: 'bold' }}>
                    <MathText text={trimmed.replace(/^##\s*/, '')} />
                </h3>
            );
        } else if (trimmed.startsWith('*') || trimmed.startsWith('•') || trimmed.startsWith('-')) {
            elements.push(
                <li key={lineIdx} style={{ marginLeft: 16, fontSize: '12.5px', listStyleType: 'disc', marginBottom: 2 }}>
                    <MathText text={trimmed.replace(/^[-*•]\s*/, '')} />
                </li>
            );
        } else {
            elements.push(
                <p key={lineIdx} style={{ margin: '4px 0', fontSize: '12.5px', lineHeight: 1.6 }}>
                    <MathText text={line} />
                </p>
            );
        }
    });

    // Flush table if still open at end of text
    if (inTable && tableRows.length > 0) {
        const rows = [...tableRows];
        elements.push(
            <div key="table-end" style={{ overflowX: 'auto', margin: '12px 0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                        <tr style={{ borderBottom: `2px solid ${DARK() ? '#30363d' : '#e2e8f0'}`, background: DARK() ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                            {rows[0].map((cell, cIdx) => (
                                <th key={cIdx} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 'bold', border: `1px solid ${DARK() ? '#30363d' : '#cbd5e1'}` }}>
                                    <MathText text={cell} />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.slice(1).map((row, rIdx) => (
                            <tr key={rIdx} style={{ borderBottom: `1px solid ${DARK() ? '#21262d' : '#f1f5f9'}` }}>
                                {row.map((cell, cIdx) => (
                                    <td key={cIdx} style={{ padding: '6px 8px', border: `1px solid ${DARK() ? '#21262d' : '#e2e8f0'}` }}>
                                        <MathText text={cell} />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    return elements;
}

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
                            <div style={{ fontSize: 12, color: DARK() ? '#58a6ff' : '#2563eb', fontWeight: 500, marginTop: 2 }}>
                                <MathText text={step.result} />
                            </div>
                        )}
                    </div>
                    {open ? <ChevronUp size={15} color="#94a3b8" /> : <ChevronDown size={15} color="#94a3b8" />}
                </button>

                {open && (
                    <div style={{ padding: '0 14px 12px', borderTop: `1px solid ${DARK() ? '#21262d' : '#e2e8f0'}` }}>
                        {/* Description content */}
                        <div style={{ margin: '10px 0 0', color: DARK() ? '#c9d1d9' : '#374151' }}>
                            {renderDescription(step.description)}
                        </div>

                        {/* Equations */}
                        {step.equations && step.equations.length > 0 && (
                            <div className="eq-box" style={{ marginTop: 12, padding: '8px 12px', background: DARK() ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)', borderRadius: 6 }}>
                                {step.equations.map((eq, i) => (
                                    <div key={i} style={{ margin: '4px 0' }}>
                                        <BlockMath math={eq} />
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
                            <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Support</th>
                            <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                            <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Position</th>
                            <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reaction <InlineMath math="R_y" /> (↑ +ve)</th>
                            <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reaction <InlineMath math="M_z" /></th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(result.reactions).map(([id, r]) => {
                            const sup = beam.supports.find(s => s.id === id);
                            const formattedId = id.includes('_') ? id : id.replace(/([A-Za-z])(\d+)/g, '$1_$2');
                            return (
                                <tr key={id} style={{ borderBottom: `1px solid ${DARK() ? '#21262d' : '#f1f5f9'}` }}>
                                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#f59e0b' }}>
                                        <InlineMath math={formattedId} />
                                    </td>
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
                    ['V_{\\text{max}}', displayForce(result.maxShearForce, u), '#3b82f6'],
                    ['M_{\\text{max}}', displayMoment(result.maxBendingMoment, u), '#a855f7'],
                    ['\\delta_{\\text{max}}', displayDeflection(result.maxDeflection, u), '#22c55e'],
                    ['\\sigma_{\\text{max}}', result.maxStress > 1e6 ? (result.maxStress / 1e6).toFixed(2) + ' MPa' : result.maxStress.toFixed(1) + ' Pa', '#f59e0b'],
                ] as [string, string, string][]).map(([label, val, color]) => (
                    <div key={label} className="card-inner" style={{ textAlign: 'center', padding: 12 }}>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                            <InlineMath math={label} />
                        </div>
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
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    className="btn-primary"
                    onClick={() => handlePrint(beam, result)}
                    style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}
                >
                    <Printer size={14} /> Export PDF Report
                </button>
            </div>

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

// ─── PDF Print / Export Helpers ──────────────────────────────────────────────

function drawPrintBeamSVG(beam: BeamConfig): string {
    const width = 700;
    const height = 120;
    const pad = 40;
    const beamY = 60;
    const beamW = width - 2 * pad;
    const scale = beamW / beam.length;

    let svg = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" style="background:#ffffff; font-family:sans-serif;">`;
    
    // Beam line
    svg += `<rect x="${pad}" y="${beamY - 4}" width="${beamW}" height="8" rx="2" fill="#475569" />`;

    // Supports
    beam.supports.forEach((s) => {
        const x = pad + s.position * scale;
        if (s.type === 'fixed') {
            const wallX = s.position === 0 ? x - 4 : x;
            svg += `<rect x="${wallX}" y="${beamY - 20}" width="4" height="40" fill="#1e293b" />`;
            for (let i = 0; i < 8; i++) {
                const hy = beamY - 20 + i * 5;
                svg += `<line x1="${wallX}" y1="${hy}" x2="${wallX + (s.position === 0 ? -5 : 5)}" y2="${hy + 3}" stroke="#1e293b" stroke-width="1" />`;
            }
        } else if (s.type === 'pin') {
            svg += `<polygon points="${x},${beamY} ${x - 8},${beamY + 14} ${x + 8},${beamY + 14}" fill="#f59e0b" stroke="#d97706" stroke-width="1.5" />`;
            svg += `<line x1="${x - 12}" y1="${beamY + 14}" x2="${x + 12}" y2="${beamY + 14}" stroke="#1e293b" stroke-width="1.5" />`;
        } else if (s.type === 'roller') {
            svg += `<polygon points="${x},${beamY} ${x - 8},${beamY + 11} ${x + 8},${beamY + 11}" fill="#3b82f6" stroke="#2563eb" stroke-width="1.5" />`;
            svg += `<circle cx="${x - 5}" cy="${beamY + 14}" r="3" fill="#3b82f6" stroke="#2563eb" stroke-width="1" />`;
            svg += `<circle cx="${x + 5}" cy="${beamY + 14}" r="3" fill="#3b82f6" stroke="#2563eb" stroke-width="1" />`;
            svg += `<line x1="${x - 12}" y1="${beamY + 17}" x2="${x + 12}" y2="${beamY + 17}" stroke="#1e293b" stroke-width="1.5" />`;
        }
        svg += `<text x="${x}" y="${beamY + 30}" font-size="9" font-weight="bold" fill="#475569" text-anchor="middle">${s.id}</text>`;
    });

    // Loads
    beam.loads.forEach((l, i) => {
        const label = l.label || `L${i+1}`;
        const x = pad + l.position * scale;
        if (l.type === 'point') {
            const isUp = l.magnitude < 0;
            const arrowY1 = isUp ? beamY + 30 : beamY - 30;
            const arrowY2 = isUp ? beamY + 4 : beamY - 4;
            const arrowHead = isUp ? `${x - 4},${beamY + 10} ${x},${beamY + 4} ${x + 4},${beamY + 10}` : `${x - 4},${beamY - 10} ${x},${beamY - 4} ${x + 4},${beamY - 10}`;
            svg += `<line x1="${x}" y1="${arrowY1}" x2="${x}" y2="${arrowY2}" stroke="#dc2626" stroke-width="2" />`;
            svg += `<polygon points="${arrowHead}" fill="#dc2626" />`;
            svg += `<text x="${x}" y="${isUp ? arrowY1 + 10 : arrowY1 - 6}" font-size="9" font-weight="bold" fill="#dc2626" text-anchor="middle">${label}: ${Math.abs(l.magnitude)}N</text>`;
        } else if (l.type === 'udl') {
            const endX = pad + (l.endPosition ?? beam.length) * scale;
            svg += `<path d="M ${x},${beamY - 15} Q ${(x + endX)/2},${beamY - 25} ${endX},${beamY - 15}" fill="none" stroke="#2563eb" stroke-dasharray="3 3" stroke-width="1.5" />`;
            for (let px = x; px <= endX; px += 15) {
                svg += `<line x1="${px}" y1="${beamY - 15}" x2="${px}" y2="${beamY - 4}" stroke="#2563eb" stroke-width="1" />`;
                svg += `<polygon points="${px - 2},${beamY - 8} ${px},${beamY - 4} ${px + 2},${beamY - 8}" fill="#2563eb" />`;
            }
            svg += `<text x="${(x + endX) / 2}" y="${beamY - 28}" font-size="9" font-weight="bold" fill="#2563eb" text-anchor="middle">${label}: ${Math.abs(l.magnitude)}N/m</text>`;
        } else if (l.type === 'uvl') {
            const endX = pad + (l.endPosition ?? beam.length) * scale;
            const w1 = l.magnitude;
            const w2 = l.endMagnitude ?? 0;
            const maxW = Math.max(Math.abs(w1), Math.abs(w2), 1), maxH = 30;
            const h1 = (Math.abs(w1) / maxW) * maxH, h2 = (Math.abs(w2) / maxW) * maxH;
            svg += `<polygon points="${x},${beamY - h1} ${endX},${beamY - h2} ${endX},${beamY - 4} ${x},${beamY - 4}" fill="#f97316" opacity="0.15" />`;
            svg += `<line x1="${x}" y1="${beamY - h1}" x2="${endX}" y2="${beamY - h2}" stroke="#f97316" stroke-width="1.5" />`;
            for (let idx = 0; idx < 5; idx++) {
                const t = idx / 4;
                const ax = x + t * (endX - x);
                const ah = h1 + (h2 - h1) * t;
                const localW = w1 + (w2 - w1) * t;
                const isUpward = localW < 0;
                const ay1 = isUpward ? beamY + 4 : beamY - ah;
                const ay2 = isUpward ? beamY - ah : beamY - 4;
                svg += `<line x1="${ax}" y1="${ay1}" x2="${ax}" y2="${ay2}" stroke="#f97316" stroke-width="1" />`;
                const arrowHead = isUpward ? `${ax - 2},${beamY - ah + 4} ${ax},${beamY - ah} ${ax + 2},${beamY - ah + 4}` : `${ax - 2},${beamY - 8} ${ax},${beamY - 4} ${ax + 2},${beamY - 8}`;
                svg += `<polygon points="${arrowHead}" fill="#f97316" />`;
            }
            svg += `<text x="${x}" y="${beamY - h1 - 5}" font-size="8" font-weight="bold" fill="#f97316">${w1.toFixed(0)}</text>`;
            svg += `<text x="${endX}" y="${beamY - h2 - 5}" font-size="8" font-weight="bold" fill="#f97316" text-anchor="end">${w2.toFixed(0)}</text>`;
            svg += `<text x="${(x + endX)/2}" y="${beamY - Math.max(h1, h2) - 10}" font-size="9" font-weight="bold" fill="#f97316" text-anchor="middle">${label}: UVL</text>`;
        } else if (l.type === 'moment') {
            const isCW = l.magnitude >= 0;
            const cx = x;
            const cy = beamY - 20;
            const radius = 12;
            const xStart = cx + radius * 0.707;
            const yStart = cy + radius * 0.707;
            const xEnd = cx + radius * 0.707;
            const yEnd = cy - radius * 0.707;
            const pathD = isCW
                ? `M ${xStart} ${yStart} A ${radius} ${radius} 0 1 0 ${xEnd} ${yEnd}`
                : `M ${xEnd} ${yEnd} A ${radius} ${radius} 0 1 1 ${xStart} ${yStart}`;
            svg += `<path d="${pathD}" fill="none" stroke="#a855f7" stroke-width="2" />`;
            const headX = xEnd;
            const headY = isCW ? yEnd : yStart;
            const arrowHead = isCW 
                ? `${headX - 3},${headY + 3} ${headX + 2},${headY} ${headX - 1},${headY - 4}`
                : `${headX - 3},${headY - 3} ${headX + 2},${headY} ${headX - 1},${headY + 4}`;
            svg += `<polygon points="${arrowHead}" fill="#a855f7" />`;
            svg += `<text x="${cx}" y="${cy - 16}" font-size="9" font-weight="bold" fill="#a855f7" text-anchor="middle">${label}: ${Math.abs(l.magnitude)}N·m</text>`;
        } else if (l.type === 'torque') {
            const isCW = l.magnitude >= 0;
            svg += `<text x="${x}" y="${beamY - 15}" font-size="20" fill="#22c55e" text-anchor="middle">${isCW ? '⟳' : '⟲'}</text>`;
            svg += `<text x="${x}" y="${beamY - 30}" font-size="9" font-weight="bold" fill="#22c55e" text-anchor="middle">${label}: ${Math.abs(l.magnitude)}N·m (T)</text>`;
        }
    });

    // Hinges
    (beam.hinges || []).forEach((h) => {
        const x = pad + h.position * scale;
        svg += `<circle cx="${x}" cy="${beamY}" r="5" fill="white" stroke="#64748b" stroke-width="2" />`;
        svg += `<text x="${x}" y="${beamY - 12}" font-size="8" font-weight="bold" fill="#475569" text-anchor="middle">${h.label || 'Hinge'}</text>`;
    });

    svg += `</svg>`;
    return svg;
}

function drawPrintChartSVG(
    data: { x: number, value: number }[],
    title: string,
    color: string,
    width = 700,
    height = 200,
    formatFn?: (v: number) => string
): string {
    if (data.length === 0) return '';
    const padX = 60;
    const padY = 30;
    const chartW = width - 2 * padX;
    const chartH = height - 2 * padY;

    const xs = data.map(d => d.x);
    const ys = data.map(d => d.value);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const toX = (x: number) => padX + ((x - minX) / rangeX) * chartW;
    const toY = (y: number) => padY + chartH - ((y - minY) / rangeY) * chartH;

    let svg = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" style="background:#ffffff; font-family:sans-serif;">`;
    
    // Title
    svg += `<text x="${width / 2}" y="20" font-size="11" font-weight="bold" fill="#334155" text-anchor="middle">${title}</text>`;

    // Grid lines & labels
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
        const tx = minX + (rangeX * i) / ticks;
        const px = toX(tx);
        svg += `<line x1="${px}" y1="${padY}" x2="${px}" y2="${padY + chartH}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3 3" />`;
        svg += `<text x="${px}" y="${padY + chartH + 15}" font-size="8" fill="#64748b" text-anchor="middle">${tx.toFixed(1)}m</text>`;

        const ty = minY + (rangeY * i) / ticks;
        const py = toY(ty);
        svg += `<line x1="${padX}" y1="${py}" x2="${padX + chartW}" y2="${py}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3 3" />`;
        const valStr = formatFn ? formatFn(ty) : ty.toFixed(1);
        svg += `<text x="${padX - 8}" y="${py + 3}" font-size="8" fill="#64748b" text-anchor="end">${valStr}</text>`;
    }

    if (minY < 0 && maxY > 0) {
        const zeroY = toY(0);
        svg += `<line x1="${padX}" y1="${zeroY}" x2="${padX + chartW}" y2="${zeroY}" stroke="#94a3b8" stroke-width="1.5" />`;
    }

    let pathD = `M ${toX(data[0].x)} ${toY(data[0].value)}`;
    for (let i = 1; i < data.length; i++) {
        pathD += ` L ${toX(data[i].x)} ${toY(data[i].value)}`;
    }

    const zeroYVal = toY(Math.max(minY, Math.min(0, maxY)));
    const areaD = `${pathD} L ${toX(data[data.length - 1].x)} ${zeroYVal} L ${toX(data[0].x)} ${zeroYVal} Z`;
    svg += `<path d="${areaD}" fill="${color}" fill-opacity="0.1" />`;
    svg += `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="2" />`;

    const maxVal = Math.max(...ys);
    const minVal = Math.min(...ys);
    const maxDataPoint = data.find(d => d.value === maxVal);
    const minDataPoint = data.find(d => d.value === minVal);

    if (maxDataPoint) {
        const maxXVal = toX(maxDataPoint.x);
        const maxYVal = toY(maxDataPoint.value);
        svg += `<circle cx="${maxXVal}" cy="${maxYVal}" r="4" fill="${color}" />`;
    }
    if (minDataPoint) {
        const minXVal = toX(minDataPoint.x);
        const minYVal = toY(minDataPoint.value);
        svg += `<circle cx="${minXVal}" cy="${minYVal}" r="4" fill="${color}" />`;
    }

    svg += `</svg>`;
    return svg;
}

function parseMarkdownAndMathToHTML(text: string): string {
    let html = text.replace(/\$\$(.*?)\$\$/gs, (_, latex) => {
        try {
            return katex.renderToString(latex.trim(), { displayMode: true, throwOnError: false });
        } catch (e) {
            return `<div class="math-error">${latex}</div>`;
        }
    });

    html = html.replace(/\$(.*?)\$/g, (_, latex) => {
        try {
            return katex.renderToString(latex.trim(), { displayMode: false, throwOnError: false });
        } catch (e) {
            return `<span class="math-error">${latex}</span>`;
        }
    });

    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/`(.*?)`/g, '<code style="font-family: monospace; font-size: 11px; padding: 2px 4px; background: rgba(0,0,0,0.06); border-radius: 4px;">$1</code>');

    return html;
}

function convertMarkdownToHTML(text: string): string {
    const lines = text.split('\n');
    let inTable = false;
    let tableRows: string[][] = [];
    let html = '';
    
    lines.forEach((line) => {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('|')) {
            inTable = true;
            const cells = line.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
            if (cells.every(c => c.startsWith('-'))) {
                return;
            }
            tableRows.push(cells);
            return;
        } else if (inTable) {
            inTable = false;
            if (tableRows.length > 0) {
                const rows = [...tableRows];
                tableRows = [];
                html += `<div style="overflow-x: auto; margin: 15px 0;">`;
                html += `<table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #cbd5e1;">`;
                html += `<thead>`;
                html += `<tr style="border-bottom: 2px solid #0f172a; background: rgba(0,0,0,0.02);">`;
                rows[0].forEach(cell => {
                    html += `<th style="padding: 8px 10px; text-align: left; font-weight: bold; border: 1px solid #e2e8f0;">${parseMarkdownAndMathToHTML(cell)}</th>`;
                });
                html += `</tr>`;
                html += `</thead>`;
                html += `<tbody>`;
                rows.slice(1).forEach((row) => {
                    html += `<tr style="border-bottom: 1px solid #e2e8f0;">`;
                    row.forEach(cell => {
                        html += `<td style="padding: 8px 10px; border: 1px solid #e2e8f0;">${parseMarkdownAndMathToHTML(cell)}</td>`;
                    });
                    html += `</tr>`;
                });
                html += `</tbody>`;
                html += `</table>`;
                html += `</div>`;
            }
        }
        
        if (trimmed === '') return;
        
        if (trimmed.startsWith('###')) {
            html += `<h4 style="margin: 16px 0 6px; font-size: 14px; font-weight: bold; color: #1e293b;">${parseMarkdownAndMathToHTML(trimmed.replace(/^###\s*/, ''))}</h4>`;
        } else if (trimmed.startsWith('##')) {
            html += `<h3 style="margin: 18px 0 8px; font-size: 15px; font-weight: bold; color: #0f172a;">${parseMarkdownAndMathToHTML(trimmed.replace(/^##\s*/, ''))}</h3>`;
        } else if (trimmed.startsWith('*') || trimmed.startsWith('•') || trimmed.startsWith('-')) {
            html += `<li style="margin-left: 20px; font-size: 13px; list-style-type: disc; margin-bottom: 4px;">${parseMarkdownAndMathToHTML(trimmed.replace(/^[-*•]\s*/, ''))}</li>`;
        } else {
            html += `<p style="margin: 6px 0; font-size: 13px; line-height: 1.6;">${parseMarkdownAndMathToHTML(trimmed)}</p>`;
        }
    });
    
    if (inTable && tableRows.length > 0) {
        const rows = [...tableRows];
        html += `<div style="overflow-x: auto; margin: 15px 0;">`;
        html += `<table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #cbd5e1;">`;
        html += `<thead>`;
        html += `<tr style="border-bottom: 2px solid #0f172a; background: rgba(0,0,0,0.02);">`;
        rows[0].forEach(cell => {
            html += `<th style="padding: 8px 10px; text-align: left; font-weight: bold; border: 1px solid #e2e8f0;">${parseMarkdownAndMathToHTML(cell)}</th>`;
        });
        html += `</tr>`;
        html += `</thead>`;
        html += `<tbody>`;
        rows.slice(1).forEach((row) => {
            html += `<tr style="border-bottom: 1px solid #e2e8f0;">`;
            row.forEach(cell => {
                html += `<td style="padding: 8px 10px; border: 1px solid #e2e8f0;">${parseMarkdownAndMathToHTML(cell)}</td>`;
            });
            html += `</tr>`;
        });
        html += `</tbody>`;
        html += `</table>`;
        html += `</div>`;
    }
    
    return html;
}

function generateDetailedCalculationsHTML(beam: BeamConfig, result: AnalysisResult): string {
    const fixedSupport = beam.supports.find(s => s.type === 'fixed');
    const EI = toLatexExp(beam.E * beam.I, 2);

    let html = '';
    html += `<div class="section">`;
    html += `<div class="section-title">4. Step-by-Step Worked Solution</div>`;
    
    html += `<div class="assumption-box">`;
    html += `<div class="assumption-title">Assumptions &amp; Given Information</div>`;
    html += `<div class="two-col">`;
    html += `<div>`;
    html += `<p><strong>Beam Type:</strong> ${fixedSupport ? 'Cantilever (one end fixed, one end free)' : 'Simply Supported (pinned at both ends)'}</p>`;
    html += `<p><strong>Beam Length:</strong> $L = ${beam.length.toFixed(2)}\\text{ m}$</p>`;
    html += `<p><strong>Elastic Modulus:</strong> $E = ${(beam.E / 1e9).toFixed(1)}\\text{ GPa}$</p>`;
    html += `<p><strong>Moment of Inertia:</strong> $I = ${toLatexExp(beam.I, 2)}\\text{ m}^4$</p>`;
    html += `<p><strong>Flexural Rigidity:</strong> $E I = ${EI}\\text{ N}\\cdot\\text{m}^2$</p>`;
    html += `</div>`;
    html += `<div>`;
    html += `<p><strong>Analysis assumptions:</strong></p>`;
    html += `<ul>`;
    html += `<li>Euler-Bernoulli beam theory applies</li>`;
    html += `<li>Material is linear elastic</li>`;
    html += `<li>Small deflections only</li>`;
    html += `<li>Self-weight of the beam is neglected</li>`;
    html += `</ul>`;
    html += `</div>`;
    html += `</div>`;
    html += `</div>`;

    result.steps.forEach((step, idx) => {
        html += `<div class="calc-step">`;
        html += `<div class="step-num">Step ${idx + 1}</div>`;
        html += `<div class="step-title">${step.title}</div>`;
        if (step.result) {
            html += `<div style="font-size: 12px; color: #2563eb; font-weight: bold; margin-bottom: 8px;">${parseMarkdownAndMathToHTML(step.result)}</div>`;
        }
        html += convertMarkdownToHTML(step.description);
        if (step.equations && step.equations.length > 0) {
            step.equations.forEach((eq) => {
                html += `<div class="eq-block">`;
                try {
                    html += katex.renderToString(eq, { displayMode: true, throwOnError: false });
                } catch (e) {
                    html += `$$\\text{${eq}}$$`;
                }
                html += `</div>`;
            });
        }
        html += `</div>`;
    });

    return parseMarkdownAndMathToHTML(html);
}

function handlePrint(beam: BeamConfig, result: AnalysisResult) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups to print/generate the PDF report.');
        return;
    }
    
    const beamSVG = drawPrintBeamSVG(beam);
    const sfSVG = drawPrintChartSVG(result.shearForce, "Shear Force V(x)", "#2563eb", 700, 200, (v) => v.toFixed(0) + " N");
    const bmSVG = drawPrintChartSVG(result.bendingMoment, "Bending Moment M(x)", "#7c3aed", 700, 200, (v) => v.toFixed(0) + " N\u00b7m");
    const defSVG = drawPrintChartSVG(result.deflection, "Deflection y(x)", "#047857", 700, 200, (v) => (v * 1000).toFixed(4) + " mm");
    
    const detailedCalculations = generateDetailedCalculationsHTML(beam, result);
    
    const reactionRows = Object.entries(result.reactions).map(([id, reac]) => {
        const sup = beam.supports.find(s => s.id === id);
        const formattedId = id.includes('_') ? id : id.replace(/([A-Za-z])(\d+)/g, '$1_$2');
        const idMath = katex.renderToString(formattedId, { displayMode: false, throwOnError: false });
        const ryMath = katex.renderToString(`R_{y,${formattedId}} = ${reac.Fy.toFixed(1)}\\text{ N}`, { displayMode: false, throwOnError: false });
        const mzMath = reac.Mz !== undefined 
            ? katex.renderToString(`M_{z,${formattedId}} = ${reac.Mz.toFixed(1)}\\text{ N}\\cdot\\text{m}`, { displayMode: false, throwOnError: false }) 
            : "—";
        return `
            <tr>
                <td><strong>${idMath}</strong></td>
                <td>${sup ? sup.type.toUpperCase() : 'SUPPORT'}</td>
                <td>${sup ? sup.position.toFixed(2) : '0.00'} m</td>
                <td>${ryMath}</td>
                <td>${mzMath}</td>
            </tr>
        `;
    }).join('');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Beam Analysis Report - ${new Date().toLocaleDateString()}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.28/dist/katex.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
        
        *, *::before, *::after { box-sizing: border-box; }
        
        body {
            font-family: 'Inter', sans-serif;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 40px;
            line-height: 1.5;
            font-size: 13px;
        }

        .header {
            border-bottom: 2.5px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 25px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }

        .brand-title {
            font-size: 22px;
            font-weight: 800;
            color: #1e3a8a;
            margin: 0;
        }

        .brand-sub {
            font-size: 10px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin: 2px 0 0;
        }

        .report-meta {
            text-align: right;
            font-size: 11px;
            color: #64748b;
        }

        .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }

        .section-title {
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
            border-left: 4px solid #2563eb;
            padding-left: 10px;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 12px;
        }

        .data-table th {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 8px 12px;
            font-weight: 600;
            text-align: left;
            color: #475569;
        }

        .data-table td {
            border: 1px solid #e2e8f0;
            padding: 8px 12px;
            color: #334155;
        }

        .data-table tr:nth-child(even) {
            background: #fdfdfd;
        }

        .svg-container {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            background: #ffffff;
            margin: 15px 0;
            text-align: center;
        }

        .chart-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 20px;
        }

        .calc-step {
            margin-bottom: 25px;
            padding: 15px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #f8fafc;
            page-break-inside: avoid;
        }

        .step-num {
            display: inline-block;
            background: #2563eb;
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 99px;
            margin-bottom: 6px;
            text-transform: uppercase;
        }

        .step-title {
            font-size: 13px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 8px;
        }

        .step-explain {
            font-size: 12px;
            color: #475569;
            margin-bottom: 12px;
        }

        .eq-block {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px;
            margin: 12px 0;
            text-align: center;
            font-size: 13px;
        }

        .assumption-box {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            background: #f1f5f9;
            padding: 15px;
            margin-bottom: 20px;
            page-break-inside: avoid;
        }

        .assumption-title {
            font-weight: 700;
            font-size: 12px;
            color: #334155;
            text-transform: uppercase;
            margin-bottom: 8px;
        }

        .two-col {
            display: flex;
            gap: 20px;
        }

        .two-col > div {
            flex: 1;
        }

        @media print {
            body { padding: 0; }
            .no-print { display: none; }
            .page-break { page-break-before: always; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1 class="brand-title">FOSS Advanced Beam Calculator</h1>
            <p class="brand-sub">Comprehensive Structural Analysis Report</p>
        </div>
        <div class="report-meta">
            <strong>Date:</strong> ${new Date().toLocaleDateString()}<br>
            <strong>System:</strong> ${beam.units.system === 'SI' ? 'SI Units (N, m)' : beam.units.system === 'kNm' ? 'Metric kN-m' : 'Imperial Units'}<br>
            <button class="no-print" onclick="window.print()" style="margin-top:8px; padding:6px 12px; background:#2563eb; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Print / Save PDF</button>
        </div>
    </div>

    <div class="section">
        <div class="section-title">1. Beam Configuration &amp; Loading Schematic</div>
        <div class="svg-container">
            ${beamSVG}
        </div>
    </div>

    <div class="section">
        <div class="section-title">2. Computed Support Reactions</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Support ID</th>
                    <th>Support Type</th>
                    <th>Position (x)</th>
                    <th>Vertical Force Reaction (Ry)</th>
                    <th>Bending Moment Reaction (Mz)</th>
                </tr>
            </thead>
            <tbody>
                ${reactionRows}
            </tbody>
        </table>
    </div>

    <div class="page-break"></div>

    <div class="section">
        <div class="section-title">3. Internal Force &amp; Deflection Diagrams</div>
        <div class="chart-grid">
            <div class="svg-container">
                ${sfSVG}
            </div>
            <div class="svg-container">
                ${bmSVG}
            </div>
            <div class="svg-container">
                ${defSVG}
            </div>
        </div>
    </div>

    <div class="page-break"></div>

    ${detailedCalculations}

</body>
</html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
}

