import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean }

/**
 * Error boundary isolado para o SDR Lucas.
 * Falhas dentro do widget NUNCA devem derrubar a página /escolherbike.
 */
export class LucasSDRErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // Log only — do not rethrow.
    console.error("[LucasSDR] runtime error captured by boundary:", error, info);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

export default LucasSDRErrorBoundary;
