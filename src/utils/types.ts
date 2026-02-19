export type SupportType = 'pin' | 'roller' | 'fixed';
export type LoadType = 'point' | 'udl' | 'uvl' | 'moment' | 'torque';
export type UnitSystem = 'SI' | 'kNm' | 'Imperial';

export interface Support {
    id: string;
    type: SupportType;
    position: number; // x-coordinate in base units (m or ft)
}

export interface Hinge {
    id: string;
    position: number; // x-coordinate (internal moment release)
}

export interface Load {
    id: string;
    type: LoadType;
    position: number;
    magnitude: number;
    endMagnitude?: number; // For UVL end magnitude
    endPosition?: number;  // For UDL / UVL span end
    label?: string;        // Optional user label
    combinationId?: string; // Link to a load combination
}

export interface LoadCombination {
    id: string;
    name: string;
    factorDead: number;   // e.g. 1.2
    factorLive: number;   // e.g. 1.6
    activeLoadIds: string[];
}

export interface UnitConfig {
    system: UnitSystem;
    // Derived display labels
    length: string;
    force: string;
    moment: string;
    stress: string;
    deflection: string;
    distributed: string; // N/m, kN/m, lbf/ft
}

export interface BeamConfig {
    length: number;    // metres (internal always SI)
    E: number;         // Pa
    G: number;         // Pa
    I: number;         // m^4
    J: number;         // m^4
    depth: number;     // m (for stress calculation)
    supports: Support[];
    hinges: Hinge[];
    loads: Load[];
    loadCombinations: LoadCombination[];
    units: UnitConfig;
    gravity: number;   // m/s^2 (default 9.81)
}

export interface SolverStep {
    title: string;
    description: string;
    equations?: string[];
    result?: string;
}

export interface ChartInference {
    maxValue: number;
    maxPosition: number;
    minValue: number;
    minPosition: number;
    zeroCrossings: number[];
    summary: string;
}

export interface AnalysisResult {
    reactions: { [supportId: string]: { Fy: number; Mz?: number; Tx?: number } };
    shearForce: { x: number; value: number }[];
    bendingMoment: { x: number; value: number }[];
    slope: { x: number; value: number }[];
    deflection: { x: number; value: number }[];
    angleOfTwist: { x: number; value: number }[];
    maxDeflection: number;
    maxBendingMoment: number;
    maxShearForce: number;
    maxStress: number;
    maxAngleOfTwist: number;
    hasTorsion: boolean;
    steps: SolverStep[];
    sfInference: ChartInference;
    bmInference: ChartInference;
    deflectionInference: ChartInference;
}

// Unit conversion helpers
export const UNIT_SYSTEMS: Record<UnitSystem, UnitConfig> = {
    SI: {
        system: 'SI',
        length: 'm',
        force: 'N',
        moment: 'N·m',
        stress: 'Pa',
        deflection: 'mm',
        distributed: 'N/m',
    },
    kNm: {
        system: 'kNm',
        length: 'm',
        force: 'kN',
        moment: 'kN·m',
        stress: 'MPa',
        deflection: 'mm',
        distributed: 'kN/m',
    },
    Imperial: {
        system: 'Imperial',
        length: 'ft',
        force: 'lbf',
        moment: 'lbf·ft',
        stress: 'psi',
        deflection: 'in',
        distributed: 'lbf/ft',
    },
};

export function displayForce(val: number, u: UnitConfig): string {
    if (u.system === 'kNm') return (val / 1000).toFixed(3) + ' kN';
    if (u.system === 'Imperial') return (val * 0.2248).toFixed(3) + ' lbf';
    return val.toFixed(2) + ' N';
}

export function displayMoment(val: number, u: UnitConfig): string {
    if (u.system === 'kNm') return (val / 1000).toFixed(3) + ' kN·m';
    if (u.system === 'Imperial') return (val * 0.7376).toFixed(3) + ' lbf·ft';
    return val.toFixed(2) + ' N·m';
}

export function displayDeflection(val: number, u: UnitConfig): string {
    if (u.system === 'Imperial') return (val * 39.3701).toFixed(4) + ' in';
    return (val * 1000).toFixed(3) + ' mm';
}

export function displayStress(val: number, u: UnitConfig): string {
    if (u.system === 'kNm') return (val / 1e6).toFixed(3) + ' MPa';
    if (u.system === 'Imperial') return (val * 0.000145).toFixed(3) + ' psi';
    return val.toFixed(2) + ' Pa';
}

export function displayLength(val: number, u: UnitConfig): string {
    if (u.system === 'Imperial') return (val * 3.28084).toFixed(3) + ' ft';
    return val.toFixed(3) + ' m';
}
