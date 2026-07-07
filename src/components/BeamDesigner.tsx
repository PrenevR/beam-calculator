import type { BeamConfig, SupportType, LoadType } from '../utils/types';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Trash2, Plus, Settings2 } from 'lucide-react';

interface Props { beam: BeamConfig; setBeam: (b: BeamConfig) => void; }

/* ───────────────── Layout constants ──────────────────────── */
const BEAM_Y = 160;
const BEAM_H = 22;
const PAD_L = 60;
const PAD_R = 60;
const SVG_H = 340;
const SNAP = 0.05;
const DIST_Y = BEAM_Y + BEAM_H / 2 + 65;   // y for dimension line

/* ───────────────── Coord helpers ─────────────────────────── */
function posToX(pos: number, len: number, W: number) {
    return PAD_L + (pos / len) * (W - PAD_L - PAD_R);
}
function xToPos(x: number, len: number, W: number) {
    return Math.max(0, Math.min(len, Math.round(((x - PAD_L) / (W - PAD_L - PAD_R) * len) / SNAP) * SNAP));
}

/* ───────────────── Support Icons ─────────────────────────── */
function PinIcon({ cx, cy }: { cx: number; cy: number }) {
    return (
        <g>
            <polygon points={`${cx},${cy} ${cx - 18},${cy + 26} ${cx + 18},${cy + 26}`}
                fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
            <circle cx={cx} cy={cy + 2} r={4.5} fill="white" stroke="#b45309" strokeWidth="1.5" />
            <line x1={cx - 24} y1={cy + 28} x2={cx + 24} y2={cy + 28} stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
            {[-18, -10, -2, 6, 14].map(dx => <line key={dx} x1={cx + dx} y1={cy + 28} x2={cx + dx - 6} y2={cy + 38} stroke="#d97706" strokeWidth="1.5" />)}
        </g>
    );
}
function RollerIcon({ cx, cy }: { cx: number; cy: number }) {
    return (
        <g>
            <polygon points={`${cx},${cy} ${cx - 16},${cy + 22} ${cx + 16},${cy + 22}`}
                fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
            <circle cx={cx} cy={cy + 2} r={4} fill="white" stroke="#b45309" strokeWidth="1.5" />
            {[-8, 0, 8].map(dx => <circle key={dx} cx={cx + dx} cy={cy + 30} r={5} fill="#fbbf24" stroke="#b45309" strokeWidth="1.5" />)}
            <line x1={cx - 18} y1={cy + 36} x2={cx + 18} y2={cy + 36} stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
        </g>
    );
}
function FixedIcon({ cx, cy, side }: { cx: number; cy: number; side: 'left' | 'right' }) {
    const WW = 18, WH = 66, wallX = side === 'left' ? cx - WW : cx, outerX = side === 'left' ? cx - WW : cx + WW;
    return (
        <g>
            <rect x={wallX} y={cy - WH / 2} width={WW} height={WH} fill="#475569" stroke="#334155" strokeWidth="1" />
            {Array.from({ length: 8 }, (_, i) => {
                const y0 = cy - WH / 2 + 4 + i * 8;
                return <line key={i} x1={outerX} y1={y0} x2={outerX + (side === 'left' ? -10 : 10)} y2={y0 + 7} stroke="#64748b" strokeWidth="1.2" />;
            })}
        </g>
    );
}

/* ───────────────── Load visuals ──────────────────────────── */
const COLORS: Record<string, string> = { point: '#ef4444', udl: '#3b82f6', uvl: '#f97316', moment: '#a855f7', torque: '#22c55e' };

function Marker({ id, color }: { id: string; color: string }) {
    return (
        <marker id={id} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={color} />
        </marker>
    );
}

function PointArrow({ x, beamY, magnitude }: { x: number; beamY: number; magnitude: number }) {
    const c = COLORS.point, id = `pa${Math.abs(Math.round(x * 10))}`;
    const tip = beamY - BEAM_H / 2;
    const isUpward = magnitude < 0;
    const y1 = isUpward ? tip : tip - 55;
    const y2 = isUpward ? tip - 55 : tip;
    return (
        <g>
            <defs><Marker id={id} color={c} /></defs>
            <line x1={x} y1={y1} x2={x} y2={y2} stroke={c} strokeWidth="3" markerEnd={`url(#${id})`}
                style={{ filter: `drop-shadow(0 2px 6px ${c}55)` }} />
        </g>
    );
}
function UDLVisual({ x1, x2, beamY, magnitude }: { x1: number; x2: number; beamY: number; magnitude: number }) {
    const c = COLORS.udl, id = `udl${Math.abs(Math.round(x1 * 10))}`;
    const top = beamY - BEAM_H / 2 - 48, tipY = beamY - BEAM_H / 2;
    const cnt = Math.max(3, Math.round((x2 - x1) / 18));
    const isUpward = magnitude < 0;
    return (
        <g>
            <defs><Marker id={id} color={c} /></defs>
            <rect x={x1} y={top} width={x2 - x1} height={48} fill={c} opacity={0.09} />
            <line x1={x1} y1={top} x2={x2} y2={top} stroke={c} strokeWidth="2.5" strokeLinecap="round" />
            {Array.from({ length: cnt }, (_, i) => {
                const ax = x1 + (i / (cnt - 1)) * (x2 - x1);
                const y1 = isUpward ? tipY : top;
                const y2 = isUpward ? top : tipY;
                return <line key={i} x1={ax} y1={y1} x2={ax} y2={y2} stroke={c} strokeWidth="1.8" markerEnd={`url(#${id})`} />;
            })}
            <text x={(x1 + x2) / 2} y={top - 5} fontSize="10" fill={c} textAnchor="middle" fontFamily="JetBrains Mono,monospace" fontWeight="700">{magnitude.toFixed(0)} N/m</text>
        </g>
    );
}
function UVLVisual({ x1, x2, beamY, w1, w2 }: { x1: number; x2: number; beamY: number; w1: number; w2: number }) {
    const c = COLORS.uvl, id = `uvl${Math.abs(Math.round(x1 * 10))}`;
    const maxW = Math.max(Math.abs(w1), Math.abs(w2), 1), maxH = 54;
    const h1 = (Math.abs(w1) / maxW) * maxH, h2 = (Math.abs(w2) / maxW) * maxH, tipY = beamY - BEAM_H / 2;
    return (
        <g>
            <defs><Marker id={id} color={c} /></defs>
            <polygon points={`${x1},${tipY - h1} ${x2},${tipY - h2} ${x2},${tipY} ${x1},${tipY}`} fill={c} opacity={0.14} />
            <line x1={x1} y1={tipY - h1} x2={x2} y2={tipY - h2} stroke={c} strokeWidth="2.5" strokeLinecap="round" />
            {Array.from({ length: 5 }, (_, i) => {
                const t = i / 4;
                const ax = x1 + t * (x2 - x1);
                const ah = h1 + (h2 - h1) * t;
                const localW = w1 + (w2 - w1) * t;
                const isUpward = localW < 0;
                const y1 = isUpward ? tipY : tipY - ah;
                const y2 = isUpward ? tipY - ah : tipY;
                return <line key={i} x1={ax} y1={y1} x2={ax} y2={y2} stroke={c} strokeWidth="1.8" markerEnd={`url(#${id})`} />;
            })}
            <text x={x1} y={tipY - h1 - 5} fontSize="9" fill={c} fontFamily="JetBrains Mono,monospace">{w1.toFixed(0)}</text>
            <text x={x2} y={tipY - h2 - 5} fontSize="9" fill={c} textAnchor="end" fontFamily="JetBrains Mono,monospace">{w2.toFixed(0)}</text>
        </g>
    );
}
function MomentArc({ x, beamY, magnitude }: { x: number; beamY: number; magnitude: number }) {
    const c = COLORS.moment;
    const mid = `mom${Math.abs(Math.round(x * 10))}`;
    const cx = x;
    const cy = beamY - BEAM_H / 2 - 20;
    const radius = 18;
    const xStart = cx + radius * 0.707;
    const yStart = cy + radius * 0.707;
    const xEnd = cx + radius * 0.707;
    const yEnd = cy - radius * 0.707;
    const pathD = magnitude >= 0
        ? `M ${xStart} ${yStart} A ${radius} ${radius} 0 1 0 ${xEnd} ${yEnd}`
        : `M ${xEnd} ${yEnd} A ${radius} ${radius} 0 1 1 ${xStart} ${yStart}`;
    return (
        <g>
            <defs>
                <marker id={mid} markerWidth="7" markerHeight="6" refX="3" refY="3" orient="auto">
                    <polygon points="0 0, 7 3, 0 6" fill={c} />
                </marker>
            </defs>
            <path d={pathD}
                fill="none" stroke={c} strokeWidth="2.5" markerEnd={`url(#${mid})`}
                style={{ filter: `drop-shadow(0 0 5px ${c}66)` }} />
        </g>
    );
}
function TorqueIcon({ x, beamY, magnitude }: { x: number; beamY: number; magnitude: number }) {
    const c = COLORS.torque;
    return (
        <g>
            <text x={x} y={beamY - BEAM_H / 2 - 44} fontSize="26" textAnchor="middle" fill={c}
                style={{ filter: `drop-shadow(0 0 6px ${c}77)` }}>
                {magnitude >= 0 ? '⟳' : '⟲'}
            </text>
        </g>
    );
}

