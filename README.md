# FOSS Advanced Beam Calculator

An advanced, interactive structural analysis web application for Mechanical and Civil Engineering. It computes and visualizes shear force, bending moment, deflection, bending stress, and torsion on beams with multiple boundary conditions, support types, internal hinges, and load configurations.

👉 **Live Demo: [ourmdssolver.vercel.app](https://ourmdssolver.vercel.app/)**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FPrenevR%2Fbeam-calculator)

---

## 🚀 Key Features

*   **Interactive Beam Editor**: Drag-and-drop or click to place and edit supports (pinned, roller, fixed), internal hinges, and varied loads on the beam canvas.
*   **Comprehensive Load Support**:
    *   Point Loads (Forces)
    *   Uniformly Distributed Loads (UDL)
    *   Uniformly Varying Loads (UVL / Trapezoidal / Triangular)
    *   Concentrated Moments
    *   Torsional Moments (Torque)
*   **Step-by-Step Worked Solution**: Generates fully expanded steps showing load resultants, support reactions, shear/bending moment integration equations, and deflection boundary condition systems using professional math typesetting (KaTeX).
*   **Scientific Exponent Notation**: Formats flexural/torsional rigidity and section metrics symbolically (e.g. $10^3$, $2.00 \times 10^{11}$) instead of standard computer scientific notations.
*   **Interactive Visualizations**: High-performance charting of Shear Force Diagrams (SFD), Bending Moment Diagrams (BMD), Deflection curves, and Torsional Angle of Twist.
*   **High-End Design System**: Features a modern glassmorphic UI with dedicated, comfort-optimized Light and Dark theme palettes to reduce eye strain.
*   **Printable PDF Reports**: Export high-resolution reports complete with SVG schematics, charts, and pre-rendered offline math equations.

---

## 🧮 Mathematical Background

The engine is built on classical structural mechanics principles:

### 1. Beam Deflection (Euler-Bernoulli Theory)
Beam deflection $y(x)$ is governed by the fourth-order differential equation:
$$EI \frac{d^4y}{dx^4} = -w(x)$$
Integrating this equation yields:
*   **Shear Force**: $V(x) = \int w(x)\,dx$
*   **Bending Moment**: $M(x) = \int V(x)\,dx = -EI \frac{d^2y}{dx^2}$
*   **Slope**: $\theta(x) = \frac{dy}{dx}$
*   **Deflection**: $y(x)$

### 2. Discontinuity Functions (Macaulay's Method)
Discontinuous point loads, distributed loads, and moments are integrated seamlessly using Macaulay brackets:
$$\langle x - a \rangle^n = \begin{cases} 0 & \text{if } x < a \\ (x - a)^n & \text{if } x \ge a \end{cases}$$

### 3. Elastic Bending Flexure Formula
Bending stress $\sigma$ is computed at the extreme fibers ($y = \pm d/2$):
$$\sigma_{\text{max}} = \frac{M_{\text{max}} \cdot y}{I}$$

### 4. Torsional Twist
For torsional moment distributions $T(x)$, the angle of twist $\phi(x)$ is calculated by:
$$\phi(x) = \int_0^x \frac{T(\xi)}{G J}\,d\xi$$

---

## 📂 Codebase Architecture

The application is built on React, TypeScript, and Vite.

```
├── src
│   ├── components
│   │   ├── BeamDesigner.tsx         # Interactive canvas editor for supports, loads & hinges
│   │   └── ResultsViewer.tsx        # SFD/BMD/Deflection charts, Step-by-step solver, and PDF exporter
│   ├── utils
│   │   ├── solver.ts                # Primary structural mechanics solver engine
│   │   └── types.ts                 # Type definitions & LaTeX formatting utilities
│   ├── App.tsx                      # Layout shell and tab controller
│   ├── index.css                    # Glassmorphic UI styles & Light/Dark variables
│   └── main.tsx                     # React entry point
```

---

## 🛠️ Installation & Local Setup

Ensure you have [Node.js](https://nodejs.org/) installed.

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/PrenevR/beam-calculator.git
    cd beam-calculator
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the development server**:
    ```bash
    npm run dev
    ```
    Open `http://localhost:5173` (or the terminal-assigned port) in your browser.

4.  **Build for production**:
    ```bash
    npm run build
    ```

---
## ✍️ Author & Credits

Created and maintained by **[Pranav (PrenevR)](https://github.com/PrenevR)**.

Feel free to open issues or submit pull requests for features, mathematical solver enhancements, or UI improvements!
