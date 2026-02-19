import { useState, useCallback } from 'react';
import BeamDesigner from './components/BeamDesigner';
import ResultsViewer from './components/ResultsViewer';
import { solveBeam } from './utils/solver';
import type { BeamConfig, AnalysisResult } from './utils/types';
import { UNIT_SYSTEMS } from './utils/types';
import { Moon, Sun, Calculator, BarChart2, PenTool, Github } from 'lucide-react';

const DEFAULT_BEAM: BeamConfig = {
    length: 10,
    E: 200e9,
    G: 77e9,
    I: 1e-4,
    J: 1e-4,
    depth: 0.5,
    gravity: 9.81,
    supports: [
        { id: 's1', type: 'pin', position: 0 },
        { id: 's2', type: 'roller', position: 10 },
    ],
    hinges: [],
    loads: [
        { id: 'l1', type: 'point', position: 5, magnitude: 10000 },
    ],
    loadCombinations: [],
    units: UNIT_SYSTEMS['SI'],
};

export default function App() {
    const [beam, setBeam] = useState<BeamConfig>(DEFAULT_BEAM);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [solverError, setSolverError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'editor' | 'analysis'>('editor');
    const [darkMode, setDarkMode] = useState(() => {
        try { return localStorage.getItem('beamTheme') === 'dark'; }
        catch { return false; }
    });

    const toggleDark = useCallback(() => {
        setDarkMode(prev => {
            const next = !prev;
            if (next) {
                document.documentElement.classList.add('dark');
                localStorage.setItem('beamTheme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('beamTheme', 'light');
            }
            return next;
        });
    }, []);

    // Apply theme on mount
    useState(() => {
        if (darkMode) document.documentElement.classList.add('dark');
    });

    const handleTabChange = useCallback((tab: 'editor' | 'analysis') => {
        setActiveTab(tab);
        if (tab === 'analysis') {
            // Lazy computation — only runs when user switches to analysis
            try {
                setSolverError(null);
                const res = solveBeam(beam);
                setResult(res);
            } catch (e: any) {
                setSolverError(e?.message ?? 'Unknown solver error');
                setResult(null);
            }
        }
    }, [beam]);

    return (
        <div style={{ minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
            {/* ── Nav ── */}
            <nav className="app-nav">
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Brand */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 3px 10px #2563eb35'
                        }}>
                            <Calculator size={18} color="white" />
                        </div>
                        <div>
                            <div className="gradient-text" style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>
                                FOSS Advanced Beam Calculator
                            </div>
                            <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1 }}>
                                Structural Analysis Engine
                            </div>
                        </div>
                    </div>

                    {/* Right controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Unit system */}
                        <select
                            className="select"
                            value={beam.units.system}
                            onChange={e => setBeam({ ...beam, units: UNIT_SYSTEMS[e.target.value as keyof typeof UNIT_SYSTEMS] })}
                            title="Unit System"
                            style={{ fontSize: 12, padding: '5px 10px' }}
                        >
                            <option value="SI">SI — N, m</option>
                            <option value="kNm">kN·m</option>
                            <option value="Imperial">Imperial — lbf, ft</option>
                        </select>

                        {/* GitHub */}
                        <a
                            href="https://github.com/PrenevR"
                            target="_blank" rel="noreferrer"
                            className="btn-ghost"
                            title="GitHub"
                            style={{ padding: '6px 10px' }}
                        >
                            <Github size={16} />
                            <span style={{ display: 'none' }}>GitHub</span>
                        </a>

                        {/* Dark toggle */}
                        <button
                            className="btn-icon"
                            onClick={toggleDark}
                            title={darkMode ? 'Light Mode' : 'Dark Mode'}
                        >
                            {darkMode
                                ? <Sun size={18} color="#fbbf24" />
                                : <Moon size={18} color="#64748b" />}
                        </button>
                    </div>
                </div>

                {/* Main Tabs */}
                <div className="main-tabs" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
                    <button
                        className={`main-tab ${activeTab === 'editor' ? 'active' : ''}`}
                        onClick={() => setActiveTab('editor')}
                    >
                        <PenTool size={15} /> Beam Editor
                    </button>
                    <button
                        className={`main-tab ${activeTab === 'analysis' ? 'active' : ''}`}
                        onClick={() => handleTabChange('analysis')}
                    >
                        <BarChart2 size={15} /> Analysis Results
                        {result && (
                            <span style={{
                                fontSize: 10, background: '#22c55e', color: 'white',
                                borderRadius: 99, padding: '1px 6px', fontWeight: 700
                            }}>✓</span>
                        )}
                    </button>
                </div>
            </nav>

            {/* ── Content ── */}
            <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px', minHeight: 'calc(100vh - 100px)' }}>
                {activeTab === 'editor' && (
                    <div className="animate-fade-in">
                        <BeamDesigner beam={beam} setBeam={setBeam} />
                    </div>
                )}

                {activeTab === 'analysis' && (
                    <div className="animate-fade-in">
                        {solverError && (
                            <div style={{
                                padding: '12px 16px', borderRadius: 12, marginBottom: 16,
                                background: '#fef2f2', border: '1px solid #fecaca',
                                color: '#dc2626', fontSize: 13
                            }}>
                                ⚠️ <strong>Solver error:</strong> {solverError}. Please check your beam configuration (at least 2 supports required).
                            </div>
                        )}
                        {result ? (
                            <ResultsViewer result={result} beam={beam} />
                        ) : !solverError ? (
                            <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
                                <BarChart2 size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                                <p style={{ fontSize: 15, fontWeight: 500 }}>Click "Analysis Results" to run the solver</p>
                            </div>
                        ) : null}
                    </div>
                )}
            </main>

            <footer style={{ borderTop: '1px solid #e2e8f0', padding: '20px 0', textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
                FOSS Advanced Beam Calculator · Open Source · Educational Use
            </footer>
        </div>
    );
}