/* ────────────── Distance callout overlay ─────────────────── */
function DistanceCallouts({ selectedId, beam, svgW }: { selectedId: string; beam: BeamConfig; svgW: number }) {
    const toX = (p: number) => posToX(p, beam.length, svgW);
    const isDark = document.documentElement.classList.contains('dark');
    const lineColor = isDark ? '#6366f1' : '#6366f1';
    const dotColor = isDark ? '#818cf8' : '#4f46e5';
    const textBg = isDark ? '#1e1b4b' : '#eef2ff';
    const textFill = isDark ? '#a5b4fc' : '#3730a3';

    // Collect all positions we measure from/to
    const selSupport = beam.supports.find(s => s.id === selectedId);
    const selLoad = beam.loads.find(l => l.id === selectedId);
    const selPos = selSupport?.position ?? selLoad?.position ?? null;
    if (selPos === null) return null;

    // All reference positions: beam ends + all other supports + all loads
    const refs: { label: string; pos: number }[] = [
        { label: 'A (0)', pos: 0 },
        { label: `B (${beam.length.toFixed(1)}m)`, pos: beam.length },
        ...beam.supports.filter(s => s.id !== selectedId).map(s => ({ label: `${s.type[0].toUpperCase()}@${s.position.toFixed(2)}`, pos: s.position })),
        ...beam.loads.filter(l => l.id !== selectedId).map(l => ({ label: `${l.type}@${l.position.toFixed(2)}`, pos: l.position })),
    ];

    const selX = toX(selPos);
    const DY = DIST_Y;

    return (
        <g opacity={0.92} className="animate-fade-in">
            {/* Horizontal baseline */}
            <line x1={toX(0)} y1={DY} x2={toX(beam.length)} y2={DY}
                stroke={lineColor} strokeWidth="0.8" strokeDasharray="4 3" opacity={0.4} />

            {/* Drop line from selected */}
            <line x1={selX} y1={BEAM_Y + BEAM_H / 2} x2={selX} y2={DY + 12}
                stroke={lineColor} strokeWidth="1.5" strokeDasharray="3 2" opacity={0.7} />
            <circle cx={selX} cy={DY} r={4} fill={dotColor} opacity={0.9} />

            {refs.map((ref, i) => {
                const rx = toX(ref.pos);
                const dist = Math.abs(ref.pos - selPos);
                if (dist < 0.01) return null;
                const midX = (selX + rx) / 2;
                const yOff = DY + 8 + (i % 2) * 16; // stagger labels up/down

                return (
                    <g key={i}>
                        {/* Tick at reference */}
                        <line x1={rx} y1={DY - 5} x2={rx} y2={DY + 5} stroke={lineColor} strokeWidth="1.2" />
                        {/* Double-headed arrow */}
                        <defs>
                            <marker id={`d${i}s`} markerWidth="5" markerHeight="5" refX="0" refY="2.5" orient="auto">
                                <polygon points="5 0, 0 2.5, 5 5" fill={lineColor} />
                            </marker>
                            <marker id={`d${i}e`} markerWidth="5" markerHeight="5" refX="5" refY="2.5" orient="auto">
                                <polygon points="0 0, 5 2.5, 0 5" fill={lineColor} />
                            </marker>
                        </defs>
                        <line
                            x1={Math.min(selX, rx) + 2} y1={DY}
                            x2={Math.max(selX, rx) - 2} y2={DY}
                            stroke={lineColor} strokeWidth="1.2"
                            markerStart={`url(#d${i}s)`}
                            markerEnd={`url(#d${i}e)`}
                        />
                        {/* Distance label */}
                        <rect x={midX - 18} y={yOff - 9} width={36} height={14} rx={4} fill={textBg} opacity={0.92} />
                        <text x={midX} y={yOff + 1.5} textAnchor="middle" fontSize="9"
                            fill={textFill} fontFamily="JetBrains Mono,monospace" fontWeight="700">
                            {dist.toFixed(2)}m
                        </text>
                    </g>
                );
            })}
        </g>
    );
}

