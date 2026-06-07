import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('Unhandled React error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-8 text-slate-100">
          <div className="w-full max-w-2xl rounded-3xl border border-rose-500/20 bg-slate-900/95 p-8 shadow-2xl shadow-rose-500/10">
            <h1 className="text-3xl font-bold text-rose-300">Something went wrong.</h1>
            <p className="mt-4 text-slate-300">The application encountered an unexpected error. Please refresh the page or return to the dashboard.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex rounded-2xl bg-rose-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-rose-400"
            >
              Reload app
            </button>
            <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/80 p-4 text-xs text-slate-400">
              <p className="font-semibold text-slate-200">Error details</p>
              <pre className="whitespace-pre-wrap break-words text-[11px] text-slate-300 mt-2">
                {this.state.error?.toString()}
              </pre>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
