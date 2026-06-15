import React from "react";
import { Sentry } from "../lib/sentry";

// App-wide error boundary so a single render error never white-screens the site.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Render error:", error, info);
    Sentry.captureException(error, {
      extra: { componentStack: info?.componentStack },
    });
  }

  handleReset = () => {
    this.setState({ hasError: false });
    window.location.assign("/");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-3xl font-serif mb-3">Something went wrong</h1>
          <p className="text-ash mb-8 max-w-md">
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={this.handleReset}
            className="bg-ink text-smoke px-8 py-4 label hover:bg-[#262626] transition-colors"
          >
            Back to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