/* ────────── Inline SVG input ──────────────────────────────── */
function InlineSVGInput({ value, onCommit, x, y }: { value: number; onCommit: (v: number) => void; x: number; y: number }) {
    const [val, setVal] = useState(String(value));
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
    const commit = () => { const n = parseFloat(val); onCommit(isNaN(n) ? value : n); };
    return (
        <foreignObject x={x - 42} y={y} width={88} height={24}>
            <input ref={ref} value={val}
                onChange={e => setVal(e.target.value)}
                onBlur={commit}
                onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onCommit(value); }}
                className="inline-edit-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
            />
        </foreignObject>
    );
}

/* ────────── Selected item properties panel ────────────────── */
function SelectedPanel({ selectedId, beam, setBeam }: { selectedId: string; beam: BeamConfig; setBeam: (b: BeamConfig) => void }) {
    const isDark = document.documentElement.classList.contains('dark');
    const sup = beam.supports.find(s => s.id === selectedId);
    const lod = beam.loads.find(l => l.id === selectedId);
    const hng = (beam.hinges || []).find(h => h.id === selectedId);

    if (!sup && !lod && !hng) return null;

    const panelBg = isDark ? 'linear-gradient(135deg,#0c1929 0%,#130c29 100%)' : 'linear-gradient(135deg,#eff6ff 0%,#f5f3ff 100%)';
    const panelBorder = isDark ? '#1d3a5c' : '#bfdbfe';
    const titleColor = isDark ? '#a5b4fc' : '#3730a3';
    const subColor = isDark ? '#8b949e' : '#7a8394';

    return (
        <div style={{ background: panelBg, border: `1.5px solid ${panelBorder}`, borderRadius: 12, padding: '12px 14px', marginTop: 10, animation: 'slideDown 0.22s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: titleColor, marginBottom: 10 }}>
                ✦ Selected: {sup ? `${sup.type} support` : hng ? 'Internal hinge' : `${lod!.type} load`}
            </div>

            {sup && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div>
                        <label className="field-label">Type</label>
                        <select value={sup.type} className="select" style={{ fontSize: 12, padding: '4px 8px' }}
                            onChange={e => setBeam({ ...beam, supports: beam.supports.map(s => s.id === selectedId ? { ...s, type: e.target.value as SupportType } : s) })}>
                            <option value="pin">Pin</option>
                            <option value="roller">Roller</option>
                            <option value="fixed">Fixed</option>
                        </select>
                    </div>
                    <div>
                        <label className="field-label">Position (m)</label>
                        <input type="number" value={sup.position} step={0.1}
                            onChange={e => setBeam({ ...beam, supports: beam.supports.map(s => s.id === selectedId ? { ...s, position: Number(e.target.value) } : s) })}
                            className="input" style={{ width: 80, fontSize: 12, padding: '4px 8px', fontFamily: 'JetBrains Mono,monospace' }} />
                    </div>
                    <button onClick={() => setBeam({ ...beam, supports: beam.supports.filter(s => s.id !== selectedId) })}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}>
                        <Trash2 size={14} />
                    </button>
                </div>
            )}

            {hng && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 120 }}>
                        <label className="field-label">Custom Name</label>
                        <input type="text" value={hng.label || ''} placeholder="e.g. Hinge 1"
                            onChange={e => setBeam({ ...beam, hinges: (beam.hinges || []).map(h => h.id === selectedId ? { ...h, label: e.target.value } : h) })}
                            className="input" style={{ width: '100%', fontSize: 12, padding: '4px 8px' }} />
                    </div>
                    <div>
                        <label className="field-label">Position (m)</label>
                        <input type="number" value={hng.position} step={0.1}
                            onChange={e => setBeam({ ...beam, hinges: (beam.hinges || []).map(h => h.id === selectedId ? { ...h, position: Number(e.target.value) } : h) })}
                            className="input" style={{ width: 80, fontSize: 12, padding: '4px 8px', fontFamily: 'JetBrains Mono,monospace' }} />
                    </div>
                    <button onClick={() => setBeam({ ...beam, hinges: (beam.hinges || []).filter(h => h.id !== selectedId) })}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}>
                        <Trash2 size={14} />
                    </button>
                </div>
            )}

            {lod && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ flex: 1, minWidth: 120 }}>
                            <label className="field-label">Custom Name</label>
                            <input type="text" value={lod.label || ''} placeholder="e.g. Roof Load"
                                onChange={e => setBeam({ ...beam, loads: beam.loads.map(l => l.id === selectedId ? { ...l, label: e.target.value } : l) })}
                                className="input" style={{ width: '100%', fontSize: 12, padding: '4px 8px' }} />
                        </div>
                        <div>
                            <label className="field-label">Category</label>
                            <select value={lod.category || 'live'} className="select" style={{ fontSize: 12, padding: '4px 8px' }}
                                onChange={e => setBeam({ ...beam, loads: beam.loads.map(l => l.id === selectedId ? { ...l, category: e.target.value as any } : l) })}>
                                <option value="live">Live Load</option>
                                <option value="dead">Dead Load</option>
                                <option value="wind">Wind Load</option>
                                <option value="roof">Roof Load</option>
                                <option value="rain">Rain Load</option>
                                <option value="snow">Snow Load</option>
                                <option value="seismic">Earthquake Load</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div>
                            <label className="field-label">Type</label>
                            <select value={lod.type} className="select" style={{ fontSize: 12, padding: '4px 8px', color: COLORS[lod.type] }}
                                onChange={e => setBeam({ ...beam, loads: beam.loads.map(l => l.id === selectedId ? { ...l, type: e.target.value as LoadType } : l) })}>
                                <option value="point">Point Load</option>
                                <option value="udl">UDL</option>
                                <option value="uvl">UVL</option>
                                <option value="moment">Moment</option>
                                <option value="torque">Torque</option>
                            </select>
                        </div>
                        <div>
                            <label className="field-label">Position (m)</label>
                            <input type="number" value={lod.position} step={0.1}
                                onChange={e => setBeam({ ...beam, loads: beam.loads.map(l => l.id === selectedId ? { ...l, position: Number(e.target.value) } : l) })}
                                className="input" style={{ width: 72, fontSize: 12, padding: '4px 8px', fontFamily: 'JetBrains Mono,monospace' }} />
                        </div>
                        <div>
                            <label className="field-label">Magnitude</label>
                            <input type="number" value={lod.magnitude} step={100}
                                onChange={e => setBeam({ ...beam, loads: beam.loads.map(l => l.id === selectedId ? { ...l, magnitude: Number(e.target.value) } : l) })}
                                className="input" style={{ width: 90, fontSize: 12, padding: '4px 8px', fontFamily: 'JetBrains Mono,monospace' }} />
                        </div>
                        {(lod.type === 'udl' || lod.type === 'uvl') && (
                            <div>
                                <label className="field-label">End Pos (m)</label>
                                <input type="number" value={lod.endPosition ?? lod.position + 2} step={0.1}
                                    onChange={e => setBeam({ ...beam, loads: beam.loads.map(l => l.id === selectedId ? { ...l, endPosition: Number(e.target.value) } : l) })}
                                    className="input" style={{ width: 72, fontSize: 12, padding: '4px 8px', fontFamily: 'JetBrains Mono,monospace' }} />
                            </div>
                        )}
                        {lod.type === 'uvl' && (
                            <div>
                                <label className="field-label">End Mag</label>
                                <input type="number" value={lod.endMagnitude ?? 0} step={100}
                                    onChange={e => setBeam({ ...beam, loads: beam.loads.map(l => l.id === selectedId ? { ...l, endMagnitude: Number(e.target.value) } : l) })}
                                    className="input" style={{ width: 90, fontSize: 12, padding: '4px 8px', fontFamily: 'JetBrains Mono,monospace' }} />
                            </div>
                        )}
                        <button onClick={() => setBeam({ ...beam, loads: beam.loads.filter(l => l.id !== selectedId) })}
                            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}>
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            )}

            <div style={{ marginTop: 8, fontSize: 10.5, color: subColor }}>
                Tip: You can also drag or double-click values on the canvas to edit.
            </div>
        </div>
    );
}

