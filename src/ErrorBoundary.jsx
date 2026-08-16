import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SafeRoute Production Error Log:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-900 border-2 border-rose-500/50 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black tracking-wide">System Exception Encountered</h2>
            <p className="text-xs text-slate-400">
              SafeRoute safety engine intercepted an unexpected runtime fault. Your emergency protocols remain secured locally.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg"
            >
              Reload Intelligence Engine
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}