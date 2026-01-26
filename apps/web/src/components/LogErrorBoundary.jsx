import React from 'react';

class LogErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error using the console, which logBridge intercepts.
        // We ensure we pass the error object itself so the bridge can extract the stack.
        console.error("React Component Error Caught:", error);

        // Also log the component stack from errorInfo
        if (errorInfo && errorInfo.componentStack) {
            console.error("Component Stack:", errorInfo.componentStack);
        }
    }

    render() {
        if (this.state.hasError) {
            // Optional: Render a fallback UI
            return (
                <div className="flex flex-col items-center justify-center p-8 h-screen bg-bg text-center">
                    <h2 className="text-xl font-bold text-neon-pink mb-4">Application Error</h2>
                    <p className="text-ink-muted font-mono text-sm max-w-lg mb-8">
                        The agent has encountered a critical system failure. Logs have been transmitted to headquarters.
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
