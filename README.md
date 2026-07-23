# FOSS Advanced Beam Calculator

A web-based structural analysis tool for Mechanical and Civil Engineering students and practitioners. It computes and visualises shear force, bending moment, slope, deflection, bending stress, and torsional angle of twist on beams with multiple support conditions, internal hinges, and load types.

**Live site:** [ourmdssolver.vercel.app](https://ourmdssolver.vercel.app/)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FPrenevR%2Fbeam-calculator)

---

## Features

- **Support types** — Pin, roller, and fixed-end supports, with optional internal hinges.
- **Load types** — Point forces, UDL, UVL (triangular / trapezoidal), concentrated moments, and torsional moments.
- **Worked solution** — Fully expanded, step-by-step derivation of reactions, shear/moment equations, and deflection boundary conditions, typeset with KaTeX.
- **Diagrams** — Interactive shear force (SFD), bending moment (BMD), deflection, and torsion charts.
- **Bending stress** — Calculated at the extreme fibres using the flexure formula.
- **Unit systems** — Switch between SI (N, m), kN·m, and Imperial (lbf, ft) at any time.
- **PDF export** — Printable report with SVG schematics, charts, and offline-rendered equations.
- **Light / dark theme** — Persisted across sessions via localStorage.

---

## Step-by-Step Usage Guide

### 1. Set beam properties

Open the **Beam Editor** tab. At the top of the panel you will find fields for:

| Field | What to enter |
|---|---|
| **Length** | Overall span of the beam in your chosen unit |
| **E** (Young's modulus) | Material stiffness — e.g. `200e9` Pa for structural steel |
| **I** (second moment of area) | Cross-section property — e.g. `1e-4` m⁴ for a standard I-section |
| **G** (shear modulus) | Required only when you add torsional loads |
| **J** (polar moment of area) | Required only when you add torsional loads |
| **Depth** | Used to compute bending stress at the extreme fibres |

Change the **unit system** in the top-right dropdown (SI / kN·m / Imperial) before entering values.

---

### 2. Place supports

Click **Add Support** and choose the support type:

- **Pin** — Resists vertical and horizontal forces; allows rotation.
- **Roller** — Resists vertical force only; allows rotation and horizontal movement.
- **Fixed** — Resists all forces and moments; no rotation or translation.

Enter the position along the beam and a label, then confirm. A minimum of two supports is required for a statically determinate analysis; fixed-end beams need only one.

To add an **internal hinge**, click **Add Hinge** and specify its position. A hinge introduces a moment-release condition at that point.

---

### 3. Apply loads

Click **Add Load** and pick the load type:

| Type | Required inputs |
|---|---|
| **Point load** | Position, magnitude (positive = downward by convention) |
| **UDL** | Start and end positions, intensity (force per unit length) |
| **UVL** | Start and end positions, intensity at each end |
| **Concentrated moment** | Position, magnitude (positive = clockwise) |
| **Torsional moment** | Position, magnitude |

Each load is given a label automatically (P1, W1, M1 …), which you can rename. Loads and supports can be re-edited or deleted at any time using the pencil / bin icons on their cards.

---

### 4. Run the analysis

Switch to the **Analysis Results** tab. The solver runs immediately and produces:

1. **Support reactions** — with free-body diagram values.
2. **Shear Force Diagram (SFD)** — interactive chart; hover to read values at any point.
3. **Bending Moment Diagram (BMD)** — same interaction; peak value and its location are highlighted.
4. **Deflection curve** — normalised to the beam's flexural rigidity EI.
5. **Angle of Twist** — shown when torsional loads are present.
6. **Worked solution** — fully typeset derivation; scroll down past the charts.

If the solver cannot find a valid solution it shows a plain-text error describing the issue (e.g. insufficient supports, over-constrained geometry).

---

### 5. Read and share results

- **Hover** over any chart to read exact values.
- Click **Export PDF** (top-right of the Results panel) to download a formatted report containing all diagrams and equations. The PDF renders math offline — no internet connection required for the exported file.
- Copy the browser URL and share it; the state is not encoded in the URL, so recipients will need to re-enter the configuration.

---

### Tips

- Switch the unit system *before* entering numeric values — existing values are not converted automatically.
- For a cantilever, place a single **fixed** support at one end and leave the other end free (no support needed).
- Internal hinges must lie strictly between two supports, not at a support position.
- UVL with both end intensities set to the same value is equivalent to a UDL.

---

## Mathematical Background

The solver is based on classical structural mechanics.

### 1. Beam Deflection (Euler-Bernoulli Theory)

Beam deflection $y(x)$ is governed by the fourth-order differential equation:

$$
EI \frac{d^4y}{dx^4} = -w(x)
$$

Integrating this equation yields:
- **Shear Force:** $V(x) = \int w(x)\,dx$
- **Bending Moment:** $M(x) = \int V(x)\,dx = -EI \frac{d^2y}{dx^2}$
- **Slope:** $\theta(x) = \frac{dy}{dx}$
- **Deflection:** $y(x)$

### 2. Discontinuity Functions (Macaulay's Method)

Discontinuous point loads, distributed loads, and moments are integrated seamlessly using Macaulay brackets:

$$
\langle x - a \rangle^n = \begin{cases} 0 & \text{if } x < a \\ (x - a)^n & \text{if } x \ge a \end{cases}
$$

### 3. Flexure Formula

Bending stress $\sigma$ is computed at extreme fibers ($y = \pm d/2$):

$$
\sigma_{\max} = \frac{M_{\max} \cdot y}{I}
$$

### 4. Torsional Twist

For torsional moment distributions $T(x)$, the angle of twist $\phi(x)$ is calculated by:

$$
\phi(x) = \int_0^x \frac{T(\xi)}{GJ}\,d\xi
$$

---

## Codebase Structure

Built with **React**, **TypeScript**, and **Vite**.

```
src/
├── components/
│   ├── BeamDesigner.tsx      # Canvas editor — supports, loads, hinges
│   └── ResultsViewer.tsx     # Charts, worked solution, PDF export
├── utils/
│   ├── solver.ts             # Structural mechanics engine
│   └── types.ts              # Type definitions and LaTeX helpers
├── App.tsx                   # Layout and tab routing
├── index.css                 # Theme variables and component styles
└── main.tsx                  # Entry point
```

---

## Local Setup

Requires [Node.js](https://nodejs.org/).

```bash
git clone https://github.com/PrenevR/beam-calculator.git
cd beam-calculator
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

```bash
npm run build   # Production bundle
```

---

## Contributing

Issues and pull requests are welcome — whether for solver edge cases, additional load types, or UI improvements.

## Author

Pranav — [github.com/PrenevR](https://github.com/PrenevR)