/* ────────── Drag mode types ──────────────────────────────── */
type DragMode =
    | { kind: 'support'; id: string }
    | { kind: 'load-move'; id: string }
    | { kind: 'load-resize-start'; id: string }
    | { kind: 'load-resize-end'; id: string }
    | { kind: 'hinge'; id: string };

/* ────────── Main Component ───────────────────────────────── */
export default function BeamDesigner({ beam, setBeam }: Props) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [svgW, setSvgW] = useState(800);
    const [drag, setDrag] = useState<DragMode | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const [dblEdit, setDblEdit] = useState<{ id: string; field: 'magnitude' | 'endMagnitude' | 'position' } | null>(null);
    const [showMore, setShowMore] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    /* Reactive width */
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const obs = new ResizeObserver(es => { const w = es[0].contentRect.width; if (w > 0) setSvgW(w); });
        obs.observe(el);
        return () => obs.disconnect();
    }, [isFullscreen]); // refire on fullscreen toggle to fit screen width

    const toX = useCallback((p: number) => posToX(p, beam.length, svgW), [beam.length, svgW]);
    const toPos = useCallback((x: number) => xToPos(x, beam.length, svgW), [beam.length, svgW]);

    /* SVG mouse-x helper */
    const svgMX = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
        const r = svgRef.current!.getBoundingClientRect();
        return (e.clientX - r.left) * (svgW / r.width);
    }, [svgW]);

    /* Mouse move handler */
    const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
        if (!drag) return;
        const pos = toPos(svgMX(e));
        setBeam((() => {
            if (drag.kind === 'support')
                return { ...beam, supports: beam.supports.map(s => s.id === drag.id ? { ...s, position: pos } : s) };
            if (drag.kind === 'hinge')
                return { ...beam, hinges: (beam.hinges || []).map(h => h.id === drag.id ? { ...h, position: pos } : h) };
            if (drag.kind === 'load-move')
                return {
                    ...beam, loads: beam.loads.map(l => {
                        if (l.id !== drag.id) return l;
                        const span = (l.endPosition ?? l.position) - l.position;
                        return { ...l, position: pos, endPosition: l.endPosition !== undefined ? pos + span : undefined };
                    })
                };
            if (drag.kind === 'load-resize-start')
                return { ...beam, loads: beam.loads.map(l => l.id !== drag.id ? l : { ...l, position: Math.min(pos, (l.endPosition ?? l.position + 2) - 0.1) }) };
            if (drag.kind === 'load-resize-end')
                return { ...beam, loads: beam.loads.map(l => l.id !== drag.id ? l : { ...l, endPosition: Math.max(pos, l.position + 0.1) }) };
            return beam;
        })());
    }, [drag, beam, toPos, svgMX, setBeam]);

    /* Keyboard delete */
    useEffect(() => {
        const fn = (e: KeyboardEvent) => {
            if (!selected || dblEdit) return;
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const isSupp = beam.supports.some(s => s.id === selected);
                const isHinge = (beam.hinges || []).some(h => h.id === selected);
                setBeam(isSupp
                    ? { ...beam, supports: beam.supports.filter(s => s.id !== selected) }
                    : isHinge
                        ? { ...beam, hinges: (beam.hinges || []).filter(h => h.id !== selected) }
                        : { ...beam, loads: beam.loads.filter(l => l.id !== selected) });
                setSelected(null);
            }
        };
        window.addEventListener('keydown', fn);
        return () => window.removeEventListener('keydown', fn);
    }, [selected, beam, setBeam, dblEdit]);

    useEffect(() => {
        const up = () => setDrag(null);
        window.addEventListener('mouseup', up);
        return () => window.removeEventListener('mouseup', up);
    }, []);

    const addSupport = (type: SupportType) => setBeam({ ...beam, supports: [...beam.supports, { id: `s${Date.now()}`, type, position: beam.length / 2 }] });
    const addHinge = () => setBeam({ ...beam, hinges: [...(beam.hinges || []), { id: `h${Date.now()}`, position: beam.length / 2, label: '' }] });
    const addLoad = (type: LoadType) => setBeam({
        ...beam, loads: [...beam.loads, {
            id: `l${Date.now()}`, type, position: beam.length / 3, magnitude: 5000,
            endMagnitude: type === 'uvl' ? 0 : undefined,
            endPosition: (type === 'udl' || type === 'uvl') ? beam.length * 2 / 3 : undefined,
        }]
    });

    const applyPreset = (preset: string) => {
        if (preset === 'simply-supported') {
            setBeam({
                ...beam,
                supports: [
                    { id: `s-pin-${Date.now()}`, type: 'pin', position: 0 },
                    { id: `s-roll-${Date.now()}`, type: 'roller', position: beam.length }
                ]
            });
        } else if (preset === 'cantilever-left') {
            setBeam({
                ...beam,
                supports: [
                    { id: `s-fixed-${Date.now()}`, type: 'fixed', position: 0 }
                ]
            });
        } else if (preset === 'cantilever-right') {
            setBeam({
                ...beam,
                supports: [
                    { id: `s-fixed-${Date.now()}`, type: 'fixed', position: beam.length }
                ]
            });
        } else if (preset === 'fixed-fixed') {
            setBeam({
                ...beam,
                supports: [
                    { id: `s-fix1-${Date.now()}`, type: 'fixed', position: 0 },
                    { id: `s-fix2-${Date.now()}`, type: 'fixed', position: beam.length }
                ]
            });
        }
    };

    const isDark = document.documentElement.classList.contains('dark');
    const gridC = isDark ? '#1e2d3d' : '#e4e8ef';
    const beamF = isDark ? '#334155' : '#94a3b8';
    const beamS = isDark ? '#4b5563' : '#64748b';
    const tickC = isDark ? '#374151' : '#b0b7c3';
    const HANDLE_R = 7;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* ── Toolbar ── */}
            <div className="card" style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#7a8394', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Presets</span>
                <select className="select" style={{ fontSize: 12, padding: '4px 8px' }} onChange={e => { applyPreset(e.target.value); e.target.value = ''; }}>
                    <option value="">-- Choose Beam Type --</option>
                    <option value="simply-supported">Simply Supported (Pin & Roller)</option>
                    <option value="cantilever-left">Cantilever (Fixed Left)</option>
                    <option value="cantilever-right">Cantilever (Fixed Right)</option>
                    <option value="fixed-fixed">Fixed-Fixed</option>
                </select>

                <span style={{ fontSize: 11, fontWeight: 600, color: '#7a8394', textTransform: 'uppercase', marginLeft: 8 }}>Add Load</span>
                {([['point', 'Point', '#ef4444'], ['udl', 'UDL', '#3b82f6'], ['uvl', 'UVL', '#f97316'], ['moment', 'Moment', '#a855f7'], ['torque', 'Torque', '#22c55e']] as [LoadType, string, string][]).map(([type, label, color]) => (
                    <button key={type} onClick={() => addLoad(type)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, border: `2px solid ${color}`, background: 'transparent', color, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseOver={e => (e.currentTarget.style.background = color + '18')} onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                        <Plus size={12} />{label}
                    </button>
                ))}
                <span style={{ fontSize: 11, fontWeight: 600, color: '#7a8394', textTransform: 'uppercase', marginLeft: 8 }}>Support</span>
                {(['pin', 'roller', 'fixed'] as SupportType[]).map(type => (
                    <button key={type} onClick={() => addSupport(type)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, border: '2px solid #f59e0b', background: 'transparent', color: '#d97706', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseOver={e => (e.currentTarget.style.background = '#fef3c718')} onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                        <Plus size={12} />{type[0].toUpperCase() + type.slice(1)}
                    </button>
                ))}
                <button onClick={addHinge}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, border: '2px solid #64748b', background: 'transparent', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseOver={e => (e.currentTarget.style.background = '#f1f5f9')} onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                    <Plus size={12} />Hinge
                </button>

                {/* Beam length */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', paddingLeft: 14, borderLeft: '1px solid #dde1e8' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#7a8394', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Beam Length</span>
                    <input type="number" min={1} step={0.5} value={beam.length}
                        onChange={e => setBeam({ ...beam, length: Math.max(0.5, Number(e.target.value)) })}
                        className="input" style={{ width: 70, textAlign: 'right', fontSize: 13, fontFamily: 'JetBrains Mono,monospace', padding: '4px 8px' }} />
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>m</span>
                </div>

                {selected && (
                    <button onClick={() => {
                        const isSup = beam.supports.some(s => s.id === selected);
                        setBeam(isSup ? { ...beam, supports: beam.supports.filter(s => s.id !== selected) } : { ...beam, loads: beam.loads.filter(l => l.id !== selected) });
                        setSelected(null);
                    }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, border: '2px solid #ef4444', background: '#fef2f2', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        <Trash2 size={12} /> Delete
                    </button>
                )}
            </div>

            {/* ── Two-column: SVG + Properties ── */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>

                {/* SVG Canvas & Editor Wrapper */}
                <div className={isFullscreen ? "" : "card"} style={isFullscreen ? {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    zIndex: 99999,
                    background: isDark ? '#0f172a' : '#ffffff',
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                } : { flex: 1, minWidth: 0, padding: 12, display: 'flex', flexDirection: 'column' }}>

                    {/* Exit Fullscreen button (floating) */}
                    {isFullscreen && (
                        <button
                            onClick={() => setIsFullscreen(false)}
                            style={{
                                position: 'absolute',
                                top: 16,
                                right: selected ? 336 : 16,
                                zIndex: 100000,
                                padding: '6px 12px',
                                borderRadius: 8,
                                border: `1px solid ${isDark ? '#4b5563' : '#cbd5e1'}`,
                                background: isDark ? '#1e293b' : '#ffffff',
                                color: isDark ? '#e2e8f0' : '#475569',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                            }}
                        >
                            ✕ Exit Fullscreen
                        </button>
                    )}

                    {/* Normal mode header (hidden in fullscreen) */}
                    {!isFullscreen && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                <span>Drag handles to move</span>
                                <span>·</span><span>Use edge handles to resize UDL/UVL</span>
                                <span>·</span><span>Double-click value to edit</span>
                                <span>·</span><span>Select + <kbd style={{ background: '#f4f6f9', borderRadius: 3, padding: '0 4px', border: '1px solid #dde1e8' }}>Del</kbd></span>
                            </div>
                            <button
                                onClick={() => setIsFullscreen(true)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '4px 10px',
                                    borderRadius: 8,
                                    border: '1px solid #64748b',
                                    background: 'transparent',
                                    color: '#64748b',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Fullscreen
                            </button>
                        </div>
                    )}

                    {/* Canvas & Sidebar layout */}
                    <div style={{ display: 'flex', flex: 1, gap: isFullscreen ? 0 : 16, minHeight: 0, height: isFullscreen ? '100%' : 'auto' }}>
                        <div ref={containerRef} className="beam-canvas" style={{ flex: 1, height: isFullscreen ? '100%' : SVG_H, position: 'relative' }}>
                            <svg ref={svgRef} width="100%" height={isFullscreen ? '100%' : SVG_H}
                                viewBox={`0 0 ${svgW} ${SVG_H}`}
                                style={{ cursor: drag ? (drag.kind.includes('resize') ? 'ew-resize' : 'grabbing') : 'default', display: 'block' }}
                                onMouseMove={onMouseMove}
                                onClick={e => {
                                    const target = e.target as SVGElement;
                                    if (target === svgRef.current || target.id === 'bgRect') {
                                        setSelected(null);
                                        setDblEdit(null);
                                    }
                                }}>

                                {/* Grid */}
                                <defs>
                                    <pattern id="bgGrid" width={36} height={36} patternUnits="userSpaceOnUse">
                                        <path d="M 36 0 L 0 0 0 36" fill="none" stroke={gridC} strokeWidth="0.5" />
                                    </pattern>
                                </defs>
                                <rect id="bgRect" width={svgW} height={SVG_H} fill="url(#bgGrid)" />

                                {/* Beam */}
                                <defs>
                                    <linearGradient id="beamGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={isDark ? '#475569' : '#b0b7c3'} />
                                        <stop offset="100%" stopColor={beamF} />
                                    </linearGradient>
                                </defs>
                                <rect x={PAD_L} y={BEAM_Y - BEAM_H / 2} width={svgW - PAD_L - PAD_R} height={BEAM_H}
                                    rx="5" fill="url(#beamGrad)" stroke={beamS} strokeWidth="1.5"
                                    style={{ filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.18))' }} />

                                {/* Ruler */}
                                {Array.from({ length: 11 }, (_, i) => {
                                    const pos = (i / 10) * beam.length, x = toX(pos);
                                    return (
                                        <g key={i}>
                                            <line x1={x} y1={BEAM_Y + BEAM_H / 2} x2={x} y2={BEAM_Y + BEAM_H / 2 + 6} stroke={tickC} strokeWidth="1" />
                                            <text x={x} y={BEAM_Y + BEAM_H / 2 + 17} fontSize="9" fill={tickC} textAnchor="middle" fontFamily="JetBrains Mono,monospace">{pos.toFixed(1)}</text>
                                        </g>
                                    );
                                })}
                                <text x={(PAD_L + svgW - PAD_R) / 2} y={BEAM_Y + BEAM_H / 2 + 30} fontSize="9" fill={tickC} textAnchor="middle">Position (m)</text>

                                {/* ── Loads ── */}
                                {beam.loads.map(l => {
                                    const lx = toX(l.position);
                                    const lx2 = toX(l.endPosition ?? l.position + 2);
                                    const isSel = selected === l.id;
                                    const c = COLORS[l.type] ?? '#888';
                                    const isSpan = l.type === 'udl' || l.type === 'uvl';
                                    const midX = isSpan ? (lx + lx2) / 2 : lx;

                                    // Label y for each type
                                    const labelY = l.type === 'moment' ? BEAM_Y - BEAM_H / 2 - 66
                                        : l.type === 'torque' ? BEAM_Y - BEAM_H / 2 - 68
                                            : isSpan ? BEAM_Y - BEAM_H / 2 - 62
                                                : BEAM_Y - BEAM_H / 2 - 68;

                                    return (
                                        <g key={l.id} onClick={e => { e.stopPropagation(); setSelected(l.id); setDblEdit(null); }}>
                                            {/* Visuals */}
                                            {l.type === 'point' && <PointArrow x={lx} beamY={BEAM_Y} magnitude={l.magnitude} />}
                                            {l.type === 'udl' && <UDLVisual x1={lx} x2={lx2} beamY={BEAM_Y} magnitude={l.magnitude} />}
                                            {l.type === 'uvl' && <UVLVisual x1={lx} x2={lx2} beamY={BEAM_Y} w1={l.magnitude} w2={l.endMagnitude ?? 0} />}
                                            {l.type === 'moment' && <MomentArc x={lx} beamY={BEAM_Y} magnitude={l.magnitude} />}
                                            {l.type === 'torque' && <TorqueIcon x={lx} beamY={BEAM_Y} magnitude={l.magnitude} />}

                                            {/* Point load drag dot */}
                                            {l.type === 'point' && (
                                                <circle cx={lx} cy={BEAM_Y} r={9} fill={c} opacity={0.88}
                                                    stroke={isSel ? 'white' : 'none'} strokeWidth="2"
                                                    style={{ cursor: 'grab' }}
                                                    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); setSelected(l.id); setDrag({ kind: 'load-move', id: l.id }); }} />
                                            )}

                                            {/* UDL/UVL handles */}
                                            {isSpan && (<>
                                                {/* Move zone */}
                                                <rect x={lx + HANDLE_R + 4} y={BEAM_Y - BEAM_H / 2 - 55} width={Math.max(0, lx2 - lx - (HANDLE_R + 4) * 2)} height={60}
                                                    fill="transparent" style={{ cursor: 'move' }}
                                                    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); setSelected(l.id); setDrag({ kind: 'load-move', id: l.id }); }} />
                                                {/* Left resize */}
                                                <circle cx={lx} cy={BEAM_Y - BEAM_H / 2 - 28} r={HANDLE_R} fill={c} opacity={0.85} stroke="white" strokeWidth="1.5" style={{ cursor: 'ew-resize' }}
                                                    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); setSelected(l.id); setDrag({ kind: 'load-resize-start', id: l.id }); }} />
                                                <text x={lx} y={BEAM_Y - BEAM_H / 2 - 28} textAnchor="middle" dominantBaseline="central" fontSize="9" fill="white" pointerEvents="none">↔</text>
                                                {/* Right resize */}
                                                <circle cx={lx2} cy={BEAM_Y - BEAM_H / 2 - 28} r={HANDLE_R} fill={c} opacity={0.85} stroke="white" strokeWidth="1.5" style={{ cursor: 'ew-resize' }}
                                                    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); setSelected(l.id); setDrag({ kind: 'load-resize-end', id: l.id }); }} />
                                                <text x={lx2} y={BEAM_Y - BEAM_H / 2 - 28} textAnchor="middle" dominantBaseline="central" fontSize="9" fill="white" pointerEvents="none">↔</text>
                                            </>)}

                                            {/* Moment/Torque drag handle */}
                                            {(l.type === 'moment' || l.type === 'torque') && (
                                                <circle cx={lx} cy={BEAM_Y - BEAM_H / 2 - 34} r={9} fill={c} opacity={0.8} stroke={isSel ? 'white' : 'none'} strokeWidth="2"
                                                    style={{ cursor: 'grab' }}
                                                    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); setSelected(l.id); setDrag({ kind: 'load-move', id: l.id }); }} />
                                            )}

                                            {/* ── Value label — DOUBLE-CLICK to edit ── */}
                                            {dblEdit?.id === l.id && dblEdit.field === 'magnitude' ? (
                                                <InlineSVGInput value={l.magnitude} x={midX} y={labelY - 2}
                                                    onCommit={v => { setBeam({ ...beam, loads: beam.loads.map(x => x.id === l.id ? { ...x, magnitude: v } : x) }); setDblEdit(null); }} />
                                            ) : (
                                                <g>
                                                    {l.label && (
                                                        <text x={midX} y={labelY - 12} textAnchor="middle" fontSize="9.5" fill="#64748b" fontWeight="600">
                                                            {l.label} ({l.category || 'live'})
                                                        </text>
                                                    )}
                                                    <text x={midX} y={labelY} textAnchor="middle" fontSize="10" fill={c}
                                                        fontFamily="JetBrains Mono,monospace" fontWeight="700"
                                                        style={{ cursor: 'text', textDecoration: 'underline dotted' }}
                                                        onDoubleClick={e => { e.stopPropagation(); setSelected(l.id); setDblEdit({ id: l.id, field: 'magnitude' }); }}
                                                    >
                                                        {l.type === 'point' || l.type === 'udl' || l.type === 'uvl'
                                                            ? `${(Math.abs(l.magnitude) / 1000).toFixed(2)} kN${l.type !== 'point' ? '/m' : ''}`
                                                            : `${(Math.abs(l.magnitude) / 1000).toFixed(2)} kN·m`}
                                                    </text>
                                                </g>
                                            )}

                                            {/* Selection glow */}
                                            {isSel && (
                                                <rect
                                                    x={isSpan ? lx - 6 : lx - 16} y={BEAM_Y - BEAM_H / 2 - 75}
                                                    width={isSpan ? lx2 - lx + 12 : 32} height={82}
                                                    rx="8" fill={c} opacity={0.08}
                                                    stroke={c} strokeWidth="1.5" strokeDasharray="5 3"
                                                    pointerEvents="none"
                                                />
                                            )}
                                        </g>
                                    );
                                })}

                                {/* ── Supports ── */}
                                {beam.supports.map(s => {
                                    const sx = toX(s.position);
                                    const isSel = selected === s.id;
                                    const side = s.position <= beam.length / 2 ? 'left' : 'right';
                                    return (
                                        <g key={s.id} onClick={e => { e.stopPropagation(); setSelected(s.id); setDblEdit(null); }}>
                                            {s.type === 'pin' && <PinIcon cx={sx} cy={BEAM_Y + BEAM_H / 2} />}
                                            {s.type === 'roller' && <RollerIcon cx={sx} cy={BEAM_Y + BEAM_H / 2} />}
                                            {s.type === 'fixed' && <FixedIcon cx={sx} cy={BEAM_Y} side={side} />}

                                            <circle cx={sx} cy={BEAM_Y} r={10} fill="transparent" style={{ cursor: 'grab' }}
                                                onMouseDown={e => { e.stopPropagation(); e.preventDefault(); setSelected(s.id); setDrag({ kind: 'support', id: s.id }); }} />

                                            {/* Position label — double-click to edit */}
                                            {dblEdit?.id === s.id && dblEdit.field === 'position' ? (
                                                <InlineSVGInput value={s.position} x={sx} y={BEAM_Y + BEAM_H / 2 + 52}
                                                    onCommit={v => { setBeam({ ...beam, supports: beam.supports.map(x => x.id === s.id ? { ...x, position: Math.max(0, Math.min(beam.length, v)) } : x) }); setDblEdit(null); }} />
                                            ) : (
                                                <text x={sx} y={BEAM_Y + BEAM_H / 2 + 54} textAnchor="middle" fontSize="9"
                                                    fill="#f59e0b" fontFamily="JetBrains Mono,monospace" fontWeight="700"
                                                    style={{ cursor: 'text', textDecoration: 'underline dotted' }}
                                                    onDoubleClick={e => { e.stopPropagation(); setSelected(s.id); setDblEdit({ id: s.id, field: 'position' }); }}>
                                                    x={s.position.toFixed(2)}m
                                                </text>
                                            )}

                                            {isSel && (
                                                <circle cx={sx} cy={BEAM_Y + BEAM_H / 2 + 15} r={32}
                                                    fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 3" opacity={0.55} />
                                            )}
                                        </g>
                                    );
                                })}

                                {/* ── Hinges ── */}
                                {(beam.hinges || []).map(h => {
                                    const hx = toX(h.position);
                                    const isSel = selected === h.id;
                                    return (
                                        <g key={h.id} onClick={e => { e.stopPropagation(); setSelected(h.id); setDblEdit(null); }}>
                                            {/* Hinge node */}
                                            <circle cx={hx} cy={BEAM_Y} r={6} fill="white" stroke="#64748b" strokeWidth="2.5" />
                                            
                                            {/* Drag target */}
                                            <circle cx={hx} cy={BEAM_Y} r={12} fill="transparent" style={{ cursor: 'grab' }}
                                                onMouseDown={e => { e.stopPropagation(); e.preventDefault(); setSelected(h.id); setDrag({ kind: 'hinge', id: h.id }); }} />
                                            
                                            {/* Label */}
                                            <text x={hx} y={BEAM_Y - BEAM_H / 2 - 12} textAnchor="middle" fontSize="9" fill="#475569" fontWeight="600">
                                                {h.label || `Hinge @ ${h.position.toFixed(2)}m`}
                                            </text>

                                            {isSel && (
                                                <circle cx={hx} cy={BEAM_Y} r={14} fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 2" />
                                            )}
                                        </g>
                                    );
                                })}

                                {/* ── Distance callouts when something is selected ── */}
                                {selected && (
                                    <DistanceCallouts selectedId={selected} beam={beam} svgW={svgW} />
                                )}
                            </svg>
                        </div>

                        {/* Fullscreen properties panel overlay */}
                        {isFullscreen && selected && (
                            <div className="card" style={{ width: 320, flexShrink: 0, padding: 14, overflowY: 'auto', background: isDark ? '#0f172a' : '#ffffff', borderLeft: '1px solid #dde1e8', boxShadow: '-4px 0 16px rgba(0,0,0,0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <span style={{ fontSize: 13, fontWeight: 700 }}>Properties</span>
                                    <button className="btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setSelected(null)}>Close</button>
                                </div>
                                <SelectedPanel selectedId={selected} beam={beam} setBeam={setBeam} />
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Properties Sidebar (only in normal view) ── */}
                {!isFullscreen && (
                    <div style={{ width: 272, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div className="card" style={{ padding: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Settings2 size={14} color="#6366f1" /> Properties
                                </span>
                                <button className="btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}
                                    onClick={() => setShowMore(!showMore)}>
                                    {showMore ? '▴ Less' : '▾ More'}
                                </button>
                            </div>

                            {/* Selected item section — shown dynamically */}
                            {selected && <SelectedPanel selectedId={selected} beam={beam} setBeam={setBeam} />}

                            {/* Material/section props */}
                            <div style={{ marginTop: selected ? 14 : 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: '#7a8394', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                                    Section / Material
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    {([
                                        ['E (Pa)', 'E', 1e9],
                                        ['I (m⁴)', 'I', 1e-6],
                                        ['G (Pa)', 'G', 1e9],
                                        ['J (m⁴)', 'J', 1e-6],
                                        ['Depth (m)', 'depth', 0.01],
                                        ['g (m/s²)', 'gravity', 0.01],
                                    ] as [string, keyof BeamConfig, number][]).map(([lbl, key]) => (
                                        <div key={key}>
                                            <label className="field-label">{lbl}</label>
                                            <input type="number" value={beam[key] as number}
                                                onChange={e => setBeam({ ...beam, [key]: Number(e.target.value) })}
                                                className="input" style={{ fontSize: 12, padding: '4px 8px', fontFamily: 'JetBrains Mono,monospace' }} />
                                        </div>
                                    ))}
                                </div>
                                <button className="btn-ghost" style={{ marginTop: 8, fontSize: 11, padding: '3px 8px' }}
                                    onClick={() => setBeam({ ...beam, gravity: 9.81 })}>↺ Reset g to 9.81</button>
                            </div>

                            {/* Collapsed: supports/loads list */}
                            {showMore && (
                                <div style={{ marginTop: 14, borderTop: '1px solid #e4e8ef', paddingTop: 12 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', marginBottom: 8, textTransform: 'uppercase' }}>
                                        Supports ({beam.supports.length})
                                    </div>
                                    {beam.supports.map((s, i) => (
                                        <div key={s.id} className="card-inner" style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5, padding: '5px 8px' }}>
                                            <span style={{ fontSize: 10, color: '#94a3b8', width: 14 }}>{i + 1}</span>
                                            <select value={s.type} className="select" style={{ fontSize: 11, padding: '3px 6px', flex: 1 }}
                                                onChange={e => setBeam({ ...beam, supports: beam.supports.map(x => x.id === s.id ? { ...x, type: e.target.value as SupportType } : x) })}>
                                                <option value="pin">Pin</option>
                                                <option value="roller">Roller</option>
                                                <option value="fixed">Fixed</option>
                                            </select>
                                            <input type="number" value={s.position} step={0.1}
                                                onChange={e => setBeam({ ...beam, supports: beam.supports.map(x => x.id === s.id ? { ...x, position: Number(e.target.value) } : x) })}
                                                className="input" style={{ width: 48, fontSize: 11, padding: '3px 5px', textAlign: 'right', fontFamily: 'JetBrains Mono,monospace' }} />
                                            <button onClick={() => setBeam({ ...beam, supports: beam.supports.filter(x => x.id !== s.id) })}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2 }}>
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}

                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: '12px 0 8px', textTransform: 'uppercase' }}>
                                        Hinges ({(beam.hinges || []).length})
                                    </div>
                                    {(beam.hinges || []).map((h, i) => (
                                        <div key={h.id} className="card-inner" style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5, padding: '5px 8px' }}>
                                            <span style={{ fontSize: 10, color: '#94a3b8', width: 14 }}>{i + 1}</span>
                                            <input type="text" value={h.label || ''} placeholder="Name"
                                                onChange={e => setBeam({ ...beam, hinges: (beam.hinges || []).map(x => x.id === h.id ? { ...x, label: e.target.value } : x) })}
                                                className="input" style={{ fontSize: 11, padding: '3px 5px', flex: 1 }} />
                                            <input type="number" value={h.position} step={0.1}
                                                onChange={e => setBeam({ ...beam, hinges: (beam.hinges || []).map(x => x.id === h.id ? { ...x, position: Number(e.target.value) } : x) })}
                                                className="input" style={{ width: 48, fontSize: 11, padding: '3px 5px', textAlign: 'right', fontFamily: 'JetBrains Mono,monospace' }} />
                                            <button onClick={() => setBeam({ ...beam, hinges: (beam.hinges || []).filter(x => x.id !== h.id) })}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2 }}>
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}

                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', margin: '12px 0 8px', textTransform: 'uppercase' }}>
                                        Loads ({beam.loads.length})
                                    </div>
                                    {beam.loads.map((l, i) => {
                                        const c = COLORS[l.type] ?? '#888';
                                        return (
                                            <div key={l.id} className="card-inner" style={{ marginBottom: 5, padding: '7px 8px' }}>
                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                    <span style={{ fontSize: 10, color: '#94a3b8', width: 14 }}>{i + 1}</span>
                                                    <select value={l.type} className="select" style={{ fontSize: 11, padding: '3px 6px', color: c, flex: 1 }}
                                                        onChange={e => setBeam({ ...beam, loads: beam.loads.map(x => x.id === l.id ? { ...x, type: e.target.value as LoadType } : x) })}>
                                                        <option value="point">Point</option><option value="udl">UDL</option>
                                                        <option value="uvl">UVL</option><option value="moment">Moment</option><option value="torque">Torque</option>
                                                    </select>
                                                    <button onClick={() => setBeam({ ...beam, loads: beam.loads.filter(x => x.id !== l.id) })}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2 }}>
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                                <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                                                    <span style={{ fontSize: 10, color: '#94a3b8' }}>@</span>
                                                    <input type="number" value={l.position} step={0.1}
                                                        onChange={e => setBeam({ ...beam, loads: beam.loads.map(x => x.id === l.id ? { ...x, position: Number(e.target.value) } : x) })}
                                                        className="input" style={{ width: 46, fontSize: 11, padding: '3px 5px', textAlign: 'right', fontFamily: 'JetBrains Mono,monospace' }} />
                                                    {(l.type === 'udl' || l.type === 'uvl') && (<>
                                                        <span style={{ fontSize: 10, color: '#94a3b8' }}>→</span>
                                                        <input type="number" value={l.endPosition ?? l.position + 2} step={0.1}
                                                            onChange={e => setBeam({ ...beam, loads: beam.loads.map(x => x.id === l.id ? { ...x, endPosition: Number(e.target.value) } : x) })}
                                                            className="input" style={{ width: 46, fontSize: 11, padding: '3px 5px', textAlign: 'right', fontFamily: 'JetBrains Mono,monospace' }} />
                                                    </>)}
                                                    <input type="number" value={l.magnitude} step={100}
                                                        onChange={e => setBeam({ ...beam, loads: beam.loads.map(x => x.id === l.id ? { ...x, magnitude: Number(e.target.value) } : x) })}
                                                        className="input" style={{ width: 66, fontSize: 11, padding: '3px 5px', textAlign: 'right', fontFamily: 'JetBrains Mono,monospace' }} />
                                                    {l.type === 'uvl' && (
                                                        <input type="number" value={l.endMagnitude ?? 0} step={100}
                                                            onChange={e => setBeam({ ...beam, loads: beam.loads.map(x => x.id === l.id ? { ...x, endMagnitude: Number(e.target.value) } : x) })}
                                                            className="input" style={{ width: 66, fontSize: 11, padding: '3px 5px', textAlign: 'right', fontFamily: 'JetBrains Mono,monospace' }} />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Help card */}
                        <div style={{ padding: '10px 14px', background: isDark ? '#0c1929' : '#f0f6ff', borderRadius: 10, border: `1px solid ${isDark ? '#1d3a5c' : '#bfdbfe'}`, fontSize: 11, color: isDark ? '#7dd3fc' : '#1e40af', lineHeight: 1.8 }}>
                            <strong style={{ display: 'block', marginBottom: 4 }}>Tips</strong>
                            <ul style={{ margin: 0, paddingLeft: 16 }}>
                                <li>Click element → see relative distances to all others</li>
                                <li>Double-click any value to edit inline</li>
                                <li>Selected element appears in Properties above</li>
                                <li>Press <kbd style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: 3, padding: '0 3px' }}>Del</kbd> to remove selection</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
