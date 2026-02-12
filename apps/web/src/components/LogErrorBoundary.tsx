import React from "react";
import type { ErrorInfo, ReactNode } from "react";

interface LogErrorBoundaryProps {
  children: ReactNode;
}

interface LogErrorBoundaryState {
  hasError: boolean;
}

class LogErrorBoundary extends React.Component<
  LogErrorBoundaryProps,
  LogErrorBoundaryState
> {
  constructor(props: LogErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): LogErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("React Component Error Caught:", error);

    if (errorInfo.componentStack) {
      console.error("Component Stack:", errorInfo.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 h-screen bg-bg text-center">
          <h2 className="text-xl font-bold text-neon-pink mb-4">
            Application Error
          </h2>
          <p className="text-ink-muted font-mono text-sm max-w-lg mb-8">
            The agent has encountered a critical system failure. Logs have been
            transmitted to headquarters.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 border border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 font-mono text-sm"
          >
            REBOOT SYSTEM
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default LogErrorBoundary;
