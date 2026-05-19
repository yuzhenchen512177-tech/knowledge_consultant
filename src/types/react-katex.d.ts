declare module "react-katex" {
  import * as React from "react";

  interface MathProps {
    math?: string;
    children?: React.ReactNode;
    errorColor?: string;
    renderError?: (error: Error) => React.ReactNode;
    settings?: Record<string, unknown>;
  }

  export const InlineMath: React.FC<MathProps>;
  export const BlockMath: React.FC<MathProps>;
}
