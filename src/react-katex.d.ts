declare module 'react-katex' {
    import * as React from 'react';
    export interface MathProps {
        math: string;
        block?: boolean;
        errorColor?: string;
        renderError?: (error: Error) => React.ReactNode;
    }
    export class InlineMath extends React.Component<MathProps> {}
    export class BlockMath extends React.Component<MathProps> {}
}
