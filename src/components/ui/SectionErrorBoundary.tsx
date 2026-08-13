"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface SectionErrorBoundaryProps {
  children: ReactNode;
  fallbackLabel?: string;
}

interface SectionErrorBoundaryState {
  error: Error | null;
}

export class SectionErrorBoundary extends Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  state: SectionErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("SectionErrorBoundary:", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="py-12 text-center" role="alert" data-testid="section-error-fallback">
          <p className="text-body-md text-accent-ember">
            {this.props.fallbackLabel ?? "This section failed to load."}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-3 rounded-md bg-ink-800 px-4 py-2 text-body-sm text-paper-100 transition-colors hover:bg-ink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
